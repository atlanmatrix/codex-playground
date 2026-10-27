import * as THREE from 'three';
import {ROAD_PROFILE as P,CITY_PATHS,CITY_PARCELS} from './city-plan.js';
import {FUSION_COMPONENTS} from '../components/city-fusion-plan.js';

// Road paint belongs to the surface vertices. Every point has a single owner,
// including the crossing: no coplanar road ribbons, tiles or marking planes.
export function roadSection(x,z){
 const dx=x-P.centerX,dz=z-P.centerZ,a=Math.abs(dx),b=Math.abs(dz);
 if(a>P.edge&&b>P.edge)return null;
 const axis=a<b?0:1,d=axis?b:a,along=axis?dx:dz,across=axis?dz:dx,junction=a<11.2&&b<11.2;
 let type,y,color;
 if(d<.7&&!junction){type='median';y=.34;color=d<.49?'#739764':'#d4d2b7';}
 else if(d<5.9||junction&&(a<5.9||b<5.9)){
  type='motor';y=P.motorY;color='#718187';
  const cross=Math.abs(along);
  if(junction&&cross>8.1&&cross<9.9&&((across+5.95)% .85)<.45)color='#f2ecd6';
  else if(junction&&cross>6.3&&cross<7.8)color='#6f9f8b';
  if(!junction&&Math.abs(d-3.3)<.045&&((along+128)%5)<2)color='#eee9d4';
  if(!junction&&d<.79)color='#e6c56d';
  if(Math.abs(along)>11.05&&Math.abs(along)<11.2&&(across*along>0)!==Boolean(axis))color='#f2ecd6';
 }else if(d<6.3){type='separator';y=.32;color='#dad7bf';}
 else if(d<7.8){type='cycle';y=P.cycleY;color='#79a58e';if(Math.abs(d-7.05)<.035&&((along+128)%5)<1.4)color='#dbe3cb';}
 else if(d<8){type='curb';y=P.walkY;color='#e6dfc5';}
 else{type='sidewalk';y=P.walkY;color=(Math.floor((along+128)/2.5)%2)?'#c5c9b2':'#cbd0ba';}
 let rampAxes=[];if(a>=8&&a<=11&&b>8.1&&b<9.9)rampAxes.push(0);if(b>=8&&b<=11&&a>8.1&&a<9.9)rampAxes.push(1);
 const crossing=Math.abs(along)>8.1&&Math.abs(along)<9.9;
 if(crossing&&d>=5.9){type=d>=8?'ramp':'crossing';y=d>=8?.18+.06*(d-8):.18;color=d>=8?'#d6d4b9':'#cbd0b9';}
 if(rampAxes.length){type='ramp';y=Math.min(...rampAxes.map(axis=>.18+.06*((axis?b:a)-8)));color='#d6d4b9';}
 return {type,y,color,axis,across,along,rampAxes};
}
export function buildRoadSurface(k){
 const xs=new Set([-64,64]),zs=new Set([-64,64]);
 const boundaries=[0,.49,.7,.79,2,3.255,3.345,4.6,5.9,6.3,7.015,7.085,7.8,8,8.1,9.9,11,11.05,11.2];
 for(const v of boundaries)for(const sign of [-1,1]){xs.add(P.centerX+sign*v);zs.add(P.centerZ+sign*v);}
 for(let t=-128;t<=128;t+=5)for(const d of [0,1.4,2]){xs.add(P.centerX+t+d);zs.add(P.centerZ+t+d);}
 for(let t=-5.95;t<5.95;t+=.85)for(const d of [0,.45]){xs.add(P.centerX+t+d);zs.add(P.centerZ+t+d);}
 const X=[...xs].filter(v=>v>=-64&&v<=64).sort((a,b)=>a-b),Z=[...zs].filter(v=>v>=-64&&v<=64).sort((a,b)=>a-b),pos=[],colors=[],cells=[];
 function triangle(a,b,c,color){const q=new THREE.Color(color);pos.push(...a,...b,...c);for(let i=0;i<3;i++)colors.push(q.r,q.g,q.b);}
 function quad(a,b,c,d,color){triangle(a,b,c,color);triangle(c,b,d,color);}
 function height(x,z,section){if(section.type==='ramp')return Math.min(...section.rampAxes.map(axis=>.18+.06*(Math.abs(axis?z-P.centerZ:x-P.centerX)-8)));return section.y;}
 for(let j=0;j<Z.length-1;j++)for(let i=0;i<X.length-1;i++){
  const x0=X[i],x1=X[i+1],z0=Z[j],z1=Z[j+1],x=(x0+x1)/2,z=(z0+z1)/2,s=roadSection(x,z);if(!s)continue;
  const a=[x0,height(x0,z0,s),z0],b=[x0,height(x0,z1,s),z1],c=[x1,height(x1,z0,s),z0],d=[x1,height(x1,z1,s),z1];if(s.rampAxes.length===2&&(x-P.centerX)*(z-P.centerZ)>0){triangle(a,b,d,s.color);triangle(a,d,c,s.color);}else quad(a,b,c,d,s.color);cells.push({x0,x1,z0,z1,type:s.type});
  // Each height discontinuity has exactly one vertical face on its higher side.
  for(const [nx,nz,A,B] of [[x0-1e-5,z,a,b],[x1+1e-5,z,d,c],[x,z0-1e-5,c,a],[x,z1+1e-5,b,d]]){
   const neighbor=roadSection(nx,nz),low=neighbor?.y??.09;if(s.y-low>.001)quad(A,[A[0],low,A[2]],B,[B[0],low,B[2]],'#b8bea9');
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();
 const o=k.mesh(g,'#ffffff',k.world,{vertexColors:true});o.name='unified-city-road-surface';o.userData.roadLayer=true;o.castShadow=false;o.userData.cells=cells;
 k.stats.roadPlan={version:1,...P,lanesPerDirection:2,bikeLanes:4,raisedFootways:4,surfaceCells:cells.length,coplanarPaintLayers:0};
 return o;
}

function subtract(rect,cut){const [x0,x1,z0,z1]=rect,[a,b,c,d]=cut;if(b<=x0||a>=x1||d<=z0||c>=z1)return[rect];const X0=Math.max(a,x0),X1=Math.min(b,x1),Z0=Math.max(c,z0),Z1=Math.min(d,z1);return[[x0,X0,z0,z1],[X1,x1,z0,z1],[X0,X1,z0,Z0],[X0,X1,Z1,z1]].filter(r=>r[1]-r[0]>.001&&r[3]-r[2]>.001);}
export function buildAccessPaths(k){
 const cuts=[[-31,-9,-64,64],[-64,64,16,38],[-8,8,-8,8],...CITY_PARCELS.map(p=>[p.x-p.w/2-.3,p.x+p.w/2+.3,p.z-p.d/2-.3,p.z+p.d/2+.3]),...FUSION_COMPONENTS.filter(p=>p.terrainHole!==false).map(p=>[p.x-p.size/2,p.x+p.size/2,p.z-p.size/2,p.z+p.size/2])],pos=[];
 const paths=[...CITY_PATHS];
 for(const p of CITY_PARCELS){const s=Math.cos(p.rotation),z=p.z+s*(p.d/2+.3),end=Math.abs(p.x+20)<Math.abs(z-27)?[p.x<-20?-31:-9,z]:[p.x,z<27?16:38];paths.push({id:p.id,points:[[p.x,z],end],width:1.6});}
 for(const path of paths)for(let j=1;j<path.points.length;j++){
  const [a,b]=[path.points[j-1],path.points[j]],w=path.width/2,vertical=Math.abs(a[0]-b[0])<.01,rect=vertical?[a[0]-w,a[0]+w,Math.min(a[1],b[1]),Math.max(a[1],b[1])]:[Math.min(a[0],b[0]),Math.max(a[0],b[0]),a[1]-w,a[1]+w];
  let pieces=[rect];for(const c of cuts)pieces=pieces.flatMap(r=>subtract(r,c));
  for(const r of pieces){const [x0,x1,z0,z1]=r;pos.push(x0,.36,z0,x0,.36,z1,x1,.36,z0,x1,.36,z0,x0,.36,z1,x1,.36,z1);cuts.push(r);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();const o=k.mesh(g,'#c3c8ac');o.name='connected-city-public-paths';o.userData.roadLayer=true;o.castShadow=false;
}
