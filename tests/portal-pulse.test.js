/* Юнит-тесты пульса портала (web/ffe.js, адаптация ченджлога Programa 12.07):
   suggestAlternatives (Ч2 — аналоги при отказе клиента), portalEventsFromShare
   (Ч3 — лента действий), collectGaps (Ч3 — пробелы комплектации),
   notePortalVisit (Ч4 — «клиент открыл»). ffe.js — IIFE в window.LedgerFFE;
   портал-хранилище — localStorage, в node шимится Map'ом. */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";

let FFE;
beforeAll(async () => {
  globalThis.window = globalThis.window || {};
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
  await import("../web/ffe.js");
  FFE = globalThis.window.LedgerFFE;
});
beforeEach(() => globalThis.localStorage.clear());

describe("suggestAlternatives — скоринг замен (Ч2)", () => {
  const target = { title: "Кресло лаунж, дуб/букле", cat: "Мебель", price: 100000 };
  it("свой раздел бьёт чужой; сам товар исключён", () => {
    const cands = [
      { title: "Кресло лаунж, дуб/букле", cat: "Мебель", price: 100000 },  // тот же товар
      { title: "Люстра латунь", cat: "Свет", price: 100000 },              // чужой раздел, нет слов
      { title: "Диван компакт", cat: "Мебель", price: 95000 },             // раздел + цена в коридоре
      { title: "Кресло качалка", cat: "Свет", price: 90000 },              // слово «кресло» + цена
    ];
    const out = FFE.suggestAlternatives(target, cands, 4);
    // «Люстра латунь» отсутствует: цена в коридоре — бонус к рангу, а не квалификация
    // (без совпадения раздела/слов кандидат отбрасывается)
    expect(out.map((s) => s.product.title)).toEqual(["Диван компакт", "Кресло качалка"]);
  });
  it("кандидаты без пересечений отбрасываются; дельта цены в процентах", () => {
    const out = FFE.suggestAlternatives(target, [
      { title: "Ковёр шерсть", cat: "Текстиль", price: 1000000 },  // ничего общего, цена вне коридора
      { title: "Кресло велюр", cat: "Мебель", price: 77000 },
    ], 4);
    expect(out.length).toBe(1);
    expect(out[0].priceDeltaPct).toBe(-23);
  });
  it("дубли (товар и в библиотеке, и в проекте) схлопываются; топ-n режет", () => {
    const c = { title: "Кресло велюр", cat: "Мебель", price: 90000 };
    const out = FFE.suggestAlternatives(target, [c, { ...c }, { title: "Кресло лён", cat: "Мебель", price: 91000 }], 1);
    expect(out.length).toBe(1);
  });
  it("дефолтный раздел «Прочее» — не сигнал: пустой title + Прочее не тянет случайные товары", () => {
    // ревью-находка: «Прочее»≡«Прочее» давало +3 почти всем неразмеченным товарам,
    // и позиция с пустым/односложным названием собирала мусорную выдачу
    const out = FFE.suggestAlternatives({ title: "", cat: "Прочее", price: 10000 }, [
      { title: "Ваза", cat: "Прочее", price: 9000 },
      { title: "Крючок", cat: "Прочее", price: 11000 },
    ], 4);
    expect(out).toEqual([]);
    // содержательный раздел при этом работает как раньше
    const ok = FFE.suggestAlternatives({ title: "", cat: "Мебель", price: 10000 }, [{ title: "Пуф", cat: "Мебель", price: 9000 }], 4);
    expect(ok.length).toBe(1);
  });
  it("пустые кандидаты/цель без цены не роняют", () => {
    expect(FFE.suggestAlternatives({ title: "Кресло" }, null, 3)).toEqual([]);
    const out = FFE.suggestAlternatives({ title: "Кресло", cat: "Мебель" }, [{ title: "Кресло мини", cat: "Мебель", price: 5000 }], 3);
    expect(out[0].priceDeltaPct).toBe(null);
  });
});

describe("portalEventsFromShare — события клиента из снимка (Ч3)", () => {
  it("решения с датой + комментарии клиента; студия и без-даты пропущены", () => {
    const rec = { snapshot: { rooms: [{ name: "Гостиная", items: [
      { title: "Кресло", approve: "rejected", approveAt: "2026-07-10",
        comments: [
          { author: "client", text: "Дорого", at: "2026-07-10T10:00:00Z" },
          { author: "studio", text: "Подберём", at: "2026-07-10T11:00:00Z" },
        ] },
      { title: "Диван", approve: "ok" },                       // легаси без approveAt — не выдумываем дату
      { title: "Стол" },                                        // без решения
    ] }] } };
    const ev = FFE.portalEventsFromShare(rec);
    expect(ev.map((e) => e.type)).toEqual(["rejected", "comment"]);
    expect(ev[1].text).toBe("Дорого");
    expect(ev[0].ri).toBe(0);
  });
  it("пустая/битая шара — пустой список", () => {
    expect(FFE.portalEventsFromShare(null)).toEqual([]);
    expect(FFE.portalEventsFromShare({ snapshot: {} })).toEqual([]);
  });
});

describe("collectGaps — пробелы комплектации (Ч3)", () => {
  it("без поставщика — обе схемы имени поля; без дат — ни eta, ни платёжных дат", () => {
    const rooms = [{ items: [
      { title: "А" },                                             // без всего: noSup + noDates
      { title: "Б", sup: "Фабрика", eta: "2026-08-01" },          // укомплектован
      { title: "В", supplier: "Салон",                            // supplier-схема; оплаченный платёж = дата есть
        payments: { supplierAdvance: { date: "2026-07-01", paid: true } } },
      { title: "Г", sup: "Ф2", payments: {} },                    // поставщик есть, дат нет
    ] }];
    expect(FFE.collectGaps(rooms)).toEqual({ noSup: 1, noDates: 2 });
  });
  it("пустые комнаты не роняют", () => {
    expect(FFE.collectGaps(null)).toEqual({ noSup: 0, noDates: 0 });
  });
});

describe("notePortalVisit — «клиент открыл» (Ч4)", () => {
  it("каждый визит инкрементит счётчик и штампует lastAt", () => {
    const rec = FFE.createPortalShare({ projectName: "Тест", snapshot: { rooms: [] } });
    const v1 = FFE.notePortalVisit(rec.shareId);
    expect(v1.visits.count).toBe(1);
    expect(v1.visits.lastAt).toBeTruthy();
    const v2 = FFE.notePortalVisit(rec.shareId);
    expect(v2.visits.count).toBe(2);
    // персистится: свежее чтение видит счётчик
    expect(FFE.loadPortalShare(rec.shareId).visits.count).toBe(2);
  });
  it("несуществующая шара — null, не бросает", () => {
    expect(FFE.notePortalVisit("shr_nope")).toBe(null);
  });
});
