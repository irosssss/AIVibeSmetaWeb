/* Юнит-тесты схемы позиции FF&E (web/ffe.js) — согласование с клиентом по позициям
   (волна A1 бенчмарка Programa). ffe.js — IIFE, пишет API в window.AIVibeFFE. */
import { describe, it, expect, beforeAll } from "vitest";

let FFE;
beforeAll(async () => {
  globalThis.window = globalThis.window || {};
  await import("../web/ffe.js");
  FFE = globalThis.window.AIVibeFFE;
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
  it("без раздела — базовая наценка; пустой снимок = 0", () => {
    const cp = FFE.clientPricing({ rooms: [{ items: [{ title: "Z", price: 100, qty: 1 }] }], markup: 20 });
    expect(cp.unitClient({ price: 100 })).toBe(120);
    expect(cp.totalClient).toBe(120);
    expect(FFE.clientPricing({}).totalClient).toBe(0);
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
