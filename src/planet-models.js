import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {coastEdge,smooth,surfaceRadius,terrainColor,profiles,sampleHeight} from './planet-terrain.js';

// Only the planet presentation is transformed. Standalone scene URLs retain the
// original complete worlds, square bases, materials, animation and embed API.
export async function mountPlanetModels({scene,regions,radius,invalidate,pickables,models,rebuildTerrain}){
 const response=await fetch(__PLANET_MANIFEST_URL__);if(!response.ok)throw new Error('Unable to load planet model catalogue');
 const {models:catalogue}=await response.json(),loader=new GLTFLoader();
 await Promise.all(regions.map(async region=>{
  const record=catalogue[region.route],heightResponse=await fetch(new URL(`./${region.route}.height.bin?v=${record.heightSha256.slice(0,12)}`,response.url));
  if(!heightResponse.ok)throw new Error(`Unable to load ground field: ${region.route}`);
  region.heightData=new Float32Array(await heightResponse.arrayBuffer());region.heightDimension=record.heightDimension;
 }));
 rebuildTerrain();
 const ordered=[...regions].sort((a,b)=>b.normal.z-a.normal.z);
 for(const region of ordered){
  const record=catalogue[region.route],profile=profiles[region.route];if(!record)throw new Error(`Missing planet model: ${region.route}`);
  const fetched=await fetch(new URL(`./${region.route}.glb.gz?v=${record.sha256.slice(0,12)}`,response.url));if(!fetched.ok)throw new Error(`Unable to load ${region.route}`);
  let bytes=await fetched.arrayBuffer();const magic=new Uint8Array(bytes,0,2);
  if(magic[0]===31&&magic[1]===139)bytes=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const {scene:root}=await loader.parseAsync(bytes,'');root.name=`planet-${region.route}`;
  let removedTriangles=0,retainedTriangles=0;
  root.traverse(o=>{
   if(!o.isMesh)return;
   o.userData.planetRoute=region.route;
   const geometry=o.geometry,p=geometry.attributes.position,n=geometry.attributes.normal,colors=geometry.attributes.color,index=geometry.index;
   const dists=new Float32Array(p.count),ys=new Float32Array(p.count),covers=new Uint8Array(p.count),waters=new Uint8Array(p.count),residuals=new Float32Array(p.count);
   const direction=new THREE.Vector3(),tangentX=new THREE.Vector3(),tangentZ=new THREE.Vector3(),normal=new THREE.Vector3();
   for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),angle=Math.atan2(-z,x);
    const distance=Math.hypot(x,z)/(profile.extent*coastEdge(region,angle)/region.size);
    const taper=1-smooth(.68,1.0,distance);dists[i]=distance;ys[i]=y;
    direction.copy(region.normal).addScaledVector(region.east,x/profile.extent*region.size).addScaledVector(region.north,-z/profile.extent*region.size).normalize();
    const residual=y-sampleHeight(region,x,z);residuals[i]=residual;
    let height=(region.route==='ocean'?y:residual)*profile.height*taper;
    const sea=region.route==='ocean';
    const ground=sea?radius:surfaceRadius(direction,regions,radius);
    // Terrain/structures taper into the shared ground, not into a separate slab.
    if(!sea)height=Math.max(-.05,height)+.0015*taper;
    p.setXYZ(i,direction.x*(ground+height),direction.y*(ground+height),direction.z*(ground+height));
    if(n){
     tangentX.copy(region.east).addScaledVector(direction,-region.east.dot(direction)).normalize();tangentZ.crossVectors(tangentX,direction).normalize();
     normal.copy(tangentX).multiplyScalar(n.getX(i)).addScaledVector(direction,n.getY(i)).addScaledVector(tangentZ,n.getZ(i)).normalize();n.setXYZ(i,normal.x,normal.y,normal.z);
    }
    if(colors){
     const original=new THREE.Color().setRGB(colors.getX(i),colors.getY(i),colors.getZ(i));
     const terrain=terrainColor(direction,regions);
     waters[i]=['city','onsen'].includes(region.route)&&original.b>original.r*1.4&&original.g>original.r*1.35&&original.b>original.g*.85?1:0;
     covers[i]=region.route==='onsen'&&original.r>.13&&original.r<.29&&original.g>.26&&original.g<.4&&original.b>.10&&original.b<.19?1:0;
     // Recolour ground cover into the common biome palette, retaining architectural paint.
     const greenery=original.g>original.r*1.06&&original.g>original.b*1.04;
     const lowGround=y<profile.base+.4;
     const blend=Math.max(smooth(.55,.96,distance),lowGround&&greenery&&!waters[i]?.80:0);
     if(sea&&y<-4)original.lerp(new THREE.Color('#568d8f'),.45);
     else original.lerp(terrain,blend);
     colors.setXYZ(i,original.r,original.g,original.b);
    }
   }
   const kept=[];
   for(let at=0;at<index.count;at+=3){
    const a=index.getX(at),b=index.getX(at+1),c=index.getX(at+2),mean=(dists[a]+dists[b]+dists[c])/3;
    const residual=Math.max(residuals[a],residuals[b],residuals[c]);
    const below=region.route!=='ocean'&&residual<-.08;
    const road=region.route==='city'&&colors&&Math.max(colors.getX(a),colors.getY(a),colors.getZ(a))-Math.min(colors.getX(a),colors.getY(a),colors.getZ(a))<.055;
    const room=region.route==='study'&&Math.max(Math.abs((dists[a]+dists[b]+dists[c])/3))<.72;
    const terrainTolerance=['onsen','summit','desert'].includes(region.route)?1.3:.3;
    const water=o.material.transparent||waters[a]+waters[b]+waters[c]>1;
    const nativeGround=region.route!=='ocean'&&!water&&!road&&!room&&(residual<terrainTolerance||covers[a]+covers[b]+covers[c]>1);
    const rainyFloor=region.route==='rainy'&&Math.max(ys[a],ys[b],ys[c])<.34;
    const nativeWater=region.route==='ocean'&&o.material.transparent&&Math.max(Math.abs(ys[a]),Math.abs(ys[b]),Math.abs(ys[c]))<.25;
    if(mean>=.99||Math.min(dists[a],dists[b],dists[c])>1.0||below||nativeGround||rainyFloor||nativeWater){removedTriangles++;continue;}
    kept.push(a,b,c);retainedTriangles++;
   }
   geometry.setIndex(kept);p.needsUpdate=true;if(n)n.needsUpdate=true;if(colors)colors.needsUpdate=true;
   geometry.computeBoundingBox();geometry.computeBoundingSphere();o.castShadow=false;o.receiveShadow=false;
  });
  root.userData={route:region.route,source:record,naturalBoundary:true,removedTriangles,retainedTriangles,profile};
  scene.add(root);pickables.push(root);models.set(region.route,root);invalidate();
 }
}
