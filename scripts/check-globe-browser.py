"""Real Chromium/WebGL homepage checks with local HTTP fixtures; no public HTTP claims."""
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'work'/'globe-checks'
OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for width,height in [(1440,1000),(390,844)]:
  context=browser.new_context(viewport={'width':width,'height':height},has_touch=width<500,device_scale_factor=1)
  def fixture(route):
   path=urlsplit(route.request.url).path
   if path=='/favicon.ico':route.fulfill(status=204);return
   target=(ROOT/path.lstrip('/')).resolve()
   assert target.is_relative_to(ROOT)
   if path.endswith('/'):target/='index.html'
   route.fulfill(body=target.read_bytes(),content_type='text/html' if target.suffix=='.html' else 'image/webp')
  context.route('**/*',fixture)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://little-worlds.test/');page.wait_for_function('!!window.__globe');page.wait_for_timeout(500)
  assert page.locator('.card-link').count()==7
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=str(OUT/f'{width}-initial.png'),full_page=True)
  def position():return page.evaluate('window.__globe.camera.position.toArray()')
  initial=position()
  page.locator('#globe-zoom-in').click();page.wait_for_timeout(120);assert position()!=initial
  page.locator('#globe-reset').click();page.wait_for_timeout(120)
  canvas=page.locator('canvas');box=canvas.bounding_box();x=box['x']+box['width']*.5;y=box['y']+box['height']*.5
  before=position();page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+70,y+30,steps=8);page.mouse.up();page.wait_for_timeout(400)
  assert position()!=before;assert page.url=='http://little-worlds.test/'
  before=page.evaluate('window.__globe.controls.target.toArray()');page.mouse.move(x,y);page.mouse.down(button='right');page.mouse.move(x+45,y+10,steps=6);page.mouse.up(button='right');page.wait_for_timeout(300)
  assert page.evaluate('window.__globe.controls.target.toArray()')!=before
  before=position();page.mouse.wheel(0,200);page.wait_for_timeout(300);assert position()!=before
  # Every region is reachable from the named controls and its actual raycast surface.
  for route in ['city','rainy','onsen','study','summit','desert','ocean']:
   page.locator(f'#region-nav button[data-route="{route}"]').click();page.wait_for_timeout(250)
   assert page.locator('#region-enter').get_attribute('href')==f'./{route}/'
   assert page.evaluate('(r)=>window.__globe.outlines.get(r).visible',route)
   # Project the center of the spherical patch onto the actual responsive canvas.
   xy=page.evaluate('''r=>{const g=window.__globe,p=g.regions.find(x=>x.route===r).anchor.clone().normalize().multiplyScalar(3.08).project(g.camera),b=g.renderer.domElement.getBoundingClientRect();return {x:b.x+(p.x+1)*b.width/2,y:b.y+(1-p.y)*b.height/2}}''',route)
   page.mouse.move(xy['x'],xy['y']);page.wait_for_timeout(120)
   assert page.locator('#globe-view').get_attribute('data-active')==route,(width,route)
  page.screenshot(path=str(OUT/f'{width}-highlight.png'),full_page=True)
  # Click a physical patch; intercept navigation to avoid loading unrelated scene runtimes.
  page.mouse.click(xy['x'],xy['y']);page.wait_for_url('**/ocean/')
  page.goto('http://little-worlds.test/');page.wait_for_function('!!window.__globe');page.emulate_media(reduced_motion='reduce');page.wait_for_function('window.__globe.controls.enableDamping===false')
  assert page.evaluate('window.__globe.controls.enableDamping')==False
  if width<500:
   # Native Chromium two-finger pinch/pan events exercise OrbitControls touch mapping.
   page.locator('#globe-view').scroll_into_view_if_needed();b=page.locator('canvas').bounding_box();cx=b['x']+b['width']/2;cy=b['y']+b['height']/2
   session=context.new_cdp_session(page)
   before=position()
   def touch(kind,spread,shift=0):
    session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if kind=='touchEnd' else [{'x':cx-spread+shift,'y':cy,'id':1},{'x':cx+spread+shift,'y':cy,'id':2}]})
   touch('touchStart',35)
   for spread in [40,45,55,65]:touch('touchMove',spread,10)
   touch('touchEnd',65);page.wait_for_timeout(150);assert position()!=before
  assert not errors,errors
  print(json.dumps({'viewport':[width,height],'local_fixture':True,'regions':7,'orbit':True,'pan':True,'zoom':True,'click_navigation':True,'reduced_motion':True,'errors':errors}),flush=True)
  context.close()
 # WebGL failure must preserve all static navigation.
 context=browser.new_context();context.route('**/*',fixture);page=context.new_page()
 page.add_init_script("HTMLCanvasElement.prototype.getContext=function(){return null}")
 page.goto('http://little-worlds.test/');assert page.locator('#globe-view').get_attribute('data-failed')=='true';assert page.locator('.card-link').count()==7
 print('WebGL-unavailable fallback: all seven scene links preserved')
 browser.close()
