import * as THREE from 'three';

// A per-scene detail layer: geometry is instanced by shape, with explicit counts
// for usable objects. Leaves use two triangles, rather than tiny solid spheres.
export function detailLayer(k,{reference,zones,minDistance=32}={}){
 const {R,pick,land,world,stats}=k,records=new Map(),anchors=[];
 const report=stats.enrichment={version:3,reference,zones,counts:{},anchors,parts:0};
 const ramp=new THREE.DataTexture(new Uint8Array([85,130,185,235,255]),5,1,THREE.RedFormat);ramp.needsUpdate=true;ramp.minFilter=ramp.magFilter=THREE.NearestFilter;
 const leaf=new THREE.BufferGeometry();leaf.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.4,.4,.04,0,1,0,0,0,0,0,1,0,.4,.4,.04],3));leaf.computeVertexNormals();
 const geo={box:new THREE.BoxGeometry(1,1,1),cyl:new THREE.CylinderGeometry(1,1,1,8),stone:new THREE.IcosahedronGeometry(1,0),leaf,ring:new THREE.TorusGeometry(1,.055,4,20),pad:new THREE.CircleGeometry(1,12,.12,Math.PI*2-.24),glow:new THREE.BoxGeometry(1,1,1)};
 const wind={value:0},dummy=new THREE.Object3D(),color=new THREE.Color();
 const greens=['#577d4e','#73985a','#91ad6b','#b1c17d'];
 const count=(name,n=1)=>report.counts[name]=(report.counts[name]||0)+n;
 function put(type,x,y,z,sx,sy,sz,c,parent=null,r=null){if(!records.has(type))records.set(type,[]);records.get(type).push({x,y,z,sx,sy,sz,c,parent,r});}
 const box=(x,y,z,w,h,d,c='#b4a077',p=null,r=null)=>put('box',x,y,z,w,h,d,c,p,r);
 const cyl=(x,y,z,r,h,c='#899981',p=null,rotation=null)=>put('cyl',x,y,z,r,h,r,c,p,rotation);
 const stone=(x,y,z,sx,sy,sz,c='#a4b097',p=null,r=null)=>put('stone',x,y,z,sx,sy,sz,c,p,r||[R(0,3),R(0,6.28),R(0,3)]);
 function rod(a,b,r,c='#8e9170',parent=null){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A),mid=A.clone().add(B).multiplyScalar(.5),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.clone().normalize());put('cyl',mid.x,mid.y,mid.z,r,v.length(),r,c,parent,q);}
 function line(points,r,c,parent=null){for(let j=1;j<points.length;j++)rod(points[j-1],points[j],r,c,parent);}
 function ring(x,y,z,r,c='#9e8e66',parent=null,rotation=[0,0,0],sy=r){put('ring',x,y,z,r,sy,r,c,parent,rotation);}
 function blade(x,y,z,h=.5,w=.15,c=pick(greens),p=null,r=[0,R(0,6.28),0]){put('leaf',x,y,z,w,h,w,c,p,r);}
 function group(name,x=0,y=0,z=0,ry=0,parent=world){return k.group(name,x,y,z,ry,false,parent);}
 function anchor(name,x,z,y=land(x,z)){const g=group(name,x,y,z);g.userData.detailAnchor=true;anchors.push([name,x,y,z]);return g;}
 function tuft(x,z,s=.7,type='grass',y=land(x,z),parent=null){count(type==='reed'?'reedClumps':type==='ribbon'?'aquaticGrass':'groundClumps');const n=type==='fern'?24:18;
  for(let j=0;j<n;j++){const a=j*2.4,r=s*R(.03,.26),h=s*R(.35,.85);blade(x+Math.cos(a)*r,y+.01,z+Math.sin(a)*r,h,type==='fern'?.25*s:.07*s,pick(greens),parent,[Math.sin(a)*.65,a,Math.cos(a)*.55]);}
 }
 function flower(x,y,z,s=.2,c='#dfc594',p=null){count('flowers');cyl(x,y+s*.4,z,.012,s*.8,'#81975c',p);for(let j=0;j<6;j++){const a=j*1.047;stone(x+Math.cos(a)*s*.3,y+s*.8,z+Math.sin(a)*s*.3,s*.2,s*.07,s*.2,c,p);}stone(x,y+s*.83,z,.035,.025,.035,'#d5ac58',p);}
 function table(p,x,y,z,w=1.6,d=.8){count('tables');box(x,y+.72,z,w,.1,d,'#b69a6d',p);for(const dx of [-w*.4,w*.4])for(const dz of [-d*.35,d*.35])box(x+dx,y+.35,z+dz,.065,.7,.065,'#82917b',p);}
 function chair(p,x,y,z,ry=0){count('chairs');const g=group('detailed-chair',x,y,z,ry,p);box(0,.43,0,.46,.08,.46,'#96ad91',g);box(0,.73,-.21,.46,.5,.07,'#96ad91',g);for(const dx of [-.17,.17])for(const dz of [-.17,.17])box(dx,.21,dz,.045,.42,.045,'#768674',g);}
 function shelf(p,x,y,z,w=1.8,rows=4,items=10,kind='books'){count('shelves');for(const dx of [-w/2,w/2])box(x+dx,y+.95,z,.08,1.9,.4,'#9c875f',p);box(x,y+.95,z-.18,w,1.9,.05,'#927d59',p);
  for(let row=0;row<rows;row++){box(x,y+.05+row*.47,z,w,.06,.43,'#b49a6a',p);for(let j=0;j<items;j++){const h=R(.22,.36);box(x-w*.44+j*w*.88/items,y+.09+row*.47+h/2,z,w*.65/items,h,.26,pick(['#8eaa93','#b98e6e','#d0bd8b','#7f9d9c']),p,[0,0,R(-.08,.08)]);count(kind);}}
 }
 function crate(p,x,y,z,w=.8){count('crates');for(const xx of [-w/2,w/2])for(const zz of [-w/2,w/2])box(x+xx,y+w*.4,z+zz,.06,w*.8,.06,'#8b7b59',p);for(let j=0;j<4;j++){const yy=y+.1+j*w*.19;for(const zz of [-w/2,w/2])box(x,yy,z+zz,w,.12,.04,'#b29b70',p);for(const xx of [-w/2,w/2])box(x+xx,yy,z,.04,.12,w,'#b29b70',p);}box(x,y+.025,z,w,.05,w,'#a68e64',p);}
 function rope(p,x,y,z,r=.3,turns=4){count('ropeCoils');for(let j=0;j<turns;j++)ring(x,y+j*.035,z,r-j*.018,'#c1b18b',p,[Math.PI/2,0,0]);}
 function deck(name,points,width=2.6){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),length=curve.getLength();count('boardwalks');
  for(let t=0;t<length;t+=.3){const p=curve.getPointAt(t/length),v=curve.getTangentAt(t/length),ry=Math.atan2(v.x,v.z);box(p.x,p.y,p.z,width,.1,.27,t%2<1?'#b8a17a':'#c3af86',null,[0,ry,0]);if(t%1.8<.3)for(const s of [-1,1]){const x=p.x+v.z*width*.43*s,z=p.z-v.x*width*.43*s,bottom=land(x,z);rod([x,bottom,z],[x,p.y+.05,z],.06,'#8d8b6b');rod([x,p.y,z],[x,p.y+.85,z],.035,'#9c9d79');}}
  return curve;
 }
 function finish(){
  world.updateWorldMatrix(true,true);const bounds=new THREE.Box3(),p=new THREE.Vector3();let total=0;
  for(const [type,items] of records){
   const material=new THREE.MeshToonMaterial({color:'#ffffff',gradientMap:ramp,side:type==='leaf'||type==='pad'?THREE.DoubleSide:THREE.FrontSide,emissive:type==='glow'?'#ffcb87':'#000000',emissiveIntensity:type==='glow'?.3:0});
   if(type==='leaf')material.onBeforeCompile=shader=>{shader.uniforms.detailWind=wind;shader.vertexShader='uniform float detailWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.x += sin(detailWind*.8 + instanceMatrix[3].x*.19 + instanceMatrix[3].z*.11)*position.y*.035;');};
   const o=new THREE.InstancedMesh(geo[type],material,items.length);o.name=`enriched-${type}`;geo[type].computeBoundingBox();const b=geo[type].boundingBox;
   items.forEach((a,i)=>{dummy.position.set(a.x,a.y,a.z);dummy.scale.set(a.sx,a.sy,a.sz);dummy.rotation.set(0,0,0);if(a.r?.isQuaternion)dummy.quaternion.copy(a.r);else if(a.r)dummy.rotation.set(...a.r);dummy.updateMatrix();if(a.parent){a.parent.updateWorldMatrix(true,false);dummy.matrix.premultiply(a.parent.matrixWorld);}o.setMatrixAt(i,dummy.matrix);o.setColorAt(i,color.set(a.c));for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])bounds.expandByPoint(p.set(x,y,z).applyMatrix4(dummy.matrix));});
   o.castShadow=type!=='leaf'&&type!=='pad';o.receiveShadow=true;o.computeBoundingSphere();world.add(o);total+=items.length;
  }
  report.parts=total;report.bounds={min:bounds.min.toArray(),max:bounds.max.toArray()};report.wind=wind;
  k.motions.push(t=>{wind.value=t;for(const o of world.children)if(o.name==='enriched-glow')o.material.emissiveIntensity=k.kind==='rainy'||k.model.userData.period==='night'?.6:0;});
  k.controls.minDistance=minDistance;k.controls.enablePan=true;k.controls.screenSpacePanning=false;k.controls.maxPolarAngle=Math.min(k.controls.maxPolarAngle,1.34);
  return report;
 }
 return {count,put,box,cyl,stone,rod,line,ring,blade,group,anchor,tuft,flower,table,chair,shelf,crate,rope,deck,finish,report};
}
