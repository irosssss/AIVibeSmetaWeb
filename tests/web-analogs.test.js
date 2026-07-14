/* Каркас AI-подбора аналогов по вебу (web/web-analogs.js, п.19-2).
   Фича выключена (нет LLM-транспорта/домена — тот же блокер, что у этапа 2 клиппера),
   но контур обязан быть чистым и предсказуемым: промпт собирается детерминированно,
   без opts.llm — дремлет и не бросает, с фейковым llm — парсит строгий JSON и нормализует.
   Транспорт-агностика РОВНО как слой B клиппера: llm инъектируется. */
import { describe, it, expect, beforeAll } from "vitest";

let WA;   // window.LedgerWebAnalogs

beforeAll(async () => {
  globalThis.window = globalThis.window || {};
  await import("../web/web-analogs.js");
  WA = globalThis.window.LedgerWebAnalogs;
});

const target = {
  title: "Диван модульный «Осло»", cat: "Мягкая мебель", price: 189000,
  sup: "The IDEA", material: "велюр", dims: { w: 320, d: 175, h: 82 },
};

describe("Каркас веб-аналогов: промпт", () => {
  it("buildAnalogPrompt включает товар, ключевые поля и комментарий клиента", () => {
    const p = WA.buildAnalogPrompt(target, "нужно дешевле");
    expect(p).toContain("Осло");
    expect(p).toContain("Мягкая мебель");
    expect(p).toContain("189000");
    expect(p).toContain("320×175×82 см");
    expect(p).toContain("Комментарий клиента: нужно дешевле");
  });

  it("пустой комментарий → дефолтная формулировка, без цены нет строки цены", () => {
    const p = WA.buildAnalogPrompt({ title: "Стол" }, "");
    expect(p).toContain("Товар: Стол");
    expect(p).toContain("Комментарий клиента: нужен аналог");
    expect(p).not.toContain("Текущая цена");
  });

  it("системная инструкция требует строгий JSON и запрещает выдумывать цену/ссылку", () => {
    expect(WA.ANALOG_SYSTEM).toMatch(/JSON/);
    expect(WA.ANALOG_SYSTEM).toMatch(/analogs/);
    expect(WA.ANALOG_SYSTEM.toLowerCase()).toMatch(/не выдумывай/);
  });
});

describe("Каркас веб-аналогов: suggestWebAnalogs", () => {
  it("без opts.llm — дремлет: configured=false, пусто, не бросает", async () => {
    const r = await WA.suggestWebAnalogs(target, {});
    expect(r.configured).toBe(false);
    expect(r.analogs).toEqual([]);
  });

  it("isConfigured отражает наличие транспорта", () => {
    expect(WA.isConfigured({})).toBe(false);
    expect(WA.isConfigured({ llm: () => {} })).toBe(true);
  });

  it("с фейковым llm (JSON-строка) — парсит и нормализует аналоги", async () => {
    const llm = async () => JSON.stringify({ analogs: [
      { title: "Диван «Берген»", supplier: "Divan.ru", price: 129900, url: "https://x/1", reason: "дешевле на 30%" },
      { title: "", supplier: "мусор", price: 1 },                       // без названия — отбрасывается
      { title: "Диван «Ларвик»", price: "не число", url: "https://x/2" }, // кривая цена → null
    ] });
    const r = await WA.suggestWebAnalogs(target, { llm, clientNote: "дешевле" });
    expect(r.configured).toBe(true);
    expect(r.analogs).toHaveLength(2);
    expect(r.analogs[0]).toMatchObject({ title: "Диван «Берген»", price: 129900, _src: "веб (ИИ)" });
    expect(r.analogs[1].price).toBe(null);
  });

  it("llm вернул объект (не строку) — тоже принимаем", async () => {
    const llm = async () => ({ analogs: [{ title: "Кресло «Эго»", price: 45000 }] });
    const r = await WA.suggestWebAnalogs(target, { llm });
    expect(r.analogs).toHaveLength(1);
    expect(r.analogs[0].title).toBe("Кресло «Эго»");
  });

  it("сбой llm не валит — configured=true, error, пустой список", async () => {
    const llm = async () => { throw new Error("timeout"); };
    const r = await WA.suggestWebAnalogs(target, { llm });
    expect(r.configured).toBe(true);
    expect(r.analogs).toEqual([]);
    expect(r.error).toBe("llm_failed");
  });

  it("мусорный JSON от llm → пустой список, без исключения", async () => {
    const llm = async () => "это не json {{{";
    const r = await WA.suggestWebAnalogs(target, { llm });
    expect(r.analogs).toEqual([]);
  });

  it("limit ограничивает выдачу", async () => {
    const many = { analogs: Array.from({ length: 9 }, (_, i) => ({ title: "A" + i, price: 100 + i })) };
    const llm = async () => many;
    const r = await WA.suggestWebAnalogs(target, { llm, limit: 3 });
    expect(r.analogs).toHaveLength(3);
  });
});
