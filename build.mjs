import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
const bundle = await build({entryPoints:['src/scene.js'],bundle:true,minify:true,write:false,format:'iife',target:'es2020',legalComments:'none'});
const notice = await readFile('node_modules/three/LICENSE','utf8');
const template = (await readFile('src/index.html','utf8')).replace('</head>', `<!-- Three.js license\n${notice}\n-->\n</head>`);
await writeFile('index.html',template.replace('/* SCENE */',bundle.outputFiles[0].text.replaceAll('</script','<\\/script').replace(/[ \t]+$/gm,'')));
console.log('Built self-contained index.html — no external requests.');
