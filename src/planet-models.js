import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// The payloads are standard GLB geometry snapshots of the original full worlds,
// gzipped for delivery. No additional renderer, iframe, camera or scene loop.
export async function mountPlanetModels({scene,regions,radius,invalidate,pickables,models}){
 const manifestResponse=await fetch(__PLANET_MANIFEST_URL__);
 if(!manifestResponse.ok)throw new Error('Unable to load planet model catalogue');
 const {models:catalogue}=await manifestResponse.json();
 const loader=new GLTFLoader(),up=new THREE.Vector3(0,1,0),normal=new THREE.Vector3(),rotation=new THREE.Quaternion();
 const ordered=[...regions].sort((a,b)=>b.normal.z-a.normal.z);
 for(const region of ordered){
  const record=catalogue[region.route];if(!record)throw new Error(`Missing planet model: ${region.route}`);
  const url=new URL(`./${region.route}.glb.gz?v=${record.sha256.slice(0,12)}`,manifestResponse.url);
  const response=await fetch(url);if(!response.ok)throw new Error(`Unable to load ${region.route}`);
  let bytes=await response.arrayBuffer();const magic=new Uint8Array(bytes,0,2);
  if(magic[0]===31&&magic[1]===139)bytes=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const gltf=await loader.parseAsync(bytes,'');
  const root=gltf.scene;root.name=`planet-${region.route}`;
  const sourceBounds=new THREE.Box3().setFromObject(root),base=sourceBounds.min.y;
  const scale=2.15/128;
  root.traverse(o=>{
   if(!o.isMesh)return;
   o.userData.planetRoute=region.route;
   const geo=o.geometry,p=geo.attributes.position,n=geo.attributes.normal;
   for(let i=0;i<p.count;i++){
    const x=p.getX(i)*scale,z=p.getZ(i)*scale;
    const surface=Math.sqrt(Math.max(0,radius*radius-x*x-z*z));
    const height=(p.getY(i)-base)*scale;
    p.setXYZ(i,x,surface-radius+height-.002,z);
    if(n){normal.set(x,surface,z).normalize();rotation.setFromUnitVectors(up,normal);normal.fromBufferAttribute(n,i).applyQuaternion(rotation);n.setXYZ(i,normal.x,normal.y,normal.z);}
   }
   p.needsUpdate=true;if(n)n.needsUpdate=true;geo.computeBoundingBox();geo.computeBoundingSphere();
   o.castShadow=false;o.receiveShadow=false;
  });
  root.position.copy(region.normal).multiplyScalar(radius);
  root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(region.east,region.normal,region.north.clone().negate()));
  root.userData={route:region.route,source:record,baseSize:128,footprint:2.15};
  scene.add(root);pickables.push(root);models.set(region.route,root);invalidate();
 }
}
