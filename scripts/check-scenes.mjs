// Exercise real Three.js geometry and animation on Node, stubbing only browser I/O.
// This is not a browser or GPU rendering test.
import { build } from 'esbuild';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const name=process.argv[2]||'city';
const width=Number(process.argv[3]||1440),height=Number(process.argv[4]||1000);
const isPreview=process.argv.includes('--preview'),isReduced=process.argv.includes('--reduced'),isNight=process.argv.includes('--night');
assert(['city','rainy','onsen','study','summit','desert','ocean'].includes(name));
const root=resolve(import.meta.dirname,'..');
const temp=await mkdtemp(join(tmpdir(),'little-worlds-check-'));
const realThree=JSON.stringify(pathToFileURL(join(root,'node_modules/three/build/three.module.js')).href);
const rendererStub=`export * from ${realThree};export class WebGLRenderer{constructor(){this.shadowMap={};this.domElement={setAttribute(){}}}setPixelRatio(r){this.ratio=r}getPixelRatio(){return this.ratio||1}setSize(){}setAnimationLoop(f){globalThis.frame=f}render(scene,camera){globalThis.rendered={scene,camera}}}`;
const composerStub=`export class EffectComposer{constructor(){this.passes=[]}addPass(p){this.passes.push(p)}setSize(){}setPixelRatio(){}render(){const p=this.passes.find(p=>p.scene&&p.camera);globalThis.rendered={scene:p.scene,camera:p.camera}}}`;
const controlsStub=`import {Vector3} from ${realThree};export class OrbitControls{constructor(){this.target=new Vector3();globalThis.testControls=this}update(){}}`;
const plugin={name:'browser-io-stub',setup(b){
 b.onResolve({filter:/^three$/},()=>({path:'three',namespace:'stub'}));
 b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:rendererStub,loader:'js',resolveDir:root}));
 b.onResolve({filter:/OrbitControls\.js$/},()=>({path:'controls',namespace:'controls'}));
 b.onLoad({filter:/.*/,namespace:'controls'},()=>({contents:controlsStub,loader:'js',resolveDir:root}));
 b.onResolve({filter:/EffectComposer\.js$/},()=>({path:'composer',namespace:'composer'}));
 b.onLoad({filter:/.*/,namespace:'composer'},()=>({contents:composerStub,loader:'js',resolveDir:root}));
 b.onResolve({filter:/^file:/},a=>({path:a.path,external:true}));
}};
await build({entryPoints:[join(root,name==='city'?'src/scene.js':`src/${name}.js`)],outfile:join(temp,'scene.mjs'),bundle:true,platform:'node',format:'esm',plugins:[plugin]});
globalThis.innerWidth=width;globalThis.innerHeight=height;globalThis.devicePixelRatio=1;
globalThis.location={search:'?'+new URLSearchParams({...isPreview?{preview:'1'}:{},...isNight?{time:'night'}:{}})};
const periodButtons=['auto','day','night'].map(time=>({dataset:{time},attributes:{},handlers:{},setAttribute(k,v){this.attributes[k]=v},addEventListener(k,fn){this.handlers[k]=fn}}));
const periodSwitch={hidden:true},periodStatus={};
globalThis.document={body:{appendChild(){},dataset:{},style:{setProperty(){}}},querySelector(selector){return name==='study'?(selector==='.period-switch'?periodSwitch:periodStatus):null},querySelectorAll(){return name==='study'?periodButtons:[]},createElement(){return{getContext(){return name==='study'?new Proxy({createLinearGradient(){return{addColorStop(){}}}},{get:(o,k)=>k in o?o[k]:()=>{}}):{fillRect(){},strokeRect(){},fillText(){}}}}}};
globalThis.matchMedia=()=>({matches:isReduced});
const listeners=new Map();globalThis.addEventListener=(name,handler)=>listeners.set(name,handler);
const HostDate=globalThis.Date;
if(name==='study'){const midday=new HostDate(2026,9,24,12).getTime();globalThis.Date=class extends HostDate{constructor(...args){super(...(args.length?args:[midday]))}static now(){return midday}};}
try{
 await import(pathToFileURL(join(temp,'scene.mjs')));
 if(!isPreview)globalThis.frame(0);
 const {scene,camera}=globalThis.rendered;
 const model=name==='city'?scene.children.find(o=>o.isGroup):scene.getObjectByName(`${name}-miniature`);
 assert(model);
 const expanded=model.userData.baseSize===128;
 if(expanded){
  assert.equal(model.userData.expansion.detailVersion,2,'Every expansion must use its scene-specific detailed design');
  if(model.userData.expansion.detailVersion===2){assert(model.userData.expansion.landmarks.length>=3);if(name==='summit'){assert(model.userData.expansion.peakHeight>60&&model.userData.expansion.skiRuns===2);assert(model.userData.expansion.plantTypes.length>=5)}if(name==='intersection'){assert(model.userData.expansion.vehicleTypes.includes('bus')&&model.userData.expansion.vehicleTypes.includes('truck'));assert.equal(model.userData.expansion.roadTypes.length,4)}}
  if(name==='rainy')assert(scene.fog.density<=.001,'Fog must leave the enlarged night district visible');
  if(name==='desert'&&model.userData.expansion.detailVersion===2){assert(model.userData.expansion.duneHeight>20);assert(model.userData.expansion.plantTypes.length>=6)}
  const extension=scene.getObjectByName(`expanded-${name}-world`);assert(extension&&extension.userData.staticInstances>800);
  const terrain=extension.getObjectByName('expanded-terrain-ring');terrain.geometry.computeBoundingBox();const bounds=terrain.geometry.boundingBox;
  assert.equal(bounds.min.x,-64);assert.equal(bounds.max.x,64);assert.equal(bounds.min.z,-64);assert.equal(bounds.max.z,64);
  assert(testControls.minDistance>=(name==='city'||model.userData.expansion.enrichment?22:100)&&camera.far>=1500);
  console.log(JSON.stringify({expandedScene:name,baseSize:128,coreSize:model.userData.coreBaseSize,additionalInstances:extension.userData.staticInstances,additionalBuildings:extension.userData.buildings,additionalTrees:extension.userData.trees}));
 }
 if(name==='ocean'){
  assert.equal(model.userData.coreBaseSize??model.userData.baseSize,32);assert.equal(model.userData.fishSchools,3);
  const water=scene.getObjectByName('rolling-ocean-surface'),floor=scene.getObjectByName('sandy-ocean-floor'),bodies=scene.getObjectByName('schooling-fish-bodies'),tails=scene.getObjectByName('schooling-fish-tails');
  assert(water&&floor&&scene.getObjectByName('transparent-ocean-section'));assert(water.material.transparent&&water.material.opacity<.5);assert.equal(bodies.count,72);
  floor.geometry.computeBoundingBox();assert.equal(floor.geometry.boundingBox.min.x,-16);assert.equal(floor.geometry.boundingBox.max.x,16);
  const dolphins=[],sprays=[],grass=[];model.traverse(o=>{if(o.name==='leaping-dolphin')dolphins.push(o);if(o.name==='dolphin-splash')sprays.push(o);if(o.name==='anchored-seagrass')grass.push(o)});
  assert.equal(dolphins.length,3);assert.equal(sprays.length,3);assert.equal(grass.length,20);assert(dolphins.some(o=>o.position.y>1),'The cover must show a breaching dolphin');
  const initialFish=Array.from(bodies.instanceMatrix.array),initialTail=Array.from(tails.instanceMatrix.array),initialWater=Array.from(water.geometry.attributes.position.array),initialDolphins=dolphins.map(o=>o.position.clone()),initialRoots=grass.map(o=>o.position.clone());
  const outerFish=[],outerDolphins=[],kelpRoots=[];model.traverse(o=>{if(o.name==='detailed-school-fish')outerFish.push(o);if(o.name==='expanded-breaching-dolphin')outerDolphins.push(o);if(o.name==='anchored-kelp-root')kelpRoots.push(o)});
  assert.equal(outerFish.length,176);assert.equal(outerDolphins.length,6);assert(kelpRoots.length>10);assert(model.userData.expansion.coralTypes.length>=5);assert(model.userData.expansion.height(-60,60)<-12);
  const kelpPositions=kelpRoots.map(o=>o.position.clone()),outerStart=outerDolphins.map(o=>o.position.clone());let outerMin=Infinity,outerMax=-Infinity;
  const breaches=[0,0,0],entries=[0,0,0],lastY=dolphins.map(o=>o.position.y),minY=[Infinity,Infinity,Infinity],maxY=[-Infinity,-Infinity,-Infinity];let splashSamples=0;
  if(!isPreview)for(let ms=100;ms<=54000;ms+=100){
   globalThis.frame(ms);
   outerFish.forEach(o=>{const {x,y,z}=o.position;assert(Math.abs(x)<62&&Math.abs(z)<62&&y<-.7);assert(y>model.userData.expansion.height(x,z)+.35,'Outer schools must clear the reef floor')});
   outerDolphins.forEach(o=>{assert(Math.abs(o.position.x)<62&&Math.abs(o.position.z)<62);outerMin=Math.min(outerMin,o.position.y);outerMax=Math.max(outerMax,o.position.y)});kelpRoots.forEach((o,i)=>assert(o.position.equals(kelpPositions[i])));
   const poses=model.userData.fishPoses;assert.equal(poses.length,72);
   poses.forEach(p=>{assert(Math.abs(p.x)<14.5&&Math.abs(p.z)<14.5);assert(p.y<-.8&&p.y>model.userData.seabedHeight(p.x,p.z)+.6,'Schooling fish must stay submerged and clear of the floor')});
   for(let school=0;school<3;school++){
    const group=poses.filter(p=>p.school===school),cx=group.reduce((s,p)=>s+p.x,0)/group.length,cz=group.reduce((s,p)=>s+p.z,0)/group.length;
    assert(group.every(p=>Math.hypot(p.x-cx,p.z-cz)<4.5),'Each school must remain coordinated');
   }
   dolphins.forEach((o,i)=>{
    assert(Math.abs(o.position.x)<14.5&&Math.abs(o.position.z)<13);assert(o.position.y>-3.2&&o.position.y<4.2);
    minY[i]=Math.min(minY[i],o.position.y);maxY[i]=Math.max(maxY[i],o.position.y);
    if(lastY[i]<=0&&o.position.y>0)breaches[i]++;if(lastY[i]>=0&&o.position.y<0)entries[i]++;lastY[i]=o.position.y;
    if(o.position.y>0)assert(Math.sign(o.rotation.z)===Math.sign(o.userData.velocity[1]),'Dolphins must pitch into their direction of travel');
   });
   splashSamples+=sprays.filter(o=>o.visible).length;grass.forEach((o,i)=>assert(o.position.equals(initialRoots[i]),'Seagrass must remain rooted'));
  }
  if(!isPreview&&!isReduced){
   assert(outerMin<-3&&outerMax>4,'Outer dolphins must complete their dive and breach');
   assert(breaches.every(n=>n>=2)&&entries.every(n=>n>=2));assert(minY.every(y=>y<-3)&&maxY.every(y=>y>4));assert(splashSamples>30);
   assert(initialFish.some((v,i)=>Math.abs(v-bodies.instanceMatrix.array[i])>.1));assert(initialTail.some((v,i)=>Math.abs(v-tails.instanceMatrix.array[i])>.1));assert(initialWater.some((v,i)=>Math.abs(v-water.geometry.attributes.position.array[i])>.01));
   // Both the leap/dive junction and the repeating loop must be continuous.
   for(let i=0;i<3;i++)for(const phase of [4,18]){
    const offset=1.6+i*6,seconds=(phase-offset+18)%18+72;
    globalThis.frame((seconds-.001)*1000);const before=dolphins[i].position.clone(),pitch=dolphins[i].rotation.z;
    globalThis.frame((seconds+.001)*1000);assert(dolphins[i].position.distanceTo(before)<.012,'Dolphins must not teleport when diving or recycling');assert(Math.abs(dolphins[i].rotation.z-pitch)<.03,'Dolphin pitch must remain continuous');
   }
  }else{
   outerDolphins.forEach((o,i)=>assert(o.position.equals(outerStart[i])));assert.deepEqual(Array.from(bodies.instanceMatrix.array),initialFish);assert.deepEqual(Array.from(tails.instanceMatrix.array),initialTail);assert.deepEqual(Array.from(water.geometry.attributes.position.array),initialWater);dolphins.forEach((o,i)=>assert(o.position.equals(initialDolphins[i])));
  }
  console.log(JSON.stringify({schoolingFish:bodies.count,schools:3,dolphins:dolphins.length,breaches,entries,splashSamples}));
 }
 if(name==='desert'){
  assert.equal(model.userData.coreBaseSize??model.userData.baseSize,32);
  const dunes=scene.getObjectByName('wind-sculpted-dunes'),arch=scene.getObjectByName('wind-eroded-sandstone-arch');
  assert(dunes&&arch&&scene.getObjectByName('square-desert-section')&&scene.getObjectByName('dune-sand-ripples')&&scene.getObjectByName('sun-bleached-deadwood'));
  dunes.geometry.computeBoundingBox();const bounds=dunes.geometry.boundingBox;
  assert.equal(bounds.min.x,-16);assert.equal(bounds.max.x,16);assert.equal(bounds.min.z,-16);assert.equal(bounds.max.z,16);assert(bounds.max.y-bounds.min.y>4.5);
  const shrubs=[],roots=[],cacti=[],pears=[];model.traverse(o=>{if(o.name==='wind-swept-desert-shrub')shrubs.push(o);if(o.name==='desert-shrub-root')roots.push(o);if(o.name==='saguaro-cactus')cacti.push(o);if(o.name==='prickly-pear-cactus')pears.push(o)});
  assert.equal(shrubs.length,24);assert.equal(roots.length,24);assert.equal(cacti.length,6);assert.equal(pears.length,6);
  const grains=scene.getObjectByName('wind-blown-sand');assert.equal(grains.count,480);
  const before=Array.from(grains.instanceMatrix.array),rootPositions=roots.map(o=>o.position.clone()),rotations=shrubs.map(o=>o.rotation.clone()),cactusPoses=cacti.map(o=>o.position.clone()),wind=[];
  for(const ms of isPreview?[]:[1000,3500,7000,15000,60000]){
   globalThis.frame(ms);wind.push(model.userData.windStrength);
   roots.forEach((o,i)=>assert(o.position.equals(rootPositions[i]),'Shrub roots must stay planted'));cacti.forEach((o,i)=>assert(o.position.equals(cactusPoses[i])));
   const matrix=grains.instanceMatrix.array;
   for(let i=0;i<grains.count;i++){const x=matrix[i*16+12],y=matrix[i*16+13],z=matrix[i*16+14];assert(Math.abs(x)<=15&&Math.abs(z)<=15);assert(y>model.userData.terrainHeight(x,z)+.06,'Wind-blown sand must remain above the terrain');}
  }
  if(!isPreview&&!isReduced){assert(Math.max(...wind)-Math.min(...wind)>.1);assert(before.some((v,i)=>Math.abs(v-grains.instanceMatrix.array[i])>.1));assert(shrubs.some((o,i)=>Math.abs(o.rotation.z-rotations[i].z)>.01))}
  else {assert.deepEqual(Array.from(grains.instanceMatrix.array),before);shrubs.forEach((o,i)=>assert.deepEqual(o.rotation.toArray(),rotations[i].toArray()))}
  const {Raycaster,Vector3}=await import(pathToFileURL(join(root,'node_modules/three/build/three.module.js')));scene.updateMatrixWorld(true);
  for(const [y,expectHit] of [[1.5,false],[5.7,true]]){
   const origin=new Vector3(0,y,4).applyMatrix4(arch.matrixWorld),direction=new Vector3(0,0,-1).transformDirection(arch.matrixWorld);
   const hits=new Raycaster(origin,direction,0,8).intersectObject(arch,true);assert.equal(hits.length>0,expectHit,'The sandstone arch must have a real opening below its span');
  }
  console.log(JSON.stringify({desertShrubs:shrubs.length,saguaros:cacti.length,pricklyPears:pears.length,sandGrains:grains.count,wind}));
 }
 if(name==='summit'){
  assert.equal(model.userData.coreBaseSize??model.userData.baseSize,32);
  const terrain=scene.getObjectByName('faceted-snowy-summit'),section=scene.getObjectByName('square-mountain-section');
  assert(terrain&&section&&scene.getObjectByName('summit-stone-cairn'));
  assert(terrain.userData.snowyFaces>4000&&terrain.userData.rockFaces>100,'Both snow cover and exposed rock must exist');
  terrain.geometry.computeBoundingBox();const bounds=terrain.geometry.boundingBox;
  assert.equal(bounds.min.x,-16);assert.equal(bounds.max.x,16);assert.equal(bounds.min.z,-16);assert.equal(bounds.max.z,16);assert(bounds.max.y>12);
  const shrubs=[],roots=[];model.traverse(o=>{if(o.name==='wind-bent-juniper')shrubs.push(o);if(o.name==='alpine-shrub-root')roots.push(o)});
  assert.equal(shrubs.length,30);assert.equal(roots.length,30);
  const sock=scene.getObjectByName('fluttering-windsock-cloth'),flakes=scene.getObjectByName('wind-driven-snow'),drift=scene.getObjectByName('ridge-spindrift');
  assert(sock&&flakes.count===780&&drift.count===160);
  const originalCloth=Array.from(sock.geometry.attributes.position.array),originalFlakes=Array.from(flakes.instanceMatrix.array),originalRoots=roots.map(o=>o.position.clone()),originalShrubs=shrubs.map(o=>o.rotation.clone());
  const wind=[];const times=isPreview?[]:[1000,3500,7000,15000];
  for(const ms of times){
   globalThis.frame(ms);wind.push(model.userData.windStrength);
   flakes.instanceMatrix.array.forEach(n=>assert(Number.isFinite(n)));
   for(let i=0;i<flakes.count;i++){const matrix=flakes.instanceMatrix.array,x=matrix[i*16+12],y=matrix[i*16+13],z=matrix[i*16+14];assert(Math.abs(x)<=15&&Math.abs(z)<=15);assert(y>model.userData.terrainHeight(x,z)+.35,'Snowflakes must remain above the mountain');}
   roots.forEach((root,i)=>assert(root.position.equals(originalRoots[i]),'Wind must not uproot shrubs'));
   // The cloth inlet is fixed to the hoop while downstream vertices flutter.
   for(let i=0;i<15*3;i++)assert.equal(sock.geometry.attributes.position.array[i],originalCloth[i]);
  }
  if(!isPreview&&!isReduced){
   assert(Math.max(...wind)-Math.min(...wind)>.1,'Wind must gust over time');
   assert(shrubs.some((o,i)=>Math.abs(o.rotation.z-originalShrubs[i].z)>.01));
   assert(originalCloth.some((v,i)=>Math.abs(v-sock.geometry.attributes.position.array[i])>.01));
   assert(originalFlakes.some((v,i)=>Math.abs(v-flakes.instanceMatrix.array[i])>.1));
  }else{
   assert.deepEqual(Array.from(sock.geometry.attributes.position.array),originalCloth);assert.deepEqual(Array.from(flakes.instanceMatrix.array),originalFlakes);
   shrubs.forEach((o,i)=>assert.deepEqual(o.rotation.toArray(),originalShrubs[i].toArray()));
  }
  console.log(JSON.stringify({alpineShrubs:shrubs.length,snowflakes:flakes.count,spindrift:drift.count,snowyFaces:terrain.userData.snowyFaces,rockFaces:terrain.userData.rockFaces,wind}));
 }
 if(name==='study'){
  assert.equal(model.userData.coreBaseSize??model.userData.baseSize,32);
  for(const n of ['wall-of-books','corner-reading-sofa','video-editing-workstation','editing-timeline-monitor','portrait-notes-monitor','ergonomic-editing-chair','open-reading-book','tiny-desk-robot','sleepy-cat-figurine','color-puzzle-cube','video-camera-tripod'])assert(scene.getObjectByName(n),n);
  const books=scene.getObjectByName('individual-library-books'),keys=scene.getObjectByName('mechanical-keyboard-keys'),sash=scene.getObjectByName('half-open-window-sash');
  assert(books?.isInstancedMesh&&books.count>300);assert(keys.count>60);assert(isNight?Math.abs(sash.rotation.y)<1e-10:sash.rotation.y<-.3&&sash.rotation.y>-.8);
  assert.equal(model.userData.period,isNight?'night':'day');assert.equal(model.userData.periodMode,isNight?'night':'auto');
  assert.equal(periodSwitch.hidden,isPreview);
  assert.equal(scene.getObjectByName('study-desk-lamp').intensity,isNight?9:0);
  const collection=scene.getObjectByName('figurine-display-cabinet'),garden=scene.getObjectByName('bookcase-top-garden');
  assert(collection?.children.filter(o=>o.name.startsWith('shelf-figurine-')).length===18);
  assert(new Set(collection.children.filter(o=>o.name.startsWith('shelf-figurine-')).map(o=>o.name.split('-')[2])).size>=10,'The cabinet must contain different kinds of figurines');
  assert(garden?.children.length===8&&new Set(garden.children.map(o=>o.name.split('-')[2])).size===6);
  scene.updateMatrixWorld(true);
  const monitorPosition=scene.getObjectByName('editing-timeline-monitor').getWorldPosition(scene.position.clone());
  const readingPosition=scene.getObjectByName('open-reading-book').getWorldPosition(scene.position.clone());
  assert(monitorPosition.x<0&&readingPosition.x>0,'Editing and reading furniture must swap sides');
  const cloths=['breezy-curtain-left','breezy-curtain-right'].map(n=>scene.getObjectByName(n));assert(cloths.every(Boolean));
  const before=cloths.map(c=>Array.from(c.geometry.attributes.position.array));
  if(!isPreview)globalThis.frame(2400);
  cloths.forEach((c,i)=>{
   const now=c.geometry.attributes.position.array,old=before[i];let hem=0;
   for(let k=0;k<33*3;k++)assert.equal(now[k],old[k],'Curtain tops must remain attached to the rail');
   for(let k=now.length-33*3;k<now.length;k++)hem=Math.max(hem,Math.abs(now[k]-old[k]));
   assert(isPreview||isReduced?hem===0:isNight?hem>0&&hem<.08:hem>.08,'Open curtains should sway, closed curtains should be stiller, and previews/reduced motion should settle');
  });
  const hands=['clock-hour-hand','clock-minute-hand','clock-second-hand'].map(n=>scene.getObjectByName(n));
  assert(hands.every(Boolean),'The wall clock needs three separate moving hands');
  if(!isPreview){
   const DeviceDate=globalThis.Date;let deviceTime;
   try{
    globalThis.Date=class extends DeviceDate{constructor(...args){super(...(args.length?args:[deviceTime]))}static now(){return deviceTime}};
    // Local device time, including fractions, midnight rollover and time corrections.
    for(const [i,parts] of [[0,[10,8,30,500]],[1,[10,8,31,0]],[2,[23,59,59,900]],[3,[0,0,0,100]],[4,[4,20,0,0]]]){
     deviceTime=new DeviceDate(2026,9,24,...parts).getTime();globalThis.frame(5000+i*1000);
     const [h,m,s,ms]=parts,seconds=s+ms/1000,minutes=m+seconds/60;
     const expected=[-(h%12+minutes/60)*Math.PI/6,-minutes*Math.PI/30,-seconds*Math.PI/30];
     hands.forEach((hand,k)=>assert(Math.abs(hand.rotation.z-expected[k])<1e-10,'Clock hands must follow device wall time, including reduced motion'));
    }
   }finally{globalThis.Date=DeviceDate}
  }
  if(!isPreview){
   const DeviceDate=globalThis.Date;let deviceTime,frameMs=12000;
   const button=mode=>periodButtons.find(b=>b.dataset.time===mode);
   const click=mode=>button(mode).handlers.click({stopPropagation(){}});
   const settle=()=>{for(let i=0;i<20;i++)globalThis.frame(frameMs+=100);};
   try{
    globalThis.Date=class extends HostDate{constructor(...args){super(...(args.length?args:[deviceTime]))}static now(){return deviceTime}};
    const setTime=(h,m=0,s=0,ms=0)=>deviceTime=new HostDate(2026,9,24,h,m,s,ms).getTime();
    setTime(12);click('auto');settle();
    for(const [hour,minute,second,millisecond,period] of [[5,59,59,999,'night'],[6,0,0,0,'day'],[17,59,59,999,'day'],[18,0,0,0,'night']]){
     setTime(hour,minute,second,millisecond);settle();assert.equal(model.userData.period,period);assert.equal(model.userData.periodMode,'auto');
     assert(Math.abs(model.userData.nightBlend-(period==='night'?1:0))<1e-8);
     assert.equal(scene.getObjectByName('study-desk-lamp').intensity,period==='night'?9:0);
     assert(Math.abs(sash.rotation.y-(period==='night'?0:-.46))<1e-8);
     const left=cloths[0].geometry.attributes.position,right=cloths[1].geometry.attributes.position;
     assert(period==='night'?left.getX(32)>right.getX(0):left.getX(32)<right.getX(0),'Closed curtain panels must overlap at their center seam');
    }
    setTime(12);click('night');settle();assert.equal(model.userData.period,'night');
    setTime(7);settle();assert.equal(model.userData.period,'night','Manual night must survive daytime');
    setTime(23);click('day');settle();assert.equal(model.userData.period,'day','Manual day must override night time');
    click('auto');settle();assert.equal(model.userData.period,'night','Auto must resume following device local time');
    setTime(12);click(isNight?'night':'auto');settle();
   }finally{globalThis.Date=DeviceDate}
  }
  assert(testControls.minDistance>=40&&testControls.maxPolarAngle<Math.PI/2);
  scene.updateMatrixWorld(true);
  const {Raycaster,Vector3}=await import(pathToFileURL(join(root,'node_modules/three/build/three.module.js')));
  for(const [x,z] of [[15.2,14.5],[-14.5,14.5],[14.5,-14.0]]){
   const ray=new Raycaster(new Vector3(x,14,z),new Vector3(0,-1,0));assert(ray.intersectObject(scene.getObjectByName('study-static-interior'),true).some(h=>h.object.isMesh),'The complete square floor must exist');
  }
  console.log(JSON.stringify({coreBaseSize:32,books:books.count,keyboardKeys:keys.count,openWindowRadians:sash.rotation.y,curtains:cloths.length}));
 }
 if(name==='onsen'){
  const bath=scene.getObjectByName('reflective-mountain-onsen'),steam=scene.getObjectByName('rising-onsen-steam'),tiles=scene.getObjectByName('individual-ceramic-roof-tiles'),leaves=scene.getObjectByName('drifting-onsen-maple-leaves');
  assert(bath?.isReflector&&steam?.isInstancedMesh&&tiles?.isInstancedMesh&&leaves?.isInstancedMesh);
  assert(scene.getObjectByName('mountain-ryokan')&&scene.getObjectByName('ryokan-bathhouse-annex')&&scene.getObjectByName('arched-cedar-footbridge')&&scene.getObjectByName('forest-tea-pavilion'));
  assert.equal(model.userData.coreBaseSize??model.userData.baseSize,32);assert.equal(model.userData.period,isNight?'night':'day');
  assert.equal(bath.material.uniforms.night.value,isNight?1:0);
  const warm=[];scene.traverse(o=>{if(o.name==='onsen-warm-light')warm.push(o)});assert(warm.length>=10);
  warm.forEach(light=>assert.equal(light.intensity,isNight?light.userData.nightIntensity:light.userData.dayIntensity));
  assert.equal(steam.count,56);assert(tiles.count>2400);assert.equal(leaves.count,26);
  assert(Math.abs(bath.position.y-2.86)<1e-8);
  const phase=steam.geometry.attributes.phase.array,life=steam.geometry.attributes.life.array;
  assert(new Set(phase).size===56&&Math.max(...life)-Math.min(...life)>6,'Steam must rise on independent lifetimes');
  const before=Array.from(leaves.instanceMatrix.array);if(!isPreview)globalThis.frame(4500);
  const changed=before.some((n,i)=>Math.abs(n-leaves.instanceMatrix.array[i])>.001);
  assert.equal(changed,!isPreview&&!isReduced);
  assert(Math.abs(bath.material.uniforms.time.value-(!isPreview&&!isReduced?4.5:0))<1e-8);
  assert(testControls.minDistance>=42&&testControls.maxPolarAngle<Math.PI/2);
  const {Raycaster,Vector3}=await import(pathToFileURL(join(root,'node_modules/three/build/three.module.js')));
  scene.updateMatrixWorld(true);
  const ray=new Raycaster(new Vector3(4.5,2.70,5.0),new Vector3(0,-1,0));
  const hits=ray.intersectObject(scene.getObjectByName('onsen-static-landscape'),true).filter(h=>h.object.isMesh&&!h.object.material.transparent);
  assert(hits.length&&hits[0].point.y<2.27,'The bath must have real depth, without terrain crossing the water');
  for(const [x,z] of [[-15.3,14.2],[15.3,14.2],[14.8,-13.7]]){
   const expandedRay=new Raycaster(new Vector3(x,20,z),new Vector3(0,-1,0));
   assert(expandedRay.intersectObject(scene.getObjectByName('onsen-static-landscape'),true).some(h=>h.object.isMesh),'The added perimeter must have actual terrain');
  }
  for(const n of ['hillside-guest-west','hillside-guest-east','mountain-dining-house','mountain-entry-gate'])assert(scene.getObjectByName(n),'New hillside buildings must be present');
  const terrainY=(x,z)=>new Raycaster(new Vector3(x,40,z),new Vector3(0,-1,0)).intersectObject(scene.getObjectByName('onsen-static-landscape'),true).find(h=>h.object.isMesh&&h.object.material.vertexColors)?.point.y;
  const upper=terrainY(-1,-13),lower=terrainY(-1,14);
  assert(Number.isFinite(upper)&&Number.isFinite(lower)&&upper-lower>6,'The terrain must have an actual mountain slope');
  const g=bath.geometry,pos=g.attributes.position,idx=g.index;let bathArea=0;
  for(let i=0;i<idx.count;i+=3){const a=idx.getX(i),b=idx.getX(i+1),c=idx.getX(i+2);bathArea+=Math.abs((pos.getX(b)-pos.getX(a))*(pos.getY(c)-pos.getY(a))-(pos.getY(b)-pos.getY(a))*(pos.getX(c)-pos.getX(a)))/2;}
  assert(bathArea>44&&bathArea<50,'The enlarged spring must have approximately twice its former surface area');
  model.traverse(o=>{if(o.name==='warm-stone-lantern'||o.name==='cedar-bathing-bucket'){
   assert(((o.position.x-4.5)/4.5)**2+((o.position.z-5.0)/3.25)**2>1.05,'Lanterns and bathing buckets must stay on the new shore');
  }});
  if(isNight){assert(Math.max(...warm.map(l=>l.intensity))<3,'Night lamps must remain dim');assert(warm.every(l=>l.color.r>l.color.g&&l.color.g>l.color.b*2),'Night lamps must be orange-yellow');}
  console.log(JSON.stringify({coreBaseSize:32,bathArea,terrainDrop:upper-lower,period:model.userData.period,warmLights:warm.length,roofTiles:tiles.count,steamWisps:steam.count,driftingLeaves:leaves.count,submergedFloor:hits[0].point.y}));
 }
 if(name==='rainy'){
  const rain=scene.getObjectByName('falling-rain'),ripples=scene.getObjectByName('independent-rain-ripples'),water=scene.getObjectByName('rain-reflecting-puddles'),goods=scene.getObjectByName('store-products');
  assert(rain?.isLineSegments&&water?.isReflector&&ripples?.isInstancedMesh);
  assert(goods.count>=400,'The store must have real stocked shelves');
  assert.equal(ripples.count,96);
  const p=rain.geometry.attributes.position,f=rain.geometry.attributes.floorY;
  assert.equal(p.count,(isPreview?1600:3300)*2);
  let covered=0;
  for(let i=0;i<p.count;i+=2){
   const x=p.getX(i),z=p.getZ(i),floor=f.getX(i);
   assert(Math.abs(x)<9&&Math.abs(z)<9&&Number.isFinite(floor));
   if(x>-6.6&&x<3.6&&z>-5.6&&z<0){assert(floor>=3.7,'Rain must stop above the roof');covered++;}
  }
  assert(covered>100);
  const phases=ripples.geometry.attributes.phase.array,lives=ripples.geometry.attributes.life.array;
  assert(new Set(phases).size>90&&Math.max(...lives)-Math.min(...lives)>.6,'Ripples must have independent timing');
  if(!isPreview){globalThis.frame(2300);assert(Math.abs(rain.material.uniforms.time.value-(isReduced?0:2.3))<1e-8);assert.equal(water.material.uniforms.time.value,rain.material.uniforms.time.value);}
  assert(testControls.minDistance>=21&&testControls.maxPolarAngle<Math.PI/2);
  console.log(JSON.stringify({products:goods.count,rainStreaks:p.count/2,ripples:ripples.count,roofProtectedDrops:covered}));
 }
 if(name==='city')await (await import(pathToFileURL(join(root,'scripts/check-city-fusion.mjs')))).checkCityFusion({scene,model,isPreview,isReduced,frame:globalThis.frame});
 if(model.userData.expansion?.enrichment){
  const e=model.userData.expansion.enrichment;assert.equal(e.version,3);assert(e.parts>1000);assert(e.zones.length>=3);assert(e.reference.components&&Object.keys(e.reference.components).length>=5);
  assert(e.bounds.min.every(Number.isFinite)&&e.bounds.max.every(Number.isFinite));assert(e.bounds.min[0]>=-64.1&&e.bounds.min[2]>=-64.1&&e.bounds.max[0]<=64.1&&e.bounds.max[2]<=64.1,`New detail exceeds the base: ${JSON.stringify(e.bounds)}`);
  const wind=e.wind.value;if(!isPreview)globalThis.frame(271000);assert(isPreview||isReduced?e.wind.value===0:e.wind.value>wind);
  for(const [label,x,y,z] of e.anchors){const g=scene.getObjectByName(label);assert(g&&g.position.equals(new (await import(pathToFileURL(join(root,'node_modules/three/build/three.module.js')))).Vector3(x,y,z)),'Detail anchors must remain fixed');}
  console.log(JSON.stringify({enrichedScene:name,parts:e.parts,components:e.counts}));
 }
 if(expanded){
  const extraFish=scene.getObjectByName('expanded-fish-schools');
  if(extraFish){assert.equal(extraFish.count,name==='ocean'?288:192);const a=extraFish.instanceMatrix.array;for(let i=0;i<extraFish.count;i++){const x=a[i*16+12],y=a[i*16+13],z=a[i*16+14];assert(Math.abs(x)<62&&Math.abs(z)<62&&y<0&&y>(name==='ocean'?-5.5:-2.5),'Additional schools must remain inside the water volume')}}
  if(name==='ocean'&&model.userData.expansion.detailVersion!==2){const extras=[];model.traverse(o=>{if(o.name==='expanded-breaching-dolphin')extras.push(o)});assert.equal(extras.length,6);assert(model.userData.expansion.corals>60)}
  const moving=['expanded-weather','expanded-fish-schools','expanded-neighborhood-traffic','detailed-weather','detailed-boxdynamic','detailed-cyldynamic','detailed-spheredynamic'].map(n=>scene.getObjectByName(n)).filter(Boolean);
  if(!isPreview&&moving.length){const before=moving.map(o=>Array.from(o.instanceMatrix.array));globalThis.frame(231000);moving.forEach((o,i)=>{const after=Array.from(o.instanceMatrix.array);if(isReduced)assert.deepEqual(after,before[i]);else assert(after.some((v,j)=>Math.abs(v-before[i][j])>.01),'New elements must animate across the expanded world')})}
 }
 scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
 const {Vector3,Matrix4,ShaderChunk}=await import(pathToFileURL(join(root,'node_modules/three/build/three.module.js')));
 const point=new Vector3();let meshes=0,instances=0,vertices=0,invalid=0,minWorldY=Infinity;
 const projected={left:Infinity,right:-Infinity,bottom:Infinity,top:-Infinity};
 const cityExtent={x:0,z:0};const recordCityExtent=p=>{if(name==='city'){cityExtent.x=Math.max(cityExtent.x,Math.abs(p.x));cityExtent.z=Math.max(cityExtent.z,Math.abs(p.z));}};
 model.traverse(o=>{
  if(!o.isMesh)return;
  if(name==='city'){for(let a=o;a;a=a.parent)if(!a.visible)return;}
  if(name==='sakura'||name==='rooftop'){for(let p=o;p&&p!==model;p=p.parent)if(!p.visible)return;}
  meshes++;if(o.isInstancedMesh)instances+=o.count;
  const p=o.geometry.attributes.position;vertices+=p.count;
  for(const n of o.matrixWorld.elements)if(!Number.isFinite(n))invalid++;
  for(const n of p.array)if(!Number.isFinite(n))invalid++;
  if(o.isInstancedMesh){
   for(const n of o.instanceMatrix.array)if(!Number.isFinite(n))invalid++;
   if(expanded||name==='courtyard'||name==='sakura'||name==='rooftop'||name==='onsen'||name==='study'||name==='summit'||name==='desert'||name==='ocean'){
    o.geometry.computeBoundingBox();const bounds=o.geometry.boundingBox,im=new Matrix4(),world=new Matrix4();
    for(let i=0;i<o.count;i++){
     o.getMatrixAt(i,im);world.multiplyMatrices(o.matrixWorld,im);
     for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
      point.set(x,y,z).applyMatrix4(world);recordCityExtent(point);point.project(camera);
      projected.left=Math.min(projected.left,point.x);projected.right=Math.max(projected.right,point.x);projected.bottom=Math.min(projected.bottom,point.y);projected.top=Math.max(projected.top,point.y);
     }
    }
   }
   return;
  }
  for(let i=0;i<p.count;i++){
   point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);if(name==='city'&&o.material.clippingPlanes?.some(p=>p.distanceToPoint(point)<-.0001))continue;recordCityExtent(point);minWorldY=Math.min(minWorldY,point.y);if(name==='rooftop'&&o.material.clippingPlanes?.some(p=>p.distanceToPoint(point)<-.0001))continue;point.project(camera);
   projected.left=Math.min(projected.left,point.x);projected.right=Math.max(projected.right,point.x);projected.bottom=Math.min(projected.bottom,point.y);projected.top=Math.max(projected.top,point.y);
  }
 });
 if(name==='city')assert(cityExtent.x<=64.15&&cityExtent.z<=64.15,`City details exceed the base: ${JSON.stringify(cityExtent)}`);
 assert.equal(invalid,0);assert(instances>(name==='rooftop'?500:name==='rainy'?1000:name==='onsen'?2200:name==='study'?800:name==='intersection'?2000:name==='summit'?1800:name==='desert'?1800:name==='ocean'?2200:3000));assert(meshes<(name==='city'?850:expanded?360:260));
 if(name==='lakeside')assert(minWorldY < -3.0&&minWorldY > -3.1,'The deeper soil and water section must be retained');
 if(process.env.SCENE_SHADER_OUTPUT){
  const shaders=[];const expand=s=>s.replace(/#include <(\w+)>/g,(_,name)=>expand(ShaderChunk[name]));
  model.traverse(o=>{if(o.material?.isShaderMaterial)shaders.push({vertex:expand(o.material.vertexShader),fragment:expand(o.material.fragmentShader)})});
  await writeFile(process.env.SCENE_SHADER_OUTPUT,JSON.stringify(shaders));
 }
 assert(Object.values(projected).every(n=>Math.abs(n)<.98),`Camera crops the scene: ${JSON.stringify(projected)}`);
 if(name==='city'){
  const minimum=name==='city'?-1.241:-1.651,maximum=name==='city'?.091:.121;
  const planes=new Map(['x:-8','x:8','z:-8','z:8'].map(k=>[k,new Map()]));
  const triangle=[new Vector3(),new Vector3(),new Vector3()];
  model.traverse(o=>{
   if(!o.isMesh||o.isInstancedMesh||o.material.transparent)return;
   const g=o.geometry,p=g.attributes.position,idx=g.index,n=idx?idx.count:p.count;
   for(let i=0;i<n;i+=3){
    triangle.forEach((v,j)=>v.fromBufferAttribute(p,idx?idx.getX(i+j):i+j).applyMatrix4(o.matrixWorld));
    const lo=Math.min(...triangle.map(v=>v.y)),hi=Math.max(...triangle.map(v=>v.y));
    if(lo < minimum || hi > maximum || hi-lo < .01)continue;
    for(const [key,faces] of planes){const [axis,plane]=key.split(':');if(triangle.every(v=>Math.abs(v[axis]-Number(plane))<1e-5)){const interval=[lo,hi].map(v=>Number(v.toFixed(5)));faces.set(interval.join(':'),interval)}}
   }
  });
  for(const [plane,faces] of planes){
   const intervals=[...faces.values()].sort((a,b)=>a[0]-b[0]);assert.equal(intervals.length,3);
   for(let i=1;i<intervals.length;i++)assert(Math.abs(intervals[i][0]-intervals[i-1][1])<1e-5,`${plane}: overlapping strata`);
  }
 }
 assert.equal(testControls.enabled,!isPreview);
 if(name==='rooftop'||name==='rainy'||name==='onsen'||name==='study'||name==='intersection'||name==='summit'||name==='desert'||name==='ocean'){
  const before=camera.position.clone(),aspect=camera.aspect;
  for(const [w,h] of [[0,330],[624,0],[0,0]]){
   globalThis.innerWidth=w;globalThis.innerHeight=h;listeners.get('resize')();
   assert(camera.position.equals(before)&&camera.aspect===aspect,'Collapsed previews must preserve the last valid camera');
  }
  globalThis.innerWidth=624;globalThis.innerHeight=330;listeners.get('resize')();
  assert(camera.position.toArray().every(Number.isFinite),'The preview camera must recover after becoming visible');
  assert.equal(camera.aspect,624/330);
 }
 // A narrower viewport must still frame the model on a direct load or resize.
 globalThis.innerWidth=390;globalThis.innerHeight=844;listeners.get('resize')();
 console.log(JSON.stringify({scene:name,width,height,preview:isPreview,reduced:isReduced,meshes,instances,vertices,projected}));
}finally{globalThis.Date=HostDate;await rm(temp,{recursive:true,force:true})}
