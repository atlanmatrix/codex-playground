import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {batchMoving} from './batch-moving.js';

const dynamic=o=>{for(let p=o;p;p=p.parent)if(p.userData.componentDynamic||p.name==='city-wetland-fish')return true;return false;};

// Keep all native articulation, but submit repeated rotating wheels and swaying
// leaf sets as instances. The hidden source transforms remain the animation rig.
export function instanceArticulatedParts(world,roots,{leaves=false}={}){
 world.updateWorldMatrix(true,true);const groups=new Map();
 for(const root of roots)root.traverse(o=>{
  if(!o.isMesh||!o.visible||o.material.transparent||o.material.map||Boolean(o.isInstancedMesh)!==leaves)return;
  const p=o.geometry.attributes.position;let hash=2166136261;
  for(let i=0;i<p.array.length;i++)hash=Math.imul(hash^(Math.round(p.array[i]*1e6)),16777619);
  const color=o.geometry.attributes.color;const key=[hash,p.count,color?.count,o.material.color.getHex(),o.material.side].join(':');
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);
 });
 const batches=[],m=new THREE.Matrix4(),inverse=world.matrixWorld.clone().invert();
 for(const refs of groups.values()){
  const count=refs.reduce((n,o)=>n+(o.isInstancedMesh?o.count:1),0),source=refs[0],mesh=new THREE.InstancedMesh(source.geometry,source.material,count);mesh.name=leaves?'batched-swaying-leaves':'batched-rolling-wheels';mesh.userData.componentDynamic=true;mesh.castShadow=false;mesh.receiveShadow=true;mesh.frustumCulled=false;world.add(mesh);const local=[];
  let index=0;for(const o of refs){o.visible=false;for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){const matrix=new THREE.Matrix4();if(o.isInstancedMesh)o.getMatrixAt(i,matrix);local.push({o,matrix});if(o.instanceColor){const c=new THREE.Color();o.getColorAt(i,c);mesh.setColorAt(index,c);}index++;}}
  batches.push({mesh,local});
 }
 return ()=>{for(const {mesh,local} of batches){let current=null;const parent=new THREE.Matrix4();local.forEach(({o,matrix},i)=>{if(current!==o){o.updateWorldMatrix(true,false);parent.multiplyMatrices(inverse,o.matrixWorld);current=o;}m.multiplyMatrices(parent,matrix);mesh.setMatrixAt(i,m);});mesh.instanceMatrix.needsUpdate=true;}};
}

function atlasSigns(world){
 const signs=[];world.traverse(o=>{const m=o.material,t=m?.map;if(o.isMesh&&!o.isInstancedMesh&&!dynamic(o)&&!m.transparent&&t?.image?.getContext&&t.repeat.x===1&&t.repeat.y===1)signs.push(o);});
 if(signs.length<2)return 0;
 const cols=8,tw=384,th=192,pad=4,canvas=document.createElement('canvas');canvas.width=cols*tw;canvas.height=Math.ceil(signs.length/cols)*th;const ctx=canvas.getContext('2d');if(!ctx.drawImage)return 0;
 const geometries=[];
 signs.forEach((o,i)=>{const x=i%cols*tw,y=Math.floor(i/cols)*th;ctx.drawImage(o.material.map.image,x+pad,y+pad,tw-pad*2,th-pad*2);let g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(g.index)g=g.toNonIndexed();const uv=g.attributes.uv,c=o.material.color,colors=[];for(let j=0;j<uv.count;j++){uv.setXY(j,(x+pad+uv.getX(j)*(tw-pad*2))/canvas.width,1-(y+th-pad)/canvas.height+uv.getY(j)*(th-pad*2)/canvas.height);colors.push(c.r,c.g,c.b);}g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometries.push(g);o.removeFromParent();});
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;
 const material=new THREE.MeshToonMaterial({map:texture,vertexColors:true,gradientMap:signs[0].material.gradientMap}),mesh=new THREE.Mesh(mergeGeometries(geometries,false),material);mesh.name='city-physical-sign-atlas';mesh.castShadow=mesh.receiveShadow=true;world.add(mesh);geometries.forEach(g=>g.dispose());return signs.length;
}

// Merge by spatial cell and render state, baking material colors into vertices.
// Color diversity no longer creates a draw call per paint color. Spatial bounds
// still cull buildings outside a close camera or the reflection frustum.
function batchStatic(world){
 world.updateWorldMatrix(true,true);const bins=new Map(),remove=[];
 world.traverse(o=>{
  const mat=o.material;if(!o.isMesh||o.isInstancedMesh||!o.visible||dynamic(o)||!mat?.isMeshToonMaterial||mat.transparent||mat.map||o.userData.roadLayer||o.name==='expanded-terrain-ring')return;
  let g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(g.index){const old=g;g=g.toNonIndexed();old.dispose();}
  const p=g.attributes.position,n=g.attributes.normal,old=mat.vertexColors?g.attributes.color:null,c=mat.color;
  for(let i=0;i<p.count;i+=3){const cx=Math.floor((p.getX(i)+p.getX(i+1)+p.getX(i+2))/72),cz=Math.floor((p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/72),key=`${cx},${cz},${mat.side}`;
   let b=bins.get(key);if(!b){b={p:[],n:[],c:[],material:mat};bins.set(key,b);}
   for(let j=i;j<i+3;j++){b.p.push(p.getX(j),p.getY(j),p.getZ(j));b.n.push(n.getX(j),n.getY(j),n.getZ(j));b.c.push(c.r*(old?old.getX(j):1),c.g*(old?old.getY(j):1),c.b*(old?old.getZ(j):1));}
  }
  g.dispose();remove.push(o);
 });
 remove.forEach(o=>o.removeFromParent());
 for(const b of bins.values()){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(b.c,3));g.computeBoundingSphere();const m=new THREE.MeshToonMaterial({vertexColors:true,side:b.material.side,gradientMap:b.material.gradientMap}),o=new THREE.Mesh(g,m);o.name='city-spatial-architecture';o.castShadow=o.receiveShadow=true;world.add(o);}
 return {sourceMeshes:remove.length,staticBatches:bins.size};
}

export function optimizeCity({model,renderer,camera,preview,reduced}){
 model.updateWorldMatrix(true,true);const lake=model.getObjectByName('lakeside-miniature'),boughs=[];lake.traverse(o=>{if(o.name==='swaying-willow')boughs.push(o);});
 // Crowns retain their slow root rotation, after merging each root's opaque lobes.
 const canopy=model.getObjectByName('core-banyan-canopy');if(canopy)batchMoving(canopy);
 const updateLeaves=instanceArticulatedParts(model,boughs,{leaves:true});
 const wheels=[];model.traverse(o=>{if(o.name==='moving-traffic-car')for(const c of o.children)if(c.isGroup)wheels.push(c);});const updateWheels=instanceArticulatedParts(model,wheels);
 const moving=[];model.traverse(o=>{if(['moving-traffic-car','rooftop-commuter-train','local-railcar'].includes(o.name))moving.push(o);});moving.forEach(root=>root.traverse(o=>{if(o.isMesh)o.castShadow=false;}));
 // Cached architectural shadows; moving cars get inexpensive contact shadows.
 const contact=new THREE.InstancedMesh(new THREE.CircleGeometry(1,16),new THREE.MeshBasicMaterial({color:'#354c49',transparent:true,opacity:.16,depthWrite:false,clippingPlanes:[new THREE.Plane(new THREE.Vector3(1,0,0),64),new THREE.Plane(new THREE.Vector3(-1,0,0),64),new THREE.Plane(new THREE.Vector3(0,0,1),64),new THREE.Plane(new THREE.Vector3(0,0,-1),64)]}),moving.length);contact.name='moving-contact-shadows';contact.frustumCulled=false;contact.userData.componentDynamic=true;model.add(contact);const dummy=new THREE.Object3D(),p=new THREE.Vector3();
 const signs=atlasSigns(model),batching=batchStatic(model);
 const reflective=lake.getObjectByName('reflective-lake'),original=reflective.onBeforeRender;let lastReflection=-Infinity,forceReflection=true,reflectionCount=0;
 reflective.onBeforeRender=function(...args){const now=performance.now(),near=camera.position.distanceTo(lake.position)<110;if(!forceReflection&&now-lastReflection<(near?100:500))return;original.apply(this,args);lastReflection=now;forceReflection=false;reflectionCount++;};
 renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 const detail=[];model.traverse(o=>{if(o.isInstancedMesh&&o.count>128&&o.geometry.attributes.position.count>80&&!dynamic(o)){const g=o.geometry;let low;if(/Sphere|Icosahedron/.test(g.type))low=g.type==='SphereGeometry'?new THREE.SphereGeometry(g.parameters.radius,8,5):new THREE.IcosahedronGeometry(g.parameters.radius,0);if(low){o.computeBoundingSphere();detail.push({o,high:g,low,coarse:false,center:o.boundingSphere.center.clone().applyMatrix4(o.matrixWorld)});}}});
 const report={...batching,atlasSigns:signs,shadowMode:'cached-static-with-moving-contact',coarseBatches:0};Object.defineProperty(report,'reflectionUpdates',{enumerable:true,get:()=>reflectionCount});model.userData.cityPerformance=report;
 let lastLOD=-Infinity,forceLOD=true,lastZoom=camera.zoom;const lastCamera=camera.position.clone();
 return {report,force(){forceReflection=true;forceLOD=true;},update(t){
  updateLeaves();updateWheels();moving.forEach((o,i)=>{o.getWorldPosition(p);dummy.position.set(p.x,o.name==='moving-traffic-car'?.187:o.name==='local-railcar'?.325:3.555,p.z);dummy.rotation.set(-Math.PI/2,0,-o.rotation.y+(o.name==='moving-traffic-car'?0:Math.PI/2));dummy.scale.set(o.visible?1:0,o.name==='moving-traffic-car'?1.45:2.7,1);dummy.updateMatrix();contact.setMatrixAt(i,dummy.matrix);});contact.instanceMatrix.needsUpdate=true;
  if(forceLOD||t-lastLOD>1||camera.position.distanceToSquared(lastCamera)>.0625||camera.zoom!==lastZoom){lastLOD=t;forceLOD=false;lastCamera.copy(camera.position);lastZoom=camera.zoom;report.coarseBatches=0;for(const r of detail){const distance=camera.position.distanceTo(r.center)/camera.zoom,coarse=distance>(r.coarse?140:170);if(coarse!==r.coarse){r.o.geometry=coarse?r.low:r.high;r.coarse=coarse;r.o.computeBoundingSphere();renderer.shadowMap.needsUpdate=true;forceReflection=true;}if(coarse)report.coarseBatches++;}}
 }};
}
