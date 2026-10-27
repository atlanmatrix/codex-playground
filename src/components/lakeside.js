import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {Reflector} from 'three/addons/objects/Reflector.js';

// Native core extracted as a reusable city component; no renderer, route or UI.
export function createLakesideComponent({renderer,preview=false,reduced=false,trafficPose,limits,origin=[0,0]}){
const model=new THREE.Group();model.name='lakeside-miniature';
const scenery=new THREE.Group();scenery.name='static-landscape';model.add(scenery);
let seed=163807;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const R=(a,b)=>a+random()*(b-a),pick=a=>a[Math.floor(random()*a.length)];
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
const ramp=new THREE.DataTexture(new Uint8Array([95,146,192,225,248,255]),6,1,THREE.RedFormat);ramp.needsUpdate=true;ramp.minFilter=ramp.magFilter=THREE.NearestFilter;
const toon=(color,extra={})=>new THREE.MeshToonMaterial({color,gradientMap:ramp,...extra});
const m={soil:toon('#8e7550'),deep:toon('#6d684d'),sand:toon('#d4c59a'),stone:toon('#c6cab1'),stone2:toon('#9eada5'),trunk:toon('#8f8261'),bark:toon('#b0a17c'),twig:toon('#829258'),wood:toon('#c2a575'),woodDark:toon('#a38759'),woodLight:toon('#dbc398'),cushion:toon('#f0e4c5'),cushionEdge:toon('#d6cba9'),paper:toon('#fff4d9'),paperEdge:toon('#e2d4b2'),cover:toon('#a89165'),orange:toon('#eda347'),lightOrange:toon('#f4bc68'),stripe:toon('#bb7136'),cream:toon('#fae0ab'),pink:toon('#d79787'),ink:toon('#735347')};
const leafMats=['#64a36a','#86bc73','#afd08a'].map(c=>toon(c,{side:THREE.DoubleSide}));
const grassMats=['#7ead62','#96bb6b','#b1cd7d'].map(c=>toon(c,{side:THREE.DoubleSide}));
const foliageMaterial=toon('#ffffff',{side:THREE.DoubleSide});
const seatingArea=(x,z)=>x>-6.5&&x<-3.5&&z>.3&&z<2.5;
const bridgeArea=(x,z)=>x>shoreX(-.8)-1.2&&x<shoreX(-.8)+.8&&z>-1.65&&z<.05;
const geo={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.SphereGeometry(1,24,16),stone:new THREE.IcosahedronGeometry(1,1),leaf:new THREE.BufferGeometry(),grass:new THREE.BufferGeometry()};
geo.leaf.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.03,-.12,.012,0,-.34,0,0,0,0,0,-.34,0,.032,-.12,.012],3));geo.leaf.computeVertexNormals();
geo.grass.setAttribute('position',new THREE.Float32BufferAttribute([-.023,0,0,.023,0,0,.04,.19,.015,-.023,0,0,.04,.19,.015,0,.2,.015,0,.2,.015,.04,.19,.015,.09,.4,.01],3));geo.grass.computeVertexNormals();
function mesh(g,material,x=0,y=0,z=0,parent=scenery){const o=new THREE.Mesh(g,material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function box(x,y,z,w,h,d,material,parent=scenery){const o=mesh(geo.box,material,x,y,z,parent);o.scale.set(w,h,d);return o}
function ell(x,y,z,sx,sy,sz,material,parent=scenery){const o=mesh(geo.sphere,material,x,y,z,parent);o.scale.set(sx,sy,sz);return o}
function tube(points,r,material,parent=scenery,segments=24){const c=new THREE.CatmullRomCurve3(points.map(p=>Array.isArray(p)?v(...p):p));return mesh(new THREE.TubeGeometry(c,segments,r,6,false),material,0,0,0,parent)}
function rod(a,b,r,material,parent=scenery,rTop=r){const from=v(...a),to=v(...b),delta=to.clone().sub(from);const o=mesh(new THREE.CylinderGeometry(rTop,r,delta.length(),8),material,0,0,0,parent);o.position.copy(from.add(to).multiplyScalar(.5));o.quaternion.setFromUnitVectors(v(0,1,0),delta.normalize());return o}
const dummy=new THREE.Object3D();
function instances(g,material,items,parent=scenery,shadow=true){const o=new THREE.InstancedMesh(g,material,items.length);for(let i=0;i<items.length;i++){const a=items[i];dummy.position.set(...a.p);dummy.scale.set(...(a.s||[1,1,1]));dummy.rotation.set(...(a.r||[0,0,0]));dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);if(a.color)o.setColorAt(i,a.color)}o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o}
const WATER_LEVEL=.16,BASE_BOTTOM=-3.05,SECTION_FLOOR=-2.77;
// The bank crosses the square diagonally while retaining roughly 75% water.
const shoreX=z=>-4.02+.38*z+.38*Math.sin(z*.55)+.10*Math.cos(z*.91);
const shoreSlope=z=>.38+.209*Math.cos(z*.55)-.091*Math.sin(z*.91);
const bedY=(x,z)=>.07-THREE.MathUtils.smoothstep((x-shoreX(z))/(8-shoreX(z)),0,.30)*2.70;
const landY=(x,z)=>{const t=THREE.MathUtils.clamp((shoreX(z)-x)/3.7,0,1);return .19+.39*Math.sin(t*1.5)+.045*Math.sin(z*1.4+x)*Math.sin(t*Math.PI)};
function geometryGrid(nx,nz,position,color){const ps=[],cs=[],ix=[];for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const p=position(i/nx,j/nz);ps.push(...p);if(color)cs.push(...color(p,i/nx,j/nz))}for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;ix.push(a,c,b,b,c,d)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));if(color)g.setAttribute('color',new THREE.Float32BufferAttribute(cs,3));g.setIndex(ix);g.computeVertexNormals();return g}
function sideStrip(points,material,bottom=SECTION_FLOOR){const ps=[],ix=[];for(const p of points)ps.push(p[0],p[1],p[2],p[0],bottom,p[2]);for(let i=0;i<points.length-1;i++){const a=i*2;ix.push(a,a+1,a+2,a+1,a+3,a+2)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));g.setIndex(ix);g.computeVertexNormals();const o=mesh(g,material);o.material.side=THREE.DoubleSide;return o}
// The base has one structural bottom; soil and water occupy separate footprints.

const turfColor=new THREE.Color();
const terrain=geometryGrid(24,80,(u,w)=>{const z=-8+16*w,x=THREE.MathUtils.lerp(-8,shoreX(z),u);return[x,landY(x,z),z]},(p,u)=>{turfColor.set('#8caf69').lerp(new THREE.Color('#bbcc84'),Math.max(0,1-u)*.35+.06*Math.sin(p[2]*2));return turfColor.toArray()});
mesh(terrain,toon('#ffffff',{vertexColors:true}));
const landLeft=[],landFront=[],landBack=[];
for(let i=0;i<=80;i++){const z=-8+i*.2;landLeft.push([-8,landY(-8,z),z])}
for(let i=0;i<=24;i++){for(const [z,list] of [[8,landFront],[-8,landBack]]){const x=THREE.MathUtils.lerp(-8,shoreX(z),i/24);list.push([x,landY(x,z),z])}}

const bed=geometryGrid(75,80,(u,w)=>{const z=-8+16*w,x=THREE.MathUtils.lerp(shoreX(z),8,u);return[x,bedY(x,z),z]},(p,u)=>{const c=new THREE.Color('#dbcfa8').lerp(new THREE.Color('#387f8e'),THREE.MathUtils.smoothstep(u,0,.45));return c.toArray()});
mesh(bed,toon('#ffffff',{vertexColors:true}));
const waterSide=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,vertexShader:`varying float h;varying vec3 p;void main(){h=position.y;p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying float h;varying vec3 p;void main(){float f=smoothstep(-2.77,.16,h);vec3 c=mix(vec3(.16,.43,.49),vec3(.40,.76,.78),f);c+=.018*sin(p.x*3.+p.z*2.);gl_FragColor=vec4(c,mix(.82,.48,f));}`});
// Actual pebbles beneath the translucent shallows, plus emergent shoreline stones.
const pebbleBatches=[[],[],[]];
for(let i=0;i<200;i++){const z=R(-7.8,7.8),d=R(.05,1.38),x=shoreX(z)+d;const y=bedY(x,z);pebbleBatches[i%3].push({p:[x,y+.035,z],s:[R(.04,.16),R(.025,.065),R(.05,.17)],r:[R(-.3,.3),R(0,6.28),R(-.3,.3)]})}
for(let i=0;i<3;i++)instances(geo.stone,[m.stone,m.stone2,m.sand][i],pebbleBatches[i]);
for(let i=0;i<28;i++){const z=R(-7.8,7.8),x=shoreX(z)-R(.03,.24),s=R(.07,.18);ell(x,landY(x,z)+.03,z,s,s*.55,s*.8,i%2?m.stone:m.stone2)}

// A planar reflection of the real willows, broken by independent wave trains.
const waterGeometry=geometryGrid(96,96,(u,w)=>{const z=-8+16*w;return[THREE.MathUtils.lerp(shoreX(z),8,u),0,z]});
waterGeometry.rotateX(Math.PI/2);
const waterUniforms={time:{value:0},componentOrigin:{value:new THREE.Vector2()},color:{value:new THREE.Color('#8acfd0')},tDiffuse:{value:null},textureMatrix:{value:new THREE.Matrix4()}};
const water=new Reflector(waterGeometry,{
 textureWidth:preview?512:1024,textureHeight:preview?512:1024,clipBias:.002,
 shader:{uniforms:waterUniforms,
 vertexShader:`uniform float time;uniform vec2 componentOrigin;uniform mat4 textureMatrix;varying vec4 mirrorCoord;varying vec3 worldP;
 float shore(float z){return -4.02+.38*z+.38*sin(z*.55)+.10*cos(z*.91);}
 void main(){vec4 wp=modelMatrix*vec4(position,1.);vec2 lp=wp.xz-componentOrigin;float edge=min(min(25.-lp.y,lp.y+29.),lp.x-shore(lp.y));float fade=smoothstep(0.,.6,edge);wp.y+=fade*(sin(lp.x*3.2+lp.y*1.7+time*.72)*.025+sin(lp.x*-2.1+lp.y*3.6-time*.60)*.014);worldP=vec3(lp.x,wp.y,lp.y);mirrorCoord=textureMatrix*vec4(position,1.);gl_Position=projectionMatrix*viewMatrix*wp;}`,
 fragmentShader:`uniform float time;uniform vec3 color;uniform sampler2D tDiffuse;varying vec4 mirrorCoord;varying vec3 worldP;
 float shore(float z){return -4.02+.38*z+.38*sin(z*.55)+.10*cos(z*.91);}
 float waves(vec2 p){return sin(dot(p,vec2(.9,.43))*3.7+time*.72)*.48+sin(dot(p,vec2(-.64,1.18))*5.8-time*.60)*.29+sin(dot(p,vec2(1.12,-.9))*11.3+time*.45)*.14+sin(length(p-vec2(-2.,2.))*6.-time*.85)*.09;}
 void main(){
  vec2 p=worldP.xz;float d=max(0.,p.x-shore(p.y));float depth=smoothstep(0.,4.7,d);float w=waves(p);
  vec2 slope=vec2(waves(p+vec2(.025,0.))-w,waves(p+vec2(0.,.025))-w);
  vec2 uv=mirrorCoord.xy/mirrorCoord.w+slope*.060;
  vec4 reflection=texture2D(tDiffuse,clamp(uv,.001,.999));
  vec3 sky=mix(vec3(.64,.85,.90),vec3(.91,.95,.86),.4+.22*sin(p.y*.23+p.x*.1));
  vec3 reflected=mix(sky,reflection.rgb,reflection.a);
  vec3 base=mix(vec3(.48,.79,.72),vec3(.16,.54,.69),depth);
  vec3 c=mix(base,reflected,.20+.10*depth);
  float crest=pow(max(0.,sin(dot(p,vec2(.74,.53))*7.3+w*1.3-time*.95)),10.);
  float crossCrest=pow(max(0.,sin(dot(p,vec2(-.55,1.1))*5.1-w*.7+time*.63)),16.);
  c+=vec3(.075,.13,.12)*crest+vec3(.035,.07,.065)*crossCrest;
  c-=vec3(.012,.027,.020)*(w*.5+.5);
  float band=exp(-pow((d-1.9-p.y*.11)/1.15,2.))*smoothstep(-7.,-3.,p.y)*(1.-smoothstep(4.8,8.,p.y));
  float fleck=smoothstep(.43,.80,waves(p*vec2(1.5,2.6)+vec2(time*.07,0.)));
  float fine=smoothstep(.05,.29,sin(p.x*32.+p.y*19.+w*3.7+time*.9));float glint=band*fleck*fine;
  c=mix(c,vec3(1.,.88,.53),glint*.72);c+=vec3(1.,.91,.67)*glint*.10;
  // Keep the water translucent enough to reveal swimming fish at every depth.
  gl_FragColor=vec4(c,mix(.26,.62,depth));
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`}

});
water.name='reflective-lake';water.rotation.x=-Math.PI/2;water.position.y=.16;
water.material.transparent=true;water.material.depthWrite=false;water.renderOrder=3;water.castShadow=false;water.receiveShadow=false;model.add(water);

// Grass patches bend independently; their shallow pivots keep roots planted.
const grassPatches=[];
for(let k=0;k<26;k++){
 const z=-7.65+k*.61,x=(-8+shoreX(z))/2;
 const patch=new THREE.Group();patch.position.set(x,landY(x,z),z);patch.name='breeze-grass';model.add(patch);
 const batches=[[],[],[]];
 for(let i=0;i<85;i++){
  const pz=z+R(-.30,.30);if(Math.abs(pz)>7.88)continue;
  const px=R(-7.9,shoreX(pz)-.04);
  // Leave the chaise's footprint open and legible.
  if(seatingArea(px,pz)||bridgeArea(px,pz))continue;
  for(let j=0;j<3;j++)batches[i%3].push({p:[px-x,landY(px,pz)-patch.position.y,pz-z],s:[R(.65,1.15),R(.4,1.0),1],r:[0,R(0,6.28),R(-.18,.18)]});
 }
 const coloredGrass=batches.flatMap((items,i)=>items.map(a=>({...a,color:grassMats[i].color})));
 if(coloredGrass.length)instances(geo.grass,foliageMaterial,coloredGrass,patch,false);
 grassPatches.push({g:patch,phase:R(0,6.28)});
}
const flowerMats=['#f5e8ae','#e5ebd4','#d8b5c7'].map(c=>toon(c));
const flowerBatches=flowerMats.map(()=>[]);
for(let i=0;i<180;i++){
 const z=R(-7.7,7.7),x=R(-7.8,shoreX(z)-.2);
 if(seatingArea(x,z)||bridgeArea(x,z))continue;
 const y=landY(x,z),h=R(.12,.28);rod([x,y,z],[x+.015,y+h,z],.008,m.twig);
 for(let j=0;j<5;j++){const a=j/5*6.28;flowerBatches[i%3].push({p:[x+Math.cos(a)*.035,y+h,z+Math.sin(a)*.035],s:[.04,.017,.04]})}
}
flowerBatches.forEach((items,i)=>instances(geo.stone,flowerMats[i],items));
// Low flowering ground cover and occasional reeds enrich the diagonal bank.
const shrubs=[];
for(let i=0;i<48;i++){
 const z=R(-7.7,7.7),x=R(-7.8,shoreX(z)-.22);
 if(seatingArea(x,z)||bridgeArea(x,z))continue;
 for(let j=0;j<5;j++){
  const px=x+R(-.15,.15),pz=z+R(-.15,.15),r=R(.10,.23);
  shrubs.push({p:[px,landY(px,pz)+r*.6,pz],s:[r,r*.8,r],color:pick(leafMats).color});
 }
}
instances(geo.sphere,foliageMaterial,shrubs);
for(let i=0;i<20;i++){
 const z=R(-7.6,7.6),x=shoreX(z)-R(.02,.14);
 if(bridgeArea(x,z))continue;
 for(let j=0;j<3;j++){
  const h=R(.35,.72),px=x+R(-.06,.06),pz=z+R(-.1,.1),y=landY(px,pz);
  tube([[px,y,pz],[px+.04,y+h*.6,pz+.02],[px+.09,y+h,pz+.04]],.011,m.twig,scenery,8);
  if(j===0)rod([px+.09,y+h-.03,pz+.04],[px+.09,y+h+.12,pz+.04],.027,m.woodDark);
 }
}

// Submerged ribbon grass remains visible through shallow water.
for(let i=0;i<38;i++){
 const z=R(-7.6,7.6),x=shoreX(z)+R(.25,.75),u=(x-shoreX(z))/(8-shoreX(z));
 const y=bedY(x,z);
 for(let j=0;j<3;j++)tube([[x+j*.035,y,z],[x+.08,y+.12,z+.03],[x+.14,y+.25,z+.08]],.013,leafMats[0]);
}
const willowBoughs=[];
function willow(x,z,height,span,phase){
 const y=landY(x,z),treeScale=height/5.15;
 tube([[x,y,z],[x+.06,y+height*.23,z+.03],[x+.28,y+height*.53,z-.09],[x+.5,y+height*.78,z+.06],[x+.7,y+height*.93,z]],height*.034,m.trunk);
 // Fluted bark and long surface roots give the trunk a readable silhouette.
 for(let i=0;i<4;i++){
  const a=i/4*6.28;
  tube([[x+Math.cos(a)*.17*treeScale,y,z+Math.sin(a)*.17*treeScale],[x+.1+Math.cos(a)*.12*treeScale,y+height*.3,z+Math.sin(a)*.12*treeScale],[x+.3+Math.cos(a)*.07*treeScale,y+height*.61,z-.09]],.022*treeScale,m.bark);
 }
 for(let i=0;i<7;i++){
  const a=i/7*6.28,dx=Math.cos(a),dz=Math.sin(a),ex=THREE.MathUtils.clamp(x+dx*R(.7,1.35),-7.97,shoreX(z)-.1),ez=THREE.MathUtils.clamp(z+dz*.9,-7.9,7.9);
  tube([[x,y+.1,z],[x+dx*.4,landY(x+dx*.4,z+dz*.3)+.04,z+dz*.3],[ex,landY(ex,ez)+.02,ez]],.045,m.trunk);
 }
 for(let k=0;k<7;k++){
  const a=k/7*6.28;
  const endX=THREE.MathUtils.clamp(x+.7+Math.cos(a)*span,-7.55,shoreX(z)+1.05);
  const endZ=THREE.MathUtils.clamp(z+Math.sin(a)*span,-7.5,7.5);
  const endY=y+height+R(-.45,.25);
  tube([[x+.4,y+height*.56,z],[x+.7,y+height*.86,z],[THREE.MathUtils.lerp(x+.7,endX,.55),endY+.15,THREE.MathUtils.lerp(z,endZ,.55)],[endX,endY,endZ]],.047,m.trunk);
  const bough=new THREE.Group();bough.position.set(endX,endY,endZ);bough.name='swaying-willow';model.add(bough);
  const leaves=[[],[],[]],strings=[];
  for(let j=0;j<5;j++){
   const dx=R(-.26,.26),dz=R(-.34,.34);
   const nearWater=endX>shoreX(endZ);
   const maxLength=endY-(nearWater?.28:landY(endX,endZ)+.18);
   const length=Math.min(maxLength,k%4===0&&j===0?maxLength:R(height*.48,height*.94));
   const droop=new THREE.CatmullRomCurve3([v(dx,0,dz),v(dx+.16,-length*.18,dz+.08),v(dx+.29,-length*.58,dz+.13),v(dx+.18,-length,dz+.17)]);
   strings.push(new THREE.TubeGeometry(droop,18,.009,3,false));
   for(let n=0;n<22;n++){
    const t=.025+n*.043,p=droop.getPoint(t),s=R(.66,1.1)*(1-t*.3);
    for(const sign of [-1,1])leaves[(n+j)%3].push({p:[p.x+sign*.025,p.y,p.z],s:[s,s,s],r:[R(-.4,.4),a+sign*.5,sign*R(.28,.75)]});
   }
  }
  mesh(mergeGeometries(strings,false),m.twig,0,0,0,bough);strings.forEach(g=>g.dispose());
  const coloredLeaves=leaves.flatMap((items,i)=>items.map(a=>({...a,color:leafMats[i].color})));
  instances(geo.leaf,foliageMaterial,coloredLeaves,bough,true);
  willowBoughs.push({g:bough,phase:phase+k*.73});
 }
}
willow(-7.35,-6.6,2.55,.68,.2);
willow(-6.8,-3.8,3.65,1.25,1.3);
willow(-7.3,-.9,3.05,1.0,2.5);
willow(-5.7,4.8,4.0,1.45,3.1);
willow(-3.1,6.9,3.2,1.2,4.1);
willow(-7.1,6.7,2.7,1.0,5.3);

// The chaise faces the water (+local X). Broad slats and piping remain readable.
const chaise=new THREE.Group();chaise.name='chaise-book-and-sleeping-cat';chaise.position.set(-4.9,landY(-4.9,1.3),1.3);chaise.scale.setScalar(.78);chaise.rotation.y=.13;scenery.add(chaise);
for(const z of [-.68,.68]){
 box(.02,.65,z,2.95,.15,.12,m.woodDark,chaise);
 rod([-1.15,.08,z],[-.73,.66,z],.065,m.woodDark,chaise);
 rod([1.2,.08,z],[.75,.66,z],.065,m.woodDark,chaise);
 rod([-1.15,.08,z],[1.1,.08,z],.045,m.woodDark,chaise);
 rod([-.95,.63,z],[-1.75,1.95,z],.062,m.woodDark,chaise);
 box(.05,1.02,z*1.22,2.2,.09,.12,m.woodLight,chaise);
 for(const x of [-.85,.96])rod([x,.7,z*1.14],[x,1.02,z*1.22],.035,m.wood,chaise);
}
for(let i=0;i<15;i++)box(-1.28+i*.19,.72,0,.145,.095,1.4,m.wood,chaise);
for(let i=0;i<8;i++){
 const t=i/7,x=-1.01-t*.64,y=.94+t*.95;
 const plank=box(x,y,0,.13,.12,1.4,i%2?m.wood:m.woodLight,chaise);plank.rotation.z=.57;
}
// A rounded cushion and narrow raised seam; no coplanar decorative overlays.
const cushion=ell(.05,.845,0,1.3,.15,.68,m.cushion,chaise);
box(.05,.81,0,2.4,.13,1.22,m.cushion,chaise);
for(const z of [-.62,.62])tube([[-1.12,.87,z],[-.4,.91,z],[.45,.91,z],[1.19,.85,z]],.012,m.cushionEdge,chaise);
const backCushion=ell(-1.36,1.41,0,.13,.62,.62,m.cushion,chaise);backCushion.rotation.z=.56;
// Each page is a curved, layered surface with a distinct cover and central fold.
const book=new THREE.Group();book.name='open-curved-book';book.position.set(.16,.98,0);book.rotation.y=-.06;chaise.add(book);
function pageGeometry(side,offset=0){return geometryGrid(20,12,(u,w)=>{
 const x=-1.03+2.06*u,t=w,z=side*t*.86;
 const y=offset+.025+.085*Math.sin(t*Math.PI*.76)+.012*Math.sin(u*Math.PI)*t;
 return[x,y,z];
});}
for(const side of [-1,1]){
 const coverMaterial=m.cover.clone();coverMaterial.side=THREE.DoubleSide;
 mesh(pageGeometry(side,-.055),coverMaterial,0,0,0,book);
 for(let i=0;i<5;i++){
  const material=i===4?m.paper:m.paperEdge;const material2=material.clone();material2.side=THREE.DoubleSide;
  mesh(pageGeometry(side,-.025+i*.009),material2,0,0,0,book);
 }
 // Edge cross sections fill the thickness between the page layers.
 const ps=[],idx=[];
 for(let j=0;j<=20;j++){
  const u=j/20,x=-1.03+u*2.06,y=.025+.085*Math.sin(Math.PI*.76)+.012*Math.sin(u*Math.PI);
  ps.push(x,y+.012,side*.86,x,y-.04,side*.86);
  if(j<20){const a=j*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));g.setIndex(idx);g.computeVertexNormals();const o=mesh(g,m.paperEdge.clone(),0,0,0,book);o.material.side=THREE.DoubleSide;
}
tube([[-1.04,-.008,0],[0,-.005,0],[1.04,-.008,0]],.018,m.cover,book);
// A bookmark peeks out at the foot, without printed words on the pages.
const ribbon=box(1.09,-.018,-.35,.32,.015,.075,toon('#a5aa78'),book);ribbon.rotation.y=.1;

// A plump tabby sleeps on the open book. Stripes follow the actual body surface.
const cat=new THREE.Group();cat.name='sleeping-orange-tabby';chaise.add(cat);
const belly=new THREE.Group();belly.position.set(-.19,1.43,-.04);belly.name='breathing-belly';cat.add(belly);
ell(0,0,0,.88,.42,.52,m.orange,belly);
ell(.18,-.22,.13,.66,.22,.45,m.cream,belly);

function stripePatch(cx,cy,cz,sx,sy,sz,xCenter,width,parent,theta0=-1.5,theta1=1.5){
 const ps=[],ix=[];
 for(let i=0;i<=24;i++){
  const t=i/24,theta=THREE.MathUtils.lerp(theta0,theta1,t),taper=.28+.72*Math.sin(t*Math.PI);
  for(const side of [-1,1]){
   const x=xCenter+side*width*taper+Math.sin(theta*3)*.025;
   const radius=Math.sqrt(Math.max(.02,1-(x/sx)*(x/sx)));
   ps.push(cx+x,cy+sy*radius*Math.cos(theta)*1.012,cz+sz*radius*Math.sin(theta)*1.012);
  }
  if(i<24){const a=i*2;ix.push(a,a+2,a+1,a+1,a+2,a+3)}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));g.setIndex(ix);g.computeVertexNormals();const material=m.stripe.clone();material.side=THREE.DoubleSide;mesh(g,material,0,0,0,parent);
}
for(const x of [-.66,-.34,.02,.35,.62])stripePatch(0,0,0,.88,.42,.52,x,.055,belly,-1.75,1.75);
const headCenter=v(.70,1.34,.14);
ell(...headCenter.toArray(),.43,.36,.4,m.orange,cat);
for(const x of [-.23,-.045,.15])stripePatch(...headCenter.toArray(),.43,.36,.4,x,.032,cat,-1.2,1.0);
// Tucked forepaws and a pale cheek pressed into the paper.
ell(.86,1.11,.4,.29,.105,.16,m.cream,cat);
ell(.48,1.10,.56,.31,.10,.15,m.lightOrange,cat);
for(let i=0;i<3;i++)tube([[.91+i*.045,1.13,.48],[.94+i*.045,1.12,.51],[.96+i*.045,1.105,.52]],.006,m.stripe,cat,8);
const normal=v(.78,0,.625),tangent=v(-.625,0,.78);
function facePoint(side,up,forward){return headCenter.clone().addScaledVector(tangent,side).addScaledVector(normal,forward).add(v(0,up,0))}
function faceSurface(side,up,offset=.009){
 const sx=.43,sy=.36,sz=.4;
 const a=normal.x**2/sx**2+normal.z**2/sz**2;
 const b=2*side*(tangent.x*normal.x/sx**2+tangent.z*normal.z/sz**2);
 const c=side**2*(tangent.x**2/sx**2+tangent.z**2/sz**2)+up**2/sy**2-1;
 const forward=(-b+Math.sqrt(Math.max(0,b*b-4*a*c)))/(2*a)+offset;
 return facePoint(side,up,forward);
}
for(const side of [-1,1]){
 const cheek=facePoint(side*.095,-.1,.327);ell(...cheek.toArray(),.15,.11,.13,m.cream,cat);
 const pts=[[-.08,.014],[0,-.022],[.08,.014]].map(([s,y])=>faceSurface(side*.165+s,.045+y).toArray());tube(pts,.012,m.ink,cat,12);
 for(let i=0;i<3;i++){
  const a=facePoint(side*.13,-.105,.385),b=facePoint(side*(.32+i*.028),-.095+(i-1)*.055,.40),c=facePoint(side*(.43+i*.018),-.09+(i-1)*.08,.405);
  tube([a,b,c],.0055,m.paper,cat,10);
 }
}
const nose=facePoint(0,-.075,.423);ell(...nose.toArray(),.04,.025,.032,m.pink,cat);
const chin=facePoint(0,-.16,.36);ell(...chin.toArray(),.11,.055,.08,m.cream,cat);
// Ears have volume, rounded rims and inset pink faces, on separate pivots.
const ears=[];
for(const side of [-1,1]){
 const pivot=new THREE.Group();pivot.name=side<0?'left-ear':'right-ear';pivot.position.copy(facePoint(side*.255,.235,-.045));pivot.rotation.y=Math.atan2(normal.x,normal.z);pivot.rotation.z=side*.19;cat.add(pivot);
 const shape=new THREE.Shape();shape.moveTo(-.16,0);shape.quadraticCurveTo(-.13,.18,-.035,.35);shape.quadraticCurveTo(.015,.4,.055,.31);shape.lineTo(.16,0);shape.closePath();
 const g=new THREE.ExtrudeGeometry(shape,{depth:.10,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.023,bevelThickness:.022});
 mesh(g,m.orange,0,0,-.055,pivot);
 const inside=new THREE.Shape();inside.moveTo(-.105,.04);inside.lineTo(.105,.04);inside.lineTo(.012,.29);inside.closePath();
 mesh(new THREE.ShapeGeometry(inside),m.pink,0,0,.075,pivot);
 ears.push({g:pivot,rest:side*.19,at:-100});
}
const tailPoints=[[-.78,1.20,-.35],[-1.04,1.14,-.55],[-.79,1.12,-.75],[-.28,1.12,-.76],[.15,1.12,-.69],[.32,1.14,-.55]];
const tailCurve=new THREE.CatmullRomCurve3(tailPoints.map(p=>v(...p)));
mesh(new THREE.TubeGeometry(tailCurve,44,.105,10,false),m.orange,0,0,0,cat);
for(let i=0;i<7;i++){
 const t=.08+i*.12,pts=[];for(let j=0;j<=4;j++)pts.push(tailCurve.getPoint(t+j*.009));
 const c=new THREE.CatmullRomCurve3(pts);mesh(new THREE.TubeGeometry(c,5,.108,10,false),m.stripe,0,0,0,cat);
}
ell(.32,1.14,-.55,.105,.105,.105,m.cream,cat);

// A weathered footbridge reaches into the lake and ends in missing, split boards.
const bridge=new THREE.Group();bridge.name='broken-lakeside-bridge';
bridge.position.set(shoreX(-.8)-.95,.48,-.8);bridge.rotation.y=.18;scenery.add(bridge);
for(const z of [-.46,.46]){
 box(2.55,-.02,z,5.55,.15,.13,m.woodDark,bridge);
 for(const x of [.55,2.2,3.85]){
  const p=v(x,0,z).applyAxisAngle(v(0,1,0),bridge.rotation.y).add(bridge.position);
  const floor=bedY(p.x,p.z),bottom=Math.min(floor,-.5)-bridge.position.y;
  rod([x,bottom,z],[x,.27,z],.075,m.woodDark,bridge,.063);
 }
}
for(let i=0;i<22;i++){
 if(i===17||i===20)continue;
 const x=i*.245,broken=i>17;
 const plank=box(x,.115+(broken?R(-.04,.025):0),broken?R(-.06,.06):0,.21,.10,broken?R(.50,.92):1.13,i%3?m.wood:m.woodLight,bridge);
 if(broken){plank.rotation.z=R(-.10,.10);plank.rotation.y=R(-.13,.13)}
 for(const z of [-.42,.42])ell(x,.171,z,.012,.007,.012,m.woodDark,bridge);
}
for(const x of [.3,1.6,2.9,4.0]){
 rod([x,-.02,-.59],[x,1.0,-.59],.045,m.woodDark,bridge);
 if(x<3)rod([x,.88,-.59],[x+1.3,.88,-.59],.035,m.wood,bridge);
}
rod([4,.88,-.59],[4.48,.59,-.59],.032,m.wood,bridge);
for(let i=0;i<5;i++){
 const x=4.85+R(-.12,.35),z=R(-.44,.44);
 rod([x,.1,z],[x+R(.3,.6),R(-.06,.11),z+R(-.05,.05)],.018,m.woodLight,bridge,.006);
}
const fallen=box(4.43,-.36,.66,.23,.055,1.03,m.woodDark,bridge);fallen.rotation.set(.05,.20,-.14);
// Woven willow basket: rounded ribs, alternating weft, a narrow rim and handle.
const basket=new THREE.Group();basket.name='woven-fishing-basket';basket.position.set(3.65,.164,.08);bridge.add(basket);
const wicker=toon('#ba945c'),wickerLight=toon('#dbc18a'),basketDark=toon('#756649');
const basketRadius=y=>.23+.11*Math.sin(y/.64*Math.PI)-.035*y;
for(let level=0;level<14;level++){
 const y=.025+level*.043,r=basketRadius(y),pts=[];
 for(let i=0;i<=44;i++){const a=i/44*Math.PI*2;pts.push([Math.cos(a)*r,y,Math.sin(a)*r])}
 tube(pts,.014,level%3?wicker:wickerLight,basket,48);
}
for(let rib=0;rib<22;rib++){
 const a=rib/22*Math.PI*2,pts=[];
 for(let j=0;j<=18;j++){
  const y=j/18*.60,r=basketRadius(y)+.008*Math.cos(j*Math.PI);
  pts.push([Math.cos(a)*r,y,Math.sin(a)*r]);
 }
 tube(pts,.012,wickerLight,basket,22);
}
mesh(new THREE.CylinderGeometry(.23,.20,.035,24),basketDark,0,.018,0,basket);
const rim=mesh(new THREE.TorusGeometry(basketRadius(.6),.027,6,32),wickerLight,0,.61,0,basket);rim.rotation.x=Math.PI/2;
mesh(new THREE.CylinderGeometry(.17,.21,.09,24,1,true),basketDark,0,.53,0,basket);
tube([[-.23,.51,0],[-.31,.80,0],[0,.98,0],[.31,.80,0],[.23,.51,0]],.023,wicker,basket,28);
for(let i=0;i<3;i++){
 const rope=mesh(new THREE.TorusGeometry(.11+i*.027,.012,5,24),wickerLight,3.05,.185,.31,bridge);rope.rotation.x=Math.PI/2;
}

// Four visibly different fish profiles share baked colored geometry per species.
const fishMaterial=toon('#ffffff',{vertexColors:true,side:THREE.DoubleSide});
const fishSphere=new THREE.SphereGeometry(1,14,9);
const fishSpecies=[
 {name:'koi',base:'#eee1ad',accent:'#e88845',length:.48,height:.14,width:.19,size:[1.0,1.22],count:6},
 {name:'goldfish',base:'#efb94c',accent:'#e1893f',length:.35,height:.16,width:.17,size:[.65,.90],count:7},
 {name:'silverfish',base:'#cbdede',accent:'#6e9aab',length:.41,height:.10,width:.12,size:[.75,1.0],count:6},
 {name:'perch',base:'#9bb69c',accent:'#536f71',length:.36,height:.14,width:.15,size:[.80,1.02],count:5}
];
function fishGeometry(species,isTail=false){
 const parts=[];
 function add(g,color){
  let q=g.index?g.toNonIndexed():g;q.deleteAttribute('uv');
  if(!q.attributes.normal)q.computeVertexNormals();
  const colorValue=new THREE.Color(color),colors=[];
  for(let i=0;i<q.attributes.position.count;i++)colors.push(colorValue.r,colorValue.g,colorValue.b);
  q.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));parts.push(q);
 }
 function oval(x,y,z,sx,sy,sz,color){const g=fishSphere.clone();g.scale(sx,sy,sz);g.translate(x,y,z);add(g,color)}
 function fin(points,color){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));g.computeVertexNormals();add(g,color)}
 const {length:l,height:h,width:w}=species;
 if(isTail){
  const spread=species.name==='goldfish'?.23:.17;
  fin([[0,0,0],[-.30,.015,-spread],[-.22,0,0],[0,0,0],[-.22,0,0],[-.30,.015,spread]],species.accent);
 }else{
  oval(0,0,0,l,h,w,species.base);
  if(species.name==='koi'){
   oval(-.17,h*.79,.005,.16,.045,w*.80,species.accent);
   oval(.23,h*.65,-.02,.12,.055,w*.72,species.accent);
   oval(-.06,h*.86,-.07,.055,.035,.07,'#68716c');
  }else if(species.name==='perch'){
   for(const x of [-.19,-.03,.13])oval(x,h*.6,0,.032,.07,w*.92,species.accent);
  }else oval(-.03,h*.68,0,l*.8,.045,w*.72,species.accent);
  for(const side of [-1,1]){
   fin([[.04,-.015,side*w*.75],[-.15,-.035,side*(w+.16)],[-.12,0,side*w*.65]],species.accent);
   oval(l*.72,h*.18,side*w*.73,.029,.025,.025,'#eaf0d7');
   oval(l*.75,h*.2,side*(w*.73+.014),.017,.015,.014,'#354e4d');
  }
  fin([[.1,h*.85,0],[-.07,h+.12,0],[-.23,h*.72,0]],species.accent);
 }
 const merged=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());return merged;
}
const swimmingFish=[];
for(let speciesIndex=0;speciesIndex<fishSpecies.length;speciesIndex++){
 const species=fishSpecies[speciesIndex],bodyGeometry=fishGeometry(species),tailGeometry=fishGeometry(species,true);
 for(let i=0;i<species.count;i++){
  const fish=new THREE.Group();fish.name='swimming-fish';fish.userData.species=species.name;fish.scale.setScalar(R(...species.size));model.add(fish);
  const body=mesh(bodyGeometry,fishMaterial,0,0,0,fish);body.castShadow=false;
  const tail=new THREE.Group();tail.position.x=-species.length*.86;fish.add(tail);
  const tailMesh=mesh(tailGeometry,fishMaterial,0,0,0,tail);tailMesh.castShadow=false;
  const lane=R(.22,.73),amplitude=R(.065,.14),centerZ=R(-4.9,4.9),radiusZ=R(.7,1.55);
  swimmingFish.push({fish,body,tail,lane,amplitude,centerZ,radiusZ,phase:R(0,Math.PI*2),speed:R(.12,.24)*(speciesIndex%2?-1:1),depth:R(.14,.52)});
 }
}
function updateFish(t){
 for(const f of swimmingFish){
  const a=t*f.speed+f.phase,z=f.centerZ+Math.sin(a)*f.radiusZ,u=f.lane+Math.cos(a)*f.amplitude;
  const bank=shoreX(z)+.85,x=THREE.MathUtils.lerp(bank,7.2,u);
  const dz=Math.cos(a)*f.radiusZ*f.speed,du=-Math.sin(a)*f.amplitude*f.speed;
  const dx=shoreSlope(z)*dz*(1-u)+(7.2-bank)*du;
  f.fish.position.set(x,THREE.MathUtils.lerp(WATER_LEVEL-.38,bedY(x,z)+.24,f.depth)+Math.sin(t*.57+f.phase)*.025,z);
  f.fish.rotation.y=-Math.atan2(dz,dx);
  f.body.rotation.z=Math.sin(t*1.4+f.phase)*.025;
  f.tail.rotation.y=Math.sin(t*6.5+f.phase)*.33;
 }
}
updateFish(0);

// Batch the still life without baking the breathing belly or movable ears.
scenery.updateMatrixWorld(true);
const movable=new Set([belly,...ears.map(e=>e.g)]);
function animated(o){for(let p=o;p&&p!==scenery;p=p.parent)if(movable.has(p))return true;return false}
const mergeBatches=new Map(),remove=[];
scenery.traverse(o=>{
 if(!o.isMesh||o.isInstancedMesh||animated(o)||o.material.transparent)return;
 const key=o.material.uuid;
 if(!mergeBatches.has(key))mergeBatches.set(key,{material:o.material,gs:[]});
 mergeBatches.get(key).gs.push(o.geometry.clone().applyMatrix4(o.matrixWorld));remove.push(o);
});
for(const o of remove)o.removeFromParent();
for(const {material,gs} of mergeBatches.values()){
 const nonIndexed=gs.map(g=>g.index?g.toNonIndexed():g);
 const merged=mergeGeometries(nonIndexed,false);
 if(!merged)throw new Error('Failed to batch the lakeside geometry');
 mesh(merged,material,0,0,0,scenery);
 gs.forEach(g=>g.dispose());nonIndexed.forEach(g=>g.dispose());
}
// Sunlit particles stay sparse and quiet.
const pollenPositions=new Float32Array(30*3);
for(let i=0;i<30;i++){pollenPositions[i*3]=R(-7.5,-2.8);pollenPositions[i*3+1]=R(.6,5.5);pollenPositions[i*3+2]=R(-7,7)}
const pollenGeo=new THREE.BufferGeometry();pollenGeo.setAttribute('position',new THREE.BufferAttribute(pollenPositions,3));
const pollen=new THREE.Points(pollenGeo,new THREE.PointsMaterial({size:.025,color:0xfff4c0,transparent:true,opacity:.65,depthWrite:false}));pollen.name='pollen';model.add(pollen);
let startTime=null,nextEarAt=R(3,6),lastTime=0;
function updateScene(t){
 water.material.uniforms.time.value=t;
 updateFish(t);
 for(const {g,phase} of willowBoughs){
  g.rotation.z=Math.sin(t*.61+phase)*.014+Math.sin(t*.97+phase*1.8)*.004;
  g.rotation.x=Math.sin(t*.47+phase*1.3)*.009;
 }
 for(const {g,phase} of grassPatches){g.rotation.z=Math.sin(t*1.1+phase)*.009;g.rotation.x=Math.sin(t*.73+phase)*.006;}
 belly.scale.y=1+Math.sin(t*1.72)*.018;
 belly.scale.z=1+Math.sin(t*1.72)*.005;
 // One isolated flick every 3–6 s; occasionally the other follows with a delay.
 if(t>=nextEarAt){
  const side=random()>.5?0:1;ears[side].at=t;
  if(random()<.30)ears[1-side].at=t+R(.12,.22);
  nextEarAt=t+R(3,6);
 }
 for(const e of ears){const dt=t-e.at;const pulse=dt>=0&&dt<.42?Math.sin(dt/.42*Math.PI)**2*Math.sin(dt/.42*2.7*Math.PI)*.21:0;e.g.rotation.z=e.rest+pulse;}
 const dt=Math.min(Math.max(t-lastTime,0),.05);lastTime=t;
 for(let i=0;i<30;i++){pollenPositions[i*3+1]+=dt*.025;if(pollenPositions[i*3+1]>5.5)pollenPositions[i*3+1]=.6;}pollenGeo.attributes.position.needsUpdate=true;
}
for(const o of [...willowBoughs.map(a=>a.g),...grassPatches.map(a=>a.g),belly,...ears.map(a=>a.g)])if(o?.userData)o.userData.componentDynamic=true;
 for(const o of model.children)if(o.name==='swimming-fish')o.userData.componentDynamic=true;
 updateFish(0);belly.scale.y=belly.scale.z=1;
 return {model,water,update:updateScene,cat,trees:6,structures:0};
}
