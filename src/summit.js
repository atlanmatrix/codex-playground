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
document.body.appendChild(renderer.domElement);renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','风雪中的雪山山顶，灌木、风向袋与飞雪随阵风摆动；拖拽旋转，滚轮或双指缩放');
const camera=new THREE.PerspectiveCamera(34,Math.max(1,innerWidth)/Math.max(1,innerHeight),.3,350);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,4.5,0);controls.enableDamping=true;controls.enabled=!preview;controls.enablePan=false;controls.minDistance=42;controls.maxDistance=260;controls.minPolarAngle=.24;controls.maxPolarAngle=Math.PI*.44;
const fit=aspect=>Math.max(80,82/aspect);const direction=new THREE.Vector3(.64,.82,.86).normalize();camera.position.copy(direction.multiplyScalar(fit(camera.aspect))).add(controls.target);camera.lookAt(controls.target);
scene.add(new THREE.HemisphereLight(0xe4f3ff,0x8093ac,2.1));
const sun=new THREE.DirectionalLight(0xeef7ff,2.8);sun.position.set(-16,28,-9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:70});sun.shadow.normalBias=.035;scene.add(sun);
const model=new THREE.Group();model.name='summit-miniature';model.userData.baseSize=DEFAULT_BASE_SIZE;scene.add(model);
const scenery=new THREE.Group();scenery.name='snowy-ridge-details';model.add(scenery);
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
const snow=toon('#edf6f7'),rock=toon('#7e91a5'),rockDark=toon('#63788d'),wood=toon('#897e73');
const vertexMaterial=new THREE.MeshToonMaterial({color:'#ffffff',vertexColors:true,gradientMap:ramp,side:THREE.DoubleSide});
let seed=92173;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const R=(a,b)=>a+random()*(b-a),V=(x,y,z)=>new THREE.Vector3(x,y,z);
const HALF=DEFAULT_BASE_SIZE/2,N=64;
function height(x,z){
 const peak=10.3*Math.exp(-((x+3.4)**2/64+(z+3.8)**2/100));
 const shoulder=7.5*Math.exp(-((x-6.8)**2/40+(z+6)**2/54));
 const ridge=2.0*Math.exp(-((x+.68*z+1.4)**2)/7)*Math.exp(-(z*z)/180);
 return 1.0+Math.max(peak,shoulder)+ridge+.17*Math.sin(x*1.6+z*.75)+.13*Math.cos(z*1.5-x*.6);
}
model.userData.terrainHeight=height;
function surfaceGeometry(triangles,colors){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(triangles,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;}
const positions=[],colors=[];let snowyFaces=0,rockFaces=0;
function face(a,b,c,color){positions.push(...a,...b,...c);for(let i=0;i<3;i++)colors.push(color.r,color.g,color.b)}
for(let i=0;i<N;i++)for(let j=0;j<N;j++){
 const x=-HALF+i*.5,z=-HALF+j*.5;
 const a=[x,height(x,z),z],b=[x+.5,height(x+.5,z),z],c=[x,height(x,z+.5),z+.5],d=[x+.5,height(x+.5,z+.5),z+.5];
 for(const tri of [[a,c,b],[b,c,d]]){
  const normal=V(...tri[1]).sub(V(...tri[0])).cross(V(...tri[2]).sub(V(...tri[0]))).normalize();
  const cx=(tri[0][0]+tri[1][0]+tri[2][0])/3,cz=(tri[0][2]+tri[1][2]+tri[2][2])/3;
  const exposed=normal.y<.67 || (normal.x<-.43&&Math.sin(cx*1.2+cz*.8)>.25);
  const color=new THREE.Color(exposed?(normal.y<.5?'#8195ab':'#a1b1bf'):normal.x>.35?'#d9e8ef':'#f1f7f6');
  color.multiplyScalar(R(.965,1.025));face(...tri,color);if(exposed)rockFaces++;else snowyFaces++;
 }
}
const terrain=new THREE.Mesh(surfaceGeometry(positions,colors),vertexMaterial);terrain.name='faceted-snowy-summit';terrain.castShadow=terrain.receiveShadow=true;terrain.userData={snowyFaces,rockFaces};model.add(terrain);
// Close every square edge with continuous strata; the mountain is a solid cutaway.
const wallP=[],wallC=[];
for(let side=0;side<4;side++)for(let i=0;i<N;i++){
 const at=t=>side===0?[-16,t]:side===1?[16,t]:side===2?[t,-16]:[t,16];
 const [x,z]=at(-16+i*.5),[xx,zz]=at(-16+(i+1)*.5),h1=height(x,z),h2=height(xx,zz);
 for(const [bottom,top,c] of [[-1.6,-.65,'#788b9e'],[-.65,.3,'#94a5b5'],[.3,1,'#b5c6d2']]){
  const lo1=bottom===.3?.3:bottom,lo2=lo1,hi1=top===1?h1:top,hi2=top===1?h2:top,col=new THREE.Color(c);
  wallP.push(x,lo1,z,xx,lo2,zz,x,hi1,z,xx,lo2,zz,xx,hi2,zz,x,hi1,z);for(let j=0;j<6;j++)wallC.push(col.r,col.g,col.b);
 }
}
const walls=new THREE.Mesh(surfaceGeometry(wallP,wallC),vertexMaterial);walls.name='square-mountain-section';walls.castShadow=walls.receiveShadow=true;model.add(walls);
box(0,-1.65,0,32,.10,32,rockDark);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.ShadowMaterial({opacity:.13}));ground.rotation.x=-Math.PI/2;ground.position.y=-1.72;scene.add(ground);
function onRock(x,z,size){const y=height(x,z);const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=R(0,6.28);scenery.add(g);const b=ball(0,.24*size,0,size,.65*size,.7*size,rock,g);b.rotation.z=R(-.3,.3);ball(.08*size,.64*size,.02*size,.87*size,.15*size,.62*size,snow,g);}
for(let i=0;i<75;i++){const x=R(-14.5,14.5),z=R(-14.5,14.5);onRock(x,z,R(.22,.9))}
// A rough line of stones marks a narrow, snow-filled approach to the summit cairn.
for(let i=0;i<23;i++){const z=12-i*.67,x=-3+Math.sin(z*.32)*1.65;for(const side of [-1,1])onRock(x+side*.7,z,R(.12,.22));}
const cairn=new THREE.Group();cairn.name='summit-stone-cairn';cairn.position.set(-3.5,height(-3.5,-3.8),-3.8);scenery.add(cairn);
for(let i=0;i<6;i++){const size=.75-i*.10;const o=ball(Math.sin(i*3)*.08,i*.23+.15,Math.cos(i*2)*.06,size,.21,size*.7,i%2?rock:rockDark,cairn);o.rotation.y=i*.9;if(i===5)ball(0,i*.23+.32,0,.2,.06,.18,snow,cairn)}
// Dwarf junipers grow low and lean downwind. Roots stay fixed while crowns flex.
const shrubs=[],juniperLight=toon('#6e8b82'),juniperDark=toon('#53766e');
const shrubSites=[[-12,-7],[-9,-9],[-11,-2],[-8,1],[-12,4],[-9,7],[-13,10],[-6,9],[-5,13],[-1,11],[2,13],[6,12],[10,11],[13,7],[12,3],[9,1],[5,3],[2,6],[-2,4],[-6,-4],[-6,-8],[-3,-10],[1,-12],[5,-12],[9,-11],[12,-7],[4,-5],[8,-4],[11,-1],[-13,-12]];
function branch(a,b,r,parent){const delta=V(...b).sub(V(...a));const o=mesh(new THREE.CylinderGeometry(r*.55,r,delta.length(),6),wood,0,0,0,1,1,1,parent);o.position.copy(V(...a).add(V(...b)).multiplyScalar(.5));o.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());}
for(const [i,[x,z]] of shrubSites.entries()){
 const root=new THREE.Group();root.name='alpine-shrub-root';root.position.set(x,height(x,z)-.02,z);model.add(root);
 const crown=new THREE.Group();crown.name='wind-bent-juniper';crown.position.y=.16;root.add(crown);const size=R(.65,1.15);
 for(let k=0;k<5;k++){const a=k*1.8,end=[Math.cos(a)*.5*size+.35,.35+R(.1,.4)*size,Math.sin(a)*.5*size];branch([0,-.1,0],end,.045*size,crown);ball(...end,.55*size,.27*size,.45*size,k%2?juniperLight:juniperDark,crown);ball(end[0]+.04,end[1]+.21*size,end[2],.48*size,.10*size,.38*size,snow,crown)}
 batch(crown);shrubs.push({crown,root,phase:i*.73});
}
// Sparse, snow-laden krummholz: small trees shaped by persistent summit winds.
for(const [x,z,s] of [[-12,12,.8],[-10,11,1.05],[11,12,.8],[13,10,.65],[-13,-9,.65]]){
 const y=height(x,z);pole(x,y+1.1*s,z,.10*s,2.2*s,wood);
 for(let i=0;i<4;i++){const r=(1.0-i*.18)*s,yy=y+(.8+i*.48)*s;const cone=mesh(new THREE.ConeGeometry(r,1.2*s,7),i%2?toon('#6a8c83'):toon('#587c75'),x+i*.08,yy,z,1,1,1);cone.rotation.z=-.12;const cap=mesh(new THREE.ConeGeometry(r*.91,.78*s,7),snow,x+i*.08+.02,yy+.23*s,z,1,1,1);cap.rotation.z=-.12}
}
batch(scenery);
// Low gravel and ice granules give the snow a readable scale without extra draw calls.
const dummy=new THREE.Object3D(),gravel=new THREE.InstancedMesh(geo.sphere,rock,1100);gravel.name='wind-exposed-gravel';
for(let i=0;i<gravel.count;i++){const x=R(-15.6,15.6),z=R(-15.6,15.6),s=R(.018,.065);dummy.position.set(x,height(x,z)+.02,z);dummy.scale.set(s*1.5,s*.6,s);dummy.rotation.set(R(0,1),R(0,6),0);dummy.updateMatrix();gravel.setMatrixAt(i,dummy.matrix)}gravel.receiveShadow=true;model.add(gravel);
// A red-and-cream windsock makes the changing wind direction visible at the crest.
const mastX=-1.8,mastZ=-4.0,mastY=height(mastX,mastZ);pole(mastX,mastY+1.7,mastZ,.045,3.4,wood,model);
const sockGroup=new THREE.Group();sockGroup.name='summit-windsock';sockGroup.position.set(mastX,mastY+3.3,mastZ);model.add(sockGroup);
const rings=14,sides=14,sockPositions=new Float32Array((rings+1)*(sides+1)*3),sockColors=[],sockIndices=[];
for(let j=0;j<=rings;j++)for(let k=0;k<=sides;k++){const c=new THREE.Color(Math.floor(j/3)%2?'#f1eee0':'#c67763');sockColors.push(c.r,c.g,c.b);if(j<rings&&k<sides){const a=j*(sides+1)+k,b=a+sides+1;sockIndices.push(a,b,a+1,b,b+1,a+1)}}
const sockGeo=new THREE.BufferGeometry();sockGeo.setAttribute('position',new THREE.BufferAttribute(sockPositions,3));sockGeo.setAttribute('color',new THREE.Float32BufferAttribute(sockColors,3));sockGeo.setIndex(sockIndices);
const sock=new THREE.Mesh(sockGeo,vertexMaterial);sock.name='fluttering-windsock-cloth';sock.castShadow=true;sockGroup.add(sock);
const hoop=new THREE.Mesh(new THREE.TorusGeometry(.29,.018,5,24),rockDark);hoop.rotation.y=Math.PI/2;sockGroup.add(hoop);
function updateSock(t,gust){
 for(let j=0;j<=rings;j++)for(let k=0;k<=sides;k++){
  const u=j/rings,a=k/sides*Math.PI*2,r=.29*(1-u*.65),wave=Math.sin(t*5-u*8)*.12*u;
  const idx=(j*(sides+1)+k)*3;sockPositions[idx]=u*2.4;sockPositions[idx+1]=Math.cos(a)*r-.28*u+wave;sockPositions[idx+2]=Math.sin(a)*r+Math.sin(t*3-u*6)*.16*u;
 }
 sockGeo.attributes.position.needsUpdate=true;sockGeo.computeVertexNormals();sockGroup.rotation.y=-.32+Math.sin(t*.42)*.13;sockGroup.rotation.z=.04+gust*.035;
}
// Falling flakes and near-surface spindrift share the same coherent gust direction.
const flakes=new THREE.InstancedMesh(geo.sphere,new THREE.MeshBasicMaterial({color:'#f8fcff',transparent:true,opacity:.74,depthWrite:false}),780);flakes.name='wind-driven-snow';flakes.frustumCulled=false;model.add(flakes);
const trails=new THREE.InstancedMesh(geo.sphere,new THREE.MeshBasicMaterial({color:'#f4fbff',transparent:true,opacity:.42,depthWrite:false}),160);trails.name='ridge-spindrift';trails.frustumCulled=false;model.add(trails);
const flakeData=Array.from({length:flakes.count},()=>({x:R(0,30),z:R(0,30),h:R(0,1),s:R(.018,.044),phase:R(0,6)}));
const trailData=Array.from({length:trails.count},()=>({x:R(0,28),z:R(-10,10),h:R(.13,.55),s:R(.10,.32),phase:R(0,6)}));
const wrap=(v,n)=>((v%n)+n)%n;
function snowField(t,gust){
 flakeData.forEach((p,i)=>{const x=wrap(p.x+t*2.8,30)-15,z=wrap(p.z+t*.6,30)-15,y=height(x,z)+.4+wrap(p.h-t*.085,1)*4.6;dummy.position.set(x,y,z);dummy.rotation.set(0,0,-.75);dummy.scale.set(p.s,p.s*1.8,p.s);dummy.updateMatrix();flakes.setMatrixAt(i,dummy.matrix)});flakes.instanceMatrix.needsUpdate=true;
 trailData.forEach((p,i)=>{const x=wrap(p.x+t*(3.9+Math.sin(p.phase)*.6),28)-14,z=p.z+Math.sin(t*.5+p.phase)*.15;dummy.position.set(x,height(x,z)+p.h,z);dummy.rotation.set(0,-.20,0);dummy.scale.set(p.s*(1+gust*.35),.016,.025);dummy.updateMatrix();trails.setMatrixAt(i,dummy.matrix)});trails.instanceMatrix.needsUpdate=true;
}
function animate(t){const gust=.65+.22*Math.sin(t*.85)+.13*Math.sin(t*2.1);model.userData.windStrength=gust;shrubs.forEach(({crown,phase})=>{crown.rotation.z=-.10-gust*.09+Math.sin(t*3.1+phase)*.025;crown.rotation.x=.035*Math.sin(t*1.9+phase);});updateSock(t,gust);snowField(t,gust)}
animate(0);
let start=null;
function renderFrame(ms){if(start===null)start=ms;if(!preview&&!reduced)animate((ms-start)/1000);controls.update();renderer.render(scene,camera)}
if(preview)renderFrame(0);else renderer.setAnimationLoop(renderFrame);
addEventListener('resize',()=>{if(innerWidth<1||innerHeight<1)return;const aspect=innerWidth/innerHeight;camera.position.sub(controls.target).multiplyScalar(fit(aspect)/fit(camera.aspect)).add(controls.target);camera.aspect=aspect;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);if(preview)renderFrame(0)});
