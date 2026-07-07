/* Тесты серверного экстрактора (Слой A + Слой B) — web/clipper.js: extractWithFallback.
   Слой A (extractFromHtml) разбирает структурную разметку; Слой B добирает пустоты одним
   инъектируемым LLM-вызовом поверх видимого текста, как СЛАБЫЙ источник (только заполняет
   пустое, не перезаписывает структуру). Фикстуры — дистилляты реальных РФ-карточек
   (divan.ru без schema.org; Hoff с JSON-LD, но без габаритов и с 4 ценами на странице),
   снятых в живом тесте 2026-06-29. LLM здесь фейковый и детерминированный. */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";

let CL;
const fx = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

beforeAll(async () => {
  globalThis.window = globalThis.window || {};
  await import("../web/ffe.js");
  await import("../web/clipper.js");
  CL = globalThis.window.AIVibeClipper;
});

describe("htmlToText — видимый текст для LLM", () => {
  it("снимает скрипты/стили/теги и схлопывает пробелы", () => {
    expect(CL.htmlToText("<script>var x=1</script><style>a{color:red}</style><b>Привет</b>\n\n  мир")).toBe("Привет мир");
  });
  it("декодирует HTML-сущности", () => {
    expect(CL.htmlToText("Цена &amp; доставка &lt;1&gt; &quot;ок&quot;")).toBe('Цена & доставка <1> "ок"');
  });
  it("режет до maxChars (токен-бюджет)", () => {
    expect(CL.htmlToText("a".repeat(100), 10).length).toBe(10);
  });
});

describe("extractWithFallback — divan.ru (нет schema.org → LLM добирает цену и габариты)", () => {
  it("Слой A в одиночку: без структурной цены — низкая уверенность", async () => {
    const r = await CL.extractWithFallback(fx("divan_ru_product.html"), "https://www.divan.ru/product/divan-abi-happy-yellow");
    expect(r.llmUsed).toBe(false);          // LLM не передан — пайплайн транспорт-агностичен
    expect(r.fields.price == null).toBe(true);
    expect(r.llmNeeded).toEqual(["price", "dims", "sku"]);
    expect(r.confidence).toBeLessThan(0.5);
  });

  it("Слой B заполняет цену/габариты как источник 'llm', не трогая чужое", async () => {
    // Фейковый LLM возвращает каноничную цену (не промо/доставку) и габариты изделия (не спальное место)
    const llm = async () => ({ price: 57990, currency: "RUB", dims: { w: 254, d: 122, h: 87 }, material: "велюр, массив" });
    const r = await CL.extractWithFallback(fx("divan_ru_product.html"), "https://www.divan.ru/product/divan-abi-happy-yellow", { llm });
    expect(r.llmUsed).toBe(true);
    expect(r.fields.price).toBe(57990);
    expect(r.sources.price).toBe("llm");
    expect(r.fields.dims).toEqual({ w: 254, d: 122, h: 87 });
    expect(r.sources.dims).toBe("llm");
    expect(r.fields.currency).toBe("RUB");
    expect(r.fields.title).toContain("Эби");
    expect(r.sources.title).toBe("og");        // заголовок остался от Слоя A (OpenGraph)
    expect(r.fields.material).toContain("велюр"); // материал уже был угадан Слоем A — LLM не перезаписал
    expect(r.sources.material).toBe("guess");
    expect(r.confidence).toBeGreaterThanOrEqual(0.7); // выросла после добора цены
  });
});

describe("extractWithFallback — Hoff (JSON-LD есть, но габаритов нет; на странице 4 цены)", () => {
  // Ловушка: LLM «видит» в тексте 156→44 999 первой и может вернуть НЕ ту цену.
  // Слой B обязан НЕ перезаписать каноничную цену 49 999 из JSON-LD.
  const trickyLlm = async () => ({ price: 44999, dims: { w: 196, d: 106, h: 92 }, material: "рогожка" });

  it("LLM добирает габариты/материал, но НЕ перезаписывает цену из JSON-LD", async () => {
    const r = await CL.extractWithFallback(fx("hoff_product.html"), "https://hoff.ru/catalog/.../divan_krovat_kanzas_id9186161/");
    // сначала без LLM — что даёт чистый Слой A
    expect(r.fields.price).toBe(49999);
    expect(r.sources.price).toBe("json-ld");
    expect(r.llmNeeded).toEqual(["dims", "material"]);

    const r2 = await CL.extractWithFallback(fx("hoff_product.html"), "https://hoff.ru/catalog/.../divan_krovat_kanzas_id9186161/", { llm: trickyLlm });
    expect(r2.llmUsed).toBe(true);
    expect(r2.fields.price).toBe(49999);     // ← каноничная цена сохранена
    expect(r2.sources.price).toBe("json-ld"); // ← LLM (44 999) НЕ перезаписал структуру
    expect(r2.fields.dims).toEqual({ w: 196, d: 106, h: 92 });
    expect(r2.sources.dims).toBe("llm");
    expect(r2.fields.material).toBe("рогожка");
    expect(r2.sources.material).toBe("llm");
    expect(r2.fields.supplier).toBe("DREAMART"); // бренд из JSON-LD цел
    expect(r2.fields.sku).toBe("80561357");
    expect(r2.confidence).toBeGreaterThanOrEqual(0.85);
  });
});

describe("extractWithFallback — поведенческие гарантии", () => {
  const ld = (over) => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "Product", ...over })}</script>`;

  it("Слой A полон → LLM НЕ вызывается", async () => {
    const html = ld({
      name: "Стол дуб", sku: "S1", brand: "Дубрава", image: "https://f.ru/s.jpg", material: "дуб",
      width: { value: 120, unitCode: "CMT" }, depth: { value: 60, unitCode: "CMT" }, height: { value: 75, unitCode: "CMT" },
      offers: { price: 10000, priceCurrency: "RUB" },
    });
    let called = false;
    const r = await CL.extractWithFallback(html, "https://f.ru/stol", { llm: async () => { called = true; return { price: 1 }; } });
    expect(called).toBe(false);
    expect(r.llmUsed).toBe(false);
    expect(r.llmNeeded).toEqual([]);
  });

  it("структурные габариты (JSON-LD) защищены — LLM добирает только материал", async () => {
    const html = ld({
      name: "Кресло", sku: "K1", brand: "Дубрава", image: "https://f.ru/k.jpg",
      width: { value: 80, unitCode: "CMT" }, depth: { value: 80, unitCode: "CMT" }, height: { value: 95, unitCode: "CMT" },
      offers: { price: 32900, priceCurrency: "RUB" },
    });
    const r = await CL.extractWithFallback(html, "https://f.ru/kreslo", { llm: async () => ({ dims: { w: 1, d: 1, h: 1 }, material: "велюр" }) });
    expect(r.llmNeeded).toEqual(["material"]);
    expect(r.fields.dims).toEqual({ w: 80, d: 80, h: 95 }); // LLM-«1×1×1» отвергнут
    expect(r.sources.dims).toBe("json-ld");
    expect(r.fields.material).toBe("велюр");
    expect(r.sources.material).toBe("llm");
  });

  it("сбой LLM → молча возвращаем Слой A (не бросает)", async () => {
    const r = await CL.extractWithFallback(fx("divan_ru_product.html"), "https://www.divan.ru/p", { llm: async () => { throw new Error("LLM down"); } });
    expect(r.llmUsed).toBe(false);
    expect(r.fields.price == null).toBe(true);
  });

  it("LLM вернул null → Слой A без изменений", async () => {
    const r = await CL.extractWithFallback(fx("divan_ru_product.html"), "https://www.divan.ru/p", { llm: async () => null });
    expect(r.llmUsed).toBe(false);
    expect(r.fields.price == null).toBe(true);
  });

  it("guess-массив не считается успехом LLM (llmUsed=false)", async () => {
    const r = await CL.extractWithFallback(fx("divan_ru_product.html"), "https://www.divan.ru/p", { llm: async () => [{ price: 5 }] });
    expect(r.llmUsed).toBe(false);
    expect(r.fields.price == null).toBe(true);
  });
});

describe("Слой B — фиксы ревью", () => {
  const ld = (over) => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "Product", ...over })}</script>`;

  it("LLM-валюта НЕ липнет к структурной цене без priceCurrency", async () => {
    // JSON-LD дал цену, но без priceCurrency; LLM (вызван из-за отсутствия материала)
    // возвращает чужую валюту — она НЕ должна пометить каноничную структурную цену.
    const html = ld({
      name: "Полка навесная белая", sku: "P1", brand: "Дубрава", image: "https://f.ru/p.jpg",
      width: { value: 120, unitCode: "CMT" }, depth: { value: 30, unitCode: "CMT" }, height: { value: 200, unitCode: "CMT" },
      offers: { "@type": "Offer", price: "49999" },
    });
    const r = await CL.extractWithFallback(html, "https://f.ru/polka", { llm: async () => ({ material: "дуб", currency: "USD", price: 44999 }) });
    expect(r.llmNeeded).toEqual(["material"]);
    expect(r.fields.price).toBe(49999);
    expect(r.sources.price).toBe("json-ld"); // цена структурная — LLM её не трогал
    expect(r.currency).toBe("");             // и валюту USD не приклеил
    expect(r.sources.currency).toBeUndefined();
    expect(r.fields.material).toBe("дуб");
    expect(r.sources.material).toBe("llm");
  });

  it("в ПУСТОЕ поле цены LLM пишет даже спорную цену + сам ставит RUB (источник llm)", async () => {
    const r = await CL.extractWithFallback(fx("divan_ru_product.html"), "https://www.divan.ru/p", { llm: async () => ({ price: 53931 }) });
    expect(r.fields.price).toBe(53931);
    expect(r.sources.price).toBe("llm");
    expect(r.currency).toBe("RUB");
    expect(r.sources.currency).toBe("llm");
  });

  it("LLM добирает img/sku/supplier в пустые поля как 'llm'", async () => {
    const html = ld({ name: "Лампа", offers: { price: 5000, priceCurrency: "RUB" } });
    const r = await CL.extractWithFallback(html, "", { llm: async () => ({ img: "https://cdn.ru/p.jpg", sku: "X1", supplier: "Бренд 8" }) });
    expect(r.fields.img).toBe("https://cdn.ru/p.jpg");
    expect(r.sources.img).toBe("llm");
    expect(r.fields.sku).toBe("X1");
    expect(r.sources.sku).toBe("llm");
    expect(r.fields.supplier).toBe("Бренд 8");
    expect(r.sources.supplier).toBe("llm");
  });

  it("небезопасную картинку от LLM отбрасываем без ложного источника", async () => {
    const html = ld({ name: "Лампа", offers: { price: 5000, priceCurrency: "RUB" } });
    const r = await CL.extractWithFallback(html, "", { llm: async () => ({ img: "/local.jpg" }) });
    expect(r.fields.img).toBeFalsy();
    expect(r.sources.img).toBeUndefined();
    expect(r.llmUsed).toBe(false); // ничего не влилось
  });

  it("dims строкой от LLM разбираются нашим dimsFromText", async () => {
    const r = await CL.extractWithFallback(fx("divan_ru_product.html"), "https://www.divan.ru/p", { llm: async () => ({ dims: "254x122x87 см" }) });
    expect(r.fields.dims).toEqual({ w: 254, d: 122, h: 87 });
    expect(r.sources.dims).toBe("llm");
    expect(r.llmUsed).toBe(true);
  });

  it("добор Слоем B ПОВЫШАЕТ уверенность относительно одного Слоя A", async () => {
    const url = "https://www.divan.ru/p";
    const base = await CL.extractWithFallback(fx("divan_ru_product.html"), url);
    const after = await CL.extractWithFallback(fx("divan_ru_product.html"), url, { llm: async () => ({ price: 57990, dims: { w: 254, d: 122, h: 87 } }) });
    expect(after.confidence).toBeGreaterThan(base.confidence);
  });

  it("htmlToText: hex-сущности и явный нулевой лимит", () => {
    expect(CL.htmlToText("A&#x42;C")).toBe("ABC");
    expect(CL.htmlToText("abcdef", 0)).toBe("");
  });
});
