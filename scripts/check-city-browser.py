"""Real Chromium city checks through local fixtures; no public HTTP verification."""
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops, ImageStat
import io
import json

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / 'work'
WORK.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=[
        '--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle',
        '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    context = browser.new_context(viewport={'width': 1280, 'height': 900}, device_scale_factor=1)

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
        route.fulfill(body=target.read_bytes(), content_type='text/html')

    context.route('**/*', fixture)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
    page.goto('http://little-worlds.test/city/')
    page.wait_for_function('window.littleWorlds !== undefined')

    def state():
        return page.evaluate('window.littleWorlds.getState()')

    def capture(name):
        return Image.open(io.BytesIO(page.screenshot(path=str(WORK / f'city-verified-{name}.png')))).convert('RGB')

    initial = state()
    capture('desktop')
    page.mouse.move(640, 450)
    page.mouse.down()
    page.mouse.move(800, 490, steps=6)
    page.mouse.up()
    page.wait_for_timeout(200)
    assert abs(state()['azimuth'] - initial['azimuth']) > .05, 'Orbit did not change the camera'
    page.mouse.wheel(0, -2800)
    page.wait_for_timeout(250)
    zoomed = state()
    assert 21.9 <= zoomed['distance'] < 110, zoomed
    page.mouse.move(650, 450)
    page.mouse.down(button='right')
    page.mouse.move(760, 490, steps=6)
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
        ('library', [-31, 3, -26], [-7, 23, 1]),
        ('depot', [28, 3, -29], [50, 22, -1]),
        ('market', [-35, 3, 37], [-9, 23, 65]),
        ('wetland', [34, 1, 42], [62, 26, 69])]:
        page.evaluate('''([target,position]) => {
            const s=window.littleWorlds.getState();s.position=position;s.target=target;s.zoom=1;
            window.littleWorlds.setState(s);
        }''', [target, position])
        capture(name)

    gl = page.evaluate('''() => {const gl=document.querySelector('canvas').getContext('webgl2');
        return {lost:gl.isContextLost(),error:gl.getError()};}''')
    assert gl == {'lost': False, 'error': 0}, gl
    page.emulate_media(reduced_motion='reduce')
    page.goto('http://little-worlds.test/city/')
    page.wait_for_function('window.littleWorlds !== undefined')
    a = capture('reduced')
    page.wait_for_timeout(250)
    b = capture('reduced-later')
    still_difference = sum(ImageStat.Stat(ImageChops.difference(a, b)).mean)
    assert still_difference < .01, still_difference
    page.set_viewport_size({'width': 390, 'height': 844})
    page.goto('http://little-worlds.test/city/?preview=1')
    page.wait_for_function('window.littleWorlds !== undefined')
    capture('mobile')
    assert not errors, errors
    print(json.dumps({'verification': 'local Chromium/WebGL fixtures', 'zoomDistance': zoomed['distance'],
                      'panTarget': panned['target'], 'reducedMotionDifference': still_difference,
                      'webgl': gl, 'errors': errors}))
    context.close()
    browser.close()
