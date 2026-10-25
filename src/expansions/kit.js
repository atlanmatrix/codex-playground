import * as THREE from 'three';
import {expandWorld as baseWorld,expandedFit} from '../world-expansion.js';
export {expandedFit};
export function detailedWorld(options,design){
 const {kind,model,scene,renderer,preview,reduced}=options;
 const core=kind==='city'||kind==='courtyard'||kind==='lakeside'?8:['sakura','rooftop','rainy'].includes(kind)?9:16;
 const native=options.nativeHeight||(()=>kind==='ocean'?-6:kind==='lakeside'?.07:.12);
 const height=design.height?((x,z)=>{const d=Math.max(Math.abs(x),Math.abs(z))-core;if(d<=0)return native(x,z);const e=native(THREE.MathUtils.clamp(x,-core,core),THREE.MathUtils.clamp(z,-core,core));return THREE.MathUtils.lerp(e,design.height(x,z),THREE.MathUtils.smoothstep(d,0,design.blend||9))}):undefined;
 const base=baseWorld({...options,detail:true,designHeight:height,designColor:design.color,designBottom:design.bottom});
 const world=model.getObjectByName(`expanded-${kind}-world`),stats=world.userData;stats.detailVersion=2;stats.intent=design.intent;stats.landmarks=[];stats.vehicleTypes=[];
 const land=stats.height,parts=new Map(),motions=[],roots=[],meshes=[],dummy=new THREE.Object3D();let seed=design.seed||52819;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296},R=(a,b)=>a+random()*(b-a),pick=a=>a[Math.floor(random()*a.length)];
 const ramp=new THREE.DataTexture(new Uint8Array([90,142,194,235,255]),5,1,THREE.RedFormat);ramp.needsUpdate=true;ramp.minFilter=ramp.magFilter=THREE.NearestFilter;
 const mat=new THREE.MeshToonMaterial({color:'#ffffff',gradientMap:ramp}),glow=new THREE.MeshToonMaterial({color:'#ffffff',gradientMap:ramp,emissive:'#ffca83',emissiveIntensity:0});
 const geo={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.SphereGeometry(1,12,8),ico:new THREE.IcosahedronGeometry(1,1),cyl:new THREE.CylinderGeometry(1,1,1,10),cone:new THREE.ConeGeometry(1,1,9)};
 function group(name,x=0,y=0,z=0,ry=0,dynamic=false,parent=world){const g=new THREE.Group();g.name=name;g.position.set(x,y,z);g.rotation.y=ry;g.userData.dynamic=dynamic;parent.add(g);roots.push(g);return g}
 function landmark(name,x,z){stats.landmarks.push(name);return group(name,x,land(x,z),z)}
 function put(type,x,y,z,sx,sy,sz,color,parent=null,rotation=null,lit=false){const dyn=!!parent?.userData.dynamic,key=type+(lit?'lit':'')+(dyn?'dynamic':'');if(!parts.has(key))parts.set(key,{type,lit,dyn,items:[]});parts.get(key).items.push({x,y,z,sx,sy,sz,color,parent,rotation})}
 const box=(x,y,z,w,h,d,c,parent=null,rotation=null,lit=false)=>put('box',x,y,z,w,h,d,c,parent,rotation,lit);
 const ell=(x,y,z,w,h,d,c,parent=null)=>put('sphere',x,y,z,w,h,d,c,parent);
 const rock=(x,y,z,w,h,d,c,parent=null)=>put('ico',x,y,z,w,h,d,c,parent,[0,R(0,6.28),R(-.2,.2)]);
 const cyl=(x,y,z,r,h,c,parent=null,rotation=null)=>put('cyl',x,y,z,r,h,r,c,parent,rotation);
 function rod(a,b,r,c,parent=null){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),v=to.clone().sub(from),p=from.add(to).multiplyScalar(.5),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());put('cyl',p.x,p.y,p.z,r,to.distanceTo(new THREE.Vector3(...a)),r,c,parent,q)}
 function line(points,r,c,parent=null){for(let i=0;i<points.length-1;i++)rod(points[i],points[i+1],r,c,parent)}
 function mesh(geometry,color,parent=world,extra={}){const material=new THREE.MeshToonMaterial({color,gradientMap:ramp,...extra}),o=new THREE.Mesh(geometry,material);o.castShadow=o.receiveShadow=true;parent.add(o);meshes.push(o);return o}
 function sign(text,x,y,z,w,h,c='#527c76',parent=world,ry=0){const canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;const ctx=canvas.getContext('2d');ctx.fillStyle=c;ctx.fillRect(0,0,768,192);ctx.fillStyle='#f3ebd5';ctx.font='600 95px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,100,730);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const o=mesh(new THREE.BoxGeometry(w,h,.08),'#ffffff',parent,{map:texture});o.position.set(x,y,z);o.rotation.y=ry;return o}
 function roof(w,d,h,y,parent,color='#718780'){
  for(const side of [-1,1]){const angle=side*Math.atan2(h,w/2),length=Math.hypot(w/2,h);box(side*w/4,y+h/2,0,length,.18,d+.7,color,parent,[0,0,-angle]);
   for(let j=0;j<Math.ceil(d/.55);j++)for(let i=0;i<Math.ceil(w/1.2);i++){const xx=side*(i+.5)*w/2/Math.ceil(w/1.2),yy=y+h*(1-Math.abs(xx)/(w/2));box(xx,yy+.1,-d/2+j*.55,.5,.08,.51,j%3?'#81928b':color,parent,[0,0,-angle]);}
  }
  cyl(0,y+h+.12,0,.14,d+.9,'#677e78',parent,[Math.PI/2,0,0]);
 }
 function stair(x,y,z,width,steps,rise,run,parent=world,ry=0){const g=group('stair-flight',x,y,z,ry,false,parent);for(let i=0;i<steps;i++)box(0,(i+.5)*rise,i*run,width,(i+1)*rise,run,'#a9b1a5',g);for(const s of [-1,1]){line([[s*width/2,.8,-.2],[s*width/2,steps*rise+.8,(steps-1)*run]],.035,'#7c9190',g);for(let i=0;i<steps;i+=2)cyl(s*width/2,i*rise+.4,i*run,.035,.8,'#7c9190',g)}return g}
 function bench(x,z,ry=0,parent=world){const g=group('slatted-bench',x, parent===world?land(x,z):0,z,ry,false,parent);for(let i=0;i<5;i++)box(0,.68,-.4+i*.2,3.1,.1,.16,i%2?'#b49a73':'#c2aa83',g);for(let i=0;i<3;i++)box(0,1+i*.18,-.5,3.1,.14,.08,'#b49a73',g);for(const s of [-1,1]){box(s*1.1,.34,0,.13,.68,.9,'#637b7b',g);rod([s*1.45,.6,.38],[s*1.45,.95,-.42],.045,'#637b7b',g)}return g}
 function tree(style,x,z,s=1){const y=land(x,z),g=group(style+'-tree',x,y,z,R(-.3,.3));stats.trees++;const trunk=style==='palm'?'#a29572':'#8c7d60';
  line([[0,0,0],[.1*s,2*s,.05],[.2*s,4*s,0],[.5*s,5.4*s,.1]],.16*s,trunk,g);
  if(style==='palm'){for(let j=0;j<9;j++){const a=j*6.28/9,pts=[];for(let k=0;k<7;k++){const t=k/6;pts.push([Math.cos(a)*t*4*s,5.4*s+Math.sin(t*Math.PI)*1.0*s-t*.7*s,Math.sin(a)*t*4*s])}line(pts,.035*s,'#9caa77',g);for(let k=1;k<7;k++)for(const side of [-1,1])ell(pts[k][0]+Math.cos(a+side*1.1)*.3*s,pts[k][1]-.08*s,pts[k][2]+Math.sin(a+side*1.1)*.3*s,.6*s,.07*s,.18*s,'#6a9870',g)}return g}
  for(let j=0;j<7;j++){const a=j*2.4,h=(2.8+(j%3)*.7)*s,end=[Math.cos(a)*1.9*s,h+1.5*s,Math.sin(a)*1.9*s];rod([.12*s,h-1.3*s,0],end,.065*s,trunk,g);
   if(style==='pine'||style==='cedar'){for(let k=0;k<5;k++){const f=k/5;rock(end[0]*f,end[1]+.2-f*.6,end[2]*f,(1-f*.5)*s,.35*s,.7*s,j%2?'#527c69':'#6b9477',g)}}
   else{const colors=style==='cherry'?['#efbdcb','#e2a9bf','#f1d0d6']:['#729d72','#8db181','#a4c48a'];rock(...end,1.2*s,.95*s,1.1*s,pick(colors),g);
    if(style==='willow')for(let k=0;k<7;k++){const aa=a+k*.45,xx=end[0]+Math.cos(aa)*.85*s,zz=end[2]+Math.sin(aa)*.85*s;line([[xx,end[1],zz],[xx+.3*s,end[1]-1.1*s,zz+.1],[xx+.4*s,end[1]-2.5*s,zz+.15]],.015*s,'#82946b',g);for(let l=0;l<9;l++)ell(xx+.04*l*s,end[1]-l*.27*s,zz+.08*s,.11*s,.22*s,.07*s,pick(colors),g)}
   }
  }return g;
 }
 function plant(type,x,z,s=1){const root=group(type+'-root',x,land(x,z),z),g=group(type+'-foliage',0,0,0,0,true,root);stats.shrubs++;stats.plantTypes??=[];if(!stats.plantTypes.includes(type))stats.plantTypes.push(type);
  if(type==='agave'||type==='fern'||type==='grass'){for(let j=0;j<12;j++){const a=j*2.4,r=s*(type==='grass'?.35:.8);line([[0,0,0],[Math.cos(a)*r*.45,s*.6,Math.sin(a)*r*.45],[Math.cos(a)*r,s*(type==='fern'?.65:.2),Math.sin(a)*r]],.028*s,type==='grass'?'#b4aa7f':'#739c80',g);if(type==='fern')for(let k=1;k<6;k++)ell(Math.cos(a)*r*k/6,s*.6,Math.sin(a)*r*k/6,.2*s,.05*s,.1*s,'#91b18b',g)}}
  else for(let j=0;j<9;j++){const a=j*2.4,h=(type==='willow-bush'?1.3:.6)*s,end=[Math.cos(a)*.6*s,h*R(.6,1.2),Math.sin(a)*.6*s];rod([0,0,0],end,.022*s,'#8c826f',g);if(type!=='dry-willow')rock(...end,.36*s,.18*s,.3*s,type==='juniper'?'#6c8d7b':type==='rhododendron'?'#9ba7a1':'#9daf83',g);if(type==='rhododendron'&&j%3===0)ell(end[0],end[1]+.12*s,end[2],.10*s,.06*s,.1*s,'#d2a9ba',g)}
  motions.push(t=>{g.rotation.z=Math.sin(t*.9+x*.2)*.045;g.rotation.x=Math.sin(t*.7+z)*.022});return root;
 }
 function shell(x,z,w,d,levels,options={}){const y=land(x,z),g=landmark(options.name||'architectural-block',x,z);stats.buildings++;const c=options.color||'#d3d0b8',height=levels*3.2;
  box(0,-.4,0,w+.5,.8,d+.5,'#a4aaa0',g);for(let f=0;f<=levels;f++){if(options.ruined&&f===levels){box(-w*.3,.25+f*3.2,0,w*.4,.22,d,'#bbc4b2',g);box(w*.2,.25+f*3.2,-d*.35,w*.6,.22,d*.3,'#bbc4b2',g)}else box(0,.25+f*3.2,0,w+.3,.22,d+.3,'#c5c8b8',g);}
  for(const side of [-1,1]){box(side*w/2,height/2,0,.25,height,d,c,g);for(let f=0;f<levels;f++)for(let j=0;j<Math.floor(w/2.2);j++){const xx=-w/2+1.1+j*2.2,yy=1.7+f*3.2;if(!options.ruined||(f+j)%3!==1)box(xx,yy,side*d/2,1.4,1.8,.15,options.ruined?'#59766b':'#809fa7',g);for(const v of [-.75,.75])box(xx+v,yy,side*(d/2+.1),.10,2,.18,c,g);box(xx,yy+.95,side*(d/2+.12),1.6,.1,.22,c,g);if(options.balconies){box(xx,yy-.9,side*(d/2+.65),1.8,.12,1.3,'#a4afa6',g);for(let k=0;k<5;k++)box(xx-.8+k*.4,yy-.45,side*(d/2+1.2),.035,.8,.035,'#7e9690',g)}}}
  for(const side of [-1,1])for(let f=0;f<levels;f++)for(let j=0;j<Math.floor(d/2.3);j++){
   const zz=-d/2+1.2+j*2.3,yy=1.8+f*3.2;box(side*(w/2+.15),yy,zz,.08,1.7,1.25,'#8aabb1',g);for(const end of [-1,1])box(side*(w/2+.22),yy,zz+end*.68,.13,1.9,.08,'#d9d8c6',g);box(side*(w/2+.28),yy-.9,zz,.4,.12,1.5,'#a5b7af',g);
   if(j===0){box(side*(w/2+.35),yy-.25,zz+.9,.55,.65,.75,'#a6b8b0',g);for(let k=0;k<5;k++)box(side*(w/2+.64),yy-.47+k*.10,zz+.9,.025,.025,.6,'#78928c',g)}
  }
  box(0,1.3,d/2+.1,1.3,2.2,.18,'#748e88',g);box(.45,1.3,d/2+.24,.06,.12,.06,'#dfd2ad',g);
  if(options.roof!==false)roof(w+.4,d+.5,options.pitch||1.8,height+.3,g,options.roofColor||'#7b9189');
  if(options.ruined){for(let f=0;f<levels;f++)for(let i=0;i<5;i++)rock(R(-w/2,w/2),f*3.2+.4,R(-d/2,d/2),R(.2,.7),.18,R(.2,.5),'#b1baaa',g)}return g;
 }
 function vehicle(type,x,z,color='#a0b8ac',dynamic=false){const g=group(type+'-vehicle',x,.15,z,0,dynamic),bus=type==='bus',truck=type==='truck',van=type==='van',L=bus?8.8:truck?6.2:van?4.5:3.5,W=bus?2.5:truck?2.4:1.65,H=bus?2.7:van||truck?2.3:1.35;
  stats.vehicles++;if(!stats.vehicleTypes.includes(type))stats.vehicleTypes.push(type);
  box(0,.8,0,W,.6,L,color,g);box(0,H*.66,bus?0:-.2,W*.93,H*.65,bus?L*.98:truck?L*.52:van?L*.83:L*.53,color,g);
  box(0,H*.78,L*(bus?.505:truck?.29:.24),W*.83,H*.30,.06,'#7198a4',g);
  if(bus){for(let j=0;j<9;j++)for(const s of [-1,1]){box(s*W*.474,1.9,-L/2+.65+j*.91,.04,.82,.65,'#83a9af',g);box(s*W*.49,1.27,-L/2+.65+j*.91,.05,.06,.78,'#eee6cb',g)}for(const zz of [-2.8,2.8])box(W*.49,1.38,zz,.04,1.8,.75,'#526f79',g);box(0,2.85,0,1.5,.25,2,'#b8c4bc',g)}
  if(truck){box(0,1.8,-1.25,2.45,2.7,3.4,'#d9d6bf',g);for(let j=0;j<9;j++)box(-1.24,1.7,-2.8+j*.35,.04,2.3,.035,'#b6b8a5',g);box(0,.85,2.8,2.2,.14,.18,'#8e9d98',g)}
  for(const s of [-1,1]){box(s*W*.6,1.55,L*.25,.22,.25,.35,color,g);for(const zz of [-L*.32,L*.32]){cyl(s*W*.49,.42,zz,bus?.4:.30,.18,'#43585d',g,[0,0,Math.PI/2]);cyl(s*W*.55,.42,zz,bus?.20:.15,.025,'#b5c6c4',g,[0,0,Math.PI/2])}for(const end of [-1,1])box(s*W*.31,.85,end*L*.51,.28,.18,.06,end>0?'#f2e9bd':'#c87667',g,null,end>0)}
  box(0,.6,L*.515,.45,.16,.04,'#e8dfc2',g);return g;
 }
 function busStop(x,z,ry=0,label='湖岸 / 02'){const g=group('transit-shelter',x,land(x,z),z,ry);stats.landmarks.push('bus-stop');for(const sx of [-2.6,2.6])for(const zz of [-1,1])cyl(sx,1.6,zz,.045,3.2,'#7f9898',g);box(0,3.25,0,6,.18,2.9,'#a2bbb7',g);box(0,1.7,-1,5.2,2.8,.08,'#9fc3c4',g);for(let j=0;j<7;j++)box(-1+j*.35,.8,0,.30,.1,.75,'#bca67b',g);sign(label,-1.6,2.25,-.92,1.6,.9,'#648e89',g);cyl(3.2,2,0,.045,4,'#819998',g);box(3.2,3.4,0,.9,1.1,.10,'#d8dfc6',g);sign('BUS',3.2,3.5,.07,.75,.4,'#6e9b8e',g);return g}
 function path(points,width,color='#8e9b96',lanes=0){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),length=curve.getLength(),positions=[];
  for(let i=0;i<160;i++){const u=i/160,v=(i+1)/160,a=curve.getPointAt(u),b=curve.getPointAt(v),t=curve.getTangentAt(u),n=new THREE.Vector3(t.z,0,-t.x).normalize(),q=curve.getTangentAt(v),m=new THREE.Vector3(q.z,0,-q.x).normalize();a.y=Math.max(a.y,land(a.x,a.z)+.10);b.y=Math.max(b.y,land(b.x,b.z)+.10);const aa=a.clone().addScaledVector(n,-width/2),ab=a.clone().addScaledVector(n,width/2),ba=b.clone().addScaledVector(m,-width/2),bb=b.clone().addScaledVector(m,width/2);positions.push(...aa.toArray(),...ab.toArray(),...ba.toArray(),...ba.toArray(),...ab.toArray(),...bb.toArray())}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();mesh(g,color,world,{side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-4});
  if(lanes)for(let s=1;s<length-1;s+=3.4){const p=curve.getPointAt(s/length),t=curve.getTangentAt(s/length);p.y=Math.max(p.y,land(p.x,p.z)+.10);for(let lane=1;lane<lanes;lane++){const n=new THREE.Vector3(t.z,0,-t.x).normalize().multiplyScalar((lane/lanes-.5)*width);box(p.x+n.x,p.y+.025,p.z+n.z,.10,.018,1.7,'#eee4c4',null,[0,Math.atan2(t.x,t.z),0])}}
  return curve;
 }
 function follow(g,curve,t,speed=2,offset=0){const u=((t*speed/curve.getLength()+offset)%1+1)%1,p=curve.getPointAt(u),v=curve.getTangentAt(u);g.position.copy(p);g.position.y=Math.max(p.y,land(p.x,p.z)+.10)-.12;g.rotation.set(-Math.atan2(v.y,Math.hypot(v.x,v.z)),Math.atan2(v.x,v.z),0,'YXZ')}
 function rail(curve,yOffset=0){const length=curve.getLength();for(let s=0;s<length;s+=.7){const p=curve.getPointAt(s/length),v=curve.getTangentAt(s/length),a=Math.atan2(v.x,v.z);box(p.x,p.y+yOffset,p.z,2.1,.12,.18,'#9b9482',null,[0,a,0]);for(const side of [-1,1]){const n=new THREE.Vector3(v.z,0,-v.x).normalize().multiplyScalar(side*.65);box(p.x+n.x,p.y+yOffset+.12,p.z+n.z,.07,.11,.72,'#b0c3c3',null,[0,a,0])}}}
 function train(x,z){const g=group('detailed-local-train',x,0,z,0,true);stats.vehicles+=2;for(let car=0;car<2;car++){const zz=-car*6.6;box(0,1.2,zz,2,1.7,6.2,'#b3c9b3',g);box(0,.85,zz,2.04,.35,6.25,'#7a9c8b',g);box(0,2.1,zz,2.03,.16,6.3,'#c5cec2',g);for(let j=0;j<6;j++)for(const s of [-1,1])box(s*1.01,1.65,zz-2.4+j*.9,.04,.7,.63,'#789da8',g);for(const s of [-1,1])for(const end of [-1.8,1.8])cyl(s*.7,.37,zz+end,.28,.16,'#455d66',g,[0,0,Math.PI/2]);box(0,1.6,zz+3.12,1.7,.65,.05,'#86a9b0',g);box(0,2.32,zz,1.2,.3,1.7,'#91a49c',g)}return g}
 function weather(type,count=1200){const rain=type==='rain',snow=type==='snow',o=new THREE.InstancedMesh(geo.ico,new THREE.MeshBasicMaterial({color:rain?'#b2cad8':snow?'#f0faff':type==='petal'?'#efc4d2':'#efd39c',transparent:true,opacity:rain?.4:.65,depthWrite:false}),count);o.name='detailed-weather';world.add(o);const data=Array.from({length:count},()=>({x:R(0,122),z:R(0,122),p:R(0,1),s:R(.025,.07)}));motions.push(t=>{for(let i=0;i<count;i++){const d=data[i],x=(d.x+t*(rain?.4:2))%122-61,z=(d.z+t*.35)%122-61,y=land(x,z)+.2+((d.p-t*(rain?1.5:.1))%1+1)%1*(rain?17:snow?8:3);dummy.position.set(x,y,z);dummy.rotation.set(0,0,-.2);dummy.scale.set(rain?.018:d.s,rain?.5:d.s*.5,d.s);dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix)}o.instanceMatrix.needsUpdate=true});stats.weatherParticles=count;return o}
 const api={...options,world,stats,land,core,R,random,pick,group,landmark,box,ell,rock,cyl,rod,line,mesh,sign,roof,stair,bench,tree,plant,shell,vehicle,busStop,path,follow,rail,train,weather,motions,THREE};
 design.build(api);
 // Bake every static primitive once; animated parts retain their detailed shapes.
 for(const [key,b] of parts){const o=new THREE.InstancedMesh(geo[b.type],b.lit?glow:mat,b.items.length);o.name='detailed-'+key;world.add(o);for(let i=0;i<b.items.length;i++)o.setColorAt(i,new THREE.Color(b.items[i].color));b.mesh=o;}
 function bake(b,i,item){dummy.position.set(item.x,item.y,item.z);dummy.scale.set(item.sx,item.sy,item.sz);dummy.rotation.set(0,0,0);if(item.parent?.visible===false)dummy.scale.setScalar(0);if(item.rotation?.isQuaternion)dummy.quaternion.copy(item.rotation);else if(item.rotation)dummy.rotation.set(...item.rotation);dummy.updateMatrix();if(item.parent){item.parent.updateWorldMatrix(true,false);dummy.matrix.premultiply(item.parent.matrixWorld)}b.mesh.setMatrixAt(i,dummy.matrix)}
 for(const b of parts.values()){b.items.forEach((item,i)=>bake(b,i,item));b.mesh.castShadow=b.mesh.receiveShadow=true;b.mesh.computeBoundingSphere()}
 stats.staticInstances=[...parts.values()].reduce((n,b)=>n+b.items.length,0);let previousNight=null;
 function update(seconds){base.update(seconds);const t=preview||reduced?0:seconds;motions.forEach(fn=>fn(t));for(const b of parts.values())if(b.dyn){b.items.forEach((item,i)=>bake(b,i,item));b.mesh.instanceMatrix.needsUpdate=true;b.mesh.computeBoundingSphere()}const night=kind==='rainy'||model.userData.period==='night';if(previousNight!==night){glow.emissiveIntensity=night?.8:.08;previousNight=night}stats.time=t}
 update(0);renderer.shadowMap.needsUpdate=true;return {update};
}
