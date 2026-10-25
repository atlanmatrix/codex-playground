import {detailedWorld,expandedFit} from './kit.js';
export {expandedFit};
export function expandWorld(options){return detailedWorld(options,{intent:'分级道路、公交换乘与有生活细节的街口',seed:61823,build(k){
 const {THREE,box,cyl,rod,line,ell,group,landmark,shell,roof,sign,bench,tree,plant,vehicle,busStop,path,follow,motions,stats,world}=k;
 stats.roadTypes=['arterial','collector','service-alley','cycleway'];stats.bridges=4;
 // The original two-lane junction widens into four-lane approaches with merge tapers.
 for(let axis=0;axis<2;axis++)for(const side of [-1,1]){
  const p=[],point=(u,w)=>axis?[side*u,.24,w]:[w,.24,side*u];for(const [a,b,wa,wb] of [[16,25,4,8],[25,64,8,8]]){const aa=point(a,-wa),ab=point(a,wa),ba=point(b,-wb),bb=point(b,wb);p.push(...aa,...ab,...ba,...ba,...ab,...bb)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();k.mesh(g,'#75858d',world,{side:THREE.DoubleSide});
  for(let u=26;u<63;u+=3.4)for(const lane of [-4,0,4]){const [x,y,z]=point(u,lane);box(x,y+.03,z,axis?1.8:.10,.018,axis?.10:1.8,lane===0?'#e0c278':'#eee5cd')}
  for(let u=26;u<63;u+=.65)for(const edge of [-1,1]){const [x,y,z]=point(u,edge*8.5);box(x,.27,z,axis?.58:.23,.23,axis?.23:.58,'#d4d6c6')}
 }
 const pts=[[-45,.19,-38],[-24,.2,-38],[-10,2.6,-38],[0,4.8,-38],[10,2.6,-38],[35,.19,-38],[46,.19,-29],[46,.19,-12],[46,4.8,0],[46,.19,15],[46,.19,31],[35,.19,39],[10,2.6,39],[0,4.8,39],[-10,2.6,39],[-35,.19,39],[-46,.19,29],[-46,.19,12],[-46,4.8,0],[-46,.19,-15],[-46,.19,-29],[-45,.19,-38]];
 const ring=path(pts,12,'#7d8b91',4);landmark('boulevard-and-four-overpasses',0,24);
 // Box girders, piers, parapets and expansion joints make the grade separations legible.
 for(const [x,z,ry] of [[0,-38,Math.PI/2],[0,39,Math.PI/2],[46,0,0],[-46,0,0]]){
  const g=group('girder-overpass',x,0,z,ry);for(const side of [-1,1]){box(side*5.8,3.5,0,.35,.65,18,'#a4b4b0',g);for(let j=-8;j<=8;j+=1.6)cyl(side*5.6,4.0,j,.035,.9,'#a3b7b3',g)}for(const u of [-10,10])for(const s of [-1,1])box(s*4.7,1.25,u,.65,2.5,1.0,'#b6c0b1',g);
 }
 path([[-59,.2,-17],[-34,.2,-19],[-24,.2,-25],[-24,.2,-48],[-34,.2,-56]],4,'#9b9d95',1);stats.landmarks.push('delivery-service-alley');
 path([[-57,.22,47],[-29,.22,52],[4,.22,53],[29,.22,49],[57,.22,45]],2.2,'#89aaa0');stats.landmarks.push('separated-cycleway');
 for(const [x,z,w,d,f,c] of [[-29,-20,15,10,3,'#cfb59e'],[25,-20,15,9,2,'#c3cfc2'],[-29,21,14,12,4,'#b9cbd0'],[27,21,16,11,3,'#d8cfb2']]){
  const g=shell(x,z,w,d,f,{color:c,balconies:f>2,roof:false,name:'mixed-use-corner-block'});box(0,f*3.2+.5,0,w+.3,.6,d+.3,'#aab9ad',g);box(-w*.25,f*3.2+1.25,-d*.2,2,1.1,1.2,'#9baea8',g);for(let j=0;j<5;j++){box(-w/2+1.1+j*2.7,1.5,d/2+.12,2.1,2.1,.13,'#85a7aa',g);box(-w/2+1.1+j*2.7,2.9,d/2+.8,2.5,.14,1.6,j%2?'#e6dfc5':'#83a598',g)}
  sign(x<0?'面包 / COFFEE':'书店 / MARKET',0,3.5,d/2+.17,w*.86,.7,x<0?'#a67c64':'#719387',g);for(let j=0;j<3;j++){cyl(-w/2+1+j*1.2,.65,d/2+1.5,.3,.7,'#bb9677',g);ell(-w/2+1+j*1.2,1.3,d/2+1.5,.48,.5,.4,'#7ca180',g)}
 }
 const g=shell(-26,52,13,7,2,{name:'small-bus-terminal-office',color:'#d5cbb2'});sign('青叶交通 / 02',0,2.9,3.65,11,.8,'#6e938d',g);stats.landmarks.push('bus-interchange');
 for(const [i,u] of [.16,.63].entries()){
  const p=ring.getPointAt(u),v=ring.getTangentAt(u),n=new THREE.Vector3(v.z,0,-v.x).normalize(),stop=busStop(p.x+n.x*9,p.z+n.z*9,Math.atan2(v.x,v.z),i?'返程 / 02':'中央公园 / 02');
  for(let j=0;j<8;j++)box(p.x+n.x*6+v.x*(j-4)*.5,.24,p.z+n.z*6+v.z*(j-4)*.5,.4,.035,.4,'#e5c873');
  const bus=vehicle('bus',0,0,i?'#92b4a1':'#d3b678',true);motions.push(t=>{const cycle=(t+i*46)%104,s=Math.max(0,cycle-14)/90,travel=s-Math.sin(s*Math.PI*2)/(Math.PI*2);follow(bus,ring,0,0,u+travel);const tang=ring.getTangentAt((u+travel)%1),normal=new THREE.Vector3(tang.z,0,-tang.x).normalize();bus.position.addScaledVector(normal,4.1);bus.position.y+=0});
 }
 for(let i=0;i<12;i++){const type=['car','van','taxi','truck'][i%4],car=vehicle(type,0,0,k.pick(['#d4b871','#8eaca6','#b98173','#b4c3ca']),true),reverse=i%2;motions.push(t=>{const u=((i/12+(reverse?-1:1)*t*.005)%1+1)%1;follow(car,ring,0,0,u);const v=ring.getTangentAt(u),n=new THREE.Vector3(v.z,0,-v.x).normalize();car.position.addScaledVector(n,reverse?-1.55:1.55);car.position.y+=0;if(reverse)car.rotation.y+=Math.PI})}
 for(const [x,z,type] of [[-26,-50,'truck'],[-33,-52,'van'],[26,52,'taxi'],[32,52,'car']]){vehicle(type,x,z,'#b6b8a7');for(const s of [-1,1])box(x+s*1.5,.18,z,.06,.02,5.5,'#e7dfbf')}
 for(const [x,z] of [[-56,-50],[-14,-51],[17,-51],[57,-20],[-57,21],[24,55],[-19,54],[57,53]]){tree('oak',x,z,.9);bench(x+3,z+2);plant('fern',x+2,z-1)}
 for(let j=-56;j<=56;j+=14)for(const s of [-1,1]){cyl(j,3,s*29,.065,6,'#829999');box(j+.5,6,s*29,1.3,.17,.45,'#e4e6cc',null,null,true);box(j,.6,s*29,.42,1.1,.42,'#8ca497')}
 const garage=shell(-55,12,9,17,1,{name:'service-garage',color:'#c4bbaa',roofColor:'#7f9290'});sign('维修 / SERVICE',0,3.0,8.65,8,.65,'#8b7e68',garage);
 for(let i=0;i<4;i++){const car=vehicle(i%2?'van':'car',-54,30+i*5,k.pick(['#a7bdb4','#c8ab82','#9eb3be']));car.rotation.y=Math.PI/2;box(-54,.24,30+i*5,7,.04,.08,'#eee1bd')}
 const plaza=landmark('news-kiosk-and-pocket-park',29,-54);box(0,.05,0,19,.10,13,'#d2d2bd',plaza);box(-4,1.2,0,3.5,2.3,2.8,'#99b5ab',plaza);box(-4,2.45,0,4.1,.15,3.4,'#819c96',plaza);sign('报刊',-4,2.1,1.45,2.8,.55,'#718c83',plaza);for(let i=0;i<8;i++)box(-5.3+i*.35,1.2,1.5,.27,.6,.05,i%2?'#d1c09f':'#a5bdba',plaza);
 for(const [x,z] of [[-56,-52],[-56,-44],[-16,56],[16,56],[54,53],[58,18],[59,-17],[56,-51],[21,-57],[39,-56]]){tree('oak',x,z,.8);plant('fern',x+1,z+2)}
 stats.landmarks.push('four-lane-merge-approaches','varied-vehicle-fleet','loading-bays');
 }});}
