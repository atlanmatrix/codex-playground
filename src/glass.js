import * as THREE from 'three';
import {createGlassMotion} from './glass-motion.js';
import {BENCH_TOP, FLOOR_TOP, GLASS_Z, createPottingBench, createPlantPot, createWindowFrame} from './glass-structure.js';

const host = document.querySelector('#glass-view');
const preview = new URLSearchParams(location.search).get('preview') === '1';
const renderer = new THREE.WebGLRenderer({antialias: true, powerPreference: 'low-power'});
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.setAttribute('aria-hidden', 'true');
host.append(renderer.domElement);

const garden = new THREE.Scene();
garden.background = new THREE.Color('#d9dbbc');
garden.fog = new THREE.Fog('#c9d1ae', 10, 22);
const foreground = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(44, 1, .1, 40);
camera.position.set(.12, .3, 7.4);
const focus = new THREE.Vector3(0, .25, -1.7);
camera.lookAt(focus);
const sceneTarget = new THREE.WebGLRenderTarget(1, 1, {type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter});
sceneTarget.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
sceneTarget.depthTexture.minFilter = THREE.NearestFilter;
sceneTarget.depthTexture.magFilter = THREE.NearestFilter;

garden.add(new THREE.HemisphereLight('#f4f3ce', '#40503a', 2.5));
const sun = new THREE.DirectionalLight('#fff0c0', 4.4);
sun.position.set(-7, 6, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, {left: -9, right: 9, top: 8, bottom: -7, near: .1, far: 25});
sun.shadow.bias = -.001;
sun.shadow.normalBias = .025;
garden.add(sun);
const fill = new THREE.DirectionalLight('#b9d5c4', .65);
fill.position.set(4, 1, -2);
garden.add(fill);

let seed = 73;
function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
const material = (color, roughness = .9) => new THREE.MeshStandardMaterial({color, roughness});
function box(parent, name, size, position, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
box(garden, 'plaster-wall', [28, 20, .2], [0, 3, -6.1], material('#cccdb0'));
const floor = box(garden, 'floor', [28, .18, 18], [0, FLOOR_TOP - .09, -4.5], material('#969a79'));
box(garden, 'right-shadow-wall', [.3, 15, 14], [7.5, 2, -6], material('#6a7560'));
const bench = createPottingBench(garden);
const shadowCanvas = document.createElement('canvas');
shadowCanvas.width = shadowCanvas.height = 128;
const shadowContext = shadowCanvas.getContext('2d');
const shadowGradient = shadowContext.createRadialGradient(64, 64, 12, 64, 64, 64);
shadowGradient.addColorStop(0, 'rgba(28,32,20,.48)');
shadowGradient.addColorStop(.6, 'rgba(28,32,20,.28)');
shadowGradient.addColorStop(1, 'rgba(28,32,20,0)');
shadowContext.fillStyle = shadowGradient;
shadowContext.fillRect(0, 0, 128, 128);
const contactTexture = new THREE.CanvasTexture(shadowCanvas);
const contactMaterial = new THREE.MeshBasicMaterial({map: contactTexture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1});

// The blades are curved geometry with per-vertex veins and irregular lobes.
const leafMaterial = new THREE.MeshStandardMaterial({vertexColors: true, side: THREE.DoubleSide, roughness: .52, metalness: .02});
const plants = [];
function leafGeometry(length, width, hue, lobed) {
  const positions = [], colors = [], uvs = [], indices = [];
  const rows = 22, columns = 10;
  const base = new THREE.Color().setHSL(hue, .37 + random() * .15, .16 + random() * .12);
  const age = random() > .86;
  if (age) base.setHSL(.16, .43, .35);
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    const silhouette = Math.pow(Math.sin(Math.PI * t), .72) * (lobed ? 1 - .33 * Math.pow(Math.sin(t * Math.PI * 6), 8) : 1);
    for (let col = 0; col <= columns; col++) {
      const s = col / columns * 2 - 1;
      positions.push(s * width * silhouette, t * length, Math.sin(t * Math.PI) * length * .15 + s * s * width * .22 + Math.sin(t * 21 + s * 2) * Math.abs(s) * .025);
      const vein = Math.exp(-Math.abs(s) * 65) * .22 + Math.pow(Math.max(0, Math.cos(t * 51 - Math.abs(s) * 9)), 20) * .05;
      const color = base.clone().multiplyScalar(.79 + .31 * (1 - Math.abs(s)) + t * .2 + vein);
      colors.push(color.r, color.g, color.b);
      uvs.push(col / columns, t);
      if (row < rows && col < columns) {
        const a = row * (columns + 1) + col, b = a + columns + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
const stemMaterial = material('#4e6331');
function stem(group, a, b, bend = 0) {
  const middle = a.clone().lerp(b, .55).add(new THREE.Vector3(bend, .08, -.07));
  const curve = new THREE.QuadraticBezierCurve3(a, middle, b);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, .014, 4, false), stemMaterial);
  group.add(mesh);
}
function plant(x, z, scale, count, hue = .25, type = 'broad') {
  const group = new THREE.Group();
  group.name = `plant-${plants.length}`;
  group.position.set(x, BENCH_TOP, z);
  group.scale.setScalar(scale);
  garden.add(group);
  const phase = random() * Math.PI * 2;
  const {pot, saucer, soil} = createPlantPot(group, plants.length, random() > .5 ? '#a39b78' : '#a87951');
  const foliage = new THREE.Group();
  foliage.name = `anchored-foliage-${plants.length}`;
  foliage.position.y = soil.position.y;
  group.add(foliage);
  plants.push({group, pot, saucer, soil, foliage, phase});
  for (let i = 0; i < count; i++) {
    const angle = i * 2.39996 + random() * .45;
    const height = .75 + random() * 1.7;
    const radius = .25 + random() * .55;
    const end = new THREE.Vector3(Math.cos(angle) * radius, height - .5, Math.sin(angle) * radius);
    stem(foliage, new THREE.Vector3(), end, Math.cos(angle) * .12);
    const leaf = new THREE.Mesh(leafGeometry(type === 'slender' ? 1.35 : .8 + random() * .65, type === 'slender' ? .13 : .25 + random() * .19, hue + random() * .03, type === 'broad'), leafMaterial);
    leaf.position.copy(end);
    leaf.rotation.set(-.45 + random() * 1.4, -angle + .7, -Math.cos(angle) * (.35 + random() * .7));
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    foliage.add(leaf);
  }
  // Keep the complete leaf canopy behind the glass, allowing for its small
  // sway. Moving the rooted plant also keeps stalks and pots connected.
  group.updateMatrixWorld(true);
  const canopy = new THREE.Box3().setFromObject(foliage);
  group.position.z -= Math.max(0, canopy.max.z - (GLASS_Z - .12));
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(.82, .82), contactMaterial);
  contact.name = `pot-contact-shadow-${plants.length - 1}`;
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = .0015 / scale;
  group.add(contact);
  return group;
}
plant(-2.5, -.42, 1.55, 15, .235);
plant(2.8, -1.15, 1.75, 18, .24);
plant(.1, -2.7, 1.08, 13, .23, 'slender');
plant(-5.4, -2.2, 1.7, 15, .24, 'slender');
plant(5.7, -.8, 1.5, 13, .25);
plant(-.3, -.5, .64, 10, .27);
plant(1.3, -3.5, .8, 9, .22);

const uniforms = {
  uScene: {value: sceneTarget.texture},
  uDepth: {value: sceneTarget.depthTexture},
  uResolution: {value: new THREE.Vector2(1, 1)},
  uTilt: {value: new THREE.Vector2()},
  uNear: {value: camera.near},
  uFar: {value: camera.far}
};
const glassMaterial = new THREE.ShaderMaterial({
  uniforms,
  vertexShader: `varying vec3 vWorld; void main(){vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
  fragmentShader: `
    uniform sampler2D uScene; uniform sampler2D uDepth;
    uniform vec2 uResolution; uniform vec2 uTilt; uniform float uNear; uniform float uFar;
    varying vec3 vWorld;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
    float linearDepth(float z){return (2.*uNear*uFar)/(uFar+uNear-(z*2.-1.)*(uFar-uNear));}
    void main(){
      vec2 uv=gl_FragCoord.xy/uResolution;
      vec2 p=vWorld.xy;
      float coarse=noise(p*15.);
      float fine=noise(p*110.);
      vec2 normal=vec2(noise(p*48.),noise(p*48.+9.7))-.5;
      vec2 texel=1./uResolution;
      float behind=linearDepth(texture2D(uDepth,uv).r)-linearDepth(gl_FragCoord.z);
      float frost=clamp(behind*.9,0.55,5.8);
      vec2 radius=texel*(2.5+frost*2.8);
      vec2 q=clamp(uv+normal*texel*(3.+frost*1.5),vec2(.002),vec2(.998));
      vec3 c=texture2D(uScene,q).rgb*.20;
      c+=texture2D(uScene,clamp(q+radius*vec2(1.,0.),.001,.999)).rgb*.10;
      c+=texture2D(uScene,clamp(q-radius*vec2(1.,0.),.001,.999)).rgb*.10;
      c+=texture2D(uScene,clamp(q+radius*vec2(0.,1.),.001,.999)).rgb*.10;
      c+=texture2D(uScene,clamp(q-radius*vec2(0.,1.),.001,.999)).rgb*.10;
      c+=texture2D(uScene,clamp(q+radius*vec2(.82,.82),.001,.999)).rgb*.075;
      c+=texture2D(uScene,clamp(q-radius*vec2(.82,.82),.001,.999)).rgb*.075;
      c+=texture2D(uScene,clamp(q+radius*vec2(-.82,.82),.001,.999)).rgb*.075;
      c+=texture2D(uScene,clamp(q-radius*vec2(-.82,.82),.001,.999)).rgb*.075;
      vec2 light=vec2(-2.4,2.5)+uTilt*vec2(2.6,-1.6);
      vec2 d=p-light;
      float glow=exp(-dot(d*vec2(.30,.42),d*vec2(.30,.42)));
      float stripe=exp(-pow((p.x*.72+p.y*.42+1.1-uTilt.x*.8-uTilt.y*.4)*2.3,2.));
      float grain=(fine-.5)*.027+(coarse-.5)*.011;
      c=mix(c,vec3(.61,.66,.52),.075);
      float dx=abs(mod(p.x+2.5,2.5)-1.25)-.09;
      float dy=abs(mod(p.y+1.5,2.4)-1.2)-.083;
      c*=1.-.13*exp(-max(min(dx,dy),0.)*48.);
      c+=vec3(1.,.91,.68)*(glow*.30+stripe*.022)*( .88+fine*.24);
      c+=grain;
      gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
});
const windowAssembly = createWindowFrame(foreground, garden);
const glass = new THREE.Mesh(windowAssembly.panes, glassMaterial);
glass.name = 'depth-frosted-glass';
glass.position.z = GLASS_Z;
foreground.add(glass);

foreground.add(new THREE.HemisphereLight('#fff4d1', '#293326', 2.1));
const rimLight = new THREE.DirectionalLight('#fff2c5', 3.2);
rimLight.position.set(-5, 7, 7);
foreground.add(rimLight);

let frame = 0, disposed = false, contextLost = false, previousTime = 0, elapsed = 0, frames = 0;
const motion = createGlassMotion(host, {preview, onChange: invalidate});
const size = new THREE.Vector2();
function resize() {
  if (disposed) return;
  const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  renderer.getDrawingBufferSize(size);
  sceneTarget.setSize(size.x, size.y);
  uniforms.uResolution.value.copy(size);
  motion.recenter();
  invalidate();
}
function invalidate() { if (!frame && !disposed && !contextLost && !document.hidden) frame = requestAnimationFrame(render); }
function render(time) {
  frame = 0;
  const dt = previousTime ? Math.min((time - previousTime) / 1000, .05) : 1 / 60;
  previousTime = time;
  const unsettled = motion.update(dt);
  const {x, y} = motion.current;
  const amplitude = motion.reduced.matches ? .45 : 1;
  camera.position.set(.12 + x * .48 * amplitude, .3 - y * .34 * amplitude, 7.4);
  camera.lookAt(focus.x + x * .075 * amplitude, focus.y - y * .045 * amplitude, focus.z);
  uniforms.uTilt.value.set(x * amplitude, y * amplitude);
  rimLight.position.set(-5 + x * 2, 7 - y, 7);
  if (!preview && !motion.reduced.matches) {
    elapsed += dt;
    for (const {foliage, phase} of plants) {
      foliage.rotation.z = Math.sin(elapsed * .38 + phase) * .008;
      foliage.rotation.y = Math.sin(elapsed * .23 + phase) * .012;
    }
  }
  renderer.setRenderTarget(sceneTarget);
  renderer.render(garden, camera);
  renderer.setRenderTarget(null);
  renderer.render(foreground, camera);
  frames++;
  if (!preview && (!motion.reduced.matches || unsettled)) invalidate();
}
const observer = new ResizeObserver(resize);
observer.observe(host);
function visibility() {
  previousTime = 0;
  if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
  else invalidate();
}
document.addEventListener('visibilitychange', visibility);
function dispose() {
  if (disposed) return;
  disposed = true;
  cancelAnimationFrame(frame);
  observer.disconnect();
  document.removeEventListener('visibilitychange', visibility);
  motion.dispose();
  const geometries = new Set(), materials = new Set();
  for (const scene of [garden, foreground]) scene.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const mat of Array.isArray(object.material) ? object.material : [object.material]) if (mat) materials.add(mat);
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(mat => mat.dispose());
  contactTexture.dispose();
  sceneTarget.dispose();
  renderer.dispose();
}
window.addEventListener('pagehide', event => { if (!event.persisted) dispose(); });
renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); contextLost = true; cancelAnimationFrame(frame); frame = 0; });
renderer.domElement.addEventListener('webglcontextrestored', () => { contextLost = false; previousTime = 0; resize(); });
// Opt-in inspection only; the viewing page contains no debug overlay or text.
if (new URLSearchParams(location.search).has('inspect')) window.__glass = {
  objects: {floor, bench, plants, windowAssembly, glass},
  get state() { return {...motion.state, frames, preview, reduced: motion.reduced.matches, plants: plants.length, resolution: size.toArray(), camera: camera.position.toArray()}; }
};
resize();
