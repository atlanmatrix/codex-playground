import * as THREE from 'three';

export const profiles={city:{extent:48,base:.05,height:.024},rainy:{extent:14,base:.28,height:.06},onsen:{extent:48,base:.12,height:.018},study:{extent:26,base:.2,height:.045},summit:{extent:48,base:.5,height:.013},desert:{extent:48,base:0,height:.018},ocean:{extent:48,base:0,height:.014}};
export function sampleHeight(region,x,z,display=false){
 const a=region.heightData;if(!a)return 0;
 const size=region.heightDimension,u=THREE.MathUtils.clamp(x+64,0,127.999),v=THREE.MathUtils.clamp(z+64,0,127.999),ix=Math.floor(u),iz=Math.floor(v),fx=u-ix,fz=v-iz,at=iz*size+ix+(display?size*size:0);
 return (a[at]*(1-fx)+a[at+1]*fx)*(1-fz)+(a[at+size]*(1-fx)+a[at+size+1]*fx)*fz;
}
export const smooth=(a,b,x)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export const coastEdge=(r,a)=>r.size*(1+.13*Math.sin(3*a+r.phase)+.07*Math.cos(5*a-r.phase)+.035*Math.sin(9*a));
export function distanceToRegion(n,r){
 const dot=n.dot(r.normal);if(dot<=0)return Infinity;
 const x=n.dot(r.east)/dot,y=n.dot(r.north)/dot;
 return Math.hypot(x,y)/coastEdge(r,Math.atan2(y,x));
}
export function landAt(n,regions){
 let sea=1;for(const r of regions){if(r.route==='ocean')continue;sea*=smooth(.72,1.20,distanceToRegion(n,r));}return 1-sea;
}
export function surfaceRadius(n,regions,radius=3){
 const land=landAt(n,regions);
 const hills=(Math.sin(n.x*19+n.z*11)*Math.sin(n.y*23-n.z*7)+Math.sin(n.z*37+n.x*17)*.25)*.012;
 let relief=0,weight=0;
 for(const r of regions){
  if(!r.heightData||r.route==='ocean')continue;
  const dot=n.dot(r.normal);if(dot<=0)continue;
  const x=n.dot(r.east)/dot,z=-n.dot(r.north)/dot,d=distanceToRegion(n,r),taper=1-smooth(.48,1.0,d);
  if(taper<=0)continue;
  const profile=profiles[r.route],h=Math.max(0,sampleHeight(r,x/r.size*profile.extent,z/r.size*profile.extent,true)-profile.base);
  relief+=h*profile.height*taper;weight+=taper;
 }
 return radius-.12+land*.19+hills*land+relief/Math.max(1,weight);
}
export function terrainColor(n,regions){
 let sum=0,r=0,g=0,b=0;
 for(const region of regions){if(region.route==='ocean')continue;const w=Math.pow(Math.max(0,1-distanceToRegion(n,region)/1.12),2);sum+=w;r+=w*region.color[0];g+=w*region.color[1];b+=w*region.color[2];}
 const color=sum?new THREE.Color().setRGB(r/sum/255,g/sum/255,b/sum/255,THREE.SRGBColorSpace):new THREE.Color('#438c99');
 const land=landAt(n,regions);if(land<.72&&land>.24)color.lerp(new THREE.Color('#d5c99e'),(1-smooth(.24,.72,land))*.7);
 return color;
}
