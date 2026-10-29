// A procedurally animated creature: a head pulling a chain of body plates, every plate with a pair of jointed legs that
// plant, hold and step on their own. Drawn like a rig in debug view: bones as lines, joints as dots, a faint box round
// every joint, feet as rings. It can grow a plate (and a pair of legs) at a time.
const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
const ang = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function fabrik(j, L, rx, ry, tx, ty, bendX, bendY) {
  const n = L.length;
  // nudge the middle joints to one side first, so knees always fold the same way
  for (let i = 1; i < n; i++) { const k = Math.sin((i / n) * Math.PI); j[i][0] += bendX * k; j[i][1] += bendY * k; }
  for (let it = 0; it < 3; it++) {
    j[n][0] = tx; j[n][1] = ty;
    for (let i = n - 1; i >= 0; i--) { const ax = j[i][0] - j[i + 1][0], ay = j[i][1] - j[i + 1][1], q = Math.hypot(ax, ay) || 1; j[i][0] = j[i + 1][0] + ax / q * L[i]; j[i][1] = j[i + 1][1] + ay / q * L[i]; }
    j[0][0] = rx; j[0][1] = ry;
    for (let i = 1; i <= n; i++) { const ax = j[i][0] - j[i - 1][0], ay = j[i][1] - j[i - 1][1], q = Math.hypot(ax, ay) || 1; j[i][0] = j[i - 1][0] + ax / q * L[i - 1]; j[i][1] = j[i - 1][1] + ay / q * L[i - 1]; }
  }
}

export class Creature {
  constructor(x, y, a = 0, plates = 3, { gap = 20, size = 1 } = {}) {
    this.x = x; this.y = y; this.a = a; this.gap = gap; this.size = size; this.segs = []; this.t = 0; this.pulse = 0;
    for (let i = 0; i < plates + 1; i++) this.add(true);
  }
  // one more plate on the end, with its pair of legs
  add(quiet) {
    const n = this.segs.length, prev = this.segs[n - 1], a = prev ? prev.a : this.a;
    const x = prev ? prev.x - Math.cos(a) * this.gap : this.x, y = prev ? prev.y - Math.sin(a) * this.gap : this.y;
    const seed = Math.random() * 1000, head = n === 0;
    const seg = { x, y, a, w: head ? 22 : 18 + (seed % 7), h: head ? 18 : 13 + (seed % 5), seed, born: quiet ? -1 : 0, legs: [] };
    if (!head) for (const side of [-1, 1]) {
      const bones = 2 + ((seed + (side > 0 ? 3 : 0)) | 0) % 2, L = Array.from({ length: bones }, (_, k) => (bones === 2 ? [20, 22] : [16, 16, 14])[k] * (.85 + ((seed * (k + 2)) % 30) / 100));
      const reach = L.reduce((p, q) => p + q, 0);
      seg.legs.push({ side, L, reach, j: Array.from({ length: bones + 1 }, () => [x, y]), fx: x, fy: y, sx: x, sy: y, tx: x, ty: y, st: 1, phase: (n + (side > 0 ? 1 : 0)) % 2 });
    }
    this.segs.push(seg); if (!quiet) this.pulse = 1;
    return seg;
  }
  get length() { return this.segs.length - 1; }
  // head goes to (x, y) facing a; the rest follows
  update(dt, x, y, a, speed) {
    this.t += dt; this.pulse = Math.max(0, this.pulse - dt * 2.5);
    const s = this.segs, h = s[0], sc = this.size; h.x = x; h.y = y; h.a = a;
    for (let i = 1; i < s.length; i++) {
      const p = s[i - 1], q = s[i], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1, gap = this.gap * sc * (i === 1 ? 1.1 : 1);
      q.x = p.x + dx / d * gap; q.y = p.y + dy / d * gap;
      let want = Math.atan2(p.y - q.y, p.x - q.x), da = ang(want - p.a);
      if (Math.abs(da) > .7) want = p.a + Math.sign(da) * .7;   // a spine can only bend so far
      q.a = want; if (q.born >= 0) q.born = Math.min(1, q.born + dt * 2.2);
    }
    const stepping = new Set();
    s.forEach((q, i) => q.legs.forEach((l) => { if (l.st < 1) stepping.add(i * 2 + (l.side > 0 ? 1 : 0)); }));
    s.forEach((q, i) => q.legs.forEach((l) => {
      const grow = q.born < 0 ? 1 : q.born, ca = Math.cos(q.a), sa = Math.sin(q.a);
      const rx = q.x - sa * l.side * q.h * .45 * sc, ry = q.y + ca * l.side * q.h * .45 * sc;     // hip
      const out = l.reach * .72 * sc * grow, fwd = (speed > 20 ? 9 : 2) * sc;
      const restX = rx - sa * l.side * out + ca * fwd, restY = ry + ca * l.side * out + sa * fwd;
      if (l.st >= 1) {
        const off = Math.hypot(l.fx - restX, l.fy - restY), far = Math.hypot(l.fx - rx, l.fy - ry);
        const key = i * 2 + (l.side > 0 ? 1 : 0), busy = stepping.has(key - 2) || stepping.has(key + 2) || stepping.has(key ^ 1);
        if ((off > l.reach * .38 * sc && !busy) || far > l.reach * .98 * sc) {
          const lead = Math.min(1, speed / 300) * l.reach * .3 * sc;
          l.sx = l.fx; l.sy = l.fy; l.tx = restX + ca * lead; l.ty = restY + sa * lead; l.st = 0; stepping.add(key);
        }
      } else {
        l.st = Math.min(1, l.st + dt * (5 + speed * .02));
        const e = l.st * l.st * (3 - 2 * l.st); l.fx = lerp(l.sx, l.tx, e); l.fy = lerp(l.sy, l.ty, e);
        if (l.st >= 1) l.landed = this.t;
      }
      const lift = l.st < 1 ? Math.sin(l.st * Math.PI) * 7 * sc : 0;
      const bx = -sa * l.side * 6 * sc + ca * 4 * sc, by = ca * l.side * 6 * sc + sa * 4 * sc - lift;
      fabrik(l.j, l.L.map((v) => v * sc * Math.max(.2, grow)), rx, ry, l.fx, l.fy, bx, by);
    }));
  }
  // shift everything (the page scrolled under it)
  shift(dx, dy) { this.segs.forEach((q) => { q.x += dx; q.y += dy; q.legs.forEach((l) => { l.fx += dx; l.fy += dy; l.sx += dx; l.sy += dy; l.tx += dx; l.ty += dy; l.j.forEach((p) => { p[0] += dx; p[1] += dy; }); }); }); }
  draw(g, { ink, bg, cols, hot = false, eye = 1, mouth = 0 }) {
    const s = this.segs, sc = this.size, t = this.t;
    g.lineCap = "round"; g.lineJoin = "round";
    // legs first, under the plates
    s.forEach((q, i) => q.legs.forEach((l, k) => {
      const j = l.j, n = j.length - 1, col = cols[(i + k) % cols.length];
      g.strokeStyle = ink; g.lineWidth = 1.3; g.beginPath(); j.forEach((p, m) => (m ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
      // the rig boxes round each joint
      g.globalAlpha = .28; g.strokeStyle = col; g.lineWidth = 1;
      for (let m = 1; m < n; m++) { const b = 6 * sc, a2 = Math.atan2(j[m + 1][1] - j[m - 1][1], j[m + 1][0] - j[m - 1][0]); g.save(); g.translate(j[m][0], j[m][1]); g.rotate(a2); g.strokeRect(-b, -b, b * 2, b * 2); g.restore(); }
      g.globalAlpha = 1;
      for (let m = 1; m < n; m++) { g.fillStyle = ink; g.beginPath(); g.arc(j[m][0], j[m][1], 1.9, 0, TAU); g.fill(); }
      // foot: a ring, filled with colour while it's planted
      const fresh = l.landed && t - l.landed < .25 ? 1 - (t - l.landed) / .25 : 0;
      g.strokeStyle = ink; g.lineWidth = 1.2; g.beginPath(); g.arc(j[n][0], j[n][1], (4.5 + fresh * 5) * sc, 0, TAU); g.stroke();
      g.fillStyle = l.st >= 1 ? col : ink; g.beginPath(); g.arc(j[n][0], j[n][1], 2.1 * sc, 0, TAU); g.fill();
    }));
    // the spine through the middle of every plate
    g.strokeStyle = ink; g.lineWidth = 1; g.setLineDash([2, 3]); g.beginPath(); s.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.stroke(); g.setLineDash([]);
    // plates, tail first so the head sits on top
    for (let i = s.length - 1; i >= 0; i--) {
      const q = s[i], head = i === 0, grow = q.born < 0 ? 1 : 1 - Math.pow(1 - q.born, 3), w = q.w * sc * grow, h = q.h * sc * grow;
      if (w < .5) continue;
      const col = cols[i % cols.length], col2 = cols[(i + 1) % cols.length], pop = head ? this.pulse * 3 : 0;
      g.save(); g.translate(q.x, q.y); g.rotate(q.a);
      g.fillStyle = bg; g.strokeStyle = ink; g.lineWidth = 1.5; g.fillRect(-w / 2 - pop, -h / 2 - pop, w + pop * 2, h + pop * 2); g.strokeRect(-w / 2 - pop, -h / 2 - pop, w + pop * 2, h + pop * 2);
      if (head) {
        // corner brackets, two eyes, and a mouth that opens to eat
        const b = 5, x0 = w / 2 + 3, y0 = h / 2 + 3; g.lineWidth = 1.5; g.strokeStyle = hot ? "#ff2d4a" : ink;
        [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sy]) => { g.beginPath(); g.moveTo(sx * x0 - sx * b, sy * y0); g.lineTo(sx * x0, sy * y0); g.lineTo(sx * x0, sy * y0 - sy * b); g.stroke(); });
        g.fillStyle = hot ? "#ff2d4a" : ink; [-1, 1].forEach((sd) => { g.beginPath(); g.arc(w * .18, sd * h * .22, 2.6 * sc * eye, 0, TAU); g.fill(); });
        g.fillStyle = col; g.fillRect(-w * .38, -h * .3, w * .3, h * .6);
        if (mouth > 0) { g.fillStyle = ink; g.beginPath(); g.moveTo(w / 2, -h * .25 * mouth); g.lineTo(w / 2 + 7 * mouth, 0); g.lineTo(w / 2, h * .25 * mouth); g.fill(); }
      } else {
        // panel detail: a coloured cell, a grid of rivets, a strip
        const r = q.seed;
        g.fillStyle = col; g.globalAlpha = .9; g.fillRect(-w / 2 + 2.5, -h / 2 + 2.5, w * .32, h - 5); g.globalAlpha = 1;
        g.strokeStyle = ink; g.lineWidth = 1; g.strokeRect(-w / 2 + 2.5, -h / 2 + 2.5, w * .32, h - 5);
        const cx = w * .08, cols2 = 2 + (r % 2 | 0), rows2 = 2;
        g.fillStyle = (r | 0) % 3 ? ink : col2;
        for (let a2 = 0; a2 < cols2; a2++) for (let b2 = 0; b2 < rows2; b2++) { g.beginPath(); g.arc(cx + a2 * 4.2 * sc, (b2 - .5) * 5 * sc, 1.1 * sc, 0, TAU); g.fill(); }
        g.fillStyle = col2; g.fillRect(w / 2 - 4.5, -h / 2 + 2.5, 2, h - 5);
      }
      g.restore();
    }
  }
}
