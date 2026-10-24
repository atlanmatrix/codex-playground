import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { Script } from 'node:vm';

const bundle = await build({
  entryPoints: ['src/scene.js'],
  bundle: true,
  minify: true,
  write: false,
  format: 'iife',
  target: 'es2020',
  legalComments: 'none'
});
const notice = await readFile('node_modules/three/LICENSE', 'utf8');
const template = (await readFile('src/index.html', 'utf8'))
  .replace('</head>', () => `<!-- Three.js license\n${notice}\n-->\n</head>`);
const script = bundle.outputFiles[0].text
  .replaceAll('</script', '<\\/script')
  .replace(/[ \t]+$/gm, '');

// A replacement string interprets $&, $`, and $' inside the bundled JavaScript.
// Return the bundle from a function so every character is inserted literally.
const html = template.replace('/* SCENE */', () => script);
const embedded = html.match(/<script>([\s\S]*?)<\/script>/);
if (!embedded || embedded[1] !== script) {
  throw new Error('The embedded scene script does not match the bundle');
}
// Validate the final HTML payload, rather than only the original source module.
new Script(embedded[1], { filename: 'index.html: scene script' });
await writeFile('index.html', html);
console.log('Built and syntax-checked self-contained index.html — no external requests.');
