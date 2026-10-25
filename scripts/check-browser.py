"""Real Chromium/WebGL checks using local HTTP fixtures (not public-site verification)."""
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops,ImageStat
import io,json,sys
ROOT=Path(__file__).resolve().parent.parent
routes=sys.argv[1:]
if not routes:raise SystemExit('Provide one or more scene routes')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for scene in routes:
  context=browser.new_context(viewport={'width':960,'height':640},device_scale_factor=1)
  def fixture(route):
   path=urlsplit(route.request.url).path
   if path=='/favicon.ico':route.fulfill(status=204);return
   target=(ROOT/path.lstrip('/')).resolve()
   if not target.is_relative_to(ROOT):raise ValueError('Path escaped fixture')
   if path.endswith('/'):target/='index.html'
   route.fulfill(body=target.read_bytes(),content_type='text/html' if target.suffix=='.html' else 'image/webp')
  context.route('**/*',fixture)
  page=context.new_page();errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  page.goto(f'http://little-worlds.test/{scene}/?time=day');page.locator('canvas').wait_for();page.wait_for_timeout(150)
  def shot(name):return Image.open(io.BytesIO(page.screenshot(path=f'/tmp/expanded-{scene}-{name}.png'))).convert('RGB')
  def diff(a,b):return sum(ImageStat.Stat(ImageChops.difference(a,b)).mean)
  a=shot('desktop');page.mouse.move(480,320);page.mouse.down();page.mouse.move(720,380,steps=4);page.mouse.up();page.wait_for_timeout(100)
  b=shot('orbit');orbit=diff(a,b);assert orbit>.1,(scene,orbit)
  page.mouse.wheel(0,-400);page.wait_for_timeout(100);c=shot('zoom');zoom=diff(b,c);assert zoom>.1,(scene,zoom)
  webgl=page.evaluate("() => { const gl=document.querySelector('canvas').getContext('webgl2');return gl && {lost:gl.isContextLost(),error:gl.getError()};}")
  assert webgl and not webgl['lost'] and not webgl['error'],webgl
  page.emulate_media(reduced_motion='reduce');page.set_viewport_size({'width':390,'height':844});page.goto(f'http://little-worlds.test/{scene}/?preview=1&time=day');page.locator('canvas').wait_for();shot('mobile')
  assert not errors,errors
  print(json.dumps({'scene':scene,'verification':'local browser fixtures','orbitDifference':orbit,'zoomDifference':zoom,'webgl':webgl,'errors':errors}),flush=True)
  context.close()
 browser.close()
