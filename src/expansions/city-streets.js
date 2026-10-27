import {CITY_ROADS,ROAD_PROFILE as P,onRoad,insideParcel} from './city-plan.js';
import {buildRoadSurface,buildAccessPaths} from './city-roads.js';

export function buildCityStreets(k,D){
 const {box,cyl,rod,line,sign,group,land,stats}=k;
 buildRoadSurface(k);buildAccessPaths(k);
 stats.roadTypes=['divided-four-lane','protected-cycle','raised-footway','pedestrian-access'];
 stats.roadLinks=CITY_ROADS.map(r=>({id:r.id,type:r.type,length:128,width:22}));stats.drainage=[];
 const metal='#648476',cream='#d2cfad';
 // Furniture occupies the outside edge of the footway; cycling stays unobstructed.
 for(let axis=0;axis<2;axis++)for(const side of [-1,1])for(let along=-57;along<60;along+=13){
  if(Math.abs(along)<20)continue;
  const x=axis?P.centerX+along:P.centerX+10.5*side,z=axis?P.centerZ+10.5*side:P.centerZ+along;
  if(Math.max(Math.abs(x),Math.abs(z))>62)continue;
  const g=group('city-weathered-streetlamp',x,.36,z,axis?Math.PI/2:0);cyl(0,2.4,0,.055,4.8,metal,g);rod([0,4.7,0],[-side*.9,4.9,0],.05,metal,g);box(-side*.9,4.9,0,.55,.12,.28,cream,g);D.count('streetlights');
  box(axis?x:x-side*2.6,.335,axis?z-side*2.6:z,axis?.6:.14,.05,axis?.14:.6,metal);D.count('drains');
 }
 // Low planted islands occupy only the central median, well before the stop lines.
 for(let axis=0;axis<2;axis++)for(let along=-61;along<64;along+=4){
  if(Math.abs(along)<14)continue;
  const x=axis?P.centerX+along:P.centerX,z=axis?P.centerZ:P.centerZ+along;if(Math.max(Math.abs(x),Math.abs(z))>62)continue;
  for(let j=0;j<3;j++)D.put('stone',[x+(axis?(j-1)*.7:0),.49,z+(axis?0:(j-1)*.7)],[axis?.7:.4,.18,axis?.4:.7],j%2?'#91aa71':'#7d9c65');D.count('medianPlanting');
 }
 for(const [x,z,ry,label] of [[-35,-13,Math.PI/2,'図書館前 / 08'],[47,41.3,0,'学校前 / 14']]){const g=k.busStop(x,z,ry,label);g.position.y=.36;D.count('busStops');}
 for(const [x,z,ry] of [[-32.3,-25,Math.PI/2],[-32.3,-4,Math.PI/2],[5,15,0],[30,15,0],[45,39,Math.PI]]){if(insideParcel(x,z,.2))continue;const g=k.bench(x,z,ry);g.position.y=.36;D.count('benches');}
 for(const [x,z] of [[-33,-13],[28,40]]){const g=group('city-news-kiosk',x,.36,z);box(0,.8,0,1.7,1.6,1.2,'#93ab91',g);box(0,1.75,0,2,.15,1.5,'#a3845d',g);box(0,1.1,.61,1.4,.7,.025,'#416450',g);for(let j=0;j<8;j++)box(-.5+j%4*.34,.95+Math.floor(j/4)*.33,.64,.27,.3,.02,j%2?cream:'#b69c76',g);sign('街の便り',0,1.65,.72,1.6,.3,'#748b6b',g);D.count('kiosks');}
 // Park bicycles at the public entrances, rather than placing props in live lanes.
 for(const [x,z] of [[-35,-17],[-43,6],[18,13],[-38,48],[17,40]])for(let i=0;i<2;i++){
  const g=group('city-rusted-bicycle',x+i*.8,land(x,z)+.27,z,.3);for(const xx of [-.55,.65]){D.put('ring',[xx,.38,0],[.35,.35,.35],'#48624f',g);for(let l=0;l<8;l++){const a=l/8*6.28;rod([xx,.38,0],[xx+Math.cos(a)*.32,.38+Math.sin(a)*.32,0],.005,metal,g);}}
  const pts=[[-.55,.38,0],[-.2,.85,0],[.2,.38,0],[.5,.95,0],[.65,.38,0]];for(const [a,b] of [[0,1],[0,2],[1,2],[1,3],[2,3],[3,4]])rod(pts[a],pts[b],.022,'#986b4b',g);box(-.2,.94,0,.25,.06,.15,'#86734e',g);rod([.5,.95,-.15],[.5,1.1,.15],.02,metal,g);D.count('bicycles');
 }
 for(const [x,z,ry,label] of [[-31.7,-40,Math.PI/2,'樱花小站 →'],[-8.3,-3,-Math.PI/2,'湖畔公园 →'],[24,15.3,0,'健身・旧城'],[43,38.7,Math.PI,'铁道街・湿地']]){const g=group('city-wayfinding',x,.36,z,ry);cyl(0,1.1,0,.035,2.2,metal,g);sign(label,0,2,0,2.3,.45,'#748c76',g);D.count('streetSigns');}
 stats.landmarks.push('unified-four-lane-network','protected-cycling','raised-accessible-footways');
}
