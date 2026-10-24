# 青葉 — A corner reclaimed

A small, explorable city corner reclaimed by a banyan tree. Built entirely with Three.js procedural geometry and painted canvas textures: three furnished floors, broken shop windows, an abandoned bookshop, kitchen and artist's study, a ruined footbridge, street furniture, a roof-garden car, and a clear pond with swimming fish.

The page has no visible interface. Drag to orbit, scroll or pinch to zoom, and right-drag or use two fingers to pan. Motion respects the operating system's reduced-motion preference.

## Development

Requires Node.js 20 or newer.

```sh
npm ci
npm run build
npm run dev
```

Open http://localhost:4173. Edit `src/scene.js` and `src/index.html`, then rebuild. The generated root `index.html` contains the entire application, including Three.js, with no external runtime requests.

## Publishing

Push to `main` to run `.github/workflows/pages.yml`. GitHub Actions publishes the generated root `index.html` to GitHub Pages.

Three.js is distributed under the MIT license; its notice is embedded in the generated HTML.
