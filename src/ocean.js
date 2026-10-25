import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DEFAULT_BASE_SIZE } from './scene-defaults.js';

const preview=new URLSearchParams(location.search).has('preview');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene=new THREE.Scene(),renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,preview?1:1.8));renderer.setSize(Math.max(1,innerWidth),Math.max(1,innerHeight));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.localClippingEnabled=true;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
document.body.appendChild(renderer.domElement);renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','鱼群穿过珊瑚与海草，三只海豚轮流跃出海面；拖拽旋转，滚轮或双指缩放');
const camera=new THREE.PerspectiveCamera(34,Math.max(1,innerWidth)/Math.max(1,innerHeight),.3,350);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,-1.5,0);controls.enableDamping=true;controls.enabled=!preview;controls.enablePan=false;controls.minDistance=42;controls.maxDistance=260;controls.minPolarAngle=.24;controls.maxPolarAngle=Math.PI*.44;
const fit=aspect=>Math.max(79,84/aspect);const direction=new THREE.Vector3(.64,.82,.86).normalize();camera.position.copy(direction.multiplyScalar(fit(camera.aspect))).add(controls.target);camera.lookAt(controls.target);
scene.add(new THREE.HemisphereLight(0xe2f8ff,0x497e92,2.0));
const sun=new THREE.DirectionalLight(0xfff3d9,2.7);sun.position.set(-18,24,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:70});sun.shadow.normalBias=.035;scene.add(sun);
const model=new THREE.Group();model.name='ocean-miniature';model.userData.baseSize=DEFAULT_BASE_SIZE;scene.add(model);
const scenery=new THREE.Group();scenery.name='coral-reef-and-seabed';model.add(scenery);
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
let seed=66419;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const R=(a,b)=>a+random()*(b-a),V=(x,y,z)=>new THREE.Vector3(x,y,z);
const sand=toon('#a2c9c3'),rock=toon('#7f9d9f'),rockLight=toon('#afc5b6'),coralPink=toon('#d995a2'),coralOrange=toon('#dea16e'),coralPurple=toon('#a798bd'),weedMat=toon('#719f87');
const HALF=DEFAULT_BASE_SIZE/2;
const bed=(x,z)=>-6+.13*Math.sin(x*.55+z*.3)+.12*Math.cos(z*.65);
model.userData.seabedHeight=bed;
box(0,-6.85,0,32,.8,32,rock);box(0,-6.4,0,32,.2,32,sand);
const floorGeo=new THREE.PlaneGeometry(32,32,64,64);floorGeo.rotateX(-Math.PI/2);const floorP=floorGeo.attributes.position;
for(let i=0;i<floorP.count;i++)floorP.setY(i,bed(floorP.getX(i),floorP.getZ(i)));floorGeo.computeVertexNormals();const floor=new THREE.Mesh(floorGeo,sand);floor.name='sandy-ocean-floor';floor.receiveShadow=true;model.add(floor);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.ShadowMaterial({opacity:.13}));ground.rotation.x=-Math.PI/2;ground.position.y=-7.27;scene.add(ground);
function branch(a,b,r,mat,parent=scenery){const delta=V(...b).sub(V(...a));const o=mesh(new THREE.CylinderGeometry(r*.65,r,delta.length(),7),mat,0,0,0,1,1,1,parent);o.position.copy(V(...a).add(V(...b)).multiplyScalar(.5));o.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());return o;}
// A low reef breaks the surface at the back, leaving the open water clear for leaps.
for(const [x,z,s,h] of [[-11,-10,3,3.1],[-13,-6,2,1.6],[-9,-12,2.0,2.4]]){
 const y=bed(x,z);ball(x,y+h*.55,z,s,h,s*.77,rock);ball(x+.3,y+h*1.35,z,s*.7,h*.7,s*.6,rockLight);
}
ball(-11,-.15,-10,1.8,.8,1.3,rockLight);ball(-11,.4,-10,1.0,.25,.8,m.cream);
// Branching corals, plate corals and soft anemones cluster on the reef floor.
const coralSites=[[-12,7],[-10,9],[-13,3],[-9,5],[-6,10],[-12,-3],[-6,-11],[11,11],[13,7],[11,-11],[7,12],[-3,12]];
for(const [i,[x,z]] of coralSites.entries()){
 const g=new THREE.Group();g.name='living-coral-cluster';g.position.set(x,bed(x,z),z);scenery.add(g);ball(0,.18,0,.85,.32,.65,rockLight,g);
 const mat=i%3===0?coralPink:i%3===1?coralOrange:coralPurple;
 if(i%3!==1){
  for(let j=0;j<7;j++){const a=j*2.4,top=[Math.cos(a)*.55,.7+R(.1,.7),Math.sin(a)*.45];branch([0,.15,0],top,.065,mat,g);for(const side of [-1,1]){const tip=[top[0]+side*.23,top[1]+.3,top[2]+side*.15];branch(top,tip,.038,mat,g);ball(...tip,.09,.1,.09,mat,g)}}
 }else for(let j=0;j<5;j++){const a=j*2.4;ball(Math.cos(a)*.38,.35+j*.2,Math.sin(a)*.32,.65-j*.06,.09,.48-j*.04,mat,g)}
}
for(let i=0;i<35;i++){const x=R(-14,14),z=R(-14,14),s=R(.12,.48);ball(x,bed(x,z)+s*.4,z,s,s*.7,s*.8,i%2?rockLight:rock)}
// A handful of small starfish sit flat on the sand.
for(const [x,z] of [[-7,10],[-12,10],[9,12],[12,3]]){
 const g=new THREE.Group();g.name='seabed-starfish';g.position.set(x,bed(x,z)+.04,z);scenery.add(g);
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;branch([0,0,0],[Math.cos(a)*.4,.015,Math.sin(a)*.4],.07,coralOrange,g)}
}
batch(scenery);
const weeds=[];
for(let i=0;i<20;i++){
 const x=i<12?R(-13.5,-7):R(9,13),z=R(-11,12),g=new THREE.Group();g.name='anchored-seagrass';g.position.set(x,bed(x,z),z);model.add(g);
 for(let j=0;j<5;j++){const geo=new THREE.PlaneGeometry(.11,R(.7,1.5),1,9);geo.translate(0,geo.parameters.height/2,0);const o=new THREE.Mesh(geo,new THREE.MeshToonMaterial({color:j%2?'#79a78d':'#5b9380',gradientMap:ramp,side:THREE.DoubleSide}));o.rotation.y=j*1.4;o.position.set(Math.cos(j)*.14,0,Math.sin(j)*.14);g.add(o);weeds.push({o,base:Array.from(geo.attributes.position.array),phase:i*.7+j})}
}
// The sea is a translucent volume: fish and coral remain visible through the surface.
const waterGeo=new THREE.PlaneGeometry(32,32,64,64);waterGeo.rotateX(-Math.PI/2);
const waterMat=new THREE.MeshPhongMaterial({color:'#2da8c1',specular:'#d2f7ff',shininess:90,transparent:true,opacity:.46,depthWrite:false,side:THREE.DoubleSide});
const water=new THREE.Mesh(waterGeo,waterMat);water.name='rolling-ocean-surface';water.renderOrder=3;model.add(water);
const sideGeo=new THREE.BufferGeometry(),sideP=[];
for(const [a,b] of [[[-16,-16],[16,-16]],[[16,-16],[16,16]],[[16,16],[-16,16]],[[-16,16],[-16,-16]]])for(let i=0;i<64;i++){
 const x=a[0]+(b[0]-a[0])*i/64,z=a[1]+(b[1]-a[1])*i/64,xx=a[0]+(b[0]-a[0])*(i+1)/64,zz=a[1]+(b[1]-a[1])*(i+1)/64;sideP.push(x,0,z,xx,-6.3,zz,x,-6.3,z,x,0,z,xx,0,zz,xx,-6.3,zz);
}
sideGeo.setAttribute('position',new THREE.Float32BufferAttribute(sideP,3));sideGeo.computeVertexNormals();const sides=new THREE.Mesh(sideGeo,new THREE.MeshPhongMaterial({color:'#409eb4',transparent:true,opacity:.30,depthWrite:false,side:THREE.FrontSide}));sides.name='transparent-ocean-section';sides.renderOrder=4;model.add(sides);
// Bright, broken surface glints follow each moving wave.
const glints=new THREE.InstancedMesh(geo.sphere,new THREE.MeshBasicMaterial({color:'#d5f8f3',transparent:true,opacity:.47,depthWrite:false}),170);glints.name='sunlit-wave-glints';glints.renderOrder=5;model.add(glints);
const glintData=Array.from({length:glints.count},()=>({x:R(-15.5,15.5),z:R(-15.5,15.5),s:R(.12,.45),p:R(0,6.28)}));
const wave=(x,z,t)=>.065*Math.sin(x*.55+z*.3-t*1.3)+.035*Math.sin(z*.8-x*.2+t*.8);
// Long, broken foam crests make the surface plane readable above the fish.
const crestData=Array.from({length:28},()=>({x:R(-13,13),z:R(-13.5,13.5),length:R(1.2,3.3),phase:R(0,6.28)}));
const crestGeo=new THREE.BufferGeometry(),crestPositions=new Float32Array(28*18*6*3);crestGeo.setAttribute('position',new THREE.BufferAttribute(crestPositions,3));
const crests=new THREE.Mesh(crestGeo,new THREE.MeshBasicMaterial({color:'#effffc',transparent:true,opacity:.88,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));crests.name='ocean-wave-foam';crests.renderOrder=6;model.add(crests);
function updateCrests(t){let at=0;crestData.forEach(c=>{for(let i=0;i<18;i++){
 const point=(u,side)=>{const x=c.x+(u-.5)*c.length,z=c.z+.15*Math.sin(u*Math.PI+c.phase+t*.45)+.15*Math.sin(t*.5+c.phase)+side*.060*Math.sin(u*Math.PI);return [x,wave(x,z,t)+.027,z]};
 const a=point(i/18,-1),b=point((i+1)/18,-1),d=point(i/18,1),e=point((i+1)/18,1);for(const p of [a,d,b,b,d,e])for(const value of p)crestPositions[at++]=value;
 }});crestGeo.attributes.position.needsUpdate=true;}
const dummy=new THREE.Object3D();
const gravel=new THREE.InstancedMesh(geo.sphere,rockLight,1600);gravel.name='seabed-shells-and-gravel';model.add(gravel);gravel.receiveShadow=true;
for(let i=0;i<gravel.count;i++){const x=R(-15.6,15.6),z=R(-15.6,15.6),s=R(.022,.06);dummy.position.set(x,bed(x,z)+.025,z);dummy.scale.set(s*1.5,s*.5,s);dummy.rotation.set(0,R(0,6),0);dummy.updateMatrix();gravel.setMatrixAt(i,dummy.matrix)}
function triangleGeo(vertices){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();return g;}
// Three coordinated schools turn along different closed routes, without teleporting.
const fishCount=72,fishData=[];model.userData.fishSchools=3;
const fishBody=new THREE.InstancedMesh(geo.sphere,toon('#ffffff'),fishCount);fishBody.name='schooling-fish-bodies';model.add(fishBody);
const tailGeo=triangleGeo([0,0,0,-.32,.22,0,-.32,-.22,0]);const fishTail=new THREE.InstancedMesh(tailGeo,new THREE.MeshToonMaterial({color:'#ffffff',vertexColors:false,gradientMap:ramp,side:THREE.DoubleSide}),fishCount);fishTail.name='schooling-fish-tails';model.add(fishTail);
const finGeo=triangleGeo([-.2,0,0,.14,0,0,-.08,.20,0]);const fishFin=new THREE.InstancedMesh(finGeo,new THREE.MeshToonMaterial({color:'#ffffff',gradientMap:ramp,side:THREE.DoubleSide}),fishCount);model.add(fishFin);
const fishEyes=new THREE.InstancedMesh(geo.sphere,toon('#30465a'),fishCount*2);model.add(fishEyes);
const schoolSpecs=[{cx:3,cz:5,rx:6,rz:3,depth:-2.0,count:28,color:'#f1c76a',speed:.15},{cx:-.5,cz:-4,rx:6.5,rz:3,depth:-3.2,count:24,color:'#91c8d4',speed:-.12},{cx:7,cz:-5,rx:4,rz:4,depth:-4.2,count:20,color:'#de9d91',speed:.13}];
for(const [school,spec] of schoolSpecs.entries())for(let i=0;i<spec.count;i++){
 const phase=R(-.1,.1),longitudinal=(Math.floor(i/4)-(Math.ceil(spec.count/4)-1)/2)*1.35+phase,lateral=(i%4-1.5)*.66+R(-.06,.06),vertical=R(-.35,.35),scale=R(.8,1.0);fishData.push({school,phase,longitudinal,lateral,vertical,scale,tailPhase:R(0,6.28)});
 const index=fishData.length-1,color=new THREE.Color(spec.color);fishBody.setColorAt(index,color);fishTail.setColorAt(index,color);fishFin.setColorAt(index,color);
}
const fishPoses=[];
function fishMatrix(x,y,z,heading,sx,sy,sz,target,index){dummy.position.set(x,y,z);dummy.rotation.set(0,heading,0);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();target.setMatrixAt(index,dummy.matrix)}
function updateFish(t){
 fishData.forEach((f,i)=>{
  const s=schoolSpecs[f.school],a=t*s.speed+f.school*1.9,vx=-s.rx*Math.sin(a)*s.speed,vz=s.rz*Math.cos(a)*s.speed,heading=-Math.atan2(vz,vx),c=Math.cos(heading),sn=Math.sin(heading),k=f.scale,x=s.cx+s.rx*Math.cos(a)+f.longitudinal*c+f.lateral*sn,z=s.cz+s.rz*Math.sin(a)-f.longitudinal*sn+f.lateral*c,y=s.depth+f.vertical+.12*Math.sin(t*.8+f.phase);
  fishMatrix(x,y,z,heading,.44*k,.18*k,.125*k,fishBody,i);
  fishMatrix(x-.4*k*c,y,z+.4*k*sn,heading+Math.sin(t*8+f.tailPhase)*.42,k,k,k,fishTail,i);
  fishMatrix(x,y+.12*k,z,heading,k,k,k,fishFin,i);
  for(const side of [-1,1]){const localX=.25*k,localZ=side*.112*k;fishMatrix(x+localX*c+localZ*sn,y+.05*k,z-localX*sn+localZ*c,heading,.025*k,.025*k,.025*k,fishEyes,i*2+(side>0?1:0))}
  fishPoses[i]={x,y,z,school:f.school};
 });
 for(const o of [fishBody,fishTail,fishFin,fishEyes])o.instanceMatrix.needsUpdate=true;
 model.userData.fishPoses=fishPoses;
}
// Dolphins have a beak, melon, dorsal fin, swept flippers and horizontal tail flukes.
const dolphinBlue=toon('#527f9c'),dolphinLight=toon('#d6e7ea'),dolphinDark=toon('#557c96'),eyeMat=toon('#263f54');
const dolphins=[];
for(let i=0;i<3;i++){
 const g=new THREE.Group();g.name='leaping-dolphin';g.scale.setScalar(1.28);model.add(g);
 mesh(new THREE.SphereGeometry(1,20,12),dolphinBlue,0,0,0,.98,.37,.36,g);mesh(new THREE.SphereGeometry(1,18,10),dolphinLight,.12,-.12,0,.80,.25,.31,g);
 mesh(new THREE.SphereGeometry(1,16,10),dolphinBlue,.74,.09,0,.42,.30,.30,g);mesh(new THREE.SphereGeometry(1,14,9),dolphinBlue,1.12,-.06,0,.43,.105,.13,g);
 branch([.9,-.12,-.115],[1.43,-.12,-.08],.012,dolphinDark,g);
 for(const side of [-1,1]){ball(.81,.15,side*.27,.045,.045,.025,eyeMat,g);const flipper=new THREE.Mesh(triangleGeo([.35,-.1,side*.24,-.48,-.32,side*.93,-.4,-.14,side*.29]),new THREE.MeshToonMaterial({color:'#638ca4',gradientMap:ramp,side:THREE.DoubleSide}));flipper.castShadow=true;g.add(flipper)}
 const dorsal=new THREE.Shape();dorsal.moveTo(-.44,.2);dorsal.quadraticCurveTo(-.15,.55,-.35,.91);dorsal.quadraticCurveTo(.1,.77,.27,.2);dorsal.closePath();const dg=new THREE.ExtrudeGeometry(dorsal,{depth:.06,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.025,bevelThickness:.02});dg.translate(0,0,-.03);const fin=new THREE.Mesh(dg,dolphinDark);fin.castShadow=true;g.add(fin);
 branch([-.68,0,0],[-1.5,-.04,0],.17,dolphinBlue,g);
 batch(g);
 const tail=new THREE.Group();tail.name='dolphin-tail-flukes';tail.position.set(-1.42,-.04,0);g.add(tail);
 const tp=[];for(const side of [-1,1])tp.push(.04,0,0,-.13,.02,side*.67,-.5,-.03,side*.45,-.5,-.03,side*.45,-.35,0,side*.08,.04,0,0);
 const flukes=new THREE.Mesh(triangleGeo(tp),new THREE.MeshToonMaterial({color:'#7199ae',gradientMap:ramp,side:THREE.DoubleSide}));flukes.castShadow=true;tail.add(flukes);
 const cx=[3,5,-6][i],cz=[8,-4,-4][i],offset=1.6+i*6;
 const splashGroup=new THREE.Group();splashGroup.name='dolphin-splash';model.add(splashGroup);
 const rings=[];for(let k=0;k<2;k++){const mat=new THREE.MeshBasicMaterial({color:'#e5fbf7',transparent:true,opacity:.6,depthWrite:false});const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.026,5,40),mat);ring.rotation.x=Math.PI/2;ring.renderOrder=6;splashGroup.add(ring);rings.push(ring)}
 const spray=new THREE.InstancedMesh(geo.sphere,new THREE.MeshBasicMaterial({color:'#e0faf7',transparent:true,opacity:.75,depthWrite:false}),24);spray.name='dolphin-splash-droplets';spray.renderOrder=6;splashGroup.add(spray);
 const leapSpray=new THREE.InstancedMesh(geo.sphere,new THREE.MeshBasicMaterial({color:'#e4fbfc',transparent:true,opacity:.8,depthWrite:false}),12);leapSpray.name='airborne-dolphin-water-trail';leapSpray.renderOrder=6;model.add(leapSpray);
 dolphins.push({g,tail,cx,cz,offset,splashGroup,rings,spray,leapSpray});
}
function dolphinPath(p){
 if(p<=4){const u=p/4;return {x:-3+1.5*p,y:-.9+5*Math.sin(Math.PI*u),z:0,dx:1.5,dy:1.25*Math.PI*Math.cos(Math.PI*u),dz:0}}
 const s=p-4,q=s/14,r=1-q,x=3*r*r*r+30*r*r*q-30*r*q*q-3*q*q*q,dx=(21*r*r-120*r*q+21*q*q)/14,z=4*Math.sin(Math.PI*q)**2,dz=8*Math.PI*Math.sin(Math.PI*q)*Math.cos(Math.PI*q)/14;
 const a=Math.exp(-1.785*s),b=Math.exp(-1.785*(14-s)),y=-.9-2.2*(1-a)*(1-b),dy=-2.2*1.785*(a*(1-b)-(1-a)*b);
 return {x,y,z,dx,dy,dz};
}
model.userData.dolphinPeriod=18;
function updateDolphins(t){
 dolphins.forEach((d,i)=>{
  const p=(t+d.offset)%18,path=dolphinPath(p);d.g.position.set(d.cx+path.x,path.y,d.cz+path.z);d.g.rotation.set(0,-Math.atan2(path.dz,path.dx),Math.atan2(path.dy,Math.hypot(path.dx,path.dz)),'YXZ');d.tail.rotation.z=Math.sin(t*4+i)*.13;d.g.userData={phase:p,airborne:path.y>0,velocity:[path.dx,path.dy,path.dz]};
  d.leapSpray.visible=p>.25&&p<3.8;
  for(let j=0;j<12;j++){const age=.06+j*.035,previous=dolphinPath(Math.max(0,p-age));dummy.position.set(d.cx+previous.x-1.5,previous.y-.3-age*(2+j*.09),d.cz+Math.sin(j*2.4)*.16);dummy.rotation.set(0,0,.3);dummy.scale.set(.04,.075,.04);dummy.updateMatrix();d.leapSpray.setMatrixAt(j,dummy.matrix)}d.leapSpray.instanceMatrix.needsUpdate=true;
  const start=p<1.7,end=p>=4&&p<5.7,age=start?p:p-4;d.splashGroup.visible=start||end;d.splashGroup.position.set(d.cx+(start?-3:3),.12,d.cz);
  d.rings.forEach((ring,k)=>{const a=age-k*.15;ring.visible=a>=0&&a<1.7;ring.scale.setScalar(.35+Math.max(0,a)*1.25);ring.material.opacity=Math.max(0,.65*(1-a/1.7))});
  for(let j=0;j<24;j++){const a=j*2.399,r=.4+age*.7*(.6+(j%5)*.13),y=Math.max(0,age*(1.8+(j%4)*.35)-age*age*2);dummy.position.set(Math.cos(a)*r,y,Math.sin(a)*r);dummy.rotation.set(0,0,a);dummy.scale.set(.035,.07,.035);dummy.updateMatrix();d.spray.setMatrixAt(j,dummy.matrix)}d.spray.instanceMatrix.needsUpdate=true;d.spray.material.opacity=Math.max(0,.7*(1-age/1.7));
 });
}
const bubbles=new THREE.InstancedMesh(geo.sphere,new THREE.MeshBasicMaterial({color:'#cceef2',transparent:true,opacity:.42,depthWrite:false}),80);bubbles.name='rising-reef-bubbles';model.add(bubbles);const bubbleData=Array.from({length:80},()=>({x:R(-13,13),z:R(-12,12),p:R(0,1),s:R(.022,.055)}));
function animate(t){
 const p=waterGeo.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,wave(p.getX(i),p.getZ(i),t));p.needsUpdate=true;waterGeo.computeVertexNormals();
 const edge=sideGeo.attributes.position;for(let i=0;i<edge.count;i++)if(sideP[i*3+1]===0)edge.setY(i,wave(edge.getX(i),edge.getZ(i),t));edge.needsUpdate=true;
 glintData.forEach((g,i)=>{dummy.position.set(g.x,wave(g.x,g.z,t)+.025,g.z);dummy.rotation.set(0,.2*Math.sin(t*.4+g.p),0);dummy.scale.set(g.s*(.8+.2*Math.sin(t+g.p)),.012,.028);dummy.updateMatrix();glints.setMatrixAt(i,dummy.matrix)});glints.instanceMatrix.needsUpdate=true;
 weeds.forEach(({o,base,phase})=>{const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const y=base[i*3+1];p.setX(i,base[i*3]+Math.sin(t*1.2+phase+y*1.8)*.12*y*y)}p.needsUpdate=true;o.geometry.computeVertexNormals()});
 updateFish(t);updateDolphins(t);updateCrests(t);
 bubbleData.forEach((b,i)=>{dummy.position.set(b.x+.1*Math.sin(t+b.p*6),-5.4+((b.p+t*.045)%1)*5.0,b.z);dummy.rotation.set(0,0,0);dummy.scale.setScalar(b.s);dummy.updateMatrix();bubbles.setMatrixAt(i,dummy.matrix)});bubbles.instanceMatrix.needsUpdate=true;
}
animate(0);let start=null;
function renderFrame(ms){if(start===null)start=ms;if(!preview&&!reduced)animate((ms-start)/1000);controls.update();renderer.render(scene,camera)}
if(preview)renderFrame(0);else renderer.setAnimationLoop(renderFrame);
addEventListener('resize',()=>{if(innerWidth<1||innerHeight<1)return;const aspect=innerWidth/innerHeight;camera.position.sub(controls.target).multiplyScalar(fit(aspect)/fit(camera.aspect)).add(controls.target);camera.aspect=aspect;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);if(preview)renderFrame(0)});
