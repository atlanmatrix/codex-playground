import * as THREE from 'three';

// Thin leaves, fronds and glass shards do not need high-poly ellipsoids. These
// batches retain individual silhouettes without one draw call per small detail.
export function cityDetails(k){
 const leaf=new THREE.BufferGeometry();
 leaf.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.42,.42,.06,0,1,0,0,0,0,0,1,0,.42,.42,.06],3));leaf.computeVertexNormals();
 const geometries={leaf,stone:new THREE.IcosahedronGeometry(1,0),ring:new THREE.TorusGeometry(1,.065,4,16),shard:new THREE.CircleGeometry(1,3)};
 const batches=new Map(),dummy=new THREE.Object3D(),color=new THREE.Color(),wind={value:0};
 const ramp=new THREE.DataTexture(new Uint8Array([85,130,188,235,255]),5,1,THREE.RedFormat);ramp.needsUpdate=true;ramp.minFilter=ramp.magFilter=THREE.NearestFilter;
 function put(type,p,s,c,parent=null,r=[0,0,0]){if(!batches.has(type))batches.set(type,[]);batches.get(type).push({p,s,c,parent,r});}
 function count(type,n=1){const inventory=k.stats.inventory??={};inventory[type]=(inventory[type]||0)+n;}
 function finish(){let total=0;
  for(const [type,items] of batches){
   const material=new THREE.MeshToonMaterial({color:'#ffffff',gradientMap:ramp,side:THREE.DoubleSide,transparent:type==='shard',opacity:type==='shard'?.4:1,depthWrite:type!=='shard'});
   if(type==='leaf')material.onBeforeCompile=shader=>{shader.uniforms.cityWindTime=wind;shader.vertexShader='uniform float cityWindTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.x += sin(cityWindTime * .8 + instanceMatrix[3].x * .17 + instanceMatrix[3].z * .12) * position.y * .045;');};
   const mesh=new THREE.InstancedMesh(geometries[type],material,items.length);mesh.name=`city-batched-${type}`;
   items.forEach((v,i)=>{dummy.position.set(...v.p);dummy.scale.set(...v.s);dummy.rotation.set(...v.r);dummy.updateMatrix();if(v.parent){v.parent.updateWorldMatrix(true,false);dummy.matrix.premultiply(v.parent.matrixWorld);}mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,color.set(v.c));});
   mesh.receiveShadow=true;mesh.castShadow=type!=='leaf'&&type!=='shard';mesh.computeBoundingSphere();k.world.add(mesh);total+=items.length;
  }
  k.stats.customInstances=total;k.motions.push(t=>{wind.value=t;});k.stats.wind=wind;
 }
 return {put,count,finish,wind};
}

export function cityFurniture(k,D){
 const {box,cyl,rod,group,R,pick}=k;
 const wood='#a88a60',edge='#d7d3b4',metal='#617e76',ink='#3f5f56',paper='#e6d8ac';
 function door(g,x,y,z,ry=0){D.count('doors');const a=group('city-open-door',x,y,z,ry,false,g);for(const dx of [-.6,.6])box(dx,1.05,0,.075,2.1,.12,metal,a);box(0,2.12,0,1.28,.08,.12,metal,a);const leaf=group('hinged-door-leaf',-.55,0,0,.8,false,a);box(.52,1.03,0,1.04,2.04,.045,wood,leaf);box(.9,1.03,.05,.055,.12,.07,ink,leaf);}
 function table(g,x,y,z,w=1.6,d=.85){D.count('tables');box(x,y+.75,z,w,.12,d,wood,g);for(const dx of [-w*.4,w*.4])for(const dz of [-d*.35,d*.35])box(x+dx,y+.36,z+dz,.07,.72,.07,metal,g);}
 function chair(g,x,y,z,ry=0){D.count('chairs');const a=group('city-chair',x,y,z,ry,false,g);box(0,.43,0,.46,.08,.46,'#8caaa0',a);box(0,.74,-.21,.46,.5,.07,'#8caaa0',a);for(const dx of [-.17,.17])for(const dz of [-.17,.17])box(dx,.21,dz,.045,.42,.045,metal,a);}
 function shelf(g,x,y,z,w=2,rows=4,books=12,kind='books'){D.count('shelves');for(const dx of [-w/2,w/2])box(x+dx,y+.98,z,.09,1.96,.42,wood,g);box(x,y+.98,z-.2,w,1.96,.06,'#826e50',g);
  for(let j=0;j<rows;j++){const yy=y+.08+j*.48;box(x,yy,z,w,.07,.45,wood,g);for(let b=0;b<books;b++){const h=R(.22,.36);box(x-w*.45+b*w*.9/books,yy+h/2+.04,z+.04,w*.65/books,h,.27,pick(['#8aaf9a','#bb8363','#d0ba83','#78969b','#d3c7a8']),g,[0,0,R(-.1,.1)]);D.count(kind);}}
 }
 function bed(g,x,y,z){D.count('beds');box(x,y+.3,z,1.05,.5,1.9,wood,g);box(x,y+.6,z,1.02,.16,1.84,edge,g);box(x,y+.74,z-.55,.7,.18,.45,paper,g);box(x,y+.71,z+.27,1.06,.08,1.05,'#799c8a',g);box(x,y+.67,z-.96,1.1,.65,.09,wood,g);}
 function kitchen(g,x,y,z){D.count('kitchens');box(x,y+.48,z,2.6,.96,.65,'#c7cbb2',g);box(x,y+.99,z,2.7,.08,.73,wood,g);for(let i=0;i<3;i++){box(x-.86+i*.86,y+.5,z+.34,.77,.75,.05,'#9ab5a0',g);box(x-.65+i*.86,y+.65,z+.39,.18,.04,.05,ink,g);}D.put('ring',[x-.65,y+1.04,z],[.23,.23,.23],metal,g,[Math.PI/2,0,0]);box(x-.65,y+1.03,z,.38,.02,.32,ink,g);k.line([[x-.65,y+1.04,z-.2],[x-.65,y+1.35,z-.2],[x-.65,y+1.35,z],[x-.65,y+1.22,z]],.025,metal,g);for(const dx of [.3,.8])D.put('ring',[x+dx,y+1.04,z],[.15,.15,.15],ink,g,[Math.PI/2,0,0]);box(x+1.9,y+.85,z,.65,1.7,.68,edge,g);box(x+2.15,y+1,z+.36,.04,.3,.05,metal,g);}
 function bathroom(g,x,y,z){D.count('bathrooms');for(const dx of [-.5,.5])box(x+dx,y+.35,z,.11,.65,1.45,'#a7bfb0',g);for(const dz of [-.7,.7])box(x,y+.35,z+dz,.9,.65,.1,'#a7bfb0',g);box(x,y+.12,z,.9,.1,1.35,'#6d9992',g);cyl(x+1,y+.45,z-.4,.19,.55,paper,g);box(x+1,y+.77,z-.6,.4,.5,.17,edge,g);box(x+1,y+.55,z-.15,.4,.1,.45,edge,g);}
 function workbench(g,x,y,z){D.count('workbenches');table(g,x,y,z,2.4,.9);box(x,y+1.4,z-.42,2.4,1,.08,'#8b9880',g);for(let j=0;j<7;j++){rod([x-1+j*.32,y+1.1,z-.34],[x-1+j*.32,y+1.65,z-.34],.035,j%2?metal:'#b29162',g);box(x-.9+j*.3,y+.88,z,.18,.12,.3,j%2?ink:'#bd8f60',g);}}
 function machine(g,x,y,z){D.count('machines');box(x,y+.2,z,1.6,.4,.9,metal,g);box(x-.5,y+.85,z,.5,1.3,.6,'#859d88',g);cyl(x,y+1.2,z,.25,1.1,ink,g,[0,0,Math.PI/2]);for(const dx of [-.2,.4])D.put('ring',[x+dx,y+1.2,z+.4],[.24,.24,.24],'#ac8766',g);box(x+.4,y+.67,z,1,.13,.7,'#b1b5a0',g);}
 function shop(g,type,w,d,y=0){D.count('rooms');const count=Math.max(2,Math.floor(w/3));for(let j=0;j<count;j++)shelf(g,-w*.26+j*w*.52/(count-1),y,-d*.34,Math.min(1.6,w*.42),3,type==='books'?12:5,type==='books'?'books':'goods');table(g,-w*.15,y,d*.2,2.4,.8);chair(g,-w*.15,y,d*.2+.8,Math.PI);
  for(let j=0;j<10;j++){const x=-w*.35+R(0,w*.6),z=R(-d*.2,d*.18);box(x,y+.05,z,.25,.05,.32,pick([paper,'#bba281','#849e89']),g,[0,R(0,6.28),0]);}
  box(w*.3,y+.55,d*.23,1.5,1.1,.7,'#a9b8a1',g);box(w*.3,y+1.18,d*.23,1.65,.12,.8,wood,g);box(w*.3,y+1.35,d*.23,.4,.25,.3,ink,g);
  if(type==='cafe'){for(let j=0;j<2;j++){table(g,-w*.3+j*2,y,0,1,.7);chair(g,-w*.3+j*2,y,.65,Math.PI);cyl(-w*.3+j*2,y+.86,0,.08,.14,paper,g);}}
 }
 return {door,table,chair,shelf,bed,kitchen,bathroom,workbench,machine,shop};
}
