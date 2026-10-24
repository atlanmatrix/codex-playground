# 小景 · Little Worlds

Eight explorable, toon-shaded Three.js miniatures. Every scene is procedural geometry, with no external assets or runtime CDN requests.

- `/` — scene selection using pre-rendered WebP covers. The gallery contains no iframes, JavaScript or WebGL canvases; 3D starts only after following a scene link.
- `/city/` — **被自然收回的城市街角**: a banyan tree growing through a furnished, ruined building.
- `/lakeside/` — **柳荫下的湖畔午睡**: a deep lake with a diagonal shore, six weeping willows, a broken wooden footbridge and woven fishing basket, and a plump tabby sleeping on an open book on a wooden chaise. Twenty-four koi, goldfish, silverfish, and perch swim on distinct underwater routes.
- `/courtyard/` — **小区健身区一角**: seven familiar blue-and-yellow fitness stations on a rubber court, with benches, shade trees, a bicycle, and a modest apartment facade. Equipment stays still while trees, grass and a few falling leaves move.
- `/sakura/` — **樱风小站**: a pastel spring station with eight outlined cherry trees, two hollow grass-covered tunnels, a corrugated canopy, overhead wires, village houses, and a vegetable patch. Drifting petals and an occasional green railcar animate the scene; the road barriers close before it reaches the crossing.
- `/rooftop/` — **屋顶铁道街**: a two-car train runs over a continuous roof slab carried by five small shops. Below is a narrow Japanese street, with vending machines, bicycles and overhead cables; opposite homes have water tanks, aerials, condensers and gently moving laundry.

- `/rainy/` — **雨夜便利店**: a luminous corner shop with stocked aisles, drink refrigerators and a checkout. Falling rain stops above the roof and canopy; irregular puddles reflect the real scene, with independent expanding raindrop rings. Wet parking bays, vending machines, bicycles, overhead cables and quiet neighbors complete the midnight street.

- `/onsen/` — **山中温泉旅馆**: a terraced mountainside retreat on a 32×32 base with a two-storey timber inn, two uphill guest cottages, a dining house, a tea pavilion and an entrance gate. Stone stairs and retaining walls connect the levels; 28 pines and 14 maples frame a larger rock bath with approximately twice its former water area. Sun and moon icons switch between daylight and a quiet night with dim orange-yellow windows and lanterns; the pool and steam change with the lighting. Add `?time=night` to open directly at night.

- `/study/` — **剪辑师的午后书房**: a bright 32×32 cutaway interior with 471 individually modeled books, a corner sofa, reading ottoman, coffee table and media cart. The editing desk has a timeline display, portrait notes monitor, keyboard, jog/fader controller, audio interface, nearfield speakers, headphones, microphone, cameras and small robot/cat/space toys. A real casement window opens inward and two folded curtains gently billow with fixed top edges.

The onsen has two compact sun/moon buttons; the other scene routes contain no visible UI. Drag to orbit, scroll or pinch to zoom. The lakeside camera stays above ground and outside the model. Motion respects the system's reduced-motion preference. The thumbnail generator opens `?preview=1` to render each scene once, then saves a static WebP cover. Gallery image URLs carry a content hash, the first row loads eagerly, and subsequent covers load lazily. Fixed image dimensions reserve the cover space while images decode.

## Defaults for future scenes

New scenes use a **32×32 square base** unless a different size is explicitly requested. Import `DEFAULT_BASE_SIZE` from `src/scene-defaults.js`; `AGENTS.md` records this project convention. Existing scenes keep their current dimensions. The study is the first new scene to use this shared default.

## Development

Requires Node.js 20.11 or newer.

```sh
npm ci
npm run check
npm run build
npm run dev
```

Open http://localhost:4173. Sources are in `src/`. The build generates `index.html`, `city/index.html`, `lakeside/index.html`, `courtyard/index.html`, `sakura/index.html`, `rooftop/index.html`, `rainy/index.html`, `onsen/index.html`, and `study/index.html`. Each scene embeds its bundled JavaScript using literal replacement and validates the final script before writing HTML.

`npm run check` exercises real Three.js geometry and animation with browser I/O stubbed. It checks finite geometry, framing on desktop and mobile, water coverage and diagonal shoreline, fish containment and direction changes, section depth, breathing, ear timing, courtyard equipment, foliage motion, stable base sections, hollow tunnel clearance, railcar/barrier timing, rooftop rail/slab alignment, train wheel alignment, rain coverage over roofs, independent ripple timing, stocked store interiors, mountainside elevation and terraces, enlarged bath area, dim amber night lighting, independently timed steam, roof tiles and drifting leaves, the furnished editing desk, book counts, open window, anchored curtain tops and moving hems, static previews, and reduced motion. It does not replace GPU rendering or browser visual verification.

## Updating gallery covers

Generated 1280×720 WebP covers and their source hashes are committed in `thumbnails/`. A normal build validates the covers against the current scene HTML and fails if a cover is missing, stale or corrupted.

After changing a scene, regenerate the covers:

```sh
npm run thumbnails
```

This requires Python with `playwright` and `Pillow`, plus Chromium (`CHROMIUM_PATH` can override its location, or Playwright's installed browser is used). The script renders all scenes in an isolated browser, fulfills page requests from local files, checks WebGL and browser errors, and replaces the covers only after every scene succeeds. Normal builds and Pages deployment use the committed images and need no browser or Python dependencies.

## Publishing

Pushing to `main` runs `.github/workflows/pages.yml`, publishing the gallery, `thumbnails/`, and all eight route directories to GitHub Pages. Folder routes also support direct navigation and refresh under a GitHub project path.

Three.js is MIT licensed; its notice is embedded in every generated scene page.
