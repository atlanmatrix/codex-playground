"""Capture the real scenes once; the gallery serves only the resulting WebP files.

Requires Python with Playwright + Pillow and Chromium. Run `npm run thumbnails`.
All page requests are fulfilled from the local build; external requests fail.
"""
from html.parser import HTMLParser
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.parse import urlsplit, unquote
import hashlib
import io
import json
import os
import shutil
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
WIDTH, HEIGHT = 1280, 720
ORIGIN = 'http://127.0.0.1:4173/codex-playground'


class Gallery(HTMLParser):
    def __init__(self):
        super().__init__()
        self.routes = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'a' and {'card', 'card-link'}.intersection(attrs.get('class', '').split()):
            href = attrs['href']
            route = href.removeprefix('./').removesuffix('/')
            if href != f'./{route}/' or not route.isalpha():
                raise ValueError(f'Invalid scene route: {href}')
            self.routes.append(route)


def main():
    gallery = Gallery()
    gallery.feed((ROOT / 'src/index.html').read_text())
    if not gallery.routes or len(set(gallery.routes)) != len(gallery.routes):
        raise ValueError('Expected unique gallery scene routes')
    executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    previous_path = ROOT / 'thumbnails/manifest.json'
    previous = json.loads(previous_path.read_text()) if previous_path.exists() else {'scenes': {}}
    manifest = {'format': 'webp', 'width': WIDTH, 'height': HEIGHT, 'scenes': {}}
    captured = []
    with TemporaryDirectory(prefix='little-worlds-covers-') as temp, sync_playwright() as p:
        launch = {'headless': True, 'args': ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']}
        if executable:
            launch['executable_path'] = executable
        proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('HTTP_PROXY')
        if proxy:
            launch['proxy'] = {'server': proxy}
        browser = p.chromium.launch(**launch)
        try:
            context = browser.new_context(viewport={'width': WIDTH, 'height': HEIGHT}, device_scale_factor=1, reduced_motion='reduce')

            def fixture(route):
                url = urlsplit(route.request.url)
                if url.path == '/favicon.ico' and url.netloc == '127.0.0.1:4173':
                    route.fulfill(status=204)
                    return
                if url.scheme in ('data', 'blob'):
                    route.continue_()
                    return
                if url.netloc != '127.0.0.1:4173' or not url.path.startswith('/codex-playground/'):
                    raise RuntimeError(f'Unexpected external request: {route.request.url}')
                path = (ROOT / unquote(url.path.removeprefix('/codex-playground/'))).resolve()
                if not path.is_relative_to(ROOT):
                    raise RuntimeError('Fixture path escaped the project')
                if url.path.endswith('/'):
                    path /= 'index.html'
                if not path.is_file():
                    raise FileNotFoundError(path)
                route.fulfill(status=200, body=path.read_bytes(), content_type='text/html; charset=utf-8')

            context.route('**/*', fixture)
            for scene in gallery.routes:
                path = ROOT / scene / 'index.html'
                source_hash = hashlib.sha256(path.read_bytes()).hexdigest()
                old = previous['scenes'].get(scene)
                cover = ROOT / f'thumbnails/{scene}.webp'
                if old and old['source_sha256'] == source_hash and cover.exists() and hashlib.sha256(cover.read_bytes()).hexdigest() == old['sha256']:
                    manifest['scenes'][scene] = old
                    continue
                captured.append(scene)
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
                try:
                    page.goto(f'{ORIGIN}/{scene}/?preview=1' + ('&time=day' if scene == 'study' else ''), wait_until='load', timeout=60000)
                    page.locator('canvas').wait_for(state='visible')
                    page.evaluate('document.fonts.ready')
                    page.wait_for_timeout(250)
                    webgl = page.evaluate("""() => { const g=document.querySelector('canvas').getContext('webgl2'); return g && {lost:g.isContextLost(),error:g.getError()}; }""")
                    if errors or not webgl or webgl['lost'] or webgl['error']:
                        raise RuntimeError(f'{scene}: rendering failed: {errors}, {webgl}')
                    png = page.screenshot(animations='disabled')
                    image = Image.open(io.BytesIO(png)).convert('RGB')
                    if image.size != (WIDTH, HEIGHT):
                        raise RuntimeError(f'{scene}: wrong capture size: {image.size}')
                    target = Path(temp) / f'{scene}.webp'
                    image.save(target, 'WEBP', quality=84, method=6)
                    data = target.read_bytes()
                    if source_hash != hashlib.sha256(path.read_bytes()).hexdigest():
                        raise RuntimeError(f'{scene}: source changed during capture')
                    manifest['scenes'][scene] = {'file': f'thumbnails/{scene}.webp', 'source_sha256': source_hash, 'sha256': hashlib.sha256(data).hexdigest(), 'width': WIDTH, 'height': HEIGHT, 'bytes': len(data)}
                    print(f'Captured {scene}: {WIDTH}x{HEIGHT}, {len(data):,} bytes', flush=True)
                finally:
                    page.close()
        finally:
            browser.close()
        output = ROOT / 'thumbnails'
        output.mkdir(exist_ok=True)
        # Publish the complete set only after every scene has rendered successfully.
        for scene in captured:
            shutil.copyfile(Path(temp) / f'{scene}.webp', output / f'{scene}.webp')
        (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
        print(f'Generated {len(manifest["scenes"])} static covers ({sum(s["bytes"] for s in manifest["scenes"].values()):,} bytes total).')


if __name__ == '__main__':
    main()
