import {buildCityFusion} from '../components/city-fusion.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import {detailedWorld,expandedFit} from './kit.js';
import {districtHeight,CITY_PARCELS} from './city-plan.js';
import {cityDetails,cityFurniture} from './city-detail.js';
import {buildCityArchitecture} from './city-architecture.js';
import {buildCityStreets} from './city-streets.js';
import {buildCityLandscape} from './city-landscape.js';
export {expandedFit};

export function expandWorld(options){
 const result=detailedWorld(options,{
  intent:'榕树旧城、湖畔橘猫、社区健身、樱花小站、屋顶铁道与信号十字路口组成的统一城市',seed:91017,
  height:districtHeight,structuralTop:-2.85,bottom:-3.12,blend:2,
  color:(x,z)=>z>30&&x>10?'#8eaa7a':x<-15&&z>10?'#9da87e':x>10&&z<-15?'#96a383':'#9cad83',
  build(k){
   buildCityFusion(k);
   const D=cityDetails(k),F=cityFurniture(k,D);
   buildCityArchitecture(k,D,F);buildCityStreets(k,D,F);buildCityLandscape(k,D);D.finish();
   k.weather('dust',100);k.stats.districtVersion=4;k.stats.totalBuildings=CITY_PARCELS.length+1+k.stats.fusion.nativeStructures;
   k.stats.zones=Object.fromEntries(['civic','industry','market','wetland','edge'].map(zone=>[zone,CITY_PARCELS.filter(p=>p.zone===zone).length]));
  }
 });
 const world=options.model.getObjectByName('expanded-city-world'),stats=world.userData;stats.staticInstances+=stats.customInstances+stats.enrichment.parts;
 // Concrete slabs and paths share draw calls; animated water and fish stay separate.
 world.updateMatrixWorld(true);const batches=new Map(),remove=[];
 world.traverse(o=>{
  if(!o.isMesh||o.isInstancedMesh||o.material.transparent||o.material.isShaderMaterial||o.material.map||o.material.userData.componentDynamic)return;
  for(let a=o;a&&a!==world;a=a.parent)if(a.name==='city-wetland-fish'||a.userData.componentDynamic)return;
  if(o.name==='expanded-terrain-ring')return;
  const key=o.material.color.getHex()+':'+o.material.side+':'+!!o.material.vertexColors;
  if(!batches.has(key))batches.set(key,{material:o.material,geometries:[]});
  const g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));batches.get(key).geometries.push(g);remove.push(o);
 });
 remove.forEach(o=>o.removeFromParent());
 for(const {material,geometries} of batches.values()){const merged=mergeGeometries(geometries.map(g=>g.index?g.toNonIndexed():g),false);if(!merged)throw new Error('City static geometry could not be merged');const o=new THREE.Mesh(merged,material);o.name='city-merged-architecture';o.castShadow=o.receiveShadow=true;world.add(o);geometries.forEach(g=>g.dispose());}
 stats.inventory.originalCoreUnits=5402;stats.inventory.totalBuildings=stats.totalBuildings;stats.inventory.totalTrees=stats.trees+1;stats.inventory.totalFish=(stats.inventory.fish||0)+5+stats.fusion.lakeFish;
 stats.modeledUnits=stats.staticInstances+5402;stats.fusion.renderedInstances=0;world.traverse(o=>{if(o.isInstancedMesh)stats.fusion.renderedInstances+=o.count;});options.model.userData.cityDistrict=stats;
 return result;
}
