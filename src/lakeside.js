import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const preview=new URLSearchParams(location.search).has('preview');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene=new THREE.Scene();
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,preview?.85:1.8));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.06;
document.body.appendChild(renderer.domElement);
renderer.domElement.setAttribute('role','img');
renderer.domElement.setAttribute('aria-label','柳荫下的湖畔午睡，可以拖拽旋转和缩放的三维微缩景观');
const camera=new THREE.PerspectiveCamera(33,innerWidth/innerHeight,.35,240);
const controls=new OrbitControls(camera,renderer.domElement);
controls.target.set(-.7,1.4,0);controls.enabled=!preview;
controls.enableDamping=true;controls.dampingFactor=.065;controls.enablePan=false;
controls.minDistance=17;controls.maxDistance=160;
controls.minPolarAngle=.22;controls.maxPolarAngle=Math.PI*.445;
const fitDistance=aspect=>Math.max(34,36/aspect);
function frame(){const d=fitDistance(camera.aspect);camera.position.set(d*.66,1.4+d*.62,d*.73);camera.lookAt(controls.target)}
frame();
scene.add(new THREE.HemisphereLight(0xf1fcff,0x819663,2.0));
const sun=new THREE.DirectionalLight(0xffefc5,3.1);sun.position.set(-5,16,9);sun.castShadow=true;
sun.shadow.mapSize.set(preview?1024:2048,preview?1024:2048);
Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-11,near:.5,far:40});
sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;sun.shadow.radius=3;scene.add(sun);
const blueFill=new THREE.DirectionalLight(0xc2e8f3,.75);blueFill.position.set(10,8,-8);scene.add(blueFill);
const model=new THREE.Group();model.name='lakeside-miniature';scene.add(model);
const scenery=new THREE.Group();scenery.name='static-landscape';model.add(scenery);
let seed=163807;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const R=(a,b)=>a+random()*(b-a),pick=a=>a[Math.floor(random()*a.length)];
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
const ramp=new THREE.DataTexture(new Uint8Array([95,146,192,225,248,255]),6,1,THREE.RedFormat);ramp.needsUpdate=true;ramp.minFilter=ramp.magFilter=THREE.NearestFilter;
const toon=(color,extra={})=>new THREE.MeshToonMaterial({color,gradientMap:ramp,...extra});
const m={soil:toon('#8e7550'),deep:toon('#6d684d'),sand:toon('#d4c59a'),stone:toon('#c6cab1'),stone2:toon('#9eada5'),trunk:toon('#8f8261'),bark:toon('#b0a17c'),twig:toon('#829258'),wood:toon('#c2a575'),woodDark:toon('#a38759'),woodLight:toon('#dbc398'),cushion:toon('#f0e4c5'),cushionEdge:toon('#d6cba9'),paper:toon('#fff4d9'),paperEdge:toon('#e2d4b2'),cover:toon('#a89165'),orange:toon('#eda347'),lightOrange:toon('#f4bc68'),stripe:toon('#bb7136'),cream:toon('#fae0ab'),pink:toon('#d79787'),ink:toon('#735347')};
const leafMats=['#64a36a','#86bc73','#afd08a'].map(c=>toon(c,{side:THREE.DoubleSide}));
const grassMats=['#7ead62','#96bb6b','#b1cd7d'].map(c=>toon(c,{side:THREE.DoubleSide}));
const geo={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.SphereGeometry(1,24,16),stone:new THREE.IcosahedronGeometry(1,1),leaf:new THREE.BufferGeometry(),grass:new THREE.BufferGeometry()};
geo.leaf.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.03,-.12,.012,0,-.34,0,0,0,0,0,-.34,0,.032,-.12,.012],3));geo.leaf.computeVertexNormals();
geo.grass.setAttribute('position',new THREE.Float32BufferAttribute([-.023,0,0,.023,0,0,.04,.19,.015,-.023,0,0,.04,.19,.015,0,.2,.015,0,.2,.015,.04,.19,.015,.09,.4,.01],3));geo.grass.computeVertexNormals();
function mesh(g,material,x=0,y=0,z=0,parent=scenery){const o=new THREE.Mesh(g,material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function box(x,y,z,w,h,d,material,parent=scenery){const o=mesh(geo.box,material,x,y,z,parent);o.scale.set(w,h,d);return o}
function ell(x,y,z,sx,sy,sz,material,parent=scenery){const o=mesh(geo.sphere,material,x,y,z,parent);o.scale.set(sx,sy,sz);return o}
function tube(points,r,material,parent=scenery,segments=24){const c=new THREE.CatmullRomCurve3(points.map(p=>Array.isArray(p)?v(...p):p));return mesh(new THREE.TubeGeometry(c,segments,r,6,false),material,0,0,0,parent)}
function rod(a,b,r,material,parent=scenery,rTop=r){const from=v(...a),to=v(...b),delta=to.clone().sub(from);const o=mesh(new THREE.CylinderGeometry(rTop,r,delta.length(),8),material,0,0,0,parent);o.position.copy(from.add(to).multiplyScalar(.5));o.quaternion.setFromUnitVectors(v(0,1,0),delta.normalize());return o}
const dummy=new THREE.Object3D();
function instances(g,material,items,parent=scenery,shadow=true){const o=new THREE.InstancedMesh(g,material,items.length);for(let i=0;i<items.length;i++){const a=items[i];dummy.position.set(...a.p);dummy.scale.set(...(a.s||[1,1,1]));dummy.rotation.set(...(a.r||[0,0,0]));dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix)}o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o}
const shoreX=z=>-4.02+.48*Math.sin(z*.48)+.19*Math.cos(z*.91);
const landY=(x,z)=>{const t=THREE.MathUtils.clamp((shoreX(z)-x)/3.7,0,1);return .19+.39*Math.sin(t*1.5)+.045*Math.sin(z*1.4+x)*Math.sin(t*Math.PI)};
function geometryGrid(nx,nz,position,color){const ps=[],cs=[],ix=[];for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const p=position(i/nx,j/nz);ps.push(...p);if(color)cs.push(...color(p,i/nx,j/nz))}for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;ix.push(a,c,b,b,c,d)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));if(color)g.setAttribute('color',new THREE.Float32BufferAttribute(cs,3));g.setIndex(ix);g.computeVertexNormals();return g}
function sideStrip(points,material,bottom=-1.14){const ps=[],ix=[];for(const p of points)ps.push(p[0],p[1],p[2],p[0],bottom,p[2]);for(let i=0;i<points.length-1;i++){const a=i*2;ix.push(a,a+1,a+2,a+1,a+3,a+2)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));g.setIndex(ix);g.computeVertexNormals();const o=mesh(g,material);o.material.side=THREE.DoubleSide;return o}
// The base has one structural bottom; soil and water occupy separate footprints.
box(0,-1.25,0,16,.22,16,m.deep);
const turfColor=new THREE.Color();
const terrain=geometryGrid(24,80,(u,w)=>{const z=-8+16*w,x=THREE.MathUtils.lerp(-8,shoreX(z),u);return[x,landY(x,z),z]},(p,u)=>{turfColor.set('#8caf69').lerp(new THREE.Color('#bbcc84'),Math.max(0,1-u)*.35+.06*Math.sin(p[2]*2));return turfColor.toArray()});
mesh(terrain,toon('#ffffff',{vertexColors:true}));
const landLeft=[],landFront=[],landBack=[];
for(let i=0;i<=80;i++){const z=-8+i*.2;landLeft.push([-8,landY(-8,z),z])}
for(let i=0;i<=24;i++){for(const [z,list] of [[8,landFront],[-8,landBack]]){const x=THREE.MathUtils.lerp(-8,shoreX(z),i/24);list.push([x,landY(x,z),z])}}
sideStrip(landLeft,m.soil);sideStrip(landFront,m.soil);sideStrip(landBack,m.soil);
const bed=geometryGrid(75,80,(u,w)=>{const z=-8+16*w,x=THREE.MathUtils.lerp(shoreX(z),8,u);const depth=THREE.MathUtils.smoothstep(u,0,.30);return[x,.07-depth*1.16,z]},(p,u)=>{const c=new THREE.Color('#dbcfa8').lerp(new THREE.Color('#387f8e'),THREE.MathUtils.smoothstep(u,0,.45));return c.toArray()});
mesh(bed,toon('#ffffff',{vertexColors:true}));
const waterSide=new THREE.ShaderMaterial({side:THREE.DoubleSide,vertexShader:`varying float h;varying vec3 p;void main(){h=position.y;p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying float h;varying vec3 p;void main(){float f=smoothstep(-1.14,.16,h);vec3 c=mix(vec3(.16,.43,.49),vec3(.40,.76,.78),f);c+=.018*sin(p.x*3.+p.z*2.);gl_FragColor=vec4(c,1.);}`});
sideStrip([[8,.16,-8],[8,.16,8]],waterSide);
for(const z of [-8,8]){const pts=[];for(let i=0;i<=60;i++)pts.push([THREE.MathUtils.lerp(shoreX(z),8,i/60),.16,z]);sideStrip(pts,waterSide)}
const ground=mesh(new THREE.PlaneGeometry(150,150),new THREE.ShadowMaterial({opacity:.13}),0,-1.39,0,scene);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
// Embedded aggregate and exposed willow roots on the soil section.
const stones=[[],[]];
for(let i=0;i<120;i++){const front=random()>.5,z=front?8.012:-8.012,x=R(-7.9,shoreX(z)-.1);stones[i%2].push({p:[x,R(-1.04,.12),z],s:[R(.04,.12),R(.025,.08),R(.035,.08)],r:[R(0,3),R(0,3),R(0,3)]});}
for(let i=0;i<90;i++)stones[i%2].push({p:[-8.012,R(-1.04,.25),R(-7.85,7.85)],s:[R(.04,.1),R(.03,.08),R(.04,.13)],r:[R(0,3),R(0,3),R(0,3)]});
for(let i=0;i<2;i++)instances(geo.stone,i?m.stone:m.stone2,stones[i]);
for(let i=0;i<13;i++){const z=R(-7.7,7.7);tube([[-7.8,.1,z],[-8.025,-.3,z+.1],[-8.035,-.65,z+.28],[-8.02,-1.05,z+.17]],R(.018,.04),m.trunk)}
// Actual pebbles beneath the translucent shallows, plus emergent shoreline stones.
const pebbleBatches=[[],[],[]];
for(let i=0;i<200;i++){const z=R(-7.8,7.8),d=R(.05,1.38),x=shoreX(z)+d;const u=d/(8-shoreX(z)),y=.07-THREE.MathUtils.smoothstep(u,0,.30)*1.16;pebbleBatches[i%3].push({p:[x,y+.035,z],s:[R(.04,.16),R(.025,.065),R(.05,.17)],r:[R(-.3,.3),R(0,6.28),R(-.3,.3)]})}
for(let i=0;i<3;i++)instances(geo.stone,[m.stone,m.stone2,m.sand][i],pebbleBatches[i]);
for(let i=0;i<28;i++){const z=R(-7.8,7.8),x=shoreX(z)-R(.03,.24),s=R(.07,.18);ell(x,landY(x,z)+.03,z,s,s*.55,s*.8,i%2?m.stone:m.stone2)}

// A planar reflection of the real willows, broken by independent wave trains.
const waterShape=new THREE.Shape();waterShape.moveTo(8,8);waterShape.lineTo(8,-8);for(let i=80;i>=0;i--){const z=-8+i*.2;waterShape.lineTo(shoreX(z),-z)}waterShape.closePath();
const waterUniforms={time:{value:0},color:{value:new THREE.Color('#8acfd0')},tDiffuse:{value:null},textureMatrix:{value:new THREE.Matrix4()}};
const water=new Reflector(new THREE.ShapeGeometry(waterShape),{
 textureWidth:preview?512:1024,textureHeight:preview?512:1024,clipBias:.002,
 shader:{uniforms:waterUniforms,
 vertexShader:`uniform mat4 textureMatrix;varying vec4 mirrorCoord;varying vec3 worldP;void main(){vec4 wp=modelMatrix*vec4(position,1.);worldP=wp.xyz;mirrorCoord=textureMatrix*vec4(position,1.);gl_Position=projectionMatrix*viewMatrix*wp;}`,
 fragmentShader:`uniform float time;uniform vec3 color;uniform sampler2D tDiffuse;varying vec4 mirrorCoord;varying vec3 worldP;
 float shore(float z){return -4.02+.48*sin(z*.48)+.19*cos(z*.91);}
 float waves(vec2 p){return sin(dot(p,vec2(1.4,.72))*5.2+time*.58)*.45+sin(dot(p,vec2(-.64,1.18))*8.1-time*.72)*.28+sin(dot(p,vec2(1.12,-.9))*13.3+time*.39)*.14+sin(length(p-vec2(-2.,2.))*7.-time*.8)*.13;}
 void main(){vec2 p=worldP.xz;float d=max(0.,p.x-shore(p.y));float depth=smoothstep(0.,4.7,d);float w=waves(p);vec2 slope=vec2(waves(p+vec2(.025,0.))-w,waves(p+vec2(0.,.025))-w);vec2 uv=mirrorCoord.xy/mirrorCoord.w+slope*.028;vec4 reflection=texture2D(tDiffuse,clamp(uv,.001,.999));vec3 sky=mix(vec3(.64,.85,.90),vec3(.91,.95,.86),.4+.22*sin(p.y*.23+p.x*.1));vec3 reflected=mix(sky,reflection.rgb,reflection.a);vec3 base=mix(vec3(.48,.79,.72),vec3(.16,.54,.69),depth);vec3 c=mix(base,reflected,.24+.13*depth);float thread=smoothstep(.62,.91,w)*.032;c+=vec3(thread*.65,thread,thread);float band=exp(-pow((d-1.9-p.y*.11)/1.15,2.))*smoothstep(-7.,-3.,p.y)*(1.-smoothstep(4.8,8.,p.y));float fleck=smoothstep(.50,.83,waves(p*vec2(1.5,2.6)+vec2(time*.07,0.)));float fine=smoothstep(.05,.29,sin(p.x*32.+p.y*19.+w*3.7+time*.9));float glint=band*fleck*fine;c=mix(c,vec3(1.,.88,.53),glint*.70);c+=vec3(1.,.91,.67)*glint*.09;gl_FragColor=vec4(c,mix(.32,.93,depth));
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`}
});
water.name='reflective-lake';water.rotation.x=-Math.PI/2;water.position.y=.16;
water.material.transparent=true;water.material.depthWrite=false;water.renderOrder=3;water.castShadow=false;water.receiveShadow=false;model.add(water);

// Grass patches bend independently; their shallow pivots keep roots planted.
const grassPatches=[];
for(let k=0;k<18;k++){
 const z=-7.6+k*.88,x=(-8+shoreX(z))/2;
 const patch=new THREE.Group();patch.position.set(x,landY(x,z),z);patch.name='breeze-grass';model.add(patch);
 const batches=[[],[],[]];
 for(let i=0;i<64;i++){
  const pz=z+R(-.43,.43);if(Math.abs(pz)>7.88)continue;
  const px=R(-7.9,shoreX(pz)-.04);
  // Leave the chaise's footprint open and legible.
  if(px>-7.5&&px<-3.8&&pz>-1.1&&pz<1.85)continue;
  for(let j=0;j<3;j++)batches[i%3].push({p:[px-x,landY(px,pz)-patch.position.y,pz-z],s:[R(.65,1.15),R(.4,1.0),1],r:[0,R(0,6.28),R(-.18,.18)]});
 }
 for(let i=0;i<3;i++)if(batches[i].length)instances(geo.grass,grassMats[i],batches[i],patch,false);
 grassPatches.push({g:patch,phase:R(0,6.28)});
}
const flowerMats=['#f5e8ae','#e5ebd4','#d8b5c7'].map(c=>toon(c));
const flowerBatches=flowerMats.map(()=>[]);
for(let i=0;i<70;i++){
 const z=R(-7.7,7.7),x=R(-7.8,shoreX(z)-.2);
 if(x>-7.5&&x<-3.8&&z>-1.1&&z<1.85)continue;
 const y=landY(x,z),h=R(.12,.28);rod([x,y,z],[x+.015,y+h,z],.008,m.twig);
 for(let j=0;j<5;j++){const a=j/5*6.28;flowerBatches[i%3].push({p:[x+Math.cos(a)*.035,y+h,z+Math.sin(a)*.035],s:[.04,.017,.04]})}
}
flowerBatches.forEach((items,i)=>instances(geo.stone,flowerMats[i],items));
// A small amount of submerged ribbon grass is visible through shallow water.
for(let i=0;i<18;i++){
 const z=R(-7.6,7.6),x=shoreX(z)+R(.25,.75),u=(x-shoreX(z))/(8-shoreX(z));
 const y=.07-THREE.MathUtils.smoothstep(u,0,.3)*1.16;
 for(let j=0;j<3;j++)tube([[x+j*.035,y,z],[x+.08,y+.12,z+.03],[x+.14,y+.25,z+.08]],.013,leafMats[0]);
}
const willowBoughs=[];
function willow(x,z,height,span,phase){
 const y=landY(x,z);
 tube([[x,y,z],[x+.08,y+1.2,z+.03],[x+.4,y+2.8,z-.13],[x+.75,y+height*.78,z+.08],[x+1.0,y+height*.93,z]],.19,m.trunk);
 // Fluted bark and long surface roots give the trunk a readable silhouette.
 for(let i=0;i<4;i++){
  const a=i/4*6.28;
  tube([[x+Math.cos(a)*.17,y,z+Math.sin(a)*.17],[x+.1+Math.cos(a)*.14,y+1.5,z+Math.sin(a)*.15],[x+.45+Math.cos(a)*.09,y+3,z-.13]],.026,m.bark);
 }
 for(let i=0;i<7;i++){
  const a=i/7*6.28,dx=Math.cos(a),dz=Math.sin(a),ex=THREE.MathUtils.clamp(x+dx*R(.7,1.35),-7.97,shoreX(z)-.1),ez=THREE.MathUtils.clamp(z+dz*.9,-7.9,7.9);
  tube([[x,y+.1,z],[x+dx*.4,landY(x+dx*.4,z+dz*.3)+.04,z+dz*.3],[ex,landY(ex,ez)+.02,ez]],.045,m.trunk);
 }
 for(let k=0;k<9;k++){
  const a=k/9*6.28;
  const endX=THREE.MathUtils.clamp(x+.7+Math.cos(a)*span,-7.55,shoreX(z)+1.05);
  const endZ=THREE.MathUtils.clamp(z+Math.sin(a)*span,-7.5,7.5);
  const endY=y+height+R(-.45,.25);
  tube([[x+.4,y+height*.56,z],[x+.7,y+height*.86,z],[THREE.MathUtils.lerp(x+.7,endX,.55),endY+.15,THREE.MathUtils.lerp(z,endZ,.55)],[endX,endY,endZ]],.047,m.trunk);
  const bough=new THREE.Group();bough.position.set(endX,endY,endZ);bough.name='swaying-willow';model.add(bough);
  const leaves=[[],[],[]],strings=[];
  for(let j=0;j<6;j++){
   const dx=R(-.32,.32),dz=R(-.34,.34);
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
  for(let j=0;j<3;j++)instances(geo.leaf,leafMats[j],leaves[j],bough,true);
  willowBoughs.push({g:bough,phase:phase+k*.73});
 }
}
willow(-6.65,-4.25,5.15,1.75,.2);
willow(-6.5,5.1,5.75,1.95,2.5);
willow(-7.05,-7.0,3.7,1.05,4.1);

// The chaise faces the water (+local X). Broad slats and piping remain readable.
const chaise=new THREE.Group();chaise.name='chaise-book-and-sleeping-cat';chaise.position.set(-5.58,landY(-5.58,.35),.35);chaise.rotation.y=.13;scenery.add(chaise);
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
function renderFrame(ms){
 if(startTime===null)startTime=ms;
 const t=(ms-startTime)*.001;
 controls.update();
 if(!reduced&&!preview)updateScene(t);
 renderer.render(scene,camera);
}
if(preview){renderFrame(0)}else{renderer.setAnimationLoop(renderFrame)}
addEventListener('resize',()=>{
 const aspect=innerWidth/innerHeight,factor=fitDistance(aspect)/fitDistance(camera.aspect);
 camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);
 camera.aspect=aspect;camera.updateProjectionMatrix();
 renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,preview?.85:1.8));
 if(preview)renderFrame(0);
});
