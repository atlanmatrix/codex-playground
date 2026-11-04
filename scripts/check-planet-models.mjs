// Check actual exported model payloads, including the large-face curvature regression.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {SCENES} from '../src/scene-registry.js';
const {models}=JSON.parse(await readFile('assets/planet-models/manifest.json','utf8'));
for(const {route} of SCENES){
 const record=models[route],bytes=gunzipSync(await readFile(record.file));
 assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const jsonLength=bytes.readUInt32LE(12),data=JSON.parse(bytes.subarray(20,20+jsonLength).toString()),binary=28+jsonLength;
 let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,maxEdge=0,triangles=0;
 function array(id){const a=data.accessors[id],v=data.bufferViews[a.bufferView],offset=binary+(v.byteOffset||0)+(a.byteOffset||0);const length=a.count*(a.type==='VEC3'?3:1);return a.componentType===5126?new Float32Array(bytes.buffer,bytes.byteOffset+offset,length):new Uint32Array(bytes.buffer,bytes.byteOffset+offset,length);}
 for(const primitive of data.meshes[0].primitives){
  const positions=array(primitive.attributes.POSITION),indices=array(primitive.indices);triangles+=indices.length/3;
  for(let i=0;i<positions.length;i+=3){const [x,y,z]=positions.subarray(i,i+3);assert(Number.isFinite(x+y+z));minX=Math.min(minX,x);maxX=Math.max(maxX,x);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);}
  for(let i=0;i<indices.length;i+=3)for(let j=0;j<3;j++){
   const a=indices[i+j]*3,b=indices[i+(j+1)%3]*3;assert(a<positions.length&&b<positions.length);
   maxEdge=Math.max(maxEdge,Math.hypot(positions[a]-positions[b],positions[a+2]-positions[b+2]));
  }
 }
 assert(maxEdge<=8.001,`${route}: unsplit floor/base faces would sink into the sphere`);
 assert(maxX-minX>127&&maxZ-minZ>127,`${route}: retain full original world footprint`);
 assert.equal(triangles,record.triangles);assert(triangles>10000&&record.sourceMeshes>10);
 console.log(JSON.stringify({route,triangles,maxHorizontalEdge:maxEdge,fullWorldBounds:[minX,maxX,minZ,maxZ]}));
}
