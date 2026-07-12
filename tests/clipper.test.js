/* Юнит-тесты клиппера «вставь-ссылку» (web/clipper.js).
   clipper.js — IIFE, пишет API в window.AIVibeClipper. Ядро extractFromHtml
   DOM-опционально (regex по JSON-LD/OG/meta), поэтому тестируется в node без jsdom.
   mapToPosition зависит от AIVibeFFE — подгружаем ffe.js так же. */
import { describe, it, expect, beforeAll, afterEach } from "vitest";

let CL, FFE;
beforeAll(async () => {
  globalThis.window = globalThis.window || {};
  await import("../web/ffe.js");
  await import("../web/clipper.js");
  CL = globalThis.window.AIVibeClipper;
  FFE = globalThis.window.AIVibeFFE;
});

describe("parsePrice — терпимый разбор цены", () => {
  it("чистит пробелы, валюту и разделители", () => {
    expect(CL.parsePrice("164 900 ₽")).toBe(164900);
    expect(CL.parsePrice("164900.00")).toBe(164900);
    expect(CL.parsePrice("164.900,00")).toBe(164900); // eu-формат
    expect(CL.parsePrice(58900)).toBe(58900);
    expect(CL.parsePrice("нет цены")).toBe(null);
    expect(CL.parsePrice("0")).toBe(null);
  });
  it("неоднозначные разделители и нулевые цены", () => {
    expect(CL.parsePrice("1.234.567")).toBe(1234567);   // точки-тысячи
    expect(CL.parsePrice("164.900")).toBe(164900);       // одиночная точка перед 3 знаками = тысячи
    expect(CL.parsePrice("12,5")).toBe(12.5);            // запятая-дробь
    expect(CL.parsePrice("1 234 567,50")).toBe(1234567.5);
    expect(CL.parsePrice("$1,299.00")).toBe(1299);       // us-формат
    expect(CL.parsePrice(0)).toBe(null);                 // числовой 0 — не цена
    expect(CL.parsePrice(-100)).toBe(null);
  });
});

describe("dimsFromText — габариты из текста", () => {
  it("разбирает Ш×Г×В в см", () => {
    expect(CL.dimsFromText("Диван 220×95×85 см")).toEqual({ w: 220, d: 95, h: 85 });
    expect(CL.dimsFromText("стол 160x80x75")).toEqual({ w: 160, d: 80, h: 75 });
  });
  it("конвертит мм → см", () => {
    expect(CL.dimsFromText("полка 1200×300×250 мм")).toEqual({ w: 120, d: 30, h: 25 });
  });
  it("единица у каждого числа (1200мм×600мм×750мм)", () => {
    expect(CL.dimsFromText("1200мм×600мм×750мм")).toEqual({ w: 120, d: 60, h: 75 });
    expect(CL.dimsFromText("120 см x 60 см x 75 см")).toEqual({ w: 120, d: 60, h: 75 });
  });
  it("единицу берёт у самого размера, а не из всего текста (мм где-то ещё не ломает см)", () => {
    expect(CL.dimsFromText("Диван 220×95×85 см, упаковка указана в мм")).toEqual({ w: 220, d: 95, h: 85 });
  });
  it("не ловит числа внутри артикулов/моделей", () => {
    expect(CL.dimsFromText("Кронштейн AB2024x10x20")).toBe(null);
    expect(CL.dimsFromText("просто диван")).toBe(null);
  });
});

describe("extractFromHtml — JSON-LD (главный источник)", () => {
  const html = `<!doctype html><html><head>
    <script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org", "@type": "Product",
      name: "Диван Modus, велюр", sku: "MOD-3V",
      brand: { "@type": "Brand", name: "Дубрава" },
      image: ["https://factory.ru/img/modus.jpg"],
      width: { "@type": "QuantitativeValue", value: 220, unitCode: "CMT" },
      depth: { value: 95, unitCode: "CMT" }, height: { value: 85, unitCode: "CMT" },
      offers: { "@type": "Offer", price: "164900", priceCurrency: "RUB" },
    })}</script></head><body><h1>Диван Modus</h1></body></html>`;

  it("извлекает имя, цену, бренд, sku, фото, габариты", () => {
    const r = CL.extractFromHtml(html, "https://factory.ru/divan-modus");
    expect(r.fields.title).toBe("Диван Modus, велюр");
    expect(r.fields.price).toBe(164900);
    expect(r.fields.supplier).toBe("Дубрава");
    expect(r.fields.sku).toBe("MOD-3V");
    expect(r.fields.img).toBe("https://factory.ru/img/modus.jpg");
    expect(r.fields.dims).toEqual({ w: 220, d: 95, h: 85 });
    expect(r.currency).toBe("RUB");
  });

  it("высокая уверенность и источник json-ld для цены", () => {
    const r = CL.extractFromHtml(html, "https://factory.ru/x");
    expect(r.sources.price).toBe("json-ld");
    expect(r.confidence).toBeGreaterThanOrEqual(0.85);
    expect(r.productSchema).toBe(true);
  });

  it("AggregateOffer → берёт минимальную цену", () => {
    const h = `<script type="application/ld+json">${JSON.stringify({
      "@type": "Product", name: "Стол", offers: { "@type": "AggregateOffer", lowPrice: "44900", priceCurrency: "RUB" },
    })}</script>`;
    expect(CL.extractFromHtml(h, "https://x.ru").fields.price).toBe(44900);
  });

  it("@graph разворачивается, Product находится внутри", () => {
    const h = `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [{ "@type": "WebSite", name: "Site" }, { "@type": "Product", name: "Кресло", offers: { price: 32900, priceCurrency: "RUB" } }],
    })}</script>`;
    const r = CL.extractFromHtml(h, "https://x.ru");
    expect(r.fields.title).toBe("Кресло");
    expect(r.fields.price).toBe(32900);
  });

  // Ловушка из живой фикстуры iddis.ru (бенч клиппера, волна E1): единица измерения
  // зашита в ИМЕНИ additionalProperty («Длина изделия, мм»), а не в значении («124,5»).
  // Раньше toCm() видел только значение, принимал его за уже-сантиметры и завышал габарит
  // в 10 раз (125см вместо 12,5).
  it("additionalProperty: единица в имени поля («Длина изделия, мм»), не в значении", () => {
    const h = `<script type="application/ld+json">${JSON.stringify({
      "@type": "Product", name: "Смеситель", offers: { price: 6620, priceCurrency: "RUB" },
      additionalProperty: [{ "@type": "PropertyValue", name: "Длина изделия, мм", value: "124,5" }],
    })}</script>`;
    expect(CL.extractFromHtml(h, "https://x.ru").fields.dims.d).toBe(12);
  });

  // Ревью раунда 1 (4 независимых находки): исходный фикс ловил только кириллицу «мм»
  // с запятой/скобкой перед ней — латиница «mm» и другие разделители (двоеточие/пробел)
  // проходили мимо и воспроизводили тот же 10-кратный баг.
  it("additionalProperty: единица в имени латиницей и без запятой («Width, mm» / «Длина мм»)", () => {
    const h1 = `<script type="application/ld+json">${JSON.stringify({
      "@type": "Product", name: "Полка", offers: { price: 1000, priceCurrency: "RUB" },
      additionalProperty: [{ "@type": "PropertyValue", name: "Width, mm", value: "300" }],
    })}</script>`;
    expect(CL.extractFromHtml(h1, "https://x.ru").fields.dims.w).toBe(30);

    const h2 = `<script type="application/ld+json">${JSON.stringify({
      "@type": "Product", name: "Полка", offers: { price: 1000, priceCurrency: "RUB" },
      additionalProperty: [{ "@type": "PropertyValue", name: "Длина мм", value: "300" }],
    })}</script>`;
    expect(CL.extractFromHtml(h2, "https://x.ru").fields.dims.d).toBe(30);
  });
});

describe("extractFromHtml — OpenGraph фолбэк", () => {
  const html = `<!doctype html><html><head>
    <meta property="og:title" content="Люстра латунь" />
    <meta property="og:image" content="https://shop.ru/lustra.jpg" />
    <meta property="product:price:amount" content="57000" />
    <meta property="product:price:currency" content="RUB" />
    <meta property="og:site_name" content="СветМаркет" />
    <title>Люстра — СветМаркет</title></head><body></body></html>`;

  it("берёт поля из og:/product: когда нет JSON-LD", () => {
    const r = CL.extractFromHtml(html, "https://shop.ru/lustra");
    expect(r.fields.title).toBe("Люстра латунь");
    expect(r.fields.price).toBe(57000);
    expect(r.fields.img).toBe("https://shop.ru/lustra.jpg");
    expect(r.fields.supplier).toBe("СветМаркет");
    expect(r.sources.price).toBe("og");
  });
});

describe("extractFromHtml — фолбэки и эвристики", () => {
  it("без структурных данных берёт заголовок из <title> и поставщика из домена", () => {
    const r = CL.extractFromHtml("<html><head><title>Ковёр шерсть</title></head><body></body></html>", "https://www.divan.ru/kover");
    expect(r.fields.title).toBe("Ковёр шерсть");
    expect(r.fields.supplier).toBe("Divan.ru");
    expect(r.sources.supplier).toBe("url");
    expect(r.confidence).toBeLessThan(0.5); // без цены — низкая уверенность
  });

  it("материал угадывается из текста (низкий вес)", () => {
    const r = CL.extractFromHtml('<meta property="og:title" content="Диван 3-местный велюр" />', "https://x.ru");
    expect(r.fields.material).toContain("велюр");
    expect(r.sources.material).toBe("guess");
  });
});

describe("mapToPosition — извлечённое → схема FF&E", () => {
  it("кладёт поля в blankPosition (валидная позиция)", () => {
    const extracted = CL.extractFromHtml(
      `<script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: "Стол дуб", offers: { price: 44900, priceCurrency: "RUB" }, sku: "T-1" })}</script>`,
      "https://factory.ru/stol");
    const pos = CL.mapToPosition(extracted);
    expect(pos.title).toBe("Стол дуб");
    expect(pos.price).toBe(44900);
    expect(pos.sku).toBe("T-1");
    expect(pos.url).toBe("https://factory.ru/stol");
    expect(pos.qty).toBe(1);
    expect(pos.id).toBeTruthy(); // прошёл через blankPosition
  });
  it("пропускает только http/https-картинки (data:/blob: отбрасываются)", () => {
    expect(CL.mapToPosition({ fields: { title: "X", img: "data:image/svg+xml,<svg/>" } }).img).toBe("");
    expect(CL.mapToPosition({ fields: { title: "X", img: "https://f.ru/p.jpg" } }).img).toBe("https://f.ru/p.jpg");
  });
});

describe("offerPrice — цена из offers", () => {
  it("массив offers → минимальная цена", () => {
    expect(CL.offerPrice([{ price: 58900, priceCurrency: "RUB" }, { price: 44900, priceCurrency: "RUB" }])).toEqual({ price: 44900, currency: "RUB" });
  });
  it("priceSpecification как источник цены", () => {
    expect(CL.offerPrice({ priceSpecification: { price: "32900", priceCurrency: "RUB" } })).toEqual({ price: 32900, currency: "RUB" });
  });
  it("AggregateOffer.lowPrice", () => {
    expect(CL.offerPrice({ "@type": "AggregateOffer", lowPrice: "80000" }).price).toBe(80000);
  });
  it("цена 0 → не цена", () => {
    expect(CL.offerPrice({ price: 0 }).price).toBe(null);
  });
});

describe("toCm — единицы габаритов", () => {
  it("дюймы → см", () => {
    expect(CL.toCm({ value: 48, unitCode: "INH" })).toBe(122); // 48*2.54
  });
  it("мм/м/см", () => {
    expect(CL.toCm({ value: 1200, unitCode: "MMT" })).toBe(120);
    expect(CL.toCm({ value: 2, unitCode: "MTR" })).toBe(200);
    expect(CL.toCm({ value: 75, unitCode: "CMT" })).toBe(75);
  });
});

describe("materialFromText — без дублей-подстрок", () => {
  it("экокожа не тянет за собой кожа", () => {
    expect(CL.materialFromText("Диван экокожа")).toBe("экокожа");
  });
  it("несколько разных материалов", () => {
    expect(CL.materialFromText("стол дуб шпон")).toBe("дуб, шпон");
  });
});

describe("extractFromHtml — JSON-LD: обёртки, но не содержимое", () => {
  it("не удаляет комментарий внутри строки JSON (только обёртку)", () => {
    const h = `<script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: "Диван <!-- акция --> Осло", offers: { price: 1, priceCurrency: "RUB" } })}</script>`;
    expect(CL.extractFromHtml(h, "https://x.ru").fields.title).toContain("акция");
  });
  it("разбирает CDATA-обёрнутый JSON-LD", () => {
    const h = `<script type="application/ld+json">//<![CDATA[\n${JSON.stringify({ "@type": "Product", name: "Кресло CDATA", offers: { price: 12900, priceCurrency: "RUB" } })}\n//]]></script>`;
    const r = CL.extractFromHtml(h, "https://x.ru");
    expect(r.fields.title).toBe("Кресло CDATA");
    expect(r.fields.price).toBe(12900);
  });
});

describe("extractFromHtml — Microdata-only (regex-фолбэк без DOMParser)", () => {
  it("берёт цену/валюту/sku из itemprop, источник microdata", () => {
    const h = `<div itemscope itemtype="https://schema.org/Product">
      <meta itemprop="sku" content="MD-7">
      <meta itemprop="price" content="55000"><meta itemprop="priceCurrency" content="RUB"></div>`;
    const r = CL.extractFromHtml(h, "https://shop.ru/p");
    expect(r.fields.price).toBe(55000);
    expect(r.sources.price).toBe("microdata");
    expect(r.fields.sku).toBe("MD-7");
  });
});

describe("mergeIntoPosition — слияние в форму (FIX-1 + FIX-2)", () => {
  const ldProduct = (over) => CL.extractFromHtml(
    `<script type="application/ld+json">${JSON.stringify({ "@type": "Product", offers: { priceCurrency: "RUB" }, ...over })}</script>`, "https://factory.ru/p");

  it("заполняет пустые поля и возвращает их список (filled синхронно — регресс FIX-1)", () => {
    const cur = FFE.blankPosition({});
    const { next, filled } = CL.mergeIntoPosition(cur, ldProduct({ name: "Диван", offers: { price: 99000, priceCurrency: "RUB" } }));
    expect(next.title).toBe("Диван");
    expect(next.price).toBe(99000);
    expect(filled).toContain("имя");
    expect(filled).toContain("цена");
  });

  it("структурный источник (JSON-LD) ПЕРЕЗАПИСЫВАЕТ заполненное", () => {
    const cur = FFE.blankPosition({ title: "Старое имя", price: 1000 });
    const { next, filled } = CL.mergeIntoPosition(cur, ldProduct({ name: "Новое имя", offers: { price: 2000, priceCurrency: "RUB" } }));
    expect(next.title).toBe("Новое имя");
    expect(next.price).toBe(2000);
    expect(filled).toEqual(expect.arrayContaining(["имя", "цена"]));
  });

  it("слабый источник (заголовок страницы) НЕ затирает ручной ввод", () => {
    const cur = FFE.blankPosition({ title: "Мой диван" });
    const weak = CL.extractFromHtml("<title>Случайный заголовок страницы</title>", "https://x.ru");
    expect(weak.sources.title).toBe("text");
    const { next, filled } = CL.mergeIntoPosition(cur, weak);
    expect(next.title).toBe("Мой диван");
    expect(filled).not.toContain("имя");
  });

  it("og:site_name (слабый) НЕ затирает введённый поставщик", () => {
    const cur = FFE.blankPosition({ supplier: "Моя фабрика" });
    const site = CL.extractFromHtml('<meta property="og:site_name" content="БольшойМаркет">', "https://x.ru");
    expect(site.sources.supplier).toBe("og-site");
    const { next } = CL.mergeIntoPosition(cur, site);
    expect(next.supplier).toBe("Моя фабрика");
  });

  it("og:brand (структурный) перезаписывает поставщик", () => {
    const cur = FFE.blankPosition({ supplier: "Моя фабрика" });
    const brand = CL.extractFromHtml('<meta property="og:brand" content="Дубрава">', "https://x.ru");
    expect(brand.sources.supplier).toBe("og");
    expect(CL.mergeIntoPosition(cur, brand).next.supplier).toBe("Дубрава");
  });
});

describe("clip — публичная точка (ветки ok/blocked/no-data)", () => {
  const origFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = origFetch; });

  it("невалидная схема → ok:false без сети", async () => {
    let called = false;
    globalThis.fetch = () => { called = true; return Promise.reject(new Error("should not fetch")); };
    const r = await CL.clip("not-a-url");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/http/i);
    expect(called).toBe(false);
  });

  it("сеть падает → blocked:true", async () => {
    globalThis.fetch = () => Promise.reject(new Error("network down"));
    const r = await CL.clip("https://factory.ru/p");
    expect(r.ok).toBe(false);
    expect(r.blocked).toBe(true);
  });

  it("страница без товара → ok:false 'не нашлось' + extracted", async () => {
    const body = "<html><body>" + "x".repeat(200) + "</body></html>";
    globalThis.fetch = () => Promise.resolve({ ok: true, headers: { get: () => "text/html" }, text: () => Promise.resolve(body) });
    const r = await CL.clip("https://factory.ru/empty");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/не нашлось/i);
    expect(r.extracted).toBeTruthy();
  });

  it("не-HTML ответ прокси (JSON) → отбрасывается → blocked", async () => {
    globalThis.fetch = () => Promise.resolve({ ok: true, headers: { get: () => "application/json" }, text: () => Promise.resolve('{"status":403}') });
    const r = await CL.clip("https://factory.ru/p");
    expect(r.blocked).toBe(true);
  });

  it("валидный товар со страницы → ok:true", async () => {
    const body = `<html><head><script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: "Стол", offers: { price: 44900, priceCurrency: "RUB" } })}</script></head></html>`;
    globalThis.fetch = () => Promise.resolve({ ok: true, headers: { get: () => "text/html; charset=utf-8" }, text: () => Promise.resolve(body) });
    const r = await CL.clip("https://factory.ru/stol");
    expect(r.ok).toBe(true);
    expect(r.extracted.fields.price).toBe(44900);
  });
});
