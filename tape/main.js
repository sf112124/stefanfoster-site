// THE TAPE ROOM — base scene.
//
// Everything here works end to end, but every object is a PLACEHOLDER built from boxes so the structure, camera,
// interactions and content wiring are all in place. Each placeholder is built by one function in the BUILD section
// below; swap that function's body for a real model (GLTFLoader is already imported) and keep the returned shape:
// the object, plus the named parts other code uses (e.g. the TV's `screen` mesh, the VCR's `slot` position).
//
// Read HANDOFF.md first.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";   // ready for real models
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

// ---------------------------------------------------------------------------------------------------------------
// RENDERER, SCENE, CAMERA
// ---------------------------------------------------------------------------------------------------------------
const canvas = $("#stage");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050605);
scene.fog = new THREE.FogExp2(0x050605, 0.11);   // the office dissolves into nothing a few metres out

const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 80);

// camera shots: where the camera sits for each state. Tweak these to reframe the film.
export const SHOTS = {
  room:     { pos: new THREE.Vector3(0.35, 1.38, 3.1),  look: new THREE.Vector3(0.15, 0.92, 0) },
  tv:       { pos: new THREE.Vector3(0.0, 1.27, 1.4),  look: new THREE.Vector3(0.0, 1.25, 0.2) },
  computer: { pos: new THREE.Vector3(1.62, 1.08, 0.95), look: new THREE.Vector3(1.62, 1.02, -0.05) },
};
SHOTS.mobile = { pos: new THREE.Vector3(0.25, 1.5, 4.3), look: new THREE.Vector3(0.2, 0.9, 0) };

// ---------------------------------------------------------------------------------------------------------------
// LIGHT
// ---------------------------------------------------------------------------------------------------------------
scene.add(new THREE.HemisphereLight(0xdfe9e2, 0x1a1a16, 0.6));
const overhead = new THREE.PointLight(0xe8f4ee, 9, 7, 1.6);    // the one fluorescent panel that still works
overhead.position.set(0.2, 2.7, 0.6); overhead.castShadow = true; overhead.shadow.mapSize.set(1024, 1024);
scene.add(overhead);
const tvGlow = new THREE.PointLight(0x9fc2ff, 0.0, 3.2, 1.8);   // the TV lights the room when it's on
tvGlow.position.set(0, 1.25, 0.6); scene.add(tvGlow);

// ---------------------------------------------------------------------------------------------------------------
// BUILD — placeholders. Replace each body with a model; keep what each returns.
// ---------------------------------------------------------------------------------------------------------------
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });
const box = (w, h, d, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.castShadow = b.receiveShadow = true; return b; };

// the liminal office: carpet, ceiling grid, far-off desks and partitions lost in fog
function buildRoom() {
  const g = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat(0x2b2f2a, { roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat(0x1c1d1b, { roughness: 1 }));
  ceiling.rotation.x = Math.PI / 2; ceiling.position.y = 2.8; g.add(ceiling);
  // ceiling panels on a grid; most are dead, one buzzes, one flickers
  const panels = [];
  for (let x = -12; x <= 12; x += 2.4) for (let z = -14; z <= 4; z += 2.4) {
    const on = Math.random() < 0.18 || (Math.abs(x) < 1 && Math.abs(z) < 1.5);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ color: on ? 0xdff2e8 : 0x262825 }));
    p.rotation.x = Math.PI / 2; p.position.set(x + 0.2, 2.79, z + 0.6); g.add(p); if (on) panels.push(p);
  }
  // far desks and partitions, just shapes in the dark
  const dm = mat(0x3a3b36), pm = mat(0x4a4c44);
  for (let i = 0; i < 26; i++) {
    const x = (Math.random() - 0.5) * 22, z = -3 - Math.random() * 14; if (Math.abs(x) < 2.5 && z > -4) continue;
    const d = box(1.4, 0.74, 0.7, dm); d.position.set(x, 0.37, z); g.add(d);
    if (Math.random() < 0.6) { const p = box(1.5, 1.3, 0.05, pm); p.position.set(x, 0.65, z - 0.42); g.add(p); }
  }
  return { group: g, flicker: panels[Math.floor(Math.random() * panels.length)] };
}

// the AV trolley: three shelves on castors
function buildTrolley() {
  const g = new THREE.Group(), steel = mat(0x161616, { roughness: 0.55, metalness: 0.4 });
  const W = 0.86, D = 0.56, shelves = [0.14, 0.56, 1.0];
  shelves.forEach((y) => { const s = box(W, 0.025, D, steel); s.position.y = y; g.add(s); });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = box(0.03, 1.0, 0.03, steel); leg.position.set(sx * (W / 2 - 0.02), 0.52, sz * (D / 2 - 0.02)); g.add(leg);
    const wheel = box(0.06, 0.06, 0.03, mat(0x0a0a0a)); wheel.position.set(sx * (W / 2 - 0.02), 0.04, sz * (D / 2 - 0.02)); g.add(wheel);
  }
  return { group: g, top: 1.0125, middle: 0.5725 };
}

// the CRT: `screen` is the mesh the picture is drawn on
function buildTV() {
  const g = new THREE.Group(), shell = mat(0x141414, { roughness: 0.45 });
  const body = box(0.62, 0.5, 0.5, shell); body.position.y = 0.25; g.add(body);
  const back = box(0.46, 0.36, 0.22, shell); back.position.set(0, 0.25, -0.33); g.add(back);
  const bezel = box(0.52, 0.4, 0.01, mat(0x0c0c0c)); bezel.position.set(0, 0.27, 0.252); g.add(bezel);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.345), new THREE.MeshBasicMaterial({ color: 0x111111, toneMapped: false }));
  screen.position.set(0, 0.27, 0.259); g.add(screen);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.345), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.05, clearcoat: 1 }));
  glass.position.set(0, 0.27, 0.262); g.add(glass);
  return { group: g, screen };
}

// the VCR: `slot` is where tapes go in, in the VCR's own space
function buildVCR() {
  const g = new THREE.Group();
  const body = box(0.43, 0.09, 0.32, mat(0x1b1b1b, { roughness: 0.5 })); body.position.y = 0.045; g.add(body);
  const slot = box(0.21, 0.03, 0.005, new THREE.MeshBasicMaterial({ color: 0x000000 })); slot.position.set(-0.06, 0.055, 0.161); g.add(slot);
  const led = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.016), new THREE.MeshBasicMaterial({ color: 0x33ff88, toneMapped: false }));
  led.position.set(0.14, 0.05, 0.1615); g.add(led);
  return { group: g, slot: new THREE.Vector3(-0.06, 0.055, 0.17), led };
}

// a VHS tape. `sleeve` is a canvas the cover art is painted on (see paintTape)
function buildTape(t) {
  const W = 0.19, H = 0.026, D = 0.105;
  const spine = document.createElement("canvas"); spine.width = 512; spine.height = 70;
  const top = document.createElement("canvas"); top.width = 512; top.height = 284;
  const spineTex = new THREE.CanvasTexture(spine), topTex = new THREE.CanvasTexture(top);
  [spineTex, topTex].forEach((x) => { x.colorSpace = THREE.SRGBColorSpace; x.anisotropy = 4; });
  const black = mat(0x0b0b0b, { roughness: 0.4 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [black, black, mat(0xffffff, { map: topTex, roughness: 0.5 }), black, mat(0xffffff, { map: spineTex, roughness: 0.5 }), black]);
  mesh.castShadow = mesh.receiveShadow = true;
  paintTape(t, spine, top, () => { spineTex.needsUpdate = true; topTex.needsUpdate = true; });
  return { mesh, size: { W, H, D } };
}

// the computer on its desk: `screen` gets the file list drawn on it
function buildComputer() {
  const g = new THREE.Group(), beige = mat(0xcfc6ad, { roughness: 0.7 });
  const desk = box(1.1, 0.04, 0.62, mat(0x5b5649)); desk.position.y = 0.72; g.add(desk);
  for (const sx of [-1, 1]) { const l = box(0.04, 0.72, 0.58, mat(0x3c3a33)); l.position.set(sx * 0.52, 0.36, 0); g.add(l); }
  const cpu = box(0.42, 0.1, 0.38, beige); cpu.position.set(0, 0.79, -0.04); g.add(cpu);
  const mon = box(0.4, 0.34, 0.36, beige); mon.position.set(0, 1.01, -0.06); g.add(mon);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.225), new THREE.MeshBasicMaterial({ color: 0x0d140f, toneMapped: false }));
  screen.position.set(0, 1.02, 0.121); g.add(screen);
  const kb = box(0.4, 0.02, 0.14, beige); kb.position.set(0, 0.75, 0.2); g.add(kb);
  return { group: g, screen };
}

// ---------------------------------------------------------------------------------------------------------------
// COVERS — the art painted on each tape. PLACEHOLDER: a generic rental-store layout. Replace with real sleeves
// (designed per film) by drawing an image here, or by giving each tape in content.js its own `sleeve` image.
// ---------------------------------------------------------------------------------------------------------------
function paintTape(t, spine, top, done) {
  const s = spine.getContext("2d"), c = top.getContext("2d");
  const paint = (img) => {
    // spine: colour band + title, like a rental shelf
    s.fillStyle = "#0b0b0b"; s.fillRect(0, 0, 512, 70);
    s.fillStyle = t.spine; s.fillRect(0, 0, 70, 70);
    s.fillStyle = "#fff"; s.font = "600 30px Geist, Helvetica, sans-serif"; s.textBaseline = "middle";
    s.fillText(t.title.toUpperCase(), 92, 37); s.font = "400 18px Geist, Helvetica, sans-serif"; s.globalAlpha = .6;
    s.textAlign = "right"; s.fillText(String(t.year), 494, 37); s.textAlign = "left"; s.globalAlpha = 1;
    // top: the film's still with a label strip
    c.fillStyle = "#0b0b0b"; c.fillRect(0, 0, 512, 284);
    if (img) { const a = img.width / img.height, w = 512, h = w / a; c.drawImage(img, 0, (284 - h) / 2, w, h); }
    c.fillStyle = "rgba(0,0,0,.55)"; c.fillRect(0, 214, 512, 70);
    c.fillStyle = t.spine; c.fillRect(0, 214, 8, 70);
    c.fillStyle = "#fff"; c.font = "600 28px Geist, Helvetica, sans-serif"; c.fillText(t.title.toUpperCase(), 24, 248);
    c.font = "400 16px Geist, Helvetica, sans-serif"; c.globalAlpha = .7; c.fillText(`${t.client} · ${t.year}`, 24, 272); c.globalAlpha = 1;
    done();
  };
  paint(null);
  const img = new Image(); img.onload = () => paint(img); img.src = t.cover;
}

// ---------------------------------------------------------------------------------------------------------------
// ASSEMBLE
// ---------------------------------------------------------------------------------------------------------------
const room = buildRoom(); scene.add(room.group);
const trolley = buildTrolley(); scene.add(trolley.group);
const tv = buildTV(); tv.group.position.y = trolley.top; trolley.group.add(tv.group);
const vcr = buildVCR(); vcr.group.position.set(0, trolley.middle, 0.02); trolley.group.add(vcr.group);
const computer = buildComputer(); computer.group.position.set(1.62, 0, -0.35); computer.group.rotation.y = -0.18; scene.add(computer.group);

// the stack of tapes on a low cabinet to the left of the trolley
const cabinet = box(0.42, 0.62, 0.34, mat(0x2d2e2a)); cabinet.position.set(-0.78, 0.31, 0.06); scene.add(cabinet);
const tapes = TAPES.map((t, i) => {
  const { mesh, size } = buildTape(t);
  mesh.userData = { kind: "tape", i, t };
  const rest = new THREE.Vector3(-0.78 + (Math.random() - 0.5) * 0.02, 0.62 + size.H / 2 + i * (size.H + 0.0015), 0.08 + (Math.random() - 0.5) * 0.015);
  const restRot = new THREE.Euler(0, -0.25 + (Math.random() - 0.5) * 0.18, 0);
  mesh.position.copy(rest); mesh.rotation.copy(restRot); scene.add(mesh);
  return { mesh, t, rest, restRot, lift: 0 };
});

// ---------------------------------------------------------------------------------------------------------------
// SCREENS — TV static, the video, and the computer's file list
// ---------------------------------------------------------------------------------------------------------------
const noise = document.createElement("canvas"); noise.width = 160; noise.height = 120;
const noiseTex = new THREE.CanvasTexture(noise); noiseTex.magFilter = THREE.NearestFilter; noiseTex.colorSpace = THREE.SRGBColorSpace;
const noiseCtx = noise.getContext("2d"), noiseImg = noiseCtx.createImageData(160, 120);
function drawNoise() {
  const d = noiseImg.data;
  for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 200; d[i] = v; d[i + 1] = v; d[i + 2] = v * 1.05; d[i + 3] = 255; }
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
  const c = tvCtx; c.fillStyle = "#1736c9"; c.fillRect(0, 0, 640, 480);
  c.fillStyle = "#fff"; c.font = "600 34px 'Courier New', monospace"; c.textBaseline = "alphabetic";
  c.fillText("PLAY \u25B6", 48, 78);
  c.font = "600 44px 'Courier New', monospace"; c.fillText((cardT?.title || "").toUpperCase().slice(0, 20), 48, 250);
  c.font = "400 24px 'Courier New', monospace"; c.globalAlpha = .8; c.fillText(`${cardT?.client || ""}  ${cardT?.year || ""}`, 48, 292);
  c.globalAlpha = 1; const dots = Math.floor(now / 400) % 4;
  c.fillText("LOADING TAPE" + ".".repeat(dots), 48, 420);
  c.fillRect(48, 432, 544 * ((now / 4000) % 1), 6);
  // a rolling tracking line, like a worn tape
  const y = (now / 9) % 520 - 20; c.fillStyle = "rgba(255,255,255,.12)"; c.fillRect(0, y, 640, 14);
  tvTex.needsUpdate = true;
}
function showOnTV(what) {
  const m = tv.screen.material; tvMode = what;
  if (what === "off") { m.map = null; m.color.set(0x111111); }
  else if (what === "static") { m.map = noiseTex; m.color.set(0xffffff); }
  else if (what === "video") { m.map = tvTex; m.color.set(0xffffff); drawTV(); }
  else if (what === "card") { m.map = tvTex; m.color.set(0xffffff); drawCard(performance.now()); }
  m.needsUpdate = true;
}
showOnTV("off");

// the computer screen: a little green-on-black file list, painted to a canvas
const os = document.createElement("canvas"); os.width = 640; os.height = 480;
const osTex = new THREE.CanvasTexture(os); osTex.colorSpace = THREE.SRGBColorSpace;
computer.screen.material.map = osTex; computer.screen.material.color.set(0xffffff);
let osSel = 0;
function drawOS() {
  const c = os.getContext("2d");
  c.fillStyle = "#07110a"; c.fillRect(0, 0, 640, 480);
  c.fillStyle = "#9dffb8"; c.font = "500 22px 'Geist Mono', monospace"; c.fillText("C:\\STEFAN\\FILES", 28, 44);
  c.globalAlpha = .4; c.fillRect(28, 58, 584, 2); c.globalAlpha = 1;
  FILES.forEach((f, i) => {
    const y = 96 + i * 38;
    if (i === osSel && state.mode === "computer") { c.fillStyle = "#9dffb8"; c.fillRect(22, y - 26, 596, 34); c.fillStyle = "#07110a"; } else c.fillStyle = "#9dffb8";
    c.font = "500 20px 'Geist Mono', monospace"; c.fillText(f.title.toUpperCase(), 34, y);
    c.globalAlpha = .7; c.font = "400 16px 'Geist Mono', monospace"; c.fillText(f.kind.toUpperCase(), 430, y); c.globalAlpha = 1;
  });
  osTex.needsUpdate = true;
}

// ---------------------------------------------------------------------------------------------------------------
// STATE + TWEENS
// ---------------------------------------------------------------------------------------------------------------
const state = { mode: "room", tape: null, clip: 0 };   // modes: room, inserting, tv, ejecting, computer
const tweens = [];
const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function tween(ms, fn) { return new Promise((done) => tweens.push({ t0: performance.now(), ms: reduced ? 1 : ms, fn, done })); }
const cam = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
function shot(name, ms = 1100) {
  const to = SHOTS[name === "room" && innerWidth < 700 ? "mobile" : name], p0 = cam.pos.clone(), l0 = cam.look.clone();
  return tween(ms, (k) => { cam.pos.lerpVectors(p0, to.pos, k); cam.look.lerpVectors(l0, to.look, k); });
}
{ const s = SHOTS[innerWidth < 700 ? "mobile" : "room"]; cam.pos.copy(s.pos); cam.look.copy(s.look); }

// ---------------------------------------------------------------------------------------------------------------
// ACTIONS
// ---------------------------------------------------------------------------------------------------------------
const slotWorld = () => vcr.group.localToWorld(vcr.slot.clone());
async function insert(T) {
  if (state.mode !== "room") return;
  state.mode = "inserting"; state.tape = T; state.clip = 0; ui.hover(null);
  const m = T.mesh, p0 = m.position.clone(), q0 = m.quaternion.clone(), s = slotWorld();
  const front = s.clone().add(new THREE.Vector3(0, 0, 0.16)), qEnd = new THREE.Quaternion();
  const up = p0.clone().lerp(front, .5).add(new THREE.Vector3(0, 0.35, 0.1));
  shot("tv", 1600);
  // an arc from the stack to the mouth of the slot…
  await tween(900, (k) => {
    const a = p0.clone().lerp(up, k), b = up.clone().lerp(front, k); m.position.lerpVectors(a, b, k);
    m.quaternion.slerpQuaternions(q0, qEnd, k);
  });
  // …then a firm push in
  await tween(380, (k) => m.position.lerpVectors(front, s.clone().add(new THREE.Vector3(0, 0, -0.12)), k));
  m.visible = false;
  vcr.led.material.color.set(0xff3b30);
  showOnTV("static"); tvGlow.intensity = 1.2;
  await load(T, 0);
  state.mode = "tv"; ui.player(true);
}
function load(T, i) {
  return new Promise((ok) => {
    const c = T.t.clips[i]; state.clip = i;
    ui.title(T.t, c, i);
    if (!PLAY_FILMS) { cardT = T.t; setTimeout(() => { showOnTV("card"); ok(); }, 700); return; }
    video.src = c.src; video.currentTime = 0; video.muted = ui.muted;
    video.onloadeddata = () => { setTimeout(() => { showOnTV("video"); video.play().catch(() => { video.muted = true; ui.muted = true; video.play(); }); ok(); }, 450); };
    video.onended = () => (i + 1 < T.t.clips.length ? load(T, i + 1) : eject());
    ui.title(T.t, c, i);
  });
}
async function eject() {
  if (state.mode !== "tv") return;
  state.mode = "ejecting"; if (PLAY_FILMS) video.pause(); showOnTV("static"); ui.player(false);
  setTimeout(() => { showOnTV("off"); tvGlow.intensity = 0; }, 260);
  vcr.led.material.color.set(0x33ff88);
  const T = state.tape, m = T.mesh, s = slotWorld();
  m.visible = true; m.position.copy(s).add(new THREE.Vector3(0, 0, -0.12)); m.quaternion.identity();
  shot("room", 1300);
  await tween(320, (k) => m.position.lerpVectors(s.clone().add(new THREE.Vector3(0, 0, -0.12)), s.clone().add(new THREE.Vector3(0, 0, 0.16)), k));
  const p0 = m.position.clone(), q0 = m.quaternion.clone(), q1 = new THREE.Quaternion().setFromEuler(T.restRot);
  await tween(800, (k) => { m.position.lerpVectors(p0, T.rest, k); m.position.y += Math.sin(k * Math.PI) * 0.25; m.quaternion.slerpQuaternions(q0, q1, k); });
  state.mode = "room"; state.tape = null;
}
async function openComputer() { if (state.mode !== "room") return; state.mode = "computer"; osSel = 0; drawOS(); ui.hover(null); ui.desk(true); await shot("computer", 1200); }
async function closeComputer() { if (state.mode !== "computer") return; ui.desk(false); state.mode = "room"; drawOS(); await shot("room", 1100); }
function openFile(i) { const f = FILES[i]; if (f) location.href = f.href; }

// ---------------------------------------------------------------------------------------------------------------
// POINTER
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
let hovered = null;
addEventListener("pointermove", (e) => {
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); mouse.x = ptr.x; mouse.y = ptr.y;
  if (state.mode === "room") { const p = pick(); hovered = p; ui.hover(p, e); document.body.style.cursor = p ? "pointer" : ""; }
  else if (state.mode === "computer") { const p = pick(); if (p?.uv) { const i = Math.floor(((1 - p.uv.y) * 480 - 70) / 38); if (i >= 0 && i < FILES.length && i !== osSel) { osSel = i; drawOS(); } } }
});
addEventListener("click", (e) => {
  if (e.target.closest(".ui")) return;
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  const p = pick();
  if (state.mode === "room") { if (p?.kind === "tape") insert(p.T); else if (p?.kind === "computer") openComputer(); }
  else if (state.mode === "tv") { if (p?.kind === "tv") video.paused ? video.play() : video.pause(); }
  else if (state.mode === "computer") { if (p?.kind === "computer" && p.uv) openFile(osSel); else closeComputer(); }
});
addEventListener("keydown", (e) => {
  if (e.key === "Escape") { if (state.mode === "tv") eject(); else if (state.mode === "computer") closeComputer(); }
  if (state.mode === "tv" && e.key === " ") { e.preventDefault(); video.paused ? video.play() : video.pause(); }
  if (state.mode === "computer") {
    if (e.key === "ArrowDown") { osSel = (osSel + 1) % FILES.length; drawOS(); }
    if (e.key === "ArrowUp") { osSel = (osSel - 1 + FILES.length) % FILES.length; drawOS(); }
    if (e.key === "Enter") openFile(osSel);
  }
});

// ---------------------------------------------------------------------------------------------------------------
// UI — the thin HTML layer over the scene (see index.html)
// ---------------------------------------------------------------------------------------------------------------
const ui = {
  muted: false,
  hover(p, e) {
    const el = $("#hint");
    tapes.forEach((T) => (T.target = p?.kind === "tape" && p.T === T ? 1 : 0));
    if (!p) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = p.kind === "tape" ? `<b>${p.T.t.title}</b><span>${p.T.t.client} · ${p.T.t.clips.length > 1 ? p.T.t.clips.length + " films" : "Film"}</span>` : `<b>Computer</b><span>Pictures, case studies, toys</span>`;
    if (e) { el.style.left = e.clientX + "px"; el.style.top = e.clientY + "px"; }
  },
  title(t, c, i) { $("#now").innerHTML = `<b>${t.title}</b><span>${t.clips.length > 1 ? `${pad(i + 1)} / ${pad(t.clips.length)} · ` : ""}${c.title}</span>`; $("#page").href = t.page; $("#prev").hidden = $("#next").hidden = t.clips.length < 2; },
  player(on) { $("#player").hidden = !on; $("#room-ui").hidden = on; },
  desk(on) { $("#desk").hidden = !on; $("#room-ui").hidden = on; },
};
$("#eject").onclick = eject;
$("#pp").onclick = () => (video.paused ? video.play() : video.pause());
$("#snd").onclick = () => { ui.muted = video.muted = !video.muted; $("#snd").textContent = video.muted ? "Sound off" : "Sound on"; };
$("#full").onclick = () => { video.requestFullscreen?.() || video.webkitEnterFullscreen?.(); };
$("#desk-back").onclick = closeComputer;
$("#prev").onclick = () => state.tape && state.clip > 0 && load(state.tape, state.clip - 1);
$("#next").onclick = () => state.tape && state.clip + 1 < state.tape.t.clips.length && load(state.tape, state.clip + 1);
video.onplay = video.onpause = () => ($("#pp").textContent = video.paused ? "Play" : "Pause");

// ---------------------------------------------------------------------------------------------------------------
// LOOP
// ---------------------------------------------------------------------------------------------------------------
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize(); drawOS();
let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  for (let i = tweens.length - 1; i >= 0; i--) { const w = tweens[i], k = Math.min(1, (now - w.t0) / w.ms); w.fn(ease(k)); if (k >= 1) { tweens.splice(i, 1); w.done(); } }
  // hovered tape slides out of the stack towards you
  tapes.forEach((T) => { if (state.mode !== "room" || T === state.tape) return; T.lift += ((T.target || 0) - T.lift) * (1 - Math.exp(-dt * 14)); T.mesh.position.set(T.rest.x, T.rest.y, T.rest.z + T.lift * 0.06); });
  // a little handheld drift in the room shot
  const drift = state.mode === "room" && !touch ? 1 : 0;
  camera.position.set(cam.pos.x + mouse.x * 0.08 * drift, cam.pos.y + mouse.y * 0.04 * drift, cam.pos.z);
  camera.lookAt(cam.look);
  // fluorescent flicker, TV static, TV glow following the picture
  if (room.flicker) room.flicker.material.color.setScalar(Math.random() < 0.04 ? 0.15 : 0.87);
  if (tvMode === "static") drawNoise(); else if (tvMode === "card") drawCard(now); else drawTV();
  if (state.mode === "tv" && !PLAY_FILMS) tvGlow.intensity = 1.0 + Math.random() * 0.1;
  if (state.mode === "tv" && PLAY_FILMS && !video.paused) { tvGlow.intensity = 1.1 + Math.random() * 0.15; $("#tc").textContent = `${tc(video.currentTime)} / ${tc(video.duration)}`; }
  renderer.render(scene, camera);
});
