"""Sensor regressions with strict WebKit gesture rules; no hardware emulation claims."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
import subprocess

ROOT = Path(__file__).resolve().parent.parent
BUNDLE = ROOT / 'work/glass-motion-test.js'
BUNDLE.parent.mkdir(exist_ok=True)
subprocess.run(['node', '--input-type=module', '-e', """
import {build} from 'esbuild';
await build({stdin:{contents:"import {createGlassMotion} from './src/glass-motion.js';window.__motion=createGlassMotion(document.querySelector('main'),{preview:new URLSearchParams(location.search).has('preview')});",resolveDir:process.cwd()},bundle:true,format:'iife',outfile:'work/glass-motion-test.js'});
"""], cwd=ROOT, check=True)
HTML = '<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,main{margin:0;width:100%;height:100%;touch-action:none}</style><main tabindex="0"></main><script>' + BUNDLE.read_text() + '</script>'

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])

    def open_page(result='granted', api='orientation', legacy=False, preview=False):
        # iPadOS requests desktop websites by default. Availability and touch
        # events, rather than a mobile user-agent substring, must drive setup.
        ctx = browser.new_context(viewport={'width': 1024, 'height': 768}, has_touch=True, is_mobile=True,
                                  user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15')
        ctx.add_init_script("""(() => {
          window.__requests=[];window.__lastGesture='';
          for(const type of ['pointerdown','pointerup','touchend','click','keydown']){
            document.addEventListener(type,e=>{window.__lastGesture=type;window.__trustedGesture=e.isTrusted},true);
          }
          const permissionAPI=%s;
          const result=%s;
          if(permissionAPI==='motion')window.DeviceOrientationEvent=undefined;
          for(const key of ['DeviceOrientationEvent','DeviceMotionEvent']){
            if(!window[key]&&!(permissionAPI==='motion'&&key==='DeviceOrientationEvent'))window[key]=class extends Event{};
          }
          const request=()=>{
            const gesture=window.__lastGesture;
            const valid=window.__trustedGesture&&['touchend','click','keydown','pointerup'].includes(gesture);
            window.__requests.push({gesture,valid,active:navigator.userActivation?.isActive});
            if(!valid)return Promise.reject(new DOMException('Touch pointerdown is not a user activation','NotAllowedError'));
            if(result==='reject-once'&&window.__requests.length===1)return Promise.reject(new DOMException('Gesture was lost','NotAllowedError'));
            if(result==='throw-once'&&window.__requests.length===1)throw new DOMException('Gesture was lost','NotAllowedError');
            if(result==='pending')return new Promise(resolve=>window.__resolvePermission=resolve);
            return Promise.resolve(result==='denied'?'denied':'granted');
          };
          Object.defineProperty(window[permissionAPI==='motion'?'DeviceMotionEvent':'DeviceOrientationEvent'],'requestPermission',{configurable:true,value:request});
          if(%s){Object.defineProperty(screen,'orientation',{configurable:true,value:undefined});window.orientation=90;}
          else Object.defineProperty(screen.orientation,'angle',{configurable:true,value:0});
        })();""" % (json.dumps(api), json.dumps(result), 'true' if legacy else 'false'))
        ctx.route('**/*', lambda route: route.fulfill(body=HTML, content_type='text/html'))
        page = ctx.new_page()
        page.goto('https://glass-motion.test/' + ('?preview=1' if preview else ''))
        page.wait_for_function('!!window.__motion')
        return ctx, page

    def state(page):
        return page.evaluate('window.__motion.state')

    def requests(page):
        return page.evaluate('window.__requests')

    def sample(page, beta=70, gamma=0, alpha=0):
        page.evaluate("""values=>{const event=new Event('deviceorientation');for(const [k,v] of Object.entries(values))Object.defineProperty(event,k,{value:v});window.dispatchEvent(event)}""",
                      {'beta': beta, 'gamma': gamma, 'alpha': alpha})

    def motion(page, gravity, acceleration=None, repeat=1):
        page.evaluate("""v=>{for(let i=0;i<v.repeat;i++){const e=new Event('devicemotion');Object.defineProperties(e,{accelerationIncludingGravity:{value:v.gravity},acceleration:{value:v.acceleration}});window.dispatchEvent(e)}}""",
                      {'gravity': gravity, 'acceleration': acceleration, 'repeat': repeat})

    def center(page, beta=70, gamma=0, alpha=0):
        page.evaluate('__motion.recenter()')
        sample(page, beta, gamma, alpha)
        t = state(page)['target']
        assert abs(t['x']) + abs(t['y']) < 1e-8, t

    def tap(page):
        page.touchscreen.tap(512, 384)

    # A down-only touch must never request permission. A native lift must ask
    # exactly once, before the synthetic compatibility click, and unlock input.
    ctx, page = open_page()
    assert requests(page) == [] and state(page)['permission'] == 'idle'
    session = ctx.new_cdp_session(page)
    session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 512, 'y': 384}]})
    assert requests(page) == []
    session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    page.wait_for_function("__motion.state.permission==='granted'")
    assert len(requests(page)) == 1 and requests(page)[0]['valid'], requests(page)

    # Check each axis separately. A combined beta/gamma test hid the original
    # bug because beta moved even while gamma was completely ignored.
    for beta in [0, 30, 70, 90, 130]:
        center(page, beta=beta, alpha=32)
        sample(page, beta=beta, gamma=15, alpha=32)
        t = state(page)['target']
        assert t['x'] > .5 and abs(t['y']) < 1e-8, ('gamma-only tilt', beta, t)
        sample(page, beta=beta, gamma=-15, alpha=32)
        assert state(page)['target']['x'] < -.5
        center(page, beta=beta, alpha=32)
        sample(page, beta=beta+12, alpha=32)
        t = state(page)['target']
        assert t['y'] > .5 and abs(t['x']) < 1e-8, ('beta-only tilt', beta, t)
    for angle in [90, -90, 180]:
        page.evaluate("a=>{Object.defineProperty(screen.orientation,'angle',{value:a,configurable:true});screen.orientation.dispatchEvent(new Event('change'))}", angle)
        center(page)
        sample(page, gamma=15)
        t = state(page)['target']
        if angle == 90:
            assert t['y'] > .5 and abs(t['x']) < 1e-8, t
        elif angle == -90:
            assert t['y'] < -.5 and abs(t['x']) < 1e-8, t
        else:
            assert t['x'] < -.5 and abs(t['y']) < 1e-8, t
    ctx.close()

    # Both synchronous and asynchronous activation failures are retryable;
    # they must not be cached as an explicit user denial.
    for outcome in ['reject-once', 'throw-once']:
        ctx, page = open_page(outcome)
        tap(page)
        page.wait_for_function("__motion.state.permission==='idle'&&__motion.state.permissionError==='NotAllowedError'")
        assert len(requests(page)) == 1, requests(page)
        tap(page)
        page.wait_for_function("__motion.state.permission==='granted'")
        assert len(requests(page)) == 2
        center(page)
        sample(page, gamma=15)
        assert state(page)['target']['x'] > .5
        ctx.close()

    # Keep a pending prompt singular and don't re-prompt an explicit denial.
    for outcome in ['pending', 'denied']:
        ctx, page = open_page(outcome)
        tap(page)
        tap(page)
        assert len(requests(page)) == 1, requests(page)
        if outcome == 'pending':
            page.evaluate("__resolvePermission('granted')")
            page.wait_for_function("__motion.state.permission==='granted'")
            center(page)
            sample(page, gamma=15)
            assert state(page)['target']['x'] > .5
        else:
            assert state(page)['permission'] == 'denied'
        ctx.close()

    # Legacy screen rotation and motion-only hosts still receive a real native
    # permission gesture; gravity data supplies deliberate tilt as a fallback.
    ctx, page = open_page(api='motion', legacy=True)
    tap(page)
    page.wait_for_function("__motion.state.permission==='granted'")
    motion(page, {'x': 8.5, 'y': 0, 'z': -4.9})
    assert state(page)['sensorSource'] == 'motion'
    motion(page, {'x': 8.5, 'y': 2.5, 'z': -4.9}, repeat=30)
    assert state(page)['target']['x'] > .5, state(page)
    before = state(page)['target']
    motion(page, {'x': None, 'y': 0, 'z': -9.8})
    assert state(page)['target'] == before
    sample(page, beta=None, gamma=None)
    assert state(page)['sensorSource'] == 'motion'
    sample(page)
    sample(page, gamma=15)
    assert state(page)['sensorSource'] == 'orientation'
    before = state(page)['target']
    motion(page, {'x': 0, 'y': -9.8, 'z': 0})
    assert state(page)['target'] == before, 'Fresh orientation must take precedence'
    ctx.close()

    # Motion fallback subtracts measured user acceleration, avoiding parallax
    # from a lateral translation when the tablet itself has not tilted.
    ctx, page = open_page(api='motion')
    tap(page)
    page.wait_for_function("__motion.state.permission==='granted'")
    motion(page, {'x': 0, 'y': -8.5, 'z': -4.9}, {'x': 0, 'y': 0, 'z': 0})
    motion(page, {'x': 3, 'y': -8.5, 'z': -4.9}, {'x': 3, 'y': 0, 'z': 0}, repeat=30)
    t = state(page)['target']
    assert abs(t['x']) + abs(t['y']) < 1e-8, t
    ctx.close()

    ctx, page = open_page(preview=True)
    tap(page)
    sample(page, gamma=15)
    assert requests(page) == [] and not state(page)['sensorActive']
    ctx.close()
    browser.close()
    print(json.dumps({'verification': 'Chromium native touch events with strict WebKit permission rules; simulated sensor samples',
                      'checks': ['no permission on touch-down', 'permission on native touch-end', 'one request per tap',
                                 'iPad desktop user agent', 'gamma-only and beta-only tilt', 'portrait/landscape/180-degree axes',
                                 'retry after rejected/thrown request', 'pending and denied requests',
                                 'legacy window.orientation', 'motion-only permission and gravity fallback',
                                 'orientation priority', 'invalid samples', 'user acceleration removal', 'frozen preview'],
                      'errors': []}))
