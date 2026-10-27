"""Real Chromium city checks through local fixtures; no public HTTP verification."""
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops, ImageStat
import io
import json
import sys

MOBILE_ONLY = '--mobile-only' in sys.argv
STILL_ONLY = '--still-only' in sys.argv

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / 'work'
WORK.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=[
        '--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle',
        '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    context = browser.new_context(viewport={'width': 960, 'height': 640}, device_scale_factor=1)
    context.set_default_timeout(90000)
    context.set_default_navigation_timeout(90000)

    def fixture(route):
        path = urlsplit(route.request.url).path
        if path == '/favicon.ico':
            route.fulfill(status=204)
            return
        target = (ROOT / path.lstrip('/')).resolve()
        if not target.is_relative_to(ROOT):
            raise ValueError('Fixture escaped project')
        if path.endswith('/'):
            target /= 'index.html'
        if not target.is_file():
            route.fulfill(status=404, body='Not found')
            return
        route.fulfill(body=target.read_bytes(), content_type='image/webp' if target.suffix == '.webp' else 'text/html')

    context.route('**/*', fixture)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)

    def state():
        return page.evaluate('window.littleWorlds.getState()')

    def capture(name):
        return Image.open(io.BytesIO(page.screenshot(path=str(WORK / f'city-verified-{name}.png')))).convert('RGB')

    zoomed, panned, still_difference = {'distance': None}, {'target': None}, None
    if not MOBILE_ONLY and not STILL_ONLY:
        page.goto('http://little-worlds.test/city/')
        page.wait_for_function('window.littleWorlds !== undefined')
        initial = state()
        capture('desktop')
        page.mouse.move(480, 320)
        page.mouse.down()
        page.mouse.move(600, 360, steps=2)
        page.mouse.up()
        page.wait_for_timeout(200)
        assert abs(state()['azimuth'] - initial['azimuth']) > .05, 'Orbit did not change the camera'
        page.mouse.wheel(0, -2800)
        page.wait_for_timeout(250)
        zoomed = state()
        assert 21.9 <= zoomed['distance'] < 110, zoomed
        page.mouse.move(480, 320)
        page.mouse.down(button='right')
        page.mouse.move(590, 360, steps=2)
        page.mouse.up(button='right')
        page.wait_for_timeout(200)
        panned = state()
        assert sum(abs(a-b) for a, b in zip(panned['target'], zoomed['target'])) > .5, 'Ground pan failed'
        assert abs(panned['target'][1] - zoomed['target'][1]) < .0001, 'Panning must stay above ground'
        capture('zoom-pan')
        shared = page.evaluate('window.littleWorlds.getUrls()')
        page.goto(shared['url'])
        page.wait_for_function('window.littleWorlds !== undefined')
        replay = state()
        assert max(abs(a-b) for a, b in zip(replay['target'], shared['state']['target'])) < .01
        assert abs(replay['distance'] - shared['state']['distance']) < .05

        for name, target, position in [
            ('cat', [33, 1, -32.7], [46, 12, -18]),
            ('fitness', [-46, 1, -5], [-30, 14, 14]),
            ('station', [-46, 2, -52], [-28, 17, -33]),
            ('rooftop', [-48, 2, 49], [-26, 20, 70]),
            ('junction', [-20, 2, 27], [10, 28, 55])]:
            page.evaluate('''([target,position]) => {
                const s=window.littleWorlds.getState();s.position=position;s.target=target;s.zoom=1;
                window.littleWorlds.setState(s);
            }''', [target, position])
            capture(name)

        gl = page.evaluate('''() => {const gl=document.querySelector('canvas').getContext('webgl2');
            return {lost:gl.isContextLost(),error:gl.getError()};}''')
        assert gl == {'lost': False, 'error': 0}, gl
    if not MOBILE_ONLY:
        page.emulate_media(reduced_motion='reduce')
        page.goto('http://little-worlds.test/city/')
        page.wait_for_function('window.littleWorlds !== undefined')
        a = capture('reduced')
        idle_frames = page.evaluate('window.cityPerformance.renderedFrames')
        page.wait_for_timeout(250)
        b = capture('reduced-later')
        still_difference = sum(ImageStat.Stat(ImageChops.difference(a, b)).mean)
        assert still_difference < .01, still_difference
        assert page.evaluate('window.cityPerformance.renderedFrames') == idle_frames, 'Reduced-motion idle must skip GPU rendering'
    # A fresh context prevents several retained software WebGL renderers from
    # competing with the phone navigation. The app and the viewport stay real.
    context.close()
    context = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, reduced_motion='reduce')
    context.set_default_timeout(90000)
    context.set_default_navigation_timeout(90000)
    context.route('**/*', fixture)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
    page.goto('http://little-worlds.test/city/?preview=1')
    page.wait_for_function('window.littleWorlds !== undefined')
    capture('mobile')
    perf = page.evaluate('({...window.cityPerformance})')
    assert perf['atlasSigns'] > 20 and perf['staticBatches'] < 100, perf
    assert perf['coarseBatches'] > 0, 'The full-map camera should use distant geometry'
    page.evaluate('''() => {const s=window.littleWorlds.getState();s.position=[46,12,-18];s.target=[33,1,-32.7];window.littleWorlds.setState(s);}''')
    assert page.evaluate('window.cityPerformance.coarseBatches') < perf['coarseBatches'], 'A still/capture camera must restore nearby detail'
    gl = page.evaluate('''() => {const g=document.querySelector('canvas').getContext('webgl2');return {lost:g.isContextLost(),error:g.getError()};}''')
    assert gl == {'lost': False, 'error': 0}, gl
    page.goto('http://little-worlds.test/')
    assert page.locator('a.card-link').count() == 7
    numbers = page.locator('.number').all_text_contents()
    assert [n[:2] for n in numbers] == ['01','02','03','04','05','06','07']
    assert not errors, errors
    for retired in ['lakeside','courtyard','sakura','rooftop','intersection']:
        response = page.goto(f'http://little-worlds.test/{retired}/')
        assert response.status == 404
    assert not [e for e in errors if '404' not in e], errors
    print(json.dumps({'verification': 'local Chromium/WebGL fixtures', 'zoomDistance': zoomed['distance'],
                      'panTarget': panned['target'], 'reducedMotionDifference': still_difference,
                      'webgl': gl, 'cityPerformance': perf, 'scope': 'mobile and catalog' if MOBILE_ONLY else 'still and mobile' if STILL_ONLY else 'full', 'retiredRoutes': 5, 'errors': [e for e in errors if '404' not in e]}))
    context.close()
    browser.close()
