/* Журнал комплектатора (продуктовый SEO-контент, путь B 14.07).
   Инвариант против регресса в «фасад»: до пути B у статей не было текста
   (body — заглушка «Полный текст…», карточки не открывались). Тест держит
   контракт: каждый ОПУБЛИКОВАННЫЙ материал несёт реальный body и excerpt,
   а news.get(id) отдаёт статью с телом — иначе ArticlePage показывать нечего. */
import { describe, it, expect, beforeAll } from "vitest";

let API;

beforeAll(async () => {
  globalThis.window = globalThis.window || {};
  // LS-адаптер mock.js обёрнут в try/catch — localStorage может отсутствовать; шим для чистоты
  if (typeof globalThis.localStorage === "undefined") {
    const m = new Map();
    globalThis.localStorage = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
  }
  await import("../web/mock.js");
  API = globalThis.window.LedgerAPI;
});

describe("Журнал: контент опубликованных материалов", () => {
  it("каждый опубликованный материал несёт реальный текст (не заглушка)", async () => {
    const rows = await API.news.list({ status: "published" });
    expect(rows.length).toBeGreaterThan(0);
    for (const n of rows) {
      expect(n.title.trim().length).toBeGreaterThan(0);
      expect(n.excerpt.trim().length).toBeGreaterThan(0);
      // тело — не пустое и не старая заглушка «Полный текст…»
      expect((n.body || "").trim().length).toBeGreaterThan(80);
      expect(n.body).not.toMatch(/^Полный текст/);
      expect(n.category.trim().length).toBeGreaterThan(0);
      expect(n.cover.trim().length).toBeGreaterThan(0);
    }
  });

  it("news.get(id) отдаёт статью с телом для страницы материала", async () => {
    const rows = await API.news.list({ status: "published" });
    const one = await API.news.get(rows[0].id);
    expect(one).toBeTruthy();
    expect(one.id).toBe(rows[0].id);
    expect((one.body || "").length).toBeGreaterThan(80);
  });

  it("body содержит хотя бы один подзаголовок ## — статьи структурированы", async () => {
    const rows = await API.news.list({ status: "published" });
    const withHeadings = rows.filter((n) => /(^|\n)## /.test(n.body || ""));
    expect(withHeadings.length).toBe(rows.length);
  });

  it("просмотры честные: реального счётчика нет, поле не выдумывает трафик", async () => {
    const rows = await API.news.list({ status: "published" });
    for (const n of rows) expect(n.views).toBe(0);
  });
});
