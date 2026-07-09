/* ============================================================
   Design Ledger — выгрузка сметы-комплектации в Excel (SheetJS, client-side)
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

  // ISO-дата → «ДД.ММ.ГГГГ» для колонки «Цена от» (давность цены скопированной позиции)
  const fmtDateCell = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || "")); return m ? m[3] + "." + m[2] + "." + m[1] : ""; };

  // mode: "work" (по умолчанию) — две цены (себестоимость + клиент) и бюджет;
  //       "client" — только цена клиента, без себестоимости/наценки/бюджета;
  //       "procure" — закупочный лист: только себестоимость, свод и лист на поставщика.
  // catMarkupPct: {раздел: %} — свои наценки поверх базовой markupPct (как на экране сметы).
  function exportRoomSpec({ project, area, rooms, grand, markupPct, catMarkupPct, clientTotal, discountPct, deliveryCost, installCost, budget, mode }) {
    if (!window.XLSX) { (window.toast ? toast("Excel-библиотека ещё загружается — попробуйте через секунду.", "info") : 0); return false; }
    rooms = rooms || [];
    if (mode === "procure") return exportProcure({ project, area, rooms, grand, budget });
    const clientMode = mode === "client";
    // итог структурой: скидка округляется до рубля от подытога — та же формула, что в UI/PDF
    const discountAmt = Math.round((clientTotal || 0) * (discountPct || 0) / 100);
    const totalClient = (clientTotal || 0) - discountAmt + (deliveryCost || 0) + (installCost || 0);
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

    push(["Design Ledger — смета-комплектация"]);
    push([project || "Проект", "", area ? area + " м²" : ""]);
    push([]);
    if (!clientMode) { push([hasCatMk ? "Наценка дизайнера (базовая), %" : "Наценка дизайнера, %", markupPct || 0]); push([]); }   // процент, не деньги

    push(clientMode ? ["По помещениям", "Сумма"] : ["По помещениям", "Себестоимость", "Для клиента"]);
    rooms.forEach((r) => {
      if (clientMode) { const ri = push([roomLabel(r), roomClient(r)]); mc.push([ri, 1]); }
      else { const ri = push([roomLabel(r), roomCost(r), roomClient(r)]); mc.push([ri, 1], [ri, 2]); }
    });
    if (clientMode) { const ri = push(["Итого по позициям", clientTotal]); mc.push([ri, 1]); }
    else { const ri = push(["Итого по позициям", grand, clientTotal]); mc.push([ri, 1], [ri, 2]); }
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
    // итог структурой: подытог → скидка → наценка → доставка/монтаж → ИТОГО (нулевые строки опускаем)
    push([]);
    push(["Итог"]);
    if (!clientMode) {
      { const ri = push(["Подытог — себестоимость (фабрика)", grand]); mc.push([ri, 1]); }
      { const ri = push(["Наценка дизайнера" + (hasCatMk ? " (по разделам)" : " (+" + (markupPct || 0) + "%)"), clientTotal - grand]); mc.push([ri, 1]); }
    }
    if (!clientMode || discountAmt > 0 || deliveryCost > 0 || installCost > 0) {
      const ri = push([clientMode ? "Подытог" : "Подытог для клиента", clientTotal]); mc.push([ri, 1]);
    }
    if (discountAmt > 0) { const ri = push(["Скидка клиенту (−" + discountPct + "%)", -discountAmt]); mc.push([ri, 1]); }
    if (deliveryCost > 0) { const ri = push(["Доставка", deliveryCost]); mc.push([ri, 1]); }
    if (installCost > 0) { const ri = push(["Монтаж и сборка", installCost]); mc.push([ri, 1]); }
    { const ri = push([clientMode ? "ИТОГО" : "ИТОГО ДЛЯ КЛИЕНТА", totalClient]); mc.push([ri, 1]); }
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
    // в клиентском файле цены — клиентские, и заголовок говорит об этом прямо: иначе при
    // обратном импорте «Цена, ₽» приняли бы за себестоимость и наценили второй раз.
    // Поставщик и давность цены — внутренняя кухня: только в рабочем файле и только
    // когда данные есть (импортёр находит колонки по заголовку — состав не фиксирован)
    const hasSup = !clientMode && rooms.some((r) => r.items.some((it) => it.sup));
    const hasPD = !clientMode && rooms.some((r) => r.items.some((it) => it.priceDate));
    // согласование по позициям (волна A1): решения клиента — внутренняя кухня, только рабочий файл
    const FFE = window.AIVibeFFE || null;
    const apLabel = (it) => (FFE && it.approve && FFE.APPROVE_BY_ID[it.approve] ? FFE.APPROVE_BY_ID[it.approve].label : "");
    const hasAp = !clientMode && !!FFE && rooms.some((r) => r.items.some((it) => apLabel(it)));
    const head = ["№", "Помещение", "Раздел"];
    if (hasSup) head.push("Поставщик");
    head.push("Наименование", "Кол-во");
    if (clientMode) head.push("Цена клиенту, ₽", "Сумма клиенту, ₽");
    else head.push("Цена, ₽", "Сумма, ₽", "Цена клиенту, ₽", "Сумма клиенту, ₽");
    if (hasPD) head.push("Цена от");
    if (hasAp) head.push("Клиент решил", "Решение от");
    const col = (name) => head.indexOf(name);
    const all = [head];
    let n = 0;
    rooms.forEach((r) => r.items.forEach((it) => {
      const row = [++n, r.name, catOf(it)];
      if (hasSup) row.push(it.sup || "");
      row.push(it.title, it.qty || 1);
      if (clientMode) row.push(unitClient(it), lineClient(it));
      else row.push(it.price, lineCost(it), unitClient(it), lineClient(it));
      if (hasPD) row.push(fmtDateCell(it.priceDate));
      if (hasAp) row.push(apLabel(it), fmtDateCell(it.approveAt));
      all.push(row);
    }));
    const trow = new Array(head.length).fill("");
    trow[col("Наименование")] = "Итого по позициям";
    if (!clientMode) trow[col("Сумма, ₽")] = grand;
    trow[col("Сумма клиенту, ₽")] = clientTotal;
    all.push(trow);
    const wsA = XLSX.utils.aoa_to_sheet(all);
    setCols(wsA, head.map((h) => ({ "№": 5, "Помещение": 18, "Раздел": 16, "Поставщик": 20, "Наименование": 46, "Кол-во": 7, "Цена, ₽": 13, "Сумма, ₽": 14, "Цена клиенту, ₽": 15, "Сумма клиенту, ₽": 16, "Цена от": 11, "Клиент решил": 14, "Решение от": 11 }[h] || 12)));
    const moneyCols = ["Цена, ₽", "Сумма, ₽", "Цена клиенту, ₽", "Сумма клиенту, ₽"].map(col).filter((c) => c >= 0);
    fmtMoneyCols(wsA, moneyCols, 1, all.length - 1);
    wsA["!autofilter"] = { ref: "A1:" + XLSX.utils.encode_col(head.length - 1) + "1" };   // фильтр по шапке — дизайнер крутит сводную как хочет
    XLSX.utils.book_append_sheet(wb, wsA, uniqueSheet("Все позиции"));

    /* ---------- Лист на каждую комнату ---------- */
    const rHead = clientMode
      ? ["№", "Раздел", "Наименование", "Кол-во", "Цена клиенту, ₽", "Сумма клиенту, ₽"]
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
    XLSX.writeFile(wb, "smeta-" + String(project || "designledger").replace(/\s+/g, "-").toLowerCase() + suffix + ".xlsx");
    return true;
  }

  /* ---------- Режим «Закупка» (роадмап #10): группировка по поставщикам ----------
     Книга: «Свод закупки» (суммы по поставщикам + бюджет) → «Все позиции» (плоская,
     с колонками Поставщик/Цена от — её же ест обратный импорт) → лист на поставщика.
     Только себестоимость — наценки и клиентских цен в закупочном документе нет. */
  function exportProcure({ project, area, rooms, grand, budget }) {
    const NO_SUP = "Поставщик не указан";
    const supOf = (it) => (it.sup || "").trim() || NO_SUP;
    const lineCost = (it) => it.price * (it.qty || 1);
    const groups = {};
    rooms.forEach((r) => r.items.forEach((it) => { const key = supOf(it); (groups[key] = groups[key] || []).push({ it, room: r.name }); }));
    const supTotal = (name) => groups[name].reduce((s, x) => s + lineCost(x.it), 0);
    const names = Object.keys(groups).sort((a, b) => (a === NO_SUP ? 1 : b === NO_SUP ? -1 : supTotal(b) - supTotal(a)));

    // стадии закупки (словарь — web/ffe.js; при недоступном модуле колонки пустые)
    const FFE = window.AIVibeFFE || null;
    const stId = (it) => (FFE && FFE.STATUS_BY_ID[it.status] ? it.status : "specified");
    const stLabel = (it) => (FFE ? FFE.statusMeta(stId(it)).label : "");
    const stDate = (it) => fmtDateCell(it.statusDates && it.statusDates[stId(it)]);
    const supProgress = (name) => (FFE && groups[name].length
      ? Math.round(groups[name].reduce((s, x) => s + FFE.statusProgress(stId(x.it)), 0) / groups[name].length * 100) + "%" : "");
    const allRows = names.flatMap((nm) => groups[nm]);
    const allProgress = FFE && allRows.length
      ? Math.round(allRows.reduce((s, x) => s + FFE.statusProgress(stId(x.it)), 0) / allRows.length * 100) + "%" : "";

    const wb = XLSX.utils.book_new();
    const used = new Set();
    const uniqueSheet = (s) => {
      let name = cleanName(s), i = 2;
      while (used.has(name)) { const suf = " (" + i++ + ")"; name = cleanName(s).slice(0, 31 - suf.length) + suf; }
      used.add(name);
      return name;
    };

    /* свод по поставщикам */
    const sv = [["Design Ledger — закупочный лист"], [project || "Проект", "", area ? area + " м²" : ""], [], ["По поставщикам", "Позиций", "Сумма", "Готовность"]];
    const smc = [];
    names.forEach((nm) => { sv.push([nm, groups[nm].length, supTotal(nm), supProgress(nm)]); smc.push([sv.length - 1, 2]); });
    sv.push(["ИТОГО ЗАКУПКА", rooms.reduce((s, r) => s + r.items.length, 0), grand, allProgress]); smc.push([sv.length - 1, 2]);
    sv.push([]);
    sv.push(["Бюджет проекта", "", budget]); smc.push([sv.length - 1, 2]);
    sv.push([grand > budget ? "Превышение бюджета" : "Остаток бюджета", "", Math.abs(budget - grand)]); smc.push([sv.length - 1, 2]);
    const wsS = XLSX.utils.aoa_to_sheet(sv);
    setCols(wsS, [34, 9, 16, 11]);
    fmtMoney(wsS, smc);
    XLSX.utils.book_append_sheet(wb, wsS, uniqueSheet("Свод закупки"));

    /* плоская мастер-таблица — полная картина + обратный импорт */
    const all = [["№", "Поставщик", "Помещение", "Раздел", "Наименование", "Кол-во", "Цена, ₽", "Сумма, ₽", "Цена от", "Стадия", "С даты"]];
    let n = 0;
    names.forEach((nm) => groups[nm].forEach((x) => {
      all.push([++n, x.it.sup || "", x.room, x.it.cat || "Прочее", x.it.title, x.it.qty || 1, x.it.price, lineCost(x.it), fmtDateCell(x.it.priceDate), stLabel(x.it), stDate(x.it)]);
    }));
    all.push(["", "", "", "", "ИТОГО ЗАКУПКА", "", "", grand, "", allProgress, ""]);
    const wsA = XLSX.utils.aoa_to_sheet(all);
    setCols(wsA, [5, 20, 18, 16, 46, 7, 13, 14, 11, 14, 11]);
    fmtMoneyCols(wsA, [6, 7], 1, all.length - 1);
    wsA["!autofilter"] = { ref: "A1:K1" };
    XLSX.utils.book_append_sheet(wb, wsA, uniqueSheet("Все позиции"));

    /* лист на поставщика — рабочий документ для салона/магазина */
    names.forEach((nm) => {
      const rows = [[nm], [], ["№", "Помещение", "Раздел", "Наименование", "Кол-во", "Цена, ₽", "Сумма, ₽", "Цена от", "Стадия", "С даты"]];
      let m = 0;
      groups[nm].forEach((x) => rows.push([++m, x.room, x.it.cat || "Прочее", x.it.title, x.it.qty || 1, x.it.price, lineCost(x.it), fmtDateCell(x.it.priceDate), stLabel(x.it), stDate(x.it)]));
      rows.push(["", "", "", "Итого по поставщику", "", "", supTotal(nm), "", supProgress(nm), ""]);
      const ws = XLSX.utils.aoa_to_sheet(rows);
      setCols(ws, [5, 18, 16, 46, 7, 13, 14, 11, 14, 11]);
      fmtMoneyCols(ws, [5, 6], 2, rows.length - 1);
      XLSX.utils.book_append_sheet(wb, ws, uniqueSheet(nm));
    });

    XLSX.writeFile(wb, "smeta-" + String(project || "designledger").replace(/\s+/g, "-").toLowerCase() + "-zakupka.xlsx");
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
          const cSup = colOf(head, /поставщ|supplier/);          // закупочный лист / рабочая мастер-таблица
          const cPD = colOf(head, /цена от|дата цены/);           // давность цены (ДД.ММ.ГГГГ → ISO)
          const cSt = colOf(head, /стади|статус/);                // стадия закупки (метка → id из ffe.js)
          const stByLabel = window.AIVibeFFE
            ? Object.fromEntries(window.AIVibeFFE.FFE_STATUSES.map((s) => [norm(s.label), s.id])) : {};
          const cAp = colOf(head, /клиент решил|согласован/);     // решение клиента по позиции (волна A1)
          const cApD = colOf(head, /решение от/);
          const apByLabel = window.AIVibeFFE
            ? Object.fromEntries(window.AIVibeFFE.APPROVE_STATUSES.map((s) => [norm(s.label), s.id])) : {};
          // «ДД.ММ.ГГГГ» → ISO (одна логика для «Цена от» и «Решение от»)
          const isoDate = (v) => { const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(String(v == null ? "" : v).trim()); return m ? m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0") : ""; };
          // цена за единицу: «цена/стоимость» без «клиент»; если нет — выводим из суммы/кол-во
          const cPrice = head.findIndex((h) => /цена|стоим|price/.test(norm(h)) && !/клиент/.test(norm(h)));
          const cSum = head.findIndex((h) => /сумма|total/.test(norm(h)) && !/клиент/.test(norm(h)));
          // клиентская выгрузка (только «Цена клиенту»): берём её, но наценку НЕ наносим второй раз
          const cPriceCli = cPrice < 0 ? head.findIndex((h) => /цена|стоим|price/.test(norm(h))) : -1;
          const cSumCli = cSum < 0 ? head.findIndex((h) => /сумма|total/.test(norm(h))) : -1;
          const clientPrices = cPrice < 0 && (cPriceCli >= 0 || cSumCli >= 0);
          const colPrice = cPrice >= 0 ? cPrice : cPriceCli;
          const colSum = cSum >= 0 ? cSum : cSumCli;

          const byRoom = new Map();
          for (let i = hr + 1; i < aoa.length; i++) {
            const row = aoa[i]; if (!Array.isArray(row)) continue;
            const title = String(row[cTitle] == null ? "" : row[cTitle]).trim();
            if (!title || /^итог/.test(norm(title))) continue;       // пропускаем «Итого»
            const qty = cQty >= 0 ? (num(row[cQty]) || 1) : 1;
            // цену округляем до рубля: дробные копейки ломали бы инвариант «строки бьются» в UI/PDF/Excel
            let price = colPrice >= 0 ? Math.round(num(row[colPrice])) : 0;
            if (!price && colSum >= 0) price = Math.round(num(row[colSum]) / qty);
            const roomName = (cRoom >= 0 ? String(row[cRoom] == null ? "" : row[cRoom]).trim() : "") || "Без помещения";
            const cat = cCat >= 0 ? String(row[cCat] == null ? "" : row[cCat]).trim() : "";
            const sup = cSup >= 0 ? String(row[cSup] == null ? "" : row[cSup]).trim() : "";
            const priceDate = cPD >= 0 ? isoDate(row[cPD]) : "";
            // стадия закупки: метка из ячейки → id (неизвестные метки игнорируем — позиция останется «Подбор»)
            const status = cSt >= 0 ? stByLabel[norm(String(row[cSt] == null ? "" : row[cSt]).trim())] || "" : "";
            // решение клиента: метка → id; «ждёт решения»/неизвестное = отсутствие поля
            const apId = cAp >= 0 ? apByLabel[norm(String(row[cAp] == null ? "" : row[cAp]).trim())] || "" : "";
            const approve = apId && apId !== "pending" ? apId : "";
            const approveAt = approve && cApD >= 0 ? isoDate(row[cApD]) : "";
            if (!byRoom.has(roomName)) byRoom.set(roomName, []);
            byRoom.get(roomName).push({ title, cat, price, qty, ...(sup ? { sup } : {}), ...(priceDate ? { priceDate } : {}), ...(status ? { status } : {}),
              ...(approve ? { approve, ...(approveAt ? { approveAt } : {}) } : {}) });
          }

          const rooms = [...byRoom.entries()].map(([name, items]) => ({ name, items }));
          const itemsCount = rooms.reduce((s, r) => s + r.items.length, 0);
          const total = rooms.reduce((s, r) => s + r.items.reduce((a, it) => a + it.price * (it.qty || 1), 0), 0);
          const baseName = String(file.name || "Импорт").replace(/\.[^.]+$/, "");
          resolve({
            name: baseName, area: "—", budget: total, rooms,
            summaryShort: "Импортировано из Excel: " + (file.name || "") + " · " + itemsCount + " позиций. "
              + (clientPrices ? "В файле цены клиентские — наценка не применялась (базовая 0%). " : "")
              + "Цены — как в файле; проверьте перед выгрузкой.",
            imported: true,
            ...(clientPrices ? { markupPct: 0 } : {}),   // клиентские цены не наценяем повторно
          });
        } catch (err) { reject(err); }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  window.AIVibeXLSX = { exportRoomSpec, importRoomSpec };
})();
