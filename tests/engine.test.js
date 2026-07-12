/* Юнит-тесты детерминированного движка сметы (web/engine.js).
   engine.js — IIFE, который пишет API в window.LedgerEngine; даём ему window и импортируем. */
import { describe, it, expect, beforeAll } from "vitest";

let E;
beforeAll(async () => {
  globalThis.window = globalThis.window || {};
  await import("../web/engine.js");
  E = globalThis.window.LedgerEngine;
});

/* Каталог проекта p_1 «Гостиная на Патриках» — id/price/rating как в web/project-data.js */
const catalog = () => [
  { cat: "Диван", items: [
    { id: "f1-sofa-1", price: 78900, rating: 4.6 },
    { id: "f2-sofa-2", price: 164900, rating: 4.8 },
    { id: "f1-sofa-3", price: 312000, rating: 4.9 },
  ] },
  { cat: "Ковёр", items: [
    { id: "f2-rug-1", price: 14900, rating: 4.5 },
    { id: "f1-rug-2", price: 41900, rating: 4.7 },
    { id: "f2-rug-3", price: 88000, rating: 4.9 },
  ] },
  { cat: "Освещение", items: [
    { id: "f1-light-1", price: 18900, rating: 4.4 },
    { id: "f2-light-2", price: 57000, rating: 4.8 },
    { id: "f1-light-3", price: 121000, rating: 4.9 },
  ] },
  { cat: "Журнальный стол", items: [
    { id: "f2-tab-1", price: 12900, rating: 4.3 },
    { id: "f1-tab-2", price: 37900, rating: 4.7 },
    { id: "f2-tab-3", price: 74000, rating: 4.9 },
  ] },
  { cat: "Текстиль и декор", items: [
    { id: "f1-dec-1", price: 16900, rating: 4.5 },
    { id: "f2-dec-2", price: 46900, rating: 4.7 },
    { id: "f1-dec-3", price: 89000, rating: 4.9 },
  ] },
];

describe("LedgerEngine API", () => {
  it("экспортирует детерминированный API", () => {
    expect(E).toBeTruthy();
    expect(typeof E.checkErgonomics).toBe("function");
    expect(typeof E.optimizeSpec).toBe("function");
    expect(E.NORMS.walkwayMin).toBe(70);
  });
});

describe("optimizeSpec — бюджет-оптимизатор", () => {
  it("укладывается в бюджет и не превышает его", () => {
    const r = E.optimizeSpec(catalog(), 480000, 1);
    expect(r.fits).toBe(true);
    expect(r.total).toBeLessThanOrEqual(480000);
    expect(r.leftover).toBe(480000 - r.total);
  });

  it("апгрейдит ключевой предмет (диван), а не оставляет его в эконом (регресс-тест бага optimize-stale-ratio)", () => {
    const r = E.optimizeSpec(catalog(), 480000, 1);
    expect(r.selection[0]).not.toBe("f1-sofa-1"); // диван не должен остаться самым дешёвым
    expect(r.selection[0]).toBe("f2-sofa-2");      // ожидаем средний тир при бюджете 480к
  });

  it("при крошечном бюджете берёт самые дешёвые во всех категориях", () => {
    const r = E.optimizeSpec(catalog(), 1000, 1);
    expect(r.selection).toEqual({ 0: "f1-sofa-1", 1: "f2-rug-1", 2: "f1-light-1", 3: "f2-tab-1", 4: "f1-dec-1" });
    expect(r.fits).toBe(false); // сумма самых дешёвых > 1000
  });

  it("при огромном бюджете берёт максимальное качество", () => {
    const r = E.optimizeSpec(catalog(), 10_000_000, 1);
    expect(r.selection[0]).toBe("f1-sofa-3"); // топ-диван
    expect(r.fits).toBe(true);
  });

  it("множитель стиля (factor) масштабирует итог вверх при достаточном бюджете (та же топ-раскладка дороже)", () => {
    const base = E.optimizeSpec(catalog(), 10_000_000, 1).total;
    const pricey = E.optimizeSpec(catalog(), 10_000_000, 1.5).total;
    expect(pricey).toBeGreaterThan(base);
  });
});

describe("checkErgonomics — проверка норм", () => {
  it("пустой план не падает и не даёт предупреждений", () => {
    const res = E.checkErgonomics({ plan: [] }, { w: 4, l: 5 });
    expect(res.ok).toBe(true);
    expect(res.warns).toBe(0);
    expect(Array.isArray(res.findings)).toBe(true);
  });

  it("пересекающиеся предметы дают предупреждение о коллизии", () => {
    const plan = [
      { k: "seat", label: "Диван", x: 10, y: 10, w: 40, h: 40 },
      { k: "media", label: "ТВ-зона", x: 20, y: 20, w: 40, h: 40 },
    ];
    const res = E.checkErgonomics({ plan }, { w: 5, l: 5 });
    expect(res.warns).toBeGreaterThan(0);
    expect(res.findings.some((f) => f.kind === "warn" && /налезают|Пересек/.test(f.text))).toBe(true);
  });
});
