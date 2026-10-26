import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { Script } from 'node:vm';
import { createHash } from 'node:crypto';

const notice = await readFile('node_modules/three/LICENSE', 'utf8');
const pages = [
  {entry: 'src/scene.js', template: 'src/city.html', output: 'city/index.html'},
  {entry: 'src/lakeside.js', template: 'src/lakeside.html', output: 'lakeside/index.html'},
  {entry: 'src/courtyard.js', template: 'src/courtyard.html', output: 'courtyard/index.html'},
  {entry: 'src/sakura.js', template: 'src/sakura.html', output: 'sakura/index.html'},
  {entry: 'src/rooftop.js', template: 'src/rooftop.html', output: 'rooftop/index.html'},
  {entry: 'src/rainy.js', template: 'src/rainy.html', output: 'rainy/index.html'},
  {entry: 'src/onsen.js', template: 'src/onsen.html', output: 'onsen/index.html'},
  {entry: 'src/intersection.js', template: 'src/intersection.html', output: 'intersection/index.html'},
  {entry: 'src/summit.js', template: 'src/summit.html', output: 'summit/index.html'},
  {entry: 'src/desert.js', template: 'src/desert.html', output: 'desert/index.html'},
  {entry: 'src/ocean.js', template: 'src/ocean.html', output: 'ocean/index.html'},
  {entry: 'src/study.js', template: 'src/study.html', output: 'study/index.html'}
];
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
let gallery = await readFile('src/index.html','utf8');
for (const [, script] of gallery.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Script(script, {filename:'gallery'});
if (/<(?:iframe|canvas)\b/i.test(gallery.replace(/<script>[\s\S]*?<\/script>/g, ''))) throw new Error('The gallery must use static covers without scene runtimes');
for (const page of pages) {
  const route=page.output.split('/')[0];
  if (!gallery.includes(`href="./${route}/"`)) throw new Error(`Missing gallery route: ${route}`);
  const thumbnail=thumbnails.scenes[route];
  if (!thumbnail || thumbnail.file!==`thumbnails/${route}.webp` || thumbnail.source_sha256!==sceneHashes.get(route)) {
    throw new Error(`Missing or stale thumbnail for ${route}; run npm run thumbnails`);
  }
  const bytes=await readFile(thumbnail.file),hash=createHash('sha256').update(bytes).digest('hex');
  if (hash!==thumbnail.sha256 || bytes.length!==thumbnail.bytes || bytes.toString('ascii',0,4)!=='RIFF' || bytes.toString('ascii',8,12)!=='WEBP') throw new Error(`Invalid thumbnail: ${thumbnail.file}`);
  const source=`src="./${thumbnail.file}"`;
  if (!gallery.includes(source)) throw new Error(`Missing gallery cover: ${route}`);
  gallery=gallery.replace(source,()=>`src="./${thumbnail.file}?v=${hash.slice(0,10)}"`);
}
await writeFile('index.html',gallery);
console.log('Built scene selection at / — all scene routes are self-contained.');
