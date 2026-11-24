// THE TAPE ROOM — woodland study revision (separate version, not deployed).
//
// Same foundations as before: three.js r160 through the import map, content.js drives the library (TAPES / FILES),
// PLAY_FILMS stays false, mouse + keyboard + touch all work. What is new: you walk around a daylight study, pick tapes
// up, turn them over, throw them, feed the VCR, sit at a silver MacBook, leaf through paper and lift a poster corner.
// Drawing lives in art.js, the investigator's fiction in casefile.js, sleeve overrides in sleeves.js.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";   // still ready for real models
import { TAPES, FILES } from "./content.js";
import { SLEEVE_OVERRIDES } from "./sleeves.js";
import { DISCLAIMER, THEORIES, FIELD_NOTES, STACKS } from "./casefile.js";
import * as ART from "./art.js";

const $ = (s) => document.querySelector(s);
const V3 = THREE.Vector3, Quat = THREE.Quaternion;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const touch = matchMedia("(hover: none), (pointer: coarse)").matches;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
export const loader = new GLTFLoader();
// Films are switched off: a tape in the deck shows its card on the TV instead of the film. Flip to true to play clips.
export const PLAY_FILMS = false;
if (!PLAY_FILMS) document.body.classList.add("nofilms");
if (touch) document.body.classList.add("touch");
const rnd = ART.rng(20240611);

// ------------------------------------------------------------------ renderer, scene, camera
const canvas = $("#stage");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
let dpr = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(dpr); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.86;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xe4dccb);
const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 40); camera.rotation.order = "YXZ";

function canvasTex(w, h, draw, rep) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...o });
const shade = (m, cast = true) => { m.castShadow = cast; m.receiveShadow = true; return m; };
const box = (w, h, d, m) => shade(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m));
const cyl = (r, h, m, seg = 16, r2 = r) => shade(new THREE.Mesh(new THREE.CylinderGeometry(r2, r, h, seg), m));
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const tube = (pts, r, m) => shade(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p))), 28, r, 8), m));
// a moulded, rounded box: rounded outline in XY, soft bevel along Z. flat=true lays it down (rounded outline in XZ)
function rbox(w, h, d, r, m, flat = false) {
  const b = Math.min(r * 0.6, d * 0.45), W = w - 2 * b, H = h - 2 * b, x = -W / 2, y = -H / 2, s = new THREE.Shape(); r = Math.min(r, W / 2, H / 2);
  s.moveTo(x + r, y); s.lineTo(x + W - r, y); s.quadraticCurveTo(x + W, y, x + W, y + r); s.lineTo(x + W, y + H - r); s.quadraticCurveTo(x + W, y + H, x + W - r, y + H);
  s.lineTo(x + r, y + H); s.quadraticCurveTo(x, y + H, x, y + H - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 4, curveSegments: 8 });
  g.translate(0, 0, -(d - 2 * b) / 2); if (flat) g.rotateX(-Math.PI / 2);
  return shade(new THREE.Mesh(g, m));
}

// ------------------------------------------------------------------ textures (all drawn here)
const woodTex = (rep, tone = "#a8773f") => canvasTex(512, 512, (c, w, h) => { const r = ART.rng(3);
  for (let i = 0; i < 6; i++) { c.fillStyle = tone; c.fillRect(0, i * h / 6, w, h / 6); c.fillStyle = `rgba(${r() < 0.5 ? "60,30,5" : "255,220,170"},${0.05 + r() * 0.1})`; c.fillRect(0, i * h / 6, w, h / 6); c.fillStyle = "rgba(40,20,5,.35)"; c.fillRect(0, i * h / 6, w, 2); }
  for (let i = 0; i < 420; i++) { const y = r() * h, x = r() * w; c.strokeStyle = `rgba(60,32,8,${0.04 + r() * 0.1})`; c.lineWidth = 0.6 + r(); c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + 60, y + (r() - 0.5) * 6, x + 120, y + (r() - 0.5) * 6, x + 180 + r() * 120, y + (r() - 0.5) * 4); c.stroke(); } }, rep);
const concreteTex = canvasTex(1024, 1024, (c, w, h) => { const r = ART.rng(8); c.fillStyle = "#b7a892"; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h, s = 40 + r() * 190, g = c.createRadialGradient(x, y, 0, x, y, s); g.addColorStop(0, r() < 0.5 ? "rgba(255,236,205,.10)" : "rgba(92,70,48,.09)"); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.fillRect(x - s, y - s, s * 2, s * 2); }
  for (let i = 0; i < 9000; i++) { c.fillStyle = r() < 0.5 ? "rgba(60,45,30,.07)" : "rgba(255,245,225,.07)"; c.fillRect(r() * w, r() * h, 1.5, 1.5); }
  c.strokeStyle = "rgba(70,55,40,.22)"; c.lineWidth = 2; c.strokeRect(1, 1, w - 2, h - 2); }, [3, 3]);
const plasterTex = canvasTex(256, 256, (c, w, h) => ART.paper(c, w, h, "#efe7d6", 12), [4, 2]);
const forestTex = canvasTex(1024, 512, (c, w, h) => { const r = ART.rng(31); const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#f4f6da"); g.addColorStop(0.55, "#cfe0a8"); g.addColorStop(1, "#7f9a5c"); c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.filter = "blur(5px)";
  for (let i = 0; i < 240; i++) { c.fillStyle = `rgba(${70 + r() * 60},${120 + r() * 70},${50 + r() * 40},${0.14 + r() * 0.2})`; c.beginPath(); c.arc(r() * w, r() * h * 0.75, 20 + r() * 60, 0, 7); c.fill(); }
  for (let i = 0; i < 26; i++) { const x = r() * w, tw = 6 + r() * 26; c.fillStyle = `rgba(${70 + r() * 30},${52 + r() * 20},${34},${0.45 + r() * 0.4})`; c.fillRect(x, 0, tw, h); }
  for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(250,255,200,${0.06 + r() * 0.1})`; c.beginPath(); c.arc(r() * w, r() * h * 0.6, 14 + r() * 40, 0, 7); c.fill(); }
  c.filter = "none"; });
const rugTex = canvasTex(256, 256, (c, w, h) => { const r = ART.rng(5), cols = ["#b6553a", "#e6d7b8", "#3f5a4a", "#d39b4a", "#e6d7b8", "#7a3b2e"]; for (let y = 0; y < h; y += 16) { c.fillStyle = cols[(y / 16) % cols.length | 0]; c.fillRect(0, y, w, 16); }
  for (let i = 0; i < 5000; i++) { c.fillStyle = r() < 0.5 ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.08)"; c.fillRect(r() * w, r() * h, 2, 1); } });

// ------------------------------------------------------------------ light: broad soft daylight, no bloom, nothing flickers
{ const es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.SphereGeometry(6, 24, 12), new THREE.MeshBasicMaterial({ side: THREE.BackSide, map: canvasTex(8, 64, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#fff6e4"); g.addColorStop(0.5, "#d9cdb6"); g.addColorStop(1, "#8d7658"); c.fillStyle = g; c.fillRect(0, 0, w, h); }) })));
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(5, 3), new THREE.MeshBasicMaterial({ color: 0xffffff })); pane.position.set(-5, 1.4, 0); pane.rotation.y = Math.PI / 2; es.add(pane);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, 0.03).texture; pm.dispose(); }
scene.add(new THREE.HemisphereLight(0xfff3dc, 0x8a7458, 0.85));
const sun = new THREE.DirectionalLight(0xfff0d2, 2.6); sun.position.set(-8, 3.7, 2.2); sun.target.position.set(1, 0, -0.6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -6; sun.shadow.camera.right = 6; sun.shadow.camera.top = 5; sun.shadow.camera.bottom = -5; sun.shadow.camera.near = 1; sun.shadow.camera.far = 22;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 7; scene.add(sun, sun.target);

// ------------------------------------------------------------------ the room
const RX = 3.5, RZ1 = -3, RZ2 = 3.2, RH = 2.8;
const colliders = []; const addCol = (x, z, w, d, h) => colliders.push({ x1: x - w / 2, x2: x + w / 2, z1: z - d / 2, z2: z + d / 2, h });
const timber = mat(0xffffff, { map: woodTex([1, 3], "#96693a"), roughness: 0.7 });
const deskWood = mat(0xffffff, { map: woodTex([2, 1], "#b07f45"), roughness: 0.5 });
function buildRoom() {
  const g = new THREE.Group(), plaster = mat(0xffffff, { map: plasterTex, roughness: 0.95, envMapIntensity: 0.6 });
  const floor = shade(new THREE.Mesh(new THREE.PlaneGeometry(RX * 2, RZ2 - RZ1), mat(0xffffff, { map: concreteTex, roughness: 0.3, envMapIntensity: 0.8 })), false);
  floor.rotation.x = -Math.PI / 2; floor.position.z = (RZ1 + RZ2) / 2; g.add(floor);
  const wall = (w, x, z, ry) => { const m = shade(new THREE.Mesh(new THREE.PlaneGeometry(w, RH), plaster), false); m.position.set(x, RH / 2, z); m.rotation.y = ry; g.add(m); return m; };
  wall(RX * 2, 0, RZ1, 0); wall(RX * 2, 0, RZ2, Math.PI); wall(RZ2 - RZ1, RX, (RZ1 + RZ2) / 2, -Math.PI / 2);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(RX * 2, RZ2 - RZ1), mat(0xf3ecdd, { roughness: 1 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, RH, (RZ1 + RZ2) / 2); g.add(ceil);
  for (let i = 0; i < 6; i++) g.add(at(shade(box(RX * 2, 0.16, 0.12, timber), false), 0, RH - 0.08, RZ1 + 0.5 + i * 1.1));
  // the window wall: timber posts and rails, low plastered sill, woodland beyond
  const L = RZ2 - RZ1, zc = (RZ1 + RZ2) / 2;
  g.add(at(box(0.16, 0.5, L, plaster), -RX, 0.25, zc), at(box(0.3, 0.05, L, timber), -RX + 0.05, 0.52, zc), at(box(0.14, 0.14, L, timber), -RX, 2.25, zc), at(box(0.16, 0.42, L, plaster), -RX, 2.59, zc));
  for (let i = 0; i <= 5; i++) g.add(at(box(0.13, 1.75, 0.13, timber), -RX, 1.37, RZ1 + 0.07 + i * (L - 0.14) / 5));
  for (let i = 0; i < 5; i++) g.add(at(box(0.05, 1.7, 0.05, timber), -RX, 1.37, RZ1 + 0.07 + (i + 0.5) * (L - 0.14) / 5));
  const view = new THREE.Mesh(new THREE.PlaneGeometry(L + 6, 6), new THREE.MeshBasicMaterial({ map: forestTex, toneMapped: false })); view.position.set(-RX - 2.2, 1.6, zc); view.rotation.y = Math.PI / 2; g.add(view);
  // skirting, a rug, a door on the front wall, a low bookcase
  g.add(at(box(RX * 2, 0.09, 0.02, timber), 0, 0.045, RZ1 + 0.01), at(box(0.02, 0.09, L, timber), RX - 0.01, 0.045, zc));
  const rug = shade(new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.8), mat(0xffffff, { map: rugTex, roughness: 1 })), false); rug.rotation.x = -Math.PI / 2; rug.position.set(-0.4, 0.004, 0.55); g.add(rug);
  g.add(at(box(0.95, 2.05, 0.05, mat(0xffffff, { map: woodTex([1, 1], "#8a5f34") })), 1.6, 1.025, RZ2 - 0.02));
  const books = canvasTex(512, 256, (c, w, h) => { const r = ART.rng(4); c.fillStyle = "#6e4c2a"; c.fillRect(0, 0, w, h); for (let row = 0; row < 2; row++) { let x = 6; while (x < w - 12) { const bw = 10 + r() * 22, bh = 80 + r() * 34; c.fillStyle = ["#a3231b", "#e6d7b8", "#3f5a4a", "#d39b4a", "#2b2f45", "#c9a98a", "#7d8f9a"][(r() * 7) | 0]; c.fillRect(x, row * 128 + 124 - bh, bw, bh); x += bw + 1; } c.fillStyle = "#4e351c"; c.fillRect(0, row * 128 + 122, w, 6); } });
  const bc = box(0.3, 0.85, 1.7, [timber, mat(0xffffff, { map: books }), timber, timber, timber, timber]); at(bc, RX - 0.16, 0.425, 1.2); g.add(bc); addCol(RX - 0.16, 1.2, 0.3, 1.7, 0.85);
  return g;
}

// the tubular steel cart: chromed tubes, three shelves, casters, cables
function buildCart() {
  const g = new THREE.Group(), steel = mat(0xc4c8cc, { roughness: 0.25, metalness: 0.95 }), shelf = mat(0x35322e, { roughness: 0.6, metalness: 0.3 }), rubber = mat(0x141414, { roughness: 0.9 });
  const W = 0.86, D = 0.6, ys = [0.14, 0.56, 1.0];
  ys.forEach((y) => { g.add(at(box(W - 0.03, 0.016, D - 0.03, shelf), 0, y, 0));
    for (const s of [-1, 1]) { const a = cyl(0.011, W, steel, 10); a.rotation.z = Math.PI / 2; g.add(at(a, 0, y + 0.012, s * D / 2)); const b = cyl(0.011, D, steel, 10); b.rotation.x = Math.PI / 2; g.add(at(b, s * W / 2, y + 0.012, 0)); } });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const x = sx * W / 2, z = sz * D / 2;
    g.add(at(cyl(0.015, 1.0, steel, 12), x, 0.57, z), at(new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), steel), x, 1.07, z), at(box(0.03, 0.05, 0.012, steel), x, 0.055, z));
    const wh = cyl(0.036, 0.024, rubber, 16); wh.rotation.z = Math.PI / 2; g.add(at(wh, x, 0.036, z + 0.012)); }
  g.add(tube([[0.2, 1.3, -0.4], [0.24, 1.0, -0.42], [0.3, 0.3, -0.4], [0.34, 0.012, -0.55], [0.7, 0.012, -1.0], [0.9, 0.012, -1.6]], 0.006, rubber));
  g.add(tube([[-0.15, 1.25, -0.4], [-0.22, 0.95, -0.44], [-0.12, 0.66, -0.36], [-0.1, 0.62, -0.17]], 0.005, mat(0xc9b037, { roughness: 0.6 })));
  g.add(tube([[0.1, 0.61, -0.17], [0.16, 0.4, -0.4], [0.3, 0.012, -0.6], [0.75, 0.012, -1.05]], 0.005, rubber));
  return { group: g, top: 1.008, middle: 0.568 };
}

// the CRT: rounded moulded housing, recessed bezel, near-flat glass. `screen` is the mesh the picture is drawn on
function buildTV(tex) {
  const g = new THREE.Group(), shell = mat(0x2d2b28, { roughness: 0.55 }), dark = mat(0x151413, { roughness: 0.4 });
  g.add(at(rbox(0.68, 0.56, 0.28, 0.06, shell), 0, 0.28, 0.01), at(rbox(0.6, 0.48, 0.22, 0.09, shell), 0, 0.275, -0.2), at(rbox(0.42, 0.34, 0.16, 0.08, shell), 0, 0.27, -0.36));
  const sy = 0.315, sw = 0.5, sh = 0.375, fz = 0.15;
  g.add(at(rbox(sw + 0.05, sh + 0.05, 0.02, 0.035, dark), 0, sy, fz - 0.002));
  const geo = new THREE.PlaneGeometry(sw, sh, 20, 16), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const nx = p.getX(i) / (sw / 2), ny = p.getY(i) / (sh / 2); p.setZ(i, 0.006 * (1 - nx * nx) * (1 - ny * ny)); } geo.computeVertexNormals();
  const screen = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); at(screen, 0, sy, fz + 0.0095); g.add(screen);
  const glass = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, roughness: 0.08, clearcoat: 1, depthWrite: false })); at(glass, 0, sy, fz + 0.011); g.add(glass);
  const grille = canvasTex(128, 32, (c, w, h) => { c.fillStyle = "#2d2b28"; c.fillRect(0, 0, w, h); c.fillStyle = "#0c0c0c"; for (let x = 4; x < w; x += 6) c.fillRect(x, 4, 2.5, h - 8); });
  g.add(at(new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.04), mat(0xffffff, { map: grille })), -0.2, 0.065, fz + 0.0005));
  const knob = mat(0x3a3835, { roughness: 0.4, metalness: 0.2 });
  [0.14, 0.21].forEach((x) => { const d = cyl(0.016, 0.02, knob, 20); d.rotation.x = Math.PI / 2; g.add(at(d, x, 0.065, fz + 0.008)); });
  g.add(at(rbox(0.04, 0.02, 0.012, 0.006, knob), 0.02, 0.065, fz + 0.004));
  g.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.004, 10), new THREE.MeshBasicMaterial({ color: 0xe5402a })), 0.07, 0.065, fz + 0.001));
  return { group: g, screen, center: new V3(0, sy, fz + 0.01), sw, sh };
}

// the VCR: a deck with a tape slot, buttons and a steady clock. `slot` is where tapes go in (deck space)
function buildVCR() {
  const g = new THREE.Group(), body = mat(0x1f1e1c, { roughness: 0.45, metalness: 0.4 });
  g.add(at(rbox(0.43, 0.09, 0.32, 0.012, body), 0, 0.045, 0), at(rbox(0.425, 0.08, 0.008, 0.008, mat(0x8f9296, { roughness: 0.35, metalness: 0.8 })), 0, 0.045, 0.161));
  g.add(at(box(0.214, 0.034, 0.004, new THREE.MeshBasicMaterial({ color: 0x050505 })), -0.06, 0.055, 0.1645));
  for (let i = 0; i < 5; i++) g.add(at(box(0.016, 0.008, 0.006, mat(0x2a2a2a)), 0.075 + i * 0.022, 0.022, 0.166));
  const led = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.0175), new THREE.MeshBasicMaterial({ map: canvasTex(160, 40, (c) => { c.fillStyle = "#031006"; c.fillRect(0, 0, 160, 40); c.fillStyle = "#49ff9a"; c.font = "600 30px ui-monospace, monospace"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("12:00", 80, 21); }), toneMapped: false }));
  led.position.set(0.14, 0.055, 0.166); g.add(led);
  return { group: g, slot: new V3(-0.06, 0.055, 0.17), led };
}

// a VHS tape in an illustrated sleeve. Built upright: front cover +z, back -z, spine +x. Lies flat with FLAT below.
const TW = 0.105, TH = 0.19, TD = 0.026;
function paintSleeve(c, w, h, t, tex) {
  const ov = SLEEVE_OVERRIDES[t.id] || {};
  if (ov.tagline) ART.TAGLINES[t.id] = ov.tagline;
  if (ov.paint) ov.paint(c, w, h, t, ART.kit(c, ART.hash(t.id))); else ART.paintCover(c, w, h, t, ov.motif);
  if (ov.image) { const im = new Image(); im.onload = () => { const s = Math.max(w / im.width, h / im.height); c.drawImage(im, (w - im.width * s) / 2, (h - im.height * s) / 2, im.width * s, im.height * s); if (tex) tex.needsUpdate = true; }; im.src = ov.image; }
}
function buildTape(t, i) {
  const front = canvasTex(384, 696, (c, w, h) => {}), spine = canvasTex(96, 696, (c, w, h) => ART.paintSpine(c, w, h, t, i + 1)), back = canvasTex(384, 696, (c, w, h) => ART.paintBack(c, w, h, t));
  paintSleeve(front.image.getContext("2d"), 384, 696, t, front);
  const edge = mat(0x161514, { roughness: 0.6 }), m = (tx) => mat(0xffffff, { map: tx, roughness: 0.62 });
  const mesh = shade(new THREE.Mesh(new THREE.BoxGeometry(TW, TH, TD), [m(spine), mat(new THREE.Color(t.spine).multiplyScalar(0.8), { roughness: 0.7 }), edge, edge, m(front), m(back)]));
  return { mesh, tape: t, cover: front.image, name: t.title };
}

// the silver MacBook Pro on a wooden desk. `screen` shows the desktop; the folders open full screen
function buildDesk(macTex) {
  const g = new THREE.Group(), alu = mat(0xd2d5d9, { roughness: 0.32, metalness: 0.9 });
  g.add(at(box(1.6, 0.04, 0.72, deskWood), 0, 0.74, 0), at(box(1.5, 0.1, 0.62, timber), 0, 0.67, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(at(box(0.06, 0.72, 0.06, timber), sx * 0.74, 0.36, sz * 0.3));
  g.add(at(box(0.5, 0.012, 0.02, mat(0x2a2622)), 0, 0.67, 0.315));
  const mac = new THREE.Group(); mac.position.set(0, 0.76, 0.04); g.add(mac);
  mac.add(at(rbox(0.312, 0.221, 0.014, 0.014, alu, true), 0, 0.007, 0));
  const keys = canvasTex(512, 220, (c, w, h) => { c.fillStyle = "#1b1b1d"; c.fillRect(0, 0, w, h); c.fillStyle = "#2c2c2f"; for (let r = 0; r < 6; r++) for (let k = 0; k < 14; k++) { if (r === 5 && k > 3 && k < 9) continue; c.fillRect(6 + k * 36, 6 + r * 36, 30, 30); } c.fillRect(6 + 4 * 36, 186, 174, 30); });
  const kb = new THREE.Mesh(new THREE.PlaneGeometry(0.272, 0.112), mat(0xffffff, { map: keys, roughness: 0.6 })); kb.rotation.x = -Math.PI / 2; mac.add(at(kb, 0, 0.0143, -0.034));
  const tp = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.074), mat(0xc3c6ca, { roughness: 0.22, metalness: 0.9 })); tp.rotation.x = -Math.PI / 2; mac.add(at(tp, 0, 0.0143, 0.066));
  const lid = new THREE.Group(); lid.position.set(0, 0.014, -0.108); lid.rotation.x = -0.32; mac.add(lid);
  lid.add(at(rbox(0.312, 0.212, 0.006, 0.014, alu), 0, 0.106, 0));
  lid.add(at(new THREE.Mesh(new THREE.PlaneGeometry(0.302, 0.2), new THREE.MeshBasicMaterial({ color: 0x0a0a0a })), 0, 0.107, 0.0032));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.292, 0.186), new THREE.MeshBasicMaterial({ map: macTex, toneMapped: false })); lid.add(at(screen, 0, 0.107, 0.0036));
  // a mug and a pot of pencils
  g.add(at(cyl(0.04, 0.09, mat(0xe9e2d2, { roughness: 0.4 }), 20), -0.34, 0.805, 0.2), at(cyl(0.035, 0.1, mat(0x3f5a4a, { roughness: 0.5 }), 16), 0.36, 0.81, -0.22));
  [[0.35, 0.12, 0xd39b4a], [0.37, -0.1, 0xa3231b], [0.345, 0.02, 0x2b2f45]].forEach(([x, t, col]) => { const p = cyl(0.004, 0.17, mat(col), 6); p.rotation.z = t; g.add(at(p, x, 0.88, -0.22)); });
  return { group: g, screen, mac };
}

// asparagus fern: arching stems, alternating branchlets, clouds of fine needle-like cladodes (all hair-thin lines)
function buildFern(scale, fronds, seed, pot = true) {
  const r = ART.rng(seed), pos = [], col = [], g = new THREE.Group(), up = new V3(0, 1, 0);
  const seg = (a, b, c1) => { pos.push(a.x, a.y, a.z, b.x, b.y, b.z); col.push(...c1, ...c1); };
  for (let f = 0; f < fronds; f++) {
    const yaw = r() * Math.PI * 2, len = (0.55 + r() * 0.55) * scale, arch = 0.5 + r() * 0.7, dir = new V3(Math.cos(yaw), 0, Math.sin(yaw)), side = new V3().crossVectors(dir, up);
    const P = (t) => dir.clone().multiplyScalar(len * (0.15 * t + arch * 0.75 * t * t)).add(new V3(0, len * (t - 0.62 * arch * t * t), 0));
    let prev = P(0); const S = 16;
    for (let i = 1; i <= S; i++) { const t = i / S, p = P(t); seg(prev, p, [0.09, 0.16, 0.05]); prev = p; if (i < 3) continue;
      for (const s of [-1, 1]) { const bl = len * 0.26 * (1.05 - t * 0.75) * (0.7 + r() * 0.5), bd = side.clone().multiplyScalar(s * 0.9).add(dir.clone().multiplyScalar(0.4)).add(new V3(0, 0.1 + r() * 0.25, 0)).normalize(); let q = p.clone();
        for (let j = 1; j <= 5; j++) { const q2 = p.clone().add(bd.clone().multiplyScalar(bl * j / 5)); q2.y -= bl * 0.12 * (j / 5) ** 2; seg(q, q2, [0.12, 0.21, 0.07]); q = q2;
          for (let n = 0; n < 5; n++) { const nd = new V3(r() - 0.5, r() * 0.7, r() - 0.5).normalize().multiplyScalar(0.022 * scale * (0.6 + r())); const gcol = 0.2 + r() * 0.16; seg(q, q.clone().add(nd), [gcol * 0.62, gcol, gcol * 0.36]); } } } }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true })); g.add(lines);
  if (pot) { const h = 0.22 * scale + 0.06; g.add(at(cyl(0.1 * scale + 0.03, h, mat(0xb9683f, { roughness: 0.85 }), 20, 0.13 * scale + 0.04), 0, h / 2, 0), at(cyl(0.12 * scale + 0.035, 0.01, mat(0x3a2a1c), 20), 0, h - 0.004, 0)); lines.position.y = h - 0.01; }
  return g;
}

// a graceful cream seated figure (deliberately unlabelled)
function buildBuddha() {
  const g = new THREE.Group(), m = mat(0xf1e7d0, { roughness: 0.45 }), sph = (r, x, y, z, sx = 1, sy = 1, sz = 1) => { const s = shade(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), m)); s.scale.set(sx, sy, sz); return at(s, x, y, z); };
  const prof = [[0.001, 0], [0.118, 0], [0.126, 0.012], [0.12, 0.028], [0.1, 0.034], [0.112, 0.06], [0.1, 0.09], [0.074, 0.122], [0.06, 0.16], [0.067, 0.2], [0.06, 0.232], [0.034, 0.252], [0.021, 0.262], [0.02, 0.28]].map(([x, y]) => new THREE.Vector2(x, y));
  const body = shade(new THREE.Mesh(new THREE.LatheGeometry(prof, 36), m)); body.scale.z = 0.78; g.add(body);
  g.add(sph(0.04, 0, 0.31, 0, 0.95, 1.15, 1), sph(0.017, 0, 0.36, -0.004), sph(0.012, -0.039, 0.3, 0, 0.5, 1.7, 0.8), sph(0.012, 0.039, 0.3, 0, 0.5, 1.7, 0.8));
  g.add(sph(0.05, -0.07, 0.066, 0.035, 1.25, 0.55, 1.1), sph(0.05, 0.07, 0.066, 0.035, 1.25, 0.55, 1.1), sph(0.03, 0, 0.1, 0.07, 1.4, 0.5, 0.8));
  g.add(sph(0.022, -0.062, 0.2, 0.012, 1, 1.9, 1), sph(0.022, 0.062, 0.2, 0.012, 1, 1.9, 1));
  return g;
}

// ------------------------------------------------------------------ place everything
const room = buildRoom(); scene.add(room);
const CART = new V3(-0.5, 0, -1.3), DESK = new V3(1.75, 0, -2.5), BENCH = new V3(-1.8, 0, -1.4);
const tvc = document.createElement("canvas"); tvc.width = 640; tvc.height = 480; const tvCtx = tvc.getContext("2d"); const tvTex = new THREE.CanvasTexture(tvc); tvTex.colorSpace = THREE.SRGBColorSpace; tvTex.anisotropy = 8;
const macC = document.createElement("canvas"); macC.width = 1024; macC.height = 652; const macTex = new THREE.CanvasTexture(macC); macTex.colorSpace = THREE.SRGBColorSpace; macTex.anisotropy = 8;
const cart = buildCart(); cart.group.position.copy(CART); scene.add(cart.group); addCol(CART.x, CART.z, 0.9, 0.64, 1.0);
const tv = buildTV(tvTex); tv.group.position.set(0, cart.top, 0.05); cart.group.add(tv.group);
const vcr = buildVCR(); vcr.group.position.set(0, cart.middle, 0.05); cart.group.add(vcr.group);
const desk = buildDesk(macTex); desk.group.position.copy(DESK); scene.add(desk.group); addCol(DESK.x, DESK.z, 1.6, 0.72, 0.76);
const bench = new THREE.Group(); bench.add(at(box(0.8, 0.05, 0.4, deskWood), 0, 0.4, 0)); for (const s of [-1, 1]) bench.add(at(box(0.05, 0.38, 0.36, timber), s * 0.34, 0.19, 0)); bench.position.copy(BENCH); scene.add(bench); addCol(BENCH.x, BENCH.z, 0.8, 0.4, 0.425);
const plinth = at(cyl(0.2, 0.6, timber, 24), -2.75, 0.3, -2.35); scene.add(plinth); addCol(-2.75, -2.35, 0.4, 0.4, 0.6);
[[-2.9, 0, 0.5, 1.25, 13], [3.0, 0, -0.6, 1.0, 11], [-2.95, 0, 2.5, 0.9, 10]].forEach(([x, y, z, s, n], i) => { scene.add(at(buildFern(s, n, 11 + i), x, y, z)); addCol(x, z, 0.36, 0.36, 0.3); });
scene.add(at(buildFern(0.42, 8, 21), DESK.x - 0.66, 0.76, DESK.z - 0.18));
const slotW = new V3().copy(CART).add(new V3(vcr.slot.x, cart.middle + vcr.slot.y, 0.05 + vcr.slot.z));
const FLAT = new Quat().setFromEuler(new THREE.Euler(-Math.PI / 2, -Math.PI / 2, 0, "YXZ"));

const tapes = TAPES.map((t, i) => { const T = buildTape(t, i), st = i < 6 ? 0 : 1, j = st ? i - 6 : i;
  T.rest = new V3(BENCH.x + (st ? 0.17 : -0.17), 0.425 + TD / 2 + j * (TD + 0.0005), BENCH.z + 0.06 + (rnd() - 0.5) * 0.02);
  T.restQ = new Quat().setFromEuler(new THREE.Euler(-Math.PI / 2, -Math.PI / 2 + (rnd() - 0.5) * 0.12, 0, "YXZ"));
  T.mesh.position.copy(T.rest); T.mesh.quaternion.copy(T.restQ); scene.add(T.mesh); return T; });
const buddhaG = buildBuddha(); const buddha = { mesh: buddhaG, name: "the cream figure", rest: new V3(-2.75, 0.6, -2.35), restQ: new Quat().setFromEuler(new THREE.Euler(0, 0.6, 0)) };
buddhaG.position.copy(buddha.rest); buddhaG.quaternion.copy(buddha.restQ); scene.add(buddhaG);

// the investigation wall: one dense collage + separate large illustrated posters + a poster with a liftable corner
const NOTES = [...THEORIES, ...FIELD_NOTES, ["WHO IS S.F.?", "Evidence: eleven tapes, one laptop, zero confessions."], ["NB", "None of this is true. It is very well pinned, though."]];
const wallTex = canvasTex(4096, 1280, (c, w, h) => ART.paintWall(c, w, h, TAPES, NOTES));
const wallBoard = shade(new THREE.Mesh(new THREE.PlaneGeometry(6.7, 2.09), mat(0xffffff, { map: wallTex, roughness: 0.9, envMapIntensity: 0.45 })), false); at(wallBoard, 0, 1.66, RZ1 + 0.012); scene.add(wallBoard);
const byId = (id) => TAPES.find((t) => t.id === id) || TAPES[0];
const posterTex = (t) => canvasTex(512, 716, (c, w, h) => paintSleeve(c, w, h, t));
const posters = [["avatar", -2.5, 1.72, 0.66, 0.02], ["zombie-cowboys", -1.72, 2.02, 0.42, -0.04], ["samurai-barber", -1.2, 1.42, 0.4, 0.05], ["goat", -0.1, 2.08, 0.42, -0.03], ["tough-love", 1.3, 2.12, 0.38, 0.04], ["samurai-bounty-hunter", 2.25, 2.0, 0.44, -0.03], ["la-croisiere", 2.98, 1.6, 0.44, 0.03]].map(([id, x, y, w, rot], i) => {
  const t = byId(id), tex = posterTex(t), m = shade(new THREE.Mesh(new THREE.PlaneGeometry(w, w * 1.4), mat(0xffffff, { map: tex, roughness: 0.85 })), false);
  at(m, x, y, RZ1 + 0.02 + i * 0.001); m.rotation.z = rot; scene.add(m); return { mesh: m, canvas: tex.image, t }; });
const LW = 0.5, LH = 0.7, liftPos = new V3(0.62, 1.52, RZ1 + 0.03);
const underTex = canvasTex(512, 716, (c, w, h) => { ART.paper(c, w, h, "#f4eedd", 71); const k = ART.kit(c, 72); ART.hand(c, "what the posters are hiding", w / 2, 60, 30, { r: k.r, weight: 700, col: "#a3231b", max: w * 0.86 });
  k.at(w * 0.3, h * 0.3, 90); ART.MOTIFS.generic(k); k.at(w * 0.72, h * 0.3, 80); ART.MOTIFS.goat(k); k.at(w * 0.32, h * 0.62, 90); ART.MOTIFS.grow(k); k.at(w * 0.72, h * 0.66, 100); ART.MOTIFS.avatar(k);
  k.at(0, 0, 1).line([[w * 0.42, h * 0.3], [w * 0.6, h * 0.3]], { w: 3, col: "#a3231b" }).line([[w * 0.7, h * 0.42], [w * 0.4, h * 0.56]], { w: 3, col: "#a3231b" }).line([[w * 0.45, h * 0.64], [w * 0.58, h * 0.66]], { w: 3, col: "#a3231b" });
  ART.handBlock(c, "A tape, then a goat, then a plant, then a shadow. In that order? In ANY order? (A drawing, not a finding.)", w * 0.08, h * 0.86, 21, w * 0.84, 28, { r: k.r }); });
const under = new THREE.Mesh(new THREE.PlaneGeometry(LW, LH), mat(0xffffff, { map: underTex, roughness: 0.9 })); under.position.copy(liftPos).z -= 0.006; scene.add(under);
const liftTex = posterTex(byId("anywhere"));
const lift = shade(new THREE.Mesh(new THREE.PlaneGeometry(LW, LH, 20, 28), mat(0xffffff, { map: liftTex, roughness: 0.85, side: THREE.DoubleSide })), true); lift.position.copy(liftPos); scene.add(lift);
const liftBase = lift.geometry.attributes.position.array.slice(); let liftK = 0, liftOpen = false;
function setLift(k) { liftK = k; const p = lift.geometry.attributes.position, d = Math.SQRT1_2, L = 0.04 + 0.21 * k, a = 2.5 * k, px = LW / 2 - d * L, py = -LH / 2 + d * L;
  for (let i = 0; i < p.count; i++) { const x = liftBase[i * 3], y = liftBase[i * 3 + 1], s = (x - px) * d - (y - py) * d;
    if (s > 0 && k > 0) p.setXYZ(i, x - d * s + d * s * Math.cos(a), y + d * s - d * s * Math.cos(a), s * Math.sin(a) + 0.002); else p.setXYZ(i, x, y, 0); }
  p.needsUpdate = true; lift.geometry.computeVertexNormals(); lift.geometry.computeBoundingSphere(); lift.geometry.computeBoundingBox(); }
setLift(0.12);   // a corner that is already curling a little, as an invitation

// paper stacks on the desk
const stacks = Object.entries(STACKS).map(([id, s], n) => { const pages = s.pages.map((pg, i) => { const c = document.createElement("canvas"); c.width = 620; c.height = 877; ART.paintPage(c.getContext("2d"), 620, 877, pg, i); return c; });
  const tex = new THREE.CanvasTexture(pages[0]); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const pile = box(0.21, 0.035, 0.297, mat(0xf1e8d2, { roughness: 0.9 })); const x = DESK.x + (n ? 0.54 : -0.42), z = DESK.z + 0.1; at(pile, x, 0.7775, z); pile.rotation.y = n ? -0.12 : 0.1; scene.add(pile);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.297), mat(0xffffff, { map: tex, roughness: 0.9 })); top.rotation.x = -Math.PI / 2; top.position.set(0, 0.0185, 0); top.rotation.z = 0.05; pile.add(top);
  return { id, title: s.title, pages, tex, pile, top, i: 0 }; });

// ------------------------------------------------------------------ state, tweens, camera
const state = { mode: "walk", held: null, loaded: null, back: null, under: null, busy: false };
const cam = { pos: new V3(0.55, 1.56, 2.2), yaw: 0.2, pitch: -0.1 };
const tweens = []; const ease = (k) => (reduced ? 1 : k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
const tween = (ms, fn) => new Promise((done) => tweens.push({ t0: performance.now(), ms: reduced ? 1 : ms, fn, done }));
const moveTo = (mesh, pos, q, ms = 450) => { const p0 = mesh.position.clone(), q0 = mesh.quaternion.clone(); return tween(ms, (k) => { mesh.position.lerpVectors(p0, pos, k); if (q) mesh.quaternion.slerpQuaternions(q0, q, k); }); };
function camTo(pos, yaw, pitch, ms = 800) { const p0 = cam.pos.clone(), y0 = cam.yaw, t0 = cam.pitch; let dy = (yaw - y0) % (Math.PI * 2); if (dy > Math.PI) dy -= Math.PI * 2; if (dy < -Math.PI) dy += Math.PI * 2;
  state.busy = true; return tween(ms, (k) => { cam.pos.lerpVectors(p0, pos, k); cam.yaw = y0 + dy * k; cam.pitch = t0 + (pitch - t0) * k; }).then(() => { state.busy = false; }); }
function lookFrom(pos, target, ms) { const d = target.clone().sub(pos); return camTo(pos, Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), ms); }
const fitDist = (w, h) => { const t = Math.tan((camera.fov * Math.PI) / 360); return Math.max(h / 2 / t, w / 2 / (t * camera.aspect)) * 1.3; };
const remember = () => { if (!state.back) state.back = { pos: cam.pos.clone(), yaw: cam.yaw, pitch: cam.pitch }; };

// ------------------------------------------------------------------ screens
const FONT = '"Geist", ui-sans-serif, system-ui, sans-serif';
function fitText(c, text, weight, max, width) { let s = max; do { c.font = `${weight} ${s}px ${FONT}`; s -= 2; } while (c.measureText(text).width > width && s > 12); }
function drawTV() { const c = tvCtx, T = state.loaded && state.loaded.tape; c.textAlign = "left"; c.textBaseline = "alphabetic";
  if (!T) { c.fillStyle = "#1c2f9e"; c.fillRect(0, 0, 640, 480); c.fillStyle = "#fff"; c.font = `600 26px ${FONT}`; c.fillText("VCR", 40, 60); c.textAlign = "right"; c.fillText("12:00", 600, 60); c.textAlign = "center"; c.font = `700 54px ${FONT}`; c.fillText("NO TAPE", 320, 240); c.font = `500 24px ${FONT}`; c.fillText("Pick a tape from the bench and put it in the deck", 320, 290); }
  else { c.fillStyle = "#12161b"; c.fillRect(0, 0, 640, 480); c.fillStyle = T.spine; c.fillRect(0, 0, 640, 14); c.fillStyle = "#7dffb0"; c.font = `600 24px ${FONT}`; c.fillText("▶ PLAY", 40, 62); c.fillStyle = "#fff"; c.textAlign = "right"; c.fillText(`${T.client} · ${T.year}`, 600, 62); c.textAlign = "left";
    fitText(c, T.title.toUpperCase(), 700, 72, 560); c.fillText(T.title.toUpperCase(), 40, 150); c.font = `500 23px ${FONT}`; c.fillStyle = "#d9dde2";
    T.clips.slice(0, 7).forEach((cl, i) => { let s = `${String(i + 1).padStart(2, "0")}  ${cl.title}`; while (c.measureText(s).width > 560) s = s.slice(0, -2) + "…"; c.fillText(s, 40, 205 + i * 32); });
    c.fillStyle = "#ffd76a"; c.font = `600 19px ${FONT}`; c.fillText(PLAY_FILMS ? "Full screen to watch" : "Film playback is switched off in this build.", 40, 440); c.fillStyle = "#d9dde2"; c.fillText(PLAY_FILMS ? "" : "Use “Project page” to see the published work.", 40, 464); }
  tvTex.needsUpdate = true; }
const FOLDERS = [["published", "Published work"], ["theories", "Theories (unverified)"], ["notes", "Field notes"], ["readme", "READ ME FIRST.txt"]];
function drawMac() { const c = macC.getContext("2d"), w = 1024, h = 652; const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, "#dfe8c9"); g.addColorStop(1, "#8fae8a"); c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = "rgba(255,255,255,.75)"; c.fillRect(0, 0, w, 30); c.fillStyle = "#222"; c.font = `600 17px ${FONT}`; c.textAlign = "left"; c.fillText("Finder    File    Edit    View    Go", 18, 21); c.textAlign = "right"; c.fillText("Tue 12:00", w - 18, 21);
  c.fillStyle = "#fbfaf7"; c.fillRect(150, 80, 724, 470); c.fillStyle = "#e6e3dc"; c.fillRect(150, 80, 724, 40); ["#ee6a5f", "#f5bd4f", "#61c454"].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(174 + i * 24, 100, 8, 0, 7); c.fill(); });
  c.fillStyle = "#333"; c.textAlign = "center"; c.font = `600 18px ${FONT}`; c.fillText("CASE FILE — S.F. (fiction)", 512, 106);
  FOLDERS.forEach(([id, name], i) => { const x = 250 + (i % 4) * 175, y = 220; c.fillStyle = id === "readme" ? "#fff" : "#5aa9f0"; c.fillRect(x - 45, y - 30, 90, 70); if (id !== "readme") { c.fillStyle = "#8cc6ff"; c.fillRect(x - 45, y - 42, 40, 14); } else { c.strokeStyle = "#999"; c.strokeRect(x - 45, y - 30, 90, 70); }
    c.fillStyle = "#222"; c.font = `500 15px ${FONT}`; c.fillText(name, x, y + 66); });
  c.font = `500 17px ${FONT}`; c.fillStyle = "#555"; c.fillText("Click the MacBook to open these folders", 512, 420); c.fillText(`${FILES.length + TAPES.length} published links · ${THEORIES.length} incompatible theories`, 512, 450);
  macTex.needsUpdate = true; }
drawTV(); drawMac(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawTV(); drawMac(); });

// ------------------------------------------------------------------ sound (WebAudio, only after a gesture, mutable)
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const sound = { ctx: null, muted: store.get("tape-muted") === "1",
  init() { if (!this.ctx) try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {} },
  tick(f = 160, d = 0.09, v = 0.07, type = "triangle") { if (this.muted || !this.ctx) return; const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + d); } };
const muteBtn = $("#mute"); const paintMute = () => { muteBtn.textContent = sound.muted ? "Sound off" : "Sound on"; muteBtn.setAttribute("aria-pressed", String(sound.muted)); }; paintMute();
muteBtn.onclick = () => { sound.muted = !sound.muted; store.set("tape-muted", sound.muted ? "1" : "0"); paintMute(); sound.init(); sound.tick(440, 0.05); };

// ------------------------------------------------------------------ UI
const ui = { actions: $("#actions"), tip: $("#tip"), prompt: $("#prompt"), reader: $("#reader"), rtitle: $("#rtitle"), rbody: $("#rbody"), sr: $("#sr") };
const say = (s) => { ui.sr.textContent = s; };
function setActions(list) { ui.actions.innerHTML = ""; list.filter(Boolean).forEach((a) => { const el = document.createElement(a.href ? "a" : "button"); el.textContent = a.label; if (a.href) el.href = a.href; else el.onclick = a.fn; if (a.key) el.dataset.key = a.key; ui.actions.appendChild(el); }); }
function refresh() { const m = state.mode, h = state.held, L = state.loaded;
  if (m === "hold") { setActions([h.tape && { label: "Insert in VCR (E)", fn: () => insert(h), key: "e" }, { label: "Put down (Q)", fn: putDown, key: "q" }, h.tape && { label: "Throw (T)", fn: throwHeld, key: "t" }, h.tape && { label: "Project page", href: h.tape.page }]);
    ui.tip.textContent = h.tape ? `Holding “${h.name}”. Drag to turn it over.` : `Holding ${h.name}. Drag to turn it.`; }
  else if (m === "tv") { setActions([{ label: "Full screen (F)", fn: fullTV, key: "f" }, L && { label: "Eject (E)", fn: eject, key: "e" }, L && { label: "Project page", href: L.tape.page }, { label: "Back (Esc)", fn: back, key: "escape" }]); ui.tip.textContent = L ? `“${L.name}” is in the deck.` : "No tape in the deck."; }
  else if (m === "walk") { setActions([{ label: "Watch the TV (V)", fn: viewTV, key: "v" }, { label: "Use the MacBook (C)", fn: viewMac, key: "c" }, tapes.some((T) => T.loose) && { label: "Recover tapes (R)", fn: recover, key: "r" }, L && { label: "Eject tape", fn: eject }]);
    ui.tip.textContent = touch ? "Drag to look · left stick to walk · tap things to pick them up" : "Drag to look · W A S D or arrows to walk · click things to pick them up"; }
  else { setActions([]); ui.tip.textContent = ""; }
  ui.tip.hidden = !ui.tip.textContent || m === "read" || m === "mac"; ui.prompt.hidden = true; }

function openReader(title, build) { if (state.mode !== "read") state.under = state.mode; state.mode = "read"; ui.rtitle.textContent = title; ui.rbody.innerHTML = ""; build(ui.rbody); ui.reader.hidden = false; refresh(); $("#rback").focus(); say(title); }
function back() {
  if (!ui.reader.hidden) { ui.reader.hidden = true; ui.rbody.innerHTML = ""; state.mode = state.under || "walk"; state.under = null; canvas.focus(); if (state.mode === "mac") return leave(); return refresh(); }
  if (state.mode === "hold") return putDown();
  if (state.mode === "tv" || state.mode === "mac") leave(); }
function leave() { const b = state.back; state.back = null; state.mode = "walk"; refresh(); if (b) camTo(b.pos, b.yaw, b.pitch, 650); }
$("#rback").onclick = back;
const el = (tag, props = {}, kids = []) => { const e = Object.assign(document.createElement(tag), props); kids.forEach((k) => e.append(k)); return e; };
const copyCanvas = (src) => { const c = el("canvas", { width: src.width, height: src.height }); c.getContext("2d").drawImage(src, 0, 0); return c; };

// ------------------------------------------------------------------ actions
function hold(o) { if (state.busy) return; state.held = o; state.mode = "hold"; o.loose = false; o.vel = null; holdQ.identity(); sound.init(); sound.tick(220, 0.05); refresh(); say(`Holding ${o.name}`); }
function putDown() { const o = state.held; if (!o) return; state.held = null; state.mode = "walk"; moveTo(o.mesh, o.rest, o.restQ, 500); sound.tick(120, 0.07); refresh(); }
function throwHeld() { const o = state.held; if (!o || !o.tape) return; state.held = null; state.mode = "walk"; const d = camera.getWorldDirection(new V3()); o.vel = d.multiplyScalar(4.4).add(new V3(0, 1.7, 0)); o.spin = new V3(rnd() * 8 - 4, rnd() * 8 - 4, rnd() * 8 - 4); o.loose = true; sound.tick(300, 0.12, 0.04, "sine"); refresh(); }
function recover() { tapes.forEach((T) => { if (T.loose) { T.loose = false; T.vel = null; moveTo(T.mesh, T.rest, T.restQ, 700); } }); sound.tick(200, 0.08); refresh(); }
async function insert(T) { if (state.busy || !T || !T.tape) return; if (state.loaded) await eject(true);
  state.held = null; state.mode = "walk"; state.busy = true; setActions([]);
  await moveTo(T.mesh, slotW.clone().add(new V3(0, 0, 0.17)), FLAT, 520); sound.tick(140, 0.1);
  await moveTo(T.mesh, slotW.clone().add(new V3(0, 0, -0.1)), FLAT, 620); sound.tick(90, 0.18, 0.09, "square");
  T.mesh.visible = false; state.loaded = T; state.busy = false; drawTV(); say(`${T.name} is playing`); return viewTV(); }
async function eject(quiet) { const T = state.loaded; if (!T || state.busy) return; state.busy = true; state.loaded = null; drawTV(); T.mesh.visible = true; sound.tick(110, 0.16, 0.08, "square");
  await moveTo(T.mesh, slotW.clone().add(new V3(0, 0, 0.17)), FLAT, 600); state.busy = false; refresh(); const done = moveTo(T.mesh, T.rest, T.restQ, 650); if (quiet === true) await done; }
function viewTV() { if (state.busy) return; remember(); state.mode = "tv"; refresh(); const c = tv.group.localToWorld(tv.center.clone()); return lookFrom(new V3(c.x, c.y + 0.02, c.z + fitDist(tv.sw + 0.2, tv.sh + 0.2)), c, 800); }
function fullTV() { const T = state.loaded && state.loaded.tape; openReader(T ? `TV — ${T.title}` : "TV — no tape", (b) => {
  if (PLAY_FILMS && T) { const v = el("video", { src: T.clips[0].src, controls: true, autoplay: true, playsInline: true }); b.append(v); } else b.append(copyCanvas(tvc));
  b.append(el("p", { className: "cap", textContent: T ? (PLAY_FILMS ? T.clips[0].title : "Film playback is switched off in this build (PLAY_FILMS = false). The card lists what is on the tape.") : "Put a tape in the deck first." }));
  if (T) b.append(el("div", { className: "rnav" }, [el("a", { href: T.page, textContent: "Open project page", className: "chip" })])); }); }
function viewMac() { if (state.busy) return; remember(); state.mode = "mac"; refresh(); const c = desk.screen.getWorldPosition(new V3()); lookFrom(new V3(c.x, c.y + 0.2, c.z + Math.max(0.6, fitDist(0.36, 0.3))), c, 800).then(() => { if (state.mode === "mac") openMac("published"); }); }
function openMac(folder) { openReader("MacBook — Case file (fiction, plus real links)", (b) => {
  const nav = el("nav"), sec = el("section"); b.append(el("div", { className: "mac" }, [nav, sec]));
  const show = (id) => { [...nav.children].forEach((n) => n.setAttribute("aria-current", String(n.dataset.id === id))); sec.innerHTML = ""; sec.scrollTop = 0;
    const fic = () => el("p", { className: "fic", textContent: DISCLAIMER });
    if (id === "published") { sec.append(el("h2", { textContent: "Published work" }), el("p", { textContent: "The real part of the file: links to the published projects." }));
      sec.append(el("ul", {}, FILES.map((f) => el("li", {}, [el("a", { href: f.href }, [f.title, el("span", { textContent: `${f.client} · ${f.kind}` })])]))));
      sec.append(el("h2", { textContent: "On tape" }), el("ul", {}, TAPES.map((t) => el("li", {}, [el("a", { href: t.page }, [t.title, el("span", { textContent: `${t.client} · ${t.year}` })])])))); }
    else if (id === "theories") sec.append(el("h2", { textContent: "Theories (unverified, incompatible)" }), fic(), el("ul", {}, THEORIES.map((n) => el("li", { className: "note" }, [el("b", { textContent: n[0] }), n[1]]))));
    else if (id === "notes") sec.append(el("h2", { textContent: "Field notes" }), fic(), el("ul", {}, FIELD_NOTES.map((n) => el("li", { className: "note" }, [el("b", { textContent: n[0] }), n[1]]))));
    else sec.append(el("h2", { textContent: "READ ME FIRST" }), el("p", { textContent: DISCLAIMER }), el("p", { textContent: "The investigator is invented. The theories contradict each other on purpose. Nobody was researched; nothing private is in here." })); };
  FOLDERS.forEach(([id, name]) => nav.append(el("button", { textContent: name, onclick: () => show(id) }))); [...nav.children].forEach((n, i) => (n.dataset.id = FOLDERS[i][0])); show(folder); }); }
function readStack(s) { openReader(s.title, (b) => { const holder = el("div"), count = el("span"), prev = el("button", { textContent: "‹ Previous sheet" }), next = el("button", { textContent: "Next sheet ›" });
  const show = (i) => { s.i = clamp(i, 0, s.pages.length - 1); holder.innerHTML = ""; holder.append(copyCanvas(s.pages[s.i])); count.textContent = `${s.i + 1} / ${s.pages.length}`; prev.disabled = s.i === 0; next.disabled = s.i === s.pages.length - 1; s.tex.image = s.pages[s.i]; s.tex.needsUpdate = true; s.top.rotation.z = 0.05 - s.i * 0.04; sound.tick(600, 0.04, 0.03, "sine"); };
  prev.onclick = () => show(s.i - 1); next.onclick = () => show(s.i + 1); b.append(holder, el("div", { className: "rnav" }, [prev, count, next]), el("p", { className: "cap", textContent: "Hand-written by a fictional investigator. Not facts." })); show(s.i); }); }
function readCanvas(title, cv, cap) { openReader(title, (b) => { b.append(copyCanvas(cv)); if (cap) b.append(el("p", { className: "cap", textContent: cap })); }); }
function toggleLift() { liftOpen = !liftOpen; const k0 = liftK, k1 = liftOpen ? 1 : 0.12; tween(600, (k) => setLift(k0 + (k1 - k0) * k)); sound.tick(500, 0.06, 0.03, "sine"); say(liftOpen ? "Poster corner lifted: a drawing underneath" : "Poster corner down");
  if (liftOpen && cam.pos.distanceTo(liftPos) > 1.9) lookFrom(new V3(liftPos.x + 0.1, 1.5, liftPos.z + 1.25), liftPos.clone().add(new V3(0.1, -0.1, 0)), 700); }

// ------------------------------------------------------------------ picking
const pickables = []; const reg = (o, label, act) => o.traverse((m) => { if (m.isMesh) { m.userData.pick = { label, act }; pickables.push(m); } });
tapes.forEach((T) => reg(T.mesh, () => `Pick up “${T.name}”`, () => hold(T)));
reg(buddhaG, () => "Pick up the figure", () => hold(buddha));
reg(tv.group, () => (state.held && state.held.tape ? "Put the tape in the deck" : "Watch the TV"), () => (state.mode === "tv" ? fullTV() : viewTV()));
reg(vcr.group, () => (state.loaded ? "Eject the tape" : "The VCR: bring it a tape"), () => (state.loaded ? eject() : viewTV()));
reg(desk.mac, () => "Use the MacBook", viewMac);
stacks.forEach((s) => reg(s.pile, () => "Leaf through the papers", () => readStack(s)));
posters.forEach((p) => reg(p.mesh, () => `Look at the “${p.t.title}” poster`, () => readCanvas(`Poster — ${p.t.title}`, p.canvas, "An illustrated interpretation of the title, drawn in ink. Not a film still.")));
reg(lift, () => (liftOpen ? "Let the corner down" : "Lift the poster corner"), toggleLift);
reg(under, () => "Read the drawing underneath", () => readCanvas("Under the poster — a drawing", underTex.image, "An exploratory drawing by the fictional investigator."));
reg(wallBoard, () => "Step up to the wall", (hit) => lookFrom(new V3(clamp(hit.point.x, -3, 3), 1.5, RZ1 + 1.08), new V3(hit.point.x, clamp(hit.point.y, 1.2, 2.0), RZ1), 700));
const ray = new THREE.Raycaster(); ray.far = 7;
function pick(x, y) { ray.setFromCamera(new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), camera);
  const skip = state.held && state.held.mesh; const hits = ray.intersectObjects(pickables.filter((o) => { let p = o, vis = true; while (p) { if (!p.visible) vis = false; if (p === skip) return false; p = p.parent; } return vis; }), false);
  return hits[0] || null; }
function click(x, y) { if (state.busy || state.mode === "read" || state.mode === "mac") return; const hit = pick(x, y); if (!hit) return; const o = hit.object, pk = o.userData.pick;
  if (state.mode === "hold") { let p = o, onDeck = false; while (p) { if (p === tv.group || p === vcr.group) onDeck = true; p = p.parent; } if (onDeck && state.held.tape) insert(state.held); return; }
  if (state.mode === "tv") { let p = o, onTV = false, onVCR = false; while (p) { if (p === tv.group) onTV = true; if (p === vcr.group) onVCR = true; p = p.parent; } if (onTV) fullTV(); else if (onVCR && state.loaded) eject(); return; }
  pk.act(hit); }

// ------------------------------------------------------------------ input: drag to look / turn, tap to use, keys + stick to walk
const holdQ = new Quat(), keys = {}, joy = { x: 0, y: 0 }; let drag = null;
canvas.addEventListener("pointerdown", (e) => { sound.init(); canvas.focus(); try { canvas.setPointerCapture(e.pointerId); } catch {} if (!drag) drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, t: performance.now() }; });
canvas.addEventListener("pointermove", (e) => {
  if (drag && e.pointerId === drag.id) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved > 7 && !state.busy) { if (state.mode === "hold") { holdQ.premultiply(new Quat().setFromAxisAngle(new V3(0, 1, 0), dx * 0.012)).premultiply(new Quat().setFromAxisAngle(new V3(1, 0, 0), dy * 0.012)); }
      else if (state.mode === "walk") { const k = 0.0042 * (camera.fov / 62); cam.yaw += dx * k; cam.pitch = clamp(cam.pitch + dy * k, -1.2, 1.2); } } }
  else if (!drag && e.pointerType === "mouse" && (state.mode === "walk" || state.mode === "hold" || state.mode === "tv")) { const hit = pick(e.clientX, e.clientY); const lab = hit && !state.busy ? hit.object.userData.pick.label() : ""; ui.prompt.hidden = !lab; ui.prompt.textContent = lab; canvas.classList.toggle("hot", !!lab); } });
const endDrag = (e, ok) => { if (!drag || e.pointerId !== drag.id) return; const d = drag; drag = null; if (ok && d.moved <= 7 && performance.now() - d.t < 700) click(e.clientX, e.clientY); };
canvas.addEventListener("pointerup", (e) => endDrag(e, true)); canvas.addEventListener("pointercancel", (e) => endDrag(e, false));
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
addEventListener("keydown", (e) => { if (e.metaKey || e.ctrlKey || e.altKey) return; const k = e.key.toLowerCase(); sound.init();
  if (k === "escape") { e.preventDefault(); return back(); }
  if (state.mode === "read" || state.mode === "mac") return;
  if (e.target && e.target.closest && e.target.closest("button,a") && (k === "enter" || k === " ")) return;
  keys[k] = true; if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
  const b = [...ui.actions.children].find((n) => n.dataset.key === k) || (k === "enter" && ui.actions.children[0]); if (b && !e.repeat) b.click(); });
addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; }); addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
{ const J = $("#joy"), knob = J.firstElementChild; let id = null; const set = (e) => { const r = J.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2); const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; } joy.x = x; joy.y = y; knob.style.transform = `translate(${x * 33}px,${y * 33}px)`; };
  J.addEventListener("pointerdown", (e) => { id = e.pointerId; try { J.setPointerCapture(id); } catch {} set(e); e.preventDefault(); }); J.addEventListener("pointermove", (e) => { if (e.pointerId === id) set(e); });
  const up = (e) => { if (e.pointerId !== id) return; id = null; joy.x = joy.y = 0; knob.style.transform = ""; }; J.addEventListener("pointerup", up); J.addEventListener("pointercancel", up); }

function collide(p) { p.x = clamp(p.x, -RX + 0.45, RX - 0.35); p.z = clamp(p.z, RZ1 + 0.4, RZ2 - 0.35); const m = 0.27;
  for (const b of colliders) if (p.x > b.x1 - m && p.x < b.x2 + m && p.z > b.z1 - m && p.z < b.z2 + m) { const d = [p.x - (b.x1 - m), b.x2 + m - p.x, p.z - (b.z1 - m), b.z2 + m - p.z], mn = Math.min(...d); if (mn === d[0]) p.x = b.x1 - m; else if (mn === d[1]) p.x = b.x2 + m; else if (mn === d[2]) p.z = b.z1 - m; else p.z = b.z2 + m; } }

function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 76 : 62; camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize(); refresh();

// ------------------------------------------------------------------ frame
let last = performance.now(), frames = 0, acc = 0; const tmp = new V3(), tq = new Quat();
function physics(T, dt) { const p = T.mesh.position, v = T.vel, prevY = p.y; v.y -= 9.8 * dt; p.addScaledVector(v, dt); T.mesh.rotation.x += T.spin.x * dt; T.mesh.rotation.y += T.spin.y * dt; T.mesh.rotation.z += T.spin.z * dt;
  if (p.x < -RX + 0.15 || p.x > RX - 0.1) { p.x = clamp(p.x, -RX + 0.15, RX - 0.1); v.x *= -0.4; } if (p.z < RZ1 + 0.1 || p.z > RZ2 - 0.1) { p.z = clamp(p.z, RZ1 + 0.1, RZ2 - 0.1); v.z *= -0.4; }
  let ground = 0; for (const b of colliders) if (p.x > b.x1 && p.x < b.x2 && p.z > b.z1 && p.z < b.z2) { if (prevY >= b.h - 0.02) ground = Math.max(ground, b.h); else if (p.y < b.h) { p.addScaledVector(v, -dt); v.x *= -0.4; v.z *= -0.4; } }
  if (p.y < ground + 0.03) { p.y = ground + 0.03; if (Math.abs(v.y) > 0.8) sound.tick(90 + rnd() * 40, 0.06, 0.05); v.y = -v.y * 0.32; v.x *= 0.62; v.z *= 0.62; T.spin.multiplyScalar(0.5);
    if (v.length() < 0.45) { T.vel = null; const q = new Quat().setFromEuler(new THREE.Euler(-Math.PI / 2, rnd() * 6.28, 0, "YXZ")); moveTo(T.mesh, new V3(p.x, ground + TD / 2, p.z), q, 180); refresh(); } } }
renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  for (let i = tweens.length - 1; i >= 0; i--) { const w = tweens[i], k = Math.min(1, (now - w.t0) / w.ms); w.fn(ease(k)); if (k >= 1) { tweens.splice(i, 1); w.done(); } }
  if ((state.mode === "walk" || state.mode === "hold") && !state.busy) {
    let f = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) - joy.y, s = (keys.d ? 1 : 0) - (keys.a ? 1 : 0) + joy.x; const turn = (keys.arrowleft ? 1 : 0) - (keys.arrowright ? 1 : 0);
    cam.yaw += turn * dt * 1.8; const m = Math.hypot(f, s); if (m > 1) { f /= m; s /= m; }
    if (m > 0.02) { const sp = (keys.shift ? 3.2 : 2.0) * dt, sn = Math.sin(cam.yaw), cs = Math.cos(cam.yaw); cam.pos.x += (-sn * f + cs * s) * sp; cam.pos.z += (-cs * f - sn * s) * sp; collide(cam.pos); } }
  camera.position.copy(cam.pos); camera.rotation.set(cam.pitch, cam.yaw, 0);
  const h = state.held; if (h && state.mode === "hold") { camera.getWorldDirection(tmp); const d = h.tape ? 0.3 : 0.62; tmp.multiplyScalar(d).add(cam.pos); tmp.y -= h.tape ? 0.0 : 0.2; const k = 1 - Math.exp(-dt * 14); h.mesh.position.lerp(tmp, k); h.mesh.quaternion.slerp(tq.copy(camera.quaternion).multiply(holdQ), k); }
  tapes.forEach((T) => { if (T.vel) physics(T, dt); });
  renderer.render(scene, camera);
  frames++; acc += dt; if (acc > 2) { const fps = frames / acc; if (fps < 34 && dpr > 1) { dpr = Math.max(1, dpr - 0.5); renderer.setPixelRatio(dpr); resize(); } frames = 0; acc = 0; }
});

// small debug / test hook (safe to remove)
window.__tapeRoom = { state, cam, tapes, stacks, posters, PLAY_FILMS, insert: (i) => insert(tapes[i]), eject, hold: (i) => hold(tapes[i]), throwHeld, recover, viewTV, viewMac, back, toggleLift, lift: () => liftK,
  screen(what) { const o = what === "mac" ? desk.screen : what === "tv" ? tv.screen : what === "vcr" ? vcr.led : what === "lift" ? lift : what === "buddha" ? buddhaG : what === "stack" ? stacks[0].top : what === "poster" ? posters[0].mesh : tapes[what].mesh; const q = o.getWorldPosition(new V3()); if (what === "buddha") q.y += 0.2; q.project(camera); return [((q.x + 1) / 2) * innerWidth, ((1 - q.y) / 2) * innerHeight]; } };
