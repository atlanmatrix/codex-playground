import * as THREE from 'three';
import {CITY_PARCELS,CITY_WATERS,insideParcel,onRoad} from './city-plan.js';

export function buildCityLandscape(k,D){
 const {R,pick,box,rod,line,rock,group,land,stats}=k;
 const greens=['#416d47','#54884b','#71a157','#90b466','#abbc73'];
 const treePositions=[],waterFish=[],waterUniforms=[];
 stats.plantTypes=['banyan','camphor','willow','pioneer-birch','fern','grass','reed','ivy','flowering-vine'];
 function foliage(x,y,z,s=1,parent=null,color=pick(greens),n=36){for(let j=0;j<n;j++){const a=R(0,6.28),u=R(-1,1),r=Math.sqrt(1-u*u);D.put('leaf',[x+Math.cos(a)*r*s,y+u*s*.45,z+Math.sin(a)*r*s],[R(.22,.4)*s,R(.36,.58)*s,R(.22,.4)*s],color,parent,[R(-1.5,1.5),R(0,6.28),R(-2,2)]);}}
 function tree(x,z,s=1,style='camphor',height=null){
  const y=land(x,z),g=group('city-rooted-tree',x,y,z);g.userData.root=[x,y,z];g.userData.species=style;treePositions.push([x,z]);stats.trees++;D.count('trees');const h=height||R(4,6)*s;
  line([[0,0,0],[-.12*s,h*.3,.06],[.15*s,h*.65,-.12],[.1,h*.87,0]],.13*s,style==='pioneer-birch'?'#b4bca5':'#837954',g);
  for(let j=0;j<10;j++){
   const a=j*2.4,rr=R(.8,1.8)*s,yy=h*(.67+(j%3)*.12),x1=Math.cos(a)*rr,z1=Math.sin(a)*rr;
   rod([0,h*.45,0],[x1,yy,z1],.045*s,'#8a7d58',g);D.put('stone',[x1,yy,z1],[R(.85,1.3)*s,.55*s,R(.8,1.25)*s],pick(greens),g,[0,R(0,6.28),0]);foliage(x1,yy,z1,1.05*s,g,pick(greens),40);
   if(style==='willow')for(let l=0;l<3;l++){const xx=x1+Math.cos(a+l)*s*.6,zz=z1+Math.sin(a+l)*s*.6;line([[xx,yy,zz],[xx+.15,yy-.8*s,zz],[xx+.35,yy-1.7*s,zz]],.014,'#87945e',g);for(let q=0;q<7;q++)D.put('leaf',[xx+q*.04,yy-q*.24*s,zz],[.12*s,.28*s,.13*s],pick(greens),g,[0,R(0,6.28),.3]);}
  }
  if(style!=='banyan'&&(k.stats.inventory.rootSystems||0)<80){for(let j=0;j<4;j++){const a=j*1.57;line([[0,.6,0],[Math.cos(a)*.5,.18,Math.sin(a)*.5],[Math.cos(a)*1.1,.1,Math.sin(a)*1.1]],.06,'#8f8059',g);D.count('rootSystems');}}
  if(style==='banyan'){for(let j=0;j<8;j++){const a=j/8*6.28;line([[0,h*.3,0],[Math.cos(a)*.6,.45,Math.sin(a)*.6],[Math.cos(a)*1.6,.12,Math.sin(a)*1.6]],.09,'#96835c',g);D.count('rootSystems');}for(let j=0;j<12;j++){const a=j*2.4;line([[Math.cos(a)*1.4,h*.8,Math.sin(a)*1.4],[Math.cos(a)*1.5,h*.45,Math.sin(a)*1.5],[Math.cos(a)*1.55,.2,Math.sin(a)*1.55]],.024,'#a18b63',g);}}
  return g;
 }
 // Three secondary trees genuinely penetrate their buildings' slab apertures.
 for(const p of CITY_PARCELS.filter(p=>p.grown)){const xx=p.w*.15,c=Math.cos(p.rotation),s=Math.sin(p.rotation);tree(p.x+c*xx,p.z-s*xx,.95,'banyan',p.levels*2.6+1.4);}
 const groves=[[-59,-39],[-42,-59],[-24,-41],[-22,-22],[-60,-20],[-22,-2],[-5,-23],[14,-57],[39,-54],[40,-37],[39,-22],[58,-2],[-61,57],[-45,60],[-25,14],[-19,30],[6,31],[9,57],[35,48],[50,61],[61,60],[62,24]];
 let attempts=0;
 while(stats.trees<159&&attempts++<20000){const [cx,cz]=groves[Math.floor(R(0,groves.length))],x=cx+R(-6,6),z=cz+R(-6,6);if(Math.max(Math.abs(x),Math.abs(z))>59.8||Math.max(Math.abs(x),Math.abs(z))<11||insideParcel(x,z,1.3)||onRoad(x,z,1)||CITY_WATERS.some(w=>Math.hypot((x-w.x)/w.rx,(z-w.z)/w.rz)<1.1)||treePositions.some(p=>Math.hypot(x-p[0],z-p[1])<1.6))continue;tree(x,z,R(.7,1.08),z>43&&x>10?'willow':attempts%4?'camphor':'pioneer-birch');}
 // Wall vegetation follows real facades. Each curtain has a continuous stem,
 // individual leaves, and (on selected sunny shopfronts) small flowers.
 for(let i=0;i<220;i++){
  const p=CITY_PARCELS[i%CITY_PARCELS.length],g=k.world.getObjectByName(p.type==='library'?'abandoned-municipal-library':p.type==='arcade'?'collapsed-shopping-arcade':p.type==='depot'?'roofless-tram-maintenance-shed':p.id);if(!g)continue;
  const side=i%3,xx=side===0?-p.w/2-.08:R(-p.w*.46,p.w*.22),zz=side===0?R(-p.d*.45,p.d*.4):side===1?p.d/2+.16:-p.d/2-.16,top=p.type==='depot'?6.1:p.levels*2.6+.5,len=R(1.8,Math.max(2,top-.25));
  line([[xx,top,zz],[xx+.15,top-len*.5,zz+.04],[xx-.1,top-len,zz+.12]],.018,'#69864d',g);D.count('vines');
  for(let j=0;j<140;j++){const t=j/140,y=top-t*len,x=xx+Math.sin(t*9)*.16+R(-.26,.26);D.put('leaf',[x,y+R(-.12,.12),zz+R(-.06,.17)],[R(.15,.27),R(.2,.34),.15],pick(greens),g,[R(-.3,.3),R(0,6.28),R(-2,2)]);if(i%7===0&&j%9===0)D.put('stone',[x+.1,y,zz+.17],[.09,.06,.075],pick(['#dc9e9b','#d2b279','#edb9a4']),g);}
 }
 function tuft(x,z,s=1,type='grass',parent=null,y=land(x,z)){
  D.count('groundPlants');const n=type==='fern'?24:18;
  for(let j=0;j<n;j++){const a=j*2.4,rr=R(.05,.35)*s;D.put('leaf',[x+Math.cos(a)*rr,y+.035,z+Math.sin(a)*rr],[type==='fern'?.22*s:.08*s,R(.35,.85)*s,.16*s],pick(greens),parent,[Math.sin(a)*.65,a,Math.cos(a)*.65]);}
  D.put('stone',[x,y+.025,z],[s*.5,.045,s*.4],pick(['#718e50','#879d5c','#9aad6e']),parent);
 }
 // Pioneer plants are biased towards walls, existing groves and drainage banks.
 attempts=0;let ground=0;
 while(ground<1200&&attempts++<50000){let x,z;
  if(ground%3===0){const p=CITY_PARCELS[Math.floor(R(0,CITY_PARCELS.length))];const side=Math.floor(R(0,4));x=p.x+(side<2?(side===0?-1:1)*(p.w/2+R(.3,1.5)):R(-p.w*.5,p.w*.5));z=p.z+(side>=2?(side===2?-1:1)*(p.d/2+R(.3,1.5)):R(-p.d*.5,p.d*.5));}
  else{const p=groves[Math.floor(R(0,groves.length))];x=p[0]+R(-7,7);z=p[1]+R(-7,7);}
  if(Math.max(Math.abs(x),Math.abs(z))>62||Math.max(Math.abs(x),Math.abs(z))<9.5||insideParcel(x,z,.15)||onRoad(x,z,.25)||CITY_WATERS.some(w=>Math.hypot((x-w.x)/w.rx,(z-w.z)/w.rz)<1))continue;
  tuft(x,z,R(.45,1.15),ground%3?'grass':'fern');ground++;
 }
 // Ground stories: collapse debris sits beside the buildings that shed it.
 for(let i=0;i<160;i++){
  const p=CITY_PARCELS[i%CITY_PARCELS.length],side=i%2?-1:1,x=p.x+side*(p.w/2+.6),z=p.z+R(-p.d*.4,p.d*.4);if(onRoad(x,z,.2)||Math.abs(x)>62)continue;D.count('rubbleClusters');
  for(let j=0;j<12;j++){const xx=x+R(-.7,.7),zz=z+R(-.8,.8),yy=land(xx,zz);D.put('stone',[xx,yy+R(.08,.3),zz],[R(.12,.45),R(.06,.25),R(.1,.4)],pick(['#a9b49c','#c5c7ac','#d4cdb0']),null,[R(0,3),R(0,3),R(0,3)]);}rod([x,land(x,z)+.2,z],[x+.25,land(x,z)+.6,z+.2],.015,'#98714f');
 }
 // Leaf litter is grouped by trees and wall corners rather than spread uniformly.
 for(let i=0;i<12000;i++){const p=treePositions[i%treePositions.length],x=p[0]+R(-2.2,2.2),z=p[1]+R(-2.2,2.2);if(insideParcel(x,z)||Math.max(Math.abs(x),Math.abs(z))>63||CITY_WATERS.some(w=>Math.hypot((x-w.x)/w.rx,(z-w.z)/w.rz)<1))continue;D.put('leaf',[x,land(x,z)+.045,z],[R(.06,.11),R(.13,.22),.1],pick(['#a6ac67','#c4b779','#919b62']),null,[-Math.PI/2,R(0,6.28),R(0,6.28)]);}

 for(const w of CITY_WATERS){
  const g=group(w.id,w.x,0,w.z);stats.landmarks.push(w.id);D.count('waterBodies');
  const shape=new THREE.Shape();for(let j=0;j<64;j++){const a=j/64*6.283185,r=w.court?1:1+.06*Math.sin(a*5)+.03*Math.cos(a*9),x=Math.cos(a)*w.rx*r,z=Math.sin(a)*w.rz*r;j?shape.lineTo(x,z):shape.moveTo(x,z);}shape.closePath();
  const geometry=new THREE.ShapeGeometry(shape,32);geometry.rotateX(Math.PI/2);
  const waterMaterial=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 p;uniform float time;void main(){float a=sin(p.x*7.+p.z*9.+time*.8)*sin(p.z*6.-time*.6);float s=smoothstep(.83,.98,a);gl_FragColor=vec4(mix(vec3(.31,.56,.49),vec3(.78,.85,.63),s*.6),.72);}'});
  const water=new THREE.Mesh(geometry,waterMaterial);water.name='city-living-water';water.position.y=w.y;g.add(water);waterUniforms.push(waterMaterial.uniforms.time);
  if(w.court){box(0,-.42,0,21,.06,14,'#698a71',g);for(const x of [-8.7,8.7])box(x,-.384,0,.06,.012,11.2,'#c0c7a0',g);for(const z of [-5.6,5.6])box(0,-.383,z,17.4,.012,.06,'#c0c7a0',g);box(0,-.383,0,.06,.012,11.2,'#c0c7a0',g);for(const s of [-1,1]){for(let j=0;j<12;j++)rod([s*10.6,.1,-6.5+j*1.2],[s*10.6,1.5,-6.5+j*1.2],.022,'#73917d',g);rod([s*10.6,1.5,-6.5],[s*10.6,1.5,6.7],.025,'#73917d',g);}for(const z of [-6.8,6.8]){rod([0,0,z],[0,3.5,z],.07,'#897d5d',g);box(0,3,z,1.7,.95,.09,'#b8baa0',g);D.put('ring',[0,2.65,z-(z>0?.55:-.55)],[.3,.3,.3],'#987352',g,[Math.PI/2,0,0]);}}
  for(let j=0;j<30;j++){const a=j/30*6.28,x=w.x+Math.cos(a)*w.rx*1.02,z=w.z+Math.sin(a)*w.rz*1.02;for(let q=0;q<10;q++)D.put('leaf',[x+R(-.22,.22),Math.max(w.y,land(x,z))+.02,z+R(-.22,.22)],[.055,R(.6,1.3),.06],q%3? '#829c5d':'#b1af70',null,[R(-.25,.25),R(0,6.28),R(-.22,.22)]);D.count('reedClusters');}
  for(let j=0;j<60;j++){const a=R(0,6.28),r=R(.45,.9);D.put('stone',[w.x+Math.cos(a)*w.rx*r,w.y+.018,w.z+Math.sin(a)*w.rz*r],[R(.12,.25),.015,R(.1,.22)],pick(['#779755','#8da665','#a7b273']));D.count('lilyPads');}
  const species=w.court?'#c6af76':'#bc8660';
  for(let j=0;j<(w.court?4:5);j++){const f=group('city-wetland-fish',w.x,w.y-.075,w.z);f.userData.water=w;const body=k.mesh(new THREE.SphereGeometry(.13,8,4),species,f);body.scale.set(1.8,.35,.6);const tail=k.mesh(new THREE.ConeGeometry(.1,.16,3),species,f);tail.position.x=-.26;tail.rotation.z=Math.PI/2;tail.scale.z=.3;waterFish.push({f,w,phase:R(0,6.28),r:R(.2,.53),speed:R(.15,.3)});D.count('fish');}
 }
 const waterMotion=t=>{waterUniforms.forEach(u=>u.value=t);waterFish.forEach(({f,w,phase,r,speed})=>{const a=phase+t*speed;f.position.set(w.x+Math.cos(a)*w.rx*r,w.y-.075,w.z+Math.sin(a)*w.rz*r);f.rotation.y=-Math.atan2(Math.cos(a)*w.rz,-Math.sin(a)*w.rx);});};
 k.motions.push(waterMotion);stats.waterFish=waterFish.map(({w})=>w.id);
 return {foliage,tuft,treePositions};
}
