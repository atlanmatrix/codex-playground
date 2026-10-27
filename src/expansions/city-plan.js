import {inComponentBounds,inLakePark,lakeDistrictHeight} from '../components/city-fusion-plan.js';
// Deliberately irregular parcels. Coordinates retain the 16-unit original core.
// Buildings are counted as structures, rather than individual shop tenancies.
export const CITY_PARCELS = [
 [0,'library','civic',-46,-27,23,17,3,'青葉図書館'],
 [1,'home','civic',-46,10,11,8,2,'若葉荘'],
 [5,'home','civic',-3,-37,9,12,3,'青葉アパート'],
 [7,'clinic','civic',-2,-56,10,9,2,'北町診療所'],
 [3,'home','civic',11,-55,9,9,2,'北町住宅'],
 [4,'home','civic',11,-21,9,9,2,'木漏れ日荘'],
 [20,'mixed','market',12,10,10,9,2,'古書と珈琲'],
 [23,'bath','market',9,45,12,9,1,'青葉湯',Math.PI],
 [26,'pavilion','wetland',23,45,8,7,1,'雨やどり',Math.PI],
 [28,'maintenance','wetland',36,45,9,7,1,'用具室',Math.PI],
 [24,'school','wetland',52,44,16,10,2,'旧青葉小学校',Math.PI],
 [18,'mixed','market',-35.1,58,7.2,8,2,'花と暮らし',Math.PI],
 [29,'gate','edge',-60.5,-12,5,6,1,'西町入口'],
 [30,'gate','edge',60,8,6,5,1,'東町入口']
].map(([id,type,zone,x,z,w,d,levels,label,rotation=0])=>({id:`city-parcel-${id}`,type,zone,x,z,w,d,levels,label,rotation}));

// Two continuous boulevards. Width includes protected cycling and public footways.
export const ROAD_PROFILE=Object.freeze({centerX:-20,centerZ:27,laneWidth:2.6,laneOffsets:[2,4.6],median:1.4,motorEdge:5.9,bufferEdge:6.3,cycleEdge:7.8,curbEdge:8,edge:11,motorY:.18,cycleY:.20,walkY:.36,stop:-12.7,cycleSeconds:70});
export const CITY_ROADS=[
 {id:'north-south-boulevard',type:'main',width:22,points:[[-20,-64],[-20,64]]},
 {id:'east-west-boulevard',type:'main',width:22,points:[[-64,27],[64,27]]}
];
export const CITY_PATHS=[
 {id:'library-access',points:[[-46,-17.7],[-31,-17.7]],width:2.2},
 {id:'fitness-access',points:[[-46,3],[-46,16]],width:2.2},
 {id:'station-access',points:[[-42.1,-43],[-42.1,-40],[-31,-40]],width:2.2},
 {id:'rail-street-access',points:[[-39,48.425],[-31,48.425]],width:2.2},
 {id:'banyan-access',points:[[1,8],[1,16]],width:2.2},
 {id:'park-access',points:[[22,-4],[22,16]],width:2.2}
];

export const CITY_WATERS = [
 {id:'rain-filled-overgrown-court',x:10,z:57,rx:9.6,rz:5.6,y:.105,court:true},
 {id:'reed-basin',x:35,z:57,rx:7,rz:5.5,y:-.27},
 {id:'school-rain-garden',x:54,z:57,rx:6,rz:5,y:-.22}
];

export function districtHeight(x,z){
 let h=.09;
 if(inLakePark(x,z))return lakeDistrictHeight(x,z);
 for(const w of CITY_WATERS){const r=Math.hypot((x-w.x)/w.rx,(z-w.z)/w.rz),t=Math.max(0,Math.min(1,(r-.62)/.56)),s=t*t*(3-2*t);h=Math.min(h,w.y-.36+(.45-w.y)*s);}
 return h;
}

export function insideParcel(x,z,margin=0){return inComponentBounds(x,z,margin)||inLakePark(x,z)||CITY_PARCELS.some(p=>Math.abs(x-p.x)<p.w/2+margin&&Math.abs(z-p.z)<p.d/2+margin);}
export function segmentDistance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);}
export function onRoad(x,z,margin=0){return [...CITY_ROADS,...CITY_PATHS].some(r=>r.points.slice(1).some((b,i)=>segmentDistance(x,z,r.points[i],b)<r.width/2+margin));}
