/* ============================================================
   Design Ledger — AI-подбор аналогов по вебу (п.19-2): КАРКАС (пока выключен)
   ------------------------------------------------------------
   Что это. Сейчас замены отклонённой позиции берутся ТОЛЬКО из уже собранного
   дизайнером — библиотека студии + позиции прошлых проектов (LedgerFFE.suggestAlternatives,
   web/ffe.js). У Programa аналоги ищет ИИ по всему вебу: анализирует товар + комментарий
   клиента («дешевле», «другой цвет», «без такой глубины») и предлагает похожие карточки.

   Этот модуль — КОНТУР этой фичи, НЕ включённый в живой UI:
   • ANALOG_SYSTEM / buildAnalogPrompt — сам промпт под РФ-каскад (тот же провайдер-агностик,
     что у клиппера: YandexGPT/GigaChat). Промпт — главный переносимый артефакт, его можно
     доводить и тестировать без сети.
   • suggestWebAnalogs(target, opts) — транспорт-агностична РОВНО как слой B клиппера:
     LLM ИНЪЕКТИРУЕТСЯ (opts.llm). Без opts.llm возвращает { configured:false, analogs:[] } —
     ничего не зовёт, ничего не бросает. Так контур присутствует и юнит-тестируем, но дремлет.

   Блокер включения — ТОТ ЖЕ, что у этапа 2 клиппера и портала: нужен живой LLM-эндпоинт
   (ключи + домен Cloud Function) И источник кандидатов (веб-поиск/браузинг или фид фабрик).
   План интеграции и критерии готовности — docs/AI_ANALOGS_PROMPT.md.
   ============================================================ */
(function () {
  "use strict";

  const clean = (s) => (s == null ? "" : String(s).trim());
  const num = (v, d) => { const n = Number(v); return isFinite(n) ? n : (d == null ? 0 : d); };

  /* Системная инструкция для РФ-каскада. Модель — СЛАБЫЙ, но веб-осведомлённый источник:
     предлагает аналоги, НИКОГДА не выдумывает цену/ссылку с уверенностью (лучше пусто, чем
     враньё). Строгий JSON на выходе — как и слой B клиппера, парсим машинно, а не текст. */
  const ANALOG_SYSTEM = [
    "Ты — ассистент комплектатора интерьера на российском рынке.",
    "Задача: по описанию товара и комментарию клиента предложить 3–5 аналогов (похожая функция и стиль),",
    "которые реально продаются в РФ. Учитывай пожелание клиента буквально: «дешевле» → ниже цена,",
    "«другой цвет/материал» → смени именно это, «компактнее» → меньше габарит.",
    "Правила: не выдумывай точную цену и ссылку — если не уверен, оставляй поле пустым (\"\" или null).",
    "Не повторяй исходный товар. Отвечай ТОЛЬКО валидным JSON без пояснений, по схеме:",
    '{"analogs":[{"title":"","supplier":"","price":null,"url":"","reason":""}]}',
    "reason — короткое (до 12 слов) объяснение, чем аналог отвечает на комментарий клиента.",
  ].join(" ");

  // Собрать пользовательскую часть промпта из целевой позиции + комментария клиента.
  function buildAnalogPrompt(target, clientNote) {
    const t = target || {};
    const dims = t.dims && typeof t.dims === "object" ? t.dims : {};
    const dimStr = [dims.w, dims.d, dims.h].some((x) => x) ? [dims.w, dims.d, dims.h].map((x) => x || "?").join("×") + " см" : "";
    const lines = [
      "Товар: " + (clean(t.title) || "—"),
      t.cat ? "Раздел: " + clean(t.cat) : "",
      t.price != null && num(t.price) > 0 ? "Текущая цена: " + Math.round(num(t.price)) + " ₽" : "",
      t.sup ? "Поставщик: " + clean(t.sup) : "",
      t.material ? "Материал: " + clean(t.material) : "",
      dimStr ? "Габариты: " + dimStr : "",
      "Комментарий клиента: " + (clean(clientNote) || "нужен аналог"),
    ];
    return lines.filter(Boolean).join("\n");
  }

  // Нормализуем один аналог от LLM в мягкую карточку (совместима с blankProduct по полям).
  function normAnalog(a) {
    if (!a || typeof a !== "object") return null;
    const title = clean(a.title);
    if (!title) return null;
    const price = a.price != null && num(a.price) > 0 ? Math.round(num(a.price)) : null;
    return {
      title,
      supplier: clean(a.supplier),
      price,
      url: clean(a.url),
      reason: clean(a.reason),
      _src: "веб (ИИ)",
    };
  }

  /* Транспорт-агностично, как слой B клиппера. opts.llm(prompt, ctx) → JSON-строка или объект.
     Без opts.llm — контур дремлет: { configured:false }. Никогда не бросает. */
  async function suggestWebAnalogs(target, opts) {
    const o = opts || {};
    if (typeof o.llm !== "function") return { configured: false, analogs: [] };
    const prompt = buildAnalogPrompt(target, o.clientNote);
    let raw = null;
    try {
      raw = await o.llm(prompt, { system: ANALOG_SYSTEM, target: target || null });
    } catch { return { configured: true, analogs: [], error: "llm_failed" }; }
    let parsed = raw;
    if (typeof raw === "string") { try { parsed = JSON.parse(raw); } catch { parsed = null; } }
    const arr = parsed && Array.isArray(parsed.analogs) ? parsed.analogs : [];
    const analogs = arr.map(normAnalog).filter(Boolean).slice(0, Math.max(1, num(o.limit, 5)));
    return { configured: true, analogs };
  }

  // Готов ли контур к реальному вызову (инъектирован ли транспорт LLM).
  function isConfigured(opts) { return !!(opts && typeof opts.llm === "function"); }

  window.LedgerWebAnalogs = {
    ANALOG_SYSTEM, buildAnalogPrompt, normAnalog, suggestWebAnalogs, isConfigured,
  };
})();
