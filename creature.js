// A procedurally animated creature, drawn like a rig in debug view. A small head with a cluster of eyes pulls a chain of
// plates; every plate carries a pair of long jointed legs that splay out like a spider's, plant, hold, and step on their
// own. Bones are hairlines with dots along them, every joint has a faint box, every foot is a ring. Touch a plate or a
// leg and it lights up and sings; every footfall is a little synth tick.
const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
const ang = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

function fabrik(j, L, rx, ry, tx, ty, bx, by) {
  const n = L.length;
  for (let i = 1; i < n; i++) { const k = Math.sin((i / n) * Math.PI); j[i][0] += bx * k; j[i][1] += by * k; }
  for (let it = 0; it < 4; it++) {
    j[n][0] = tx; j[n][1] = ty;
    for (let i = n - 1; i >= 0; i--) { const ax = j[i][0] - j[i + 1][0], ay = j[i][1] - j[i + 1][1], q = Math.hypot(ax, ay) || 1; j[i][0] = j[i + 1][0] + ax / q * L[i]; j[i][1] = j[i + 1][1] + ay / q * L[i]; }
    j[0][0] = rx; j[0][1] = ry;
    for (let i = 1; i <= n; i++) { const ax = j[i][0] - j[i - 1][0], ay = j[i][1] - j[i - 1][1], q = Math.hypot(ax, ay) || 1; j[i][0] = j[i - 1][0] + ax / q * L[i - 1]; j[i][1] = j[i - 1][1] + ay / q * L[i - 1]; }
  }
}

export class Creature {
  constructor(x, y, a = 0, plates = 3, { gap = 16, size = 1 } = {}) {
    this.x = x; this.y = y; this.a = a; this.gap = gap; this.size = size; this.segs = []; this.t = 0; this.pulse = 0; this.events = [];
    for (let i = 0; i < plates + 1; i++) this.add(true);
  }
  add(quiet) {
    const n = this.segs.length, prev = this.segs[n - 1], a = prev ? prev.a : this.a;
    const x = prev ? prev.x - Math.cos(a) * this.gap : this.x, y = prev ? prev.y - Math.sin(a) * this.gap : this.y;
    const seed = n * 13.7 + 3.1, head = n === 0;
    const seg = { x, y, a, i: n, w: head ? 13 : 15 + hash(seed) * 6, h: head ? 11 : 10 + hash(seed + 1) * 5, seed, born: quiet ? -1 : 0, lit: 0, legs: [],
      cells: Array.from({ length: 6 }, (_, k) => hash(seed * 3 + k)), kind: Math.floor(hash(seed + 7) * 3) };
    if (!head) for (const side of [-1, 1]) {
      // long, spindly, four-boned legs like the reference: a short coxa, two long middle bones, a fine tip
      const bones = 4, base = 22 + hash(seed + side * 2) * 10;
      const L = Array.from({ length: bones }, (_, k) => base * [.55, 1.25, 1.1, .8][k] * (.85 + hash(seed + k * 5 + side) * .3));
      seg.legs.push({ side, L, reach: L.reduce((p, q) => p + q, 0), j: Array.from({ length: bones + 1 }, () => [x, y]), fx: x, fy: y, sx: x, sy: y, tx: x, ty: y, st: 1, lit: 0, wig: 0 });
    }
    this.segs.push(seg); if (!quiet) this.pulse = 1;
    return seg;
  }
  get length() { return this.segs.length - 1; }
  update(dt, x, y, a, speed) {
    this.t += dt; this.pulse = Math.max(0, this.pulse - dt * 2.5);
    const s = this.segs, h = s[0], sc = this.size, N = s.length; h.x = x; h.y = y; h.a = a;
    for (let i = 1; i < N; i++) {
      const p = s[i - 1], q = s[i], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1, gap = this.gap * sc * (i === 1 ? .95 : 1) * (1 - Math.min(.35, i / N * .3));
      q.x = p.x + dx / d * gap; q.y = p.y + dy / d * gap;
      let want = Math.atan2(p.y - q.y, p.x - q.x), da = ang(want - p.a);
      if (Math.abs(da) > .6) want = p.a + Math.sign(da) * .6;
      q.a = want; if (q.born >= 0) q.born = Math.min(1, q.born + dt * 2);
    }
    s.forEach((q) => { q.lit = Math.max(0, q.lit - dt * 1.6); });
    const stepping = new Set();
    s.forEach((q, i) => q.legs.forEach((l) => { if (l.st < 1) stepping.add(i * 2 + (l.side > 0 ? 1 : 0)); }));
    s.forEach((q, i) => q.legs.forEach((l) => {
      l.lit = Math.max(0, l.lit - dt * 1.4); l.wig *= Math.pow(.02, dt);
      const grow = q.born < 0 ? 1 : q.born, ca = Math.cos(q.a), sa = Math.sin(q.a);
      const rx = q.x - sa * l.side * q.h * .4 * sc, ry = q.y + ca * l.side * q.h * .4 * sc;
      // spider splay: front legs reach forward, back legs reach back
      const f = N > 2 ? (i - 1) / (N - 2) : .5, splay = lerp(.75, -.85, f), dirA = q.a + l.side * (Math.PI / 2 - splay);
      const out = l.reach * .68 * sc * grow, fwd = speed > 20 ? 10 * sc : 0;
      const restX = rx + Math.cos(dirA) * out + ca * fwd, restY = ry + Math.sin(dirA) * out + sa * fwd;
      // flung somewhere new (a page change, a leap): legs that are left hopelessly behind just come with it, no stretching
      if (Math.hypot(l.fx - rx, l.fy - ry) > l.reach * 1.5 * sc || (l.st < 1 && Math.hypot(l.tx - rx, l.ty - ry) > l.reach * 1.1 * sc)) {
        const dx = restX - l.fx, dy = restY - l.fy; l.fx = l.sx = l.tx = restX; l.fy = l.sy = l.ty = restY; l.st = 1; l.j.forEach((q) => { q[0] += dx; q[1] += dy; });
      }
      if (l.st >= 1) {
        const off = Math.hypot(l.fx - restX, l.fy - restY), far = Math.hypot(l.fx - rx, l.fy - ry);
        const key = i * 2 + (l.side > 0 ? 1 : 0), busy = stepping.has(key - 2) || stepping.has(key + 2) || stepping.has(key ^ 1);
        if ((off > l.reach * .3 * sc && !busy) || far > l.reach * .99 * sc) {
          const lead = Math.min(1, speed / 260) * l.reach * .35 * sc;
          l.sx = l.fx; l.sy = l.fy; l.tx = restX + ca * lead; l.ty = restY + sa * lead; l.st = 0; stepping.add(key);
        }
      } else {
        l.st = Math.min(1, l.st + dt * (4.2 + speed * .016));
        const e = l.st * l.st * (3 - 2 * l.st); l.fx = lerp(l.sx, l.tx, e); l.fy = lerp(l.sy, l.ty, e);
        if (l.st >= 1) { l.landed = this.t; this.events.push({ x: l.fx, y: l.fy, i, side: l.side, n: N }); }
      }
      // knees arch outward and up, higher while the leg is in the air
      const lift = l.st < 1 ? Math.sin(l.st * Math.PI) : 0, wig = Math.sin(this.t * 38) * l.wig * 6 * sc;
      const ox = Math.cos(dirA) * (14 + lift * 8) * sc - sa * wig, oy = Math.sin(dirA) * (14 + lift * 8) * sc - (4 + lift * 10) * sc + ca * wig;
      fabrik(l.j, l.L.map((v) => v * sc * Math.max(.15, grow)), rx, ry, l.fx, l.fy, ox, oy);
    }));
  }
  shift(dx, dy) { this.segs.forEach((q) => { q.x += dx; q.y += dy; q.legs.forEach((l) => { l.fx += dx; l.fy += dy; l.sx += dx; l.sy += dy; l.tx += dx; l.ty += dy; l.j.forEach((p) => { p[0] += dx; p[1] += dy; }); }); }); }
  // what's under the pointer: a plate or a leg. Returns a fresh touch once, then waits till you move off it.
  touch(px, py) {
    if (px == null) return null;
    const sc = this.size; let hit = null;
    for (const q of this.segs) { const dx = px - q.x, dy = py - q.y, ca = Math.cos(-q.a), sa = Math.sin(-q.a), lx = dx * ca - dy * sa, ly = dx * sa + dy * ca;
      if (Math.abs(lx) < q.w * sc * .6 + 3 && Math.abs(ly) < q.h * sc * .6 + 3) { hit = { kind: "plate", q }; break; } }
    if (!hit) for (const q of this.segs) for (const l of q.legs) for (let m = 1; m < l.j.length; m++) {
      const a = l.j[m - 1], b = l.j[m], vx = b[0] - a[0], vy = b[1] - a[1], L = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((px - a[0]) * vx + (py - a[1]) * vy) / L));
      if (Math.hypot(a[0] + vx * t - px, a[1] + vy * t - py) < 5) { hit = { kind: "leg", q, l }; break; }
    }
    const key = hit ? (hit.l || hit.q) : null, fresh = key && key !== this.lastTouch;
    this.lastTouch = key;
    if (!hit) return null;
    if (hit.l) { hit.l.lit = 1; if (fresh) hit.l.wig = 1; } else hit.q.lit = 1;
    return fresh ? hit : null;
  }
  // the debug-view look from the reference: black ground, hairline legs in one colour with dots of another at every joint,
  // faint target boxes and corner brackets round the feet, and plates built from little coloured cells
  neon(g, P, { hot = false, mouth = 0, sleepy = 0, happy = 0 } = {}) {
    const s = this.segs, sc = this.size, t = this.t, N = s.length;
    g.lineCap = "round"; g.lineJoin = "round";
    const sq = (x, y, r, a) => { g.save(); g.translate(x, y); g.rotate(a); g.strokeRect(-r, -r, r * 2, r * 2); g.restore(); };
    // ghost furniture first: rings at the hips, boxes and brackets round the feet
    s.forEach((q, i) => q.legs.forEach((l) => {
      const j = l.j, n = j.length - 1, fx = j[n][0], fy = j[n][1], a = Math.atan2(fy - j[n - 1][1], fx - j[n - 1][0]);
      g.lineWidth = 1; g.strokeStyle = P.box; g.globalAlpha = .55; sq(fx, fy, 6.5 * sc, a + .4);
      if (P.ring) { g.strokeStyle = P.ring; g.globalAlpha = .4; g.beginPath(); g.arc(j[1][0], j[1][1], 6 * sc, 0, Math.PI * 2); g.stroke(); }
      if (P.chev) { g.strokeStyle = P.chev; g.globalAlpha = .6; const r = 9 * sc, c = 3 * sc;
        [[1, 1], [-1, -1]].forEach(([u, v]) => { const x = fx + u * r, y = fy + v * r * .8; g.beginPath(); g.moveTo(x - u * c, y); g.lineTo(x, y); g.lineTo(x, y - v * c); g.stroke(); }); }
      g.globalAlpha = 1;
    }));
    // the legs: one clean line through the joints, a dot at each, a bigger one for the foot
    s.forEach((q) => q.legs.forEach((l) => {
      const j = l.j, n = j.length - 1, lit = l.lit > .05;
      g.strokeStyle = lit ? P.joint : P.leg; g.lineWidth = 1.15 + (lit ? .7 : 0);
      g.beginPath(); j.forEach((p, m) => (m ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
      g.fillStyle = P.joint; for (let m = 1; m < n; m++) { g.beginPath(); g.arc(j[m][0], j[m][1], 1.6, 0, Math.PI * 2); g.fill(); }
      g.beginPath(); g.arc(j[n][0], j[n][1], 2.4, 0, Math.PI * 2); g.fill();
    }));
    // the body, tail first so the head sits on top
    for (let i = N - 1; i >= 0; i--) {
      const q = s[i], head = i === 0, grow = q.born < 0 ? 1 : 1 - Math.pow(1 - q.born, 3), taper = head ? 1 : 1 - Math.min(.35, (i / N) * .4);
      const w = q.w * sc * grow * taper, h = q.h * sc * grow * taper, lit = q.lit, pop = (head ? this.pulse * 2 : 0) + lit * 2;
      if (w < .5) continue;
      const W2 = w / 2 + pop, H2 = h / 2 + pop;
      g.save(); g.translate(q.x, q.y); g.rotate(q.a);
      if (head) {
        g.fillStyle = P.head; g.globalAlpha = .9; g.fillRect(-W2, -H2, W2 * 2, H2 * 2); g.globalAlpha = 1;
        g.strokeStyle = P.headLine || P.head; g.lineWidth = 1.2; g.strokeRect(-W2 - 2, -H2 - 2, W2 * 2 + 4, H2 * 2 + 4);
        [-1, 1].forEach((sd) => { if (happy && !sleepy) { g.strokeStyle = P.eye; g.lineWidth = 1.4; g.beginPath(); g.arc(W2 * .3, sd * H2 * .45 + 1, 2.4 * sc, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); return; }
          if (sleepy) { g.strokeStyle = P.eye; g.lineWidth = 1.2; g.beginPath(); g.moveTo(W2 * .3 - 2.5, sd * H2 * .45); g.lineTo(W2 * .3 + 2.5, sd * H2 * .45); g.stroke(); }
          else { g.fillStyle = hot ? "#ff2d4a" : P.eye; g.beginPath(); g.arc(W2 * .3, sd * H2 * .45, 1.8 * sc, 0, Math.PI * 2); g.fill(); } });
        g.strokeStyle = P.leg; g.lineWidth = 1.4;
        [-1, 1].forEach((sd) => { const op = mouth * .6; g.beginPath(); g.moveTo(W2, sd * H2 * .5); g.lineTo(W2 + 5 * sc, sd * (H2 * .5 + op * 5 * sc)); g.lineTo(W2 + 8 * sc, sd * (1 + op * 2) * sc); g.stroke(); });
      } else if (P.style === "cells") {
        g.strokeStyle = P.seg; g.lineWidth = 1.2; g.globalAlpha = .9; g.strokeRect(-W2 - 2.5, -H2 - 2.5, W2 * 2 + 5, H2 * 2 + 5); g.globalAlpha = 1;
        const cs = Math.min(W2, H2) * .86, gp = 1.6 * sc;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([u, v], k) => { const cx = u * (cs / 2 + gp / 2), cy = v * (cs / 2 + gp / 2), x0 = cx - cs / 2, y0 = cy - cs / 2;
          g.fillStyle = P.cellC; g.fillRect(x0, y0, cs, cs);
          g.fillStyle = lit > .05 ? P.joint : P.cellA; g.fillRect(x0, y0, cs * .62, cs * .55);
          g.fillStyle = P.cellB; g.fillRect(x0 + cs * .62, y0 + cs * .1, cs * .16, cs * .62);
          g.strokeStyle = P.cellLine; g.lineWidth = 1.1; g.strokeRect(x0 + cs * .08, y0 + cs * .08, cs, cs); });
      } else if (P.style === "plates") {
        g.strokeStyle = P.rib; g.lineWidth = 2;
        [-1, 1].forEach((sd) => { const y = sd * (H2 + 3.5); g.beginPath(); g.moveTo(-W2 * .7, y - sd * 3); g.lineTo(-W2 * .7, y); g.lineTo(W2 * .7, y); g.lineTo(W2 * .7, y - sd * 3); g.stroke(); });
        g.fillStyle = lit > .05 ? P.rib : P.plateFill; g.fillRect(-W2, -H2, W2 * 2, H2 * 2);
        g.strokeStyle = P.plate; g.lineWidth = 2; g.strokeRect(-W2, -H2, W2 * 2, H2 * 2);
        g.lineWidth = 1; g.strokeRect(-W2 + 3.5, -H2 + 3.5, W2 * 2 - 7, H2 * 2 - 7);
        g.beginPath(); g.moveTo(-W2 + 3.5, H2 * .25); g.lineTo(W2 - 3.5, H2 * .25); g.stroke();
      } else {
        g.fillStyle = lit > .05 ? P.joint : P.plateFill; g.globalAlpha = .85; g.fillRect(-W2 * .9, -H2 * .55, W2 * 1.8, H2 * 1.1); g.globalAlpha = 1;
        g.strokeStyle = P.plate; g.lineWidth = 1.4; g.strokeRect(-W2 - 1, -H2 * .55 - 2, W2 * 2 + 2, H2 * 1.1 + 4);
        g.fillStyle = P.eye; g.beginPath(); g.arc(0, 0, 1.6 * sc, 0, Math.PI * 2); g.fill();
        g.strokeStyle = P.box; g.globalAlpha = .5; g.lineWidth = 1; g.strokeRect(-W2 * 2, -H2 * 1.6, W2 * 4, H2 * 3.2); g.globalAlpha = 1;
      }
      g.restore();
    }
  }
  draw(g, { ink, bg, cols, hot = false, eye = 1, mouth = 0, sleepy = 0 }) {
    const s = this.segs, sc = this.size, t = this.t, N = s.length;
    g.lineCap = "round"; g.lineJoin = "round";
    // legs: hairline bones with beads along them, a faint box round every joint, a ring for the foot
    s.forEach((q, i) => q.legs.forEach((l, k) => {
      const j = l.j, n = j.length - 1, col = cols[(i + k) % cols.length], lit = l.lit;
      g.strokeStyle = lit > .05 ? col : ink; g.lineWidth = .9 + lit * 1.2;
      g.beginPath(); j.forEach((p, m) => (m ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
      g.fillStyle = lit > .05 ? col : ink;
      for (let m = 0; m < n; m++) { const a = j[m], b = j[m + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), dots = Math.max(1, Math.floor(L / (5 * sc))); for (let d = 1; d < dots; d++) { const u = d / dots; g.fillRect(a[0] + (b[0] - a[0]) * u - .5, a[1] + (b[1] - a[1]) * u - .5, 1, 1); } }
      g.strokeStyle = col; g.lineWidth = .8;
      for (let m = 1; m < n; m++) {
        const bs = (3.2 + (n - m)) * sc * (1 + lit * .6), a2 = Math.atan2(j[m + 1][1] - j[m][1], j[m + 1][0] - j[m][0]);
        g.globalAlpha = .22 + lit * .6; g.save(); g.translate(j[m][0], j[m][1]); g.rotate(a2); g.strokeRect(-bs, -bs, bs * 2, bs * 2); g.restore();
        g.globalAlpha = 1; g.fillStyle = ink; g.beginPath(); g.arc(j[m][0], j[m][1], 1.5, 0, TAU); g.fill();
      }
      const fresh = l.landed && t - l.landed < .3 ? 1 - (t - l.landed) / .3 : 0, fx = j[n][0], fy = j[n][1];
      if (fresh) { g.globalAlpha = fresh * .7; g.strokeStyle = col; g.lineWidth = .8; g.beginPath(); g.arc(fx, fy, (5 + (1 - fresh) * 9) * sc, 0, TAU); g.stroke(); g.globalAlpha = 1; }
      g.strokeStyle = ink; g.lineWidth = .9; g.beginPath(); g.arc(fx, fy, 3.6 * sc, 0, TAU); g.stroke();
      g.fillStyle = l.st >= 1 ? col : ink; g.beginPath(); g.arc(fx, fy, 1.4 * sc, 0, TAU); g.fill();
    }));
    // spine
    g.strokeStyle = ink; g.lineWidth = .7; g.globalAlpha = .6; g.setLineDash([1.5, 3]); g.beginPath(); s.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
    for (let i = N - 1; i >= 0; i--) {
      const q = s[i], head = i === 0, grow = q.born < 0 ? 1 : 1 - Math.pow(1 - q.born, 3), taper = head ? 1 : 1 - Math.min(.4, (i / N) * .45);
      const w = q.w * sc * grow * taper, h = q.h * sc * grow * taper, lit = q.lit;
      if (w < .5) continue;
      const col = cols[i % cols.length], col2 = cols[(i + 2) % cols.length], pop = (head ? this.pulse * 2 : 0) + lit * 2;
      g.save(); g.translate(q.x, q.y); g.rotate(q.a);
      const W2 = w / 2 + pop, H2 = h / 2 + pop;
      g.fillStyle = lit > .05 ? col : bg; g.globalAlpha = lit > .05 ? .25 + lit * .6 : 1; g.fillRect(-W2, -H2, W2 * 2, H2 * 2); g.globalAlpha = 1;
      g.strokeStyle = ink; g.lineWidth = 1.1; g.strokeRect(-W2, -H2, W2 * 2, H2 * 2);
      // corner ticks just outside the plate
      const tk = 3 * sc, ox = W2 + 2.5, oy = H2 + 2.5; g.lineWidth = .9; g.strokeStyle = lit > .05 ? col : ink;
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => { g.beginPath(); g.moveTo(a * ox - a * tk, b * oy); g.lineTo(a * ox, b * oy); g.lineTo(a * ox, b * oy - b * tk); g.stroke(); });
      if (head) {
        // a cluster of eyes, two little palps, mandibles that open to eat
        const ey = [[.22, -.24, 1.5], [.22, .24, 1.5], [.02, -.32, 1], [.02, .32, 1], [.36, -.08, 1.1], [.36, .08, 1.1], [-.14, -.18, .8], [-.14, .18, .8]];
        ey.forEach(([ex, ey2, r]) => { const X = ex * w, Y = ey2 * h * 1.6;
          if (sleepy) { g.strokeStyle = ink; g.lineWidth = .9; g.beginPath(); g.moveTo(X - r * 1.4, Y); g.lineTo(X + r * 1.4, Y); g.stroke(); }
          else { g.fillStyle = hot ? "#ff2d4a" : ink; g.beginPath(); g.arc(X, Y, r * sc * eye, 0, TAU); g.fill(); } });
        g.strokeStyle = ink; g.lineWidth = .9;
        [-1, 1].forEach((sd) => { const sw = Math.sin(t * 6 + sd) * .25, op = mouth * .5;
          g.beginPath(); g.moveTo(W2, sd * H2 * .6); g.quadraticCurveTo(W2 + 6 * sc, sd * (H2 * .7 + 3 * sc), W2 + 9 * sc, sd * (H2 * .4 + 1 + op * 6) + sw * 3); g.stroke();
          g.beginPath(); g.moveTo(W2 - 1, sd * H2 * .25); g.lineTo(W2 + 5 * sc, sd * (2 + op * 7) * sc); g.stroke(); });
      } else {
        // the plate's insides: a grid of little cells, a few lit in colour, and a strip of rivets
        const cw = (w - 6) / 3, ch = (h - 5) / 2, k0 = q.kind;
        for (let c = 0; c < 6; c++) { const cx = -w / 2 + 3 + (c % 3) * cw, cy = -h / 2 + 2.5 + Math.floor(c / 3) * ch, v = q.cells[c], on = v > .45 || lit > .05;
          const flick = .55 + .45 * Math.sin(t * (2 + v * 4) + v * 20);
          if (on) { g.globalAlpha = (lit > .05 ? 1 : .55 * flick); g.fillStyle = v > .75 ? col2 : col; g.fillRect(cx + .8, cy + .8, cw - 1.6, ch - 1.6); g.globalAlpha = 1; }
          g.strokeStyle = ink; g.lineWidth = .5; g.globalAlpha = .55; g.strokeRect(cx + .8, cy + .8, cw - 1.6, ch - 1.6); g.globalAlpha = 1; }
        if (k0 === 1) { g.fillStyle = ink; for (let d = 0; d < 3; d++) { g.beginPath(); g.arc(-w / 2 + 3 + d * cw + cw / 2, 0, .8, 0, TAU); g.fill(); } }
        if (k0 === 2) { g.strokeStyle = ink; g.lineWidth = .7; g.beginPath(); g.moveTo(-w / 2 + 2, 0); g.lineTo(w / 2 - 2, 0); g.stroke(); }
      }
      g.restore();
    }
  }
}
// ---- prey: little bugs that wander the page and run from the creature ----
const KINDS = {
  ant: { pts: 1, r: 4.5, wander: 45, flee: 80, fear: 80, turn: 2.2, legs: 3, col: 0 },
  beetle: { pts: 3, r: 6.5, wander: 60, flee: 120, fear: 100, turn: 1.6, legs: 3, col: 1 },
  fly: { pts: 5, r: 5, wander: 110, flee: 190, fear: 120, turn: 6, wings: 1, col: 2 },
  moth: { pts: 15, r: 7, wander: 150, flee: 260, fear: 150, turn: 4, wings: 1, gold: 1, col: 3 },
};
export class Bug {
  constructor(W, H, kind) {
    this.kind = kind; this.k = KINDS[kind]; this.t = Math.random() * 9; this.born = 0;
    const e = Math.floor(Math.random() * 4), m = 20;
    this.x = e === 0 ? -m : e === 1 ? W + m : Math.random() * W; this.y = e === 2 ? -m : e === 3 ? H + m : Math.random() * H;
    this.a = Math.atan2(H / 2 - this.y, W / 2 - this.x) + (Math.random() - .5); this.v = this.k.wander; this.life = kind === "moth" ? 9 : 40;
  }
  update(dt, W, H, hx, hy) {
    const k = this.k; this.t += dt; this.life -= dt; this.born = Math.min(1, this.born + dt * 3);
    const dx = this.x - hx, dy = this.y - hy, d = Math.hypot(dx, dy);
    let want = this.a + Math.sin(this.t * (k.wings ? 7 : 1.3) + this.x * .01) * k.turn * dt * 3;
    let sp = k.wander;
    if (d < k.fear) { const away = Math.atan2(dy, dx); let da = Math.atan2(Math.sin(away - this.a), Math.cos(away - this.a)); want = this.a + da * Math.min(1, dt * k.turn * 1.6); this.tired = Math.min(1, (this.tired || 0) + dt / 2.5); sp = k.flee * (1 - d / k.fear * .4) * (1 - this.tired * .55); this.scared = 1; } else { this.scared = 0; this.tired = Math.max(0, (this.tired || 0) - dt / 4); }
    // keep to the page, unless its time is up and it's leaving
    const pad = 30, leaving = this.life < 0;
    if (!leaving) { if (this.x < pad) want += .12; if (this.x > W - pad) want += .12; if (this.y < pad) want += .12; if (this.y > H - pad) want += .12; if (this.x < pad || this.x > W - pad || this.y < pad || this.y > H - pad) { const c = Math.atan2(H / 2 - this.y, W / 2 - this.x); want += Math.atan2(Math.sin(c - want), Math.cos(c - want)) * Math.min(1, dt * 4); } }
    this.a = want; this.v += (sp - this.v) * Math.min(1, dt * 4);
    this.x += Math.cos(this.a) * this.v * dt; this.y += Math.sin(this.a) * this.v * dt;
    return !(leaving && (this.x < -40 || this.y < -40 || this.x > W + 40 || this.y > H + 40));
  }
  draw(g, { ink, bg, cols }) {
    const k = this.k, r = k.r * this.born, t = this.t, col = k.gold ? "#ffb21c" : cols[k.col % cols.length];
    g.save(); g.translate(this.x, this.y); g.rotate(this.a); g.lineCap = "round";
    if (k.wings) {
      const f = Math.abs(Math.sin(t * 40)) * .8 + .2; g.strokeStyle = ink; g.lineWidth = 1; g.fillStyle = bg; g.globalAlpha = .9;
      [-1, 1].forEach((s) => { g.beginPath(); g.ellipse(-r * .3, s * r * 1.1 * f, r * 1.2, r * .55 * f + .5, s * .5, 0, Math.PI * 2); g.fill(); g.stroke(); });
      g.globalAlpha = 1;
    } else {
      g.strokeStyle = ink; g.lineWidth = 1;
      for (let i = 0; i < k.legs; i++) [-1, 1].forEach((s) => { const sw = Math.sin(t * 18 + i * 2 + (s > 0 ? Math.PI : 0)) * 3; const x0 = (i - 1) * r * .7; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + sw, s * r * 1.5); g.lineTo(x0 + sw + 2, s * r * 2); g.stroke(); });
    }
    g.fillStyle = col; g.strokeStyle = ink; g.lineWidth = 1.2;
    g.beginPath(); g.ellipse(0, 0, r, r * .7, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = ink; g.beginPath(); g.arc(r * .95, 0, r * .42, 0, Math.PI * 2); g.fill();
    if (this.scared) { g.strokeStyle = ink; g.lineWidth = 1; g.beginPath(); g.moveTo(-r * 1.6, -r); g.lineTo(-r * 2.6, -r * 1.3); g.moveTo(-r * 1.6, r); g.lineTo(-r * 2.6, r * 1.3); g.stroke(); }
    if (k.gold) { g.globalAlpha = .35 + Math.sin(t * 6) * .2; g.strokeStyle = "#ffb21c"; g.beginPath(); g.arc(0, 0, r * 2.4, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
    g.restore();
  }
}
export const pickKind = () => { const r = Math.random(); return r < .07 ? "moth" : r < .35 ? "fly" : r < .62 ? "beetle" : "ant"; };

// ---- the thing in the hole: a spider. A small head, a swollen abdomen, eight long hairy legs that twitch ----
export class Spider {
  constructor(x, y, a = 0, { size = 1 } = {}) {
    this.x = x; this.y = y; this.a = a; this.size = size; this.t = 0; this.events = []; this.pulse = 0;
    this.ab = { x, y, a, lit: 0 }; this.head = { lit: 0, i: 0 };
    // four legs a side, from the front pair reaching forward to the back pair reaching back
    this.legs = [];
    [-1, 1].forEach((side) => [0, 1, 2, 3].forEach((k) => {
      const len = [1.15, 1.3, 1.2, 1.35][k] * (.92 + hash(k * 9 + side) * .16), L = [18, 24, 24, 20, 11].map((v, m) => v * len * (m === 4 ? 1 : 1));
      this.legs.push({ side, k, L, reach: L.reduce((p, q) => p + q, 0), j: L.map(() => [x, y]).concat([[x, y]]), fx: x, fy: y, sx: x, sy: y, tx: x, ty: y, st: 1, lit: 0, wig: 0, tw: Math.random() * 9, phase: (k + (side > 0 ? 1 : 0)) % 2 });
    }));
    this.segs = [this.head, this.ab];
  }
  get length() { return 1; }
  add() {}
  shift(dx, dy) { this.x += dx; this.y += dy; this.ab.x += dx; this.ab.y += dy; this.legs.forEach((l) => { l.fx += dx; l.fy += dy; l.sx += dx; l.sy += dy; l.tx += dx; l.ty += dy; l.j.forEach((p) => { p[0] += dx; p[1] += dy; }); }); }
  update(dt, x, y, a, speed) {
    const sc = this.size; this.t += dt; this.x = x; this.y = y; this.a = a;
    const ab = this.ab, ca = Math.cos(a), sa = Math.sin(a), ax = x - ca * 15 * sc, ay = y - sa * 15 * sc;
    { const dx = ab.x - x, dy = ab.y - y, d = Math.hypot(dx, dy) || 1, L = 15 * sc; ab.x = x + dx / d * L; ab.y = y + dy / d * L; let aa = Math.atan2(y - ab.y, x - ab.x), da = ang(aa - a); if (Math.abs(da) > .5) { aa = a + Math.sign(da) * .5; ab.x = x - Math.cos(aa) * L; ab.y = y - Math.sin(aa) * L; } ab.a = aa; }
    this.head.lit = Math.max(0, this.head.lit - dt * 1.5); ab.lit = Math.max(0, ab.lit - dt * 1.5);
    // a spider's gait: alternating sets of four (front/back on one side with the middle two on the other)
    const set = (l) => (l.k + (l.side > 0 ? 1 : 0)) % 2, moving = [0, 0];
    this.legs.forEach((l) => { if (l.st < 1) moving[set(l)]++; });
    this.legs.forEach((l) => {
      l.lit = Math.max(0, l.lit - dt * 1.4); l.wig *= Math.pow(.02, dt);
      const hip = [.55, .2, -.15, -.45][l.k], rx = x - ca * hip * 6 * sc - sa * l.side * 4 * sc, ry = y - sa * hip * 6 * sc + ca * l.side * 4 * sc;
      const dirA = a + l.side * [0.55, 1.15, 1.95, 2.45][l.k], out = l.reach * .66 * sc, fwd = speed > 20 ? 12 * sc : 0;
      const restX = rx + Math.cos(dirA) * out + ca * fwd, restY = ry + Math.sin(dirA) * out + sa * fwd;
      if (l.st >= 1) {
        const off = Math.hypot(l.fx - restX, l.fy - restY), far = Math.hypot(l.fx - rx, l.fy - ry), s2 = set(l);
        if ((off > l.reach * .26 * sc && moving[1 - s2] === 0) || far > l.reach * .98 * sc) {
          const lead = Math.min(1, speed / 240) * l.reach * .32 * sc;
          l.sx = l.fx; l.sy = l.fy; l.tx = restX + ca * lead; l.ty = restY + sa * lead; l.st = 0; moving[s2]++;
        }
      } else {
        l.st = Math.min(1, l.st + dt * (5 + speed * .02));
        const e = l.st * l.st * (3 - 2 * l.st); l.fx = lerp(l.sx, l.tx, e); l.fy = lerp(l.sy, l.ty, e);
        if (l.st >= 1) { l.landed = this.t; this.events.push({ x: l.fx, y: l.fy, i: l.k, side: l.side, n: 5 }); }
      }
      // twitch: now and then a resting leg flicks, like it's tasting the air
      if (l.st >= 1 && Math.random() < dt * .5) l.wig = Math.max(l.wig, .45);
      const lift = l.st < 1 ? Math.sin(l.st * Math.PI) : 0, wig = Math.sin(this.t * 31 + l.tw) * l.wig * 7 * sc;
      const ox = Math.cos(dirA) * (16 + lift * 10) * sc - sa * wig, oy = Math.sin(dirA) * (16 + lift * 10) * sc - (8 + lift * 12) * sc + ca * wig;
      fabrik(l.j, l.L.map((v) => v * sc), rx, ry, l.fx, l.fy, ox, oy);
    });
  }
  touch(px, py) {
    if (px == null) return null;
    const sc = this.size; let hit = null;
    if (Math.hypot(px - this.x, py - this.y) < 9 * sc) hit = { kind: "plate", q: this.head };
    else if (Math.hypot(px - this.ab.x, py - this.ab.y) < 14 * sc) hit = { kind: "plate", q: Object.assign(this.ab, { i: 3 }) };
    if (!hit) for (const l of this.legs) for (let m = 1; m < l.j.length; m++) {
      const a = l.j[m - 1], b = l.j[m], vx = b[0] - a[0], vy = b[1] - a[1], L = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((px - a[0]) * vx + (py - a[1]) * vy) / L));
      if (Math.hypot(a[0] + vx * t - px, a[1] + vy * t - py) < 5) { hit = { kind: "leg", q: { i: l.k + 1 }, l }; break; }
    }
    const key = hit ? (hit.l || hit.q) : null, fresh = key && key !== this.lastTouch; this.lastTouch = key;
    if (!hit) return null;
    if (hit.l) { hit.l.lit = 1; if (fresh) hit.l.wig = 1; } else hit.q.lit = 1;
    return fresh ? hit : null;
  }
  // the reference's ghost-tube look: each leg a sleeve of faint stacked squares round a dotted bone, a violet body of cells
  neon(g, P, { hot = false, eye = 1, mouth = 0 } = {}) {
    const sc = this.size, t = this.t, TAU2 = Math.PI * 2;
    g.lineCap = "round"; g.lineJoin = "round";
    this.legs.forEach((l) => {
      const j = l.j, n = j.length - 1, lit = l.lit > .05;
      // the sleeve: squares every few pixels, shrinking toward the tip, turned along the bone
      g.strokeStyle = lit ? P.eye : P.tube; g.lineWidth = .8;
      for (let m = 0; m < n; m++) { const a = j[m], b = j[m + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ang2 = Math.atan2(dy, dx), k = Math.max(1, Math.floor(L / (4.2 * sc)));
        for (let q = 0; q < k; q++) { const u = q / k, r = (4.6 - (m + u) * .85) * sc; if (r < 1) continue; g.globalAlpha = .22 + (lit ? .3 : 0);
          g.save(); g.translate(a[0] + dx * u, a[1] + dy * u); g.rotate(ang2); g.strokeRect(-r, -r, r * 2, r * 2); g.restore(); } }
      g.globalAlpha = 1;
      // the bone: a run of tiny pale dots
      g.fillStyle = P.joint;
      for (let m = 0; m < n; m++) { const a = j[m], b = j[m + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, k = Math.max(1, Math.floor(L / (3.2 * sc)));
        for (let q = 0; q <= k; q++) { const u = q / k; g.beginPath(); g.arc(a[0] + dx * u, a[1] + dy * u, .9, 0, TAU2); g.fill(); } }
      for (let m = 1; m <= n; m++) { g.beginPath(); g.arc(j[m][0], j[m][1], m === n ? 2.4 : 1.7, 0, TAU2); g.fill(); }
      g.strokeStyle = P.box; g.globalAlpha = .7; g.lineWidth = 1; const fx = j[n][0], fy = j[n][1], r = 7 * sc;
      g.save(); g.translate(fx, fy); g.rotate(this.a + l.side); g.strokeRect(-r, -r, r * 2, r * 2); g.restore(); g.globalAlpha = 1;
    });
    // abdomen: a violet block of cells with a red hourglass in the middle, breathing
    const ab = this.ab, al = ab.lit, br = 1 + Math.sin(t * 2.2) * .04;
    g.save(); g.translate(ab.x, ab.y); g.rotate(ab.a);
    const aw = 15 * sc * br + al * 2, ah = 11 * sc * br + al * 2, cx = -aw * .45;
    g.strokeStyle = P.bodyLine; g.lineWidth = 1; g.strokeRect(4 * sc, -2.5 * sc, 7 * sc, 5 * sc);
    g.fillStyle = P.body; g.globalAlpha = .9; g.fillRect(cx - aw, -ah, aw * 2, ah * 2); g.globalAlpha = 1;
    g.strokeStyle = P.bodyLine; g.lineWidth = 1.2; g.strokeRect(cx - aw - 2, -ah - 2, aw * 2 + 4, ah * 2 + 4);
    g.lineWidth = .7; g.globalAlpha = .55;
    for (let c = 1; c < 4; c++) { g.beginPath(); g.moveTo(cx - aw + c * aw / 2, -ah); g.lineTo(cx - aw + c * aw / 2, ah); g.stroke(); }
    g.beginPath(); g.moveTo(cx - aw, 0); g.lineTo(cx + aw, 0); g.stroke(); g.globalAlpha = 1;
    g.fillStyle = al > .05 ? P.joint : P.eye;
    g.beginPath(); g.moveTo(cx + aw * .3, -ah * .45); g.lineTo(cx, 0); g.lineTo(cx + aw * .3, ah * .45); g.lineTo(cx - aw * .3, ah * .45); g.lineTo(cx, 0); g.lineTo(cx - aw * .3, -ah * .45); g.closePath(); g.fill();
    g.restore();
    // head: a pale box, eight red eyes, fangs
    const hl = this.head.lit;
    g.save(); g.translate(this.x, this.y); g.rotate(this.a);
    const hw = 8 * sc + hl * 2, hh = 6.5 * sc + hl * 2;
    g.fillStyle = P.head; g.globalAlpha = .92; g.fillRect(-hw, -hh, hw * 2, hh * 2); g.globalAlpha = 1;
    g.strokeStyle = P.bodyLine; g.lineWidth = 1; g.strokeRect(-hw - 2, -hh - 2, hw * 2 + 4, hh * 2 + 4);
    [[5, -2.2, 1.6], [5, 2.2, 1.6], [3.4, -4, 1.1], [3.4, 4, 1.1], [6.6, -.9, .9], [6.6, .9, .9], [1.4, -3, .8], [1.4, 3, .8]].forEach(([ex, ey2, r]) => {
      g.fillStyle = hot ? "#ff1030" : P.eye; g.beginPath(); g.arc(ex * sc, ey2 * sc, r * sc * eye, 0, TAU2); g.fill(); });
    g.strokeStyle = P.eye; g.lineWidth = 1.4;
    [-1, 1].forEach((sd) => { const op = mouth * 3; g.beginPath(); g.moveTo(hw, sd * 2.5 * sc); g.lineTo(hw + 4 * sc, sd * (3.5 + op) * sc); g.lineTo(hw + 3 * sc, sd * (1 + op * .5) * sc); g.stroke(); });
    g.restore();
  }
  draw(g, { ink, bg, cols, hot = false, eye = 1, mouth = 0, sleepy = 0 }) {
    const sc = this.size, t = this.t, red = "#ff2d4a";
    g.lineCap = "round"; g.lineJoin = "round";
    this.legs.forEach((l, li) => {
      const j = l.j, n = j.length - 1, lit = l.lit, col = lit > .05 ? cols[li % cols.length] : ink;
      // each bone thinner than the last, with bristles
      for (let m = 0; m < n; m++) {
        const a = j[m], b = j[m + 1], w = (2.6 - m * .45) * sc + lit;
        g.strokeStyle = col; g.lineWidth = Math.max(.7, w); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
        const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, hairs = Math.floor(L / (4.5 * sc));
        g.lineWidth = .6;
        for (let hh = 1; hh < hairs; hh++) { const u = hh / hairs, px = a[0] + dx * u, py = a[1] + dy * u, s2 = hh % 2 ? 1 : -1, hl = (2.2 + (m < 2 ? 1 : 0)) * sc;
          g.beginPath(); g.moveTo(px, py); g.lineTo(px + nx * s2 * hl + dx / L * hl * .8, py + ny * s2 * hl + dy / L * hl * .8); g.stroke(); }
      }
      g.strokeStyle = cols[li % cols.length]; g.lineWidth = .7;
      for (let m = 1; m < n; m++) { const bs = (3 + (n - m) * .8) * sc, a2 = Math.atan2(j[m + 1][1] - j[m][1], j[m + 1][0] - j[m][0]); g.globalAlpha = .16 + lit * .6; g.save(); g.translate(j[m][0], j[m][1]); g.rotate(a2); g.strokeRect(-bs, -bs, bs * 2, bs * 2); g.restore(); g.globalAlpha = 1; g.fillStyle = ink; g.beginPath(); g.arc(j[m][0], j[m][1], 1.8 * sc, 0, TAU); g.fill(); }
      const fresh = l.landed && t - l.landed < .25 ? 1 - (t - l.landed) / .25 : 0;
      if (fresh) { g.globalAlpha = fresh * .6; g.strokeStyle = ink; g.lineWidth = .7; g.beginPath(); g.arc(j[n][0], j[n][1], (3 + (1 - fresh) * 7) * sc, 0, TAU); g.stroke(); g.globalAlpha = 1; }
      g.fillStyle = ink; g.beginPath(); g.arc(j[n][0], j[n][1], 1.3 * sc, 0, TAU); g.fill();
    });
    // abdomen: a swollen oval with a red hourglass and fine ribs
    const ab = this.ab, al = ab.lit, ac = al > .05 ? cols[1] : red;
    g.save(); g.translate(ab.x, ab.y); g.rotate(ab.a);
    const aw = 15 * sc + al * 2, ah = 11.5 * sc + al * 2, br = 1 + Math.sin(t * 2.2) * .03;
    // the waist: a narrow stalk joining it to the head
    g.fillStyle = ink; g.beginPath(); g.ellipse(7 * sc, 0, 6 * sc, 3 * sc, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(-aw * .4, 0, aw * br, ah * br, 0, 0, TAU); g.fill();
    g.strokeStyle = bg; g.lineWidth = .6; g.globalAlpha = .35;
    for (let r = 1; r < 5; r++) { g.beginPath(); g.ellipse(-aw * .4, 0, aw * r / 5, ah * r / 5, 0, Math.PI * .6, Math.PI * 1.4); g.stroke(); }
    g.globalAlpha = 1; g.fillStyle = ac;
    g.beginPath(); g.moveTo(-aw * .1, -ah * .3); g.lineTo(-aw * .4, 0); g.lineTo(-aw * .1, ah * .3); g.lineTo(-aw * .7, ah * .3); g.lineTo(-aw * .4, 0); g.lineTo(-aw * .7, -ah * .3); g.closePath(); g.fill();
    g.restore();
    // head: small and dark, eight eyes, fangs
    const hl = this.head.lit;
    g.save(); g.translate(this.x, this.y); g.rotate(this.a);
    g.fillStyle = hl > .05 ? cols[2] : ink; g.beginPath(); g.ellipse(0, 0, 9 * sc + hl * 2, 7.5 * sc + hl * 2, 0, 0, TAU); g.fill();
    const eyes = [[5, -2.2, 1.6], [5, 2.2, 1.6], [3.4, -4, 1.1], [3.4, 4, 1.1], [6.6, -.9, .9], [6.6, .9, .9], [1.4, -3, .8], [1.4, 3, .8]];
    eyes.forEach(([ex, ey2, r]) => { if (sleepy) { g.strokeStyle = bg; g.lineWidth = .8; g.beginPath(); g.moveTo(ex * sc - r * sc, ey2 * sc); g.lineTo(ex * sc + r * sc, ey2 * sc); g.stroke(); return; }
      g.fillStyle = hot ? red : "#ff6a7d"; g.beginPath(); g.arc(ex * sc, ey2 * sc, r * sc * eye, 0, TAU); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(ex * sc + r * .3 * sc, ey2 * sc - r * .3 * sc, r * .35 * sc, 0, TAU); g.fill(); });
    g.strokeStyle = ink; g.lineWidth = 1.6 * sc;
    [-1, 1].forEach((sd) => { const op = mouth * 3; g.beginPath(); g.moveTo(8 * sc, sd * 2.5 * sc); g.quadraticCurveTo(13 * sc, sd * (3.5 + op) * sc, 12 * sc, sd * (1 + op * .5) * sc); g.stroke(); });
    g.restore();
  }
}
