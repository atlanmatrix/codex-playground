"""Chromium tests for views, fresh covers and cross-origin iframe messages.

Browser fixtures and the optional local HTTP service; no public deployment claims.
"""
import argparse
import base64
import importlib.util
import io
import json
import os
import shutil
import threading
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode, urlsplit
from urllib.request import ProxyHandler, build_opener

from PIL import Image, ImageStat
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ORIGIN = 'http://little-worlds.test'
SCENES = list(json.loads((ROOT / 'thumbnails/manifest.json').read_text())['scenes'])
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--scenes', nargs='*', choices=SCENES, default=SCENES)
args = parser.parse_args()


def image(result):
    output = Image.open(io.BytesIO(base64.b64decode(result['dataUrl'].split(',', 1)[1]))).convert('RGBA')
    assert output.size == (result['width'], result['height'])
    assert output.getextrema()[3] == (255, 255), 'Opaque covers must include the CSS background'
    assert max(ImageStat.Stat(output.convert('RGB')).stddev) > 5, 'Cover must contain rendered geometry'
    return output


def same_view(expected, actual):
    assert expected['scene'] == actual['scene']
    for key in ('target',):
        assert all(abs(a - b) < .0001 for a, b in zip(expected[key], actual[key])), (key, expected, actual)
    for key in ('azimuth', 'polar', 'zoom'):
        assert abs(expected[key] - actual[key]) < .0001, (key, expected[key], actual[key])


with sync_playwright() as playwright:
    launch = {'headless': True, 'args': ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']}
    executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    if executable:
        launch['executable_path'] = executable
    proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('HTTP_PROXY')
    if proxy:
        launch['proxy'] = {'server': proxy}
    browser = playwright.chromium.launch(**launch)
    try:
        context = browser.new_context(viewport={'width': 640, 'height': 360}, device_scale_factor=1, reduced_motion='reduce')
        context.set_default_timeout(90000)
        context.set_default_navigation_timeout(90000)
        errors = []
        context.on('page', lambda page: page.on('pageerror', lambda error: errors.append(str(error))))

        def fixture(route):
            url = urlsplit(route.request.url)
            if url.netloc == 'host.test':
                route.fulfill(body='<html><body><img id="cover"><script>window.messages=[];addEventListener("message",e=>messages.push({origin:e.origin,data:e.data}));</script></body></html>', content_type='text/html')
            elif url.netloc == 'sibling.test':
                route.fulfill(body='<script>window.replies=[];addEventListener("message",e=>replies.push(e.data));parent.frames[0].postMessage({type:"little-worlds:capture",requestId:"spoof"},"*");</script>', content_type='text/html')
            elif url.netloc == 'little-worlds.test' and url.path == '/favicon.ico':
                route.fulfill(status=204)
            elif url.netloc == 'little-worlds.test' and url.path.strip('/') in SCENES:
                route.fulfill(body=(ROOT / url.path.strip('/') / 'index.html').read_bytes(), content_type='text/html')
            else:
                route.abort()

        context.route('**/*', fixture)
        for scene in args.scenes:
            page = context.new_page()
            print(f'Checking {scene}: load', flush=True)
            page.goto(f'{ORIGIN}/{scene}/?time=day')
            page.wait_for_function('window.littleWorlds')
            initial = page.evaluate('littleWorlds.getState()')
            print(f'Checking {scene}: input', flush=True)
            # Actual pointer and wheel input, then an exact programmatic pose.
            page.mouse.move(320, 180); page.mouse.down(); page.mouse.move(400, 220, steps=4); page.mouse.up()
            page.mouse.wheel(0, -180)
            page.wait_for_timeout(250)
            changed = page.evaluate('littleWorlds.getState()')
            assert abs(initial['azimuth'] - changed['azimuth']) > .01
            assert initial['distance'] > changed['distance']
            page.wait_for_function('new URL(location.href).searchParams.has("view")')
            urls = page.evaluate('littleWorlds.setState(littleWorlds.getState())')
            assert 'view=' in page.url
            stored = page.evaluate(f'JSON.parse(localStorage.getItem("little-worlds:view:{scene}"))')
            same_view(urls['state'], stored)
            print(f'Checking {scene}: capture', flush=True)
            cover = page.evaluate('littleWorlds.capture({width:640,height:360})')
            desktop = image(cover)
            assert page.evaluate('()=>{const gl=document.querySelector("canvas").getContext("webgl2");return !gl.isContextLost()&&gl.getError()===gl.NO_ERROR}')
            if scene in ('study', 'onsen', 'rainy'):
                desktop.save(f'/tmp/capture-{scene}-desktop.png')
            if scene in ('study', 'onsen'):
                page.emulate_media(reduced_motion='no-preference')
                night = page.evaluate('()=>{littleWorlds.setState({...littleWorlds.getState(),period:"night"});return littleWorlds.capture({width:640,height:360})}')
                assert night['state']['period'] == 'night'
                assert sum(image(night).getpixel((0, 0))[:3]) < 180, 'API lighting must snap the CSS backdrop before capture'
            # Replay a shareable URL at the same size and at a mobile aspect.
            print(f'Checking {scene}: replay', flush=True)
            page.goto(urls['url'] + '&preview=1'); page.wait_for_function('window.littleWorlds')
            same_view(urls['state'], page.evaluate('littleWorlds.getState()'))
            page.set_viewport_size({'width': 390, 'height': 844})
            print(f'Checking {scene}: mobile', flush=True)
            page.goto(urls['screenshotUrl'] + '&width=390&height=844&format=webp')
            page.wait_for_function('document.documentElement.dataset.screenshot === "ready"')
            result = page.evaluate('littleWorldsScreenshot')
            same_view(urls['state'], result['state'])
            image(result)
            assert result['mimeType'] == 'image/webp'
            assert page.locator('img').count() == 1
            assert page.locator('canvas').evaluate('(canvas)=>getComputedStyle(canvas).visibility') == 'hidden'
            # Malformed views must fall back to a useful default, never a blank scene.
            if scene == 'city':
                page.goto(f'{ORIGIN}/city/?screenshot=1&view=broken')
                page.wait_for_function('document.documentElement.dataset.screenshot === "ready"')
                assert page.evaluate('document.documentElement.dataset.viewError') == 'invalid'
                for options in ({'width': -1}, {'height': 100000}, {'format': 'svg'}, {'quality': 2}):
                    assert page.evaluate('(o)=>{try{littleWorlds.capture(o);return false}catch{return true}}', options)
                assert page.evaluate('()=>{try{littleWorlds.setState({...littleWorlds.getState(),zoom:NaN});return false}catch{return true}}')
            if scene in ('study', 'onsen'):
                # Cover URLs must also work when the OS allows motion: CSS
                # day/night transitions must not leak a daytime first frame.
                page.emulate_media(reduced_motion='no-preference')
                page.set_viewport_size({'width': 640, 'height': 360})
                state = {**urls['state'], 'period': 'night'}
                page.goto(f'{ORIGIN}/{scene}/?' + urlencode({'screenshot': 1, 'view': json.dumps(state)}))
                page.wait_for_function('document.documentElement.dataset.screenshot === "ready"')
                night = page.evaluate('littleWorldsScreenshot')
                assert night['state']['period'] == 'night'
                output = image(night); output.save(f'/tmp/capture-{scene}-night.png')
                assert sum(output.getpixel((0, 0))[:3]) < 180, 'Night background must be captured'
            page.close()
            print(json.dumps({'scene': scene, 'capture': 'desktop/mobile, orbit/zoom, persisted pose, URL replay, PNG/WebP'}), flush=True)

        host = context.new_page(); host.goto('http://host.test/')
        host.evaluate('''() => {
          const frame=document.createElement('iframe');frame.id='scene';frame.width=640;frame.height=360;
          frame.src='http://little-worlds.test/rainy/?parentOrigin=http%3A%2F%2Fhost.test';document.body.append(frame);
          window.request=(type,extra={})=>new Promise((resolve,reject)=>{
            const requestId=String(Date.now())+Math.random();const timer=setTimeout(()=>reject(Error('Response timed out')),20000);
            const listener=e=>{if(e.source!==frame.contentWindow||e.origin!=='http://little-worlds.test'||e.data.requestId!==requestId)return;
              clearTimeout(timer);removeEventListener('message',listener);resolve(e.data)};
            addEventListener('message',listener);frame.contentWindow.postMessage({type,requestId,...extra},'http://little-worlds.test');
          });
        }''')
        host.wait_for_function('messages.some(m=>m.data.type==="little-worlds:ready")')
        response = host.evaluate('request("little-worlds:get-state")'); assert response['ok']
        state = response['result']['state']; state['position'][0] *= -1
        response = host.evaluate('(state)=>request("little-worlds:set-state",{state})', state); assert response['ok']
        response = host.evaluate('request("little-worlds:capture",{options:{width:640,height:360}})')
        assert response['ok']; image(response['result']).save('/tmp/capture-iframe-rainy.png')
        assert host.evaluate('(url)=>{document.querySelector("#cover").src=url;return true}', response['result']['dataUrl'])
        host.wait_for_function('document.querySelector("#cover").naturalWidth===640')
        failed = host.evaluate('request("little-worlds:capture",{options:{width:0}})'); assert not failed['ok']
        host.evaluate('()=>{const frame=document.createElement("iframe");frame.src="http://sibling.test/";document.body.append(frame)}')
        host.wait_for_timeout(300)
        assert not host.evaluate('messages.some(m=>m.data.requestId==="spoof")')
        assert host.frames[2].evaluate('replies.length') == 0
        # Sandboxed/storage-restricted contexts still produce covers and messages.
        host.frames[1].evaluate('()=>{Object.defineProperty(window,"localStorage",{get(){throw Error("blocked")}});history.replaceState=()=>{throw Error("blocked")};}')
        state['position'][2] *= -1
        response = host.evaluate('(state)=>request("little-worlds:set-state",{state})', state); assert response['ok']
        assert host.evaluate('request("little-worlds:capture",{options:{width:320,height:180}})')['ok']
        assert not errors, errors
        print('Cross-origin iframe: state, set-state, image response, invalid requests, sibling isolation, blocked storage passed', flush=True)
        context.close()
    finally:
        browser.close()

# Verify actual HTTP image responses from the optional service.
spec = importlib.util.spec_from_file_location('screenshot_server', ROOT / 'scripts/screenshot-server.py')
server_module = importlib.util.module_from_spec(spec); spec.loader.exec_module(server_module)
server = server_module.ThreadingHTTPServer(('127.0.0.1', 0), server_module.Handler)
thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
client = build_opener(ProxyHandler({}))
try:
    origin = f'http://127.0.0.1:{server.server_port}'
    for extension in ('png', 'webp'):
        with client.open(f'{origin}/api/screenshot/study.{extension}?width=320&height=180&time=night', timeout=90) as response:
            assert response.headers['Content-Type'] == f'image/{extension}'
            assert response.headers['Cache-Control'] == 'no-store'
            output = Image.open(io.BytesIO(response.read())); assert output.size == (320, 180)
            assert max(ImageStat.Stat(output.convert('RGB')).stddev) > 5
    for path, status in [('/api/screenshot/missing.png', 404), ('/api/screenshot/study.png?width=99999', 400), ('/api/screenshot/study.png?view=broken', 400), ('/src/study.js', 404), ('/.git/config', 404)]:
        try:
            client.open(origin + path, timeout=90); raise AssertionError(path)
        except HTTPError as error:
            assert error.code == status, (path, error.code)
    server_module.RENDER_SLOT.acquire()
    try:
        try:
            client.open(f'{origin}/api/screenshot/study.png', timeout=10)
            raise AssertionError('Expected a bounded render queue')
        except HTTPError as error:
            assert error.code == 429
    finally:
        server_module.RENDER_SLOT.release()
    print('Local HTTP: fresh PNG/WebP, night lighting, dimensions, invalid input and public-file allowlist passed', flush=True)
finally:
    server.shutdown(); server.server_close(); thread.join()
