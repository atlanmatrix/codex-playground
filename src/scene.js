import {installSceneCapture} from './scene-capture.js';
import {expandWorld,expandedFit} from './expansions/city.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const isPreview = ['preview','screenshot'].some(key=>new URLSearchParams(location.search).has(key));

// Aoba: a complete, deterministic miniature. All detail is geometry or painted canvas.
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,isPreview?.85:1.8));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.16;
document.body.appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-label','可旋转缩放的自然收回城市街角三维微缩场景');
renderer.domElement.setAttribute('role','img');
const camera=new THREE.PerspectiveCamera(33,innerWidth/innerHeight,.1,300);
const controls=new OrbitControls(camera,renderer.domElement);
controls.target.set(0,4.1,0);
controls.enableDamping=true;controls.dampingFactor=.065;
controls.minDistance=9;controls.maxDistance=180;
controls.maxPolarAngle=Math.PI*.485;controls.minPolarAngle=.13;
controls.enablePan=true;controls.enabled=!isPreview;controls.panSpeed=.7;
function frame(){
 const aspect=innerWidth/innerHeight;
 const d=expandedFit(aspect);
 camera.position.set(d*.68,4.1+d*.49,d*.78);
 camera.lookAt(controls.target);
}
frame();
scene.add(new THREE.HemisphereLight(0xf5fff3,0x60756a,2.25));
const sun=new THREE.DirectionalLight(0xffedb0,4.0);
sun.position.set(-8,21,12);sun.castShadow=true;
sun.shadow.mapSize.set(isPreview?1024:2048,isPreview?1024:2048);
Object.assign(sun.shadow.camera,{left:-13,right:13,top:15,bottom:-12,near:.5,far:55});
sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;sun.shadow.radius=3;scene.add(sun);
const fill=new THREE.DirectionalLight(0xaee7df,1.05);fill.position.set(10,9,-8);scene.add(fill);
const model=new THREE.Group();scene.add(model);
let seed=80721;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const R=(a,b)=>a+rnd()*(b-a), pick=a=>a[Math.floor(rnd()*a.length)];
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const ramp=new THREE.DataTexture(new Uint8Array([85,130,188,235,255]),5,1,THREE.RedFormat);
ramp.needsUpdate=true;ramp.minFilter=ramp.magFilter=THREE.NearestFilter;
function mat(color,extra={}){return new THREE.MeshToonMaterial({color,gradientMap:ramp,...extra})}
const M={concrete:mat('#cecfb7'),edge:mat('#ebe5cc'),broken:mat('#a6b0a1'),plaster:mat('#dce0c8'),mint:mat('#88aaa0'),dark:mat('#314e49'),rust:mat('#9f5941'),metal:mat('#587470'),wood:mat('#8a714b'),woodLight:mat('#baa274'),asphalt:mat('#66746c'),soil:mat('#6d6850'),deepsoil:mat('#505441'),moss:mat('#648846'),mossLight:mat('#9eae54'),trunk:mat('#817551'),root:mat('#91805a'),red:mat('#bd6450'),yellow:mat('#e4c777'),cream:mat('#e8dfb2'),white:mat('#e6e7d1'),glass:mat('#a4d7c9',{transparent:true,opacity:.32,side:THREE.DoubleSide,depthWrite:false}),black:mat('#34423b')};
const edgeMat=new THREE.LineBasicMaterial({color:0x344e43,transparent:true,opacity:.48});
const geometries={box:new THREE.BoxGeometry(1,1,1),ico:new THREE.IcosahedronGeometry(1,1),rock:new THREE.IcosahedronGeometry(1,0),cyl:new THREE.CylinderGeometry(1,1,1,8),sphere:new THREE.SphereGeometry(1,10,6)};
function mesh(g,m,x=0,y=0,z=0,parent=model){const a=new THREE.Mesh(g,m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;parent.add(a);return a}
function box(x,y,z,w,h,d,m=M.concrete,parent=model,outline=false){const a=mesh(geometries.box,m,x,y,z,parent);a.scale.set(w,h,d);if(outline){const l=new THREE.LineSegments(new THREE.EdgesGeometry(geometries.box),edgeMat);a.add(l)}return a}
function ell(x,y,z,sx,sy,sz,m,parent=model,g=geometries.ico){const a=mesh(g,m,x,y,z,parent);a.scale.set(sx,sy,sz);a.rotation.y=R(0,6.28);return a}
function rod(a,b,r,m=M.metal,parent=model,r2=r){a=Array.isArray(a)?V(...a):a;b=Array.isArray(b)?V(...b):b;const direction=b.clone().sub(a);const o=mesh(new THREE.CylinderGeometry(r2,r,direction.length(),7),m,0,0,0,parent);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(V(0,1,0),direction.normalize());return o}
function curve(points,r,m=M.root,parent=model){const c=new THREE.CatmullRomCurve3(points.map(p=>Array.isArray(p)?V(...p):p));return mesh(new THREE.TubeGeometry(c,Math.max(10,points.length*5),r,5,false),m,0,0,0,parent)}
function poly(points,y,depth,m,parent=model,holes=[]){const s=new THREE.Shape();points.forEach((p,i)=>i?s.lineTo(...p):s.moveTo(...p));s.closePath();for(const [x,z,r] of holes){const h=new THREE.Path();h.absarc(x,z,r,0,Math.PI*2,true);s.holes.push(h)}const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:12});g.rotateX(Math.PI/2);const o=mesh(g,m,0,y,0,parent);return o}
function torus(x,y,z,r,t,m=M.rust,parent=model){return mesh(new THREE.TorusGeometry(r,t,7,20),m,x,y,z,parent)}

// Instanced small details make the botanical density affordable on mobile.
const batches=new Map();const dummy=new THREE.Object3D();
function instance(kind,m,pos,scale,rot=[0,0,0]){const key=kind+':'+m.uuid;let b=batches.get(key);if(!b){b={kind,m,items:[]};batches.set(key,b)}b.items.push({pos,scale,rot})}
const greens=['#416d46','#568a47','#71a54b','#8dbb55','#adc85b','#bed572'].map(c=>mat(c));
const ivyMats=['#3a7552','#4c8959','#659a55'].map(c=>mat(c));
const flowerMats=['#d88598','#eea8ad','#e6c477','#eee6bb'].map(c=>mat(c));
const leafGeo=new THREE.BufferGeometry();
leafGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.48,.12,.5,0,.18,1,0,0,0,0,.18,1,.48,.12,.5],3));leafGeo.computeVertexNormals();geometries.leaf=leafGeo;
function leaf(x,y,z,size=.18,m=pick(ivyMats),rotation=R(0,6.28)){instance('leaf',m,[x,y,z],[size,size,size],[R(-.5,.5),rotation,R(-.6,.6)])}
function bush(x,y,z,s=.5,parent=model){for(let i=0;i<5;i++){const a=ell(x+R(-s*.7,s*.7),y+R(0,s*.45),z+R(-s*.5,s*.5),s*R(.5,.9),s*R(.5,.9),s*R(.5,.9),pick(greens),parent);a.rotation.z=R(-.4,.4)}}
function grass(x,y,z,size=.3){for(let i=0;i<5;i++)instance('leaf',pick(greens),[x+R(-.12,.12),y,z+R(-.12,.12)],[size*.3,size*1.8,size*1.3],[-R(.6,1.2),R(0,6.28),0])}
function flowers(x,y,z,n=8,s=.35){grass(x,y,z,s);for(let i=0;i<n;i++){const dx=R(-s,s),dz=R(-s,s),h=R(.15,.45);instance('cyl',M.moss,[x+dx,y+h/2,z+dz],[.012,h,.012]);for(let j=0;j<4;j++)instance('rock',pick(flowerMats),[x+dx+Math.cos(j*1.57)*.055,y+h,z+dz+Math.sin(j*1.57)*.055],[.07,.035,.07])}}
function ivy(points,flowersOn=false){curve(points,.026,M.moss);for(let i=0;i<points.length-1;i++){const a=V(...points[i]),b=V(...points[i+1]);const count=Math.ceil(a.distanceTo(b)*12);for(let j=0;j<count;j++){const p=a.clone().lerp(b,j/count);leaf(p.x+R(-.13,.13),p.y+R(-.12,.12),p.z+R(-.12,.12),R(.15,.3));if(flowersOn&&rnd()>.72)instance('rock',pick(flowerMats.slice(0,2)),[p.x+.12,p.y,p.z+.1],[.12,.09,.13])}}}

// The square cutaway base: asphalt, aggregate, concrete, rebar, hanging roots.
// Adjacent strata share a boundary, never a vertical interval. Overlapping
// equal-width boxes leave coplanar sidewalls that flicker while orbiting.
const baseStrata=[
 {bottom:-1.24,top:-.37,material:M.deepsoil},
 {bottom:-.37,top:-.08,material:M.concrete},
 {bottom:-.08,top:.09,material:M.asphalt}
];
for(const {bottom,top,material} of baseStrata){
 box(0,(bottom+top)/2,0,16,top-bottom,16,material,model,true);
}
box(-2,.12,-2.1,11,.25,10.6,M.edge,model,true);
const ground=mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.14}),0,-1.36,0,scene);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;
for(let i=0;i<170;i++){const side=Math.floor(R(0,4)),a=R(-7.8,7.8);const x=side<2?a:(side===2?-8.01:8.01),z=side<2?(side===0?8.01:-8.01):a;instance('rock',pick([M.broken,M.edge,M.soil]),[x,R(-1.1,-.23),z],[R(.07,.24),R(.04,.12),R(.06,.2)],[R(0,3),R(0,3),R(0,3)]);if(i%9===0){const end=[x*.99,-1.2,z*.99];curve([[x,.04,z],[x*1.006,-.4,z*1.006],end],.04,M.root)}}
for(let i=0;i<18;i++){const x=R(-7.8,7.8);rod([x,-.22,7.88],[x+R(-.2,.2),-.38,8.09],.015,M.rust);if(i%2===0)ivy([[x,.15,7.8],[x+.2,-.4,8.02],[x+.05,-1.2,8.05]])}
// The right-angled roadway and chipped paving.
for(let z=-6.9;z<7.6;z+=1.05)box(3.6,.19,z,.32,.29,.91,M.edge,model,true);
for(let x=-7.5;x<3.4;x+=1.05)box(x,.19,2.95,.92,.29,.32,M.edge,model,true);
for(let i=0;i<6;i++)box(-6.6+i*.82,.103,6.7,.43,.015,1.3,M.cream);
for(let i=0;i<4;i++)box(6.55,.104,-6.6+i*1.55,.1,.018,.7,M.yellow);
for(let i=0;i<68;i++){const x=R(-7.3,3.1),z=R(-7.1,2.55);if(x>-5.9&&x<2&&z>-5.4&&z<1.1)continue;box(x,.255,z,R(.45,.8),.025,R(.4,.7),rnd()>.3?M.concrete:M.broken,model,true)}
for(let i=0;i<26;i++){const x=R(-7.7,7.7),z=R(3.25,7.6);curve([[x,.1,z],[x+.3,.11,z-.3],[x+.25,.11,z-.7],[x+.65,.11,z-1]],.017,M.dark);if(i%2===0)grass(x+.3,.12,z-.3,.28)}

// A jagged, three-storey shell with a central opening for the banyan.
const floorShape=[[-6.4,-5.6],[2.35,-5.6],[2.35,-2.1],[1.7,-1.8],[1.95,-.8],[.95,-.3],[1.25,.8],[-.1,1.18],[-1.3,.92],[-2.2,1.6],[-6.4,1.6]];
for(let level=0;level<4;level++){
 const y=.49+level*2.42;
 poly(floorShape,y,.2,level===3?M.broken:M.concrete,model,[[-1.4,-2.1,level===0?.9:1.2]]);
 // Pale slab lip, exposed broken beams and protruding reinforcement.
 // Inset the trim ends so they do not duplicate the slab end faces.
 box(-4.32,y-.03,1.6,3.95,.2,.17,M.edge,model,true);
 box(-6.4,y-.02,-2,.19,.24,6.98,M.edge,model,true);
 if(level>0){for(let i=0;i<9;i++){const x=R(-1.6,1.4),z=1.0-R(0,.7);rod([x,y-.07,z],[x+R(-.13,.13),y-.05,z+R(.25,.65)],.014,M.rust)}
 for(let j=0;j<7;j++)ell(R(-1.9,1.2),y-.12,R(.1,1),R(.08,.2),.12,R(.08,.2),M.broken,model,geometries.rock)}
 if(level===3)continue;
 // Back wall is split into piers and lintels, preserving real window apertures.
 for(let j=0;j<5;j++)box(-6.15+j*2.05,y+1.14,-5.55,.32,2.3,.24,M.plaster,model,true);
 box(-2,y+.4,-5.55,8.6,.8,.25,M.plaster);
 box(-2,y+2.07,-5.55,8.6,.38,.25,M.edge,model,true);
 for(let j=0;j<4;j++){
  const x=-5.15+j*2.05;
  box(x,y+1.38,-5.39,1.7,.06,.1,M.metal);
  box(x,y+1.45,-5.42,.055,1.25,.12,M.metal);
  if(j!==2)box(x-.44,y+1.45,-5.44,.76,1.13,.025,M.glass);
 }
 // Left wall, floor-to-ceiling broken shop windows on the front.
 box(-6.31,y+1.16,-2.1,.23,2.3,6.7,M.mint,model,true);
 for(const x of [-6.1,-4.08,-2.08])box(x,y+1.15,1.52,.12,2.25,.14,M.metal,model,true);
 box(-4.1,y+2.18,1.52,4.35,.18,.24,M.edge,model,true);
 for(let j=0;j<2;j++){
  const x=-5.1+j*2.02;
  box(x,y+.14,1.55,1.86,.2,.13,M.mint);
  // Irregular shards attached to window corners.
  const shape=new THREE.Shape();shape.moveTo(-.84,0);shape.lineTo(.4,0);shape.lineTo(.05,.4);shape.lineTo(-.3,.23);shape.lineTo(-.84,.88);shape.closePath();
  const shard=mesh(new THREE.ShapeGeometry(shape),M.glass,x,y+.24,1.54);shard.material.side=THREE.DoubleSide;
  rod([x-.8,y+.3,1.56],[x-.3,y+.6,1.56],.012,M.white);
 }
 // Rear right wall stays partial; the corner has collapsed completely.
 box(2.25,y+.55,-4.0,.22,1.1,3.1,M.plaster,model,true);
 box(2.25,y+1.55,-5.28,.26,1.9,.52,M.mint,model,true);
 box(-6.1,y+1.12,-5.2,.4,2.3,.4,M.edge,model,true);
}
// Roof parapets and broken structural crown.
box(-2.1,7.95,-5.55,8.5,.38,.25,M.mint,model,true);
box(-6.3,7.92,-2.2,.25,.34,6.7,M.mint,model,true);
for(let i=0;i<16;i++)box(R(-6.1,1.8),7.98,R(-5.3,-4.8),R(.2,.6),R(.1,.32),.27,M.edge).rotation.z=R(-.15,.15);
for(let i=0;i<7;i++)rod([2.3,5.5,-2.4-i*.34],[2.5+R(0,.2),6+R(0,.6),-2.4-i*.34],.018,M.rust);

// Rooms are intentionally open at the collapsed southeast corner.
function table(x,y,z,w=1.4,d=.75){box(x,y+.72,z,w,.12,d,M.woodLight,model,true);for(const dx of [-w*.4,w*.4])for(const dz of [-d*.35,d*.35])box(x+dx,y+.35,z+dz,.07,.7,.07,M.wood)}
function chair(x,y,z,angle=0,m=M.mint){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=angle;model.add(g);box(0,.43,0,.44,.09,.45,m,g,true);box(0,.72,-.2,.44,.48,.07,m,g,true);for(const dx of [-.17,.17])for(const dz of [-.17,.17])box(dx,.22,dz,.045,.44,.045,M.rust,g);return g}
function bookshelf(x,y,z,w=1.5){box(x-w/2,y+.95,z,.1,1.9,.38,M.wood);box(x+w/2,y+.95,z,.1,1.9,.38,M.wood);box(x,y+.95,z-.16,w,1.9,.07,M.wood);for(let j=0;j<4;j++){box(x,y+j*.55,z,w,.07,.4,M.woodLight);for(let k=0;k<9;k++){const a=box(x-w*.43+k*w*.1,y+j*.55+.23,z,.095,R(.26,.42),.24,pick([M.mint,M.red,M.cream,M.woodLight,M.dark]),model,true);a.rotation.z=R(-.15,.15)}}}
// Ground: abandoned bookshop, cashier, newspaper stacks and reading nook.
bookshelf(-5.7,.5,-4.65);bookshelf(-3.85,.5,-4.65);
bookshelf(-5.8,.5,-2.3,1.0);
table(-3.5,.5,-.1,1.6,1);chair(-3.6,.5,.7,Math.PI*.9);chair(-4.6,.5,-.1,-1.57);
box(-.2,.97,-4.45,2.35,.95,.75,M.mint,model,true);box(-.2,1.48,-4.45,2.5,.1,.88,M.woodLight);
box(-.7,1.62,-4.4,.45,.23,.34,M.dark,model,true);box(-.7,1.83,-4.48,.38,.25,.07,M.black);
for(let i=0;i<6;i++)box(-3.5+R(-.45,.4),1.31+i*.038,-.1+R(-.2,.2),.45,.035,.3,pick([M.cream,M.red,M.mint]));
// First floor: quiet apartment, damaged kitchen, dishes and green bath.
box(-5.45,3.31,-3.9,1.12,.7,2.05,M.wood,model,true);
box(-5.45,3.7,-3.9,1.08,.16,2,M.cream);box(-5.45,3.86,-4.5,.8,.2,.52,M.white);
box(-5.45,3.82,-3.45,1.12,.09,.85,M.mint);
box(-.15,3.44,-4.8,2.6,.96,.64,M.white,model,true);box(-.15,3.96,-4.8,2.7,.07,.76,M.woodLight);
for(const x of [-.95,-.1,.75]){box(x,3.45,-4.44,.73,.74,.04,M.mint,model,true);box(x+.18,3.6,-4.4,.18,.04,.04,M.dark)}
const sink=torus(-.8,4.01,-4.75,.24,.025,M.metal);sink.rotation.x=Math.PI/2;
ell(-.8,3.99,-4.75,.23,.018,.19,M.dark);curve([[-.7,4,-4.95],[-.7,4.3,-4.95],[-.7,4.35,-4.72],[-.7,4.2,-4.7]],.025,M.metal);
for(const x of [.2,.7]){const burner=torus(x,4.01,-4.75,.16,.022,M.dark);burner.rotation.x=1.57}
box(1.38,3.8,-4.8,.6,1.7,.65,M.cream,model,true);
table(-3.25,2.92,-.25,1.35,.8);chair(-3.35,2.92,.5,Math.PI);chair(-4.2,2.92,-.25,-1.57);
for(let i=0;i<3;i++){const plate=mesh(new THREE.CylinderGeometry(.15,.13,.025,16),M.white,-3.6+i*.35,3.72,-.25);}
// Upper floor: artist's study and a collapsed roof garden.
bookshelf(-4.9,5.34,-4.7,2.1);table(-4.7,5.34,-.2,1.8,.8);chair(-4.7,5.34,.45,Math.PI);
box(-4.4,6.15,-.2,.47,.04,.36,M.cream);box(-5.2,6.16,-.2,.24,.18,.25,M.red,model,true);
const easel=new THREE.Group();easel.position.set(.2,5.34,-3.8);model.add(easel);
rod([-.35,0,0],[0,1.7,0],.035,M.wood,easel);rod([.35,0,0],[0,1.7,0],.035,M.wood,easel);rod([0,0,-.45],[0,1.4,0],.035,M.wood,easel);
box(0,1.15,.02,.9,.83,.07,M.cream,easel,true);
for(let i=0;i<8;i++)ell(R(-.35,.35),R(.86,1.45),.07,R(.07,.2),R(.04,.15),.012,pick(greens),easel);
// Stairs, railings, rugs, fallen books, wall clocks, hanging lamps.
for(let level=0;level<2;level++){
 const y=.5+level*2.42;
 for(let i=0;i<11;i++)box(1.5,y+.1+i*.22,-4.15+i*.25,.9,.19,.3,M.edge,model,true);
 rod([1.96,y+.65,-4.2],[1.96,y+2.9,-1.65],.026,M.rust);
 for(let i=0;i<6;i++)rod([1.96,y+i*.44,-4.1+i*.5],[1.96,y+.7+i*.44,-4.1+i*.5],.021,M.rust);
}
for(let level=0;level<3;level++){
 const y=.5+level*2.42;
 box(-3.7,y+.025,-.5,2.3,.025,1.5,level===1?M.red:M.mint);
 rod([-3.5,y+2.22,-2],[-3.5,y+1.85,-2],.018,M.dark);
 mesh(new THREE.ConeGeometry(.26,.16,12,1,true),M.cream,-3.5,y+1.85,-2);
 for(let i=0;i<10;i++){const b=box(R(-5.8,.9),y+.06,R(-4.7,.85),R(.15,.32),.07,R(.2,.4),pick([M.mint,M.cream,M.red]),model,true);b.rotation.y=R(0,6.28)}
 flowers(-5.8,y+.05,.85,5,.23);grass(.5,y+.02,-.2,.4);
}
// Old air conditioners, pipes, cable conduits and balconies.
for(const y of [3.45,5.9]){
 box(-6.57,y,-3.7,.45,.65,1,M.edge,model,true);
 for(let i=0;i<6;i++)box(-6.81,y-.24+i*.09,-3.7,.015,.027,.8,M.dark);
 box(-4.3,y-.1,1.85,3.7,.13,.68,M.broken,model,true);
 rod([-6.1,y+.55,2.17],[-2.5,y+.55,2.17],.025,M.rust);
 for(let x=-6.1;x<-2.4;x+=.36)rod([x,y,2.17],[x,y+.55,2.17],.018,M.rust);
}
curve([[-6.52,7.7,-5],[-6.57,6,-5],[-6.55,3.3,-5],[-6.55,.5,-5],[-7,.3,-5]],.065,M.rust);

// Hand-painted signs are part of the miniature, never interface overlays.
function sign(text,w,h,bg,fg,x,y,z,size=55){const c=document.createElement('canvas');c.width=1024;c.height=Math.round(1024*h/w);const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle=fg;ctx.lineWidth=7;ctx.strokeRect(18,18,c.width-36,c.height-36);ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`600 ${size*(1024/400)}px "Noto Serif CJK JP", "Yu Mincho", serif`;ctx.fillText(text,512,c.height/2,950);for(let i=0;i<40;i++){ctx.fillStyle=bg+'88';ctx.fillRect(R(20,1000),R(20,c.height-20),R(8,45),R(2,7))}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.MeshToonMaterial({map:t,gradientMap:ramp});return box(x,y,z,w,h,.07,m,model,true)}
sign('青 葉 文 庫',3.8,.68,'#47756d','#e8dfb9',-4.2,2.55,1.8,45);
sign('本 と、珈 琲 と。',2.5,.32,'#d9d1ae','#617c67',-4.2,2.08,1.68,23);
sign('緑のある暮らし',2.8,.55,'#cec8a4','#778c72',-3.1,5.02,-5.38,29);
// Faded wall graffiti, with splashes and a small painted sprout.
for(let i=0;i<7;i++){const stripe=box(-6.445,.8+i*.09,-1.3+i*.06,.012,.045,R(.4,.9),pick([M.mint,M.red,M.mossLight]));stripe.rotation.x=R(-.2,.2)}

// The ancient banyan: multiple fused fluted trunks, buttresses and arcing limbs.
const trunkCenter=V(-1.35,0,-2.05);
for(let j=0;j<8;j++){
 const a=j/8*Math.PI*2,dx=Math.cos(a),dz=Math.sin(a);
 curve([[-1.35+dx*1.5,.3,-2.05+dz*1.5],[-1.35+dx*.65,1.7,-2.05+dz*.65],[-1.35+dx*.46,4.1,-2.05+dz*.42],[-1.45+dx*.38,7.2,-2+dz*.4],[-1.3+dx*.8,9,-2+dz*.6]],R(.18,.3),j%3?M.trunk:M.root);
 curve([[-1.35+dx*.55,1.5,-2.05+dz*.55],[-1.35+dx*1.5,.4,-2.05+dz*1.5],[-1.35+dx*2.1,.3,-2.05+dz*2.3],[-1.35+dx*2.9,.28,-2.05+dz*2.8]],.13,M.root);
}
const crowns=[];
for(let i=0;i<11;i++){
 const a=i/11*6.28,d=R(2,4.1),x=-1.4+Math.cos(a)*d,z=-2+Math.sin(a)*d,y=R(9,10.6);
 curve([[-1.4,5.8,-2],[-1.1+Math.cos(a)*.5,8,-2+Math.sin(a)*.6],[x*.7,y-.6,z*.8],[x,y+.4,z]],R(.12,.24),M.trunk);
 crowns.push([x,y+.8,z]);
}
crowns.push([-1.5,11.8,-2.2],[-2.4,11.1,-3.8],[.3,11.3,-2]);
const canopy=new THREE.Group();model.add(canopy);
for(const [x,y,z] of crowns){
 for(let j=0;j<5;j++){
  const sx=R(1.05,1.65),sy=R(.6,1.05),sz=R(.9,1.5);
  ell(x+R(-.65,.65),y+R(-.4,.4),z+R(-.6,.6),sx,sy,sz,pick(greens.slice(0,5)),canopy);
 }
 // Light-catching small leaf fans soften the faceted crown silhouette.
 for(let j=0;j<55;j++){
  const a=R(0,6.28),u=R(-1,1),r=Math.sqrt(1-u*u);
  const px=x+Math.cos(a)*r*1.65,py=y+u*.9,pz=z+Math.sin(a)*r*1.5;
  leaf(px,py,pz,R(.22,.45),pick(greens),R(0,6.28));
 }
}
// Aerial roots drape over the facade, curl through slabs and reach the street.
for(let i=0;i<24;i++){
 const x=R(-5.7,1.2),z=R(-.4,1.8),top=R(8.7,10.3),bottom=i%3===0?.3:R(2,6);
 curve([[x,top,z],[x+.18,top-1.5,z+.1],[x+R(-.2,.2),(top+bottom)/2,z+.1],[x+R(-.35,.35),bottom,z+.15]],R(.025,.065),i%3?M.root:M.trunk);
 if(i%4===0)ivy([[x,top-.5,z+.03],[x+.13,top-2,z+.13],[x-.1,bottom+.5,z+.2]]);
}
for(let i=0;i<8;i++)curve([[-1.1,7,-1.6],[-1.6+i*.18,5.5,1.3],[-1.9+i*.23,2.7,1.8],[-1.5+i*.27,.4,2.4],[-.6+i*.26,.14,3.7]],R(.06,.13),M.root);
// Ivy and bougainvillea flow down the shell in distinct curtains.
for(let i=0;i<11;i++){
 const x=R(-6.2,-2.2);
 ivy([[x,8.1,1.7],[x+.25,7.2,1.77],[x-.2,6.2,1.84],[x+.12,R(3,5.7),1.9]],i%3===0);
}
for(let i=0;i<8;i++){const z=R(-5,1);ivy([[-6.48,7.9,z],[-6.5,6.5,z+.2],[-6.52,4.5,z-.3],[-6.52,R(.4,3),z]],i%3===0)}
for(let i=0;i<12;i++)bush(R(-6,1.7),7.98,R(-5.1,-4.1),R(.25,.5));

// Broken elevated pedestrian bridge, hanging over the right-hand street.
poly([[2,-4.2],[7.7,-4.2],[7.7,-2.4],[6.8,-2.4],[6.5,-2.85],[5.95,-2.5],[5.5,-2.95],[2,-2.7]],3.72,.28,M.concrete);
box(7,1.9,-3.35,.55,3.5,.6,M.broken,model,true);
for(const z of [-4.15,-2.65]){
 rod([2,4.48,z],[5.7,4.48,z],.035,M.rust);
 for(let x=2.1;x<5.8;x+=.42)rod([x,3.72,z],[x,4.48,z],.025,M.metal);
}
for(let i=0;i<6;i++)rod([5.5+i*.35,3.6,-2.8],[5.6+i*.35,3.5-R(0,.3),-2.2+R(0,.2)],.02,M.rust);
ivy([[7.5,4,-3.9],[7.2,3.7,-3.1],[6.8,3.5,-2.5],[6.7,2.4,-2.4],[7,1.4,-2.5]]);
bush(6.8,3.8,-3.7,.42);

// Sagging utility cables threaded by climbing vines.
for(let i=0;i<2;i++)curve([[-7,6.8,-4+i*.2],[-3,5.9,2.2+i*.2],[2,5.4,4.2+i*.15],[6.5,6,2.6]],.022,M.dark);
ivy([[-6.9,6.8,-3.8],[-4.5,6.3,-.7],[-2.8,5.8,2.2],[-.2,5.55,3.8],[2,5.4,4.3]]);
rod([-7,.2,-4],[-7,7,-4],.1,M.wood);rod([-7.6,6.5,-4],[-6.4,6.5,-4],.07,M.wood);
for(const x of [-7.4,-7,-6.6])ell(x,6.6,-4,.09,.16,.09,M.white);

// Leaning street lamp and a broken traffic signal.
const lamp=new THREE.Group();lamp.position.set(5.65,.1,2.4);lamp.rotation.z=-.1;model.add(lamp);
mesh(new THREE.CylinderGeometry(.2,.28,.2,10),M.dark,0,.1,0,lamp);
rod([0,0,0],[0,5.7,0],.065,M.metal,lamp);
curve([[0,5.5,0],[0,5.9,0],[-.4,6.05,0],[-1.1,6.05,0]],.07,M.metal,lamp);
box(-1.1,5.98,0,.65,.12,.32,M.dark,lamp,true);
box(-1.24,5.9,0,.3,.035,.25,M.cream,lamp);
rod([0,4.2,0],[1.1,4.2,0],.055,M.metal,lamp);
box(1.05,4.15,0,.45,1.28,.35,M.dark,lamp,true);
for(let i=0;i<3;i++){
 const lens=mesh(new THREE.CylinderGeometry(.135,.135,.07,12),[M.red,M.yellow,M.moss][i],1.05,4.56-i*.4,.22,lamp);lens.rotation.x=1.57;
 const hood=mesh(new THREE.CylinderGeometry(.18,.18,.18,10,1,true,0,Math.PI),M.black,1.05,4.61-i*.4,.29,lamp);hood.rotation.x=1.57;
}
ivy([[5.65,.3,2.4],[5.8,1.5,2.42],[5.9,3,2.4],[6.08,4.4,2.4]]);
// Rusted bus stop with a painted route and timetable.
rod([6.85,.15,.6],[6.85,2.8,.6],.045,M.rust);
sign('青葉前',.72,.43,'#c7caa1','#61786a',6.85,2.7,.62,39);
sign('08  ·  14',.62,.9,'#d8d5b9','#7c8570',6.85,1.95,.62,38);
box(6.7,.5,1.1,1.5,.13,.44,M.wood,model,true);for(const x of [6.15,7.25])box(x,.26,1.1,.08,.48,.3,M.rust);

// Vending machine: recessed shelves, bottles, shattered front and plants inside.
const vend=new THREE.Group();vend.position.set(2.6,.29,1.05);vend.rotation.y=-.16;model.add(vend);
box(0,1,0,1.1,2,.65,M.red,vend,true);box(-.13,1.22,.34,.73,1.2,.04,M.dark,vend,true);
for(let j=0;j<3;j++){
 box(-.13,.78+j*.38,.42,.74,.045,.16,M.cream,vend);
 for(let i=0;i<4;i++){mesh(new THREE.CylinderGeometry(.057,.057,.22,8),pick([M.mint,M.yellow,M.white]),-.4+i*.18,.92+j*.38,.4,vend)}
}
box(.41,1.3,.34,.12,.2,.03,M.black,vend);box(.41,1.03,.36,.07,.035,.03,M.cream,vend);
box(-.12,.35,.34,.6,.2,.06,M.black,vend);
const vg=new THREE.Shape();vg.moveTo(-.49,.65);vg.lineTo(-.49,1.78);vg.lineTo(-.1,1.78);vg.lineTo(-.23,1.25);vg.lineTo(-.35,1.37);vg.lineTo(-.29,.8);vg.closePath();mesh(new THREE.ShapeGeometry(vg),M.glass,0,0,.44,vend);
sign('緑 茶',.92,.25,'#d6d3ad','#697f57',2.6,2.19,1.42,43);
flowers(2.5,.8,1.5,6,.22);ivy([[2.6,.3,1.35],[2.9,1,1.38],[2.8,1.9,1.4],[2.35,2.3,1.2]]);
// News kiosk overgrown with bougainvillea.
const kiosk=new THREE.Group();kiosk.position.set(-6.3,.26,3.9);kiosk.rotation.y=.1;model.add(kiosk);
box(0,.85,0,1.7,1.7,1.25,M.mint,kiosk,true);
box(0,1.16,.65,1.42,.85,.03,M.dark,kiosk,true);
box(0,.63,.8,1.8,.1,.45,M.woodLight,kiosk,true);
box(0,1.82,0,2,.18,1.6,M.rust,kiosk,true);
for(let j=0;j<2;j++)for(let i=0;i<4;i++)box(-.55+i*.36,.92+j*.35,.7,.27,.3,.035,pick([M.cream,M.red,M.white,M.mint]),kiosk,true);
sign('青 葉 新 聞',1.65,.32,'#d4c9a5','#526c5d',-6.3,1.88,4.76,36);
bush(-6.4,2.2,3.9,.7);ivy([[-7.1,.3,4.6],[-7.15,1.2,4.6],[-6.9,2.2,4.7],[-5.8,2.3,4.4],[-5.5,1.5,4.6]],true);
// Fallen advertising column, extinguished neon letters and traffic barrier.
const ad=new THREE.Group();ad.position.set(.1,.35,6.7);ad.rotation.set(0,.24,-1.15);model.add(ad);
box(0,.7,0,.62,1.6,.3,M.metal,ad,true);box(0,.7,.16,.48,1.4,.025,M.cream,ad);
box(0,-.1,0,1,.14,.6,M.broken,ad,true);
const neon=new THREE.Group();neon.position.set(-1,.25,2.4);neon.rotation.set(.8,0,-.17);model.add(neon);
box(0,0,0,2.3,.6,.1,M.dark,neon,true);
for(let i=0;i<5;i++){const t=torus(-.88+i*.43,0,.08,.16,.022,M.red,neon);t.scale.y=1.2}
const barrier=new THREE.Group();barrier.position.set(5.9,.3,6.3);barrier.rotation.set(0,-.5,1.3);model.add(barrier);
box(0,.5,0,1.6,.35,.12,M.cream,barrier,true);for(let i=0;i<4;i++){const b=box(-.6+i*.4,.5,.072,.17,.35,.015,M.red,barrier);b.rotation.z=-.4}for(const x of [-.5,.5])box(x,.25,0,.08,.75,.1,M.rust,barrier);

// An old compact car, sunk into the soil, with a roof garden.
const car=new THREE.Group();car.position.set(-3.65,.23,5.15);car.rotation.y=-.28;car.rotation.z=-.055;model.add(car);
box(0,.43,0,2.5,.55,1.27,M.mint,car,true);
box(-.1,.91,0,1.48,.56,1.15,M.mint,car,true);
box(-.08,1.22,0,1.65,.11,1.2,M.woodLight,car,true);
for(const z of [-.587,.587]){box(-.48,.93,z,.54,.36,.015,M.dark,car,true);box(.2,.93,z,.61,.36,.015,M.glass,car,true);box(-.15,.93,z,.045,.4,.025,M.rust,car)}
const windshield=box(.68,.94,0,.04,.42,.99,M.glass,car,true);windshield.rotation.z=.3;
box(-1.28,.35,0,.11,.12,1.31,M.rust,car,true);box(1.28,.33,0,.1,.12,1.32,M.rust,car,true);
for(const z of [-.45,.45]){box(1.25,.51,z,.05,.16,.22,M.cream,car,true);box(-1.26,.5,z,.05,.16,.21,M.red,car)}
for(const x of [-.8,.8])for(const z of [-.65,.65]){const wheel=torus(x,.24,z,.26,.09,M.black,car);mesh(new THREE.CylinderGeometry(.13,.13,.06,10),M.rust,x,.24,z,car).rotation.x=1.57;}
for(let i=0;i<12;i++)ell(R(-1.1,1.1),R(.45,.62),.648,R(.05,.19),R(.02,.09),.012,M.rust,car,geometries.rock);
box(-.1,1.29,0,1.48,.15,1.08,M.soil,car);
bush(-4,1.65,5.1,.55);flowers(-3.2,1.51,5.3,14,.55);ivy([[-4.6,1.6,5],[-4.8,.9,5.6],[-4.7,.2,5.9]]);
// Rusty bicycle: wheel spokes, frame triangles, handlebars and chain wheel.
const bike=new THREE.Group();bike.position.set(-.15,.29,2.05);bike.rotation.set(0,-.1,-.22);model.add(bike);
for(const x of [-.55,.65]){
 torus(x,.39,0,.36,.035,M.black,bike);torus(x,.39,0,.31,.014,M.rust,bike);
 for(let j=0;j<10;j++){const a=j/10*6.28;rod([x,.39,0],[x+Math.cos(a)*.31,.39+Math.sin(a)*.31,0],.006,M.metal,bike)}
}
const bp=[[-.55,.39,0],[-.2,.89,0],[.18,.39,0],[.49,.95,0],[.65,.39,0]];
for(const [a,b] of [[0,1],[0,2],[1,2],[1,3],[2,3],[3,4]])rod(bp[a],bp[b],.025,M.rust,bike);
box(-.2,.99,0,.27,.06,.16,M.wood,bike);rod([.49,.95,0],[.43,1.17,0],.023,M.rust,bike);rod([.43,1.17,-.16],[.43,1.17,.16],.02,M.metal,bike);torus(.18,.39,0,.11,.018,M.rust,bike);
for(let i=0;i<4;i++){const t=torus(3.9,.22+i*.17,-.9,.4,.12,M.black);t.rotation.x=1.57;t.rotation.y=.15*i;}

// Mossy planters, stone stairway, toppled rubble and half-lifted manhole.
for(let i=0;i<4;i++)box(-7.05,.31+i*.15,-1.1-i*.36,1.3,.3,.54,i%2?M.concrete:M.moss,model,true);
for(const [x,z] of [[-7,-6.6],[.6,-6.4],[2.4,2.35]]){
 box(x,.47,z,1.6,.62,.8,M.edge,model,true);box(x,.8,z,1.4,.06,.64,M.soil);
 bush(x,.97,z,.47);flowers(x+.45,.84,z+.1,7,.25);
}
const hole=mesh(new THREE.CylinderGeometry(.43,.43,.035,24),M.dark,1.15,.11,4.1);
const cover=mesh(new THREE.CylinderGeometry(.43,.43,.08,24),M.metal,1.35,.35,3.95);cover.rotation.x=.75;cover.rotation.z=.2;
for(let i=0;i<5;i++)box(1.12+i*.1,.405+i*.012,3.95,.035,.018,.54,M.dark).rotation.x=.75;
curve([[1.1,.15,4.1],[1.3,.4,4.1],[1.45,.21,4.4],[1.8,.14,4.6]],.09,M.root);
for(let i=0;i<65;i++){
 const x=R(-1.9,3.2),z=R(-.4,2.8);if(rnd()>.55)continue;
 instance('rock',pick([M.broken,M.edge,M.concrete]),[x,.3,z],[R(.08,.32),R(.06,.23),R(.09,.3)],[R(0,3),R(0,3),R(0,3)]);
}
for(let i=0;i<100;i++){
 const x=R(-7.65,7.65),z=R(-7.6,7.6);
 if((x>-5.8&&x<1.6&&z>-4.8&&z<1.3)||(x>2&&x<6&&z>3.6&&z<6.9))continue;
 if(rnd()>.45)grass(x,.18,z,R(.18,.38));
 if(i%8===0)flowers(x,.19,z,4,.18);
}
for(let i=0;i<65;i++){
 const x=R(-7.8,7.8),z=R(-7.8,7.8);if(x>2&&z>3.5&&x<6&&z<7)continue;
 instance('ico',pick([M.moss,M.mossLight]),[x,.17,z],[R(.12,.45),.035,R(.1,.38)],[0,R(0,6),0]);
}

// A clear stream emerging from the split pavement into a small pebble-lined pool.
const pondOutline=[[2,3.7],[3.1,3.25],[4.3,3.4],[5.55,4.05],[5.9,5.2],[5.5,6.35],[4.2,6.95],[2.9,6.7],[2.35,5.8],[1.95,4.9]];
poly(pondOutline,.14,.05,mat('#67a7a1'));
const waterMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:`varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 p;uniform float time;void main(){float w=sin(p.x*11.+p.z*9.+time*.8)*sin(p.x*6.-p.z*8.-time*.5);float l=smoothstep(.74,.92,w);vec3 c=mix(vec3(.35,.70,.65),vec3(.85,.97,.80),l*.7);gl_FragColor=vec4(c,.34);}`});
poly(pondOutline,.19,.005,waterMaterial);
const streamPts=[[.8,2.95],[1.1,3.35],[1.25,3.7],[1.9,4.15],[2.45,4.65],[2.15,4.95],[1.55,4.4],[.92,3.95],[.65,3.5],[.45,3.05]];
poly(streamPts,.135,.025,mat('#81bdb1'));
for(let i=0;i<36;i++){
 const a=i/36*6.28,x=3.95+Math.cos(a)*R(1.85,2.05),z=5.1+Math.sin(a)*R(1.55,1.78);
 instance('ico',pick([M.edge,M.concrete,M.broken]),[x,.24,z],[R(.11,.27),R(.09,.16),R(.11,.23)],[0,R(0,6),R(-.3,.3)]);
 if(i%3===0)grass(x,.25,z,R(.3,.55));
}
for(let i=0;i<26;i++)instance('rock',pick([M.edge,M.broken,M.soil]),[R(2.8,5.1),.16,R(4.1,6)],[R(.04,.13),.025,R(.05,.12)]);
for(const [x,z] of [[2.45,5.8],[4.9,6.2],[5.4,4.6]]){
 for(let i=0;i<6;i++){const h=R(.45,.9);rod([x+R(-.15,.15),.2,z+R(-.15,.15)],[x+R(-.2,.2),h,z+R(-.1,.1)],.017,M.moss);}
 grass(x,.2,z,.7);
}
for(let i=0;i<5;i++){
 const pad=mesh(new THREE.CircleGeometry(R(.14,.24),10),mat('#709b55'),R(2.7,4.8),.204,R(4.4,6.15));pad.rotation.x=-1.57;
}
const fish=[];
for(let i=0;i<5;i++){
 const f=new THREE.Group();model.add(f);
 ell(0,0,0,.18,.04,.065,i%2?M.cream:M.red,f,geometries.sphere);
 const tail=mesh(new THREE.ConeGeometry(.08,.15,3),M.red,-.2,0,0,f);tail.rotation.z=1.57;tail.scale.z=.3;
 ell(.11,.025,.035,.016,.015,.015,M.dark,f,geometries.sphere);
 fish.push({f,a:i*1.25,r:R(.55,1.25),speed:R(.12,.24)});
}
const ripples=[];const rippleMat=new THREE.MeshBasicMaterial({color:0xe4f3d9,transparent:true,opacity:.26,side:THREE.DoubleSide,depthWrite:false});
for(let i=0;i<5;i++){const r=mesh(new THREE.RingGeometry(.27,.28,32),rippleMat.clone(),R(2.8,4.9),.217,R(4.2,6.1));r.rotation.x=-Math.PI/2;r.castShadow=false;ripples.push(r)}

// Merge the immobile architecture by material; preserve independently animated objects.
// This retains the detail while avoiding thousands of separate GPU draw calls.
model.updateMatrixWorld(true);
const dynamicRoots=new Set([canopy,...fish.map(o=>o.f),...ripples]);
const staticGroups=new Map(),staticLines=[],remove=[];
function isDynamic(o){for(let n=o;n&&n!==model;n=n.parent)if(dynamicRoots.has(n))return true;return false}
model.traverse(o=>{
 if(isDynamic(o))return;
 if(o.isLineSegments){staticLines.push(o.geometry.clone().applyMatrix4(o.matrixWorld));remove.push(o);return}
 if(!o.isMesh||o.isInstancedMesh||o.material.transparent)return;
 const key=o.material.uuid;
 if(!staticGroups.has(key))staticGroups.set(key,{material:o.material,geometries:[]});
 staticGroups.get(key).geometries.push(o.geometry.clone().applyMatrix4(o.matrixWorld));remove.push(o);
});
for(const o of remove)o.removeFromParent();
for(const {material,geometries:gs} of staticGroups.values()){
 const merged=mergeGeometries(gs.map(g=>g.index?g.toNonIndexed():g),false);
 if(!merged)throw new Error('Unable to merge static scene geometry');
 mesh(merged,material);
 gs.forEach(g=>g.dispose());
}
if(staticLines.length){const g=mergeGeometries(staticLines,false);model.add(new THREE.LineSegments(g,edgeMat));staticLines.forEach(g=>g.dispose())}

// Final botanical batching and a few drifting sunlit seed motes.
for(const b of batches.values()){
 const o=new THREE.InstancedMesh(geometries[b.kind],b.m,b.items.length);
 b.items.forEach((v,i)=>{dummy.position.set(...v.pos);dummy.scale.set(...v.scale);dummy.rotation.set(...v.rot);dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix)});
 o.castShadow=b.kind!=='leaf';o.receiveShadow=true;o.instanceMatrix.needsUpdate=true;model.add(o);
}
const moteGeo=new THREE.BufferGeometry();const motePos=new Float32Array(90*3);
for(let i=0;i<90;i++){motePos[i*3]=R(-7,7);motePos[i*3+1]=R(.5,11);motePos[i*3+2]=R(-5,7)}
moteGeo.setAttribute('position',new THREE.BufferAttribute(motePos,3));
const motes=new THREE.Points(moteGeo,new THREE.PointsMaterial({color:0xfff3b4,size:.035,transparent:true,opacity:.65,depthWrite:false}));model.add(motes);
let previous=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const expandedWorld=expandWorld({kind:'city',scene,model,camera,controls,renderer,preview:isPreview,reduced});
function renderFrame(ms){
 expandedWorld.update(ms*.001);
 const t=ms*.001,dt=Math.min(t-previous,.05);previous=t;
 controls.update();
 if(!reduced){
  waterMaterial.uniforms.time.value=t;
  fish.forEach(({f,a,r,speed})=>{const theta=t*speed+a;f.position.set(3.95+Math.cos(theta)*r,.171,5.1+Math.sin(theta)*r*.65);f.rotation.y=-Math.atan2(Math.cos(theta)*.65,-Math.sin(theta));});
  ripples.forEach((r,i)=>{const p=(t*.18+i*.23)%1;r.scale.setScalar(.3+p*1.7);r.material.opacity=(1-p)*.24});
  canopy.rotation.z=Math.sin(t*.45)*.002;
  motes.rotation.y=Math.sin(t*.08)*.025;
  for(let i=0;i<90;i++){motePos[i*3+1]+=dt*.025;if(motePos[i*3+1]>11.5)motePos[i*3+1]=.5}moteGeo.attributes.position.needsUpdate=true;
 }
 renderer.render(scene,camera);
}
installSceneCapture({kind:'city',camera,controls,renderer,preview:isPreview,render:()=>renderFrame(isPreview?0:performance.now(),true)});
if(isPreview){renderFrame(0)}else{renderer.setAnimationLoop(renderFrame)}
addEventListener('resize',()=>{const aspect=innerWidth/innerHeight;const factor=expandedFit(aspect)/expandedFit(camera.aspect);camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);camera.aspect=aspect;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,isPreview?.85:1.8));if(isPreview)renderFrame(0);});
// Keep the composition visible when changing device orientation, without interrupting exploration.
addEventListener('orientationchange',()=>requestAnimationFrame(frame));
