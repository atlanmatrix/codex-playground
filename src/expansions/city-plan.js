import {inComponentBounds,inLakePark,lakeDistrictHeight} from '../components/city-fusion-plan.js';
// Deliberately irregular parcels. Coordinates retain the 16-unit original core.
// Buildings are counted as structures, rather than individual shop tenancies.
export const CITY_PARCELS = [
 ['library','civic',-31,-26,23,17,3,'青葉図書館'],
 ['home','civic',-53,-29,10,10,2,'若葉荘'],
 ['home','civic',-53,-12,11,10,2,'蔦の家'],
 ['home','civic',-53,-55,12,10,3,'北町住宅'],
 ['home','civic',-32,-56,12,10,2,'木漏れ日荘'],
 ['home','civic',-3,-37,9,12,3,'青葉アパート'],
 ['home','civic',-31,-8,11,8,2,'文庫裏の家'],
 ['clinic','civic',-5,-56,10,9,2,'北町診療所'],
 ['depot','industry',28,-29,16,27,1,'青葉電車車庫'],
 ['warehouse','industry',56,-52,11,12,1,'第一倉庫'],
 ['warehouse','industry',56,-31,11,12,1,'資材庫'],
 ['warehouse','industry',29,-56,17,9,1,'部品倉庫'],
 ['workshop','industry',17,-8,12,8,2,'機械修理'],
 ['workshop','industry',37,-8,12,8,2,'青葉鉄工'],
 ['substation','industry',56,-12,10,9,1,'変電室'],
 ['arcade','market',-34,31,21,11,2,'旧商店街'],
 ['mixed','market',-55,31,10,12,3,'喫茶 こもれび'],
 ['mixed','market',-54,51,10,12,2,'青葉レコード',Math.PI],
 ['mixed','market',-37,51,10,12,3,'花と暮らし',Math.PI],
 ['mixed','market',-22,51,10,12,3,'パン工房',Math.PI],
 ['mixed','market',-34,15,12,10,2,'古書と珈琲'],
 ['workshop','market',-54,15,10,9,2,'自転車修理'],
 ['workshop','market',-4,40,10,9,2,'染物工房'],
 ['bath','market',-3,58,12,9,1,'青葉湯'],
 ['school','wetland',23,18,18,8,2,'旧青葉小学校'],
 ['school','wetland',56,30,10,14,2,'理科・音楽棟'],
 ['pavilion','wetland',13,50,8,7,1,'雨やどり'],
 ['pump','wetland',56,52,9,8,1,'排水機場'],
 ['maintenance','wetland',31,59,9,7,1,'用具室'],
 ['gate','edge',-59,-4,7,6,1,'西町入口'],
 ['gate','edge',58,8,7,5,1,'東町入口']
].map(([type,zone,x,z,w,d,levels,label,rotation=0],index)=>({id:`city-parcel-${index}`,type,zone,x,z,w,d,levels,label,rotation}))
 .filter(p=>p.zone!=='industry'&&![4,6,15,16,22,25].includes(Number(p.id.split('-').at(-1))))
 .map(p=>p.id==='city-parcel-23'?{...p,x:16,z:59,rotation:Math.PI}:p.id==='city-parcel-19'?{...p,z:52}:p.id==='city-parcel-28'?{...p,rotation:Math.PI}:p);

export const CITY_ROADS = [
 {id:'west-main',type:'main',width:7,points:[[-64,5.2],[-36,5.2],[-8,5.2]]},
 {id:'east-main',type:'main',width:7,points:[[8,5.2],[24,6.3],[40,9],[60,16],[64,17.4]]},
 {id:'north-main',type:'main',width:5,points:[[6,-64],[6,-34],[5.9,-8]]},
 {id:'west-collector',type:'collector',width:7.6,points:[[-14,-64],[-14,6],[-13,11],[-8,11.8],[-6,14]]},
 {id:'south-collector',type:'collector',width:8,points:[[-6,45],[-6,64]]},
 {id:'east-collector',type:'collector',width:4.6,points:[[47,0],[47,22],[47,43]]},
 {id:'north-street',type:'local',width:3.8,points:[[-64,-42],[-30,-42],[-14,-42]]},
 {id:'station-approach',type:'local',width:2.2,points:[[-28.1,-44],[-28.1,-42]]},
 {id:'roof-street-west',type:'local',width:3.65,points:[[-64,29],[-53,29]]},
 {id:'roof-street-east',type:'local',width:3.65,points:[[-35,29],[-22,29]]},
 {id:'cross-east',type:'collector',width:7.6,points:[[10,29],[40,29],[64,29]]},
 {id:'market-street',type:'local',width:4.6,points:[[-64,40],[-24,40],[-24,29],[-22,29]]},
 {id:'library-alley',type:'alley',width:2,points:[[-45,-42],[-45,-15],[-45,5.2]]},
 {id:'school-walk',type:'walk',width:1.8,points:[[12,12],[35,12],[43,22],[43,48],[32,51],[13,45],[12,12]]},
 {id:'library-walk',type:'walk',width:1.8,points:[[-31,-16.7],[-23,-17],[-14,-17]]},
 {id:'bath-walk',type:'walk',width:1.8,points:[[-6,54],[16,54]]},
 {id:'pump-walk',type:'walk',width:1.8,points:[[47,43],[50,47],[56,47.5]]}
];

export const CITY_WATERS = [
 {id:'rain-filled-overgrown-court',x:30,z:38,rx:10.2,rz:6.6,y:.105,court:true},
 {id:'reed-basin',x:43,z:55,rx:6.1,rz:5.7,y:-.27},
 {id:'school-rain-garden',x:55,z:42,rx:4.5,rz:3.1,y:-.22}
];

export function districtHeight(x,z){
 let h=.09;
 if(inLakePark(x,z))return lakeDistrictHeight(x,z);
 for(const w of CITY_WATERS){const r=Math.hypot((x-w.x)/w.rx,(z-w.z)/w.rz),t=Math.max(0,Math.min(1,(r-.62)/.56)),s=t*t*(3-2*t);h=Math.min(h,w.y-.36+(.45-w.y)*s);}
 return h;
}

export function insideParcel(x,z,margin=0){return inComponentBounds(x,z,margin)||inLakePark(x,z)||CITY_PARCELS.some(p=>Math.abs(x-p.x)<p.w/2+margin&&Math.abs(z-p.z)<p.d/2+margin);}
export function segmentDistance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);}
export function onRoad(x,z,margin=0){return CITY_ROADS.some(r=>r.points.slice(1).some((b,i)=>segmentDistance(x,z,r.points[i],b)<r.width/2+margin));}
