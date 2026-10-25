// Exercise real Three.js geometry and animation on Node, stubbing only browser I/O.
// This is not a browser or GPU rendering test.
import { build } from 'esbuild';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const name=process.argv[2]||'lakeside';
const width=Number(process.argv[3]||1440),height=Number(process.argv[4]||1000);
const isPreview=process.argv.includes('--preview'),isReduced=process.argv.includes('--reduced'),isNight=process.argv.includes('--night');
assert(['city','lakeside','courtyard','sakura','rooftop','rainy','onsen','study','intersection','summit'].includes(name));
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
 if(name==='summit'){
  assert.equal(model.userData.baseSize,32);
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
 if(name==='intersection'){
  assert.equal(model.userData.baseSize,32);
  const cars=[];model.traverse(o=>{if(o.name==='moving-traffic-car')cars.push(o)});
  assert.equal(cars.length,12);assert.equal(new Set(cars.map(c=>c.userData.lane)).size,4);
  const before=cars.map(c=>c.position.clone()),crossings=[0,0,0,0],wraps=[0,0,0,0];
  if(!isPreview&&!isReduced){
   for(let ms=25;ms<=180000;ms+=25){
    const old=cars.map(c=>({...c.userData}));globalThis.frame(ms);
    cars.forEach((c,i)=>{
     const p=c.userData.progress,prev=old[i].progress,{axis,state}=model.userData.signalPhase;
     if(prev<=-7.85&&!(axis===c.userData.axis&&state==='green'))assert(p<=-7.85+1e-7,'Vehicles must wait behind the stop line on red/amber');
     if(prev<0&&p>=0)crossings[c.userData.lane]++;
     if(p<prev-10)wraps[c.userData.lane]++;
     assert(Number.isFinite(p)&&c.userData.speed>=0);
    });
    for(let lane=0;lane<4;lane++){
     const queue=cars.filter(c=>c.userData.lane===lane).map(c=>c.userData.progress).sort((a,b)=>a-b);
     for(let j=1;j<queue.length;j++)assert(queue[j]-queue[j-1]>=3.74,'Traffic queues must preserve spacing');
    }
    // AABB footprints of orthogonal cars may never intersect in the junction.
    for(const a of cars.filter(c=>c.userData.axis===0))for(const b of cars.filter(c=>c.userData.axis===1))assert(Math.abs(a.position.x-b.position.x)>2.01||Math.abs(a.position.z-b.position.z)>2.01,'Cross traffic collision');
   }
   assert(crossings.every(n=>n>9)&&wraps.every(n=>n>8),'Traffic must keep circulating from all four directions');
  }else {
   if(!isPreview)for(const ms of [1000,5000,17000,34000])globalThis.frame(ms);
   cars.forEach((c,i)=>assert(c.position.equals(before[i]),'Previews and reduced motion must stay still'));
  }
  console.log(JSON.stringify({trafficCars:cars.length,crossings,wraps}));
 }
 if(name==='study'){
  assert.equal(model.userData.baseSize,32);
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
  console.log(JSON.stringify({baseSize:32,books:books.count,keyboardKeys:keys.count,openWindowRadians:sash.rotation.y,curtains:cloths.length}));
 }
 if(name==='onsen'){
  const bath=scene.getObjectByName('reflective-mountain-onsen'),steam=scene.getObjectByName('rising-onsen-steam'),tiles=scene.getObjectByName('individual-ceramic-roof-tiles'),leaves=scene.getObjectByName('drifting-onsen-maple-leaves');
  assert(bath?.isReflector&&steam?.isInstancedMesh&&tiles?.isInstancedMesh&&leaves?.isInstancedMesh);
  assert(scene.getObjectByName('mountain-ryokan')&&scene.getObjectByName('ryokan-bathhouse-annex')&&scene.getObjectByName('arched-cedar-footbridge')&&scene.getObjectByName('forest-tea-pavilion'));
  assert.equal(model.userData.baseSize,32);assert.equal(model.userData.period,isNight?'night':'day');
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
  console.log(JSON.stringify({baseSize:32,bathArea,terrainDrop:upper-lower,period:model.userData.period,warmLights:warm.length,roofTiles:tiles.count,steamWisps:steam.count,driftingLeaves:leaves.count,submergedFloor:hits[0].point.y}));
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
 if(name==='rooftop'){
  const train=scene.getObjectByName('rooftop-commuter-train'),railway=scene.getObjectByName('roof-railway');
  const shops=['corner-coffee','greengrocer','ramen-counter','cycle-workshop','small-general-store'].map(n=>scene.getObjectByName(n));
  const cars=[],wheels=[],clothes=[];
  model.traverse(o=>{if(o.name==='commuter-car')cars.push(o);if(o.name==='roof-train-wheel')wheels.push(o);if(o.name==='roof-laundry')clothes.push(o)});
  assert(train&&railway&&shops.every(Boolean));assert.equal(cars.length,2);assert.equal(wheels.length,8);assert.equal(clothes.length,6);
  assert(testControls.minDistance>=20&&testControls.maxPolarAngle<Math.PI/2);
  train.traverse(o=>{if(o.isMesh)assert.equal(o.material.clippingPlanes?.length,2)});
  const initialZ=train.position.z,initialClothes=clothes.map(o=>o.rotation.x);let minZ=initialZ,maxZ=initialZ;
  if(!isPreview)for(let ms=200;ms<=60000;ms+=200){globalThis.frame(ms);assert(Math.abs(train.position.x+5.05)<1e-6);assert(Math.abs(train.position.y-3.36)<1e-6);minZ=Math.min(minZ,train.position.z);maxZ=Math.max(maxZ,train.position.z);}
  if(!isPreview&&!isReduced){assert(maxZ-minZ>24);assert(clothes.some((o,i)=>Math.abs(o.rotation.x-initialClothes[i])>.001))}
  else assert.equal(train.position.z,initialZ);
  if(!isPreview)globalThis.frame(0);
  scene.updateMatrixWorld(true);
  const {Raycaster,Vector3}=await import(pathToFileURL(join(root,'node_modules/three/build/three.module.js')));
  for(const z of [-7.25,-3.72,-.19,3.34,6.87]){
   const railRay=new Raycaster(new Vector3(-5.63,4.0,z),new Vector3(0,-1,0));
   const railHits=railRay.intersectObject(scene.getObjectByName('static-rooftop-street'),true).filter(h=>h.object.isMesh);
   assert(railHits.length&&Math.abs(railHits[0].point.y-3.78)<.005,'Rail heads must remain on the rooftop track');
   const slabRay=new Raycaster(new Vector3(-5.05,3.47,z),new Vector3(0,-1,0));
   const slabHits=slabRay.intersectObject(scene.getObjectByName('static-rooftop-street'),true).filter(h=>h.object.isMesh);
   assert(slabHits.length&&Math.abs(slabHits[0].point.y-3.44)<.005,'Continuous roof slab must support the track');
  }
  for(const wheel of wheels){const p=new Vector3();wheel.getWorldPosition(p);assert(Math.abs(p.y-3.97)<1e-5);assert(Math.min(Math.abs(p.x+5.63),Math.abs(p.x+4.47))<1e-5);}
  console.log(JSON.stringify({shops:shops.length,cars:cars.length,alignedWheelsets:wheels.length,laundry:clothes.length,trainRange:[minZ,maxZ]}));
 }
 if(name==='sakura'){
  const train=scene.getObjectByName('local-railcar'),petals=scene.getObjectByName('drifting-cherry-petals');
  const booms=[],crowns=[];model.traverse(o=>{if(o.name==='crossing-boom')booms.push(o);if(o.name==='cherry-blossom-crown')crowns.push(o)});
  assert(train&&petals&&scene.getObjectByName('sakura-platform')&&scene.getObjectByName('timber-station-house'));
  assert.equal(booms.length,2);assert.equal(crowns.length,8);assert(petals.count>=150);
  assert(testControls.minDistance>=19&&testControls.maxPolarAngle<Math.PI/2);
  train.traverse(o=>{if(o.isMesh)assert.equal(o.material.clippingPlanes?.length,2,'The railcar must be clipped inside the base')});
  const before=Array.from(petals.instanceMatrix.array.slice(0,16));let crossings=0;
  if(!isPreview){
   for(let ms=100;ms<=64000;ms+=100){
    globalThis.frame(ms);
    if(train.visible&&train.position.x+1.8>2.8&&train.position.x-1.8<5.0){
     assert(booms.every(g=>Math.abs(g.rotation.z)<.01)&&train.userData.crossingProtected,'Crossing must close before the railcar enters');crossings++;
    }
   }
  }
  if(!isPreview&&!isReduced){assert(crossings>40);assert(before.some((a,i)=>Math.abs(a-petals.instanceMatrix.array[i])>.01))}
  else assert.deepEqual(Array.from(petals.instanceMatrix.array.slice(0,16)),before);
  assert(!train.visible,'Preview and the end of the loop should show the empty station');
  const {Raycaster,Vector3}=await import(pathToFileURL(join(root,'node_modules/three/build/three.module.js')));
  scene.updateMatrixWorld(true);
  for(const side of [-1,1])for(const height of [1.2,3.55]){
   const ray=new Raycaster(new Vector3(side*6,height,0),new Vector3(side,0,0));
   const hits=ray.intersectObject(scene.getObjectByName('static-station'),true).filter(h=>h.object.isMesh);
   assert(hits.length&&hits[0].distance>2.5&&hits[0].distance<3.1,`Tunnel clearance ${side}/${height}: ${JSON.stringify(hits.slice(0,3).map(h=>({distance:h.distance,point:h.point.toArray(),color:h.object.material.color?.getHexString()})))}`);
  }
  console.log(JSON.stringify({cherryTrees:crowns.length,petals:petals.count,protectedCrossingSamples:crossings}));
 }
 if(name==='courtyard'){
  const fixtures=['double-air-walker','horse-rider','three-position-waist-twister','double-seated-leg-press','waist-back-massager','upper-body-pulley','parallel-bars'].map(n=>scene.getObjectByName(n));
  assert(fixtures.every(Boolean),'All seven fitness stations must exist');
  assert(scene.getObjectByName('residential-facade')&&scene.getObjectByName('parked-bicycle'));
  assert(testControls.minDistance>=17&&testControls.maxPolarAngle<Math.PI/2);
  const crowns=[],leaves=[];model.traverse(o=>{if(o.name==='breeze-tree-crown')crowns.push(o);if(o.name==='falling-leaf')leaves.push(o)});
  assert.equal(crowns.length,3);assert.equal(leaves.length,4);
  const leafPosition=leaves[0].position.clone();
  const fixturePoses=fixtures.map(o=>[...o.position.toArray(),...o.rotation.toArray()]);
  if(!isPreview){for(const ms of [1000,5000,16000,60000])globalThis.frame(ms)}
  if(!isPreview&&!isReduced){assert(crowns.some(o=>Math.abs(o.rotation.z)>.001));assert(leaves[0].position.distanceTo(leafPosition)>.1)}
  else assert(leaves[0].position.equals(leafPosition));
  fixtures.forEach((o,i)=>assert.deepEqual([...o.position.toArray(),...o.rotation.toArray()],fixturePoses[i]));
  console.log(JSON.stringify({fitnessStations:fixtures.length,trees:crowns.length,fallingLeaves:leaves.length}));
 }
 if(name==='lakeside'){
  const belly=scene.getObjectByName('breathing-belly');
  const ears=['left-ear','right-ear'].map(n=>scene.getObjectByName(n));
  assert(belly&&ears.every(Boolean));
  assert(testControls.minDistance>16&&testControls.maxPolarAngle<Math.PI/2);
  const fish=[];let boughs=0,grassPatches=0;
  model.traverse(o=>{if(o.name==='swimming-fish')fish.push(o);if(o.name==='swaying-willow')boughs++;if(o.name==='breeze-grass')grassPatches++});
  assert.equal(fish.length,24);assert.equal(new Set(fish.map(f=>f.userData.species)).size,4);
  assert(boughs>=40&&grassPatches>=24,'Additional trees and ground cover must remain present');
  assert(scene.getObjectByName('broken-lakeside-bridge')&&scene.getObjectByName('woven-fishing-basket'));
  assert(scene.getObjectByName('chaise-book-and-sleeping-cat').scale.x<.8);
  const lake=scene.getObjectByName('reflective-lake'),lakePositions=lake.geometry.attributes.position;
  const rows=new Map();
  for(let i=0;i<lakePositions.count;i++){
   const z=Number((-lakePositions.getY(i)).toFixed(5)),x=lakePositions.getX(i);
   rows.set(z,Math.min(rows.get(z)??Infinity,x));
  }
  const edges=[...rows].sort((a,b)=>a[0]-b[0]);
  assert(edges.at(-1)[1]-edges[0][1]>4.8,'Shoreline must run diagonally across the base');
  function bankAt(z){
   const j=Math.min(edges.length-2,Math.max(0,Math.floor((z+8)/16*(edges.length-1))));
   const [a,b]=[edges[j],edges[j+1]],t=(z-a[0])/(b[0]-a[0]);return a[1]+t*(b[1]-a[1]);
  }
  const motion=fish.map(f=>({last:f.position.x,direction:0,reversals:0,min:f.position.x,max:f.position.x}));
  function checkFish(){fish.forEach((f,i)=>{
   const {x,y,z}=f.position;
   assert(Math.abs(z)<7.7&&x>bankAt(z)+.4&&x<7.6,'Fish escaped the water footprint');
   assert(y<.04&&y>-2.5,'Fish must stay submerged and above the base');
   const state=motion[i],delta=x-state.last;
   if(Math.abs(delta)>.00001){const sign=Math.sign(delta);if(state.direction&&sign!==state.direction)state.reversals++;state.direction=sign;}
   state.last=x;state.min=Math.min(state.min,x);state.max=Math.max(state.max,x);
  })}
  checkFish();

  const events=[];let active=[false,false],smallest=1,largest=1;
  if(!isPreview){
   for(let ms=20;ms<=90000;ms+=20){
    globalThis.frame(ms);if(ms%200===0)checkFish();smallest=Math.min(smallest,belly.scale.y);largest=Math.max(largest,belly.scale.y);
    ears.forEach((e,i)=>{const moving=Math.abs(e.rotation.z-(i===0?-.19:.19))>.0001;if(moving&&!active[i])events.push({t:ms/1000,i});active[i]=moving});
   }
  }
  if(!isPreview&&!isReduced){
   assert(smallest<.99&&largest>1.01,'Breathing must remain subtle and continuous');
   assert(motion.every(s=>s.reversals>=2&&s.max-s.min>.8),'Every fish must swim back and forth over time');
   assert(events.length>=14&&events.length<50,'Ears should twitch intermittently');
   // Separate two twitches belonging to a follow-up flick from new events.
   const onsets=events.filter((e,i)=>i===0||e.t-events[i-1].t>1);
   for(let i=1;i<onsets.length;i++){const dt=onsets[i].t-onsets[i-1].t;assert(dt>=2.98&&dt<=6.04,`Ear interval ${dt}`)}
   assert(!events.some((e,i)=>i>0&&e.i!==events[i-1].i&&e.t===events[i-1].t),'Ears must not twitch in synchrony');
  }else assert.equal(belly.scale.y,1);
  const water=scene.getObjectByName('reflective-lake');assert(water?.isReflector);
  const g=water.geometry,p=g.attributes.position,idx=g.index;let area=0;
  for(let i=0;i<idx.count;i+=3){const ids=[idx.getX(i),idx.getX(i+1),idx.getX(i+2)];const [a,b,c]=ids.map(i=>[p.getX(i),p.getY(i)]);area+=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;}
  assert(area/256>.73&&area/256<.77,`Lake fraction ${area/256}`);
  console.log(JSON.stringify({lakeFraction:Number((area/256).toFixed(3)),fish:fish.length,species:4,breathing:[smallest,largest],earTwitches:events.length}));
 }
 scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
 const {Vector3,Matrix4,ShaderChunk}=await import(pathToFileURL(join(root,'node_modules/three/build/three.module.js')));
 const point=new Vector3();let meshes=0,instances=0,vertices=0,invalid=0,minWorldY=Infinity;
 const projected={left:Infinity,right:-Infinity,bottom:Infinity,top:-Infinity};
 model.traverse(o=>{
  if(!o.isMesh)return;
  if(name==='sakura'||name==='rooftop'){for(let p=o;p&&p!==model;p=p.parent)if(!p.visible)return;}
  meshes++;if(o.isInstancedMesh)instances+=o.count;
  const p=o.geometry.attributes.position;vertices+=p.count;
  for(const n of o.matrixWorld.elements)if(!Number.isFinite(n))invalid++;
  for(const n of p.array)if(!Number.isFinite(n))invalid++;
  if(o.isInstancedMesh){
   for(const n of o.instanceMatrix.array)if(!Number.isFinite(n))invalid++;
   if(name==='courtyard'||name==='sakura'||name==='rooftop'||name==='onsen'||name==='study'||name==='summit'){
    o.geometry.computeBoundingBox();const bounds=o.geometry.boundingBox,im=new Matrix4(),world=new Matrix4();
    for(let i=0;i<o.count;i++){
     o.getMatrixAt(i,im);world.multiplyMatrices(o.matrixWorld,im);
     for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
      point.set(x,y,z).applyMatrix4(world).project(camera);
      projected.left=Math.min(projected.left,point.x);projected.right=Math.max(projected.right,point.x);projected.bottom=Math.min(projected.bottom,point.y);projected.top=Math.max(projected.top,point.y);
     }
    }
   }
   return;
  }
  for(let i=0;i<p.count;i++){
   point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);minWorldY=Math.min(minWorldY,point.y);if(name==='rooftop'&&o.material.clippingPlanes?.some(p=>p.distanceToPoint(point)<-.0001))continue;point.project(camera);
   projected.left=Math.min(projected.left,point.x);projected.right=Math.max(projected.right,point.x);projected.bottom=Math.min(projected.bottom,point.y);projected.top=Math.max(projected.top,point.y);
  }
 });
 assert.equal(invalid,0);assert(instances>(name==='rooftop'?500:name==='rainy'?1000:name==='onsen'?2200:name==='study'?800:name==='intersection'?2000:name==='summit'?1800:3000));assert(meshes<260);
 if(name==='lakeside')assert(minWorldY < -3.0&&minWorldY > -3.1,'The deeper soil and water section must be retained');
 if(process.env.SCENE_SHADER_OUTPUT){
  const shaders=[];const expand=s=>s.replace(/#include <(\w+)>/g,(_,name)=>expand(ShaderChunk[name]));
  model.traverse(o=>{if(o.material?.isShaderMaterial)shaders.push({vertex:expand(o.material.vertexShader),fragment:expand(o.material.fragmentShader)})});
  await writeFile(process.env.SCENE_SHADER_OUTPUT,JSON.stringify(shaders));
 }
 assert(Object.values(projected).every(n=>Math.abs(n)<.98),`Camera crops the scene: ${JSON.stringify(projected)}`);
 if(name==='city'||name==='courtyard'){
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
 if(name==='rooftop'||name==='rainy'||name==='onsen'||name==='study'||name==='intersection'||name==='summit'){
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
