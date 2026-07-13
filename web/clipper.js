/* ============================================================
   Design Ledger — клиппер «вставь-ссылку» (Фаза 1.1): URL/HTML → реальная позиция FF&E
   ------------------------------------------------------------
   Адаптация подхода metascraper-shopping (microlinkhq, MIT) и extruct (BSD-3):
   приоритетные правила по источникам структурированных данных —
     JSON-LD (schema.org/Product) → Microdata → OpenGraph/product:* → meta → текст,
   первый сработавший источник выигрывает. Извлечённые поля кладём ровно в нашу
   FF&E-схему (web/ffe.js) — никакого нового формата.

   Ключевые отличия «лучше под нас»:
   • Ядро БЕЗ зависимостей и DOM-опционально: JSON-LD/OG/meta берём regex'ом
     (работает одинаково в браузере и в node-тестах); Microdata обогащаем через
     DOMParser, если он доступен. Поэтому extractFromHtml — чистая, тестируемая.
   • Маппинг сразу в рубли/сантиметры/наш словарь поставщиков, разбор габаритов
     «Ш×Г×В» из текста, словарь материалов РФ-рынка.
   • Confidence-scoring + источник по каждому полю — фундамент экрана ручной
     правки (план 1.3): подсветить, что извлечено уверенно, а что догадка.

   Сеть (fetchHtml): прямой fetch → публичные CORS-прокси → честный фолбэк
   «вставьте HTML страницы вручную». Прокси — временный транспорт прототипа;
   // → API: серверный экстрактор (Yandex Cloud Function + extruct/AI) заменит его
   без переписывания ядра — clip() просто будет звать наш бэкенд.
   ============================================================ */
(function () {
  "use strict";

  /* ----------------------------- УТИЛИТЫ ----------------------------- */
  // Терпимый парсер цены: «164 900 ₽»→164900, «164.900,00»(eu)→164900,
  // «1,234.56»(us)→1234.56, «1.234.567»→1234567, «12,5»→12.5. 0/мусор → null.
  function parsePrice(v) {
    if (v == null) return null;
    if (typeof v === "number") return isFinite(v) && v > 0 ? v : null; // 0 — это «нет цены»
    let s = String(v).trim().replace(/[^\d.,]/g, "");
    if (!s) return null;
    const dots = (s.match(/\./g) || []).length;
    const commas = (s.match(/,/g) || []).length;
    if (commas && dots) {
      // последний разделитель — дробный: «1.234,56»(eu) vs «1,234.56»(us)
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
      else s = s.replace(/,/g, "");
    } else if (commas) {
      s = (commas > 1 || /,\d{3}$/.test(s)) ? s.replace(/,/g, "") : s.replace(",", "."); // тысячи vs дробь
    } else if (dots) {
      if (dots > 1 || /\.\d{3}$/.test(s)) s = s.replace(/\./g, ""); // «1.234.567» / «164.900» — тысячи
      // одиночная точка с 1–2 знаками — дробь, оставляем как есть
    }
    const n = parseFloat(s);
    return isFinite(n) && n > 0 ? n : null;
  }

  const clean = (v) => (v == null ? "" : String(v)).replace(/\s+/g, " ").trim();
  const firstStr = (...xs) => { for (const x of xs) { const s = clean(x); if (s) return s; } return ""; };

  // HTML-сущности в атрибутах (найдено ревью раунда 2, clipper-bench: citilux.ru кладёт
  // og:image как «...?fileId=108482&amp;productId=...» — атрибут по спецификации HTML
  // энтити-кодирован, браузер/DOM декодирует его сам; наш regex-парсер meta-тегов — нет,
  // и «&amp;» буквально попадал в URL/заголовок). Только частые сущности — не полный XML.
  const decodeEntities = (s) => String(s || "")
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }[e]))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));

  // image может быть строкой, массивом, {url}/{contentUrl} или массивом таких
  function pickImage(img) {
    if (!img) return "";
    if (Array.isArray(img)) { for (const x of img) { const s = pickImage(x); if (s) return s; } return ""; }
    if (typeof img === "object") return clean(img.url || img.contentUrl || img["@id"]);
    return clean(img);
  }

  // brand может быть строкой или {name}
  const pickName = (v) => (v && typeof v === "object" ? clean(v.name) : clean(v));

  // QuantitativeValue {value, unitCode} или число/строка → см
  function toCm(v) {
    if (v == null || v === "") return "";
    let unit = "", raw = v;
    if (typeof v === "object") { unit = clean(v.unitCode || v.unitText); raw = v.value; }
    const n = parseFloat(String(raw).replace(",", "."));
    if (!isFinite(n) || n <= 0) return "";
    const u = unit.toLowerCase();
    if (u === "mmt" || u === "mm" || u === "мм" || /мм|mm/.test(String(raw))) return Math.round(n / 10);
    if (u === "mtr" || u === "m" || u === "м") return Math.round(n * 100);
    if (u === "inh" || u === "in" || /["”]|inch|дюйм/.test(String(raw))) return Math.round(n * 2.54); // дюймы
    return Math.round(n); // CMT/cm/см/без единицы — считаем сантиметрами
  }

  // Хост → читаемый поставщик: «www.divan.ru» → «Divan.ru»
  function supplierFromUrl(url) {
    try {
      const h = new URL(url).hostname.replace(/^www\./, "");
      return h ? h.charAt(0).toUpperCase() + h.slice(1) : "";
    } catch { return ""; }
  }

  /* Словарь материалов РФ-рынка мебели/декора — для эвристики из текста (низкий вес). */
  const MATERIALS = [
    "велюр", "рогожка", "букле", "шенилл", "флок", "экокожа", "кожа", "лён", "хлопок",
    "дуб", "бук", "орех", "ясень", "сосна", "берёза", "массив", "шпон", "ЛДСП", "МДФ",
    "латунь", "сталь", "металл", "хром", "мрамор", "керамогранит", "стекло", "ротанг", "бархат",
  ];
  function materialFromText(text) {
    const t = " " + (text || "").toLowerCase() + " ";
    let hit = MATERIALS.filter((m) => t.includes(m.toLowerCase()));
    // убрать термин, который является подстрокой другого найденного («экокожа» ⊃ «кожа»)
    hit = hit.filter((m) => !hit.some((o) => o !== m && o.toLowerCase().includes(m.toLowerCase())));
    return hit.slice(0, 2).join(", ");
  }

  // «120×60×75 см» / «1200мм×600мм×750мм» / «120 см x 60 см x 75 см» → {w,d,h} в см.
  // Единицу берём из подписи у самого тройного размера (не из всего текста — иначе
  // «упаковка в мм» ломала бы размер в см). Граница перед первым числом отсекает
  // ложные совпадения в артикулах/моделях (AB2024x10x20 → null).
  const DIM_UNIT = "(?:мм|mm|см|cm|м|m)?";
  const DIM_RE = new RegExp("(?:^|[^\\w.,])(\\d{2,4})\\s*" + DIM_UNIT + "\\s*[×xх*]\\s*(\\d{2,4})\\s*" + DIM_UNIT + "\\s*[×xх*]\\s*(\\d{2,4})\\s*(мм|mm|см|cm|м|m)?", "i");
  function dimsFromText(text) {
    if (!text) return null;
    const m = String(text).match(DIM_RE);
    if (!m) return null;
    const tail = (m[4] || "").toLowerCase();
    const blob = m[0].toLowerCase();
    const isMM = tail ? /^(мм|mm)/.test(tail) : (/мм|mm/.test(blob) && !/см|cm/.test(blob));
    const isM = tail ? /^(м|m)$/.test(tail) : false;
    const c = (n) => (isMM ? Math.round(n / 10) : isM ? Math.round(n * 100) : n);
    return { w: c(+m[1]), d: c(+m[2]), h: c(+m[3]) };
  }

  /* ----------------------------- JSON-LD ----------------------------- */
  // Достать все JSON-LD блоки regex'ом (DOM не нужен) и распарсить терпимо.
  function jsonLdBlocks(html) {
    const out = [];
    const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(html))) {
      // Снимаем ТОЛЬКО обёртки (HTML-комментарий / CDATA), не трогая содержимое
      // строк JSON — иначе «<!-- -->» внутри значения молча портит данные.
      const raw = m[1].trim()
        .replace(/^<!--/, "").replace(/-->$/, "")
        .replace(/^\s*(?:\/\/)?\s*<!\[CDATA\[/, "").replace(/(?:\/\/)?\s*\]\]>\s*$/, "")
        .trim();
      try { out.push(JSON.parse(raw)); }
      catch {
        // некоторые сайты кладут несколько объектов подряд — пробуем обернуть в массив
        try { out.push(JSON.parse("[" + raw.replace(/}\s*{/g, "},{") + "]")); } catch { /* пропуск битого блока */ }
      }
    }
    return out;
  }

  // Развернуть граф/массивы/@graph в плоский список узлов
  function flattenLd(node, acc) {
    acc = acc || [];
    if (!node || typeof node !== "object") return acc;
    if (Array.isArray(node)) { node.forEach((n) => flattenLd(n, acc)); return acc; }
    acc.push(node);
    if (Array.isArray(node["@graph"])) node["@graph"].forEach((n) => flattenLd(n, acc));
    return acc;
  }

  const ldType = (n) => [].concat(n["@type"] || n.type || []).map((t) => String(t).toLowerCase());
  const isProduct = (n) => ldType(n).some((t) => t === "product" || t.endsWith("product"));

  // offers (Offer | AggregateOffer | массив) → минимальная цена + валюта.
  // priceSpecification — частый способ задать цену вместо прямого price/lowPrice.
  function offerPrice(offers) {
    if (!offers) return {};
    if (Array.isArray(offers)) {
      const ps = offers.map(offerPrice).filter((o) => o.price != null);
      if (!ps.length) return {};
      return ps.reduce((a, b) => (b.price < a.price ? b : a));
    }
    const spec = offers.priceSpecification ? (Array.isArray(offers.priceSpecification) ? offers.priceSpecification[0] : offers.priceSpecification) : null;
    const price = parsePrice(offers.price != null ? offers.price : (offers.lowPrice != null ? offers.lowPrice : (spec && spec.price)));
    return { price, currency: clean(offers.priceCurrency || (spec && spec.priceCurrency)) };
  }

  function fromJsonLd(html) {
    const nodes = jsonLdBlocks(html).flatMap((b) => flattenLd(b));
    const p = nodes.find(isProduct);
    if (!p) return null;
    const off = offerPrice(p.offers);
    const f = {
      title: pickName(p.name),
      img: pickImage(p.image),
      sku: clean(p.sku || p.mpn || p.gtin13 || p.gtin),
      supplier: pickName(p.brand) || pickName(p.manufacturer),
      material: clean(p.material),
      price: off.price != null ? off.price : null,
      currency: off.currency,
      dims: { w: toCm(p.width), d: toCm(p.depth), h: toCm(p.height) },
      _category: clean(p.category),
    };
    // additionalProperty → габариты/материал, если ещё пусто.
    // Ловушка (найдена бенчем клиппера, волна E1, iddis.ru): единица измерения иногда
    // зашита в ИМЕНИ свойства («Длина изделия, мм» / «Length, mm» / «Ширина (mm)»), а не
    // в значении («124,5») — toCm() смотрит только на значение и по умолчанию считает его
    // сантиметрами, завышая габарит в 10 раз (кириллица/латиница, запятая/скобка/двоеточие/
    // пробел перед единицей — все варианты, найденные ревью раунда 1). Если у значения
    // своей единицы нет — передаём маркер через штатный объектный контракт toCm()
    // {value, unitText} (тот же, что уже используют JSON-LD QuantitativeValue выше по
    // файлу), а не строковой склейкой.
    const UNIT_IN_NAME = /(?:^|[,:(]|\s)(мм|mm)\.?\)?\s*$/i;
    const withUnit = (name, val) => {
      if (typeof val !== "string" && typeof val !== "number") return val;
      if (/мм|mm/i.test(String(val))) return val;          // маркер уже в самом значении
      if (UNIT_IN_NAME.test(name)) return { value: val, unitText: "мм" };
      return val;
    };
    const props = [].concat(p.additionalProperty || []);
    props.forEach((pr) => {
      const name = (clean(pr.name)).toLowerCase();
      const val = withUnit(name, pr.value);
      if (/ширина|width/.test(name) && f.dims.w === "") f.dims.w = toCm(val);
      else if (/глубина|длина|depth|length/.test(name) && f.dims.d === "") f.dims.d = toCm(val);
      else if (/высота|height/.test(name) && f.dims.h === "") f.dims.h = toCm(val);
      else if (/материал|material/.test(name) && !f.material) f.material = clean(pr.value);
    });
    return f;
  }

  /* ----------------------------- META / OPENGRAPH ----------------------------- */
  function metaTags(html) {
    const tags = {};
    const re = /<meta\b[^>]*>/gi;
    let m;
    while ((m = re.exec(html))) {
      const tag = m[0];
      const key = (tag.match(/\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i) || [])[1];
      const val = (tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i) || [])[1];
      if (key && val != null) tags[key.toLowerCase()] = decodeEntities(val);
    }
    return tags;
  }

  function fromMeta(html) {
    const t = metaTags(html);
    const g = (...keys) => firstStr(...keys.map((k) => t[k]));
    return {
      title: g("og:title", "twitter:title"),
      img: g("og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"),
      price: parsePrice(g("product:price:amount", "og:price:amount", "product:sale_price:amount")),
      // розница до скидки (RRP-слой, п.17): og-теги «старой» цены; санити old>price — в extractFromHtml
      oldPrice: parsePrice(g("product:original_price:amount", "og:price:standard_amount")),
      currency: g("product:price:currency", "og:price:currency"),
      sku: g("product:retailer_item_id", "product:retailer_part_no"),
      supplier: g("og:brand", "product:brand"), // настоящий бренд — структурный (STRONG)
      _siteName: g("og:site_name"),             // имя магазина — слабый фолбэк, не STRONG
      _desc: g("og:description", "description"),
    };
  }

  /* ----------------------------- MICRODATA (DOM, опционально) ----------------------------- */
  function fromMicrodata(html) {
    if (typeof DOMParser === "undefined") return microdataRegex(html);
    let doc;
    try { doc = new DOMParser().parseFromString(html, "text/html"); } catch { return null; }
    const scope = doc.querySelector('[itemtype*="Product" i]') || doc;
    const prop = (name) => {
      const el = scope.querySelector('[itemprop="' + name + '"]');
      if (!el) return "";
      return clean(el.getAttribute("content") || el.getAttribute("src") || el.getAttribute("href") || el.textContent);
    };
    return {
      title: prop("name"),
      price: parsePrice(prop("price") || prop("lowPrice")),
      currency: prop("priceCurrency"),
      img: prop("image"),
      sku: prop("sku") || prop("mpn"),
      supplier: prop("brand"),
      material: prop("material"),
    };
  }

  // Бедный фолбэк микроданных без DOM — точечный regex по itemprop.
  function microdataRegex(html) {
    const grab = (name) => {
      const tag = (html.match(new RegExp('<[^>]*itemprop\\s*=\\s*["\']' + name + '["\'][^>]*>', "i")) || [])[0];
      if (!tag) return "";
      return clean((tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i) || [])[1]);
    };
    return { price: parsePrice(grab("price")), currency: grab("priceCurrency"), sku: grab("sku") };
  }

  /* ----------------------------- ЗАГОЛОВОК-ФОЛБЭК ----------------------------- */
  function titleFromHtml(html) {
    const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1];
    const ti = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
    return clean(decodeEntities((h1 || ti || "").replace(/<[^>]+>/g, "")));
  }

  /* ----------------------------- СЛИЯНИЕ ИСТОЧНИКОВ ----------------------------- */
  // Поля по приоритету источников; для каждого поля запоминаем, откуда взято.
  const FIELDS = ["title", "price", "currency", "img", "sku", "supplier", "material", "oldPrice"];

  /* Зачёркнутая «старая цена» магазина (RRP-слой, роадмап п.17) — текстовая эвристика:
     <del>/<s> или элемент с классом old/crossed-price. Узкое окно (до 80 симв.) — чтобы
     не съесть цену соседнего товара из листинга; санити «старая ВЫШЕ текущей» — на выходе. */
  function oldPriceFromHtml(html) {
    // «похоже на деньги», а не случайный зачёркнутый текст (год, номер версии, бейдж «хит»):
    // валюта, разрядный пробел («189 000», в т.ч. nbsp) или ≥5 цифр подряд
    const looksMoney = (t) => /₽|руб|\$|€/i.test(t) || /\d{1,3}[  ]\d{3}/.test(t) || /\d{5,}/.test(t);
    // В каждом источнике перебираем ВСЕ совпадения и берём первое, похожее на деньги: первый
    // зачёркнутый элемент часто НЕ цена (бейдж, старое название) — прежний .match() без /g брал
    // только его и молча терял розницу из следующего элемента (найдено ревью). Регэкспы —
    // локальные: с флагом /g их lastIndex нельзя переживать вызов функции.
    const SRC = [
      { re: /<(del|s)\b[^>]*>([\s\S]{0,80}?)<\/\1>/gi, g: 2 },   // симметричные теги (\1) — не сшиваем <del>…</s>
      { re: /<[^>]*class\s*=\s*["'][^"']*(?:old[-_]?price|price[-_]?old|crossed[-_]?price)[^"']*["'][^>]*>([\s\S]{0,80}?)<\//gi, g: 1 },
    ];
    for (const { re, g } of SRC) {
      let m;
      while ((m = re.exec(html)) !== null) {
        const txt = String(m[g] || "").replace(/<[^>]+>/g, "");
        if (looksMoney(txt)) return parsePrice(txt);
      }
    }
    return null;
  }

  function extractFromHtml(html, url) {
    html = String(html || "");
    const ld = fromJsonLd(html) || {};
    const md = fromMicrodata(html) || {};
    const mt = fromMeta(html) || {};
    // приоритет: JSON-LD (самый надёжный) → Microdata → OG/meta
    const layers = [["json-ld", ld], ["microdata", md], ["og", mt]];

    const fields = {};
    const sources = {};
    FIELDS.forEach((k) => {
      for (const [src, layer] of layers) {
        const v = layer[k];
        if (v != null && v !== "") { fields[k] = v; sources[k] = src; break; }
      }
    });

    // габариты: JSON-LD → текст (title + description)
    let dims = ld.dims && (ld.dims.w || ld.dims.d || ld.dims.h) ? ld.dims : null;
    let dimsSrc = dims ? "json-ld" : null;
    if (!dims) {
      const fromText = dimsFromText((fields.title || "") + " " + (mt._desc || ""));
      if (fromText) { dims = fromText; dimsSrc = "text"; }
    }

    // заголовок-фолбэк из <h1>/<title>
    if (!fields.title) { const t = titleFromHtml(html); if (t) { fields.title = t; sources.title = "text"; } }

    // «старая цена» (RRP): og-тег → текстовая эвристика <del>/<s>/old-price; санити —
    // старая цена обязана быть ВЫШЕ текущей, иначе это не «розница до скидки», выкидываем
    if (fields.oldPrice == null) { const op = oldPriceFromHtml(html); if (op != null) { fields.oldPrice = op; sources.oldPrice = "text"; } }
    if (fields.oldPrice != null && !(fields.price != null && fields.oldPrice > fields.price)) { delete fields.oldPrice; delete sources.oldPrice; }

    // материал-эвристика из текста (если структурно не нашли)
    if (!fields.material) {
      const mat = materialFromText((fields.title || "") + " " + (mt._desc || ""));
      if (mat) { fields.material = mat; sources.material = "guess"; }
    }

    // поставщик-фолбэк: имя магазина (og:site_name) → домен. Оба — СЛАБЫЕ источники
    // (не STRONG), чтобы не затирать бренд, введённый дизайнером вручную.
    if (!fields.supplier && mt._siteName) { fields.supplier = mt._siteName; sources.supplier = "og-site"; }
    if (!fields.supplier && url) { const s = supplierFromUrl(url); if (s) { fields.supplier = s; sources.supplier = "url"; } }

    if (dims) { fields.dims = dims; sources.dims = dimsSrc; }
    fields.url = clean(url);
    if (ld._category) fields._category = ld._category;

    return {
      fields,
      sources,
      currency: fields.currency || "",
      productSchema: !!(ld && Object.keys(ld).length), // нашли ли schema.org/Product
      confidence: scoreConfidence(fields, sources),
    };
  }

  // 0..1: цена важнее всего; JSON-LD/Product поднимает доверие.
  function scoreConfidence(fields, sources) {
    let s = 0;
    if (fields.title) s += 0.2;
    if (fields.price != null) s += 0.4;
    if (fields.img) s += 0.1;
    if (fields.sku) s += 0.05;
    if (fields.dims) s += 0.05;
    if (sources.price === "json-ld" || sources.title === "json-ld") s += 0.2;
    return Math.min(1, Math.round(s * 100) / 100);
  }

  /* ----------------------------- МАППИНГ В ПОЗИЦИЮ FF&E ----------------------------- */
  // Только http/https-картинки попадают в позицию (отсекаем data:/blob:/относительные).
  const safeImg = (u) => (/^https?:\/\//i.test(u || "") ? u : "");

  // Извлечённые поля → объект для LedgerFFE.blankPosition (наш единый словарь).
  function mapToPosition(extracted) {
    const f = (extracted && extracted.fields) || {};
    const over = {
      title: f.title || "",
      price: f.price != null ? f.price : 0,
      // экстракция зовёт поле supplier, схема позиции — sup (канон, blankPosition)
      sup: f.supplier || "",
      url: f.url || "",
      sku: f.sku || "",
      material: f.material || "",
      img: safeImg(f.img),
    };
    if (f.oldPrice != null && f.oldPrice > 0) over.rrp = f.oldPrice;   // розница (RRP-слой, п.17)
    if (f.dims) over.dims = f.dims;
    if (f._category) over.cat = f._category;
    return window.LedgerFFE ? window.LedgerFFE.blankPosition(over) : over;
  }

  /* ----------------------------- СЛИЯНИЕ В ФОРМУ (чистая, тестируемая) -----------------------------
     Источники-классы: STRONG (структурные) ПЕРЕЗАПИСЫВАЮТ значение; слабые
     (text/guess/url/og-site) только заполняют пустое — не затирают ручной ввод.
     Возвращает { next, filled }: next — новый объект позиции, filled — какие поля
     реально записаны (для честного отчёта в UI). Вынесено из React-компонента,
     чтобы покрыть тестами (раньше логика жила в applyExtract и не тестировалась). */
  const STRONG_SOURCES = new Set(["json-ld", "microdata", "og"]);
  // [ключ-позиции, подпись, ключ-источника?] — у поставщика ключ позиции `sup` (канон схемы),
  // а sources из экстракции зовёт его `supplier`, поэтому 3-й элемент разводит их
  const FIELD_LABELS = [["title", "имя"], ["price", "цена"], ["rrp", "розница", "oldPrice"], ["sup", "поставщик", "supplier"], ["sku", "артикул"], ["material", "материал"], ["img", "фото"]];

  function mergeIntoPosition(current, extracted) {
    const pos = mapToPosition(extracted);
    const src = (extracted && extracted.sources) || {};
    const next = { ...(current || {}), dims: { ...((current && current.dims) || {}) } };
    const filled = [];
    const blank = (v, k) => v === "" || v == null || (k === "price" && !Number(v));
    const put = (k, label, srcKey) => {
      if (!pos[k]) return;
      if ((blank(next[k], k) || STRONG_SOURCES.has(src[srcKey || k])) && String(next[k]) !== String(pos[k])) { next[k] = pos[k]; filled.push(label); }
    };
    FIELD_LABELS.forEach(([k, label, srcKey]) => put(k, label, srcKey));
    if (pos.cat && pos.cat !== "Прочее" && (next.cat === "" || next.cat == null || next.cat === "Прочее")) next.cat = pos.cat;
    if (pos.dims) ["w", "d", "h"].forEach((k) => { if (pos.dims[k] && (blank(next.dims[k]) || STRONG_SOURCES.has(src.dims))) next.dims[k] = pos.dims[k]; });
    if (!next.url) next.url = pos.url;
    return { next, filled };
  }

  /* ----------------------------- СЛОЙ B: LLM-ФОЛБЭК (серверный экстрактор, план 1.1) -----------------------------
     extractFromHtml — это СЛОЙ A: детерминированный разбор структурной разметки
     (JSON-LD → Microdata → OG/meta). Эмпирика 29.06 (divan.ru, Hoff) показала, что
     на РФ-вебе разметки часто нет (divan.ru — без schema.org) или она неполна (Hoff —
     JSON-LD с ценой/sku, но БЕЗ габаритов/материала; а в видимом тексте 4 варианта
     «размер×цена»). Поэтому СЛОЙ B добирает ПУСТОТЫ одним LLM-вызовом поверх видимого текста.

     Контракт (ядро будущей Yandex Cloud Function):
     • LLM ИНЪЕКТИРУЕТСЯ (opts.llm) — пайплайн транспорт- и провайдер-агностичен, тестируется
       с фейковым llm. // → API: реальный llm = вызов YandexGPT/GigaChat со строгой json_schema (Фаза 4.1).
     • LLM — СЛАБЫЙ источник: только заполняет пустое, НИКОГДА не перезаписывает структурные
       (STRONG) поля Слоя A. Это защита от «угадал не ту цену» (Hoff: 4 цены на странице —
       каноничную берём из JSON-LD, LLM её не трогает).
     • Никогда не бросает: сбой/таймаут LLM → молча возвращаем результат Слоя A.
     • Транспорт (fetch/рендер) НЕ здесь: живой тест показал, что серверный fetch с ДЦ-IP
       режется анти-ботом (Hoff 401), а в браузере пользователя страница открывается — HTML
       приходит из клиентской сессии и передаётся сюда уже готовым. */

  // HTML → видимый текст (для LLM). Снимаем скрипты/стили/теги, декодируем сущности,
  // схлопываем пробелы; режем до maxChars (токен-бюджет: берём видимую «голову» страницы).
  function htmlToText(html, maxChars) {
    const cap = (typeof maxChars === "number" && maxChars >= 0) ? maxChars : 12000;
    // Усекаем СЫРОЙ html ДО прогона regex — жёсткий потолок стоимости (ReDoS-защита:
    // ленивый <script>…</script> на множестве незакрытых тегов иначе деградирует до O(n²)).
    // Запас ×4 + 4кБ: теги/сущности схлопнутся, видимого текста выйдет не больше cap.
    const src = String(html || "").slice(0, cap * 4 + 4096);
    const t = src
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"')
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16))) // hex-сущности
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))                       // десятичные
      .replace(/&amp;/gi, "&") // &amp; декодируем ПОСЛЕДНИМ, чтобы не двойного-декодировать «&amp;lt;»
      .replace(/\s+/g, " ")
      .trim();
    return t.length > cap ? t.slice(0, cap) : t;
  }

  // Каких полей не хватает для сметы после Слоя A — это «запрос» к LLM.
  function missingFields(base) {
    const f = (base && base.fields) || {};
    const need = [];
    if (!f.title) need.push("title");
    if (f.price == null) need.push("price");
    if (!f.dims || !(f.dims.w || f.dims.d || f.dims.h)) need.push("dims");
    if (!f.material) need.push("material");
    if (!f.img) need.push("img");
    if (!f.sku) need.push("sku");
    if (!f.supplier) need.push("supplier");
    return need;
  }

  // Влить догадку LLM как СЛАБЫЙ источник "llm": ТОЛЬКО в пустые поля Слоя A.
  function mergeLlmGuess(base, guess) {
    const fields = { ...base.fields, dims: { ...((base.fields && base.fields.dims) || {}) } };
    const sources = { ...base.sources };
    const blank = (v) => v == null || v === "";
    const fill = (k, val) => { if (!blank(val) && blank(fields[k])) { fields[k] = val; sources[k] = "llm"; } };

    fill("title", clean(guess.title));
    const p = parsePrice(guess.price);
    if (p != null && blank(fields.price)) {
      // currency от LLM ставим ТОЛЬКО вместе с LLM-ценой — иначе слабый LLM мог бы пометить
      // чужой валютой каноничную СТРУКТУРНУЮ цену, у которой не было priceCurrency.
      fields.price = p; sources.price = "llm";
      if (blank(fields.currency)) { fields.currency = clean(guess.currency) || "RUB"; sources.currency = "llm"; }
    }
    fill("material", clean(guess.material));
    fill("sku", clean(guess.sku));
    fill("supplier", pickName(guess.supplier));
    fill("img", safeImg(clean(guess.img)));

    // dims от LLM: объект {w,d,h} или строка «254×122×87 см» (разбираем нашим dimsFromText).
    let gdims = guess.dims;
    if (typeof gdims === "string") { const parsed = dimsFromText(gdims); if (parsed) gdims = parsed; }
    if (gdims && typeof gdims === "object") {
      let touched = false;
      ["w", "d", "h"].forEach((k) => {
        const cm = toCm(gdims[k]);
        if (cm !== "" && blank(fields.dims[k])) { fields.dims[k] = cm; touched = true; }
      });
      if (touched && !sources.dims) sources.dims = "llm";
    }
    if (!(fields.dims.w || fields.dims.d || fields.dims.h)) delete fields.dims; // не держим пустые габариты

    return {
      fields,
      sources,
      currency: fields.currency || "",
      productSchema: base.productSchema,
      confidence: scoreConfidence(fields, sources),
    };
  }

  // Главная точка серверного экстрактора: HTML → извлечённое, Слой A + (если нужно) Слой B.
  // Никогда не бросает. opts.llm(pageText, ctx) → частичные поля (или null/throw — терпим).
  async function extractWithFallback(html, url, opts) {
    opts = opts || {};
    const base = extractFromHtml(html, url);
    const need = missingFields(base);
    if (!need.length || typeof opts.llm !== "function") {
      return { ...base, llmUsed: false, llmNeeded: need };
    }
    let guess = null;
    try {
      const text = htmlToText(html, opts.maxChars);
      guess = await opts.llm(text, { need, url: clean(url), title: (base.fields && base.fields.title) || "" });
    } catch { guess = null; } // сбой LLM не валит извлечение — отдаём Слой A
    if (!guess || typeof guess !== "object" || Array.isArray(guess)) {
      return { ...base, llmUsed: false, llmNeeded: need };
    }
    const merged = mergeLlmGuess(base, guess);
    // llmUsed честно = LLM реально что-то добавил (появился источник "llm"), а не «вернул объект».
    const llmUsed = Object.keys(merged.sources).some((k) => merged.sources[k] === "llm");
    return { ...merged, llmUsed, llmNeeded: need };
  }

  /* ----------------------------- СЕТЬ (транспорт прототипа) -----------------------------
     Прямой fetch → публичные CORS-прокси. Серверный экстрактор заменит это.
     // → API: POST /api/clip { url } на Yandex Cloud Function (extruct + AI-фолбэк). */
  const PROXIES = [
    (u) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u),
    (u) => "https://corsproxy.io/?url=" + encodeURIComponent(u),
  ];

  async function tryFetch(u) {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 15000) : null;
    try {
      const res = await fetch(u, ctrl ? { signal: ctrl.signal } : undefined);
      if (!res.ok) throw new Error("HTTP " + res.status);
      // Прокси на ошибку отдают 200 с JSON-конвертом/страницей-заглушкой — отсекаем
      // по content-type, чтобы не принять её за HTML товара (ложный «парковочный» товар).
      const ct = (res.headers && res.headers.get && res.headers.get("content-type")) || "";
      if (ct && !/text\/html|application\/xhtml|text\/plain/i.test(ct)) throw new Error("не HTML (" + ct.split(";")[0] + ")");
      const text = await res.text();
      if (!text || text.length < 50) throw new Error("пустой ответ");
      return text;
    } finally { if (timer) clearTimeout(timer); }
  }

  async function fetchHtml(url) {
    let lastErr;
    try { return { html: await tryFetch(url), via: "direct" }; } catch (e) { lastErr = e; }
    for (const mk of PROXIES) {
      try { return { html: await tryFetch(mk(url)), via: "proxy" }; } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error("не удалось загрузить страницу");
  }

  // Главная точка: URL → извлечённая позиция. Никогда не бросает — возвращает {ok}.
  async function clip(url) {
    const u = clean(url);
    if (!/^https?:\/\//i.test(u)) return { ok: false, error: "Укажите ссылку (http/https)." };
    try {
      const { html, via } = await fetchHtml(u);
      const extracted = extractFromHtml(html, u);
      if (!extracted.fields.title && extracted.fields.price == null) {
        return { ok: false, error: "На странице не нашлось данных товара.", via, extracted };
      }
      return { ok: true, via, extracted };
    } catch (e) {
      return { ok: false, blocked: true, error: clean(e && e.message) || "Не удалось загрузить страницу (CORS)." };
    }
  }

  window.LedgerClipper = {
    extractFromHtml, extractWithFallback, htmlToText, mapToPosition, mergeIntoPosition, clip, fetchHtml,
    STRONG_SOURCES,
    // экспорт внутренностей для тестов и переиспользования
    parsePrice, dimsFromText, materialFromText, toCm, supplierFromUrl, scoreConfidence, offerPrice,
  };
})();
