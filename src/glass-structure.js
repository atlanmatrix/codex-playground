import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export const GLASS_Z = .55;
export const FLOOR_TOP = -2.81;
export const BENCH_TOP = -1.94;
export const PANE_WIDTH = 2.5;
export const PANE_HEIGHT = 2.4;

function solid(parent, name, dimensions, position, material, bevel = .008) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(...dimensions, 2, bevel), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function createPottingBench(garden) {
  const stone = new THREE.MeshStandardMaterial({color: '#92917b', roughness: .92});
  const steel = new THREE.MeshStandardMaterial({color: '#424d40', metalness: .28, roughness: .6});
  // A continuous top supports the full X/Z footprint of every pot, including
  // the foreground plants; its front edge remains behind the glass.
  const slab = solid(garden, 'potting-bench-top', [14, .2, 4.4], [0, BENCH_TOP - .1, -2], stone, .025);
  const underside = BENCH_TOP - .2;
  const feet = [], legs = [];
  for (const x of [-6.5, 0, 6.5]) {
    for (const z of [-3.9, -.1]) {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(.11, .12, .035, 24), steel);
      foot.name = 'bench-foot';
      foot.position.set(x, FLOOR_TOP + .0175, z);
      foot.castShadow = true;
      foot.receiveShadow = true;
      garden.add(foot);
      feet.push(foot);
      const bottom = FLOOR_TOP + .035;
      legs.push(solid(garden, 'bench-leg', [.08, underside - bottom, .08], [x, (bottom + underside) / 2, z], steel));
    }
  }
  for (const z of [-3.9, -.1]) {
    solid(garden, 'bench-long-apron', [13.08, .14, .08], [0, underside - .07, z], steel);
  }
  for (const x of [-6.5, 0, 6.5]) {
    solid(garden, 'bench-cross-apron', [.08, .14, 3.8], [x, underside - .07, -2], steel);
  }
  return {slab, legs, feet};
}

export function createPlantPot(group, index, color) {
  const clay = new THREE.MeshStandardMaterial({color, roughness: .85});
  const profile = [
    [0, .035], [.222, .035], [.24, .05], [.318, .526],
    [.341, .526], [.348, .542], [.348, .57], [.333, .585],
    [.301, .585], [.293, .562], [.288, .535], [.206, .10], [0, .10]
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const pot = new THREE.Mesh(new THREE.LatheGeometry(profile, 48), clay);
  pot.name = `pot-${index}`;
  pot.castShadow = true;
  pot.receiveShadow = true;
  group.add(pot);
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(.305, .29, .035, 48), clay);
  saucer.name = `saucer-${index}`;
  saucer.position.y = .0175;
  saucer.castShadow = true;
  saucer.receiveShadow = true;
  group.add(saucer);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(.29, 40), new THREE.MeshStandardMaterial({color: '#343a24', roughness: 1}));
  soil.name = `soil-${index}`;
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = .548;
  soil.receiveShadow = true;
  group.add(soil);
  return {pot, saucer, soil};
}

// Extruded, chamfered sections. Local X is across a bar, local Z is its depth.
// The flat face, angled shoulders and recessed beads have different normals,
// so light follows the section rather than drawing a bright line over a grid.
function profileGeometry(length, horizontal, halfWidth, back, face, bevel) {
  const shape = new THREE.Shape();
  const points = [
    [-halfWidth, back], [halfWidth, back], [halfWidth, face - bevel],
    [halfWidth - bevel, face], [-halfWidth + bevel, face], [-halfWidth, face - bevel]
  ];
  for (let i = 0; i < points.length; i++) {
    const [x, z] = points[i];
    if (i === 0) shape.moveTo(x, -z); else shape.lineTo(x, -z);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {depth: length, bevelEnabled: false, steps: 1, curveSegments: 1});
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -length / 2, 0);
  if (horizontal) geometry.rotateZ(-Math.PI / 2);
  return geometry;
}

export function createWindowFrame(foreground, garden) {
  const paint = new THREE.MeshStandardMaterial({color: '#515b52', metalness: .28, roughness: .42});
  const beadPaint = new THREE.MeshStandardMaterial({color: '#697167', metalness: .25, roughness: .47});
  const rubber = new THREE.MeshStandardMaterial({color: '#252c25', roughness: .96});
  const frame = new THREE.Group();
  frame.name = 'window-frame-assembly';
  foreground.add(frame);
  const xs = Array.from({length: 13}, (_, i) => (i - 6) * PANE_WIDTH - 1.25);
  const ys = Array.from({length: 11}, (_, i) => (i - 5) * PANE_HEIGHT - .3);
  const posts = [], transoms = [], beads = [], gaskets = [];
  const vertical = profileGeometry(26, false, .061, .49, .768, .009);
  const horizontal = profileGeometry(PANE_WIDTH - .126, true, .052, .49, .747, .008);
  const verticalBead = profileGeometry(26, false, .013, .536, .596, .005);
  const horizontalBead = profileGeometry(PANE_WIDTH - .166, true, .013, .536, .596, .005);
  const verticalGasket = new THREE.BoxGeometry(.012, 26, .015);
  const horizontalGasket = new THREE.BoxGeometry(PANE_WIDTH - .178, .012, .015);
  function add(name, geometry, mat, x, y, z = 0) {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    frame.add(mesh);
    return mesh;
  }
  for (const x of xs) {
    posts.push(add('window-structural-post', vertical, paint, x, 0));
    for (const side of [-1, 1]) {
      beads.push(add('vertical-glazing-bead', verticalBead, beadPaint, x + side * .071, 0));
      gaskets.push(add('vertical-glazing-gasket', verticalGasket, rubber, x + side * .090, 0, .551));
    }
  }
  // Horizontal members terminate at the faces of the unbroken uprights. The
  // 2 mm joint and their recessed face make these real T junctions.
  for (let i = 0; i < xs.length - 1; i++) {
    const center = (xs[i] + xs[i + 1]) / 2;
    for (const y of ys) {
      transoms.push(add('window-transom', horizontal, paint, center, y));
      for (const side of [-1, 1]) {
        beads.push(add('horizontal-glazing-bead', horizontalBead, beadPaint, center, y + side * .064));
        gaskets.push(add('horizontal-glazing-gasket', horizontalGasket, rubber, center, y + side * .083, .551));
      }
    }
  }

  // Model the actual pane openings in one draw call. Their edges tuck under
  // the EPDM gasket, leaving no exposed/unheld strip of glass.
  const positions = [], indices = [];
  for (let col = 0; col < xs.length - 1; col++) {
    for (let row = 0; row < ys.length - 1; row++) {
      const left = xs[col] + .087, right = xs[col + 1] - .087;
      const bottom = ys[row] + .08, top = ys[row + 1] - .08;
      const n = positions.length / 3;
      positions.push(left, bottom, 0, right, bottom, 0, right, top, 0, left, top, 0);
      indices.push(n, n + 1, n + 2, n, n + 2, n + 3);
    }
  }
  const panes = new THREE.BufferGeometry();
  panes.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  panes.setIndex(indices);
  panes.computeVertexNormals();

  // The foreground frame also blocks sunlight in the garden render. Invisible
  // shadow casters avoid rendering the crisp frame into the frosted pass.
  const shadowMaterial = new THREE.MeshBasicMaterial({colorWrite: false, depthWrite: false});
  const shadows = new THREE.Group();
  shadows.name = 'window-shadow-casters';
  for (const member of [...posts, ...transoms]) {
    const shadow = new THREE.Mesh(member.geometry, shadowMaterial);
    shadow.position.copy(member.position);
    shadow.castShadow = true;
    shadows.add(shadow);
  }
  garden.add(shadows);
  return {frame, posts, transoms, beads, gaskets, panes};
}
