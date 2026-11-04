import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {surfaceRadius,landAt,terrainColor} from '../src/planet-terrain.js';
const definitions=JSON.parse(await readFile('src/globe-regions.json','utf8'));
const {models}=JSON.parse(await readFile('assets/planet-models/manifest.json','utf8'));
const regions=await Promise.all(definitions.map(async r=>{
 const lat=r.lat*Math.PI/180,lon=r.lon*Math.PI/180,normal=new THREE.Vector3(Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon)),east=new THREE.Vector3(Math.cos(lon),0,-Math.sin(lon));
 const record=models[r.route],bytes=await readFile(record.heightFile),heightData=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/4);
 assert.equal(heightData.length,record.heightDimension**2*2);assert(heightData.every(Number.isFinite));
 return {...r,normal,east,north:new THREE.Vector3().crossVectors(normal,east),heightData,heightDimension:record.heightDimension};
}));
for(const [a,b] of [['city','onsen'],['onsen','summit'],['onsen','desert']]){
 let min=Infinity,maxStep=0,maxColor=0,last,previousColor;
 for(let i=0;i<=500;i++){
  const n=regions.find(r=>r.route===a).normal.clone().lerp(regions.find(r=>r.route===b).normal,i/500).normalize(),r=surfaceRadius(n,regions),color=terrainColor(n,regions);
  assert(Number.isFinite(r));min=Math.min(min,r);if(last!==undefined)maxStep=Math.max(maxStep,Math.abs(r-last));if(previousColor)maxColor=Math.max(maxColor,Math.abs(color.r-previousColor.r)+Math.abs(color.g-previousColor.g)+Math.abs(color.b-previousColor.b));last=r;previousColor=color;
 }
 assert(min>3,`${a}/${b}: adjoining biomes must share continuous land`);
 assert(maxStep<.06,`${a}/${b}: discontinuous height at scene border`);
 assert(maxColor<.06,`${a}/${b}: visible colour seam at scene border`);
 console.log(JSON.stringify({a,b,minRadius:min,maxRadiusStep:maxStep,maxColorStep:maxColor}));
}
const ocean=regions.find(r=>r.route==='ocean');assert(surfaceRadius(ocean.normal,regions)<2.9);assert(landAt(ocean.normal,regions)<.05);
console.log('Connected land, smooth biome/height transitions and submerged ocean floor verified.');
