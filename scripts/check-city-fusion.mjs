import assert from 'node:assert/strict';
import {Vector3,Raycaster} from 'three';
import {CITY_PARCELS} from '../src/expansions/city-plan.js';
import {FUSION_COMPONENTS} from '../src/components/city-fusion-plan.js';

export async function checkCityFusion({scene,model,isPreview,isReduced,frame}){
 const d=model.userData.cityDistrict;assert.equal(d.districtVersion,4);assert.equal(d.fusion.components.length,5);assert.equal(d.fusion.railLines,2);
 for(const p of CITY_PARCELS){assert(p.zone!=='industry','The northeast industrial quarter must be replaced by the lake');for(const c of FUSION_COMPONENTS.filter(c=>c.terrainHole!==false))assert(Math.abs(p.x-c.x)>=(p.w+c.size)/2||Math.abs(p.z-c.z)>=(p.d+c.size)/2,`${p.label} overlaps ${c.label}`);}
 const lake=scene.getObjectByName('lakeside-miniature'),court=scene.getObjectByName('courtyard-miniature'),station=scene.getObjectByName('sakura-miniature'),roof=scene.getObjectByName('rooftop-miniature'),junction=scene.getObjectByName('intersection-miniature');assert(lake&&court&&station&&roof&&junction);
 assert(lake.position.x>0&&lake.position.z<0);assert(lake.getObjectByName('sleeping-orange-tabby'));assert(lake.getObjectByName('open-curved-book'));assert(lake.getObjectByName('woven-fishing-basket'));assert(lake.getObjectByName('reflective-lake').isReflector);
 const fitness=['double-air-walker','horse-rider','three-position-waist-twister','double-seated-leg-press','waist-back-massager','upper-body-pulley','parallel-bars'];fitness.forEach(name=>assert(court.getObjectByName(name),name));assert(!court.getObjectByName('residential-facade'));
 const fish=[],cars=[];lake.traverse(o=>{if(o.name==='swimming-fish')fish.push(o);});junction.traverse(o=>{if(o.name==='moving-traffic-car')cars.push(o);});assert.equal(fish.length,24);assert.equal(cars.length,24);
 const belly=lake.getObjectByName('breathing-belly'),train=scene.getObjectByName('rooftop-commuter-train'),railcar=station.getObjectByName('local-railcar');assert(train&&railcar);const before=train.position.clone(),fishStart=fish.map(o=>o.position.clone()),bellyStart=belly.scale.y;
 const sourceRoot=lake.position.clone();let minBelly=Infinity,maxBelly=-Infinity,moved=0,protectedCrossings=0,signalStates=new Set();
 if(!isPreview)for(let ms=100;ms<=140000;ms+=100){
  frame(ms);minBelly=Math.min(minBelly,belly.scale.y);maxBelly=Math.max(maxBelly,belly.scale.y);signalStates.add(junction.userData.signalPhase.state);
  scene.updateMatrixWorld(true);
  const crossingAxes=new Set();const pos=new Vector3();for(const car of cars){car.getWorldPosition(pos);const {axis,track,dir,progress}=car.userData;const lateral=axis?pos.z-27:pos.x+20;assert(Math.abs(lateral-(axis?dir:-dir)*(track?4.6:2))<1e-6,'Cars must stay centered in their two directional lanes');if(progress>-11.2&&progress<11.2)crossingAxes.add(axis);if(junction.userData.signalPhase.pedestrian)assert(progress<=-12.7||progress>=12.7,'The all-walk phase must clear vehicles from the crossing');assert(Number.isFinite(pos.x+pos.y+pos.z));assert(!(Math.abs(pos.x)<7.5&&Math.abs(pos.z)<7.5),'Traffic must route around the original ruin');}
  assert(crossingAxes.size<=1,'Cross traffic must clear before the opposing green');
  for(let lane=0;lane<8;lane++){const list=cars.filter(c=>c.userData.lane===lane).sort((a,b)=>a.userData.progress-b.userData.progress);for(let j=1;j<list.length;j++)assert(list[j].userData.progress-list[j-1].userData.progress>=3.74,'Traffic queues must preserve spacing');}
  if(railcar.visible){assert(railcar.userData.crossingProtected,'Station barriers must close before the railcar arrives');protectedCrossings++;}
  if(train.position.distanceTo(before)>.1)moved++;
 }
 assert(lake.position.equals(sourceRoot));
 if(isPreview||isReduced){assert(train.position.equals(before));assert.equal(belly.scale.y,bellyStart);fish.forEach((o,i)=>assert(o.position.equals(fishStart[i])));}else{assert(moved>20&&protectedCrossings>10);assert(minBelly<.99&&maxBelly>1.01);assert(signalStates.has('green')&&signalStates.has('amber')&&signalStates.has('red')&&signalStates.has('walk'));}
 // The original banyan aperture is still geometry, after extracting other cores.
 const plates=[];model.traverse(o=>{if(o.name==='city-spatial-architecture')plates.push(o);});
 assert(plates.length);const hits=new Raycaster(new Vector3(-46+23*.15,3.15,-27),new Vector3(0,-1,0),0,.5).intersectObjects(plates);assert(!hits.some(h=>{const c=h.object.geometry.attributes.color,i=h.face.a;return Math.abs(c.getX(i)-.558)<.003&&Math.abs(c.getY(i)-.578)<.003;}),'The library aperture must remain open');
 console.log(JSON.stringify({cityFusion:{sources:[2,3,4,5,9],fitnessStations:7,lakeFish:fish.length,cars:cars.length,buildings:d.totalBuildings,trees:d.inventory.totalTrees,renderedInstances:d.fusion.renderedInstances,protectedCrossings}}));
}
