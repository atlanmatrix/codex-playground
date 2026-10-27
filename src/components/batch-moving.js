import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Preserve articulated roots, while baking the unmoving parts of each moving
// vehicle into one colored mesh. This changes draw calls, not the native model.
export function batchMoving(root,excluded=[]){
 root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert(),skip=new Set(excluded),geometries=[],remove=[];let source=null;
 root.traverse(o=>{
  if(!o.isMesh||o.isInstancedMesh||o.material.transparent||o.material.map||o.material.isShaderMaterial)return;
  for(let p=o;p&&p!==root;p=p.parent)if(skip.has(p))return;
  source??=o;let g=o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld));if(g.index)g=g.toNonIndexed();
  if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
  const colors=new Float32Array(g.attributes.position.count*3),old=g.attributes.color,c=o.material.color;
  for(let j=0;j<g.attributes.position.count;j++){colors[j*3]=(old?old.getX(j):1)*c.r;colors[j*3+1]=(old?old.getY(j):1)*c.g;colors[j*3+2]=(old?old.getZ(j):1)*c.b;}
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometries.push(g);remove.push(o);
 });
 if(geometries.length<2){geometries.forEach(g=>g.dispose());return;}
 const merged=mergeGeometries(geometries,false);if(!merged)throw new Error('Moving component batching failed');
 const material=source.material.clone();material.color.set('#ffffff');material.vertexColors=true;
 const mesh=new THREE.Mesh(merged,material);mesh.name='batched-moving-parts';mesh.castShadow=source.castShadow;mesh.receiveShadow=source.receiveShadow;remove.forEach(o=>o.removeFromParent());root.add(mesh);geometries.forEach(g=>g.dispose());
}

export function instanceNativeFish(component,world){
 const groups=new Map();component.model.traverse(o=>{
  if(!o.isMesh||o.material.transparent||o.isInstancedMesh)return;let fish=false;
  for(let p=o.parent;p&&p!==component.model;p=p.parent)if(p.name==='swimming-fish')fish=true;
  if(!fish)return;const key=o.geometry.uuid+o.material.uuid;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);
 });
 const batches=[];
 for(const refs of groups.values()){const source=refs[0],mesh=new THREE.InstancedMesh(source.geometry,source.material,refs.length);mesh.name='instanced-native-lake-fish';mesh.castShadow=false;mesh.receiveShadow=source.receiveShadow;world.add(mesh);refs.forEach(o=>o.visible=false);batches.push({refs,mesh});}
 const matrix=new THREE.Matrix4(),inverse=new THREE.Matrix4();
 return ()=>{world.updateWorldMatrix(true,false);inverse.copy(world.matrixWorld).invert();for(const {refs,mesh} of batches){refs.forEach((o,i)=>{o.updateWorldMatrix(true,false);matrix.multiplyMatrices(inverse,o.matrixWorld);mesh.setMatrixAt(i,matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}};
}
