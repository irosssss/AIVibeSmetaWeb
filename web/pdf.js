/* ============================================================
   Design Ledger — выгрузка спецификации в PDF (pdfmake, шрифт Roboto/кириллица)
   Экспортирует window.LedgerPDF.exportRoomSpec(...)
   ============================================================ */
(function () {
  const money = (n) => new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₽"; // ₽

  /* Единая ТЁПЛАЯ палитра PDF (T5/T14). Было: 4 дубля холодной сливовой палитры старого
     дарк-бренда (#241A26/#3A3338/#8A8088/#1A1417) + дрейф (total 13 vs 14). Один источник правды —
     тёплые чернила/олива/терракота, как на бумаге интерфейса. PDF = лицо бренда у клиента. */
  const PDF = {
    ink: "#2E2A26", sub: "#4A443C", th: "#7A7266", muted: "#7A7266",
    foot: "#A99F8F", accent: "#B7502C", warn: "#A6431F", ok: "#556150", info: "#3E4A59",
  };
  const PDF_STYLES = {
    logo:  { fontSize: 18, bold: true, color: PDF.accent },
    h1:    { fontSize: 20, bold: true, color: PDF.ink },
    h2:    { fontSize: 12, bold: true, color: PDF.sub, margin: [0, 8, 0, 4] },
    th:    { bold: true, fontSize: 9, color: PDF.th },
    muted: { color: PDF.muted, fontSize: 10 },
    total: { fontSize: 14, bold: true, color: PDF.ink },
    foot:  { fontSize: 8, color: PDF.foot },
  };
  const PDF_DEFAULT = { fontSize: 10, color: PDF.ink };

  // шапка студии (волна W4.1) — имя + контакты под заголовком документа; общая для
  // exportRoomSpec/exportProcurePDF/exportApprovalProtocol, было скопипащено в каждую
  function studioHeaderBlock(studioName, studioContact) {
    return [
      ...(studioName ? [{ text: studioName, bold: true, fontSize: 10.5, color: PDF.accent, margin: [0, 0, 0, 2] }] : []),
      ...(studioContact ? [{ text: studioContact, fontSize: 9, color: PDF.muted, margin: [0, 0, 0, 2] }] : []),
    ];
  }

  // Многокомнатная смета-комплектация (реальный дизайн-проект): разделы по комнатам.
  // mode: "work" (по умолчанию) — две цены (себестоимость + клиент) и бюджет;
  //       "client" — только цена клиента, без себестоимости/наценки/бюджета;
  //       "procure" — закупочный лист: группировка по поставщикам, только себестоимость.
  // catMarkupPct: {раздел: %} — свои наценки поверх базовой markupPct (как на экране сметы).
  function exportRoomSpec({ project, area, rooms, grand, markupPct, catMarkupPct, clientTotal, discountPct, deliveryCost, installCost, budget, mode, studioName, studioContact }) {
    if (!window.pdfMake) { (window.toast ? toast("PDF-модуль ещё загружается — попробуйте через секунду.", "info") : 0); return false; }
    if (mode === "procure") return exportProcurePDF({ project, area, rooms: rooms || [], grand, budget, studioName, studioContact });
    const clientMode = mode === "client";
    const FFE = window.LedgerFFE || null;
    const fresh = FFE && FFE.priceFreshness ? FFE.priceFreshness(rooms) : null;
    const fmtD = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || "")); return m ? m[3] + "." + m[2] + "." + m[1] : ""; };
    // итог структурой: скидка округляется до рубля от подытога — та же формула, что в UI/Excel
    const discountAmt = Math.round((clientTotal || 0) * (discountPct || 0) / 100);
    const totalClient = (clientTotal || 0) - discountAmt + (deliveryCost || 0) + (installCost || 0);
    const pctOf = (it) => { const c = it.cat || "Прочее"; return catMarkupPct && catMarkupPct[c] != null ? catMarkupPct[c] : (markupPct || 0); };
    const lineCost = (it) => it.price * (it.qty || 1);
    const unitClient = (it) => Math.round(it.price * (1 + pctOf(it) / 100));       // округляется цена/шт,
    const lineClient = (it) => unitClient(it) * (it.qty || 1);                     // сумма = цена × кол-во — как в UI, документ бьётся
    const hasCatMk = !!catMarkupPct && Object.keys(catMarkupPct).length > 0;
    const content = [
      { columns: [ { text: "Design Ledger", style: "logo" }, { text: "Смета-комплектация", alignment: "right", style: "muted", margin: [0, 6, 0, 0] } ] },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: "#B7502C" }], margin: [0, 8, 0, 0] },
      { text: project || "Проект", style: "h1", margin: [0, 14, 0, 2] },
      ...studioHeaderBlock(studioName, studioContact),
      { text: "Комплектация по дизайн-проекту · " + (area || "—") + " м²", style: "muted", margin: [0, 0, 0, 14] },
    ];
    (rooms || []).forEach((r) => {
      const sub = r.items.reduce((s, it) => s + lineCost(it), 0);
      const subClient = r.items.reduce((s, it) => s + lineClient(it), 0);
      content.push({ text: r.name + (r.area ? "   ·   " + r.area + " м²" : ""), style: "h2", margin: [0, 12, 0, 4] });
      content.push({
        table: { headerRows: 0, widths: ["*", 60, 32, "auto"], body: r.items.map((it) => {
          // FF&E-детали (артикул/материал/габариты/срок) — подстрокой под названием, той же
          // конвенцией, что в UI: артикул/срок только в рабочей версии (ffeMeta(client))
          const meta = FFE && FFE.ffeMeta ? FFE.ffeMeta(it, { client: clientMode }) : "";
          return [
          meta ? { stack: [{ text: it.title }, { text: meta, fontSize: 8, color: PDF.muted, margin: [0, 1, 0, 0] }] } : it.title,
          { text: it.cat || "Прочее", color: PDF.muted, fontSize: 9 },
          { text: "×" + (it.qty || 1), alignment: "right", fontSize: 9, color: PDF.muted },
          { text: money(clientMode ? lineClient(it) : lineCost(it)), alignment: "right" },
        ]; }) },
        layout: { hLineWidth: () => 0.5, hLineColor: () => "#EFEAE4", vLineWidth: () => 0, paddingTop: () => 3.5, paddingBottom: () => 3.5 },
      });
      content.push({ columns: [ { text: "", width: "*" }, { text: "Итого по комнате: " + money(clientMode ? subClient : sub), alignment: "right", bold: true, fontSize: 10.5, margin: [0, 4, 0, 0] } ] });
    });
    content.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#E5E0DA" }], margin: [0, 14, 0, 8] });
    // итог структурой: подытог → скидка → наценка → доставка/монтаж → ИТОГО (нулевые строки опускаем)
    const totalRows = [];
    if (clientMode) {
      if (discountAmt > 0 || deliveryCost > 0 || installCost > 0) totalRows.push({ text: "Подытог: " + money(clientTotal), alignment: "right", fontSize: 10.5 });
      if (discountAmt > 0) totalRows.push({ text: "Скидка (−" + discountPct + "%): −" + money(discountAmt), alignment: "right", fontSize: 10.5 });
      if (deliveryCost > 0) totalRows.push({ text: "Доставка: +" + money(deliveryCost), alignment: "right", fontSize: 10.5 });
      if (installCost > 0) totalRows.push({ text: "Монтаж и сборка: +" + money(installCost), alignment: "right", fontSize: 10.5 });
      totalRows.push({ text: "Итого: " + money(totalClient), alignment: "right", style: "total", margin: [0, 3, 0, 0] });
      content.push({ columns: [ { text: "", width: "*" }, { stack: totalRows, margin: [0, 6, 0, 0] } ] });
    } else {
      const over = grand > budget;
      totalRows.push({ text: "Подытог — себестоимость (фабрика): " + money(grand), alignment: "right", fontSize: 10.5 });
      totalRows.push({ text: "Наценка дизайнера " + (hasCatMk ? "(по разделам)" : "(+" + (markupPct || 0) + "%)") + ": +" + money(clientTotal - grand), alignment: "right", fontSize: 10.5 });
      totalRows.push({ text: "Подытог для клиента: " + money(clientTotal), alignment: "right", fontSize: 10.5 });
      if (discountAmt > 0) totalRows.push({ text: "Скидка клиенту (−" + discountPct + "%): −" + money(discountAmt), alignment: "right", fontSize: 10.5 });
      if (deliveryCost > 0) totalRows.push({ text: "Доставка: +" + money(deliveryCost), alignment: "right", fontSize: 10.5 });
      if (installCost > 0) totalRows.push({ text: "Монтаж и сборка: +" + money(installCost), alignment: "right", fontSize: 10.5 });
      totalRows.push({ text: "Итого для клиента: " + money(totalClient), alignment: "right", style: "total", margin: [0, 3, 0, 0] });
      content.push({ columns: [
        { text: over ? "Превышение бюджета на " + money(grand - budget) : "В рамках бюджета (" + money(budget) + ")", color: over ? PDF.warn : PDF.ok, fontSize: 10, margin: [0, 6, 0, 0] },
        { stack: totalRows, margin: [0, 6, 0, 0] },
      ] });
    }
    if (fresh) {
      content.push({
        text: (fresh.checked === fresh.total ? "Цены проверены не позднее " : "Цены проверены у " + fresh.checked + " из " + fresh.total + " позиций — не позднее ")
          + fmtD(fresh.oldest) + (fresh.stale ? " (" + fresh.days + " дн. назад — рекомендуем перепроверить)" : ""),
        fontSize: 8, color: fresh.stale ? PDF.warn : PDF.foot, margin: [0, 10, 0, 0],
      });
    }
    content.push({ text: "Комплектация (мебель, техника, сантехника, свет, текстиль). Ремонтные работы и отделочные материалы — отдельной сметой. Цены — рыночный ориентир. Документ сформирован в Design Ledger.", style: "foot", margin: [0, 16, 0, 0] });

    const doc = {
      pageMargins: [40, 46, 40, 44],
      content,
      styles: PDF_STYLES,
      defaultStyle: PDF_DEFAULT,
    };
    const suffix = clientMode ? "-klientu" : "-rabochaya";
    window.pdfMake.createPdf(doc).download("smeta-" + String(project || "designledger").replace(/\s+/g, "-").toLowerCase() + suffix + ".pdf");
    return true;
  }

  // Закупочный лист (роадмап #10): группы по поставщикам, только себестоимость;
  // «цена от …» — давность цены скопированной позиции (тем же цветом-варнингом после 30 дней)
  function exportProcurePDF({ project, area, rooms, grand, budget, studioName, studioContact }) {
    const NO_SUP = "Поставщик не указан";
    const lineCost = (it) => it.price * (it.qty || 1);
    const fmtD = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || "")); return m ? m[3] + "." + m[2] + "." + m[1] : ""; };
    const stale = (d) => { const t = new Date(d + "T00:00:00").getTime(); return !isNaN(t) && (Date.now() - t) / 86400000 > 30; };
    const groups = {};
    rooms.forEach((r) => r.items.forEach((it) => { const k = (it.sup || "").trim() || NO_SUP; (groups[k] = groups[k] || []).push({ it, room: r.name }); }));
    const total = (k) => groups[k].reduce((s, x) => s + lineCost(x.it), 0);
    const names = Object.keys(groups).sort((a, b) => (a === NO_SUP ? 1 : b === NO_SUP ? -1 : total(b) - total(a)));

    // стадии закупки (словарь — web/ffe.js; без модуля колонка не печатается)
    const FFE = window.LedgerFFE || null;
    const stId = (it) => (FFE && FFE.STATUS_BY_ID[it.status] ? it.status : "specified");
    const stShort = (it) => (FFE ? FFE.statusMeta(stId(it)).short : "");
    const supProgress = (k) => (FFE && groups[k].length
      ? Math.round(groups[k].reduce((s, x) => s + FFE.statusProgress(stId(x.it)), 0) / groups[k].length * 100) : null);

    const content = [
      { columns: [ { text: "Design Ledger", style: "logo" }, { text: "Закупочный лист", alignment: "right", style: "muted", margin: [0, 6, 0, 0] } ] },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: "#B7502C" }], margin: [0, 8, 0, 0] },
      { text: project || "Проект", style: "h1", margin: [0, 14, 0, 2] },
      ...studioHeaderBlock(studioName, studioContact),
      { text: "Закупка по поставщикам · " + (area || "—") + " м² · цены — себестоимость, без наценки", style: "muted", margin: [0, 0, 0, 14] },
    ];
    names.forEach((nm) => {
      const pr = supProgress(nm);
      content.push({ text: nm + "   ·   " + money(total(nm)) + (pr != null ? "   ·   готовность " + pr + "%" : ""), style: "h2", margin: [0, 12, 0, 4] });
      content.push({
        table: { headerRows: 0, widths: FFE ? ["*", 76, 44, 26, "auto"] : ["*", 84, 26, "auto"], body: groups[nm].map((x) => {
          // подстроки под названием: давность цены + трек-номер (волна C3, кликабельно —
          // pdfMake печатает ссылку как аннотацию поверх текста, курсор-палец в вьюере)
          const subLines = [];
          // FF&E-детали для поставщика (артикул/материал/габариты/срок) — что именно заказывать
          const meta = FFE && FFE.ffeMeta ? FFE.ffeMeta(x.it, {}) : "";
          if (meta) subLines.push({ text: meta, fontSize: 8, color: PDF.muted, margin: [0, 1, 0, 0] });
          if (x.it.priceDate) subLines.push({ text: "цена от " + fmtD(x.it.priceDate), fontSize: 8, color: stale(x.it.priceDate) ? PDF.warn : PDF.muted, margin: [0, 1, 0, 0] });
          if (x.it.track && x.it.track.number) subLines.push(x.it.track.url
            ? { text: "трек №" + x.it.track.number, fontSize: 8, color: PDF.info || PDF.muted, link: x.it.track.url, decoration: "underline", margin: [0, 1, 0, 0] }
            : { text: "трек №" + x.it.track.number, fontSize: 8, color: PDF.muted, margin: [0, 1, 0, 0] });
          const cells = [
            subLines.length ? { stack: [{ text: x.it.title }, ...subLines] } : x.it.title,
            { text: x.room, color: PDF.muted, fontSize: 9 },
            { text: "×" + (x.it.qty || 1), alignment: "right", fontSize: 9, color: PDF.muted },
            { text: money(lineCost(x.it)), alignment: "right" },
          ];
          // колонка стадии — между помещением и количеством
          if (FFE) cells.splice(2, 0, { text: stShort(x.it), fontSize: 8, color: PDF.muted, alignment: "right", margin: [0, 1, 0, 0] });
          return cells;
        }) },
        layout: { hLineWidth: () => 0.5, hLineColor: () => "#EFEAE4", vLineWidth: () => 0, paddingTop: () => 3.5, paddingBottom: () => 3.5 },
      });
    });
    content.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#E5E0DA" }], margin: [0, 14, 0, 8] });
    const over = grand > budget;
    content.push({ columns: [
      { text: over ? "Превышение бюджета на " + money(grand - budget) : "В рамках бюджета (" + money(budget) + ")", color: over ? PDF.warn : PDF.ok, fontSize: 10, margin: [0, 6, 0, 0] },
      { text: "Итого закупка: " + money(grand), alignment: "right", style: "total", margin: [0, 3, 0, 0] },
    ] });
    content.push({ text: "Закупочный лист для работы с поставщиками: только себестоимость, без наценки и клиентских цен. Документ сформирован в Design Ledger.", style: "foot", margin: [0, 16, 0, 0] });

    const doc = {
      pageMargins: [40, 46, 40, 44],
      content,
      styles: PDF_STYLES,
      defaultStyle: PDF_DEFAULT,
    };
    window.pdfMake.createPdf(doc).download("smeta-" + String(project || "designledger").replace(/\s+/g, "-").toLowerCase() + "-zakupka.pdf");
    return true;
  }

  /* Протокол согласования (волна A4, бенчмарк Programa): все решения клиента по
     позициям + переписка + таймстампы, одной кнопкой из версии сметы. Источник —
     снимок портал-шары, если версия отправлялась клиенту (то же, что видит клиент
     и на что отвечает дизайнер в «Версиях»), иначе — собственный снимок версии
     (решения могли быть проставлены дизайнером вручную ещё до портала, волна A1).
     Юридически фиксирует состояние переговоров на момент выгрузки. */
  function exportApprovalProtocol({ project, versionLabel, createdAt, vStatusLabel, statusAt, respondedAt, studioName, studioContact, snapshot }) {
    if (!window.pdfMake) { (window.toast ? toast("PDF-модуль ещё загружается — попробуйте через секунду.", "info") : 0); return false; }
    const FFE = window.LedgerFFE;
    const snap = snapshot || {};
    const rooms = Array.isArray(snap.rooms) ? snap.rooms : [];
    const cp = FFE ? FFE.clientPricing(snap) : null;
    const fmtD = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || "")); return m ? m[3] + "." + m[2] + "." + m[1] : ""; };
    const fmtDT = (iso) => { try { return new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
    const AP_COLOR = { pending: PDF.muted, ok: PDF.ok, revise: "#3E4A59", rejected: "#B7502C" };
    const apOf = (it) => (FFE && FFE.APPROVE_BY_ID[it.approve] ? it.approve : "pending");
    const apLabel = (it) => (FFE ? FFE.approveMeta(apOf(it)).label : "—");

    const counts = { pending: 0, ok: 0, revise: 0, rejected: 0 };
    rooms.forEach((r) => (r.items || []).forEach((it) => { counts[apOf(it)]++; }));
    const itemsCount = counts.pending + counts.ok + counts.revise + counts.rejected;

    const content = [
      { columns: [ { text: "Design Ledger", style: "logo" }, { text: "Протокол согласования", alignment: "right", style: "muted", margin: [0, 6, 0, 0] } ] },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: "#B7502C" }], margin: [0, 8, 0, 0] },
      { text: project || "Проект", style: "h1", margin: [0, 14, 0, 2] },
      ...studioHeaderBlock(studioName, studioContact),
      { text: "Версия «" + (versionLabel || "—") + "»" + (createdAt ? " · снимок от " + fmtDT(createdAt) : ""), style: "muted", margin: [0, 0, 0, 2] },
      { text: "Статус: " + (vStatusLabel || "—") + (statusAt ? " · " + fmtD(statusAt) : "") + (respondedAt ? "   ·   клиент отвечал " + fmtDT(respondedAt) : ""), style: "muted", margin: [0, 0, 0, 14] },
    ];

    if (!rooms.length) {
      content.push({ text: "В снимке этой версии нет помещений с позициями.", fontSize: 9.5, color: PDF.muted, margin: [0, 8, 0, 8] });
    }
    rooms.forEach((r) => {
      content.push({ text: r.name || "Помещение", style: "h2", margin: [0, 12, 0, 4] });
      (r.items || []).forEach((it) => {
        const aid = apOf(it);
        content.push({
          columns: [
            { text: it.title + "  ×" + (it.qty || 1), width: "*" },
            { text: apLabel(it) + (it.approveAt ? " · " + fmtD(it.approveAt) : ""), color: AP_COLOR[aid], bold: true, fontSize: 9.5, alignment: "right", width: 160 },
          ],
          margin: [0, 5, 0, (it.comments && it.comments.length) ? 2 : 5],
        });
        (it.comments || []).forEach((c) => {
          content.push({
            text: (c.author === "client" ? "Клиент" : "Студия") + " · " + fmtDT(c.at) + ":  " + c.text,
            fontSize: 8.5, color: c.author === "client" ? "#3E4A59" : PDF.th, margin: [12, 1, 0, 1],
          });
        });
      });
      content.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#EFEAE4" }], margin: [0, 6, 0, 0] });
    });

    content.push({ text: "Итог решений", style: "h2", margin: [0, 14, 0, 4] });
    content.push({
      columns: [
        { text: "Согласовано " + counts.ok + " · на пересмотр " + counts.revise + " · отклонено " + counts.rejected + " · ждут решения " + counts.pending + "  (всего " + itemsCount + ")", fontSize: 9.5, color: PDF.th },
        cp ? { text: "Итого клиенту: " + money(cp.totalClient), alignment: "right", style: "total" } : { text: "" },
      ],
    });
    content.push({ text: "Протокол фиксирует решения и переписку по снимку версии на момент выгрузки. Документ сформирован в Design Ledger.", style: "foot", margin: [0, 18, 0, 0] });

    const doc = {
      pageMargins: [40, 46, 40, 44],
      content,
      styles: PDF_STYLES,
      defaultStyle: PDF_DEFAULT,
    };
    window.pdfMake.createPdf(doc).download("protokol-" + String(project || "designledger").replace(/\s+/g, "-").toLowerCase() + ".pdf");
    return true;
  }

  window.LedgerPDF = { exportRoomSpec, exportApprovalProtocol };
})();
