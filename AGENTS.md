# Little Worlds scene conventions

- New scenes use a complete **32 × 32 square base** by default. Import `DEFAULT_BASE_SIZE` from `src/scene-defaults.js`; change a new scene's size only when the user asks. Do not resize existing scenes implicitly.
- Keep the procedural Three.js miniature / anime-inspired toon style and drag-to-orbit, wheel/pinch-to-zoom interaction. Frame the complete base on desktop and mobile; keep the camera above ground and outside the model.
- New scenes have no people or overlaid UI unless requested. Physical monitor screens, signs, toys and books belong in the model.
- Gallery cards use generated, versioned WebP thumbnails. Never embed scene iframes or initialize WebGL on the list page.
- Add each route to `build.mjs`, the gallery, the Pages copy step and relevant scene checks. Run `npm run thumbnails` after changing scene visuals so source/image hashes stay aligned.
- Verify real browser rendering and interaction as well as the appropriate geometry checks. Report offline fixtures separately from live public HTTP verification.
