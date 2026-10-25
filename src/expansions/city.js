import {detailedWorld,expandedFit} from './kit.js';export {expandedFit};
export function expandWorld(options){return detailedWorld(options,{intent:'旧街区逐渐被榕树、藤蔓与积水接管，而不是整齐的新楼阵列',seed:91017,build(k){
 const {landmark,group,box,cyl,rod,line,ell,rock,sign,stair,shell,tree,plant,path,vehicle,motions,stats}=k;
 path([[-62,.2,6],[-36,.2,6],[-15,.2,5],[17,.2,5],[38,.2,8],[62,.2,17]],8,'#89958b',2);path([[7,.2,-62],[6,.2,-35],[6,.2,-12]],6,'#88988d',2);
 const library=shell(-29,-25,23,17,3,{name:'abandoned-municipal-library',color:'#bdc4af',ruined:true,roof:false});sign('青葉図書館',0,3.1,8.65,16,.9,'#84947c',library);
 for(let f=0;f<3;f++)for(let j=0;j<4;j++){box(-8+j*4,1.4+f*3.2,-4,2.5,2.1,.8,'#a4997e',library);for(let b=0;b<8;b++)box(-9+j*4+b*.25,1.6+f*3.2,-3.5,.17,1.5,.35,k.pick(['#bba994','#9eafa1','#a4b8b2']),library)}
 stair(7,.3,4,2,14,.23,.36,library,Math.PI);for(let j=0;j<5;j++){const xx=-10+j*4;box(xx,9.9,-4,3,.18,6,'#bac1a9',library,[0,0,j%2?.1:-.15]);rod([xx,9.9,-4],[xx+.4,11.2,-3.7],.025,'#a3866b',library)}
 const depot=landmark('roofless-tram-maintenance-shed',29,-28);for(const s of [-1,1])for(let j=0;j<6;j++){const z=-12+j*4.8;box(s*8,3,z,.45,6,.45,'#99a89c',depot);rod([s*8,6,z],[0,9,z],.10,'#8a9990',depot)}for(let j=0;j<6;j++){const z=-12+j*4.8;rod([-8,6,z],[8,6,z],.06,'#9da69a',depot);for(let a=-7;a<8;a+=2)rod([a,6,z],[a+1,8.5-Math.abs(a)*.27,z],.04,'#8a9990',depot)}
 for(const x of [-3,3])for(let z=-15;z<17;z+=.75){box(x,.17,z,2,.12,.18,'#a99b7e',depot);for(const s of [-1,1])box(x+s*.65,.27,z,.07,.09,.8,'#9faeaa',depot)}
 const bus=vehicle('bus',29,-26,'#a69876');bus.rotation.y=.08;const van=vehicle('van',40,24,'#9aa898');van.rotation.y=-.4;vehicle('car',-47,17,'#b1977d');
 const arcade=shell(-34,31,21,11,2,{name:'collapsed-shopping-arcade',color:'#c8bd9f',ruined:true,roof:false});for(let j=0;j<6;j++){box(-8+j*3.2,1.4,5.65,2.1,2.2,.08,'#849b89',arcade);box(-8+j*3.2,2.85,6,2.5,.14,1.1,j%2?'#a7b39a':'#c4bea4',arcade,[.15,0,0])}sign('旧商店街',0,3.8,5.7,15,.8,'#a79577',arcade);
 const crossing=landmark('broken-pedestrian-overpass',26,28);for(const x of [-10,10]){box(x,2.8,0,1,5.6,1.5,'#acb5a6',crossing);box(x,5.7,0,7,.4,4.2,'#bdc5b1',crossing);for(let j=0;j<6;j++)rod([x-3+j,5.9,-2],[x-3+j,6.8,-2],.04,'#82988e',crossing)}stair(-13,0,6,3,20,.28,.4,crossing,Math.PI);
 const basin=landmark('rain-filled-overgrown-court',30,38);box(0,.18,0,21,.2,14,'#8aa9a0',basin);for(const s of [-1,1])box(s*10.5,.45,0,.3,.8,14,'#a6b39d',basin);box(0,.85,-6,20,.18,.15,'#a4b5a0',basin);for(let j=0;j<14;j++)cyl(-10+j*1.5,.48,-6,.025,.9,'#82978a',basin);
 for(const [x,z,s] of [[-29,-24,1.4],[26,-28,1.15],[-38,34,1.2],[40,38,1.15],[-47,-41,1.3],[-51,42,1.1],[42,-45,1.2],[49,7,.9],[-19,51,1],[13,50,1.3]])tree('oak',x,z,s);
 for(const [cx,cz,w,d,h] of [[-29,-25,23,17,10],[-34,31,21,11,7],[29,-28,16,27,6]]){
  for(let j=0;j<24;j++){const x=cx+k.R(-w/2,w/2),z=cz+(j%2?-d/2:d/2),yy=k.R(1,h);line([[x,yy,z],[x+.25,yy-1,z+.1],[x+.1,Math.max(.3,yy-2),z+.18]],.018,'#7a9270');for(let l=0;l<6;l++)ell(x+Math.sin(l)*.15,yy-l*.28,z+.15,.16,.20,.08,k.pick(['#7c9e6c','#94b27b','#b1be88']))}
 }
 for(let i=0;i<130;i++){const x=k.R(-60,60),z=k.R(-58,58);if(Math.max(Math.abs(x),Math.abs(z))<11)continue;if(i%3===0)plant(['fern','grass','juniper'][Math.floor(i/3)%3],x,z,k.R(.5,1.1));rock(x,.25,z,k.R(.15,.65),k.R(.08,.3),k.R(.15,.5),k.pick(['#b3bba4','#bfc4ad','#989e86']))}
 for(let i=0;i<45;i++){const x=k.R(-58,58),z=5+k.R(-3.3,3.3);if(Math.abs(x)<10)continue;line([[x,.23,z],[x+.3,.23,z+.2],[x+.8,.23,z-.5],[x+1.1,.23,z-.4]],.018,'#6d8271');plant('grass',x+.5,z,.5)}
 const kiosk=landmark('weathered-noticeboard-and-bicycle',-13,26);box(0,1.4,0,3,.12,1.2,'#9e9d80',kiosk);for(const s of [-1,1])cyl(s*1.2,.65,0,.05,1.3,'#829486',kiosk);sign('旧街区案内',0,2.5,0,3.5,1,'#88977b',kiosk);
 const groves=[[-50,-41],[-51,38],[-18,-48],[12,-45],[46,-39],[51,-5],[48,49],[9,51],[-37,49],[-54,-12]];
 for(const [cx,cz] of groves)for(let j=0;j<6;j++){const a=j*2.4,r=k.R(1,6),x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;tree(j%3?'oak':'willow',x,z,k.R(.7,1.15));for(let l=0;l<3;l++){const xx=x+k.R(-3,3),zz=z+k.R(-3,3);rock(xx,.20,zz,k.R(1.5,3.2),.08,k.R(1.2,2.7),k.pick(['#91a77c','#a2b58b','#7f9b70']));plant(l%2?'fern':'grass',xx,zz,k.R(.7,1.1))}}
 const tank=landmark('rusted-water-tower',-51,-10);for(const x of [-1.7,1.7])for(const z of [-1.7,1.7])rod([x,0,z],[x,8,z],.12,'#8a9280',tank);for(const z of [-1.7,1.7]){rod([-1.7,1,z],[1.7,5,z],.07,'#8d937f',tank);rod([1.7,1,z],[-1.7,5,z],.07,'#8d937f',tank)}cyl(0,8,0,2.4,2.5,'#a59b7f',tank);for(let j=0;j<8;j++)box(-2.4+j*.6,8,2.3,.18,2.3,.03,'#969e85',tank);line([[2.1,0,0],[2.1,8,0],[1.2,8,0]],.07,'#8d9c87',tank);
 for(let j=0;j<28;j++){const x=-38+k.R(-7,7),z=-25+k.R(-8,8);rock(x,.35,z,k.R(.25,1),k.R(.1,.45),k.R(.2,.8),'#bac3af');rod([x,.3,z],[x+.4,k.R(.6,1.3),z+.2],.018,'#ac9375')}
 stats.landmarks.push('exposed-rebar-and-rubble','ivy-covered-facades','pioneer-vegetation');k.weather('dust',100);
 }});}
