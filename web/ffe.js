/* ============================================================
   AIVibe — единая схема позиции сметы (FF&E) + клиентское хранилище
   ------------------------------------------------------------
   FF&E = Furniture, Fixtures & Equipment — отраслевой состав
   комплектации интерьера (мебель, техника, сантехника, свет,
   текстиль, декор). Это «единый словарь» одной позиции сметы:
   ВСЕ экраны и будущий серверный экстрактор-клиппер заполняют
   ровно эти поля. Поэтому когда подключится бэкенд (Фаза 1.1),
   ему не нужно придумывать формат — он пишет в эту же схему.

   Точки замены под реальный бэкенд помечены  // → API:
   ============================================================ */
(function () {
  /* ----------------------------- СПРАВОЧНИКИ ----------------------------- */
  /* Закупочные разделы (категории). Свободный ввод тоже разрешён —
     это лишь подсказки в выпадающем списке. Совпадают с разделами,
     которые уже используются в реальном проекте p_kirova. */
  const FFE_CATEGORIES = [
    "Мебель", "Мягкая мебель", "Кухня", "Техника", "Сантехника",
    "Освещение", "Текстиль", "Декор", "Хранение", "Отделка", "Прочее",
  ];

  /* Единицы измерения (Фаза 2.3 — доставка/монтаж строками, UOM). */
  const FFE_UNITS = ["шт", "компл", "м", "м²", "пог.м"];

  /* Статусы закупки — 8 стадий (Фаза 2.1). Отраслевой пайплайн комплектации
     FF&E: подбор → согласование → заказ → производство → отгрузка → доставка →
     монтаж → приёмка. order — порядковый номер стадии (для прогресса и сортировки),
     color — CSS-переменная для чипа (от нейтрального к «готово»). */
  const FFE_STATUSES = [
    { id: "specified", label: "Подбор",        short: "Подбор",   order: 1, color: "var(--faint)" },
    { id: "approved",  label: "Согласовано",   short: "Соглас.",  order: 2, color: "var(--info)" },
    { id: "ordered",   label: "Заказано",      short: "Заказ",    order: 3, color: "var(--accent)" },
    { id: "production", label: "В производстве", short: "Произв.", order: 4, color: "var(--accent)" },
    { id: "shipped",   label: "Отгружено",     short: "Отгруз.",  order: 5, color: "var(--chart)" },
    { id: "delivered", label: "Доставлено",    short: "Достав.",  order: 6, color: "var(--accent-2)" },
    { id: "installed", label: "Установлено",   short: "Монтаж",   order: 7, color: "var(--accent-2)" },
    { id: "accepted",  label: "Принято",       short: "Принято",  order: 8, color: "var(--accent-2)" },
  ];
  const STATUS_BY_ID = Object.fromEntries(FFE_STATUSES.map((s) => [s.id, s]));
  const STATUS_LABEL = Object.fromEntries(FFE_STATUSES.map((s) => [s.id, s.label]));
  const DEFAULT_STATUS = "specified";
  const statusMeta = (id) => STATUS_BY_ID[id] || STATUS_BY_ID[DEFAULT_STATUS];
  const statusProgress = (id) => statusMeta(id).order / FFE_STATUSES.length; // 0..1

  /* Согласование с клиентом ПО ПОЗИЦИЯМ (волна A1, бенчмарк Programa) — отдельное
     измерение от стадии закупки: «Согласовано» в закупке = решение уже принято,
     а здесь — сам диалог с клиентом. pending не пишется в данные (отсутствие поля
     = ждёт решения) — старые сметы ничего не мигрируют. Это же поле будет ставить
     клиент через портал (волна A2/A3). */
  const APPROVE_STATUSES = [
    { id: "pending",  label: "Ждёт решения", short: "Ждёт",    color: "var(--faint)" },
    { id: "ok",       label: "Согласовано",  short: "Соглас.", color: "var(--accent-2)" },
    { id: "revise",   label: "На пересмотр", short: "Пересм.", color: "var(--info)" },
    { id: "rejected", label: "Отклонено",    short: "Откл.",   color: "var(--accent)" },
  ];
  const APPROVE_BY_ID = Object.fromEntries(APPROVE_STATUSES.map((s) => [s.id, s]));
  const approveMeta = (id) => APPROVE_BY_ID[id] || APPROVE_BY_ID.pending;

  /* ----------------------------- УТИЛИТЫ ----------------------------- */
  const genId = () => "ffe_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const today = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  /* Зафиксировать переход на стадию: проставить дату (если не задана — сегодня),
     не затирая ранее проставленные стадии. Возвращает новый объект statusDates. */
  function stampStatus(statusDates, statusId, date) {
    const sd = { ...(statusDates || {}) };
    sd[statusId] = date || sd[statusId] || today();
    return sd;
  }
  // терпимый парсер чисел: «12 500 ₽» → 12500, «4,5» → 4.5 (пробелы-разделители, запятая-дробь)
  const num = (v, def = 0) => {
    if (typeof v === "number") return isFinite(v) ? v : def;
    const n = parseFloat(String(v == null ? "" : v).replace(/\s/g, "").replace(",", "."));
    return isFinite(n) ? n : def;
  };
  const str = (v) => (v == null ? "" : String(v)).trim();

  /* Эталон одной позиции: ВСЕ поля схемы с дефолтами.
     over — частичный объект (правка/импорт/будущий ответ клиппера).
     depth — внутренний флаг: аналоги нормализуем только на верхнем уровне
     (analog-of-analog не строим — максимум одна вложенность). */
  function blankPosition(over, depth) {
    const o = over || {};
    const dims = o.dims || {};
    return {
      id:       o.id || genId(),
      title:    str(o.title),                 // Наименование (обяз.)
      cat:      str(o.cat) || "Прочее",       // Раздел/категория
      qty:      o.qty != null ? num(o.qty, 1) : 1,  // Количество
      unit:     o.unit || "шт",               // Единица измерения
      price:    o.price != null ? num(o.price, 0) : 0, // Цена за единицу, ₽ (себестоимость)
      supplier: str(o.supplier),              // Поставщик / фабрика / магазин
      url:      str(o.url),                    // Ссылка на товар (источник клиппера)
      sku:      str(o.sku),                    // Артикул
      material: str(o.material),              // Отделка / материал
      dims: {                                  // Габариты, см (Ш×Г×В)
        w: dims.w != null && dims.w !== "" ? num(dims.w, 0) : "",
        d: dims.d != null && dims.d !== "" ? num(dims.d, 0) : "",
        h: dims.h != null && dims.h !== "" ? num(dims.h, 0) : "",
      },
      img:      str(o.img),                    // Фото (URL)
      leadWeeks: o.leadWeeks != null && o.leadWeeks !== "" ? num(o.leadWeeks, 0) : "", // Срок поставки, недель
      wastePct: o.wastePct != null && o.wastePct !== "" ? num(o.wastePct, 0) : "", // Запас/отход, % (для материалов: плитка, краска…)
      status:   STATUS_BY_ID[o.status] ? o.status : DEFAULT_STATUS, // Текущая стадия закупки
      statusDates: o.statusDates && typeof o.statusDates === "object" ? { ...o.statusDates } : {}, // Даты по стадиям {id:YYYY-MM-DD}
      approve:  APPROVE_BY_ID[o.approve] && o.approve !== "pending" ? o.approve : "", // Решение клиента ("" = ждёт)
      approveAt: str(o.approveAt),             // Дата решения (YYYY-MM-DD)
      approveNote: str(o.approveNote),         // Комментарий к решению (треды — волна A3)
      eta:      str(o.eta),                     // Ожидаемая дата готовности/доставки (YYYY-MM-DD)
      note:     str(o.note),                   // Примечание
      analogOf: o.analogOf || null,            // id исходной позиции (если это аналог)
      analogs:  depth ? [] : (Array.isArray(o.analogs) ? o.analogs.map((a) => blankPosition(a, 1)) : []), // Альтернативы (2.2)
      updatedAt: o.updatedAt || today(),       // Дата правки (YYYY-MM-DD)
    };
  }

  /* Привести «сырой» объект к схеме (типы, обрезка, дефолты) + штамп даты.
     Используется и при сохранении из редактора, и при импорте/сидинге. */
  function normalizePosition(raw) {
    const p = blankPosition(raw);
    p.qty = Math.max(1, Math.round(num(p.qty, 1)));
    p.price = Math.max(0, Math.round(num(p.price, 0)));
    if (p.leadWeeks !== "") p.leadWeeks = Math.max(0, Math.round(num(p.leadWeeks, 0)));
    if (p.wastePct !== "") p.wastePct = Math.max(0, Math.round(num(p.wastePct, 0)));
    ["w", "d", "h"].forEach((k) => { if (p.dims[k] !== "") p.dims[k] = Math.max(0, Math.round(num(p.dims[k], 0))); });
    // зафиксировать дату текущей стадии (если ещё не отмечена)
    p.statusDates = stampStatus(p.statusDates, p.status, p.statusDates[p.status]);
    p.updatedAt = today();
    return p;
  }

  /* Габариты → строка «80×45×120 см» (или "" если не заданы). */
  function dimsLabel(dims) {
    if (!dims) return "";
    const parts = ["w", "d", "h"].map((k) => (dims[k] === "" || dims[k] == null ? null : dims[k]));
    if (parts.every((x) => x == null)) return "";
    return parts.map((x) => (x == null ? "—" : x)).join("×") + " см";
  }

  // сумма строки = цена × кол-во × (1 + запас%)
  const lineTotal = (it) => Math.round(num(it.price, 0) * num(it.qty || 1, 1) * (1 + num(it.wastePct || 0, 0) / 100));

  /* ----------------------------- БИБЛИОТЕКА ТОВАРОВ СТУДИИ (волна B1, бенчмарк Programa) -----------------------------
     Мастер-запись товара студии — то, что дизайнер подбирает снова и снова (диван,
     смеситель, люстра). Живёт отдельно от сметы (localStorage, AIVibeAPI.library),
     втекает в позицию сметы и собирается обратно из неё. Схема — подмножество позиции
     БЕЗ количества/стадии закупки/согласования: они рождаются в смете, а не в каталоге.
     Поставщик хранится в поле `sup` (как в строке сметы и выгрузках), НЕ `supplier`
     полной FF&E-схемы — так маппинг товар↔позиция идёт без трения. */
  function blankProduct(over) {
    const o = over || {};
    const dims = o.dims || {};
    const d = (v) => (v != null && v !== "" ? Math.max(0, Math.round(num(v, 0))) : "");
    return {
      title:   str(o.title),                    // Наименование (обяз.)
      cat:     str(o.cat) || "Прочее",          // Раздел
      unit:    o.unit || "шт",                  // Единица измерения
      price:   Math.max(0, Math.round(num(o.price, 0))), // Цена за единицу, ₽ (ориентир студии)
      sup:     str(o.sup || o.supplier),        // Поставщик / фабрика / магазин
      article: str(o.article || o.sku),         // Артикул
      url:     str(o.url),                       // Ссылка на товар
      note:    str(o.note),                      // Примечание
      dims: { w: d(dims.w), d: d(dims.d), h: d(dims.h) }, // Габариты, см (Ш×Г×В)
    };
  }
  // позиция сметы → мастер-запись (собрать библиотеку из реальной работы)
  const productFromPosition = (it) => {
    const o = it || {};
    return blankProduct({ title: o.title, cat: o.cat, unit: o.unit, price: o.price,
      sup: o.sup || o.supplier, article: o.sku || o.article, url: o.url, note: o.note, dims: o.dims });
  };
  // мастер-запись → черновик позиции сметы (кол-во 1; цена свежая на момент добавления)
  const positionFromProduct = (p, date) => {
    const o = p || {};
    const pos = { title: str(o.title), qty: 1, price: Math.max(0, Math.round(num(o.price, 0))) };
    if (str(o.cat)) pos.cat = str(o.cat);
    if (str(o.sup)) pos.sup = str(o.sup);
    pos.priceDate = date || today();
    return pos;
  };

  /* ----------------------------- КЛИЕНТСКИЕ ЦЕНЫ (инвариант UI = PDF = Excel = портал) -----------------------------
     Точное зеркало клиентской матши сметы (project-detail.jsx: catOf/pctOf/unitClient/
     lineClient/client + discountAmt/totalClient) — чтобы клиентский портал (волна A2)
     считал итог ТЕМИ ЖЕ числами, что видит дизайнер. Правило округления то же: округляем
     ЦЕНУ ЗА ШТУКУ, сумма строки = цена × кол-во. snap = снимок версии
     {rooms, markup, catMarkup, discount, delivery, install}. */
  function clientPricing(snap) {
    const s = snap || {};
    const rooms = Array.isArray(s.rooms) ? s.rooms : [];
    const markup = +s.markup || 0;
    const catMarkup = s.catMarkup || {};
    const discount = +s.discount || 0, delivery = +s.delivery || 0, install = +s.install || 0;
    const catOf = (it) => it.cat || "Прочее";
    const pctOf = (cat) => (catMarkup[cat] != null ? catMarkup[cat] : markup);
    const unitClient = (it) => Math.round((it.price || 0) * (1 + pctOf(catOf(it)) / 100));
    const lineClient = (it) => unitClient(it) * (it.qty || 1);
    const client = rooms.reduce((a, r) => a + (r.items || []).reduce((x, it) => x + lineClient(it), 0), 0);
    const discountAmt = Math.round(client * discount / 100);
    const totalClient = client - discountAmt + delivery + install;
    return { catOf, pctOf, unitClient, lineClient, client, discount, discountAmt, delivery, install, totalClient };
  }

  /* ----------------------------- УСЛУГИ И СБОРЫ (доставка/монтаж/налог) -----------------------------
     Отдельные строки в итоге сметы (Фаза 2.3). kind:'percent' — % от стоимости товаров,
     kind:'fixed' — фиксированная сумма ₽. Считаем прозрачно, поверх товаров. */
  const EXTRA_PRESETS = [
    { key: "delivery", label: "Доставка",        kind: "percent", value: 5 },
    { key: "install",  label: "Сборка и монтаж", kind: "percent", value: 5 },
    { key: "tax",      label: "Налог / НДС",     kind: "percent", value: 20 },
  ];
  function blankExtra(over) {
    const o = over || {};
    return { id: o.id || genId(), label: str(o.label) || "Услуга", kind: o.kind === "fixed" ? "fixed" : "percent", value: o.value != null ? num(o.value, 0) : 0 };
  }
  const extraAmount = (extra, base) => extra.kind === "fixed" ? Math.round(num(extra.value, 0)) : Math.round(num(base, 0) * num(extra.value, 0) / 100);
  const extrasTotal = (extras, base) => (extras || []).reduce((s, e) => s + extraAmount(e, base), 0);

  /* ----------------------------- БЕНЧМАРК ₽/м² (калькулятор бюджета) -----------------------------
     Рыночные ориентиры комплектации (FF&E) по сегментам и доли категорий —
     из docs/SMETA_BENCHMARK_20_OBJECTS_2026-06.md (золотая середина ~14 500 ₽/м²).
     Единый источник для калькулятора «бюджет по площади» и автогенерации. */
  const BENCHMARK = {
    segments: [
      { id: "eco",  label: "Эконом",      rate: 7000,  note: "аренда, база" },
      { id: "mid",  label: "Оптимальный", rate: 14500, note: "для себя, комфорт", recommended: true },
      { id: "prem", label: "Премиум",     rate: 30000, note: "дизайнерский" },
    ],
    // доли бюджета по категориям, % (сумма 100) — смещаются с сегментом
    shares: {
      eco:  [["Мебель", 42], ["Техника", 30], ["Сантехника и свет", 14], ["Текстиль и декор", 6], ["Доставка и монтаж", 8]],
      mid:  [["Мебель", 48], ["Техника", 22], ["Сантехника и свет", 14], ["Текстиль и декор", 9], ["Доставка и монтаж", 7]],
      prem: [["Мебель", 52], ["Техника", 16], ["Сантехника и свет", 13], ["Текстиль и декор", 13], ["Доставка и монтаж", 6]],
    },
  };
  function estimateBudget(area, segId) {
    const seg = BENCHMARK.segments.find((s) => s.id === segId) || BENCHMARK.segments[1];
    const a = Math.max(0, num(area, 0));
    const total = Math.round(a * seg.rate);
    const byCat = (BENCHMARK.shares[seg.id] || BENCHMARK.shares.mid).map(([label, pct]) => ({ label, pct, amount: Math.round(total * pct / 100) }));
    return { area: a, seg, rate: seg.rate, total, byCat };
  }

  /* ----------------------------- АВТОГЕНЕРАЦИЯ СМЕТЫ-ЧЕРНОВИКА -----------------------------
     Площадь + сегмент → комнаты + позиции под бюджет. Цены — рыночный ОРИЕНТИР (черновик),
     дизайнер заменяет реальными позициями. bench-группа задаёт, из какой доли бюджета
     берётся цена; cat — отображаемый раздел. */
  const ROOM_W = { living: 34, master: 18, bedroom: 15, kids: 14, bath: 6, hall: 8, wardrobe: 7 };
  const ROOM_NAME = { living: "Кухня-гостиная", master: "Мастер-спальня", bedroom: "Спальня", kids: "Детская", bath: "Санузел", hall: "Прихожая", wardrobe: "Гардеробная" };
  const ROOM_ITEMS = {
    living: [
      ["Кухонный гарнитур", "furn", "Кухня", 30], ["Диван", "furn", "Мягкая мебель", 16],
      ["Обеденная группа (стол + стулья)", "furn", "Мебель", 9], ["Журнальный стол + консоль", "furn", "Мебель", 5],
      ["Холодильник", "tech", "Техника", 11], ["Варочная панель + духовой шкаф", "tech", "Техника", 10],
      ["Вытяжка", "tech", "Техника", 4], ["Посудомоечная машина", "tech", "Техника", 5], ["ТВ", "tech", "Техника", 8],
      ["Кухонная мойка + смеситель", "santlight", "Сантехника", 4], ["Освещение: люстра + подсветка", "santlight", "Освещение", 6],
      ["Шторы и текстиль", "textdecor", "Текстиль", 6], ["Ковёр + декор", "textdecor", "Декор", 5],
    ],
    bedroom: [
      ["Кровать с тумбами", "furn", "Мебель", 16], ["Шкаф / гардероб", "furn", "Хранение", 12],
      ["ТВ", "tech", "Техника", 7], ["Освещение: люстра + бра", "santlight", "Освещение", 5],
      ["Шторы blackout + покрывало", "textdecor", "Текстиль", 7], ["Декор", "textdecor", "Декор", 3],
    ],
    master: [
      ["Кровать с прикроватными тумбами", "furn", "Мебель", 20], ["Гардероб / шкаф", "furn", "Хранение", 14],
      ["Туалетный столик с зеркалом", "furn", "Мебель", 7], ["ТВ", "tech", "Техника", 8],
      ["Освещение: люстра + бра + лампа", "santlight", "Освещение", 6], ["Шторы + текстиль", "textdecor", "Текстиль", 8], ["Декор", "textdecor", "Декор", 4],
    ],
    kids: [
      ["Кровать", "furn", "Мебель", 10], ["Стол + стул", "furn", "Мебель", 6], ["Шкаф + полки", "furn", "Хранение", 12],
      ["Освещение", "santlight", "Освещение", 4], ["Шторы", "textdecor", "Текстиль", 5], ["Декор", "textdecor", "Декор", 3],
    ],
    bath: [
      ["Ванна / душевая система", "santlight", "Сантехника", 12], ["Тумба с раковиной + смеситель", "santlight", "Сантехника", 9],
      ["Унитаз / инсталляция", "santlight", "Сантехника", 7], ["Полотенцесушитель", "santlight", "Сантехника", 3],
      ["Зеркало с подсветкой", "santlight", "Освещение", 4], ["Текстиль и аксессуары", "textdecor", "Текстиль", 3],
    ],
    hall: [
      ["Входная группа: шкаф + зеркало", "furn", "Мебель", 10], ["Освещение: споты", "santlight", "Освещение", 3], ["Декор", "textdecor", "Декор", 2],
    ],
    wardrobe: [
      ["Система хранения", "furn", "Хранение", 16], ["Освещение", "santlight", "Освещение", 2],
    ],
  };
  // набор комнат по площади
  function roomsForArea(a) {
    if (a <= 32) return ["living", "bath", "hall"];
    if (a <= 50) return ["living", "bedroom", "bath", "hall"];
    if (a <= 75) return ["living", "bedroom", "kids", "bath", "hall"];
    if (a <= 110) return ["living", "master", "bedroom", "bath", "hall"];
    return ["living", "master", "bedroom", "kids", "bath", "bath", "hall", "wardrobe"];
  }
  const BENCH_BY_LABEL = { "Мебель": "furn", "Техника": "tech", "Сантехника и свет": "santlight", "Текстиль и декор": "textdecor" };

  function generateEstimate(area, segId) {
    const a = Math.max(15, num(area, 70));
    const res = estimateBudget(a, segId);
    const catAmount = {}; let delivery = 0;
    res.byCat.forEach((c) => { if (c.label === "Доставка и монтаж") delivery = c.amount; else catAmount[BENCH_BY_LABEL[c.label]] = c.amount; });

    const keys = roomsForArea(a);
    const wSum = keys.reduce((s, k) => s + (ROOM_W[k] || 10), 0);
    // суммарные веса позиций по bench-группам (для распределения долей бюджета)
    const benchW = { furn: 0, tech: 0, santlight: 0, textdecor: 0 };
    keys.forEach((k) => (ROOM_ITEMS[k] || []).forEach(([, bench, , w]) => { benchW[bench] += w; }));

    const used = {};
    const rooms = keys.map((k) => {
      const n = (used[k] = (used[k] || 0) + 1);
      const name = ROOM_NAME[k] + (n > 1 ? " " + n : "");
      const roomArea = Math.round((a * (ROOM_W[k] || 10) / wSum) * 10) / 10;
      const items = (ROOM_ITEMS[k] || []).map(([title, bench, cat, w]) => {
        const price = benchW[bench] > 0 ? Math.round((catAmount[bench] || 0) * w / benchW[bench] / 100) * 100 : 0;
        return { title, cat, price, qty: 1 };
      });
      return { name, area: roomArea, items };
    });

    // бюджет черновика = фактическая сумма сгенерированных позиций + доставка (без дрейфа округления)
    const goods = rooms.reduce((s, r) => s + r.items.reduce((x, it) => x + it.price * (it.qty || 1), 0), 0);
    return {
      id: "p_calc",
      name: "Смета-черновик · " + a + " м² · " + res.seg.label,
      area: a, budget: goods + delivery, markupPct: 25, mode: "work",
      rooms,
      extras: delivery > 0 ? [blankExtra({ label: "Доставка и монтаж", kind: "fixed", value: delivery })] : [],
      summaryShort: "Черновик сметы по площади " + a + " м² (" + res.seg.label + ", ~" + res.rate + " ₽/м²). Цены — рыночный ориентир из бенчмарка; замените позиции реальными (вставь-ссылку/каталог). Состав комнат и доли категорий — по сегменту.",
      generated: true,
    };
  }

  // передача черновика между экранами (лендинг → кабинет)
  let _pendingDraft = null;
  const setPendingDraft = (d) => { _pendingDraft = d; };
  const takePendingDraft = () => { const d = _pendingDraft; _pendingDraft = null; return d; };

  /* ----------------------------- ХРАНИЛИЩЕ (клиент) -----------------------------
     Правки сметы пользователь хранит локально в браузере. Это честный плейсхолдер
     до бэкенда: то же самое потом поедет на сервер БЕЗ переписывания UI —
     // → API: GET/PUT /api/projects/:id/estimate  (Yandex Cloud Function + YDB).
     Формат записи: { rooms:[{name, area, items:[<схема выше>]}], savedAt }. */
  const KEY = (projectId) => "aivibe:estimate:" + projectId;

  function loadEstimate(projectId) {
    try {
      const raw = localStorage.getItem(KEY(projectId));
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.rooms)) return null;
      // нормализуем на чтении: схема могла дополниться полями между версиями
      data.rooms = data.rooms.map((r) => ({
        name: str(r.name) || "Без помещения",
        area: r.area || "",
        items: (r.items || []).map((it) => blankPosition(it)),
      }));
      data.extras = Array.isArray(data.extras) ? data.extras.map((e) => blankExtra(e)) : [];
      return data;
    } catch { return null; }
  }

  // payload: { rooms, extras } (или просто rooms — обратная совместимость)
  function saveEstimate(projectId, payload) {
    try {
      const rooms = Array.isArray(payload) ? payload : (payload && payload.rooms) || [];
      const extras = (payload && payload.extras) || [];
      localStorage.setItem(KEY(projectId), JSON.stringify({ rooms, extras, savedAt: new Date().toISOString() }));
      return true;
    } catch { return false; }
  }

  function clearEstimate(projectId) {
    try { localStorage.removeItem(KEY(projectId)); return true; } catch { return false; }
  }

  /* ----------------------------- ВЕРСИИ + СОГЛАСОВАНИЕ (Фаза 2.4) -----------------------------
     Снимок сметы (snapshot) с историей и статусом согласования с клиентом. Фундамент
     клиентского портала. Хранение — localStorage; // → API: позже YDB.
     Запись версии: { id, label, createdAt, total, clientTotal, positions, status, statusAt,
     note, snapshot:{rooms, extras, markup, mode} }. */
  const VERSION_STATUSES = [
    { id: "draft",    label: "Черновик",            color: "var(--faint)" },
    { id: "sent",     label: "Отправлена клиенту",  color: "var(--info)" },
    { id: "approved", label: "Согласована",         color: "var(--accent-2)" },
    { id: "rejected", label: "Замечания",           color: "var(--accent)" },
  ];
  const VSTATUS_BY_ID = Object.fromEntries(VERSION_STATUSES.map((s) => [s.id, s]));
  const vStatusMeta = (id) => VSTATUS_BY_ID[id] || VSTATUS_BY_ID.draft;
  const VKEY = (projectId) => "aivibe:versions:" + projectId;

  function loadVersions(projectId) {
    try { const raw = localStorage.getItem(VKEY(projectId)); const a = raw ? JSON.parse(raw) : []; return Array.isArray(a) ? a : []; }
    catch { return []; }
  }
  function saveVersions(projectId, versions) {
    try { localStorage.setItem(VKEY(projectId), JSON.stringify(versions || [])); return true; } catch { return false; }
  }
  function clearVersions(projectId) {
    try { localStorage.removeItem(VKEY(projectId)); return true; } catch { return false; }
  }
  // Снимок текущей сметы (глубокая копия)
  function makeSnapshot(state) {
    return JSON.parse(JSON.stringify({ rooms: state.rooms || [], extras: state.extras || [], markup: state.markup || 0, mode: state.mode || "work" }));
  }

  /* ----------------------------- КЛИЕНТСКИЙ ПОРТАЛ (волна A2, groundwork) -----------------------------
     Публикация снимка сметы по ссылке #portal/{shareId}: клиент видит смету «для клиента»
     (только чтение) и отвечает по позициям (поле approve из A1). Хранение — localStorage
     (ключ aivibe:portal:{shareId}); межустройственный доступ подключится с Worker+KV/доменом
     БЕЗ переписывания UI — // → API: POST/GET/PATCH /api/portal/:id (Worker + KV).
     Ответ клиента = изменённое поле approve прямо в позициях снимка (тот же словарь A1). */
  const PKEY = (id) => "aivibe:portal:" + id;
  const genShareId = () => "shr_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  function createPortalShare(o) {
    const src = o || {};
    const rec = {
      shareId: genShareId(),
      projectId: src.projectId || null,
      projectName: str(src.projectName),
      versionId: src.versionId || null,
      versionLabel: str(src.versionLabel),
      snapshot: JSON.parse(JSON.stringify(src.snapshot || {})),
      createdAt: new Date().toISOString(),
      respondedAt: null,
    };
    try { localStorage.setItem(PKEY(rec.shareId), JSON.stringify(rec)); } catch {}
    return rec;
  }
  function loadPortalShare(shareId) {
    try { const raw = localStorage.getItem(PKEY(shareId)); const r = raw ? JSON.parse(raw) : null; return r && r.shareId ? r : null; }
    catch { return null; }
  }
  // клиент ставит решение по позиции снимка (ri, ii); "pending"/мусор = снять поле
  function setPortalApprove(shareId, ri, ii, approveId) {
    const rec = loadPortalShare(shareId);
    if (!rec || !rec.snapshot || !Array.isArray(rec.snapshot.rooms)) return null;
    const room = rec.snapshot.rooms[ri];
    if (!room || !Array.isArray(room.items) || !room.items[ii]) return rec;
    const it = room.items[ii];
    if (approveId === "pending" || !APPROVE_BY_ID[approveId]) { delete it.approve; delete it.approveAt; }
    else { it.approve = approveId; it.approveAt = today(); }
    rec.respondedAt = new Date().toISOString();
    try { localStorage.setItem(PKEY(shareId), JSON.stringify(rec)); } catch {}
    return rec;
  }

  window.AIVibeFFE = {
    FFE_CATEGORIES, FFE_UNITS, FFE_STATUSES, STATUS_LABEL, STATUS_BY_ID, DEFAULT_STATUS,
    APPROVE_STATUSES, APPROVE_BY_ID, approveMeta,
    EXTRA_PRESETS, statusMeta, statusProgress, stampStatus, today,
    blankPosition, normalizePosition, dimsLabel, lineTotal,
    blankProduct, productFromPosition, positionFromProduct,
    blankExtra, extraAmount, extrasTotal,
    BENCHMARK, estimateBudget, generateEstimate, setPendingDraft, takePendingDraft,
    loadEstimate, saveEstimate, clearEstimate,
    VERSION_STATUSES, vStatusMeta, loadVersions, saveVersions, clearVersions, makeSnapshot,
    clientPricing, createPortalShare, loadPortalShare, setPortalApprove,
  };
})();
