"""Chromium/WebGL tests using local fixtures, not public deployment verification."""
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
import json, mimetypes
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'work'/'globe-checks';OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for width,height,dpr in [(1440,1000,1),(390,844,3)]:
  context=browser.new_context(viewport={'width':width,'height':height},has_touch=width<500,device_scale_factor=dpr)
  requested=[]
  def fixture(route):
   path=urlsplit(route.request.url).path;requested.append(path)
   if path=='/favicon.ico':route.fulfill(status=204);return
   if path in [f'/{r}/' for r in ['city','rainy','onsen','study','summit','desert','ocean']]:
    route.fulfill(body='<title>Scene navigation destination fixture</title>',content_type='text/html');return
   target=(ROOT/path.lstrip('/')).resolve();assert target.is_relative_to(ROOT)
   if path.endswith('/'):target/='index.html'
   route.fulfill(body=target.read_bytes(),content_type=mimetypes.guess_type(target.name)[0] or 'application/octet-stream')
  context.route('**/*',fixture);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def load():
   page.goto('http://little-worlds.test/');page.wait_for_function('window.__globe?.loaded && window.__globe.modelsReady',timeout=120000);page.wait_for_timeout(500)
  load()
  assert page.locator('canvas').count()==1
  assert page.locator('button,.card,.intro,header,footer,img').count()==0
  assert page.evaluate('document.documentElement.scrollWidth===innerWidth && document.documentElement.scrollHeight===innerHeight')
  info=page.evaluate('''()=>{let meshes=0;__globe.scene.traverse(o=>{if(o.isMesh)meshes++});return {meshes,models:__globe.models.size,natural:[...__globe.models.values()].every(m=>m.userData.naturalBoundary&&m.userData.removedTriangles>0&&m.userData.retainedTriangles>1000),sea:__globe.water.name,triangles:__globe.renderer.info.render.triangles,texture:[__globe.sphere.material.map.image.width,__globe.sphere.material.map.image.height],dpr:__globe.renderer.getPixelRatio(),center:__globe.sphere.position.clone().project(__globe.camera).toArray()}}''')
  assert info['meshes']>=8 and info['models']==7 and info['texture']==[8192,4096] and info['dpr']>=2,info
  assert info['natural'] and info['sea']=='continuous-ocean',info
  assert abs(info['center'][0])<.001 and abs(info['center'][1])<.001
  assert not any('/thumbnails/' in path or path.endswith('/scene.js') for path in requested),requested
  page.screenshot(path=str(OUT/f'{width}-texture.png'))
  page.wait_for_timeout(800);frames=page.evaluate('__globe.frames');page.wait_for_timeout(350);assert page.evaluate('__globe.frames')==frames,'Globe should sleep when stationary'
  def position():return page.evaluate('__globe.camera.position.toArray()')
  cx,cy=width/2,height/2
  before=position();page.mouse.move(cx,cy);page.mouse.down();page.mouse.move(cx+60,cy+30,steps=8);page.mouse.up();page.wait_for_timeout(500)
  assert position()!=before and page.url=='http://little-worlds.test/'
  before=page.evaluate('__globe.controls.target.toArray()');page.mouse.move(cx,cy);page.mouse.down(button='right');page.mouse.move(cx+40,cy+10,steps=6);page.mouse.up(button='right');page.wait_for_timeout(500)
  assert page.evaluate('__globe.controls.target.toArray()')!=before
  before=position();page.mouse.wheel(0,200);page.wait_for_timeout(500);assert position()!=before
  page.emulate_media(reduced_motion='reduce');page.wait_for_function('__globe.controls.enableDamping===false')
  page.mouse.move(0,0)
  for route in ['city','rainy','onsen','study','summit','desert','ocean']:
   # Position the actual camera toward each shared texture/picking region, then hit the sphere.
   page.evaluate('''route=>{const g=__globe,r=g.regions.find(r=>r.route===route);g.controls.target.set(0,0,0);g.camera.position.copy(r.normal).multiplyScalar(11.3);g.controls.update()}''',route)
   page.mouse.move(cx,cy);page.wait_for_function('(r)=>document.querySelector("#globe-view").dataset.active===r',arg=route)
   assert page.evaluate('(r)=>__globe.outlines.get(r).visible',route)
   if width>500:page.screenshot(path=str(OUT/f'planet-{route}.png'))
   page.mouse.move(0,0)
  # A real click opens the independent scene URL. Full iframe rendering for all
  # seven routes is covered separately by check-planet-embeds.py.
  page.mouse.click(cx,cy);page.wait_for_url('**/ocean/')
  load();page.emulate_media(reduced_motion='reduce')
  if width<500:
   session=context.new_cdp_session(page);before=position()
   def touch(kind,spread,shift=0):
    session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if kind=='touchEnd' else [{'x':cx-spread+shift,'y':cy,'id':1},{'x':cx+spread+shift,'y':cy,'id':2}]})
   touch('touchStart',35)
   for spread in [40,45,55,65]:touch('touchMove',spread,10)
   touch('touchEnd',65);page.wait_for_timeout(150);assert position()!=before
   assert page.url=='http://little-worlds.test/'
  assert not errors,errors
  print(json.dumps({'viewport':[width,height],'local_fixture':True,'models':info['models'],'meshes':info['meshes'],'texture':info['texture'],'pixelRatio':info['dpr'],'regions_picked':7,'click_navigation':True,'orbit_pan_zoom':True,'idle_rendering':False,'errors':errors}),flush=True)
  context.close()
 browser.close()
