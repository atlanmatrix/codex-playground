import {installSceneCapture} from './scene-capture.js';
import {expandWorld,expandedFit} from './expansions/rooftop.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const preview=['preview','screenshot'].some(key=>new URLSearchParams(location.search).has(key));
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene=new THREE.Scene();
const initialWidth=Math.max(1,innerWidth),initialHeight=Math.max(1,innerHeight);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,preview?.85:1.8));renderer.setSize(initialWidth,initialHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.localClippingEnabled=true;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
document.body.appendChild(renderer.domElement);
renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','铁路从商铺房顶通过的日式微缩街道，可以拖拽旋转缩放');
const camera=new THREE.PerspectiveCamera(33,initialWidth/initialHeight,.35,270);
const controls=new OrbitControls(camera,renderer.domElement);
controls.target.set(0,2.0,0);controls.enableDamping=true;controls.dampingFactor=.065;controls.enabled=!preview;controls.enablePan=false;
controls.minDistance=20;controls.maxDistance=170;controls.minPolarAngle=.22;controls.maxPolarAngle=Math.PI*.44;
const fit=aspect=>expandedFit(aspect);
const distance=fit(camera.aspect);camera.position.set(distance*.58,2+distance*.84,distance*.77);camera.lookAt(controls.target);
scene.add(new THREE.HemisphereLight(0xe4f3ff,0x858f85,1.95));
const sun=new THREE.DirectionalLight(0xfff0d5,3.25);sun.position.set(-10,22,7);sun.castShadow=true;
sun.shadow.mapSize.set(preview?1024:2048,preview?1024:2048);Object.assign(sun.shadow.camera,{left:-15,right:15,top:16,bottom:-14,near:.5,far:50});sun.shadow.normalBias=.025;sun.shadow.bias=-.00012;sun.shadow.radius=2;scene.add(sun);
const fill=new THREE.DirectionalLight(0xb8d7eb,.65);fill.position.set(9,9,-8);scene.add(fill);
const model=new THREE.Group();model.name='rooftop-miniature';scene.add(model);
const scenery=new THREE.Group();scenery.name='static-rooftop-street';model.add(scenery);
let seed=663281;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const R=(a,b)=>a+random()*(b-a),pick=a=>a[Math.floor(random()*a.length)],v=(x,y,z)=>new THREE.Vector3(x,y,z);
const ramp=new THREE.DataTexture(new Uint8Array([91,137,183,222,246,255]),6,1,THREE.RedFormat);ramp.needsUpdate=true;ramp.minFilter=ramp.magFilter=THREE.NearestFilter;
const toon=(color,extra={})=>new THREE.MeshToonMaterial({color,gradientMap:ramp,...extra});
const m={soil:toon('#817b6c'),concrete:toon('#c1c4ba'),edge:toon('#d7d7c9'),deck:toon('#d5d3be'),asphalt:toon('#6b7785'),paving:toon('#c7c9c0'),white:toon('#ecebdc'),cream:toon('#e1d7bb'),beige:toon('#cfc6ae'),pink:toon('#c8aaa2'),blue:toon('#88a6b2'),roof:toon('#aeb7b3'),roofDark:toon('#87979b'),steel:toon('#a2b2b5'),dark:toon('#46545d'),wood:toon('#ae8c66'),woodDark:toon('#7f6a55'),rail:toon('#a7b5b7'),tie:toon('#9d9384'),green:toon('#619885'),leaf:toon('#6b9a63'),leafLight:toon('#92b077'),red:toon('#b9544e'),redLight:toon('#d27b65'),yellow:toon('#e4c15c'),orange:toon('#d6804a'),window:toon('#7f9ea7'),windowLight:toon('#b5cdd0'),rubber:toon('#48545b'),paper:toon('#e7dfc8'),pot:toon('#a87558')};
const foliage=toon('#ffffff',{side:THREE.DoubleSide});
const edgeMat=new THREE.LineBasicMaterial({color:0x53606a,transparent:true,opacity:.40,depthWrite:false});
const geo={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.SphereGeometry(1,14,9),rock:new THREE.IcosahedronGeometry(1,1)};
function mesh(g,mat,x=0,y=0,z=0,parent=scenery){const o=new THREE.Mesh(g,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function box(x,y,z,w,h,d,mat,parent=scenery,outline=false){const o=mesh(geo.box,mat,x,y,z,parent);o.scale.set(w,h,d);if(outline){const l=new THREE.LineSegments(new THREE.EdgesGeometry(geo.box),edgeMat);l.scale.setScalar(1.0015);o.add(l)}return o}
function ell(x,y,z,sx,sy,sz,mat,parent=scenery){const o=mesh(geo.sphere,mat,x,y,z,parent);o.scale.set(sx,sy,sz);return o}
function rod(a,b,r,mat,parent=scenery,rTop=r){const from=v(...a),to=v(...b),delta=to.clone().sub(from);const o=mesh(new THREE.CylinderGeometry(rTop,r,delta.length(),8),mat,0,0,0,parent);o.position.copy(from.add(to).multiplyScalar(.5));o.quaternion.setFromUnitVectors(v(0,1,0),delta.normalize());return o}
function tube(points,r,mat,parent=scenery,segments=20){const curve=new THREE.CatmullRomCurve3(points.map(p=>Array.isArray(p)?v(...p):p));return mesh(new THREE.TubeGeometry(curve,segments,r,5,false),mat,0,0,0,parent)}
function ring(x,y,z,r,t,mat,parent=scenery){return mesh(new THREE.TorusGeometry(r,t,6,24),mat,x,y,z,parent)}
const dummy=new THREE.Object3D();
function instances(g,mat,items,parent=scenery,shadow=true){const o=new THREE.InstancedMesh(g,mat,items.length);items.forEach((a,i)=>{dummy.position.set(...a.p);dummy.scale.set(...(a.s||[1,1,1]));dummy.rotation.set(...(a.r||[0,0,0]));dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);if(a.color)o.setColorAt(i,a.color)});o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o}
function plaque(text,x,y,z,w,h,bg,fg,parent=scenery,face=1){
 const c=document.createElement('canvas');c.width=768;c.height=Math.round(768*h/w);const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`600 ${c.height*.59}px "Noto Sans CJK JP","Yu Gothic",sans-serif`;ctx.fillText(text,c.width/2,c.height/2,c.width-35);
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
 const o=box(x,y,z,w,h,.035,new THREE.MeshToonMaterial({map:texture,gradientMap:ramp}),parent,true);o.rotation.y=face*Math.PI/2;return o;
}
function pot(x,y,z,size=.25,parent=scenery){
 mesh(new THREE.CylinderGeometry(size*.57,size*.43,size,10),m.pot,x,y+size/2,z,parent);
 mesh(new THREE.CylinderGeometry(size*.52,size*.52,.025,10),m.soil,x,y+size+.012,z,parent);
 for(let i=0;i<5;i++)ell(x+R(-size*.3,size*.3),y+size+R(size*.1,size*.75),z+R(-size*.3,size*.3),size*R(.30,.53),size*R(.38,.62),size*R(.30,.50),i%2?m.leaf:m.leafLight,parent);
}
// An intact square section with separate soil, concrete, roadway and curb layers.
for(const [bottom,top,mat] of [[-1.2,-.35,m.soil],[-.35,.12,m.concrete]])box(0,(bottom+top)/2,0,18,top-bottom,18,mat,scenery,true);
const ground=mesh(new THREE.PlaneGeometry(180,180),new THREE.ShadowMaterial({opacity:.15}),0,-1.24,0,scene);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
box(.575,.15,0,3.65,.06,18,m.asphalt);
box(5.65,.15,-6.0,6.7,.06,1.85,m.asphalt);
box(-1.88,.205,0,1.25,.17,18,m.paving,scenery,true);
box(2.92,.205,1.9625,1.04,.17,14.075,m.paving,scenery,true);
box(2.92,.205,-7.9625,1.04,.17,2.075,m.paving,scenery,true);
for(let z=-8.6;z<9;z+=.58){box(-1.29,.245,z,.12,.09,.54,m.edge);if(z<-7||z>-4.9)box(2.47,.245,z,.12,.09,.54,m.edge);}
for(const x of [-1.13,2.25]){
 if(x<0)box(x,.19,0,.045,.018,17.9,m.white);
 else{box(x,.19,2.03,.045,.018,13.8,m.white);box(x,.19,-8.06,.045,.018,1.72,m.white)}
}
for(let z=-8.1;z<8.6;z+=1.4){if(z>-6.8&&z<-4.8)continue;box(.58,.19,z,.065,.018,.62,m.white);}
for(let i=0;i<7;i++)box(-.96+i*.48,.195,-5.94,.31,.024,.79,m.white);
box(.58,.195,-4.95,3.3,.024,.09,m.white);
for(const x of [.61,2.10])box(x,.195,4.40,.055,.025,3.8,m.yellow);
for(const z of [2.50,4.40,6.30])box(1.35,.195,z,1.54,.025,.055,m.yellow);
for(const z of [-2.9,.9,7.0]){
 mesh(new THREE.CylinderGeometry(.27,.27,.025,32),m.dark,.05,.2,z);
 const r=ring(.05,.218,z,.21,.012,m.steel);r.rotation.x=Math.PI/2;
 for(let i=0;i<4;i++)box(.05,.221,z-.11+i*.075,.28,.01,.018,m.roofDark);
}
for(const z of [-3.6,1.8,6.7]){
 box(-1.36,.19,z,.23,.025,.5,m.dark);
 for(let i=0;i<5;i++)box(-1.36,.21,z-.19+i*.09,.20,.013,.02,m.steel);
}
function cone(x,z){
 box(x,.21,z,.32,.06,.32,m.rubber);
 mesh(new THREE.ConeGeometry(.13,.39,12),m.orange,x,.435,z);
 mesh(new THREE.CylinderGeometry(.045,.070,.075,12),m.white,x,.475,z);
}
for(const z of [2.95,4.45,6.05])cone(2.04,z);
rod([2.04,.61,4.45],[2.04,.61,6.05],.025,m.yellow);

// Five low shops carry one continuous railway deck on their roof beams.
const SHOP_Z=[-7.25,-3.72,-.19,3.34,6.87];
const shopNames=['corner-coffee','greengrocer','ramen-counter','cycle-workshop','small-general-store'];
for(let i=0;i<SHOP_Z.length;i++){
 const z=SHOP_Z[i],g=new THREE.Group();g.name=shopNames[i];scenery.add(g);
 box(-5.1,.235,z,4.9,.23,3.30,m.edge,g,true);
 box(-7.45,1.64,z,.20,2.70,3.30,i%2?m.cream:m.beige,g,true);
 for(const dz of [-1.60,1.60])box(-5.1,1.64,z+dz,4.72,2.70,.10,m.cream,g);
 box(-5.1,2.95,z,5.05,.16,3.45,m.deck,g,true);
 for(const dz of [-1.53,1.53])box(-2.65,1.65,z+dz,.22,2.72,.22,m.concrete,g,true);
 box(-2.64,2.65,z,.18,.38,3.20,i===2?m.woodDark:m.edge,g,true);
 // The front frame is open, allowing the small shop interiors to remain visible.
 for(const dz of [-1.25,1.25])box(-2.64,1.37,z+dz,.07,1.95,.055,m.woodDark,g);
 box(-2.61,1.42,z+.47,.055,1.90,.045,m.steel,g);
 box(-2.6,.4,z, .14,.18,2.65,m.edge,g);
 box(-2.62,1.47,z+.98,.025,1.66,.48,m.window,g);
 if(i!==3){
  box(-4.0,.75,z-.12,.68,.91,1.95,i===2?m.wood:m.cream,g,true);
  box(-3.99,1.23,z-.12,.84,.08,2.08,m.woodDark,g);
  for(let j=0;j<5;j++){
   const pz=z-.86+j*.37;
   if(i===2){ell(-3.86,1.32,pz,.11,.05,.11,m.white,g);mesh(new THREE.CylinderGeometry(.045,.045,.10,8),m.redLight,-3.78,1.34,pz+.10,g);}
   else{box(-3.90,1.37,pz,.21,.20,.26,pick([m.redLight,m.yellow,m.green,m.paper]),g);}
  }
 }
 // Shelves, a back door, and small goods add depth under the viaduct.
 for(const y of [.8,1.45,2.06]){
  box(-7.17,y,z, .40,.065,2.5,m.wood,g);
  for(let j=0;j<8;j++)box(-7.05,y+.13,z-1.08+j*.30,.18,R(.17,.28),.18,pick([m.paper,m.blue,m.redLight,m.green,m.yellow]),g);
 }
 box(-7.31,1.3,z+.98,.045,1.8,.56,m.woodDark,g);
 if(i===0){
  plaque('喫茶 こもれび',-2.50,2.67,z,2.6,.34,'#496e7e','#ece6cf',g);
  for(const dz of [-.6,.6]){box(-3.1,.83,z+dz,.35,.09,.36,m.wood,g);for(const dx of [-.12,.12])rod([-3.1+dx,.29,z+dz],[-3.1+dx,.8,z+dz],.025,m.dark,g);}
 }else if(i===1){
  plaque('青 果 店',-2.50,2.68,z,2.55,.34,'#578b70','#f3ead0',g);
  for(let stripe=0;stripe<9;stripe++){
   const a=box(-2.13,2.28,z-1.07+stripe*.26,1.02,.06,.255,stripe%2?m.white:m.green,g,true);a.rotation.z=-.2;
  }
  for(const dz of [-.68,.0,.68]){
   box(-2.15,.49,z+dz,.47,.32,.56,m.wood,g,true);
   for(let a=0;a<3;a++)for(let b=0;b<3;b++)ell(-2.29+a*.13,.69,z+dz-.15+b*.15,.07,.065,.07,dz<0?m.orange:dz>0?m.leafLight:m.redLight,g);
  }
 }else if(i===2){
  plaque('らーめん 路地',-2.49,2.69,z,2.6,.35,'#9e5148','#f1dfb8',g);
  rod([-2.45,2.28,z-1.25],[-2.45,2.28,z+1.25],.025,m.woodDark,g);
  for(let j=0;j<7;j++)box(-2.46,2.02,z-1.05+j*.35,.035,.48,.32,m.red,g);
  for(const dz of [-.75,0,.75]){
   mesh(new THREE.CylinderGeometry(.17,.17,.08,12),m.red,-3.12,.77,z+dz,g);
   rod([-3.12,.29,z+dz],[-3.12,.73,z+dz],.035,m.dark,g);
  }
  for(const dz of [-1.28,1.28]){ell(-2.18,1.88,z+dz,.14,.25,.14,m.redLight,g);rod([-2.18,2.15,z+dz],[-2.18,2.38,z+dz],.012,m.dark,g);}
 }else if(i===3){
  plaque('自転車 修理',-2.50,2.68,z,2.6,.34,'#4f6b78','#e9e5d4',g);
  for(const dz of [-.7,.7]){const w=ring(-6.96,1.80,z+dz,.38,.035,m.rubber,g);w.rotation.y=Math.PI/2;}
  box(-5.5,.9,z,1.0,1.2,1.8,m.blue,g,true);box(-5.5,1.54,z,1.15,.07,1.95,m.woodDark,g);
  for(let j=0;j<8;j++)rod([-6.91,1.4+j*.09,z-.5],[-6.91,1.4+j*.09,z+.5],.012,m.steel,g);
 }else{
  plaque('日用品 みどり',-2.50,2.68,z,2.6,.34,'#60879c','#e7e7ce',g);
  const awning=box(-2.12,2.28,z,1.04,.07,2.6,m.blue,g,true);awning.rotation.z=-.18;
 }
 for(const dz of [-1.37,1.37])pot(-2.13,.29,z+dz,.28,g);
 if(i===4){
  const end=z+1.66;
  for(const px of [-6.25,-4.38]){
   box(px,1.85,end,.96,.66,.06,m.edge,g,true);
   box(px,1.85,end+.043,.82,.54,.025,m.window,g);
   box(px,1.85,end+.062,.035,.54,.02,m.white,g);
   box(px,2.24,end+.06,1.12,.06,.26,m.roofDark,g);
  }
  box(-5.1,.58,end,4.70,.37,.04,m.beige,g);
  acUnit(-6.15,1.03,end+.18,g);
  tube([[-7.25,2.76,end+.06],[-7.25,1.25,end+.06],[-7.25,.33,end+.06]],.024,m.roofDark,g);
 }

}
// Roof slab and vertical supports actually meet the shop structure below.
const railway=new THREE.Group();railway.name='roof-railway';scenery.add(railway);
box(-5.05,3.20,0,5.10,.34,18,m.deck,railway,true);
box(-5.05,3.405,0,5.10,.07,18,m.concrete,railway);
for(const z of [-8.9,-5.45,-1.95,1.55,5.08,8.6]){
 box(-2.54,1.68,z,.26,2.70,.27,m.concrete,railway,true);
 box(-5.05,2.95,z,5.15,.16,.30,m.deck,railway,true);
}
for(const x of [-7.53,-2.57]){
 box(x,3.66,0,.15,.44,18,m.deck,railway,true);
 for(let z=-8.8;z<9;z+=.68)rod([x,3.9,z],[x,4.22,z],.018,m.steel,railway);
 rod([x,4.21,-8.9],[x,4.21,8.9],.022,m.steel,railway);
}
box(-5.05,3.49,0,2.45,.10,18,m.roofDark,railway);
const ballast=[];
for(let i=0;i<620;i++)ballast.push({p:[-5.05+R(-1.16,1.16),3.56,R(-8.95,8.95)],s:[R(.025,.07),R(.015,.032),R(.025,.07)],r:[R(0,3),R(0,3),R(0,3)],color:new THREE.Color(pick(['#aab2ad','#c0c4b8','#969f9c']))});
instances(geo.rock,foliage,ballast,railway);
for(let z=-8.75;z<8.9;z+=.36)box(-5.05,3.59,z,1.91,.10,.20,m.tie,railway,true);
for(const x of [-5.63,-4.47]){
 box(x,3.69,0,.14,.10,18,m.dark,railway);box(x,3.765,0,.075,.03,18,m.rail,railway);
 for(let z=-8.7;z<9;z+=.72)for(const dx of [-.1,.1])box(x+dx,3.65,z,.07,.035,.10,m.steel,railway);
}
// Portal catenary frames rise from the rooftop parapets.
for(const z of [-7.8,-2.8,2.2,7.2]){
 for(const x of [-7.28,-2.82]){
  box(x,3.52,z,.32,.16,.32,m.steel,railway,true);
  box(x,5.31,z,.105,3.44,.13,m.roofDark,railway,true);
  rod([x,6.38,z],[x+(x<-5?.65:-.65),7.0,z],.025,m.steel,railway);
 }
 box(-5.05,7.03,z,4.6,.12,.14,m.roofDark,railway,true);
 rod([-5.05,6.97,z],[-5.05,6.37,z],.021,m.steel,railway);
 for(let i=0;i<4;i++)ell(-5.05,6.71+i*.07,z,.065,.025,.065,m.white,railway);
}
rod([-5.05,6.35,-9],[-5.05,6.35,9],.009,m.dark,railway);
for(const [a,b] of [[-9,-7.8],[-7.8,-2.8],[-2.8,2.2],[2.2,7.2],[7.2,9]])tube([[-5.05,6.87,a],[-5.05,6.55,(a+b)/2],[-5.05,6.87,b]],.011,m.dark,railway,18);

// A row of modest homes on the opposite side: roof tanks, aerials and service sheds.
const laundry=[];
function acUnit(x,y,z,parent=scenery,angle=0){
 const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=angle;parent.add(g);
 box(0,0,0,.72,.45,.46,m.edge,g,true);
 ring(-.15,0,.242,.15,.017,m.roofDark,g);
 for(let i=0;i<6;i++){const a=i/6*Math.PI*2;rod([-.15,0,.253],[-.15+Math.cos(a)*.13,Math.sin(a)*.13,.253],.01,m.roofDark,g);}
 for(let i=0;i<5;i++)box(.21,-.15+i*.074,.245,.14,.022,.013,m.dark,g);
 for(const x of [-.24,.24])box(x,-.25,0,.07,.06,.36,m.roofDark,g);
}
function aerial(x,y,z,parent=scenery){
 rod([x,y,z],[x,y+1.0,z],.014,m.dark,parent);
 rod([x-.45,y+.82,z],[x+.45,y+.82,z],.014,m.roofDark,parent);
 for(let i=0;i<6;i++){const px=x-.40+i*.16;rod([px,y+.82,z-.18],[px,y+.82,z+.18],.011,m.roofDark,parent);}
 rod([x,y+.18,z],[x-.25,y,z-.2],.012,m.roofDark,parent);rod([x,y+.18,z],[x+.25,y,z+.2],.012,m.roofDark,parent);
}
function residence(index,z,len,height,mat){
 const g=new THREE.Group();g.name='opposite-residence';scenery.add(g);
 const x=6.10,top=.29+height;
 box(x,.24,z,5.20,.24,len,m.concrete,g,true);
 box(x,.29+height/2,z,5.20,height,len,mat,g,true);
 box(x,top+.075,z,5.34,.15,len+.13,m.roof,g,true);
 for(const px of [3.49,8.71])box(px,top+.25,z,.12,.24,len+.06,m.edge,g,true);
 for(const dz of [-len/2,len/2])box(x,top+.25,z+dz,5.15,.24,.12,m.edge,g,true);
 // Street facade, with real projecting window frames and a door under a small hood.
 const doorZ=z+(len<2?0:.90);
 box(3.465,1.30,doorZ,.06,1.90,.63,m.woodDark,g,true);
 box(3.424,1.48,doorZ,.025,1.10,.47,m.window,g);
 box(3.25,2.35,doorZ,.53,.075,.93,m.roofDark,g,true);
 rod([3.39,1.19,doorZ-.18],[3.39,1.38,doorZ-.18],.013,m.steel,g);
 for(const wy of [1.58,...(height>3.2?[2.92]:[])]){
  const wz=z-(len<2?.0:.62);
  box(3.465,wy,wz,.07,.80,.98,m.edge,g,true);
  box(3.416,wy,wz,.025,.68,.83,m.window,g);
  box(3.394,wy,wz,.03,.69,.035,m.white,g);
  box(3.39,wy-.45,wz,.19,.07,1.14,m.edge,g);
  if(wy<2)for(let i=0;i<5;i++)rod([3.355,wy-.34,wz-.35+i*.17],[3.355,wy+.34,wz-.35+i*.17],.011,m.dark,g);
 }
 if(len>2.5){acUnit(3.23,2.30,z-.60,g,-Math.PI/2);tube([[3.38,2.3,z-.7],[3.41,2.3,z-1.3],[3.42,.35,z-1.3]],.018,m.roofDark,g);}
 plaque(index%2?'山本商会':'月見荘',3.405,2.55,doorZ,len<2?.75:1.15,.23,'#ddd5bc','#5c727b',g,-1);
 if(index===4){
  const end=z+len/2+.03;
  box(x,.56,end,5.12,.30,.035,m.beige,g);
  for(const px of [4.9,7.25]){
   box(px,1.86,end,.97,.69,.06,m.edge,g,true);
   box(px,1.86,end+.043,.83,.56,.024,m.window,g);
   box(px,1.86,end+.061,.035,.56,.025,m.white,g);
   box(px,2.28,end+.04,1.11,.055,.24,m.roofDark,g);
  }
  acUnit(6.1,1.03,end+.16,g);
  tube([[8.42,top+.14,end-.18],[8.42,top+.14,end+.04],[8.42,.32,end+.04]],.025,m.roofDark,g);
 }
 // A maintenance room is deliberately offset, leaving several small roof terraces.
 box(7.15,top+.69,z+.12,1.38,1.08,Math.min(1.15,len*.65),m.cream,g,true);
 const shedRoof=box(7.15,top+1.26,z+.12,1.59,.075,Math.min(1.35,len*.75),m.roofDark,g,true);shedRoof.rotation.z=.06;
 box(6.445,top+.65,z+.12,.025,.83,.50,m.roofDark,g,true);
 for(let i=0;i<2;i++)acUnit(4.60+i*.91,top+.29,z-.35,g);
 const tankX=8.02,tankZ=z+(len<2?-.30:.72);
 for(const dx of [-.22,.22])for(const dz of [-.22,.22])rod([tankX+dx,top+.13,tankZ+dz],[tankX+dx,top+.42,tankZ+dz],.025,m.steel,g);
 mesh(new THREE.CylinderGeometry(.35,.35,.69,16),m.edge,tankX,top+.76,tankZ,g);
 mesh(new THREE.CylinderGeometry(.36,.36,.06,16),m.white,tankX,top+1.13,tankZ,g);
 tube([[tankX+.31,top+.77,tankZ],[tankX+.50,top+.77,tankZ],[tankX+.50,top+.14,tankZ]],.025,m.steel,g);
 aerial(7.85,top+.14,z-.45,g);
 for(let j=0;j<3;j++){
  const px=4.2+j*.52,pz=z+(len<2?.45:1.05);
  tube([[px,top+.13,pz],[px,top+.45+j*.06,pz],[px+.14,top+.53+j*.06,pz]],.022,m.steel,g,12);
 }
 for(const [px,pz] of [[4.0,z+.58],[8.35,z-.75]])pot(px,top+.15,pz,.28,g);
 if(index===1||index===3){
  const lineZ=z-.65,lineY=top+1.42;
  for(const px of [5.20,7.5]){rod([px,top+.14,lineZ],[px,lineY,lineZ],.024,m.steel,g);rod([px-.2,top+.14,lineZ],[px+.2,top+.14,lineZ],.025,m.steel,g);}
  rod([5.20,lineY,lineZ],[7.5,lineY,lineZ],.008,m.dark,g);
  for(let j=0;j<3;j++){
   const cloth=new THREE.Group();cloth.name='roof-laundry';cloth.position.set(5.58+j*.62,lineY,lineZ);model.add(cloth);
   rod([0,0,0],[0,-.08,0],.009,m.steel,cloth);
   box(0,-.32,0,.47,.48,.022,pick([m.paper,m.blue,m.pink]),cloth,true);
   box(0,-.075,0,.025,.055,.035,m.white,cloth);
   laundry.push({g:cloth,phase:index+j*.8});
  }
 }
 for(const dz of [-len*.36,len*.36])pot(3.17,.29,z+dz,.28,g);
}
residence(0,-8.0,1.70,3.10,m.beige);
residence(1,-3.15,3.10,3.45,m.cream);
residence(2,.20,3.00,2.90,m.blue);
residence(3,3.50,3.00,3.15,m.beige);
residence(4,6.95,3.25,2.65,m.pink);

// Rooftop service equipment on the far side of the railway.
for(const z of [-7.25,-3.72,3.34,6.87]){
 acUnit(-7.03,3.70,z);
 rod([-7.15,3.44,z+1],[-7.15,4.15,z+1],.028,m.steel);
 ell(-7.15,4.17,z+1,.055,.025,.055,m.roofDark);
 pot(-7.0,3.44,z-.85,.23);
}
for(const z of [-4.0,5.0])aerial(-7.10,3.44,z);
for(const z of [-7.5,0,7.7]){
 box(-3.15,3.62,z,.36,.34,.62,m.roofDark,scenery,true);
 for(let i=0;i<4;i++)box(-2.959,3.51+i*.07,z,.015,.025,.47,m.steel);
}
// Sidewalk rails, machines and bicycles fill the small gaps between shop fronts.
for(let z=-8.6;z<8.8;z+=1.88){
 if(z>-7&&z<-4.7)continue;
 for(const dz of [-.64,.64])rod([-1.47,.29,z+dz],[-1.47,.75,z+dz],.022,m.white);
 rod([-1.47,.70,z-.64],[-1.47,.70,z+.64],.023,m.yellow);
}
function vending(z,color){
 const g=new THREE.Group();g.name='street-vending-machine';g.position.set(-2.16,.29,z);g.rotation.y=Math.PI/2;scenery.add(g);
 box(0,.94,0,.84,1.88,.48,color,g,true);box(-.09,1.12,.255,.57,1.08,.035,m.dark,g,true);
 for(let row=0;row<3;row++){
  box(-.09,.75+row*.33,.30,.57,.025,.10,m.white,g);
  for(let j=0;j<4;j++)mesh(new THREE.CylinderGeometry(.039,.039,.18,8),pick([m.green,m.blue,m.yellow,m.paper]),-.30+j*.14,.86+row*.33,.295,g);
 }
 box(.31,1.25,.255,.11,.15,.025,m.rubber,g);box(.31,.97,.27,.065,.022,.02,m.steel,g);
 box(-.08,.34,.25,.49,.20,.035,m.dark,g);
 plaque('つめたい',0,1.76,.266,.72,.17,'#e8e3d0','#5c7a87',g,0);
}
vending(-5.47,m.red);vending(5.12,m.blue);
function bicycle(x,z,angle=0){
 const g=new THREE.Group();g.name='street-bicycle';g.position.set(x,.29,z);g.rotation.set(.12,angle,0);scenery.add(g);
 for(const px of [-.47,.55]){
  ring(px,.32,0,.29,.027,m.rubber,g);ring(px,.32,0,.25,.011,m.steel,g);
  for(let j=0;j<10;j++){const a=j/10*Math.PI*2;rod([px,.32,0],[px+Math.cos(a)*.25,.32+Math.sin(a)*.25,0],.004,m.steel,g);}
 }
 const p=[[-.47,.32,0],[-.16,.77,0],[.11,.32,0],[.40,.82,0],[.55,.32,0]];
 for(const [a,b] of [[0,1],[0,2],[1,2],[1,3],[2,3],[3,4]])rod(p[a],p[b],.02,m.woodDark,g);
 box(-.16,.85,0,.25,.05,.15,m.rubber,g);rod([.40,.82,0],[.38,1.03,0],.018,m.dark,g);rod([.38,1.03,-.13],[.38,1.03,.13],.022,m.dark,g);
 ring(.11,.32,.01,.09,.015,m.steel,g);rod([.1,.3,0],[.02,.01,.2],.013,m.steel,g);
}
bicycle(-2.04,3.22,Math.PI/2);bicycle(-2.08,4.35,Math.PI/2);bicycle(2.97,6.3,Math.PI/2);bicycle(2.96,2.5,Math.PI/2);
// Ordinary bench beneath the shop eaves, plus a delivery crate and folded umbrella.
for(const z of [-8.1,7.80]){
 box(-2.14,.74,z,.47,.085,1.12,m.wood);
 for(const dz of [-.43,.43])rod([-2.14,.29,z+dz],[-2.14,.70,z+dz],.033,m.dark);
 box(-2.38,1.0,z,.055,.44,1.12,m.woodDark);
}
box(-2.14,.46,1.54,.50,.34,.55,m.paper,scenery,true);
rod([-2.42,.3,-1.66],[-2.38,1.15,-1.66],.018,m.dark);
ell(-2.38,1.04,-1.66,.06,.20,.06,m.blue);

// Street-side power poles and sagging lines cross the canyon beneath the rails.
for(const z of [-7.35,-2.65,2.05,7.0]){
 rod([2.85,.18,z],[2.85,6.05,z],.075,m.concrete,scenery,.055);
 for(let i=0;i<5;i++)rod([2.85,.95+i*.15,z],[2.85,1.02+i*.15,z],.082,i%2?m.yellow:m.dark);
 for(const y of [5.35,5.85]){
  rod([2.22,y,z],[3.52,y,z],.035,m.roofDark);
  for(const x of [2.25,2.85,3.49]){rod([x,y,z],[x,y+.18,z],.018,m.steel);ell(x,y+.14,z,.05,.025,.05,m.white);}
 }
 mesh(new THREE.CylinderGeometry(.17,.17,.62,12),m.roofDark,3.15,4.75,z);
 tube([[2.85,4.45,z],[2.7,4.38,z],[2.60,4.2,z]],.016,m.dark);
 tube([[2.85,5.2,z],[.4,3.93,z-.2],[-2.51,2.96,z-.4]],.013,m.dark,scenery,24);
}
for(const [a,b] of [[-9,-7.35],[-7.35,-2.65],[-2.65,2.05],[2.05,7.0],[7.0,9]])for(const x of [2.25,2.85,3.49])tube([[x,6.0,a],[x,5.68,(a+b)/2],[x,6.0,b]],.011,m.dark,scenery,18);
// A few local details soften the infrastructure without turning it into a park.
for(const z of [-6.15,5.65]){
 mesh(new THREE.CylinderGeometry(.37,.37,.23,14),m.concrete,-8.30,.235,z);
 rod([-8.30,.35,z],[-8.27,2.25,z],.075,m.woodDark);
 for(let i=0;i<12;i++){
  const a=R(0,6.28),r=R(0,.6),s=R(.28,.43);
  ell(-8.27+Math.cos(a)*r,2.22+R(-.15,.4),z+Math.sin(a)*r,s,s*.85,s,i%2?m.leaf:m.leafLight);
 }
}
const streetLamps=[];
rod([2.85,4.7,-7.35],[.65,4.7,-7.35],.045,m.roofDark);
const traffic=new THREE.Group();traffic.name='street-traffic-light';traffic.position.set(.60,4.52,-7.35);model.add(traffic);
box(0,0,0,1.0,.31,.24,m.dark,traffic,true);
for(let i=0;i<3;i++){
 const mat=new THREE.MeshBasicMaterial({color:[0x8f665f,0x93885d,0x80b6a0][i]});
 const o=mesh(new THREE.CylinderGeometry(.10,.10,.035,16),mat,-.30+i*.30,0,.14,traffic);o.rotation.x=Math.PI/2;streetLamps.push(mat);
}

// Two coupled commuter cars run along the roof, clipped cleanly at the model ends.
const train=new THREE.Group();train.name='rooftop-commuter-train';train.position.set(-5.05,3.36,-4.9);train.rotation.y=-Math.PI/2;model.add(train);
const clipPlanes=[new THREE.Plane(v(0,0,1),64),new THREE.Plane(v(0,0,-1),64)];
const trainMat={};
for(const [key,mat] of Object.entries({body:m.white,band:m.blue,roof:m.roof,glass:m.window,dark:m.dark,steel:m.steel})){
 const clone=mat.clone();clone.clippingPlanes=clipPlanes;clone.clipShadows=true;trainMat[key]=clone;
}
const wheels=[];
for(const offset of [-1.68,1.68]){
 const car=new THREE.Group();car.name='commuter-car';car.position.x=offset;train.add(car);
 box(0,1.22,0,3.10,.98,1.18,trainMat.body,car);
 box(0,.98,0,3.12,.22,1.20,trainMat.band,car);
 box(0,.72,0,2.72,.14,1.0,trainMat.dark,car);
 box(0,1.78,0,3.1,.12,1.20,trainMat.roof,car);ell(0,1.84,0,1.55,.105,.60,trainMat.roof,car);
 for(const z of [-.608,.608]){
  for(let i=0;i<5;i++)box(-1.19+i*.59,1.42,z,.42,.37,.022,trainMat.glass,car);
  for(const x of [-.88,.88]){
   box(x,1.24,z,.34,.80,.026,trainMat.band,car);
   box(x,1.43,z+(z>0?.015:-.015),.25,.34,.018,trainMat.glass,car);
  }
  box(0,1.66,z,3.05,.035,.025,trainMat.band,car);
 }
 for(const x of [-1.566,1.566]){
  box(x,1.40,0,.027,.43,1.0,trainMat.glass,car);box(x,1.40,0,.035,.43,.035,trainMat.body,car);
  for(const z of [-.37,.37])ell(x,1.02,z,.023,.06,.08,trainMat.body,car);
  box(x,.77,0,.07,.075,.78,trainMat.dark,car);
 }
 for(const x of [-.98,.98])for(const z of [-.58,.58]){
  const pivot=new THREE.Group();pivot.name='roof-train-wheel';pivot.position.set(x,.61,z);car.add(pivot);
  const wheel=mesh(new THREE.CylinderGeometry(.19,.19,.085,14),trainMat.dark,0,0,0,pivot);wheel.rotation.x=Math.PI/2;
  const hub=mesh(new THREE.CylinderGeometry(.08,.08,.092,10),trainMat.steel,0,0,0,pivot);hub.rotation.x=Math.PI/2;wheels.push(pivot);
 }
 if(offset>0){
  rod([-.40,1.96,0],[.12,2.46,0],.018,trainMat.dark,car);rod([.62,1.96,0],[.12,2.46,0],.018,trainMat.dark,car);
  rod([.12,2.46,0],[-.21,2.94,0],.018,trainMat.dark,car);rod([.12,2.46,0],[.35,2.94,0],.018,trainMat.dark,car);
  rod([.07,2.97,-.30],[.07,2.97,.30],.023,trainMat.dark,car);
 }
 for(const x of [-.75,.50])box(x,1.96,0,.45,.13,.57,trainMat.roof,car);
}
rod([-.16,.82,0],[.16,.82,0],.055,trainMat.dark,train);
// Still geometry is batched by material; moving linen, signals and train stay separate.
scenery.updateMatrixWorld(true);
const batches=new Map(),lineParts=[],remove=[];
scenery.traverse(o=>{
 if(o.isLineSegments){lineParts.push(o.geometry.clone().applyMatrix4(o.matrixWorld));remove.push(o);return;}
 if(!o.isMesh||o.isInstancedMesh||o.material.transparent)return;
 const key=o.material.uuid;if(!batches.has(key))batches.set(key,{mat:o.material,gs:[]});
 const g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
 batches.get(key).gs.push(g);remove.push(o);
});
for(const o of remove)o.removeFromParent();
for(const {mat,gs} of batches.values()){
 const converted=gs.map(g=>g.index?g.toNonIndexed():g),merged=mergeGeometries(converted,false);if(!merged)throw new Error('Unable to batch rooftop street');
 mesh(merged,mat);gs.forEach(g=>g.dispose());converted.forEach(g=>g.dispose());
}
if(lineParts.length){const g=mergeGeometries(lineParts,false);scenery.add(new THREE.LineSegments(g,edgeMat));lineParts.forEach(g=>g.dispose());}
function animate(t){
 const position=-70+(t*1.55+65.1)%140;train.position.z=position;train.visible=position>-69&&position<69;
 wheels.forEach(w=>w.rotation.z=-t*8.15);
 laundry.forEach(({g,phase})=>{g.rotation.x=Math.sin(t*.65+phase)*.04;g.rotation.z=Math.sin(t*.47+phase)*.012;});
 const phase=t%18,active=phase<10?2:phase<12?1:0;
 streetLamps.forEach((mat,i)=>mat.color.setHex(i===active?[0xd97569,0xe6c666,0x83c6a9][i]:[0x8f665f,0x93885d,0x5e807b][i]));
}
animate(0);
let start=null;
const expandedWorld=expandWorld({kind:'rooftop',scene,model,camera,controls,renderer,preview,reduced});
function renderFrame(ms){
 expandedWorld.update(ms*.001);if(start===null)start=ms;controls.update();if(!preview&&!reduced)animate((ms-start)*.001);renderer.render(scene,camera);}
installSceneCapture({kind:'rooftop',camera,controls,renderer,preview,render:()=>renderFrame(preview?0:performance.now(),true)});
if(preview){renderFrame(0)}else{renderer.setAnimationLoop(renderFrame)}
addEventListener('resize',()=>{
 // Lazy iframes can temporarily collapse during layout or capture. Preserve the
 // last valid camera so a zero width cannot introduce Infinity/NaN into it.
 if(innerWidth<1||innerHeight<1)return;
 const aspect=innerWidth/innerHeight,factor=fit(aspect)/fit(camera.aspect);
 camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);camera.aspect=aspect;camera.updateProjectionMatrix();
 renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,preview?.85:1.8));if(preview)renderFrame(0);
});
