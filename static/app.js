"use strict";
/* ================= RANGLAR VA SHRIFTLAR ================= */
const LW = 1280, LH = 720;
const R = {
  doska: "#0f1d2b", oq: "#eef4fb", sariq: "#ffd166", pushti: "#ff7aa2", kok: "#59d0ff", yashil: "#6ef0b8",
};
const RA = R.pushti, RB = R.kok, RC = R.sariq;
const RA_FON = "#3a1f30", RB_FON = "#0f3247", RC_FON = "#3a3220";
const RA_TOR = "#6b3550", RB_TOR = "#1d5875", RC_TOR = "#6b5a2c";
const UCH_FON = "#163049", BURCHAK = R.yashil, NUQTA = R.oq;
const SH = {
  bor: '"Onest", "Segoe UI", system-ui, sans-serif',
  formula: '"STIX Two Text", "Cambria Math", "Times New Roman", serif',
  chizma: '"Onest", "Segoe UI", system-ui, sans-serif',
};

/* ================= GEOMETRIYA ================= */
const qosh = (p, q) => [p[0] + q[0], p[1] + q[1]];
const ayir = (p, q) => [p[0] - q[0], p[1] - q[1]];
const kop = (p, k) => [p[0] * k, p[1] * k];
const uzun = p => Math.hypot(p[0], p[1]);
const birlik = p => { const d = uzun(p) || 1e-9; return [p[0] / d, p[1] / d]; };
const dot = (p, q) => p[0] * q[0] + p[1] * q[1];
const orta = (...ps) => [ps.reduce((s, p) => s + p[0], 0) / ps.length, ps.reduce((s, p) => s + p[1], 0) / ps.length];
const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
const rad = d => d * Math.PI / 180;

function fmt(x) {
  x = Math.round(x * 10) / 10;
  if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
  return String(x).replace(".", ",");
}
const tenglik = x => Math.abs(x - Math.round(x * 10) / 10) < 1e-6 ? "=" : "≈";
function burchak(V, P, Q) {
  const u = ayir(P, V), w = ayir(Q, V);
  const c = dot(u, w) / (uzun(u) * uzun(w));
  return Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI;
}

class Chizma {
  constructor() { this.items = []; }
  add(kind, d, bnd = []) { this.items.push([kind, bnd, d]); }
  render(W, H, pad = 62) {
    const pts = this.items.flatMap(it => it[1]);
    if (!pts.length) return [];
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const dx = Math.max(Math.max(...xs) - Math.min(...xs), 1e-6), dy = Math.max(Math.max(...ys) - Math.min(...ys), 1e-6);
    const s = Math.min((W - 2 * pad) / dx, (H - 2 * pad) / dy);
    const mx = (Math.max(...xs) + Math.min(...xs)) / 2, my = (Math.max(...ys) + Math.min(...ys)) / 2;
    const T = p => [W / 2 + (p[0] - mx) * s, H / 2 - (p[1] - my) * s];
    const out = [];
    for (const [kind, , d] of this.items) this["r_" + kind](d, T, out);
    return out;
  }
  matn(out, pos, s, color, size = 15) { out.push({ t: "text", x: pos[0], y: pos[1], s, color, size }); }
  r_poly(d, T, out) { out.push({ t: "poly", pts: d.pts.map(T), fill: d.fill || "", outline: d.outline || "", w: d.w || 0 }); }
  r_seg(d, T, out) {
    const p = T(d.p), q = T(d.q);
    if (d.dash) {
      const L = uzun(ayir(q, p));
      for (let t = 0; t < L; t += 15) out.push({ t: "line", pts: [lerp(p, q, t / L), lerp(p, q, Math.min(t + 9, L) / L)], color: d.color, w: d.w || 2 });
    } else out.push({ t: "line", pts: [p, q], color: d.color, w: d.w || 4 });
  }
  r_grid(d, T, out) {
    const [P0, P1, P2, P3] = d.sq;
    for (let i = 1; i < d.n; i++) {
      const t = i / d.n;
      for (const [a, b] of [[lerp(P0, P1, t), lerp(P3, P2, t)], [lerp(P0, P3, t), lerp(P1, P2, t)]])
        out.push({ t: "line", pts: [T(a), T(b)], color: d.color, w: 1 });
    }
  }
  r_slabel(d, T, out) {
    const p = T(d.p), q = T(d.q), c = T(d.c), mid = orta(p, q);
    const u = birlik(ayir(q, p));
    let n = [-u[1], u[0]];
    const tashqi = dot(n, ayir(mid, c)) > 0;
    if (tashqi === !!d.ichki) n = kop(n, -1);
    const size = d.size || 16;
    const off = 12 + Math.abs(n[0]) * d.text.length * size * 0.3 + Math.abs(n[1]) * size * 0.6;
    this.matn(out, qosh(mid, kop(n, off)), d.text, d.color, size);
  }
  r_vlabel(d, T, out) {
    const v = T(d.v), c = T(d.c);
    this.matn(out, qosh(v, kop(birlik(ayir(v, c)), 20)), d.text, NUQTA, 15);
  }
  r_arc(d, T, out) {
    const V = T(d.v), P = T(d.p), Q = T(d.q);
    const u = birlik(ayir(P, V)), w = birlik(ayir(Q, V)), col = d.color || BURCHAK, bis = birlik(qosh(u, w));
    let tpos;
    if (d.right) {
      const k = 16;
      out.push({ t: "line", pts: [qosh(V, kop(u, k)), qosh(qosh(V, kop(u, k)), kop(w, k)), qosh(V, kop(w, k))], color: col, w: 2 });
      tpos = qosh(V, kop(bis, 38));
    } else {
      const r = d.r || 26;
      const a1 = Math.atan2(u[1], u[0]), a2 = Math.atan2(w[1], w[0]);
      const df = ((a2 - a1 + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      const pts = [];
      for (let i = 0; i <= 16; i++) pts.push([V[0] + r * Math.cos(a1 + df * i / 16), V[1] + r * Math.sin(a1 + df * i / 16)]);
      out.push({ t: "line", pts, color: col, w: 2 });
      const size = d.size || 13, txt = d.text || "";
      const tw = txt.length * 0.6 * (size + 3), th = (size + 3) * 1.2, nb = [-bis[1], bis[0]];
      const yon = Math.abs(nb[0]) * tw / 2 + Math.abs(nb[1]) * th / 2;
      const boy = Math.abs(bis[0]) * tw / 2 + Math.abs(bis[1]) * th / 2;
      const tanY = Math.tan(Math.abs(df) / 2) || 1e-6;
      tpos = qosh(V, kop(bis, Math.min(Math.max(r + 12 + boy, (yon + 6) / tanY + boy), 150)));
    }
    if (d.text) this.matn(out, tpos, d.text, col, d.size || 13);
  }
  r_tick(d, T, out) {
    const p = T(d.p), q = T(d.q), mid = orta(p, q), u = birlik(ayir(q, p)), n = [-u[1], u[0]];
    for (let i = 0; i < d.k; i++) {
      const c = qosh(mid, kop(u, (i - (d.k - 1) / 2) * 6));
      out.push({ t: "line", pts: [qosh(c, kop(n, -8)), qosh(c, kop(n, 8))], color: NUQTA, w: 2 });
    }
  }
  r_text(d, T, out) {
    const p = T(d.p);
    this.matn(out, [p[0] + (d.dx || 0), p[1] + (d.dy || 0)], d.text, d.color || NUQTA, d.size || 16);
  }
  r_doira(d, T, out) {
    const pts = [];
    for (let k = 0; k < 28; k++) pts.push(T([d.c[0] + d.r * Math.cos(2 * Math.PI * k / 28), d.c[1] + d.r * Math.sin(2 * Math.PI * k / 28)]));
    out.push({ t: "poly", pts, fill: d.fill || "", outline: d.outline || "", w: d.w || 2 });
  }
  r_yol(d, T, out) { out.push({ t: "line", pts: d.pts.map(T), color: d.color, w: d.w || 2 }); }
  r_strelka(d, T, out) {
    const p = T(d.p), q = T(d.q), w = d.w || 4;
    out.push({ t: "line", pts: [p, q], color: d.color, w });
    const uchlar = [[q, birlik(ayir(q, p))]];
    if (d.ikki) uchlar.push([p, birlik(ayir(p, q))]);
    for (const [uch, u] of uchlar) {
      const n = [-u[1], u[0]], k = 9 + w * 1.5, asos = ayir(uch, kop(u, k * 1.5));
      out.push({ t: "poly", pts: [uch, qosh(asos, kop(n, k * 0.6)), ayir(asos, kop(n, k * 0.6))], fill: d.color, outline: "", w: 0 });
    }
  }
}

function uch(ch, A, B, C, o = {}) {
  const nomlar = o.nomlar === undefined ? ["A", "B", "C"] : o.nomlar;
  const tomon = o.tomon || ["", "", ""], rang = o.rang || [RA, RB, RC], tick = o.tick || [0, 0, 0], r = o.r || 26;
  let br = o.burchak, togri = o.togri ?? null;
  const G = orta(A, B, C), uchlar = [[A, B, C], [B, C, A], [C, A, B]];
  if (br === "auto") {
    const q = uchlar.map(t => burchak(...t));
    br = q.map(x => fmt(x) + "°");
    q.forEach((x, i) => { if (Math.abs(x - 90) < 0.05 && togri === null) togri = i; });
  }
  ch.add("poly", { pts: [A, B, C], fill: UCH_FON }, [A, B, C]);
  const tomonlar = [[B, C], [C, A], [A, B]];
  tomonlar.forEach(([P, Q], i) => ch.add("seg", { p: P, q: Q, color: rang[i], w: 4 }));
  uchlar.forEach(([V, P, Q], i) => {
    const bcol = o.burchakRang ? o.burchakRang[i] : BURCHAK;
    if (togri === i) ch.add("arc", { v: V, p: P, q: Q, right: true, color: bcol });
    else if (br && br[i]) ch.add("arc", { v: V, p: P, q: Q, text: br[i], color: bcol, r });
  });
  tomonlar.forEach(([P, Q], i) => { if (tick[i]) ch.add("tick", { p: P, q: Q, k: tick[i] }); });
  tomonlar.forEach(([P, Q], i) => { if (tomon[i]) ch.add("slabel", { p: P, q: Q, c: G, text: tomon[i], color: rang[i], ichki: o.ichki }); });
  if (nomlar) [A, B, C].forEach((V, i) => ch.add("vlabel", { v: V, c: G, text: nomlar[i] }));
}

function tomonlardan(a, b, c, x0 = 0) {
  if (a + b <= c || a + c <= b || b + c <= a) throw new Error(`tomonlari ${fmt(a)}, ${fmt(b)}, ${fmt(c)} bo'lgan uchburchak mavjud emas`);
  const x = (c * c + a * a - b * b) / (2 * a), y = Math.sqrt(Math.max(c * c - x * x, 0));
  return [[x0 + x, y], [x0, 0], [x0 + a, 0]];
}

function chizmaElementlari(spec, W, H) {
  const qism = spec.trim().split(/\s+/);
  const tur = qism[0].toLowerCase().replace(/['ʻ‘’`]/g, "");
  const n = qism.slice(1).map(x => parseFloat(x.replace(",", ".")));
  if (n.some(isNaN)) throw new Error("chizmadagi sonlarni tekshiring");
  const son = (i, d) => n.length > i ? n[i] : d;
  const ch = new Chizma();

  if (["tugri", "togri", "tugri_burchakli"].includes(tur)) {
    const a = son(0, 3), b = son(1, 4), c = Math.hypot(a, b);
    uch(ch, [0, b], [a, 0], [0, 0], { tomon: [`a = ${fmt(a)}`, `b = ${fmt(b)}`, `c ${tenglik(c)} ${fmt(c)}`], togri: 2 });
  } else if (tur === "pifagor") {
    const a = son(0, 3), b = son(1, 4), c = Math.hypot(a, b), A = [0, b], B = [a, 0], C = [0, 0];
    const kv = [
      [[C, B, [a, -a], [0, -a]], a, RA, RA_FON, RA_TOR, "a"],
      [[C, A, [-b, b], [-b, 0]], b, RB, RB_FON, RB_TOR, "b"],
      [[A, B, [a + b, a], [b, b + a]], c, RC, RC_FON, RC_TOR, "c"],
    ];
    for (const [sq, uz, col, fon, tor] of kv) {
      ch.add("poly", { pts: sq, fill: fon, outline: col, w: 2 }, sq);
      if (Math.abs(uz - Math.round(uz)) < 1e-6 && Math.round(uz) >= 2 && Math.round(uz) <= 12) ch.add("grid", { sq, n: Math.round(uz), color: tor });
    }
    for (const [sq, uz, col, , , harf] of kv) ch.add("text", { p: orta(...sq), text: `${harf}² ${tenglik(uz * uz)} ${fmt(uz * uz)}`, color: col, size: 17 });
    uch(ch, A, B, C, { nomlar: null, togri: 2 });
  } else if (tur === "uchburchak") {
    const a = son(0, 5), b = son(1, 6), c = son(2, 7);
    const [A, B, C] = tomonlardan(a, b, c);
    uch(ch, A, B, C, { tomon: [fmt(a), fmt(b), fmt(c)], burchak: "auto" });
  } else if (["teng_tomonli", "muntazam"].includes(tur)) {
    const a = son(0, 5);
    uch(ch, [a / 2, a * Math.sqrt(3) / 2], [0, 0], [a, 0], { tomon: [fmt(a), fmt(a), fmt(a)], burchak: ["60°", "60°", "60°"], tick: [1, 1, 1] });
  } else if (tur === "teng_yonli") {
    const yon = son(0, 5), asos = son(1, 6);
    if (asos >= 2 * yon) throw new Error("asos yon tomonning ikki baravaridan kichik bo'lishi kerak");
    uch(ch, [asos / 2, Math.sqrt(yon * yon - asos * asos / 4)], [0, 0], [asos, 0], { tomon: [fmt(asos), fmt(yon), fmt(yon)], burchak: "auto", tick: [0, 1, 1] });
  } else if (tur === "burchaklar") {
    const al = son(0, 70), be = son(1, 50), ga = 180 - al - be;
    if (al <= 0 || be <= 0 || ga <= 0) throw new Error("ikki burchak yig'indisi 180° dan kichik bo'lishi kerak");
    const a = 6, c = a * Math.sin(rad(ga)) / Math.sin(rad(al));
    uch(ch, [c * Math.cos(rad(be)), c * Math.sin(rad(be))], [0, 0], [a, 0], {
      burchak: [`α = ${fmt(al)}°`, `β = ${fmt(be)}°`, `γ = ${fmt(ga)}°`], burchakRang: [RA, RB, RC], r: 30 });
    ch.add("text", { p: [a / 2, 0], dy: 46, text: `${fmt(al)}° + ${fmt(be)}° + ${fmt(ga)}° = 180°`, color: BURCHAK, size: 18 }, [[a / 2, 0]]);
  } else if (["yuz", "yuza"].includes(tur)) {
    const a = son(0, 8), h = son(1, 5), A = [0.3 * a, h], B = [0, 0], C = [a, 0], Hn = [0.3 * a, 0];
    uch(ch, A, B, C, { tomon: [`a = ${fmt(a)}`, "", ""] });
    ch.add("seg", { p: A, q: Hn, color: BURCHAK, w: 2, dash: true });
    ch.add("arc", { v: Hn, p: A, q: C, right: true });
    ch.add("vlabel", { v: Hn, c: [0.3 * a, h], text: "H" });
    ch.add("slabel", { p: A, q: Hn, c: [0, h / 2], text: `h = ${fmt(h)}`, color: BURCHAK });
    const S = a * h / 2;
    ch.add("text", { p: [a / 2, 0], dy: 58, text: `S = ½ · ${fmt(a)} · ${fmt(h)} ${tenglik(S)} ${fmt(S)}`, color: R.sariq, size: 18 }, [[a / 2, 0]]);
  } else if (tur === "turlar") {
    const t = [
      [[[2, 4 * Math.sqrt(3) / 2], [0, 0], [4, 0]], RC, [1, 1, 1], "Teng\ntomonli"],
      [[[8, Math.sqrt(4.2 ** 2 - 1.5 ** 2)], [6.5, 0], [9.5, 0]], RB, [0, 1, 1], "Teng\nyonli"],
      [tomonlardan(4.6, 3, 4, 11.5), RA, [1, 2, 3], "Turli\ntomonli"],
    ];
    for (const [[A, B, C], col, tick, nom] of t) {
      uch(ch, A, B, C, { nomlar: null, tick, rang: [col, col, col] });
      ch.add("text", { p: orta(B, C), dy: 40, text: nom, color: col, size: 15 }, [B, C]);
    }
  } else if (tur === "burchak_turlari") {
    const t = [
      [[[1.8, 3.2], [0, 0], [4, 0]], RB, "O'tkir\nburchakli"],
      [[[6.5, 3], [6.5, 0], [10.5, 0]], RC, "To'g'ri\nburchakli"],
      [[[12.3, 2.2], [13.3, 0], [17, 0]], RA, "O'tmas\nburchakli"],
    ];
    for (const [[A, B, C], col, nom] of t) {
      const q = [[A, B, C], [B, C, A], [C, A, B]].map(x => burchak(...x));
      const eng = q.indexOf(Math.max(...q));
      const br = q.map((x, i) => i === eng ? fmt(x) + "°" : "");
      uch(ch, A, B, C, { nomlar: null, burchak: br, togri: Math.abs(q[eng] - 90) < 0.05 ? eng : null, rang: [col, col, col], r: 18 });
      ch.add("text", { p: orta(B, C), dy: 40, text: nom, color: col, size: 15 }, [B, C]);
    }
  } else if (["tushish", "tushayotgan_jism"].includes(tur)) {
    const m = son(0, 2), h = son(1, 5), g = 10, E = m * g * h, BAL = 8, L = 3.6;
    ch.add("seg", { p: [-3.6, -0.5], q: [12.6, -0.5], color: NUQTA, w: 3 }, [[-3.6, -0.5], [12.6, -0.5]]);
    ch.add("strelka", { p: [-1.8, 0.5], q: [-1.8, BAL + 0.5], color: BURCHAK, w: 2, ikki: true });
    ch.add("text", { p: [-1.8, BAL / 2 + 0.5], dx: -44, text: `h = ${fmt(h)} m`, color: BURCHAK, size: 15 }, [[-3.6, BAL / 2]]);
    for (const [nom, f] of [["Yuqorida", 1], ["O'rtada", 0.5], ["Pastda", 0]]) {
      const yc = BAL * f + 0.5, ep = E * f, ek = E * (1 - f), v = Math.sqrt(2 * g * h * (1 - f));
      ch.add("doira", { c: [2.2, yc], r: 0.48, fill: RB_FON, outline: RB, w: 3 }, [[2.2, yc + 0.5], [2.2, yc - 0.5]]);
      ch.add("text", { p: [2.2, yc + 0.5], dy: -16, text: nom, color: NUQTA, size: 14 });
      ch.add("text", { p: [-0.1, yc], text: `v ${tenglik(v)} ${fmt(v)} m/s`, color: RB, size: 13 });
      for (const [qiymat, y1, y2, rang, fon, belgi] of [[ep, 0.08, 0.58, RA, RA_TOR, "Eₚ"], [ek, -0.58, -0.08, RB, RB_TOR, "Eₖ"]]) {
        ch.add("poly", { pts: [[4.4, yc + y1], [4.4 + L, yc + y1], [4.4 + L, yc + y2], [4.4, yc + y2]], fill: "", outline: fon, w: 1 }, [[4.4, yc + y1], [4.4 + L, yc + y2]]);
        if (qiymat > 1e-9) {
          const x2 = 4.4 + L * qiymat / E;
          ch.add("poly", { pts: [[4.4, yc + y1], [x2, yc + y1], [x2, yc + y2], [4.4, yc + y2]], fill: rang, outline: "", w: 0 });
        }
        ch.add("text", { p: [10.6, yc + (y1 + y2) / 2], text: `${belgi} = ${fmt(qiymat)} J`, color: rang, size: 15 }, [[12.6, yc]]);
      }
    }
    ch.add("text", { p: [4.5, -0.5], dy: 34, text: `E = Eₚ + Eₖ = ${fmt(E)} J = const`, color: R.sariq, size: 17 });
  } else if (["mayatnik", "argimchoq"].includes(tur)) {
    const L = 5, a = rad(son(0, 40)), tay = [0, 0];
    ch.add("seg", { p: [-2.5, 0], q: [2.5, 0], color: NUQTA, w: 5 }, [[-3, 0.4], [3, 0]]);
    const yol = [];
    for (let k = 0; k <= 24; k++) { const t = -a + 2 * a * k / 24; yol.push([L * Math.sin(t), -L * Math.cos(t)]); }
    ch.add("yol", { pts: yol, color: "#6f9a80", w: 2 });
    const sh = [[-L * Math.sin(a), -L * Math.cos(a)], [0, -L], [L * Math.sin(a), -L * Math.cos(a)]];
    for (const s of sh) ch.add("seg", { p: tay, q: s, color: NUQTA, w: 3 });
    for (const s of sh) ch.add("doira", { c: s, r: 0.45, fill: RB_FON, outline: RB, w: 3 }, [[s[0] - 0.5, s[1] - 0.5], [s[0] + 0.5, s[1] + 0.5]]);
    ch.add("seg", { p: [sh[0][0], sh[0][1] - 0.45], q: [sh[0][0], -L], color: BURCHAK, w: 2, dash: true });
    ch.add("text", { p: [sh[0][0], (sh[0][1] - L) / 2], dx: 12, text: "h", color: BURCHAK, size: 15 });
    for (const [s, yon] of [[sh[0], -1], [sh[2], 1]])
      ch.add("text", { p: s, dx: yon * 72, dy: -6, text: "Eₚ — eng katta\nEₖ = 0", color: RA, size: 14 }, [[s[0] + yon * 3.2, s[1]]]);
    ch.add("strelka", { p: [0.7, -L], q: [2.4, -L], color: RB, w: 3 });
    ch.add("text", { p: [0, -L], dy: 48, text: "Eₖ — eng katta\nEₚ = 0", color: RB, size: 14 }, [[0, -L - 1.8]]);
    ch.add("text", { p: [1.55, -L], dy: -16, text: "v max", color: RB, size: 13 });
    ch.add("text", { p: [0, -L - 1.8], dy: 36, text: "Eₚ ⇄ Eₖ ,   E = const", color: R.sariq, size: 17 });
  } else if (["ish", "mexanik_ish"].includes(tur)) {
    const F = son(0, 0), s = son(1, 0);
    ch.add("seg", { p: [-0.5, 0], q: [12, 0], color: NUQTA, w: 3 }, [[-0.5, 0], [12, 0]]);
    ch.add("poly", { pts: [[0, 0], [2, 0], [2, 1.6], [0, 1.6]], fill: "", outline: "#6f9a80", w: 2 }, [[0, 1.8]]);
    ch.add("poly", { pts: [[7, 0], [9, 0], [9, 1.6], [7, 1.6]], fill: RC_FON, outline: RC, w: 3 });
    ch.add("strelka", { p: [9, 0.8], q: [11.6, 0.8], color: RA, w: 4 });
    ch.add("text", { p: [10.3, 0.8], dy: -20, text: F ? `F = ${fmt(F)} N` : "F", color: RA, size: 16 });
    ch.add("strelka", { p: [1, -0.7], q: [8, -0.7], color: RB, w: 2, ikki: true }, [[1, -1.2]]);
    ch.add("text", { p: [4.5, -0.7], dy: 18, text: s ? `s = ${fmt(s)} m` : "s", color: RB, size: 16 });
    ch.add("text", { p: [5.5, -0.7], dy: 58, text: F && s ? `A = F · s = ${fmt(F)} · ${fmt(s)} = ${fmt(F * s)} J` : "A = F · s", color: R.sariq, size: 18 });
  } else {
    throw new Error(`'${qism[0]}' degan chizma yo'q`);
  }
  return ch.render(W, H);
}

/* ================= DARS MATNINI O'QISH ================= */
const BELGI = { "-": "punkt", "=": "formula", "!": "chizma", "@": "korsat" };
function matndanOqish(matn) {
  const slaydlar = [], xatolar = [];
  let joriy = null;
  for (const qator of matn.replace(/^﻿/, "").split(/\r?\n/)) {
    const s = qator.trim();
    if (s.startsWith("#")) {
      const sarlavha = s.replace(/^#+/, "").trim();
      joriy = { sarlavha, chizma: false, qadamlar: [{ tur: "sarlavha", q: sarlavha, nutq: "" }] };
      slaydlar.push(joriy);
    } else if (!joriy || !s) continue;
    else if (BELGI[s[0]]) {
      const tur = BELGI[s[0]];
      joriy.qadamlar.push({ tur, q: s.slice(1).trim(), nutq: "" });
      if (tur === "chizma") joriy.chizma = true;
    } else {
      const q = joriy.qadamlar[joriy.qadamlar.length - 1];
      q.nutq += (q.nutq ? " " : "") + s;
    }
  }
  slaydlar.forEach((sl, i) => {
    sl.toliq = sl.chizma && !sl.qadamlar.some(q => q.tur === "punkt" || q.tur === "formula");
    for (const q of sl.qadamlar) {
      if (q.tur !== "chizma") continue;
      if (/^rasm\b/i.test(q.q)) {
        const nom = rasmNomi(q.q.replace(/^rasm\s*/i, ""));
        if (!RASMLAR.has(nom)) xatolar.push(`${i + 1}-slayd: «${nom}» rasmi yuklanmagan`);
      } else {
        try { chizmaElementlari(q.q, 500, 400); } catch (e) { xatolar.push(`${i + 1}-slayd chizmasi: ${e.message}`); }
      }
    }
  });
  return { slaydlar, xatolar };
}
function guruhlar(qadamlar) {
  const natija = []; let joriy = [];
  qadamlar.forEach((q, k) => {
    joriy.push(k);
    if (q.nutq.trim()) { natija.push([joriy, k]); joriy = []; }
  });
  if (joriy.length) natija.push([joriy, null]);
  return natija;
}
const YOZILADIGAN = ["sarlavha", "punkt", "formula"];
function yozishTezligi(qadamlar, sekund) {
  const harflar = qadamlar.filter(q => YOZILADIGAN.includes(q.tur)).reduce((s, q) => s + q.q.length, 0);
  if (!harflar || !sekund) return 30;
  const boshqa = qadamlar.reduce((s, q) => s + (q.tur === "chizma" ? 2500 : q.tur === "korsat" ? 1800 : 600), 0);
  return Math.round(Math.min(150, Math.max(26, (sekund * 1000 * 0.85 - boshqa) / harflar)));
}

/* ================= RASMLAR ================= */
const RASMLAR = new Map();     // nom (kichik harf) -> HTMLImageElement
const rasmNomi = yol => yol.trim().replace(/^["']|["']$/g, "").split(/[\\/]/).pop().toLowerCase();
function rasmQosh(nom, blob) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => { RASMLAR.set(rasmNomi(nom), img); res(true); };
    img.onerror = () => res(false);
    img.src = URL.createObjectURL(blob);
  });
}

/* ================= SAHNA (canvas) ================= */
const canvas = document.getElementById("doska");
const ctx = canvas.getContext("2d");
const olchovCtx = document.createElement("canvas").getContext("2d");

function wrap(matn, font, width) {
  olchovCtx.font = font;
  const qatorlar = [];
  let start = 0;
  for (const para of matn.split("\n")) {
    let line = "", lineStart = start, i = 0;
    const sozlar = para.split(" ");
    let pos = start;
    for (const soz of sozlar) {
      const sinov = line ? line + " " + soz : soz;
      if (width && line && olchovCtx.measureText(sinov).width > width) {
        qatorlar.push({ s: line, start: lineStart });
        line = soz; lineStart = pos;
      } else {
        if (!line) lineStart = pos;
        line = sinov;
      }
      pos += soz.length + 1;
      i++;
    }
    qatorlar.push({ s: line, start: lineStart });
    start += para.length + 1;
  }
  const w = Math.max(0, ...qatorlar.map(q => { olchovCtx.font = font; return olchovCtx.measureText(q.s).width; }));
  return { qatorlar, w };
}

class Sahna {
  constructor() { this.items = []; this.qol = null; }
  add(it) { it.tags = it.tags || ["yozuv"]; this.items.push(it); return it; }
  del(tag) { this.items = this.items.filter(i => !i.tags.includes(tag)); }
  remove(it) { this.items = this.items.filter(i => i !== it); }
  matn(o) {
    const font = `${o.weight || ""} ${o.size}px ${o.family}`.trim();
    const { qatorlar, w } = wrap(o.s, font, o.width);
    const lh = o.size * (o.lh || 1.18), h = lh * qatorlar.length;
    const it = { t: "text", ...o, font, qatorlar, lh, w, h, shown: o.shown ?? o.s.length };
    it.bbox = o.anchor === "center" ? [o.x - w / 2, o.y - h / 2, o.x + w / 2, o.y + h / 2] : [o.x, o.y, o.x + w, o.y + h];
    return this.add(it);
  }
  matnOxiri(it) {   // ko'rsatilgan oxirgi harf joyi (tayoqcha uchi uchun)
    let li = 0;
    for (let i = 0; i < it.qatorlar.length; i++) if (it.qatorlar[i].start <= it.shown) li = i;
    const q = it.qatorlar[li];
    olchovCtx.font = it.font;
    const k = Math.max(0, Math.min(q.s.length, it.shown - q.start));
    return [it.bbox[0] + olchovCtx.measureText(q.s.slice(0, k)).width, it.bbox[1] + li * it.lh + it.size * 0.95];
  }
}

function ellips(c, cx, cy, rx, ry) { c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); }

/* Doska foni (bir marta chiziladi) */
const FON = document.createElement("canvas");
function yumaloq(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
const EKRAN = { x0: 30, y0: 30, x1: LW - 30, y1: LH - 30 };
function fonChiz() {
  FON.width = LW * 2; FON.height = LH * 2;
  const c = FON.getContext("2d");
  c.scale(2, 2);
  const { x0, y0, x1, y1 } = EKRAN;
  // metall ramka (burchaklarini sahifadagi konteyner yumaloqlaydi)
  const g = c.createLinearGradient(0, 0, 0, LH);
  g.addColorStop(0, "#2b3645"); g.addColorStop(0.5, "#1a222d"); g.addColorStop(1, "#121821");
  c.fillStyle = g; c.fillRect(0, 0, LW, LH);
  const yorug = c.createLinearGradient(0, 0, 0, 3);
  yorug.addColorStop(0, "rgba(255,255,255,.14)"); yorug.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = yorug; c.fillRect(0, 0, LW, 3);
  // ekran
  const sg = c.createRadialGradient(LW * 0.45, LH * 0.3, 40, LW * 0.5, LH * 0.5, LW * 0.8);
  sg.addColorStop(0, "#14283c"); sg.addColorStop(1, "#0a1520");
  yumaloq(c, x0, y0, x1 - x0, y1 - y0, 14); c.fillStyle = sg; c.fill();
  c.save(); yumaloq(c, x0, y0, x1 - x0, y1 - y0, 14); c.clip();
  // matematik nuqtali to'r
  for (let x = x0 + 22; x < x1; x += 32)
    for (let y = y0 + 22; y < y1; y += 32) {
      const katta = ((x - x0 - 22) / 32) % 5 === 0 && ((y - y0 - 22) / 32) % 5 === 0;
      c.fillStyle = katta ? "rgba(150,200,245,.20)" : "rgba(150,200,245,.09)";
      c.fillRect(x - (katta ? 1.5 : 1), y - (katta ? 1.5 : 1), katta ? 3 : 2, katta ? 3 : 2);
    }
  // shisha yaltirashi
  const rg = c.createLinearGradient(x0, y0, x0 + 620, y0 + 520);
  rg.addColorStop(0, "rgba(255,255,255,.055)"); rg.addColorStop(0.55, "rgba(255,255,255,0)");
  c.fillStyle = rg; c.fillRect(x0, y0, x1 - x0, y1 - y0);
  c.restore();
  c.strokeStyle = "rgba(0,0,0,.65)"; c.lineWidth = 2; yumaloq(c, x0, y0, x1 - x0, y1 - y0, 14); c.stroke();
  // kamera va indikator
  c.fillStyle = "#070b10"; c.beginPath(); c.arc(LW / 2, 17, 3.4, 0, Math.PI * 2); c.fill();
  c.strokeStyle = "rgba(89,208,255,.35)"; c.lineWidth = 1; c.stroke();
  c.fillStyle = "#6ef0b8"; c.shadowColor = "#6ef0b8"; c.shadowBlur = 6;
  c.beginPath(); c.arc(LW - 46, LH - 17, 2.4, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
}

function qolChiz(c, x, y) {
  c.save(); c.translate(x, y);
  c.lineJoin = "round"; c.lineCap = "round";
  // yeng
  const yg = c.createLinearGradient(150, 100, 250, 200);
  yg.addColorStop(0, "#2c3a50"); yg.addColorStop(1, "#151d2a");
  c.beginPath(); c.moveTo(146, 112); c.lineTo(172, 96); c.lineTo(266, 178); c.lineTo(234, 210); c.closePath();
  c.fillStyle = yg; c.fill(); c.strokeStyle = "rgba(255,255,255,.12)"; c.lineWidth = 1.5; c.stroke();
  c.beginPath(); c.moveTo(146, 113); c.lineTo(171, 97); c.lineTo(178, 104); c.lineTo(153, 121); c.closePath();
  c.fillStyle = R.kok; c.fill();
  // teleskopik ko'rsatkich
  c.strokeStyle = "#7d8ba0"; c.lineWidth = 6; c.beginPath(); c.moveTo(70, 56); c.lineTo(134, 107); c.stroke();
  c.strokeStyle = "#c9d3e0"; c.lineWidth = 3.4; c.beginPath(); c.moveTo(2, 1.6); c.lineTo(72, 57.6); c.stroke();
  c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(72, 55); c.lineTo(132, 103); c.stroke();
  // uchidagi nur
  const ng = c.createRadialGradient(0, 0, 0, 0, 0, 16);
  ng.addColorStop(0, "rgba(89,208,255,.85)"); ng.addColorStop(1, "rgba(89,208,255,0)");
  c.fillStyle = ng; c.beginPath(); c.arc(0, 0, 16, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#e6fbff"; c.beginPath(); c.arc(0, 0, 3.6, 0, Math.PI * 2); c.fill();
  // qo'l
  const tg = c.createLinearGradient(115, 90, 160, 130);
  tg.addColorStop(0, "#f6d2ae"); tg.addColorStop(1, "#e3ad80");
  ellips(c, 138, 110, 23, 19); c.fillStyle = tg; c.fill(); c.strokeStyle = "#c48d61"; c.lineWidth = 1.5; c.stroke();
  c.strokeStyle = "rgba(170,110,70,.55)"; c.lineWidth = 1.5;
  for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(124 + k * 9, 99 + k * 3); c.quadraticCurveTo(127 + k * 9, 106 + k * 3, 128 + k * 9, 112 + k * 3); c.stroke(); }
  ellips(c, 117, 104, 11, 7.5); c.fillStyle = "#f4cba2"; c.fill(); c.strokeStyle = "#c48d61"; c.lineWidth = 1.5; c.stroke();
  c.restore();
}

const sahna = new Sahna();
let dpr = 1;
function olcham() {
  const r = canvas.getBoundingClientRect();
  dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(r.width * dpr));
  canvas.height = Math.max(1, Math.round(r.height * dpr));
}
function chiz() {
  const k = canvas.width / LW;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.drawImage(FON, 0, 0, LW, LH);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const it of sahna.items) {
    ctx.globalAlpha = it.alpha ?? 1;
    if (it.t === "line") {
      if (it.pts.length < 2) continue;
      ctx.strokeStyle = it.color; ctx.lineWidth = it.w;
      ctx.shadowColor = it.color + "66"; ctx.shadowBlur = it.w > 2 ? 8 : 0;
      ctx.beginPath(); ctx.moveTo(...it.pts[0]); for (const p of it.pts.slice(1)) ctx.lineTo(...p); ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (it.t === "poly") {
      ctx.beginPath(); ctx.moveTo(...it.pts[0]); for (const p of it.pts.slice(1)) ctx.lineTo(...p); ctx.closePath();
      if (it.fill) { ctx.fillStyle = it.fill; ctx.fill(); }
      if (it.outline && it.w) { ctx.strokeStyle = it.outline; ctx.lineWidth = it.w; ctx.stroke(); }
    } else if (it.t === "rect") {
      ctx.fillStyle = it.fill; ctx.shadowColor = it.glow || "transparent"; ctx.shadowBlur = it.glow ? 24 : 0;
      ctx.fillRect(it.x, it.y, it.w, it.h); ctx.shadowBlur = 0;
    } else if (it.t === "image") {
      const f = it.f ?? 1;
      if (f > 0) {
        ctx.save(); yumaloq(ctx, it.x, it.y, it.w, it.h, 10); ctx.clip();
        ctx.drawImage(it.img, 0, 0, it.img.naturalWidth, it.img.naturalHeight * f, it.x, it.y, it.w, it.h * f);
        ctx.restore();
      }
    } else if (it.t === "text") {
      ctx.font = it.font; ctx.fillStyle = it.color;
      ctx.shadowColor = it.color + "55"; ctx.shadowBlur = 8;
      ctx.textBaseline = "top";
      it.qatorlar.forEach((q, i) => {
        const k = Math.max(0, Math.min(q.s.length, it.shown - q.start));
        if (!k) return;
        const y = it.bbox[1] + i * it.lh + (it.lh - it.size) / 2;
        if (it.anchor === "center") {
          olchovCtx.font = it.font;
          const qw = olchovCtx.measureText(q.s).width;
          ctx.fillText(q.s.slice(0, k), it.x - qw / 2, y);
        } else ctx.fillText(q.s.slice(0, k), it.bbox[0], y);
      });
      ctx.shadowBlur = 0;
    }
  }
  ctx.globalAlpha = 1;
  if (sahna.qol) qolChiz(ctx, sahna.qol[0], sahna.qol[1]);
  requestAnimationFrame(chiz);
}

/* ================= DOSKA (o'qituvchi harakatlari) ================= */
class Doska {
  constructor(s) { this.s = s; this.matnlar = []; this.tezlik = 30; }

  tayyorla(sl) {
    const { x0, y0, x1, y1 } = EKRAN, w = x1 - x0;
    Object.assign(this, { x0, y0, x1, y1 });
    const ikki = sl.chizma, toliq = sl.toliq;
    this.chapX = x0 + 40;
    this.chapW = ikki ? w * 0.46 : w - 90;
    this.chizmaJoy = toliq ? [x0 + 50, y0 + 96, x1 - 50, y1 - 18] : [x0 + w * 0.5, y0 + 96, x1 - 26, y1 - 18];
    this.damJoy = [x0 + (toliq ? 40 : w * 0.3), y1 - 150];
    if (!this.s.qol) this.s.qol = [...this.damJoy];
    // matn doskaga sig'ishi uchun shrift o'lchamini tanlash
    this.k = 1;
    for (let k = 1; k >= 0.4; k -= 0.05) {
      this.k = k;
      const ts = 46 * Math.max(k, 0.8);
      const t = wrap(sl.sarlavha, `700 ${ts}px ${SH.bor}`, x1 - x0 - 90);
      let y = Math.max(y0 + 104, y0 + 16 + t.qatorlar.length * ts * 1.15 + 34);
      for (const q of sl.qadamlar) {
        if (q.tur === "punkt") {
          const p = wrap(q.q, `500 ${28 * k}px ${SH.bor}`, this.chapW - 34);
          y += p.qatorlar.length * 28 * k * 1.35 + 14 * k;
        } else if (q.tur === "formula") {
          const f = wrap(q.q, `600 ${32 * k}px ${SH.formula}`, this.chapW - 30);
          y += f.qatorlar.length * 32 * k * 1.25 + 16 + 22 * k;
        }
      }
      if (y <= y1 - 16) break;
    }
    this.y = y0 + 104;
  }

  qolJoy(x, y) { this.s.qol = [x, y]; }
  *qolBor(x, y, ms = 380) {
    const [ax, ay] = this.s.qol, n = Math.max(4, Math.floor(ms / 28));
    for (let i = 1; i <= n; i++) {
      let t = i / n; t = t * t * (3 - 2 * t);
      this.qolJoy(ax + (x - ax) * t, ay + (y - ay) * t);
      yield 28;
    }
  }
  *dam() { yield* this.qolBor(...this.damJoy, 500); }

  *yoz(o) {
    yield* this.qolBor(o.x + 6, o.y + o.size * 0.6, 300);
    const it = this.s.matn({ ...o, shown: 0 });
    const qadam = Math.max(1, Math.floor(o.s.length / 70));
    while (it.shown < o.s.length) {
      it.shown = Math.min(o.s.length, it.shown + qadam);
      const p = this.s.matnOxiri(it);
      this.qolJoy(p[0] + 2, p[1] - 4);
      yield o.s[it.shown - 1] === " " ? this.tezlik / 2 : this.tezlik;
    }
    this.matnlar.push([o.s, it.bbox]);
    return it.bbox;
  }
  *chiziq(p, q, rang, w = 4, kadr = 12, ms = 24, tags = ["yozuv"]) {
    yield* this.qolBor(...p, 220);
    const it = this.s.add({ t: "line", pts: [p, p], color: rang, w, tags });
    for (let i = 1; i <= kadr; i++) {
      const pt = lerp(p, q, i / kadr);
      it.pts = [p, pt]; this.qolJoy(...pt);
      yield ms;
    }
  }

  *amal(q) {
    if (q.tur === "sarlavha") yield* this.sarlavha(q.q);
    else if (q.tur === "punkt") yield* this.punkt(q.q);
    else if (q.tur === "formula") yield* this.formula(q.q);
    else if (q.tur === "chizma") yield* this.chizma(q.q);
    else if (q.tur === "korsat") yield* this.korsat(q.q);
  }
  *sarlavha(matn) {
    const size = 46 * Math.max(this.k, 0.8);
    const bb = yield* this.yoz({ x: this.x0 + 38, y: this.y0 + 24, s: matn, family: SH.bor, weight: 700, size, lh: 1.15, color: R.oq, width: this.x1 - this.x0 - 90 });
    yield* this.chiziq([bb[0], bb[3] + 8], [bb[0] + Math.min(bb[2] - bb[0], 140), bb[3] + 8], R.kok, 4, 8);
    this.y = Math.max(this.y, bb[3] + 30);
  }
  *punkt(matn) {
    const k = this.k, x = this.chapX, y = this.y;
    yield* this.qolBor(x, y + 22 * k, 300);
    this.s.add({ t: "poly", pts: [[x + 2, y + 17 * k], [x + 10, y + 10 * k], [x + 18, y + 17 * k], [x + 10, y + 24 * k]], fill: R.kok, outline: "", w: 0 });
    yield 120;
    const bb = yield* this.yoz({ x: x + 30, y, s: matn, family: SH.bor, weight: 500, size: 28 * k, lh: 1.35, color: "#dbe6f3", width: this.chapW - 34 });
    this.y = bb[3] + 14 * k;
  }
  *formula(matn) {
    const k = this.k, x = this.chapX + 14, y = this.y + 8;
    const bb = yield* this.yoz({ x, y, s: matn, family: SH.formula, weight: 600, size: 32 * k, lh: 1.25, color: R.sariq, width: this.chapW - 30 });
    const [a, b, c, d] = [bb[0] - 14, bb[1] - 8, bb[2] + 14, bb[3] + 8];
    for (const [p, q] of [[[a, b], [c, b]], [[c, b], [c, d]], [[c, d], [a, d]], [[a, d], [a, b]]])
      yield* this.chiziq(p, q, R.yashil, 2, 6, 20);
    this.y = d + 22 * k;
  }
  *chizma(spec) {
    this.s.del("chizma");
    if (/^rasm\b/i.test(spec)) { yield* this.rasm(spec.replace(/^rasm\s*/i, "")); return; }
    const [x0, y0, x1, y1] = this.chizmaJoy;
    let els;
    try { els = chizmaElementlari(spec, x1 - x0, y1 - y0); }
    catch (e) { els = [{ t: "text", x: (x1 - x0) / 2, y: (y1 - y0) / 2, s: "Chizma xatosi: " + e.message, color: RA, size: 16 }]; }
    const tags = ["yozuv", "chizma"], sil = p => [p[0] + x0, p[1] + y0];
    const kat = Math.max(0.8, Math.min(1.4, Math.min(x1 - x0, y1 - y0) / 440));
    for (const e of els) {
      if (e.t === "poly") {
        const pts = e.pts.map(sil);
        yield* this.qolBor(...orta(...pts), 260);
        this.s.add({ t: "poly", pts, fill: e.fill, outline: e.outline, w: e.w, tags });
        yield 150;
      } else if (e.t === "line") {
        const pts = e.pts.map(sil);
        if (pts.length === 2 && e.w >= 3) yield* this.chiziq(pts[0], pts[1], e.color, e.w, 14, 24, tags);
        else if (pts.length > 2) {
          yield* this.qolBor(...pts[Math.floor(pts.length / 2)], 200);
          this.s.add({ t: "line", pts, color: e.color, w: e.w, tags });
          yield 120;
        } else { this.s.add({ t: "line", pts, color: e.color, w: e.w, tags }); yield 12; }
      } else if (e.t === "text") {
        const [x, y] = sil([e.x, e.y]);
        yield* this.qolBor(x + 8, y + 12, 220);
        const it = this.s.matn({ x, y, s: e.s, family: SH.chizma, weight: 600, size: Math.round((e.size + 3) * kat), lh: 1.2, color: e.color, anchor: "center", tags });
        this.matnlar.push([e.s, it.bbox]);
        yield 140;
      }
    }
  }
  *rasm(nom) {
    const [x0, y0, x1, y1] = this.chizmaJoy, tags = ["yozuv", "chizma"];
    const img = RASMLAR.get(rasmNomi(nom));
    if (!img) {
      this.s.matn({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, s: `«${rasmNomi(nom)}» rasmi topilmadi.\nRasmni ham saytga yuklang.`, family: SH.chizma, weight: 600, size: 22, color: RA, anchor: "center", width: x1 - x0 - 40, tags });
      return;
    }
    const k = Math.min((x1 - x0 - 24) / img.naturalWidth, (y1 - y0 - 24) / img.naturalHeight);
    const iw = img.naturalWidth * k, ih = img.naturalHeight * k, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const a = cx - iw / 2, b = cy - ih / 2, c = cx + iw / 2, d = cy + ih / 2;
    const rs = this.s.add({ t: "image", img, x: a, y: b, w: iw, h: ih, f: 0, tags });
    yield* this.qolBor(a, b, 300);
    const n = 18;
    for (let i = 1; i <= n; i++) {          // ko'rsatkich bilan yuqoridan pastga "ochadi"
      rs.f = i / n;
      this.qolJoy(cx + iw / 2 * Math.sin(i * 0.7), b + ih * i / n);
      yield 40;
    }
    for (const [p, q] of [[[a - 6, b - 6], [c + 6, b - 6]], [[c + 6, b - 6], [c + 6, d + 6]], [[c + 6, d + 6], [a - 6, d + 6]], [[a - 6, d + 6], [a - 6, b - 6]]])
      yield* this.chiziq(p, q, "#3d6f8f", 2, 5, 16, tags);
    this.matnlar.push(["rasm", [a, b, c, d]]);
  }
  top(nima) {
    const tekis = t => t.toLowerCase().replace(/\s+/g, "");
    const n = tekis(nima);
    if (!n) return null;
    for (const shart of [m => tekis(m[0]) === n, m => tekis(m[0]).startsWith(n), m => tekis(m[0]).includes(n)]) {
      const g = this.matnlar.filter(shart);
      if (g.length) return g[g.length - 1];
    }
    return null;
  }
  *korsat(nima) {
    const t = this.top(nima);
    if (!t) return;
    const bb = t[1], cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
    const rx = (bb[2] - bb[0]) / 2 + 16, ry = (bb[3] - bb[1]) / 2 + 12, b0 = rad(40);
    const nuqta = k => [cx + rx * Math.cos(b0 + k), cy + ry * Math.sin(b0 + k)];
    yield* this.qolBor(...nuqta(0), 420);
    let old = nuqta(0);
    for (let k = 1; k <= 30; k++) {             // bo'r bilan aylantirib chizadi
      const p = nuqta(2 * Math.PI * 1.05 * k / 30);
      this.s.add({ t: "line", pts: [old, p], color: R.sariq, w: 3, tags: ["yozuv", "belgi"] });
      this.qolJoy(...p); old = p;
      yield 22;
    }
    for (let i = 0; i < 2; i++) {               // tayoqcha bilan ikki marta "tuqillatadi"
      yield* this.qolBor(old[0] + 14, old[1] + 12, 120);
      yield* this.qolBor(...old, 120);
    }
  }
  *ochir() {
    if (this.x0 === undefined) return;
    const { x0, y0, x1, y1 } = this;
    const nur = this.s.add({ t: "rect", x: x0, y: y0 + 4, w: 4, h: y1 - y0 - 8, fill: "rgba(140,225,255,.9)", glow: "#59d0ff", tags: ["latta"] });
    const yozuvlar = this.s.items.filter(i => i.tags.includes("yozuv"));
    const n = 18;
    for (let k = 1; k <= n; k++) {
      const x = x0 + (x1 - x0) * k / n;
      nur.x = x - 2;
      for (const it of yozuvlar) {
        const bx = it.bbox ? it.bbox[0] : it.pts ? Math.min(...it.pts.map(p => p[0])) : it.x ?? x0;
        if (bx < x) it.alpha = Math.max(0, (it.alpha ?? 1) - 0.34);
      }
      yield 26;
    }
    this.s.del("yozuv"); this.s.del("latta");
    this.matnlar = [];
  }
}

/* ================= OVOZ ================= */
const SAQLASH_KALIT = "elektron-doska-ovoz";
class Ovoz {
  constructor() {
    this.bor = "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
    this.s = { voiceURI: "", tezlik: 1, ohang: 1, balandlik: 1 };
    try { Object.assign(this.s, JSON.parse(localStorage.getItem(SAQLASH_KALIT) || "{}")); } catch (e) {}
    this.joriy = null;
    this.api = null; this.apiOvozlar = []; this.kesh = new Map(); this.audio = null; this.pauzada = false;
  }
  saqla() { try { localStorage.setItem(SAQLASH_KALIT, JSON.stringify(this.s)); } catch (e) {} }
  /* Windows dasturi ichida: ovozlarni Python (edge-tts) yaratadi */
  async apiUlash(api) {
    this.api = api;
    try { this.apiOvozlar = await api.ovozlar(); } catch (e) { this.apiOvozlar = []; }
    if (!this.apiOvozlar || !this.apiOvozlar.length)
      this.apiOvozlar = [{ ShortName: "uz-UZ-MadinaNeural", Locale: "uz-UZ", FriendlyName: "Madina" }, { ShortName: "uz-UZ-SardorNeural", Locale: "uz-UZ", FriendlyName: "Sardor" }];
    this.bor = true;
  }
  royxat() {
    if (this.api) return this.apiOvozlar.map(v => ({ voiceURI: v.ShortName, name: v.FriendlyName || v.ShortName, lang: v.Locale }));
    return this.bor ? speechSynthesis.getVoices() : [];
  }
  kalit(m) { const v = this.tanlangan(); return [m, v && v.voiceURI, this.s.tezlik, this.s.ohang].join("|"); }
  tayyorla(matn) {
    const k = this.kalit(matn);
    if (!this.kesh.has(k)) {
      const v = this.tanlangan();
      const p = Promise.resolve(this.api.gapir(ovozga(matn), v ? v.voiceURI : "uz-UZ-MadinaNeural", this.s.tezlik, this.s.ohang));
      p.catch(() => this.kesh.delete(k));
      this.kesh.set(k, p);
    }
    return this.kesh.get(k);
  }
  oldindan(matnlar) {                // darsdagi gaplarni oldindan tayyorlab qo'yadi — gapirish kechikmaydi
    if (!this.api) return;
    const navbat = matnlar.filter(m => m && m.trim()), id = (this.navbatId = (this.navbatId || 0) + 1);
    const ish = () => { if (id !== this.navbatId) return; const m = navbat.shift(); if (m) this.tayyorla(m).catch(() => {}).finally(ish); };
    ish(); ish(); ish();
  }
  uzbekmi(v) { return /^uz/i.test(v.lang) || /uzbek|o'zbek/i.test(v.name); }
  tanlangan() {
    const vs = this.royxat();
    return vs.find(v => v.voiceURI === this.s.voiceURI) || vs.find(v => this.uzbekmi(v)) || null;
  }
  davomiylik(matn) { return (matn.trim().split(/\s+/).length * 0.43 + 0.4) / this.s.tezlik; }
  bolaklar(matn) {
    const gaplar = matn.match(/[^.!?…]+[.!?…]*\s*/g) || [matn];
    const out = [];
    let joriy = "";
    for (const g of gaplar) {
      if ((joriy + g).length > 220 && joriy) { out.push(joriy); joriy = g; } else joriy += g;
    }
    if (joriy.trim()) out.push(joriy);
    return out;
  }
  gapir(matn) {
    this.toxtat();
    const ish = { tugadi: false, soxta: !this.bor };
    this.joriy = ish;
    if (!this.bor) return ish;
    if (this.api) {
      this.tayyorla(matn).then(url => {
        if (this.joriy !== ish) return;
        const a = new Audio(url);
        a.volume = this.s.balandlik;
        a.onended = () => { ish.tugadi = true; };
        a.onerror = () => { ish.soxta = true; };
        this.audio = a;
        if (!this.pauzada) a.play().catch(() => { ish.soxta = true; });
      }).catch(() => { ish.soxta = true; if (!ovoz.xatoAytildi) { ovoz.xatoAytildi = true; xabar("Ovoz yaratilmadi. Internetni tekshiring — o'zbekcha ovoz internet orqali ishlaydi.", 7000); } });
      return ish;
    }
    const v = this.tanlangan(), qismlar = this.bolaklar(ovozga(matn));
    let i = 0;
    const keyingi = () => {
      if (ish.tugadi || this.joriy !== ish) return;
      if (i >= qismlar.length) { ish.tugadi = true; return; }
      const u = new SpeechSynthesisUtterance(qismlar[i++]);
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "uz-UZ";
      u.rate = this.s.tezlik; u.pitch = this.s.ohang; u.volume = this.s.balandlik;
      u.onend = keyingi;
      u.onerror = e => { if (e.error === "interrupted" || e.error === "canceled") return; ish.soxta = true; ish.tugadi = true; };
      speechSynthesis.speak(u);
    };
    setTimeout(keyingi, 80);        // cancel() dan keyin Chrome yangi gapni tashlab yubormasligi uchun
    return ish;
  }
  toxtat() {
    if (this.joriy) this.joriy.tugadi = true;
    this.joriy = null; this.pauzada = false;
    if (this.audio) { this.audio.pause(); this.audio = null; }
    if (this.bor && !this.api) speechSynthesis.cancel();
  }
  pauza() { this.pauzada = true; if (this.audio) this.audio.pause(); else if (this.bor && !this.api) speechSynthesis.pause(); }
  davom() { this.pauzada = false; if (this.audio) this.audio.play().catch(() => {}); else if (this.bor && !this.api) speechSynthesis.resume(); }
}
/* Formulalarni ovozda o'qiladigan so'zlarga aylantirish */
function ovozga(s) {
  s = s.replace(/[A-ZА-ЯЁЎҚҒҲ'‘’ʻ]{4,}/g, w => w[0] + w.slice(1).toLowerCase());   // KATTA HARFLAR harflab o'qilmasin
  return s
    .replace(/m\/s²/g, " metr sekund kvadrat").replace(/m\/s/g, " metr sekundiga")
    .replace(/Eₖ/g, "E ka").replace(/Eₚ/g, "E pe")
    .replace(/²/g, " kvadrat").replace(/³/g, " kub").replace(/√/g, " ildiz ")
    .replace(/[₀-₉]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x2080 + 48))
    .replace(/\s*≈\s*/g, " taxminan ")
    .replace(/\s*=\s*/g, " teng ").replace(/\s*\+\s*/g, " plyus ")
    .replace(/\s[−-]\s/g, " minus ").replace(/\s*[×·]\s*/g, " karra ")
    .replace(/(\S)\s*\/\s*(\S)/g, "$1 bo'lingan $2")
    .replace(/°/g, " gradus").replace(/∠/g, " burchak ")
    .replace(/\s{2,}/g, " ");
}

/* ================= PPTX DAN MATN ================= */
const xmlOqi = t => new DOMParser().parseFromString(t, "application/xml");
const els = (n, nom) => Array.from(n.getElementsByTagName("*")).filter(e => e.localName === nom);
function yolQosh(papka, nisbiy) {
  if (nisbiy.startsWith("/")) return nisbiy.slice(1);
  const q = (papka ? papka.split("/") : []);
  for (const b of nisbiy.split("/")) { if (b === "..") q.pop(); else if (b !== ".") q.push(b); }
  return q.join("/");
}
async function aloqalar(zip, fayl) {
  const papka = fayl.split("/").slice(0, -1).join("/");
  const rels = papka + "/_rels/" + fayl.split("/").pop() + ".rels";
  const f = zip.file(rels);
  const map = {};
  if (!f) return map;
  for (const r of els(xmlOqi(await f.async("text")), "Relationship"))
    map[r.getAttribute("Id")] = { target: yolQosh(papka, r.getAttribute("Target")), type: r.getAttribute("Type") || "" };
  return map;
}
const paragraflar = sp => els(sp, "p").filter(p => p.namespaceURI && p.namespaceURI.includes("drawingml"))
  .map(p => Array.from(p.getElementsByTagName("*")).filter(e => e.localName === "t" || e.localName === "br")
    .map(e => e.localName === "br" ? " " : e.textContent).join("").replace(/\s+/g, " ").trim()).filter(Boolean);
function gaplarga(matn) {
  return matn.split(/(?<=[^\d\s][.!?…])\s+(?=[A-ZА-ЯЁЎҚҒҲ"«(])/).map(x => x.trim()).filter(Boolean);
}
const formulami = s => /=/.test(s) && !/:/.test(s) && s.length <= 52 && s.split(/\s+/).filter(w => /[a-zA-Z'ʻ‘’]{4,}/.test(w)).length <= 2;

async function pptxdanMatn(fayl) {
  const zip = await JSZip.loadAsync(fayl);
  const pres = zip.file("ppt/presentation.xml");
  if (!pres) throw new Error("Bu fayl PowerPoint taqdimotiga o'xshamaydi");
  const presRel = await aloqalar(zip, "ppt/presentation.xml");
  const slaydFayllar = els(xmlOqi(await pres.async("text")), "sldId")
    .map(s => presRel[s.getAttribute("r:id")]?.target).filter(Boolean);
  const qatorlar = [];
  let rasmSoni = 0, oldingiSarlavha = "";
  for (let i = 0; i < slaydFayllar.length; i++) {
    const sf = zip.file(slaydFayllar[i]);
    if (!sf) continue;
    const doc = xmlOqi(await sf.async("text")), rel = await aloqalar(zip, slaydFayllar[i]);
    let sarlavha = "";
    const matnlar = [], rasmlar = [];
    for (const el of Array.from(doc.getElementsByTagName("*"))) {
      if (el.localName === "sp" && el.namespaceURI.includes("presentationml")) {
        const ph = els(el, "ph")[0], tur = ph ? ph.getAttribute("type") || "" : "";
        if (["sldNum", "dt", "ftr"].includes(tur)) continue;
        const p = paragraflar(el).filter(t => !/^\d{1,3}$/.test(t));
        if (!p.length) continue;
        if ((tur === "title" || tur === "ctrTitle") && !sarlavha) sarlavha = p.join(" ");
        else matnlar.push(...p);
      } else if (el.localName === "pic") {
        const blip = els(el, "blip")[0], id = blip && blip.getAttribute("r:embed");
        const t = id && rel[id] && rel[id].target;
        if (!t || !/\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(t)) continue;
        const f = zip.file(t);
        if (!f) continue;
        const nom = `slayd${i + 1}_${rasmlar.length + 1}.${t.split(".").pop().toLowerCase()}`;
        const tur = /svg$/i.test(t) ? "image/svg+xml" : "";
        if (await rasmQosh(nom, new Blob([await f.async("arraybuffer")], tur ? { type: tur } : {}))) { rasmlar.push(nom); rasmSoni++; }
      } else if (el.localName === "tr") {
        const kat = els(el, "tc").map(tc => els(tc, "t").map(t => t.textContent).join("").trim()).filter(Boolean);
        if (kat.length) matnlar.push(kat.join(" — "));
      }
    }
    // izohlar (speaker notes)
    let izoh = "";
    const noteRel = Object.values(rel).find(r => /notesSlide$/.test(r.type));
    if (noteRel && zip.file(noteRel.target)) {
      const nd = xmlOqi(await zip.file(noteRel.target).async("text"));
      izoh = els(nd, "sp").filter(sp => { const ph = els(sp, "ph")[0]; return ph && ph.getAttribute("type") === "body"; })
        .flatMap(paragraflar).join(" ").trim();
    }
    if (!sarlavha && matnlar.length && matnlar[0].length <= 70) sarlavha = matnlar.shift();
    if (!sarlavha) sarlavha = rasmlar.length && oldingiSarlavha ? oldingiSarlavha : `Slayd ${i + 1}`;
    sarlavha = sarlavha.replace(/:$/, "");
    oldingiSarlavha = sarlavha;
    qatorlar.push(`# ${sarlavha}`);
    if (!izoh) qatorlar.push(sarlavha.endsWith("?") || sarlavha.endsWith("!") ? sarlavha : sarlavha + ".");
    for (const r of rasmlar) qatorlar.push(`! rasm ${r}`);
    if (!matnlar.length && !izoh && rasmlar.length) qatorlar.push("Rasmga e'tibor bering.");
    for (const para of matnlar) {
      for (let g of gaplarga(para)) {
        g = g.replace(/^Formula:\s*/i, "");
        if (!g) continue;
        if (formulami(g)) { qatorlar.push(`= ${g.replace(/\.$/, "")}`); if (!izoh) qatorlar.push(g); }
        else { qatorlar.push(`- ${g}`); if (!izoh) qatorlar.push(g); }
      }
    }
    if (izoh) qatorlar.push(izoh);
    qatorlar.push("");
  }
  return { matn: qatorlar.join("\n"), slaydSoni: slaydFayllar.length, rasmSoni };
}

/* ================= ILOVA ================= */
const $ = id => document.getElementById(id);
const doska = new Doska(sahna);
const ovoz = new Ovoz();
const ilova = { slaydlar: [], i: 0, pauza: false, tugadi: false, runId: 0, darsNomi: "" };

function xabar(matn, ms = 4200) {
  const t = $("toast");
  if (!matn) { t.hidden = true; return; }
  t.textContent = matn; t.hidden = false;
  clearTimeout(xabar.t); xabar.t = setTimeout(() => (t.hidden = true), ms);
}
function subtitr(m) { $("subtitr").textContent = m; $("caption").classList.toggle("on", !!m && !ilova.pauza && !ilova.tugadi); }

function ishga(gen) {
  const id = ++ilova.runId;
  const tick = () => {
    if (id !== ilova.runId) return;
    if (ilova.pauza) { setTimeout(tick, 100); return; }
    let r;
    try { r = gen.next(); } catch (e) { console.error(e); xabar("Xatolik: " + e.message); return; }
    if (r.done) return;
    setTimeout(tick, Math.max(1, r.value | 0));
  };
  tick();
}

function* skript(i, ochir) {
  const sl = ilova.slaydlar[i];
  if (ochir) yield* doska.ochir();
  doska.tayyorla(sl);
  for (const [indekslar, egasi] of guruhlar(sl.qadamlar)) {
    const nutq = egasi !== null ? sl.qadamlar[egasi].nutq : "";
    subtitr(nutq);
    doska.tezlik = 30;
    let ish = null, D = 0;
    if (nutq.trim()) {
      D = ovoz.davomiylik(nutq);
      doska.tezlik = yozishTezligi(indekslar.map(k => sl.qadamlar[k]), D);
      ish = ovoz.gapir(nutq);
    }
    for (const k of indekslar) { sahna.del("belgi"); yield* doska.amal(sl.qadamlar[k]); }
    if (ish) {
      yield 200;
      let kut = 200;
      const chegara = () => (ish.soxta ? D : D * 2 + 6) * 1000;
      while (!ish.tugadi && kut < chegara()) { yield 100; kut += 100; }
    }
    yield 350;
  }
  yield* doska.dam();
  yield 1200;
  if (i < ilova.slaydlar.length - 1) slaydKorsat(i + 1);
  else { ilova.tugadi = true; subtitr("Dars tugadi. E'tiboringiz uchun rahmat!"); pauzaTugma(); joriy(ilova.slaydlar.length); }
}

function pauzaTugma() {
  const yuryapti = $("overlay").hidden && !ilova.pauza && !ilova.tugadi;
  const b = $("pauzaBtn");
  b.querySelector("use").setAttribute("href", yuryapti ? "#i-pause" : "#i-play");
  b.setAttribute("aria-label", yuryapti ? "Pauza" : "Boshlash");
  $("caption").classList.toggle("on", yuryapti && !!$("subtitr").textContent);
}
function segmentlar() {
  const s = $("segments");
  s.innerHTML = "";
  ilova.slaydlar.forEach((sl, k) => {
    const b = document.createElement("button");
    b.type = "button"; b.title = `${k + 1}. ${sl.sarlavha}`; b.setAttribute("aria-label", b.title);
    b.addEventListener("click", () => boshla(k));
    s.appendChild(b);
  });
}
function joriy(i) {
  const n = ilova.slaydlar.length, k = Math.min(i, n - 1);
  Array.from($("segments").children).forEach((b, j) => { b.classList.toggle("done", j < i); b.classList.toggle("now", j === i); });
  $("sana").textContent = `${k + 1} / ${n}`;
  $("joriySarlavha").textContent = ilova.slaydlar[k] ? ilova.slaydlar[k].sarlavha : "";
}
function slaydKorsat(i, ochir = true) {
  ovoz.toxtat();
  ilova.i = i; ilova.pauza = false; ilova.tugadi = false; pauzaTugma();
  joriy(i);
  ishga(skript(i, ochir));
}

/* Slaydni darhol, ovozsiz to'liq chizish (ko'rinish uchun) */
function tezChiz(i) {
  ilova.runId++;
  sahna.del("yozuv"); sahna.del("latta"); sahna.del("belgi");
  doska.matnlar = [];
  const sl = ilova.slaydlar[i];
  if (!sl) return;
  doska.tayyorla(sl);
  for (const q of sl.qadamlar) for (const _ of doska.amal(q)) { /* animatsiyasiz */ }
  for (const _ of doska.dam()) {}
  sahna.del("belgi");
  joriy(i);
}

function darsYukla(matn, nom) {
  const { slaydlar, xatolar } = matndanOqish(matn);
  if (!slaydlar.length) { xabar("Matnda slayd topilmadi: har slayd «#» bilan boshlanishi kerak."); return false; }
  ovoz.toxtat();
  ilova.slaydlar = slaydlar; ilova.i = 0; ilova.pauza = false; ilova.darsNomi = nom || slaydlar[0].sarlavha;
  $("matn").value = matn;
  $("darsNomi").textContent = ilova.darsNomi;
  ilova.tugadi = false;
  segmentlar();
  rasmRoyxati();
  tezChiz(0);
  subtitr("");
  $("ovSarlavha").textContent = ilova.darsNomi;
  const sozlar = slaydlar.flatMap(s => s.qadamlar).reduce((n, q) => n + (q.nutq.trim() ? q.nutq.trim().split(/\s+/).length : 0), 0);
  const daqiqa = Math.max(1, Math.round((sozlar * 0.45 + slaydlar.length * 4) / 60));
  $("ovMatn").textContent = `${slaydlar.length} ta slayd · taxminan ${daqiqa} daqiqa`;
  $("overlay").hidden = false;
  pauzaTugma();
  if (xatolar.length) xabar(xatolar.slice(0, 3).join(" · "), 8000);
  darsOldindan();
  return true;
}
function darsOldindan() { ovoz.oldindan(ilova.slaydlar.flatMap(s => s.qadamlar.map(q => q.nutq))); }
function rasmRoyxati() {
  $("rasmRoyxat").textContent = RASMLAR.size ? "Yuklangan rasmlar: " + [...RASMLAR.keys()].join(", ") : "Rasm yuklanmagan. Rasmlarni taqdimot bilan birga tanlang yoki .zip qilib yuklang.";
}

/* ================= FAYL YUKLASH ================= */
let fayllarniOl = async function (fayllar) {
  fayllar = Array.from(fayllar);
  if (!fayllar.length) return;
  try {
    const rasmlar = fayllar.filter(f => /^image\//.test(f.type) || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.name));
    for (const r of rasmlar) await rasmQosh(r.name, r);
    const pptx = fayllar.find(f => /\.pptx$/i.test(f.name));
    const txt = fayllar.find(f => /\.txt$/i.test(f.name));
    const zipF = fayllar.find(f => /\.zip$/i.test(f.name));
    if (pptx) {
      xabar("Taqdimot o'qilmoqda…");
      const { matn, slaydSoni, rasmSoni } = await pptxdanMatn(pptx);
      if (darsYukla(matn, pptx.name.replace(/\.pptx$/i, "").replace(/^\d+_/, "").replace(/_/g, " ")))
        xabar(`Taqdimot o'qildi: ${slaydSoni} ta slayd, ${rasmSoni} ta rasm. Matnni «Matn» bo'limida o'zgartirishingiz mumkin.`, 7000);
    } else if (zipF) {
      const zip = await JSZip.loadAsync(zipF);
      let matn = null, nom = zipF.name.replace(/\.zip$/i, "");
      for (const f of Object.values(zip.files)) {
        if (f.dir) continue;
        if (/\.(png|jpe?g|gif|webp|bmp)$/i.test(f.name)) await rasmQosh(f.name, new Blob([await f.async("arraybuffer")]));
        else if (/\.txt$/i.test(f.name) && matn === null) { matn = await f.async("text"); nom = f.name.split("/").pop().replace(/\.txt$/i, ""); }
      }
      if (matn === null) { xabar("Zip ichida .txt dars fayli topilmadi."); return; }
      if (darsYukla(matn, nom)) xabar(`«${nom}» darsi yuklandi.`);
    } else if (txt) {
      const matn = await txt.text();
      if (darsYukla(matn, txt.name.replace(/\.txt$/i, ""))) xabar(`«${txt.name}» yuklandi.`);
    } else if (rasmlar.length) {
      rasmRoyxati();
      darsYukla($("matn").value, ilova.darsNomi);
      xabar(`${rasmlar.length} ta rasm qo'shildi.`);
    } else xabar("Bu fayl turini o'qiy olmayman. .pptx, .pdf, .txt, .zip yoki rasm yuklang.");
  } catch (e) {
    console.error(e);
    xabar("Faylni o'qib bo'lmadi: " + e.message, 7000);
  }
};

/* ================= OVOZ PANELI ================= */
function ovozlarniTold() {
  const sel = $("ovozTanlov"), vs = ovoz.royxat();
  sel.innerHTML = "";
  if (!vs.length) {
    const kech = performance.now() > 2500;
    const o = document.createElement("option");
    o.textContent = !ovoz.bor ? "Brauzer ovozni qo'llab-quvvatlamaydi" : kech ? "Bu brauzerda ovoz topilmadi" : "Ovozlar yuklanmoqda…";
    sel.appendChild(o);
    if (ovoz.bor && !kech) setTimeout(ovozlarniTold, 2700);
  }
  const tartib = [...vs].sort((a, b) => (ovoz.uzbekmi(b) - ovoz.uzbekmi(a)) || a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name));
  const tanlangan = ovoz.tanlangan();
  for (const v of tartib) {
    const o = document.createElement("option");
    o.value = v.voiceURI;
    o.textContent = `${ovoz.uzbekmi(v) ? "★ " : ""}${v.name.replace(/^Microsoft\s+/, "").replace(/\s+Online \(Natural\)/, " (tabiiy)")} — ${v.lang}`;
    if (tanlangan && v.voiceURI === tanlangan.voiceURI) o.selected = true;
    sel.appendChild(o);
  }
  const uz = vs.some(v => ovoz.uzbekmi(v)), og = $("ovozOgoh");
  og.hidden = uz || (!vs.length && performance.now() <= 2500);
  og.textContent = "Bu brauzerda o'zbekcha ovoz topilmadi, shuning uchun boshqa tildagi ovoz o'zbekcha matnni yaxshi o'qimaydi. Saytni Microsoft Edge brauzerida oching — u yerda «Madina» va «Sardor» o'zbek ovozlari bor.";
}
function slayderlar() {
  $("tezlik").value = ovoz.s.tezlik; $("ohang").value = ovoz.s.ohang; $("balandlik").value = ovoz.s.balandlik;
  $("tezlikQ").textContent = Number(ovoz.s.tezlik).toFixed(2) + "×";
  $("ohangQ").textContent = Number(ovoz.s.ohang).toFixed(2);
  $("balandlikQ").textContent = Math.round(ovoz.s.balandlik * 100) + "%";
}

/* ================= HODISALAR ================= */
const PANEL_TUGMA = { ovozPanel: "ovozBtn", matnPanel: "matnBtn", sozlamaPanel: "sozlamaBtn" };
function panelOch(id) {
  for (const p of Object.keys(PANEL_TUGMA)) {
    $(p).hidden = p !== id ? true : !$(p).hidden;
    $(PANEL_TUGMA[p]).setAttribute("aria-pressed", String(!$(p).hidden));
  }
}
document.querySelectorAll("[data-yop]").forEach(b => b.addEventListener("click", () => {
  $(b.dataset.yop).hidden = true; $(PANEL_TUGMA[b.dataset.yop]).setAttribute("aria-pressed", "false");
}));
$("ovozBtn").addEventListener("click", () => { ovozlarniTold(); panelOch("ovozPanel"); });
$("matnBtn").addEventListener("click", () => { rasmRoyxati(); panelOch("matnPanel"); });
$("yuklashBtn").addEventListener("click", () => $("fayl").click());
$("fayl").addEventListener("change", e => { fayllarniOl(e.target.files); e.target.value = ""; });

$("boshlaBtn").addEventListener("click", () => {
  $("overlay").hidden = true;
  sahna.del("yozuv"); sahna.del("belgi");
  doska.matnlar = [];
  slaydKorsat(ilova.tugadi ? 0 : ilova.i, false);
});
$("pauzaBtn").addEventListener("click", pauzaAlmashtir);
function pauzaAlmashtir() {
  if (!$("overlay").hidden) { $("boshlaBtn").click(); return; }
  if (ilova.tugadi) { boshla(0); return; }
  ilova.pauza = !ilova.pauza;
  if (ilova.pauza) ovoz.pauza(); else ovoz.davom();
  pauzaTugma();
}
function boshla(i, ochir = true) { $("overlay").hidden = true; slaydKorsat(i, ochir); }
$("keyingiBtn").addEventListener("click", () => { if (ilova.i < ilova.slaydlar.length - 1) boshla(ilova.i + 1); });
$("oldingiBtn").addEventListener("click", () => { if (ilova.i > 0) boshla(ilova.i - 1); });
$("qaytaBtn").addEventListener("click", () => boshla(ilova.i));
$("ekranBtn").addEventListener("click", () => {
  const w = $("boardWrap");
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else (w.requestFullscreen ? w.requestFullscreen() : Promise.reject()).catch(() => xabar("To'liq ekran bu yerda ishlamaydi."));
  } catch (e) { xabar("To'liq ekran bu yerda ishlamaydi."); }
});
document.addEventListener("fullscreenchange", () => setTimeout(olcham, 50));

$("korsatBtn").addEventListener("click", () => { if (darsYukla($("matn").value, ilova.darsNomi)) { $("matnPanel").hidden = true; xabar("Doska yangilandi. «Darsni boshlash»ni bosing."); } });
$("nusxaBtn").addEventListener("click", () => {
  const t = $("matn");
  navigator.clipboard.writeText(t.value).then(() => xabar("Matn nusxalandi.")).catch(() => { t.select(); xabar("Matn belgilandi — Ctrl+C bosing."); });
});

$("ovozTanlov").addEventListener("change", e => { ovoz.s.voiceURI = e.target.value; ovoz.saqla(); darsOldindan(); });
for (const id of ["tezlik", "ohang", "balandlik"]) $(id).addEventListener("input", e => { ovoz.s[id] = Number(e.target.value); ovoz.saqla(); slayderlar(); });
for (const id of ["tezlik", "ohang"]) $(id).addEventListener("change", darsOldindan);
$("sinashBtn").addEventListener("click", () => {
  if (!ovoz.bor) { xabar("Bu brauzer ovozli o'qishni qo'llab-quvvatlamaydi."); return; }
  ovoz.gapir("Assalomu alaykum! Bugun uchburchaklar haqida gaplashamiz. A kvadrat plyus B kvadrat teng C kvadrat.");
});
if (ovoz.bor) speechSynthesis.addEventListener("voiceschanged", ovozlarniTold);

document.addEventListener("keydown", e => {
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  if (e.code === "Space" && e.target.tagName === "BUTTON") return;
  if (e.code === "Space") { e.preventDefault(); pauzaAlmashtir(); }
  else if (e.key === "ArrowRight") $("keyingiBtn").click();
  else if (e.key === "ArrowLeft") $("oldingiBtn").click();
});

// sudrab tashlash
let sudrash = 0;
window.addEventListener("dragenter", e => { e.preventDefault(); sudrash++; $("drop").hidden = false; });
window.addEventListener("dragleave", () => { if (--sudrash <= 0) { sudrash = 0; $("drop").hidden = true; } });
window.addEventListener("dragover", e => e.preventDefault());
window.addEventListener("drop", e => { e.preventDefault(); sudrash = 0; $("drop").hidden = true; fayllarniOl(e.dataTransfer.files); });

new ResizeObserver(olcham).observe(canvas);


/* ================= BilimAI: PDF, server ovozi, AI tushuntirish ================= */
const SERVER = { bor: false, ai: false };

let pdfjsKutubxona = null;
async function pdfKutubxona() {
  if (!pdfjsKutubxona) {
    try {                                   // avval papkadagi nusxa, bo'lmasa internetdan
      pdfjsKutubxona = await import("/static/pdf.min.mjs");
      pdfjsKutubxona.GlobalWorkerOptions.workerSrc = "/static/pdf.worker.min.mjs";
    } catch (e) {
      const cdn = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/legacy/build/";
      pdfjsKutubxona = await import(cdn + "pdf.min.mjs");
      pdfjsKutubxona.GlobalWorkerOptions.workerSrc = cdn + "pdf.worker.min.mjs";
    }
  }
  return pdfjsKutubxona;
}

async function pdfdanMatn(fayl) {
  const lib = await pdfKutubxona();
  const doc = await lib.getDocument({ data: new Uint8Array(await fayl.arrayBuffer()) }).promise;
  const RASM_OPS = [lib.OPS.paintImageXObject, lib.OPS.paintInlineImageXObject, lib.OPS.paintImageMaskXObject].filter(x => x !== undefined);
  const qatorlar = [];
  let rasmSoni = 0, oldingi = "";
  for (let n = 1; n <= doc.numPages; n++) {
    xabar(`PDF o'qilmoqda: ${n} / ${doc.numPages}`, 60000);
    const page = await doc.getPage(n);
    const tc = await page.getTextContent();
    const guruh = [];
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const y = it.transform[5], h = Math.abs(it.transform[3]) || it.height || 10;
      let q = guruh.find(g => Math.abs(g.y - y) <= Math.max(2, h * 0.45));
      if (!q) { q = { y, h, bolak: [] }; guruh.push(q); }
      q.bolak.push([it.transform[4], it.str]); q.h = Math.max(q.h, h);
    }
    guruh.sort((a, b) => b.y - a.y);
    const lines = guruh.map(g => ({ h: g.h, s: g.bolak.sort((a, b) => a[0] - b[0]).map(p => p[1]).join(" ").replace(/\s+/g, " ").replace(/\s+([ₐ-ₜ₀-₉⁰-⁹²³])/g, "$1").trim() }))
      .filter(l => l.s && !/^\d{1,3}$/.test(l.s));
    let sarlavha = "";
    if (lines.length) {
      const hlar = lines.map(l => l.h), maxH = Math.max(...hlar), minH = Math.min(...hlar);
      const ti = lines.findIndex(l => l.h >= maxH * 0.92);
      if (ti >= 0 && lines[ti].s.length <= 90 && (maxH > minH * 1.15 || lines.length === 1)) { sarlavha = lines[ti].s; lines.splice(ti, 1); }
    }
    const paras = [];
    for (const l of lines) {
      const p = paras[paras.length - 1];
      if (p !== undefined && !/[.!?:;]$/.test(p) && /^[a-zа-яёўқғҳ'‘’(,]/.test(l.s)) paras[paras.length - 1] = p + " " + l.s;
      else paras.push(l.s);
    }
    // rasmli sahifani doskada rasm qilib ham ko'rsatamiz
    let rasmBor = paras.join(" ").length < 40;
    try { const ops = await page.getOperatorList(); rasmBor = rasmBor || ops.fnArray.some(f => RASM_OPS.includes(f)); } catch (e) {}
    let rasmNom = "";
    if (rasmBor) {
      const vp = page.getViewport({ scale: 1 }), k = Math.min(2, 1400 / vp.width), v2 = page.getViewport({ scale: k });
      const cv = document.createElement("canvas"); cv.width = Math.round(v2.width); cv.height = Math.round(v2.height);
      const c2 = cv.getContext("2d"); c2.fillStyle = "#fff"; c2.fillRect(0, 0, cv.width, cv.height);
      await page.render({ canvasContext: c2, canvas: cv, viewport: v2 }).promise;
      const blob = await new Promise(r => cv.toBlob(r, "image/jpeg", 0.88));
      rasmNom = `sahifa${n}.jpg`;
      if (blob && await rasmQosh(rasmNom, blob)) rasmSoni++; else rasmNom = "";
    }
    if (!sarlavha && paras.length && paras[0].length <= 70) sarlavha = paras.shift();
    if (!sarlavha) sarlavha = oldingi || `Sahifa ${n}`;
    sarlavha = sarlavha.replace(/:$/, ""); oldingi = sarlavha;
    qatorlar.push(`# ${sarlavha}`, /[.?!]$/.test(sarlavha) ? sarlavha : sarlavha + ".");
    if (rasmNom) qatorlar.push(`! rasm ${rasmNom}`);
    if (rasmNom && !paras.length) qatorlar.push("Rasmga e'tibor bering.");
    for (const para of paras) for (let g of gaplarga(para)) {
      g = g.replace(/^Formula:\s*/i, "");
      if (!g) continue;
      qatorlar.push(formulami(g) ? `= ${g.replace(/\.$/, "")}` : `- ${g}`, g);
    }
    qatorlar.push("");
  }
  xabar("", 1);
  return { matn: qatorlar.join("\n"), slaydSoni: doc.numPages, rasmSoni };
}

/* ---- server bilan ulanish: ovoz (Madina, Sardor) va AI holati ---- */
async function serverniTekshir() {
  try {
    const r = await fetch("/api/holat", { cache: "no-store" });
    if (!r.ok) throw 0;
    const h = await r.json();
    SERVER.bor = true;
    aiHolatniKorsat(h);
    if (!ovoz.api) {
      await ovoz.apiUlash({
        ovozlar: async () => (await fetch("/api/ovozlar")).json(),
        gapir: async (matn, v, tezlik, ohang) => {
          const j = await fetch("/api/ovoz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matn, ovoz: v, tezlik, ohang }) });
          if (!j.ok) throw new Error("ovoz");
          return URL.createObjectURL(await j.blob());
        },
      });
      $("ovozIzoh").textContent = "BilimAI o'zbekcha neyron ovozlardan (Madina, Sardor) foydalanadi. Ovoz internet orqali yaratiladi. Sozlamalar shu brauzerda saqlanadi.";
      ovozlarniTold();
      darsOldindan();
    }
  } catch (e) {
    SERVER.bor = false;
    $("serverOgoh").hidden = false;
    $("aiHolatMatn").textContent = "AI uchun BilimAI serveri kerak (python main.py)";
  }
}
function aiHolatniKorsat(h) {
  SERVER.ai = !!h.ai;
  $("kalitHolat").textContent = h.ai ? `saqlangan ${h.kalit}` : "kiritilmagan";
  $("aiHolatMatn").textContent = h.ai ? `Gemini tayyor · ${h.model}` : "Gemini kaliti «Sozlamalar»da kiritiladi";
  const sel = $("modelTanlov");
  sel.innerHTML = "";
  for (const m of h.modellar || []) { const o = document.createElement("option"); o.value = m; o.textContent = m; if (m === h.model) o.selected = true; sel.appendChild(o); }
}

/* ---- AI: har bir slayd uchun o'qituvchi ssenariysi ---- */
const kut = ms => new Promise(r => setTimeout(r, ms));
async function aiTushuntir() {
  if (!SERVER.ai) { xabar("AI uchun avval «Sozlamalar»da Gemini kalitini kiriting.", 6000); panelOch("sozlamaPanel"); return false; }
  const sl = ilova.slaydlar, jami = sl.length, sarlavhalar = sl.map(s => s.sarlavha);
  const asl = $("matn").value.replace(/^[\s\S]*?(?=^#)/m, "").split(/\n(?=#)/);
  const natija = new Array(jami);
  let tayyor = 0, xatolar = 0, oxirgiXato = "";
  $("doskaHolat").textContent = "AI tayyorlamoqda…";
  $("ochishBtn").disabled = true;
  const bitta = async i => {
    const s = sl[i];
    const rasmlar = s.qadamlar.filter(q => q.tur === "chizma" && /^rasm\b/i.test(q.q)).map(q => "! " + q.q);
    const korilgan = new Set(), matnQismlar = [];
    for (const q of s.qadamlar.slice(1)) for (const t of [q.tur === "chizma" ? "" : q.q, q.nutq]) {
      const x = (t || "").trim();
      if (x && !korilgan.has(x)) { korilgan.add(x); matnQismlar.push(x); }
    }
    for (let urinish = 0; urinish < 4; urinish++) {
      try {
        const r = await fetch("/api/tushuntir", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sarlavha: s.sarlavha, matn: matnQismlar.join("\n"), mavzu: ilova.darsNomi, sarlavhalar, rasm: rasmlar.length > 0 }) });
        const j = await r.json().catch(() => ({}));
        if (r.status === 429) { await kut(9000 * (urinish + 1)); continue; }
        if (!r.ok) throw new Error(j.detail || "AI xatosi");
        natija[i] = [`# ${s.sarlavha}`, /[.?!]$/.test(s.sarlavha) ? s.sarlavha : s.sarlavha + ".", ...rasmlar, j.qatorlar].join("\n");
        break;
      } catch (e) {
        oxirgiXato = e.message;
        if (/kalit/i.test(e.message)) break;
        await kut(1500);
      }
    }
    if (!natija[i]) { natija[i] = (asl[i] || `# ${s.sarlavha}`).trim(); xatolar++; }
    tayyor++;
    xabar(`AI tushuntirish tayyorlanmoqda: ${tayyor} / ${jami}`, 120000);
  };
  const navbat = sl.map((_, i) => i);
  await Promise.all([0, 1].map(async () => { while (navbat.length) await bitta(navbat.shift()); }));
  darsYukla(natija.join("\n\n"), ilova.darsNomi);
  $("ochishBtn").disabled = false;
  $("doskaHolat").textContent = "Tayyor";
  if (xatolar) xabar(`AI ${jami - xatolar} ta slaydni tayyorladi, ${xatolar} tasi asl matn bilan qoldi. ${oxirgiXato}`, 9000);
  else xabar("AI darsni tayyorladi. «Elektron doskani ochish»ni bosing.", 6000);
  return true;
}

/* ---- yuklash kartasi ---- */
const aslFayllarniOl = fayllarniOl;
fayllarniOl = async function (fayllar) {
  fayllar = Array.from(fayllar);
  if (!fayllar.length) return;
  const oldingi = ilova.slaydlar;
  $("doskaHolat").textContent = "Yuklanmoqda…";
  const pdf = fayllar.find(f => /\.pdf$/i.test(f.name));
  try {
    if (pdf) {
      const { matn, slaydSoni, rasmSoni } = await pdfdanMatn(pdf);
      if (darsYukla(matn, pdf.name.replace(/\.pdf$/i, "").replace(/_/g, " ")))
        xabar(`PDF o'qildi: ${slaydSoni} ta sahifa, ${rasmSoni} ta rasm.`, 6000);
    } else await aslFayllarniOl(fayllar);
  } catch (e) {
    console.error(e);
    xabar("Faylni o'qib bo'lmadi: " + e.message, 7000);
  }
  $("doskaHolat").textContent = "Tayyor";
  if (ilova.slaydlar !== oldingi) {
    const asosiy = pdf || fayllar.find(f => /\.(pptx|txt|zip)$/i.test(f.name)) || fayllar[0];
    $("faylNomi").textContent = `${asosiy.name} · ${ilova.slaydlar.length} ta slayd`;
    $("faylNomi").classList.add("bor");
    $("ochishBtn").disabled = false;
    if ($("aiTanlov").checked) await aiTushuntir();
  }
};
$("tanlashBtn").addEventListener("click", () => $("fayl").click());
$("ochishBtn").addEventListener("click", () => {
  $("doskaBolim").scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => { if (!$("overlay").hidden) $("boshlaBtn").click(); }, 450);
});
$("aiTanlov").addEventListener("change", e => {
  if (e.target.checked && !SERVER.ai) { e.target.checked = false; xabar("AI uchun avval «Sozlamalar»da Gemini kalitini kiriting.", 6000); panelOch("sozlamaPanel"); }
  else if (e.target.checked && $("faylNomi").classList.contains("bor")) aiTushuntir();
});
$("sozlamaBtn").addEventListener("click", () => { panelOch("sozlamaPanel"); serverniTekshir(); });
$("kalitSaqlaBtn").addEventListener("click", async () => {
  const kalit = $("kalitInput").value.trim(), model = $("modelTanlov").value;
  try {
    const r = await fetch("/api/sozlama", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(kalit ? { gemini_kalit: kalit, model } : { model }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.detail || "saqlanmadi");
    aiHolatniKorsat(j);
    $("kalitInput").value = "";
    xabar(j.ai ? "Saqlandi. AI tayyor." : "Saqlandi, lekin kalit kiritilmagan.", 5000);
  } catch (e) { xabar("Saqlab bo'lmadi: " + e.message, 6000); }
});

/* ================= WINDOWS DASTURI BILAN ULANISH ================= */
let tayyorBoldi;
const tayyor = new Promise(r => (tayyorBoldi = r));
async function dasturgaUlan() {
  if (ovoz.api || !(window.pywebview && window.pywebview.api && window.pywebview.api.gapir)) return;
  await ovoz.apiUlash(window.pywebview.api);
  $("ovozIzoh").textContent = "Dastur o'zbekcha neyron ovozlardan (Madina, Sardor) foydalanadi. Ovoz internet orqali yaratiladi. Sozlamalar shu kompyuterda saqlanadi.";
  ovozlarniTold();
  await tayyor;
  darsOldindan();
}
window.addEventListener("pywebviewready", dasturgaUlan);
/* Dastur .pptx faylni "Elektron doska bilan ochish" orqali ochganda chaqiriladi */
async function tashqiFayl(nom, b64) {
  await tayyor;
  const bin = atob(b64), arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  fayllarniOl([new File([arr], nom)]);
}
window.tashqiFayl = tashqiFayl;

/* ================= ISHGA TUSHIRISH ================= */
(async function () {
  fonChiz();
  olcham();
  requestAnimationFrame(chiz);
  slayderlar();
  ovozlarniTold();
  try { await Promise.race([Promise.all([document.fonts.load(`700 46px Onest`), document.fonts.load(`500 28px Onest`), document.fonts.load(`600 18px Onest`), document.fonts.load(`600 32px "STIX Two Text"`)]), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  darsYukla($("namunaMatn").textContent.trim(), "Namuna dars: Uchburchaklar");
  $("darsNomi").textContent = "AI elektron doska";
  tayyorBoldi();
  dasturgaUlan();
  serverniTekshir();
})();