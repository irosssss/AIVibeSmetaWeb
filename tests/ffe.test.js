/* Юнит-тесты схемы позиции FF&E (web/ffe.js) — согласование с клиентом по позициям
   (волна A1 бенчмарка Programa). ffe.js — IIFE, пишет API в window.LedgerFFE. */
import { describe, it, expect, beforeAll } from "vitest";

let FFE;
beforeAll(async () => {
  globalThis.window = globalThis.window || {};
  await import("../web/ffe.js");
  FFE = globalThis.window.LedgerFFE;
});

describe("APPROVE_STATUSES — словарь решений клиента", () => {
  it("четыре статуса, pending — дефолт", () => {
    expect(FFE.APPROVE_STATUSES.map((s) => s.id)).toEqual(["pending", "ok", "revise", "rejected"]);
    expect(FFE.approveMeta("нет такого").id).toBe("pending");
    expect(FFE.approveMeta("ok").label).toBe("Согласовано");
  });
});

describe("blankPosition/normalizePosition — поля согласования", () => {
  it("валидное решение с датой переживает нормализацию", () => {
    const p = FFE.normalizePosition({ title: "Диван", price: 100, approve: "ok", approveAt: "2026-07-08" });
    expect(p.approve).toBe("ok");
    expect(p.approveAt).toBe("2026-07-08");
  });
  it("мусорное и pending-решение не сохраняются (отсутствие = ждёт решения)", () => {
    expect(FFE.blankPosition({ approve: "garbage" }).approve).toBe("");
    expect(FFE.blankPosition({ approve: "pending" }).approve).toBe("");
    expect(FFE.blankPosition({}).approve).toBe("");
  });
  it("решение не зависит от стадии закупки (отдельные измерения)", () => {
    const p = FFE.blankPosition({ approve: "rejected", status: "ordered" });
    expect(p.approve).toBe("rejected");
    expect(p.status).toBe("ordered");
  });
  it("поставщик — канон sup; supplier принимается как legacy-алиас входа, но не эмитится", () => {
    // защита от повторного разъезда sup/supplier (ревью волны Ч2/Ч3/Ч4):
    // весь живой путь (сид, редактор, PDF, xlsx, портал) читает it.sup
    expect(FFE.blankPosition({ sup: "Фабрика А" }).sup).toBe("Фабрика А");
    expect(FFE.blankPosition({ supplier: "Фабрика Б" }).sup).toBe("Фабрика Б"); // алиас входа
    expect(FFE.blankPosition({ sup: "Приоритет", supplier: "Игнор" }).sup).toBe("Приоритет"); // sup важнее
    expect("supplier" in FFE.blankPosition({ sup: "X" })).toBe(false); // выхода supplier больше нет
  });
});

describe("blankProduct — мастер-запись товара студии (волна B1)", () => {
  it("нормализует типы и дефолты, поставщик в поле sup", () => {
    const p = FFE.blankProduct({ title: "  Диван  ", price: "164 900 ₽", supplier: "Линея", sku: "SF-01", dims: { w: "220", h: 85 } });
    expect(p.title).toBe("Диван");
    expect(p.price).toBe(164900);       // «164 900 ₽» → целое
    expect(p.sup).toBe("Линея");        // supplier → sup
    expect(p.article).toBe("SF-01");    // sku → article
    expect(p.cat).toBe("Прочее");       // дефолт раздела
    expect(p.unit).toBe("шт");          // дефолт единицы
    expect(p.dims).toEqual({ w: 220, d: "", h: 85 }); // пустые остаются пустыми
  });
  it("без количества/стадии/согласования — это не поля каталога", () => {
    const p = FFE.blankProduct({ title: "Кресло", qty: 5, status: "ordered", approve: "ok" });
    expect(p.qty).toBeUndefined();
    expect(p.status).toBeUndefined();
    expect(p.approve).toBeUndefined();
  });
  it("свежесть цены и артикул фида (волна B3/B4) — пусто по умолчанию, сохраняются если заданы", () => {
    expect(FFE.blankProduct({ title: "Стол" }).priceDate).toBe("");
    expect(FFE.blankProduct({ title: "Стол" }).feedSku).toBe("");
    const p = FFE.blankProduct({ title: "Стол", priceDate: "2026-06-01", feedSku: "FCT-4471" });
    expect(p.priceDate).toBe("2026-06-01");
    expect(p.feedSku).toBe("FCT-4471");
  });
});

describe("варианты товара — цвет со своим артикулом (портал поставщиков, срез 1)", () => {
  it("нормализует варианты: HEX строгий, цена целая, пустые строки формы отбрасываются", () => {
    const p = FFE.blankProduct({ title: "Диван", brand: "Loft&Co", variants: [
      { color: "Графит", colorHex: "#4a4e57", article: "SF-GR", price: "172 900 ₽" },
      { color: "Беж", colorHex: "не hex", sku: "SF-BG" },       // sku-алиас + битый hex
      { color: "", colorHex: "", article: "", price: "" },       // пустая строка формы
    ] });
    expect(p.brand).toBe("Loft&Co");
    expect(p.variants).toHaveLength(2);
    expect(p.variants[0]).toEqual({ color: "Графит", colorHex: "#4A4E57", article: "SF-GR", price: 172900 });
    expect(p.variants[1]).toEqual({ color: "Беж", colorHex: "", article: "SF-BG", price: "" });
  });
  it("вариантов и бренда нет по умолчанию — пустые", () => {
    const p = FFE.blankProduct({ title: "Стол" });
    expect(p.variants).toEqual([]);
    expect(p.brand).toBe("");
  });
  it("productWithVariant: артикул/цена варианта перекрывают базовые, цвет → material, variants срезаны", () => {
    const base = FFE.blankProduct({ title: "Диван", article: "SF-3200", price: 164900,
      variants: [{ color: "Зелёный", colorHex: "#2F4A3C", article: "SF-3200-GN", price: 172900 }] });
    const merged = FFE.productWithVariant(base, base.variants[0]);
    expect(merged.article).toBe("SF-3200-GN");
    expect(merged.price).toBe(172900);
    expect(merged.material).toBe("Зелёный");
    expect(merged.title).toBe("Диван");            // цвет живёт в material, название не трогаем
    expect("variants" in merged).toBe(false);       // транзиентная запись — в хранилище не пишется
  });
  it("productWithVariant: вариант без своей цены/артикула — остаются базовые", () => {
    const base = FFE.blankProduct({ title: "Диван", article: "SF-3200", price: 164900,
      variants: [{ color: "Графит" }] });
    const merged = FFE.productWithVariant(base, base.variants[0]);
    expect(merged.article).toBe("SF-3200");
    expect(merged.price).toBe(164900);
    expect(merged.material).toBe("Графит");
  });
  it("вариант доезжает до позиции сметы: артикул → sku, цвет → material", () => {
    const base = FFE.blankProduct({ title: "Диван", article: "SF-3200", price: 164900, sup: "Фабрика",
      variants: [{ color: "Графит", article: "SF-3200-GR" }] });
    const pos = FFE.positionFromProduct(FFE.productWithVariant(base, base.variants[0]), "2026-07-14");
    expect(pos).toMatchObject({ title: "Диван", qty: 1, price: 164900, sup: "Фабрика", sku: "SF-3200-GR", material: "Графит" });
  });
});

describe("мапперы позиция ↔ товар библиотеки", () => {
  it("позиция сметы → мастер-запись (sup сохраняется)", () => {
    const prod = FFE.productFromPosition({ title: "Люстра", cat: "Освещение", price: 57000, sup: "Дубрава", qty: 3, approve: "ok" });
    expect(prod.title).toBe("Люстра");
    expect(prod.cat).toBe("Освещение");
    expect(prod.price).toBe(57000);
    expect(prod.sup).toBe("Дубрава");
    expect(prod.qty).toBeUndefined();   // количество/решение в каталог не едут
    expect(prod.approve).toBeUndefined();
  });
  it("мастер-запись → черновик позиции (кол-во 1, дата цены проставлена)", () => {
    const pos = FFE.positionFromProduct({ title: "Ковёр", cat: "Декор", price: 41900, sup: "Линея" }, "2026-07-08");
    expect(pos).toMatchObject({ title: "Ковёр", qty: 1, price: 41900, cat: "Декор", sup: "Линея", priceDate: "2026-07-08" });
  });
  it("пустые раздел/поставщик в позицию не попадают", () => {
    const pos = FFE.positionFromProduct({ title: "Пуф", price: 12000 }, "2026-07-08");
    expect(pos.title).toBe("Пуф");
    expect(pos.qty).toBe(1);
    expect("cat" in pos).toBe(false);
    expect("sup" in pos).toBe(false);
    expect("sku" in pos).toBe(false);
    expect("dims" in pos).toBe(false);
    expect("unit" in pos).toBe(false);
  });
  it("FF&E-детали товара доезжают до позиции: артикул → sku, url/габариты/единица (срез 1 портала поставщиков)", () => {
    const prod = FFE.blankProduct({ title: "Плитка", unit: "м²", article: "TL-88", url: "https://x.ru/t", dims: { w: 60, d: 60 }, price: 2900 });
    const pos = FFE.positionFromProduct(prod, "2026-07-14");
    expect(pos.sku).toBe("TL-88");
    expect(pos.url).toBe("https://x.ru/t");
    expect(pos.unit).toBe("м²");
    expect(pos.dims).toEqual({ w: 60, d: 60, h: "" });
  });
  it("round-trip позиция → товар → позиция сохраняет название/цену/раздел/поставщика", () => {
    const src = { title: "Стол дуб", cat: "Мебель", price: 44900, sup: "Дубрава" };
    const back = FFE.positionFromProduct(FFE.productFromPosition(src), "2026-07-08");
    expect(back).toMatchObject({ title: "Стол дуб", qty: 1, price: 44900, cat: "Мебель", sup: "Дубрава" });
  });
  it("давность цены переезжает вместе с товаром — библиотека не «освежает» молча (волна B3)", () => {
    // позиция с известной (возможно старой) датой проверки цены → товар → обратно в позицию:
    // дата должна пережить обе стороны round-trip, а не молча замениться на «сегодня»
    const prod = FFE.productFromPosition({ title: "Кресло", price: 68750, priceDate: "2026-05-01" });
    expect(prod.priceDate).toBe("2026-05-01");
    const pos = FFE.positionFromProduct(prod, "2026-07-08"); // явная дата-параметр не должна перебить свою дату товара
    expect(pos.priceDate).toBe("2026-05-01");
  });
  it("товар без своей даты — берёт переданную дату, иначе сегодня", () => {
    const posWithArg = FFE.positionFromProduct({ title: "Пуф", price: 12000 }, "2026-07-01");
    expect(posWithArg.priceDate).toBe("2026-07-01");
    const posNoArg = FFE.positionFromProduct({ title: "Пуф", price: 12000 });
    expect(posNoArg.priceDate).toBe(FFE.today());
  });
});

describe("images — мультифото позиции (K5c: img = главное, images[] = доп. ракурсы)", () => {
  it("normalizePosition: массив тримится и чистится от пустых, не-массив/отсутствие → []", () => {
    const p = FFE.normalizePosition({ title: "Диван", price: 1000, img: "a.jpg", images: [" b.jpg ", "", "c.jpg", null] });
    expect(p.img).toBe("a.jpg");                       // главное фото не тронуто
    expect(p.images).toEqual(["b.jpg", "c.jpg"]);
    expect(FFE.normalizePosition({ title: "X", price: 1, images: "не массив" }).images).toEqual([]);
    expect(FFE.normalizePosition({ title: "X", price: 1 }).images).toEqual([]);
  });
  it("старые позиции без images проходят нормализацию без изменений остальной схемы", () => {
    const old = { title: "Кресло", price: 58000, qty: 1, img: "x.jpg", sku: "AR-118" };
    const p = FFE.normalizePosition(old);
    expect(p.images).toEqual([]);
    expect(p.img).toBe("x.jpg");
    expect(p.sku).toBe("AR-118");
  });
});

describe("blankSupplier/supplierMatch — адресная книга поставщиков (K5a)", () => {
  it("blankSupplier нормализует строки, принимает sup-алиас, отбрасывает чужие поля", () => {
    const s = FFE.blankSupplier({ name: "  Линея  ", contact: "Иван", email: "i@lineya.ru", phone: "+7 900", url: "https://lineya.ru", city: "Москва", note: "скидка 10%", qty: 5, price: 100 });
    expect(s).toEqual({ name: "Линея", contact: "Иван", email: "i@lineya.ru", phone: "+7 900", url: "https://lineya.ru", city: "Москва", note: "скидка 10%" });
    expect(FFE.blankSupplier({ sup: "Дубрава" }).name).toBe("Дубрава");   // алиас sup → name (маппинг с позиции)
    expect(FFE.blankSupplier().name).toBe("");
  });
  it("supplierMatch находит карточку по имени: регистр и краевые пробелы нетерпимы, нечёткости нет", () => {
    const book = [{ name: "Линея", email: "a@b.ru" }, { name: "Фабрика мягкой мебели" }];
    expect(FFE.supplierMatch(book, "линея").email).toBe("a@b.ru");
    expect(FFE.supplierMatch(book, "  ЛИНЕЯ  ").email).toBe("a@b.ru");
    expect(FFE.supplierMatch(book, "Линея Мебель")).toBe(null);   // другой поставщик — не подстрока
    expect(FFE.supplierMatch(book, "")).toBe(null);
    expect(FFE.supplierMatch(book, "   ")).toBe(null);
    expect(FFE.supplierMatch(null, "Линея")).toBe(null);          // реестр ещё не загружен — не падаем
    expect(FFE.supplierMatch([{ name: null }, { name: "Линея" }], "линея").name).toBe("Линея"); // битая запись не роняет поиск
  });
});

describe("DEMO_LIBRARY_PRODUCTS — сид демо-товаров пустой библиотеки (K4)", () => {
  it("непустой набор, каждая запись чисто нормализуется через blankProduct (защита от опечатки в сид-данных)", () => {
    const demo = FFE.DEMO_LIBRARY_PRODUCTS;
    expect(Array.isArray(demo)).toBe(true);
    expect(demo.length).toBeGreaterThanOrEqual(6);
    demo.forEach((raw) => {
      const p = FFE.blankProduct(raw);
      expect(p.title.length).toBeGreaterThan(0);          // название обязательно (иначе товар-призрак)
      expect(p.cat.length).toBeGreaterThan(0);            // раздел задан (не свалится в «Прочее» по опечатке)
      expect(Number.isInteger(p.price)).toBe(true);       // цена — целое ₽ после нормализации
      expect(p.price).toBeGreaterThan(0);                 // демо с нулевой ценой бессмысленно
      ["w", "d", "h"].forEach((k) => { if (p.dims[k] !== "") expect(p.dims[k]).toBeGreaterThanOrEqual(0); });
    });
  });
  it("разделы демо-набора — из известных категорий (витрина разных разделов, а не один)", () => {
    const cats = new Set(FFE.DEMO_LIBRARY_PRODUCTS.map((p) => FFE.blankProduct(p).cat));
    expect(cats.size).toBeGreaterThanOrEqual(4);          // минимум 4 разных раздела для наглядности
  });
});

describe("clientPricing — инвариант клиентских цен (портал = клиентский режим сметы)", () => {
  it("базовая наценка + оверрайд раздела + скидка/доставка/монтаж", () => {
    const snap = {
      rooms: [{ name: "A", items: [
        { title: "X", price: 1000, qty: 2, cat: "Мебель" },
        { title: "Y", price: 500, qty: 1, cat: "Декор" },
      ] }],
      markup: 25, catMarkup: { "Декор": 40 }, discount: 10, delivery: 3000, install: 2000,
    };
    const cp = FFE.clientPricing(snap);
    const [x, y] = snap.rooms[0].items;
    expect(cp.unitClient(x)).toBe(1250);   // 1000 × 1.25 (округляем цену за штуку)
    expect(cp.lineClient(x)).toBe(2500);
    expect(cp.unitClient(y)).toBe(700);    // 500 × 1.40 — оверрайд раздела «Декор»
    expect(cp.client).toBe(3200);
    expect(cp.discountAmt).toBe(320);      // 10% от 3200
    expect(cp.totalClient).toBe(7880);     // 3200 − 320 + 3000 + 2000
  });
  it("доп. сборы (extras): percent-сборы считаются от одной и той же базы, не каскадом", () => {
    const snap = {
      rooms: [{ name: "A", items: [
        { title: "X", price: 1000, qty: 2, cat: "Мебель" },
        { title: "Y", price: 500, qty: 1, cat: "Декор" },
      ] }],
      markup: 25, catMarkup: { "Декор": 40 }, discount: 10, delivery: 3000, install: 2000,
      extras: [
        { id: "e1", label: "Налог / НДС", kind: "percent", value: 20 },
        { id: "e2", label: "Сервис", kind: "percent", value: 10 },
        { id: "e3", label: "Упаковка", kind: "fixed", value: 1000 },
      ],
    };
    const cp = FFE.clientPricing(snap);
    // база — client(3200) − discountAmt(320) = 2880, ОДНА и та же для обоих percent-сборов
    // (если бы считали каскадом, e2 брал бы базу 2880+576=3456 → 346, а не 288)
    expect(cp.extrasAmt).toBe(576 + 288 + 1000);   // 1864
    expect(cp.totalClient).toBe(3200 - 320 + 3000 + 2000 + 1864);   // 9744
    expect(cp.extras).toBe(snap.extras);   // возвращается как есть, для портала/UI
  });
  it("без раздела — базовая наценка; пустой снимок = 0", () => {
    const cp = FFE.clientPricing({ rooms: [{ items: [{ title: "Z", price: 100, qty: 1 }] }], markup: 20 });
    expect(cp.unitClient({ price: 100 })).toBe(120);
    expect(cp.totalClient).toBe(120);
    expect(FFE.clientPricing({}).totalClient).toBe(0);
  });
  it("запас/отход (wastePct): наценка — поверх себестоимости с запасом, не поверх сырой цены", () => {
    const it_ = { title: "Плитка", price: 1000, qty: 2, wastePct: 10, cat: "Отделка" };
    const cp = FFE.clientPricing({ rooms: [{ items: [it_] }], markup: 0 });
    expect(FFE.costUnit(it_)).toBe(1100);           // 1000 × 1.10
    expect(cp.costUnit(it_)).toBe(1100);
    expect(cp.unitClient(it_)).toBe(1100);          // наценка 0% — клиент платит ровно себестоимость с запасом
    expect(cp.lineClient(it_)).toBe(2200);          // 1100 × 2
    expect(FFE.lineTotal(it_)).toBe(2200);
    const cpMarkup = FFE.clientPricing({ rooms: [{ items: [it_] }], markup: 25 });
    expect(cpMarkup.unitClient(it_)).toBe(1375);    // 1100 × 1.25 — наценка поверх запаса
    expect(cpMarkup.lineClient(it_)).toBe(2750);
  });
  it("wastePct=0/отсутствует — не меняет прежнее поведение", () => {
    const it_ = { title: "X", price: 1000, qty: 1 };
    expect(FFE.costUnit(it_)).toBe(1000);
    expect(FFE.lineTotal(it_)).toBe(1000);
  });
});

describe("qtyLabel — подпись количества с единицей измерения", () => {
  it("шт → ×N (без единицы), прочие единицы → ×N ед.", () => {
    expect(FFE.qtyLabel({ qty: 2, unit: "шт" })).toBe("×2");
    expect(FFE.qtyLabel({ qty: 2 })).toBe("×2");            // unit отсутствует = шт
    expect(FFE.qtyLabel({ qty: 50, unit: "м²" })).toBe("×50 м²");
    expect(FFE.qtyLabel({ qty: 3, unit: "пог.м" })).toBe("×3 пог.м");
    expect(FFE.qtyLabel({ unit: "компл" })).toBe("×1 компл");   // qty по умолчанию 1
  });
});

describe("портал-шара — публикация снимка и ответы клиента (волна A2)", () => {
  beforeAll(() => {
    const store = {};
    globalThis.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    };
  });
  it("создание → загрузка → ответ клиента (approve) → снятие; несуществующая = null", () => {
    const rec = FFE.createPortalShare({ projectName: "Кирова", versionLabel: "v1", studioName: "Студия Ирины Соколовой",
      snapshot: { rooms: [{ name: "A", items: [{ title: "X", price: 1000, qty: 1 }] }], markup: 25 } });
    expect(rec.shareId).toMatch(/^shr_/);
    expect(FFE.loadPortalShare(rec.shareId).projectName).toBe("Кирова");
    expect(FFE.loadPortalShare(rec.shareId).studioName).toBe("Студия Ирины Соколовой"); // брендинг портала (волна A5)
    expect(FFE.createPortalShare({ snapshot: {} }).studioName).toBe(""); // пусто без имени студии — фолбэк на аккаунт решает вызывающий код

    const upd = FFE.setPortalApprove(rec.shareId, 0, 0, "ok");
    expect(upd.snapshot.rooms[0].items[0].approve).toBe("ok");
    expect(upd.respondedAt).toBeTruthy();
    expect(FFE.loadPortalShare(rec.shareId).snapshot.rooms[0].items[0].approve).toBe("ok"); // персист

    const cleared = FFE.setPortalApprove(rec.shareId, 0, 0, "pending");
    expect("approve" in cleared.snapshot.rooms[0].items[0]).toBe(false);
    expect(FFE.loadPortalShare("shr_missing")).toBe(null);
  });
  it("genShareId: 32 hex-символа без смещения по base36 (найдено ревью — % 36 давал перекос младших цифр), не повторяется", () => {
    const ids = Array.from({ length: 20 }, () => FFE.createPortalShare({ snapshot: { rooms: [] } }).shareId);
    ids.forEach((id) => expect(id).toMatch(/^shr_[0-9a-f]{32}$/));
    expect(new Set(ids).size).toBe(ids.length);   // без коллизий на разумной выборке
  });
});

describe("ffeMeta — override видимости полей (K3, тумблеры приватности шары)", () => {
  const item = { sku: "ABC", material: "дуб", dims: { w: 80, d: 45, h: 120 }, leadWeeks: 6, wastePct: 10 };
  it("клиент по умолчанию — без артикула/срока/запаса, материал и габариты остаются", () => {
    const s = FFE.ffeMeta(item, { client: true });
    expect(s).not.toMatch(/арт\./);
    expect(s).not.toMatch(/нед\./);
    expect(s).not.toMatch(/запас/);
    expect(s).toMatch(/дуб/);
  });
  it("рабочая (client не передан) — показывает всё, как раньше", () => {
    const s = FFE.ffeMeta(item, {});
    expect(s).toMatch(/арт\. ABC/);
    expect(s).toMatch(/6 нед\./);
    expect(s).toMatch(/запас 10%/);
  });
  it("showSku/showLead/showWaste — точечный override включает поле даже в client-режиме (портал передаёт из тумблеров)", () => {
    const s = FFE.ffeMeta(item, { client: true, showSku: true, showLead: true, showWaste: true });
    expect(s).toMatch(/арт\. ABC/);
    expect(s).toMatch(/6 нед\./);
    expect(s).toMatch(/запас 10%/);
  });
});

describe("приватность шары (K3) — тумблеры видимости по аудитории (обобщение «SKU не клиенту»)", () => {
  beforeAll(() => {
    const store = {};
    globalThis.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    };
  });
  it("defaultShareVisibility — всё выключено (безопасный дефолт, поведение старых ссылок не меняется)", () => {
    expect(FFE.defaultShareVisibility()).toEqual({ supplier: false, sku: false, url: false, details: false });
  });
  it("createPortalShare без visibility проставляет дефолт", () => {
    const rec = FFE.createPortalShare({ snapshot: {} });
    expect(rec.visibility).toEqual({ supplier: false, sku: false, url: false, details: false });
  });
  it("createPortalShare принимает частичный override, остальное — дефолт", () => {
    const rec = FFE.createPortalShare({ snapshot: {}, visibility: { supplier: true } });
    expect(rec.visibility).toEqual({ supplier: true, sku: false, url: false, details: false });
  });
  it("setShareVisibility мержит patch поверх текущего состояния и персистит", () => {
    const rec = FFE.createPortalShare({ snapshot: {} });
    const upd = FFE.setShareVisibility(rec.shareId, { sku: true });
    expect(upd.visibility).toEqual({ supplier: false, sku: true, url: false, details: false });
    expect(FFE.loadPortalShare(rec.shareId).visibility.sku).toBe(true);
    const upd2 = FFE.setShareVisibility(rec.shareId, { url: true });
    expect(upd2.visibility).toEqual({ supplier: false, sku: true, url: true, details: false }); // предыдущий patch не потерян
  });
  it("setShareVisibility на несуществующей шаре — null", () => {
    expect(FFE.setShareVisibility("shr_missing", { sku: true })).toBe(null);
  });
});

describe("комментарии-треды на позиции (волна A3)", () => {
  beforeAll(() => {
    const store = {};
    globalThis.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    };
  });
  it("blankComment нормализует автора и обрезает текст", () => {
    const c = FFE.blankComment({ author: "client", text: "  берём  " });
    expect(c.id).toMatch(/^cm_/);
    expect(c.author).toBe("client");
    expect(c.text).toBe("берём");
    expect(FFE.blankComment({ author: "кто-то" }).author).toBe("studio"); // неизвестный автор → studio
  });
  it("addComment добавляет в конец треда, пустой текст игнорируется", () => {
    let thread = FFE.addComment([], "client", "а можно дешевле?");
    expect(thread).toHaveLength(1);
    thread = FFE.addComment(thread, "studio", "да, подберу аналог");
    expect(thread.map((c) => c.author)).toEqual(["client", "studio"]);
    expect(FFE.addComment(thread, "client", "   ")).toBe(thread); // пустой — без изменений
  });
  it("addPortalComment пишет в снимок портал-шары; respondedAt штампуется только клиенту", () => {
    const rec = FFE.createPortalShare({ projectName: "Кирова", versionLabel: "v1",
      snapshot: { rooms: [{ name: "A", items: [{ title: "X", price: 1000, qty: 1 }] }], markup: 25 } });
    const afterStudio = FFE.addPortalComment(rec.shareId, 0, 0, "studio", "уточните цвет");
    expect(afterStudio.snapshot.rooms[0].items[0].comments).toHaveLength(1);
    expect(afterStudio.respondedAt).toBeFalsy(); // ответ студии — не «клиент ответил»

    const afterClient = FFE.addPortalComment(rec.shareId, 0, 0, "client", "серый, пожалуйста");
    expect(afterClient.respondedAt).toBeTruthy();
    const persisted = FFE.loadPortalShare(rec.shareId).snapshot.rooms[0].items[0].comments;
    expect(persisted.map((c) => c.author)).toEqual(["studio", "client"]); // персист, порядок сохранён
    expect(FFE.addPortalComment("shr_missing", 0, 0, "client", "х")).toBe(null);
  });
});

describe("RRP-слой: розница и выгода клиента (роадмап п.17)", () => {
  it("rrp в схеме: пусто = не задана; нормализация — целое ≥0, терпимый парсер денег", () => {
    expect(FFE.blankPosition({}).rrp).toBe("");
    expect(FFE.normalizePosition({ title: "X", price: 100 }).rrp).toBe("");
    expect(FFE.normalizePosition({ title: "X", price: 100, rrp: "189 000 ₽" }).rrp).toBe(189000);
    expect(FFE.normalizePosition({ title: "X", price: 100, rrp: -5 }).rrp).toBe(0);
  });
  it("rrpUnit/rrpLine учитывают запас/отход симметрично costUnit (клиент платил бы за запас и в рознице)", () => {
    const it_ = { price: 1000, rrp: 1500, qty: 2, wastePct: 10 };
    expect(FFE.rrpUnit(it_)).toBe(1650);   // 1500 × 1.10, округление цены/ед.
    expect(FFE.rrpLine(it_)).toBe(3300);   // × кол-во
    expect(FFE.rrpLine({ price: 1000, qty: 3 })).toBe(0);   // без rrp — нуль, не NaN
  });
  it("clientPricing: выгода = розница − клиентская цена, строго по позициям с rrp", () => {
    const rooms = [{ items: [
      { title: "A", price: 100000, rrp: 160000, qty: 1 },
      { title: "B", price: 50000, qty: 2 },   // без rrp — в rrpTotal/savings не входит
    ] }];
    const cp = FFE.clientPricing({ rooms, markup: 25 });
    expect(cp.lineSavings(rooms[0].items[0])).toBe(35000);   // 160000 − 125000
    expect(cp.lineSavings(rooms[0].items[1])).toBe(0);
    expect(cp.rrpTotal).toBe(160000);
    expect(cp.savings).toBe(35000);
  });
  it("розница ниже клиентской цены — выгода отрицательная (математика не клипует, решают UI/выгрузки)", () => {
    const cp = FFE.clientPricing({ rooms: [{ items: [{ title: "A", price: 100000, rrp: 110000, qty: 1 }] }], markup: 25 });
    expect(cp.savings).toBe(-15000);   // клиенту 125000 > розницы 110000
  });
  it("выгода с запасом и наценкой раздела — та же цепочка округлений, что у клиентской цены", () => {
    const it_ = { title: "Плитка", price: 1000, rrp: 1500, qty: 10, wastePct: 10, cat: "Отделка" };
    const cp = FFE.clientPricing({ rooms: [{ items: [it_] }], markup: 25, catMarkup: { "Отделка": 10 } });
    // costUnit 1100 → unitClient 1210 (раздел +10%); rrpUnit 1650; выгода/ед. 440 × 10
    expect(cp.lineSavings(it_)).toBe(4400);
  });
});

describe("assignDocCodes — авто док-коды позиций (K1, паттерн Programa CH02/TB01)", () => {
  it("префикс по разделу + сквозная нумерация в порядке документа", () => {
    const rooms = [
      { name: "Гостиная", items: [
        { title: "Диван", cat: "Мебель" },
        { title: "Люстра", cat: "Освещение" },
        { title: "Кресло", cat: "Мягкая мебель" },
        { title: "Стол", cat: "Мебель" },
      ] },
      { name: "Спальня", items: [
        { title: "Кровать", cat: "Мебель" },
        { title: "Штора", cat: "Текстиль" },
      ] },
    ];
    const out = FFE.assignDocCodes(rooms);
    const codes = out.flatMap((r) => r.items.map((it) => it.code));
    expect(codes).toEqual(["МБ-01", "СВ-01", "ММ-01", "МБ-02", "МБ-03", "ТК-01"]);
  });

  it("ручной код = override, его номер зарезервирован (авто пропускают)", () => {
    const rooms = [{ name: "К", items: [
      { title: "A", cat: "Мебель" },
      { title: "B", cat: "Мебель", code: "МБ-05" },   // ручной
      { title: "C", cat: "Мебель" },
    ] }];
    const codes = FFE.assignDocCodes(rooms)[0].items.map((it) => it.code);
    expect(codes).toEqual(["МБ-01", "МБ-05", "МБ-02"]);   // C пропускает 05, но не 01/02
  });

  it("идемпотентна: повторный проход не меняет коды", () => {
    const rooms = [{ name: "К", items: [{ title: "A", cat: "Мебель" }, { title: "B", cat: "Свет" }] }];
    const once = FFE.assignDocCodes(rooms);
    const twice = FFE.assignDocCodes(once);
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
  });

  it("не мутирует вход (чистая функция) и не трогает исходные объекты", () => {
    const rooms = [{ name: "К", items: [{ title: "A", cat: "Мебель" }] }];
    FFE.assignDocCodes(rooms);
    expect(rooms[0].items[0].code).toBeUndefined();   // исходник без кода
  });

  it("свободная категория → префикс по первым буквам слов; пустая → ПЗ", () => {
    expect(FFE.docCodePrefix("Сантехника")).toBe("СН");   // известная
    expect(FFE.docCodePrefix("Ковролин")).toBe("КО");     // одно слово → первые 2 буквы
    expect(FFE.docCodePrefix("")).toBe("ПЗ");              // не задан
  });
});

describe("funnelStage — единый статус-чип строки (K2, паттерн Programa «один дропдаун»)", () => {
  it("нет решения, шара не создана → «Черновик»", () => {
    const s = FFE.funnelStage({ status: "specified" }, false);
    expect(s).toMatchObject({ id: "pending", label: "Черновик", locked: false });
  });
  it("нет решения, шара создана → «На согласовании»", () => {
    const s = FFE.funnelStage({ status: "specified" }, true);
    expect(s).toMatchObject({ id: "pending", label: "На согласовании", locked: false });
  });
  it("approve=ok → «Согласовано» (тот же label, что APPROVE_STATUSES), даже без активной шары", () => {
    const s = FFE.funnelStage({ status: "specified", approve: "ok" }, false);
    expect(s).toMatchObject({ id: "ok", label: "Согласовано", locked: false });
  });
  it("approve=revise/rejected — свои лейблы, не коллапсируют в «На согласовании»", () => {
    expect(FFE.funnelStage({ status: "specified", approve: "revise" }, true)).toMatchObject({ id: "revise", label: "На пересмотр" });
    expect(FFE.funnelStage({ status: "specified", approve: "rejected" }, true)).toMatchObject({ id: "rejected", label: "Отклонено" });
  });
  it("status=approved (стадия закупки 2) — approve всё ещё главный, стадия не «заперта»", () => {
    const s = FFE.funnelStage({ status: "approved", approve: "ok" }, true);
    expect(s).toMatchObject({ id: "ok", locked: false });
  });
  it("status достиг ordered+ — стадия закупки побеждает решение клиента и запирает чип", () => {
    const s = FFE.funnelStage({ status: "ordered", approve: "ok" }, true);
    expect(s).toMatchObject({ label: "Заказано", locked: true });
    // дальше по пайплайну — тоже locked, реальный лейбл стадии, а не общее «Заказано»
    expect(FFE.funnelStage({ status: "shipped" }, true)).toMatchObject({ label: "Отгружено", locked: true });
  });
});
