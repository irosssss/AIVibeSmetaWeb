/* ============================================================
   AIVibe — генератор Lottie/Bodymovin JSON (lottie-web совместимо)
   Тёплое издательское «ателье»: терракота/олива/охра, line-art,
   trim-path draw-on + бесшовные ambient-петли.
   Следует taste из diffusionstudio/text-to-lottie (motion/design).
   Запуск:  node gen-lottie.mjs  → пишет web/lottie-assets.js
   ============================================================ */
import { writeFileSync } from "node:fs";

/* ---- бренд-палитра (RGB 0..1) ---- */
const C = {
  terra:     [0.7176, 0.3137, 0.1725, 1],
  terraSoft: [0.8510, 0.4549, 0.2941, 1],
  olive:     [0.3686, 0.4196, 0.3569, 1],
  ochre:     [0.7882, 0.5412, 0.1804, 1],
  navy:      [0.2431, 0.2902, 0.3490, 1],
  ink:       [0.1804, 0.1647, 0.1490, 1],
};

/* ---- easing-якоря (motion-taste.md) bezier = x1,y1,x2,y2 ---- */
const E = {
  linear:   { o: { x: [0.0],  y: [0.0]  }, i: { x: [1.0],  y: [1.0]  } },
  settle:   { o: { x: [0.0],  y: [0.65] }, i: { x: [0.51], y: [0.99] } }, // deep ease-out
  entrance: { o: { x: [0.20], y: [0.75] }, i: { x: [0.34], y: [0.94] } }, // fast in, soft land
  travel:   { o: { x: [1.0],  y: [0.49] }, i: { x: [0.0],  y: [0.55] } }, // S ease-in-out
  pop:      { o: { x: [0.94], y: [0.75] }, i: { x: [0.34], y: [0.94] } }, // soft overshoot
};

/* ---- helpers ---- */
const isProp = (v) => v && typeof v === "object" && "a" in v && "k" in v;
const val = (k) => ({ a: 0, k });

// kfs: [{t, s:[...], e?:'settle'(ease into next segment)}]
// ВАЖНО: lottie-web trim-модификатор корректно читает ТОЛЬКО legacy-формат
// кадров (s + e на самом кадре, оба хэндла o/i на стартовом кадре). Modern
// s-only формат у анимированного trim схлопывается в пустой путь. Поэтому
// эмитим legacy-формат — он универсально поддержан (trim, transform, opacity).
function anim(kfs) {
  const k = [];
  for (let idx = 0; idx < kfs.length; idx++) {
    const f = kfs[idx];
    if (idx < kfs.length - 1) {
      const ez = E[f.e || "settle"];
      k.push({ t: f.t, s: f.s, e: kfs[idx + 1].s, o: ez.o, i: ez.i });
    } else {
      k.push({ t: f.t, s: f.s });
    }
  }
  return { a: 1, k };
}
const P = (x) => (isProp(x) ? x : val(x)); // prop passthrough

/* shapes */
function shPath(pts, closed = false, tg = null) {
  return {
    ty: "sh", ix: 1, hd: false, nm: "p",
    ks: { a: 0, k: {
      i: pts.map((_, j) => (tg ? tg[j][0] : [0, 0])),
      o: pts.map((_, j) => (tg ? tg[j][1] : [0, 0])),
      v: pts.map((p) => [p[0], p[1]]), c: closed,
    } },
  };
}
const rect = (cx, cy, w, h, r = 0) => ({ ty: "rc", nm: "r", hd: false, d: 1, s: val([w, h]), p: val([cx, cy]), r: val(r) });
const ellipse = (cx, cy, w, h) => ({ ty: "el", nm: "e", hd: false, d: 1, s: val([w, h]), p: val([cx, cy]) });
const stroke = (color, w, o = 100) => ({ ty: "st", nm: "s", hd: false, c: P(color), o: P(o), w: P(w), lc: 2, lj: 2, ml: 4, d: [] });
const fill = (color, o = 100) => ({ ty: "fl", nm: "f", hd: false, c: P(color), o: P(o), r: 1 });
const trim = (e, s = 0, off = 0) => ({ ty: "tm", nm: "tm", hd: false, s: P(s), e: P(e), o: P(off), m: 1 });
function grTr({ p = [0, 0], a = [0, 0], s = [100, 100], r = 0, o = 100 } = {}) {
  return { ty: "tr", nm: "tr", p: P(p), a: P(a), s: P(s), r: P(r), o: P(o), sk: val(0), sa: val(0) };
}
const group = (it, nm = "g") => ({ ty: "gr", nm, hd: false, np: it.length, cix: 2, ix: 1, bm: 0, it });

/* layer factory (per-comp ind) */
function makeLayer(ctx) {
  return (shapes, { nm = "L", ip = 0, op, ks = {} } = {}) => ({
    ddd: 0, ind: ++ctx.ind, ty: 4, nm, sr: 1, ao: 0, bm: 0, st: 0,
    ip, op: op ?? ctx.op,
    ks: {
      o: P(ks.o ?? 100), r: P(ks.r ?? 0),
      p: P(ks.p ?? [0, 0, 0]), a: P(ks.a ?? [0, 0, 0]), s: P(ks.s ?? [100, 100, 100]),
    },
    shapes,
  });
}
function comp(nm, w, h, op, build, fr = 60) {
  const ctx = { ind: 0, op };
  const L = makeLayer(ctx);
  const layers = build(L, ctx);
  return { v: "5.9.0", fr, ip: 0, op, w, h, nm, ddd: 0, assets: [], layers, meta: { g: "Ledger", a: "Ledger Atelier" } };
}

/* convenience: a stroked (optionally trimmed) line-art group */
function strokeGroup(shapes, { color = C.terra, w = 2.4, o = 100, tr = {}, trimE = null } = {}) {
  const it = [...shapes];
  if (trimE != null) it.push(trim(trimE));
  it.push(stroke(color, w, o));
  it.push(grTr(tr));
  return group(it);
}
function fillGroup(shapes, { color = C.terra, o = 100, tr = {} } = {}) {
  return group([...shapes, fill(color, o), grTr(tr)]);
}

/* =====================================================================
   STEP-иконки (how-it-works). Маленькие, жирные, читаются ~28px.
   Бесшовные петли с draw-on + fade-reset (трюк: кадр0==кадрOP «пусто»).
   ===================================================================== */
function stepMeasure() {
  const S = 120, OP = 150;
  return comp("stepMeasure", S, S, OP, (L) => {
    const layers = [];
    // план комнаты + угловые «уголки»
    const room = [
      rect(60, 56, 60, 60, 5),
    ];
    const ticks = [
      shPath([[30, 36], [40, 36]]), shPath([[30, 36], [30, 46]]),
      shPath([[90, 36], [80, 36]]), shPath([[90, 36], [90, 46]]),
      shPath([[30, 76], [40, 76]]), shPath([[30, 76], [30, 66]]),
      shPath([[90, 76], [80, 76]]), shPath([[90, 76], [90, 66]]),
    ];
    const draw = (s) => anim([{ t: 0, s: [0], e: "settle" }, { t: 34, s: [100], e: "settle" }, { t: 120, s: [100], e: "settle" }, { t: OP, s: [100] }]);
    const reset = anim([{ t: 0, s: [100], e: "settle" }, { t: 118, s: [100], e: "settle" }, { t: OP, s: [0] }]);
    layers.push(L([strokeGroup(room,  { color: C.terra, w: 3.2, trimE: draw() })], { nm: "room", ks: { o: reset } }));
    layers.push(L([strokeGroup(ticks, { color: C.olive, w: 2.6, trimE: anim([{ t: 10, s: [0], e: "settle" }, { t: 44, s: [100] }]) })], { nm: "ticks", ks: { o: reset } }));
    // размерная линия снизу + бегущий калипер
    const dim = [shPath([[30, 98], [90, 98]]), shPath([[30, 92], [30, 104]]), shPath([[90, 92], [90, 104]])];
    layers.push(L([strokeGroup(dim, { color: C.terra, w: 2.6, trimE: anim([{ t: 36, s: [0], e: "settle" }, { t: 66, s: [100] }]) })], { nm: "dim", ks: { o: reset } }));
    layers.push(L([fillGroup([ellipse(0, 98, 8, 8)], { color: C.terra })], {
      nm: "caliper",
      ks: {
        o: anim([{ t: 56, s: [0], e: "settle" }, { t: 66, s: [100], e: "settle" }, { t: 118, s: [100], e: "settle" }, { t: OP, s: [0] }]),
        p: anim([{ t: 56, s: [30, 0], e: "travel" }, { t: 110, s: [90, 0], e: "travel" }, { t: OP, s: [30, 0] }]),
      },
    }));
    return layers;
  });
}

function stepAI() {
  const S = 120, OP = 120;
  return comp("stepAI", S, S, OP, (L) => {
    const layers = [];
    const cx = 60, cy = 58;
    // 4-лучевая искра (чёткая звезда-«спарк»), пульс масштаба — бесшовно
    const spark = [shPath([
      [cx, cy - 32], [cx + 8, cy - 8], [cx + 32, cy], [cx + 8, cy + 8],
      [cx, cy + 32], [cx - 8, cy + 8], [cx - 32, cy], [cx - 8, cy - 8],
    ], true)];
    const pulse = anim([
      { t: 0, s: [86, 86], e: "travel" }, { t: 50, s: [108, 108], e: "travel" },
      { t: 100, s: [86, 86], e: "travel" }, { t: OP, s: [86, 86] },
    ]);
    layers.push(L([fillGroup(spark, { color: C.terra })], { nm: "spark", ks: { p: [cx, cy, 0], a: [cx, cy, 0], s: pulse } }));
    // орбитальная точка (олива) — линейный замкнутый круг
    const orb = (ph) => anim([
      { t: 0, s: [cx + 40 * Math.cos(ph), cy + 40 * Math.sin(ph), 0], e: "linear" },
      { t: 40, s: [cx + 40 * Math.cos(ph + 2.094), cy + 40 * Math.sin(ph + 2.094), 0], e: "linear" },
      { t: 80, s: [cx + 40 * Math.cos(ph + 4.188), cy + 40 * Math.sin(ph + 4.188), 0], e: "linear" },
      { t: OP, s: [cx + 40 * Math.cos(ph + 6.283), cy + 40 * Math.sin(ph + 6.283), 0] },
    ]);
    layers.push(L([fillGroup([ellipse(0, 0, 9, 9)], { color: C.olive })], { nm: "orbit", ks: { p: orb(-1.2) } }));
    layers.push(L([fillGroup([ellipse(0, 0, 6, 6)], { color: C.ochre })], { nm: "orbit2", ks: { p: orb(2.0), o: 70 } }));
    return layers;
  });
}

function stepSpec() {
  const S = 120, OP = 150;
  return comp("stepSpec", S, S, OP, (L) => {
    const layers = [];
    const reset = anim([{ t: 0, s: [100], e: "settle" }, { t: 118, s: [100], e: "settle" }, { t: OP, s: [0] }]);
    // лист сметы
    layers.push(L([strokeGroup([rect(60, 60, 64, 80, 6)], { color: C.terra, w: 3.0, trimE: anim([{ t: 0, s: [0], e: "settle" }, { t: 30, s: [100] }]) })], { nm: "sheet", ks: { o: reset } }));
    // 3 строки сметы — заполняются по очереди
    const rows = [40, 60, 80];
    rows.forEach((y, i) => {
      const start = 30 + i * 18;
      layers.push(L([strokeGroup([shPath([[36, y], [70, y]])], { color: C.olive, w: 3.2, trimE: anim([{ t: start, s: [0], e: "settle" }, { t: start + 16, s: [100] }]) })], { nm: "row" + i, ks: { o: reset } }));
      // галочка/чек справа от строки
      layers.push(L([strokeGroup([shPath([[78, y - 3], [82, y + 1], [88, y - 6]])], { color: C.olive, w: 2.6 })], {
        nm: "chk" + i,
        ks: { o: anim([{ t: start + 12, s: [0], e: "pop" }, { t: start + 26, s: [100], e: "settle" }, { t: 118, s: [100], e: "settle" }, { t: OP, s: [0] }]) },
      }));
    });
    // итоговая черта (терракота)
    layers.push(L([strokeGroup([shPath([[36, 96], [84, 96]])], { color: C.terra, w: 4, trimE: anim([{ t: 86, s: [0], e: "entrance" }, { t: 104, s: [100] }]) })], { nm: "total", ks: { o: reset } }));
    return layers;
  });
}

/* шаг 04 «PDF клиенту»: лист документа + бумажный самолётик улетает
   по дуге вправо-вверх (то, что смета УХОДИТ клиенту — глагол шага) */
function stepSend() {
  const S = 120, OP = 150;
  return comp("stepSend", S, S, OP, (L) => {
    const layers = [];
    const reset = anim([{ t: 0, s: [100], e: "settle" }, { t: 118, s: [100], e: "settle" }, { t: OP, s: [0] }]);
    // лист (смета) слева
    layers.push(L([strokeGroup([rect(44, 62, 40, 56, 5)], { color: C.terra, w: 3.0, trimE: anim([{ t: 0, s: [0], e: "settle" }, { t: 28, s: [100] }]) })], { nm: "doc", ks: { o: reset } }));
    // 2 строки на листе
    [50, 64].forEach((y, i) => {
      layers.push(L([strokeGroup([shPath([[32, y], [56, y]])], { color: C.olive, w: 2.8, trimE: anim([{ t: 18 + i * 12, s: [0], e: "settle" }, { t: 34 + i * 12, s: [100] }]) })], { nm: "ln" + i, ks: { o: reset } }));
    });
    // пунктирная траектория к адресату
    layers.push(L([strokeGroup([shPath([[58, 54], [78, 40], [96, 32]], false, [[[0, 0], [8, -4]], [[-6, 5], [6, -4]], [[-7, 2], [0, 0]]])], { color: C.ochre, w: 2.2, o: 70, trimE: anim([{ t: 46, s: [0], e: "settle" }, { t: 76, s: [100], e: "settle" }, { t: 100, s: [100], e: "settle" }, { t: OP, s: [100] }]) })], {
      nm: "trail",
      ks: { o: anim([{ t: 46, s: [0], e: "settle" }, { t: 56, s: [70], e: "settle" }, { t: 112, s: [70], e: "settle" }, { t: 140, s: [0] }]) },
    }));
    // самолётик (заливка терракота) летит по траектории с лёгким креном
    const plane = [shPath([[0, -5], [16, 0], [0, 5], [4, 0]], true)];
    layers.push(L([fillGroup(plane, { color: C.terra })], {
      nm: "plane",
      ks: {
        o: anim([{ t: 40, s: [0], e: "pop" }, { t: 50, s: [100], e: "settle" }, { t: 104, s: [100], e: "settle" }, { t: 122, s: [0] }]),
        p: anim([{ t: 40, s: [56, 56, 0], e: "travel" }, { t: 104, s: [98, 30, 0], e: "settle" }, { t: OP, s: [98, 30, 0] }]),
        r: anim([{ t: 40, s: [-6], e: "travel" }, { t: 104, s: [-24], e: "settle" }, { t: OP, s: [-24] }]),
      },
    }));
    return layers;
  });
}

/* шаг 05 «Согласование»: реплика-облако рисуется, внутри поп-галочка
   «согласовано», снизу — ответная мини-реплика (диалог без созвонов) */
function stepApprove() {
  const S = 120, OP = 150;
  return comp("stepApprove", S, S, OP, (L) => {
    const layers = [];
    const reset = anim([{ t: 0, s: [100], e: "settle" }, { t: 118, s: [100], e: "settle" }, { t: OP, s: [0] }]);
    // облако реплики с хвостиком
    const bubble = [
      rect(58, 50, 58, 42, 12),
      shPath([[40, 70], [34, 82], [52, 71]]),
    ];
    layers.push(L([strokeGroup(bubble, { color: C.terra, w: 3.0, trimE: anim([{ t: 0, s: [0], e: "settle" }, { t: 36, s: [100] }]) })], { nm: "bubble", ks: { o: reset } }));
    // галочка внутри — поп с overshoot (момент «клиент согласовал»)
    layers.push(L([strokeGroup([shPath([[46, 50], [55, 59], [72, 41]])], { color: C.olive, w: 3.6 })], {
      nm: "check",
      ks: {
        o: anim([{ t: 40, s: [0], e: "pop" }, { t: 54, s: [100], e: "settle" }, { t: 118, s: [100], e: "settle" }, { t: OP, s: [0] }]),
        s: anim([{ t: 40, s: [60, 60, 100], e: "pop" }, { t: 56, s: [100, 100, 100], e: "settle" }, { t: OP, s: [100, 100, 100] }]),
        a: [58, 50, 0], p: [58, 50, 0],
      },
    }));
    // ответная мини-реплика (охра) появляется справа-снизу
    layers.push(L([strokeGroup([rect(88, 88, 28, 20, 8)], { color: C.ochre, w: 2.6 })], {
      nm: "reply",
      ks: { o: anim([{ t: 66, s: [0], e: "pop" }, { t: 80, s: [100], e: "settle" }, { t: 118, s: [100], e: "settle" }, { t: OP, s: [0] }]) },
    }));
    // три точки набора в мини-реплике
    layers.push(L([fillGroup([ellipse(80, 88, 4, 4), ellipse(88, 88, 4, 4), ellipse(96, 88, 4, 4)], { color: C.ochre })], {
      nm: "dots",
      ks: { o: anim([{ t: 78, s: [0], e: "settle" }, { t: 92, s: [80], e: "settle" }, { t: 118, s: [80], e: "settle" }, { t: OP, s: [0] }]) },
    }));
    return layers;
  });
}

/* шаг 06 «Закупка · сроки»: грузовик line-art, колёса, дорожные штрихи
   бегут навстречу — доставка В ПУТИ (движение без смещения сцены) */
function stepProcure() {
  const S = 120, OP = 150;
  return comp("stepProcure", S, S, OP, (L) => {
    const layers = [];
    const reset = anim([{ t: 0, s: [100], e: "settle" }, { t: 118, s: [100], e: "settle" }, { t: OP, s: [0] }]);
    // кузов + кабина (одна draw-on группа)
    const body = [
      rect(46, 58, 44, 32, 3),
      shPath([[68, 50], [84, 50], [92, 60], [92, 74], [68, 74]]),
    ];
    layers.push(L([strokeGroup(body, { color: C.terra, w: 3.0, trimE: anim([{ t: 0, s: [0], e: "settle" }, { t: 36, s: [100] }]) })], { nm: "truck", ks: { o: reset } }));
    // колёса — поп после кузова
    const wheels = [ellipse(38, 78, 13, 13), ellipse(80, 78, 13, 13)];
    layers.push(L([strokeGroup(wheels, { color: C.olive, w: 3.0 })], {
      nm: "wheels",
      ks: { o: anim([{ t: 30, s: [0], e: "pop" }, { t: 44, s: [100], e: "settle" }, { t: 118, s: [100], e: "settle" }, { t: OP, s: [0] }]) },
    }));
    // дорожные штрихи бегут влево (петля движения) — охра, полупрозрачные
    [0, 1, 2].forEach((i) => {
      layers.push(L([strokeGroup([shPath([[0, 94], [14, 94]])], { color: C.ochre, w: 2.6, o: 70 })], {
        nm: "dash" + i,
        ks: {
          o: anim([{ t: 44, s: [0], e: "settle" }, { t: 54, s: [70], e: "settle" }, { t: 112, s: [70], e: "settle" }, { t: 134, s: [0] }]),
          p: anim([{ t: 44 + i * 8, s: [96 - i * 34, 0, 0], e: "linear" }, { t: 116 + i * 8, s: [16 - i * 34, 0, 0] }]),
        },
      }));
    });
    return layers;
  });
}

/* шаг 07 «Сдача проекта»: пакет документов опускается в архивный лоток,
   лоток закрывается галочкой — проект сдан, история сохранена */
function stepHandoff() {
  const S = 120, OP = 150;
  return comp("stepHandoff", S, S, OP, (L) => {
    const layers = [];
    const reset = anim([{ t: 0, s: [100], e: "settle" }, { t: 118, s: [100], e: "settle" }, { t: OP, s: [0] }]);
    // архивный лоток (открытая коробка)
    const tray = [shPath([[30, 68], [30, 92], [90, 92], [90, 68]]), shPath([[24, 68], [96, 68]])];
    layers.push(L([strokeGroup(tray, { color: C.terra, w: 3.0, trimE: anim([{ t: 0, s: [0], e: "settle" }, { t: 30, s: [100] }]) })], { nm: "tray", ks: { o: reset } }));
    // документ (олива) опускается в лоток и «утапливается»
    layers.push(L([strokeGroup([rect(60, 0, 30, 36, 4), shPath([[50, -8], [70, -8]]), shPath([[50, 0], [70, 0]])], { color: C.olive, w: 2.8 })], {
      nm: "doc",
      ks: {
        o: anim([{ t: 26, s: [0], e: "settle" }, { t: 38, s: [100], e: "settle" }, { t: 84, s: [100], e: "settle" }, { t: 100, s: [0] }]),
        p: anim([{ t: 26, s: [0, 34, 0], e: "travel" }, { t: 84, s: [0, 66, 0], e: "settle" }, { t: OP, s: [0, 66, 0] }]),
      },
    }));
    // галочка сдачи — поп на лотке после «утапливания» документа
    layers.push(L([strokeGroup([shPath([[50, 80], [58, 87], [72, 71]])], { color: C.terra, w: 3.6 })], {
      nm: "done",
      ks: {
        o: anim([{ t: 88, s: [0], e: "pop" }, { t: 102, s: [100], e: "settle" }, { t: 118, s: [100], e: "settle" }, { t: OP, s: [0] }]),
        s: anim([{ t: 88, s: [60, 60, 100], e: "pop" }, { t: 104, s: [100, 100, 100], e: "settle" }, { t: OP, s: [100, 100, 100] }]),
        a: [60, 80, 0], p: [60, 80, 0],
      },
    }));
    return layers;
  });
}

/* =====================================================================
   LOADER — «AI собирает смету». Скан сверху-вниз заполняет строки,
   итог-бар заполняется последним. Бесшовная петля (fade-reset).
   ===================================================================== */
function loader() {
  const W = 260, H = 170, OP = 132;
  return comp("loader", W, H, OP, (L) => {
    const layers = [];
    const reset = anim([{ t: 0, s: [100], e: "settle" }, { t: 108, s: [100], e: "settle" }, { t: OP, s: [0] }]);
    // карточка сметы
    layers.push(L([strokeGroup([rect(130, 85, 200, 128, 14)], { color: C.terra, w: 2.6, trimE: anim([{ t: 0, s: [0], e: "settle" }, { t: 26, s: [100] }]) })], { nm: "card", ks: { o: reset } }));
    // шапка
    layers.push(L([strokeGroup([shPath([[48, 44], [120, 44]])], { color: C.terra, w: 4, trimE: anim([{ t: 14, s: [0], e: "settle" }, { t: 30, s: [100] }]) })], { nm: "head", ks: { o: reset } }));
    // 4 строки — заполняются по очереди (phase offset)
    const ys = [70, 92, 114];
    ys.forEach((y, i) => {
      const start = 30 + i * 16;
      layers.push(L([strokeGroup([shPath([[48, y], [150, y]])], { color: C.olive, w: 3.4, trimE: anim([{ t: start, s: [0], e: "settle" }, { t: start + 18, s: [100] }]) })], { nm: "ln" + i, ks: { o: reset } }));
      // прайс-чип справа
      layers.push(L([strokeGroup([rect(186, y, 36, 12, 6)], { color: C.ochre, w: 2.4 })], {
        nm: "pr" + i,
        ks: { o: anim([{ t: start + 14, s: [0], e: "pop" }, { t: start + 28, s: [100], e: "settle" }, { t: 108, s: [100], e: "settle" }, { t: OP, s: [0] }]) },
      }));
    });
    // итог-бар (жирная терракотовая черта, заполняется последней)
    layers.push(L([strokeGroup([shPath([[48, 140], [212, 140]])], { color: C.terra, w: 6, trimE: anim([{ t: 84, s: [0], e: "entrance" }, { t: 108, s: [100] }]) })], { nm: "total", ks: { o: reset } }));
    // скан сверху-вниз
    layers.push(L([strokeGroup([shPath([[40, 0], [220, 0]])], { color: C.terra, w: 2.2, o: 50 })], {
      nm: "scan",
      ks: {
        o: anim([{ t: 24, s: [0], e: "settle" }, { t: 34, s: [60], e: "settle" }, { t: 96, s: [60], e: "settle" }, { t: 110, s: [0] }]),
        p: anim([{ t: 24, s: [0, 30, 0], e: "travel" }, { t: 100, s: [0, 150, 0], e: "travel" }, { t: OP, s: [0, 30, 0] }]),
      },
    }));
    return layers;
  });
}

/* ---- сборка ---- */
const anims = {
  stepMeasure: stepMeasure(),
  stepAI: stepAI(),
  stepSpec: stepSpec(),
  stepSend: stepSend(),
  stepApprove: stepApprove(),
  stepProcure: stepProcure(),
  stepHandoff: stepHandoff(),
  loader: loader(),
};

// мета для плеера: интро-сегмент (draw-on один раз, потом петля ambient)
const meta = {
  stepMeasure: { loop: true },
  stepAI: { loop: true },
  stepSpec: { loop: true },
  stepSend: { loop: true },
  stepApprove: { loop: true },
  stepProcure: { loop: true },
  stepHandoff: { loop: true },
  loader: { loop: true },
};

// глобалы Ledger* (ребренд Фаза 2, 12.07) — плеер ui.jsx читает window.LedgerLottie;
// старое имя AIVibeLottie здесь ломало бы приложение при регенерации
const out =
  "/* AUTO-GENERATED by scripts/gen-lottie.mjs — НЕ править руками, правь генератор и перезапусти `node scripts/gen-lottie.mjs`. */\n" +
  "window.LedgerLottie = " + JSON.stringify(anims) + ";\n" +
  "window.LedgerLottieMeta = " + JSON.stringify(meta) + ";\n";

// по умолчанию пишем рядом с репо: scripts/ → ../web/lottie-assets.js
const target = process.argv[2] || new URL("../web/lottie-assets.js", import.meta.url);
writeFileSync(target, out);
console.log("ok:", Object.keys(anims).join(", "), "→", String(target), "(bytes:", out.length, ")");
