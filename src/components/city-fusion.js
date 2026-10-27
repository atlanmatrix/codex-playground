import {batchMoving,instanceNativeFish} from './batch-moving.js';
import * as THREE from 'three';
import {createLakesideComponent} from './lakeside.js';
import {createCourtyardComponent} from './courtyard.js';
import {createSakuraComponent} from './sakura.js';
import {createRooftopComponent} from './rooftop.js';
import {createIntersectionComponent} from './intersection.js';
import {FUSION_COMPONENTS,inComponentBounds,inTerrainHole,lakeShoreLeft,lakeShoreRight} from './city-fusion-plan.js';
import {detailLayer} from '../expansions/detail-layer.js';

export function buildCityFusion(k){
 const {world,model,stats,renderer,preview,reduced,land}=k;
 renderer.localClippingEnabled=true;
 const E=detailLayer(k,{reference:{coreSize:128,components:{nativeLake:1,fitnessCourt:1,cherryStation:1,rooftopStreet:1,signalJunction:1},principle:'五个原场景核心成为同一座城市里的实际组件，共用地图、相机和动画时钟'},zones:FUSION_COMPONENTS.map(p=>({name:p.label,source:p.source,x:p.x,z:p.z,size:p.size})),minDistance:22});
 const sampleTraffic=c=>{const lane=c.track?4.6:2;return c.axis?{x:-20+c.u*c.dir,z:27+c.dir*lane,y:.08,heading:c.dir>0?Math.PI/2:-Math.PI/2}:{x:-20-c.dir*lane,z:27+c.u*c.dir,y:.08,heading:c.dir>0?0:Math.PI};};
 const limits=c=>{const center=c.axis?-20:27;return {wrapStart:c.dir>0?-70-center:center-70,wrapEnd:c.dir>0?70-center:center+70};};
 const components={};
 const builders={lakeside:createLakesideComponent,courtyard:createCourtyardComponent,sakura:createSakuraComponent,rooftop:createRooftopComponent,intersection:createIntersectionComponent};
 for(const p of FUSION_COMPONENTS){
  const c=builders[p.key]({renderer,preview,reduced,trafficPose:sampleTraffic,limits,origin:[p.x,p.z]});
  c.model.position.set(p.x,0,p.z);c.model.rotation.y=p.rotation;c.model.userData.fusionSource=p.source;world.add(c.model);c.model.updateWorldMatrix(true,true);components[p.key]=c;stats.trees+=c.trees;
  if(p.key==='sakura')c.clip.forEach(plane=>plane.applyMatrix4(c.model.matrixWorld));
 }
 const lake=components.lakeside;
 lake.water.material.uniforms.componentOrigin.value.set(38,-34);
 const shoreGLSL='return max(-4.02+.38*z+.38*sin(z*.55)+.10*cos(z*.91),6.-20.*sqrt(max(0.,1.-pow((z+2.)/27.,2.))));';
 for(const key of ['vertexShader','fragmentShader'])lake.water.material[key]=lake.water.material[key].replace('return -4.02+.38*z+.38*sin(z*.55)+.10*cos(z*.91);',shoreGLSL);
 lake.water.material.needsUpdate=true;
 const shape=new THREE.Shape();for(let j=0;j<=160;j++){const z=-63+j*54/160,x=lakeShoreLeft(z);j?shape.lineTo(x-38,-z-34):shape.moveTo(x-38,-z-34);}for(let j=160;j>=0;j--){const z=-63+j*54/160;shape.lineTo(lakeShoreRight(z)-38,-z-34);}shape.closePath();lake.water.geometry.dispose();lake.water.geometry=new THREE.ShapeGeometry(shape,32);
 lake.water.name='reflective-lake';
 // Replace the terrain surface by an exact grid with holes at the native cores.
 // Extra grid lines land precisely on component edges, even for a rotated block.
 const terrain=world.getObjectByName('expanded-terrain-ring'),xs=new Set(),zs=new Set();for(let j=-64;j<=64;j++){xs.add(j);zs.add(j);}for(const p of FUSION_COMPONENTS){xs.add(p.x-p.size/2);xs.add(p.x+p.size/2);zs.add(p.z-p.size/2);zs.add(p.z+p.size/2);}const X=[...xs].sort((a,b)=>a-b),Z=[...zs].sort((a,b)=>a-b),positions=[],colors=[],indices=[];
 for(const z of Z)for(const x of X){const y=land(x,z),c=new THREE.Color(z>30&&x>10?'#8eaa7a':'#9cad83');if(x>18&&z<-8){const left=lakeShoreLeft(z),right=lakeShoreRight(z);if(y<0){const u=Math.min((x-left)/Math.max(1,46-left),(right-x)/4);c.set('#dbcfa8').lerp(new THREE.Color('#387f8e'),THREE.MathUtils.smoothstep(u,0,.45));}else{const u=THREE.MathUtils.clamp((x-30)/Math.max(.1,left-30),0,1);c.set('#8caf69').lerp(new THREE.Color('#bbcc84'),(1-u)*.35+.06*Math.sin((z+34)*2));}}positions.push(x,y,z);colors.push(c.r,c.g,c.b);}
 for(let j=0;j<Z.length-1;j++)for(let i=0;i<X.length-1;i++){const x=(X[i]+X[i+1])/2,z=(Z[j]+Z[j+1])/2;if(Math.abs(x)<8&&Math.abs(z)<8||inTerrainHole(x,z))continue;const a=j*X.length+i;indices.push(a,a+X.length,a+1,a+1,a+X.length,a+X.length+1);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();terrain.geometry.dispose();terrain.geometry=geometry;
 E.box(0,-2.18,0,16,1.88,16,'#505441');
 const roof=components.rooftop;roof.train.removeFromParent();world.add(roof.train);roof.clip[0].set(new THREE.Vector3(1,0,0),64);roof.clip[1].set(new THREE.Vector3(-1,0,0),64);
 batchMoving(roof.train,roof.wheels);roof.wheels.forEach(w=>batchMoving(w));
 batchMoving(components.sakura.train,components.sakura.wheels);components.sakura.wheels.forEach(w=>batchMoving(w));components.sakura.crossings.forEach(c=>batchMoving(c.arm));
 for(const car of components.intersection.cars){const wheels=car.g.children.filter(o=>o.isGroup);batchMoving(car.g,wheels);wheels.forEach(w=>batchMoving(w));}
 for(const signal of components.intersection.signals){const excluded=[];signal.g.traverse(o=>{if(signal.lights.includes(o.material)||o.material===signal.pedestrian)excluded.push(o);});batchMoving(signal.g,excluded);}
 const updateFishInstances=instanceNativeFish(lake,world);
 const railCurve=new THREE.CatmullRomCurve3([[-70,54.05],[-57,54.05],[-39,54.05],[70,54.05]].map(([x,z])=>new THREE.Vector3(x,3.36,z))),railLength=railCurve.getLength();
 let lastWire=null;
 for(let distance=0;distance<railLength;distance+=.3){const p=railCurve.getPointAt(distance/railLength),t=railCurve.getTangentAt(distance/railLength);if(p.x<-63.8||p.x>63.8||p.x>-57&&p.x<-39){lastWire=null;continue;}if(lastWire)E.rod([lastWire.x,6.55,lastWire.z],[p.x,6.55,p.z],.009,'#647568');lastWire=p.clone();const ry=Math.atan2(t.x,t.z),normal=new THREE.Vector3(t.z,0,-t.x);E.box(p.x,3.2,p.z,3.6,.34,.32,'#b9c5b0',null,[0,ry,0]);E.box(p.x,3.59,p.z,1.91,.1,.23,'#9e8167',null,[0,ry,0]);
  for(const s of [-1,1]){const x=p.x+normal.x*.58*s,z=p.z+normal.z*.58*s;E.box(x,3.765,z,.075,.03,.33,'#a5b5aa',null,[0,ry,0]);const xx=p.x+normal.x*1.75*s,zz=p.z+normal.z*1.75*s;E.box(xx,3.52,zz,.1,.4,.33,'#91a797',null,[0,ry,0]);}
  if(distance%8<.3&&!inComponentBounds(p.x,p.z))for(const s of [-1,1]){const x=p.x+normal.x*5.1*s,z=p.z+normal.z*5.1*s;if(Math.abs(x)>63||Math.abs(x+20)<11.4)continue;E.rod([x,land(x,z),z],[x,3.1,z],.15,'#a2b29d');E.rod([x,3.1,z],[p.x,3.1,p.z],.07,'#9aab98');}
  if(distance%6<.3){for(const s of [-1,1])E.rod([p.x+normal.x*1.65*s,3.7,p.z+normal.z*1.65*s],[p.x+normal.x*1.65*s,6.85,p.z+normal.z*1.65*s],.04,'#799384');E.rod([p.x-normal.x*1.65,6.85,p.z-normal.z*1.65],[p.x+normal.x*1.65,6.85,p.z+normal.z*1.65],.035,'#799384');}
 }
 // Real public connections between the park, the northern station and city paths.
 for(let j=0;j<47;j++){const z=-59+j,x=lakeShoreLeft(z)-2.6;if(inComponentBounds(x,z,1))continue;E.box(x,land(x,z)+.13,z,1.6,.08,.88,'#b3aa80');if(j%8===0){k.tree('willow',x-2,z,.8);k.bench(x-1,z+1,.2);}}
 for(let j=0;j<220;j++){const z=k.R(-59,-12),x=lakeShoreLeft(z)+k.R(.1,1.5);if(inComponentBounds(x,z,.6))continue;const y=land(x,z);if(y>0)continue;E.tuft(x,z,k.R(.5,.9),'reed',y);if(j%4===0)E.put('pad',x+1,.163,z,.22,.22,.22,'#86a963',null,[-Math.PI/2,0,0]);}
 const nativeStructures=Object.values(components).reduce((n,c)=>n+c.structures,0);
 stats.fusion={version:4,components:FUSION_COMPONENTS.map(p=>({...p})),nativeTrees:Object.values(components).reduce((n,c)=>n+c.trees,0),nativeStructures,fitnessStations:7,lakeFish:24,junctionCars:24,railLines:2,railLength,trafficRoadLength:256};
 k.motions.push(t=>{
  lake.update(t);updateFishInstances();components.courtyard.update(t);components.sakura.update(t+14);roof.update(t);components.intersection.update(t);
  const distance=(24+t*1.55)%(railLength+12),u=Math.max(0,Math.min(1,(distance-6)/railLength)),p=railCurve.getPointAt(u),tangent=railCurve.getTangentAt(u);roof.train.position.copy(p);roof.train.rotation.set(0,-Math.atan2(tangent.z,tangent.x),0);roof.train.visible=true;
 });
 stats.landmarks.push('native-lakeside-orange-cat','native-community-fitness','native-cherry-station','native-rooftop-rail-street','native-signal-intersection');E.finish();
 return components;
}
