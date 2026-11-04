"""Verify the unchanged public URL format still renders every scene in an iframe.
Uses local browser fixtures, not the public GitHub Pages deployment.
"""
from pathlib import Path
from urllib.parse import urlsplit
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
SCENES=['city','rainy','onsen','study','summit','desert','ocean']
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for name in SCENES:
  context=browser.new_context(viewport={'width':640,'height':480},reduced_motion='reduce');page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def fixture(route):
   url=urlsplit(route.request.url)
   if url.hostname=='embed-host.test':route.fulfill(content_type='text/html',body=f'<body style="margin:0"><iframe title="{name}" src="http://little-worlds.test/{name}/?preview=1&time=day" width="640" height="480" style="border:0"></iframe></body>');return
   if url.path=='/favicon.ico':route.fulfill(status=204);return
   if url.hostname=='little-worlds.test' and url.path==f'/{name}/':route.fulfill(content_type='text/html',body=(ROOT/name/'index.html').read_bytes());return
   route.abort()
  context.route('**/*',fixture);page.goto('http://embed-host.test/')
  frame=page.frames[1];frame.wait_for_function('window.littleWorlds',timeout=90000)
  assert frame.evaluate('littleWorlds.getState().scene')==name
  assert frame.locator('canvas').count()>=1
  gl=frame.evaluate('()=>{const gl=document.querySelector("canvas").getContext("webgl2");return gl&&!gl.isContextLost()&&gl.getError()===gl.NO_ERROR}')
  assert gl and not errors,(name,errors)
  print(json.dumps({'scene':name,'iframe_url':f'/{name}/','webgl':gl,'local_fixture':True}),flush=True)
  context.close()
 browser.close()
