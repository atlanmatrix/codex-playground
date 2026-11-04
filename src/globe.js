import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {SCENES} from './scene-registry.js';
import definitions from './globe-regions.json';

const host=document.querySelector('#globe-view');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const R=3;
export const regions=definitions.map(r=>{
 const lat=THREE.MathUtils.degToRad(r.lat),lon=THREE.MathUtils.degToRad(r.lon);
 const normal=new THREE.Vector3(Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon));
 const east=new THREE.Vector3(Math.cos(lon),0,-Math.sin(lon));
 return {...r,normal,east,north:new THREE.Vector3().crossVectors(normal,east)};
});
const edge=(r,a)=>r.size*(1+.13*Math.sin(3*a+r.phase)+.07*Math.cos(5*a-r.phase)+.035*Math.sin(9*a));
function regionAt(point){
 for(let i=regions.length-1;i>=0;i--){
  const r=regions[i],dot=point.dot(r.normal);if(dot<=0)continue;
  const x=point.dot(r.east)/dot,y=point.dot(r.north)/dot;
  if(Math.hypot(x,y)<edge(r,Math.atan2(y,x)))return r.route;
 }
 return 'ocean';
}
// Accessible navigation remains available to assistive technology without visible UI.
for(const s of SCENES){const a=document.createElement('a');a.href=`./${s.route}/`;a.textContent=s.title;document.querySelector('#scene-access').append(a);}

function start(){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
 renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio,2),3));
 renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
 host.append(renderer.domElement);
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.set(0,3.3,10.8);
 const controls=new OrbitControls(camera,renderer.domElement);
 controls.enableDamping=!reduced.matches;controls.dampingFactor=.09;
 controls.minDistance=4.5;controls.maxDistance=19;controls.panSpeed=.6;controls.zoomSpeed=.8;
 controls.minPolarAngle=.1;controls.maxPolarAngle=Math.PI-.1;
 scene.add(new THREE.HemisphereLight(0xffffff,0x829797,2));
 const sun=new THREE.DirectionalLight(0xfff9eb,2.1);sun.position.set(-5,7,8);scene.add(sun);
 const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0});
 const sphere=new THREE.Mesh(new THREE.SphereGeometry(R,192,128),material);scene.add(sphere);
 let frame=0,pointer=null,down=null,active=null,loaded=false,frames=0;
 const outlines=new Map();
 for(const r of regions){
  const points=[];
  for(let i=0;i<=512;i++){
   const a=i/512*Math.PI*2,e=edge(r,a);
   points.push(r.normal.clone().addScaledVector(r.east,Math.cos(a)*e).addScaledVector(r.north,Math.sin(a)*e).normalize().multiplyScalar(R+.006));
  }
  const outline=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xffe6a0,transparent:true,opacity:.95}));
  outline.visible=false;scene.add(outline);outlines.set(r.route,outline);
 }
 const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
 function hit(x,y){
  const box=renderer.domElement.getBoundingClientRect();mouse.set((x-box.left)/box.width*2-1,-(y-box.top)/box.height*2+1);
  ray.setFromCamera(mouse,camera);const result=ray.intersectObject(sphere,false)[0];
  return result?regionAt(result.point.clone().normalize()):null;
 }
 function select(route){
  if(route===active)return;active=route;host.dataset.active=route||'';
  for(const [key,line] of outlines)line.visible=key===route||(route==='ocean');
  renderer.domElement.style.cursor=route?'pointer':'grab';invalidate();
 }
 function render(){
  frame=0;const changed=controls.update();
  if(pointer&&!down)select(hit(pointer.x,pointer.y));
  renderer.render(scene,camera);frames++;
  if(changed&&controls.enableDamping)invalidate();
 }
 function invalidate(){if(!frame)frame=requestAnimationFrame(render);}
 controls.addEventListener('change',()=>{
  const previous=controls.target.clone();controls.target.clampLength(0,1.1);
  camera.position.add(controls.target.clone().sub(previous));
  if(camera.position.length()<R+1.1)camera.position.setLength(R+1.1);
  invalidate();
 });
 controls.addEventListener('start',()=>select(null));
 renderer.domElement.addEventListener('pointermove',e=>{pointer={x:e.clientX,y:e.clientY};if(!down)select(hit(e.clientX,e.clientY));});
 renderer.domElement.addEventListener('pointerleave',()=>{pointer=null;select(null);});
 renderer.domElement.addEventListener('pointerdown',e=>{if(down)down.cancel=true;else down={x:e.clientX,y:e.clientY,id:e.pointerId,button:e.button,cancel:false};});
 renderer.domElement.addEventListener('pointerup',e=>{
  if(!down)return;
  const click=down.id===e.pointerId&&!down.cancel&&down.button===0&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<6;
  down=null;if(click){const route=hit(e.clientX,e.clientY);if(route)location.assign(`./${route}/`);}
 });
 renderer.domElement.addEventListener('pointercancel',()=>{down=null;});
 // Keyboard operation adds no visible controls or labels.
 host.addEventListener('keydown',e=>{
  const step=.12;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
   e.preventDefault();const offset=camera.position.clone().sub(controls.target),s=new THREE.Spherical().setFromVector3(offset);
   s.theta+=e.key==='ArrowLeft'?step:e.key==='ArrowRight'?-step:0;
   s.phi=THREE.MathUtils.clamp(s.phi+(e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0),.1,Math.PI-.1);
   camera.position.copy(controls.target).add(offset.setFromSpherical(s));controls.update();invalidate();
  }else if(e.key==='+'||e.key==='-'||e.key==='='){
   e.preventDefault();const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*(e.key==='-'?1.12:.89),controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);controls.update();invalidate();
  }else if(e.key==='Enter'){
   const box=renderer.domElement.getBoundingClientRect(),route=hit(box.width/2,box.height/2);if(route)location.assign(`./${route}/`);
  }
 });
 function resize(){
  const w=host.clientWidth,h=host.clientHeight;
  renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio,2),3,renderer.capabilities.maxTextureSize/Math.max(w,h)));renderer.setSize(w,h);
  camera.aspect=w/h;camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(38/2))/Math.min(1,camera.aspect)));
  camera.updateProjectionMatrix();invalidate();
 }
 new ResizeObserver(resize).observe(host);resize();
 reduced.addEventListener('change',()=>{controls.enableDamping=!reduced.matches;invalidate();});
 new THREE.TextureLoader().load(__GLOBE_TEXTURE_URL__,texture=>{
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());
  material.map=texture;material.needsUpdate=true;loaded=true;host.dataset.ready='true';invalidate();
 },undefined,()=>{host.dataset.failed='true';});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();host.dataset.failed='true';cancelAnimationFrame(frame);});
 renderer.domElement.addEventListener('webglcontextrestored',()=>{delete host.dataset.failed;invalidate();});
 window.__globe={camera,controls,regions,outlines,renderer,scene,sphere,get loaded(){return loaded;},get frames(){return frames;}};
}
try{start();}catch(error){host.dataset.failed='true';console.error(error);}
