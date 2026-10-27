import {installSceneCapture} from './scene-capture.js';
import {expandWorld,expandedFit} from './expansions/intersection.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CORE_BASE_SIZE } from './scene-defaults.js';

const preview=['preview','screenshot'].some(key=>new URLSearchParams(location.search).has(key));
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene=new THREE.Scene(),renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,preview?1:1.8));renderer.setSize(Math.max(1,innerWidth),Math.max(1,innerHeight));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.localClippingEnabled=true;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
document.body.appendChild(renderer.domElement);renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','午后的十字路口，车辆随红绿灯交替通行；拖拽旋转，滚轮或双指缩放');
const camera=new THREE.PerspectiveCamera(34,Math.max(1,innerWidth)/Math.max(1,innerHeight),.3,350);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.5,0);controls.enableDamping=true;controls.enabled=!preview;controls.enablePan=false;controls.minDistance=37;controls.maxDistance=260;controls.minPolarAngle=.24;controls.maxPolarAngle=Math.PI*.44;
const fit=aspect=>expandedFit(aspect);const direction=new THREE.Vector3(.64,.82,.86).normalize();camera.position.copy(direction.multiplyScalar(fit(camera.aspect))).add(controls.target);camera.lookAt(controls.target);
scene.add(new THREE.HemisphereLight(0xe4f3ff,0xb5ad8d,2.1));
const sun=new THREE.DirectionalLight(0xffefd3,3.1);sun.position.set(-14,28,18);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:70});sun.shadow.normalBias=.035;scene.add(sun);
const model=new THREE.Group();model.name='intersection-miniature';model.userData.baseSize=CORE_BASE_SIZE;scene.add(model);
const scenery=new THREE.Group();scenery.name='four-corner-neighborhood';model.add(scenery);
const ramp=new THREE.DataTexture(new Uint8Array([85,150,205,240,255]),5,1,THREE.RedFormat);ramp.needsUpdate=true;ramp.minFilter=ramp.magFilter=THREE.NearestFilter;
const toon=color=>new THREE.MeshToonMaterial({color,gradientMap:ramp});
const m=Object.fromEntries(Object.entries({soil:'#a59b81',base:'#c6c3af',road:'#71818a',paving:'#dcd7bf',curb:'#f0ebd5',white:'#fff7de',yellow:'#e9c76c',dark:'#3d5159',steel:'#91a5a6',glass:'#769ba1',glassLight:'#adcbd0',cream:'#edddbc',pink:'#dea995',mint:'#a8c5b0',blue:'#a4b9c4',roof:'#a2b3ad',wood:'#a77a55',leaf:'#719a62',leafLight:'#9bb477',pot:'#bb7e5c',red:'#cd7161'}).map(([k,c])=>[k,toon(c)]));
const geo={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.IcosahedronGeometry(1,1),cylinder:new THREE.CylinderGeometry(1,1,1,10)};
function mesh(g,mat,x,y,z,sx,sy,sz,parent=scenery){const o=new THREE.Mesh(g,mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
const box=(x,y,z,w,h,d,mat,parent)=>mesh(geo.box,mat,x,y,z,w,h,d,parent);
const ball=(x,y,z,w,h,d,mat,parent)=>mesh(geo.sphere,mat,x,y,z,w,h,d,parent);
const pole=(x,y,z,r,h,mat,parent)=>mesh(geo.cylinder,mat,x,y,z,r,h,r,parent);
function batch(parent){
 parent.updateMatrixWorld(true);const inverse=parent.matrixWorld.clone().invert(),parts=new Map(),remove=[];
 parent.traverse(o=>{if(!o.isMesh||o.isInstancedMesh)return;let p=parts.get(o.material);if(!p){p=[];parts.set(o.material,p)}p.push(o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld)));remove.push(o)});
 remove.forEach(o=>o.removeFromParent());for(const [mat,gs] of parts){const converted=gs.map(g=>g.index?g.toNonIndexed():g);const o=new THREE.Mesh(mergeGeometries(converted,false),mat);o.castShadow=o.receiveShadow=true;parent.add(o);gs.forEach(g=>g.dispose());converted.forEach(g=>g.dispose())}
}
function sign(text,x,y,z,w,h,bg,rotation=0,parent=scenery){
 const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.fillStyle='#fff6dc';ctx.font='600 70px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,65,480);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const o=box(x,y,z,w,h,.06,new THREE.MeshToonMaterial({map:tex,gradientMap:ramp}),parent);o.rotation.y=rotation;return o;
}
// A complete square section. Both streets continue naturally to the four cut edges.
box(0,-.73,0,CORE_BASE_SIZE,1.3,CORE_BASE_SIZE,m.soil);box(0,-.02,0,32,.12,32,m.base);
box(0,.07,0,8,.06,32,m.road);box(-10,.07,0,12,.06,8,m.road);box(10,.07,0,12,.06,8,m.road);
const shadow=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.14}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-1.4;scene.add(shadow);
const tiles=[],dummy=new THREE.Object3D();
for(const sx of [-1,1])for(const sz of [-1,1]){
 box(sx*10,.18,sz*10,12,.25,12,m.paving);
 for(let i=0;i<24;i++)for(let j=0;j<24;j++)tiles.push([sx*(4.25+i*.5),sz*(4.25+j*.5)]);
 for(let p=4.3;p<16;p+=.62){box(sx*4.07,.29,sz*p,.16,.18,.58,m.curb);box(sx*p,.29,sz*4.07,.58,.18,.16,m.curb)}
}
const tileMesh=new THREE.InstancedMesh(geo.box,m.paving,tiles.length);tiles.forEach(([x,z],i)=>{dummy.position.set(x,.313,z);dummy.scale.set(.478,.016,.478);dummy.updateMatrix();tileMesh.setMatrixAt(i,dummy.matrix);tileMesh.setColorAt(i,new THREE.Color(i%5===0?'#cecbb5':i%3===0?'#e6dfc7':'#dbd7c0'))});tileMesh.receiveShadow=true;scenery.add(tileMesh);
// Four zebra crossings, double center lines, stop bars and directional arrows.
for(let axis=0;axis<2;axis++){
 const g=new THREE.Group();g.rotation.y=axis*Math.PI/2;scenery.add(g);
 for(const side of [-1,1]){
  for(let x=-3.35;x<3.6;x+=.67)box(x,.115,side*5.25,.36,.024,1.45,m.white,g);
  box(-side*2,.116,side*6.4,3.5,.025,.14,m.white,g);
  for(const x of [-.13,.13])box(x,.115,side*11.35,.055,.024,9.3,m.yellow,g);
  for(const z of [8.4,12.3]){
   const arrow=new THREE.Group();arrow.position.set(-side*2,.12,side*z);arrow.rotation.y=side>0?Math.PI:0;g.add(arrow);
   box(0,0,0,.12,.02,1.1,m.white,arrow);for(const s of [-1,1]){const a=box(s*.17,0,.4,.1,.02,.48,m.white,arrow);a.rotation.y=s*.8}
  }
 }
}
// Low corner shops leave the junction and all four approaches visible.
const shops=[[-10,-11,7,7,5.6,m.cream,'珈 琲 角','#6c9484'],[10,-11,7,6,7.5,m.mint,'青 空 书 店','#688a9b'],[-11,10,6,7,4.4,m.pink,'花 与 日 常','#ab7d6e'],[11,11,6,6,5.6,m.cream,'日 和 商 店','#c28e57']];
shops.forEach(([x,z,w,d,h,mat,title,color],index)=>{
 const g=new THREE.Group();g.name=`corner-shop-${index}`;scenery.add(g);
 box(x,.43,z,w+.5,.22,d+.5,m.curb,g);box(x,h/2+.5,z,w,h,d,mat,g);box(x,h+.56,z,w+.35,.22,d+.35,m.curb,g);
 // Repeated panes on both street-facing walls.
 const front=z<0?1:-1,side=x<0?1:-1;
 for(let y=1.5;y<h;y+=1.65){
  for(let dx=-w/2+.8;dx<w/2;dx+=1.45){box(x+dx,y,z+front*(d/2+.03),1.05,1.05,.065,m.glass,g);box(x+dx,y,z+front*(d/2+.08),.045,1.1,.055,m.curb,g);box(x+dx,y-.55,z+front*(d/2+.13),1.18,.09,.24,m.curb,g)}
  for(let dz=-d/2+.9;dz<d/2;dz+=1.5){box(x+side*(w/2+.03),y,z+dz,.065,1.05,1.05,m.glass,g);box(x+side*(w/2+.08),y,z+dz,.055,1.1,.045,m.curb,g)}
 }
 // Outer facades are also furnished, so the foreground blocks read well from every orbit.
 for(let y=1.5;y<h;y+=1.65){
  for(let dx=-w/2+.9;dx<w/2;dx+=1.65){box(x+dx,y,z-front*(d/2+.03),1.0,1.02,.065,m.glass,g);box(x+dx,y,z-front*(d/2+.08),.055,1.05,.04,m.curb,g);box(x+dx,y-.54,z-front*(d/2+.13),1.16,.09,.25,m.curb,g)}
  for(let dz=-d/2+.9;dz<d/2;dz+=1.65){box(x-side*(w/2+.03),y,z+dz,.065,1.02,1.0,m.glass,g);box(x-side*(w/2+.08),y,z+dz,.045,1.05,.055,m.curb,g)}
 }
 for(const dz of [-1.1,1.1]){box(x-side*(w/2+.23),1.0,z+dz,.42,.4,.7,m.roof,g);for(let j=0;j<4;j++)box(x-side*(w/2+.45),.88+j*.08,z+dz,.02,.025,.54,m.dark,g)}
 const fz=z+front*(d/2+.11);sign(title,x,2.8,fz,w-.5,.56,color,front<0?Math.PI:0,g);
 for(let i=0;i<12;i++){const a=box(x-w/2+.15+i*w/12,2.36,fz+front*.48,w/12-.015,.07,1.05,i%2?m.curb:index===2?m.pink:m.mint,g);a.rotation.x=front*.18}
 box(x,1.3,fz,.86,1.7,.08,m.dark,g);box(x,1.4,fz+front*.05,.68,1.2,.06,m.glassLight,g);ball(x+.26,1.13,fz+front*.10,.045,.045,.045,m.yellow,g);
 // Roof rim, equipment, planter boxes and cafe furniture.
 for(const dz of [-d/2,d/2])box(x,h+.8,z+dz,w,.3,.15,m.roof,g);
 for(const dx of [-w/2,w/2])box(x+dx,h+.8,z,.15,.3,d,m.roof,g);
 box(x+.9,h+.93,z-.6,1.35,.58,.9,m.roof,g);pole(x-1.2,h+1.2,z+.6,.22,1.1,m.steel,g);
 for(const dx of [-w/2+.5,w/2-.5]){box(x+dx,.65,fz+front*.4,.55,.65,.55,m.wood,g);ball(x+dx,1.13,fz+front*.4,.48,.43,.46,m.leaf,g)}
 if(index===0)for(const dx of [-1.6,1.6]){const pz=fz+front*1.7;pole(x+dx,.78,pz,.055,.85,m.dark,g);pole(x+dx,1.23,pz,.57,.09,m.wood,g);for(const a of [-1,1]){box(x+dx+a*.8,.76,pz,.48,.12,.48,m.wood,g);for(const dz of [-.15,.15])pole(x+dx+a*.8,.5,pz+dz,.025,.5,m.dark,g)}}
});
function tree(x,z,size=1){pole(x,1.8,z,.14,3,m.wood);for(let i=0;i<7;i++){const a=i*2.4;ball(x+Math.cos(a)*.7*size,3.4+(i%3)*.4*size,z+Math.sin(a)*.7*size,.95*size,.95*size,.95*size,i%2?m.leaf:m.leafLight)}box(x,.38,z,1.8,.16,1.8,m.soil)}
for(const [x,z] of [[-5.4,-9],[-5.4,-14.3],[5.5,-14.1],[14.2,-5.5],[-14.2,5.5],[-5.5,14.2],[5.5,9],[14.2,5.5]])tree(x,z,.9);
for(const [x,z] of [[-6.1,6.1],[6.1,-6.1]]){
 box(x,.67,z,1.7,.13,.58,m.wood);box(x,.97,z+.25,1.7,.48,.09,m.wood);for(const dx of [-.6,.6])box(x+dx,.46,z,.1,.5,.44,m.dark);
}
for(const sx of [-1,1])for(const sz of [-1,1]){
 const x=sx*4.8,z=sz*7.0;pole(x,2.8,z,.065,5,m.steel);box(x-sx*.38,5.3,z,.85,.14,.3,m.curb);
 box(sx*7.3,.7,sz*5,.45,.8,.45,m.mint);
 for(let i=0;i<3;i++)pole(sx*(5+i*.65),.64,sz*4.65,.055,.75,m.dark);
}
batch(scenery);
// Signal heads are separate so their lit lenses can change without rebuilding scenery.
const signals=[];
for(let lane=0;lane<4;lane++){
 const axis=lane<2?0:1,dir=lane%2===0?1:-1;
 const g=new THREE.Group();g.name=`traffic-signal-${lane}`;g.rotation.y=(axis?Math.PI/2:0)+(dir<0?Math.PI:0);model.add(g);
 pole(-4.65,2.4,-6.25,.085,4.2,m.dark,g);box(-2.65,4.5,-6.25,4.15,.1,.1,m.dark,g);box(-2.05,4.28,-6.25,1.28,.48,.4,m.dark,g);
 const lights=[];for(let i=0;i<3;i++){const mat=toon('#3c5050');mat.emissive=new THREE.Color(0);lights.push(mat);const lens=pole(-2.47+i*.42,4.28,-6.48,.155,.06,mat,g);lens.rotation.x=Math.PI/2}
 signals.push({axis,lights,g});
}
const edgePlanes=[new THREE.Plane(new THREE.Vector3(1,0,0),64),new THREE.Plane(new THREE.Vector3(-1,0,0),64),new THREE.Plane(new THREE.Vector3(0,0,1),64),new THREE.Plane(new THREE.Vector3(0,0,-1),64)];
const cars=[],lanes=[];const colors=['#e0b354','#bd7467','#8bb5a5','#eee5cb','#91afc0','#adbd85'];
for(let lane=0;lane<4;lane++){
 const axis=lane<2?0:1,dir=lane%2===0?1:-1,list=[];lanes.push(list);
 for(let i=0;i<3;i++){
  const g=new THREE.Group();g.name='moving-traffic-car';model.add(g);const body=toon(colors[(lane*2+i)%colors.length]),van=(lane+i)%4===0;
  box(0,.66,0,1.35,.6,2.65,body,g);box(0,1.12,van?-.15:-.08,1.17,van?.75:.57,van?1.95:1.42,body,g);
  box(0,1.19,van?.85:.65,1.04,.36,.035,m.glass,g);box(0,1.19,van?-1.15:-.81,1.04,.35,.035,m.glass,g);
  for(const side of [-1,1]){box(side*.598,1.2,-.12,.035,.34,van?1.6:1.14,m.glass,g);box(side*.62,1.21,-.15,.05,.4,.06,body,g);box(side*.74,1.0,.48,.15,.16,.22,body,g);box(side*.64,.76,-.3,.04,.045,.17,m.steel,g)}
  for(const end of [-1,1]){box(0,.48,end*1.34,1.13,.12,.06,m.steel,g);box(0,.59,end*1.375,.32,.14,.035,m.curb,g);for(const side of [-1,1])box(side*.44,.76,end*1.33,.26,.17,.055,end>0?m.white:m.red,g)}
  if(van)box(0,1.56,-.15,1.23,.09,2.02,body,g);
  batch(g);g.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.clippingPlanes=edgePlanes}});
  const wheels=[];for(const side of [-1,1])for(const z of [-.83,.83]){
   const pivot=new THREE.Group();pivot.position.set(side*.67,.39,z);g.add(pivot);const tire=pole(0,0,0,.29,.15,m.dark,pivot);tire.rotation.z=Math.PI/2;const hub=pole(side*.085,0,0,.145,.016,m.steel,pivot);hub.rotation.z=Math.PI/2;
   // A spoke makes the rolling motion visible.
   box(side*.098,0,0,.018,.22,.045,m.steel,pivot);batch(pivot);pivot.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.clippingPlanes=edgePlanes}});wheels.push(pivot);
  }
  const u=axis===0?[-.8,-9,-13.8][i]:[-8.1,-12.3,-16.5][i];
  const car={g,lane,axis,dir,u,v:axis===0?3.3:0,wheels,travel:0};cars.push(car);list.push(car);g.userData={lane,axis,dir};
 }
}
// Right-hand lanes in both directions. Fixed steps keep queues stable on slow devices.
function pose(c){const along=c.u*c.dir,lateral=-2.02*c.dir;c.g.position.set(c.axis?along:lateral,Math.abs(c.u)>16?.14:0,c.axis?-lateral:along);c.g.rotation.y=(c.axis?Math.PI/2:0)+(c.dir<0?Math.PI:0);c.wheels.forEach(w=>w.rotation.x=c.travel/.29);c.g.userData.progress=c.u;c.g.userData.speed=c.v;}
function phase(t){const p=t%34;return p<10?[0,'green']:p<12?[0,'amber']:p<17?[-1,'red']:p<27?[1,'green']:p<29?[1,'amber']:[-1,'red']}
function lamps(t){const [axis,state]=phase(t);model.userData.signalPhase={axis,state};signals.forEach(s=>{const active=s.axis===axis?(state==='green'?2:1):0;s.g.userData.state=active;for(let i=0;i<3;i++){const color=i===active?['#ed7961','#ffd16b','#87d0ac'][i]:'#3c5050';s.lights[i].color.set(color);s.lights[i].emissive.set(i===active?color:'#000000');s.lights[i].emissiveIntensity=.3}})}
function step(dt,t){
 const [active,state]=phase(t);
 for(const list of lanes){
  const sorted=[...list].sort((a,b)=>b.u-a.u);
  for(let i=0;i<sorted.length;i++){
   const c=sorted[i],leader=sorted[i-1];let limit=leader?leader.u-3.75:Infinity;
   // A front bumper already past the stop line commits through the clearance interval.
   if(c.u<=-7.85&&!(c.axis===active&&state==='green'))limit=Math.min(limit,-7.85);
   const gap=limit-c.u,target=Math.min(3.3,Math.sqrt(Math.max(0,2*2.8*gap)));
   c.v=Math.max(0,c.v+THREE.MathUtils.clamp(target-c.v,-3.5*dt,1.6*dt));
   const movement=Math.max(0,Math.min(c.v*dt,gap));c.u+=movement;c.travel+=movement;if(gap<.002)c.v=0;
  }
  for(const c of list)if(c.u>66.2){const tail=Math.min(...list.filter(a=>a!==c).map(a=>a.u));if(tail>-62.2){c.u=-66.4;c.v=3.3}else c.v=0}
 }
 cars.forEach(pose);lamps(t);
}
cars.forEach(pose);lamps(0);
let last=null,simulation=0,accumulator=0;
const expandedWorld=expandWorld({kind:'intersection',scene,model,camera,controls,renderer,preview,reduced});
function renderFrame(ms){
 expandedWorld.update(ms*.001);
 if(last===null)last=ms;const delta=Math.max(0,Math.min((ms-last)/1000,.25));last=ms;
 if(!preview&&!reduced){accumulator+=delta;while(accumulator>=1/60){simulation+=1/60;step(1/60,simulation);accumulator-=1/60}}
 controls.update();renderer.render(scene,camera);
}
installSceneCapture({kind:'intersection',camera,controls,renderer,preview,render:()=>renderFrame(preview?0:performance.now(),true)});
if(preview)renderFrame(0);else renderer.setAnimationLoop(renderFrame);
addEventListener('resize',()=>{if(innerWidth<1||innerHeight<1)return;const aspect=innerWidth/innerHeight;camera.position.sub(controls.target).multiplyScalar(fit(aspect)/fit(camera.aspect)).add(controls.target);camera.aspect=aspect;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);if(preview)renderFrame(0)});
