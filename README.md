# 小景 · Little Worlds

Two explorable, toon-shaded Three.js miniatures. Every scene is procedural geometry, with no external assets or runtime CDN requests.

- `/` — scene selection, with static previews rendered from the actual 3D scenes.
- `/city/` — **被自然收回的城市街角**: a banyan tree growing through a furnished, ruined building.
- `/lakeside/` — **柳荫下的湖畔午睡**: a deep lake with a diagonal shore, six weeping willows, a broken wooden footbridge and woven fishing basket, and a plump tabby sleeping on an open book on a wooden chaise. Twenty-four koi, goldfish, silverfish, and perch swim on distinct underwater routes.

The scene routes contain no visible UI. Drag to orbit, scroll or pinch to zoom. The lakeside camera stays above ground and outside the model. Motion respects the system's reduced-motion preference. On the gallery, `?preview=1` renders each scene once and disables interaction to avoid running two continuous render loops. Preview URLs carry a hash of the scene bundle so a scene update refreshes its gallery preview.

## Development

Requires Node.js 20.11 or newer.

```sh
npm ci
npm run check
npm run build
npm run dev
```

Open http://localhost:4173. Sources are in `src/`. The build generates `index.html`, `city/index.html`, and `lakeside/index.html`. Each scene embeds its bundled JavaScript using literal replacement and validates the final script before writing HTML.

`npm run check` exercises real Three.js geometry and animation with browser I/O stubbed. It checks finite geometry, framing on desktop and mobile, water coverage and diagonal shoreline, fish containment and direction changes, section depth, breathing, ear timing, static previews, and reduced motion. It does not replace GPU rendering or browser visual verification.

## Publishing

Pushing to `main` runs `.github/workflows/pages.yml`, publishing the gallery and both route directories to GitHub Pages. Folder routes also support direct navigation and refresh under a GitHub project path.

Three.js is MIT licensed; its notice is embedded in both generated scene pages.
