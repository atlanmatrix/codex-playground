import {expandWorld,expandedFit} from './world-expansion.js';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

const preview=new URLSearchParams(location.search).has('preview');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const vw=Math.max(1,innerWidth),vh=Math.max(1,innerHeight);
const scene=new THREE.Scene();scene.background=new THREE.Color('#252e49');
scene.fog=new THREE.FogExp2('#1a2139',.0007);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,preview?.8:1.5));renderer.setSize(vw,vh);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','雨夜便利店微缩景观，拖拽旋转，滚轮缩放');
const camera=new THREE.PerspectiveCamera(34,vw/vh,.4,250);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.8,0);
controls.enableDamping=true;controls.dampingFactor=.065;controls.enablePan=false;controls.enabled=!preview;
controls.minDistance=21;controls.maxDistance=160;controls.minPolarAngle=.26;controls.maxPolarAngle=Math.PI*.455;
const fit=a=>expandedFit(a),d=fit(camera.aspect);
camera.position.set(d*.48,1.8+d*.56,d*.94);camera.lookAt(controls.target);
scene.add(new THREE.HemisphereLight('#98a7db','#262538',.58));
const moon=new THREE.DirectionalLight('#a2b7ef',.86);moon.position.set(-8,18,6);moon.castShadow=true;
moon.shadow.mapSize.set(1024,1024);Object.assign(moon.shadow.camera,{left:-14,right:14,top:14,bottom:-14,near:.5,far:48});moon.shadow.normalBias=.026;moon.shadow.bias=-.00015;scene.add(moon);
const model=new THREE.Group();model.name='rainy-miniature';scene.add(model);
const scenery=new THREE.Group();scenery.name='rainy-static-street';model.add(scenery);
let seed=854329;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const R=(a,b)=>a+rand()*(b-a),pick=a=>a[Math.floor(rand()*a.length)],v=(x,y,z)=>new THREE.Vector3(x,y,z);
const ramp=new THREE.DataTexture(new Uint8Array([82,124,175,220,255]),5,1,THREE.RedFormat);ramp.minFilter=ramp.magFilter=THREE.NearestFilter;ramp.needsUpdate=true;
const toon=(color,extra={})=>new THREE.MeshToonMaterial({color,gradientMap:ramp,...extra});
const glow=(color,intensity=1)=>new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity),toneMapped:false});
const m={soil:toon('#252c40'),stone:toon('#424b61'),base:toon('#525d71'),concrete:toon('#7b8397'),wall:toon('#a2a8ad'),edge:toon('#c0c6c4'),darkWall:toon('#414c68'),roof:toon('#687386'),roofEdge:toon('#8591a0'),steel:toon('#778fa3'),dark:toon('#273549'),white:toon('#dbe2d6'),cream:toon('#e4debd'),wood:toon('#977e67'),green:toon('#338e76'),deepGreen:toon('#256657'),orange:toon('#c5854c'),red:toon('#ac5968'),blue:toon('#5b8ca6'),yellow:toon('#d3b873'),leaf:toon('#315e58'),leafLight:toon('#527b6a'),pot:toon('#785f61'),paper:toon('#d1c6ab'),rubber:toon('#252a37'),asphalt:new THREE.MeshStandardMaterial({color:'#30394f',roughness:.28,metalness:.23}),parking:new THREE.MeshStandardMaterial({color:'#464f66',roughness:.34,metalness:.15}),tile:new THREE.MeshStandardMaterial({color:'#69788b',roughness:.45,metalness:.12}),warm:glow('#fff2c8',2.2),tube:glow('#dceeff',2.8),greenLight:glow('#78dbc0',1.6),orangeLight:glow('#ffc879',1.9),redLight:glow('#ff605c',1.4),cool:glow('#a8d6f2',1.5)};
const glass=new THREE.MeshBasicMaterial({color:'#9dc5d7',transparent:true,opacity:.115,depthWrite:false,side:THREE.DoubleSide});
const outlines=new THREE.LineBasicMaterial({color:'#131d33',transparent:true,opacity:.52,depthWrite:false});
const geo={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.SphereGeometry(1,12,8),leaf:new THREE.IcosahedronGeometry(1,1)};
function mesh(g,mat,x=0,y=0,z=0,parent=scenery){const o=new THREE.Mesh(g,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function box(x,y,z,w,h,depth,mat,parent=scenery,outline=false){const o=mesh(geo.box,mat,x,y,z,parent);o.scale.set(w,h,depth);if(outline){const l=new THREE.LineSegments(new THREE.EdgesGeometry(geo.box),outlines);l.scale.setScalar(1.002);o.add(l)}return o}
function ell(x,y,z,sx,sy,sz,mat,parent=scenery){const o=mesh(geo.sphere,mat,x,y,z,parent);o.scale.set(sx,sy,sz);return o}
function rod(a,b,r,mat,parent=scenery,rTop=r){const from=v(...a),to=v(...b),delta=to.clone().sub(from);const o=mesh(new THREE.CylinderGeometry(rTop,r,delta.length(),8),mat,0,0,0,parent);o.position.copy(from.add(to).multiplyScalar(.5));o.quaternion.setFromUnitVectors(v(0,1,0),delta.normalize());return o}
function tube(ps,r,mat,parent=scenery,steps=24){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ps.map(p=>v(...p))),steps,r,5,false),mat,0,0,0,parent)}
function ring(x,y,z,r,t,mat,parent=scenery){return mesh(new THREE.TorusGeometry(r,t,6,28),mat,x,y,z,parent)}
const dummy=new THREE.Object3D();
function instances(g,mat,items,parent=scenery){const o=new THREE.InstancedMesh(g,mat,items.length);items.forEach((a,i)=>{dummy.position.set(...a.p);dummy.scale.set(...(a.s||[1,1,1]));dummy.rotation.set(...(a.r||[0,0,0]));dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);if(a.c)o.setColorAt(i,new THREE.Color(a.c))});o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function textPanel(text,x,y,z,w,h,bg,fg,parent=scenery,emissive=false){const c=document.createElement('canvas');c.width=1024;c.height=Math.round(1024*h/w);const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`600 ${c.height*.61}px "Noto Sans CJK JP","Yu Gothic",sans-serif`;ctx.fillStyle=fg;ctx.fillText(text,c.width/2,c.height*.53,c.width*.94);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const mat=emissive?new THREE.MeshBasicMaterial({map:texture,toneMapped:false,color:new THREE.Color(1.18,1.18,1.18)}):new THREE.MeshToonMaterial({map:texture,gradientMap:ramp});return box(x,y,z,w,h,.025,mat,parent)}
function point(color,intensity,x,y,z,distance=12){const o=new THREE.PointLight(color,intensity,distance,1.5);o.position.set(x,y,z);scene.add(o);return o}
function pot(x,y,z,s=.26){mesh(new THREE.CylinderGeometry(s*.55,s*.43,s,10),m.pot,x,y+s*.5,z);mesh(new THREE.CylinderGeometry(s*.50,s*.50,.025,10),m.soil,x,y+s,z);for(let j=0;j<6;j++)ell(x+R(-s*.3,s*.3),y+s+R(s*.2,s),z+R(-s*.3,s*.3),s*.44,s*.58,s*.4,j%2?m.leaf:m.leafLight)}
// A single intact square, with a clearly visible layered concrete street section.
for(const [lo,hi,mat] of [[-1.1,-.46,m.soil],[-.46,-.12,m.base],[-.12,.12,m.concrete]])box(0,(lo+hi)/2,0,18,hi-lo,18,mat,scenery,true);
box(0,.15,6.0,18,.06,6,m.asphalt);
box(7.1,.15,-3.0,3.8,.06,12,m.asphalt);
box(-1.9,.15,1.66,14.2,.06,2.67,m.parking);
box(-1.9,.22,-.05,14.2,.20,1.18,m.tile,scenery,true);
box(4.7,.22,-3.0,.95,.20,12,m.tile,scenery,true);
box(-7.65,.22,-3.7,2.70,.20,10.6,m.tile,scenery,true);
for(let x=-8.6;x<5;x+=.58)box(x,.24,3.0,.53,.12,.18,m.concrete);
for(let z=-8.6;z<3;z+=.58)box(5.25,.24,z,.18,.12,.53,m.concrete);
// Parking bays and a short side-street crossing.
for(let i=0;i<6;i++)box(-6.65+i*1.72,.188,1.73,.048,.014,2.2,m.edge);
box(-2.35,.188,2.84,8.65,.014,.045,m.edge);
for(let i=0;i<6;i++){box(5.7+i*.54,.19,2.15,.31,.018,1.28,m.white);box(-8.2+i*.55,.19,6.1,.31,.018,1.7,m.white)}
for(const x of [-8.75,8.7])box(x,.19,6.1,.055,.018,5.72,m.white);
for(let x=-5.8;x<8.3;x+=1.5)box(x,.19,6.1,.75,.018,.07,m.yellow);
for(const z of [3.42,8.55])box(0,.19,z,17.7,.018,.045,m.white);
// Long sidewalk joints have actual relief; drain covers sit below the curb tops.
for(let x=-8.8;x<5;x+=.58)box(x,.326,-.04,.012,.008,1.11,m.base);
for(const x of [-6.7,-2.1,3.4]){box(x,.188,2.78,.54,.016,.22,m.dark);for(let i=0;i<6;i++)box(x-.22+i*.087,.201,2.78,.026,.009,.19,m.steel)}
for(const [x,z] of [[-4.9,5.1],[3.7,7.5],[7.2,-3.2]]){mesh(new THREE.CylinderGeometry(.29,.29,.023,28),m.dark,x,.198,z);const r=ring(x,.214,z,.22,.012,m.steel);r.rotation.x=Math.PI/2;for(let i=0;i<4;i++)box(x,.219,z-.105+i*.07,.31,.007,.015,m.steel)}
const ground=mesh(new THREE.PlaneGeometry(180,180),new THREE.ShadowMaterial({opacity:.23}),0,-1.14,0,scene);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
// Store: glazing reveals an entire warm interior instead of a flat painted facade.
const store=new THREE.Group();store.name='illuminated-convenience-store';scenery.add(store);
const sx=-1.5,back=-5.65,front=.05;
box(sx,.42,-2.8,10.6,.20,5.7,m.cream,store,true);
box(sx,2.0,back,10.6,3.20,.16,m.wall,store,true);
box(-6.72,2.0,-2.8,.16,3.20,5.7,m.wall,store,true);
box(3.72,2.0,-4.45,.16,3.20,2.4,m.wall,store,true);
for(const x of [-6.65,-3.95,-1.25,1.45,3.65])box(x,1.71,front,.085,2.55,.085,m.steel,store);
box(sx,3.04,front,10.6,.15,.14,m.edge,store);box(sx,.48,front,10.6,.13,.14,m.edge,store);
for(const x of [-5.3,-2.6,.10,2.63]){box(x,1.71,front,2.57,2.45,.025,glass,store);box(x,1.36,.081,2.54,.11,.015,m.deepGreen,store);box(x,1.48,.082,2.54,.025,.012,m.white,store)}
// Distinct automatic sliding doors, entrance mat, handles and small stickers.
for(const x of [-.47,.47]){box(x,1.70,.12,.035,2.45,.06,m.steel,store);box(x,1.22,.17,.025,.39,.025,m.edge,store);textPanel('PUSH',x,1.65,.16,.28,.10,'#458a78','#f4f1d3',store)}
box(0,.365,.52,1.88,.06,.83,m.deepGreen,store);for(let i=0;i<9;i++)box(-.78+i*.19,.401,.52,.025,.008,.71,m.green,store);
for(const z of [-2.6,-1.2]){box(3.76,1.69,z,.024,2.35,1.24,glass,store);box(3.79,1.69,z+.63,.07,2.46,.07,m.steel,store);box(3.80,1.39,z,.016,.11,1.25,m.green,store)}
// Roof cap, lit fascia, three-color bands and a deep rain awning.
box(sx,3.48,-2.8,10.88,.30,5.96,m.roof,store,true);
box(sx,3.69,-2.8,10.88,.12,5.96,m.roofEdge,store,true);
for(const x of [-6.91,3.91])box(x,3.83,-2.8,.12,.25,5.96,m.edge,store);
box(sx,3.83,-5.74,10.88,.25,.13,m.edge,store);
box(sx,3.58,.31,10.88,.68,.24,m.dark,store,true);
box(sx,3.61,.46,10.62,.48,.06,m.tube,store);
box(-6.59,3.61,.502,.19,.49,.018,m.greenLight,store);box(-6.37,3.61,.502,.10,.49,.018,m.orangeLight,store);
box(3.59,3.61,.502,.19,.49,.018,m.greenLight,store);box(3.37,3.61,.502,.10,.49,.018,m.orangeLight,store);
textPanel('あま灯り  •  AMEAKARI',sx,3.62,.505,8.2,.39,'#f5f7de','#4e806c',store,true);
box(sx,3.23,.38,10.9,.13,.23,m.orangeLight,store);
const canopy=box(sx,2.99,.87,11.18,.095,1.52,m.roofEdge,store,true);canopy.rotation.x=.095;
box(sx,2.91,1.62,11.20,.16,.09,m.deepGreen,store,true);
box(sx,2.84,1.60,10.95,.032,.035,m.greenLight,store);
for(const x of [-6.62,3.64]){rod([x,.32,1.52],[x,2.94,1.52],.042,m.steel,store);rod([x,2.93,1.52],[x,3.27,-.14],.028,m.steel,store)}
// Tiles, fluorescent bars and shelving remain visible through all front panes.
for(let x=-6.5;x<3.7;x+=.52)box(x,.527,-2.8,.012,.01,5.45,m.paper,store);
for(let z=-5.45;z<0;z+=.52)box(-1.5,.527,z,10.4,.01,.012,m.paper,store);
for(const x of [-4.7,-1.5,1.7]){box(x,3.27,-2.7,1.85,.08,.22,m.white,store);box(x,3.22,-2.7,1.70,.025,.15,m.tube,store)}
// Cold drinks along the back wall: seven framed refrigerator doors.
for(let i=0;i<7;i++){
 const x=-5.95+i*1.25;
 box(x,1.72,-5.25,1.15,2.33,.53,m.dark,store,true);box(x,1.72,-4.965,1.02,2.15,.025,m.cool,store);
 for(const y of [.77,1.25,1.73,2.21])box(x,y,-4.89,1.04,.045,.15,m.steel,store);
 box(x+.43,1.68,-4.82,.028,.45,.028,m.steel,store);box(x,2.93,-5.12,1.15,.13,.42,m.white,store);
}
const products=[],labels=[];
const productColors=['#bd7456','#5a9b81','#bec6a1','#b9a45e','#809eb8','#a36982','#e3d8b5'];
for(let i=0;i<7;i++)for(let row=0;row<4;row++)for(let k=0;k<6;k++){
 const x=-6.37+i*1.25+k*.166,y=.84+row*.48,z=-4.82,c=pick(productColors);
 products.push({p:[x,y+.11,z],s:[.11,.23,.10],c});labels.push({p:[x,y+.09,z+.054],s:[.086,.067,.008],c:'#dfdac9'});
}
const shelfRows=[];
for(const [x,z,w] of [[-4.68,-2.15,2.2],[-1.53,-2.15,2.2],[1.5,-2.22,1.85]]){
 const shelf=new THREE.Group();shelf.name='stocked-store-aisle';store.add(shelf);shelfRows.push(shelf);
 box(x,1.24,z,w,1.4,.055,m.white,shelf,true);box(x,.63,z,w+.10,.18,.77,m.cream,shelf);
 for(const y of [.75,1.16,1.57,1.98])for(const side of [-1,1]){
  box(x,y,z+side*.23,w+.08,.055,.45,m.edge,shelf);box(x,y-.035,z+side*.465,w+.09,.09,.018,m.green,shelf);
  for(let k=0;k<Math.floor(w/.19);k++){
   const px=x-w/2+.12+k*.19,py=y+.14,pz=z+side*.27;
   products.push({p:[px,py,pz],s:[.14,.23,.23],c:pick(productColors)});labels.push({p:[px,py-.01,pz+side*.12],s:[.11,.085,.008],c:'#e5dfc9'});
  }
 }
}
// Checkout, till, coffee machine, heated food cabinet and a magazine rack.
box(-4.95,.96,-.84,2.68,.86,.78,m.wood,store,true);box(-4.95,1.43,-.84,2.85,.09,.91,m.cream,store);
box(-4.55,1.64,-.80,.43,.34,.25,m.dark,store,true);const screen=box(-4.55,1.69,-.653,.31,.18,.018,m.greenLight,store);screen.rotation.x=-.12;
box(-5.73,1.75,-.84,.56,.61,.49,m.dark,store,true);box(-5.73,1.83,-.57,.37,.21,.025,m.cool,store);box(-5.73,1.52,-.54,.37,.065,.16,m.steel,store);
box(-3.98,1.76,-.84,.52,.57,.48,m.orange,store,true);box(-3.98,1.80,-.583,.45,.42,.018,glass,store);for(const y of [1.63,1.83]){box(-3.98,y,-.76,.44,.025,.30,m.steel,store);for(const x of [-4.12,-3.98,-3.84])ell(x,y+.045,-.74,.052,.04,.065,m.yellow,store)}
for(let i=0;i<7;i++){const b=box(2.65+i*.12,.87,-.47,.10,.44,.27,pick([m.paper,m.orange,m.blue,m.green]),store);b.rotation.x=.18;}box(3.01,.65,-.5,1.04,.20,.46,m.dark,store);
// A small cold-food island, baskets and entrance umbrella rack.
box(1.76,.91,-.89,1.08,.73,.70,m.cream,store,true);box(1.76,1.31,-.89,1.06,.045,.70,m.cool,store);
for(let i=0;i<10;i++)box(-.9,.59+i*.042,-.56,.57,.055,.43,m.red,store);
// Low front-window displays remain visible from the default miniature view.
for(const x of [-2.50,1.98]){
 for(const y of [.75,1.12,1.49]){
  box(x,y,-.29,1.25,.045,.31,m.cream,store);box(x,y-.03,-.115,1.26,.07,.025,m.green,store);
  for(let k=0;k<7;k++){const px=x-.52+k*.17;products.push({p:[px,y+.12,-.27],s:[.13,.20,.20],c:pick(productColors)});labels.push({p:[px,y+.10,-.164],s:[.095,.07,.01],c:'#e9ddb7'})}
 }
 for(const px of [x-.60,x+.60])box(px,1.07,-.42,.035,.80,.035,m.steel,store);
}
instances(geo.box,toon('#ffffff'),products,store).name='store-products';instances(geo.box,toon('#ffffff'),labels,store).name='product-labels';
point('#ffe2ab',5.2,-3,2.45,-.05,12);point('#f2f5cb',4.2,1.5,2.4,-2.5,10);point('#f5e9c5',2.5,-4,2.65,-4.2,9);
point('#ffe9bc',8.0,-1.4,2.3,1.55,13);
// Roof machinery: vents, condensers, pipework, roof drain and service ladder.
function ac(x,y,z,w=1.03){box(x,y+.4,z,w,.80,.63,m.concrete,scenery,true);for(let i=0;i<2;i++){const fan=ring(x+(i?1:-1)*w*.24,y+.42,z+.326,w*.18,.018,m.dark);mesh(new THREE.CircleGeometry(w*.16,20),m.base,x+(i?1:-1)*w*.24,y+.42,z+.329);for(let a=0;a<5;a++){const blade=box(x+(i?1:-1)*w*.24,y+.42,z+.34,.025,w*.27,.012,m.steel);blade.rotation.z=a*Math.PI/5;}fan.castShadow=false;}for(let i=0;i<6;i++)box(x,y+.18+i*.08,z+.34,w*.91,.012,.012,m.roofEdge)}
ac(-5.16,3.77,-4.24,1.3);ac(-3.65,3.77,-4.24,1.3);
for(const x of [-5.8,-3.1])tube([[x,4.0,-4.3],[x,3.80,-3.4],[x+.6,3.80,-3.4],[x+.6,3.80,-2.5]],.036,m.steel);
for(const [x,z] of [[.5,-4.6],[2.3,-3.2]]){box(x,4.02,z,.58,.45,.58,m.roofEdge,scenery,true);box(x,4.29,z,.74,.07,.74,m.steel);}
mesh(new THREE.CylinderGeometry(.17,.17,.74,12),m.steel,-1.5,4.13,-4.7);mesh(new THREE.CylinderGeometry(.24,.24,.07,12),m.roofEdge,-1.5,4.53,-4.7);
for(const x of [-6.64,3.67])tube([[x,3.83,-5.6],[x,3.7,-5.9],[x,.40,-5.9]],.045,m.steel);
for(let i=0;i<10;i++)rod([-6.90,.65+i*.32,-4.25],[-6.90,.65+i*.32,-3.65],.021,m.steel);for(const z of [-4.25,-3.65])rod([-6.9,.4,z],[-6.9,3.88,z],.026,m.steel);
// Quiet neighboring buildings form the alley without enclosing the model.
function neighbor(x,z,w,dep,h,mat){const g=new THREE.Group();g.name='night-neighbor';scenery.add(g);box(x,.32+h/2,z,w,h,dep,mat,g,true);box(x,h+.38,z,w+.14,.16,dep+.16,m.darkWall,g,true);for(let i=0;i<3;i++){const px=x-w*.33+i*w*.33;box(px,h*.58,z+dep/2+.025,w*.20,.56,.035,m.dark,g);if(i===1)box(px,h*.58,z+dep/2+.049,w*.16,.47,.014,m.warm,g);else{box(px,h*.58,z+dep/2+.05,w*.17,.47,.014,m.roof,g);box(px,h*.58,z+dep/2+.065,.025,.47,.008,m.steel,g);}}return g}
neighbor(-3.6,-7.38,9.2,2.18,3.03,m.darkWall);
neighbor(-8.0,-2.4,1.65,6.4,2.78,m.darkWall);
neighbor(7.05,-6.96,3.6,3.5,3.9,m.darkWall);
box(7.04,.30,-1.1,3.56,.26,1.3,m.concrete,scenery,true);for(let i=0;i<3;i++)pot(6.1+i*.85,.43,-1.17,.38);
// Illuminated vending machines, recycling bins and a readable bicycle silhouette.
function vending(x,z,color){const g=new THREE.Group();g.name='lit-vending-machine';g.position.set(x,.32,z);scenery.add(g);box(0,1.02,0,.77,2.04,.60,color,g,true);box(0,1.41,.317,.65,1.03,.026,m.cool,g);for(let row=0;row<3;row++)for(let i=0;i<5;i++){box(-.25+i*.125,1.10+row*.32,.343,.07,.19,.06,pick([m.red,m.green,m.orange,m.blue]),g);box(-.25+i*.125,.99+row*.32,.36,.085,.027,.025,m.orangeLight,g);}box(0,.56,.33,.60,.28,.035,m.dark,g);box(-.11,.57,.355,.33,.10,.03,m.rubber,g);box(.22,.77,.352,.10,.17,.028,m.greenLight,g);textPanel('DRINKS',0,1.99,.33,.62,.12,'#dcf2da','#267f67',g,true);point('#b5e0ed',2,x,1.8,z+.7,5)}
vending(-6.17,1.07,m.green);vending(-5.30,1.07,m.red);
for(const x of [2.60,3.26]){box(x,.90,.76,.53,1.12,.52,m.concrete,scenery,true);box(x,1.49,.76,.58,.09,.57,m.dark);box(x,1.31,1.035,.34,.13,.027,m.rubber);textPanel('RECYCLE',x,1.07,1.047,.41,.10,'#b9c1b6','#425d5d')}
box(1.78,.66,.80,.47,.62,.50,m.dark,scenery,true);for(const x of [1.63,1.78,1.92])rod([x,.97,.66],[x,1.59,.66],.012,m.steel);for(const x of [1.63,1.92]){const u=ell(x,1.31,.66,.055,.27,.06,m.blue);u.rotation.z=-.13;}
function bicycle(x,z,angle){const g=new THREE.Group();g.name='parked-rain-bicycle';g.position.set(x,.33,z);g.rotation.set(.10,angle,0);scenery.add(g);for(const px of [-.47,.5]){ring(px,.32,0,.29,.026,m.rubber,g);ring(px,.32,0,.26,.012,m.steel,g);for(let i=0;i<12;i++){const a=i*Math.PI/6;rod([px,.32,0],[px+Math.cos(a)*.25,.32+Math.sin(a)*.25,0],.004,m.steel,g)}}const ps=[[-.47,.32,0],[-.17,.76,0],[.10,.32,0],[.37,.78,0],[.5,.32,0]];for(const [a,b] of [[0,1],[0,2],[1,2],[1,3],[2,3],[3,4]])rod(ps[a],ps[b],.018,m.blue,g);box(-.17,.82,0,.24,.055,.15,m.rubber,g);rod([.37,.78,0],[.34,1.02,0],.018,m.steel,g);rod([.34,1.02,-.13],[.34,1.02,.13],.018,m.steel,g);box(.48,.79,0,.31,.24,.28,m.steel,g,true);box(.48,.83,.15,.27,.15,.014,m.dark,g)}
bicycle(-3.83,1.25,.25);bicycle(-2.82,1.26,.12);
// Bollards, silver guardrails and a few traffic cones mark the wet corner.
for(let x=-6.3;x<4.5;x+=1.64){rod([x,.18,2.78],[x,.92,2.78],.037,m.steel);mesh(new THREE.CylinderGeometry(.042,.042,.075,10),m.redLight,x,.76,2.78)}
for(const [a,b] of [[[-8.6,.9,3.16],[-6.8,.9,3.16]],[[-4.1,.9,3.16],[4.75,.9,3.16]],[[5.12,.9,-8.75],[5.12,.9,1.30]]]){rod(a,b,.029,m.steel);rod([a[0],.58,a[2]],[b[0],.58,b[2]],.022,m.steel);const dist=v(...a).distanceTo(v(...b)),count=Math.ceil(dist/.95);for(let i=0;i<=count;i++){const t=i/count,x=THREE.MathUtils.lerp(a[0],b[0],t),z=THREE.MathUtils.lerp(a[2],b[2],t);rod([x,.25,z],[x,1.0,z],.031,m.steel)}}
for(const [x,z] of [[4.01,1.6],[4.59,2.25]]){box(x,.22,z,.37,.07,.37,m.rubber);mesh(new THREE.ConeGeometry(.15,.47,12),m.orange,x,.485,z);mesh(new THREE.CylinderGeometry(.053,.082,.09,12),m.white,x,.53,z)}
// Tall poles, lamps, transformers and bowed cables frame the bright shop.
for(const [x,z,h] of [[-7.05,2.65,6.5],[5.45,2.65,6.9],[5.45,-7.5,6.55]]){
 rod([x,.19,z],[x,h,z],.075,m.concrete,scenery,.055);box(x,.24,z,.42,.17,.42,m.base,scenery,true);
 for(let i=0;i<6;i++)mesh(new THREE.CylinderGeometry(.081,.081,.085,8),i%2?m.yellow:m.dark,x,1.06+i*.10,z);
 for(const y of [h-.34,h-.85]){rod([x-.75,y,z],[x+.75,y,z],.035,m.steel);for(const dx of [-.65,0,.65]){rod([x+dx,y,z],[x+dx,y+.2,z],.017,m.steel);ell(x+dx,y+.15,z,.05,.027,.05,m.edge)}}
 mesh(new THREE.CylinderGeometry(.18,.18,.67,12),m.roofEdge,x+.24,h-1.45,z);tube([[x,h-1.72,z],[x+.29,h-1.9,z],[x+.37,h-1.15,z]],.016,m.dark);
 const side=x<0?1:-1;rod([x,h-1.5,z],[x+side*1.6,h-1.5,z],.038,m.steel);box(x+side*1.5,h-1.55,z,.61,.12,.25,m.dark,scenery,true);box(x+side*1.5,h-1.62,z,.49,.025,.18,m.cool);point('#b1d6f6',5.0,x+side*1.5,h-1.85,z,10);
}
for(const y of [6.33,5.83])for(const dz of [-.10,.11])tube([[-7.05,y,2.65+dz],[-.8,y-.65,2.65+dz],[5.45,y,2.65+dz]],.012,m.dark);
for(const dx of [-.65,0,.65])tube([[5.45+dx,6.12,2.65],[5.45+dx,5.52,-2.5],[5.45+dx,5.88,-7.5]],.011,m.dark);
tube([[-7.05,4.8,2.65],[-6.5,3.2,-1],[-6.5,3.4,-5.65]],.018,m.dark);
textPanel('雨宿り通り',4.35,2.30,2.76,1.45,.28,'#476383','#b8d3e7');rod([4.35,.3,2.7],[4.35,2.56,2.7],.032,m.steel);
const signal=new THREE.Group();signal.position.set(7.5,4.75,2.35);scenery.add(signal);rod([5.45,4.9,2.35],[7.7,4.9,2.35],.045,m.steel);box(0,0,0,1.06,.34,.29,m.dark,signal,true);for(let i=0;i<3;i++){const o=mesh(new THREE.CylinderGeometry(.105,.105,.025,14),i===0?m.redLight:m.dark,-.33+i*.33,0,.16,signal);o.rotation.x=Math.PI/2;}
for(const [x,z] of [[-8.3,2.3],[4.65,-.9],[8.2,-1]])pot(x,.33,z,.34);
// Batch architectural meshes, retaining transparent glazing and moving weather.
scenery.updateMatrixWorld(true);const batches=new Map(),lineParts=[],remove=[];
scenery.traverse(o=>{if(o.isLineSegments){lineParts.push(o.geometry.clone().applyMatrix4(o.matrixWorld));remove.push(o);return}if(!o.isMesh||o.isInstancedMesh||o.material.transparent)return;const key=o.material.uuid;if(!batches.has(key))batches.set(key,{mat:o.material,gs:[]});const g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));batches.get(key).gs.push(g);remove.push(o)});
for(const o of remove)o.removeFromParent();for(const {mat,gs} of batches.values()){const converted=gs.map(g=>g.index?g.toNonIndexed():g),merged=mergeGeometries(converted,false);if(!merged)throw Error('Unable to batch rainy street');mesh(merged,mat);gs.forEach(g=>g.dispose());converted.forEach(g=>g.dispose())}if(lineParts.length){scenery.add(new THREE.LineSegments(mergeGeometries(lineParts,false),outlines));lineParts.forEach(g=>g.dispose())}
// Uneven puddles share a single live planar reflection render.
const puddleSites=[[-5.9,4.65,1.35,.40],[-3.5,3.87,.70,.34],[-.5,4.25,1.95,.74],[3.0,5.38,.83,.47],[6.0,4.95,1.5,.58],[-6.65,7.8,1.18,.65],[-3.2,6.85,1.43,.43],[.45,7.75,1.55,.60],[4.3,7.13,1.0,.82],[7.35,8.05,.80,.42],[7.2,-.7,.95,.62],[7.35,-4.5,.92,.68],[-4.9,1.9,.76,.48],[-1.6,1.85,.83,.42],[1.45,2.05,.79,.39]];
const puddleParts=[];
for(const [x,z,rx,rz] of puddleSites){const s=new THREE.Shape();for(let i=0;i<=32;i++){const a=i/32*Math.PI*2,r=1+.10*Math.sin(a*3+z)+.065*Math.cos(a*5+x),px=x+Math.cos(a)*rx*r,py=-z+Math.sin(a)*rz*r;i?s.lineTo(px,py):s.moveTo(px,py)}const g=new THREE.ShapeGeometry(s);puddleParts.push(g.toNonIndexed())}
const puddleGeo=mergeGeometries(puddleParts,false);puddleParts.forEach(g=>g.dispose());
const reflection=new Reflector(puddleGeo,{textureWidth:preview?384:768,textureHeight:preview?384:768,clipBias:.004,color:0x73839b,
 shader:{uniforms:{color:{value:new THREE.Color('#73839b')},tDiffuse:{value:null},textureMatrix:{value:new THREE.Matrix4()},time:{value:0}},
 vertexShader:`uniform mat4 textureMatrix;varying vec4 mirrorCoord;varying vec3 worldP;void main(){vec4 world=modelMatrix*vec4(position,1.);worldP=world.xyz;mirrorCoord=textureMatrix*vec4(position,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform sampler2D tDiffuse;uniform vec3 color;uniform float time;varying vec4 mirrorCoord;varying vec3 worldP;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 void main(){vec2 p=worldP.xz;vec2 cell=floor(p*2.3);vec2 local=fract(p*2.3)-.5;float h=hash(cell);float age=fract(time*.66+h);float dist=length(local-vec2(sin(h*43.),cos(h*71.))*.22);float ripple=sin(dist*53.-age*19.)*exp(-dist*5.)*sin(age*3.14159)*.0023;
 vec2 wobble=vec2(sin(p.y*17.+time*2.1),cos(p.x*15.-time*1.8))*.0007+local*ripple;
 vec2 uv=mirrorCoord.xy/mirrorCoord.w+wobble;vec3 reflected=texture2D(tDiffuse,uv).rgb*.45;reflected+=texture2D(tDiffuse,uv+vec2(.0018,.0007)).rgb*.20;reflected+=texture2D(tDiffuse,uv-vec2(.0018,.0007)).rgb*.20;reflected+=texture2D(tDiffuse,uv+vec2(0.,.003)).rgb*.15;
 float fresnel=.50+.08*sin(p.y*.7);vec3 c=mix(vec3(.055,.079,.13),reflected,fresnel);c+=vec3(.11,.15,.20)*max(0.,sin(dist*58.-age*18.))*sin(age*3.14159)*exp(-dist*4.)*.11;gl_FragColor=vec4(c,.88);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`}});
reflection.name='rain-reflecting-puddles';reflection.rotation.x=-Math.PI/2;reflection.position.y=.193;reflection.material.transparent=true;reflection.material.depthWrite=false;model.add(reflection);
// Each ring has a different lifespan and location, so rainfall never pulses in sync.
const rippleUniforms={time:{value:0}};
const rippleMaterial=new THREE.ShaderMaterial({uniforms:rippleUniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
 vertexShader:`attribute float phase;attribute float life;uniform float time;varying float alpha;void main(){float age=fract(time/life+phase);vec3 p=position; p.xy*=.025+age*.27;alpha=sin(age*3.14159)*(1.-age)*.24;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(p,1.);}`,
 fragmentShader:`varying float alpha;void main(){gl_FragColor=vec4(.59,.72,.83,alpha);}`});
const ringGeo=new THREE.RingGeometry(.91,1.0,24);const rippleCount=96;
const rippleGeo=new THREE.InstancedBufferGeometry().copy(ringGeo);const phases=[],lifetimes=[];for(let i=0;i<rippleCount;i++){phases.push(rand());lifetimes.push(R(.85,1.65))}rippleGeo.setAttribute('phase',new THREE.InstancedBufferAttribute(new Float32Array(phases),1));rippleGeo.setAttribute('life',new THREE.InstancedBufferAttribute(new Float32Array(lifetimes),1));
const ripples=new THREE.InstancedMesh(rippleGeo,rippleMaterial,rippleCount);ripples.name='independent-rain-ripples';
for(let i=0;i<rippleCount;i++){const [x,z,rx,rz]=puddleSites[i%puddleSites.length],a=R(0,Math.PI*2),r=R(.0,.55);dummy.position.set(x+Math.cos(a)*rx*r,.205,z+Math.sin(a)*rz*r);dummy.rotation.set(-Math.PI/2,0,R(0,6.28));dummy.scale.set(1,1,1);dummy.updateMatrix();ripples.setMatrixAt(i,dummy.matrix)}ripples.frustumCulled=false;model.add(ripples);
// Falling rain respects the store roof and canopy; the interior stays dry.
const rainCount=preview?1600:3300,rainPositions=[],rainFloor=[],rainPhase=[],rainBrightness=[];
for(let i=0;i<rainCount;i++){
 const x=R(-8.95,8.95),z=R(-8.95,8.95),floor=x>-6.98&&x<3.99&&z>-5.86&&z<.30?4.0:x>-7.12&&x<4.12&&z>.30&&z<1.73?3.22:z<-6.25&&x<1.1&&x>-8.3?3.6:x<-7.1&&z>-5.7&&z<.9?3.4:x>5.2&&z<-5.1?4.6:.24,phase=rand(),b=R(.12,.34),len=R(.18,.39);
 for(let end=0;end<2;end++){rainPositions.push(x+end*.065,end*len,z+end*.008);rainFloor.push(floor);rainPhase.push(phase);rainBrightness.push(b)}
}
const rainGeometry=new THREE.BufferGeometry();rainGeometry.setAttribute('position',new THREE.Float32BufferAttribute(rainPositions,3));rainGeometry.setAttribute('floorY',new THREE.Float32BufferAttribute(rainFloor,1));rainGeometry.setAttribute('phase',new THREE.Float32BufferAttribute(rainPhase,1));rainGeometry.setAttribute('brightness',new THREE.Float32BufferAttribute(rainBrightness,1));
const rainMaterial=new THREE.ShaderMaterial({uniforms:{time:{value:0}},transparent:true,depthWrite:false,
 vertexShader:`attribute float floorY;attribute float phase;attribute float brightness;uniform float time;varying float alpha;void main(){float span=8.25-floorY;float fall=fract(phase-time*(.79+phase*.11));vec3 p=position;p.y+=floorY+fall*span;p.x+=(fall-.5)*.42;alpha=brightness*.60*(.50+fall*.50);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
 fragmentShader:`varying float alpha;void main(){gl_FragColor=vec4(.60,.71,.89,alpha);}`});
const rain=new THREE.LineSegments(rainGeometry,rainMaterial);rain.name='falling-rain';rain.frustumCulled=false;model.add(rain);
// Tiny downspout drips and runoff beads along the awning edge.
const dripItems=[];for(let i=0;i<110;i++)dripItems.push({p:[R(-6.9,3.9),R(.40,2.83),1.67],s:[.008,R(.025,.065),.008]});
const drips=instances(geo.sphere,new THREE.MeshBasicMaterial({color:'#acc9df',transparent:true,opacity:.4,depthWrite:false}),dripItems,model);drips.name='canopy-rain-drips';drips.castShadow=false;
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(vw,vh),.32,.43,1.25);composer.addPass(bloom);composer.addPass(new OutputPass());bloom.setSize(vw*.5,vh*.5);
let started=null,lastRender=-Infinity,renderedOnce=false;const lastPosition=new THREE.Vector3(),lastQuaternion=new THREE.Quaternion();
const expandedWorld=expandWorld({kind:'rainy',scene,model,camera,controls,renderer,preview,reduced});
function renderFrame(ms){
 expandedWorld.update(ms*.001);if(started===null)started=ms;const t=preview||reduced?0:(ms-started)*.001;controls.update();if(reduced&&renderedOnce&&lastPosition.distanceToSquared(camera.position)<1e-12&&Math.abs(lastQuaternion.dot(camera.quaternion))>1-1e-12)return;if(!preview&&!reduced&&ms-lastRender<32)return;lastRender=ms;rainMaterial.uniforms.time.value=t;rippleUniforms.time.value=t;reflection.material.uniforms.time.value=t;drips.position.y=-(t*.42% .30);composer.render();lastPosition.copy(camera.position);lastQuaternion.copy(camera.quaternion);renderedOnce=true;}
if(preview)renderFrame(0);else renderer.setAnimationLoop(renderFrame);
addEventListener('resize',()=>{if(innerWidth<1||innerHeight<1)return;const aspect=innerWidth/innerHeight,factor=fit(aspect)/fit(camera.aspect);camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);camera.aspect=aspect;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,preview?.8:1.5));renderer.setSize(innerWidth,innerHeight);composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(innerWidth,innerHeight);bloom.setSize(innerWidth*.5,innerHeight*.5);renderedOnce=false;if(preview||reduced)renderFrame(0)});
