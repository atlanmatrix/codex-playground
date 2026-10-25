# Little Worlds scene conventions

- New scenes use a complete **128 × 128 square base** by default. Import `DEFAULT_BASE_SIZE` from `src/scene-defaults.js`; change a new scene's size only when the user asks. Do not resize existing scenes implicitly.
- Keep the procedural Three.js miniature / anime-inspired toon style and drag-to-orbit, wheel/pinch-to-zoom interaction. Frame the complete base on desktop and mobile; keep the camera above ground and outside the model.
- New scenes have no people or overlaid UI unless requested. Physical monitor screens, signs, toys and books belong in the model.
- Gallery cards use generated, versioned WebP thumbnails. Never embed scene iframes or initialize WebGL on the list page.
- Add each route to `build.mjs`, the gallery, the Pages copy step and relevant scene checks. Run `npm run thumbnails` after changing scene visuals so source/image hashes stay aligned.
- Verify real browser rendering and interaction as well as the appropriate geometry checks. Report offline fixtures separately from live public HTTP verification.

## Scene completion and delivery

- Implement the requested scene as an additional route while preserving the existing scenes. For requested moving elements, provide sustained, coherent animation; traffic must follow its lanes, preserve vehicle spacing, and obey the scene's signals. Keep preview covers static and respect reduced-motion preferences.
- Before completing a scene, run the appropriate scene checks, verify desktop/mobile framing and real-browser rendering and interaction, regenerate its gallery cover with `npm run thumbnails`, and ensure `npm run build` succeeds. Include source, generated route HTML, versioned thumbnail/manifest, gallery entry, build/deployment registration, checks and documentation in the change.
- **Every commit must be pushed immediately.** After any successful `git commit`, run `git push origin HEAD:main` before beginning another scene or change. Never accumulate local commits for a later batch push.
- **Every completed scene must be committed to Git.** Do not leave a finished scene only as uncommitted workspace changes. Stage the scene's complete related changes and use a descriptive commit message after validation passes. Commit subsequent requested scene refinements when completed as well.
- In the delivery reply, report the commit hash and scene access address. If online delivery is requested, push the commit and verify the deployment/public route; distinguish local commits, remote pushes, local browser fixtures and live public HTTP verification accurately.

## Current 128×128 expansion

- Expand each existing scene to an actual contiguous **128×128 world**, retaining its detailed original core at its original modeling scale. Add appropriate surroundings and animation; do not satisfy an expansion by scaling the old model or leaving an empty enlarged base.
- Validate and commit **each scene separately** before starting the next. Check the full world bounds, desktop/mobile framing, motion and reduced-motion behavior, real browser rendering and orbit/zoom interaction. Keep all generated route HTML and gallery cover hashes synchronized in that scene’s commit.

## Scene intent and modeling quality

- Design expansions around the original scene’s atmosphere, spatial logic and story. Repeating a generic house/tree/furniture grid or padding an oversized base is not a valid expansion. Use scene-specific layouts, varied silhouettes and details comparable to the original core.
- Road expansion includes road hierarchy, lane markings and merging/turning logic, varied modeled vehicles, transit stops and street infrastructure. Mountain expansion includes substantial elevation, exposed rock/snow structure, diverse anchored alpine vegetation and coherent trails/ski infrastructure where appropriate.
- Validate each scene’s distinctive landmarks and motion, inspect its actual screenshots, commit it independently and immediately push that commit.
