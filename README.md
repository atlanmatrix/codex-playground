# 小景 · Little Worlds

Twelve explorable, toon-shaded Three.js miniatures, each on a complete 128×128 base. Every scene is procedural geometry, with no external assets or runtime CDN requests.

- `/` — scene selection using pre-rendered WebP covers. The gallery contains no iframes or WebGL canvases; its small script only copies embed codes; 3D starts only after following a scene link.
- `/city/` — **被自然收回的城市街角**: a banyan growing through its original furnished ruin, surrounded by a planned, detailed reclaimed district of 32 buildings.
- `/lakeside/` — **柳荫下的湖畔午睡**: a deep lake with a diagonal shore, six weeping willows, a broken wooden footbridge and woven fishing basket, and a plump tabby sleeping on an open book on a wooden chaise. Twenty-four koi, goldfish, silverfish, and perch swim on distinct underwater routes.
- `/courtyard/` — **小区健身区一角**: seven familiar blue-and-yellow fitness stations on a rubber court, with benches, shade trees, a bicycle, and a modest apartment facade. Equipment stays still while trees, grass and a few falling leaves move.
- `/sakura/` — **樱风小站**: a pastel spring station with eight outlined cherry trees, two hollow grass-covered tunnels, a corrugated canopy, overhead wires, village houses, and a vegetable patch. Drifting petals and an occasional green railcar animate the scene; the road barriers close before it reaches the crossing.
- `/rooftop/` — **屋顶铁道街**: a two-car train runs over a continuous roof slab carried by five small shops. Below is a narrow Japanese street, with vending machines, bicycles and overhead cables; opposite homes have water tanks, aerials, condensers and gently moving laundry.

- `/rainy/` — **雨夜便利店**: a luminous corner shop with stocked aisles, drink refrigerators and a checkout. Falling rain stops above the roof and canopy; irregular puddles reflect the real scene, with independent expanding raindrop rings. Wet parking bays, vending machines, bicycles, overhead cables and quiet neighbors complete the midnight street.

- `/onsen/` — **山中温泉旅馆**: a 128×128 mountainside retreat with a detailed original 32×32 inn compound with a two-storey timber inn, two uphill guest cottages, a dining house, a tea pavilion and an entrance gate. Stone stairs and retaining walls connect the levels; 28 pines and 14 maples frame a larger rock bath with approximately twice its former water area. Sun and moon icons switch between daylight and a quiet night with dim orange-yellow windows and lanterns; the pool and steam change with the lighting. Add `?time=night` to open directly at night.

- `/study/` — **剪辑师的午后书房**: a bright 128×128 cutaway studio retaining its detailed original 32×32 room with 359 individually modeled books, an 18-piece figurine display cabinet, a window-side sofa turned clockwise against a low cutaway side wall, reading ottoman, coffee table and media cart. The warm oak floor uses short, staggered boards with subtle per-board honey and amber variations. The solid-wall editing area and window-side reading area have swapped positions, including their chairs, rugs and accessories. Eight cabinet-top pots feature monstera, fern, snake plant, succulent, cactus and trailing pothos silhouettes. The editing desk has a timeline display, portrait notes monitor, keyboard, jog/fader controller, audio interface, nearfield speakers, headphones, microphone, cameras and small robot/cat/space toys. A domestic-scale casement window opens inward without an exterior backdrop, and two folded curtains gently billow with fixed top edges. The wall clock follows the viewing device’s local time with continuously moving hour, minute and second hands, including when ambient motion is reduced. The study defaults to device-local daytime from 06:00 (inclusive) until 18:00 (exclusive). At night its window closes, curtains overlap, and warm desk/reading lamps light the room. The small clock/sun/moon controls restore automatic mode or manually hold day/night until another selection or reload; `?time=day` and `?time=night` provide explicit scene links. Transitions are sequential and smooth, with instant reduced-motion states. Generated gallery covers pin the study to daylight for a stable preview.

- `/intersection/` — **午后十字路口**: a 128×128 neighborhood centered on four detailed corner shops, sidewalk tiles, trees, cafe tables, four zebra crossings and overhead signals. Twelve pastel cars and small vans circulate on four right-hand lanes, decelerating into queues and accelerating on green. A 34-second signal cycle includes amber and all-red clearance intervals. Vehicle bodies are clipped to the square edges; fixed-step simulation maintains spacing on slow frames. Preview and reduced-motion views show a still traffic tableau.

- `/summit/` — **风雪之巅**: a 128×128 snow mountain range around a detailed central summit with faceted rock faces, a continuous square mountain section, a cairn, a stony approach, 30 dwarf junipers and five windswept alpine pines. Coherent gusts flex shrub crowns, flutter a red-and-cream windsock and drive 780 snowflakes and 160 low spindrift streaks across the ridge. Roots and the windsock inlet remain anchored; snow stays above terrain. Preview and reduced-motion views remain still.

- `/desert/` — **沙海来风**: a 128×128 desert with asymmetric dunes, fine surface ripples, exposed sandstone strata and an open natural stone arch. Six saguaros, six prickly pears, 24 dryland shrubs, scattered rocks and sun-bleached deadwood punctuate the sand. Shrub crowns sway and 480 grains stream over the terrain with coherent gusts. Preview and reduced-motion modes hold still.

- `/ocean/` — **蓝海跃影**: a 128×128 translucent ocean section with a sandy floor, reef rocks, 12 coral clusters, starfish and anchored waving seagrass. Seventy-two fish in three central schools and 176 fish in six outer schools swim at different depths. Nine modeled dolphins take turns breaching on 18-second loops, pitching along continuous flight/dive paths and leaving expanding rings and spray on takeoff and landing. Surface waves, glints and rising bubbles animate independently; preview and reduced-motion modes hold still.

The onsen and study have compact day/night controls; the other scene routes contain no visible UI. Drag to orbit, scroll or pinch to zoom. The lakeside camera stays above ground and outside the model. Motion respects the system's reduced-motion preference. The thumbnail generator opens `?preview=1` to render each scene once, then saves a static WebP cover. Gallery image URLs carry a content hash, the first row loads eagerly, and subsequent covers load lazily. Fixed image dimensions reserve the cover space while images decode.

## Defaults for future scenes

New scenes use a **128×128 square base** unless a different size is explicitly requested. Import `DEFAULT_BASE_SIZE` from `src/scene-defaults.js`; `AGENTS.md` records this project convention. All twelve existing scenes use this full world size. `CORE_BASE_SIZE` retains the original 32-unit detailed cores; Each module in `src/expansions/` designs its own surrounding terrain, landmarks, vegetation and motion, while shared helpers construct the contiguous base without scaling the core.

## Development

Requires Node.js 20.11 or newer.

```sh
npm ci
npm run check
npm run build
npm run dev
```

Open http://localhost:4173. Sources are in `src/`. The build generates `index.html`, `city/index.html`, `lakeside/index.html`, `courtyard/index.html`, `sakura/index.html`, `rooftop/index.html`, `rainy/index.html`, `onsen/index.html`, `study/index.html`, `intersection/index.html`, `summit/index.html`, `desert/index.html`, and `ocean/index.html`. Each scene embeds its bundled JavaScript using literal replacement and validates the final script before writing HTML.

`npm run check` exercises real Three.js geometry and animation with browser I/O stubbed. It checks finite geometry, framing on desktop and mobile, water coverage and diagonal shoreline, fish containment and direction changes, section depth, breathing, ear timing, courtyard equipment, foliage motion, stable base sections, hollow tunnel clearance, railcar/barrier timing, rooftop rail/slab alignment, train wheel alignment, rain coverage over roofs, independent ripple timing, stocked store interiors, mountainside elevation and terraces, enlarged bath area, dim amber night lighting, independently timed steam, roof tiles and drifting leaves, the furnished editing desk, book counts, open window, anchored curtain tops and moving hems, four-way traffic spacing, stop-line compliance, cross-traffic clearance, sustained vehicle recycling, static previews, and reduced motion. The checks also validate 128×128 world bounds, new fish-school containment, additional animation/reduced-motion behavior and grade-separated traffic clearance. `python scripts/check-browser.py <scene>` verifies real Chromium/WebGL rendering, orbit/zoom and mobile framing using local HTTP fixtures, and captures day/night views for the study and onsen. Local fixtures do not verify the public deployment.

## Updating gallery covers

Generated 1280×720 WebP covers and their source hashes are committed in `thumbnails/`. A normal build validates the covers against the current scene HTML and fails if a cover is missing, stale or corrupted.

After changing a scene, regenerate the covers:

```sh
npm run thumbnails
```

This requires Python with `playwright` and `Pillow`, plus Chromium (`CHROMIUM_PATH` can override its location, or Playwright's installed browser is used). The script renders all scenes in an isolated browser, fulfills page requests from local files, checks WebGL and browser errors, and replaces the covers only after every scene succeeds. Normal builds and Pages deployment use the committed images and need no browser or Python dependencies.

## Publishing

Pushing to `main` runs `.github/workflows/pages.yml`, publishing the gallery, `thumbnails/`, and all twelve route directories to GitHub Pages. Folder routes also support direct navigation and refresh under a GitHub project path.

Three.js is MIT licensed; its notice is embedded in every generated scene page.

## Scene-specific detailed redesign

Expansions are redesigned around each original scene’s intent, using varied, detailed landmarks instead of generic grids. Every scene is verified, committed and immediately pushed before the next scene begins.

- Intersection: four-lane merge approaches, a collector boulevard with four girder bridges, service alley, cycleway, bus shelters, two stopping buses, cars/taxis/vans/trucks, loading bays and detailed mixed-use corner shops.

- Summit: 70-unit angular peaks and rock ridges, two slope-following graded ski runs, pulley-equipped chairlift with moving empty chairs, timber lodge, ski racks, rescue sled, trail map and five alpine shrub forms.

- City: a roofless tram workshop, abandoned library with books and stairs, collapsed arcade and pedestrian bridge, flooded court, exposed rebar, crumbling paving and facade ivy build a coherent reclaimed district.

- Lakeside: curved bays, detailed weeping willow boughs, a bank-following path, reading pavilion, bird hide, furnished fishing piers, a moored canoe with paddle and rope, reed/lily beds and distinct fish schools.

- Courtyard: varied apartment wings with balcony rails, condensers, laundry and mailboxes frame connected walks, a fenced half court, chess pavilion, slide/sandbox, gatehouse, bike shelter, lockers and sorting station.

- Sakura: detailed blossom canopies, a country branch platform and train, train-aware crossing booms, tile-roof homes, irrigated vegetable patches, stream and arched wooden footbridge replace a copied village grid.

- Rooftop: the original commuter train now uses a continuous supported rooftop line. Independently furnished coffee/record/flower/cycle/ramen/bakery shops, elevated platform, stairs/lift, roof utilities, laundry, canal bridge and sagging cables form a layered Japanese street.

- Rainy: roof-aware new rainfall, reflective wet boulevard and irregular bus-stop mirror puddle, last-bus shelter, furnished laundromat and pharmacy, shuttered garage, apartment/cafe and vehicle-specific silhouettes.

- Onsen: a ravine landscape with post-supported timber guest houses, shoji lattices, hillside stepping paths, creek bridge, secluded rock bath and cedar tubs, bamboo/cedar/pine/maple layers, lanterns and steam.

- Study: an asymmetric creative home with a stocked mezzanine library and stair, color/audio suite with faders, racks and speaker cones, cyclorama/camera/softboxes, reading sofas, vinyl console and espresso counter replaces copied work pods.

- Desert: asymmetric high dunes with slope-following ripple ribbons, stratified mesa and undercut hoodoos, gravel wadi and salt pan, palm spring, rope well, woven rest shade, ribbed/flowering cactus species and rolling tumbleweeds.

- Ocean: shallow coral shelves and a deep basin, branching/table/brain/fan/anemone colonies, open reef grotto, rooted kelp, distinct bream/silver/butterfly schools, sea turtles, spotted rays and six additional detailed dolphins with independent rings, spray and airborne trails.

## Reclaimed city district

The city retains its original **16×16 core at its original scale**, inside the complete 128×128 base. `src/expansions/city-plan.js` defines 31 irregular outer parcels and five street levels: main streets, collectors, local streets, service alleys and pedestrian paths. The outer buildings are distributed across civic/residential (8), industrial (7), market (9), wetland/public (5) and edge/gateway (2) areas. Footprints do not overlap; paths connect real entrances and route around their own buildings when the nearest street is behind them.

The three-storey library has individually stocked shelves, reading tables, catalogue drawers, stairs and a real tree aperture through its slabs. Residential and mixed-use buildings contain beds, kitchens with taps and burners, bathrooms, bookcases, furniture, internal doors, balconies, condensers and drainage pipes. The arcade has six furnished tenancies, striped awnings and laundry. Warehouses have exposed pitched trusses and stacked crates; the tram depot has two inspection pits, tools, machinery and an abandoned tram. The bathhouse has lockers, tubs and a tall chimney. Schools have desks, blackboards and a stopped exterior clock.

Four new recessed water bodies join the original core pool. The flooded court retains hoops, fencing and court lines beneath the water. Drainage channels connect the district towards reed and lily beds. Trees form groves and wall-side succession rather than a uniform grid; three secondary banyans pass through actual building apertures. Wind bends leaf tips while roots remain fixed. Nineteen new fish and the five original fish retain valid still poses in preview and reduced-motion modes.

The measured world contains **173,450 modeling units**, including the original 5,402-unit core, **32 buildings, 160 trees and 24 fish**. The outer inventory includes 142 functional areas (open cutaway zones, rather than enclosed room counts), 89 shelving units, 2,348 books, 220 vine curtains, 1,200 ground-plant clusters, 120 reed clusters and 240 lily pads. Counts describe modeled parts before instancing/merging, not GPU draw calls. The original core adds its own furniture, books and plants. Thin foliage uses two-triangle instanced leaves; opaque slabs and paving share material batches. Current instantiated geometry is approximately 1.1 million triangles including the core. Shadow maps are cached after the initial render; canopy sway has sub-texel shadow movement at this world scale.

City inspection supports orbiting, wheel/pinch zoom down to a 22-unit camera radius, and right-drag/two-finger panning on the ground plane. The entire base remains framed by default on desktop and mobile. `node scripts/check-scenes.mjs city 1440 1000` checks quantities, parcel separation, world bounds, real slab apertures, anchored roots and swimming containment. Run it at `390 844`, with `--preview`, and with `--reduced` for the other modes. `python scripts/check-city-browser.py` verifies actual local Chromium/WebGL rendering, zoom, pan, view replay and static reduced-motion capture. These checks use local fixtures and do not establish that a public deployment is live.

## Embedding scenes

Each gallery card has a keyboard-accessible copy-embed icon. It copies an iframe with the scene's absolute URL, accessible title, full width, 480px height, lazy loading and fullscreen permission. The URL is resolved from the current gallery address, preserving GitHub Pages project subpaths and custom domains. Copying requires HTTPS (or localhost); if clipboard access is unavailable or denied, a dialog provides selectable code for manual copying.

GitHub Pages supports hosting these self-contained static 3D scenes and embedding them in other HTML pages, including another GitHub Pages site. Paste the code into HTML that permits iframes (GitHub README Markdown does not render iframes). The host page must permit the scene origin in its CSP `frame-src`; restrictive iframe sandbox settings must allow scripts for WebGL interaction. This does not require CORS permission. Thumbnails remain static WebP images and the gallery never initializes a scene runtime.

## Saved views and live cover images

All twelve scenes record camera position, orbit angles, distance, target, zoom, viewport aspect and the active day/night period. After orbiting or zooming settles, the scene replaces its current URL's `view` parameter (without adding browser history entries) and saves the last view under `localStorage['little-worlds:view:<scene>']`. Opening the URL restores that view; a bare scene URL still opens the default composition. Storage restrictions in third-party embeds do not prevent URL sharing or capture. Resizing adapts the camera distance to preserve framing on mobile.

The scene exposes a small browser API after `little-worlds:ready`:

```js
const { state, url, screenshotUrl } = window.littleWorlds.getUrls();
// url: interactive scene with this exact view and lighting
// screenshotUrl: same scene with ?screenshot=1&view=... for a still cover
window.littleWorlds.setState(state);
const cover = window.littleWorlds.capture({ width: 1280, height: 720, format: 'webp' });
document.querySelector('img').src = cover.dataUrl;
```

`getState()` returns the current view. `capture()` returns `dataUrl`, `mimeType`, `width`, `height`, `state`, `url` and `screenshotUrl`. It renders a fresh frame synchronously, including reflections/bloom and the current CSS day/night background, without controls. It works with reduced motion and without preserving WebGL drawing buffers. Output dimensions are integers from 32 to 2048; formats are `png` (default) and `webp`; quality is 0–1 (default .9). The current viewport is fitted into the output without stretching. `transparent: true` omits the CSS background (scenes with an opaque Three.js background remain opaque).

Open a URL such as `/study/?screenshot=1&time=night&width=1280&height=720&format=webp`, optionally with a saved `view`, to generate and display a still image. This disables interaction and ambient animation and exposes the result as `window.littleWorldsScreenshot`; automation can wait for `document.documentElement.dataset.screenshot === 'ready'` (`'error'` on failure). Invalid views fall back to the default composition and set `data-view-error="invalid"`. Preview/capture pages never overwrite the recorded interactive view.

### Cross-origin iframe covers

Third-party hosts can use `postMessage`; they do not need access to the iframe's canvas or local storage. Messages are accepted only from the immediate parent, with an HTTP(S) origin and a string `requestId` of at most 128 characters. Set `parentOrigin` to the host's exact origin to pin it explicitly; otherwise the scene uses the referring origin, or binds to the first valid parent request if referrer information is unavailable. Responses always target that exact origin. Opaque (`null`) origins are unsupported; sandboxed iframes need `allow-scripts allow-same-origin`.

Request types are `little-worlds:get-state`, `little-worlds:set-state` (with `state`) and `little-worlds:capture` (with optional `options`). Responses use `{ type: 'little-worlds:response', requestId, ok, result }`, or `{ ..., ok: false, error }`. Notifications use `little-worlds:ready`, `little-worlds:statechange` and, for screenshot pages, `little-worlds:screenshot`; view notifications include `state`, `url` and `screenshotUrl`.

This example keeps a host-page image in sync with an embedded scene:

```html
<img id="cover" alt="场景封面" width="1280" height="720">
<script>
const sceneUrl = new URL('https://atlanmatrix.github.io/codex-playground/study/');
sceneUrl.searchParams.set('parentOrigin', location.origin);
const frame = document.createElement('iframe');
frame.title = '可交互书房'; frame.width = '100%'; frame.height = '480';
let sequence = 0, pending;
window.addEventListener('message', event => {
  if (event.source !== frame.contentWindow || event.origin !== sceneUrl.origin) return;
  const message = event.data;
  if (['little-worlds:ready', 'little-worlds:statechange'].includes(message?.type)) {
    // Save message.state/message.url/message.screenshotUrl in the host as needed.
    pending = `cover-${++sequence}`;
    frame.contentWindow.postMessage({
      type: 'little-worlds:capture', requestId: pending,
      options: { width: 1280, height: 720, format: 'webp' }
    }, sceneUrl.origin);
  } else if (message?.type === 'little-worlds:response' && message.requestId === pending && message.ok) {
    document.querySelector('#cover').src = message.result.dataUrl;
  }
});
frame.src = sceneUrl.href; document.body.append(frame);
</script>
```

The host's CSP must allow `data:` in `img-src` for data URLs. The gallery continues to use its committed versioned WebP covers and does not initialize WebGL or background scene iframes.

### Direct image HTTP URLs (optional service)

GitHub Pages serves static HTML: a `screenshotUrl` is a browser-rendered image page, not an `image/*` HTTP response. For a URL that can be placed directly in `<img src>`, run the included screenshot service on a server with Python Playwright and Chromium:

```sh
npm run serve:screenshots
# http://127.0.0.1:4173/api/screenshot/study.webp?time=night&width=1280&height=720
```

The service serves the built gallery/scenes and renders a fresh PNG or WebP for `/api/screenshot/<scene>.png` or `.webp`. Pass the same URL-encoded `view` parameter, optional `time=day|night`, `width`, `height` and `quality`. Each request uses a fresh browser context and returns `Cache-Control: no-store` and a public image CORS header. It only renders registered local scenes, blocks external browser requests, limits concurrent renders to one (429 when busy), and rejects invalid views/dimensions. It does not accept arbitrary remote URLs. Use `python scripts/screenshot-server.py --host 0.0.0.0 --port 4173` behind your normal production reverse proxy to expose it; the existing GitHub Pages deployment remains static and does not deploy this service.

`npm run check:capture` verifies real Chromium rendering, pointer/wheel input, persisted views, desktop/mobile URL replay, PNG/WebP output, day/night backgrounds, cross-origin messaging, blocked storage, invalid inputs and actual local HTTP image responses. These tests use local fixtures/service, not the public deployment.
