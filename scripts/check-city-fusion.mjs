import assert from 'node:assert/strict';
import {Vector3,Raycaster,Box3} from 'three';
import {CITY_PARCELS} from '../src/expansions/city-plan.js';
import {FUSION_COMPONENTS} from '../src/components/city-fusion-plan.js';

export async function checkCityFusion({scene,model,isPreview,isReduced,frame}){
 const d=model.userData.cityDistrict;assert.equal(d.districtVersion,4);assert.equal(d.fusion.components.length,5);assert.equal(d.fusion.railLines,2);
 for(const p of CITY_PARCELS){assert(p.zone!=='industry','The northeast industrial quarter must be replaced by the lake');for(const c of FUSION_COMPONENTS)assert(Math.abs(p.x-c.x)>=(p.w+c.size)/2||Math.abs(p.z-c.z)>=(p.d+c.size)/2,`${p.label} overlaps ${c.label}`);}
 const lake=scene.getObjectByName('lakeside-miniature'),court=scene.getObjectByName('courtyard-miniature'),station=scene.getObjectByName('sakura-miniature'),roof=scene.getObjectByName('rooftop-miniature'),junction=scene.getObjectByName('intersection-miniature');assert(lake&&court&&station&&roof&&junction);
 assert(lake.position.x>0&&lake.position.z<0);assert(lake.getObjectByName('sleeping-orange-tabby'));assert(lake.getObjectByName('open-curved-book'));assert(lake.getObjectByName('woven-fishing-basket'));assert(lake.getObjectByName('reflective-lake').isReflector);
 const fitness=['double-air-walker','horse-rider','three-position-waist-twister','double-seated-leg-press','waist-back-massager','upper-body-pulley','parallel-bars'];fitness.forEach(name=>assert(court.getObjectByName(name),name));assert(!court.getObjectByName('residential-facade'));
 const fish=[],cars=[];lake.traverse(o=>{if(o.name==='swimming-fish')fish.push(o);});junction.traverse(o=>{if(o.name==='moving-traffic-car')cars.push(o);});assert.equal(fish.length,24);assert.equal(cars.length,12);
 const belly=lake.getObjectByName('breathing-belly'),train=scene.getObjectByName('rooftop-commuter-train'),railcar=station.getObjectByName('local-railcar');assert(train&&railcar);const before=train.position.clone(),fishStart=fish.map(o=>o.position.clone()),bellyStart=belly.scale.y;
 const sourceRoot=lake.position.clone();let minBelly=Infinity,maxBelly=-Infinity,moved=0,protectedCrossings=0,signalStates=new Set();
 if(!isPreview)for(let ms=100;ms<=70000;ms+=100){
  frame(ms);minBelly=Math.min(minBelly,belly.scale.y);maxBelly=Math.max(maxBelly,belly.scale.y);signalStates.add(junction.userData.signalPhase.state);
  scene.updateMatrixWorld(true);
  const pos=new Vector3();for(const car of cars){car.getWorldPosition(pos);assert(Number.isFinite(pos.x+pos.y+pos.z));assert(!(Math.abs(pos.x)<7.5&&Math.abs(pos.z)<7.5),'Traffic must route around the original ruin');}
  for(let lane=0;lane<4;lane++){const list=cars.filter(c=>c.userData.lane===lane).sort((a,b)=>a.userData.progress-b.userData.progress);for(let j=1;j<list.length;j++)assert(list[j].userData.progress-list[j-1].userData.progress>=3.74,'Traffic queues must preserve spacing');}
  if(railcar.visible){assert(railcar.userData.crossingProtected,'Station barriers must close before the railcar arrives');protectedCrossings++;}
  if(train.position.distanceTo(before)>.1)moved++;
 }
 assert(lake.position.equals(sourceRoot));
 if(isPreview||isReduced){assert(train.position.equals(before));assert.equal(belly.scale.y,bellyStart);fish.forEach((o,i)=>assert(o.position.equals(fishStart[i])));}else{assert(moved>20&&protectedCrossings>10);assert(minBelly<.99&&maxBelly>1.01);assert(signalStates.has('green')&&signalStates.has('amber')&&signalStates.has('red'));}
 // The original banyan aperture is still geometry, after extracting other cores.
 const plates=[];model.getObjectByName('expanded-city-world').traverse(o=>{if(o.name==='city-merged-architecture'&&o.material.color.getHexString()==='c5c8ae')plates.push(o);});
 assert(plates.length);assert.equal(new Raycaster(new Vector3(-31+23*.15,3.15,-26),new Vector3(0,-1,0),0,.5).intersectObjects(plates).length,0);
 console.log(JSON.stringify({cityFusion:{sources:[2,3,4,5,9],fitnessStations:7,lakeFish:fish.length,cars:cars.length,buildings:d.totalBuildings,trees:d.inventory.totalTrees,renderedInstances:d.fusion.renderedInstances,protectedCrossings}}));
}
