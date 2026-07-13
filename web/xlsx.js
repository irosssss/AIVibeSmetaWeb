/* ============================================================
   Design Ledger — выгрузка сметы-комплектации в Excel (SheetJS, client-side)
   Экспортирует window.LedgerXLSX.exportRoomSpec(...)
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
  function exportRoomSpec({ project, area, rooms, grand, markupPct, catMarkupPct, clientTotal, discountPct, deliveryCost, installCost, extras, budget, mode }) {
    if (!window.XLSX) { (window.toast ? toast("Excel-библиотека ещё загружается — попробуйте через секунду.", "info") : 0); return false; }
    rooms = rooms || [];
    if (mode === "procure") return exportProcure({ project, area, rooms, grand, budget });
    const clientMode = mode === "client";
    const FFE = window.LedgerFFE || null;
    const fresh = FFE && FFE.priceFreshness ? FFE.priceFreshness(rooms) : null;
    // итог структурой: скидка округляется до рубля от подытога — та же формула, что в UI/PDF
    const discountAmt = Math.round((clientTotal || 0) * (discountPct || 0) / 100);
    // доп. сборы (доставка/монтаж/НДС/кастом) — та же база (товары после скидки), что в UI/PDF
    const extrasList = Array.isArray(extras) ? extras : [];
    const extrasAmt = FFE && FFE.extrasTotal ? FFE.extrasTotal(extrasList, (clientTotal || 0) - discountAmt) : 0;
    const totalClient = (clientTotal || 0) - discountAmt + (deliveryCost || 0) + (installCost || 0) + extrasAmt;
    const catOf = (it) => it.cat || "Прочее";
    const pctOf = (it) => (catMarkupPct && catMarkupPct[catOf(it)] != null ? catMarkupPct[catOf(it)] : (markupPct || 0));
    const hasCatMk = !!catMarkupPct && Object.keys(catMarkupPct).length > 0;
    // себестоимость учитывает запас/отход (FFE.costUnit — тот же источник, что в UI/PDF)
    const costUnit = (it) => (FFE && FFE.costUnit ? FFE.costUnit(it) : it.price);
    const lineCost = (it) => costUnit(it) * (it.qty || 1);
    const unitClient = (it) => Math.round(costUnit(it) * (1 + pctOf(it) / 100));    // округляется цена/шт,
    const lineClient = (it) => unitClient(it) * (it.qty || 1);                      // сумма = цена × кол-во — колонки бьются арифметически
    const roomCost = (r) => r.items.reduce((s, it) => s + lineCost(it), 0);
    const roomClient = (r) => r.items.reduce((s, it) => s + lineClient(it), 0);
    // RRP-слой (роадмап п.17): построчная выгода клиента от розницы — та же математика, что
    // FFE.clientPricing/UI/PDF (rrpLine учитывает запас); в ячейки идёт только положительная
    // выгода (витрина), в колонку «Розница/ед.» — СЫРАЯ rrp без запаса, как «Цена, ₽» идёт
    // сырой price: иначе round-trip наложил бы запас второй раз при переимпорте
    const lineSavings = (it) => (+it.rrp > 0 && FFE && FFE.rrpLine ? FFE.rrpLine(it) - lineClient(it) : 0);
    let rrpTotal = 0, rrpBase = 0;
    if (FFE && FFE.rrpLine) rooms.forEach((r) => r.items.forEach((it) => { if (+it.rrp > 0) { rrpTotal += FFE.rrpLine(it); rrpBase += lineClient(it); } }));
    const savings = rrpTotal - rrpBase;
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
    if (!clientMode || discountAmt > 0 || deliveryCost > 0 || installCost > 0 || extrasAmt > 0) {
      const ri = push([clientMode ? "Подытог" : "Подытог для клиента", clientTotal]); mc.push([ri, 1]);
    }
    if (discountAmt > 0) { const ri = push(["Скидка клиенту (−" + discountPct + "%)", -discountAmt]); mc.push([ri, 1]); }
    if (deliveryCost > 0) { const ri = push(["Доставка", deliveryCost]); mc.push([ri, 1]); }
    if (installCost > 0) { const ri = push(["Монтаж и сборка", installCost]); mc.push([ri, 1]); }
    { const ri = push([clientMode ? "ИТОГО" : "ИТОГО ДЛЯ КЛИЕНТА", totalClient]); mc.push([ri, 1]); }
    // выгода от розницы (RRP-слой) — витрина, только положительная; метки не пересекаются
    // с парсером «Итога» импортёра (наценка/скидка/доставка/монтаж), лишние строки он игнорирует
    if (savings > 0) {
      { const ri = push(["Розница в магазинах (RRP)", rrpTotal]); mc.push([ri, 1]); }
      { const ri = push(["Выгода клиента от розницы", savings]); mc.push([ri, 1]); }
    }
    if (!clientMode) {   // бюджет/себестоимость — внутренняя кухня, в клиентскую версию не выгружаем
      push([]);
      { const ri = push(["Бюджет проекта", budget]); mc.push([ri, 1]); }
      { const ri = push([over ? "Превышение бюджета" : "Остаток бюджета", Math.abs(budget - grand)]); mc.push([ri, 1]); }
    }
    if (fresh) {  // паспорт свежести цен (роадмап «Стол комплектатора» шаг C1)
      push([]);
      push([(fresh.checked === fresh.total ? "Цены проверены не позднее" : "Цены проверены у " + fresh.checked + " из " + fresh.total + " позиций — не позднее")
        + " " + fmtDateCell(fresh.oldest) + (fresh.stale ? " (" + fresh.days + " дн. назад — рекомендуем перепроверить)" : "")]);
    }
    // доп. сборы — ОТДЕЛЬНАЯ секция со своим маркером, физически в самом низу листа (после
    // «Итога»/бюджета/свежести цен): импорт распознаёт её независимо от разбора «Итога»,
    // не пересекается с состоянием того парсера (см. importRoomSpec) — «Бюджет проекта» и
    // «Итог» такие же 2-ячеечные строки [метка, сумма], поэтому секции обязаны не смешиваться.
    // Тип/процент — В ОТДЕЛЬНОЙ колонке (не суффиксом в тексте метки): свободный label
    // кастомного фикс-сбора мог бы случайно закончиться на «(N%)» и на импорте ложно
    // прочитаться как percent-сбор с чужим значением вместо фикс. суммы (найдено ревью).
    // В рабочем режиме строка не опускается даже при сумме 0 (это ИМЕНЕК-список, не
    // скаляр как скидка/доставка — пропуск строки стирает саму позицию сбора при
    // реимпорте, не просто прячет её); в клиентском — как discount/delivery/install,
    // нулевые сборы клиенту не показываем.
    const extrasRows = extrasList
      .filter((ex) => !clientMode || (FFE && FFE.extraAmount ? FFE.extraAmount(ex, clientTotal - discountAmt) : 0) > 0)
      .map((ex) => [ex.label, ex.kind === "percent" ? ex.value + "%" : "", FFE && FFE.extraAmount ? FFE.extraAmount(ex, clientTotal - discountAmt) : 0]);
    if (extrasRows.length) {
      push([]);
      push(["Доп. сборы"]);
      extrasRows.forEach((row) => { const ri = push(row); mc.push([ri, 2]); });
    }

    const wsS = XLSX.utils.aoa_to_sheet(svod);
    setCols(wsS, clientMode ? [42, 16, 16] : [42, 16, 16, 11]);   // 3-я колонка — секция «Доп. сборы» (тип/%, ₽), нужна и клиенту
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
    // (FFE уже объявлен выше — формула себестоимости/наценки)
    const apLabel = (it) => (FFE && it.approve && FFE.APPROVE_BY_ID[it.approve] ? FFE.APPROVE_BY_ID[it.approve].label : "");
    const hasAp = !clientMode && !!FFE && rooms.some((r) => r.items.some((it) => apLabel(it)));
    // FF&E-детали позиции — отдельными колонками (фильтруемо). Конвенция как в UI/PDF:
    // материал/габариты видны и клиенту, артикул/срок — закупочная деталь (только рабочий файл).
    const dimsOf = (it) => (FFE && FFE.dimsLabel ? FFE.dimsLabel(it.dims) : "");
    const hasSku = !clientMode && rooms.some((r) => r.items.some((it) => it.sku));
    const hasMat = rooms.some((r) => r.items.some((it) => it.material));
    const hasDims = rooms.some((r) => r.items.some((it) => dimsOf(it)));
    const hasLead = !clientMode && rooms.some((r) => r.items.some((it) => it.leadWeeks));
    // единица измерения — рядом с кол-вом, видна и клиенту (в отличие от артикула/срока/запаса);
    // колонку показываем только если есть позиции не в «шт»
    const hasUnit = rooms.some((r) => r.items.some((it) => it.unit && it.unit !== "шт"));
    const unitCell = (it) => it.unit || "шт";
    const hasWaste = !clientMode && rooms.some((r) => r.items.some((it) => it.wastePct));
    // розница/выгода (RRP-слой) — витрина ДЛЯ клиента, видна в обоих режимах, когда rrp задана.
    // В заголовке колонки нет слова «цена» — иначе импортёр принял бы розницу за себестоимость
    const hasRrp = rooms.some((r) => r.items.some((it) => +it.rrp > 0));
    const ffeHead = [];
    if (hasSku) ffeHead.push("Артикул");
    if (hasMat) ffeHead.push("Материал");
    if (hasDims) ffeHead.push("Габариты");
    if (hasLead) ffeHead.push("Срок, нед.");
    if (hasWaste) ffeHead.push("Запас, %");
    const ffeCells = (it) => {
      const c = [];
      if (hasSku) c.push(it.sku || "");
      if (hasMat) c.push(it.material || "");
      if (hasDims) c.push(dimsOf(it));
      if (hasLead) c.push(it.leadWeeks || "");
      if (hasWaste) c.push(it.wastePct || "");
      return c;
    };
    const head = ["№", "Помещение", "Раздел"];
    if (hasSup) head.push("Поставщик");
    head.push("Наименование", ...ffeHead, "Кол-во");
    if (hasUnit) head.push("Ед.");
    if (clientMode) head.push("Цена клиенту, ₽", "Сумма клиенту, ₽");
    else head.push("Цена, ₽", "Сумма, ₽", "Цена клиенту, ₽", "Сумма клиенту, ₽");
    if (hasRrp) head.push("Розница/ед., ₽", "Выгода, ₽");
    if (hasPD) head.push("Цена от");
    if (hasAp) head.push("Клиент решил", "Решение от");
    const col = (name) => head.indexOf(name);
    const all = [head];
    let n = 0;
    rooms.forEach((r) => r.items.forEach((it) => {
      const row = [++n, r.name, catOf(it)];
      if (hasSup) row.push(it.sup || "");
      row.push(it.title, ...ffeCells(it), it.qty || 1);
      if (hasUnit) row.push(unitCell(it));
      if (clientMode) row.push(unitClient(it), lineClient(it));
      else row.push(it.price, lineCost(it), unitClient(it), lineClient(it));
      if (hasRrp) { const sv = lineSavings(it); row.push(+it.rrp > 0 ? it.rrp : "", sv > 0 ? sv : ""); }
      if (hasPD) row.push(fmtDateCell(it.priceDate));
      if (hasAp) row.push(apLabel(it), fmtDateCell(it.approveAt));
      all.push(row);
    }));
    const trow = new Array(head.length).fill("");
    trow[col("Наименование")] = "Итого по позициям";
    if (!clientMode) trow[col("Сумма, ₽")] = grand;
    trow[col("Сумма клиенту, ₽")] = clientTotal;
    if (hasRrp && savings > 0) trow[col("Выгода, ₽")] = savings;
    all.push(trow);
    const wsA = XLSX.utils.aoa_to_sheet(all);
    setCols(wsA, head.map((h) => ({ "№": 5, "Помещение": 18, "Раздел": 16, "Поставщик": 20, "Наименование": 46, "Артикул": 16, "Материал": 20, "Габариты": 16, "Срок, нед.": 10, "Запас, %": 10, "Кол-во": 7, "Ед.": 8, "Цена, ₽": 13, "Сумма, ₽": 14, "Цена клиенту, ₽": 15, "Сумма клиенту, ₽": 16, "Розница/ед., ₽": 14, "Выгода, ₽": 12, "Цена от": 11, "Клиент решил": 14, "Решение от": 11 }[h] || 12)));
    const moneyCols = ["Цена, ₽", "Сумма, ₽", "Цена клиенту, ₽", "Сумма клиенту, ₽", "Розница/ед., ₽", "Выгода, ₽"].map(col).filter((c) => c >= 0);
    fmtMoneyCols(wsA, moneyCols, 1, all.length - 1);
    wsA["!autofilter"] = { ref: "A1:" + XLSX.utils.encode_col(head.length - 1) + "1" };   // фильтр по шапке — дизайнер крутит сводную как хочет
    XLSX.utils.book_append_sheet(wb, wsA, uniqueSheet("Все позиции"));

    /* ---------- Лист на каждую комнату ---------- */
    // шапка/индексы строятся по имени (rcol) — те же FF&E-колонки, что в мастер-таблице,
    // не смещают позиционно денежные колонки и строку итога
    const rHead = ["№", "Раздел", "Наименование", ...ffeHead, "Кол-во"];
    if (hasUnit) rHead.push("Ед.");
    if (clientMode) rHead.push("Цена клиенту, ₽", "Сумма клиенту, ₽");
    else rHead.push("Цена, ₽", "Сумма, ₽", "Цена клиенту, ₽", "Сумма клиенту, ₽");
    if (hasRrp) rHead.push("Розница/ед., ₽", "Выгода, ₽");
    const rcol = (name) => rHead.indexOf(name);
    const rColW = { "№": 5, "Раздел": 16, "Наименование": 46, "Артикул": 16, "Материал": 20, "Габариты": 16, "Срок, нед.": 10, "Запас, %": 10, "Кол-во": 7, "Ед.": 8, "Цена, ₽": 13, "Сумма, ₽": 14, "Цена клиенту, ₽": 15, "Сумма клиенту, ₽": 16, "Розница/ед., ₽": 14, "Выгода, ₽": 12 };
    const rMoneyCols = (clientMode ? ["Цена клиенту, ₽", "Сумма клиенту, ₽"] : ["Цена, ₽", "Сумма, ₽", "Цена клиенту, ₽", "Сумма клиенту, ₽"]).concat(hasRrp ? ["Розница/ед., ₽", "Выгода, ₽"] : []).map(rcol);
    rooms.forEach((r) => {
      const rows = [[roomLabel(r)], [], rHead];
      let m = 0;
      r.items.forEach((it) => {
        const row = [++m, catOf(it), it.title, ...ffeCells(it), it.qty || 1];
        if (hasUnit) row.push(unitCell(it));
        if (clientMode) row.push(unitClient(it), lineClient(it));
        else row.push(it.price, lineCost(it), unitClient(it), lineClient(it));
        if (hasRrp) { const sv = lineSavings(it); row.push(+it.rrp > 0 ? it.rrp : "", sv > 0 ? sv : ""); }
        rows.push(row);
      });
      const trow = new Array(rHead.length).fill("");
      trow[rcol("Наименование")] = "Итого по комнате";
      if (!clientMode) trow[rcol("Сумма, ₽")] = roomCost(r);
      trow[rcol("Сумма клиенту, ₽")] = roomClient(r);
      // итог выгоды — net (с отрицательными строками), как «Итого по позициям» мастер-таблицы:
      // клип по строкам завысил бы итог относительно честной суммы
      if (hasRrp) { const rs = r.items.reduce((s, it) => s + lineSavings(it), 0); if (rs > 0) trow[rcol("Выгода, ₽")] = rs; }
      rows.push(trow);
      const ws = XLSX.utils.aoa_to_sheet(rows);
      setCols(ws, rHead.map((h) => rColW[h] || 12));
      fmtMoneyCols(ws, rMoneyCols, 2, rows.length - 1);
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
    // стадии закупки (словарь — web/ffe.js; при недоступном модуле колонки пустые)
    const FFE = window.LedgerFFE || null;
    const supOf = (it) => (it.sup || "").trim() || NO_SUP;
    // себестоимость учитывает запас/отход — сколько реально заказывать у поставщика
    const lineCost = (it) => (FFE && FFE.lineTotal ? FFE.lineTotal(it) : it.price * (it.qty || 1));
    const groups = {};
    rooms.forEach((r) => r.items.forEach((it) => { const key = supOf(it); (groups[key] = groups[key] || []).push({ it, room: r.name }); }));
    const supTotal = (name) => groups[name].reduce((s, x) => s + lineCost(x.it), 0);
    const names = Object.keys(groups).sort((a, b) => (a === NO_SUP ? 1 : b === NO_SUP ? -1 : supTotal(b) - supTotal(a)));

    const stId = (it) => (FFE && FFE.STATUS_BY_ID[it.status] ? it.status : "specified");
    const stLabel = (it) => (FFE ? FFE.statusMeta(stId(it)).label : "");
    const stDate = (it) => fmtDateCell(it.statusDates && it.statusDates[stId(it)]);
    const supProgress = (name) => (FFE && groups[name].length
      ? Math.round(groups[name].reduce((s, x) => s + FFE.statusProgress(stId(x.it)), 0) / groups[name].length * 100) + "%" : "");
    const allRows = names.flatMap((nm) => groups[nm]);
    const allProgress = FFE && allRows.length
      ? Math.round(allRows.reduce((s, x) => s + FFE.statusProgress(stId(x.it)), 0) / allRows.length * 100) + "%" : "";

    // платёжные даты (волна C1) + трек-номер (волна C3) — 6 колонок в конце
    // мастер-таблицы и листа поставщика; при недоступном модуле FFE — пусто.
    // id/порядок — из FFE.PAYMENT_KINDS (не дублировать список здесь).
    const PAY_IDS = FFE ? FFE.PAYMENT_KINDS.map((k) => k.id) : ["clientAdvance", "supplierAdvance", "clientBalance", "supplierBalance"];
    const payLabel = (id) => (FFE && FFE.PAYKIND_BY_ID[id] ? FFE.PAYKIND_BY_ID[id].label : id);
    // «оплачено» без даты — тоже реальная запись, не пустая ячейка
    const payCell = (it, id) => {
      const p = it.payments && it.payments[id];
      if (!p) return "";
      if (p.date) return fmtDateCell(p.date) + (p.paid ? " ✓" : "");
      return p.paid ? "оплачено" : "";
    };
    const payCells = (it) => PAY_IDS.map((id) => payCell(it, id));
    const trackCells = (it) => [(it.track && it.track.number) || "", (it.track && it.track.url) || ""];
    const PAY_HEAD = PAY_IDS.map(payLabel).concat(["Трек-номер", "Ссылка отслеживания"]);
    const PAY_COLW = [16, 18, 16, 18, 16, 30];

    // FF&E-детали позиции — что именно заказывать у поставщика (артикул/материал/габариты/срок).
    // Только присутствующие поля → пустых колонок в закупочном листе нет.
    const dimsOf = (it) => (FFE && FFE.dimsLabel ? FFE.dimsLabel(it.dims) : "");
    const FFE_HEAD = [], FFE_COLW = [], ffeGet = [];
    if (rooms.some((r) => r.items.some((it) => it.sku))) { FFE_HEAD.push("Артикул"); FFE_COLW.push(16); ffeGet.push((it) => it.sku || ""); }
    if (rooms.some((r) => r.items.some((it) => it.material))) { FFE_HEAD.push("Материал"); FFE_COLW.push(20); ffeGet.push((it) => it.material || ""); }
    if (rooms.some((r) => r.items.some((it) => dimsOf(it)))) { FFE_HEAD.push("Габариты"); FFE_COLW.push(16); ffeGet.push((it) => dimsOf(it)); }
    if (rooms.some((r) => r.items.some((it) => it.leadWeeks))) { FFE_HEAD.push("Срок, нед."); FFE_COLW.push(10); ffeGet.push((it) => it.leadWeeks || ""); }
    if (rooms.some((r) => r.items.some((it) => it.wastePct))) { FFE_HEAD.push("Запас, %"); FFE_COLW.push(10); ffeGet.push((it) => it.wastePct || ""); }
    const ffeCells = (it) => ffeGet.map((f) => f(it));
    // единица измерения — рядом с кол-вом (не в FFE-блоке, тот идёт до кол-ва)
    const hasUnitP = rooms.some((r) => r.items.some((it) => it.unit && it.unit !== "шт"));
    const unitH = hasUnitP ? ["Ед."] : [];
    const unitCol = hasUnitP ? [8] : [];
    const unitC = (it) => hasUnitP ? [it.unit || "шт"] : [];
    const setLinks = (ws, links) => links.forEach(([r, c, url]) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (ws[ref] && url) ws[ref].l = { Target: url };
    });

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
    const aHead = ["№", "Поставщик", "Помещение", "Раздел", "Наименование", ...FFE_HEAD, "Кол-во", ...unitH, "Цена, ₽", "Сумма, ₽", "Цена от", "Стадия", "С даты", ...PAY_HEAD];
    const all = [aHead];
    const urlCol = aHead.length - 1; // «Ссылка отслеживания» — последняя колонка шапки, не magic-число
    const allLinks = [];
    let n = 0;
    names.forEach((nm) => groups[nm].forEach((x) => {
      all.push([++n, x.it.sup || "", x.room, x.it.cat || "Прочее", x.it.title, ...ffeCells(x.it), x.it.qty || 1, ...unitC(x.it), x.it.price, lineCost(x.it), fmtDateCell(x.it.priceDate), stLabel(x.it), stDate(x.it), ...payCells(x.it), ...trackCells(x.it)]);
      const url = x.it.track && x.it.track.url;
      if (url) allLinks.push([all.length - 1, urlCol, url]);
    }));
    const aTot = new Array(aHead.length).fill("");
    aTot[aHead.indexOf("Наименование")] = "ИТОГО ЗАКУПКА"; aTot[aHead.indexOf("Сумма, ₽")] = grand; aTot[aHead.indexOf("Стадия")] = allProgress;
    all.push(aTot);
    const wsA = XLSX.utils.aoa_to_sheet(all);
    setCols(wsA, [5, 20, 18, 16, 46, ...FFE_COLW, 7, ...unitCol, 13, 14, 11, 14, 11, ...PAY_COLW]);
    fmtMoneyCols(wsA, [aHead.indexOf("Цена, ₽"), aHead.indexOf("Сумма, ₽")], 1, all.length - 1);
    setLinks(wsA, allLinks);
    wsA["!autofilter"] = { ref: "A1:" + XLSX.utils.encode_col(aHead.length - 1) + "1" };
    XLSX.utils.book_append_sheet(wb, wsA, uniqueSheet("Все позиции"));

    /* лист на поставщика — рабочий документ для салона/магазина */
    names.forEach((nm) => {
      const head = ["№", "Помещение", "Раздел", "Наименование", ...FFE_HEAD, "Кол-во", ...unitH, "Цена, ₽", "Сумма, ₽", "Цена от", "Стадия", "С даты", ...PAY_HEAD];
      const rows = [[nm], [], head];
      const urlColSup = head.length - 1;
      const links = [];
      let m = 0;
      groups[nm].forEach((x) => {
        rows.push([++m, x.room, x.it.cat || "Прочее", x.it.title, ...ffeCells(x.it), x.it.qty || 1, ...unitC(x.it), x.it.price, lineCost(x.it), fmtDateCell(x.it.priceDate), stLabel(x.it), stDate(x.it), ...payCells(x.it), ...trackCells(x.it)]);
        const url = x.it.track && x.it.track.url;
        if (url) links.push([rows.length - 1, urlColSup, url]);
      });
      const tr = new Array(head.length).fill("");
      tr[head.indexOf("Наименование")] = "Итого по поставщику"; tr[head.indexOf("Сумма, ₽")] = supTotal(nm); tr[head.indexOf("Стадия")] = supProgress(nm);
      rows.push(tr);
      const ws = XLSX.utils.aoa_to_sheet(rows);
      setCols(ws, [5, 18, 16, 46, ...FFE_COLW, 7, ...unitCol, 13, 14, 11, 14, 11, ...PAY_COLW]);
      fmtMoneyCols(ws, [head.indexOf("Цена, ₽"), head.indexOf("Сумма, ₽")], 2, rows.length - 1);
      setLinks(ws, links);
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
          const stByLabel = window.LedgerFFE
            ? Object.fromEntries(window.LedgerFFE.FFE_STATUSES.map((s) => [norm(s.label), s.id])) : {};
          const cAp = colOf(head, /клиент решил|согласован/);     // решение клиента по позиции (волна A1)
          const cApD = colOf(head, /решение от/);
          const apByLabel = window.LedgerFFE
            ? Object.fromEntries(window.LedgerFFE.APPROVE_STATUSES.map((s) => [norm(s.label), s.id])) : {};
          // платёжные даты (волна C1) — 4 колонки, различаем «клиента»/«поставщику» внутри «аванс»/«остаток»
          const cPayCols = {
            clientAdvance:   colOf(head, /аванс.*клиент/),
            supplierAdvance: colOf(head, /аванс.*поставщ/),
            clientBalance:   colOf(head, /остаток.*клиент/),
            supplierBalance: colOf(head, /остаток.*поставщ/),
          };
          const cTrackNum = colOf(head, /трек.?номер/);            // трек-номер отправления (волна C3)
          const cTrackUrl = colOf(head, /ссылка отслежив/);
          // FF&E-детали позиции (артикул/материал/габариты/срок) — иначе round-trip своей же
          // выгрузки молча терял бы их. Габариты «80×45×120 см» → {w,d,h} (× или x, «—» = пусто)
          const cSku = colOf(head, /артикул|sku/);
          const cMat = colOf(head, /материал|отделк/);
          const cDims = colOf(head, /габарит|размер/);
          const cLead = colOf(head, /срок/);
          const cWaste = colOf(head, /запас|отход|waste/);
          // розница (RRP-слой, п.17): в заголовке экспорта нет слова «цена» — не путается
          // с cPrice ниже; производная колонка «Выгода, ₽» на импорте игнорируется осознанно
          const cRrp = colOf(head, /розниц|ррц|rrp/);
          const cUnit = colOf(head, /^ед\.?$|ед\.?\s*изм|единиц|unit/);   // \b не годится — кириллица не ASCII-word
          const KNOWN_UNITS = (window.LedgerFFE && window.LedgerFFE.FFE_UNITS) || ["шт"];   // белый список единиц
          const parseDims = (v) => {
            const s = String(v == null ? "" : v).replace(/см/gi, "").trim();
            if (!s) return null;
            const p = s.split(/[×xх*]/).map((x) => x.trim());
            const val = (x) => (x && x !== "—" && isFinite(parseFloat(x.replace(",", "."))) ? Math.round(parseFloat(x.replace(",", "."))) : "");
            const d = { w: val(p[0]), d: val(p[1]), h: val(p[2]) };
            return d.w === "" && d.d === "" && d.h === "" ? null : d;
          };
          // «ДД.ММ.ГГГГ» → ISO (одна логика для «Цена от» и «Решение от»)
          const isoDate = (v) => { const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(String(v == null ? "" : v).trim()); return m ? m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0") : ""; };
          // ячейка платежа: «ДД.ММ.ГГГГ [✓]» или «оплачено» без даты (см. payCell в exportProcure)
          const parsePayCell = (v) => {
            const s = String(v == null ? "" : v).trim();
            if (!s) return null;
            const paid = /✓|оплачен/i.test(s);
            const date = isoDate(s.replace(/✓/g, "").trim());
            return date || paid ? { date, paid } : null;
          };
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
            let priceFromSum = false;
            if (!price && colSum >= 0) { price = Math.round(num(row[colSum]) / qty); priceFromSum = true; }
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
            const payments = {};
            Object.keys(cPayCols).forEach((id) => { if (cPayCols[id] >= 0) { const p = parsePayCell(row[cPayCols[id]]); if (p) payments[id] = p; } });
            const trackNumber = cTrackNum >= 0 ? String(row[cTrackNum] == null ? "" : row[cTrackNum]).trim() : "";
            const trackUrl = cTrackUrl >= 0 ? String(row[cTrackUrl] == null ? "" : row[cTrackUrl]).trim() : "";
            const sku = cSku >= 0 ? String(row[cSku] == null ? "" : row[cSku]).trim() : "";
            const material = cMat >= 0 ? String(row[cMat] == null ? "" : row[cMat]).trim() : "";
            const dims = cDims >= 0 ? parseDims(row[cDims]) : null;
            const leadWeeks = cLead >= 0 ? Math.round(num(row[cLead])) : 0;
            const wastePct = cWaste >= 0 ? Math.max(0, Math.round(num(row[cWaste]))) : 0;
            // розница — СЫРАЯ величина за единицу (экспорт пишет it.rrp без запаса — см. exportRoomSpec)
            const rrp = cRrp >= 0 ? Math.max(0, Math.round(num(row[cRrp]))) : 0;
            // цена, выведенная из «Суммы», уже включает запас (Сумма = цена×кол×(1+запас%));
            // вычитаем его обратно, иначе FFE.lineTotal наложит запас второй раз при переэкспорте
            if (priceFromSum && wastePct > 0) price = Math.round(price / (1 + wastePct / 100));
            // единица — только из словаря FFE_UNITS; чужое «шт.»/«kg»/«рулон» → дефолт «шт» (не тащим мусор,
            // иначе select в PosEditor не покажет её и рассинхронится с сохранённым значением)
            let unit = cUnit >= 0 ? String(row[cUnit] == null ? "" : row[cUnit]).trim() : "";
            if (unit && !KNOWN_UNITS.includes(unit)) unit = "";
            if (!byRoom.has(roomName)) byRoom.set(roomName, []);
            byRoom.get(roomName).push({ title, cat, price, qty, ...(sup ? { sup } : {}), ...(priceDate ? { priceDate } : {}), ...(status ? { status } : {}),
              ...(sku ? { sku } : {}), ...(material ? { material } : {}), ...(dims ? { dims } : {}), ...(leadWeeks ? { leadWeeks } : {}), ...(wastePct ? { wastePct } : {}), ...(rrp ? { rrp } : {}), ...(unit && unit !== "шт" ? { unit } : {}),
              ...(approve ? { approve, ...(approveAt ? { approveAt } : {}) } : {}),
              ...(Object.keys(payments).length ? { payments } : {}),
              ...(trackNumber || trackUrl ? { track: { number: trackNumber, url: trackUrl } } : {}) });
          }

          const rooms = [...byRoom.entries()].map(([name, items]) => ({ name, items }));
          const itemsCount = rooms.reduce((s, r) => s + r.items.length, 0);
          const total = rooms.reduce((s, r) => s + r.items.reduce((a, it) => a + (window.LedgerFFE && window.LedgerFFE.lineTotal ? window.LedgerFFE.lineTotal(it) : it.price * (it.qty || 1)), 0), 0);
          const baseName = String(file.name || "Импорт").replace(/\.[^.]+$/, "");

          // «Свод» — наценка/скидка/доставка/монтаж/наценки по разделам живут только там
          // (позиции их не несут), поэтому без этого прохода round-trip тихо сбрасывал их
          // в дефолт при каждом переимпорте своей же выгрузки. Значения читаем текстом
          // строки, не по номеру колонки — порядок строк в «Своде» может меняться
          // (клиентский/рабочий режим). Секции различаем маркерами «По разделам»/«Итог» —
          // без этого текст раздела/комнаты/поставщика «Доставка» (свободный ввод!) читался
          // бы как строка доставки, а «Свод закупки» (другая книга, row[1] там — количество
          // позиций, не деньги) — как рабочий «Свод».
          let markupPct, discountPct, deliveryCost, installCost, catMarkupPct;
          const extrasArr = [];
          const svodSn = wb.SheetNames.find((sn) => /^свод/i.test(sn));
          if (svodSn) {
            let inCat = false, inItog = false, inExtras = false;
            const catOv = {};
            XLSX.utils.sheet_to_json(wb.Sheets[svodSn], { header: 1, blankrows: false }).forEach((row) => {
              if (!Array.isArray(row) || !row[0]) return;
              const label = String(row[0]).trim();
              // маркеры узнаём не только по тексту, но и по форме строки — иначе раздел,
              // названный ровно «Итог»/«По разделам» (свободный текст!), сам сошёл бы за
              // маркер и подмял бы своей меткой все строки после себя. У «Итога» ровно
              // одна ячейка (push(["Итог"])); у заголовка «По разделам» вторая ячейка —
              // текст («Себестоимость»/«Сумма»), у строки раздела — всегда число (сумма).
              if (label === "Итог" && row.length === 1) { inItog = true; inCat = false; inExtras = false; return; }
              // «Доп. сборы» — СВОЯ секция, физически после «Итога» (см. exportRoomSpec):
              // разбирается независимо от inItog/inCat, никогда не пересекается с их состоянием
              if (label === "Доп. сборы" && row.length === 1) { inExtras = true; inItog = false; inCat = false; return; }
              if (inExtras) {
                // тип/процент — В ОТДЕЛЬНОЙ колонке row[1] («N%» или пусто для фикс.), НЕ
                // суффиксом в тексте метки: кастомный фикс-сбор со свободным label, случайно
                // заканчивающимся на «(N%)», иначе ложно прочитался бы как percent-сбор
                const pctCell = /^(\d+(?:[.,]\d+)?)%$/.exec(String(row[1] == null ? "" : row[1]).trim());
                const kind = pctCell ? "percent" : "fixed";
                const value = pctCell ? parseFloat(pctCell[1].replace(",", ".")) : num(row[2]);
                extrasArr.push(window.LedgerFFE && window.LedgerFFE.blankExtra
                  ? window.LedgerFFE.blankExtra({ label, kind, value })
                  : { id: "extra_" + extrasArr.length, label, kind, value });
                return;
              }
              if (label === "По разделам" && typeof row[1] === "string") { inCat = true; return; }
              // якорь «, %» на конце — иначе матчится и строка «Итога» с наценкой В РУБЛЯХ
              // («Наценка дизайнера (+35%)»), а не только строка-заголовок с процентом
              if (/наценка дизайнера.*,\s*%\s*$/i.test(label)) { markupPct = num(row[1]); return; }
              // раздел с наценкой (4 колонки в рабочем режиме; в клиентском — только сумма,
              // колонки наценки нет вовсе, что и держит клиентские файлы без catMarkupPct)
              if (inCat && row.length >= 4) { catOv[label] = num(row[3]); return; }
              if (!inItog) return;   // скидка/доставка/монтаж живут только внутри «Итога»
              const pctM = /скидка клиенту[^\d]*(\d+(?:[.,]\d+)?)\s*%/i.exec(label);
              if (pctM) discountPct = parseFloat(pctM[1].replace(",", "."));
              else if (/^доставка$/i.test(label)) deliveryCost = num(row[1]);
              else if (/монтаж и сборка/i.test(label)) installCost = num(row[1]);
            });
            // хранить только реальные отличия от базовой ставки — так же, как их пишет UI.
            // Дефолт — из web/ffe.js (единая точка канона), а не свой литерал
            const defMarkup = (window.LedgerFFE && window.LedgerFFE.DEFAULT_MARKUP_PCT) || 25;
            const base = markupPct != null ? markupPct : defMarkup;
            const ov = Object.fromEntries(Object.entries(catOv).filter(([, p]) => p !== base));
            if (Object.keys(ov).length) catMarkupPct = ov;
          }

          resolve({
            name: baseName, area: "—", budget: total, rooms,
            summaryShort: "Импортировано из Excel: " + (file.name || "") + " · " + itemsCount + " позиций. "
              + (clientPrices ? "В файле цены клиентские — наценка не применялась (базовая 0%). " : "")
              + "Цены — как в файле; проверьте перед выгрузкой.",
            imported: true,
            // клиентские цены не наценяем повторно — 0% сильнее того, что нашлось (или не нашлось) в «Своде»
            ...(clientPrices ? { markupPct: 0 } : (markupPct != null ? { markupPct } : {})),
            ...(discountPct != null ? { discountPct } : {}),
            ...(deliveryCost != null ? { deliveryCost } : {}),
            ...(installCost != null ? { installCost } : {}),
            ...(catMarkupPct ? { catMarkupPct } : {}),
            ...(extrasArr.length ? { extras: extrasArr } : {}),
          });
        } catch (err) { reject(err); }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  window.LedgerXLSX = { exportRoomSpec, importRoomSpec };
})();
