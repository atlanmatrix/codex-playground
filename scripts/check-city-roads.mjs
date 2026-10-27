import assert from 'node:assert/strict';
import {Raycaster,Vector3} from 'three';
import {ROAD_PROFILE as P,CITY_PARCELS} from '../src/expansions/city-plan.js';

export function checkCityRoads({scene,model}){
 const road=scene.getObjectByName('unified-city-road-surface'),d=model.userData.cityDistrict.roadPlan;assert(road);assert.equal(d.lanesPerDirection,2);assert.equal(d.coplanarPaintLayers,0);
 scene.updateMatrixWorld(true);
 const sample=(x,z)=>{const hits=new Raycaster(new Vector3(x+.0001231,5,z+.0001987),new Vector3(0,-1,0),0,6).intersectObject(road);assert.equal(hits.length,1,`Road ownership must be unique at ${x},${z}`);return hits[0].point.y;};
 for(const side of [-1,1]){
  for(const offset of [2,4.6])assert(Math.abs(sample(-20+side*(offset+.0137),-29.37)-.18)<1e-5);
  assert(sample(-20+side*.31,-29.37)>.3,'The median must be physically raised');
  assert(Math.abs(sample(-20+side*7,-29.37)-.2)<1e-5,'The protected cycling lane must stay clear');
  assert(Math.abs(sample(-20+side*9.4,-29.37)-.36)<1e-5,'Footways must sit above the motor lanes');
 }
 for(const [x,z] of [[-20.123,27.456],[-22.13,18.1],[-11.1,29.13]])assert(Math.abs(sample(x,z)-.18)<1e-5,'Junction and zebra surfaces must be continuous');
 for(const x of [-28.2,-28.8,-29.8,-30.8])assert(Math.abs(sample(x,18.3)-(.18+.06*(Math.min(Math.abs(x+20),Math.abs(x+20)<9.9?8.7:11)-8)))<3e-5,`The curb ramp must have a continuous 6% grade at ${x}: ${sample(x,18.3)}`);
 for(const p of CITY_PARCELS){assert(Math.abs(p.x+20)>11+p.w/2||p.z+p.d/2<-64||p.z-p.d/2>64,`${p.label} blocks the north-south corridor`);assert(Math.abs(p.z-27)>11+p.d/2,`${p.label} blocks the east-west corridor`);}
 const court=scene.getObjectByName('courtyard-miniature'),station=scene.getObjectByName('sakura-miniature'),roof=scene.getObjectByName('rooftop-miniature');for(const c of [court,station,roof])assert(Math.abs(c.position.x+20)>=11+(c===court?8:9));
 const performance=model.userData.cityPerformance;assert(performance.staticBatches<100&&performance.sourceMeshes>100);assert.equal(performance.shadowMode,'cached-static-with-moving-contact');
 console.log(JSON.stringify({cityRoads:{fourLaneBoulevards:2,width:22,median:1.4,cycleLane:1.5,footway:3,rampGrade:.06,staticBatches:performance.staticBatches}}));
}
