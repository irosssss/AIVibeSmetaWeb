/* Юнит-тесты чистой логики редактора норм (web/components/norms-editor.jsx,
   NORMS_LOGIC → window.AIVibeNormsLogic). Тест-долг PR #6: счётчики
   modCount/changedCount и resetAll на 4 угловых случаях — правка значения /
   выключение тумблера / оба вместе / ничего. Компонент — React/JSX, но логика
   вынесена в чистый объект; для импорта модуля хватает глобального React. */
import { describe, it, expect, beforeAll } from "vitest";
import React from "react";

let L;
beforeAll(async () => {
  globalThis.React = React;                      // top-level `const { useState } = React`
  globalThis.window = globalThis.window || {};   // модуль пишет в window.*
  await import("../web/components/norms-editor.jsx");
  L = globalThis.window.AIVibeNormsLogic;
});

describe("счётчики: 4 угловых случая (правка / тумблер / оба / ничего)", () => {
  it("ничего не менялось — оба счётчика 0 («Сбросить всё» disabled)", () => {
    expect(L.modCount({})).toBe(0);
    expect(L.changedCount({}, {})).toBe(0);
  });
  it("правка значения — 1 и 1", () => {
    const override = { walkwayMin: 80 };
    expect(L.modCount(override)).toBe(1);
    expect(L.changedCount(override, {})).toBe(1);
  });
  it("выключение тумблера — не правка значения: modCount 0, changedCount 1", () => {
    const enabled = { doorSwing: false };
    expect(L.modCount({})).toBe(0);
    expect(L.changedCount({}, enabled)).toBe(1);
  });
  it("правка значения И выключенный тумблер у ОДНОЙ нормы — одна строка, не две", () => {
    const override = { walkwayMin: 80 };
    const enabled = { walkwayMin: false };
    expect(L.modCount(override)).toBe(1);
    expect(L.changedCount(override, enabled)).toBe(1);   // не 2 — не сумма двух счётчиков
  });
  it("правка одной нормы и тумблер другой — две разные строки", () => {
    expect(L.changedCount({ walkwayMin: 80 }, { doorSwing: false })).toBe(2);
  });
  it("включённый тумблер (true) и мусорные ключи не считаются изменением", () => {
    expect(L.changedCount({}, { walkwayMin: true })).toBe(0);
    expect(L.changedCount({ notANorm: 1 }, { notANorm: false })).toBe(0);  // не из NORM_DEFS
    // мусорный/устаревший ключ в сохранённом override не расщепляет счётчики:
    // иначе confirm пресета видел бы «1 изменённый», а футер — «всё по канону»
    expect(L.modCount({ notANorm: 1 })).toBe(0);
  });
});

describe("переходы состояния", () => {
  it("toggleKey: выключить → включить возвращает к исходному счёту", () => {
    const off = L.toggleKey({}, "tvComfort");
    expect(off.tvComfort).toBe(false);
    expect(L.changedCount({}, off)).toBe(1);
    const on = L.toggleKey(off, "tvComfort");
    expect(on.tvComfort).toBe(true);
    expect(L.changedCount({}, on)).toBe(0);
  });
  it("resetKey убирает только свою правку", () => {
    const o = L.resetKey({ walkwayMin: 80, doorSwing: 100 }, "walkwayMin");
    expect(o).toEqual({ doorSwing: 100 });
    expect(L.modCount(o)).toBe(1);
  });
  it("resetAll обнуляет правки, тумблеры и базу — счётчики к нулю", () => {
    const r = L.resetAll();
    expect(r).toEqual({ override: {}, enabled: {}, baseKey: "canon" });
    expect(L.modCount(r.override)).toBe(0);
    expect(L.changedCount(r.override, r.enabled)).toBe(0);
  });
  it("setKey не мутирует исходный override", () => {
    const src = { doorSwing: 100 };
    L.setKey(src, "walkwayMin", 80);
    expect(src).toEqual({ doorSwing: 100 });
  });
});

describe("связка walkwayMin ≤ walkwayComfort (мягкий зажим + сноска)", () => {
  it("минимальный выше комфортного — комфортный подтягивается, сноска есть", () => {
    const r = L.setKey({}, "walkwayMin", 120, { walkwayMin: 70, walkwayComfort: 90 });
    expect(r.override.walkwayMin).toBe(120);
    expect(r.override.walkwayComfort).toBe(120);
    expect(r.note).toContain("120");
  });
  it("комфортный ниже минимального — минимальный опускается", () => {
    const r = L.setKey({ walkwayMin: 100 }, "walkwayComfort", 80, { walkwayMin: 70, walkwayComfort: 90 });
    expect(r.override.walkwayComfort).toBe(80);
    expect(r.override.walkwayMin).toBe(80);
    expect(r.note).not.toBe("");
  });
  it("без конфликта — сноски нет, вторая норма не трогается", () => {
    const r = L.setKey({}, "walkwayMin", 80, { walkwayMin: 70, walkwayComfort: 90 });
    expect(r.override).toEqual({ walkwayMin: 80 });
    expect(r.note).toBe("");
  });
  it("правка НЕСВЯЗАННОЙ нормы не зажимает walkway-пару (регресс код-ревью 12.07)", () => {
    // нарушенная пара уже в сторе: min=100 поверх канонного комфорта 90
    // (так бывает после «↺ сброс» у комфорта при поднятом минимуме)
    const r = L.setKey({ walkwayMin: 100 }, "doorSwing", 95, { walkwayMin: 70, walkwayComfort: 90 });
    expect(r.override).toEqual({ walkwayMin: 100, doorSwing: 95 });   // min не тронут
    expect(r.note).toBe("");                                          // и нет ложной сноски
  });
});
