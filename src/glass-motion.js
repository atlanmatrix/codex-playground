// Screen-relative orientation, calibrated to the way the device is held on entry.
// Quaternion projection avoids beta/gamma discontinuities near a vertical phone.
import {Euler, Quaternion, Vector3, MathUtils} from 'three';

export function createGlassMotion(host, {preview = false, onChange = () => {}} = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const target = {x: 0, y: 0};
  const current = {x: 0, y: 0};
  const orientation = new Quaternion();
  const basis = new Quaternion();
  const relative = new Quaternion();
  const euler = new Euler();
  const direction = new Vector3();
  const gravity = new Vector3();
  const gravitySample = new Vector3();
  const cleanup = [];
  let calibrated = false;
  let listening = false;
  let sensorActive = false;
  let permissionPending = false;
  let permission = 'idle';
  let permissionError = null;
  let sensorSource = null;
  let lastOrientation = -Infinity;
  let lastTouchEnd = -Infinity;
  let hasGravity = false;
  let disposed = false;
  let dragging = null;

  function listen(node, type, fn, options) {
    if (node.addEventListener) {
      node.addEventListener(type, fn, options);
      cleanup.push(() => node.removeEventListener(type, fn, options));
    } else if (type === 'change' && node.addListener) {
      node.addListener(fn);
      cleanup.push(() => node.removeListener(fn));
    }
  }

  function set(x, y) {
    target.x = MathUtils.clamp(x, -1, 1);
    target.y = MathUtils.clamp(y, -1, 1);
    onChange();
  }

  function screenAngle() {
    const angle = screen.orientation?.angle ?? window.orientation ?? 0;
    return Number.isFinite(angle) ? MathUtils.degToRad(angle) : 0;
  }

  function applyPose(source, angle) {
    if (sensorSource !== source) calibrated = false;
    sensorSource = source;
    if (!calibrated) {
      basis.copy(orientation).invert();
      calibrated = true;
    }
    relative.copy(basis).multiply(orientation);
    direction.set(0, 0, 1).applyQuaternion(relative);
    const x = direction.x * Math.cos(angle) + direction.y * Math.sin(angle);
    const y = direction.y * Math.cos(angle) - direction.x * Math.sin(angle);
    sensorActive = true;
    if (!dragging) set(x / .38, -y / .38);
  }

  function onOrientation(event) {
    if (preview || document.hidden || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
    const alpha = Number.isFinite(event.alpha) ? event.alpha : 0;
    // Device Orientation specifies Z(alpha), X(beta), Y(gamma). Treating gamma
    // as a Z rotation leaves the forward vector unchanged on sideways tilt.
    euler.set(MathUtils.degToRad(event.beta), MathUtils.degToRad(event.gamma), MathUtils.degToRad(alpha), 'ZXY');
    orientation.setFromEuler(euler);
    lastOrientation = performance.now();
    applyPose('orientation', screenAngle());
  }

  function onMotion(event) {
    if (preview || document.hidden || performance.now() - lastOrientation < 1000) return;
    const g = event.accelerationIncludingGravity;
    if (!g || ![g.x, g.y, g.z].every(Number.isFinite)) return;
    gravitySample.set(g.x, g.y, g.z);
    const acceleration = event.acceleration;
    if (acceleration && [acceleration.x, acceleration.y, acceleration.z].every(Number.isFinite)) {
      gravitySample.x -= acceleration.x;
      gravitySample.y -= acceleration.y;
      gravitySample.z -= acceleration.z;
    }
    if (gravitySample.length() < 1) return;
    if (hasGravity) gravity.lerp(gravitySample, .22); else gravity.copy(gravitySample);
    hasGravity = true;
    // Some WebKit hosts supply motion without valid orientation samples.
    // Remove user acceleration where available and work in screen coordinates,
    // so a landscape iPad has the same gravity-based fallback as portrait.
    const angle = screenAngle(), c = Math.cos(angle), s = Math.sin(angle);
    const x = gravity.x * c + gravity.y * s;
    const y = gravity.y * c - gravity.x * s;
    const beta = Math.atan2(-y, -gravity.z);
    const gamma = Math.atan2(x, Math.hypot(y, gravity.z));
    orientation.setFromEuler(euler.set(beta, gamma, 0, 'ZXY'));
    applyPose('motion', 0);
  }

  function attachSensor() {
    if (listening || preview) return;
    listen(window, 'deviceorientation', onOrientation, {passive: true});
    listen(window, 'devicemotion', onMotion, {passive: true});
    listening = true;
  }

  function activate() {
    if (disposed || preview || permissionPending || permission === 'granted' || permission === 'denied') return;
    const orientationAPI = window.DeviceOrientationEvent;
    const motionAPI = window.DeviceMotionEvent;
    if (!window.isSecureContext || (!orientationAPI && !motionAPI)) { permission = 'unavailable'; return; }
    const api = typeof orientationAPI?.requestPermission === 'function' ? orientationAPI
      : typeof motionAPI?.requestPermission === 'function' ? motionAPI : null;
    if (!api) {
      permission = 'granted';
      attachSensor();
      return;
    }
    // Touch pointerdown is NOT an activation-triggering event in WebKit. The
    // caller must be a native touchend/click/keydown handler, without an await.
    if (navigator.userActivation?.isActive === false) {
      permissionError = 'UserActivationRequired';
      return;
    }
    permissionPending = true;
    permission = 'pending';
    permissionError = null;
    const failed = error => {
      if (disposed) return;
      // A rejected promise (e.g. missing transient activation) is different
      // from the user explicitly returning "denied". Let the next tap retry.
      permission = 'idle';
      permissionError = error?.name || 'PermissionRequestFailed';
    };
    try {
      Promise.resolve(api.requestPermission()).then(result => {
        if (disposed) return;
        permission = result === 'granted' ? 'granted' : result === 'denied' ? 'denied' : 'idle';
        if (permission === 'granted') attachSensor();
      }).catch(failed).finally(() => { permissionPending = false; });
    } catch (error) {
      failed(error);
      permissionPending = false;
    }
  }

  function recenter() {
    calibrated = false;
    hasGravity = false;
    set(0, 0);
  }

  listen(host, 'pointerdown', event => {
    if (preview || event.isPrimary === false || event.button > 0) return;
    dragging = {id: event.pointerId, x: event.clientX, y: event.clientY, startX: target.x, startY: target.y};
    host.setPointerCapture?.(event.pointerId);
    host.focus({preventScroll: true});
  });
  listen(host, 'pointermove', event => {
    if (preview) return;
    if (dragging?.id === event.pointerId) {
      set(dragging.startX + (event.clientX - dragging.x) / (host.clientWidth * .55), dragging.startY + (event.clientY - dragging.y) / (host.clientHeight * .55));
    } else if (event.pointerType === 'mouse' && !sensorActive) {
      set((event.clientX / host.clientWidth - .5) * 2, (event.clientY / host.clientHeight - .5) * 2);
    }
  });
  const release = event => {
    if (event.pointerId !== dragging?.id) return;
    dragging = null;
    if (sensorActive) calibrated = false;
  };
  listen(host, 'pointerup', release);
  listen(host, 'pointercancel', release);
  listen(host, 'lostpointercapture', release);
  listen(window, 'pointerup', release);
  listen(window, 'pointercancel', release);
  listen(host, 'touchend', event => {
    if (event.touches.length) return;
    dragging = null;
    lastTouchEnd = performance.now();
    activate();
  }, {passive: true});
  listen(host, 'click', event => {
    // The compatibility click following touchend belongs to the same gesture.
    // Keyboard clicks and pointer devices without touch events still work.
    if (event.detail !== 0 && performance.now() - lastTouchEnd < 500) return;
    dragging = null;
    activate();
  });
  listen(host, 'pointerleave', event => { if (event.pointerType === 'mouse' && !dragging && !sensorActive) set(0, 0); });
  listen(host, 'keydown', event => {
    if (preview) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'Home'].includes(event.key)) {
      event.preventDefault();
      activate();
      if ([' ', 'Home'].includes(event.key)) recenter();
      else set(target.x + (event.key === 'ArrowLeft' ? -.2 : event.key === 'ArrowRight' ? .2 : 0), target.y + (event.key === 'ArrowUp' ? -.2 : event.key === 'ArrowDown' ? .2 : 0));
    }
  });
  listen(window, 'orientationchange', recenter, {passive: true});
  if (screen.orientation) listen(screen.orientation, 'change', recenter);
  listen(window, 'blur', () => { dragging = null; });
  listen(window, 'pageshow', event => { if (event.persisted) recenter(); });
  listen(document, 'visibilitychange', () => { dragging = null; if (!document.hidden) recenter(); });
  listen(reduced, 'change', onChange);
  if (!preview && typeof window.DeviceOrientationEvent?.requestPermission !== 'function'
      && typeof window.DeviceMotionEvent?.requestPermission !== 'function') activate();

  return {
    current,
    reduced,
    update(delta) {
      const k = reduced.matches ? 1 : 1 - Math.exp(-7.5 * delta);
      current.x += (target.x - current.x) * k;
      current.y += (target.y - current.y) * k;
      return Math.abs(target.x - current.x) + Math.abs(target.y - current.y) > .0001;
    },
    recenter,
    get state() { return {permission, permissionError, sensorActive, sensorSource, calibrated, target: {...target}, current: {...current}}; },
    dispose() { disposed = true; cleanup.forEach(fn => fn()); }
  };
}
