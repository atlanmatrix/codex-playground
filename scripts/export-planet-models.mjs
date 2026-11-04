// Bake real scene geometry into compact static GLBs for the planet. Browser I/O is
// stubbed; modeling, transforms, instancing and the preview pose are real Three.js.
import {build} from 'esbuild';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {SCENES} from '../src/scene-registry.js';

const root=resolve(import.meta.dirname,'..'),out=join(root,'assets/planet-models');
const route=process.argv[2];
await mkdir(out,{recursive:true});
if(!route){
 for(const s of SCENES){const result=spawnSync(process.execPath,[import.meta.filename,s.route],{stdio:'inherit',cwd:root});if(result.status!==0)process.exit(result.status||1);}
 const models={};for(const s of SCENES)models[s.route]=JSON.parse(await readFile(join(out,`${s.route}.json`),'utf8'));
 await writeFile(join(out,'manifest.json'),JSON.stringify({version:1,models},null,2)+'\n');
 process.exit(0);
}
const spec=SCENES.find(s=>s.route===route);if(!spec)throw new Error('Unknown scene');
const temp=await mkdtemp(join(tmpdir(),'planet-model-'));
const realThree=JSON.stringify(pathToFileURL(join(root,'node_modules/three/build/three.module.js')).href);
const rendererStub=`export * from ${realThree};export class WebGLRenderer{constructor(){this.shadowMap={};this.domElement={setAttribute(){}}}setPixelRatio(r){this.ratio=r}getPixelRatio(){return this.ratio||1}setSize(){}setAnimationLoop(){}render(){}}`;
const controlsStub=`import {Vector3} from ${realThree};export class OrbitControls{constructor(){this.target=new Vector3()}update(){}}`;
const plugin={name:'planet-model-bake',setup(b){
 b.onResolve({filter:/^three$/},()=>({path:'three',namespace:'stub'}));
 b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:rendererStub,loader:'js',resolveDir:root}));
 b.onResolve({filter:/OrbitControls\.js$/},()=>({path:'controls',namespace:'controls'}));
 b.onLoad({filter:/.*/,namespace:'controls'},()=>({contents:controlsStub,loader:'js',resolveDir:root}));
 b.onResolve({filter:/EffectComposer\.js$/},()=>({path:'composer',namespace:'composer'}));
 b.onLoad({filter:/.*/,namespace:'composer'},()=>({contents:'export class EffectComposer{constructor(){this.passes=[]}addPass(p){this.passes.push(p)}setSize(){}setPixelRatio(){}render(){}}',loader:'js',resolveDir:root}));
 b.onResolve({filter:/^file:/},a=>({path:a.path,external:true}));
 b.onLoad({filter:new RegExp(`/src/${spec.entry}\\.js$`)},async a=>({contents:(await readFile(a.path,'utf8'))+'\nexport {model'+(route==='onsen'?',landY':'')+'};',loader:'js',resolveDir:join(root,'src')}));
}};
globalThis.innerWidth=960;globalThis.innerHeight=720;globalThis.devicePixelRatio=1;
globalThis.location={search:'?preview=1&time=day'};
globalThis.matchMedia=()=>({matches:true});globalThis.addEventListener=()=>{};
const context=new Proxy({createLinearGradient(){return{addColorStop(){}}}},{get:(o,k)=>k in o?o[k]:()=>{}});
globalThis.document={body:{appendChild(){},dataset:{},style:{setProperty(){}}},querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>({getContext:()=>context})};
try{
 await build({entryPoints:[join(root,`src/${spec.entry}.js`)],outfile:join(temp,'model.mjs'),bundle:true,platform:'node',format:'esm',plugins:[plugin]});
 const module=await import(pathToFileURL(join(temp,'model.mjs')));
 const {model}=module;
 model.updateMatrixWorld(true);
 const bins=[{positions:[],normals:[],colors:[],indices:[],vertices:new Map()},{positions:[],normals:[],colors:[],indices:[],vertices:new Map()}];
 let sourceMeshes=0,sourceTriangles=0;
 const transform=new THREE.Matrix4(),instance=new THREE.Matrix4(),normalMatrix=new THREE.Matrix3(),p=new THREE.Vector3(),normal=new THREE.Vector3(),instanceColor=new THREE.Color();
 const cell=route==='city'?.55:route==='study'?.28:.45;
 model.traverse(o=>{
  if(!o.isMesh||!o.geometry?.attributes.position)return;
  if(/square-.*section|transparent-ocean-section/.test(o.name))return;
  for(let parent=o;parent;parent=parent.parent)if(!parent.visible)return;
  const geo=o.geometry,pos=geo.attributes.position,norm=geo.attributes.normal,color=geo.attributes.color,index=geo.index;
  sourceMeshes++;const count=o.isInstancedMesh?o.count:1;
  for(let inst=0;inst<count;inst++){
   transform.copy(o.matrixWorld);instanceColor.setRGB(1,1,1);
   if(o.isInstancedMesh){o.getMatrixAt(inst,instance);transform.multiply(instance);if(o.instanceColor)o.getColorAt(inst,instanceColor);}
   normalMatrix.getNormalMatrix(transform);
   const materials=Array.isArray(o.material)?o.material:[o.material];
   const groups=Array.isArray(o.material)&&geo.groups.length?geo.groups:[{start:0,count:index?.count??pos.count,materialIndex:0}];
   for(const group of groups){
    const mat=materials[group.materialIndex||0];if(!mat||mat.visible===false||mat.opacity<.08)continue;
    const tint=o.isReflector?new THREE.Color('#7cb7b1'):mat.color||mat.uniforms?.color?.value||new THREE.Color('#81b7ba');
    const opacity=mat.transparent?Math.min(.85,mat.opacity??.5):1,bin=bins[opacity<1?1:0];
    const end=Math.min(group.start+group.count,index?.count??pos.count);
    const start=Math.max(group.start,geo.drawRange.start),limit=Math.min(end,geo.drawRange.start+geo.drawRange.count);
    for(let at=start;at+2<limit;at+=3){
     sourceTriangles++;const tri=[];
     for(let corner=0;corner<3;corner++){
      const i=index?index.getX(at+corner):at+corner;
      p.fromBufferAttribute(pos,i).applyMatrix4(transform);
      if(!Number.isFinite(p.x+p.y+p.z)||Math.abs(p.x)>64.1||Math.abs(p.z)>64.1){tri.length=0;break;}
      // Vertex clustering removes subpixel detail while retaining original shapes,
      // colors, the complete 128-unit world and distinctive original landmarks.
      const px=Math.round(p.x/cell),py=Math.round(p.y/cell),pz=Math.round(p.z/cell);
      normal.set(norm?norm.getX(i):0,norm?norm.getY(i):1,norm?norm.getZ(i):0).applyNormalMatrix(normalMatrix);
      const nx=Math.round(normal.x*3),ny=Math.round(normal.y*3),nz=Math.round(normal.z*3);
      const red=Math.round(THREE.MathUtils.clamp(tint.r*instanceColor.r*(mat.vertexColors&&color?color.getX(i):1),0,1)*255);
      const green=Math.round(THREE.MathUtils.clamp(tint.g*instanceColor.g*(mat.vertexColors&&color?color.getY(i):1),0,1)*255);
      const blue=Math.round(THREE.MathUtils.clamp(tint.b*instanceColor.b*(mat.vertexColors&&color?color.getZ(i):1),0,1)*255);
      const key=`${px},${py},${pz},${nx},${ny},${nz},${red>>3},${green>>3},${blue>>3}`;
      let id=bin.vertices.get(key);
      if(id===undefined){id=bin.positions.length/3;bin.vertices.set(key,id);bin.positions.push(px*cell,py*cell,pz*cell);bin.normals.push(normal.x,normal.y,normal.z);bin.colors.push(red,green,blue,Math.round(opacity*255));}
      tri.push(id);
     }
     if(tri.length===3){const [a,b,c]=tri;const ps=bin.positions;
      const ax=ps[b*3]-ps[a*3],ay=ps[b*3+1]-ps[a*3+1],az=ps[b*3+2]-ps[a*3+2],bx=ps[c*3]-ps[a*3],by=ps[c*3+1]-ps[a*3+1],bz=ps[c*3+2]-ps[a*3+2];
      if(Math.hypot(ay*bz-az*by,az*bx-ax*bz,ax*by-ay*bx)>cell*cell*.08)bin.indices.push(a,b,c);
     }
    }
   }
  }
 });
 // Compact unused clustered vertices, serialize an ordinary standards-based GLB.
 const chunks=[],bufferViews=[],accessors=[],primitives=[];let offset=0;
 function accessor(array,itemSize,type,normalized=false,bounds=false){
  const pad=(4-offset%4)%4;if(pad){chunks.push(Buffer.alloc(pad));offset+=pad;}
  const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength),view=bufferViews.length;bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length});chunks.push(bytes);offset+=bytes.length;
  const acc={bufferView:view,componentType:type,count:array.length/itemSize,type:{1:'SCALAR',3:'VEC3',4:'VEC4'}[itemSize]};if(normalized)acc.normalized=true;
  if(bounds){acc.min=[Infinity,Infinity,Infinity];acc.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<array.length;i++) {const axis=i%itemSize;acc.min[axis]=Math.min(acc.min[axis],array[i]);acc.max[axis]=Math.max(acc.max[axis],array[i]);}}
  accessors.push(acc);return accessors.length-1;
 }
 let triangles=0,vertices=0;
 for(const [material,b] of bins.entries()){
  if(!b.indices.length)continue;
  // Large original floor/base triangles need subdivisions before spherical bending.
  // Otherwise their corners move down while the unsplit center cuts through the globe.
  const refined=[],midpoints=new Map();
  const distance=(a,c)=>(b.positions[a*3]-b.positions[c*3])**2+(b.positions[a*3+2]-b.positions[c*3+2])**2;
  function midpoint(a,c){
   const key=a<c?`${a},${c}`:`${c},${a}`;let id=midpoints.get(key);if(id!==undefined)return id;
   id=b.positions.length/3;midpoints.set(key,id);
   for(let k=0;k<3;k++)b.positions.push((b.positions[a*3+k]+b.positions[c*3+k])/2);
   const n=new THREE.Vector3(b.normals[a*3]+b.normals[c*3],b.normals[a*3+1]+b.normals[c*3+1],b.normals[a*3+2]+b.normals[c*3+2]).normalize();b.normals.push(n.x,n.y,n.z);
   for(let k=0;k<4;k++)b.colors.push(Math.round((b.colors[a*4+k]+b.colors[c*4+k])/2));return id;
  }
  function subdivide(a,c,d){
   const ac=distance(a,c),cd=distance(c,d),da=distance(d,a),longest=Math.max(ac,cd,da);
   if(longest<=64){refined.push(a,c,d);return;}
   if(longest===ac){const m=midpoint(a,c);subdivide(a,m,d);subdivide(m,c,d);}
   else if(longest===cd){const m=midpoint(c,d);subdivide(a,c,m);subdivide(a,m,d);}
   else{const m=midpoint(d,a);subdivide(a,c,m);subdivide(m,c,d);}
  }
  for(let i=0;i<b.indices.length;i+=3)subdivide(b.indices[i],b.indices[i+1],b.indices[i+2]);
  b.indices=refined;
  const used=new Map(),positions=[],normals=[],colors=[],indices=[];
  for(const old of b.indices){let id=used.get(old);if(id===undefined){id=used.size;used.set(old,id);positions.push(...b.positions.slice(old*3,old*3+3));normals.push(...b.normals.slice(old*3,old*3+3));colors.push(...b.colors.slice(old*4,old*4+4));}indices.push(id);}
  const attribute={POSITION:accessor(new Float32Array(positions),3,5126,false,true),NORMAL:accessor(new Float32Array(normals),3,5126),COLOR_0:accessor(new Uint8Array(colors),4,5121,true)};
  primitives.push({attributes:attribute,indices:accessor(new Uint32Array(indices),1,5125),material});triangles+=indices.length/3;vertices+=positions.length/3;
 }
 const metadata={route,source_sha256:createHash('sha256').update(await readFile(join(root,route,'index.html'))).digest('hex'),sourceMeshes,sourceTriangles,triangles,vertices,baseSize:128,pose:'static-daylight-preview',cell};
 const data={asset:{version:'2.0',generator:'Little Worlds original-scene globe baker'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0,name:`${route}-planet-model`,extras:metadata}],meshes:[{primitives}],materials:[{doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:1}},{doubleSided:true,alphaMode:'BLEND',pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:1}}],buffers:[{byteLength:offset}],bufferViews,accessors};
 const json=Buffer.from(JSON.stringify(data));const jsonPad=Buffer.alloc((4-json.length%4)%4,32),binPad=Buffer.alloc((4-offset%4)%4);
 const binary=Buffer.concat([...chunks,binPad]),jsonBytes=Buffer.concat([json,jsonPad]);
 const head=Buffer.alloc(12);head.writeUInt32LE(0x46546c67);head.writeUInt32LE(2,4);head.writeUInt32LE(12+8+jsonBytes.length+8+binary.length,8);
 const jh=Buffer.alloc(8);jh.writeUInt32LE(jsonBytes.length);jh.writeUInt32LE(0x4e4f534a,4);const bh=Buffer.alloc(8);bh.writeUInt32LE(binary.length);bh.writeUInt32LE(0x004e4942,4);
 const bytes=Buffer.concat([head,jh,jsonBytes,bh,binary]);
 const compressed=gzipSync(bytes,{level:9});
 await writeFile(join(out,`${route}.glb.gz`),compressed);
 const dimension=129,heights=new Float32Array(dimension*dimension*2);
 const core=route==='onsen'?module.landY:model.userData.terrainHeight;
 const expansion=model.userData.expansion.height;
 for(let j=0;j<dimension;j++)for(let i=0;i<dimension;i++){
  const x=i-64,z=j-64,at=j*dimension+i,external=expansion(x,z);
  const original=core?core(x,z):external;
  const d=Math.hypot(x,z),mix=THREE.MathUtils.smoothstep(d,12,27);
  heights[at]=core&&Math.max(Math.abs(x),Math.abs(z))<=16?original:external;
  heights[at+dimension*dimension]=core?THREE.MathUtils.lerp(original,external,mix):external;
 }
 const heightBytes=Buffer.from(heights.buffer),heightFile=`assets/planet-models/${route}.height.bin`;
 await writeFile(join(root,heightFile),heightBytes);
 const record={...metadata,heightFile,heightDimension:dimension,heightSha256:createHash('sha256').update(heightBytes).digest('hex'),file:`assets/planet-models/${route}.glb.gz`,bytes:compressed.length,uncompressedBytes:bytes.length,sha256:createHash('sha256').update(compressed).digest('hex')};
 await writeFile(join(out,`${route}.json`),JSON.stringify(record,null,2)+'\n');
 console.log(JSON.stringify(record));
}finally{await rm(temp,{recursive:true,force:true});}
