import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {DEFAULT_BASE_SIZE} from './scene-defaults.js';

const preview=new URLSearchParams(location.search).has('preview'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const BASE=DEFAULT_BASE_SIZE,H=BASE/2,iw=Math.max(1,innerWidth),ih=Math.max(1,innerHeight);
const scene=new THREE.Scene(),renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,preview?.85:1.6));renderer.setSize(iw,ih);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.99;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=!preview&&!reduced;renderer.shadowMap.needsUpdate=true;
document.body.appendChild(renderer.domElement);renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','剪辑师的明亮书房，拖拽旋转，滚轮或双指缩放');
const camera=new THREE.PerspectiveCamera(33,iw/ih,.4,420),controls=new OrbitControls(camera,renderer.domElement);
controls.target.set(0,3.6,0);controls.enableDamping=!reduced;controls.dampingFactor=.065;controls.enabled=!preview;controls.enablePan=false;controls.minDistance=40;controls.maxDistance=300;controls.minPolarAngle=.22;controls.maxPolarAngle=Math.PI*.445;
const fit=a=>Math.max(BASE*1.875,BASE*2.16/a),distance=fit(camera.aspect);camera.position.set(distance*.64,3.6+distance*.73,distance*.88);camera.lookAt(controls.target);
scene.add(new THREE.HemisphereLight('#e9f4f0','#ac977d',1.85));
const sun=new THREE.DirectionalLight('#fff1cb',3.15);sun.position.set(5,26,-21);sun.castShadow=true;sun.shadow.mapSize.set(preview?1024:2048,preview?1024:2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:25,bottom:-23,near:.5,far:80});sun.shadow.normalBias=.025;sun.shadow.bias=-.00012;sun.shadow.radius=2;scene.add(sun);
const fill=new THREE.DirectionalLight('#d4e9e8',.72);fill.position.set(14,15,12);scene.add(fill);
const model=new THREE.Group();model.name='study-miniature';model.userData.baseSize=BASE;scene.add(model);
const scenery=new THREE.Group();scenery.name='study-static-interior';model.add(scenery);
let staticParent=scenery;
const readingZone=new THREE.Group();readingZone.name='window-reading-zone';readingZone.position.set(14.3,0,3.65);scenery.add(readingZone);
const workZone=new THREE.Group();workZone.name='library-editing-zone';workZone.position.set(-12.8,0,-3.65);scenery.add(workZone);
let seed=765391;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296},R=(a,b)=>a+random()*(b-a),pick=a=>a[Math.floor(random()*a.length)],v=(x,y,z)=>new THREE.Vector3(x,y,z);
const ramp=new THREE.DataTexture(new Uint8Array([93,143,193,229,255]),5,1,THREE.RedFormat);ramp.minFilter=ramp.magFilter=THREE.NearestFilter;ramp.needsUpdate=true;
const toon=(color,extra={})=>new THREE.MeshToonMaterial({color,gradientMap:ramp,...extra});
const m={base:toon('#9a856e'),edge:toon('#c6b394'),oak:toon('#c8a67b'),oakLight:toon('#d9bd93'),oakDark:toon('#ad8d68'),wood:toon('#ad8a60'),woodDark:toon('#7c6551'),wall:toon('#e9e5d6'),wallBlue:toon('#cbdcda'),white:toon('#ece8d7'),cream:toon('#ddd3b9'),dark:toon('#45585c'),ink:toon('#293c45'),steel:toon('#889c9c'),metal:toon('#b7bcb0'),sage:toon('#89a99a'),sofa:toon('#91aba0'),sofaLight:toon('#afc3ae'),cushion:toon('#c4cfb2'),rug:toon('#d5cbb5'),rugEdge:toon('#b6b49e'),teal:toon('#628f94'),blue:toon('#839fae'),yellow:toon('#dcba6d'),orange:toon('#c98e59'),red:toon('#b67865'),paper:toon('#efead8'),paperEdge:toon('#c8c5b1'),rubber:toon('#35474b'),leaf:toon('#679a79'),leafLight:toon('#8fb28a'),soil:toon('#756b51'),pot:toon('#d5c2a0'),glow:new THREE.MeshBasicMaterial({color:'#fff1bc',toneMapped:false})};
const edgeMat=new THREE.LineBasicMaterial({color:'#56675e',transparent:true,opacity:.33,depthWrite:false});
const glass=new THREE.MeshBasicMaterial({color:'#bddde0',transparent:true,opacity:.14,depthWrite:false,side:THREE.DoubleSide});
const geo={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.SphereGeometry(1,16,10),rock:new THREE.IcosahedronGeometry(1,1)};
function mesh(g,mat,x=0,y=0,z=0,parent=staticParent){const o=new THREE.Mesh(g,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function box(x,y,z,w,h,d,mat,parent=staticParent,outline=false){const o=mesh(geo.box,mat,x,y,z,parent);o.scale.set(w,h,d);if(outline){const l=new THREE.LineSegments(new THREE.EdgesGeometry(geo.box),edgeMat);l.scale.setScalar(1.0015);o.add(l)}return o}
function soft(x,y,z,w,h,d,mat,parent=staticParent,r=.14){return mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w*.2,h*.4,d*.2)),mat,x,y,z,parent)}
function ell(x,y,z,sx,sy,sz,mat,parent=staticParent){const o=mesh(geo.sphere,mat,x,y,z,parent);o.scale.set(sx,sy,sz);return o}
function rod(a,b,r,mat,parent=staticParent,rTop=r){const from=v(...a),to=v(...b),delta=to.clone().sub(from);const o=mesh(new THREE.CylinderGeometry(rTop,r,delta.length(),10),mat,0,0,0,parent);o.position.copy(from.add(to).multiplyScalar(.5));o.quaternion.setFromUnitVectors(v(0,1,0),delta.normalize());return o}
function tube(ps,r,mat,parent=staticParent,n=22){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ps.map(p=>v(...p))),n,r,6,false),mat,0,0,0,parent)}
function ring(x,y,z,r,t,mat,parent=staticParent){return mesh(new THREE.TorusGeometry(r,t,7,32),mat,x,y,z,parent)}
const dummy=new THREE.Object3D();
function instances(g,mat,items,parent=staticParent,shadow=true){const o=new THREE.InstancedMesh(g,mat,items.length);items.forEach((a,i)=>{dummy.position.set(...a.p);dummy.scale.set(...(a.s||[1,1,1]));dummy.rotation.set(...(a.r||[0,0,0]));dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);if(a.c)o.setColorAt(i,new THREE.Color(a.c))});o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o}
function canvasMaterial(width,height,paint,screen=false){const c=document.createElement('canvas');c.width=width;c.height=height;paint(c.getContext('2d'),width,height);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return screen?new THREE.MeshBasicMaterial({map:texture,toneMapped:false}):new THREE.MeshToonMaterial({map:texture,gradientMap:ramp})}
// An intact square floor, with exposed layers of wood along its cut edges.
box(0,-.43,0,BASE,.86,BASE,m.base,scenery,true);box(0,.13,0,BASE,.26,BASE,m.edge,scenery,true);
const floorColors=[m.oak,m.oakLight,m.oakDark];
for(let i=0;i<64;i++)for(let j=0;j<2;j++){const z=-H+.25+i*.5,x=j?8.0:-8.0;box(x,.305,z,15.97,.09,.485,floorColors[(i+j*2)%3]);}
for(const x of [-H+.12,H-.12])box(x,.35,0,.18,.09,BASE,m.oakDark);
for(const z of [-H+.12,H-.12])box(0,.35,z,BASE,.09,.18,m.oakDark);
const ground=mesh(new THREE.PlaneGeometry(180,180),new THREE.ShadowMaterial({opacity:.14}),0,-.90,0,scene);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
// Two real walls form an open-front cutaway room. The window is a clear opening.
box(-15.73,5.75,0,.46,10.8,31.7,m.wallBlue,scenery,true);
// A domestic window sits above desk height, rather than spanning the whole wall.
const windowOpening={left:1.4,right:10.6,bottom:4.1,top:8.7};
for(const [left,right] of [[-16,windowOpening.left],[windowOpening.right,16]])box((left+right)/2,5.75,-15.73,right-left,10.8,.46,m.wall,scenery,true);
for(const [bottom,top] of [[.35,windowOpening.bottom],[windowOpening.top,11.15]])box(6,(bottom+top)/2,-15.73,9.2,top-bottom,.46,m.wall);
for(const y of [.61,10.97]){box(-15.43,y,0,.16,.25,31.5,m.white);box(0,y,-15.43,31.5,.25,.16,m.white);}
for(const x of [-15.73,15.73])box(x,5.75,-15.40,.18,10.8,.18,m.cream);
// Transparent glazing opens directly onto the scene background; no exterior image.
for(const x of [1.4,10.6])box(x,6.4,-15.37,.16,4.76,.22,m.white,scenery,true);
for(const y of [4.1,8.7])box(6,y,-15.37,9.36,.16,.22,m.white,scenery,true);
soft(6,3.99,-14.93,9.85,.18,1.05,m.oakLight,scenery,.07);
const openSash=new THREE.Group();openSash.name='half-open-window-sash';openSash.position.set(1.52,6.4,-15.25);openSash.rotation.y=-.46;scenery.add(openSash);
function sash(cx,width,parent){for(const x of [cx-width/2,cx+width/2])box(x,0,0,.095,4.40,.10,m.white,parent);for(const y of [-2.20,0,2.20])box(cx,y,0,width,.095,.10,m.white,parent);box(cx,0,0,.05,4.4,.105,m.white,parent);const pane=box(cx,0,-.015,width-.12,4.28,.018,glass,parent);pane.castShadow=false;rod([cx+width/2-.20,-.25,.10],[cx+width/2-.20,.16,.10],.030,m.steel,parent);}
sash(2.19,4.38,openSash);const fixed=new THREE.Group();fixed.position.set(8.30,6.4,-15.25);scenery.add(fixed);sash(0,4.38,fixed);
for(const y of [4.35,6.4,8.45]){const hinge=mesh(new THREE.CylinderGeometry(.05,.05,.20,10),m.metal,1.52,y,-15.20);hinge.castShadow=false;}
// A large oak bookcase holds actual 3D volumes, including small display gaps.
const library=new THREE.Group();library.name='wall-of-books';scenery.add(library);
const books=[],labels=[],spineColors=['#929e83','#c5b790','#b48165','#779a9c','#d0c3a1','#718c9f','#c6a169','#a8bba6'];
for(let bay=0;bay<4;bay++){
 const z=-2.70+bay*4.34;
 box(-15.12,5.12,z,.16,9.60,4.22,m.wood,library);
 for(const dz of [-2.12,2.12])box(-14.42,5.10,z+dz,1.55,9.62,.14,m.oak,library,true);
 for(let shelf=0;shelf<8;shelf++)box(-14.42,.66+shelf*1.31,z,1.55,.115,4.25,m.oakLight,library,true);
 box(-14.38,.95,z,1.55,.65,4.10,m.wood,library);
 for(let row=0;row<7;row++){
  const base=.72+row*1.31;
  for(let k=0;k<16;k++){
   if(bay===2)continue;
   if((bay===1&&row===4&&k>9)||(bay===3&&row===2&&k<6))continue;
   const zz=z-1.94+k*.252,hh=R(.68,1.12),th=R(.14,.22),col=pick(spineColors);
   books.push({p:[-14.25,base+hh/2,zz],s:[.95,hh,th],c:col});
   for(const dy of [.13,hh-.12])labels.push({p:[-13.761,base+dy,zz],s:[.018,.026,th*.72],c:'#e9deba'});
  }
 }
 for(const dz of [-1.03,1.03]){box(-13.62,.99,z+dz,.035,.43,1.95,m.oak,library);rod([-13.57,1.02,z+dz-.18],[-13.57,1.02,z+dz+.18],.025,m.woodDark,library);}
}
// The reading furnishings move together into the former editing corner.
staticParent=readingZone;
// A low cabinet and magazine stacks belong to the reading corner.
soft(-8.65,1.10,-14.53,8.40,1.50,1.10,m.wood,readingZone,.09);
for(const x of [-11.7,-9.6,-7.5,-5.4]){box(x,1.1,-13.95,1.95,1.22,.035,m.oakLight);ring(x,1.1,-13.912,.045,.013,m.woodDark);}
for(let i=0;i<35;i++){const x=-12.05+i*.19,hh=R(.48,.83);books.push({p:[x+14.3,1.88+hh*.5,-14.45+3.65],s:[.14,hh,.55],c:pick(spineColors)});labels.push({p:[x+14.3,2.03,-14.165+3.65],s:[.11,.02,.012],c:'#e7ddbf'});}
instances(geo.box,toon('#ffffff'),books,library).name='individual-library-books';instances(geo.box,toon('#ffffff'),labels,library).name='book-spine-bands';
// Sofa, cushions and coffee table belong to the translated window-side reading zone.
const lounge=new THREE.Group();lounge.name='corner-reading-sofa';readingZone.add(lounge);
for(const x of [-12.7,-5.7])for(const z of [-11.75,-8.82])rod([x,.39,z],[x,.93,z],.09,m.woodDark,lounge);
soft(-9.20,1.12,-10.2,8.80,.58,4.28,m.sofa,lounge,.23);soft(-9.2,2.61,-11.91,8.85,2.22,.85,m.sofa,lounge,.30);
for(const x of [-13.17,-5.23])soft(x,1.94,-10.10,.80,1.58,4.05,m.sofa,lounge,.25);
for(const x of [-11.75,-9.2,-6.65])soft(x,1.66,-9.92,2.42,.63,3.16,m.sofaLight,lounge,.26);
const pillow=soft(-11.82,2.34,-11.04,1.62,1.45,.47,m.cushion,lounge,.21);pillow.rotation.z=.18;pillow.rotation.x=-.15;
const pillow2=soft(-6.70,2.30,-11.03,1.56,1.40,.45,m.yellow,lounge,.21);pillow2.rotation.z=-.20;pillow2.rotation.x=-.12;
soft(-9.1,.409,-6.6,11.0,.055,10.3,m.rug,readingZone,.02);
for(const x of [-14.34,-3.86])box(x,.443,-6.6,.055,.012,9.85,m.rugEdge);
for(const z of [-11.48,-1.72])box(-9.1,.443,z,10.48,.012,.055,m.rugEdge);
const table=mesh(new THREE.CylinderGeometry(2.00,1.97,.15,48),m.oakLight,-8.5,1.49,-4.67);table.scale.z=.84;
for(let i=0;i<3;i++){const a=i*2.094;rod([-8.5+Math.cos(a)*1.03,.43,-4.67+Math.sin(a)*.80],[-8.5+Math.cos(a)*1.35,1.42,-4.67+Math.sin(a)*1.08],.09,m.woodDark);}
function mug(x,y,z,s=1,parent=staticParent){mesh(new THREE.CylinderGeometry(.19*s,.15*s,.39*s,18,1,true),m.white,x,y+.195*s,z,parent);mesh(new THREE.CircleGeometry(.154*s,20),m.woodDark,x,y+.364*s,z,parent).rotation.x=-Math.PI/2;const handle=ring(x+.21*s,y+.21*s,z,.13*s,.035*s,m.white,parent);handle.rotation.y=Math.PI/2;return handle;}
mug(-7.39,1.59,-4.8,.9);mesh(new THREE.CylinderGeometry(.36,.36,.025,24),m.wood,-7.39,1.585,-4.8);
staticParent=scenery;
// A warm graphic print and a physical clock decorate the solid wall.
const art=canvasMaterial(600,420,(ctx,w,h)=>{ctx.fillStyle='#e9dfc5';ctx.fillRect(0,0,w,h);ctx.fillStyle='#d6b575';ctx.beginPath();ctx.arc(397,118,55,0,Math.PI*2);ctx.fill();ctx.fillStyle='#91aaa2';ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(230,128);ctx.lineTo(442,h);ctx.fill();ctx.fillStyle='#628f8d';ctx.beginPath();ctx.moveTo(200,h);ctx.lineTo(430,183);ctx.lineTo(600,h);ctx.fill();});
box(-8.7,7.14,-15.36,7.6,5.32,.12,m.woodDark,scenery,true);box(-8.7,7.14,-15.273,7.23,4.95,.02,art);
const clock=mesh(new THREE.CylinderGeometry(.76,.76,.16,48),m.oakLight,-2.7,9.80,-15.28);clock.rotation.x=Math.PI/2;
const clockFace=mesh(new THREE.CircleGeometry(.65,48),m.white,-2.7,9.80,-15.185);for(let i=0;i<12;i++){const a=i/12*Math.PI*2;box(-2.7+Math.sin(a)*.54,9.80+Math.cos(a)*.54,-15.16,.025,.068,.014,m.woodDark);}
// Moving pivots remain outside the static geometry batch.
function clockHand(name,length,width,material,z){const pivot=new THREE.Group();pivot.name=name;pivot.position.set(-2.7,9.8,z);model.add(pivot);box(0,length*.43,0,width,length,.018,material,pivot);return pivot;}
const hourHand=clockHand('clock-hour-hand',.34,.046,m.woodDark,-15.135),minuteHand=clockHand('clock-minute-hand',.48,.031,m.woodDark,-15.105),secondHand=clockHand('clock-second-hand',.53,.015,m.red,-15.075);
ell(-2.7,9.8,-15.052,.045,.045,.025,m.woodDark);
function updateClock(now){
 const seconds=now.getSeconds()+now.getMilliseconds()/1000,minutes=now.getMinutes()+seconds/60,hours=now.getHours()%12+minutes/60;
 hourHand.rotation.z=-hours*Math.PI/6;minuteHand.rotation.z=-minutes*Math.PI/30;secondHand.rotation.z=-seconds*Math.PI/30;
}
// The edit suite: a broad birch desk, under-desk storage, a cable tray and a PC.
const desk=new THREE.Group();desk.name='video-editing-workstation';workZone.add(desk);
soft(5.1,3.27,-6.55,13.30,.34,6.60,m.oakLight,desk,.11);
for(const x of [-.84,11.04]){box(x,1.83,-6.55,.16,2.78,4.76,m.dark,desk);box(x,.45,-6.55,1.12,.16,4.94,m.dark,desk);box(x,3.02,-6.55,.80,.16,4.60,m.dark,desk);}
soft(-.07,1.73,-6.63,2.06,2.68,4.27,m.cream,desk,.10);
for(let i=0;i<3;i++){soft(-.07,.92+i*.83,-4.466,1.87,.73,.065,m.white,desk,.025);rod([-.36,1.05+i*.83,-4.405],[.22,1.05+i*.83,-4.405],.025,m.woodDark,desk);}
box(5.16,2.67,-8.74,8.8,.22,.70,m.dark,desk);for(let i=0;i<7;i++)box(1.53+i*1.20,2.64,-8.40,.045,.18,.035,m.metal,desk);
soft(11.3,1.91,-5.38,1.57,2.94,2.74,m.ink,desk,.12);const pcGlass=box(12.10,2.02,-5.38,.016,2.45,2.28,glass,desk);pcGlass.castShadow=false;
for(let i=0;i<3;i++){
 const y=.96+i*.86;const fan=ring(11.3,y,-3.987,.28,.035,i%2?m.metal:m.teal,desk);fan.castShadow=false;
 mesh(new THREE.CircleGeometry(.24,24),m.dark,11.3,y,-3.995,desk);
 for(let k=0;k<5;k++){const a=k*1.256,b=box(11.3+Math.sin(a)*.11,y+Math.cos(a)*.11,-3.975,.065,.22,.018,m.steel,desk);b.rotation.z=-a+.4;}
 ell(11.3,y,-3.95,.075,.075,.025,m.white,desk);
}
for(let i=0;i<9;i++)box(10.73+i*.14,3.397,-5.38,.035,.016,2.13,m.steel,desk);
ell(11.88,3.41,-4.30,.05,.012,.05,m.teal,desk);
for(const [x,z] of [[2.1,-8.5],[7.9,-8.6],[10.7,-6.7]])tube([[x,3.36,z],[x,2.82,z-.2],[8.8,2.52,-8.77],[10.65,2.40,-8.33],[10.69,.65,-6.2]],.026,m.rubber,desk);
// Monitor textures are physical screens in the miniature, not page UI.
const editingScreen=canvasMaterial(1440,760,(ctx,w,h)=>{
 ctx.fillStyle='#263a46';ctx.fillRect(0,0,w,h);ctx.fillStyle='#172832';ctx.fillRect(0,0,w,44);ctx.fillStyle='#c3d3d4';ctx.font='18px sans-serif';ctx.fillText('AFTERNOON / ASSEMBLY CUT',24,29);
 ctx.fillStyle='#344d59';ctx.fillRect(14,58,275,370);ctx.fillStyle='#aac1c1';ctx.font='15px sans-serif';ctx.fillText('PROJECT  /  MOUNTAIN RETREAT',28,82);
 for(let i=0;i<5;i++){ctx.fillStyle=['#8fae9d','#7b9a9d','#c3ad7e','#6f9696','#a8bba6'][i];ctx.fillRect(30,101+i*60,90,47);ctx.fillStyle='#c2d1cc';ctx.fillRect(134,110+i*60,126,4);ctx.fillStyle='#6c8991';ctx.fillRect(134,121+i*60,85,3);ctx.fillRect(134,133+i*60,106,3);}
 ctx.fillStyle='#b6d0c9';ctx.fillRect(310,58,823,365);ctx.fillStyle='#dce7d2';ctx.fillRect(310,58,823,125);ctx.fillStyle='#e4ca92';ctx.beginPath();ctx.arc(963,123,34,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8cae9a';ctx.beginPath();ctx.moveTo(310,347);ctx.lineTo(592,126);ctx.lineTo(833,339);ctx.lineTo(1014,170);ctx.lineTo(1133,352);ctx.lineTo(1133,423);ctx.lineTo(310,423);ctx.fill();ctx.fillStyle='#5c8c85';ctx.beginPath();ctx.moveTo(310,365);ctx.lineTo(445,236);ctx.lineTo(666,423);ctx.lineTo(310,423);ctx.fill();ctx.fillStyle='#bed3bc';ctx.fillRect(310,357,823,66);ctx.fillStyle='#637e75';ctx.fillRect(607,307,198,71);ctx.fillStyle='#d5c19b';ctx.fillRect(621,322,169,56);ctx.fillStyle='#4e7173';ctx.beginPath();ctx.moveTo(590,322);ctx.lineTo(703,271);ctx.lineTo(821,322);ctx.fill();ctx.fillStyle='#a8c8be';ctx.beginPath();ctx.ellipse(900,380,91,23,-.1,0,Math.PI*2);ctx.fill();ctx.fillStyle='#253b45';ctx.fillRect(310,407,823,16);ctx.fillStyle='#e0e9dc';ctx.font='12px monospace';ctx.fillText('01:12:08:16',676,419);
 ctx.fillStyle='#20353f';ctx.fillRect(1150,58,273,365);ctx.fillStyle='#a1babb';ctx.font='16px sans-serif';ctx.fillText('COLOR  /  SCOPES',1165,84);
 for(let i=0;i<32;i++){ctx.fillStyle=['#d0b06e','#78a69d','#7d9eaf'][i%3];ctx.fillRect(1170+i*7,350-(i%7)*23-(i%5)*9,3,40+(i%7)*23);}
 ctx.fillStyle='#192d38';ctx.fillRect(14,443,1409,299);ctx.fillStyle='#9bb1b3';ctx.font='14px sans-serif';for(let i=0;i<12;i++)ctx.fillText(`${i*10}:00`,147+i*104,466);
 const trackCols=['#76a5a8','#7f9eae','#b7b27f','#8ea790'];for(let row=0;row<4;row++){ctx.fillStyle='#354d56';ctx.fillRect(22,481+row*58,104,48);ctx.fillStyle='#a7c0bc';ctx.fillText(row<2?`V${2-row}`:`A${row-1}`,48,510+row*58);let xx=140;for(let k=0;k<8;k++){const length=[115,167,83,140,173,108,124,180][(k+row)%8];ctx.fillStyle=trackCols[row];ctx.fillRect(xx,484+row*58,length-5,42);ctx.fillStyle=row<2?'#47616b':'#58746b';for(let t=5;t<length-8;t+=8)ctx.fillRect(xx+t,501+row*58,3,5+(t%19));xx+=length;}}
 ctx.fillStyle='#ead7a0';ctx.fillRect(653,469,2,258);ctx.beginPath();ctx.moveTo(647,468);ctx.lineTo(660,468);ctx.lineTo(654,477);ctx.fill();
},true);
const portraitScreen=canvasMaterial(480,900,(ctx,w,h)=>{ctx.fillStyle='#253d49';ctx.fillRect(0,0,w,h);ctx.fillStyle='#172b35';ctx.fillRect(0,0,w,50);ctx.fillStyle='#c0d3cc';ctx.font='21px sans-serif';ctx.fillText('EDIT NOTES',28,35);for(let i=0;i<7;i++){const y=86+i*100;ctx.fillStyle=i<3?'#9ab7a3':'#627f86';ctx.fillRect(28,y,17,17);ctx.fillStyle='#b8ccc7';ctx.fillRect(62,y+1,294-(i%3)*24,7);ctx.fillStyle='#75969b';ctx.fillRect(62,y+21,330,5);ctx.fillRect(62,y+36,252+(i%2)*46,5);}ctx.fillStyle='#537d7a';ctx.fillRect(28,815,420,48);ctx.fillStyle='#d3e0ce';ctx.font='18px sans-serif';ctx.fillText('MAKE ROOM FOR THE QUIET.',44,846);},true);
function monitor(x,y,z,w,h,material,angle=0,name='editor-monitor'){
 const g=new THREE.Group();g.name=name;g.position.set(x,y,z);g.rotation.y=angle;desk.add(g);
 soft(0,0,0,w+.18,h+.18,.27,m.ink,g,.10);box(0,0,.147,w,h,.015,material,g);ell(w*.5-.15,-h*.5-.045,.165,.025,.012,.014,m.sage,g);
 box(0,-h*.5-.13,0,.47,.12,.20,m.dark,g);return g;
}
monitor(4.30,5.15,-8.18,5.20,2.745,editingScreen,0,'editing-timeline-monitor');monitor(8.05,5.20,-8.45,1.50,2.81,portraitScreen,-.13,'portrait-notes-monitor');
for(const [x,y,z] of [[4.30,5.15,-8.18],[8.05,5.20,-8.45]]){box(x-.75,3.50,-8.99,.22,.22,.55,m.dark,desk);rod([x-.75,3.47,-8.99],[x-.75,4.15,-8.99],.078,m.steel,desk);rod([x-.75,4.15,-8.99],[x,4.35,z-.3],.085,m.dark,desk);rod([x,4.35,z-.30],[x,y,z-.19],.070,m.dark,desk);}
function speaker(x,z){soft(x,4.35,z,1.10,1.72,.84,m.dark,desk,.10);for(const [yy,r] of [[4.18,.29],[4.85,.11]]){mesh(new THREE.CircleGeometry(r,32),m.rubber,x,yy,z+.433,desk);ring(x,yy,z+.443,r,.018,m.metal,desk);ell(x,yy,z+.46,r*.26,r*.26,.025,m.dark,desk);}box(x,3.56,z,1.25,.13,.98,m.rubber,desk);}
speaker(-.50,-8.35);speaker(11.35,-8.60);
// Tactile keyboard, mouse, jog wheel, faders, audio interface and SSDs.
soft(3.44,3.52,-4.54,4.70,.19,1.53,m.cream,desk,.08);
const keys=[];for(let row=0;row<5;row++)for(let col=0;col<15;col++){if(row===4&&col>2&&col<11)continue;keys.push({p:[1.28+col*.306,3.665,-5.13+row*.273],s:[.265,.12,.225],c:row===0&&col===0?'#c89a6c':col>12?'#a5b9a6':'#e7e4d2'});}keys.push({p:[3.24,3.665,-4.038],s:[2.31,.12,.225],c:'#b6c7b3'});
instances(geo.box,toon('#ffffff'),keys,desk).name='mechanical-keyboard-keys';
soft(3.45,3.50,-3.49,4.70,.14,.45,m.sage,desk,.08);
soft(6.83,3.463,-4.44,2.00,.035,2.12,m.teal,desk,.015);ell(6.64,3.70,-4.52,.38,.22,.57,m.white,desk);box(6.64,3.903,-4.71,.027,.014,.32,m.dark,desk);ell(6.64,3.928,-4.60,.043,.018,.10,m.woodDark,desk);
soft(9.08,3.61,-4.55,2.16,.31,1.56,m.dark,desk,.08);mesh(new THREE.CylinderGeometry(.47,.47,.11,40),m.steel,8.65,3.82,-4.53,desk);mesh(new THREE.CylinderGeometry(.37,.37,.025,40),m.dark,8.65,3.89,-4.53,desk);for(let i=0;i<12;i++){const a=i/12*6.28;ell(8.65+Math.sin(a)*.28,3.91,-4.53+Math.cos(a)*.28,.018,.008,.018,m.metal,desk);}
for(let i=0;i<3;i++){box(9.76,3.793,-5.02+i*.43,.49,.02,.045,m.rubber,desk);box(9.64+(i%2)*.22,3.836,-5.02+i*.43,.13,.08,.15,m.white,desk);}
soft(10.08,3.66,-6.30,2.02,.44,.99,m.metal,desk,.06);for(const x of [9.42,10.67]){const knob=mesh(new THREE.CylinderGeometry(.115,.115,.11,20),m.dark,x,3.64,-5.756,desk);knob.rotation.x=Math.PI/2;}for(let i=0;i<5;i++)box(9.82+i*.115,3.68,-5.789,.052,.09,.013,i<3?m.sage:m.woodDark,desk);
for(let i=0;i<3;i++)soft(.18,3.52+i*.13,-4.53,.87,.11,.62,i%2?m.blue:m.sage,desk,.045);
soft(.10,3.51,-5.54,.89,.13,.45,m.dark,desk,.03);for(let i=0;i<3;i++)box(-.18+i*.23,3.58,-5.55,.14,.012,.26,m.metal,desk);
// Headphones on a stand and a small suspended microphone have real curved forms.
rod([-.20,3.43,-6.15],[-.20,4.83,-6.15],.055,m.steel,desk);ell(-.20,3.46,-6.15,.43,.055,.35,m.dark,desk);
tube([[-.67,4.38,-6.15],[-.63,4.95,-6.15],[-.20,5.19,-6.15],[.23,4.95,-6.15],[.27,4.38,-6.15]],.071,m.cream,desk);
for(const x of [-.66,.26]){soft(x,4.38,-6.15,.28,.70,.47,m.dark,desk,.11);soft(x,4.38,-5.97,.19,.55,.12,m.rubber,desk,.06);}
box(-.83,3.44,-5.4,.32,.13,.32,m.dark,desk);rod([-.83,3.47,-5.4],[-1.10,5.44,-5.90],.045,m.dark,desk);rod([-1.10,5.44,-5.90],[.25,5.77,-5.96],.045,m.dark,desk);const mic=soft(.34,5.46,-5.96,.40,.88,.43,m.ink,desk,.13);mic.rotation.z=-.23;for(let i=0;i<7;i++)box(.34,5.19+i*.087,-5.73,.31,.022,.014,m.metal,desk);
tube([[.35,5.85,-5.96],[-.88,5.49,-5.91],[-.65,3.50,-5.47],[-.55,2.7,-8.67]],.019,m.rubber,desk);
// Camera, clapboard, a mug and small stationery make the workspace lived-in.
soft(-.71,3.84,-7.28,.96,.66,.58,m.ink,desk,.08);const lens=mesh(new THREE.CylinderGeometry(.26,.26,.51,28),m.rubber,-.71,3.85,-6.82,desk);lens.rotation.x=Math.PI/2;const frontLens=mesh(new THREE.CircleGeometry(.203,28),m.teal,-.71,3.85,-6.551,desk);ring(-.71,3.85,-6.54,.22,.017,m.steel,desk);box(-.71,4.23,-7.28,.38,.18,.30,m.dark,desk);ell(-.33,4.215,-7.27,.06,.018,.06,m.red,desk);
soft(-1.01,4.62,-8.82,1.70,.97,.08,m.ink,desk,.025);const clapper=box(-.99,5.18,-8.82,1.77,.16,.09,m.white,desk);clapper.rotation.z=.11;for(let i=0;i<6;i++){const b=box(-1.69+i*.27,5.18+i*.029,-8.758,.15,.12,.012,m.ink,desk);b.rotation.z=-.45;}
for(let i=0;i<4;i++)box(-1.02,4.29+i*.19,-8.764,1.45,.014,.01,m.white,desk);
mug(7.42,3.45,-7.05,.90,desk);
// A daylight desk lamp with a jointed arm and a shallow conical shade.
ell(-.55,3.48,-3.97,.42,.055,.34,m.sage,desk);rod([-.55,3.50,-3.97],[-1.04,4.77,-4.44],.045,m.steel,desk);rod([-1.04,4.77,-4.44],[-.42,5.62,-4.72],.045,m.steel,desk);const lamp=mesh(new THREE.ConeGeometry(.53,.37,24,1,true),m.sage,-.42,5.47,-4.72,desk);lamp.rotation.z=.25;ell(-.42,5.30,-4.72,.32,.035,.32,m.glow,desk);
// Three playful desk companions: an articulated robot, an orange cat and a cube.
const robot=new THREE.Group();robot.name='tiny-desk-robot';robot.position.set(10.87,3.45,-4.43);desk.add(robot);
soft(0,.46,0,.46,.51,.34,m.orange,robot,.055);soft(0,.95,0,.62,.44,.39,m.cream,robot,.06);for(const x of [-.15,.15])ell(x,.99,.212,.056,.064,.018,m.ink,robot);box(0,.84,.213,.16,.022,.012,m.orange,robot);
rod([0,1.19,0],[0,1.36,0],.018,m.steel,robot);ell(0,1.39,0,.049,.049,.049,m.red,robot);
for(const x of [-.16,.16]){rod([x,.25,0],[x,.08,.08],.044,m.steel,robot);soft(x,.065,.10,.22,.11,.30,m.dark,robot,.035);rod([x*1.6,.61,0],[x*2.3,.42,.03],.041,m.steel,robot);ell(x*2.3,.40,.03,.066,.068,.066,m.cream,robot);}
const cat=new THREE.Group();cat.name='sleepy-cat-figurine';cat.position.set(1.02,3.47,-6.64);cat.rotation.y=-.25;desk.add(cat);
ell(0,.22,0,.46,.25,.29,m.orange,cat);ell(-.29,.36,.0,.25,.23,.23,m.yellow,cat);for(const x of [-.41,-.19]){const ear=mesh(new THREE.ConeGeometry(.095,.22,3),m.orange,x,.58,.0,cat);ear.rotation.z=x<-.3?.18:-.16;}ell(-.34,.31,.18,.14,.075,.05,m.cream,cat);for(const x of [-.40,-.24])tube([[x-.04,.41,.195],[x,.397,.21],[x+.04,.411,.195]],.012,m.woodDark,cat,8);tube([[.38,.17,-.04],[.55,.12,.20],[.26,.08,.35],[.10,.11,.25]],.058,m.orange,cat);
for(const x of [-.08,.11,.30]){const stripe=box(x,.448,0,.033,.016,.31,m.red,cat);stripe.rotation.z=.08;}
const cube=new THREE.Group();cube.name='color-puzzle-cube';cube.position.set(8.95,3.73,-7.14);cube.rotation.y=.30;desk.add(cube);box(0,0,0,.53,.53,.53,m.dark,cube);for(let i=0;i<3;i++)for(let j=0;j<3;j++){box(-.17+i*.17,.273,-.17+j*.17,.145,.015,.145,pick([m.white,m.yellow,m.orange]),cube);box(-.17+i*.17,-.17+j*.17,.274,.145,.145,.016,pick([m.teal,m.sage,m.red]),cube);}
// The ergonomic chair faces the desk. Mesh slats, lumbar support and five casters.
const chair=new THREE.Group();chair.name='ergonomic-editing-chair';chair.position.set(4.22,.38,-.05);chair.rotation.y=-.17;workZone.add(chair);
rod([0,.25,0],[0,1.95,0],.13,m.steel,chair);for(let i=0;i<5;i++){const a=i/5*6.283;rod([0,.35,0],[Math.cos(a)*1.53,.16,Math.sin(a)*1.53],.075,m.dark,chair);const wheel=mesh(new THREE.CylinderGeometry(.19,.19,.20,14),m.rubber,Math.cos(a)*1.54,.11,Math.sin(a)*1.54,chair);wheel.rotation.x=Math.PI/2;wheel.rotation.z=a;}
soft(0,2.07,0,2.62,.40,2.40,m.sage,chair,.20);rod([-.83,1.88,.71],[-.83,4.64,1.03],.075,m.dark,chair);rod([.83,1.88,.71],[.83,4.64,1.03],.075,m.dark,chair);
const chairBack=soft(0,3.51,1.02,2.42,2.67,.22,toon('#50686d',{transparent:true,opacity:.25,depthWrite:false}),chair,.16);chairBack.rotation.x=-.10;
for(let i=0;i<11;i++)box(-1.04+i*.208,3.56,.876,.052,2.28,.027,m.sage,chair);
for(let j=0;j<10;j++)box(0,2.47+j*.236,.855,2.18,.025,.027,m.steel,chair);
soft(0,2.82,1.16,2.13,.42,.21,m.sofaLight,chair,.10);soft(0,4.93,1.08,1.51,.52,.33,m.dark,chair,.13);
for(const side of [-1,1]){rod([side*1.08,1.93,-.12],[side*1.08,2.99,-.12],.055,m.dark,chair);soft(side*1.17,3.07,-.17,.39,.15,1.50,m.dark,chair,.07);}
soft(4.3,.406,.12,8.3,.055,6.4,m.rugEdge,workZone,.02);for(const z of [-2.82,3.06])box(4.3,.441,z,7.82,.008,.035,m.rug,workZone);
// An open book has a real curved page surface, cover thickness and printed lines.
const readingBook=new THREE.Group();readingBook.name='open-reading-book';readingBook.position.set(-8.74,1.59,-4.56);readingBook.rotation.y=.20;readingZone.add(readingBook);
for(const side of [-1,1]){
 const pts=[],idx=[];for(let j=0;j<=18;j++)for(let i=0;i<=12;i++){const u=i/12,t=j/18;pts.push(side*u*.70,.03+Math.sin(u*Math.PI*.85)*.09,-.88+t*1.76);if(i<12&&j<18){const a=j*13+i;idx.push(a,a+1,a+13,a+1,a+14,a+13)}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));g.setIndex(idx);g.computeVertexNormals();const mat=m.paper.clone();mat.side=THREE.DoubleSide;mesh(g,mat,0,0,0,readingBook);
 const cover=box(side*.36,-.005,0,.74,.045,1.82,m.teal,readingBook);cover.rotation.z=-side*.035;
 for(let i=0;i<13;i++){const z=-.74+i*.115,y=.12;box(side*.39,y,z,.45,.008,.016,m.paperEdge,readingBook);}
}
// A soft throw follows the sofa arm, seat and front rather than hanging in space.
const blanketPos=[],blanketIdx=[];
for(let j=0;j<=22;j++)for(let i=0;i<=12;i++){
 const u=i/12,t=j/22,x=-12.70+u*2.0,z=-11.45+t*3.3,y=t<.65?2.03+.035*Math.sin(u*22.):2.03-(t-.65)/.35*1.05;
 blanketPos.push(x,y+Math.sin(t*5.+u*9.)*.04,z);if(i<12&&j<22){const a=j*13+i;blanketIdx.push(a,a+1,a+13,a+1,a+14,a+13)}
}
const blanketG=new THREE.BufferGeometry();blanketG.setAttribute('position',new THREE.Float32BufferAttribute(blanketPos,3));blanketG.setIndex(blanketIdx);blanketG.computeVertexNormals();const blanketMat=toon('#d6ba88',{side:THREE.DoubleSide});mesh(blanketG,blanketMat,0,0,0,readingZone);
for(let i=0;i<12;i++)rod([-12.65+i*.17,1.02,-8.13],[-12.65+i*.17,.83,-8.09],.012,m.cream,readingZone);
// A floor lamp and leafy pots balance the hard edges of the editing equipment.
function pot(x,y,z,r=.55,height=.70,parent=staticParent){mesh(new THREE.CylinderGeometry(r,r*.77,height,20),m.pot,x,y+height*.5,z,parent);mesh(new THREE.CylinderGeometry(r*.91,r*.91,.035,20),m.soil,x,y+height,z,parent);return y+height;}
const plantHeads=[];
function plant(x,y,z,size=1,parent=staticParent){const top=pot(x,y,z,size*.45,size*.62,parent),g=new THREE.Group();g.name='swaying-study-plant';g.position.set(x,top,z);model.add(g);for(let i=0;i<8;i++){const a=i/8*6.28,h=size*R(.9,2.0),r=size*R(.32,.68),end=[Math.cos(a)*r,h,Math.sin(a)*r];rod([0,0,0],end,.018*size,m.leaf,g);const leaf=ell(end[0]*1.13,h+.05,end[2]*1.13,size*.23,size*.10,size*.48,i%2?m.leaf:m.leafLight,g);leaf.rotation.set(.35,a,.25*Math.sin(a));rod([end[0],h+.065,end[2]],[end[0]+Math.sin(a)*size*.25,h+.10,end[2]+Math.cos(a)*size*.30],.006*size,m.sage,g);}plantHeads.push({g,phase:R(0,6.28)});return g;}
plant(13.0,.40,9.0,1.70);plant(.80,.40,-9.15,1.28);plant(-13.95,9.85,3.7,.47);plant(9.85,4.10,-14.95,.40);plant(-13.20,3.45,-12.73,.35);
staticParent=readingZone;
mesh(new THREE.CylinderGeometry(.58,.67,.12,28),m.woodDark,-13.58,.45,-7.74);rod([-13.58,.50,-7.74],[-13.58,6.96,-7.74],.055,m.steel);const shade=mesh(new THREE.CylinderGeometry(.70,.95,1.12,32,1,true),m.cream,-13.58,6.84,-7.74);ell(-13.58,6.36,-7.74,.48,.04,.48,m.glow);
staticParent=scenery;
// Window-sill rocket and Saturn model; a small framed print and a film camera tripod.
const planet=new THREE.Group();planet.name='saturn-window-toy';planet.position.set(8.20,4.12,-14.85);planet.scale.setScalar(.80);scenery.add(planet);
rod([0,.02,0],[0,.45,0],.025,m.woodDark,planet);mesh(new THREE.CylinderGeometry(.31,.31,.06,24),m.wood,0,.04,0,planet);ell(0,.73,0,.35,.35,.35,m.yellow,planet);const saturnRing=ring(0,.73,0,.54,.035,m.orange,planet);saturnRing.rotation.set(1.05,.2,.2);
const rocket=new THREE.Group();rocket.name='window-rocket-toy';rocket.position.set(6.00,4.12,-14.90);rocket.scale.setScalar(.80);rocket.rotation.z=-.10;scenery.add(rocket);mesh(new THREE.CylinderGeometry(.17,.17,.71,18),m.white,0,.52,0,rocket);mesh(new THREE.ConeGeometry(.17,.37,18),m.teal,0,1.06,0,rocket);mesh(new THREE.CircleGeometry(.095,20),m.blue,0,.65,.176,rocket);ring(0,.65,.18,.099,.018,m.metal,rocket);for(const x of [-.18,.18]){const fin=box(x,.28,0,.13,.39,.20,m.teal,rocket);fin.rotation.z=x>0?-.22:.22;}
box(3.25,4.43,-14.91,.74,.72,.06,m.woodDark);const photo=canvasMaterial(200,200,(ctx,w,h)=>{ctx.fillStyle='#c6dcd1';ctx.fillRect(0,0,w,h);ctx.fillStyle='#7f9d92';ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(95,65);ctx.lineTo(w,h);ctx.fill();ctx.fillStyle='#e3c78f';ctx.beginPath();ctx.arc(146,43,18,0,6.28);ctx.fill();});box(3.25,4.43,-14.866,.65,.63,.018,photo);
const tripod=new THREE.Group();tripod.name='video-camera-tripod';tripod.position.set(13.29,.40,-11.55);scenery.add(tripod);for(let i=0;i<3;i++){const a=i*2.094;rod([Math.cos(a)*.82,.04,Math.sin(a)*.82],[0,3.16,0],.045,m.steel,tripod);rod([Math.cos(a)*.54,1.02,Math.sin(a)*.54],[0,1.56,0],.023,m.dark,tripod);}box(0,3.27,0,.58,.21,.45,m.dark,tripod);soft(0,3.66,0,.88,.66,.61,m.ink,tripod,.08);const movieLens=mesh(new THREE.CylinderGeometry(.22,.22,.52,24),m.rubber,0,3.66,.49,tripod);movieLens.rotation.x=Math.PI/2;mesh(new THREE.CircleGeometry(.17,24),m.blue,0,3.66,.761,tripod);rod([.22,3.22,-.15],[.62,3.44,-.71],.025,m.dark,tripod);
// Small shelf displays: a tiny house, stacked sketchbooks and a ceramic bird.
for(let i=0;i<3;i++){const z=1.1+i*.31;box(-14.20,6.18,z,.72,.16,.28,i%2?m.blue:m.cream);}
box(-14.22,4.02,9.71,.71,.58,.72,m.cream);const tinyRoof=mesh(new THREE.ConeGeometry(.62,.44,4),m.red,-14.22,4.53,9.71);tinyRoof.rotation.y=Math.PI/4;box(-13.84,4.02,9.71,.025,.22,.18,m.teal);
ell(-14.21,6.76,2.01,.22,.25,.31,m.white);ell(-14.11,6.99,2.12,.16,.17,.16,m.white);mesh(new THREE.ConeGeometry(.07,.18,4),m.yellow,-13.92,6.98,2.13).rotation.z=-Math.PI/2;
// A reading ottoman and a low media cart occupy the front library aisle.
soft(-9.10,.415,6.75,8.30,.055,6.80,m.rug,scenery,.022);
for(const x of [-13.00,-5.20])box(x,.450,6.75,.045,.008,6.29,m.rugEdge);
const ottoman=new THREE.Group();ottoman.name='reading-ottoman';scenery.add(ottoman);
for(const x of [-11.25,-8.25])for(const z of [5.0,7.30])box(x,.63,z,.18,.48,.18,m.woodDark,ottoman);
soft(-9.75,1.20,6.15,4.12,1.12,3.36,m.sofa,ottoman,.26);soft(-9.75,1.84,6.15,4.10,.32,3.38,m.sofaLight,ottoman,.14);
for(const x of [-10.90,-9.75,-8.60])ell(x,2.005,6.15,.045,.009,.045,m.sofa,ottoman);
box(-9.12,2.09,6.02,1.64,.14,1.12,m.yellow,ottoman,true);box(-9.12,2.175,6.02,1.54,.025,1.05,m.paper,ottoman);box(-9.12,2.195,6.02,.88,.013,.035,m.woodDark,ottoman);
const cart=new THREE.Group();cart.name='editing-media-cart';cart.position.set(-4.65,.38,6.0);cart.rotation.y=.12;scenery.add(cart);
for(const x of [-1.16,1.16])for(const z of [-.74,.74]){rod([x,.13,z],[x,2.34,z],.038,m.steel,cart);const caster=mesh(new THREE.CylinderGeometry(.13,.13,.13,12),m.rubber,x,.11,z,cart);caster.rotation.x=Math.PI/2;}
for(const y of [.42,1.40,2.33]){soft(0,y,0,2.62,.11,1.76,m.oakLight,cart,.04);for(const x of [-1.29,1.29])box(x,y+.12,0,.035,.23,1.76,m.steel,cart);}
for(let i=0;i<6;i++){const b=box(-.86+i*.29,.95,0,.22,.93,1.10,pick([m.sage,m.teal,m.blue,m.cream]),cart);if(i>3)b.rotation.z=.07;box(-.86+i*.29,.95,.562,.14,.10,.018,m.white,cart);}
for(let i=0;i<4;i++)soft(-.42,1.55+i*.12,.03,1.08,.10,.86,i%2?m.cream:m.blue,cart,.025);
for(const x of [-.62,.62]){const reel=mesh(new THREE.CylinderGeometry(.41,.41,.11,32),m.metal,x,2.47,0,cart);for(let j=0;j<6;j++){const a=j/6*6.28;mesh(new THREE.CylinderGeometry(.085,.085,.014,14),m.dark,x+Math.cos(a)*.25,2.533,Math.sin(a)*.25,cart);}mesh(new THREE.CylinderGeometry(.095,.095,.03,18),m.wood,x,2.545,0,cart);}
rod([-1.15,2.32,-.72],[-1.15,2.85,-.72],.045,m.steel,cart);rod([1.15,2.32,-.72],[1.15,2.85,-.72],.045,m.steel,cart);rod([-1.15,2.85,-.72],[1.15,2.85,-.72],.045,m.steel,cart);
// Warm little lights stay subtle in the sunlit room.
for(const [x,y,z,power] of [[-13.22,5.17,-8.37,1.8],[.72,6.2,-4.09,1.1]]){const light=new THREE.PointLight('#ffe1af',power,7,1.5);light.position.set(x,y,z);scene.add(light);}
// One complete bay is an open figurine cabinet, with separate display plinths.
const collection=new THREE.Group();collection.name='figurine-display-cabinet';scenery.add(collection);
const figureKinds=['robot','astronaut','cat','rabbit','dinosaur','rocket','bear','duck','mushroom','ghost','mecha','penguin'];
function figurine(kind,x,y,z,index){
 const g=new THREE.Group();g.name=`shelf-figurine-${kind}-${index}`;g.position.set(x,y,z);g.rotation.y=Math.PI/2;collection.add(g);
 const accent=[m.teal,m.orange,m.blue,m.red,m.sage,m.yellow][index%6];
 mesh(new THREE.CylinderGeometry(.28,.30,.055,20),m.woodDark,0,.025,0,g);
 if(kind==='robot'||kind==='mecha'){
  soft(0,.38,0,.31,.34,.24,accent,g,.04);soft(0,.72,0,.42,.31,.28,m.cream,g,.045);
  for(const a of [-1,1]){box(a*.13,.13,0,.12,.16,.19,m.dark,g);rod([a*.21,.50,0],[a*.28,.28,.02],.045,accent,g);ell(a*.105,.76,.15,.045,.045,.018,m.teal,g);}
  box(0,.64,.15,.14,.025,.015,m.dark,g);rod([0,.9,0],[0,1.04,0],.012,m.steel,g);ell(0,1.055,0,.04,.04,.04,m.red,g);
  if(kind==='mecha'){for(const a of [-1,1]){box(a*.31,.51,-.04,.15,.30,.17,m.blue,g);rod([a*.10,.93,0],[a*.25,1.06,0],.018,m.yellow,g);}}
 }else if(kind==='astronaut'){
  ell(0,.39,0,.23,.28,.18,m.white,g);ell(0,.78,0,.28,.27,.26,m.white,g);ell(0,.80,.211,.21,.16,.07,m.teal,g);box(0,.45,.18,.17,.15,.045,m.blue,g);
  for(const a of [-1,1]){soft(a*.14,.13,.04,.18,.18,.28,m.cream,g,.04);rod([a*.2,.56,0],[a*.32,.34,.03],.065,m.white,g);}box(0,.44,-.19,.32,.39,.16,m.metal,g);
 }else if(kind==='rocket'){
  mesh(new THREE.CylinderGeometry(.16,.16,.57,16),m.white,0,.44,0,g);mesh(new THREE.ConeGeometry(.16,.29,16),accent,0,.87,0,g);ell(0,.51,.16,.085,.085,.025,m.blue,g);
  for(const a of [-1,1]){const fin=box(a*.18,.23,0,.12,.30,.16,accent,g);fin.rotation.z=-a*.22;}
 }else if(kind==='mushroom'){
  ell(0,.29,0,.13,.25,.13,m.cream,g);ell(0,.58,0,.34,.19,.30,m.red,g);for(const [a,b] of [[-.14,.06],[.08,.18],[.17,-.08],[-.04,-.15]])ell(a,.735,b,.048,.018,.045,m.white,g);
 }else if(kind==='ghost'){
  ell(0,.49,0,.28,.41,.23,m.white,g);for(const a of [-1,1]){ell(a*.28,.42,0,.15,.07,.08,m.white,g);ell(a*.09,.63,.205,.034,.055,.014,m.dark,g);}ell(0,.46,.225,.04,.05,.012,m.red,g);
 }else if(kind==='dinosaur'){
  ell(0,.36,0,.22,.28,.20,m.sage,g);ell(.10,.69,.07,.22,.22,.23,m.leaf,g);ell(.12,.66,.23,.16,.09,.13,m.sage,g);tube([[0,.30,-.12],[-.03,.23,-.37],[-.19,.23,-.48]],.075,m.leaf,g);
  for(const a of [-1,1]){ell(a*.15,.13,.06,.11,.10,.17,m.sage,g);ell(a*.16+.06,.76,.22,.025,.03,.015,m.ink,g);}for(let k=0;k<3;k++)mesh(new THREE.ConeGeometry(.07,.15,3),m.yellow,-.02,.49-k*.09,-.16-k*.08,g);
 }else{
  const fur=kind==='cat'?m.orange:kind==='rabbit'?m.white:kind==='bear'?m.wood:kind==='penguin'?m.ink:m.yellow;
  ell(0,.35,0,.24,.28,.20,fur,g);ell(0,.69,.01,.27,.24,.23,fur,g);ell(0,.37,.17,.16,.20,.065,m.cream,g);
  for(const a of [-1,1]){ell(a*.13,.13,.08,.11,.085,.15,kind==='penguin'?m.orange:fur,g);ell(a*.093,.74,.22,.031,.038,.014,m.ink,g);}
  if(kind==='rabbit')for(const a of [-1,1]){ell(a*.14,1.00,0,.08,.25,.07,m.white,g);ell(a*.14,1.01,.06,.035,.17,.01,m.red,g);}
  if(kind==='cat'){for(const a of [-1,1])mesh(new THREE.ConeGeometry(.11,.22,3),fur,a*.17,.94,.01,g);tube([[.18,.28,-.12],[.35,.20,-.23],[.36,.43,-.17]],.045,fur,g);}
  if(kind==='bear')for(const a of [-1,1])ell(a*.21,.88,0,.11,.11,.075,fur,g);
  if(kind==='duck'||kind==='penguin')ell(0,.64,.27,.11,.045,.085,m.orange,g);else ell(0,.63,.24,.075,.045,.025,m.cream,g);
 }
}
for(let row=1;row<7;row++){
 const y=.72+row*1.31;
 for(let j=0;j<3;j++){const i=(row-1)*3+j;figurine(figureKinds[i%figureKinds.length],-14.10,y,5.98+(j-1)*1.20,i);}
 box(-13.72,y+1.12,5.98,.025,.025,3.94,m.glow,collection);
}
// Different leaf silhouettes and hanging stems make a small cabinet-top garden.
const topGarden=new THREE.Group();topGarden.name='bookcase-top-garden';scenery.add(topGarden);
function topPlant(kind,z,index){
 const x=-14.40,y=9.96,g=new THREE.Group();g.name=`bookcase-plant-${kind}-${index}`;g.position.set(x,y,z);topGarden.add(g);
 const container=[m.pot,m.teal,m.cream,m.red][index%4];mesh(new THREE.CylinderGeometry(.39,.30,.49,20),container,0,.245,0,g);mesh(new THREE.CylinderGeometry(.35,.35,.025,20),m.soil,0,.50,0,g);
 if(kind==='snake'){
  for(let k=0;k<7;k++){const a=k*2.4,hh=.85+(k%3)*.27,xx=Math.cos(a)*.23,zz=Math.sin(a)*.23;const blade=mesh(new THREE.ConeGeometry(.115,hh,4),k%2?m.leaf:m.sage,xx,.49+hh*.5,zz,g);blade.scale.z=.40;blade.rotation.z=Math.cos(a)*.12;rod([xx,.57,zz],[xx+Math.cos(a)*.09,.49+hh*.93,zz],.009,m.yellow,g);}
 }else if(kind==='succulent'){
  for(let row=0;row<3;row++)for(let k=0;k<9;k++){const a=k/9*6.28+row*.3,r=.25-row*.065;const leaf=ell(Math.cos(a)*r,.59+row*.13,Math.sin(a)*r,.11,.09,.28-row*.05,row%2?m.sage:m.leafLight,g);leaf.rotation.set(-.25-row*.15,a,.08);}
 }else if(kind==='cactus'){
  mesh(new THREE.CapsuleGeometry(.21,.68,4,12),m.leaf,0,1.02,0,g);for(const a of [-1,1]){rod([a*.16,.91,0],[a*.37,.91,0],.09,m.leaf,g);rod([a*.37,.91,0],[a*.37,1.18+(a+1)*.08,0],.09,m.leaf,g);}
  for(let k=0;k<24;k++){const a=k*2.4;ell(Math.cos(a)*.21,.63+(k%8)*.105,Math.sin(a)*.21,.014,.018,.014,m.cream,g);}for(let k=0;k<5;k++){const a=k*1.256;ell(Math.cos(a)*.07,1.57,Math.sin(a)*.07,.07,.035,.05,m.red,g);}
 }else if(kind==='fern'){
  for(let k=0;k<9;k++){const a=k/9*6.28,tip=[Math.cos(a)*.74,1.0+(k%3)*.13,Math.sin(a)*.74];tube([[0,.51,0],[tip[0]*.5,1.29,tip[2]*.5],tip],.012,m.leaf,g,10);for(let j=1;j<7;j++){const t=j/7;for(const side of [-1,1]){const xx=tip[0]*t+Math.sin(a)*.15*side,zz=tip[2]*t-Math.cos(a)*.15*side;const leaf=ell(xx,.53+Math.sin(t*2.3)*.65,zz,.045,.025,.17*(1-t*.65),j%2?m.leafLight:m.leaf,g);leaf.rotation.y=a+side*.6;}}}
 }else if(kind==='pothos'){
  for(let k=0;k<4;k++){const dz=(k-1.5)*.18,ps=[[0,.54,dz],[.52,.72,dz],[.87,.23,dz],[.95,-.55-k*.15,dz+.12],[1.03,-1.36-k*.14,dz+.25]];tube(ps,.015,m.leaf,g,16);for(let j=0;j<9;j++){const t=j/8;const leaf=ell(.22+Math.min(t*1.8,.78)+(j%2)*.11,.75-t*(2.1+k*.13),dz+(j%2?.14:-.10),.15,.075,.21,j%2?m.leafLight:m.leaf,g);leaf.rotation.set(.35,j*.8,-.35);}}
 }else{
  for(let k=0;k<7;k++){const a=k*2.4,hh=.83+(k%3)*.26,xx=Math.cos(a)*.40,zz=Math.sin(a)*.40;rod([0,.49,0],[xx,hh,zz],.017,m.leaf,g);
   const shape=new THREE.Shape();shape.moveTo(0,-.35);shape.bezierCurveTo(-.42,-.12,-.42,.23,-.16,.38);shape.lineTo(-.12,.12);shape.lineTo(-.06,.43);shape.quadraticCurveTo(0,.52,.09,.41);shape.lineTo(.10,.13);shape.lineTo(.21,.34);shape.bezierCurveTo(.42,.13,.38,-.12,0,-.35);
   const leaf=mesh(new THREE.ShapeGeometry(shape),toon(k%2?'#8fb28a':'#679a79',{side:THREE.DoubleSide}),xx,hh+.19,zz,g);leaf.rotation.set(-.6,a,.10);rod([xx,hh-.07,zz],[xx,hh+.57,zz],.008,m.sage,g);
  }
 }
}
[['pothos',-4.05],['monstera',-1.8],['fern',.75],['snake',3.3],['succulent',5.8],['cactus',7.75],['fern',9.4],['pothos',11.6]].forEach(([kind,z],i)=>topPlant(kind,z,i));

// Merge fixed meshes by material; books and keycaps remain instanced.
scenery.updateMatrixWorld(true);const batches=new Map(),lineParts=[],remove=[];
scenery.traverse(o=>{if(o.isLineSegments){lineParts.push(o.geometry.clone().applyMatrix4(o.matrixWorld));remove.push(o);return}if(!o.isMesh||o.isInstancedMesh||o.material.transparent)return;const key=o.material.uuid;if(!batches.has(key))batches.set(key,{mat:o.material,gs:[]});const g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));batches.get(key).gs.push(g);remove.push(o);});
for(const o of remove)o.removeFromParent();for(const {mat,gs} of batches.values()){const converted=gs.map(g=>g.index?g.toNonIndexed():g),merged=mergeGeometries(converted,false);if(!merged)throw Error('Unable to batch study interior');mesh(merged,mat);gs.forEach(g=>g.dispose());converted.forEach(g=>g.dispose())}if(lineParts.length){scenery.add(new THREE.LineSegments(mergeGeometries(lineParts,false),edgeMat));lineParts.forEach(g=>g.dispose())}
// Curtains have real folded cloth geometry with fixed tops and free lower hems.
rod([.70,9.16,-14.43],[11.30,9.16,-14.43],.055,m.woodDark,model);for(const x of [.67,11.33])ell(x,9.16,-14.43,.11,.11,.11,m.oakLight,model);
const curtains=[];
function curtain(name,startX,width,phase){
 const cols=32,rows=48,ps=[],uv=[],idx=[];for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){ps.push(0,0,0);uv.push(i/cols,1-j/rows);if(i<cols&&j<rows){const a=j*(cols+1)+i;idx.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1)}}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(idx);
 const material=toon('#f5f0dc',{side:THREE.DoubleSide,transparent:true,opacity:.79,depthWrite:false});const cloth=mesh(geometry,material,0,0,0,model);cloth.name=name;cloth.renderOrder=2;cloth.castShadow=false;cloth.frustumCulled=false;
 curtains.push({cloth,startX,width,phase,cols,rows,height:5.03,topY:9.01});
 for(let i=0;i<10;i++){const x=startX+i*width/9;const r=ring(x,9.12,-14.43,.078,.016,m.metal,model);r.rotation.y=Math.PI/2;}
}
curtain('breezy-curtain-left',.86,1.93,.0);curtain('breezy-curtain-right',9.18,1.96,1.7);
function animate(t){
 for(const {cloth,startX,width,phase,cols,rows,height,topY} of curtains){const p=cloth.geometry.attributes.position;for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const u=i/cols,w=j/rows,free=w*w,k=j*(cols+1)+i;const fold=Math.cos(u*Math.PI*12.)*(.125+w*.04);p.setXYZ(k,startX+u*width+Math.sin(t*.86+phase+w*2.1+u*1.8)*free*.34,topY-w*height+Math.sin(t*.72+phase+u*3.5)*free*.055,-14.39+fold+Math.sin(t*.73+phase+u*3.0+w*1.5)*Math.pow(w,1.7)*.47);}p.needsUpdate=true;cloth.geometry.computeVertexNormals();}
 plantHeads.forEach(({g,phase})=>{g.rotation.z=Math.sin(t*.55+phase)*.014;g.rotation.x=Math.sin(t*.39+phase)*.009;});
}
animate(0);let start=null,lastMs=-Infinity,renderedOnce=false,lastClockTick=-1;
const lastPosition=new THREE.Vector3(),lastQuaternion=new THREE.Quaternion();
function renderFrame(ms){
 if(start===null)start=ms;controls.update();
 if(!preview&&renderedOnce&&ms-lastMs<32)return;
 const now=new Date(),clockTick=Math.floor(now.getTime()/100);
 // In reduced-motion mode, redraw the clock at 10 Hz and camera input immediately.
 if(reduced&&renderedOnce&&clockTick===lastClockTick&&lastPosition.distanceToSquared(camera.position)<1e-12&&Math.abs(lastQuaternion.dot(camera.quaternion))>1-1e-12)return;
 lastMs=ms;if(!preview&&!reduced)animate((ms-start)*.001);updateClock(now);renderer.render(scene,camera);
 lastClockTick=clockTick;lastPosition.copy(camera.position);lastQuaternion.copy(camera.quaternion);renderedOnce=true;
}
if(preview)renderFrame(0);else renderer.setAnimationLoop(renderFrame);
addEventListener('resize',()=>{if(innerWidth<1||innerHeight<1)return;const a=innerWidth/innerHeight,factor=fit(a)/fit(camera.aspect);camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);camera.aspect=a;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,preview?.85:1.6));renderer.setSize(innerWidth,innerHeight);renderedOnce=false;if(preview||reduced)renderFrame(0)});
