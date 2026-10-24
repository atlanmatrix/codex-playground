import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { Script } from 'node:vm';

const notice = await readFile('node_modules/three/LICENSE', 'utf8');
const pages = [
  {entry: 'src/scene.js', template: 'src/city.html', output: 'city/index.html'},
  {entry: 'src/lakeside.js', template: 'src/lakeside.html', output: 'lakeside/index.html'}
];
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
  await mkdir(page.output.slice(0,page.output.lastIndexOf('/')), {recursive:true});
  await writeFile(page.output,html);
  console.log(`Built and syntax-checked ${page.output}`);
}
const gallery = await readFile('src/index.html','utf8');
for (const route of ['city','lakeside']) {
  if (!gallery.includes(`href="./${route}/"`)) throw new Error(`Missing gallery route: ${route}`);
}
await writeFile('index.html',gallery);
console.log('Built scene selection at / — all scene routes are self-contained.');
