// THE TAPE ROOM — overhaul (separate version, "tape-room-overhaul").
//
// Same plumbing as the base: content.js drives the room, one BUILD function per object returning the same named
// parts (TV `screen`, VCR `slot` + `led`, computer `screen`, trolley shelf heights), the same SHOTS, the same ACTIONS
// (insert, load, eject, openComputer, closeComputer) and PLAY_FILMS left false. What changed: procedural models,
// a CRT shader on convex glass, per-tape sleeves from the real cover art, a deeper lit room, weighted insert/eject,
// synthesized sound (starts only after a user gesture, mutable), keyboard + tap flow, reduced motion and adaptive DPR.
//
// Read HANDOFF.md and CHANGES-OVERHAUL.md.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";   // still ready for real models
import { TAPES, FILES } from "./content.js";

const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, "0");
const tc = (t) => (isFinite(t) ? `${pad(Math.floor(t / 60))}:${pad(Math.floor(t % 60))}` : "--:--");
const touch = matchMedia("(hover: none)").matches;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
export const loader = new GLTFLoader();
// Films are switched off for now: putting a tape in shows a loading card on the TV instead of the film.
// Flip this to true to play the clips listed in content.js.
export const PLAY_FILMS = false;
if (!PLAY_FILMS) document.body.classList.add("nofilms");
if (reduced) document.body.classList.add("reduced");

// deterministic randomness so the room is the same every visit
let seed = 20240611;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ---------------------------------------------------------------------------------------------------------------
// RENDERER, SCENE, CAMERA
// ---------------------------------------------------------------------------------------------------------------
const canvas = $("#stage");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
let dpr = Math.min(touch ? 1.5 : 2, devicePixelRatio);
renderer.setPixelRatio(dpr);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x040505);
scene.fog = new THREE.FogExp2(0x040505, 0.085);   // the office dissolves into nothing a few metres out

const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 80);

// camera shots: where the camera sits for each state. Tweak these to reframe the film.
export const SHOTS = {
  room:     { pos: new THREE.Vector3(0.35, 1.38, 3.1),  look: new THREE.Vector3(0.15, 0.92, 0) },
  tv:       { pos: new THREE.Vector3(0.0, 1.29, 1.42),  look: new THREE.Vector3(0.0, 1.23, 0.2) },
  computer: { pos: new THREE.Vector3(1.62, 1.08, 0.95), look: new THREE.Vector3(1.62, 1.02, -0.05) },
};
SHOTS.mobile = { pos: new THREE.Vector3(-0.15, 1.5, 4.2), look: new THREE.Vector3(-0.22, 0.86, 0) };   // portrait: tapes + TV; computer via the on-screen button

// ---------------------------------------------------------------------------------------------------------------
// TEXTURES — small procedural canvases (no downloads before first frame)
// ---------------------------------------------------------------------------------------------------------------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function speckle(ctx, w, h, n, a, light = true) {
  for (let i = 0; i < n; i++) { const v = light ? 255 : 0; ctx.fillStyle = `rgba(${v},${v},${v},${rnd() * a})`; ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); }
}
// office carpet: dark grey-green loop pile with a faint tile grid
const carpetTex = canvasTex(256, 256, (c, w, h) => {
  c.fillStyle = "#23271f"; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { const v = 20 + rnd() * 30; c.fillStyle = `rgb(${v},${v + 4},${v - 2})`; c.fillRect(rnd() * w, rnd() * h, 1, 1 + rnd() * 1.5); }
  c.strokeStyle = "rgba(0,0,0,.35)"; c.lineWidth = 2; c.strokeRect(0, 0, w, h);
  c.fillStyle = "rgba(255,255,255,.025)"; for (let y = 0; y < h; y += 4) c.fillRect(0, y, w, 1);
}, [40, 40]);
// suspended ceiling tile
const tileTex = canvasTex(128, 128, (c, w, h) => {
  c.fillStyle = "#1d1e1b"; c.fillRect(0, 0, w, h); speckle(c, w, h, 900, .08, false); speckle(c, w, h, 400, .04);
  c.fillStyle = "#0d0d0c"; c.fillRect(0, 0, w, 3); c.fillRect(0, 0, 3, h);
}, [50, 50]);
// partition fabric
const fabricTex = canvasTex(128, 128, (c, w, h) => {
  c.fillStyle = "#2a2d2e"; c.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) { c.fillStyle = `rgba(0,0,0,${.08 + rnd() * .08})`; c.fillRect(0, y, w, 1); }
  speckle(c, w, h, 600, .06);
}, [2, 2]);
// worn surface: used as roughness variation on steel and plastics
const wearTex = canvasTex(256, 256, (c, w, h) => {
  c.fillStyle = "#b0b0b0"; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 120; i++) { c.strokeStyle = `rgba(40,40,40,${rnd() * .35})`; c.lineWidth = rnd() * 1.5; c.beginPath(); const x = rnd() * w, y = rnd() * h; c.moveTo(x, y); c.lineTo(x + (rnd() - .5) * 60, y + (rnd() - .5) * 8); c.stroke(); }
  speckle(c, w, h, 2500, .25);
}, [1, 1]);
wearTex.colorSpace = THREE.NoColorSpace;
const grilleTex = canvasTex(128, 64, (c, w, h) => { c.fillStyle = "#121212"; c.fillRect(0, 0, w, h); c.fillStyle = "#030303"; for (let x = 4; x < w; x += 6) c.fillRect(x, 4, 3, h - 8); });

// ---------------------------------------------------------------------------------------------------------------
// LIGHT — one working panel over the trolley, distant panels as pools in the dark, one soft-flickering
// ---------------------------------------------------------------------------------------------------------------
scene.add(new THREE.HemisphereLight(0xcfdcd6, 0x0e0f0c, 0.22));
// a soft grazing wash from the same panel onto the tape stack so the spines stay discoverable
const stackLight = new THREE.SpotLight(0xe6f2ec, 12, 4, 0.45, 0.9, 2); stackLight.position.set(-0.4, 2.7, 1.3); stackLight.target.position.set(-0.8, 0.75, 0.1); scene.add(stackLight, stackLight.target);
// low bounce off the carpet in front of the trolley so the VCR and lower shelf read; a faint rim from the dark behind
const bounce = new THREE.PointLight(0xc9d6cf, 0.9, 2.6, 2); bounce.position.set(0.1, 0.45, 1.3); scene.add(bounce);
const rim = new THREE.PointLight(0xbfd0ca, 1.6, 4, 2); rim.position.set(-0.4, 1.9, -1.6); scene.add(rim);
const overhead = new THREE.SpotLight(0xe6f2ec, 34, 9, 1.05, 0.85, 2);   // the one fluorescent panel that still works
overhead.position.set(0.2, 2.74, 0.6); overhead.target.position.set(0.0, 0, 0.1);
overhead.castShadow = true; overhead.shadow.mapSize.set(1024, 1024); overhead.shadow.bias = -0.0004; overhead.shadow.radius = 4;
scene.add(overhead, overhead.target);
const fill = new THREE.PointLight(0xdfe9e4, 1.1, 6, 2); fill.position.set(1.7, 2.6, 0.4); scene.add(fill);   // panel over the desk
const pools = [[-4.2, -4.8, 7], [4.6, -7.4, 8], [-1.2, -11.5, 9], [7.5, -2.5, 6]].map(([x, z, i], k) => {
  const l = new THREE.PointLight(k === 1 ? 0xffe6ec : 0xdcebe4, i, 7.5, 2); l.position.set(x, 2.6, z); scene.add(l); return l;
});
const flickerLight = pools[1];   // the faint dusty-pink one, a slow, low-contrast fade (no rapid strobing)
const tvGlow = new THREE.PointLight(0x9fc2ff, 0.0, 4, 1.6);   // the TV lights the room when it's on
tvGlow.position.set(0, 1.28, 0.65); scene.add(tvGlow);
const osGlow = new THREE.PointLight(0x9dffb8, 0.35, 1.6, 2); scene.add(osGlow);

// ---------------------------------------------------------------------------------------------------------------
// CRT SHADER — barrel curvature, scanlines, chromatic fringe, vignette and glow, on a convex glass mesh
// ---------------------------------------------------------------------------------------------------------------
function crtMaterial(tint = 0xffffff) {
  return new THREE.ShaderMaterial({
    toneMapped: false,
    uniforms: { map: { value: null }, hasMap: { value: 0 }, on: { value: 0 }, time: { value: 0 }, curve: { value: 0.13 },
      lines: { value: 240 }, roll: { value: reduced ? 0 : 1 }, tint: { value: new THREE.Color(tint) }, gain: { value: 1.0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `
      uniform sampler2D map; uniform float hasMap, on, time, curve, lines, roll, gain; uniform vec3 tint; varying vec2 vUv;
      void main(){
        vec2 c = vUv * 2.0 - 1.0; c *= 1.0 + curve * dot(c, c);
        vec2 uv = c * 0.5 + 0.5;
        float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
        vec3 col = vec3(0.0);
        if (hasMap > 0.5) { float o = 0.0016 + 0.0016 * dot(c, c);
          col = vec3(texture2D(map, uv + vec2(o, 0.0)).r, texture2D(map, uv).g, texture2D(map, uv - vec2(o, 0.0)).b); }
        col *= tint * gain;
        float s = 0.5 + 0.5 * sin(uv.y * lines * 6.28318);
        col *= 1.0 - 0.3 * s;                                            // subtle scanlines
        col *= 1.0 - 0.035 * roll * smoothstep(0.0, 0.08, abs(fract(uv.y - time * 0.05) - 0.5) - 0.42); // slow soft roll
        float v = smoothstep(1.45, 0.4, length(c));
        col *= mix(0.45, 1.0, v);
        col += on * 0.035 * tint * v;                                    // phosphor glow
        col *= on * inside;
        col += vec3(0.010, 0.012, 0.011) * v;                            // dead tube, grey-green
        vec2 hp = c - vec2(-0.42, 0.5); col += vec3(0.05, 0.055, 0.055) * exp(-dot(hp, hp) * 5.0) + vec3(0.012) * smoothstep(0.75, 1.0, length(c)); // glass sheen + edge catch
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}
// convex screen: a plane bulged towards the viewer, edges at z = 0
function bulgedPlane(w, h, b) {
  const g = new THREE.PlaneGeometry(w, h, 24, 18), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const nx = p.getX(i) / (w / 2), ny = p.getY(i) / (h / 2); p.setZ(i, b * (1 - nx * nx) * (1 - ny * ny)); }
  g.computeVertexNormals(); return g;
}
const glassMat = () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.15, depthWrite: false });

// ---------------------------------------------------------------------------------------------------------------
// BUILD — procedural low-poly models. Each returns the same named parts as the base.
// ---------------------------------------------------------------------------------------------------------------
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });
const box = (w, h, d, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.castShadow = b.receiveShadow = true; return b; };
const cyl = (r, h, m, seg = 16) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m); c.castShadow = c.receiveShadow = true; return c; };
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };

// the liminal office: carpet, tiled ceiling, rows of cubicles and a water cooler, all lost in fog
function buildRoom() {
  const g = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat(0xffffff, { map: carpetTex, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat(0xffffff, { map: tileTex, roughness: 1 }));
  ceiling.rotation.x = Math.PI / 2; ceiling.position.y = 2.8; g.add(ceiling);
  // fluorescent panels on the tile grid: lit ones match the lights above, most are dead
  const litAt = [[0.2, 0.6], [1.7, 0.4], ...pools.map((l) => [l.position.x, l.position.z])];
  const litMat = new THREE.MeshBasicMaterial({ color: 0xe9f5ee, toneMapped: false }), deadMat = mat(0x2a2c29, { roughness: .6 });
  const housing = new THREE.BoxGeometry(1.24, 0.03, 0.64), diff = new THREE.PlaneGeometry(1.18, 0.58);
  let flicker = null;
  for (let x = -12; x <= 12; x += 2.4) for (let z = -14; z <= 4; z += 2.4) {
    const px = x + 0.2, pz = z + 0.6, hit = litAt.findIndex(([lx, lz]) => Math.abs(lx - px) < 1.2 && Math.abs(lz - pz) < 1.2);
    const h = new THREE.Mesh(housing, deadMat); at(h, px, 2.785, pz); g.add(h);
    if (hit < 0) continue;
    const m = hit === 3 ? new THREE.MeshBasicMaterial({ color: 0xffe6ec, toneMapped: false }) : litMat;
    const p = new THREE.Mesh(diff, m); p.rotation.x = Math.PI / 2; at(p, px, 2.768, pz); g.add(p);
    if (hit === 3) flicker = p;
  }
  // cubicle rows: quiet dark partitions with desks and chairs, receding into the dark
  const pm = mat(0xffffff, { map: fabricTex, roughness: 1 }), cap = mat(0x3b3d3a, { roughness: .5, metalness: .4 });
  const dm = mat(0x3a3832, { roughness: .8 }), chair = mat(0x161716, { roughness: .9 });
  const panel = new THREE.BoxGeometry(1.6, 1.35, 0.05), capG = new THREE.BoxGeometry(1.62, 0.025, 0.07);
  for (let row = 0; row < 5; row++) for (let col = -5; col <= 5; col++) {
    const x = col * 1.75 + (row % 2) * 0.4, z = -3.2 - row * 2.6;
    if (Math.abs(x) < 2.6 && z > -3.5) continue;
    if (rnd() < 0.18) continue;   // gaps, like furniture taken away
    const p = new THREE.Mesh(panel, pm); p.castShadow = p.receiveShadow = true; at(p, x, 0.675, z); p.rotation.y = (rnd() - .5) * 0.03; g.add(p);
    const c = new THREE.Mesh(capG, cap); at(c, x, 1.36, z); g.add(c);
    if (rnd() < 0.5) { const side = new THREE.Mesh(panel, pm); side.scale.x = 0.55; side.rotation.y = Math.PI / 2; at(side, x - 0.8, 0.675, z + 0.45); g.add(side); }
    if (rnd() < 0.75) { const d = box(1.4, 0.04, 0.68, dm); at(d, x, 0.74, z + 0.4); g.add(d);
      const leg = box(0.04, 0.72, 0.6, dm); at(leg, x + 0.66, 0.36, z + 0.4); g.add(leg); }
    if (rnd() < 0.45) { const ch = box(0.46, 0.08, 0.46, chair); at(ch, x + (rnd() - .5) * .6, 0.46, z + 1.0); ch.rotation.y = rnd() * 3; g.add(ch);
      const bk = box(0.44, 0.5, 0.06, chair); bk.position.set(0, 0.3, -0.22); ch.add(bk); }
  }
  // back wall far away, so the fog has something to swallow
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 2.8), mat(0x1c1d1a)); at(wall, 0, 1.4, -17); g.add(wall);
  // water cooler, half in the light
  const wc = new THREE.Group(), cream = mat(0x7c786b, { roughness: .7, roughnessMap: wearTex });
  wc.add(at(box(0.32, 0.95, 0.32, cream), 0, 0.475, 0));
  wc.add(at(box(0.2, 0.06, 0.03, mat(0x222222)), 0, 0.82, 0.17));
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.42, 20), new THREE.MeshPhysicalMaterial({ color: 0x8fb6cc, transparent: true, opacity: 0.45, roughness: 0.15, transmission: 0 }));
  at(bottle, 0, 1.17, 0); wc.add(bottle);
  wc.position.set(-2.6, 0, -2.4); wc.rotation.y = 0.4; g.add(wc);
  return { group: g, flicker };
}

// the AV trolley: black powder-coated steel, three lipped shelves on swivel castors
function buildTrolley() {
  const g = new THREE.Group(), steel = mat(0x121212, { roughness: 0.62, metalness: 0.45, roughnessMap: wearTex });
  const rubber = mat(0x070707, { roughness: .95 });
  const W = 0.86, D = 0.56, shelves = [0.14, 0.56, 1.0];
  shelves.forEach((y) => {
    g.add(at(box(W, 0.022, D, steel), 0, y, 0));
    for (const s of [-1, 1]) { g.add(at(box(W, 0.035, 0.012, steel), 0, y + 0.012, s * (D / 2))); g.add(at(box(0.012, 0.035, D, steel), s * (W / 2), y + 0.012, 0)); }
  });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * (W / 2 - 0.018), z = sz * (D / 2 - 0.018);
    g.add(at(cyl(0.014, 0.98, steel, 10), x, 0.57, z));
    g.add(at(box(0.04, 0.03, 0.04, steel), x, 0.1, z));
    const fork = at(box(0.035, 0.05, 0.02, steel), x, 0.068, z); g.add(fork);
    const wheel = cyl(0.035, 0.025, rubber, 14); wheel.rotation.x = Math.PI / 2; wheel.rotation.z = Math.PI / 2; at(wheel, x, 0.036, z + 0.012 * sz); g.add(wheel);
  }
  // cable hanging off the back
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.2, 1.05, -0.3), new THREE.Vector3(0.25, 0.6, -0.33), new THREE.Vector3(0.3, 0.02, -0.5), new THREE.Vector3(0.6, 0.01, -0.9)]), 24, 0.006, 6), rubber);
  g.add(cable);
  return { group: g, top: 1.0125, middle: 0.5725 };
}

// the CRT: thick worn shell, recessed bezel, dials, convex glass. `screen` is the mesh the picture is drawn on
function buildTV() {
  const g = new THREE.Group(), shell = mat(0x151515, { roughness: 0.5, roughnessMap: wearTex });
  g.add(at(box(0.62, 0.5, 0.42, shell), 0, 0.25, 0));
  g.add(at(box(0.5, 0.4, 0.2, shell), 0, 0.26, -0.3));
  g.add(at(box(0.34, 0.26, 0.1, shell), 0, 0.27, -0.44));
  const sy = 0.29, sw = 0.46, sh = 0.345, fz = 0.21;
  const bez = mat(0x0b0b0b, { roughness: .4 });
  // thick surround around the tube, slightly proud of the shell
  g.add(at(box(sw + 0.05, 0.025, 0.03, bez), 0, sy + sh / 2 + 0.012, fz + 0.01));
  g.add(at(box(sw + 0.05, 0.025, 0.03, bez), 0, sy - sh / 2 - 0.012, fz + 0.01));
  g.add(at(box(0.025, sh, 0.03, bez), -sw / 2 - 0.012, sy, fz + 0.01));
  g.add(at(box(0.025, sh, 0.03, bez), sw / 2 + 0.012, sy, fz + 0.01));
  const screen = new THREE.Mesh(bulgedPlane(sw, sh, 0.02), crtMaterial());
  at(screen, 0, sy, fz + 0.002); g.add(screen);
  const glass = new THREE.Mesh(bulgedPlane(sw, sh, 0.022), glassMat()); at(glass, 0, sy, fz + 0.003); glass.renderOrder = 2; g.add(glass);
  // control strip: speaker grille, two dials, power button, standby LED
  g.add(at(new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.05), mat(0xffffff, { map: grilleTex })), -0.17, 0.06, fz + 0.001));
  const knob = mat(0x2a2a2a, { roughness: .4, metalness: .2 });
  [0.12, 0.2].forEach((x) => { const d = cyl(0.016, 0.02, knob, 18); d.rotation.x = Math.PI / 2; at(d, x, 0.06, fz + 0.01); g.add(d);
    g.add(at(box(0.003, 0.012, 0.002, mat(0x8a8a8a)), x, 0.068, fz + 0.021)); });
  g.add(at(box(0.03, 0.015, 0.01, knob), 0.0, 0.06, fz + 0.005));
  g.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.003, 8), new THREE.MeshBasicMaterial({ color: 0xff3b2a, toneMapped: false })), 0.04, 0.06, fz + 0.002));
  // vents on top
  for (let i = 0; i < 9; i++) g.add(at(box(0.3, 0.002, 0.008, mat(0x050505)), 0, 0.501, -0.1 + i * 0.022));
  return { group: g, screen };
}

// the VCR: silver-black deck with a sprung flap and an LED clock. `slot` is where tapes go in, in the VCR's own space
function buildVCR() {
  const g = new THREE.Group(), body = mat(0x2a2a2a, { roughness: 0.45, metalness: .35, roughnessMap: wearTex });
  g.add(at(box(0.43, 0.09, 0.32, body), 0, 0.045, 0));
  g.add(at(box(0.43, 0.004, 0.32, mat(0x101010, { roughness: .3 })), 0, 0.091, 0));
  g.add(at(box(0.425, 0.085, 0.006, mat(0x1c1c1c, { roughness: .3, metalness: .3 })), 0, 0.045, 0.161));
  // flap, hinged along its top edge
  const hinge = new THREE.Group(); hinge.position.set(-0.06, 0.071, 0.166); g.add(hinge);
  const flap = box(0.21, 0.032, 0.004, mat(0x151515, { roughness: .3, metalness: .4 })); flap.position.set(0, -0.016, 0); hinge.add(flap);
  g.add(at(box(0.214, 0.036, 0.002, new THREE.MeshBasicMaterial({ color: 0x000000 })), -0.06, 0.055, 0.1635));
  // buttons
  for (let i = 0; i < 5; i++) g.add(at(box(0.016, 0.008, 0.006, mat(0x2e2e2e)), 0.075 + i * 0.022, 0.022, 0.165));
  // LED clock (canvas) — `led` keeps its colour API from the base
  const ledC = document.createElement("canvas"); ledC.width = 160; ledC.height = 40;
  const ledTex = new THREE.CanvasTexture(ledC); ledTex.colorSpace = THREE.SRGBColorSpace;
  const led = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.0175), new THREE.MeshBasicMaterial({ color: 0x33ff88, map: ledTex, toneMapped: false }));
  led.position.set(0.14, 0.055, 0.1645); g.add(led);
  led.userData.draw = (text) => { const c = ledC.getContext("2d"); c.fillStyle = "#000"; c.fillRect(0, 0, 160, 40);
    c.fillStyle = "#1a1a1a"; c.font = "500 30px 'Geist Mono', ui-monospace, monospace"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("88:88", 80, 21);
    c.fillStyle = "#fff"; c.fillText(text, 80, 21); ledTex.needsUpdate = true; };
  led.userData.draw("12:00");
  return { group: g, slot: new THREE.Vector3(-0.06, 0.055, 0.17), led, flap: hinge };
}

// a VHS tape in its rental sleeve. Spine faces out (+z), the sleeve art is on top (+y), numbers on the ends.
function buildTape(t, i = 0) {
  const W = 0.19, H = 0.026, D = 0.105;
  const spine = document.createElement("canvas"); spine.width = 1024; spine.height = 140;
  const top = document.createElement("canvas"); top.width = 1024; top.height = 566;
  const end = document.createElement("canvas"); end.width = 256; end.height = 64;
  const texs = [spine, top, end].map((c) => { const x = new THREE.CanvasTexture(c); x.colorSpace = THREE.SRGBColorSpace; x.anisotropy = 8; return x; });
  const [spineTex, topTex, endTex] = texs;
  const black = mat(0x0b0b0b, { roughness: 0.55, roughnessMap: wearTex });
  const sm = mat(0xffffff, { map: spineTex, roughness: 0.55 }), tm = mat(0xffffff, { map: topTex, roughness: 0.45 }), em = mat(0xffffff, { map: endTex, roughness: 0.55 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [em, em, tm, black, sm, black]);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.userData.glow = [sm, tm, em];
  paintTape({ ...t, n: i + 1 }, spine, top, () => texs.forEach((x) => (x.needsUpdate = true)), end);
  return { mesh, size: { W, H, D } };
}

// the computer on its desk: beige 90s desktop, CRT monitor, keyboard, mouse. `screen` gets the file list
function buildComputer() {
  const g = new THREE.Group(), beige = mat(0xb4ab92, { roughness: 0.75, roughnessMap: wearTex }), beige2 = mat(0xb8ae92, { roughness: .8 });
  const wood = mat(0x4e493d, { roughness: .75, roughnessMap: wearTex }), metal = mat(0x2c2c2a, { roughness: .5, metalness: .5 });
  g.add(at(box(1.1, 0.04, 0.62, wood), 0, 0.72, 0));
  for (const sx of [-1, 1]) g.add(at(box(0.04, 0.7, 0.58, metal), sx * 0.52, 0.35, 0));
  g.add(at(box(1.0, 0.36, 0.02, metal), 0, 0.5, -0.28));
  g.add(at(box(0.36, 0.5, 0.56, wood), -0.33, 0.45, 0));   // drawer pedestal
  for (let k = 0; k < 3; k++) g.add(at(box(0.12, 0.012, 0.01, metal), -0.33, 0.62 - k * 0.15, 0.285));
  g.add(at(box(0.42, 0.1, 0.38, beige), 0, 0.79, -0.04));
  g.add(at(box(0.11, 0.012, 0.005, mat(0x222222)), 0.1, 0.8, 0.152));
  g.add(at(box(0.11, 0.012, 0.005, mat(0x222222)), 0.1, 0.775, 0.152));
  g.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.004, 8), new THREE.MeshBasicMaterial({ color: 0x5cff7a, toneMapped: false })), -0.17, 0.78, 0.151));
  g.add(at(box(0.4, 0.34, 0.2, beige), 0, 1.01, 0.02));
  g.add(at(box(0.32, 0.27, 0.18, beige2), 0, 1.0, -0.15));
  g.add(at(box(0.36, 0.012, 0.012, beige2), 0, 0.855, 0.12));
  const screen = new THREE.Mesh(bulgedPlane(0.3, 0.225, 0.012), crtMaterial(0xffffff));
  screen.position.set(0, 1.02, 0.121); g.add(screen);
  const glass = new THREE.Mesh(bulgedPlane(0.3, 0.225, 0.013), glassMat()); glass.position.set(0, 1.02, 0.1215); glass.renderOrder = 2; g.add(glass);
  g.add(at(box(0.4, 0.02, 0.14, beige), 0, 0.75, 0.2));
  const keys = new THREE.InstancedMesh(new THREE.BoxGeometry(0.019, 0.008, 0.019), beige2, 80); const o = new THREE.Object3D(); let n = 0;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 16; c++) { o.position.set(-0.17 + c * 0.0225, 0.763, 0.15 + r * 0.023); o.updateMatrix(); keys.setMatrixAt(n++, o.matrix); }
  keys.receiveShadow = true; g.add(keys);
  g.add(at(box(0.06, 0.02, 0.1, beige), 0.3, 0.75, 0.2));
  return { group: g, screen };
}

// ---------------------------------------------------------------------------------------------------------------
// COVERS — one rental sleeve per tape, built from the tape's own cover still. Five layouts rotate by index so any
// future entry in content.js gets a distinct sleeve; spines carry the zero-padded number, title and spine colour.
// ---------------------------------------------------------------------------------------------------------------
const FONT = "Geist, ui-sans-serif, system-ui, sans-serif", MONO = "'Geist Mono', ui-monospace, monospace";
const lum = (hex) => { const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255; return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
function fit(c, text, weight, max, width, family = FONT) { let s = max; do { c.font = `${weight} ${s}px ${family}`; s -= 2; } while (c.measureText(text).width > width && s > 8); return s + 2; }
function coverImg(c, img, x, y, w, h, fx = 0.5, fy = 0.4) {
  const a = img.width / img.height, b = w / h; let sw, sh;
  if (a > b) { sh = img.height; sw = sh * b; } else { sw = img.width; sh = sw / b; }
  c.drawImage(img, (img.width - sw) * fx, (img.height - sh) * fy, sw, sh, x, y, w, h);
}
function track(c, text, x, y, sp) { [...text].forEach((ch) => { c.fillText(ch, x, y); x += c.measureText(ch).width + sp; }); }
function wear(c, w, h, k) { for (let i = 0; i < 40 * k; i++) { c.fillStyle = `rgba(255,255,255,${rnd() * .05})`; c.fillRect(rnd() * w, rnd() * h, rnd() * 80, 1); } }
function paintTape(t, spine, top, done, end) {
  const s = spine.getContext("2d"), c = top.getContext("2d"), e = end?.getContext("2d");
  const num = pad(t.n || 1), title = t.title.toUpperCase(), sub = `${t.client} · ${t.year}`.toUpperCase();
  const ink = lum(t.spine) > 0.55 ? "#0b0b0b" : "#ffffff", layout = ((t.n || 1) - 1) % 5;
  const paint = (img) => {
    // SPINE: number block in the spine colour, title, client/year — readable stacked at a glance
    s.textBaseline = "middle"; s.textAlign = "left";
    s.fillStyle = "#0c0c0c"; s.fillRect(0, 0, 1024, 140);
    s.fillStyle = t.spine; s.fillRect(0, 0, 150, 140);
    if (layout === 1 || layout === 4) { s.fillRect(150, 0, 874, 8); s.fillRect(150, 132, 874, 8); }
    if (layout === 3) { s.fillRect(990, 0, 34, 140); }
    s.fillStyle = ink; fit(s, num, 600, 92, 120, FONT); s.textAlign = "center"; s.fillText(num, 75, 74);
    s.textAlign = "left"; s.fillStyle = "#fff"; fit(s, title, 600, 58, 560); s.fillText(title, 180, 72);
    s.globalAlpha = .62; s.font = `400 24px ${MONO}`; s.textAlign = "right"; s.fillText(sub.slice(0, 26), layout === 3 ? 970 : 1000, 74); s.globalAlpha = 1;
    wear(s, 1024, 140, 1);
    // ENDS: the number again so the stack reads from the side
    if (e) { e.fillStyle = "#0c0c0c"; e.fillRect(0, 0, 256, 64); e.fillStyle = t.spine; e.fillRect(0, 0, 256, 6); e.fillStyle = "#fff"; e.font = `600 36px ${FONT}`; e.textAlign = "center"; e.textBaseline = "middle"; e.fillText(num, 128, 36); }
    // SLEEVE (top face) — layout chosen by index
    const W = 1024, H = 566; c.textBaseline = "alphabetic"; c.textAlign = "left"; c.globalAlpha = 1;
    c.fillStyle = "#0b0b0b"; c.fillRect(0, 0, W, H);
    if (layout === 0) {          // full bleed still, title low left
      if (img) coverImg(c, img, 0, 0, W, H);
      const gr = c.createLinearGradient(0, H * .45, 0, H); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,.85)"); c.fillStyle = gr; c.fillRect(0, 0, W, H);
      c.fillStyle = "#fff"; c.font = `500 26px ${MONO}`; c.fillText(num, 40, 60);
      fit(c, title, 600, 120, W - 80); c.fillText(title, 36, H - 70);
      c.globalAlpha = .75; c.font = `400 26px ${FONT}`; track(c, sub, 40, H - 30, 5); c.globalAlpha = 1;
      c.fillStyle = t.spine; c.fillRect(40, 76, 60, 6);
    } else if (layout === 1) {   // framed in the spine colour, big number
      c.fillStyle = t.spine; c.fillRect(0, 0, W, H);
      if (img) coverImg(c, img, 300, 34, W - 334, H - 68);
      c.fillStyle = ink; fit(c, num, 600, 200, 240); c.fillText(num, 30, 190);
      const words = title.split(" "); let y = 300; words.forEach((w) => { fit(c, w, 600, 64, 250); c.fillText(w, 32, y); y += 66; });
      c.globalAlpha = .7; c.font = `400 20px ${MONO}`; c.fillText(sub.slice(0, 22), 32, H - 40); c.globalAlpha = 1;
    } else if (layout === 2) {   // split: still left, black field right with stacked type
      if (img) coverImg(c, img, 0, 0, 560, H);
      c.fillStyle = "#0b0b0b"; c.fillRect(560, 0, W - 560, H); c.fillStyle = t.spine; c.fillRect(560, 0, 10, H);
      c.fillStyle = "#fff"; c.font = `500 24px ${MONO}`; c.fillText(`TAPE ${num}`, 610, 70);
      const words = title.split(" "); let y = 200; words.forEach((w) => { fit(c, w, 600, 92, W - 650); c.fillText(w, 606, y); y += 92; });
      c.globalAlpha = .6; c.font = `400 22px ${FONT}`; track(c, sub.slice(0, 24), 610, H - 50, 3); c.globalAlpha = 1;
    } else if (layout === 3) {   // still with a black band across, widely tracked title
      if (img) coverImg(c, img, 0, 0, W, H, .5, .35);
      c.fillStyle = "rgba(0,0,0,.82)"; c.fillRect(0, H * .58, W, 150);
      c.fillStyle = t.spine; c.fillRect(0, H * .58, W, 4); c.fillRect(0, H * .58 + 146, W, 4);
      c.fillStyle = "#fff"; const sz = fit(c, title, 400, 64, W - 260); c.font = `400 ${sz}px ${FONT}`; track(c, title, 48, H * .58 + 92, Math.max(4, sz * .18));
      c.font = `600 70px ${FONT}`; c.textAlign = "right"; c.fillText(num, W - 40, H * .58 + 100); c.textAlign = "left";
      c.globalAlpha = .8; c.font = `400 22px ${MONO}`; c.fillText(sub, 48, 56); c.globalAlpha = 1;
    } else {                     // poster: still on top, solid foot with oversized title
      if (img) coverImg(c, img, 34, 34, W - 68, H - 210);
      c.fillStyle = "#fff"; fit(c, title, 600, 110, W - 220); c.fillText(title, 34, H - 62);
      c.fillStyle = t.spine; c.font = `600 96px ${FONT}`; c.textAlign = "right"; c.fillText(num, W - 34, H - 58); c.textAlign = "left";
      c.fillStyle = "#fff"; c.globalAlpha = .6; c.font = `400 20px ${MONO}`; c.fillText(sub, 36, H - 26); c.globalAlpha = 1;
    }
    // rental wear: soft vignette and scuffs
    const v = c.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, W * .7); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.35)"); c.fillStyle = v; c.fillRect(0, 0, W, H);
    wear(c, W, H, 2);
    done();
  };
  const ready = document.fonts ? Promise.all([document.fonts.load(`600 40px Geist`), document.fonts.load(`400 20px Geist`)]).catch(() => {}) : Promise.resolve();
  ready.then(() => paint(null));
  const img = new Image(); img.decoding = "async"; img.onload = () => ready.then(() => paint(img)); img.src = t.cover;
}

// ---------------------------------------------------------------------------------------------------------------
// ASSEMBLE
// ---------------------------------------------------------------------------------------------------------------
const room = buildRoom(); scene.add(room.group);
const trolley = buildTrolley(); scene.add(trolley.group);
const tv = buildTV(); tv.group.position.y = trolley.top; trolley.group.add(tv.group);
const vcr = buildVCR(); vcr.group.position.set(0, trolley.middle, 0.02); trolley.group.add(vcr.group);
const computer = buildComputer(); computer.group.position.set(1.62, 0, -0.35); computer.group.rotation.y = -0.18; scene.add(computer.group);
osGlow.position.copy(computer.group.localToWorld(new THREE.Vector3(0, 1.02, 0.35)));

// the stack of tapes on a low cabinet to the left of the trolley; more than 13 tapes start a second stack
const PER_STACK = 13, stacks = Math.max(1, Math.ceil(TAPES.length / PER_STACK));
const cabW = 0.42 + (stacks - 1) * 0.24;
const cabMat = mat(0x2b2c28, { roughness: .7, roughnessMap: wearTex });
const cabinet = box(cabW, 0.62, 0.34, cabMat); cabinet.position.set(-0.78 - (stacks - 1) * 0.12, 0.31, 0.06); scene.add(cabinet);
scene.add(at(box(cabW + 0.02, 0.02, 0.36, cabMat), cabinet.position.x, 0.63, 0.06));
const tapes = TAPES.map((t, i) => {
  const { mesh, size } = buildTape(t, i);
  mesh.userData = { ...mesh.userData, kind: "tape", i, t };
  const col = Math.floor(i / PER_STACK), k = i % PER_STACK;
  const rest = new THREE.Vector3(-0.78 - col * 0.24 + (rnd() - 0.5) * 0.016, 0.64 + size.H / 2 + k * (size.H + 0.0015), 0.08 + (rnd() - 0.5) * 0.014);
  const restRot = new THREE.Euler(0, -0.22 + (rnd() - 0.5) * 0.16, 0);
  mesh.position.copy(rest); mesh.rotation.copy(restRot); scene.add(mesh);
  return { mesh, t, rest, restRot, lift: 0 };
});

// dust motes in the overhead light, faint dusty pink
const dust = (() => {
  const n = touch ? 120 : 260, g = new THREE.BufferGeometry(), p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { p[i * 3] = (rnd() - .5) * 2.4; p[i * 3 + 1] = rnd() * 2.6; p[i * 3 + 2] = (rnd() - .5) * 2 + .4; }
  g.setAttribute("position", new THREE.BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({ color: 0xf0dfe3, size: 0.006, transparent: true, opacity: 0.25, depthWrite: false });
  const pts = new THREE.Points(g, m); scene.add(pts); return pts;
})();

// ---------------------------------------------------------------------------------------------------------------
// SCREENS — TV static, the video, and the computer's file list
// ---------------------------------------------------------------------------------------------------------------
const noise = document.createElement("canvas"); noise.width = 160; noise.height = 120;
const noiseTex = new THREE.CanvasTexture(noise); noiseTex.magFilter = THREE.NearestFilter; noiseTex.colorSpace = THREE.SRGBColorSpace;
const noiseCtx = noise.getContext("2d"), noiseImg = noiseCtx.createImageData(160, 120);
function drawNoise() {   // mid-grey static, deliberately low contrast
  const d = noiseImg.data;
  for (let i = 0; i < d.length; i += 4) { const v = 50 + Math.random() * 110; d[i] = v; d[i + 1] = v; d[i + 2] = v * 1.05; d[i + 3] = 255; }
  noiseCtx.putImageData(noiseImg, 0, 0); noiseTex.needsUpdate = true;
}
const video = document.createElement("video");
video.playsInline = true; video.crossOrigin = "anonymous"; video.preload = "auto";

// the TV picture: video is drawn into a 4:3 canvas each frame, cropped a touch for wide films (like a real
// 4:3 set) and pillarboxed for vertical ones, so every film reads whatever its shape
const tvc = document.createElement("canvas"); tvc.width = 640; tvc.height = 480;
const tvCtx = tvc.getContext("2d"), tvTex = new THREE.CanvasTexture(tvc); tvTex.colorSpace = THREE.SRGBColorSpace;
let tvMode = "off";
function drawTV() {
  if (tvMode !== "video" || video.readyState < 2) return;
  const vw = video.videoWidth, vh = video.videoHeight, va = vw / vh, sa = 4 / 3;
  tvCtx.fillStyle = "#000"; tvCtx.fillRect(0, 0, 640, 480);
  if (va >= sa) { const h = 480 * Math.min(1, sa / va * 1.25), w = h * va; tvCtx.drawImage(video, (640 - w) / 2, (480 - h) / 2, w, h); }
  else { const w = 480 * va; tvCtx.drawImage(video, (640 - w) / 2, 0, w, 480); }
  tvTex.needsUpdate = true;
}
// the loading card: old-VCR blue screen with the tape's name, shown while films are off
let cardT = null;
function drawCard(now) {
  const c = tvCtx; c.fillStyle = "#1a33b8"; c.fillRect(0, 0, 640, 480);
  c.fillStyle = "#fff"; c.font = `500 30px ${MONO}`; c.textBaseline = "alphabetic"; c.textAlign = "left";
  c.fillText("PLAY \u25B6", 48, 78);
  c.font = `500 22px ${MONO}`; c.textAlign = "right"; c.fillText(`TAPE ${pad((cardT?.n) || 1)}`, 592, 78); c.textAlign = "left";
  c.font = `600 ${fit(c, (cardT?.title || "").toUpperCase(), 600, 46, 544, MONO)}px ${MONO}`; c.fillText((cardT?.title || "").toUpperCase(), 48, 250);
  c.font = `400 22px ${MONO}`; c.globalAlpha = .8; c.fillText(`${cardT?.client || ""}  ${cardT?.year || ""}`.toUpperCase(), 48, 292);
  c.globalAlpha = 1; const dots = Math.floor(now / 500) % 4;
  c.fillText("LOADING TAPE" + ".".repeat(dots), 48, 420);
  c.globalAlpha = .35; c.fillRect(48, 432, 544, 4); c.globalAlpha = 1;
  c.fillRect(48, 432, 544 * (reduced ? 1 : (now / 5000) % 1), 4);
  if (!reduced) { const y = (now / 14) % 540 - 30; c.fillStyle = "rgba(255,255,255,.06)"; c.fillRect(0, y, 640, 18); }
  tvTex.needsUpdate = true;
}
function showOnTV(what) {
  const u = tv.screen.material.uniforms; tvMode = what;
  if (what === "off") { u.hasMap.value = 0; u.on.value = 0; u.map.value = null; }
  else if (what === "static") { u.map.value = noiseTex; u.hasMap.value = 1; u.on.value = 0.75; }
  else if (what === "video") { u.map.value = tvTex; u.hasMap.value = 1; u.on.value = 1; drawTV(); }
  else if (what === "card") { u.map.value = tvTex; u.hasMap.value = 1; u.on.value = 1; drawCard(performance.now()); }
}
showOnTV("off");

// the computer screen: a green-phosphor file manager, painted to a canvas and shown through the CRT shader
const os = document.createElement("canvas"); os.width = 1024; os.height = 768;   // drawn in 640x480 units, scaled 1.6x
const osTex = new THREE.CanvasTexture(os); osTex.colorSpace = THREE.SRGBColorSpace; osTex.anisotropy = 8;
{ const u = computer.screen.material.uniforms; u.map.value = osTex; u.hasMap.value = 1; u.on.value = 1; u.curve.value = 0.1; u.lines.value = 200; }
let osSel = 0;
const OS_ROWS = 9;
const osTop = () => Math.max(0, Math.min(osSel - OS_ROWS + 1, FILES.length - OS_ROWS));
function drawOS() {
  const c = os.getContext("2d"), G = "#9dffb8", BG = "#06100a", off = osTop(); c.setTransform(1.6, 0, 0, 1.6, 0, 0);
  c.textAlign = "left"; c.textBaseline = "alphabetic";
  c.fillStyle = BG; c.fillRect(0, 0, 640, 480);
  c.fillStyle = G; c.font = `500 22px ${MONO}`; c.fillText("C:\\STEFAN\\FILES", 28, 44);
  c.globalAlpha = .55; c.font = `400 16px ${MONO}`; c.textAlign = "right"; c.fillText(`${pad(FILES.length)} ITEMS`, 612, 44); c.textAlign = "left";
  c.globalAlpha = .4; c.fillRect(28, 58, 584, 2); c.globalAlpha = 1;
  FILES.slice(off, off + OS_ROWS).forEach((f, k) => {
    const i = off + k, y = 96 + k * 38;
    if (i === osSel && state.mode === "computer") { c.fillStyle = G; c.fillRect(22, y - 26, 596, 34); c.fillStyle = BG; } else c.fillStyle = G;
    c.font = `500 20px ${MONO}`; c.fillText(f.title.toUpperCase().slice(0, 30), 34, y);
    c.globalAlpha = .7; c.font = `400 15px ${MONO}`; c.fillText(f.kind.toUpperCase().slice(0, 14), 450, y); c.globalAlpha = 1;
  });
  c.fillStyle = G; c.globalAlpha = .4; c.fillRect(28, 438, 584, 2); c.globalAlpha = .7; c.font = `400 15px ${MONO}`;
  c.fillText(state.mode === "computer" ? "\u2191 \u2193 SELECT   ENTER OPEN   ESC BACK" : "CLICK TO USE", 28, 464); c.globalAlpha = 1;
  if (state.mode === "computer" && Math.floor(performance.now() / 600) % 2) c.fillRect(600, 450, 12, 18);
  osTex.needsUpdate = true;
}

// ---------------------------------------------------------------------------------------------------------------
// SOUND — all synthesized with WebAudio. Nothing is created until the first pointer or key press.
// ---------------------------------------------------------------------------------------------------------------
const sound = {
  ctx: null, out: null, muted: localStorage.getItem("taperoom-muted") === "1",
  start() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = (this.ctx = new AC()); this.out = c.createGain(); this.out.gain.value = 0; this.out.connect(c.destination);
    this.out.gain.setTargetAtTime(this.muted ? 0 : 0.9, c.currentTime, 0.6);
    const len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; this.buf = b;
    // fluorescent hum: 120 Hz buzz + mains fundamental + air hiss, gently breathing
    const hum = c.createGain(); hum.gain.value = 0.02; hum.connect(this.out);
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 520; lp.connect(hum);
    const o1 = c.createOscillator(); o1.type = "sawtooth"; o1.frequency.value = 120; const g1 = c.createGain(); g1.gain.value = 0.35; o1.connect(g1).connect(lp); o1.start();
    const o2 = c.createOscillator(); o2.frequency.value = 60; const g2 = c.createGain(); g2.gain.value = 0.8; o2.connect(g2).connect(lp); o2.start();
    const lfo = c.createOscillator(); lfo.frequency.value = 0.13; const lg = c.createGain(); lg.gain.value = 0.006; lfo.connect(lg).connect(hum.gain); lfo.start();
    const air = this.noise(0, { type: "bandpass", f: 900, q: 0.4, g: 0.006, loop: true });
    this.hum = hum; this.air = air;
  },
  setMuted(m) {
    this.muted = m; localStorage.setItem("taperoom-muted", m ? "1" : "0");
    if (this.ctx) this.out.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.08);
  },
  noise(dur, { type = "lowpass", f = 1000, q = 1, g = 0.1, a = 0.005, r = 0.05, to = null, loop = false, when = 0 } = {}) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + when;
    const s = c.createBufferSource(); s.buffer = this.buf; s.loop = true;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q; if (to) fl.frequency.exponentialRampToValueAtTime(to, t + dur);
    const gn = c.createGain(); gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(g, t + a);
    if (!loop) { gn.gain.setValueAtTime(g, t + Math.max(a, dur - r)); gn.gain.linearRampToValueAtTime(0, t + dur); }
    s.connect(fl).connect(gn).connect(this.out); s.start(t, Math.random()); if (!loop) s.stop(t + dur + 0.05); return gn;
  },
  tone(f, dur, { g = 0.2, type = "sine", to = null, a = 0.004, when = 0 } = {}) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + when;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const gn = c.createGain(); gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(g, t + a); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn).connect(this.out); o.start(t); o.stop(t + dur + 0.05);
  },
  flap() { this.noise(0.05, { type: "bandpass", f: 2200, q: 2, g: 0.12 }); this.tone(900, 0.04, { g: 0.04, type: "square" }); },
  clunk(when = 0) { this.tone(95, 0.22, { g: 0.5, to: 42, when }); this.noise(0.09, { type: "lowpass", f: 1400, g: 0.35, when }); this.noise(0.03, { type: "bandpass", f: 3200, q: 3, g: 0.12, when: when + 0.06 }); },
  whirr(dur = 1.4, when = 0) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + when;
    const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(28, t); o.frequency.linearRampToValueAtTime(64, t + dur * 0.6);
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 380;
    const gn = c.createGain(); gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(0.07, t + 0.15); gn.gain.setValueAtTime(0.07, t + dur - 0.3); gn.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(lp).connect(gn).connect(this.out); o.start(t); o.stop(t + dur + 0.05);
    this.noise(dur, { type: "bandpass", f: 700, to: 1500, q: 1.5, g: 0.035, a: 0.2, r: 0.3, when });
  },
  crackle(dur = 0.7) { this.noise(dur, { type: "highpass", f: 2400, g: 0.05, a: 0.01, r: 0.25 }); this.noise(0.12, { type: "lowpass", f: 300, g: 0.18 }); },
  tick() { this.noise(0.012, { type: "bandpass", f: 3400, q: 4, g: 0.12, a: 0.001, r: 0.006 }); },
  seek() { for (let i = 0; i < 5; i++) this.noise(0.01, { type: "bandpass", f: 2800 + i * 200, q: 4, g: 0.08, a: 0.001, r: 0.005, when: i * 0.045 + Math.random() * 0.02 }); },
  thud() { this.tone(140, 0.12, { g: 0.18, to: 70 }); this.noise(0.05, { type: "lowpass", f: 800, g: 0.12 }); },
};
const gesture = () => sound.start();
addEventListener("pointerdown", gesture, { capture: true }); addEventListener("keydown", gesture, { capture: true });

// ---------------------------------------------------------------------------------------------------------------
// STATE + TWEENS
// ---------------------------------------------------------------------------------------------------------------
const state = { mode: "room", tape: null, clip: 0 };   // modes: room, inserting, tv, ejecting, computer
const tweens = [];
const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3), easeIn = (t) => t * t * t;
const easeBack = (t) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
function tween(ms, fn, e = ease) { return new Promise((done) => tweens.push({ t0: performance.now(), ms: reduced ? 1 : ms, fn, e, done })); }
const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
const cam = { pos: new THREE.Vector3(), look: new THREE.Vector3(), shake: 0 };
const roomShot = () => SHOTS[innerWidth < 700 || innerWidth / innerHeight < 0.8 ? "mobile" : "room"];
function shot(name, ms = 1100) {
  const to = name === "room" ? roomShot() : SHOTS[name], p0 = cam.pos.clone(), l0 = cam.look.clone();
  return tween(ms, (k) => { cam.pos.lerpVectors(p0, to.pos, k); cam.look.lerpVectors(l0, to.look, k); });
}
{ const s = roomShot(); cam.pos.copy(s.pos); cam.look.copy(s.look); }
const bump = (a) => { if (!reduced) cam.shake = Math.max(cam.shake, a); };

// ---------------------------------------------------------------------------------------------------------------
// ACTIONS
// ---------------------------------------------------------------------------------------------------------------
const slotWorld = () => vcr.group.localToWorld(vcr.slot.clone());
const V = (x, y, z) => new THREE.Vector3(x, y, z);
async function insert(T) {
  if (state.mode !== "room") return;
  state.mode = "inserting"; state.tape = T; state.clip = 0; ui.hover(null); armed = null;
  ui.say(`Inserting tape ${pad(T.mesh.userData.i + 1)}, ${T.t.title}`);
  const m = T.mesh, s = slotWorld();
  // pull it out of the stack first, like a hand sliding it free
  const p00 = m.position.clone(); sound.noise(0.25, { type: "bandpass", f: 1800, q: .8, g: 0.04, a: .05 });
  await tween(260, (k) => m.position.lerpVectors(p00, p00.clone().add(V(0.04, 0.012, 0.11)), k), easeOut);
  const p0 = m.position.clone(), q0 = m.quaternion.clone();
  const front = s.clone().add(V(0, 0, 0.16)), qEnd = new THREE.Quaternion();
  const up = p0.clone().lerp(front, .5).add(V(0, 0.3, 0.12));
  shot("tv", 1700);
  // an arc from the stack to the mouth of the slot, banking as it turns
  await tween(950, (k) => {
    const a = p0.clone().lerp(up, k), b = up.clone().lerp(front, k); m.position.lerpVectors(a, b, k);
    m.quaternion.slerpQuaternions(q0, qEnd, k); m.rotateZ(Math.sin(k * Math.PI) * 0.18);
  });
  // settle at the mouth, flap opens
  sound.flap();
  await tween(200, (k) => { vcr.flap.rotation.x = -1.2 * k; m.position.copy(front).add(V(0, 0.004 * (1 - k), 0)); }, easeOut);
  // the hand pushes until the mechanism grabs it, then it's drawn in
  const mid = s.clone().add(V(0, 0, 0.07));
  await tween(320, (k) => m.position.lerpVectors(front, mid, k), easeOut);
  sound.clunk(); bump(0.006);
  await tween(420, (k) => { m.position.lerpVectors(mid, s.clone().add(V(0, 0, -0.12)), k); }, easeIn);
  m.visible = false;
  sound.flap(); tween(160, (k) => (vcr.flap.rotation.x = -1.2 * (1 - k)), easeIn);
  sound.whirr(1.5); bump(0.003);
  vcr.led.material.color.set(0xff3b30); vcr.led.userData.draw("PLAY");
  showOnTV("static"); tvGlow.intensity = 3.5; sound.crackle(0.8);
  await load(T, 0);
  state.mode = "tv"; ui.player(true); $("#eject").focus({ preventScroll: true });
}
function load(T, i) {
  return new Promise((ok) => {
    const c = T.t.clips[i]; state.clip = i;
    ui.title(T.t, c, i);
    if (!PLAY_FILMS) { cardT = { ...T.t, n: T.mesh.userData.i + 1 }; setTimeout(() => { showOnTV("card"); ok(); }, reduced ? 200 : 750); return; }
    video.src = c.src; video.currentTime = 0; video.muted = ui.muted;
    video.onloadeddata = () => { setTimeout(() => { showOnTV("video"); video.play().catch(() => { video.muted = true; ui.muted = true; video.play(); }); ok(); }, 450); };
    video.onended = () => (i + 1 < T.t.clips.length ? load(T, i + 1) : eject());
    ui.title(T.t, c, i);
  });
}
async function eject() {
  if (state.mode !== "tv") return;
  state.mode = "ejecting"; if (PLAY_FILMS) video.pause(); showOnTV("static"); ui.player(false); sound.crackle(0.3);
  setTimeout(() => { showOnTV("off"); tvGlow.intensity = 0; }, 260);
  vcr.led.material.color.set(0x33ff88); vcr.led.userData.draw("12:00");
  const T = state.tape, m = T.mesh, s = slotWorld();
  ui.say(`Ejected ${T.t.title}`);
  sound.whirr(0.9); await wait(380);
  const inside = s.clone().add(V(0, 0, -0.12)), out = s.clone().add(V(0, 0, 0.15));
  m.position.copy(inside); m.quaternion.identity(); m.visible = true;
  sound.flap(); sound.clunk(0.02); bump(0.004);
  vcr.flap.rotation.x = -1.2;
  shot("room", 1400);
  await tween(420, (k) => m.position.lerpVectors(inside, out, k), easeBack);
  tween(220, (k) => (vcr.flap.rotation.x = -1.2 * (1 - k)), easeIn);
  await wait(160);
  const p0 = m.position.clone(), q0 = m.quaternion.clone(), q1 = new THREE.Quaternion().setFromEuler(T.restRot);
  const above = T.rest.clone().add(V(0, 0.02, 0));
  await tween(820, (k) => { m.position.lerpVectors(p0, above, k); m.position.y += Math.sin(k * Math.PI) * 0.22; m.quaternion.slerpQuaternions(q0, q1, k); });
  sound.thud();
  await tween(160, (k) => m.position.lerpVectors(above, T.rest, k), easeIn);
  state.mode = "room"; state.tape = null; $("#stage").focus({ preventScroll: true });
}
async function openComputer() { if (state.mode !== "room") return; state.mode = "computer"; osSel = 0; drawOS(); ui.hover(null); ui.desk(true); armed = null; sound.seek(); ui.say(`Computer open. ${FILES.length} files. Use arrow keys and Enter.`); await shot("computer", 1200); }
async function closeComputer() { if (state.mode !== "computer") return; ui.desk(false); state.mode = "room"; drawOS(); sound.tick(); await shot("room", 1100); $("#stage").focus({ preventScroll: true }); }
function openFile(i) {
  const f = FILES[i]; if (!f) return; sound.seek();
  const fade = $("#fade"); fade.classList.add("on");   // hand off to the white project pages
  setTimeout(() => (location.href = f.href), reduced ? 0 : 520);
}
addEventListener("pageshow", () => $("#fade").classList.remove("on"));

// ---------------------------------------------------------------------------------------------------------------
// POINTER + KEYBOARD
// ---------------------------------------------------------------------------------------------------------------
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(9, 9), mouse = { x: 0, y: 0 };
const pickables = () => [...tapes.map((T) => T.mesh), computer.screen, ...computer.group.children, tv.screen];
function pick() {
  ray.setFromCamera(ptr, camera);
  const h = ray.intersectObjects(pickables(), false)[0]; if (!h) return null;
  if (h.object.userData.kind === "tape") return { kind: "tape", T: tapes[h.object.userData.i] };
  if (computer.group.children.includes(h.object)) return { kind: "computer", uv: h.object === computer.screen ? h.uv : null };
  if (h.object === tv.screen) return { kind: "tv" };
  return null;
}
const rowAt = (uv) => osTop() + Math.floor(((1 - uv.y) * 480 - 70) / 38);
let hovered = null, armed = null, focusIdx = -1;
addEventListener("pointermove", (e) => {
  if (e.pointerType === "touch") return;
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); mouse.x = ptr.x; mouse.y = ptr.y;
  if (state.mode === "room") { const p = pick(); hovered = p; ui.hover(p, e); document.body.style.cursor = p ? "pointer" : ""; }
  else if (state.mode === "computer") { const p = pick(); document.body.style.cursor = p?.uv ? "pointer" : ""; if (p?.uv) { const i = rowAt(p.uv); if (i >= osTop() && i < Math.min(FILES.length, osTop() + OS_ROWS) && i !== osSel) { osSel = i; drawOS(); sound.tick(); } } }
  else document.body.style.cursor = "";
});
addEventListener("click", (e) => {
  if (e.target.closest(".ui")) return;
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  const p = pick(), isTouch = touch || e.pointerType === "touch";
  if (state.mode === "room") {
    if (p?.kind === "tape") {
      // touch: first tap pulls the tape out and names it, second tap plays it
      if (isTouch && armed !== p.T) { armed = p.T; ui.hover(p, e, true); sound.tick(); return; }
      insert(p.T);
    } else if (p?.kind === "computer") openComputer();
    else { armed = null; ui.hover(null); }
  }
  else if (state.mode === "tv") { if (p?.kind === "tv" && PLAY_FILMS) video.paused ? video.play() : video.pause(); }
  else if (state.mode === "computer") { if (p?.kind === "computer" && p.uv) { const i = rowAt(p.uv); if (i >= 0 && i < FILES.length) { osSel = i; drawOS(); openFile(osSel); } } else closeComputer(); }
});
// keyboard: arrows walk the stack (bottom to top) then the computer, Enter/Space picks
function focusItem(i) {
  const n = tapes.length + 1; focusIdx = (i + n) % n; sound.tick();
  const p = focusIdx < tapes.length ? { kind: "tape", T: tapes[focusIdx] } : { kind: "computer" };
  const wp = p.kind === "tape" ? p.T.rest.clone() : computer.group.localToWorld(V(0, 1.2, 0.1));
  const sp = wp.project(camera); ui.hover(p, { clientX: (sp.x + 1) / 2 * innerWidth + 30, clientY: (1 - sp.y) / 2 * innerHeight - 20 }, true);
  ui.say(p.kind === "tape" ? `Tape ${pad(focusIdx + 1)}, ${p.T.t.title}, ${p.T.t.client}. Enter to play.` : "Computer. Enter to open.");
}
addEventListener("keydown", (e) => {
  if (e.target.closest && e.target.closest("button, a") && (e.key === "Enter" || e.key === " ")) return;
  if (e.key === "Escape") { if (state.mode === "tv") eject(); else if (state.mode === "computer") closeComputer(); else { ui.hover(null); focusIdx = -1; } }
  if (state.mode === "room") {
    if (e.key === "ArrowUp" || e.key === "ArrowRight") { e.preventDefault(); focusItem(focusIdx + 1); }
    if (e.key === "ArrowDown" || e.key === "ArrowLeft") { e.preventDefault(); focusItem(focusIdx < 0 ? tapes.length : focusIdx - 1); }
    if ((e.key === "Enter" || e.key === " ") && focusIdx >= 0) { e.preventDefault(); focusIdx < tapes.length ? insert(tapes[focusIdx]) : openComputer(); }
    if (e.key === "c" || e.key === "C") openComputer();
  }
  if (state.mode === "tv" && e.key === " " && PLAY_FILMS) { e.preventDefault(); video.paused ? video.play() : video.pause(); }
  if (state.mode === "computer") {
    if (e.key === "ArrowDown") { e.preventDefault(); osSel = (osSel + 1) % FILES.length; drawOS(); sound.tick(); ui.say(FILES[osSel].title); }
    if (e.key === "ArrowUp") { e.preventDefault(); osSel = (osSel - 1 + FILES.length) % FILES.length; drawOS(); sound.tick(); ui.say(FILES[osSel].title); }
    if (e.key === "Enter") openFile(osSel);
  }
});

// ---------------------------------------------------------------------------------------------------------------
// UI — the thin HTML layer over the scene (see index.html)
// ---------------------------------------------------------------------------------------------------------------
const ui = {
  muted: false,
  hover(p, e, sticky) {
    const el = $("#hint");
    tapes.forEach((T) => (T.target = p?.kind === "tape" && p.T === T ? 1 : 0));
    if (!p) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = p.kind === "tape"
      ? `<b><i>${pad(p.T.mesh.userData.i + 1)}</i> ${p.T.t.title}</b><span>${p.T.t.client} · ${p.T.t.year} · ${p.T.t.clips.length > 1 ? p.T.t.clips.length + " films" : "Film"}</span>${sticky && touch ? "<span>Tap again to play</span>" : ""}`
      : `<b>Computer</b><span>Pictures, case studies, toys</span>`;
    if (touch) { el.style.left = "24px"; el.style.top = (innerHeight - 160) + "px"; }
    else if (e) { el.style.left = Math.min(e.clientX, innerWidth - 220) + "px"; el.style.top = Math.min(e.clientY, innerHeight - 90) + "px"; }
  },
  title(t, c, i) { $("#now").innerHTML = `<b>${t.title}</b><span>${t.clips.length > 1 ? `${pad(i + 1)} / ${pad(t.clips.length)} · ` : ""}${c.title}</span>`; $("#page").href = t.page; $("#prev").hidden = $("#next").hidden = t.clips.length < 2; },
  player(on) { $("#player").hidden = !on; $("#room-ui").hidden = on; },
  desk(on) { $("#desk").hidden = !on; $("#room-ui").hidden = on; },
  say(msg) { const s = $("#sr"); if (s) s.textContent = msg; },
};
$("#eject").onclick = eject;
$("#pp").onclick = () => (video.paused ? video.play() : video.pause());
$("#snd").onclick = () => { ui.muted = video.muted = !video.muted; $("#snd").textContent = video.muted ? "Sound off" : "Sound on"; };
$("#full").onclick = () => { video.requestFullscreen?.() || video.webkitEnterFullscreen?.(); };
$("#desk-back").onclick = closeComputer;
$("#prev").onclick = () => state.tape && state.clip > 0 && load(state.tape, state.clip - 1);
$("#next").onclick = () => state.tape && state.clip + 1 < state.tape.t.clips.length && load(state.tape, state.clip + 1);
video.onplay = video.onpause = () => ($("#pp").textContent = video.paused ? "Play" : "Pause");
const muteBtn = $("#mute");
const paintMute = () => { muteBtn.textContent = sound.muted ? "Sound off" : "Sound on"; muteBtn.setAttribute("aria-pressed", String(sound.muted)); };
muteBtn.onclick = () => { sound.start(); sound.setMuted(!sound.muted); paintMute(); };
paintMute();
if (touch) { $("#room-ui span").textContent = "Tap a tape"; }
$("#to-computer").onclick = () => openComputer();

// ---------------------------------------------------------------------------------------------------------------
// LOOP
// ---------------------------------------------------------------------------------------------------------------
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < 0.8 ? 55 : 38; camera.updateProjectionMatrix();
  if (state.mode === "room" && !tweens.length) { const s = roomShot(); cam.pos.copy(s.pos); cam.look.copy(s.look); } }
addEventListener("resize", resize); resize(); drawOS();
let last = performance.now(), frames = 0, acc = 0, flick = { t: 0, until: 0 }, lastOS = 0;
const dpos = dust.geometry.attributes.position;
window.__tapeRoom = { state, insert: (i) => insert(tapes[i]), eject, openComputer, closeComputer, tapes: () => tapes.length, project: (i) => { const w = i < 0 ? computer.group.localToWorld(V(0, 1.0, 0.12)) : tapes[i].mesh.position.clone(); const q = w.project(camera); return [(q.x + 1) / 2 * innerWidth, (1 - q.y) / 2 * innerHeight]; }, files: () => FILES.length, dpr: () => dpr };
renderer.setAnimationLoop((now) => {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  for (let i = tweens.length - 1; i >= 0; i--) { const w = tweens[i], k = Math.min(1, (now - w.t0) / w.ms); w.fn(w.e(k)); if (k >= 1) { tweens.splice(i, 1); w.done(); } }
  // hovered/focused tape slides out of the stack towards you and brightens
  tapes.forEach((T) => { if (state.mode !== "room" || T === state.tape) return; T.lift += ((T.target || 0) - T.lift) * (1 - Math.exp(-dt * 12));
    T.mesh.position.set(T.rest.x + T.lift * 0.015, T.rest.y, T.rest.z + T.lift * 0.1);
    T.mesh.userData.glow.forEach((m) => m.emissive.setScalar(T.lift * 0.22)); });
  // a little handheld drift in the room shot, plus a short decaying bump on mechanical hits
  const drift = state.mode === "room" && !touch && !reduced ? 1 : 0;
  const breathe = reduced ? 0 : Math.sin(now / 2400) * 0.006;
  cam.shake *= Math.exp(-dt * 18);
  const sh = cam.shake * Math.sin(now / 11);
  camera.position.set(cam.pos.x + mouse.x * 0.08 * drift, cam.pos.y + mouse.y * 0.04 * drift + breathe + sh, cam.pos.z);
  camera.lookAt(cam.look);
  // the pink panel fades softly now and then (slow, low contrast — never a strobe)
  if (!reduced && room.flicker) {
    if (now > flick.until && Math.random() < dt * 0.12) { flick.t = now; flick.until = now + 1400; }
    const k = now < flick.until ? (1 - Math.cos(((now - flick.t) / 1400) * Math.PI * 2)) / 2 : 0;
    const v = 1 - 0.4 * k; room.flicker.material.color.setRGB(v, v * 0.9, v * 0.92); flickerLight.intensity = 8 * v;
  }
  // dust drifts
  if (!reduced) { for (let i = 0; i < dpos.count; i++) { let y = dpos.getY(i) + dt * 0.012; if (y > 2.6) y = 0; dpos.setY(i, y); dpos.setX(i, dpos.getX(i) + Math.sin(now / 3000 + i) * dt * 0.006); } dpos.needsUpdate = true; }
  // screens
  tv.screen.material.uniforms.time.value = now / 1000; computer.screen.material.uniforms.time.value = now / 1000;
  if (tvMode === "static") { if (!reduced || frames % 6 === 0) drawNoise(); } else if (tvMode === "card") drawCard(now); else drawTV();
  if (state.mode === "computer" && now - lastOS > 300) { drawOS(); lastOS = now; }
  if (state.mode === "tv" && !PLAY_FILMS) tvGlow.intensity = 3.2 + (reduced ? 0 : Math.sin(now / 300) * 0.08);
  if (state.mode === "tv" && PLAY_FILMS && !video.paused) { tvGlow.intensity = 3.4 + Math.random() * 0.2; $("#tc").textContent = `${tc(video.currentTime)} / ${tc(video.duration)}`; }
  // LED clock blinks its colon slowly while idle
  if (state.mode === "room" && frames % 30 === 0) vcr.led.userData.draw(Math.floor(now / 1000) % 2 ? "12:00" : "12 00");
  renderer.render(scene, camera);
  // adaptive resolution: if frames run slow for two seconds, step the pixel ratio down
  frames++; acc += dt;
  if (acc > 2) { const fps = frames / acc; if (fps < 40 && dpr > 1) { dpr = Math.max(1, dpr - 0.5); renderer.setPixelRatio(dpr); resize(); } else if (fps < 24 && dpr > 0.75) { dpr = 0.75; renderer.setPixelRatio(dpr); resize(); } frames = 0; acc = 0; }
});
