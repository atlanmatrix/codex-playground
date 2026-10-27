import { Vector3 } from 'three';
import { expandedFit } from './world-expansion.js';

const round = number => Math.round(number * 1e6) / 1e6;
const vector = value => Array.isArray(value) && value.length === 3 && value.every(n => Number.isFinite(n) && Math.abs(n) <= 10000);

// Treat URLs, stored views and iframe messages as untrusted input.
export function validateView(value, scene) {
  if (!value || value.version !== 1 || value.scene !== scene || !vector(value.position) || !vector(value.target)
    || !Number.isFinite(value.zoom) || value.zoom < .25 || value.zoom > 4
    || !Number.isFinite(value.aspect) || value.aspect < .01 || value.aspect > 100
    || Math.hypot(...value.position.map((n, i) => n - value.target[i])) < 1
    || (value.period !== undefined && !['day', 'night'].includes(value.period))) {
    throw new Error('Invalid scene view');
  }
  return value;
}

// All scene backgrounds are CSS linear/radial gradients. Paint the computed
// background (including the day/night overlay) without capturing visible UI.
function paintBackground(context, style, width, height) {
  context.fillStyle = style.backgroundColor;
  context.fillRect(0, 0, width, height);
  const image = style.backgroundImage;
  const stops = [...image.matchAll(/(rgba?\([^)]+\)|#[\da-f]+)(?:\s+([\d.]+)%)?/gi)];
  if (!stops.length) return;
  context.save();
  let gradient;
  if (image.startsWith('radial-gradient')) {
    const at = image.match(/at ([\d.]+)% ([\d.]+)%/);
    const x = width * (at ? Number(at[1]) / 100 : .5), y = height * (at ? Number(at[2]) / 100 : .5);
    const rx = Math.max(x, width - x) * Math.SQRT2, ry = Math.max(y, height - y) * Math.SQRT2;
    context.translate(x, y); context.scale(rx, ry);
    gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
  } else if (image.startsWith('linear-gradient')) {
    const angle = Number(image.match(/([\d.]+)deg/)?.[1] || 180) * Math.PI / 180;
    const x = Math.sin(angle), y = -Math.cos(angle), length = Math.abs(width * x) + Math.abs(height * y);
    gradient = context.createLinearGradient((width - x * length) / 2, (height - y * length) / 2, (width + x * length) / 2, (height + y * length) / 2);
  }
  if (gradient) {
    stops.forEach((stop, i) => gradient.addColorStop(stop[2] === undefined ? i / (stops.length - 1) : Number(stop[2]) / 100, stop[1]));
    context.fillStyle = gradient;
    if (image.startsWith('radial-gradient')) context.fillRect(-2, -2, 4, 4);
    else context.fillRect(0, 0, width, height);
  }
  context.restore();
}

export function installSceneCapture({ kind, camera, controls, renderer, render, preview, setPeriod }) {
  // Geometry checks deliberately stub browser I/O; exercise this module in Chromium.
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(location.search), screenshotMode = params.has('screenshot');
  function freezeBackdrop() {
    const style = document.createElement('style');
    style.textContent = 'body::before{transition:none!important;animation:none!important}';
    document.head.appendChild(style);
    return style;
  }
  // Still URLs use the requested lighting, not its transition's first frame.
  if (screenshotMode) freezeBackdrop();
  let applying = false, timer, parentOrigin = null, lastView = '';
  const configuredOrigin = params.get('parentOrigin');
  const originOf = value => {
    try { const url = new URL(value); return /^https?:$/.test(url.protocol) ? url.origin : null; } catch { return null; }
  };
  if (configuredOrigin) parentOrigin = originOf(configuredOrigin);
  else if (document.referrer) parentOrigin = originOf(document.referrer);

  function getState() {
    const offset = camera.position.clone().sub(controls.target);
    return {
      version: 1, scene: kind, position: camera.position.toArray().map(round), target: controls.target.toArray().map(round),
      zoom: round(camera.zoom), aspect: round(camera.aspect),
      distance: round(offset.length()), azimuth: round(Math.atan2(offset.x, offset.z)), polar: round(Math.acos(offset.y / offset.length())),
      ...(document.body.dataset.period ? { period: document.body.dataset.period } : {})
    };
  }

  function getUrls() {
    const state = getState(), url = new URL(location.href);
    for (const key of ['screenshot', 'preview', 'parentOrigin', 'width', 'height', 'format', 'quality']) url.searchParams.delete(key);
    url.searchParams.set('view', JSON.stringify(state));
    if (state.period) url.searchParams.set('time', state.period);
    const screenshot = new URL(url); screenshot.searchParams.set('screenshot', '1');
    return { state, url: url.href, screenshotUrl: screenshot.href };
  }

  function notify(type, payload) {
    if (window.parent !== window && parentOrigin) window.parent.postMessage({ type: `little-worlds:${type}`, ...payload }, parentOrigin);
  }

  function record() {
    if (applying || preview) return;
    const result = getUrls(), encoded = JSON.stringify(result.state);
    if (encoded === lastView) return;
    lastView = encoded;
    try { localStorage.setItem(`little-worlds:view:${kind}`, encoded); } catch { /* Storage may be blocked in third-party iframes. */ }
    try {
      const url = new URL(location.href); url.searchParams.set('view', encoded);
      if (result.state.period) url.searchParams.set('time', result.state.period);
      history.replaceState(history.state, '', url);
    } catch { /* Sandboxed embeds can still use the message API. */ }
    window.dispatchEvent(new CustomEvent('little-worlds:statechange', { detail: result }));
    notify('statechange', result);
  }

  function setState(input) {
    const state = validateView(input, kind);
    applying = true;
    try {
      // Flush residual damping before assigning an exact view.
      const damping = controls.enableDamping;
      controls.enableDamping = false; controls.update();
      controls.target.fromArray(state.target);
      const offset = new Vector3().fromArray(state.position).sub(controls.target);
      offset.multiplyScalar(expandedFit(camera.aspect) / expandedFit(state.aspect));
      offset.clampLength(controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).add(offset); camera.zoom = state.zoom; camera.updateProjectionMatrix();
      controls.update(); controls.enableDamping = damping;
      if (state.period && setPeriod) {
        const backdrop = screenshotMode ? null : freezeBackdrop();
        try {
          setPeriod(state.period);
          // Commit the final CSS overlay before restoring interactive transitions.
          getComputedStyle(document.body, '::before').opacity;
        } finally { backdrop?.remove(); }
      }
    } finally { applying = false; }
    return getState();
  }

  function capture(options = {}) {
    if (!options || typeof options !== 'object') throw new Error('Invalid capture options');
    const width = options.width ?? 1280, height = options.height ?? 720;
    const format = options.format ?? 'png', quality = options.quality ?? .9;
    if (![width, height].every(n => Number.isInteger(n) && n >= 32 && n <= 2048)
      || !['png', 'webp'].includes(format) || !Number.isFinite(quality) || quality < 0 || quality > 1) {
      throw new Error('Use dimensions from 32 to 2048, png/webp and quality from 0 to 1');
    }
    const gl = renderer.getContext();
    if (gl.isContextLost()) throw new Error('WebGL context is lost');
    // Force the complete render path, including bloom and reduced-motion scenes,
    // then read synchronously before WebGL discards the drawing buffer.
    render();
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!options.transparent) {
      paintBackground(context, getComputedStyle(document.body), width, height);
      const overlay = getComputedStyle(document.body, '::before');
      if (overlay.content !== 'none' && Number(overlay.opacity) > 0) {
        context.globalAlpha = Number(overlay.opacity); paintBackground(context, overlay, width, height); context.globalAlpha = 1;
      }
    }
    const source = renderer.domElement, scale = Math.min(width / source.width, height / source.height);
    const w = source.width * scale, h = source.height * scale;
    context.drawImage(source, (width - w) / 2, (height - h) / 2, w, h);
    const dataUrl = canvas.toDataURL(`image/${format}`, quality);
    return { ...getUrls(), dataUrl, width, height, mimeType: dataUrl.slice(5, dataUrl.indexOf(';')) };
  }

  if (params.has('view')) {
    try { setState(JSON.parse(params.get('view'))); }
    catch { document.documentElement.dataset.viewError = 'invalid'; }
  }
  controls.update();
  lastView = JSON.stringify(getState());
  controls.addEventListener('change', () => {
    if (applying || preview) return;
    clearTimeout(timer); timer = setTimeout(record, 200);
  });
  // Persist lighting selections even when the camera does not move.
  document.querySelectorAll('[data-time]').forEach(button => button.addEventListener('click', () => {
    clearTimeout(timer); timer = setTimeout(record, 1600);
  }));
  addEventListener('pagehide', record);

  window.littleWorlds = { getState, getUrls, capture, setState(state) { setState(state); render(); record(); return getUrls(); } };
  addEventListener('message', event => {
    const message = event.data;
    if (window.parent === window || event.source !== window.parent || !originOf(event.origin)
      || (configuredOrigin && !originOf(configuredOrigin)) || (parentOrigin && event.origin !== parentOrigin)
      || !message || !['little-worlds:get-state', 'little-worlds:set-state', 'little-worlds:capture'].includes(message.type)
      || typeof message.requestId !== 'string' || message.requestId.length > 128) return;
    parentOrigin = event.origin;
    try {
      const result = message.type === 'little-worlds:capture' ? capture(message.options)
        : message.type === 'little-worlds:set-state' ? window.littleWorlds.setState(message.state) : getUrls();
      event.source.postMessage({ type: 'little-worlds:response', requestId: message.requestId, ok: true, result }, event.origin);
    } catch (error) {
      event.source.postMessage({ type: 'little-worlds:response', requestId: message.requestId, ok: false, error: error.message }, event.origin);
    }
  });
  queueMicrotask(() => {
    if (screenshotMode) {
      try {
        const options = {};
        for (const key of ['width', 'height', 'quality']) if (params.has(key)) options[key] = Number(params.get(key));
        if (params.has('format')) options.format = params.get('format');
        const result = capture(options), image = document.createElement('img');
        image.alt = `${document.title} · 场景封面`; image.src = result.dataUrl;
        image.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;object-fit:contain;z-index:10';
        renderer.domElement.style.visibility = 'hidden'; document.body.appendChild(image);
        window.littleWorldsScreenshot = result; document.documentElement.dataset.screenshot = 'ready';
        notify('screenshot', result);
      } catch (error) {
        document.documentElement.dataset.screenshot = 'error';
        notify('error', { error: error.message });
      }
    }
    window.dispatchEvent(new CustomEvent('little-worlds:ready', { detail: getUrls() }));
    notify('ready', getUrls());
  });
}
