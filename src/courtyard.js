import {installSceneCapture} from './scene-capture.js';
import {expandWorld,expandedFit} from './expansions/courtyard.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const preview=['preview','screenshot'].some(key=>new URLSearchParams(location.search).has(key));
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene=new THREE.Scene();
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,preview?.85:1.8));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
document.body.appendChild(renderer.domElement);
renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','普通小区健身角的三维微缩场景，可拖拽旋转和缩放');
const camera=new THREE.PerspectiveCamera(33,innerWidth/innerHeight,.35,240);
const controls=new OrbitControls(camera,renderer.domElement);
controls.target.set(0,1.25,0);controls.enabled=!preview;controls.enablePan=false;
controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=17;controls.maxDistance=160;
controls.minPolarAngle=.2;controls.maxPolarAngle=Math.PI*.445;
const fitDistance=aspect=>expandedFit(aspect);
const d=fitDistance(camera.aspect);camera.position.set(d*.67,1.25+d*.61,d*.76);camera.lookAt(controls.target);
scene.add(new THREE.HemisphereLight(0xf4fcf3,0x819276,2.05));
const sun=new THREE.DirectionalLight(0xffe6ae,3.15);sun.position.set(-9,18,10);sun.castShadow=true;
sun.shadow.mapSize.set(preview?1024:2048,preview?1024:2048);
Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-12,near:.5,far:45});
sun.shadow.bias=-.00015;sun.shadow.normalBias=.025;sun.shadow.radius=3;scene.add(sun);
const fill=new THREE.DirectionalLight(0xc5e4e2,.65);fill.position.set(10,8,-7);scene.add(fill);
const model=new THREE.Group();model.name='courtyard-miniature';scene.add(model);
const scenery=new THREE.Group();scenery.name='static-courtyard';model.add(scenery);
let seed=927633;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const R=(a,b)=>a+random()*(b-a),pick=a=>a[Math.floor(random()*a.length)],v=(x,y,z)=>new THREE.Vector3(x,y,z);
const ramp=new THREE.DataTexture(new Uint8Array([98,147,192,227,248,255]),6,1,THREE.RedFormat);
ramp.needsUpdate=true;ramp.minFilter=ramp.magFilter=THREE.NearestFilter;
const toon=(color,extra={})=>new THREE.MeshToonMaterial({color,gradientMap:ramp,...extra});
const m={soil:toon('#8f7b5a'),aggregate:toon('#b0afa0'),concrete:toon('#d2cdb9'),paver:toon('#e1d9c2'),paver2:toon('#cdcdbb'),blue:toon('#458aa8'),blueDark:toon('#3f6d85'),yellow:toon('#e5b94e'),yellowLight:toon('#efd482'),dark:toon('#4c5f5b'),steel:toon('#acbab1'),rubber:toon('#5f6860'),wood:toon('#b79565'),woodLight:toon('#cdb38a'),wall:toon('#e7d7b8'),wallShade:toon('#d5c4ac'),brick:toon('#bb9b86'),roof:toon('#9aa9a0'),window:toon('#85aaa9'),windowLight:toon('#b1c9bc'),cream:toon('#eee6ce'),grass:toon('#97ad73'),soilTop:toon('#948267'),trunk:toon('#8b7b59'),bark:toon('#b0a080'),red:toon('#b97b65'),green:toon('#759a83')};
const greens=['#5d8c56','#75a35e','#90b772','#adc58a'].map(c=>new THREE.Color(c));
const foliage=toon('#ffffff',{side:THREE.DoubleSide});
const geo={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.SphereGeometry(1,16,10),cluster:new THREE.IcosahedronGeometry(1,2),stone:new THREE.IcosahedronGeometry(1,0),leaf:new THREE.BufferGeometry(),grass:new THREE.BufferGeometry()};
geo.leaf.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.065,.015,.12,0,.02,.28,0,0,0,0,.02,.28,.065,.015,.12],3));geo.leaf.computeVertexNormals();
geo.grass.setAttribute('position',new THREE.Float32BufferAttribute([-.025,0,0,.025,0,0,.03,.18,0,-.025,0,0,.03,.18,0,.005,.19,0,.005,.19,0,.03,.18,0,.075,.33,.015],3));geo.grass.computeVertexNormals();
function mesh(g,mat,x=0,y=0,z=0,parent=scenery){const o=new THREE.Mesh(g,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function box(x,y,z,w,h,d,mat,parent=scenery){const o=mesh(geo.box,mat,x,y,z,parent);o.scale.set(w,h,d);return o}
function ell(x,y,z,sx,sy,sz,mat,parent=scenery){const o=mesh(geo.sphere,mat,x,y,z,parent);o.scale.set(sx,sy,sz);return o}
function rod(a,b,r,mat,parent=scenery,rTop=r){const from=v(...a),to=v(...b),delta=to.clone().sub(from);const o=mesh(new THREE.CylinderGeometry(rTop,r,delta.length(),10),mat,0,0,0,parent);o.position.copy(from.add(to).multiplyScalar(.5));o.quaternion.setFromUnitVectors(v(0,1,0),delta.normalize());return o}
function tube(points,r,mat,parent=scenery,segments=22){const curve=new THREE.CatmullRomCurve3(points.map(p=>Array.isArray(p)?v(...p):p));return mesh(new THREE.TubeGeometry(curve,segments,r,7,false),mat,0,0,0,parent)}
function ring(x,y,z,radius,thickness,mat,parent=scenery){return mesh(new THREE.TorusGeometry(radius,thickness,7,28),mat,x,y,z,parent)}
const dummy=new THREE.Object3D();
function instances(g,mat,items,parent=scenery,shadow=true){const o=new THREE.InstancedMesh(g,mat,items.length);items.forEach((a,i)=>{dummy.position.set(...a.p);dummy.scale.set(...(a.s||[1,1,1]));dummy.rotation.set(...(a.r||[0,0,0]));dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);if(a.color)o.setColorAt(i,a.color)});o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o}
function pedestal(x,z,parent=scenery){box(x,.05,z,.42,.10,.42,m.blueDark,parent);for(const dx of [-.14,.14])for(const dz of [-.14,.14])rod([x+dx,.10,z+dz],[x+dx,.13,z+dz],.025,m.steel,parent)}
function equipment(name,x,z,rotation=0){const g=new THREE.Group();g.name=name;g.position.set(x,.24,z);g.rotation.y=rotation;scenery.add(g);return g}

// Non-overlapping strata keep the visible section stable during orbiting.
for(const [bottom,top,mat] of [[-1.65,-.36,m.soil],[-.36,-.13,m.aggregate],[-.13,.12,m.concrete]])box(0,(bottom+top)/2,0,16,top-bottom,16,mat);
const ground=mesh(new THREE.PlaneGeometry(150,150),new THREE.ShadowMaterial({opacity:.14}),0,-1.69,0,scene);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
const aggregate=[];
for(let i=0;i<210;i++){
 const side=i%4,t=R(-7.85,7.85),x=side<2?t:(side===2?-8.005:8.005),z=side<2?(side===0?-8.005:8.005):t;
 aggregate.push({p:[x,R(-1.52,-.42),z],s:[R(.035,.12),R(.025,.07),R(.035,.11)],r:[R(0,3),R(0,3),R(0,3)]});
}
instances(geo.stone,m.aggregate,aggregate);
// Rubber tiles, in the faded red and muted green common in neighborhood courts.
const textureCanvas=document.createElement('canvas');textureCanvas.width=textureCanvas.height=256;
const ctx=textureCanvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,256,256);
for(let i=0;i<3600;i++){ctx.fillStyle=i%3?'#d5cfc0':'#bdb6aa';ctx.fillRect(R(0,256),R(0,256),1,1)}
const rubberTexture=new THREE.CanvasTexture(textureCanvas);rubberTexture.colorSpace=THREE.SRGBColorSpace;rubberTexture.wrapS=rubberTexture.wrapT=THREE.RepeatWrapping;rubberTexture.repeat.set(5,4);
const redSurface=toon('#b77c67',{map:rubberTexture}),greenSurface=toon('#94aa8b',{map:rubberTexture});
box(-.1,.18,1.1,11.5,.12,9.6,redSurface);
box(-.1,.247,1.15,10.5,.014,8.6,greenSurface);
const pavers=[];
for(let x=-7.6;x<7.61;x+=.8)for(let z=-7.6;z<7.61;z+=.8){
 if(x>-6.15&&x<6&&z>-4&&z<6.25)continue;
 if(z<-5.5||x<-6.1||x>6.0){if(!(z>6.2))continue;}
 pavers.push({p:[x,.152,z],s:[.76,.05,.76],color:random()>.25?m.paver.color:m.paver2.color});
}
instances(geo.box,toon('#ffffff'),pavers);
for(const [x,z,r] of [[-3.8,3.6,1.52],[.1,3.4,1.1],[3.9,4.2,1.4],[-3.8,-1.1,1.38],[.0,-.9,1.15],[3.8,-1.8,1.3]]){
 const o=mesh(new THREE.RingGeometry(r-.025,r,56),toon('#d0d5b7'),x,.265,z);o.rotation.x=-Math.PI/2;o.castShadow=false;
}
// Raised planting strips and curb stones frame the court without hiding it.
for(const [x,z,w,d] of [[-7.05,-.1,1.45,11.7],[7.0,-.2,1.55,12.8],[3,-6.0,9,1.4]]){
 box(x,.24,z,w,.24,d,m.wallShade);box(x,.38,z,w-.12,.05,d-.12,m.soilTop);box(x,.405,z,w-.20,.025,d-.2,m.grass);
}
for(let z=-5.6;z<6;z+=.55){box(-6.29,.28,z,.16,.30,.50,m.paver);box(6.15,.28,z,.16,.30,.50,m.paver)}
for(let x=-5.85;x<6;x+=.55)box(x,.28,-5.24,.50,.30,.16,m.paver);

// Familiar blue-and-yellow outdoor fitness equipment, with joints and footplates.
const walker=equipment('double-air-walker',-3.8,3.6);
for(const x of [-1.17,1.17]){pedestal(x,-.38,walker);rod([x,.1,-.38],[x,1.78,-.38],.075,m.blue,walker)}
tube([[-1.17,1.62,-.38],[-1.10,1.90,-.38],[1.10,1.90,-.38],[1.17,1.62,-.38]],.07,m.blue,walker);
for(const center of [-.56,.56]){
 for(const side of [-1,1]){
  const x=center+side*.23;
  rod([x,1.52,-.34],[x,.32,.28],.045,m.yellow,walker);
  rod([x-.065,1.52,-.34],[x+.065,1.52,-.34],.105,m.blueDark,walker);
  box(x,.29,.38,.38,.09,.64,m.rubber,walker);
  for(let i=0;i<5;i++)box(x,.341,.18+i*.095,.28,.012,.018,m.steel,walker);
 }
 tube([[center-.27,1.10,.36],[center-.27,1.43,.43],[center+.27,1.43,.43],[center+.27,1.10,.36]],.045,m.yellow,walker);
}
const rider=equipment('horse-rider',.1,3.4,-.15);
for(const z of [-.35,.35]){rod([-.6,.04,z],[0,.68,z],.06,m.blue,rider);rod([.65,.04,z],[0,.68,z],.06,m.blue,rider);rod([-.6,.04,z],[.65,.04,z],.045,m.blueDark,rider)}
rod([-.38,.45,0],[.58,1.03,0],.065,m.blue,rider);
rod([-.34,.43,0],[-.34,.91,0],.05,m.blue,rider);
ell(-.37,.96,0,.38,.09,.29,m.yellow,rider);
rod([.65,.35,0],[.45,1.4,0],.05,m.blue,rider);
tube([[.45,1.15,-.33],[.45,1.43,-.30],[.45,1.43,.30],[.45,1.15,.33]],.04,m.yellow,rider);
rod([.7,.24,-.48],[.7,.24,.48],.045,m.blueDark,rider);
for(const z of [-.4,.4])box(.7,.29,z,.34,.07,.24,m.rubber,rider);
rod([-.08,.65,-.1],[-.08,.65,.1],.115,m.yellowLight,rider);
const twister=equipment('three-position-waist-twister',3.9,4.2);
pedestal(0,0,twister);rod([0,.1,0],[0,1.5,0],.095,m.blue,twister);ell(0,1.52,0,.11,.09,.11,m.blueDark,twister);
for(let i=0;i<3;i++){
 const a=i/3*Math.PI*2+.4,x=Math.cos(a)*.9,z=Math.sin(a)*.9;
 rod([0,.15,0],[x,.15,z],.065,m.blue,twister);rod([x,.02,z],[x,.22,z],.18,m.blueDark,twister);
 mesh(new THREE.CylinderGeometry(.39,.39,.09,24),m.yellow,x,.265,z,twister);
 const rim=ring(x,.315,z,.31,.014,m.yellowLight,twister);rim.rotation.x=Math.PI/2;
 rod([0,1.18,0],[Math.cos(a)*.57,1.18,Math.sin(a)*.57],.035,m.yellow,twister);
}
const waistHandle=ring(0,1.18,0,.60,.045,m.yellow,twister);waistHandle.rotation.x=Math.PI/2;
const press=equipment('double-seated-leg-press',-3.8,-1.1);
pedestal(0,0,press);rod([0,.1,0],[0,1.38,0],.10,m.blue,press);
for(const sign of [-1,1]){
 const x=sign*.65;
 rod([0,.35,0],[sign*1.17,.28,0],.065,m.blue,press);
 rod([x,.27,0],[x,.63,0],.05,m.blue,press);
 ell(x,.69,0,.32,.08,.30,m.yellow,press);
 const back=box(sign*.35,.95,0,.10,.56,.53,m.yellow,press);back.rotation.z=sign*.10;
 rod([sign*.9,.29,0],[sign*1.34,.62,0],.045,m.blue,press);
 const plate=box(sign*1.37,.58,0,.10,.4,.60,m.rubber,press);plate.rotation.z=sign*.25;
 for(const z of [-.4,.4])rod([x,.72,z],[x,.94,z],.03,m.yellow,press);
}
const massager=equipment('waist-back-massager',0,-.9);
for(const x of [-.82,.82]){pedestal(x,0,massager);rod([x,.1,0],[x,1.86,0],.065,m.blue,massager)}
tube([[-.82,1.7,0],[-.70,1.94,0],[.70,1.94,0],[.82,1.7,0]],.06,m.blue,massager);
for(const x of [-.32,.32]){
 rod([x,.55,0],[x,1.67,0],.035,m.steel,massager);
 for(let i=0;i<7;i++){
  mesh(new THREE.CylinderGeometry(.15,.15,.125,12),i%2?m.yellowLight:m.yellow,x,.67+i*.14,0,massager);
  const band=ring(x,.73+i*.14,0,.15,.018,m.yellow,massager);band.rotation.x=Math.PI/2;
 }
}
for(const x of [-.82,.82])tube([[x,.92,0],[x,1.12,.35],[x,1.37,.35],[x,1.46,0]],.04,m.yellow,massager);
const pulley=equipment('upper-body-pulley',3.8,-1.8);
for(const x of [-.68,.68]){pedestal(x,0,pulley);rod([x,.1,0],[x,2.7,0],.075,m.blue,pulley)}
tube([[-.68,2.55,0],[-.56,2.91,0],[.56,2.91,0],[.68,2.55,0]],.065,m.yellow,pulley);
for(const x of [-.37,.37]){
 ring(x,2.52,.035,.17,.035,m.blueDark,pulley);rod([x,2.5,.08],[x,1.38,.08],.015,m.dark,pulley);
 tube([[x-.13,1.45,.08],[x-.13,1.28,.08],[x+.13,1.28,.08],[x+.13,1.45,.08]],.025,m.yellow,pulley);
}
box(0,1.9,-.02,.35,.43,.08,m.blueDark,pulley);
for(let i=0;i<3;i++)box(0,2.01-i*.11,.027,.22,.018,.01,m.cream,pulley);
const bars=equipment('parallel-bars',3.8,1.15);
for(const x of [-.52,.52]){
 for(const z of [-1.0,1.0]){pedestal(x,z,bars);rod([x,.1,z],[x,1.38,z],.055,m.blue,bars)}
 rod([x,1.4,-1.25],[x,1.4,1.25],.055,m.yellow,bars);
 ell(x,1.4,-1.25,.055,.055,.055,m.yellowLight,bars);ell(x,1.4,1.25,.055,.055,.055,m.yellowLight,bars);
}

// A modest apartment facade anchors the scene in an ordinary residential block.
const house=new THREE.Group();house.name='residential-facade';scenery.add(house);
box(-4.95,2.32,-7.05,5.5,4.4,1.9,m.wall,house);
box(-4.95,.46,-6.07,5.55,.68,.09,m.wallShade,house);
for(const y of [2.25,4.51])box(-4.95,y,-6.03,5.65,.13,.14,m.cream,house);
box(-4.95,4.59,-7.05,5.75,.15,2.1,m.roof,house);
box(-4.95,4.78,-7.9,5.75,.25,.13,m.wallShade,house);
for(const x of [-7.71,-2.19])box(x,4.78,-7.05,.13,.25,1.82,m.wallShade,house);
for(let x=-7.45;x<-2.2;x+=.34)box(x,.47,-6.008,.012,.60,.012,m.brick,house);
for(const y of [.26,.47,.68])box(-4.95,y,-6.005,5.48,.012,.012,m.brick,house);
for(const y of [1.35,3.35])for(const x of [-6.63,-4.9,-3.17]){
 if(y<2&&x>-4)continue;
 box(x,y,-6.052,1.21,1.18,.16,m.cream,house);
 box(x,y,-5.961,1.04,1.01,.035,m.window,house);
 box(x-.28,y,-5.934,.37,.89,.012,m.windowLight,house);
 box(x,y,-5.923,.045,1.03,.05,m.cream,house);box(x,y,-5.915,1.03,.045,.05,m.cream,house);
 box(x,y-.63,-5.96,1.38,.10,.31,m.wallShade,house);
 if(y<2){
  for(let i=0;i<6;i++)rod([x-.48+i*.19,y-.48,-5.81],[x-.48+i*.19,y+.48,-5.81],.014,m.dark,house);
  for(const dy of [-.48,.48])rod([x-.52,y+dy,-5.81],[x+.52,y+dy,-5.81],.02,m.dark,house);
 }
}
box(-3.14,1.02,-6.003,1.15,1.8,.16,m.blueDark,house);
box(-3.14,1.27,-5.909,.93,1.1,.025,m.window,house);
for(const x of [-3.58,-3.14,-2.70])box(x,1.02,-5.887,.034,1.68,.04,m.steel,house);
rod([-2.94,.94,-5.85],[-2.94,1.13,-5.85],.021,m.steel,house);
box(-3.14,2.03,-5.82,1.6,.10,.7,m.roof,house);
for(let i=0;i<2;i++)box(-3.14,.20+i*.075,-5.55-i*.18,1.5,.15,.56,m.concrete,house);
// A small balcony, an aired towel and two boxy condenser units.
box(-4.9,2.76,-5.84,1.6,.12,.56,m.concrete,house);
for(const x of [-5.66,-4.14])rod([x,2.8,-5.6],[x,3.62,-5.6],.022,m.dark,house);
rod([-5.66,3.62,-5.6],[-4.14,3.62,-5.6],.027,m.dark,house);
for(let x=-5.5;x<-4.2;x+=.17)rod([x,2.8,-5.6],[x,3.6,-5.6],.013,m.dark,house);
box(-4.7,3.30,-5.565,.43,.58,.035,m.cream,house);box(-4.7,3.05,-5.54,.43,.04,.025,m.red,house);
for(const x of [-6.65,-3.15]){
 box(x,2.52,-5.78,.78,.5,.36,m.cream,house);
 ring(x-.12,2.52,-5.582,.16,.018,m.roof,house);
 for(const dx of [-.25,.25])rod([x+dx,2.27,-6.07],[x+dx,2.27,-5.61],.02,m.dark,house);
 for(let i=0;i<5;i++)box(x+.21,2.35+i*.075,-5.58,.18,.022,.018,m.dark,house);
 for(let i=0;i<5;i++){const a=i/5*Math.PI*2;rod([x-.12,2.52,-5.56],[x-.12+Math.cos(a)*.14,2.52+Math.sin(a)*.14,-5.56],.012,m.roof,house)}
 tube([[x+.32,2.5,-5.85],[x+.53,2.5,-5.9],[x+.53,.3,-5.95]],.018,m.roof,house);
}
// A low wall and an iron fence continue behind the planted strip.
box(2.9,.47,-7.45,10.0,.69,.25,m.wallShade);
box(2.9,.85,-7.45,10.1,.10,.34,m.cream);
for(let x=-1.9;x<7.95;x+=1.56){box(x,1.20,-7.45,.24,1.65,.27,m.wall);box(x,2.06,-7.45,.32,.12,.34,m.cream)}
for(let x=-1.75;x<7.8;x+=.21)rod([x,.88,-7.45],[x,1.87,-7.45],.018,m.dark);
for(const y of [1.12,1.8])rod([-1.9,y,-7.45],[7.8,y,-7.45],.027,m.dark);

function bench(x,z,angle=0){
 const g=new THREE.Group();g.name='wooden-park-bench';g.position.set(x,.16,z);g.rotation.y=angle;scenery.add(g);
 for(const x of [-.87,.87]){
  rod([x,0,-.20],[x,.48,-.20],.045,m.dark,g);rod([x,0,.27],[x,.48,.27],.045,m.dark,g);
  rod([x,.46,-.22],[x,1.02,-.34],.04,m.dark,g);
  tube([[x,.5,.26],[x,.72,.27],[x,.75,-.25]],.035,m.dark,g);
 }
 for(let i=0;i<4;i++)box(0,.49,-.20+i*.15,2.18,.085,.12,i%2?m.wood:m.woodLight,g);
 for(let i=0;i<3;i++){const slat=box(0,.73+i*.145,-.31-i*.025,2.18,.105,.07,i%2?m.wood:m.woodLight,g);slat.rotation.x=-.10;}
 return g;
}
const shadeBench=bench(-6.96,3.1,Math.PI/2);
mesh(new THREE.CylinderGeometry(.065,.06,.23,12),m.blueDark,-.57,.65,.07,shadeBench);
ell(-.57,.79,.07,.047,.028,.047,m.steel,shadeBench);
box(.51,.56,.02,.39,.055,.31,m.cream,shadeBench);
bench(2.3,-4.55);
// Quiet details: a bicycle, two sorting bins, a light and a physical noticeboard.
const bike=new THREE.Group();bike.name='parked-bicycle';bike.position.set(-5.0,.18,-4.78);bike.rotation.set(.13,-.10,0);scenery.add(bike);
for(const x of [-.56,.64]){
 ring(x,.36,0,.33,.035,m.rubber,bike);ring(x,.36,0,.29,.012,m.steel,bike);
 for(let j=0;j<12;j++){const a=j/12*Math.PI*2;rod([x,.36,0],[x+Math.cos(a)*.29,.36+Math.sin(a)*.29,0],.005,m.steel,bike)}
}
const bp=[[-.56,.36,0],[-.2,.85,0],[.12,.36,0],[.46,.9,0],[.64,.36,0]];
for(const [a,b] of [[0,1],[0,2],[1,2],[1,3],[2,3],[3,4]])rod(bp[a],bp[b],.023,m.blueDark,bike);
box(-.20,.94,0,.28,.06,.17,m.rubber,bike);rod([.46,.9,0],[.43,1.14,0],.02,m.dark,bike);
rod([.43,1.14,-.16],[.43,1.14,.16],.025,m.dark,bike);ring(.12,.36,.02,.10,.017,m.steel,bike);
rod([.12,.34,0],[.05,0,.23],.015,m.dark,bike);
for(const [z,mat] of [[.05,m.blueDark],[.72,m.green]]){
 box(6.84,.57,z,.55,.83,.55,mat);box(6.84,1.02,z,.62,.10,.62,m.roof);
 box(6.84,.81,z+.284,.29,.11,.018,m.dark);
 for(const x of [6.65,7.03])rod([x,.14,z],[x,.26,z],.025,m.dark);
}
rod([6.8,.15,-3.0],[6.8,3.8,-3.0],.06,m.dark);
tube([[6.8,3.6,-3.0],[6.8,3.99,-3.0],[6.4,4.10,-3.0],[6.05,4.10,-3.0]],.055,m.dark);
box(6.05,4.05,-3.0,.64,.10,.28,m.roof);box(6.05,3.99,-3.0,.44,.025,.22,m.cream);
const notice=new THREE.Group();notice.name='community-noticeboard';notice.position.set(5.2,.15,-5.1);scenery.add(notice);
for(const x of [-.58,.58])rod([x,0,0],[x,1.96,0],.045,m.dark,notice);
box(0,1.43,0,1.55,.94,.12,m.green,notice);box(0,1.43,.07,1.35,.73,.025,m.cream,notice);
box(0,1.97,0,1.76,.10,.38,m.roof,notice);
for(const [x,y,c] of [[-.4,1.5,m.windowLight],[0,1.5,m.yellowLight],[.4,1.5,m.wallShade]]){
 box(x,y,.095,.30,.45,.015,c,notice);
 for(let i=0;i<3;i++)box(x,y+.10-i*.10,.108,.19,.012,.012,m.roof,notice);
}

// Compact trees and clipped shrubs cast dappled shade onto the equipment court.
const treeCrowns=[];
function tree(x,z,height,spread,phase){
 const y=.42;
 rod([x,y,z],[x+.1,y+height*.72,z],.16,m.trunk,scenery,.09);
 tube([[x+.1,y+height*.55,z],[x+.18,y+height*.88,z-.10],[x+.30,y+height,z]],.07,m.trunk);
 for(let j=0;j<5;j++){
  const a=j/5*Math.PI*2;
  tube([[x+.1,y+height*.6,z],[x+Math.cos(a)*spread*.35,y+height*.86,z+Math.sin(a)*spread*.35],[x+Math.cos(a)*spread*.7,y+height,z+Math.sin(a)*spread*.7]],.045,m.trunk);
  tube([[x,y+.05,z],[x+Math.cos(a)*.32,y+.015,z+Math.sin(a)*.32],[x+Math.cos(a)*.51,y,z+Math.sin(a)*.51]],.035,m.trunk);
 }
 const crown=new THREE.Group();crown.name='breeze-tree-crown';crown.position.set(x,y+height,z);model.add(crown);
 const clumps=[],leaves=[];
 for(let j=0;j<20;j++){
  const a=R(0,Math.PI*2),r=R(0,spread*.64),px=Math.cos(a)*r,pz=Math.sin(a)*r,py=R(-.3,.65);
  clumps.push({p:[px,py,pz],s:[R(.55,.85),R(.45,.70),R(.55,.85)],color:pick(greens),r:[0,R(0,6.28),R(-.2,.2)]});
 }
 for(let j=0;j<470;j++){
  const a=R(0,6.28),h=R(-1,1),r=Math.sqrt(1-h*h),px=Math.cos(a)*r*spread,py=h*.88+.23,pz=Math.sin(a)*r*spread;
  leaves.push({p:[px,py,pz],s:[R(.65,1.1),1,R(.7,1.2)],r:[R(-.6,.6),R(0,6.28),R(-.3,.3)],color:pick(greens)});
 }
 instances(geo.cluster,foliage,clumps,crown,true);instances(geo.leaf,foliage,leaves,crown,false);
 treeCrowns.push({g:crown,phase,x,z,height:height+y});
}
tree(-7.0,.25,3.9,1.55,.4);
tree(-.45,-5.95,4.3,1.65,2.4);
tree(6.88,-4.75,3.5,1.30,4.2);
const shrubItems=[];
for(let i=0;i<90;i++){
 let x,z;if(i<42){x=R(-1.3,7.4);z=R(-6.4,-5.6)}else{x=i%2?-7.03:7.03;z=R(-4.9,5.7)}
 if(x>6&&z>-.4&&z<1.25)continue;
 shrubItems.push({p:[x,.54,z],s:[R(.16,.30),R(.16,.30),R(.16,.32)],r:[0,R(0,6),0],color:pick(greens)});
}
instances(geo.cluster,foliage,shrubItems);
const grassPatches=[];
for(const side of [-1,1])for(let k=0;k<8;k++){
 const z=-4.8+k*1.38,x=side*7.02;
 if(side===1&&z>-.5&&z<1.5)continue;
 const patch=new THREE.Group();patch.name='breeze-grass';patch.position.set(x,.42,z);model.add(patch);
 const grass=[];
 for(let j=0;j<70;j++){
  const px=R(-.42,.42),pz=R(-.6,.6);
  for(let b=0;b<3;b++)grass.push({p:[px,0,pz],s:[R(.5,.8),R(.4,.85),1],r:[0,R(0,6.28),R(-.2,.2)],color:pick(greens)});
 }
 instances(geo.grass,foliage,grass,patch,false);grassPatches.push({g:patch,phase:R(0,6.28)});
}
const petals=[];
for(let i=0;i<65;i++){
 const x=(i%2?-1:1)*R(6.65,7.4),z=R(-4.4,5.7);
 if(x>6&&z>-.5&&z<1.35)continue;
 const h=R(.14,.30);rod([x,.42,z],[x,.42+h,z],.007,m.green);
 for(let j=0;j<5;j++){const a=j/5*Math.PI*2;petals.push({p:[x+Math.cos(a)*.035,.42+h,z+Math.sin(a)*.035],s:[.04,.02,.04],color:new THREE.Color(pick(['#e6d58e','#e9e4c8','#d1adba']))});}
}
instances(geo.stone,foliage,petals);
const dryLeaves=[];
for(let i=0;i<42;i++){
 const x=R(-7.7,7.7),z=R(-5.1,7.6);
 if(x>-5.9&&x<5.7&&z>-3.7&&z<6)continue;
 dryLeaves.push({p:[x,.188,z],s:[R(.32,.65),1,R(.4,.7)],r:[0,R(0,6.28),0],color:new THREE.Color(pick(['#c0ac71','#b69c62','#97a66b']))});
}
instances(geo.leaf,foliage,dryLeaves,scenery,false);
// Every fixture stays still: only foliage and a few falling leaves move.
scenery.updateMatrixWorld(true);
const batches=new Map(),remove=[];
scenery.traverse(o=>{
 if(!o.isMesh||o.isInstancedMesh||o.material.transparent)return;
 const key=o.material.uuid;
 if(!batches.has(key))batches.set(key,{mat:o.material,gs:[]});
 const g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
 batches.get(key).gs.push(g);remove.push(o);
});
for(const o of remove)o.removeFromParent();
for(const {mat,gs} of batches.values()){
 const converted=gs.map(g=>g.index?g.toNonIndexed():g),merged=mergeGeometries(converted,false);
 if(!merged)throw new Error('Could not batch courtyard geometry');
 mesh(merged,mat);gs.forEach(g=>g.dispose());converted.forEach(g=>g.dispose());
}
const floatingLeaves=[];
for(let i=0;i<4;i++){
 const o=mesh(geo.leaf,toon('#c0b47a',{side:THREE.DoubleSide}),0,0,0,model);o.name='falling-leaf';o.castShadow=false;o.scale.setScalar(.65);
 floatingLeaves.push({o,source:treeCrowns[i%treeCrowns.length],phase:i*.26});
}
function animate(t){
 for(const {g,phase} of treeCrowns){g.rotation.z=Math.sin(t*.43+phase)*.008;g.rotation.x=Math.sin(t*.36+phase)*.005;}
 for(const {g,phase} of grassPatches){g.rotation.z=Math.sin(t*.86+phase)*.007;g.rotation.x=Math.sin(t*.67+phase)*.005;}
 for(const {o,source,phase} of floatingLeaves){
  const f=(t*.045+phase)%1;
  o.position.set(source.x+Math.sin(t*.7+phase)*.28+f*.35,source.height*(1-f)+.35,source.z+.35+f*.5);
  o.rotation.set(Math.sin(t+phase)*.5,t*.55+phase,f*2);
 }
}
animate(0);
let start=null;
const expandedWorld=expandWorld({kind:'courtyard',scene,model,camera,controls,renderer,preview,reduced});
function renderFrame(ms){
 expandedWorld.update(ms*.001);if(start===null)start=ms;controls.update();if(!preview&&!reduced)animate((ms-start)*.001);renderer.render(scene,camera);}
installSceneCapture({kind:'courtyard',camera,controls,renderer,preview,render:()=>renderFrame(preview?0:performance.now(),true)});
if(preview){renderFrame(0)}else{renderer.setAnimationLoop(renderFrame)}
addEventListener('resize',()=>{
 const aspect=innerWidth/innerHeight,factor=fitDistance(aspect)/fitDistance(camera.aspect);
 camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);camera.aspect=aspect;camera.updateProjectionMatrix();
 renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,preview?.85:1.8));if(preview)renderFrame(0);
});
