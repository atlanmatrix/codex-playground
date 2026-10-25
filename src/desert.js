import {expandWorld,expandedFit} from './world-expansion.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CORE_BASE_SIZE } from './scene-defaults.js';

const preview=new URLSearchParams(location.search).has('preview');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene=new THREE.Scene(),renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,preview?1:1.8));renderer.setSize(Math.max(1,innerWidth),Math.max(1,innerHeight));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.localClippingEnabled=true;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
document.body.appendChild(renderer.domElement);renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','沙丘、风蚀石拱、仙人掌和摇曳灌木组成的沙漠微缩景观；拖拽旋转，滚轮或双指缩放');
const camera=new THREE.PerspectiveCamera(34,Math.max(1,innerWidth)/Math.max(1,innerHeight),.3,350);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,3.0,0);controls.enableDamping=true;controls.enabled=!preview;controls.enablePan=false;controls.minDistance=42;controls.maxDistance=260;controls.minPolarAngle=.24;controls.maxPolarAngle=Math.PI*.44;
const fit=aspect=>expandedFit(aspect);const direction=new THREE.Vector3(.64,.82,.86).normalize();camera.position.copy(direction.multiplyScalar(fit(camera.aspect))).add(controls.target);camera.lookAt(controls.target);
scene.add(new THREE.HemisphereLight(0xffebcd,0xb58a62,1.9));
const sun=new THREE.DirectionalLight(0xffe1aa,3.0);sun.position.set(-18,24,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:70});sun.shadow.normalBias=.035;scene.add(sun);
const model=new THREE.Group();model.name='desert-miniature';model.userData.baseSize=CORE_BASE_SIZE;scene.add(model);
const scenery=new THREE.Group();scenery.name='sandstone-and-desert-plants';model.add(scenery);
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
// Windward slopes are broad; the leeward sides of dune crests fall away sharply.
let seed=55713;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const R=(a,b)=>a+random()*(b-a),V=(x,y,z)=>new THREE.Vector3(x,y,z);
const sand=toon('#e7be7e'),sandDark=toon('#c99d67'),stone=toon('#bc7955'),stoneLight=toon('#dba16d'),wood=toon('#9d815b');
const green=toon('#7f9d77'),greenLight=toon('#a6b48a'),dry=toon('#b8a16f'),spine=toon('#e0cda3');
const vertexMaterial=new THREE.MeshToonMaterial({color:'#ffffff',vertexColors:true,gradientMap:ramp,side:THREE.DoubleSide});
function height(x,z){
 const d=x+.48*z-3.5;
 const main=5.2*Math.exp(-d*d/(d>0?7:34))*Math.exp(-((z+1)**2)/250);
 const small=2.4*Math.exp(-((x+9)**2)/35-((z-8)**2)/52);
 return .7+main+small+.14*Math.sin(z*.32+x*.18);
}
model.userData.terrainHeight=height;
const HALF=CORE_BASE_SIZE/2,N=96,positions=[],colors=[],indices=[];
for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){
 const x=-HALF+i*32/N,z=-HALF+j*32/N,y=height(x,z);positions.push(x,y,z);
 const c=new THREE.Color().lerpColors(new THREE.Color('#d9ab72'),new THREE.Color('#f3d59a'),THREE.MathUtils.clamp(.4+y*.07,0,1));colors.push(c.r,c.g,c.b);
 if(i<N&&j<N){const a=j*(N+1)+i,b=a+N+1;indices.push(a,b,a+1,b,b+1,a+1)}
}
function geometry(p,c,idx){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));if(c)g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));if(idx)g.setIndex(idx);g.computeVertexNormals();return g}
const dunes=new THREE.Mesh(geometry(positions,colors,indices),vertexMaterial);dunes.name='wind-sculpted-dunes';dunes.castShadow=dunes.receiveShadow=true;model.add(dunes);
// A closed square section exposes compact sandstone and sandy strata at the edges.
const wallP=[],wallC=[];
for(let side=0;side<4;side++)for(let i=0;i<N;i++){
 const at=t=>side===0?[-16,t]:side===1?[16,t]:side===2?[t,-16]:[t,16];
 const [x,z]=at(-16+i*32/N),[xx,zz]=at(-16+(i+1)*32/N);
 for(const [lo,hi,col] of [[-1.5,-.85,'#b77953'],[-.85,-.25,'#cf9965'],[-.25,null,'#e0b77e']]){
  const a=hi??height(x,z),b=hi??height(xx,zz),c=new THREE.Color(col);
  wallP.push(x,lo,z,xx,lo,zz,x,a,z,xx,lo,zz,xx,b,zz,x,a,z);for(let k=0;k<6;k++)wallC.push(c.r,c.g,c.b);
 }
}
const section=new THREE.Mesh(geometry(wallP,wallC),vertexMaterial);section.name='square-desert-section';section.castShadow=section.receiveShadow=true;model.add(section);box(0,-1.54,0,32,.08,32,stone);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.ShadowMaterial({opacity:.15}));ground.rotation.x=-Math.PI/2;ground.position.y=-1.6;scene.add(ground);
// Fine parallel ripple strips hug the dunes, bending around the prevailing wind.
const ripP=[];
for(let j=0;j<75;j++){
 const baseZ=-15+j*.405;
 for(let i=0;i<95;i++){
  const x=-15.6+i*.33,x2=x+.33,z=baseZ+.16*Math.sin(x*.7+baseZ*.22),z2=baseZ+.16*Math.sin(x2*.7+baseZ*.22),w=.012;
  const a=[x,height(x,z)+.009,z],b=[x2,height(x2,z2)+.009,z2],c=[x,height(x,z+w)+.009,z+w],d=[x2,height(x2,z2+w)+.009,z2+w];ripP.push(...a,...c,...b,...b,...c,...d);
 }
}
const ripples=new THREE.Mesh(geometry(ripP),toon('#d6b17d'));ripples.name='dune-sand-ripples';ripples.receiveShadow=true;model.add(ripples);
function triangle(p,c,a,b,d,color){p.push(...a,...b,...d);for(let i=0;i<3;i++)c.push(color.r,color.g,color.b)}
// A natural sandstone arch, open right through the rock; colored strata continue over the span.
const arch=new THREE.Group();arch.name='wind-eroded-sandstone-arch';arch.position.set(-7,Math.max(height(-10,-5),height(-4,-5))-.1,-5);arch.rotation.y=-.12;model.add(arch);
const archP=[],archC=[];
for(let i=0;i<28;i++){
 const a=i/28*Math.PI,b=(i+1)/28*Math.PI;
 const pt=(angle,outer,z)=>{const r=outer?3.8+.12*Math.sin(angle*7):2.45+.08*Math.sin(angle*5);return [Math.cos(angle)*r,2.6+Math.sin(angle)*r,z]};
 for(const faceZ of [-1.0,1.0]){
  const aa=pt(a,false,faceZ),bb=pt(b,false,faceZ),cc=pt(a,true,faceZ),dd=pt(b,true,faceZ),col=new THREE.Color(i%5===0?'#ae6e4b':i%3===0?'#d09261':'#c78759');triangle(archP,archC,aa,bb,cc,col);triangle(archP,archC,bb,dd,cc,col);
 }
 for(const outer of [false,true]){
  const aa=pt(a,outer,-1),bb=pt(b,outer,-1),cc=pt(a,outer,1),dd=pt(b,outer,1),col=new THREE.Color(outer?'#d39a69':'#a96e4c');triangle(archP,archC,aa,cc,bb,col);triangle(archP,archC,bb,cc,dd,col);
 }
}
const bridge=new THREE.Mesh(geometry(archP,archC),vertexMaterial);bridge.castShadow=bridge.receiveShadow=true;arch.add(bridge);
function pillar(x,z,h,r,parent=scenery,baseY=height(x,z)){
 const g=new THREE.Group();g.position.set(x,baseY-.12,z);parent.add(g);
 for(let i=0;i<9;i++){
  const taper=1-i*.035,width=r*taper*(1+.07*Math.sin(i*2.2));
  const o=mesh(new THREE.CylinderGeometry(width*.94,width,h/9+.018,7),i%3===0?stoneLight:i%3===1?stone: sandDark,Math.sin(i*.8)*.04*r,(i+.5)*h/9,0,1,1,.78,g);o.rotation.y=i*.035;
 }
 return g;
}
// The arch piers reach below the sand and join the band without blocking its opening.
for(const side of [-1,1]){
 const g=pillar(side*3.1,0,3.0,.72,arch,-.25);g.name='arch-support-pier';
}
pillar(-12,-11,5.7,1.6);pillar(-9.6,-12.3,3.8,1.15);pillar(10,-10,2.1,1.35);
for(let i=0;i<65;i++){
 const x=R(-14.5,14.5),z=R(-14.5,14.5),s=R(.1,.45),o=ball(x,height(x,z)+s*.25,z,s,s*.45,s*.7,i%3?stoneLight:stone);o.rotation.y=R(0,6.28);
}
function branch(a,b,r,mat,parent){const delta=V(...b).sub(V(...a));const o=mesh(new THREE.CylinderGeometry(r*.8,r,delta.length(),8),mat,0,0,0,1,1,1,parent);o.position.copy(V(...a).add(V(...b)).multiplyScalar(.5));o.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());return o;}
// Upright saguaros, paddle cacti and flowering cushions create varied dryland silhouettes.
const cactusSites=[[-12,4,2.5],[-10,8,3.7],[-5,12,2.8],[10,8,3.0],[13,-2,2.1],[5,-12,2.7]];
for(const [i,[x,z,h]] of cactusSites.entries()){
 const g=new THREE.Group();g.name='saguaro-cactus';g.position.set(x,height(x,z)-.08,z);model.add(g);
 pole(0,h/2,0,.23,h,green,g);ball(0,h,0,.23,.26,.23,green,g);
 for(const side of [-1,1]){const yy=h*(side<0?.45:.6),extent=side*.67;branch([0,yy,0],[extent,yy+.13,0],.13,green,g);pole(extent,yy+.46,0,.14,.68,green,g);ball(extent,yy+.8,0,.14,.16,.14,green,g)}
 for(let j=0;j<8;j++){const a=j*Math.PI/4;pole(Math.cos(a)*.232,h*.51,Math.sin(a)*.232,.012,h*.91,greenLight,g)}
 for(let j=0;j<25;j++){const a=j*2.4,y=.3+(j%8)*h/9;branch([Math.cos(a)*.23,y,Math.sin(a)*.23],[Math.cos(a)*.30,y+.03,Math.sin(a)*.30],.009,spine,g)}
 if(i===1||i===3)for(let j=0;j<5;j++)ball(Math.cos(j*1.25)*.14,h+.18,Math.sin(j*1.25)*.14,.09,.1,.07,m.pink,g);
 batch(g);
}
for(const [x,z] of [[-13,8],[-9,11],[8,11],[12,5],[-3,-12],[11,-6]]){
 const g=new THREE.Group();g.name='prickly-pear-cactus';g.position.set(x,height(x,z),z);model.add(g);
 for(let i=0;i<6;i++){const a=i*2.4,o=ball(Math.cos(a)*.4,.35+(i%3)*.36,Math.sin(a)*.3,.27,.44,.12,i%2?green:greenLight,g);o.rotation.z=Math.cos(a)*.4;if(i>3)ball(Math.cos(a)*.4,.8+(i%3)*.36,Math.sin(a)*.3,.07,.10,.07,m.red,g)}batch(g);
}
const shrubs=[];
for(const [i,[x,z]] of [[-13,-2],[-11,1],[-13,12],[-7,10],[-3,12],[1,13],[6,11],[12,11],[13,7],[11,3],[13,-6],[8,-12],[2,-13],[-4,-11],[-13,-13],[-8,2],[-5,6],[4,3],[8,6],[10,-3],[0,-8],[4,-7],[-2,9],[6,-1]].entries()){
 const root=new THREE.Group();root.name='desert-shrub-root';root.position.set(x,height(x,z)-.04,z);model.add(root);
 const crown=new THREE.Group();crown.name='wind-swept-desert-shrub';root.add(crown);
 for(let j=0;j<8;j++){const a=j*2.4,tip=[Math.cos(a)*R(.35,.65),R(.4,.8),Math.sin(a)*R(.35,.65)];branch([0,0,0],tip,.018,wood,crown);ball(...tip,.22,.12,.19,j%2?dry:greenLight,crown)}batch(crown);shrubs.push({root,crown,phase:i*.8});
}
// A sun-bleached fallen branch rests partly buried in the sand.
const deadwood=new THREE.Group();deadwood.name='sun-bleached-deadwood';deadwood.position.set(-6,height(-6,5)+.05,5);scenery.add(deadwood);
branch([-1,0,0],[1.3,.2,.35],.09,wood,deadwood);for(let i=0;i<4;i++)branch([i*.42-.6,.1,.12],[i*.5-.8,.3,i%2?.8:-.6],.035,wood,deadwood);
batch(scenery);
// Pebbles remain fixed while small wind-blown grains follow the sand surface.
const dummy=new THREE.Object3D(),pebbles=new THREE.InstancedMesh(geo.sphere,stoneLight,1400);pebbles.name='desert-pebbles';model.add(pebbles);pebbles.receiveShadow=true;
for(let i=0;i<pebbles.count;i++){const x=R(-15.6,15.6),z=R(-15.6,15.6),s=R(.014,.06);dummy.position.set(x,height(x,z)+s*.25,z);dummy.scale.set(s*1.3,s*.6,s);dummy.rotation.set(0,R(0,6.28),0);dummy.updateMatrix();pebbles.setMatrixAt(i,dummy.matrix)}
const dust=new THREE.InstancedMesh(geo.sphere,new THREE.MeshBasicMaterial({color:'#f9dda2',transparent:true,opacity:.48,depthWrite:false}),480);dust.name='wind-blown-sand';dust.frustumCulled=false;model.add(dust);
const grains=Array.from({length:dust.count},()=>({x:R(0,30),z:R(0,30),h:R(.12,.65),s:R(.014,.028),phase:R(0,6.28)}));const wrap=(v,n)=>((v%n)+n)%n;
function animate(t){
 const gust=.65+.20*Math.sin(t*.74)+.12*Math.sin(t*1.9);model.userData.windStrength=gust;
 shrubs.forEach(({crown,phase})=>{crown.rotation.z=-.06-gust*.11+Math.sin(t*2.7+phase)*.035;crown.rotation.x=Math.sin(t*1.5+phase)*.035});
 grains.forEach((p,i)=>{const x=wrap(p.x+t*(2.5+.35*Math.sin(p.phase)),30)-15,z=wrap(p.z+t*.36,30)-15;dummy.position.set(x,height(x,z)+p.h+.05*Math.sin(t*2+p.phase),z);dummy.scale.set(p.s*(3+gust*2),p.s*.65,p.s);dummy.rotation.set(0,-.14,0);dummy.updateMatrix();dust.setMatrixAt(i,dummy.matrix)});dust.instanceMatrix.needsUpdate=true;
}
animate(0);let start=null;
const expandedWorld=expandWorld({kind:'desert',scene,model,camera,controls,renderer,preview,reduced,nativeHeight:height});
function renderFrame(ms){
 expandedWorld.update(ms*.001);if(start===null)start=ms;if(!preview&&!reduced)animate((ms-start)/1000);controls.update();renderer.render(scene,camera)}
if(preview)renderFrame(0);else renderer.setAnimationLoop(renderFrame);
addEventListener('resize',()=>{if(innerWidth<1||innerHeight<1)return;const aspect=innerWidth/innerHeight;camera.position.sub(controls.target).multiplyScalar(fit(aspect)/fit(camera.aspect)).add(controls.target);camera.aspect=aspect;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);if(preview)renderFrame(0)});
