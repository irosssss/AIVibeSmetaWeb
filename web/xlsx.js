/* ============================================================
   AIVibe — выгрузка сметы-комплектации в Excel (SheetJS, client-side)
   Экспортирует window.AIVibeXLSX.exportRoomSpec(...)
   Структура книги:
     • «Свод»        — итоги по помещениям и по разделам + бюджет;
     • «Все позиции» — плоская мастер-таблица (фильтр/сводная по любой оси);
     • лист на каждую комнату — детально, с итогом по комнате.
   Везде две цены: себестоимость (фабрика) и цена клиента (с наценкой).
   Бэклог §9 docs/SMETA_BENCHMARK_2026-06.md — вход в рабочий процесс дизайнера.
   ============================================================ */
(function () {
  const MONEY = '#,##0" ₽"';            // формат суммы (разделитель тысяч — по локали Excel)

  // SheetJS запрещает в имени листа символы \ / ? * [ ] : и длину > 31
  const cleanName = (s) => String(s).replace(/[\\/?*[\]:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 31) || "Лист";

  // ширины колонок (в символах)
  const setCols = (ws, widths) => { ws["!cols"] = widths.map((w) => ({ wch: w })); };

  // денежный формат на перечисленные ячейки [r,c]
  const fmtMoney = (ws, cells) => cells.forEach(([r, c]) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    if (ws[ref] && typeof ws[ref].v === "number") ws[ref].z = MONEY;
  });

  // денежный формат на колонки cols в диапазоне строк [r0..r1] (нечисловые пропускаются)
  const fmtMoneyCols = (ws, cols, r0, r1) => {
    const cells = [];
    for (let r = r0; r <= r1; r++) for (const c of cols) cells.push([r, c]);
    fmtMoney(ws, cells);
  };

  // mode: "work" (по умолчанию) — две цены (себестоимость + клиент) и бюджет;
  //       "client" — только цена клиента, без себестоимости/наценки/бюджета.
  // catMarkupPct: {раздел: %} — свои наценки поверх базовой markupPct (как на экране сметы).
  function exportRoomSpec({ project, area, rooms, grand, markupPct, catMarkupPct, clientTotal, budget, mode }) {
    if (!window.XLSX) { (window.toast ? toast("Excel-библиотека ещё загружается — попробуйте через секунду.", "info") : 0); return false; }
    rooms = rooms || [];
    const clientMode = mode === "client";
    const catOf = (it) => it.cat || "Прочее";
    const pctOf = (it) => (catMarkupPct && catMarkupPct[catOf(it)] != null ? catMarkupPct[catOf(it)] : (markupPct || 0));
    const hasCatMk = !!catMarkupPct && Object.keys(catMarkupPct).length > 0;
    const lineCost = (it) => it.price * (it.qty || 1);
    const unitClient = (it) => Math.round(it.price * (1 + pctOf(it) / 100));        // округляется цена/шт,
    const lineClient = (it) => unitClient(it) * (it.qty || 1);                      // сумма = цена × кол-во — колонки бьются арифметически
    const roomCost = (r) => r.items.reduce((s, it) => s + lineCost(it), 0);
    const roomClient = (r) => r.items.reduce((s, it) => s + lineClient(it), 0);
    const roomLabel = (r) => r.name + (r.area ? "  ·  " + r.area + " м²" : "");

    const wb = XLSX.utils.book_new();
    const used = new Set();
    const uniqueSheet = (s) => {
      let name = cleanName(s), i = 2;
      while (used.has(name)) { const suf = " (" + i++ + ")"; name = cleanName(s).slice(0, 31 - suf.length) + suf; }
      used.add(name);
      return name;
    };

    /* ---------- Лист «Свод» ---------- */
    const over = grand > budget;
    const svod = [], mc = [];
    const push = (row) => { svod.push(row); return svod.length - 1; };

    push(["AIVibe — смета-комплектация"]);
    push([project || "Проект", "", area ? area + " м²" : ""]);
    push([]);
    if (!clientMode) { push([hasCatMk ? "Наценка дизайнера (базовая), %" : "Наценка дизайнера, %", markupPct || 0]); push([]); }   // процент, не деньги

    push(clientMode ? ["По помещениям", "Сумма"] : ["По помещениям", "Себестоимость", "Для клиента"]);
    rooms.forEach((r) => {
      if (clientMode) { const ri = push([roomLabel(r), roomClient(r)]); mc.push([ri, 1]); }
      else { const ri = push([roomLabel(r), roomCost(r), roomClient(r)]); mc.push([ri, 1], [ri, 2]); }
    });
    if (clientMode) { const ri = push(["Итого", clientTotal]); mc.push([ri, 1]); }
    else { const ri = push(["Итого", grand, clientTotal]); mc.push([ri, 1], [ri, 2]); }
    push([]);
    // по разделам (закупочным категориям) — по убыванию суммы; в рабочем режиме виден и процент наценки раздела
    const byCat = {}, byCatCli = {};
    rooms.forEach((r) => r.items.forEach((it) => { const k = catOf(it); byCat[k] = (byCat[k] || 0) + lineCost(it); byCatCli[k] = (byCatCli[k] || 0) + lineClient(it); }));
    push(clientMode ? ["По разделам", "Сумма"] : ["По разделам", "Себестоимость", "Для клиента", "Наценка, %"]);
    Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a]).forEach((cat) => {
      if (clientMode) { const ri = push([cat, byCatCli[cat]]); mc.push([ri, 1]); }
      else {
        const pct = catMarkupPct && catMarkupPct[cat] != null ? catMarkupPct[cat] : (markupPct || 0);
        const ri = push([cat, byCat[cat], byCatCli[cat], pct]); mc.push([ri, 1], [ri, 2]);   // процент — не деньги
      }
    });
    if (!clientMode) {   // бюджет/себестоимость — внутренняя кухня, в клиентскую версию не выгружаем
      push([]);
      { const ri = push(["Бюджет проекта", budget]); mc.push([ri, 1]); }
      { const ri = push([over ? "Превышение бюджета" : "Остаток бюджета", Math.abs(budget - grand)]); mc.push([ri, 1]); }
    }

    const wsS = XLSX.utils.aoa_to_sheet(svod);
    setCols(wsS, clientMode ? [42, 16] : [42, 16, 16, 11]);
    fmtMoney(wsS, mc);
    XLSX.utils.book_append_sheet(wb, wsS, uniqueSheet("Свод"));

    /* ---------- Лист «Все позиции» (плоская мастер-таблица) ---------- */
    const all = [clientMode
      ? ["№", "Помещение", "Раздел", "Наименование", "Кол-во", "Цена, ₽", "Сумма, ₽"]
      : ["№", "Помещение", "Раздел", "Наименование", "Кол-во", "Цена, ₽", "Сумма, ₽", "Цена клиенту, ₽", "Сумма клиенту, ₽"]];
    let n = 0;
    rooms.forEach((r) => r.items.forEach((it) => {
      const lc = lineCost(it);
      all.push(clientMode
        ? [++n, r.name, catOf(it), it.title, it.qty || 1, unitClient(it), lineClient(it)]
        : [++n, r.name, catOf(it), it.title, it.qty || 1, it.price, lc, unitClient(it), lineClient(it)]);
    }));
    all.push(clientMode ? ["", "", "", "Итого", "", "", clientTotal] : ["", "", "", "Итого", "", "", grand, "", clientTotal]);
    const wsA = XLSX.utils.aoa_to_sheet(all);
    setCols(wsA, clientMode ? [5, 18, 16, 46, 7, 15, 16] : [5, 18, 16, 46, 7, 13, 14, 15, 16]);
    fmtMoneyCols(wsA, clientMode ? [5, 6] : [5, 6, 7, 8], 1, all.length - 1);
    wsA["!autofilter"] = { ref: clientMode ? "A1:G1" : "A1:I1" };   // фильтр по шапке — дизайнер крутит сводную как хочет
    XLSX.utils.book_append_sheet(wb, wsA, uniqueSheet("Все позиции"));

    /* ---------- Лист на каждую комнату ---------- */
    const rHead = clientMode
      ? ["№", "Раздел", "Наименование", "Кол-во", "Цена, ₽", "Сумма, ₽"]
      : ["№", "Раздел", "Наименование", "Кол-во", "Цена, ₽", "Сумма, ₽", "Цена клиенту, ₽", "Сумма клиенту, ₽"];
    rooms.forEach((r) => {
      const rows = [[roomLabel(r)], [], rHead];
      let m = 0;
      r.items.forEach((it) => {
        const lc = lineCost(it);
        rows.push(clientMode
          ? [++m, catOf(it), it.title, it.qty || 1, unitClient(it), lineClient(it)]
          : [++m, catOf(it), it.title, it.qty || 1, it.price, lc, unitClient(it), lineClient(it)]);
      });
      rows.push(clientMode ? ["", "", "Итого по комнате", "", "", roomClient(r)] : ["", "", "Итого по комнате", "", "", roomCost(r), "", roomClient(r)]);
      const ws = XLSX.utils.aoa_to_sheet(rows);
      setCols(ws, clientMode ? [5, 16, 46, 7, 15, 16] : [5, 16, 46, 7, 13, 14, 15, 16]);
      fmtMoneyCols(ws, clientMode ? [4, 5] : [4, 5, 6, 7], 2, rows.length - 1);
      XLSX.utils.book_append_sheet(wb, ws, uniqueSheet(r.name));
    });

    const suffix = clientMode ? "-klientu" : "-rabochaya";
    XLSX.writeFile(wb, "smeta-" + String(project || "aivibe").replace(/\s+/g, "-").toLowerCase() + suffix + ".xlsx");
    return true;
  }

  // Импорт сметы-комплектации из Excel (round-trip нашего шаблона + гибкое сопоставление заголовков).
  // Возвращает Promise<{name, area, budget, rooms, summaryShort, imported}> для RoomSpecOverlay.
  // Распознаёт колонки по подстроке заголовка, поэтому ест и наш экспорт, и «человеческие» файлы.
  function importRoomSpec(file) {
    return new Promise((resolve, reject) => {
      if (!window.XLSX) { reject(new Error("Excel-библиотека ещё загружается")); return; }
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error("Ошибка чтения файла"));
      reader.onload = () => {
        try {
          const wb = XLSX.read(new Uint8Array(reader.result), { type: "array" });
          const norm = (s) => String(s == null ? "" : s).toLowerCase();
          const num = (v) => {
            if (typeof v === "number") return v;
            const n = parseFloat(norm(v).replace(/[^\d.,-]/g, "").replace(",", "."));
            return isFinite(n) ? n : 0;
          };
          const colOf = (head, re) => head.findIndex((h) => re.test(norm(h)));

          // выбираем лист, где есть строка-заголовок с «наименование/название/предмет»
          let best = null;
          for (const sn of wb.SheetNames) {
            const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, blankrows: false });
            const hr = aoa.findIndex((row) => Array.isArray(row) && row.some((c) => /наимен|назв|предмет/.test(norm(c))));
            if (hr >= 0) { best = { aoa, hr, head: aoa[hr] }; break; }
          }
          if (!best) { resolve({ rooms: [] }); return; }
          const { aoa, hr, head } = best;

          const cTitle = colOf(head, /наимен|назв|предмет/);
          const cRoom = colOf(head, /помещ|комнат|room/);
          const cCat = colOf(head, /раздел|категор|^тип|cat/);
          const cQty = colOf(head, /кол|кол-во|шт|qty|количеств/);
          // цена за единицу: «цена/стоимость» без «клиент»; если нет — выводим из суммы/кол-во
          const cPrice = head.findIndex((h) => /цена|стоим|price/.test(norm(h)) && !/клиент/.test(norm(h)));
          const cSum = head.findIndex((h) => /сумма|total/.test(norm(h)) && !/клиент/.test(norm(h)));

          const byRoom = new Map();
          for (let i = hr + 1; i < aoa.length; i++) {
            const row = aoa[i]; if (!Array.isArray(row)) continue;
            const title = String(row[cTitle] == null ? "" : row[cTitle]).trim();
            if (!title || /^итог/.test(norm(title))) continue;       // пропускаем «Итого»
            const qty = cQty >= 0 ? (num(row[cQty]) || 1) : 1;
            let price = cPrice >= 0 ? num(row[cPrice]) : 0;
            if (!price && cSum >= 0) price = Math.round(num(row[cSum]) / qty);
            const roomName = (cRoom >= 0 ? String(row[cRoom] == null ? "" : row[cRoom]).trim() : "") || "Без помещения";
            const cat = cCat >= 0 ? String(row[cCat] == null ? "" : row[cCat]).trim() : "";
            if (!byRoom.has(roomName)) byRoom.set(roomName, []);
            byRoom.get(roomName).push({ title, cat, price, qty });
          }

          const rooms = [...byRoom.entries()].map(([name, items]) => ({ name, items }));
          const itemsCount = rooms.reduce((s, r) => s + r.items.length, 0);
          const total = rooms.reduce((s, r) => s + r.items.reduce((a, it) => a + it.price * (it.qty || 1), 0), 0);
          const baseName = String(file.name || "Импорт").replace(/\.[^.]+$/, "");
          resolve({
            name: baseName, area: "—", budget: total, rooms,
            summaryShort: "Импортировано из Excel: " + (file.name || "") + " · " + itemsCount + " позиций. Цены — как в файле; проверьте перед выгрузкой.",
            imported: true,
          });
        } catch (err) { reject(err); }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  window.AIVibeXLSX = { exportRoomSpec, importRoomSpec };
})();
