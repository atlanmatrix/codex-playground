# 小景 · Little Worlds

Seven explorable, toon-shaded Three.js miniatures. Every scene is procedural geometry, with no external assets or runtime CDN requests.

- `/` — scene selection, with static previews rendered from the actual 3D scenes.
- `/city/` — **被自然收回的城市街角**: a banyan tree growing through a furnished, ruined building.
- `/lakeside/` — **柳荫下的湖畔午睡**: a deep lake with a diagonal shore, six weeping willows, a broken wooden footbridge and woven fishing basket, and a plump tabby sleeping on an open book on a wooden chaise. Twenty-four koi, goldfish, silverfish, and perch swim on distinct underwater routes.
- `/courtyard/` — **小区健身区一角**: seven familiar blue-and-yellow fitness stations on a rubber court, with benches, shade trees, a bicycle, and a modest apartment facade. Equipment stays still while trees, grass and a few falling leaves move.
- `/sakura/` — **樱风小站**: a pastel spring station with eight outlined cherry trees, two hollow grass-covered tunnels, a corrugated canopy, overhead wires, village houses, and a vegetable patch. Drifting petals and an occasional green railcar animate the scene; the road barriers close before it reaches the crossing.
- `/rooftop/` — **屋顶铁道街**: a two-car train runs over a continuous roof slab carried by five small shops. Below is a narrow Japanese street, with vending machines, bicycles and overhead cables; opposite homes have water tanks, aerials, condensers and gently moving laundry.

- `/rainy/` — **雨夜便利店**: a luminous corner shop with stocked aisles, drink refrigerators and a checkout. Falling rain stops above the roof and canopy; irregular puddles reflect the real scene, with independent expanding raindrop rings. Wet parking bays, vending machines, bicycles, overhead cables and quiet neighbors complete the midnight street.

- `/onsen/` — **山中温泉旅馆**: a two-storey timber inn with furnished tatami rooms, futons, tea tables, a tiled roof and a projecting veranda. Pines and early-autumn maples surround a deep outdoor rock bath with real reflections, slowly rising steam, a bamboo spout, cedar bathing buckets and a small brook crossed by an arched footbridge.

The scene routes contain no visible UI. Drag to orbit, scroll or pinch to zoom. The lakeside camera stays above ground and outside the model. Motion respects the system's reduced-motion preference. On the gallery, `?preview=1` renders each scene once and disables interaction to avoid running multiple continuous render loops. Preview URLs carry a hash of the scene bundle so a scene update refreshes its gallery preview.

## Development

Requires Node.js 20.11 or newer.

```sh
npm ci
npm run check
npm run build
npm run dev
```

Open http://localhost:4173. Sources are in `src/`. The build generates `index.html`, `city/index.html`, `lakeside/index.html`, `courtyard/index.html`, `sakura/index.html`, `rooftop/index.html`, `rainy/index.html`, and `onsen/index.html`. Each scene embeds its bundled JavaScript using literal replacement and validates the final script before writing HTML.

`npm run check` exercises real Three.js geometry and animation with browser I/O stubbed. It checks finite geometry, framing on desktop and mobile, water coverage and diagonal shoreline, fish containment and direction changes, section depth, breathing, ear timing, courtyard equipment, foliage motion, stable base sections, hollow tunnel clearance, railcar/barrier timing, rooftop rail/slab alignment, train wheel alignment, rain coverage over roofs, independent ripple timing, stocked store interiors, bath depth, independently timed steam, roof tiles and drifting leaves, static previews, and reduced motion. It does not replace GPU rendering or browser visual verification.

## Publishing

Pushing to `main` runs `.github/workflows/pages.yml`, publishing the gallery and all seven route directories to GitHub Pages. Folder routes also support direct navigation and refresh under a GitHub project path.

Three.js is MIT licensed; its notice is embedded in every generated scene page.
