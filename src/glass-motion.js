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
  const cleanup = [];
  let calibrated = false;
  let listening = false;
  let sensorActive = false;
  let permissionPending = false;
  let permission = 'idle';
  let dragging = null;

  function listen(node, type, fn, options) {
    node.addEventListener(type, fn, options);
    cleanup.push(() => node.removeEventListener(type, fn, options));
  }

  function set(x, y) {
    target.x = MathUtils.clamp(x, -1, 1);
    target.y = MathUtils.clamp(y, -1, 1);
    onChange();
  }

  function onOrientation(event) {
    if (preview || document.hidden || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
    const alpha = Number.isFinite(event.alpha) ? event.alpha : 0;
    euler.set(MathUtils.degToRad(event.beta), MathUtils.degToRad(alpha), -MathUtils.degToRad(event.gamma), 'YXZ');
    orientation.setFromEuler(euler);
    if (!calibrated) {
      basis.copy(orientation).invert();
      calibrated = true;
    }
    relative.copy(basis).multiply(orientation);
    direction.set(0, 0, 1).applyQuaternion(relative);
    const angle = MathUtils.degToRad(screen.orientation?.angle ?? window.orientation ?? 0);
    const x = direction.x * Math.cos(angle) + direction.y * Math.sin(angle);
    const y = direction.y * Math.cos(angle) - direction.x * Math.sin(angle);
    sensorActive = true;
    if (!dragging) set(x / .38, -y / .38);
  }

  function attachSensor() {
    if (listening || preview) return;
    listen(window, 'deviceorientation', onOrientation, {passive: true});
    listening = true;
  }

  function activate() {
    if (preview || permissionPending || permission === 'granted' || permission === 'denied') return;
    const api = window.DeviceOrientationEvent;
    if (!window.isSecureContext || !api) { permission = 'unavailable'; return; }
    if (typeof api.requestPermission !== 'function') {
      permission = 'granted';
      attachSensor();
      return;
    }
    // Call synchronously inside the gesture: Safari requires user activation.
    permissionPending = true;
    permission = 'pending';
    try {
      Promise.resolve(api.requestPermission()).then(result => {
        permission = result === 'granted' ? 'granted' : 'denied';
        if (permission === 'granted') attachSensor();
      }).catch(() => { permission = 'denied'; }).finally(() => { permissionPending = false; });
    } catch {
      permission = 'denied';
      permissionPending = false;
    }
  }

  function recenter() {
    calibrated = false;
    set(0, 0);
  }

  listen(host, 'pointerdown', event => {
    if (preview || event.isPrimary === false || event.button > 0) return;
    activate();
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
  listen(document, 'visibilitychange', () => { if (!document.hidden) recenter(); });
  listen(reduced, 'change', onChange);
  if (!preview && typeof window.DeviceOrientationEvent?.requestPermission !== 'function') activate();

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
    get state() { return {permission, sensorActive, calibrated, target: {...target}, current: {...current}}; },
    dispose() { cleanup.forEach(fn => fn()); }
  };
}
