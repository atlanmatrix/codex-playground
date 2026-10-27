import * as THREE from 'three';
import {CITY_PARCELS,CITY_ROADS,onRoad,insideParcel,segmentDistance} from './city-plan.js';

export function buildCityStreets(k,D){
 const {box,cyl,rod,line,sign,group,landmark,land,stats,R,pick}=k;
 const metal='#648476',rust='#986b4b',cream='#d2cfad';stats.roadTypes=['main','collector','local','alley','walk'];stats.roadLinks=[];
 function ribbon(points,width,color,y=.19){
  const curve=new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,0,z))),positions=[];
  const vertex=(p,n,s)=>{const x=THREE.MathUtils.clamp(p.x+n.x*width*s,-64,64),z=THREE.MathUtils.clamp(p.z+n.z*width*s,-64,64);return[x,land(x,z)+y,z];};
  for(let i=0;i<96;i++){const a=curve.getPointAt(i/96),b=curve.getPointAt((i+1)/96),ta=curve.getTangentAt(i/96),tb=curve.getTangentAt((i+1)/96),n=new THREE.Vector3(ta.z,0,-ta.x),m=new THREE.Vector3(tb.z,0,-tb.x),aa=vertex(a,n,-.5),ab=vertex(a,n,.5),ba=vertex(b,m,-.5),bb=vertex(b,m,.5);positions.push(...aa,...ab,...ba,...ba,...ab,...bb);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();const o=k.mesh(geo,color,k.world,{side:THREE.DoubleSide});o.name='city-road-surface';return curve;
 }
 const roads=[];
 const crossingRoad=(x,z,id)=>CITY_ROADS.some(r=>r.id!==id&&r.type!=='walk'&&r.points.slice(1).some((b,i)=>segmentDistance(x,z,r.points[i],b)<r.width/2+.12));
 for(const r of CITY_ROADS){
  const curve=ribbon(r.points,r.width,r.type==='walk'?'#b6b99b':r.type==='alley'?'#9fa88c':'#7e8e7d',r.type==='walk'?.105:.11),length=curve.getLength();roads.push({...r,curve});stats.roadLinks.push({id:r.id,type:r.type,length,width:r.width});
  if(r.type==='walk')continue;
  for(let t=.7;t<length-.7;t+=1.05){const p=curve.getPointAt(t/length),v=curve.getTangentAt(t/length),n=new THREE.Vector3(v.z,0,-v.x),ry=Math.atan2(v.x,v.z);
   for(const s of [-1,1]){const x=p.x+n.x*(r.width/2+.22)*s,z=p.z+n.z*(r.width/2+.22)*s;if(Math.max(Math.abs(x),Math.abs(z))>63.6||Math.max(Math.abs(x),Math.abs(z))<8.2||insideParcel(x,z,.02)||crossingRoad(x,z,r.id))continue;
    box(x,land(x,z)+.19,z,.3,.22,.94,cream,null,[0,ry,0]);D.count('curbs');
    if(r.type!=='alley')for(let j=0;j<2;j++){const xx=p.x+n.x*(r.width/2+.66+j*.58)*s,zz=p.z+n.z*(r.width/2+.66+j*.58)*s;if(Math.max(Math.abs(xx),Math.abs(zz))<63.7&&!insideParcel(xx,zz,.05)&&!crossingRoad(xx,zz,r.id)&&Math.max(Math.abs(xx),Math.abs(zz))>8.3){box(xx,land(xx,zz)+.135,zz,.52,.06,.91,t%4<1?'#b3b9a0':'#c1c5a9',null,[0,ry,0]);D.count('paving');}}
   }
   if((r.type==='main'||r.type==='collector')&&Math.floor(t)%4===0)box(p.x,land(p.x,p.z)+.135,p.z,.09,.012,.7,'#cdcba7',null,[0,ry,0]);
  }
 }
 // Cracks follow traveled surfaces; seedlings emerge from those fractures.
 for(let j=0;j<220;j++){const r=roads[j%10],p=r.curve.getPointAt(R(.04,.96)),v=r.curve.getTangentAt(R(.04,.96)),n=new THREE.Vector3(v.z,0,-v.x),offset=R(-r.width*.34,r.width*.34),x=p.x+n.x*offset,z=p.z+n.z*offset;if(Math.max(Math.abs(x),Math.abs(z))<9)continue;const y=land(x,z)+.125;line([[x,y,z],[x+.18,y,z+.13],[x+.32,y,z-.15],[x+.55,y,z-.11]],.008,'#546f57');D.count('pavingCracks');if(j%3===0)for(let q=0;q<10;q++)D.put('leaf',[x+.18+R(-.04,.04),y,z+.13+R(-.04,.04)],[.035,R(.15,.3),.04],q%2?'#9eaf66':'#6e914f',null,[R(-.4,.4),R(0,6.28),R(-.2,.2)]);}
 for(const [x,z] of [[-12.5,5.2],[-12.5,40],[47,11.4],[6,-47]])for(let j=0;j<5;j++)box(x-1.5+j*.7,land(x,z)+.14,z-3.4,.4,.013,1.3,'#cccba6');
 // Doors connect to streets, service alleys or an existing public walk.
 for(const p of CITY_PARCELS){if(p.type==='depot')continue;const start=new THREE.Vector3(p.x,0,p.z+Math.cos(p.rotation)*(p.d/2+.45));let nearest=null,distance=Infinity;
  for(const r of roads)for(let j=0;j<=100;j++){const q=r.curve.getPointAt(j/100),d=q.distanceTo(start);if(d<distance){distance=d;nearest=q;}}
  if(distance>.7){let points=[[start.x,start.z],[nearest.x,nearest.z]];if(Math.cos(p.rotation)*(nearest.z-start.z)<-.5){const side=p.x+(nearest.x<p.x?-1:1)*(p.w/2+.9);points=[[start.x,start.z],[side,start.z],[side,nearest.z],[nearest.x,nearest.z]];}ribbon(points,1.15,'#b1b49a',.12);}
 }
 const drains=[[[9,-15],[10,-1],[11,11],[12,26],[19,32],[21,36]],[[49,-59],[49,-18],[49,20],[49,40],[52,42]],[[40,44],[43,48],[43,53]],[[22,43],[20,50],[17,58]]];stats.drainage=drains;
 for(const points of drains){const c=ribbon(points,.52,'#4e6d59',.045),L=c.getLength();for(let t=0;t<L;t+=1.1){const p=c.getPointAt(t/L),v=c.getTangentAt(t/L),n=new THREE.Vector3(v.z,0,-v.x);for(const s of [-1,1])box(p.x+n.x*.33,land(p.x,p.z)+.08,p.z+n.z*.33,.13,.12,1.05,'#9ca98d',null,[0,Math.atan2(v.x,v.z),0]);}D.count('drains');}
 for(let j=0;j<18;j++){const r=roads[j%8],p=r.curve.getPointAt(.12+(j%6)*.13);if(Math.max(Math.abs(p.x),Math.abs(p.z))<9)continue;cyl(p.x,land(p.x,p.z)+.14,p.z,.34,.035,metal);for(let a=0;a<5;a++)box(p.x-.2+a*.1,land(p.x,p.z)+.165,p.z,.035,.012,.45,'#415b4d');D.count('manholes');}
 let lamps=0;
 for(const r of roads.filter(r=>r.type==='main'||r.type==='collector'||r.type==='local'))for(let t=8;t<r.curve.getLength()-5;t+=13){const p=r.curve.getPointAt(t/r.curve.getLength()),v=r.curve.getTangentAt(t/r.curve.getLength()),n=new THREE.Vector3(v.z,0,-v.x),x=p.x+n.x*(r.width/2+1.6),z=p.z+n.z*(r.width/2+1.6);if(insideParcel(x,z,.5)||Math.max(Math.abs(x),Math.abs(z))<11||lamps>=27)continue;
  const g=group('city-weathered-streetlamp',x,land(x,z),z);cyl(0,2.4,0,.055,4.8,metal,g);line([[0,4.7,0],[0,4.95,0],[-.6,5.1,0],[-1,5.1,0]],.05,metal,g);box(-1,5.05,0,.55,.12,.28,'#abb997',g);box(-1,4.97,0,.38,.035,.22,'#dacda2',g);lamps++;D.count('streetlights');}
 let previousPole=null;
 for(let j=0;j<13;j++){const x=-60+j*8.8,z=j<7?-.5:1.5;if(insideParcel(x,z,.3)||Math.max(Math.abs(x),Math.abs(z))<10)continue;const y=land(x,z);rod([x,y,z],[x,6,z],.08,'#918260');rod([x-.55,5.6,z],[x+.55,5.6,z],.045,metal);for(const dx of [-.4,0,.4])cyl(x+dx,5.75,z,.055,.16,cream);if(previousPole&&Math.abs(x-previousPole[0])<12)for(const dz of [0,.15])line([[previousPole[0],5.75,previousPole[1]+dz],[(x+previousPole[0])/2,4.9,(z+previousPole[1])/2+dz],[x,5.75,z+dz]],.013,'#536f5a');previousPole=[x,z];D.count('utilityPoles');}
 for(const [x,z,ry,label] of [[-23,10,0,'図書館前 / 08'],[40,17,Math.PI,'学校前 / 14']]){k.busStop(x,z,ry,label);D.count('busStops');}
 for(let i=0;i<17;i++){const p=CITY_PARCELS[i%CITY_PARCELS.length],x=p.x-p.w*.25,z=p.z+p.d/2+1.25;if(onRoad(x,z,.1)||insideParcel(x,z,.2))continue;k.bench(x,z,i%3===0?Math.PI/2:0);D.count('benches');}
 for(const x of [25,31])for(let z=-63;z<-43;z+=.65){box(x,.16,z,1.9,.1,.14,'#a18d62');for(const s of [-1,1])box(x+s*.66,.24,z,.07,.09,.68,'#8b9b89');}
 const crossing=landmark('broken-pedestrian-overpass',26,28);for(const x of [-10,10]){box(x,2.8,0,.7,5.6,.9,'#a8b69e',crossing);box(x,5.7,0,6.8,.3,2.4,'#bcc5a8',crossing);for(const z of [-1.15,1.15]){rod([x-3.3,6.5,z],[x+3.3,6.5,z],.025,metal,crossing);for(let j=0;j<9;j++)rod([x-3.2+j*.8,5.8,z],[x-3.2+j*.8,6.5,z],.018,rust,crossing);}}
 k.stair(-13,0,8.8,1.8,24,5.7/24,.33,crossing,Math.PI);for(let j=0;j<7;j++)rod([-6.6+j*.25,5.65,.4],[-6.2+j*.25,5.4,1],.015,rust,crossing);
 const tank=landmark('rusted-water-tower',-49,-2);for(const x of [-1.2,1.2])for(const z of [-1.2,1.2])rod([x,0,z],[x,6,z],.08,metal,tank);for(const z of [-1.2,1.2]){rod([-1.2,1,z],[1.2,5,z],.04,rust,tank);rod([1.2,1,z],[-1.2,5,z],.04,rust,tank);}cyl(0,6.5,0,1.7,2,'#a2a17f',tank);line([[1.5,0,0],[1.5,6.7,0],[0,6.7,0]],.07,rust,tank);for(let j=0;j<16;j++)rod([1.8,j*.38,0],[1.8,j*.38,.5],.02,metal,tank);
 const vehicles=[['bus',-23,16,Math.PI/2],['van',42,23,.1],['car',-47,10,Math.PI/2],['car',-20,-36,0],['car',-59,44,Math.PI/2],['car',-43,44,Math.PI/2],['car',-18,59,0],['car',50,20,.2],['van',39,-38,0],['truck',40,-53,.05]];
 for(const [type,x,z,a] of vehicles){const g=k.vehicle(type,x,z,pick(['#8da88e','#b79e77','#8daca2','#b98e73']));g.position.y=land(x,z)+.05;g.rotation.y=a;for(let j=0;j<5;j++)box(.85,.6,-1+j*.45,.025,.09,.16,rust,g);D.count('roadVehicles');}
 for(let j=0;j<13;j++){const p=CITY_PARCELS[(j*2)%CITY_PARCELS.length],x=p.x-p.w/2-1,z=p.z+p.d*.2;if(onRoad(x,z,.3))continue;const g=group('city-rusted-bicycle',x,land(x,z),z,R(-.4,.4));for(const xx of [-.55,.65]){D.put('ring',[xx,.38,0],[.35,.35,.35],'#48624f',g);for(let l=0;l<10;l++){const a=l/10*6.28;rod([xx,.38,0],[xx+Math.cos(a)*.32,.38+Math.sin(a)*.32,0],.005,metal,g);}}const pts=[[-.55,.38,0],[-.2,.85,0],[.2,.38,0],[.5,.95,0],[.65,.38,0]];for(const [a,b] of [[0,1],[0,2],[1,2],[1,3],[2,3],[3,4]])rod(pts[a],pts[b],.022,rust,g);box(-.2,.94,0,.25,.06,.15,'#86734e',g);rod([.5,.95,0],[.46,1.1,0],.02,metal,g);rod([.46,1.1,-.15],[.46,1.1,.15],.02,metal,g);D.count('bicycles');}
 for(let j=0;j<5;j++){const p=CITY_PARCELS[[0,7,15,20,24][j]],g=group('city-abandoned-vending-machine',p.x+p.w*.25,land(p.x,p.z),p.z+p.d/2+.5);box(0,1,0,1,2,.65,j%2?'#9eaa83':'#ae7957',g);box(-.12,1.2,.34,.7,1.2,.02,'#3c5c4e',g);for(let row=0;row<3;row++){box(-.12,.78+row*.36,.39,.73,.04,.15,cream,g);for(let b=0;b<4;b++)cyl(-.38+b*.18,.91+row*.36,.4,.055,.2,pick(['#bbaf71','#a3b9a2','#d5c7a1']),g);}box(.37,1.2,.35,.12,.22,.04,metal,g);box(0,.35,.35,.6,.18,.04,'#3c5c4e',g);D.count('vendingMachines');}
 for(const [x,z] of [[-27,39],[39,15]]){const g=group('city-news-kiosk',x,land(x,z),z);box(0,.8,0,1.7,1.6,1.2,'#93ab91',g);box(0,1.75,0,2,.15,1.5,'#a3845d',g);box(0,1.1,.61,1.4,.7,.025,'#416450',g);for(let j=0;j<8;j++)box(-.5+(j%4)*.34,.95+Math.floor(j/4)*.33,.64,.27,.3,.02,j%2?cream:'#b69c76',g);sign('街の便り',0,1.65,.72,1.6,.3,'#748b6b',g);D.count('kiosks');}
 for(let j=0;j<30;j++){const p=CITY_PARCELS[j%31],x=p.x+p.w/2+.7,z=p.z+p.d/2+.5;if(onRoad(x,z,.2))continue;cyl(x,1,z,.027,2,metal);sign(j%2?'青葉町':'旧道',x,1.8,z,.85,.35,'#8a9677');D.count('streetSigns');if(j%3===0){box(x,.4,z+.6,.6,.8,.55,'#839678');box(x,.83,z+.6,.66,.08,.62,'#a1ae8b');D.count('bins');}}
 for(const x of [-63,63])for(let z=-61;z<63;z+=2){if(onRoad(x,z,1.2))continue;box(x,.48,z,.25,.8,1.8,'#a5b294');for(let j=0;j<4;j++)box(x+.14,.32+j*.17,z,.015,.025,1.75,'#809775');}
 stats.landmarks.push('connected-street-hierarchy','furnished-cutaway-blocks','connected-southeast-drainage');
 return {roads};
}
