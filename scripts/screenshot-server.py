"""Serve built scenes and fresh image URLs. Optional; GitHub Pages stays static.

Only local, registered scene files are rendered. No remote URL/proxy endpoint.
Requires Python Playwright, Pillow and Chromium, like the cover generator.
"""
import argparse
import base64
import json
import os
import re
import shutil
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SCENES = frozenset(json.loads((ROOT / 'thumbnails/manifest.json').read_text())['scenes'])
RENDER_SLOT = threading.BoundedSemaphore(1)


def capture_scene(scene, values, image_format):
    def number(name, default, low, high, integer=False):
        try:
            result = float(values.get(name, [default])[0])
            if not low <= result <= high or (integer and not result.is_integer()):
                raise ValueError()
            return int(result) if integer else result
        except (ValueError, OverflowError):
            raise ValueError(f'Invalid {name}: expected {low}..{high}') from None

    width = number('width', 1280, 32, 2048, True)
    height = number('height', 720, 32, 2048, True)
    quality = number('quality', .9, 0, 1)
    params = {'screenshot': '1', 'width': width, 'height': height, 'format': image_format, 'quality': quality}
    if 'view' in values:
        view = values['view'][0]
        if len(view) > 4096:
            raise ValueError('View is too long')
        params['view'] = view
    if 'time' in values:
        if values['time'][0] not in ('day', 'night'):
            raise ValueError('Invalid time: expected day/night')
        params['time'] = values['time'][0]
    executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    launch = {'headless': True, 'args': ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']}
    if executable:
        launch['executable_path'] = executable
    proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('HTTP_PROXY')
    if proxy:
        launch['proxy'] = {'server': proxy}
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(**launch)
        try:
            context = browser.new_context(viewport={'width': width, 'height': height}, device_scale_factor=1, reduced_motion='reduce', service_workers='block')

            def fixture(route):
                url = urlsplit(route.request.url)
                if url.netloc == 'little-worlds.test' and url.path == f'/{scene}/':
                    route.fulfill(body=(ROOT / scene / 'index.html').read_bytes(), content_type='text/html; charset=utf-8')
                elif url.netloc == 'little-worlds.test' and url.path == '/favicon.ico':
                    route.fulfill(status=204)
                else:
                    route.abort()

            context.route('**/*', fixture)
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'http://little-worlds.test/{scene}/?{urlencode(params)}', wait_until='load', timeout=60000)
            page.wait_for_function("document.documentElement.dataset.screenshot === 'ready' || document.documentElement.dataset.screenshot === 'error'", timeout=60000)
            if page.evaluate("document.documentElement.dataset.viewError === 'invalid'"):
                raise ValueError('Invalid scene view')
            if errors or page.evaluate("document.documentElement.dataset.screenshot !== 'ready'"):
                raise RuntimeError('Scene rendering failed')
            result = page.evaluate('({dataUrl:littleWorldsScreenshot.dataUrl,mimeType:littleWorldsScreenshot.mimeType})')
            return base64.b64decode(result['dataUrl'].split(',', 1)[1]), result['mimeType']
        finally:
            browser.close()


class Handler(BaseHTTPRequestHandler):
    def send(self, status, data, mime):
        self.send_response(status)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(data)

    def error(self, status, message):
        self.send(status, json.dumps({'error': message}).encode(), 'application/json')

    def do_GET(self):
        url = urlsplit(self.path)
        match = re.fullmatch(r'/api/screenshot/([a-z]+)\.(png|webp)', url.path)
        if match:
            scene, image_format = match.groups()
            if scene not in SCENES:
                self.error(404, 'Unknown scene')
                return
            if len(url.query) > 8192:
                self.error(400, 'Query is too long')
                return
            if not RENDER_SLOT.acquire(blocking=False):
                self.error(429, 'A screenshot is rendering; retry shortly')
                return
            try:
                data, mime = capture_scene(scene, parse_qs(url.query, keep_blank_values=True), image_format)
                self.send(200, data, mime)
            except ValueError as error:
                self.error(400, str(error))
            except Exception:
                self.error(503, 'Screenshot rendering unavailable; check Chromium and Playwright setup')
            finally:
                RENDER_SLOT.release()
            return
        # Serve only the public build, never source, dotfiles or arbitrary paths.
        if url.path in ('/', '/index.html'):
            path, mime = ROOT / 'index.html', 'text/html; charset=utf-8'
        elif url.path.strip('/') in SCENES and url.path.endswith('/'):
            path, mime = ROOT / url.path.strip('/') / 'index.html', 'text/html; charset=utf-8'
        elif re.fullmatch(r'/thumbnails/[a-z]+\.webp', url.path) and Path(url.path).stem in SCENES:
            path, mime = ROOT / url.path.lstrip('/'), 'image/webp'
        elif url.path == '/favicon.ico':
            self.send(204, b'', 'image/x-icon')
            return
        else:
            self.error(404, 'Not found')
            return
        self.send(200, path.read_bytes(), mime)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=4173)
    args = parser.parse_args()
    print(f'Little Worlds: http://{args.host}:{args.port}/; image URL: /api/screenshot/study.webp', flush=True)
    ThreadingHTTPServer((args.host, args.port), Handler).serve_forever()
