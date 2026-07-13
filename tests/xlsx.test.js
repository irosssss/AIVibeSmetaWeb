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
   себестоимости через FFE.lineTotal (с запасом/отходом, как per-line «Сумма, ₽» в
   выгрузке; иначе total-строка не сходилась бы с суммой строк для позиций с wastePct) */
function calc(rooms, markupPct, catMarkupPct) {
  const grand = rooms.reduce((s, r) => s + r.items.reduce((a, it) => a + FFE.lineTotal(it), 0), 0);
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
  const extras = [
    { id: "e1", label: "Налог / НДС", kind: "percent", value: 20 },
    { id: "e2", label: "Доставка (доп.)", kind: "fixed", value: 5000 },
  ];
  let res, grand;

  beforeAll(async () => {
    const c = calc(rooms, markupPct, catMarkupPct);
    grand = c.grand;
    res = await roundTrip({ project: "Кирова 7", area: 64, rooms, grand, clientTotal: c.clientTotal,
      markupPct, catMarkupPct, discountPct: 5, deliveryCost: 12000, installCost: 8000, extras, budget: 500000, mode: "work" });
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

  it("доп. сборы (extras) переживают round-trip — percent и fixed, метка/значение/тип", () => {
    expect(res.extras).toHaveLength(2);
    const tax = res.extras.find((e) => e.label === "Налог / НДС");
    expect(tax).toMatchObject({ kind: "percent", value: 20 });
    const ship = res.extras.find((e) => e.label === "Доставка (доп.)");
    expect(ship).toMatchObject({ kind: "fixed", value: 5000 });
  });

  it("«Бюджет проекта»/«Остаток бюджета» не попадают в extras (риск: те же 2-ячеечные строки)", () => {
    expect(res.extras.some((e) => /бюджет/i.test(e.label))).toBe(false);
    expect(res.extras.some((e) => /итог/i.test(e.label))).toBe(false);
  });

  it("итоговые строки «Итого…» не превращаются в позиции; бюджет = себестоимость", () => {
    expect(itemsOf(res).some((it) => /^итог/i.test(it.title))).toBe(false);
    expect(res.budget).toBe(grand);
  });
});

describe("доп. сборы: адверсариальные метки (найдено код-ревью)", () => {
  const rooms = [{ name: "Гостиная", items: [{ title: "Диван", cat: "Мебель", price: 100000, qty: 1 }] }];

  it("фикс-сбор со свободной меткой, оканчивающейся на «(N%)», не путается с percent-сбором — тип/значение в отдельной колонке, не в тексте метки", async () => {
    const extras = [{ id: "e1", label: "Услуга (10%)", kind: "fixed", value: 5000 }];
    const c = calc(rooms, 25);
    const res = await roundTrip({ project: "Ловушка в метке", rooms, grand: c.grand, clientTotal: c.clientTotal,
      markupPct: 25, extras, budget: 200000, mode: "work" });
    expect(res.extras).toHaveLength(1);
    expect(res.extras[0]).toMatchObject({ label: "Услуга (10%)", kind: "fixed", value: 5000 });   // НЕ percent/10
  });

  it("кастомный сбор с меткой ровно «Доп. сборы» не подменяет маркер секции — форма строки (3 ячейки) отличает данные от маркера (1 ячейка)", async () => {
    const extras = [
      { id: "e1", label: "Доп. сборы", kind: "fixed", value: 3000 },   // «атака» на текст маркера
      { id: "e2", label: "Налог / НДС", kind: "percent", value: 20 },   // должен пережить round-trip несмотря на «атаку» выше
    ];
    const c = calc(rooms, 25);
    const res = await roundTrip({ project: "Ловушка-маркер", rooms, grand: c.grand, clientTotal: c.clientTotal,
      markupPct: 25, extras, budget: 200000, mode: "work" });
    expect(res.extras).toHaveLength(2);
    expect(res.extras.find((e) => e.label === "Доп. сборы")).toMatchObject({ kind: "fixed", value: 3000 });
    expect(res.extras.find((e) => e.label === "Налог / НДС")).toMatchObject({ kind: "percent", value: 20 });
  });

  it("нулевой percent-сбор (placeholder, ещё не заполнен) не теряется в рабочем режиме", async () => {
    const extras = [{ id: "e1", label: "Налог / НДС", kind: "percent", value: 0 }];
    const c = calc(rooms, 25);
    const res = await roundTrip({ project: "Нулевой сбор", rooms, grand: c.grand, clientTotal: c.clientTotal,
      markupPct: 25, extras, budget: 200000, mode: "work" });
    expect(res.extras).toHaveLength(1);
    expect(res.extras[0]).toMatchObject({ label: "Налог / НДС", kind: "percent", value: 0 });
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

describe("FF&E-детали позиции: артикул/материал/габариты/срок/запас в выгрузке и обратном импорте", () => {
  const rooms = [{ name: "Гостиная", items: [
    { title: "Диван «Морти»", cat: "Мебель", price: 164900, qty: 1, sku: "MT-2200", material: "велюр, олива",
      dims: { w: 220, d: 95, h: 78 }, leadWeeks: 8, wastePct: 10 },
    { title: "Стол обеденный", cat: "Мебель", price: 60000, qty: 1, material: "дуб" },   // только материал, без unit → шт
    { title: "Плитка керамогранит", cat: "Отделка", price: 1200, qty: 18, unit: "м²", wastePct: 5 },  // unit + запас (естественная пара)
  ] }];

  it("рабочий режим: все поля спецификации переживают round-trip (габариты → {w,d,h}; unit)", async () => {
    const c = calc(rooms, 30);
    const res = await roundTrip({ project: "FFE", rooms, grand: c.grand, clientTotal: c.clientTotal,
      markupPct: 30, budget: 500000, mode: "work" });
    expect(byTitle(res, "Диван «Морти»")).toMatchObject({ sku: "MT-2200", material: "велюр, олива", leadWeeks: 8, wastePct: 10 });
    expect(byTitle(res, "Диван «Морти»").dims).toMatchObject({ w: 220, d: 95, h: 78 });
    expect(byTitle(res, "Плитка керамогранит")).toMatchObject({ unit: "м²", qty: 18, wastePct: 5 });   // единица доехала
    expect(byTitle(res, "Стол обеденный").material).toBe("дуб");
    expect(byTitle(res, "Стол обеденный").sku).toBeUndefined();   // пусто → колонки нет / поля нет
    expect(byTitle(res, "Стол обеденный").wastePct).toBeUndefined();
    expect(byTitle(res, "Стол обеденный").unit).toBeUndefined();  // «шт» = дефолт, не хранится
    expect(byTitle(res, "Диван «Морти»").unit).toBeUndefined();   // тоже шт
    // деньги: цена в выгрузке/импорте — СЫРАЯ (164900), запас не задваивается при round-trip;
    // себестоимость с запасом считается уже из price+wastePct через FFE.lineTotal
    const sofa = byTitle(res, "Диван «Морти»");
    expect(sofa.price).toBe(164900);                  // сырая цена, НЕ 164900×1.1
    expect(FFE.lineTotal(sofa)).toBe(181390);         // 164900 × 1.10 × 1 — запас доехал в деньги
  });

  it("клиентский режим: артикул, срок и запас — внутренняя кухня, в файл не утекают; материал/габариты остаются", async () => {
    const c = calc(rooms, 30);
    const res = await roundTrip({ project: "FFE клиенту", rooms, grand: c.grand, clientTotal: c.clientTotal,
      markupPct: 30, budget: 500000, mode: "client" });
    const sofa = byTitle(res, "Диван «Морти»");
    expect(sofa.material).toBe("велюр, олива");
    expect(sofa.dims).toMatchObject({ w: 220, d: 95, h: 78 });
    expect(sofa.sku).toBeUndefined();
    expect(sofa.leadWeeks).toBeUndefined();
    expect(sofa.wastePct).toBeUndefined();
    // единица — НЕ внутренняя кухня: клиент видит «18 м²», поле переживает клиентский round-trip
    expect(byTitle(res, "Плитка керамогранит").unit).toBe("м²");
  });

  it("закупочный лист: артикул/материал/габариты/запас/единица доходят до поставщика", async () => {
    const res = await roundTrip({ project: "FFE закупка", rooms, grand: 224900, budget: 500000, mode: "procure" });
    expect(byTitle(res, "Диван «Морти»")).toMatchObject({ sku: "MT-2200", material: "велюр, олива", leadWeeks: 8, wastePct: 10 });
    expect(byTitle(res, "Диван «Морти»").dims).toMatchObject({ w: 220, d: 95, h: 78 });
    expect(byTitle(res, "Плитка керамогранит").unit).toBe("м²");
  });
});

describe("K3: режим «Спецификация» — экспорт без денег вообще (строже клиентского)", () => {
  const rooms = [{ name: "Гостиная", items: [
    { title: "Диван «Морти»", cat: "Мебель", price: 164900, qty: 1, sku: "MT-2200", material: "велюр, олива",
      dims: { w: 220, d: 95, h: 78 }, leadWeeks: 8, wastePct: 10, sup: "Линея", rrp: 200000 },
  ] }];
  let wb, name;

  beforeAll(() => {
    captured = null;
    expect(X.exportRoomSpec({ project: "Спека", rooms, grand: 0, clientTotal: 0, markupPct: 30, budget: 0, mode: "spec" })).toBe(true);
    ({ wb, name } = captured);
  });

  it("«Все позиции» — ни одной денежной/закупочно-финансовой колонки; артикул/срок/запас остаются (в отличие от клиентского)", () => {
    const aoa = XLSXReal.utils.sheet_to_json(wb.Sheets["Все позиции"], { header: 1 });
    const head = aoa[0];
    ["Цена, ₽", "Сумма, ₽", "Цена клиенту, ₽", "Сумма клиенту, ₽", "Розница/ед., ₽", "Выгода, ₽", "Поставщик", "Клиент решил", "Цена от"].forEach((h) => {
      expect(head).not.toContain(h);
    });
    ["Артикул", "Срок, нед.", "Запас, %", "Материал", "Габариты", "Код"].forEach((h) => {
      expect(head).toContain(h);
    });
  });

  it("«Свод» — без единой суммы, только количество позиций по помещениям", () => {
    const aoa = XLSXReal.utils.sheet_to_json(wb.Sheets["Свод"], { header: 1 });
    expect(JSON.stringify(aoa)).not.toMatch(/Себестоимость|Наценка|ИТОГО|Подытог/);
    expect(aoa.some((row) => row[0] === "Итого позиций")).toBe(true);
  });

  it("суффикс имени файла — «-specifikaciya», не путается с рабочим/клиентским", () => {
    expect(name).toMatch(/-specifikaciya\.xlsx$/);
  });
});

/* импорт рукотворного/чужого файла (строим лист напрямую, минуя exportRoomSpec) —
   проверяем защиту от мусорных данных на входе */
async function importAoa(aoa, sheetName) {
  const wb = XLSXReal.utils.book_new();
  XLSXReal.utils.book_append_sheet(wb, XLSXReal.utils.aoa_to_sheet(aoa), sheetName || "Лист1");
  const buf = XLSXReal.write(wb, { type: "array", bookType: "xlsx" });
  return X.importRoomSpec({ name: "чужой.xlsx", _buf: buf });
}

describe("импорт: защита от мусора на входе", () => {
  it("неизвестная единица (не из FFE_UNITS) отбрасывается, известная — сохраняется", async () => {
    const res = await importAoa([
      ["Помещение", "Наименование", "Кол-во", "Ед.", "Цена, ₽"],
      ["Гостиная", "Ковролин", 10, "рулон", 1000],   // «рулон» нет в словаре
      ["Гостиная", "Плитка", 8, "м²", 1200],          // «м²» есть
    ]);
    expect(byTitle(res, "Ковролин").unit).toBeUndefined();   // мусор не сохранён
    expect(byTitle(res, "Плитка").unit).toBe("м²");
  });

  it("цена из «Суммы» без колонки «Цена» при наличии запаса — запас не задваивается", async () => {
    // Сумма 11000 = цена 1000 × кол 10 × (1+10%); без фикса цена вышла бы 1100 → lineTotal задвоил бы запас
    const res = await importAoa([
      ["Помещение", "Наименование", "Кол-во", "Запас, %", "Сумма, ₽"],
      ["Ванная", "Плитка", 10, 10, 11000],
    ]);
    const tile = byTitle(res, "Плитка");
    expect(tile.price).toBe(1000);                 // запас вычтен из выведенной цены
    expect(tile.wastePct).toBe(10);
    expect(FFE.lineTotal(tile)).toBe(11000);       // совпадает с исходной «Суммой», не 12100
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

describe("доп. сборы видны клиенту (не внутренняя кухня, в отличие от sku/leadWeeks/wastePct)", () => {
  const rooms = [{ name: "Гостиная", items: [{ title: "Диван", cat: "Мебель", price: 100000, qty: 1 }] }];
  const extras = [{ id: "e1", label: "Налог / НДС", kind: "percent", value: 20 }];
  let res;

  beforeAll(async () => {
    const c = calc(rooms, 25);
    res = await roundTrip({ project: "Клиенту со сбором", rooms, grand: c.grand, clientTotal: c.clientTotal,
      markupPct: 25, extras, budget: 200000, mode: "client" });
  });

  it("сбор доезжает до клиентского файла и обратно", () => {
    expect(res.extras).toHaveLength(1);
    expect(res.extras[0]).toMatchObject({ label: "Налог / НДС", kind: "percent", value: 20 });
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
    expect(res.extras).toBeUndefined();
  });
});

describe("RRP-слой: розница/выгода в выгрузке и обратном импорте (роадмап п.17)", () => {
  const rooms = [{ name: "Гостиная", items: [
    { title: "Диван «Морти»", cat: "Мебель", price: 129000, rrp: 189000, qty: 1 },
    { title: "Стол", cat: "Мебель", price: 60000, qty: 1 },   // без розницы — ячейки пустые, поля нет
  ] }];

  it("рабочий режим: rrp — сырая величина, переживает round-trip; колонка розницы не подменяет цену", async () => {
    const c = calc(rooms, 25);
    const res = await roundTrip({ project: "RRP", rooms, grand: c.grand, clientTotal: c.clientTotal,
      markupPct: 25, budget: 500000, mode: "work" });
    expect(byTitle(res, "Диван «Морти»").rrp).toBe(189000);
    expect(byTitle(res, "Диван «Морти»").price).toBe(129000);   // «Розница/ед., ₽» не съедена как cPrice
    expect(byTitle(res, "Стол").rrp).toBeUndefined();
  });

  it("клиентский режим: розница видна клиенту, клиентские цены не наценяются второй раз", async () => {
    const c = calc(rooms, 25);
    const res = await roundTrip({ project: "RRP клиенту", rooms, grand: c.grand, clientTotal: c.clientTotal,
      markupPct: 25, budget: 500000, mode: "client" });
    expect(byTitle(res, "Диван «Морти»").rrp).toBe(189000);
    expect(byTitle(res, "Диван «Морти»").price).toBe(161250);   // unitClient 129000×1.25, наценка не задвоена
    expect(res.markupPct).toBe(0);                              // клиентский файл — 0% сильнее «Свода»
  });

  it("rrp + запас: розница в файле сырая, запас не задваивается при переэкспорте", async () => {
    const rr = [{ name: "К", items: [{ title: "Плитка", price: 1000, rrp: 1500, qty: 10, wastePct: 10 }] }];
    const c = calc(rr, 0);
    const res = await roundTrip({ project: "RRP запас", rooms: rr, grand: c.grand, clientTotal: c.clientTotal,
      markupPct: 0, budget: 0, mode: "work" });
    expect(byTitle(res, "Плитка").rrp).toBe(1500);
    expect(FFE.rrpLine(byTitle(res, "Плитка"))).toBe(16500);    // 1500 × 1.10 × 10 — запас считается из полей
  });
});

describe("RRP-слой: столбец «Выгода» бьётся со своим «Итого» (net, не клип >0) — найдено ревью", () => {
  // одна позиция с розницей ВЫШЕ цены клиенту (выгода +), одна — где наценка вывела клиента
  // ВЫШЕ розницы (выгода −). Глобальная выгода всё ещё > 0 → «Итого» показывается; построчные
  // ячейки должны суммироваться ровно в него (net), а не в завышенный клип-итог.
  const rooms = [{ name: "Гостиная", items: [
    { title: "Диван", cat: "Мебель", price: 100000, rrp: 189000, qty: 1 },   // +64000 при 25% (125000 < 189000)
    { title: "Люстра", cat: "Свет",  price: 100000, rrp: 110000, qty: 1 },   // −15000 при 25% (125000 > 110000)
  ] }];
  let master, roomSheet, cp;
  beforeAll(() => {
    cp = FFE.clientPricing({ rooms, markup: 25 });
    captured = null;
    expect(X.exportRoomSpec({ project: "RRP net", rooms, grand: calc(rooms, 25).grand,
      clientTotal: cp.client, markupPct: 25, budget: 500000, mode: "work" })).toBe(true);
    master = XLSXReal.utils.sheet_to_json(captured.wb.Sheets["Все позиции"], { header: 1, raw: true });
    roomSheet = XLSXReal.utils.sheet_to_json(captured.wb.Sheets["Гостиная"], { header: 1, raw: true });
  });

  const colSum = (aoa, headerRowIdx, colName, totalTitle) => {
    const head = aoa[headerRowIdx];
    const cv = head.indexOf(colName), cn = head.indexOf("Наименование");
    const total = aoa.find((r) => r[cn] === totalTitle);
    const data = aoa.slice(headerRowIdx + 1).filter((r) => r[cn] && r[cn] !== totalTitle);
    const sum = data.reduce((s, r) => s + (typeof r[cv] === "number" ? r[cv] : 0), 0);
    return { total: total[cv], sum, cv, cn, data };
  };

  it("глобальная выгода положительна, но одна позиция ушла в минус — данные согласованы", () => {
    expect(cp.savings).toBe(49000);          // 64000 − 15000
    expect(cp.lineSavings(rooms[0].items[1])).toBe(-15000);   // Люстра: клиент выше розницы
  });

  it("мастер-таблица «Все позиции»: Σ построчной «Выгоды» = ячейка «Итого» = FFE.savings", () => {
    const { total, sum, cv, cn, data } = colSum(master, 0, "Выгода, ₽", "Итого по позициям");
    expect(sum).toBe(total);                 // столбец сходится со своим итогом
    expect(total).toBe(cp.savings);          // и это честный net из FFE, а не завышенный клип
    // отрицательная строка присутствует КАК ЕСТЬ (net), а не спрятана пустой ячейкой
    expect(data.find((r) => r[cn] === "Люстра")[cv]).toBe(-15000);
  });

  it("лист комнаты «Гостиная»: тот же инвариант — столбец «Выгода» = «Итого по комнате»", () => {
    const hi = roomSheet.findIndex((r) => Array.isArray(r) && r.includes("Выгода, ₽"));
    const { total, sum } = colSum(roomSheet, hi, "Выгода, ₽", "Итого по комнате");
    expect(sum).toBe(total);
    expect(total).toBe(cp.savings);
  });
});

describe("Док-коды позиций (K1): колонка «Код» — экспорт и round-trip", () => {
  const rooms = [{ name: "Гостиная", items: [
    { title: "Диван", cat: "Мебель", price: 100000, qty: 1 },
    { title: "Люстра", cat: "Освещение", price: 20000, qty: 1, code: "СВ-99" },   // ручной override
  ] }];
  let master, res;
  beforeAll(async () => {
    captured = null;
    const c = calc(rooms, 20);
    expect(X.exportRoomSpec({ project: "Коды", rooms, grand: c.grand, clientTotal: c.clientTotal,
      markupPct: 20, budget: 0, mode: "work" })).toBe(true);
    master = XLSXReal.utils.sheet_to_json(captured.wb.Sheets["Все позиции"], { header: 1, raw: true });
    res = await roundTrip({ project: "Коды", rooms, grand: c.grand, clientTotal: c.clientTotal,
      markupPct: 20, budget: 0, mode: "work" });
  });

  it("экспорт добавляет колонку «Код» с авто-кодом и уважает ручной override", () => {
    const head = master[0];
    const cCode = head.indexOf("Код");
    expect(cCode).toBeGreaterThanOrEqual(0);
    const codeOfTitle = (t) => { const row = master.find((r) => r.includes(t)); return row[cCode]; };
    expect(codeOfTitle("Диван")).toBe("МБ-01");    // авто по разделу «Мебель»
    expect(codeOfTitle("Люстра")).toBe("СВ-99");   // ручной override сохранён
  });

  it("round-trip: коды возвращаются в позиции (импорт читает колонку «Код»)", () => {
    expect(byTitle(res, "Диван").code).toBe("МБ-01");
    expect(byTitle(res, "Люстра").code).toBe("СВ-99");
  });
});
