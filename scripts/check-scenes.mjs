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
const isPreview=process.argv.includes('--preview'),isReduced=process.argv.includes('--reduced');
assert(['city','lakeside','courtyard','sakura','rooftop','rainy','onsen'].includes(name));
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
globalThis.location={search:isPreview?'?preview=1':''};
globalThis.document={body:{appendChild(){}},createElement(){return{getContext(){return{fillRect(){},strokeRect(){},fillText(){}}}}}};
globalThis.matchMedia=()=>({matches:isReduced});
const listeners=new Map();globalThis.addEventListener=(name,handler)=>listeners.set(name,handler);
try{
 await import(pathToFileURL(join(temp,'scene.mjs')));
 if(!isPreview)globalThis.frame(0);
 const {scene,camera}=globalThis.rendered;
 const model=name==='city'?scene.children.find(o=>o.isGroup):scene.getObjectByName(`${name}-miniature`);
 assert(model);
 if(name==='onsen'){
  const bath=scene.getObjectByName('reflective-mountain-onsen'),steam=scene.getObjectByName('rising-onsen-steam'),tiles=scene.getObjectByName('individual-ceramic-roof-tiles'),leaves=scene.getObjectByName('drifting-onsen-maple-leaves');
  assert(bath?.isReflector&&steam?.isInstancedMesh&&tiles?.isInstancedMesh&&leaves?.isInstancedMesh);
  assert(scene.getObjectByName('mountain-ryokan')&&scene.getObjectByName('ryokan-bathhouse-annex')&&scene.getObjectByName('arched-cedar-footbridge'));
  assert.equal(steam.count,34);assert(tiles.count>1200);assert.equal(leaves.count,26);
  assert.equal(bath.position.y,.86);
  const phase=steam.geometry.attributes.phase.array,life=steam.geometry.attributes.life.array;
  assert(new Set(phase).size===34&&Math.max(...life)-Math.min(...life)>6,'Steam must rise on independent lifetimes');
  const before=Array.from(leaves.instanceMatrix.array);if(!isPreview)globalThis.frame(4500);
  const changed=before.some((n,i)=>Math.abs(n-leaves.instanceMatrix.array[i])>.001);
  assert.equal(changed,!isPreview&&!isReduced);
  assert(Math.abs(bath.material.uniforms.time.value-(!isPreview&&!isReduced?4.5:0))<1e-8);
  assert(testControls.minDistance>=23&&testControls.maxPolarAngle<Math.PI/2);
  const {Raycaster,Vector3}=await import(pathToFileURL(join(root,'node_modules/three/build/three.module.js')));
  scene.updateMatrixWorld(true);
  const ray=new Raycaster(new Vector3(3,.70,2.85),new Vector3(0,-1,0));
  const hits=ray.intersectObject(scene.getObjectByName('onsen-static-landscape'),true).filter(h=>h.object.isMesh&&!h.object.material.transparent);
  assert(hits.length&&hits[0].point.y<.27,'The bath must have real depth, without terrain crossing the water');
  console.log(JSON.stringify({roofTiles:tiles.count,steamWisps:steam.count,driftingLeaves:leaves.count,submergedFloor:hits[0].point.y}));
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
   if(name==='courtyard'||name==='sakura'||name==='rooftop'){
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
 assert.equal(invalid,0);assert(instances>(name==='rooftop'?500:name==='rainy'?1000:name==='onsen'?2200:3000));assert(meshes<260);
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
 if(name==='rooftop'||name==='rainy'||name==='onsen'){
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
}finally{await rm(temp,{recursive:true,force:true})}
