import {expandWorld,expandedFit} from './world-expansion.js';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {Reflector} from 'three/addons/objects/Reflector.js';

const params=new URLSearchParams(location.search);
const preview=params.has('preview');
const BASE=32,HALF=BASE/2,BATH_LIFT=2.0,STREAM_Y=.98,nightUniform={value:0},warmLights=[];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const iw=Math.max(1,innerWidth),ih=Math.max(1,innerHeight);
const scene=new THREE.Scene();
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,preview?.85:1.6));renderer.setSize(iw,ih);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate=!preview&&!reduced;renderer.shadowMap.needsUpdate=true;
document.body.appendChild(renderer.domElement);renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','山中的温泉旅馆微缩景观，可以拖拽旋转和缩放');
const camera=new THREE.PerspectiveCamera(33,iw/ih,.4,420);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,6.0,0);controls.enableDamping=!reduced;controls.dampingFactor=.065;controls.enabled=!preview;controls.enablePan=false;
controls.minDistance=42;controls.maxDistance=300;controls.minPolarAngle=.24;controls.maxPolarAngle=Math.PI*.445;
const fit=a=>expandedFit(a),distance=fit(camera.aspect);camera.position.set(distance*.62,6.0+distance*.74,distance*.85);camera.lookAt(controls.target);
const skyLight=new THREE.HemisphereLight('#d8f2ee','#667652',1.73);skyLight.name='onsen-sky-light';scene.add(skyLight);
const sun=new THREE.DirectionalLight('#ffe1a1',3.0);sun.name='onsen-key-light';sun.position.set(-24,44,20);sun.castShadow=true;sun.shadow.mapSize.set(preview?1024:2048,preview?1024:2048);Object.assign(sun.shadow.camera,{left:-29,right:29,top:30,bottom:-29,near:.5,far:110});sun.shadow.normalBias=.035;sun.shadow.bias=-.00013;sun.shadow.radius=2;scene.add(sun);
const fill=new THREE.DirectionalLight('#b1d9d6',.47);fill.position.set(10,12,-6);scene.add(fill);
const model=new THREE.Group();model.name='onsen-miniature';model.userData.baseSize=BASE;scene.add(model);
const scenery=new THREE.Group();scenery.name='onsen-static-landscape';model.add(scenery);
let seed=329987;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const R=(a,b)=>a+random()*(b-a),pick=a=>a[Math.floor(random()*a.length)],v=(x,y,z)=>new THREE.Vector3(x,y,z);
const ramp=new THREE.DataTexture(new Uint8Array([87,132,183,224,255]),5,1,THREE.RedFormat);ramp.minFilter=ramp.magFilter=THREE.NearestFilter;ramp.needsUpdate=true;
const toon=(color,extra={})=>new THREE.MeshToonMaterial({color,gradientMap:ramp,...extra});
const m={soil:toon('#76654e'),clay:toon('#9d8d65'),soilDark:toon('#5b5745'),grass:toon('#789b64'),moss:toon('#698852'),mossLight:toon('#90aa62'),stone:toon('#8b9692'),stoneLight:toon('#b6b8a6'),stoneDark:toon('#657c76'),sand:toon('#bfc6a3'),wood:toon('#a77f53'),woodLight:toon('#c3a170'),woodDark:toon('#6c503d'),beam:toon('#805c43'),plaster:toon('#e1d7b9'),roof:toon('#526f73'),roofLight:toon('#6a8683'),roofDark:toon('#40575f'),white:toon('#e5dec6'),shoji:toon('#f2dfae',{emissive:'#cf832b',emissiveIntensity:.15}),tatami:toon('#b6be8c'),tatamiEdge:toon('#748774'),teal:toon('#4d807c'),indigo:toon('#506c83'),red:toon('#ac6651'),gold:toon('#cba457'),bamboo:toon('#a8aa74'),bambooDark:toon('#737e56'),leaf:toon('#4e8266'),leafLight:toon('#719b70'),pine:toon('#3f715f'),pineLight:toon('#639077'),maple:toon('#c18b4d'),mapleLight:toon('#e0b56b'),mapleRed:toon('#b97b56'),water:new THREE.MeshBasicMaterial({color:'#a4dfd3',transparent:true,opacity:.58,depthWrite:false}),light:new THREE.MeshBasicMaterial({color:new THREE.Color('#ffe0a0').multiplyScalar(1.2),toneMapped:false})};
const geo={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.SphereGeometry(1,12,8),rock:new THREE.IcosahedronGeometry(1,1),crown:new THREE.IcosahedronGeometry(1,2)};
const lines=new THREE.LineBasicMaterial({color:'#435b58',transparent:true,opacity:.37,depthWrite:false});
function mesh(g,mat,x=0,y=0,z=0,parent=scenery){const o=new THREE.Mesh(g,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function box(x,y,z,w,h,d,mat,parent=scenery,outline=false){const o=mesh(geo.box,mat,x,y,z,parent);o.scale.set(w,h,d);if(outline){const l=new THREE.LineSegments(new THREE.EdgesGeometry(geo.box),lines);l.scale.setScalar(1.0015);o.add(l)}return o}
function ell(x,y,z,sx,sy,sz,mat,parent=scenery,faceted=false){const o=mesh(faceted?geo.rock:geo.sphere,mat,x,y,z,parent);o.scale.set(sx,sy,sz);return o}
function rod(a,b,r,mat,parent=scenery,rTop=r){const from=v(...a),to=v(...b),delta=to.clone().sub(from);const o=mesh(new THREE.CylinderGeometry(rTop,r,delta.length(),9),mat,0,0,0,parent);o.position.copy(from.add(to).multiplyScalar(.5));o.quaternion.setFromUnitVectors(v(0,1,0),delta.normalize());return o}
function tube(ps,r,mat,parent=scenery,segments=22){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ps.map(p=>v(...p))),segments,r,5,false),mat,0,0,0,parent)}
function ring(x,y,z,r,t,mat,parent=scenery){return mesh(new THREE.TorusGeometry(r,t,6,28),mat,x,y,z,parent)}
const dummy=new THREE.Object3D();
function instances(g,mat,items,parent=scenery,shadow=true){const o=new THREE.InstancedMesh(g,mat,items.length);items.forEach((a,i)=>{dummy.position.set(...a.p);dummy.scale.set(...(a.s||[1,1,1]));dummy.rotation.set(...(a.r||[0,0,0]));dummy.quaternion.copy(a.q||dummy.quaternion);dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);if(a.c)o.setColorAt(i,new THREE.Color(a.c))});o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o}
function warmLight(x,y,z,day,night,distance){const light=new THREE.PointLight('#ffb956',day,distance,1.5);light.position.set(x,y,z);light.name='onsen-warm-light';light.userData.dayIntensity=day;light.userData.nightIntensity=night*.38;warmLights.push(light);scene.add(light);return light}
function sign(text,x,y,z,w,h,bg,fg,parent=scenery){const c=document.createElement('canvas');c.width=768;c.height=Math.round(768*h/w);const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`500 ${c.height*.65}px "Noto Serif CJK JP","Yu Mincho",serif`;ctx.fillStyle=fg;ctx.fillText(text,c.width/2,c.height*.53,c.width*.90);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return box(x,y,z,w,h,.035,new THREE.MeshToonMaterial({map:texture,gradientMap:ramp}),parent)}
const CX=4.5,CZ=5.0,RX=4.5,RZ=3.25,waterY=.86+BATH_LIFT;
model.userData.bath={x:CX,z:CZ,rx:RX,rz:RZ,waterY};
const streamZ=x=>10.2+.36*Math.sin(x*.48);
// A sloping mountainside is cut into three inhabited benches, not a flat lawn.
function landY(x,z){
 let y=.48+(HALF-z)*.23+.16*Math.sin(x*.65+z*.36)+.11*Math.cos(z*.9-x*.4);
 y+=3.15*Math.exp(-(((z+13.3)/2.2)**2))*(.65+.35*Math.cos(x*.48))+.65*Math.max(0,(Math.abs(x)-11)/5);
 if(x>-7.0&&x<2.7&&z>-6.35&&z<1.14)y=4.5;
 if(x>2.55&&x<6.15&&z>-6.55&&z<-2.35)y=5.3;
 if(x>-7.2&&x<6.3&&z>=1.14&&z<2.45)y=3.8;
 if(x>-1.3&&x<10.2&&z>1.10&&z<9.20)y=2.1;
 if(x>-10.8&&x<-6.65&&z>.8&&z<5.9)y=3.15;
 if(x>-12.9&&x<-7.5&&z>-8.95&&z<-4.05)y=6.1;
 if(x>6.15&&x<11.5&&z>-10.0&&z<-4.85)y=7.0;
 if(x>8.4&&x<13.65&&z>-2.9&&z<2.1)y=4.3;
 if(x>-4.85&&x<-2.85&&z>1.22&&z<4.1)y=4.35-(z-1.2)*.55;
 if(x>-10.9&&x<-9.5&&z>-3.95&&z<1.10)y=6.25-(z+3.735)*(.17/.27);
 if(x>-4.85&&x<-2.75&&z>=4.1&&z<9.0)y=2.9-(z-4.1)*.20;
 if(x>5.85&&x<7.05&&z>-4.80&&z<=-2.4)y=7.15-(z+4.8)*.83;
 if(x>5.9&&x<7.0&&z>-2.4&&z<1.25)y=5.2-(z+2.4)*.85;
 if(x>-9.6&&x<-7.8&&z>4.7&&z<6.3)y=3.25-(z-4.7)*.4;
 if(x>-HALF+.05&&x<4.4&&Math.abs(z-streamZ(x))<.43)y=STREAM_Y-.15;
 return y;
}
for(const [lo,hi,mat] of [[-1.32,-.55,m.soilDark],[-.55,.07,m.soil]])box(0,(lo+hi)/2,0,BASE,hi-lo,BASE,mat,scenery,true);
// Topography has an actual opening for the deep pool and a shallow stream channel.
const N=112,positions=[],indices=[],colors=[],topColors=[new THREE.Color('#789b64'),new THREE.Color('#8ca474'),new THREE.Color('#6d9164')];
for(let iz=0;iz<=N;iz++)for(let ix=0;ix<=N;ix++){const x=-HALF+BASE*ix/N,z=-HALF+BASE*iz/N;positions.push(x,landY(x,z),z);const c=topColors[(ix+iz)%3];colors.push(c.r,c.g,c.b)}
for(let iz=0;iz<N;iz++)for(let ix=0;ix<N;ix++){const x=-HALF+BASE*(ix+.5)/N,z=-HALF+BASE*(iz+.5)/N;if(((x-CX)/(RX+.12))**2+((z-CZ)/(RZ+.13))**2<1)continue;const a=iz*(N+1)+ix;indices.push(a,a+N+1,a+1,a+1,a+N+1,a+N+2)}
const top=new THREE.BufferGeometry();top.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));top.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));top.setIndex(indices);top.computeVertexNormals();mesh(top,toon('#ffffff',{vertexColors:true})).name='mountain-ground-with-bath-opening';
for(const side of [-1,1])for(const axis of ['x','z']){
 const p=[],idx=[];for(let i=0;i<=N;i++){const a=-HALF+BASE*i/N,x=axis==='x'?side*HALF:a,z=axis==='z'?side*HALF:a;p.push(x,.07,z,x,landY(x,z),z);if(i<N){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2)}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();const mat=m.stoneDark.clone();mat.side=THREE.DoubleSide;mesh(g,mat);
}
const sideStones=[];for(let i=0;i<180;i++){const side=i%4,a=R(-HALF+.2,HALF-.2),y=R(-1.10,-.08),s=R(.035,.12);sideStones.push({p:[side<2?(side?HALF+.005:-HALF-.005):a,y,side<2?a:side===2?HALF+.005:-HALF-.005],s:[s,R(.035,.095),s],c:pick(['#ada88a','#b9b499','#807e68'])})}instances(geo.rock,toon('#ffffff'),sideStones);
for(const z of [-13.0,-9.4,-5.4,-1.4,4.5,8.4,12.7])for(const x of [-HALF+.04,HALF-.04]){
 const end=x>0?HALF-.01:-HALF+.01,y=landY(x,z);
 tube([[x,y,z],[end,y-.45,z+.18],[end,y-1.02,z+.30],[x*.998,y-1.65,z+.21]],.026,m.woodDark);
}
const cliffInclusions=[];for(let i=0;i<120;i++){const side=i%3,z=R(-15.7,15.7),x=side===0?-HALF-.006:side===1?HALF+.006:R(-15.7,15.7),zz=side===2?-HALF-.006:z,h=landY(x,zz),r=R(.06,.17);cliffInclusions.push({p:[x,R(.25,Math.max(.35,h-.25)),zz],s:[r,r*.65,r],c:pick(['#a0a695','#7f9185','#b4b7a0'])})}instances(geo.rock,toon('#ffffff'),cliffInclusions);

const ground=mesh(new THREE.PlaneGeometry(180,180),new THREE.ShadowMaterial({opacity:.14}),0,-1.36,0,scene);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
// The timber inn rests on a stone foundation; the entire front has real rooms.
const inn=new THREE.Group();inn.name='mountain-ryokan';inn.position.y=4.1;scenery.add(inn);
const houseX=-2.0,houseZ=-3.2;
box(houseX,.55,houseZ,8.5,.32,5.3,m.stone,inn,true);
for(let x=-6.1;x<2.3;x+=.52)for(const z of [-5.86,-.55])box(x,.57,z,.46,.23,.10,m.stoneLight,inn);
box(houseX,.78,houseZ,8.46,.14,5.26,m.woodDark,inn,true);
box(houseX,2.91,houseZ,8.60,.20,5.40,m.beam,inn,true);
box(houseX,4.75,houseZ,8.60,.18,5.40,m.beam,inn,true);
box(houseX,1.82,-5.82,8.45,1.96,.12,m.plaster,inn);
box(houseX,3.81,-5.82,8.45,1.65,.12,m.plaster,inn);
for(const x of [-6.19,2.19]){box(x,1.82,houseZ,.14,1.96,5.2,m.plaster,inn);box(x,3.81,houseZ,.14,1.65,5.2,m.plaster,inn)}
for(const x of [-6.21,-3.38,-.58,2.21])for(const z of [-5.82,-.59])box(x,2.75,z,.15,4.05,.15,m.beam,inn,true);
for(const y of [1.13,2.68,3.20,4.52])box(-2.0,y,-.53,8.5,.09,.12,m.beam,inn);
// Deep front veranda with narrow floorboards, shoes and a bench.
box(houseX,.72,.12,9.10,.18,1.34,m.woodDark,inn,true);
for(let i=0;i<46;i++)box(-6.42+i*.195,.83,.12,.18,.065,1.32,i%5?m.wood:m.woodLight,inn);
for(const x of [-6.35,-3.4,-.6,2.35])rod([x,.35,.65],[x,2.73,.65],.055,m.beam,inn);
for(let i=0;i<4;i++)box(-3.83,.43+i*.085,1.24-i*.18,2.0,.17,.45,m.stoneLight,inn,true);
box(-5.60,1.11,.34,1.28,.11,.43,m.wood,inn);for(const x of [-6.07,-5.13])box(x,.94,.34,.07,.28,.35,m.woodDark,inn);
for(const x of [-4.29,-4.03,-3.76,-3.49])ell(x,.915,.35,.095,.045,.16,m.woodDark,inn);
// Tatami, tea tables, cushions and an entry/reception corner.
for(const floor of [.87,3.03])for(const x of [-4.77,-1.96,.86]){
 for(const [dx,dz] of [[-.56,-.8],[.56,-.8],[-.56,.65],[.56,.65]]){box(x+dx,floor,-3.04+dz,1.06,.045,1.37,m.tatami,inn);box(x+dx-.50,floor+.028,-3.04+dz,.038,.012,1.36,m.tatamiEdge,inn)}
}
for(const x of [-3.4,-.6]){box(x,1.81,-3.58,.07,1.94,4.45,m.plaster,inn);box(x,3.81,-3.58,.07,1.62,4.45,m.plaster,inn);for(const y of [1.15,2.61,3.27,4.49])box(x,y,-3.58,.10,.07,4.45,m.beam,inn)}
for(const x of [-1.95,.85]){
 box(x,1.21,-1.89,1.32,.095,.84,m.wood,inn,true);for(const dx of [-.51,.51])for(const dz of [-.29,.29])box(x+dx,1.04,-1.89+dz,.06,.28,.06,m.beam,inn);
 for(const z of [-2.76,-1.06])box(x,.94,z,.65,.12,.56,m.teal,inn,true);
 ell(x-.24,1.33,-1.85,.13,.13,.13,m.indigo,inn);tube([[x-.19,1.34,-1.85],[x-.05,1.39,-1.83],[x+.01,1.41,-1.83]],.023,m.indigo,inn);
 for(const dx of [.17,.40]){mesh(new THREE.CylinderGeometry(.055,.045,.075,12),m.white,x+dx,1.30,-1.78,inn);const saucer=mesh(new THREE.CylinderGeometry(.095,.095,.015,14),m.woodLight,x+dx,1.26,-1.78,inn);saucer.castShadow=false;}
}
box(-4.9,1.23,-1.95,1.82,.69,.57,m.wood,inn,true);box(-4.9,1.61,-1.95,1.95,.08,.66,m.woodDark,inn);
for(const x of [-5.45,-4.9,-4.35])box(x,1.33,-1.65,.46,.34,.025,m.woodLight,inn);box(-5.04,1.69,-1.94,.53,.07,.37,m.indigo,inn);box(-4.44,1.69,-1.94,.22,.08,.20,m.white,inn);
// Upstairs futons, pillows, trays and a scroll sit behind partly opened shoji.
for(const x of [-4.75,-1.95,.88]){
 box(x,3.13,-3.64,1.30,.16,2.00,m.white,inn,true);box(x,3.25,-3.31,1.32,.13,1.45,x<-.8?m.teal:m.indigo,inn);box(x,3.29,-4.29,.82,.17,.35,m.white,inn);
 for(const dz of [-.48,-.18,.12,.42])box(x,3.322,-3.31+dz,1.20,.012,.025,m.tatamiEdge,inn);
 box(x+.60,3.26,-1.90,.50,.12,.65,m.wood,inn);box(x+.60,3.34,-1.90,.25,.045,.29,m.gold,inn);
 box(x,3.94,-5.72,.53,.93,.025,m.white,inn);box(x,3.94,-5.69,.025,.48,.012,m.indigo,inn);
 for(const y of [3.48,4.40])rod([x-.31,y,-5.68],[x+.31,y,-5.68],.025,m.woodDark,inn);
}
function shoji(x,y,z,w,h,mat,parent=inn){box(x,y,z,w,h,.055,mat,parent);for(const dx of [-w/2,w/2])box(x+dx,y,z+.035,.045,h+.07,.055,m.beam,parent);for(const dy of [-h/2,h/2])box(x,y+dy,z+.035,w+.04,.045,.055,m.beam,parent);for(let i=1;i<4;i++)box(x-w/2+w*i/4,y,z+.037,.018,h,.028,m.wood,parent);for(let i=1;i<5;i++)box(x,y-h/2+h*i/5,z+.038,w,.018,.028,m.wood,parent)}
for(const x of [-5.70,-2.88,-.05]){shoji(x,1.88,-.48,.79,1.62,m.shoji);shoji(x,3.86,-.48,.79,1.45,m.shoji)}
for(const x of [-6.13,-3.31,-.49,2.18])box(x,3.78,-.48,.07,1.66,.10,m.beam,inn);
// Timber-framed side windows keep the gable facade detailed when orbiting.
for(const y of [1.13,2.68,3.20,4.52])box(2.282,y,-3.2,.065,.09,5.18,m.beam,inn);
for(const z of [-5.78,-3.20,-.62])box(2.282,2.75,z,.075,4.04,.09,m.beam,inn);
for(const y of [1.91,3.86]){
 const window=new THREE.Group();window.position.set(2.32,y,-3.2);window.rotation.y=Math.PI/2;inn.add(window);
 shoji(0,0,0,1.50,y<3?1.04:.94,m.shoji,window);
 box(0,(y<3?.60:.55),.10,1.76,.065,.35,m.woodDark,window,true);
}
for(const z of [-6.25,.0])rod([2.55,4.79,z],[2.55,6.30,-3.2],.055,m.beam,inn);
rod([2.55,4.82,-3.2],[2.55,6.30,-3.2],.055,m.beam,inn);
for(const [x,y,z] of [[-1.8,2.32,-1.85],[-1.8,4.10,-2.5],[-4.8,2.25,-2.3]]){
 warmLight(x,y+inn.position.y,z,.7,7.0,6.5);
}
// Upper balcony has fine balusters and a visible projecting edge.
box(houseX,3.00,-.02,8.72,.13,1.1,m.woodDark,inn,true);for(let i=0;i<44;i++)box(-6.20+i*.197,3.086,-.02,.18,.034,1.06,m.wood,inn);
for(const y of [3.23,3.72])box(houseX,y,.54,8.78,.07,.07,m.woodDark,inn);for(let x=-6.28;x<2.4;x+=.22)box(x,3.49,.54,.028,.48,.04,m.beam,inn);
for(const x of [-6.32,2.32]){box(x,3.45,.06,.08,.65,1.0,m.beam,inn);box(x,3.76,.06,.12,.06,1.03,m.woodDark,inn)}
// Entry noren and a small physical wooden nameplate.
rod([-4.75,2.46,-.36],[-3.51,2.46,-.36],.033,m.woodDark,inn);
for(let i=0;i<3;i++)box(-4.56+i*.41,2.18,-.36,.385,.51,.024,m.indigo,inn);
sign('♨',-4.15,2.19,-.335,.32,.32,'#506c83','#e4dcc0',inn);
sign('木漏れ日の宿',-.72,2.53,-.40,2.34,.28,'#9d784e','#eee1bb',inn);
// Gabled ceramic roofs, individual barrel tiles and carved ridge end caps.
const roofTiles=[];
function roof(cx,cz,w,dep,eave,ridge,parent=scenery){
 for(const side of [-1,1]){
  const p=[cx-w/2,eave,cz+side*dep/2,cx+w/2,eave,cz+side*dep/2,cx-w/2,ridge,cz,cx+w/2,ridge,cz];const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(side>0?[0,1,2,1,3,2]:[0,2,1,1,2,3]);g.computeVertexNormals();mesh(g,m.roof,0,0,0,parent);
  rod([cx-w/2,eave-.06,cz+side*dep/2],[cx+w/2,eave-.06,cz+side*dep/2],.085,m.roofDark,parent);
  for(const x of [cx-w/2,cx+w/2])rod([x,eave,cz+side*dep/2],[x,ridge+.03,cz],.075,m.woodDark,parent);
  const length=Math.hypot(dep/2,ridge-eave),rows=Math.ceil(length/.44),columns=Math.floor(w/.18);
  const direction=v(0,ridge-eave,-side*dep/2).normalize(),q=new THREE.Quaternion().setFromUnitVectors(v(0,1,0),direction);
  for(let col=0;col<=columns;col++)for(let row=0;row<rows;row++){const t=(row+.50)/rows,x=cx-w/2+.04+col*(w-.08)/columns,y=THREE.MathUtils.lerp(eave,ridge,t)+.045,z=THREE.MathUtils.lerp(cz+side*dep/2,cz,t);roofTiles.push({p:[x,y+parent.position.y,z],s:[1,length/rows/.44,1],q,c:pick(['#5d7a7b','#607e7c','#587574','#6a8581'])})}
 }
 box(cx,ridge+.08,cz,w+.24,.14,.16,m.roofDark,parent,true);
 for(const x of [cx-w/2-.08,cx+w/2+.08]){ell(x,ridge+.15,cz,.16,.17,.13,m.roofLight,parent,true);const r=ring(x,ridge+.16,cz,.085,.018,m.roofDark,parent);r.rotation.y=Math.PI/2;}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([cx-w/2+.14,eave-.06,cz-dep/2+.12,cx-w/2+.14,eave-.06,cz+dep/2-.12,cx-w/2+.14,ridge-.06,cz],3));g.computeVertexNormals();mesh(g,m.plaster,0,0,0,parent);const g2=g.clone();g2.translate(w-.28,0,0);g2.setIndex([0,2,1]);g2.computeVertexNormals();mesh(g2,m.plaster,0,0,0,parent);
}
roof(-2,-3.2,9.35,6.60,4.79,6.38,inn);
const annex=new THREE.Group();annex.name='ryokan-bathhouse-annex';annex.position.y=4.76;scenery.add(annex);
box(4.14,.71,-4.73,3.65,.34,3.45,m.stone,annex,true);box(4.14,1.87,-4.73,3.48,2.00,3.30,m.plaster,annex,true);
for(const x of [2.45,4.15,5.84])box(x,1.88,-3.04,.13,2.0,.14,m.beam,annex);box(4.14,.96,-3.03,3.49,.16,.13,m.beam,annex);box(4.14,2.77,-3.03,3.49,.16,.13,m.beam,annex);
shoji(3.26,1.87,-2.99,1.45,1.48,m.shoji,annex);shoji(4.99,1.87,-2.99,1.45,1.48,m.shoji,annex);
roof(4.14,-4.73,4.15,3.95,2.99,4.15,annex);
// A new covered tea pavilion occupies the expanded western garden.
const pavilion=new THREE.Group();pavilion.name='forest-tea-pavilion';scenery.add(pavilion);
const PX=-8.7,PZ=2.9,PY=3.40;
box(PX,PY,PZ,3.5,.20,3.5,m.stoneDark,pavilion,true);
for(let i=0;i<20;i++)box(PX-1.61+i*.17,PY+.14,PZ,.156,.07,3.36,m.wood,pavilion);
for(const dx of [-1.48,1.48])for(const dz of [-1.48,1.48]){
 rod([PX+dx,landY(PX+dx,PZ+dz),PZ+dz],[PX+dx,PY+2.4,PZ+dz],.072,m.beam,pavilion);
}
roof(PX,PZ,3.92,3.92,PY+2.46,PY+3.34,pavilion);
for(const dx of [-1.32,1.32]){box(PX+dx,PY+.50,PZ,.42,.12,2.75,m.wood,pavilion);for(const dz of [-1.12,1.12])box(PX+dx,PY+.31,PZ+dz,.08,.33,.30,m.beam,pavilion)}
box(PX,PY+.56,PZ,.92,.11,.92,m.woodDark,pavilion,true);box(PX,PY+.33,PZ,.13,.40,.13,m.beam,pavilion);
ell(PX-.16,PY+.72,PZ,.12,.12,.12,m.indigo,pavilion);for(const dx of [.13,.32])mesh(new THREE.CylinderGeometry(.05,.04,.065,10),m.white,PX+dx,PY+.65,PZ+.12,pavilion);
for(let i=0;i<4;i++)box(PX,PY-.08-i*.14,PZ+1.86+i*.26,1.40,.16,.42,m.stoneLight,pavilion,true);
box(PX,PY+2.13,PZ,.28,.40,.28,m.light,pavilion);warmLight(PX,PY+1.96,PZ,.2,6.5,5.8);
function stoneStep(x,top,z,width,depth,parent=scenery){const grade=landY(x,z);top=Math.max(top,grade+.07);const foot=Math.min(top-.16,grade-.03);return box(x,(top+foot)/2,z,width,top-foot,depth,m.stoneLight,parent,true)}
// Separate lodgings follow the upper mountain benches; a dining house faces the bath.
function guestHouse(name,cx,cz,w,dep,groundLevel,dining=false){
 const g=new THREE.Group();g.name=name;scenery.add(g);const floor=groundLevel+.28,wallH=dining?2.45:2.25;
 box(cx,groundLevel+.08,cz,w+.22,.25,dep+.22,m.stoneDark,g,true);
 box(cx,floor,cz,w,.14,dep,m.woodDark,g,true);
 box(cx,floor+wallH*.5,cz-dep*.5,w,wallH,.12,m.plaster,g);
 for(const x of [cx-w*.5,cx+w*.5])box(x,floor+wallH*.5,cz,.12,wallH,dep,m.plaster,g);
 for(const x of [cx-w*.5,cx,cx+w*.5])for(const z of [cz-dep*.5,cz+dep*.5])box(x,floor+wallH*.5,z,.13,wallH+.10,.13,m.beam,g,true);
 for(const y of [floor+.18,floor+wallH-.12])box(cx,y,cz+dep*.5,w,.10,.12,m.beam,g);
 box(cx,floor-.02,cz+dep*.5+.43,w+.45,.15,.95,m.woodDark,g,true);
 for(let i=0;i<Math.ceil(w/.19);i++)box(cx-w*.5+i*.19,floor+.085,cz+dep*.5+.43,.175,.055,.92,m.wood,g);
 for(const x of [cx-w*.32,cx+w*.18])shoji(x,floor+1.10,cz+dep*.5+.015,.73,1.62,m.shoji,g);
 for(const x of [cx-.86,cx+.86]){
  box(x,floor+.035,cz,1.45,.045,2.35,m.tatami,g);
  if(dining){box(x,floor+.43,cz+.32,1.05,.11,.66,m.wood,g,true);for(const dz of [-.55,.95])box(x,floor+.13,cz+dz,.56,.12,.48,m.teal,g);for(const dx of [-.20,.20])mesh(new THREE.CylinderGeometry(.07,.05,.075,12),m.white,x+dx,floor+.53,cz+.30,g);}
  else{box(x,floor+.14,cz-.28,1.08,.15,1.55,m.white,g);box(x,floor+.25,cz-.10,1.10,.12,1.16,m.teal,g);box(x,floor+.28,cz-.84,.68,.15,.30,m.white,g);}
 }
 roof(cx,cz,w+.50,dep+.64,floor+wallH+.06,floor+wallH+1.15,g);
 if(name!=='hillside-guest-east')for(let i=0;i<(dining?8:18);i++)stoneStep(cx,floor-.02-i*.17,cz+dep*.5+.94+i*.27,1.25,.40,g);
 box(cx,floor+1.92,cz+dep*.5+.33,.22,.32,.22,m.light,g);warmLight(cx,floor+1.55,cz+dep*.5-.25,.18,dining?5.2:4.4,5.4);
 return g;
}
guestHouse('hillside-guest-west',-10.2,-6.6,4.70,3.85,6.1);
guestHouse('hillside-guest-east',8.8,-7.45,4.60,4.10,7.0);
guestHouse('mountain-dining-house',11.0,-.40,4.75,4.0,4.3,true);
const gate=new THREE.Group();gate.name='mountain-entry-gate';scenery.add(gate);const GX=-7.7,GZ=13.40,GY=landY(GX,GZ);
for(const dx of [-1.25,1.25]){box(GX+dx,GY+.10,GZ,.40,.20,.40,m.stoneDark,gate,true);rod([GX+dx,GY+.18,GZ],[GX+dx,GY+2.65,GZ],.09,m.beam,gate);}
box(GX,GY+2.42,GZ,3.20,.18,.22,m.woodDark,gate);roof(GX,GZ,3.75,1.72,GY+2.64,GY+3.24,gate);
sign('山の湯',GX,GY+2.12,GZ+.14,1.05,.38,'#906841','#e3cd9d',gate);
for(const dx of [-1.05,1.05]){box(GX+dx,GY+1.95,GZ+.32,.22,.34,.22,m.light,gate);warmLight(GX+dx,GY+1.72,GZ+.32,.05,2.8,3.2);}
instances(new THREE.CylinderGeometry(.061,.061,.44,7),toon('#ffffff'),roofTiles).name='individual-ceramic-roof-tiles';
for(let i=0;i<17;i++)box(3.9,.76,-2.56+i*.105,2.6,.12,.095,m.wood,annex);for(const x of [2.7,5.1])rod([x,.40,-2.6],[x,.74,-2.6],.065,m.beam,annex);
for(let i=0;i<8;i++)box(5.27+i*.17,5.40,-2.37,.16,.12,.84,m.wood,scenery);
for(const z of [-2.28,-1.65,-1.02])for(const x of [2.8,5.0])rod([x,landY(x,z),z],[x,5.49,z],.055,m.beam,scenery);
// Stone bath: a submerged floor, inner wall, visible pebbles and irregular rim.
const poolFloor=mesh(new THREE.CylinderGeometry(1,1,.075,64),m.sand,CX,.115+BATH_LIFT,CZ);poolFloor.scale.set(RX,1,RZ);poolFloor.name='onsen-submerged-floor';
const poolPebbles=[];for(let i=0;i<175;i++){const a=R(0,6.28),r=Math.sqrt(random())*.91,s=R(.04,.12);poolPebbles.push({p:[CX+Math.cos(a)*RX*r,.18+BATH_LIFT,CZ+Math.sin(a)*RZ*r],s:[s,s*.5,s*R(.8,1.4)],c:pick(['#8dafa1','#c0c7a6','#a6bca4'])})}instances(geo.rock,toon('#ffffff'),poolPebbles);
const rimStones=[];
for(let i=0;i<44;i++){const a=i/44*Math.PI*2,r=1+.045*Math.sin(a*3);const x=CX+Math.cos(a)*(RX+.13)*r,z=CZ+Math.sin(a)*(RZ+.10)*r,h=R(.33,.48);rimStones.push({p:[x,.60+BATH_LIFT+R(-.04,.07),z],s:[R(.40,.63),h,R(.36,.52)],r:[R(-.13,.13),a,R(-.12,.12)],c:pick(['#83968d','#a2afa1','#9da99b','#748d83'])});ell(x,.35+BATH_LIFT,z,.42,.35,.39,m.stoneDark);if(i%3===0)ell(x-.06,.89+BATH_LIFT+R(-.025,.025),z,.28,.07,.22,m.moss,scenery,true)}
instances(geo.rock,toon('#ffffff'),rimStones).name='natural-onsen-rock-rim';
// Bamboo screens leave the front and near side of the bath open to the view.
for(const [a,b] of [[[.20,3.3,1.15],[8.00,3.3,1.15]],[[9.80,3.3,2.4],[9.80,3.3,4.10]]]){
 const length=v(...a).distanceTo(v(...b)),n=Math.ceil(length/.13);for(let i=0;i<=n;i++){const t=i/n,x=THREE.MathUtils.lerp(a[0],b[0],t),z=THREE.MathUtils.lerp(a[2],b[2],t),base=landY(x,z);rod([x,base,z],[x,base+1.72+R(-.04,.04),z],.047,m.bamboo);for(const y of [base+.48,base+1.28])mesh(new THREE.CylinderGeometry(.052,.052,.025,8),m.bambooDark,x,y,z)}
 for(const y of [2.80,3.74])rod([a[0],y,a[2]],[b[0],y,b[2]],.045,m.woodDark);
}
// The enlarged bath receives a bamboo spring and spills downhill to the brook.
for(const [x,z,sz] of [[9.5,2.10,.85],[9.01,1.57,.57],[9.94,2.4,.58]])ell(x,landY(x,z)+sz*.55,z,sz,sz*.75,sz*.78,m.stoneDark,scenery,true);
rod([8.50,3.66,2.67],[8.50,3.66,3.82],.10,m.bamboo);rod([8.50,2.10,2.74],[8.50,3.64,2.74],.075,m.bambooDark);
const spoutEnd=mesh(new THREE.CircleGeometry(.076,14),m.woodDark,8.50,3.66,3.827);spoutEnd.castShadow=false;
const pouring=tube([[8.50,3.64,3.84],[8.49,3.41,3.98],[8.46,3.11,4.06],[8.45,waterY+.01,4.09]],.043,m.water,model);pouring.name='flowing-bamboo-spout';
tube([[4.53,waterY-.03,8.20],[4.48,2.56,8.73],[4.37,1.78,9.40],[4.20,STREAM_Y+.02,streamZ(4.20)]],.12,m.water,model).name='onsen-overflow-cascade';
for(let i=0;i<6;i++)ell(4.52+(i%2?.26:-.26),2.29-i*.21,8.57+i*.30,.25,.24,.32,m.stoneDark,scenery,true);
// Cedar buckets with separate staves, bands and dark openings, stools and towels.
function bucket(x,z,scale=1){const y=landY(x,z)+.03,g=new THREE.Group();g.name='cedar-bathing-bucket';g.position.set(x,y,z);g.scale.setScalar(scale);scenery.add(g);mesh(new THREE.CylinderGeometry(.22,.18,.29,16,1,true),m.woodLight,0,.17,0,g);mesh(new THREE.CircleGeometry(.19,20),m.woodDark,0,.285,0,g).rotation.x=-Math.PI/2;for(let i=0;i<14;i++){const a=i/14*6.28;rod([Math.cos(a)*.18,.035,Math.sin(a)*.18],[Math.cos(a)*.219,.30,Math.sin(a)*.219],.009,m.wood,g)}for(const y of [.07,.24]){const r=ring(0,y,0,y<.1?.188:.212,.014,m.stoneDark,g);r.rotation.x=Math.PI/2;}rod([-.20,.33,0],[.20,.33,0],.022,m.woodDark,g);return g}
bucket(-.78,5.45,1.20);bucket(2.20,8.55,1.02);
for(const [x,z] of [[-.95,4.6],[1.45,8.65]]){const y=landY(x,z);box(x,y+.29,z,.48,.09,.34,m.woodLight,scenery,true);for(const dx of [-.17,.17])box(x+dx,y+.15,z,.055,.24,.28,m.wood)}
const towel=box(2.60,3.06,8.12,.58,.10,.31,m.white);towel.rotation.y=-.16;box(2.60,3.122,8.12,.40,.025,.29,m.white);for(const dx of [-.19,-.13])box(2.60+dx,3.139,8.12,.022,.009,.26,m.teal);
// A brook and arched footbridge lead visitors from the front stone path.
const streamPositions=[],streamIndices=[];
for(let i=0;i<=108;i++){const x=-15.85+20.25*i/108,z=streamZ(x),w=.27+.07*Math.sin(x*2);streamPositions.push(x,STREAM_Y,z-w,x,STREAM_Y,z+w);if(i<108){const a=i*2;streamIndices.push(a,a+1,a+2,a+1,a+3,a+2)}}
const streamG=new THREE.BufferGeometry();streamG.setAttribute('position',new THREE.Float32BufferAttribute(streamPositions,3));streamG.setIndex(streamIndices);streamG.computeVertexNormals();
const timeUniform={value:0};
const streamMat=new THREE.ShaderMaterial({uniforms:{time:timeUniform,night:nightUniform},transparent:true,side:THREE.DoubleSide,vertexShader:`varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float time;uniform float night;varying vec3 p;void main(){float wave=sin(p.x*15.+p.z*23.+time*2.4)*.5+.5;vec3 c=mix(vec3(.28,.58,.55),vec3(.58,.79,.70),pow(wave,8.)*.38);c=mix(c,c*vec3(.20,.31,.42),night);gl_FragColor=vec4(c,.85);#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`});
// GLSL preprocessor directives must start on their own line.
streamMat.fragmentShader=streamMat.fragmentShader.replace(';#include',';\n#include');
mesh(streamG,streamMat,0,0,0,model).name='mountain-brook';
for(let i=0;i<123;i++){const x=-15.75+i*.165,z=streamZ(x)+(i%2?.40:-.41),s=R(.10,.23);ell(x,STREAM_Y+.025,z,s,s*.63,s*.75,i%3?m.stone:m.moss,scenery,true)}
const bridge=new THREE.Group();bridge.name='arched-cedar-footbridge';bridge.position.y=1.45;scenery.add(bridge);const bx=-3.85,bz=streamZ(bx);
for(let i=0;i<13;i++){const t=i/12,z=bz-1.13+t*2.26,y=.39+Math.sin(t*Math.PI)*.27;const plank=box(bx,y,z,1.47,.11,.168,m.wood,bridge,true);plank.rotation.x=-Math.cos(t*Math.PI)*.14;}
for(const side of [-1,1]){const x=bx+side*.69;for(const z of [bz-1.06,bz,bz+1.06])rod([x,.3,z],[x,1.13+(z===bz?.20:0),z],.04,m.woodDark,bridge);tube([[x,1.13,bz-1.08],[x,1.34,bz],[x,1.13,bz+1.08]],.035,m.woodLight,bridge);tube([[x,.70,bz-1.08],[x,.90,bz],[x,.70,bz+1.08]],.03,m.woodDark,bridge);}
const path=[[-7.7,14.6],[-7.7,13.7],[-7.25,12.85],[-6.65,12.1],[-5.90,11.50],[-5.05,11.08],[-4.35,10.89],[-3.85,8.8],[-3.85,8.1],[-3.68,7.3],[-3.35,6.5],[-3.4,5.7],[-3.65,4.85],[-3.82,4.25]];
for(let i=0;i<path.length;i++){const [x,z]=path[i],p=box(x,landY(x,z)+.055,z,R(.85,1.20),.10,R(.39,.53),i%3?m.stoneLight:m.stone,scenery,true);p.rotation.y=R(-.19,.19)}
// Dry-stone retaining walls expose the slope below the flat inhabited benches.
function retainingWall(x1,x2,z,topHeight,bottomHeight){
 const width=x2-x1;box((x1+x2)/2,(topHeight+bottomHeight)/2,z,width,topHeight-bottomHeight,.24,m.stoneDark,scenery,true);
 const rows=Math.ceil((topHeight-bottomHeight)/.27),cols=Math.ceil(width/.49);
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const x=x1+(col+.5)*width/cols+(row%2?.10:0);if(x>x2-.12)continue;box(x,bottomHeight+.13+row*.27,z+.145,width/cols-.025,.235,.07,(row+col)%3?m.stone:m.stoneLight);}
}
retainingWall(-7.0,-4.80,1.12,4.48,3.22);retainingWall(-2.83,2.55,1.12,4.48,2.23);
retainingWall(-12.9,-7.5,-4.03,6.08,4.45);retainingWall(6.2,11.5,-4.84,6.98,4.83);
for(let i=0;i<12;i++)stoneStep(-3.83,4.54-i*.14,1.40+i*.23,1.74,.28);
for(let i=0;i<13;i++)stoneStep(6.45,7.22-i*.17,-4.55+i*.185,1.14,.25);
for(let i=0;i<14;i++){const z=-2.25+i*.245,y=5.18-i*.208;stoneStep(6.45,y+.09,z,1.14,.28);}
for(let i=0;i<9;i++){const x=-7.0-i*.36,z=-2.1-i*.22;box(x,landY(x,z)+.07,z,.69,.12,.46,m.stoneLight,scenery,true);}
function lantern(x,z,s=1){const y=landY(x,z),g=new THREE.Group();g.name='warm-stone-lantern';g.position.set(x,y,z);g.scale.setScalar(s);scenery.add(g);box(0,.09,0,.63,.18,.63,m.stoneDark,g,true);mesh(new THREE.CylinderGeometry(.13,.21,.65,8),m.stone,0,.48,0,g);box(0,.84,0,.46,.13,.46,m.stoneLight,g,true);box(0,1.06,0,.30,.34,.30,m.light,g);for(const dx of [-.20,.20])for(const dz of [-.20,.20])box(dx,1.06,dz,.07,.36,.07,m.stoneDark,g);mesh(new THREE.ConeGeometry(.45,.24,4),m.stoneDark,0,1.37,0,g).rotation.y=Math.PI/4;ell(0,1.55,0,.075,.10,.075,m.stoneLight,g);warmLight(x,y+1.1*s,z,.15,5.8,4.8)}
lantern(-5.13,4.43,.92);lantern(-.55,6.2,.95);lantern(-6.87,-.17,.82);lantern(-7.3,8.9,.92);lantern(9.25,7.15,1.05);
warmLight(-2.0,6.10,1.02,.20,6.5,8);warmLight(4.12,6.88,-2.72,.15,5.4,6);
for(let i=0;i<6;i++){const x=-4.9-i*.60,z=4.80-i*.05,p=box(x,landY(x,z)+.055,z,.73,.10,.50,m.stoneLight,scenery,true);p.rotation.y=-.12;}
for(const x of [-5.38,-2.55,.28]){box(x,2.22,.20,.22,.32,.22,m.light,inn);for(const dx of [-.13,.13])box(x+dx,2.22,.20,.035,.39,.28,m.beam,inn);for(const y of [2.04,2.4])box(x,y,.20,.30,.035,.29,m.woodDark,inn);rod([x,2.42,.20],[x,2.69,.20],.018,m.woodDark,inn)}
// Pines crown the rear slope; their irregular layered branch pads feel sculpted.
function pine(x,z,h,span){const y=landY(x,z);rod([x,y,z],[x+.10,y+h*.90,z-.07],.13,m.woodDark,scenery,.055);for(let tier=0;tier<5;tier++){const t=.32+tier*.145,yy=y+h*t,spread=span*(1-tier*.14);for(let j=0;j<5;j++){const a=j/5*Math.PI*2+tier*.9,ex=x+Math.cos(a)*spread*.70,ez=z+Math.sin(a)*spread*.70;rod([x,yy-.16,z],[ex,yy+.10,ez],.035,m.woodDark);ell(ex,yy+.15,ez,spread*.66,spread*.30,spread*.60,(tier+j)%3?m.pine:m.pineLight,scenery,true)}}ell(x+.12,y+h*.96,z-.05,span*.39,span*.45,span*.4,m.pine,scenery,true)}
for(const a of [[-7.55,-6.45,5.2,1.15],[-4.85,-7.55,5.65,1.05],[-1.35,-7.55,5.1,1.10],[2.10,-7.77,5.35,.95],[5.62,-7.25,4.80,1.03],[7.65,-5.1,4.50,1.02],[-8.0,-3.25,3.5,.80]])pine(...a);
for(const a of [[-13.0,-9.6,5.6,1.02],[-7.5,-10.55,5.2,1.02],[-3.85,-10.5,5.7,1.00],[.2,-10.7,5.25,.95],[4.05,-10.65,5.6,.97],[7.8,-10.3,4.9,.98],[13.2,-9.7,5.0,.98],[10.45,-4.6,4.0,.90],[-12.1,-2.7,3.6,.85]])pine(...a);
for(const [x,z,s] of [[-10.3,-10.1,.95],[10.0,-9.5,1.05],[-10.7,-6.4,.80],[8.8,-10.8,.90]]){const y=landY(x,z);ell(x,y+s*.50,z,s,s*.80,s*.90,m.stoneDark,scenery,true);ell(x,y+s*.94,z,s*.66,.10,s*.57,m.moss,scenery,true)}
for(const a of [[-14.2,-12.1,5.2,1.10],[-10.2,-13.65,5.7,1.10],[-5.7,-14.1,5.5,1.0],[-.4,-14.5,5.6,1.0],[5.3,-14.1,5.2,1.0],[10.6,-13.5,5.1,1.02],[14.25,-11.4,5.3,1.0],[-14.2,-5.4,4.8,1.0],[-14.25,.2,4.0,.95],[14.35,-3.0,4.1,.90],[14.15,3.6,3.7,.90],[-13.4,7.2,3.3,.85]])pine(...a);
const maples=[];
function maple(x,z,h,span,phase){const y=landY(x,z);tube([[x,y,z],[x+.06,y+h*.35,z],[x-.10,y+h*.65,z+.02],[x+.15,y+h*.86,z]],.085,m.woodDark);for(let i=0;i<5;i++){const a=i/5*6.28;rod([x,y+h*.42,z],[x+Math.cos(a)*span*.76,y+h*.79,z+Math.sin(a)*span*.76],.033,m.beam)}const crown=new THREE.Group();crown.name='swaying-mountain-maple';crown.position.set(x,y+h*.77,z);model.add(crown);const items=[];for(let i=0;i<27;i++){const a=R(0,6.28),r=Math.sqrt(random())*span*.85,s=R(.24,.43);items.push({p:[Math.cos(a)*r,R(-.10,.52),Math.sin(a)*r],s:[s*1.7,s*.78,s*1.5],c:pick(['#c89555','#dcad65','#e3bd77','#b9854e','#b77652'])})}instances(geo.rock,toon('#ffffff'),items,crown);maples.push({g:crown,phase});}
maple(-10.1,6.55,3.45,1.10,.3);maple(-6.65,-3.80,4.3,1.0,1.8);maple(6.78,-2.19,3.6,1.12,3.4);maple(10.6,9.0,2.45,.90,4.9);maple(-8.0,10.1,2.8,.95,2.2);maple(10.7,4.45,3.45,1.05,5.1);
for(const a of [[-13.2,4.8,3.1,1.1,.8],[-12.6,11.0,3.2,1.1,1.6],[13.1,10.7,3.3,1.1,2.6],[-2.4,13.8,2.4,.9,3.4],[5.8,13.8,2.7,1.,4.3],[13.8,-5.9,3.2,.9,5.4],[-7.4,-11.8,3.6,1.1,6.2],[7.0,-12.3,3.6,1.0,7.2]])maple(...a);
// Low plantings, ferns, tiny flowers and stones preserve the open sight line.
const grassItems=[],flowerItems=[],fernItems=[];
for(let i=0;i<8500;i++){
 const x=R(-HALF+.15,HALF-.15),z=R(-HALF+.15,HALF-.15),nearBath=((x-CX)/(RX+.7))**2+((z-CZ)/(RZ+.65))**2<1,nearHouse=(x>-6.8&&x<6.1&&z>-6.45&&z<1.3)||(x>-10.6&&x<-6.8&&z>1.0&&z<5.9)||(x>-12.9&&x<-7.4&&z>-9.0&&z<-3.8)||(x>6.1&&x<11.6&&z>-10.1&&z<-4.6)||(x>8.2&&x<13.8&&z>-3.0&&z<2.4),nearPath=path.some(p=>Math.hypot(p[0]-x,p[1]-z)<.82),nearStream=x<3.4&&Math.abs(z-streamZ(x))<.59;
 if(nearBath||nearHouse||nearPath||nearStream)continue;const y=landY(x,z),s=R(.09,.24);grassItems.push({p:[x,y+.03,z],s:[s,s*R(1.1,1.75),s],r:[0,R(0,6.28),R(-.12,.12)],c:pick(['#73945c','#91a76a','#6c945e','#a7b57a'])});if(i%17===0)flowerItems.push({p:[x,y+s+.06,z],s:[.028,.024,.028],c:pick(['#f2dcaa','#e9d8b7','#dbbc8b'])});
}
const grassGeometry=new THREE.ConeGeometry(.45,1,3);grassGeometry.translate(0,.5,0);
const grassMat=toon('#ffffff');grassMat.side=THREE.DoubleSide;grassMat.onBeforeCompile=shader=>{shader.uniforms.windTime=timeUniform;shader.vertexShader='uniform float windTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\ntransformed.x+=sin(windTime*.7+instanceMatrix[3].x*2.+instanceMatrix[3].z)*position.y*position.y*.10;\n#endif');};
instances(grassGeometry,grassMat,grassItems).name='breeze-through-mountain-grass';instances(geo.sphere,toon('#ffffff'),flowerItems);
for(const [x,z,s] of [[-7.3,4.7,.7],[-1.5,7.8,.6],[9.65,7.8,.5],[8.1,2.6,.75],[-5.8,2.3,.5]]){const y=landY(x,z);ell(x,y+.18,z,s,.28,s*.72,m.moss,scenery,true);for(let j=0;j<9;j++){const a=j/9*6.28;for(let n=0;n<6;n++){const t=n/5;ell(x+Math.cos(a)*s*t,y+.12+Math.sin(t*Math.PI)*s*.60,z+Math.sin(a)*s*t,s*.13*(1-t*.6),s*.06,s*.22*(1-t*.5),j%2?m.leaf:m.leafLight,scenery,true)}}}
for(const [x,z,s] of [[-7.8,7.5,.55],[-1.0,5.5,.30],[6.3,7.7,.42],[7.9,-.3,.37],[-8.2,-7.8,.45]]){const y=landY(x,z);ell(x,y+s*.5,z,s,s*.72,s*.81,m.stoneDark,scenery,true);ell(x,y+s*.96,z,s*.66,.06,s*.48,m.moss,scenery,true)}
for(const [x,z,r] of [[-13.7,2.2,.8],[-12.4,8.1,.75],[12.9,6.8,.75],[-9.8,13.1,.8],[9.8,13.4,.85],[1.0,13.6,.6],[-13.1,-11.7,.85],[14.,-8.1,.75]]){
 const y=landY(x,z);ell(x,y+.24,z,r,.38,r*.8,m.moss,scenery,true);
 for(let j=0;j<8;j++){const a=j/8*6.283;for(let k=1;k<5;k++){const t=k/5;ell(x+Math.cos(a)*r*t,y+.22+Math.sin(t*Math.PI)*r*.55,z+Math.sin(a)*r*t,.10,.04,.20,j%2?m.leaf:m.leafLight,scenery,true);}}
}
for(const [x,z,r] of [[-14.3,-8.6,1.1],[14.0,-12.5,1.4],[-1.4,-13.7,1.1],[12.0,11.7,.7],[-13.8,13.3,.8]]){const y=landY(x,z);ell(x,y+r*.48,z,r,r*.78,r*.86,m.stoneDark,scenery,true);ell(x,y+r*.94,z,r*.62,.10,r*.50,m.moss,scenery,true);}
// Batch all fixed opaque meshes; retain animated crowns, water and steam.
scenery.updateMatrixWorld(true);const batches=new Map(),lineParts=[],remove=[];
scenery.traverse(o=>{if(o.isLineSegments){lineParts.push(o.geometry.clone().applyMatrix4(o.matrixWorld));remove.push(o);return}if(!o.isMesh||o.isInstancedMesh||o.material.transparent)return;const key=o.material.uuid;if(!batches.has(key))batches.set(key,{mat:o.material,gs:[]});const g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));if(g.attributes.color&&!o.material.vertexColors)g.deleteAttribute('color');batches.get(key).gs.push(g);remove.push(o)});
for(const o of remove)o.removeFromParent();for(const {mat,gs} of batches.values()){const converted=gs.map(g=>g.index?g.toNonIndexed():g),merged=mergeGeometries(converted,false);if(!merged)throw Error('Unable to batch mountain inn');mesh(merged,mat);gs.forEach(g=>g.dispose());converted.forEach(g=>g.dispose())}if(lineParts.length){scenery.add(new THREE.LineSegments(mergeGeometries(lineParts,false),lines));lineParts.forEach(g=>g.dispose())}
// A thick turquoise pool with a gently moving reflection of the real inn and pines.
const poolShape=new THREE.Shape();for(let i=0;i<=96;i++){const a=i/96*Math.PI*2,r=1+.025*Math.sin(a*3)+.016*Math.cos(a*5);const x=CX+Math.cos(a)*RX*r,z=CZ+Math.sin(a)*RZ*r;i?poolShape.lineTo(x,-z):poolShape.moveTo(x,-z)}
const water=new Reflector(new THREE.ShapeGeometry(poolShape),{textureWidth:preview?512:768,textureHeight:preview?512:768,clipBias:.004,color:0x75bbad,
shader:{uniforms:{color:{value:new THREE.Color('#75bbad')},tDiffuse:{value:null},textureMatrix:{value:new THREE.Matrix4()},time:timeUniform,night:{value:0}},vertexShader:`uniform mat4 textureMatrix;varying vec4 mirrorCoord;varying vec3 worldP;void main(){worldP=(modelMatrix*vec4(position,1.)).xyz;mirrorCoord=textureMatrix*vec4(position,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
fragmentShader:`uniform float time;uniform float night;uniform vec3 color;uniform sampler2D tDiffuse;varying vec4 mirrorCoord;varying vec3 worldP;void main(){vec2 p=worldP.xz;float ring=sin(length(p-vec2(8.45,4.09))*27.-time*3.4);float waves=sin(p.x*8.+p.y*5.+time*.9)+sin(p.x*4.-p.y*9.-time*.7);vec2 distortion=vec2(sin(p.y*9.+time*.7),cos(p.x*8.-time*.8))*.0015+vec2(ring)*.00055;vec2 uv=mirrorCoord.xy/mirrorCoord.w+distortion;vec3 reflected=texture2D(tDiffuse,uv).rgb*.6+texture2D(tDiffuse,uv+vec2(.0015,.001)).rgb*.2+texture2D(tDiffuse,uv-vec2(.0015,.001)).rgb*.2;float edge=clamp(length((p-vec2(4.5,5.0))/vec2(4.5,3.25)),0.,1.);vec3 base=mix(mix(vec3(.20,.58,.54),vec3(.50,.76,.63),pow(edge,3.)),mix(vec3(.025,.105,.13),vec3(.08,.20,.21),pow(edge,3.)),night);vec3 c=mix(base,reflected,mix(.28,.43,night));c+=vec3(.08,.14,.10)*pow(max(0.,waves*.48),16.);c+=vec3(.04,.08,.06)*pow(max(0.,ring),24.)*exp(-length(p-vec2(8.45,4.09))*.9);gl_FragColor=vec4(c,.84);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`}});
water.rotation.x=-Math.PI/2;water.position.y=waterY;water.material.transparent=true;water.material.depthWrite=false;water.name='reflective-mountain-onsen';model.add(water);
// Soft, independently rising wisps, rendered as camera-facing translucent sheets.
const steamCount=56,steamGeometry=new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1,1,6,6)),steamPhases=[],steamLives=[];
for(let i=0;i<steamCount;i++){steamPhases.push(random());steamLives.push(R(10,18))}steamGeometry.setAttribute('phase',new THREE.InstancedBufferAttribute(new Float32Array(steamPhases),1));steamGeometry.setAttribute('life',new THREE.InstancedBufferAttribute(new Float32Array(steamLives),1));
const steamMat=new THREE.ShaderMaterial({uniforms:{time:timeUniform,night:nightUniform},transparent:true,depthWrite:false,side:THREE.DoubleSide,
vertexShader:`attribute float phase;attribute float life;uniform float time;varying vec2 st;varying float opacity;varying float seed;void main(){float age=fract(time/life+phase);seed=phase;st=uv;vec3 center=(instanceMatrix*vec4(0.,0.,0.,1.)).xyz;center.y+=age*1.7;center.x+=sin(time*.14+phase*19.)*age*.22;center.z+=cos(time*.11+phase*13.)*age*.16;vec4 mv=modelViewMatrix*vec4(center,1.);vec2 bill=position.xy;bill.x+=sin(position.y*7.+time*.3+phase*27.)*.09;mv.xy+=bill*vec2(.70,1.45)*(.65+age*.80);opacity=sin(age*3.14159265)*.078;gl_Position=projectionMatrix*mv;}`,
fragmentShader:`uniform float time;uniform float night;varying vec2 st;varying float opacity;varying float seed;void main(){vec2 p=st-.5;p.x+=sin(st.y*10.+time*.24+seed*31.)*.08;float mist=exp(-dot(p*vec2(3.4,2.7),p*vec2(3.4,2.7))*2.4);mist*=.65+.35*sin(st.y*15.+st.x*9.+seed*48.-time*.3);float a=mist*opacity;gl_FragColor=vec4(mix(vec3(.91,.96,.88),vec3(.54,.66,.76),night),a*(1.+night*.4));}`});
const steam=new THREE.InstancedMesh(steamGeometry,steamMat,steamCount);steam.name='rising-onsen-steam';steam.frustumCulled=false;steam.renderOrder=3;
for(let i=0;i<steamCount;i++){const a=R(0,6.28),r=Math.sqrt(random())*.86;dummy.position.set(CX+Math.cos(a)*RX*r,waterY+.16,CZ+Math.sin(a)*RZ*r);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();steam.setMatrixAt(i,dummy.matrix)}model.add(steam);
// A few golden leaves drift slowly across the warm water and stone path.
const leafShape=new THREE.Shape();leafShape.moveTo(0,.13);for(const [x,y] of [[.026,.045],[.084,.075],[.058,.012],[.115,-.014],[.049,-.04],[.044,-.101],[0,-.067],[-.045,-.10],[-.051,-.04],[-.115,-.014],[-.059,.012],[-.084,.075],[-.026,.045],[0,.13]])leafShape.lineTo(x,y);
const leafGeo=new THREE.ShapeGeometry(leafShape),leafMat=toon('#d2a360',{side:THREE.DoubleSide});
const leaves=new THREE.InstancedMesh(leafGeo,leafMat,26);leaves.name='drifting-onsen-maple-leaves';leaves.frustumCulled=false;model.add(leaves);const leafSeeds=Array.from({length:26},()=>({x:R(-7.8,7.4),z:R(.8,7.9),phase:random(),life:R(14,22),size:R(.45,.95)}));
function animate(t){timeUniform.value=t;water.material.uniforms.time.value=t;maples.forEach(({g,phase})=>{g.rotation.z=Math.sin(t*.38+phase)*.015;g.rotation.x=Math.sin(t*.30+phase)*.008;});pouring.material.opacity=.54+Math.sin(t*3.2)*.035;leafSeeds.forEach((s,i)=>{const f=(s.phase+t/s.life)%1,x=s.x+Math.sin(t*.2+i)*.18,z=s.z+Math.sin(t*.13+i)*.15;dummy.position.set(x,landY(x,z)+.16+(1-f)*2.2,z);dummy.rotation.set(.55+Math.sin(t*.6+i)*.3,t*.10+i,t*.22+i);dummy.scale.setScalar(s.size);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix)});leaves.instanceMatrix.needsUpdate=true;}
// Lighting changes retain the same camera and all geometry, including reduced motion.
let nightBlend=0,nightTarget=0,modeDirty=true;
let start=null,lastMs=-Infinity,renderedOnce=false;
const lastPosition=new THREE.Vector3(),lastQuaternion=new THREE.Quaternion();
const daySky=new THREE.Color('#d8f2ee'),nightSky=new THREE.Color('#8299c0'),dayGround=new THREE.Color('#667652'),nightGround=new THREE.Color('#172a37');
const daySun=new THREE.Color('#ffe1a1'),nightSun=new THREE.Color('#a7c2ef'),dayLamp=new THREE.Color('#ffe0a0'),nightLamp=new THREE.Color('#e8a34d');
const dayWater=new THREE.Color('#a4dfd3'),nightWater=new THREE.Color('#739cae');
function applyLighting(amount){
 renderer.shadowMap.needsUpdate=true;
 skyLight.color.lerpColors(daySky,nightSky,amount);skyLight.groundColor.lerpColors(dayGround,nightGround,amount);skyLight.intensity=THREE.MathUtils.lerp(1.73,.48,amount);
 sun.color.lerpColors(daySun,nightSun,amount);sun.intensity=THREE.MathUtils.lerp(3.0,.66,amount);sun.position.set(THREE.MathUtils.lerp(-24,24,amount),44,THREE.MathUtils.lerp(20,-16,amount)).multiplyScalar(4);
 fill.intensity=THREE.MathUtils.lerp(.47,.17,amount);renderer.toneMappingExposure=THREE.MathUtils.lerp(1.02,1.01,amount);
 warmLights.forEach(light=>{light.intensity=THREE.MathUtils.lerp(light.userData.dayIntensity,light.userData.nightIntensity,amount)});
 m.shoji.emissiveIntensity=THREE.MathUtils.lerp(.08,.24,amount);m.light.color.lerpColors(dayLamp,nightLamp,amount).multiplyScalar(THREE.MathUtils.lerp(.72,.92,amount));
 m.water.color.lerpColors(dayWater,nightWater,amount);nightUniform.value=amount;water.material.uniforms.night.value=amount;
 model.userData.nightBlend=amount;
}
const timeSwitch=document.querySelector?.('.time-switch');if(timeSwitch)timeSwitch.hidden=preview;
const periodButtons=[...(document.querySelectorAll?.('.time-switch button')||[])];
function setPeriod(period,immediate=false){
 nightTarget=period==='night'?1:0;model.userData.period=nightTarget?'night':'day';
 if(document.body.dataset)document.body.dataset.period=model.userData.period;
 periodButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.time===model.userData.period)));
 if(immediate||reduced){nightBlend=nightTarget;applyLighting(nightBlend)}
 modeDirty=true;renderedOnce=false;
}
periodButtons.forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();setPeriod(button.dataset.time)}));
setPeriod(params.get('time')==='night'?'night':'day',true);animate(0);
const expandedWorld=expandWorld({kind:'onsen',scene,model,camera,controls,renderer,preview,reduced,nativeHeight:landY});
function renderFrame(ms){
 expandedWorld.update(ms*.001);
 if(start===null)start=ms;controls.update();
 const changing=Math.abs(nightBlend-nightTarget)>.00001;
 if(reduced&&renderedOnce&&!modeDirty&&!changing&&lastPosition.distanceToSquared(camera.position)<1e-12&&Math.abs(lastQuaternion.dot(camera.quaternion))>1-1e-12)return;
 if(!preview&&!reduced&&ms-lastMs<32)return;
 const dt=lastMs===-Infinity?0:Math.min(.1,Math.max(0,(ms-lastMs)*.001));lastMs=ms;
 if(changing){const step=dt/.8;nightBlend+=Math.sign(nightTarget-nightBlend)*Math.min(Math.abs(nightTarget-nightBlend),step);applyLighting(nightBlend)}
 if(!preview&&!reduced)animate((ms-start)*.001);
 renderer.render(scene,camera);lastPosition.copy(camera.position);lastQuaternion.copy(camera.quaternion);renderedOnce=true;modeDirty=false;
}
if(preview)renderFrame(0);else renderer.setAnimationLoop(renderFrame);
addEventListener('resize',()=>{if(innerWidth<1||innerHeight<1)return;const a=innerWidth/innerHeight,factor=fit(a)/fit(camera.aspect);camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);camera.aspect=a;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,preview?.85:1.6));renderer.setSize(innerWidth,innerHeight);renderedOnce=false;if(preview||reduced)renderFrame(0)});
