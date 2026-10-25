import * as THREE from 'three';

export const EXPANDED_BASE_SIZE = 128;
export const expandedFit = aspect => Math.max(310, 330 / aspect);
const CONFIG = {
 city:{size:16,bottom:-1.24,top:.09,color:'#899b79'}, lakeside:{size:16,bottom:-3.05,top:.07,color:'#a5bd82'},
 courtyard:{size:16,bottom:-1.65,top:.12,color:'#b4c39a'}, sakura:{size:18,bottom:-.5,top:.12,color:'#afc591'},
 rooftop:{size:18,bottom:-1.2,top:.12,color:'#c9c9b5'}, rainy:{size:18,bottom:-1.1,top:.12,color:'#39465b'},
 onsen:{size:32,bottom:-1.32,top:.07,color:'#789b64'}, study:{size:32,bottom:-.86,top:.3,color:'#cbaa7b'},
 intersection:{size:32,bottom:-1.38,top:.12,color:'#b4c59d'}, summit:{size:32,bottom:-1.7,top:1,color:'#e9f2f6'},
 desert:{size:32,bottom:-1.58,top:.7,color:'#ecc58a'}, ocean:{size:32,bottom:-7.25,top:-6,color:'#a2c9c3'}
};

// Extend a detailed central diorama with new, full-scale surroundings. Objects are
// instanced by geometry, so hundreds of buildings/trees need only a few draw calls.
export function expandWorld({kind,scene,model,camera,controls,renderer,preview,reduced,nativeHeight,wave,dolphinPath}) {
 const cfg=CONFIG[kind],core=cfg.size/2,H=64,world=new THREE.Group();world.name=`expanded-${kind}-world`;model.add(world);
 model.userData.coreBaseSize=cfg.size;model.userData.baseSize=128;
 const stats={baseSize:128,coreSize:cfg.size,trees:0,buildings:0,shrubs:0,corals:0,books:0,vehicles:0};world.userData=stats;model.userData.expansion=stats;
 let seed=7937+[...kind].reduce((s,c)=>s+c.charCodeAt(0),0);const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const R=(a,b)=>a+rand()*(b-a),pick=a=>a[Math.floor(rand()*a.length)],outside=(x,z,margin=0)=>Math.max(Math.abs(x),Math.abs(z))>core+margin;
 const ramp=new THREE.DataTexture(new Uint8Array([90,145,198,238,255]),5,1,THREE.RedFormat);ramp.needsUpdate=true;ramp.minFilter=ramp.magFilter=THREE.NearestFilter;
 const material=new THREE.MeshToonMaterial({color:'#ffffff',gradientMap:ramp});
 const windowMat=new THREE.MeshToonMaterial({color:'#ffffff',gradientMap:ramp,emissive:'#ffbb68',emissiveIntensity:0});
 const geometries={box:new THREE.BoxGeometry(1,1,1),ico:new THREE.IcosahedronGeometry(1,1),cyl:new THREE.CylinderGeometry(1,1,1,7),cone:new THREE.ConeGeometry(1,1,7)};
 const parts=new Map(),dummy=new THREE.Object3D(),motion=[];
 function put(type,color,x,y,z,sx,sy,sz,ry=0,glow=false){const key=type+(glow?'-lit':'');if(!parts.has(key))parts.set(key,{type,glow,items:[]});parts.get(key).items.push({p:[x,y,z],s:[sx,sy,sz],ry,color});}
 const box=(color,x,y,z,w,h,d,ry=0,lit=false)=>put('box',color,x,y,z,w,h,d,ry,lit);
 const ball=(color,x,y,z,w,h,d)=>put('ico',color,x,y,z,w,h,d,R(0,6.28));
 function cylinder(color,x,y,z,r,h){put('cyl',color,x,y,z,r,h,r)}
 function rod(a,b,r,color){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from),mid=from.add(to).multiplyScalar(.5);const key='rod';if(!parts.has(key))parts.set(key,{type:'cyl',items:[]});parts.get(key).items.push({p:mid.toArray(),s:[r,delta.length(),r],q:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()),color})}
 function rectangles(lo,hi,color){const s=H-core;for(const [x,z,w,d] of [[0,-(H+core)/2,128,s],[0,(H+core)/2,128,s],[-(H+core)/2,0,s,cfg.size],[(H+core)/2,0,s,cfg.size]])box(color,x,(lo+hi)/2,z,w,hi-lo,d)}
 const structuralTop=kind==='lakeside'?-2.77:kind==='ocean'?-6.35:kind==='desert'?-.25:cfg.top-.12;
 rectangles(cfg.bottom,structuralTop,kind==='ocean'?'#789ca0':kind==='summit'?'#8c9fae':kind==='desert'?'#bf875a':kind==='study'?'#a68b68':'#8a8871');
 const originalHeight=nativeHeight||(()=>cfg.top);
 function land(x,z){
  if(kind==='lakeside'){const shore=-4.02+.38*z+.38*Math.sin(z*.55)+.1*Math.cos(z*.91);return x<shore?cfg.top:.07-THREE.MathUtils.smoothstep((x-shore)/4,0,1)*2.75}
  if(kind==='ocean')return -6+.13*Math.sin(x*.55+z*.3)+.12*Math.cos(z*.65);
  if(kind==='summit'||kind==='desert'||kind==='onsen'){
   const distance=Math.max(Math.abs(x),Math.abs(z))-core,blend=THREE.MathUtils.smoothstep(distance,0,10);
   const edge=originalHeight(THREE.MathUtils.clamp(x,-core,core),THREE.MathUtils.clamp(z,-core,core));
   let target;
   if(kind==='summit')target=1.2+17*Math.exp(-((x+33)**2/220+(z+27)**2/310))+21*Math.exp(-((x-28)**2/250+(z+33)**2/170))+12*Math.exp(-((x-35)**2/160+(z-28)**2/220))+8*Math.exp(-((x+32)**2/240+(z-38)**2/170))+.25*Math.sin(x*.6+z*.3);
   else if(kind==='desert'){const d=Math.sin(z*.035)*15+x-18;target=.8+8*Math.exp(-d*d/(d>0?16:100))+6*Math.exp(-((x+30+z*.23)**2)/70)*(.65+.35*Math.cos(z*.04))+.5*Math.sin(z*.15+x*.06)}
   else target=3.5+3*Math.sin(x*.045)*Math.cos(z*.05)+7*Math.exp(-((x+35)**2+(z+30)**2)/600);
   return THREE.MathUtils.lerp(edge,target,blend);
  }
  return cfg.top;
 }
 stats.height=land;
 // A tessellated ring fits the old square exactly, with no doubled top faces.
 const p=[],c=[],idx=[],N=128,step=1;
 for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){
  const x=-H+i*step,z=-H+j*step,y=land(x,z),col=new THREE.Color(cfg.color);if(kind==='lakeside'&&y<.07){const shore=-4.02+.38*z+.38*Math.sin(z*.55)+.1*Math.cos(z*.91);col.set('#dbcfa8').lerp(new THREE.Color('#387f8e'),THREE.MathUtils.smoothstep((x-shore)/4,0,1))}if(kind==='summit'&&Math.abs(land(x+.4,z)-land(x-.4,z))>1)col.set('#97aabd');else col.multiplyScalar(.98+.02*Math.sin(x*.32+z*.23));p.push(x,y,z);c.push(col.r,col.g,col.b);
  if(i<N&&j<N&&outside(x+.5,z+.5)){const a=j*(N+1)+i;idx.push(a,a+N+1,a+1,a+1,a+N+1,a+N+2)}
 }
 const terrainGeo=new THREE.BufferGeometry();terrainGeo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));terrainGeo.setAttribute('color',new THREE.Float32BufferAttribute(c,3));terrainGeo.setIndex(idx);terrainGeo.computeVertexNormals();
 const terrain=new THREE.Mesh(terrainGeo,new THREE.MeshToonMaterial({color:'#ffffff',gradientMap:ramp,vertexColors:true,side:THREE.DoubleSide}));terrain.name='expanded-terrain-ring';terrain.receiveShadow=true;world.add(terrain);
 // Exposed side faces follow the terrain down to the structural layer.
 const walls=[];for(const [ax,az,bx,bz] of [[-64,-64,64,-64],[64,-64,64,64],[64,64,-64,64],[-64,64,-64,-64]])for(let i=0;i<128;i++){
  const x=ax+(bx-ax)*i/128,z=az+(bz-az)*i/128,xx=ax+(bx-ax)*(i+1)/128,zz=az+(bz-az)*(i+1)/128,lo=structuralTop;walls.push(x,lo,z,xx,lo,zz,x,land(x,z),z,xx,lo,zz,xx,land(xx,zz),zz,x,land(x,z),z);
 }
 const wallGeo=new THREE.BufferGeometry();wallGeo.setAttribute('position',new THREE.Float32BufferAttribute(walls,3));wallGeo.computeVertexNormals();const wall=new THREE.Mesh(wallGeo,new THREE.MeshToonMaterial({color:cfg.color,gradientMap:ramp,side:THREE.DoubleSide}));wall.receiveShadow=true;world.add(wall);
 function tree(x,z,s=1,type='leaf'){
  const y=land(x,z);stats.trees++;cylinder('#887c61',x,y+2*s,z,.17*s,4*s);
  if(type==='pine'||type==='snow'){for(let i=0;i<4;i++){put('cone',i%2?'#638c79':'#4d796b',x,y+(2+i*.85)*s,z,(2-i*.32)*s,2.4*s,(2-i*.32)*s);if(type==='snow')put('cone','#e7f1f5',x+.04*s,y+(2.4+i*.85)*s,z,(1.75-i*.28)*s,1.8*s,(1.75-i*.28)*s)}}
  else for(let i=0;i<6;i++){const a=i*2.4,col=type==='sakura'?pick(['#edbac7','#f3d1d8','#dba7bd']):pick(['#80a26e','#a0b984','#668e72']);ball(col,x+Math.cos(a)*s,y+4.2*s+(i%2)*.6*s,z+Math.sin(a)*s,1.65*s,1.7*s,1.65*s)}
 }
 function shrub(x,z,s=1,snow=false){const y=land(x,z);stats.shrubs++;for(let i=0;i<4;i++){const a=i*2.4;ball(kind==='desert'?'#b1ab77':'#77977f',x+Math.cos(a)*.6*s,y+.45*s,z+Math.sin(a)*.6*s,.75*s,.45*s,.65*s);if(snow)ball('#edf5f6',x+Math.cos(a)*.6*s,y+.78*s,z+Math.sin(a)*.6*s,.65*s,.12*s,.56*s)}}
 function bench(x,z,ry=0){const y=land(x,z);box('#b3946a',x,y+.8,z,3.2,.18,1,ry);box('#a2835d',x,y+1.25,z-.42,3.2,.8,.12,ry);for(const side of [-1,1])box('#637777',x+side,y+.38,z,.12,.76,.7,ry)}
 const roofs=[];
 function house(x,z,w=9,d=7,h=8,style='house'){
  const y=land(x,z);stats.buildings++;const night=kind==='rainy',japanese=style==='inn';if(japanese)box('#8f9a89',x,y-1.6,z,w+.5,3.2,d+.5);
  box(night?'#677586':style==='ruin'?'#a5b19b':pick(['#d9cfb5','#c4c8b4','#b5c6c3','#d2b6a6']),x,y+h/2,z,w,h,d);
  box(japanese?'#537478':night?'#536276':'#a6b0a4',x,y+h+.2,z,w+.8,.4,d+.8);roofs.push({x,z,w:w+.8,d:d+.8,y:y+h+.4});
  if(japanese)for(const side of [-1,1]){const yy=y+h+.35,oX=x+side*w*.26;box('#577b7d',oX,yy,z,w*.58,.26,d+1);}
  for(let floor=0;floor<Math.floor(h/2.6);floor++)for(let i=0;i<Math.floor(w/1.8);i++){
   const xx=x-w/2+1+i*1.8,yy=y+1.4+floor*2.6;
   for(const side of [-1,1]){box(style==='ruin'?'#556f65':night?'#e1bf81':'#92afb3',xx,yy,z+side*(d/2+.025),1.05,1.35,.06,0,night||japanese);box('#e4dfc9',xx,yy-.74,z+side*(d/2+.16),1.2,.12,.32)}
  }
  for(const side of [-1,1])for(let j=0;j<Math.floor(d/2);j++)box(night?'#cfb785':'#90aab0',x+side*(w/2+.025),y+h*.55,z-d/2+1+j*2,.06,1.35,1.1,0,night||japanese);
  box('#677f77',x,y+1,z+d/2+.05,1.1,2,.08);
  if(style==='ruin'){for(let j=0;j<12;j++)ball('#789461',x+R(-w/2,w/2),y+h+.35,z+R(-d/2,d/2),R(.4,1),R(.3,.8),R(.4,1));tree(x+w*.25,z-d*.2,.8)}
  else{box('#91aaa0',x,y+h+.72,z,1.4,1,1.2);if(!night)shrub(x-w*.5,z+d*.6,.8)}
 }
 function road(axis,offset,width=5){const segments=Math.abs(offset)<core?[[-64,-core],[core,64]]:[[-64,64]];for(const [lo,hi] of segments){box(kind==='rainy'?'#3a455c':'#7d8b8e',axis?(lo+hi)/2:offset,cfg.top+.025,axis?offset:(lo+hi)/2,axis?hi-lo:width,.045,axis?width:hi-lo);for(let t=lo+1;t<hi-1;t+=3.2)box('#e6ddbc',axis?t:offset,cfg.top+.055,axis?offset:t,axis?1.5:.10,.012,axis?.10:1.5)}}
 function lamp(x,z){const y=land(x,z);cylinder('#7d9292',x,y+2.8,z,.07,5.6);box(kind==='rainy'?'#ffe0a5':'#e8e4ce',x+.45,y+5.5,z,1.05,.18,.5,0,kind==='rainy'||kind==='onsen');}
 function furniture(x,z){const y=land(x,z);box('#c5b68d',x,y+.02,z,12,.04,10);for(const side of [-1,1]){box('#a0b6a2',x+side*3.8,y+.8,z,1.7,1.4,5);box('#bac8b0',x+side*4.3,y+1.6,z,.5,1.2,5)}box('#ac8f6a',x,y+.55,z,3.2,1.1,2);box('#eddfbe',x,y+1.15,z,1.2,.1,.8);}
 function library(x,z){const y=land(x,z);box('#b29570',x,y+2.4,z,8,4.8,1.2);for(let row=0;row<4;row++){box('#725f4e',x,y+.5+row*1.1,z+.63,7.5,.09,.08);for(let j=0;j<22;j++){box(pick(['#9bb4ac','#d0aa7d','#d3bfb3','#7c959c','#c0bb92']),x-3.5+j*.33,y+.95+row*1.1,z+.64,.24,R(.6,.9),.48);stats.books++}}}
 function cactus(x,z,h=3){const y=land(x,z);cylinder('#85a184',x,y+h/2,z,.25,h);ball('#85a184',x,y+h,z,.25,.27,.25);for(const side of [-1,1]){rod([x,y+h*.5,z],[x+side*.7,y+h*.56,z],.14,'#85a184');cylinder('#85a184',x+side*.7,y+h*.65,z,.14,h*.4)}stats.shrubs++;}
 function coral(x,z,s=1){const y=land(x,z);stats.corals++;ball('#8fb2b2',x,y+.25*s,z,1.2*s,.45*s,.8*s);for(let i=0;i<7;i++){const a=i*2.4,xx=x+Math.cos(a)*.7*s,zz=z+Math.sin(a)*.7*s;rod([x,y+.15,z],[xx,y+1.3*s,zz],.075*s,i%2?'#b39ec4':'#d899a7');ball('#e1b08c',xx,y+1.4*s,zz,.25*s,.22*s,.2*s)}}
 const sites=[];for(let z=-48;z<=48;z+=24)for(let x=-48;x<=48;x+=24)if(outside(x,z,10))sites.push([x,z]);
 const urban=['city','courtyard','sakura','rooftop','rainy','intersection'].includes(kind);
 if(urban){
  if(kind==='city'){road(0,5.7,4);road(1,5.2,4)}else if(kind==='intersection'){road(0,0,8);road(1,0,8)}
  for(const offset of [-24,24]){road(0,offset,5);road(1,offset,5)}
  for(const [x,z] of sites){
   if(kind==='courtyard'&&Math.abs(x)===24&&Math.abs(z)===24)continue;
   if(kind==='rooftop'&&Math.abs(x)===24)continue;
   house(x+7,z+7,R(8,12),R(7,10),kind==='courtyard'?R(12,18):R(6,12),kind==='city'?'ruin':'house');
   if(kind!=='courtyard')house(x-5,z-5,R(6,9),R(5,8),R(4,7),kind==='city'?'ruin':'house');
   for(let i=0;i<3;i++)tree(x+R(-9,9),z+R(-10,-7),R(.8,1.25),kind==='sakura'?'sakura':'leaf');bench(x-7,z+5);lamp(x-10,z+10);
  }
  for(let i=0;i<170;i++){const x=R(-60,60),z=R(-60,60);if(outside(x,z,4)&&Math.abs(Math.abs(x)-24)>5&&Math.abs(Math.abs(z)-24)>5&&(kind!=='rooftop'||Math.abs(x+28)>5))tree(x,z,R(.6,1.25),kind==='sakura'?'sakura':'leaf')}
  if(kind==='courtyard')for(const [x,z] of [[-36,-36],[36,-36],[-36,36],[36,36]]){
   box('#b2c5a0',x,.17,z,15,.1,15);box('#c49c8d',x,.23,z,11,.05,11);
   for(let j=0;j<6;j++){const xx=x+(j%3-1)*3,zz=z+(Math.floor(j/3)-.5)*5;for(const side of [-1,1]){cylinder('#649cba',xx+side*.55,1.2,zz,.08,2);rod([xx+side*.55,2.2,zz],[xx,2.5,zz],.05,'#e4c86c')}box('#ddbf68',xx,1.2,zz,1.1,.15,.8)}for(const side of [-1,1])bench(x+side*7,z);
  }
 }
 if(kind==='study'){
  // A connected studio/library complex around the original detailed editing room.
  for(let z=-62;z<64;z+=1.6)for(let x=-60;x<64;x+=8)if(outside(x,z,1))box((Math.round(z/1.6)+Math.round(x/8))%3?'#caa779':'#d4b78a',x,.33,z,7.94,.035,1.55);
  box('#e0dfcf',-63.7,5.5,0,.5,11,128);box('#d7ded5',0,5.5,-63.7,128,11,.5);
  for(let a=-56;a<60;a+=10){box('#9db9bc',a,6,-63.4,7.5,5,.06,0,true);box('#e4d6b6',a,6,-63.3,.14,5.2,.1);}
  for(const [x,z] of sites){library(x,z-7);library(x,z-3);furniture(x,z+4);const y=land(x,z);box('#b2916b',x+6,y+1.7,z+5,5,.15,2.2);for(const side of [-1,1])box('#796958',x+6+side*1.8,y+.8,z+5,.12,1.6,1.8);box('#566d72',x+6,y+2.55,z+4.7,2.2,1.4,.12);box('#92b2b7',x+6,y+2.55,z+4.79,2,1.2,.03,0,true);box('#95ad9f',x+6,y+.8,z+7,1.8,1.4,1.8);stats.buildings++;}
  for(let i=0;i<60;i++){const x=R(-60,60),z=R(-60,60);if(outside(x,z,3)){cylinder('#c5ae8d',x,.8,z,.55,.9);for(let j=0;j<4;j++)ball('#7ba284',x+Math.cos(j*2.4)*.35,1.7+j*.14,z+Math.sin(j*2.4)*.35,.6,.45,.4)}}
 }
 if(kind==='onsen'){
  for(const [x,z] of sites){if((Math.abs(x)+Math.abs(z))%48===0)house(x,z,10,8,5,'inn');else{box('#b5b69b',x,land(x,z)+.08,z,10,.16,10);for(const side of [-1,1])bench(x+side*3,z)}}
  for(let i=0;i<360;i++){const x=R(-60,60),z=R(-60,60);if(outside(x,z,5))tree(x,z,R(.7,1.6),i%4?'pine':'leaf')}
  for(let i=0;i<120;i++){const a=i/119,x=-61+122*a,z=23+5*Math.sin(a*6);box('#b5b5a0',x,land(x,z)+.1,z,1.2,.2,1.4);if(i%7===0)lamp(x,z+1.8)}
 }
 if(kind==='summit'||kind==='desert'){
  for(let i=0;i<220;i++){const x=R(-61,61),z=R(-61,61);if(outside(x,z,3)){ball(kind==='summit'?'#91a5b7':'#c58b5f',x,land(x,z)+R(.1,.7),z,R(.4,1.5),R(.2,.9),R(.4,1.1));if(i%3===0)shrub(x+1,z,R(.8,1.5),kind==='summit')}}
  if(kind==='summit')for(let i=0;i<95;i++){const x=R(-59,59),z=R(-59,59);if(outside(x,z,8)&&land(x,z)<9)tree(x,z,R(.5,1.1),'snow')}
  else{
   for(let i=0;i<95;i++){const x=R(-60,60),z=R(-60,60);if(outside(x,z,3))cactus(x,z,R(2,5))}
   for(const [x,z] of [[-43,-31],[30,-36],[-35,34],[35,39]])for(let i=0;i<12;i++){const y=land(x,z);put('cyl',i%3===0?'#d6a16d':'#b97c56',x,y+(i+.5)*.7,z,2.4-i*.08,.71,1.8-i*.06)}
   // Visible sand ripples across the new dune fields.
   for(let z=-61;z<62;z+=1.3)for(let x=-61;x<62;x+=2.5)if(outside(x,z,1))box('#d5ae79',x,land(x,z)+.016,z,2.2,.018,.035,.15*Math.sin(z*.1));
  }
 }
 const movingFish=[];
 if(kind==='lakeside'||kind==='ocean'){
  if(kind==='lakeside'){
   for(let z=-58;z<60;z+=5){const x=-4.02+.38*z-5;if(outside(x,z,3)){tree(x,z,R(1,1.6));for(let k=0;k<4;k++)box('#c1b690',x+2,land(x+2,z+k)+.06,z+k,2,.12,.8)}}
   for(let i=0;i<140;i++){const x=R(-61,15),z=R(-60,60);if(outside(x,z,4)&&land(x,z)>0)tree(x,z,R(.7,1.4))}
   for(const [x,z] of [[-28,-28],[-32,28],[-48,40]]){bench(x,z);box('#b7a27b',x+5,.5,z,5,.18,4);for(const side of [-1,1])cylinder('#9c8e6f',x+5+side*1.7,-.6,z,.09,2.2)}
  }else{
   for(let i=0;i<100;i++){const x=R(-59,59),z=R(-59,59);if(outside(x,z,5))coral(x,z,R(1,2))}
   for(const [x,z] of [[-36,-35],[35,-30],[-35,34],[39,30]]){for(let i=0;i<8;i++)ball(i%2?'#8faead':'#b6c9ba',x+R(-4,4),-4+i*.7,z+R(-4,4),R(2,4),R(1,2.5),R(2,3));}
  }
  const waterPositions=[],waterIndices=[];for(let j=0;j<=128;j++)for(let i=0;i<=128;i++){
   const x=-64+i,z=-64+j;waterPositions.push(x,kind==='lakeside'?.16:0,z);
   if(i<128&&j<128&&outside(x+.5,z+.5)&&(kind==='ocean'||land(x+.5,z+.5)<0)){const a=j*129+i;waterIndices.push(a,a+129,a+1,a+1,a+129,a+130)}
  }
  const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(waterPositions,3));wg.setIndex(waterIndices);wg.computeVertexNormals();
  const wm=kind==='ocean'?model.getObjectByName('rolling-ocean-surface').material:new THREE.MeshPhongMaterial({color:'#65b4b8',transparent:true,opacity:.8,shininess:75,side:THREE.DoubleSide});const water=new THREE.Mesh(wg,wm);water.name='expanded-water-surface';water.renderOrder=3;
  if(kind==='lakeside'){
   // One real reflector covers the entire enlarged lake, avoiding a visible square seam.
   const lake=model.getObjectByName('reflective-lake'),lp=[],li=[],n=256;lake.userData.coreGeometry=lake.geometry;model.traverse(o=>{if(o.name==='lake-cutaway-water')o.visible=false});
   for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){const z=-64+128*j/n,shore=-4.02+.38*z+.38*Math.sin(z*.55)+.1*Math.cos(z*.91);lp.push(shore+(64-shore)*i/n,-z,0);if(i<n&&j<n){const a=j*(n+1)+i;li.push(a,a+n+1,a+1,a+1,a+n+1,a+n+2)}}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(lp,3));g.setIndex(li);g.computeVertexNormals();lake.geometry=g;
   lake.material.vertexShader=lake.material.vertexShader.replaceAll('8.-abs','64.-abs');lake.material.needsUpdate=true;
  }else world.add(water);
  if(kind==='ocean')model.getObjectByName('transparent-ocean-section').visible=false;
  // Close the outside water section; the original internal ocean wall is hidden.
  const wp=[];for(const [ax,az,bx,bz] of [[-64,-64,64,-64],[64,-64,64,64],[64,64,-64,64],[-64,64,-64,-64]])for(let i=0;i<128;i++){
   const x=ax+(bx-ax)*i/128,z=az+(bz-az)*i/128,xx=ax+(bx-ax)*(i+1)/128,zz=az+(bz-az)*(i+1)/128;if(kind==='lakeside'&&land((x+xx)/2,(z+zz)/2)>0)continue;const top=kind==='ocean'?0:.16,bottom=kind==='ocean'?-6.3:-2.7;wp.push(x,top,z,xx,bottom,zz,x,bottom,z,x,top,z,xx,top,zz,xx,bottom,zz);
  }
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(wp,3));sg.computeVertexNormals();const section=new THREE.Mesh(sg,new THREE.MeshPhongMaterial({color:'#67a9b5',transparent:true,opacity:.35,depthWrite:false,side:THREE.FrontSide}));section.renderOrder=4;world.add(section);
  motion.push(t=>{if(kind==='ocean'){const p=wg.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,wave(p.getX(i),p.getZ(i),t));p.needsUpdate=true;wg.computeVertexNormals()}});
  for(let school=0;school<(kind==='ocean'?12:8);school++){
   const cx=kind==='ocean'?[-38,-12,18,40][school%4]:20+school%3*13,cz=-40+Math.floor(school/(kind==='ocean'?4:3))*34;
   for(let i=0;i<24;i++)movingFish.push({cx,cz,phase:school*.6,offset:(i%6-2.5)*1.1,row:(Math.floor(i/6)-1.5)*.6,color:pick(['#edc977','#a1ccd5','#dea79d']),depth:kind==='ocean'?-2-school%3*.7:-1.1});
  }
 }
 if(kind==='ocean'){
  const template=model.getObjectByName('leaping-dolphin'),pods=[];
  for(const [i,[x,z]] of [[-34,-30],[30,-32],[-36,30],[34,32],[1,39],[3,-40]].entries()){
   const dolphin=template.clone();dolphin.name='expanded-breaching-dolphin';world.add(dolphin);
   const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.045,5,36),new THREE.MeshBasicMaterial({color:'#e5faf5',transparent:true,opacity:.6,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(x+3,.15,z);ring.renderOrder=6;world.add(ring);pods.push({dolphin,ring,x,z,phase:i*2.8});
  }
  stats.dolphins=pods.length;
  motion.push(t=>{for(const pod of pods){const phase=(t+pod.phase)%18,p=dolphinPath(phase);pod.dolphin.position.set(pod.x+p.x,p.y,pod.z+p.z);pod.dolphin.rotation.set(0,-Math.atan2(p.dz,p.dx),Math.atan2(p.dy,Math.hypot(p.dx,p.dz)),'YXZ');const age=phase-4;pod.ring.visible=age>=0&&age<1.7;pod.ring.scale.setScalar(.4+Math.max(0,age)*1.4);pod.ring.material.opacity=Math.max(0,.6*(1-age/1.7))}});
 }
 // Assemble static instances after all theme-specific objects have been described.
 for(const [name,batch] of parts){const o=new THREE.InstancedMesh(geometries[batch.type],batch.glow?windowMat:material,batch.items.length);o.name=`expanded-${name}-instances`;batch.items.forEach((item,i)=>{dummy.position.set(...item.p);dummy.scale.set(...item.s);dummy.rotation.set(0,item.ry||0,0);if(item.q)dummy.quaternion.copy(item.q);dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);o.setColorAt(i,new THREE.Color(item.color))});o.castShadow=true;o.receiveShadow=true;world.add(o)}
 stats.staticInstances=[...parts.values()].reduce((n,b)=>n+b.items.length,0);
 if(movingFish.length){
  const bodies=new THREE.InstancedMesh(geometries.ico,material,movingFish.length),tailGeo=new THREE.ConeGeometry(.23,.45,3);tailGeo.rotateZ(Math.PI/2);const tails=new THREE.InstancedMesh(tailGeo,material,movingFish.length);bodies.name='expanded-fish-schools';tails.name='expanded-fish-tails';world.add(bodies,tails);movingFish.forEach((f,i)=>{bodies.setColorAt(i,new THREE.Color(f.color));tails.setColorAt(i,new THREE.Color(f.color))});stats.fish=movingFish.length;
  motion.push(t=>{movingFish.forEach((f,i)=>{const a=t*.11+f.phase,x=f.cx+Math.cos(a)*6+f.offset,z=f.cz+Math.sin(a)*4+f.row,heading=-Math.atan2(4*Math.cos(a),-6*Math.sin(a)),y=f.depth+.1*Math.sin(t+f.offset);dummy.position.set(x,y,z);dummy.rotation.set(0,heading,0);dummy.scale.set(.5,.18,.13);dummy.updateMatrix();bodies.setMatrixAt(i,dummy.matrix);dummy.position.x-=Math.cos(heading)*.55;dummy.position.z+=Math.sin(heading)*.55;dummy.rotation.y+=Math.sin(t*7+i)*.4;dummy.scale.set(1,1,.6);dummy.updateMatrix();tails.setMatrixAt(i,dummy.matrix)});bodies.instanceMatrix.needsUpdate=true;tails.instanceMatrix.needsUpdate=true});
 }
 // Rail extensions are independently animated, while the original local trains remain intact.
 if(kind==='sakura'||kind==='rooftop'){
  const alongZ=kind==='rooftop',track=alongZ?-28:-62,railY=alongZ?6.3:.44,railParts=[];
  for(let i=-62;i<=62;i+=1.3)railParts.push({p:alongZ?[track,railY-.16,i]:[i,railY-.16,track],s:alongZ?[2,.14,.24]:[.24,.14,2],color:'#9c9588'});
  for(const side of [-1,1])railParts.push({p:alongZ?[track+side*.63,railY,0]:[0,railY,track+side*.63],s:alongZ?[.08,.1,128]:[128,.1,.08],color:'#a8b9ba'});
  const rail=new THREE.InstancedMesh(geometries.box,material,railParts.length);railParts.forEach((p,i)=>{dummy.position.set(...p.p);dummy.rotation.set(0,0,0);dummy.scale.set(...p.s);dummy.updateMatrix();rail.setMatrixAt(i,dummy.matrix);rail.setColorAt(i,new THREE.Color(p.color))});rail.castShadow=rail.receiveShadow=true;world.add(rail);
  if(alongZ){const deck=new THREE.Mesh(new THREE.BoxGeometry(5,.35,128),new THREE.MeshToonMaterial({color:'#c0c6b7',gradientMap:ramp}));deck.position.set(track,railY-.4,0);deck.castShadow=deck.receiveShadow=true;world.add(deck);const pillars=[];for(let z=-60;z<=60;z+=8)pillars.push(z);const piers=new THREE.InstancedMesh(geometries.box,material,pillars.length);pillars.forEach((z,i)=>{dummy.position.set(track,2.9,z);dummy.rotation.set(0,0,0);dummy.scale.set(.65,5.8,.65);dummy.updateMatrix();piers.setMatrixAt(i,dummy.matrix);piers.setColorAt(i,new THREE.Color('#b1bbb2'))});piers.castShadow=true;world.add(piers)}
  const train=new THREE.Group();train.name='expanded-local-train';world.add(train);
  for(let j=0;j<2;j++){const car=new THREE.Mesh(new THREE.BoxGeometry(6.4,1.7,1.9),new THREE.MeshToonMaterial({color:j?'#a5c0b5':'#85ad9e',gradientMap:ramp}));car.position.set(j*6.7,1.5,0);train.add(car);for(let k=0;k<5;k++){const window=new THREE.Mesh(new THREE.BoxGeometry(.75,.6,1.96),new THREE.MeshToonMaterial({color:'#7094a0',gradientMap:ramp}));window.position.set(j*6.7-2.3+k*1.15,1.65,0);train.add(window)}}
  renderer.localClippingEnabled=true;const clip=[new THREE.Plane(new THREE.Vector3(alongZ?0:1,0,alongZ?1:0),64),new THREE.Plane(new THREE.Vector3(alongZ?0:-1,0,alongZ?-1:0),64)];train.traverse(o=>{if(o.isMesh){o.material.clippingPlanes=clip;o.material.clipShadows=true}});
  train.rotation.y=alongZ?-Math.PI/2:0;motion.push(t=>{const position=-76+(t*3.7+31)%152;train.position.set(alongZ?track:position,railY+.25,alongZ?position:track);train.visible=position>-76&&position<76});stats.vehicles+=2;
 }
 if(kind==='intersection'){
  // Additional cars circulate on the outer neighborhood streets, avoiding the signalized core.
  const vehicleParts=[];for(let i=0;i<24;i++){vehicleParts.push({color:pick(['#c27d6c','#a2b9bb','#d9bf7f','#9cb9a0']),phase:i/24})}
  const bodies=new THREE.InstancedMesh(geometries.box,material,24),tops=new THREE.InstancedMesh(geometries.box,material,24);bodies.name='expanded-neighborhood-traffic';world.add(bodies,tops);vehicleParts.forEach((v,i)=>{bodies.setColorAt(i,new THREE.Color(v.color));tops.setColorAt(i,new THREE.Color('#99b5ba'))});stats.vehicles+=24;
  motion.push(t=>{vehicleParts.forEach((v,i)=>{const progress=(v.phase+t*.007)%1,s=progress*4,k=Math.floor(s),u=s-k,L=24,offset=1.3,x=k===0?-L+48*u:k===1?L:k===2?L-48*u:-L,z=k===0?-L:k===1?-L+48*u:k===2?L:L-48*u,ry=[Math.PI/2,0,-Math.PI/2,Math.PI][k];dummy.position.set(x,.65,z);dummy.rotation.set(0,ry,0);dummy.scale.set(1.4,.7,2.7);dummy.updateMatrix();bodies.setMatrixAt(i,dummy.matrix);dummy.position.y=1.2;dummy.scale.set(1.18,.5,1.45);dummy.updateMatrix();tops.setMatrixAt(i,dummy.matrix)});bodies.instanceMatrix.needsUpdate=true;tops.instanceMatrix.needsUpdate=true});
 }
 if(['rainy','summit','desert','sakura'].includes(kind)){
  const rain=kind==='rainy',snow=kind==='summit',petals=kind==='sakura',count=rain?2400:1100;
  const particles=new THREE.InstancedMesh(geometries.ico,new THREE.MeshBasicMaterial({color:rain?'#a0bacb':snow?'#f5fcff':petals?'#f1c9d5':'#f7dfac',transparent:true,opacity:rain?.35:.65,depthWrite:false}),count);particles.name='expanded-weather';world.add(particles);stats.weatherParticles=count;
  const data=Array.from({length:count},()=>({x:R(0,120),z:R(0,120),p:R(0,1),s:R(.035,.085)}));
  motion.push(t=>{data.forEach((d,i)=>{let x=(d.x+t*(rain?.7:snow?2.7:petals?1.1:2.5))%120-60,z=(d.z+t*.3)%120-60;if(!outside(x,z,2)){x+=core+3;if(x>60)x-=120}let base=land(x,z),height=rain?13:snow?5:petals?6:.7;
   if(rain)for(const roof of roofs)if(Math.abs(x-roof.x)<roof.w/2+.1&&Math.abs(z-roof.z)<roof.d/2+.1)base=Math.max(base,roof.y+.2);
   dummy.position.set(x,base+.15+((d.p-t*(rain?1.4:.12))%1+1)%1*height,z);dummy.rotation.set(0,0,petals?t*.4+i:-.22);dummy.scale.set(rain?.018:petals?.12:d.s,rain?.45:petals?.025:d.s*.65,petals?.08:d.s);dummy.updateMatrix();particles.setMatrixAt(i,dummy.matrix)});particles.instanceMatrix.needsUpdate=true});
 }
 // Fit the full new world, retain the detailed core geometry and keep orbiting outside it.
 controls.target.y=kind==='ocean'?-1:kind==='summit'?5:kind==='study'?3.6:kind==='onsen'?4:2.5;
 controls.minDistance=110;controls.maxDistance=1500;controls.maxPolarAngle=Math.min(controls.maxPolarAngle,Math.PI*.445);controls.enablePan=false;
 camera.far=2400;camera.near=.3;camera.position.copy(new THREE.Vector3(.64,.9,.86).normalize().multiplyScalar(expandedFit(camera.aspect))).add(controls.target);camera.lookAt(controls.target);camera.updateProjectionMatrix();
 for(const light of scene.children.filter(o=>o.isDirectionalLight&&o.castShadow)){light.position.normalize().multiplyScalar(220);Object.assign(light.shadow.camera,{left:-95,right:95,top:100,bottom:-95,far:440});light.shadow.camera.updateProjectionMatrix();}
 scene.traverse(o=>{if(o.isMesh&&o.material?.isShadowMaterial&&o.parent===scene){o.scale.setScalar(2)}});
 renderer.shadowMap.needsUpdate=true;
 let lastNight=null;
 function update(seconds){const night=model.userData.period==='night';if(lastNight!==night){windowMat.emissiveIntensity=night||kind==='rainy'?.6:0;lastNight=night}const t=preview||reduced?0:seconds;motion.forEach(fn=>fn(t));stats.time=t;}
 update(0);
 return {update};
}
