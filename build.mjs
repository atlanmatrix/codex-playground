import {SCENES} from './src/scene-registry.js';
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { Script } from 'node:vm';
import { createHash } from 'node:crypto';

const notice = await readFile('node_modules/three/LICENSE', 'utf8');
const pages=SCENES.map(({route,entry})=>({entry:`src/${entry}.js`,template:`src/${route}.html`,output:`${route}/index.html`}));

const sceneHashes = new Map();
for (const page of pages) {
  const bundle = await build({entryPoints:[page.entry], bundle:true, minify:true, write:false, format:'iife', target:'es2020', legalComments:'none'});
  const template = (await readFile(page.template,'utf8'))
    .replace('</head>', () => `<!-- Three.js license\n${notice}\n-->\n</head>`);
  const script = bundle.outputFiles[0].text.replaceAll('</script','<\\/script').replace(/[ \t]+$/gm,'');
  // Insert literally: a replacement string would interpret $& inside JavaScript.
  const html = template.replace('/* SCENE */', () => script);
  const embedded = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!embedded || embedded[1] !== script) throw new Error(`Bundle mismatch: ${page.output}`);
  new Script(embedded[1], {filename:page.output});
  sceneHashes.set(page.output.split('/')[0],createHash('sha256').update(html).digest('hex'));
  await mkdir(page.output.slice(0,page.output.lastIndexOf('/')), {recursive:true});
  await writeFile(page.output,html);
  console.log(`Built and syntax-checked ${page.output}`);
}
// Capture covers after building changed scenes with npm run thumbnails.
if (process.argv.includes('--scenes-only')) process.exit(0);
const thumbnails = JSON.parse(await readFile('thumbnails/manifest.json','utf8'));
let homepage = await readFile('src/index.html','utf8');
for (const [, script] of homepage.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Script(script, {filename:'homepage'});
// The homepage has one dedicated globe; individual scene runtimes remain isolated.
if (/<iframe\b/i.test(homepage.replace(/<script>[\s\S]*?<\/script>/g, ''))) throw new Error('Do not embed scene runtimes on the homepage');
const regionDefinitions=JSON.parse(await readFile('src/globe-regions.json','utf8'));
if(regionDefinitions.length!==SCENES.length||SCENES.some(s=>!regionDefinitions.some(r=>r.route===s.route)))throw new Error('Planet regions must map every scene');
const terrain=await readFile('assets/globe-terrain.webp');
const terrainHash=createHash('sha256').update(terrain).digest('hex').slice(0,12);
const planetManifest=await readFile('assets/planet-models/manifest.json');
const planetManifestHash=createHash('sha256').update(planetManifest).digest('hex').slice(0,12);
const planetModels=JSON.parse(planetManifest).models;
for(const s of SCENES){
 const record=planetModels[s.route];
 if(!record||record.source_sha256!==sceneHashes.get(s.route))throw new Error(`Stale planet model: ${s.route}; run npm run planet-models`);
 const heightBytes=await readFile(record.heightFile);
 if(createHash('sha256').update(heightBytes).digest('hex')!==record.heightSha256)throw new Error(`Corrupt height field: ${s.route}`);
 const bytes=await readFile(record.file);
 if(bytes.length!==record.bytes||createHash('sha256').update(bytes).digest('hex')!==record.sha256)throw new Error(`Corrupt planet model: ${s.route}`);
}
const globeBundle=await build({define:{__PLANET_MANIFEST_URL__:JSON.stringify(`./assets/planet-models/manifest.json?v=${planetManifestHash}`),__GLOBE_TEXTURE_URL__:JSON.stringify(`./assets/globe-terrain.webp?v=${terrainHash}`)},entryPoints:['src/globe.js'],bundle:true,minify:true,write:false,format:'iife',target:'es2020',legalComments:'none'});
const globeScript=globeBundle.outputFiles[0].text.replaceAll('</script','<\\/script').replace(/[ \t]+$/gm,'');
new Script(globeScript,{filename:'globe'});
if(!homepage.includes('/* GLOBE */'))throw new Error('Missing homepage globe mount');
homepage=homepage.replace('/* GLOBE */',()=>globeScript);
homepage=homepage.replace('</head>',()=>`<!-- Three.js license\n${notice}\n-->\n</head>`);
for (const page of pages) {
  const route=page.output.split('/')[0];
  const thumbnail=thumbnails.scenes[route];
  if (!thumbnail || thumbnail.file!==`thumbnails/${route}.webp` || thumbnail.source_sha256!==sceneHashes.get(route)) {
    throw new Error(`Missing or stale thumbnail for ${route}; run npm run thumbnails`);
  }
  const bytes=await readFile(thumbnail.file),hash=createHash('sha256').update(bytes).digest('hex');
  if (hash!==thumbnail.sha256 || bytes.length!==thumbnail.bytes || bytes.toString('ascii',0,4)!=='RIFF' || bytes.toString('ascii',8,12)!=='WEBP') throw new Error(`Invalid thumbnail: ${thumbnail.file}`);
}
await writeFile('index.html',homepage);
console.log('Built scene selection at / — all scene routes are self-contained.');
