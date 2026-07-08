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
  it("валидное решение с датой и комментарием переживает нормализацию", () => {
    const p = FFE.normalizePosition({ title: "Диван", price: 100, approve: "ok", approveAt: "2026-07-08", approveNote: " берём " });
    expect(p.approve).toBe("ok");
    expect(p.approveAt).toBe("2026-07-08");
    expect(p.approveNote).toBe("берём");
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
    const rec = FFE.createPortalShare({ projectName: "Кирова", versionLabel: "v1",
      snapshot: { rooms: [{ name: "A", items: [{ title: "X", price: 1000, qty: 1 }] }], markup: 25 } });
    expect(rec.shareId).toMatch(/^shr_/);
    expect(FFE.loadPortalShare(rec.shareId).projectName).toBe("Кирова");

    const upd = FFE.setPortalApprove(rec.shareId, 0, 0, "ok");
    expect(upd.snapshot.rooms[0].items[0].approve).toBe("ok");
    expect(upd.respondedAt).toBeTruthy();
    expect(FFE.loadPortalShare(rec.shareId).snapshot.rooms[0].items[0].approve).toBe("ok"); // персист

    const cleared = FFE.setPortalApprove(rec.shareId, 0, 0, "pending");
    expect("approve" in cleared.snapshot.rooms[0].items[0]).toBe(false);
    expect(FFE.loadPortalShare("shr_missing")).toBe(null);
  });
});
