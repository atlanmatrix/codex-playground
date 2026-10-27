import {installSceneCapture} from './scene-capture.js';
import {expandWorld,expandedFit} from './expansions/sakura.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const preview=['preview','screenshot'].some(key=>new URLSearchParams(location.search).has(key));
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene=new THREE.Scene();
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,preview?.85:1.8));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.localClippingEnabled=true;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;
document.body.appendChild(renderer.domElement);
renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','樱花环绕的乡间铁路小站，可拖拽旋转和缩放');
const camera=new THREE.PerspectiveCamera(33,innerWidth/innerHeight,.35,260);
const controls=new OrbitControls(camera,renderer.domElement);
controls.target.set(0,1.4,0);controls.enabled=!preview;controls.enableDamping=true;controls.dampingFactor=.065;
controls.enablePan=false;controls.minDistance=19;controls.maxDistance=170;controls.minPolarAngle=.22;controls.maxPolarAngle=Math.PI*.44;
const fit=aspect=>expandedFit(aspect);
const distance=fit(camera.aspect);camera.position.set(distance*.65,1.4+distance*.68,distance*.79);camera.lookAt(controls.target);
scene.add(new THREE.HemisphereLight(0xf9f7ff,0xa0b183,2.05));
const sun=new THREE.DirectionalLight(0xfff0cc,2.65);sun.position.set(-10,19,12);sun.castShadow=true;
sun.shadow.mapSize.set(preview?1024:2048,preview?1024:2048);Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-14,near:.5,far:48});sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;sun.shadow.radius=3;scene.add(sun);
const fill=new THREE.DirectionalLight(0xddefff,.7);fill.position.set(8,9,-6);scene.add(fill);
const model=new THREE.Group();model.name='sakura-miniature';scene.add(model);
const scenery=new THREE.Group();scenery.name='static-station';model.add(scenery);
let seed=729480;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const R=(a,b)=>a+random()*(b-a),pick=a=>a[Math.floor(random()*a.length)],v=(x,y,z)=>new THREE.Vector3(x,y,z);
const ramp=new THREE.DataTexture(new Uint8Array([115,159,198,229,250,255]),6,1,THREE.RedFormat);ramp.needsUpdate=true;ramp.minFilter=ramp.magFilter=THREE.NearestFilter;
const toon=(color,extra={})=>new THREE.MeshToonMaterial({color,gradientMap:ramp,...extra});
const m={wood:toon('#ac875f'),woodDark:toon('#7e6653'),edge:toon('#dbc8aa'),soil:toon('#9c8662'),grass:toon('#b4d97c'),hill:toon('#b6da7d'),green:toon('#86b65b'),greenDark:toon('#659c50'),cream:toon('#f1ead9'),plaster:toon('#f6f1e5'),stone:toon('#d0cfbd'),stoneLight:toon('#e6e2ce'),platform:toon('#bfc4be'),paving:toon('#dde0d3'),roof:toon('#6593a0'),roofDark:toon('#426a77'),roofLight:toon('#e3e9df'),metal:toon('#8e9e9b'),metalDark:toon('#65757a'),rail:toon('#a5ada9'),tie:toon('#9e8167'),asphalt:toon('#929397'),line:toon('#f2f0e5'),yellow:toon('#efd35a'),red:toon('#d86e72'),redDark:toon('#966068'),window:toon('#a4ced0'),black:toon('#3f3b4d'),tunnel:toon('#55535f'),brownRoof:toon('#ac9069')};
const foliage=toon('#ffffff',{side:THREE.DoubleSide});
const pinks=['#f2c9dc','#efbdd4','#f6dce9','#ffeaf0','#eeb1ce'].map(c=>new THREE.Color(c));
const greens=['#91bb65','#a7d378','#c3e491','#d4ed9f'].map(c=>new THREE.Color(c));
const edgeMaterial=new THREE.LineBasicMaterial({color:0x667574,transparent:true,opacity:.43,depthWrite:false});
const geo={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.SphereGeometry(1,14,10),blossom:new THREE.IcosahedronGeometry(1,1),rock:new THREE.IcosahedronGeometry(1,0),leaf:new THREE.BufferGeometry(),petal:new THREE.BufferGeometry()};
geo.leaf.setAttribute('position',new THREE.Float32BufferAttribute([-.025,0,0,.025,0,0,.04,.18,0,-.025,0,0,.04,.18,0,.005,.19,0,.005,.19,0,.04,.18,0,.075,.38,.012],3));geo.leaf.computeVertexNormals();
geo.petal.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.06,.018,.075,-.028,.027,.14,0,0,0,-.028,.027,.14,.028,.027,.14,0,0,0,.028,.027,.14,.06,.018,.075],3));geo.petal.computeVertexNormals();
function mesh(g,mat,x=0,y=0,z=0,parent=scenery){const o=new THREE.Mesh(g,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function box(x,y,z,w,h,d,mat,parent=scenery,outline=false){const o=mesh(geo.box,mat,x,y,z,parent);o.scale.set(w,h,d);if(outline){const l=new THREE.LineSegments(new THREE.EdgesGeometry(geo.box),edgeMaterial);l.scale.setScalar(1.0015);o.add(l)}return o}
function ell(x,y,z,sx,sy,sz,mat,parent=scenery){const o=mesh(geo.sphere,mat,x,y,z,parent);o.scale.set(sx,sy,sz);return o}
function rod(a,b,r,mat,parent=scenery,rTop=r){const from=v(...a),to=v(...b),delta=to.clone().sub(from);const o=mesh(new THREE.CylinderGeometry(rTop,r,delta.length(),8),mat,0,0,0,parent);o.position.copy(from.add(to).multiplyScalar(.5));o.quaternion.setFromUnitVectors(v(0,1,0),delta.normalize());return o}
function tube(points,r,mat,parent=scenery,segments=22){const curve=new THREE.CatmullRomCurve3(points.map(p=>Array.isArray(p)?v(...p):p));return mesh(new THREE.TubeGeometry(curve,segments,r,5,false),mat,0,0,0,parent)}
function ring(x,y,z,r,t,mat,parent=scenery){return mesh(new THREE.TorusGeometry(r,t,7,24),mat,x,y,z,parent)}
const dummy=new THREE.Object3D();
function instances(g,mat,items,parent=scenery,shadow=true){const o=new THREE.InstancedMesh(g,mat,items.length);items.forEach((a,i)=>{dummy.position.set(...a.p);dummy.scale.set(...(a.s||[1,1,1]));dummy.rotation.set(...(a.r||[0,0,0]));dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);if(a.color)o.setColorAt(i,a.color)});o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o}
function xExtrude(shape,x,depth,mat,parent=scenery){const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:24});g.rotateY(Math.PI/2);return mesh(g,mat,x,0,0,parent)}
function roof(x,y,z,w,d,rise,mat,parent=scenery,corrugated=false){
 const slope=Math.atan2(rise,d/2),length=Math.hypot(rise,d/2);
 for(const sign of [-1,1]){const p=box(x,y+rise/2,z+sign*d/4,w,.10,length,mat,parent,true);p.rotation.x=sign*slope;rod([x-w/2,y-.04,z+sign*d/2],[x+w/2,y-.04,z+sign*d/2],.05,m.roofDark,parent);}
 rod([x-w/2-.04,y+rise+.04,z],[x+w/2+.04,y+rise+.04,z],.06,m.roofDark,parent);
 if(corrugated)for(let px=x-w/2+.12;px<x+w/2;px+=.25)for(const sign of [-1,1])rod([px,y+rise+.07,z],[px,y+.06,z+sign*d/2],.022,m.metal,parent);
}
// The thin wooden rim and bright turf retain the collectible model appearance.
for(const [bottom,top,mat] of [[-.50,-.25,m.woodDark],[-.25,-.04,m.wood],[-.04,.12,m.grass]])box(0,(bottom+top)/2,0,18,top-bottom,18,mat,scenery,true);
box(0,-.285,0,18.06,.045,18.06,m.edge,scenery,true);
const ground=mesh(new THREE.PlaneGeometry(180,180),new THREE.ShadowMaterial({opacity:.11}),0,-.54,0,scene);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
// Continuous rails and sleepers run through real, hollow tunnel shells.
box(0,.18,0,18,.12,2.25,m.platform,scenery,true);
const ballast=[];
for(let i=0;i<560;i++){
 const x=R(-8.95,8.95),z=R(-1.1,1.1);if(x>2.7&&x<5.1)continue;
 ballast.push({p:[x,.25,z],s:[R(.035,.09),R(.02,.045),R(.035,.08)],r:[R(0,3),R(0,3),R(0,3)],color:new THREE.Color(pick(['#a7ada5','#c1c2b7','#8d9792']))});
}
instances(geo.rock,foliage,ballast);
for(let x=-8.8;x<8.9;x+=.38)box(x,.285,0,.21,.09,1.83,m.tie,scenery,true);
for(const z of [-.58,.58]){
 box(0,.345,z,18,.07,.16,m.metalDark);box(0,.39,z,18,.06,.075,m.rail);
 for(let x=-8.7;x<8.8;x+=.76)for(const dz of [-.115,.115])box(x,.345,z+dz,.12,.04,.06,m.metalDark);
}
function archShape(outer,inner,spring=2.3){
 const s=new THREE.Shape();s.moveTo(-outer,.12);s.lineTo(-outer,spring);s.absarc(0,spring,outer,Math.PI,0,true);s.lineTo(outer,.12);s.lineTo(inner,.12);s.lineTo(inner,spring);s.absarc(0,spring,inner,0,Math.PI,false);s.lineTo(-inner,.12);s.closePath();return s;
}
function tunnel(side){
 const origin=side<0?-9:7.0;
 const hill=new THREE.Shape();hill.moveTo(-2.75,.12);
 for(let i=0;i<=32;i++){const z=-2.75+i/32*5.5;hill.lineTo(z,.12+4.35*Math.sqrt(Math.max(0,1-(z/2.75)**2)))}
 hill.lineTo(1.43,.12);hill.lineTo(1.43,2.3);hill.absarc(0,2.3,1.43,0,Math.PI,false);hill.lineTo(-1.43,.12);hill.closePath();
 const hillMesh=xExtrude(hill,origin,2.0,m.hill);hillMesh.name=side<0?'west-tunnel':'east-tunnel';
 xExtrude(archShape(1.45,1.41),origin+.01,1.98,m.tunnel);
 const face=side<0?-6.985:6.865;
 xExtrude(archShape(1.65,1.42),face,.12,m.stoneLight);
 // Individually separated arch stones read clearly against the pastel hillside.
 for(let i=0;i<13;i++){
  const a=i/13*Math.PI+.012,b=(i+1)/13*Math.PI-.012,s=new THREE.Shape();
  s.moveTo(Math.cos(a)*1.43,2.3+Math.sin(a)*1.43);s.lineTo(Math.cos(a)*1.65,2.3+Math.sin(a)*1.65);s.absarc(0,2.3,1.65,a,b,false);s.lineTo(Math.cos(b)*1.43,2.3+Math.sin(b)*1.43);s.absarc(0,2.3,1.43,b,a,true);s.closePath();
  xExtrude(s,face+(side<0?.121:-.008),.012,i%3?m.stoneLight:m.stone);
 }
 for(const z of [-1.54,1.54])for(let i=0;i<6;i++)box(side<0?-6.84:6.84,.29+i*.35,z,.09,.32,.22,i%2?m.stone:m.stoneLight,scenery,true);
 const cap=new THREE.Shape();cap.moveTo(-1.41,.12);cap.lineTo(-1.41,2.3);cap.absarc(0,2.3,1.41,Math.PI,0,true);cap.lineTo(1.41,.12);cap.closePath();
 const dark=mesh(new THREE.ShapeGeometry(cap),new THREE.MeshBasicMaterial({color:0x342f43,side:THREE.DoubleSide}),side<0?-8.96:8.96,0,0);dark.rotation.y=Math.PI/2;
 for(let i=0;i<12;i++){
  const z=R(-2.45,2.45),x=R(origin+.15,origin+1.85),y=.12+4.35*Math.sqrt(Math.max(0,1-(z/2.75)**2));
  ell(x,y+.04,z,R(.10,.23),R(.07,.16),R(.12,.25),i%2?m.green:m.greenDark);
 }
}
tunnel(-1);tunnel(1);
// A quiet road crosses the single track, then bends towards the village houses.
box(3.9,.155,0,2.2,.07,18,m.asphalt);
box(6.45,.16,5.95,4.9,.08,2.1,m.asphalt);
for(const x of [2.86,4.94])for(const [z,length] of [[-5.35,7.0],[5.35,7.0]])box(x,.198,z,.045,.012,length,m.line);
for(let z=-8.4;z<8.5;z+=1.32){if(Math.abs(z)<2.5)continue;box(3.9,.202,z,.055,.014,.55,m.line)}
for(const z of [-2.25,2.25])box(3.9,.205,z,1.95,.016,.10,m.line);
for(const z of [-.99,0,.99])box(3.9,.365,z,2.16,.06,z===0?.88:.52,m.platform,scenery,true);
for(const sign of [-1,1]){
 const s=new THREE.Shape();s.moveTo(1.27,.395);s.lineTo(1.92,.19);s.lineTo(1.92,.12);s.lineTo(1.27,.12);s.closePath();
 const g=new THREE.ExtrudeGeometry(s,{depth:2.16,bevelEnabled:false});g.rotateY(-Math.PI/2);
 const o=mesh(g,m.asphalt,4.98,0,0);if(sign<0)o.scale.z=-1;
}

// An island of yellow tactile paving under a light corrugated platform canopy.
const platform=new THREE.Group();platform.name='sakura-platform';scenery.add(platform);
box(-2.1,.41,-2.6,9.0,.58,2.8,m.platform,platform,true);
box(-2.1,.77,-2.6,9.0,.14,2.8,m.paving,platform,true);
for(let x=-6.35;x<2.3;x+=.48)box(x,.856,-1.43,.45,.032,.34,m.yellow,platform);
const tactile=[];for(let x=-6.5;x<2.35;x+=.11)for(const z of [-1.53,-1.43,-1.33])tactile.push({p:[x,.882,z],s:[.027,.012,.027]});
instances(geo.sphere,m.yellow,tactile,platform,false);
box(-2.1,.64,-1.188,8.96,.045,.017,m.metalDark,platform);
for(const x of [-4.25,-1.45,1.35])for(const z of [-1.72,-3.45]){
 box(x,1.96,z,.105,2.24,.105,m.roofDark,platform,true);
 box(x,.94,z,.19,.2,.19,m.platform,platform);
 rod([x,2.80,z],[x,3.17,z+(z>-2.5?-.25:.25)],.035,m.metal,platform);
}
roof(-1.35,3.22,-2.57,6.8,2.94,.55,m.roofLight,platform,true);
box(-1.35,3.10,-2.57,6.55,.10,.13,m.roofDark,platform);
for(const x of [-3.45,-.6,1.65]){
 box(x,3.12,-2.57,.52,.045,.2,m.cream,platform);
}
function bench(x,z,parent=platform){
 for(const dx of [-.66,.66]){box(x+dx,1.09,z,.065,.48,.25,m.metalDark,parent);rod([x+dx,1.27,z-.16],[x+dx,1.77,z-.25],.028,m.woodDark,parent)}
 for(let i=0;i<3;i++)box(x,1.34,z-.14+i*.13,1.75,.08,.11,m.wood,parent,true);
 for(let i=0;i<2;i++)box(x,1.57+i*.13,z-.23,1.75,.09,.065,m.wood,parent,true);
}
bench(-2.5,-3.25);bench(.2,-3.25);
for(const [x,c] of [[1.7,m.greenDark],[2.05,m.roof]]){
 mesh(new THREE.CylinderGeometry(.14,.13,.58,10),c,x,1.14,-3.35,platform);
 mesh(new THREE.CylinderGeometry(.15,.15,.06,10),m.metalDark,x,1.45,-3.35,platform);
}
function sign(text,x,y,z,w,h,parent=scenery,bg='#f4f0e6',color='#677b78'){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=Math.round(768*h/w);const ctx=canvas.getContext('2d');
 ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle=color;ctx.lineWidth=7;ctx.strokeRect(12,12,canvas.width-24,canvas.height-24);
 ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`500 ${canvas.height*.48}px "Noto Sans CJK JP","Yu Gothic",sans-serif`;ctx.fillText(text,canvas.width/2,canvas.height/2,canvas.width-40);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 return box(x,y,z,w,h,.04,new THREE.MeshToonMaterial({map:texture,gradientMap:ramp}),parent,true);
}
for(const x of [-.25,1.1])rod([x,.84,-1.29],[x,2.25,-1.29],.025,m.metal,platform);
sign('さくら坂',.425,2.10,-1.26,1.62,.43,platform);
const clock=mesh(new THREE.CylinderGeometry(.25,.25,.065,32),m.plaster,-4.42,2.65,-1.28,platform);clock.rotation.x=Math.PI/2;
ring(-4.42,2.65,-1.235,.25,.022,m.metalDark,platform);
for(let i=0;i<12;i++){const a=i/12*Math.PI*2;ell(-4.42+Math.sin(a)*.2,2.65+Math.cos(a)*.2,-1.224,.012,.012,.008,m.metalDark,platform)}
rod([-4.42,2.65,-1.21],[-4.42,2.82,-1.21],.012,m.metalDark,platform);rod([-4.42,2.65,-1.20],[-4.29,2.58,-1.20],.014,m.metalDark,platform);
// A small timber station building with teal roof, ticket window and entrance steps.
const station=new THREE.Group();station.name='timber-station-house';scenery.add(station);
box(-5.4,.48,-5.0,3.3,.72,2.7,m.stone,station,true);
box(-5.4,1.80,-5.0,3.2,1.92,2.7,m.plaster,station,true);
for(const x of [-6.95,-5.4,-3.85])box(x,1.80,-3.63,.075,1.92,.07,m.woodDark,station);
for(const y of [.92,2.10,2.73])box(-5.4,y,-3.62,3.16,.07,.075,m.woodDark,station);
for(let z=-6.2;z<-3.6;z+=.58)box(-7.025,1.80,z,.055,1.90,.055,m.woodDark,station);
for(const y of [.92,2.10,2.73])box(-7.03,y,-5.0,.065,.06,2.65,m.woodDark,station);
box(-6.24,1.62,-3.58,.98,1.34,.08,m.wood,station,true);
box(-6.24,1.80,-3.53,.82,.90,.025,m.window,station);
for(const dx of [-.24,0,.24])box(-6.24+dx,1.80,-3.51,.03,.90,.025,m.woodDark,station);
box(-4.55,1.85,-3.58,1.08,.72,.085,m.wood,station,true);box(-4.55,1.85,-3.52,.94,.59,.025,m.window,station);
box(-4.55,1.85,-3.50,.035,.59,.025,m.woodDark,station);box(-4.55,1.43,-3.48,1.25,.09,.28,m.woodDark,station);
roof(-5.4,2.86,-5.0,3.75,3.13,.78,m.roof,station,true);
sign('さくら坂',-5.45,2.42,-3.56,1.18,.28,station);
for(let i=0;i<3;i++)box(-5.3,.24+i*.24,-7.22+i*.34,1.45,.24,.45,m.stoneLight,station,true);
// A timetable case, bicycle and a flower pot make the otherwise empty station lived-in.
box(1.75,2.03,-4.12,1.13,.92,.11,m.woodDark,platform,true);
for(const [x,y,c] of [[1.48,2.08,m.window],[1.87,2.08,m.red],[1.48,1.77,m.stoneLight],[1.87,1.77,m.window]])box(x,y,-4.048,.30,.28,.025,c,platform);
for(const x of [1.3,2.2])rod([x,.14,-4.12],[x,2.56,-4.12],.03,m.woodDark,platform);
const backClock=mesh(new THREE.CylinderGeometry(.18,.18,.05,24),m.plaster,1.75,2.60,-4.03,platform);backClock.rotation.x=Math.PI/2;
ring(1.75,2.60,-3.99,.18,.017,m.roofDark,platform);
rod([1.75,2.60,-3.95],[1.82,2.70,-3.95],.008,m.roofDark,platform);
const bike=new THREE.Group();bike.position.set(-7.45,.15,-4.1);bike.rotation.set(.12,Math.PI/2,0);scenery.add(bike);
for(const x of [-.42,.48]){ring(x,.29,0,.26,.026,m.metalDark,bike);for(let j=0;j<8;j++){const a=j/8*Math.PI*2;rod([x,.29,0],[x+Math.cos(a)*.24,.29+Math.sin(a)*.24,0],.005,m.metal,bike)}}
const bp=[[-.42,.29,0],[-.13,.69,0],[.10,.29,0],[.35,.72,0],[.48,.29,0]];
for(const [a,b] of [[0,1],[0,2],[1,2],[1,3],[2,3],[3,4]])rod(bp[a],bp[b],.018,m.roof,bike);
box(-.13,.77,0,.23,.045,.13,m.woodDark,bike);rod([.35,.72,0],[.33,.91,0],.018,m.metalDark,bike);rod([.33,.91,-.12],[.33,.91,.12],.02,m.metalDark,bike);

// Small village roofs and a vegetable patch echo the corners of the reference.
function cottage(name,x,z,w,d,roofMat){
 const g=new THREE.Group();g.name=name;scenery.add(g);
 box(x,.24,z,w+.1,.24,d+.1,m.stone,g,true);box(x,1.06,z,w,1.4,d,m.plaster,g,true);
 box(x,.51,z+d/2+.025,w,.32,.05,m.woodDark,g);
 for(const dx of [-w*.45,w*.45])box(x+dx,1.06,z+d/2+.035,.065,1.40,.06,m.wood,g);
 box(x-.36,1.05,z+d/2+.045,.55,.76,.035,m.wood,g,true);box(x+.42,1.25,z+d/2+.04,.50,.48,.035,m.window,g,true);
 box(x+.42,1.25,z+d/2+.065,.025,.48,.02,m.wood,g);
 roof(x,1.82,z,w+.35,d+.35,.64,roofMat,g,false);
}
cottage('blue-roof-village-house',-5.25,6.7,2.65,2.35,m.roof);
cottage('brown-roof-village-house',-1.67,6.9,2.3,2.0,m.brownRoof);
cottage('small-garden-shed',7.0,7.55,1.65,1.55,m.roofDark);
box(6.65,.19,-4.52,2.9,.14,2.25,m.soil,scenery,true);
for(let row=0;row<5;row++){
 const z=-5.36+row*.41;box(6.65,.28,z,2.69,.10,.19,m.woodDark);
 for(let j=0;j<7;j++){
  const x=5.5+j*.38;
  ell(x,.36,z,.13,.09,.12,j%3?m.green:m.yellow);
  for(let k=0;k<3;k++)ell(x+Math.cos(k*2.09)*.075,.41,z+Math.sin(k*2.09)*.075,.08,.04,.07,m.greenDark);
 }
}
for(const x of [5.20,8.10])rod([x,.12,-5.65],[x,.82,-5.65],.025,m.woodDark);
for(const z of [-5.65,-3.39])rod([5.20,.63,z],[8.10,.63,z],.025,m.woodDark);
// Light fences give the foreground a tidy rural rhythm.
for(let x=-6.8;x<2.1;x+=.60){rod([x,.12,1.78],[x,.94,1.78],.025,m.metal);}
for(const y of [.40,.75])rod([-6.8,y,1.78],[2.1,y,1.78],.025,m.metal);

// Slender utility poles, insulators, sagging feeders and a straight contact wire.
for(const x of [-5.2,-.2,5.45]){
 rod([x,.12,1.52],[x,4.7,1.52],.075,m.stone,scenery,.055);
 box(x,3.90,1.50,.26,.12,.30,m.metalDark);
 rod([x,4.22,-.22],[x,4.22,1.83],.035,m.metalDark);
 rod([x,3.62,1.52],[x,4.19,.16],.025,m.metal);
 for(const z of [.02,.52,1.13,1.70]){
  rod([x,4.23,z],[x,4.4,z],.025,m.metalDark);
  for(let j=0;j<3;j++)ell(x,4.28+j*.045,z,.055,.018,.055,m.cream);
 }
 tube([[x,4.17,.02],[x,3.74,.02],[x,3.55,0]],.012,m.metalDark);
}
rod([-9,3.55,0],[9,3.55,0],.009,m.metalDark);
for(const [a,b] of [[-9,-5.2],[-5.2,-.2],[-.2,5.45],[5.45,9]]){
 for(const z of [.02,.52,1.13,1.70])tube([[a,4.39,z],[(a+b)/2,4.05,z],[b,4.39,z]],.009,m.metalDark,scenery,15);
}
// Road warning lights are world objects; there is no screen interface.
const crossings=[];
for(const [x,z,yaw] of [[2.63,-1.92,0],[5.17,1.92,Math.PI]]){
 const g=new THREE.Group();g.name='railway-crossing';g.position.set(x,.12,z);g.rotation.y=yaw;model.add(g);
 box(0,.30,0,.32,.60,.30,m.yellow,g,true);rod([0,.6,0],[0,2.25,0],.045,m.metalDark,g);
 for(let i=0;i<4;i++)box(0,.12+i*.15,.157,.30,.065,.016,m.metalDark,g);
 for(const angle of [-Math.PI/4,Math.PI/4]){const cross=box(0,2.17,.02,.83,.085,.07,m.yellow,g,true);cross.rotation.z=angle;}
 const lamps=[];
 for(const dx of [-.19,.19]){
  const mat=new THREE.MeshBasicMaterial({color:0x9a6573});
  const lens=mesh(new THREE.CylinderGeometry(.115,.115,.07,16),mat,dx,1.79,.16,g);lens.rotation.x=Math.PI/2;
  const hood=ring(dx,1.79,.196,.129,.025,m.metalDark,g);
  lamps.push(mat);
 }
 const arm=new THREE.Group();arm.name='crossing-boom';arm.position.set(0,1.0,0);g.add(arm);
 rod([-.25,0,0],[2.47,0,0],.037,m.metalDark,arm);
 for(let i=0;i<8;i++)box(.12+i*.32,0,0,.31,.12,.10,i%2?m.red:m.cream,arm,true);
 box(-.26,-.03,0,.25,.25,.24,m.metalDark,arm);
 crossings.push({g,arm,lamps});
}
const railSignal=new THREE.Group();railSignal.name='rail-signal';railSignal.position.set(-6.1,.12,1.15);scenery.add(railSignal);
rod([0,0,0],[0,2.25,0],.04,m.metal,railSignal);
box(0,1.88,0,.35,.94,.24,m.black,railSignal,true);
const railLenses=[];
for(let i=0;i<3;i++){
 const mat=new THREE.MeshBasicMaterial({color:[0xa36f7b,0xaaa16a,0x85cf9b][i]});
 const o=mesh(new THREE.CylinderGeometry(.10,.10,.05,16),mat,0,2.17-i*.28,.15,railSignal);o.rotation.x=Math.PI/2;railLenses.push(mat);
}
// A short green-and-cream local railcar only appears during part of the loop.
const train=new THREE.Group();train.name='local-railcar';model.add(train);
const clip=[new THREE.Plane(v(1,0,0),8.85),new THREE.Plane(v(-1,0,0),8.85)];
const trainMat={};
for(const [key,mat] of Object.entries({cream:m.plaster,green:m.greenDark,roof:m.roofLight,glass:m.window,dark:m.metalDark,steel:m.rail})){const clone=mat.clone();clone.clippingPlanes=clip;clone.clipShadows=true;trainMat[key]=clone;}
box(0,1.22,0,3.6,1.03,1.25,trainMat.cream,train);
box(0,.93,0,3.63,.26,1.27,trainMat.green,train);
box(0,.69,0,3.1,.15,1.1,trainMat.dark,train);
box(0,1.79,0,3.57,.13,1.24,trainMat.roof,train);
ell(0,1.85,0,1.82,.13,.63,trainMat.roof,train);
for(const z of [-.644,.644]){
 for(let i=0;i<6;i++)box(-1.42+i*.57,1.40,z,.41,.40,.025,trainMat.glass,train);
 for(const x of [-1.07,1.07]){box(x,1.24,z,.37,.82,.024,trainMat.green,train);box(x,1.43,z+(z>0?.014:-.014),.27,.34,.018,trainMat.glass,train);}
 box(0,1.66,z,3.55,.035,.025,trainMat.green,train);
}
for(const x of [-1.815,1.815]){
 box(x,1.41,0,.025,.44,1.03,trainMat.glass,train);box(x,1.41,0,.037,.44,.04,trainMat.cream,train);
 for(const z of [-.4,.4])ell(x,1.03,z,.025,.07,.09,trainMat.cream,train);
 box(x,.75,0,.10,.09,.85,trainMat.dark,train);
}
const wheels=[];
for(const x of [-1.12,1.12])for(const z of [-.60,.60]){
 const pivot=new THREE.Group();pivot.position.set(x,.61,z);train.add(pivot);
 const wheel=mesh(new THREE.CylinderGeometry(.19,.19,.095,14),trainMat.dark,0,0,0,pivot);wheel.rotation.x=Math.PI/2;
 const hub=mesh(new THREE.CylinderGeometry(.085,.085,.102,10),trainMat.steel,0,0,0,pivot);hub.rotation.x=Math.PI/2;wheels.push(pivot);
}
rod([-.50,1.95,0],[.15,2.70,0],.018,trainMat.dark,train);rod([.65,1.95,0],[.15,2.70,0],.018,trainMat.dark,train);
rod([.15,2.70,0],[-.24,3.45,0],.018,trainMat.dark,train);rod([.15,2.70,0],[.40,3.45,0],.018,trainMat.dark,train);
rod([.09,3.53,-.31],[.09,3.53,.31],.024,trainMat.dark,train);

// Pink blossom clouds use faceted volumes with very fine silhouette outlines.
const blossomOutline=new THREE.MeshBasicMaterial({color:0xb397aa,side:THREE.BackSide});
const crowns=[];
function cherry(x,z,h,spread,phase){
 rod([x,.12,z],[x+.04,h*.73,z],.13,m.woodDark,scenery,.085);
 for(let i=0;i<5;i++){
  const a=i/5*Math.PI*2;
  tube([[x,h*.48,z],[x+Math.cos(a)*spread*.25,h*.80,z+Math.sin(a)*spread*.25],[x+Math.cos(a)*spread*.58,h+.20,z+Math.sin(a)*spread*.58]],.045,m.woodDark);
  tube([[x,.23,z],[x+Math.cos(a)*.25,.14,z+Math.sin(a)*.25],[x+Math.cos(a)*.4,.13,z+Math.sin(a)*.4]],.035,m.woodDark);
 }
 const crown=new THREE.Group();crown.name='cherry-blossom-crown';crown.position.set(x,h+.35,z);model.add(crown);
 const blooms=[];
 for(let i=0;i<17;i++){
  const a=R(0,Math.PI*2),r=R(0,spread*.66),s=R(.48,.74);
  blooms.push({p:[Math.cos(a)*r,R(-.35,.6),Math.sin(a)*r],s:[s,s*R(.85,1.15),s],r:[R(-.2,.2),R(0,6.28),R(-.2,.2)],color:pick(pinks)});
 }
 for(let i=0;i<13;i++){
  const a=R(0,Math.PI*2),r=R(spread*.55,spread*.85),s=R(.20,.34);
  blooms.push({p:[Math.cos(a)*r,R(-.1,.75),Math.sin(a)*r],s:[s,s,s],r:[0,R(0,6.28),0],color:pick(pinks)});
 }
 const outlines=blooms.map(a=>({...a,s:a.s.map(s=>s*1.018)}));
 const hull=instances(geo.blossom,blossomOutline,outlines,crown,false);hull.receiveShadow=false;
 instances(geo.blossom,foliage,blooms,crown,true);
 crowns.push({g:crown,phase});
}
cherry(-7.6,-7.0,3.05,1.35,.2);
cherry(-1.9,-7.15,3.7,1.6,1.1);
cherry(1.8,-6.6,2.7,1.2,2.3);
cherry(7.25,-7.35,3.0,1.35,3.0);
cherry(6.7,3.35,3.0,1.55,3.7);
cherry(1.0,4.7,2.5,1.35,4.5);
cherry(-5.7,4.25,2.25,1.1,5.1);
cherry(-.15,8.1,1.95,.95,5.8);
function grassy(x,z){
 if(Math.abs(z)<1.40)return false;
 if(Math.abs(x)>6.8&&Math.abs(z)<2.9)return false;
 if(x>-6.8&&x<2.7&&z>-4.15&&z<-1.1)return false;
 if(x>-7.35&&x<-3.4&&z>-6.65&&z<-3.4)return false;
 if(x>2.7&&x<5.1)return false;
 if(x>2.7&&z>4.8&&z<7.1)return false;
 if(x>5.1&&x<8.2&&z>-5.8&&z<-3.25)return false;
 if((x>-6.9&&x<-3.6&&z>5.25&&z<8.1)||(x>-3&&x<-.3&&z>5.7&&z<8.2)||(x>6&&z>6.5))return false;
 return true;
}
const grass=[];
for(let i=0;i<2300;i++){
 const x=R(-8.8,8.8),z=R(-8.8,8.8);if(!grassy(x,z))continue;
 for(let j=0;j<4;j++)grass.push({p:[x+R(-.09,.09),.125,z+R(-.09,.09)],s:[R(.35,.70),R(.40,.90),1],r:[0,R(0,6.28),R(-.2,.2)],color:pick(greens)});
}
instances(geo.leaf,foliage,grass,scenery,false);
const flowers=[];
for(let i=0;i<370;i++){
 const x=R(-8.7,8.7),z=R(-8.7,8.7);if(!grassy(x,z))continue;
 const h=R(.12,.25);rod([x,.12,z],[x,.12+h,z],.005,m.green);
 for(let k=0;k<4;k++){const a=k/4*Math.PI*2;flowers.push({p:[x+Math.cos(a)*.026,.12+h,z+Math.sin(a)*.026],s:[.03,.015,.03],color:new THREE.Color(pick(['#fff3cc','#f1d4e5','#f9f8e3']))});}
}
instances(geo.rock,foliage,flowers,scenery,false);
const shrubs=[];
for(const [x,z] of [[-8.2,4.4],[-3.8,8.3],[.9,7.4],[8.2,4.3],[2.0,-5.4],[-7.8,-7.8]])for(let i=0;i<4;i++)shrubs.push({p:[x+R(-.25,.25),.27,z+R(-.2,.2)],s:[R(.15,.28),R(.12,.23),R(.15,.28)],r:[0,R(0,6),0],color:pick(greens)});
instances(geo.blossom,foliage,shrubs);
// Merge immobile geometry and linework, retaining the moving railcar and signals.
scenery.updateMatrixWorld(true);
const batches=new Map(),lines=[],remove=[];
scenery.traverse(o=>{
 if(o.isLineSegments){lines.push(o.geometry.clone().applyMatrix4(o.matrixWorld));remove.push(o);return;}
 if(!o.isMesh||o.isInstancedMesh||o.material.transparent)return;
 // Rail signal lens materials remain independent so the aspect can change.
 if(railLenses.includes(o.material))return;
 const key=o.material.uuid;if(!batches.has(key))batches.set(key,{mat:o.material,gs:[]});
 const g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
 batches.get(key).gs.push(g);remove.push(o);
});
for(const o of remove)o.removeFromParent();
for(const {mat,gs} of batches.values()){
 const converted=gs.map(g=>g.index?g.toNonIndexed():g),merged=mergeGeometries(converted,false);if(!merged)throw new Error('Failed to batch station geometry');
 mesh(merged,mat);gs.forEach(g=>g.dispose());converted.forEach(g=>g.dispose());
}
if(lines.length){const g=mergeGeometries(lines,false);scenery.add(new THREE.LineSegments(g,edgeMaterial));lines.forEach(g=>g.dispose());}
const petalData=Array.from({length:170},()=>({x:R(-8.5,8.0),z:R(-8.5,8.0),phase:R(0,1),size:R(.28,.62),angle:R(0,6.28)}));
const airborne=new THREE.InstancedMesh(geo.petal,foliage,petalData.length);airborne.name='drifting-cherry-petals';airborne.frustumCulled=false;airborne.castShadow=false;airborne.receiveShadow=false;model.add(airborne);
petalData.forEach((p,i)=>airborne.setColorAt(i,pick(pinks)));
function updatePetals(t){
 petalData.forEach((p,i)=>{const f=(t*.035+p.phase)%1;dummy.position.set(p.x+Math.sin(t*.4+p.angle)*.24+f*.5,.18+(1-f)*6.2,p.z+f*.28);dummy.scale.setScalar(p.size);dummy.rotation.set(t*.5+p.angle,p.angle+t*.3,Math.sin(t+p.angle)*.7);dummy.updateMatrix();airborne.setMatrixAt(i,dummy.matrix)});airborne.instanceMatrix.needsUpdate=true;
}
function updateRailway(t){
 const phase=t%32;
 let closed;if(phase<6)closed=0;else if(phase<9){const u=(phase-6)/3;closed=u*u*(3-2*u)}else if(phase<22)closed=1;else if(phase<25){const u=(phase-22)/3;closed=1-u*u*(3-2*u)}else closed=0;
 const warning=phase>=6&&phase<25;
 crossings.forEach(({arm,lamps},i)=>{arm.rotation.z=(1-closed)*Math.PI*.48;lamps.forEach((mat,j)=>mat.color.setHex(warning&&Math.floor(t*3+i+j)%2===0?0xed7481:0x9a6573))});
 const x=-12+(phase-9)*2;
 train.position.x=x;train.visible=phase>=9&&phase<=21&&x>-10.9&&x<10.9;
 wheels.forEach(o=>o.rotation.z=-t*8);
 railLenses[0].color.setHex(closed>.999?0x956776:0xe17c8a);railLenses[2].color.setHex(closed>.999?0x91dfab:0x65866e);
 train.userData.crossingProtected=closed>.999;
}
function animate(t){
 crowns.forEach(({g,phase})=>{g.rotation.z=Math.sin(t*.43+phase)*.007;g.rotation.x=Math.sin(t*.37+phase)*.004});
 updatePetals(t);updateRailway(t);
}
animate(0);
let start=null;
const expandedWorld=expandWorld({kind:'sakura',scene,model,camera,controls,renderer,preview,reduced});
function renderFrame(ms){
 expandedWorld.update(ms*.001);if(start===null)start=ms;controls.update();if(!preview&&!reduced)animate((ms-start)*.001);renderer.render(scene,camera);}
installSceneCapture({kind:'sakura',camera,controls,renderer,preview,render:()=>renderFrame(preview?0:performance.now(),true)});
if(preview){renderFrame(0)}else{renderer.setAnimationLoop(renderFrame)}
addEventListener('resize',()=>{const aspect=innerWidth/innerHeight,factor=fit(aspect)/fit(camera.aspect);camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);camera.aspect=aspect;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,preview?.85:1.8));if(preview)renderFrame(0);});
