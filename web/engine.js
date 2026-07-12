/* ============================================================
   Design Ledger — детерминированный движок сметы (эргономика + бюджет)
   ------------------------------------------------------------
   Наш ров: чистая арифметика, без GPU и без секретов. Сейчас крутится
   в браузере; ТОТ ЖЕ код переносится в Node (Yandex Cloud Function)
   без изменений — экспортируется в window.LedgerEngine.

   Нормы — зеркало DesignNorms.swift (в продакшене единый источник —
   там; здесь дублируем как плейсхолдер до подключения бэкенда).
   ============================================================ */
(function () {
  /* нормы эргономики, см */
  const NORMS = {
    walkwayMin: 70,      // магистральный проход
    walkwayComfort: 90,  // комфортный проход
    seatToCoffee: { min: 30, max: 45 }, // диван ↔ журнальный стол
    tvComfort: { min: 150, max: 350 },  // диван ↔ ТВ-зона (комфорт просмотра)
    doorSwing: 90,       // запас на открывание входной двери
    occupancyWarn: 0.6,  // доля площади под мебелью
  };
  /* что мешает проходу (ковёр — не мешает) */
  const BLOCKING = new Set(["seat", "media", "table", "accent"]);

  /* прямоугольники плана (% контейнера) → см, по реальным габаритам комнаты */
  function toCm(plan, room) {
    const W = room.w * 100, L = room.l * 100;
    return plan.filter((b) => BLOCKING.has(b.k)).map((b) => ({
      k: b.k, label: b.label,
      x0: (b.x / 100) * W, x1: ((b.x + b.w) / 100) * W,
      y0: (b.y / 100) * L, y1: ((b.y + b.h) / 100) * L,
      area: ((b.w / 100) * W) * ((b.h / 100) * L),
    }));
  }

  /* «коридор» между двумя прямоугольниками: пересекаются по одной оси →
     расстояние по другой = ширина прохода; по обеим → коллизия (налезают) */
  function corridor(a, b) {
    const overlapX = a.x0 < b.x1 && b.x0 < a.x1;
    const overlapY = a.y0 < b.y1 && b.y0 < a.y1;
    if (overlapX && overlapY) return { gap: 0, collision: true };
    if (overlapX) return { gap: Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1), collision: false };
    if (overlapY) return { gap: Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1), collision: false };
    return { gap: Infinity, collision: false }; // по диагонали — не коридор
  }

  /* минимальный зазор край-в-край (для диван ↔ стол) */
  function edgeGap(a, b) {
    const dx = Math.max(0, Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1));
    const dy = Math.max(0, Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1));
    return Math.round(Math.hypot(dx, dy));
  }

  /* ПРОВЕРКА ЭРГОНОМИКИ выбранной раскладки → список выводов.
     norms — необязательный override поверх канона NORMS (двухслойная модель:
     канон Design Ledger → мой канон → проект). norms.enabled[key]===false выключает правило.
     Без аргумента norms поведение идентично прежнему (обратная совместимость). */
  function checkErgonomics(layout, room, norms) {
    const NN = Object.assign({}, NORMS, norms || {});
    const EN = (norms && norms.enabled) || {};
    const on = (k) => EN[k] !== false;

    const rects = toCm(layout.plan, room);
    const roomArea = room.w * 100 * room.l * 100;
    const findings = [];

    // 1) коллизии + минимальный проход
    let minPass = Infinity, collision = null;
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i], b = rects[j];
        const c = corridor(a, b);
        if (c.collision) { collision = [a.label, b.label]; continue; }
        // пару диван↔журнальный стол ведёт отдельное правило — не считаем её «проходом»
        if ((a.k === "seat" && b.k === "table") || (a.k === "table" && b.k === "seat")) continue;
        if (c.gap < minPass) minPass = c.gap;
      }
    }
    if (collision) findings.push({ kind: "warn", text: `Пересекаются «${collision[0]}» и «${collision[1]}» — предметы налезают друг на друга, раздвиньте расстановку.` });
    if (on("walkwayMin") && minPass !== Infinity) {
      const p = Math.round(minPass);
      // сначала жёсткий минимум (пользователь может задать min > comfort), затем «комфорт»
      if (minPass < NN.walkwayMin) findings.push({ kind: "warn", text: `Узкий проход ${p} см — норма ≥ ${NN.walkwayMin} см, сместите мебель.` });
      else if (on("walkwayComfort") && minPass >= NN.walkwayComfort) findings.push({ kind: "plus", text: `Главный проход ${p} см — свободно (комфорт ≥ ${NN.walkwayComfort} см).` });
      else findings.push({ kind: "plus", text: `Проход ${p} см — в норме (минимум ${NN.walkwayMin} см).` });
    }

    // 2) диван ↔ журнальный стол
    const seat = rects.find((r) => r.k === "seat"), table = rects.find((r) => r.k === "table");
    if (on("seatToCoffee") && seat && table) {
      const g = edgeGap(seat, table), N = NN.seatToCoffee;
      if (g < N.min) findings.push({ kind: "warn", text: `Стол вплотную к дивану (${g} см) — комфортно ${N.min}–${N.max} см.` });
      else if (g > N.max + 15) findings.push({ kind: "warn", text: `Стол далеко от дивана (${g} см) — тянуться неудобно, норма ${N.min}–${N.max} см.` });
      else findings.push({ kind: "plus", text: `Диван↔стол ${g} см — удобная дистанция (${N.min}–${N.max} см).` });
    }

    // 3) плотность расстановки
    if (on("occupancyWarn")) {
      const occ = rects.reduce((s, r) => s + r.area, 0) / roomArea;
      const pc = Math.round(occ * 100);
      if (occ > NN.occupancyWarn) findings.push({ kind: "warn", text: `Мебель занимает ${pc}% пола — тесновато, оставьте воздух (норма < ${Math.round(NN.occupancyWarn * 100)}%).` });
      else findings.push({ kind: "plus", text: `Мебель занимает ${pc}% пола — комната дышит.` });
    }

    // 4) зона открывания входной двери (если известна позиция двери)
    if (on("doorSwing") && room.door) {
      const W = room.w * 100, L = room.l * 100, dW = NN.doorSwing, sw = NN.doorSwing;
      const dz = room.door.indexOf("right") >= 0
        ? { x0: W - dW, x1: W, y0: L - sw, y1: L }
        : { x0: 0, x1: dW, y0: L - sw, y1: L };
      const blocked = rects.find((r) => r.x0 < dz.x1 && dz.x0 < r.x1 && r.y0 < dz.y1 && dz.y0 < r.y1);
      if (blocked) findings.push({ kind: "warn", text: `«${blocked.label}» в зоне открывания двери — дверь упрётся, нужен запас ~${sw} см.` });
      else findings.push({ kind: "plus", text: `Зона открывания двери свободна (запас ~${sw} см).` });
    }

    // 5) дистанция «диван ↔ ТВ-зона» (медиа-стена)
    const media = rects.find((r) => r.k === "media");
    if (on("tvComfort") && media && seat) {
      const g = edgeGap(media, seat), T = NN.tvComfort;
      if (g < T.min - 30) findings.push({ kind: "warn", text: `ТВ-зона близко к дивану (${g} см) — глаза устают, комфортно от ${T.min} см.` });
      else if (g > T.max + 100) findings.push({ kind: "warn", text: `ТВ-зона далеко от дивана (${g} см) — мелко видно, оптимум ${T.min}–${T.max} см.` });
      else findings.push({ kind: "plus", text: `Диван↔ТВ ${g} см — комфортная дистанция просмотра (${T.min}–${T.max} см).` });
    }

    const warns = findings.filter((f) => f.kind === "warn").length;
    const pc = Math.round((rects.reduce((s, r) => s + r.area, 0) / roomArea) * 100);
    return { findings, ok: warns === 0, warns, passed: findings.length - warns, occupancy: pc };
  }

  /* БЮДЖЕТ-ОПТИМИЗАТОР: уложить максимум качества в бюджет (жадно по value/₽).
     Старт — самый дешёвый в каждой категории, затем апгрейды с лучшим
     соотношением «прирост качества / доплата», пока хватает бюджета. */
  function optimizeSpec(catalog, budget, factor) {
    factor = factor || 1;
    const adj = (p) => Math.round((p * factor) / 100) * 100;
    const sel = catalog.map((c) => [...c.items].sort((a, b) => a.price - b.price)[0]);
    let total = sel.reduce((s, it) => s + adj(it.price), 0);

    /* жадный подбор с пересчётом на каждой итерации: ratio считается от
       ТЕКУЩЕГО выбора категории, а не от стартового эконома — иначе после
       первого апгрейда список ratio устаревает и ключевой предмет застревает
       в экономе (баг optimize-stale-ratio, регресс-тест tests/engine.test.js) */
    for (;;) {
      let best = null;
      catalog.forEach((c, ci) => {
        const curPrice = adj(sel[ci].price), curRating = sel[ci].rating;
        c.items.forEach((it) => {
          const delta = adj(it.price) - curPrice;
          const gain = it.rating - curRating;
          if (delta <= 0 || gain <= 0) return;       // только дороже текущего и с реальным приростом
          if (total + delta > budget) return;        // влезает в бюджет
          const ratio = gain / delta;                // чистое качество за рубль (от текущего выбора)
          if (!best || ratio > best.ratio) best = { ci, it, delta, ratio };
        });
      });
      if (!best) break;
      sel[best.ci] = best.it; total += best.delta;
    }

    const selection = {};
    catalog.forEach((c, ci) => { selection[ci] = sel[ci].id; });
    return { selection, total, fits: total <= budget, leftover: budget - total };
  }

  window.LedgerEngine = { NORMS, checkErgonomics, optimizeSpec };
})();
