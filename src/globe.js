import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {SCENES} from './scene-registry.js';

const host=document.querySelector('#globe-view');
const status=document.querySelector('#globe-status');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const R=3;
const regions=[
 {route:'city',label:'绿野小城',lat:-3,lon:-32,size:.53,color:0x82aa72},
 {route:'rainy',label:'雨夜海岸',lat:22,lon:144,size:.48,color:0x708d87},
 {route:'onsen',label:'山林温泉',lat:20,lon:30,size:.51,color:0x6e9566},
 {route:'study',label:'午后栖居',lat:-24,lon:-143,size:.52,color:0x9eae77},
 {route:'summit',label:'极地雪山',lat:62,lon:-18,size:.49,color:0xd6e6de},
 {route:'desert',label:'金色沙海',lat:-39,lon:24,size:.53,color:0xd6b576},
 {route:'ocean',label:'珊瑚蓝海',lat:-13,lon:94,size:.50,color:0x66b8b8},
].map(r=>({...r,...SCENES.find(s=>s.route===r.route)}));

function start(){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));
 renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
 host.append(renderer.domElement);
 renderer.domElement.setAttribute('aria-label','地形星球：拖动旋转，滚轮缩放，右键拖动平移，点击区域进入场景');
 let dirty=true;
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(37,1,.1,100);camera.position.set(0,3.3,10.8);
 const controls=new OrbitControls(camera,renderer.domElement);
 controls.enableDamping=!reduced.matches;controls.dampingFactor=.08;controls.minDistance=5.3;controls.maxDistance=17;
 controls.enablePan=true;controls.panSpeed=.6;controls.zoomSpeed=.8;controls.minPolarAngle=.12;controls.maxPolarAngle=Math.PI-.12;
 const initial=camera.position.clone();
 scene.add(new THREE.HemisphereLight(0xfffbdf,0x487d8c,2.5));
 const sun=new THREE.DirectionalLight(0xfff1ce,3);sun.position.set(-4,8,6);scene.add(sun);
 const world=new THREE.Group();scene.add(world);
 const material=(color)=>new THREE.MeshStandardMaterial({color,roughness:.88,flatShading:true});
 const sea=new THREE.Mesh(new THREE.IcosahedronGeometry(R,5),material(0x6baebc));world.add(sea);sea.userData.route='ocean';
 const pickables=[sea];
 const up=new THREE.Vector3(0,1,0);
 let seed=342;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const outlines=new Map();const anchors=new Map();
 function mesh(parent,geo,color,pos){const m=new THREE.Mesh(geo,material(color));if(pos)m.position.set(...pos);parent.add(m);return m;}
 function tree(parent,x,z,scale=1,autumn=false){
  const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);parent.add(g);
  mesh(g,new THREE.CylinderGeometry(.018,.026,.19,5),0x79634a,[0,.09,0]);
  mesh(g,new THREE.ConeGeometry(.115,.32,6),autumn?0xbf8254:0x386e59,[0,.28,0]);
  mesh(g,new THREE.ConeGeometry(.09,.25,6),autumn?0xd7a25d:0x4c8060,[0,.4,0]);
 }
 function house(parent,x,z,scale=1,roof=0x9d7460){
  const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);parent.add(g);
  mesh(g,new THREE.BoxGeometry(.23,.22,.23),0xeadbc1,[0,.11,0]);
  const top=mesh(g,new THREE.ConeGeometry(.22,.15,4),roof,[0,.29,0]);top.rotation.y=Math.PI/4;
  mesh(g,new THREE.BoxGeometry(.068,.09,.008),0xf7cf7c,[0,.13,.12]);
 }
 for(const r of regions){
  const lat=THREE.MathUtils.degToRad(r.lat),lon=THREE.MathUtils.degToRad(r.lon);
  const n=new THREE.Vector3(Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon));
  const east=new THREE.Vector3(Math.cos(lon),0,-Math.sin(lon));const north=new THREE.Vector3().crossVectors(n,east);
  r.normal=n;r.east=east;r.north=north;
  const phase=random()*6;
  function edge(a){return r.size*(1+.13*Math.sin(3*a+phase)+.07*Math.cos(5*a-phase)+.035*Math.sin(9*a));}
  function height(x,y){const d=Math.hypot(x,y)/edge(Math.atan2(y,x));return .026+Math.max(0,1-d*d)*(.055+.04*Math.sin(x*18+phase)*Math.cos(y*14));}
  function point(x,y,extra=0){return n.clone().addScaledVector(east,x).addScaledVector(north,y).normalize().multiplyScalar(R+height(x,y)+extra);}
  const verts=[],colors=[],indices=[];const rings=16,steps=80;const base=new THREE.Color(r.color);
  for(let j=0;j<=rings;j++)for(let i=0;i<=steps;i++){
   const a=i/steps*Math.PI*2,s=j/rings*edge(a),x=Math.cos(a)*s,y=Math.sin(a)*s;verts.push(...point(x,y));
   const c=base.clone().multiplyScalar(.94+random()*.13);if(j>14&&r.route!=='summit'&&r.route!=='ocean')c.lerp(new THREE.Color(0xe2d2a1),.55);colors.push(c.r,c.g,c.b);
   if(j<rings&&i<steps){const k=j*(steps+1)+i;indices.push(k,k+1,k+steps+1,k+1,k+steps+2,k+steps+1);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
  const land=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true,side:THREE.DoubleSide}));land.userData.route=r.route;world.add(land);pickables.push(land);
  const borderPoints=[];for(let i=0;i<=160;i++){const a=i/160*Math.PI*2; borderPoints.push(point(Math.cos(a)*edge(a),Math.sin(a)*edge(a),.018));}
  const border=new THREE.Line(new THREE.BufferGeometry().setFromPoints(borderPoints),new THREE.LineBasicMaterial({color:0xffeeae,transparent:true,opacity:.95}));border.visible=false;world.add(border);outlines.set(r.route,border);
  anchors.set(r.route,point(0,0,.45));
  function place(x,y,build){const g=new THREE.Group();g.position.copy(point(x,y));g.quaternion.setFromUnitVectors(up,g.position.clone().normalize());world.add(g);build(g);g.traverse(o=>{if(o.isMesh){o.userData.route=r.route;pickables.push(o);}});return g;}
  // Small landmarks echo each existing scene, following the curvature of the planet.
  for(let i=0;i<30;i++){
   const a=random()*Math.PI*2,s=Math.sqrt(random())*r.size*.78,x=Math.cos(a)*s,y=Math.sin(a)*s;
   place(x,y,g=>{
    if(r.route==='summit'){
     const h=.16+random()*.48;mesh(g,new THREE.ConeGeometry(.13+random()*.12,h,5),0x8a9f99,[0,h/2,0]);mesh(g,new THREE.ConeGeometry(.10,h*.48,5),0xf2f2de,[0,h*.79,0]);
    }else if(r.route==='desert'){
     const dune=mesh(g,new THREE.SphereGeometry(.21+random()*.12,8,5),i%2?0xdcb879:0xe3c58c,[0,0,0]);dune.scale.set(1,.35,1.5);dune.rotation.y=random()*2;
     if(i%5===0){mesh(g,new THREE.CylinderGeometry(.022,.03,.23,5),0x71885c,[0,.115,0]);mesh(g,new THREE.BoxGeometry(.1,.025,.025),0x71885c,[.025,.14,0]);}
    }else if(r.route==='ocean'){
     const rock=mesh(g,new THREE.IcosahedronGeometry(.09,0),i%3?0x97d3c6:0xe6b1a1,[0,.025,0]);rock.scale.set(1,.5,1.2);
     if(i%3===0)mesh(g,new THREE.ConeGeometry(.035,.18,5),0xd99889,[0,.09,0]);
    }else if(i%4===0 && r.route!=='onsen'){house(g,0,0,.8+random()*.5,r.route==='rainy'?0x526976:0x9d7460);}
    else tree(g,0,0,.65+random()*.65,r.route==='onsen'&&i%3===0);
   });
  }
  if(r.route==='onsen')place(0,0,g=>{house(g,0,0,2,0x5d6761);mesh(g,new THREE.CylinderGeometry(.21,.22,.035,20),0x9acbc2,[.35,.02,.1]);});
  if(r.route==='city')place(0,0,g=>{for(let i=0;i<4;i++)house(g,(i%2)*.32-.15,Math.floor(i/2)*.34-.15,1.3);});
  if(r.route==='study')place(0,0,g=>{house(g,0,0,2,0xb1845f);tree(g,-.4,.1,1.5);});
  if(r.route==='rainy')place(0,0,g=>{mesh(g,new THREE.BoxGeometry(.6,.25,.3),0xc9cdc0,[0,.125,0]);mesh(g,new THREE.BoxGeometry(.63,.05,.35),0x497c73,[0,.27,0]);mesh(g,new THREE.BoxGeometry(.5,.13,.012),0xffdc8d,[0,.14,.155]);});
 }
 // Fine ocean currents make the open water legible without obscuring the land.
 for(let i=0;i<100;i++){
  const n=new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize();
  const g=new THREE.Group();g.position.copy(n.multiplyScalar(R+.008));g.quaternion.setFromUnitVectors(up,g.position.clone().normalize());
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.035,0,0),new THREE.Vector3(.035,0,0)]),new THREE.LineBasicMaterial({color:0xc3e4df,transparent:true,opacity:.35}));g.add(line);world.add(g);
 }
 let active=null,pointer=null,down=null;
 const ray=new THREE.Raycaster();const mouse=new THREE.Vector2();
 const title=document.querySelector('#region-title'),desc=document.querySelector('#region-description'),enter=document.querySelector('#region-enter');
 function select(route){
  if(active===route)return;dirty=true;active=route;for(const [key,line] of outlines)line.visible=key===route||route==='ocean';
  const r=regions.find(r=>r.route===route);host.dataset.active=route||'';
  title.textContent=r?r.label:'一颗星球，七种慢时光';desc.textContent=r?r.title:'转动星球，寻找属于你的一隅风景。';
  enter.hidden=!r;if(r){enter.href=`./${r.route}/`;enter.textContent='走进这处风景 ↗';}
  renderer.domElement.style.cursor=r?'pointer':'grab';
 }
 function hit(x,y){const rect=renderer.domElement.getBoundingClientRect();mouse.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);return ray.intersectObjects(pickables,false)[0]?.object.userData.route||null;}
 renderer.domElement.addEventListener('pointermove',e=>{pointer={x:e.clientX,y:e.clientY};if(!down)select(hit(e.clientX,e.clientY));});
 renderer.domElement.addEventListener('pointerleave',()=>{pointer=null;});
 renderer.domElement.addEventListener('pointerdown',e=>{if(down)down.cancel=true;else down={x:e.clientX,y:e.clientY,id:e.pointerId,button:e.button,cancel:false};});
 renderer.domElement.addEventListener('pointerup',e=>{if(!down)return;const click=down.id===e.pointerId&&!down.cancel&&down.button===0&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<6;down=null;if(click){const route=hit(e.clientX,e.clientY);if(route)location.assign(`./${route}/`);}});
 renderer.domElement.addEventListener('pointercancel',()=>{down=null;});
 controls.addEventListener('start',()=>{select(null);});
 // Keep panning bounded so the planet remains recoverable and camera never enters it.
 controls.addEventListener('change',()=>{dirty=true;const before=controls.target.clone();controls.target.clampLength(0,1.2);camera.position.add(controls.target.clone().sub(before));if(camera.position.length()<R+1.2)camera.position.setLength(R+1.2);});
 document.querySelector('#globe-reset').onclick=()=>{controls.target.set(0,0,0);camera.position.copy(initial);controls.update();select(null);};
 document.querySelector('#globe-zoom-in').onclick=()=>zoom(.82);
 document.querySelector('#globe-zoom-out').onclick=()=>zoom(1.22);
 function zoom(factor){const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);controls.update();}
 const nav=document.querySelector('#region-nav');
 for(const r of regions){const b=document.createElement('button');b.type='button';b.textContent=r.label;b.dataset.route=r.route;b.title=`定位${r.title}`;b.onclick=()=>{controls.target.set(0,0,0);camera.position.copy(r.normal).multiplyScalar(initial.length());camera.up.set(0,1,0);controls.update();pointer=null;select(r.route);};nav.append(b);}
 function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(37/2))/Math.min(1,camera.aspect)));camera.updateProjectionMatrix();dirty=true;}
 new ResizeObserver(resize).observe(host);resize();
 reduced.addEventListener('change',()=>{controls.enableDamping=!reduced.matches;});
 let previous=0;
 renderer.setAnimationLoop(time=>{if(time-previous<30)return;previous=time;controls.update();if(pointer&&!down)select(hit(pointer.x,pointer.y));if(dirty){renderer.render(scene,camera);dirty=false;}});
 status.textContent='拖动旋转 · 滚轮缩放 · 右键拖动平移';
 // Expose only geometry/camera observations for repeatable browser interaction checks.
 window.__globe={camera,controls,regions:regions.map(r=>({route:r.route,anchor:anchors.get(r.route)})),outlines,renderer};
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();status.textContent='3D 显示已中断，请刷新页面，或使用下方场景卡片。';});
}
try{start();}catch(error){host.dataset.failed='true';status.textContent='当前设备暂不支持 3D 显示，可使用下方场景卡片进入。';console.error(error);}
