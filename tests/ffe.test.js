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
