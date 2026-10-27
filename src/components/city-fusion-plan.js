export const FUSION_COMPONENTS=[
 {key:'lakeside',source:2,x:38,z:-34,size:16,rotation:0,label:'湖畔午睡'},
 {key:'courtyard',source:3,x:-46,z:-5,size:16,rotation:0,label:'社区健身区'},
 {key:'sakura',source:4,x:-46,z:-52,size:18,rotation:0,label:'樱花小站'},
 {key:'rooftop',source:5,x:-48,z:49,size:18,rotation:Math.PI/2,label:'屋顶铁道街'},
 {key:'intersection',source:9,x:-20,z:27,size:42,terrainHole:false,rotation:0,label:'十字路口'}
];
export const inComponentBounds=(x,z,margin=0)=>FUSION_COMPONENTS.some(p=>Math.abs(x-p.x)<p.size/2+margin&&Math.abs(z-p.z)<p.size/2+margin);
export const inLakePark=(x,z)=>x>18&&z<-8;
const radius=z=>Math.sqrt(Math.max(0,1-((z+36)/27)**2));
export const lakeShoreLeft=z=>Math.max(38-4.02+.38*(z+34)+.38*Math.sin((z+34)*.55)+.1*Math.cos((z+34)*.91),44-20*radius(z));
export const lakeShoreRight=z=>44+20*radius(z);
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function lakeDistrictHeight(x,z){
 const left=lakeShoreLeft(z),right=lakeShoreRight(z),d=Math.min(x-left,right-x);
 if(z>-63&&z<-9&&d>=0){const west=smooth((x-left)/Math.max(1,(46-left)*.3)),east=smooth((right-x)/3);return .07-2.7*Math.min(west,east);}
 const edge=Math.max(0,Math.min(1,((left-x)/3.7)));return .19+.39*Math.sin(edge*1.5)+.045*Math.sin((z+34)*1.4+x-38)*Math.sin(edge*Math.PI);
}

export const inTerrainHole=(x,z)=>FUSION_COMPONENTS.some(p=>p.terrainHole!==false&&Math.abs(x-p.x)<p.size/2&&Math.abs(z-p.z)<p.size/2);
