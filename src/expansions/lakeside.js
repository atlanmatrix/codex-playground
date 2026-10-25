import {detailedWorld,expandedFit} from './kit.js';import {fishSchool} from './fauna.js';export {expandedFit};
const shore=z=>-4.02+.38*z+.38*Math.sin(z*.55)+.1*Math.cos(z*.91)+3*Math.sin(z*.13)*Math.min(1,Math.max(0,(Math.abs(z)-8)/10));
const ground=(x,z)=>x<shore(z)?.07+2.2*Math.exp(-((x+38)**2+(z+15)**2)/550)*Math.min(1,Math.max(0,(shore(z)-x-8)/12)):.07-2.75*Math.min(1,Math.max(0,(x-shore(z))/4));
export function expandWorld(options){return detailedWorld(options,{intent:'柳荫湖湾、沿岸慢行、静钓与水生植物群落',height:ground,blend:4,color(x,z,y){return y<0?'#4a8f9a':'#a6bf88'},seed:73113,build(k){
 const {THREE,model,world,land,landmark,group,box,cyl,rod,line,ell,rock,roof,bench,sign,tree,plant,path,stats}=k;
 const lake=model.getObjectByName('reflective-lake'),p=lake.geometry.attributes.position;for(let i=0;i<p.count;i++){const z=-p.getY(i),old=-4.02+.38*z+.38*Math.sin(z*.55)+.1*Math.cos(z*.91),u=(p.getX(i)-old)/(64-old);p.setX(i,shore(z)+(64-shore(z))*u)}p.needsUpdate=true;lake.geometry.computeVertexNormals();for(const key of ['vertexShader','fragmentShader'])lake.material[key]=lake.material[key].replace('return -4.02+.38*z+.38*sin(z*.55)+.10*cos(z*.91);','return -4.02+.38*z+.38*sin(z*.55)+.10*cos(z*.91)+3.*sin(z*.13)*clamp((abs(z)-8.)/10.,0.,1.);');lake.material.needsUpdate=true;
 const bank=[];for(let z=-60;z<=60;z+=1.5)bank.push([shore(z)-5,.23,z]);path(bank,2.4,'#b7b897');stats.landmarks.push('winding-lakeshore-path');
 for(const [z,s] of [[-49,1.35],[-35,1.2],[-22,1.5],[19,1.2],[34,1.4],[49,1.1]])tree('willow',shore(z)-7,z,s);
 for(const [x,z] of [[-45,-42],[-38,-35],[-49,23],[-45,39],[-32,49],[-21,44]])tree('oak',x,z,k.R(.9,1.3));
 function pier(z,len){const x=shore(z),g=landmark('timber-fishing-pier',x-1,z);for(let j=0;j<len/.4;j++)box(j*.4,.48,0,.37,.12,2.8,'#b5a17c',g);for(let j=0;j<len;j+=2)for(const s of [-1,1]){cyl(j,-.7,s*1.2,.08,2.7,'#928b70',g);cyl(j,.9,s*1.2,.045,.9,'#a49a7f',g)}line([[0,1.35,-1.2],[len-1,1.35,-1.2]],.04,'#b9ac8b',g);box(len-2,.85,0,1.2,.35,.75,'#b9a783',g);for(let j=0;j<8;j++)box(len-2.5+j*.14,.9,.4,.05,.45,.05,'#927f60',g);rod([len-2,1,0],[len+1,2.7,1],.025,'#8f8f76',g);line([[len+1,2.7,1],[len+2,.15,2]],.007,'#c2cec0',g);return g}
 pier(-32,9);pier(36,7);
 const pavilion=landmark('lakeside-reading-pavilion',shore(20)-11,20);box(0,.32,0,10,.64,8,'#b9b593',pavilion);for(const x of [-4,4])for(const z of [-3,3])cyl(x,2.5,z,.13,4.2,'#aa9370',pavilion);roof(10,8,2,4.7,pavilion,'#8b9e88');for(const s of [-1,1])box(s*3,1.0,0,.7,.18,5,'#b49d76',pavilion);sign('柳荫 / 静读',0,4.3,3.4,6,.55,'#7f9a81',pavilion);
 const hide=landmark('reed-bed-bird-hide',shore(-49)-5,-49);box(0,1.3,0,5,2.4,3.5,'#b1aa87',hide);box(0,1.7,1.79,4,.6,.08,'#5d7d74',hide);roof(5,3.5,.6,2.6,hide,'#a3ae8e');box(0,1.0,2.4,4,.12,.7,'#b7aa84',hide);
 const canoe=landmark('moored-wooden-canoe',shore(42)+3,42);canoe.position.y=.24;ell(0,0,0,.8,.32,2.6,'#aa9771',canoe);ell(0,.15,0,.61,.22,2.25,'#7c8f7b',canoe);for(const z of [-1.1,1.1])box(0,.26,z,1.25,.10,.25,'#c6b38b',canoe);line([[.6,.1,-1.9],[2,.1,-2.8],[2.6,.5,-3.4]],.025,'#d1c8a7',canoe);rod([-.5,.35,-2],[.5,.35,2],.025,'#bba27b',canoe);ell(.5,.35,2,.16,.035,.45,'#bba27b',canoe);
 for(let i=0;i<100;i++){const z=k.R(-58,58),x=shore(z)+k.R(.2,2.2);if(Math.abs(z)<10)continue;for(let j=0;j<3;j++){const h=k.R(.4,1.1);rod([x+j*.1,-.1,z],[x+j*.1,.2+h,z+.1],.018,'#91aa80');ell(x+j*.1,.2+h,z,.04,.15,.04,'#b6ac80')}if(i%3===0)ell(x+.4,.17,z,.40,.025,.28,'#8ab58b')}
 for(let i=0;i<65;i++){const z=k.R(-57,57),x=shore(z)-k.R(.3,1.5);rock(x,.14,z,k.R(.12,.45),k.R(.08,.25),k.R(.15,.4),'#b7c3a0')}
 for(const [x,z] of [[-23,-47],[-30,-16],[-24,27],[-20,48]]){bench(x,z,.3);plant('fern',x-2,z+1,1)}
 for(const [cx,cz] of [[-43,-40],[-47,4],[-38,33],[-21,49]]){
  for(let j=0;j<6;j++){const a=j*2.4,r=k.R(2,7),x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;tree(j%3?'oak':'cedar',x,z,k.R(.85,1.3));plant('fern',x+1,z+1,.8);rock(x-1,land(x-1,z)+.15,z,1,.3,.7,'#b3bda0')}
 }
 const meadow=[];for(let i=0;i<=40;i++){const a=i/40*Math.PI*2;meadow.push([-34+Math.cos(a)*14,.22,8+Math.sin(a)*20])}path(meadow,1.4,'#c6c5a0');stats.landmarks.push('woodland-meadow-loop');
 for(let i=0;i<90;i++){const x=k.R(-43,-22),z=k.R(-5,20);for(let j=0;j<3;j++){const xx=x+j*.12,y=land(xx,z);rod([xx,y,z],[xx,y+.35,z],.012,'#99b07e');ell(xx,y+.4,z,.08,.045,.07,i%3?'#dfd7a0':'#d5b0b3')}}
 for(const [i,[x,z]] of [[8,-38],[29,-12],[35,22],[25,43]].entries())fishSchool(k,{x,z,depth:-1.3,count:24,color:['#e1bc71','#a5ccd0','#d7b994','#c6d3b7'][i],species:i===0?'koi':i===1?'silver':'bream',phase:i*1.8});
 stats.landmarks.push('lily-and-reed-beds','willow-branch-curtains');
 }});}
