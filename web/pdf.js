/* ============================================================
   AIVibe — выгрузка спецификации в PDF (pdfmake, шрифт Roboto/кириллица)
   Экспортирует window.AIVibePDF.exportSpec(...)
   ============================================================ */
(function () {
  const money = (n) => new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₽"; // ₽

  function exportSpec({ project, styleName, rows, total, budget, checks }) {
    if (!window.pdfMake) { (window.toast ? toast("PDF-модуль ещё загружается — попробуйте через секунду.", "info") : 0); return false; }
    const over = total > budget;

    const tableBody = [
      [
        { text: "Категория", style: "th" },
        { text: "Предмет", style: "th" },
        { text: "Фабрика", style: "th" },
        { text: "Уровень", style: "th" },
        { text: "Цена", style: "th", alignment: "right" },
      ],
      ...rows.map((r) => [
        r.cat,
        r.title,
        r.factory || "—",
        r.tier || "—",
        { text: money(r.price), alignment: "right" },
      ]),
    ];

    const checkLines = (checks && checks.findings ? checks.findings : []).map((f) => ({
      text: (f.kind === "warn" ? "•  " : "•  ") + f.text,
      color: f.kind === "warn" ? "#B45309" : "#2F7A52",
      fontSize: 9, margin: [0, 1.5, 0, 1.5],
    }));
    const checkSummary = checks
      ? (checks.ok ? "Все нормы соблюдены" : checks.warns + " замечани" + (checks.warns === 1 ? "е" : checks.warns < 5 ? "я" : "й"))
      : "—";

    const doc = {
      pageMargins: [40, 46, 40, 44],
      content: [
        {
          columns: [
            { text: "AIVibe", style: "logo" },
            { text: "Спецификация проекта", alignment: "right", style: "muted", margin: [0, 6, 0, 0] },
          ],
        },
        { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: "#B7502C" }], margin: [0, 8, 0, 0] },
        { text: project || "Проект", style: "h1", margin: [0, 14, 0, 2] },
        { text: (styleName ? styleName + " · " : "") + "смета по каталогу фабрик-партнёров", style: "muted", margin: [0, 0, 0, 16] },

        { text: "Проверка эргономики — " + checkSummary, style: "h2" },
        ...(checkLines.length ? checkLines : [{ text: "—", fontSize: 9, color: "#999" }]),

        { text: "Спецификация", style: "h2", margin: [0, 16, 0, 6] },
        {
          table: { headerRows: 1, widths: ["*", "*", 58, 54, "auto"], body: tableBody },
          layout: {
            hLineWidth: (i) => (i === 1 ? 1 : 0.5),
            hLineColor: () => "#E5E0DA",
            vLineWidth: () => 0,
            paddingTop: () => 5, paddingBottom: () => 5,
          },
        },
        {
          columns: [
            { text: over ? "Превышение бюджета на " + money(total - budget) : "В рамках бюджета · остаток " + money(budget - total), color: over ? "#B45309" : "#2F7A52", fontSize: 10, margin: [0, 12, 0, 0] },
            { text: "Итого: " + money(total), alignment: "right", style: "total", margin: [0, 9, 0, 0] },
          ],
        },
        { text: "Цены, наличие и сроки — по каталогу фабрик-партнёров. Документ сформирован в AIVibe.", style: "foot", margin: [0, 20, 0, 0] },
      ],
      styles: {
        logo: { fontSize: 18, bold: true, color: "#B7502C" },
        h1: { fontSize: 20, bold: true, color: "#1A1417" },
        h2: { fontSize: 12, bold: true, color: "#3A3338", margin: [0, 8, 0, 4] },
        th: { bold: true, fontSize: 9, color: "#6B6168" },
        muted: { color: "#8A8088", fontSize: 10 },
        total: { fontSize: 14, bold: true, color: "#1A1417" },
        foot: { fontSize: 8, color: "#B0A8AE" },
      },
      defaultStyle: { fontSize: 10, color: "#241A26" },
    };

    const name = "smeta-" + String(project || "aivibe").replace(/\s+/g, "-").toLowerCase() + ".pdf";
    window.pdfMake.createPdf(doc).download(name);
    return true;
  }

  // Многокомнатная смета-комплектация (реальный дизайн-проект): разделы по комнатам.
  // mode: "work" (по умолчанию) — две цены (себестоимость + клиент) и бюджет;
  //       "client" — только цена клиента, без себестоимости/наценки/бюджета.
  // catMarkupPct: {раздел: %} — свои наценки поверх базовой markupPct (как на экране сметы).
  function exportRoomSpec({ project, area, rooms, grand, markupPct, catMarkupPct, clientTotal, budget, mode }) {
    if (!window.pdfMake) { (window.toast ? toast("PDF-модуль ещё загружается — попробуйте через секунду.", "info") : 0); return false; }
    const clientMode = mode === "client";
    const pctOf = (it) => { const c = it.cat || "Прочее"; return catMarkupPct && catMarkupPct[c] != null ? catMarkupPct[c] : (markupPct || 0); };
    const lineCost = (it) => it.price * (it.qty || 1);
    const lineClient = (it) => Math.round(lineCost(it) * (1 + pctOf(it) / 100));   // клиентские суммы — из округлённых строк, как в UI
    const hasCatMk = !!catMarkupPct && Object.keys(catMarkupPct).length > 0;
    const content = [
      { columns: [ { text: "AIVibe", style: "logo" }, { text: "Смета-комплектация", alignment: "right", style: "muted", margin: [0, 6, 0, 0] } ] },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: "#B7502C" }], margin: [0, 8, 0, 0] },
      { text: project || "Проект", style: "h1", margin: [0, 14, 0, 2] },
      { text: "Комплектация по дизайн-проекту · " + (area || "—") + " м²", style: "muted", margin: [0, 0, 0, 14] },
    ];
    (rooms || []).forEach((r) => {
      const sub = r.items.reduce((s, it) => s + lineCost(it), 0);
      const subClient = r.items.reduce((s, it) => s + lineClient(it), 0);
      content.push({ text: r.name + (r.area ? "   ·   " + r.area + " м²" : ""), style: "h2", margin: [0, 12, 0, 4] });
      content.push({
        table: { headerRows: 0, widths: ["*", 60, 32, "auto"], body: r.items.map((it) => [
          it.title,
          { text: it.cat || "", color: "#8A8088", fontSize: 9 },
          { text: "×" + (it.qty || 1), alignment: "right", fontSize: 9, color: "#8A8088" },
          { text: money(clientMode ? lineClient(it) : lineCost(it)), alignment: "right" },
        ]) },
        layout: { hLineWidth: () => 0.5, hLineColor: () => "#EFEAE4", vLineWidth: () => 0, paddingTop: () => 3.5, paddingBottom: () => 3.5 },
      });
      content.push({ columns: [ { text: "", width: "*" }, { text: "Итого по комнате: " + money(clientMode ? subClient : sub), alignment: "right", bold: true, fontSize: 10.5, margin: [0, 4, 0, 0] } ] });
    });
    content.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#E5E0DA" }], margin: [0, 14, 0, 8] });
    if (clientMode) {
      content.push({ columns: [ { text: "", width: "*" }, { text: "Итого: " + money(clientTotal), alignment: "right", style: "total", margin: [0, 6, 0, 0] } ] });
    } else {
      const over = grand > budget;
      content.push({ columns: [
        { text: over ? "Превышение бюджета на " + money(grand - budget) : "В рамках бюджета (" + money(budget) + ")", color: over ? "#B45309" : "#2F7A52", fontSize: 10, margin: [0, 6, 0, 0] },
        { stack: [ { text: "Себестоимость: " + money(grand), alignment: "right", fontSize: 11 }, { text: "Для клиента " + (hasCatMk ? "(наценка по разделам)" : "(+" + (markupPct || 0) + "%)") + ": " + money(clientTotal), alignment: "right", style: "total" } ] },
      ] });
    }
    content.push({ text: "Комплектация (мебель, техника, сантехника, свет, текстиль). Ремонтные работы и отделочные материалы — отдельной сметой. Цены — рыночный ориентир. Документ сформирован в AIVibe.", style: "foot", margin: [0, 16, 0, 0] });

    const doc = {
      pageMargins: [40, 46, 40, 44],
      content,
      styles: {
        logo: { fontSize: 18, bold: true, color: "#B7502C" },
        h1: { fontSize: 20, bold: true, color: "#1A1417" },
        h2: { fontSize: 12, bold: true, color: "#3A3338" },
        muted: { color: "#8A8088", fontSize: 10 },
        total: { fontSize: 14, bold: true, color: "#1A1417" },
        foot: { fontSize: 8, color: "#B0A8AE" },
      },
      defaultStyle: { fontSize: 10, color: "#241A26" },
    };
    const suffix = clientMode ? "-klientu" : "-rabochaya";
    window.pdfMake.createPdf(doc).download("smeta-" + String(project || "aivibe").replace(/\s+/g, "-").toLowerCase() + suffix + ".pdf");
    return true;
  }

  window.AIVibePDF = { exportSpec, exportRoomSpec };
})();
