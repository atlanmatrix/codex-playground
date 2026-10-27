import * as THREE from 'three';
import {CITY_PARCELS} from './city-plan.js';

export function buildCityArchitecture(k,D,F){
 const {box,cyl,rod,line,rock,mesh,sign,group,landmark,R,pick,stats}=k;
 const slab='#c5c8ae',trim='#dedac0',rust='#986b4b',metal='#668478';
 const palettes={civic:['#a8b9a1','#c9c7aa','#90b0a4'],industry:['#9dada0','#b1b69b','#b5a68a'],market:['#c5b493','#9cb5a6','#bba488'],wetland:['#adb9a0','#bac5ad','#92afa2'],edge:['#bcc1a1']};
 stats.parcels=[];
 function window(g,x,y,z,w=1.35){
  D.count('windows');for(const dx of [-w/2,w/2])box(x+dx,y,z,.075,1.42,.12,metal,g);box(x,y+.7,z,w,.07,.12,metal,g);box(x,y-.7,z,w,.07,.13,metal,g);box(x,y-.78,z+.13,w+.2,.12,.42,trim,g);
  if(R(0,1)>.3){D.count('brokenWindows');for(let j=0;j<2;j++)D.put('shard',[x-w*.3+j*w*.45,y-.48+j*.9,z],[w*.29,.28,.04],'#99c9b7',g,[0,0,R(-.4,.4)]);}
 }
 function balcony(g,w,y,z){D.count('balconies');box(-w*.1,y,z,w*.65,.13,.75,slab,g);rod([-w*.42,y+.7,z+.36],[w*.22,y+.7,z+.36],.025,rust,g);for(let x=-w*.42;x<w*.24;x+=.4)rod([x,y,z+.36],[x,y+.7,z+.36],.018,metal,g);}
 function slabPlate(g,p,f,tree){
  const {w,d,levels}=p,y=.25+f*2.6;
  if(f===levels){box(-w*.34,y,0,w*.32,.18,d,slab,g);box(w*.16,y,-d*.34,w*.68,.18,d*.32,slab,g);D.count('slabs');return;}
  const s=new THREE.Shape(),notch=f>0?.65:0;
  s.moveTo(-w/2,-d/2);s.lineTo(w/2,-d/2);s.lineTo(w/2,d*.15);s.lineTo(w/2-notch,d*.32);s.lineTo(w*.32,d*.31);s.lineTo(w*.24,d/2);s.lineTo(-w/2,d/2);s.closePath();
  if(tree){const h=new THREE.Path();h.absarc(w*.15,0,.72,0,Math.PI*2,true);s.holes.push(h);}
  if(f>0){const h=new THREE.Path(),x=w/2-1.1,z=-d/2+.7;h.moveTo(x-.65,z);h.lineTo(x-.65,z+3.15);h.lineTo(x+.65,z+3.15);h.lineTo(x+.65,z);h.closePath();s.holes.push(h);}
  const geometry=new THREE.ExtrudeGeometry(s,{depth:.18,bevelEnabled:false,curveSegments:12});geometry.rotateX(Math.PI/2);const o=mesh(geometry,slab,g);o.position.y=y;D.count('slabs');
 }
 function commonShell(p){
  const g=landmark(p.type==='library'?'abandoned-municipal-library':p.type==='arcade'?'collapsed-shopping-arcade':p.id,p.x,p.z);g.rotation.y=p.rotation;g.userData.parcel=p;
  const c=pick(palettes[p.zone]),{w,d,levels}=p,H=levels*2.6,tree=p.type==='library'||p.id==='city-parcel-18'||p.id==='city-parcel-24';
  p.grown=tree;stats.parcels.push({...p,entrance:[p.x,p.z+Math.cos(p.rotation)*(d/2+.4)]});stats.buildings++;D.count('buildings');
  // Foundations and continuous footings ground the cutaway in its parcel.
  box(0,.02,0,w+.5,.15,d+.5,'#929f89',g);
  for(let f=0;f<=levels;f++)slabPlate(g,p,f,tree);
  const bays=Math.max(3,Math.floor(w/2.3)),bw=w/bays;
  for(let f=0;f<levels;f++){
   const y=.25+f*2.6;
   // Real apertures: masonry stops at the sill and lintel, rather than a dark
   // window rectangle being placed on an opaque wall.
   box(0,y+.4,-d/2,w,.8,.22,c,g);box(0,y+2.36,-d/2,w,.4,.22,trim,g);
   for(let j=0;j<=bays;j++)box(-w/2+j*bw,y+1.48,-d/2,.25,1.4,.25,c,g);
   for(let j=0;j<bays;j++)window(g,-w/2+(j+.5)*bw,y+1.48,-d/2+.03,bw-.42);
   // The west wall keeps its masonry rhythm; the southeast corner has fallen.
   for(let j=0;j<Math.ceil(d/2.5);j++){const zz=-d/2+(j+.5)*d/Math.ceil(d/2.5);box(-w/2,y+.4,zz,.22,.8,d/Math.ceil(d/2.5),c,g);box(-w/2,y+2.36,zz,.22,.4,d/Math.ceil(d/2.5),trim,g);box(-w/2,y+1.48,zz-d/Math.ceil(d/2.5)/2,.24,1.4,.23,c,g);for(const v of [-.5,.5])box(-w/2,y+1.48,zz+v*.95,.1,1.35,.06,metal,g);}
   box(w/2,y+.55,-d*.35,.24,1.1,d*.3,c,g);box(w/2,y+1.48,-d/2+.2,.28,2.5,.35,c,g);
   for(let j=0;j<=bays;j++){if(j>bays*.72||f===0&&Math.abs(-w/2+j*bw)<.8)continue;box(-w/2+j*bw,y+1.3,d/2,.16,2.5,.18,metal,g);}
   box(-w*.14,y+2.48,d/2,w*.73,.18,.25,trim,g);
   if(f===0){for(let j=0;j<bays*.65;j++){const xx=-w/2+(j+.5)*bw;if(Math.abs(xx)<bw/2+.65)continue;box(xx,y+.17,d/2,bw-.2,.3,.13,c,g);if(j%2===0)D.put('shard',[xx,y+.6,d/2+.02],[bw*.4,.4,.04],'#a7ccba',g,[0,0,.2]);}F.door(g,0,y,d/2);}
   if(f>0&&['home','mixed','clinic','school','arcade','library'].includes(p.type))balcony(g,w,y,d/2+.35);
   if(f<levels-1){k.stair(w/2-1.1,y,-d/2+.78,1.05,12,2.6/12,.24,g);D.count('stairs');box(w/2-1.1,y+2.6,-d/2+3.8,1.3,.14,.55,slab,g);}
   // Cracked front slab, reinforcement, fallen plaster and a small surviving rug.
   for(let j=0;j<7;j++){const xx=w*.22+j*w*.04;rod([xx,y-.05,d*.29],[xx+.12,y-.13,d*.29+R(.25,.6)],.013,rust,g);rock(xx,y+.04,d*.27,R(.08,.23),R(.04,.12),.18,trim,g);}
   for(let j=0;j<16;j++){const xx=R(-w*.4,w*.14),zz=R(-d*.3,d*.38);box(xx,y+.035,zz,R(.13,.27),.055,R(.2,.35),pick(['#a1b39a','#b79a75','#d1c39b']),g,[0,R(0,6.28),R(-.1,.1)]);D.count('fallenObjects');}
   for(let j=0;j<3;j++){const xx=R(-w*.38,w*.12),zz=d*.25-j*.4;line([[xx,y+.015,zz],[xx+.3,y+.015,zz+.2],[xx+.5,y+.015,zz-.05]],.007,'#81947a',g);}
   box(-w*.23,y+.015,d*.15,2.4,.018,1.5,f%2?'#b9856e':'#8aa18a',g);
   cyl(-w*.2,y+2.05,0,.1,.12,'#d5c8a4',g);rod([-w*.2,y+2.5,0],[-w*.2,y+2.1,0],.012,metal,g);
  }
  for(let j=0;j<Math.floor(w/.52);j++)box(-w/2+.25+j*.52,H+.45,-d/2,.45,R(.15,.35),.24,c,g,[0,0,R(-.15,.15)]);
  box(-w/2,H+.42,0,.25,.35,d,c,g);
  line([[-w/2-.13,H,-d*.35],[-w/2-.13,1,-d*.35],[-w/2-.5,.25,-d*.35]],.045,rust,g);D.count('pipes');
  for(let f=1;f<levels;f++){const y=f*2.6+1;box(-w/2-.25,y,-d*.1,.45,.6,.8,trim,g);for(let j=0;j<6;j++)box(-w/2-.49,y-.24+j*.08,-d*.1,.025,.025,.63,metal,g);D.count('airConditioners');}
  box(-w*.3,H+.65,-d*.3,.8,.7,.7,metal,g);for(let j=0;j<5;j++)box(-w*.3,H+.43+j*.1,-d*.3+.36,.6,.025,.02,'#b7c1aa',g);
  sign(p.label,-w*.14,2.4,d/2+.13,Math.min(w*.72,7),.55,p.zone==='market'?'#627f6b':'#7b927c',g);
  // Different former uses leave different rooflines and street silhouettes.
  if(['home','mixed','pavilion','gate'].includes(p.type)){
   const roofColor=pick(['#9c805b','#8a9b78','#ad9270']);
   for(let j=0;j<Math.floor(w/.52);j++)for(let q=0;q<4;q++){const x=-w/2+.3+j*.52,z=-d/2+.2+q*.48,yy=H+.36+Math.sin((x+w/2)/w*Math.PI)*.65;box(x,yy,z,.49,.09,.46,q%3?roofColor:'#b2ae85',g,[0,0,Math.cos((x+w/2)/w*Math.PI)*.12]);}
   for(let j=0;j<4;j++)rod([-w/2,H+.3,-d/2+j*.6],[w/2,H+.3,-d/2+j*.6],.04,'#897c58',g);
  }
  if(p.type==='warehouse'){
   for(let j=0;j<4;j++){const zz=-d*.4+j*d*.26;rod([-w/2,H+.2,zz],[0,H+1.7,zz],.06,metal,g);rod([0,H+1.7,zz],[w/2,H+.2,zz],.06,metal,g);rod([-w/2,H+.2,zz],[w/2,H+.2,zz],.04,rust,g);}
   for(let j=0;j<Math.floor(d/.4);j++)box(-w*.28,H+.95,-d/2+.2+j*.4,w*.46,.08,.34,'#8b9e87',g,[0,0,-.26]);
   for(const xx of [-w*.37,0,w*.37])for(const zz of [-d*.35,d*.35])box(xx,1.3,zz,.1,2.6,.1,metal,g);
  }
  if(p.type==='mixed'){
   for(let j=0;j<10;j++)box(-w*.43+j*w*.07,2.5,d/2+.55,w*.065,.12,1.2,j%2?'#b6b98b':'#7f9b79',g,[.12,0,0]);
   if(levels>1){rod([-w*.4,4.1,d/2+.65],[w*.2,4.1,d/2+.65],.013,metal,g);for(let j=0;j<4;j++)box(-w*.33+j*.8,3.8,d/2+.65,.45,.58,.035,j%2?'#c8baa0':'#92ac98',g,[0,0,j*.06]);}
  }
  if(p.type==='bath'){
   cyl(-w*.3,3.8,-d*.25,.34,7.2,'#af9877',g);cyl(-w*.3,7.45,-d*.25,.42,.16,'#7e8970',g);for(let j=0;j<24;j++)box(-w*.3+.35,1+j*.24,-d*.25,.025,.035,.42,'#8e805f',g);sign('ゆ',w*.3,3.15,d/2+.15,1.15,1.15,'#7d9a87',g);
  }
  if(p.type==='school'){
   D.put('ring',[0,H+.75,-d/2],[.55,.55,.55],metal,g);box(0,H+.75,-d/2+.03,.045,.7,.025,trim,g,[0,0,-.6]);box(.15,H+.85,-d/2+.04,.045,.45,.025,trim,g,[0,0,.8]);
  }
  for(let j=0;j<24;j++){const xx=R(-w*.45,-w*.2),zz=R(-d*.4,-d*.15);D.put('leaf',[xx,H+.38,zz],[R(.1,.2),R(.15,.3),.15],pick(['#7f9858','#9bab6c']),g,[-1.1,R(0,6.28),0]);}
  return g;
 }
 function furnish(g,p){
  const {w,d,levels,type}=p;
  for(let f=0;f<levels;f++){
   const y=.25+f*2.6;
   if(type==='library'){
    D.count('rooms',3);for(let j=0;j<6;j++)F.shelf(g,-w*.4+(j%4)*w*.21,y,-d*.36+Math.floor(j/4)*3,2.8,4,12);
    for(let j=0;j<8;j++){const xx=-8.5+(j%4)*4.8,zz=-.2+Math.floor(j/4)*4;F.table(g,xx,y,zz,2.4,1);F.chair(g,xx,y,zz+.9,Math.PI);F.chair(g,xx,y,zz-.9);}
    box(-w*.35,y+.8,-d*.02,2.4,1.6,.6,'#899d89',g);for(let j=0;j<12;j++)box(-w*.35+(j%4-.5)*.45,y+.3+Math.floor(j/4)*.45,-d*.02+.32,.35,.27,.04,'#d2c09b',g);
   }else if(type==='school'){
    D.count('rooms',2);box(-w*.13,y+1.35,-d*.45,Math.min(6,w*.65),1.3,.1,'#496b59',g);for(let j=0;j<5;j++)box(-w*.32+j*.45,y+1.3,-d*.45+.06,.25,.025,.02,trim,g);
    for(let j=0;j<8;j++){const x=-w*.33+(j%4)*w*.19,z=-d*.08+Math.floor(j/4)*1.7;F.table(g,x,y,z,.95,.6);F.chair(g,x,y,z+.62,Math.PI);}F.shelf(g,-w*.33,y,-d*.3,1.5,3,10);
   }else if(type==='clinic'){
    D.count('rooms',2);F.bed(g,-w*.3,y,-d*.12);F.bed(g,w*.05,y,-d*.12);F.table(g,-w*.25,y,d*.3);F.chair(g,-w*.25,y,d*.3+.7);F.shelf(g,-w*.25,y,-d*.4,1.8,4,7);box(w*.2,y+1.5,-d*.45,.7,.7,.05,'#e0d7b9',g);box(w*.2,y+1.5,-d*.45+.04,.12,.5,.02,'#a85f4f',g);box(w*.2,y+1.5,-d*.45+.05,.5,.12,.02,'#a85f4f',g);
   }else if(type==='home'||type==='mixed'&&f>0){
    D.count('rooms',3);F.bed(g,-w*.3,y,-d*.12);F.kitchen(g,w*.02,y,-d*.39);F.table(g,-w*.15,y,d*.27);F.chair(g,-w*.15,y,d*.27+.8,Math.PI);F.chair(g,-w*.15-.9,y,d*.27,-Math.PI/2);F.shelf(group('side-wall-bookcase',-w*.42,y,-d*.16,Math.PI/2,false,g),0,0,0,1.4,3,10);if(f===levels-1)F.bathroom(g,w*.2,y,d*.1);
    const wallX=-w*.18,doorZ=-d*.14,back=-d*.47,end=doorZ-.65;box(wallX,y+1.05,(back+end)/2,.1,2.1,end-back,'#a4b49b',g);box(wallX,y+.55,(doorZ+.65)/2,.1,1.1,-doorZ-.65,'#a4b49b',g);F.door(g,wallX,y,doorZ,Math.PI/2);
   }else if(type==='arcade'){
    for(let j=0;j<6;j++){const shop=group('arcade-tenancy',-w/2+(j+.5)*w/6,y,0,0,false,g);F.shop(shop,j%2?'cafe':'books',w/6-.2,d,0);F.door(shop,0,0,d/2);if(j>0)box(-w/12,.6,-d*.06,.1,1.2,d*.82,'#a9b59b',shop);if(f===0){box(0,2.45,d/2+.4,w/6-.15,.13,1.05,j%2?'#929f7c':'#b89d79',shop,[.12,0,0]);sign(['古書','花店','珈琲','薬局','道具','パン'][j],0,2.05,d/2+.14,w/6-.4,.32,'#70866c',shop);}}
   }else if(type==='mixed'){F.shop(g,p.label.includes('古書')?'books':'cafe',w,d,y);
   }else if(type==='workshop'||type==='maintenance'){
    D.count('rooms',2);for(let j=0;j<3;j++)F.workbench(g,-w*.3+j*w*.26,y,-d*.3);for(let j=0;j<2;j++)F.machine(g,-w*.25+j*w*.4,y,d*.17);
    for(let j=0;j<10;j++){const xx=-w*.4+(j%5)*w*.15,zz=-d*.05+Math.floor(j/5)*1;box(xx,y+.2,zz,.55,.4,.6,'#ad9c76',g);box(xx,y+.25,zz+.31,.03,.4,.02,rust,g);}
   }else if(type==='warehouse'){
    D.count('rooms',2);for(let row=0;row<3;row++)for(let j=0;j<4;j++){const x=-w*.32+j*w*.21,z=-d*.3+row*d*.27;box(x,y+.07,z,1.2,.13,1.1,'#8e805c',g);for(let n=0;n<3;n++){box(x,y+.3+n*.46,z,.95,.45,.85,n%2?'#b7a883':'#8d9c80',g);for(const dx of [-.3,.3])box(x+dx,y+.3+n*.46,z+.44,.045,.45,.02,woodColor(),g);}}
   }else if(type==='bath'){
    D.count('rooms',3);for(let j=0;j<6;j++){const x=-w*.33+(j%3)*2,z=-d*.1+Math.floor(j/3)*2;F.bathroom(g,x,y,z);}for(let j=0;j<12;j++)box(-w*.35+j*.55,y+1,-d*.45,.5,1.8,.45,j%2?'#99ab94':'#b4b9a0',g);
   }else if(type==='substation'||type==='pump'){
    D.count('rooms',2);for(let j=0;j<4;j++){box(-w*.3+j*1.6,y+1,-d*.25,1.2,2,.65,'#81998b',g);for(let a=0;a<4;a++)box(-w*.3+j*1.6,y+.4+a*.4,-d*.25+.34,.9,.025,.02,metal,g);}if(type==='pump')for(const x of [-1.6,1.6]){cyl(x,y+.7,d*.2,.4,1.4,'#768d7d',g);line([[x,y+.6,d*.2],[x,y+.6,d*.4],[x,y-.15,d*.4]],.12,rust,g);}else for(const x of [-2,0,2]){cyl(x,y+2.4,0,.13,1,trim,g);box(x,y+1.4,0,.6,1,.6,metal,g);}
   }else{D.count('rooms');F.table(g,-w*.15,y,0,2,.8);F.chair(g,-w*.15,y,.8,Math.PI);F.shelf(g,-w*.25,y,-d*.35,1.5,3,8);}
  }
 }
 const woodColor=()=>'#897b57';
 function depot(p){
  const g=landmark('roofless-tram-maintenance-shed',p.x,p.z);g.userData.parcel=p;stats.parcels.push({...p});stats.buildings++;D.count('buildings');D.count('rooms',4);
  const floor=new THREE.Shape();floor.moveTo(-p.w/2,-p.d/2);floor.lineTo(p.w/2,-p.d/2);floor.lineTo(p.w/2,p.d/2);floor.lineTo(-p.w/2,p.d/2);floor.closePath();
  for(const x of [-3,3]){const hole=new THREE.Path();hole.moveTo(x-.6,-9);hole.lineTo(x-.6,9);hole.lineTo(x+.6,9);hole.lineTo(x+.6,-9);hole.closePath();floor.holes.push(hole);}
  const floorGeometry=new THREE.ExtrudeGeometry(floor,{depth:.15,bevelEnabled:false});floorGeometry.rotateX(Math.PI/2);const floorMesh=mesh(floorGeometry,'#9ea98f',g);floorMesh.position.y=.25;D.count('slabs');
  for(const s of [-1,1])for(let j=0;j<6;j++){const z=-12+j*4.8;box(s*8,3,z,.35,6,.35,'#8eaa96',g);rod([s*8,6,z],[0,8,z],.075,metal,g);box(s*8,1,z,.2,2,3.8,'#b9baa0',g);}
  for(let j=0;j<6;j++){const z=-12+j*4.8;rod([-8,6,z],[8,6,z],.045,metal,g);for(let a=-6;a<7;a+=2)rod([a,6,z],[a+1,7.7-Math.abs(a)*.2,z],.035,rust,g);if(j<2)for(let q=0;q<10;q++)box(-7.5+q*1.5,7.1,z,1.35,.1,3.8,'#98a796',g,[0,0,q<5?-.23:.23]);}
  for(const x of [-3,3]){D.count('inspectionPits');box(x,-.65,0,1.2,.035,18,'#405c50',g);for(let z=-13;z<14;z+=.65){if(Math.abs(z)<9){for(const s of [-1,1])box(x+s*.85,.2,z,.4,.1,.14,'#a48e65',g);}else box(x,.2,z,2,.1,.14,'#a48e65',g);for(const s of [-1,1])box(x+s*.67,.29,z,.075,.09,.68,'#96a796',g);}for(const dx of [-.61,.61])box(x+dx,-.2,0,.1,.9,18,trim,g);for(const dz of [-9,9])box(x,-.2,dz,1.2,.9,.1,trim,g);}
  for(let j=0;j<6;j++)F.workbench(g,j%2?-6:6,.25,-10+Math.floor(j/2)*9);
  F.machine(g,0,.25,-10);F.machine(g,0,.25,10);sign(p.label,0,6.1,13.6,10,.7,'#728c76',g);
  const tram=group('abandoned-tram',-3,.3,0,0,false,g);D.count('trams');stats.vehicles++;stats.vehicleTypes.push('tram');box(0,1.1,0,2.1,1.7,8.2,'#7e9c7f',tram);box(0,2,0,2.16,.15,8.4,'#c6c8aa',tram);for(const s of [-1,1])for(let j=0;j<8;j++){box(s*1.06,1.55,-3.5+j, .04,.65,.65,'#42665a',tram);box(s*1.1,.8,-3.5+j,.04,.06,.8,trim,tram);}for(const z of [-2.8,2.8])for(const s of [-1,1])cyl(s*.75,.3,z,.27,.13,'#3f5147',tram,[0,0,Math.PI/2]);for(const s of [-1,1])rod([s*.6,2.1,0],[0,2.9,1],.025,rust,tram);rod([-.7,2.9,1],[.7,2.9,1],.035,metal,tram);
 }
 for(const p of CITY_PARCELS){if(p.type==='depot')depot(p);else furnish(commonShell(p),p);}
}
