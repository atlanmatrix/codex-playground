"""Real Chromium/WebGL and simulated sensor checks; no physical device claims."""
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops, ImageStat
import io
import json

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'work/glass-checks'
OUT.mkdir(parents=True, exist_ok=True)
ORIGIN = 'https://little-worlds.test/codex-playground/'


def difference(a, b):
    return sum(ImageStat.Stat(ImageChops.difference(a, b)).mean)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=[
        '--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle',
        '--use-angle=swiftshader', '--enable-unsafe-swiftshader'
    ])

    def context(width=960, height=640, mobile=False, reduced=False, permission=None):
        ctx = browser.new_context(viewport={'width': width, 'height': height},
                                  device_scale_factor=1, is_mobile=mobile, has_touch=mobile,
                                  reduced_motion='reduce' if reduced else 'no-preference')
        def fixture(route):
            url = urlsplit(route.request.url)
            assert url.netloc == 'little-worlds.test', url
            path = (ROOT / url.path.removeprefix('/codex-playground/')).resolve()
            assert path.is_relative_to(ROOT), path
            if url.path.endswith('/'):
                path /= 'index.html'
            route.fulfill(body=path.read_bytes(), content_type='text/html')
        ctx.route('**/*', fixture)
        if permission:
            ctx.add_init_script("""window.__permissionCalls=0;
              Object.defineProperty(DeviceOrientationEvent,'requestPermission',{configurable:true,value:()=>{
                window.__permissionCalls++;
                return Promise.resolve(%s);
              }});""" % json.dumps(permission))
        return ctx

    def open_page(ctx, preview=False):
        page = ctx.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.goto(ORIGIN + 'glass/?inspect=1' + ('&preview=1' if preview else ''), wait_until='load')
        page.wait_for_function('window.__glass?.state.frames >= 1')
        page.errors = errors
        return page

    def state(page):
        return page.evaluate('window.__glass.state')

    def shot(page, name):
        return Image.open(io.BytesIO(page.screenshot(path=str(OUT / (name + '.png'))))).convert('RGB')

    def sensor(page, beta, gamma, alpha=0):
        page.evaluate("""v=>window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',v))""",
                      {'alpha': alpha, 'beta': beta, 'gamma': gamma})

    def settle(page):
        page.wait_for_function("""() => {const s=window.__glass.state;return Math.abs(s.target.x-s.current.x)+Math.abs(s.target.y-s.current.y)<.035} """, timeout=30000)

    def coverage(page):
        result = page.evaluate("""() => {
          const c=document.querySelector('canvas'),b=c.getBoundingClientRect(),gl=c.getContext('webgl2');
          return {width:b.width,height:b.height,viewport:[innerWidth,innerHeight],
            text:document.body.innerText.trim(),canvases:document.querySelectorAll('canvas').length,
            overflow:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight,
            lost:gl.isContextLost(),error:gl.getError()};
        }""")
        assert result['text'] == '' and result['canvases'] == 1 and not result['overflow'], result
        assert [result['width'], result['height']] == result['viewport'], result
        assert not result['lost'] and result['error'] == 0 and not page.errors, (result, page.errors)
        return result

    def structure(page):
        # Measure the rendered meshes, not a duplicate list of intended sizes.
        return page.evaluate("""() => {
          const {floor,bench,plants,windowAssembly,glass}=__glass.objects;
          function bounds(mesh){
            mesh.updateWorldMatrix(true,false);
            mesh.geometry.computeBoundingBox();
            const b=mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
            return {min:b.min.toArray(),max:b.max.toArray()};
          }
          function canopy(group){
            const max=[-Infinity,-Infinity,-Infinity];
            group.traverse(o=>{if(o.isMesh){const b=bounds(o);for(let i=0;i<3;i++)max[i]=Math.max(max[i],b.max[i]);}});
            return max;
          }
          const vertical=windowAssembly.gaskets.filter(m=>m.name.startsWith('vertical')).map(bounds);
          const horizontal=windowAssembly.gaskets.filter(m=>m.name.startsWith('horizontal')).map(bounds);
          const pos=glass.geometry.attributes.position;
          let uncoveredCorners=0;
          for(let i=0;i<pos.count;i++){
            const x=pos.getX(i),y=pos.getY(i),z=glass.position.z;
            const inRange=(v,a,b,t=.004)=>v>=a-t&&v<=b+t;
            const v=vertical.some(b=>inRange(x,b.min[0],b.max[0])&&inRange(y,b.min[1],b.max[1])&&inRange(z,b.min[2],b.max[2]));
            const h=horizontal.some(b=>inRange(x,b.min[0],b.max[0])&&inRange(y,b.min[1],b.max[1])&&inRange(z,b.min[2],b.max[2]));
            if(!v||!h)uncoveredCorners++;
          }
          return {floor:bounds(floor),slab:bounds(bench.slab),
            legs:bench.legs.map(bounds),feet:bench.feet.map(bounds),glassZ:glass.position.z,
            pots:plants.map(p=>({pot:bounds(p.pot),saucer:bounds(p.saucer),soil:bounds(p.soil),
              canopy:canopy(p.foliage),root:p.group.matrixWorld.toArray(),foliage:p.foliage.quaternion.toArray()})),
            posts:windowAssembly.posts.map(bounds),transoms:windowAssembly.transoms.map(bounds),
            uncoveredPaneCorners:uncoveredCorners};
        }""")

    def check_structure(s):
        top = s['slab']['max'][1]
        floor = s['floor']['max'][1]
        assert len(s['pots']) == 7
        for pot in s['pots']:
            assert abs(pot['saucer']['min'][1] - top) < .00001, ('floating saucer', pot)
            assert abs(pot['pot']['min'][1] - pot['saucer']['max'][1]) < .00001, ('pot/saucer gap', pot)
            for axis in [0, 2]:
                assert pot['saucer']['min'][axis] > s['slab']['min'][axis] + .03, ('unsupported footprint', pot)
                assert pot['saucer']['max'][axis] < s['slab']['max'][axis] - .03, ('unsupported footprint', pot)
            assert pot['canopy'][2] < s['glassZ'] - .04, ('foliage crosses glass', pot)
        for foot, leg in zip(s['feet'], s['legs']):
            assert abs(foot['min'][1] - floor) < .00001, ('floating bench foot', foot)
            assert abs(leg['min'][1] - foot['max'][1]) < .00001, ('unsupported bench leg', leg)
            assert abs(leg['max'][1] - s['slab']['min'][1]) < .00001, ('unsupported slab', leg)
        for post in s['posts']:
            assert post['max'][0] - post['min'][0] > .10
            assert post['max'][2] - post['min'][2] > .2
            assert post['min'][2] < s['glassZ'] < post['max'][2]
        for bar in s['transoms']:
            left = min(s['posts'], key=lambda p: abs(p['max'][0] - bar['min'][0]))
            right = min(s['posts'], key=lambda p: abs(p['min'][0] - bar['max'][0]))
            assert 0 < bar['min'][0] - left['max'][0] < .005, ('bad T joint', bar)
            assert 0 < right['min'][0] - bar['max'][0] < .005, ('bad T joint', bar)
            assert bar['max'][2] < left['max'][2], ('unrecessed transom', bar)
        assert s['uncoveredPaneCorners'] == 0, ('exposed pane edges', s['uncoveredPaneCorners'])

    # Preview must stay still; the same scene must fill tall and wide viewports.
    ctx = context(reduced=True)
    page = open_page(ctx, preview=True)
    first = shot(page, 'desktop')
    check_structure(structure(page))
    assert sum(ImageStat.Stat(first).stddev) > 30, 'Blank or featureless frame'
    page.wait_for_timeout(300)
    assert difference(first, shot(page, 'desktop-static')) == 0
    initial_frames = state(page)['frames']
    page.mouse.move(800, 100)
    sensor(page, 70, 0)
    sensor(page, 80, 15)
    page.wait_for_timeout(200)
    assert state(page)['frames'] == initial_frames and state(page)['target'] == {'x': 0, 'y': 0}
    coverage(page)
    for name, width, height in [('mobile', 390, 844), ('landscape', 844, 390), ('small', 320, 568)]:
        page.set_viewport_size({'width': width, 'height': height})
        page.wait_for_function('window.__glass.state.resolution[0]===innerWidth && window.__glass.state.resolution[1]===innerHeight')
        coverage(page)
        shot(page, name)
    ctx.close()

    # Reduced motion stops idle rendering but still allows deliberate interaction.
    ctx = context(reduced=True)
    page = open_page(ctx)
    first = shot(page, 'reduced-neutral')
    page.mouse.move(900, 80)
    settle(page)
    shifted = shot(page, 'reduced-pointer')
    pointer_difference = difference(first, shifted)
    assert pointer_difference > .7, pointer_difference
    before = state(page)['frames']
    page.wait_for_timeout(300)
    assert state(page)['frames'] == before
    page.locator('#glass-view').focus()
    page.keyboard.press('Home')
    settle(page)
    assert state(page)['target'] == {'x': 0, 'y': 0}
    page.keyboard.press('ArrowLeft')
    settle(page)
    assert state(page)['current']['x'] < -.15
    coverage(page)
    ctx.close()

    # iOS-style permission must wait for a gesture; sensor events use that pose as neutral.
    ctx = context(390, 844, mobile=True, reduced=True, permission='granted')
    page = open_page(ctx)
    assert page.evaluate('window.__permissionCalls') == 0
    assert state(page)['permission'] == 'idle'
    page.touchscreen.tap(190, 420)
    page.wait_for_function("window.__glass.state.permission==='granted'")
    assert page.evaluate('window.__permissionCalls') == 1
    for beta in [30, 70, 90]:
        page.locator('#glass-view').focus()
        page.keyboard.press('Home')
        sensor(page, beta, 0)
        assert state(page)['target'] == {'x': 0, 'y': 0}
        neutral = shot(page, 'sensor-neutral')
        sensor(page, beta + 12, -14)
        settle(page)
        s = state(page)
        assert s['sensorActive'] and abs(s['target']['x']) + abs(s['target']['y']) > .25, s
        assert difference(neutral, shot(page, 'sensor-tilted')) > .7
    original = state(page)['target']
    page.evaluate("Object.defineProperty(screen.orientation,'angle',{value:90,configurable:true});screen.orientation.dispatchEvent(new Event('change'))")
    sensor(page, 90, 0)
    sensor(page, 102, -14)
    rotated = state(page)['target']
    assert abs(rotated['x'] + original['y']) < .001 and abs(rotated['y'] - original['x']) < .001, (original, rotated)
    sensor(page, 180, 89)
    s = state(page)
    assert all(-1 <= s['target'][axis] <= 1 for axis in ['x', 'y'])
    sensor(page, None, None)
    assert state(page)['target'] == s['target']
    coverage(page)
    ctx.close()

    # A landscape iPad must visibly respond to either physical tilt axis on
    # its own, after one native tap grants sensor permission.
    ctx = context(1024, 768, mobile=True, reduced=True, permission='granted')
    page = open_page(ctx)
    page.touchscreen.tap(512, 384)
    page.wait_for_function("window.__glass.state.permission==='granted'")
    page.evaluate("Object.defineProperty(screen.orientation,'angle',{value:90,configurable:true});screen.orientation.dispatchEvent(new Event('change'))")
    page.evaluate('() => new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
    sensor(page, 70, 0)
    neutral = shot(page, 'ipad-neutral')
    sensor(page, 82, 0)
    settle(page)
    t = state(page)['target']
    assert abs(t['x']) > .5 and abs(t['y']) < .001, ('iPad beta-only', t)
    assert difference(neutral, shot(page, 'ipad-beta')) > .7
    page.locator('#glass-view').focus()
    page.keyboard.press('Home')
    sensor(page, 70, 0)
    sensor(page, 70, 15)
    settle(page)
    t = state(page)['target']
    assert abs(t['y']) > .5 and abs(t['x']) < .001, ('iPad gamma-only', t)
    assert difference(neutral, shot(page, 'ipad-gamma')) > .7
    assert page.evaluate('window.__permissionCalls') == 1
    coverage(page)
    ctx.close()

    # Denial and missing sensors must preserve touch input with no custom overlay.
    for permission in ['denied', 'unavailable']:
        ctx = context(390, 844, mobile=True, reduced=True, permission=permission if permission == 'denied' else None)
        if permission == 'unavailable':
            ctx.add_init_script('window.DeviceOrientationEvent=undefined;window.DeviceMotionEvent=undefined')
        page = open_page(ctx)
        page.touchscreen.tap(190, 420)
        page.wait_for_function("['denied','unavailable'].includes(window.__glass.state.permission)")
        first = shot(page, 'fallback-neutral')
        session = ctx.new_cdp_session(page)
        session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 120, 'y': 500}]})
        session.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': 270, 'y': 320}]})
        session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        settle(page)
        assert state(page)['target']['x'] > .5, state(page)
        assert difference(first, shot(page, 'fallback-dragged')) > .7
        if permission == 'denied':
            assert page.evaluate('window.__permissionCalls') == 1
        coverage(page)
        ctx.close()

    # Normal mode keeps coherent ambient animation; preference changes stop it.
    ctx = context()
    page = open_page(ctx)
    count = state(page)['frames']
    rigid_before = structure(page)
    page.wait_for_function(f'window.__glass.state.frames>{count + 2}')
    rigid_after = structure(page)
    check_structure(rigid_after)
    assert [p['root'] for p in rigid_before['pots']] == [p['root'] for p in rigid_after['pots']], 'Pots must stay rigidly planted during foliage animation'
    assert [p['foliage'] for p in rigid_before['pots']] != [p['foliage'] for p in rigid_after['pots']], 'Foliage animation missing'
    page.evaluate("Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))")
    count = state(page)['frames']
    page.wait_for_timeout(300)
    assert state(page)['frames'] == count
    page.evaluate("Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'))")
    page.wait_for_function(f'window.__glass.state.frames>{count}')
    page.emulate_media(reduced_motion='reduce')
    page.wait_for_function('window.__glass.state.reduced')
    page.evaluate('() => new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
    count = state(page)['frames']
    page.wait_for_timeout(300)
    assert state(page)['frames'] == count
    coverage(page)
    ctx.close()
    browser.close()
    print(json.dumps({'route': 'glass', 'verification': 'local Chromium with simulated orientation (not physical hardware)',
                      'pointerImageDifference': pointer_difference,
                      'checks': ['desktop/mobile/landscape/320px', 'no visible text or overflow', 'WebGL',
                                 'static preview', 'mouse/keyboard/touch', 'iOS permission grant/denial',
                                 'absent sensors', '30/70/90 degree neutral pose', 'landscape sensor mapping',
                                 'invalid sensor samples', 'bounded tilt', 'ambient motion', 'tab suspension/resume', 'reduced motion',
                                 'landscape iPad rendering with each tilt axis separately',
                                 'supported pot footprints', 'pot/saucer/slab contact', 'grounded bench legs',
                                 'stationary pots during sway', 'foliage behind glass', 'frame T joints and depth', 'gasket-held pane edges'],
                      'errors': []}, ensure_ascii=False))
