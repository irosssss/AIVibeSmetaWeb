/* Round-trip тесты Excel-выгрузки (web/xlsx.js): exportRoomSpec → importRoomSpec.
   Тест-долг PR #6 — ревью показало, что разбор «Свода» (наценка/скидка/доставка/
   монтаж/наценки по разделам) сходится к нулю дефектов только тестами.

   Механика: реальный SheetJS из node_modules; XLSX.writeFile перехватывается шимом
   (книга не пишется на диск, а сериализуется в ArrayBuffer), FileReader шимится —
   importRoomSpec получает тот же байтовый поток, что и настоящий файл. Каждый
   describe гоняет ОДИН цикл в beforeAll — ассерты читают общий результат. */
import { describe, it, expect, beforeAll } from "vitest";
import * as XLSXNS from "xlsx";

const XLSXReal = XLSXNS.default || XLSXNS;
let X;                 // window.LedgerXLSX
let FFE;               // window.LedgerFFE — боевая клиентская матша для подготовки входов
let captured = null;   // {wb, name} — что exportRoomSpec «записал в файл»

class FileReaderShim {
  readAsArrayBuffer(file) {
    queueMicrotask(() => {
      this.result = file._buf;
      if (this.onload) this.onload();
    });
  }
}

beforeAll(async () => {
  globalThis.window = globalThis.window || {};
  await import("../web/ffe.js");   // словари стадий/решений/платежей + DEFAULT_MARKUP_PCT
  const shim = Object.assign({}, XLSXReal, { writeFile: (wb, name) => { captured = { wb, name }; } });
  globalThis.XLSX = shim;          // xlsx.js обращается к голому глобалу XLSX
  globalThis.window.XLSX = shim;   // и проверяет window.XLSX перед работой
  globalThis.FileReader = FileReaderShim;
  await import("../web/xlsx.js");
  X = globalThis.window.LedgerXLSX;
  FFE = globalThis.window.LedgerFFE;
});

/* согласованные входы exportRoomSpec: clientTotal — БОЕВОЙ формулой FFE.clientPricing
   (та же, что UI/PDF/портал — не дублируем матшу наценки в тесте), grand — сумма
   себестоимости (в clientPricing её нет, формула тривиальна) */
function calc(rooms, markupPct, catMarkupPct) {
  const grand = rooms.reduce((s, r) => s + r.items.reduce((a, it) => a + it.price * (it.qty || 1), 0), 0);
  const clientTotal = FFE.clientPricing({ rooms, markup: markupPct, catMarkup: catMarkupPct }).client;
  return { grand, clientTotal };
}

async function roundTrip(args) {
  captured = null;
  expect(X.exportRoomSpec(args)).toBe(true);
  expect(captured).not.toBeNull();
  const buf = XLSXReal.write(captured.wb, { type: "array", bookType: "xlsx" });
  return X.importRoomSpec({ name: captured.name, _buf: buf });
}

const itemsOf = (res) => res.rooms.flatMap((r) => r.items);
const byTitle = (res, t) => itemsOf(res).find((it) => it.title === t);

describe("рабочий режим: полный round-trip позиций и параметров «Свода»", () => {
  const rooms = [
    { name: "Гостиная", area: 22, items: [
      { title: "Диван «Морти»", cat: "Мебель", price: 164900, qty: 1, sup: "Линея", priceDate: "2026-06-20", approve: "ok", approveAt: "2026-07-08" },
      { title: "Люстра латунная", cat: "Свет", price: 38000, qty: 2, approve: "revise", approveAt: "2026-07-09" },
    ] },
    { name: "Спальня", items: [
      { title: "Кровать 160", cat: "Мебель", price: 89000, qty: 1 },
    ] },
  ];
  const markupPct = 35, catMarkupPct = { "Свет": 10 };
  let res, grand;

  beforeAll(async () => {
    const c = calc(rooms, markupPct, catMarkupPct);
    grand = c.grand;
    res = await roundTrip({ project: "Кирова 7", area: 64, rooms, grand, clientTotal: c.clientTotal,
      markupPct, catMarkupPct, discountPct: 5, deliveryCost: 12000, installCost: 8000, budget: 500000, mode: "work" });
  });

  it("комнаты и позиции переживают цикл (title/cat/price/qty/sup/priceDate)", () => {
    expect(res.rooms.map((r) => r.name)).toEqual(["Гостиная", "Спальня"]);
    expect(itemsOf(res)).toHaveLength(3);
    const sofa = byTitle(res, "Диван «Морти»");
    expect(sofa).toMatchObject({ cat: "Мебель", price: 164900, qty: 1, sup: "Линея", priceDate: "2026-06-20" });
    expect(byTitle(res, "Люстра латунная")).toMatchObject({ price: 38000, qty: 2 });
  });

  it("решения клиента по позициям round-trip'ятся (метка → id, дата → ISO)", () => {
    expect(byTitle(res, "Диван «Морти»")).toMatchObject({ approve: "ok", approveAt: "2026-07-08" });
    expect(byTitle(res, "Люстра латунная")).toMatchObject({ approve: "revise", approveAt: "2026-07-09" });
    expect(byTitle(res, "Кровать 160").approve).toBeUndefined();   // без решения = ждёт
  });

  it("наценка/скидка/доставка/монтаж/наценки по разделам не сбрасываются в дефолт", () => {
    expect(res.markupPct).toBe(35);
    expect(res.catMarkupPct).toEqual({ "Свет": 10 });   // только отличие от базовой, «Мебель» = база не хранится
    expect(res.discountPct).toBe(5);
    expect(res.deliveryCost).toBe(12000);
    expect(res.installCost).toBe(8000);
  });

  it("итоговые строки «Итого…» не превращаются в позиции; бюджет = себестоимость", () => {
    expect(itemsOf(res).some((it) => /^итог/i.test(it.title))).toBe(false);
    expect(res.budget).toBe(grand);
  });
});

describe("адверсариальные имена: раздел «Итог»/«По разделам»/«Доставка», комната «Доставка»", () => {
  const rooms = [
    { name: "Доставка", items: [                                     // комната с именем строки итога
      { title: "Ковёр шерстяной", cat: "Итог", price: 20000, qty: 1 },
      { title: "Бра настенное", cat: "По разделам", price: 5000, qty: 2 },
    ] },
    { name: "Кухня", items: [
      { title: "Шторы льняные", cat: "Доставка", price: 15000, qty: 1 },
    ] },
  ];
  let res;

  beforeAll(async () => {
    const c = calc(rooms, 30);
    res = await roundTrip({ project: "Ловушки", rooms, grand: c.grand, clientTotal: c.clientTotal,
      markupPct: 30, discountPct: 10, deliveryCost: 7000, installCost: 3000, budget: 100000, mode: "work" });
  });

  it("маркеры секций узнаются по форме строки, а не по тексту — раздел-двойник не подменяет итог", () => {
    // раздел «Доставка» (15 000 ₽) не подменил строку доставки из «Итога» (7 000 ₽)
    expect(res.deliveryCost).toBe(7000);
    expect(res.installCost).toBe(3000);
    expect(res.discountPct).toBe(10);
    // раздел «Итог» (строка из 4 ячеек) не сошёл за маркер секции «Итог» (1 ячейка)
    expect(res.markupPct).toBe(30);
    expect(res.catMarkupPct).toBeUndefined();   // все разделы на базовой ставке
  });

  it("сами позиции и их разделы-ловушки переживают цикл нетронутыми", () => {
    expect(byTitle(res, "Ковёр шерстяной")).toMatchObject({ cat: "Итог", price: 20000 });
    expect(byTitle(res, "Бра настенное")).toMatchObject({ cat: "По разделам", qty: 2 });
    expect(byTitle(res, "Шторы льняные")).toMatchObject({ cat: "Доставка", price: 15000 });
    expect(res.rooms.map((r) => r.name)).toEqual(["Доставка", "Кухня"]);
  });
});

describe("клиентский режим: наценка не наносится второй раз", () => {
  const rooms = [{ name: "Гостиная", items: [
    { title: "Диван", cat: "Мебель", price: 100000, qty: 1, sup: "Линея", priceDate: "2026-06-01" },
  ] }];
  let res;

  beforeAll(async () => {
    const c = calc(rooms, 40);
    res = await roundTrip({ project: "Клиенту", rooms, grand: c.grand, clientTotal: c.clientTotal,
      markupPct: 40, budget: 200000, mode: "client" });
  });

  it("цены в файле клиентские → импорт ставит базовую наценку 0%", () => {
    expect(byTitle(res, "Диван").price).toBe(140000);   // клиентская цена стала себестоимостью
    expect(res.markupPct).toBe(0);                       // повторной наценки не будет
  });

  it("внутренняя кухня (поставщик, давность цены) в клиентский файл не утекает", () => {
    expect(byTitle(res, "Диван").sup).toBeUndefined();
    expect(byTitle(res, "Диван").priceDate).toBeUndefined();
  });
});

describe("закупочный лист: стадии, платежи, трек round-trip'ятся", () => {
  const rooms = [
    { name: "Гостиная", items: [
      { title: "Диван модульный", cat: "Мебель", price: 200000, qty: 1, sup: "Фабрика Линея",
        status: "production", statusDates: { production: "2026-07-01" },
        payments: { clientAdvance: { date: "2026-07-01", paid: true }, supplierBalance: { date: "", paid: true } },
        track: { number: "RA123456789RU", url: "https://tracking.example/RA123456789RU" } },
      { title: "Кресло", cat: "Мебель", price: 45000, qty: 2 },   // без стадии/платежей
    ] },
  ];
  let res;

  beforeAll(async () => {
    res = await roundTrip({ project: "Закупка", rooms, grand: 200000 + 45000 * 2, budget: 400000, mode: "procure" });
  });

  it("стадия закупки: метка листа → id словаря ffe.js", () => {
    expect(byTitle(res, "Диван модульный").status).toBe("production");
    // экспорт честно пишет «Подбор» и для позиций без стадии → импорт возвращает
    // явный дефолт-id (эквивалентен отсутствию поля — normalizePosition ставит его же)
    expect(byTitle(res, "Кресло").status).toBe("specified");
  });

  it("платёжные отметки: дата+галка и «оплачено» без даты", () => {
    const p = byTitle(res, "Диван модульный").payments;
    expect(p.clientAdvance).toEqual({ date: "2026-07-01", paid: true });
    expect(p.supplierBalance).toEqual({ date: "", paid: true });
    expect(p.supplierAdvance).toBeUndefined();
    expect(byTitle(res, "Кресло").payments).toBeUndefined();
  });

  it("трек-номер и ссылка отслеживания; поставщик из закупочного листа", () => {
    const d = byTitle(res, "Диван модульный");
    expect(d.track).toEqual({ number: "RA123456789RU", url: "https://tracking.example/RA123456789RU" });
    expect(d.sup).toBe("Фабрика Линея");
  });

  it("«Свод закупки» не принимается за рабочий «Свод» — наценки/скидки не выдумываются", () => {
    expect(res.markupPct).toBeUndefined();
    expect(res.discountPct).toBeUndefined();
    expect(res.deliveryCost).toBeUndefined();
    expect(res.installCost).toBeUndefined();
  });
});
