import {detailedWorld,expandedFit} from './kit.js';export {expandedFit};
export function expandWorld(options){return detailedWorld(options,{intent:'铁路真正架在商铺屋顶上，窄街、屋顶设备与生活细节交叠',seed:88172,build(k){
 const {THREE,landmark,group,box,cyl,rod,line,ell,sign,stair,shell,roof,bench,tree,plant,path,vehicle,stats}=k;
 for(const [lo,hi] of [[-64,-9],[9,64]]){box(-5.05,3.30,(lo+hi)/2,7.1,.28,hi-lo,'#c4c9ba');for(let z=lo+.5;z<hi;z+=.75){box(-5.05,3.63,z,1.8,.12,.19,'#a99d86');for(const x of [-5.63,-4.47])box(x,3.74,z,.075,.10,.80,'#b1c2c0')}for(let z=lo+3;z<hi;z+=7)for(const x of [-8,-2])box(x,1.65,z,.27,3.3,.27,'#abb8ad');path([[.575,.19,lo],[.575,.19,hi]],3.65,'#7d8b8e',2)}stats.landmarks.push('continuous-shop-supported-rooftop-railway');
 const shops=[[-52,'喫茶 / COFFEE','#8ca99b'],[-39,'レコード / RECORDS','#a99d8b'],[-25,'花屋 / FLOWERS','#b8959b'],[24,'自転車 / CYCLE','#8ea7ae'],[39,'らーめん','#b99e79'],[54,'パン / BAKERY','#bda58a']];
 for(const [i,[z,title,color]] of shops.entries()){
  const g=landmark('individually-furnished-rooftop-shop',-5.05,z);g.rotation.y=Math.PI/2;box(0,.15,0,9,.3,6.7,'#bfc4b2',g);box(0,1.55,-3.2,9,2.8,.2,'#d4d0b8',g);for(const s of [-1,1])box(s*4.4,1.55,0,.2,2.8,6.7,'#d0ceb8',g);for(const x of [-4.2,0,4.2])box(x,1.6,3.25,.08,2.8,.12,'#8b9e90',g);sign(title,0,2.75,3.4,8,.55,color,g);for(let j=0;j<12;j++)box(-4.2+j*.7,2.3,3.8,.66,.06,1.3,j%2?'#e6dfc4':color,g,[.12,0,0]);
  box(0,.9,.4,5,.14,1.1,'#b09b76',g);for(const x of [-2,2])box(x,.45,.4,.12,.9,.8,'#84968c',g);
  if(i===0||i===4||i===5)for(let j=0;j<6;j++){ell(-2.1+j*.82,1.05,.4,.24,.07,.24,'#eee5c9',g);cyl(-2.1+j*.82,1.15,.4,.09,.17,i===5?'#be9c72':'#c8b693',g)}
  if(i===1)for(let row=0;row<3;row++){box(0,.7+row*.65,-2.6,7,.10,.5,'#a28c6f',g);for(let j=0;j<12;j++)box(-3.2+j*.55,1+row*.65,-2.5,.45,.55,.05,j%2?'#93aaa2':'#d0baa1',g)}
  if(i===2)for(let j=0;j<9;j++){const x=-3.5+j*.85;cyl(x,.45,2,.22,.7,'#b39375',g);for(let l=0;l<4;l++)ell(x+Math.cos(l)*.1,1+l*.1,2,.25,.18,.2,l%2?'#d8b5be':'#94ad82',g)}
  if(i===3)for(const x of [-2,2]){for(const zz of [-.9,.9])cyl(x,.6,zz,.43,.08,'#6a8382',g,[0,0,Math.PI/2]);line([[x,.6,-.9],[x,1.2,0],[x,.6,.9],[x,.6,-.9]],.035,'#98a99a',g)}
 }
 const station=landmark('elevated-platform-and-staircase',-11.5,-42);box(0,3.4,0,4,.3,21,'#b9c3b3',station);for(let j=0;j<32;j++)box(1.6,3.57,-10+j*.63,.45,.03,.5,'#d0c18e',station);for(const z of [-8,-2,4,9])cyl(-1,4.8,z,.06,2.7,'#91a59c',station);box(0,6.2,0,5,.17,22,'#a8bbb0',station);sign('屋上線 / 上り',0,5.5,8,4,.65,'#73988e',station);stair(-4,.15,-9,2.3,14,.23,.45,station);box(-4,2.6,8,2.5,5.2,2.5,'#a2b7b1',station);box(-4,2.6,9.28,1.8,4.2,.06,'#91b6be',station);sign('EV',-4,4.8,9.4,1,.5,'#789c96',station);
 for(const [x,z,w,d,h] of [[13,-43,12,10,3],[14,-17,11,10,2],[14,22,13,10,3],[13,49,12,9,2],[-35,-30,16,10,3],[-35,29,18,12,2],[45,-43,10,9,2],[46,1,12,10,2],[45,43,11,9,2]]){
  const g=shell(x,z,w,d,h,{name:'mixed-roof-residence',roof:false,color:k.pick(['#c6cdbb','#d1c7b5','#b5c7c4']),balconies:true});box(0,h*3.2+.45,0,w,.5,d,'#b2bfb1',g);cyl(-w*.25,h*3.2+1.6,-d*.15,1.1,2.2,'#b8c6ba',g);for(let j=0;j<3;j++){box(1.4+j*1.2,h*3.2+.9,-d*.2,.9,.8,.8,'#a0b3aa',g);for(let l=0;l<5;l++)box(1.4+j*1.2,h*3.2+.65+l*.1,-d*.2+.43,.75,.025,.04,'#7f9691',g)}rod([-w*.35,h*3.2+.7,2],[w*.35,h*3.2+.7,2],.02,'#8ea59a',g);for(let j=0;j<5;j++)box(-w*.25+j*1.1,h*3.2+.35,2,.55,.7,.05,k.pick(['#c5c7af','#a6bdb6','#d4bdb0']),g);
 }
 path([[-64,.2,-20],[-30,.2,-20],[-10,.2,-18]],3.5,'#a1aaa0',1);path([[5,.2,31],[27,.2,32],[36,1.1,32],[44,.2,32],[64,.2,32]],4,'#9aa79e',1);path([[34,.22,-64],[34,.22,-28],[35,.22,4],[34,.22,64]],3.5,'#a1c3bc');stats.landmarks.push('canal-and-local-street-bridge');
 for(let z=-59;z<62;z+=8){for(const s of [-1,1]){box(34+s*2.1,.35,z,.22,.7,7.9,'#b7bfac');for(let j=0;j<4;j++)cyl(34+s*2.1,1.1,z-3+j*2,.025,.8,'#95aca1')}}
 for(const z of [-56,-30,18,43,61]){cyl(3.1,4,z,.10,8,'#a1ada0');rod([3.1,7,z],[5,7,z],.06,'#8da397');for(const xx of [3.3,4.5]){if(z<61)line([[xx,7,z],[xx,6.4,z+12],[xx,7,Math.min(61,z+25)]],.018,'#70877f')}}
 vehicle('van',-31,46,'#b9c0b0');vehicle('car',20,-54,'#a3b8b6');for(const [x,z] of [[-45,-49],[-45,44],[24,47],[56,18],[55,-20],[-26,4]]){tree('oak',x,z,.8);plant('fern',x+1,z,.8);bench(x+3,z+1)}stats.landmarks.push('roof-tanks-condensers-and-laundry','utility-poles-and-sagging-cables');
 }});}
