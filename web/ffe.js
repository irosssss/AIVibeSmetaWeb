/* ============================================================
   Design Ledger — единая схема позиции сметы (FF&E) + клиентское хранилище
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

  /* базовая наценка дизайнера по умолчанию (%) — единая точка, чтобы не разъезжаться
     по копиям в project-detail.jsx/site-sections.jsx/xlsx.js при смене канона */
  const DEFAULT_MARKUP_PCT = 25;

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

  /* Единая воронка строки (K2, паттерн Programa «один дропдаун статуса» — Draft/
     Client review/approved → Procurement: Ordered…): сводит решение клиента (approve)
     и стадию закупки (status) в ОДИН чип вместо двух раздельных панелей смета/закупка.
     Как только закупка ушла дальше «Согласовано» (ordered+), реальная стадия закупки
     важнее решения клиента — оно уже сыграло роль, чип становится read-only бейджем
     реальной стадии. До заказа — решение клиента; «pending» без решения различаем на
     «Черновик»/«На согласовании» по hasActiveShare (единственный внешний сигнал, что
     смету вообще показывали клиенту — approve сам по себе «не отправлено» от
     «отправлено, ждём ответа» не отличает, hasActiveShare считает вызывающая сторона
     из versions.some(v => v.shareId)). Чистая функция — approve/status не пишет. */
  function funnelStage(it, hasActiveShare) {
    const st = statusMeta(it.status);
    if (st.order >= STATUS_BY_ID.ordered.order) return { id: "status:" + it.status, label: st.label, color: st.color, locked: true };
    const ap = APPROVE_BY_ID[it.approve] ? it.approve : "pending";
    if (ap !== "pending") { const m = APPROVE_BY_ID[ap]; return { id: ap, label: m.label, color: m.color, locked: false }; }
    return hasActiveShare
      ? { id: "pending", label: "На согласовании", color: "var(--info)", locked: false }
      : { id: "pending", label: "Черновик", color: "var(--faint)", locked: false };
  }

  /* Платёжные даты закупки (волна C1, бенчмарк Programa) — 4 даты на позицию,
     независимое от стадии закупки измерение: деньги двигаются не синхронно
     с товаром (аванс платят до заказа, остаток — после доставки/монтажа).
     В расчёты сметы не участвует — это НЕ строки итога, а трекер дат. */
  const PAYMENT_KINDS = [
    { id: "clientAdvance",   label: "Аванс клиента" },
    { id: "supplierAdvance", label: "Аванс поставщику" },
    { id: "clientBalance",   label: "Остаток клиента" },
    { id: "supplierBalance", label: "Остаток поставщику" },
  ];
  const PAYKIND_BY_ID = Object.fromEntries(PAYMENT_KINDS.map((k) => [k.id, k]));
  function blankPayment(over) {
    const o = over || {};
    return { date: str(o.date), paid: !!o.paid };
  }
  function blankPayments(over) {
    const o = over || {};
    const out = {};
    PAYMENT_KINDS.forEach((k) => { out[k.id] = blankPayment(o[k.id]); });
    return out;
  }

  /* Трек-номер отправления (волна C3) — один на позицию: чаще всего одна
     накладная/ТТН покрывает всю партию позиции, а не каждую стадию отдельно. */
  function blankTrack(over) {
    const o = over || {};
    return { number: str(o.number), url: str(o.url), note: str(o.note) };
  }

  /* Срочность закупки (волна C2, шаг «Сегодня в работе») — чистая функция
     дата→корзина, без завязки на проект/позицию, поэтому переиспользуется
     и в самой смете, и в сквозном виджете кабинета по всем проектам. */
  const URGENCY_BUCKETS = [
    { id: "overdue", label: "Просрочено", color: "var(--accent)" },
    { id: "today",   label: "Сегодня",    color: "var(--chart)" },
    { id: "week",    label: "На неделе",  color: "var(--info)" },
    { id: "later",   label: "Позже",      color: "var(--faint)" },
  ];
  const URGENCY_BY_ID = Object.fromEntries(URGENCY_BUCKETS.map((b) => [b.id, b]));
  function urgencyBucket(dateStr) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr || ""));
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3]).getTime();
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const days = Math.round((d - now.getTime()) / 86400000);
    if (days < 0) return "overdue";
    if (days === 0) return "today";
    if (days <= 7) return "week";
    return "later";
  }
  // все непогашенные дела позиции с датой: ожидаемая дата текущей стадии закупки
  // (eta, пока позиция не принята) + непроставленные платежи. Готовое (принято/
  // оплачено) в срочность не попадает — виджет показывает только то, что ждёт решения.
  function itemDueItems(it) {
    const out = [];
    if (it.eta && it.status !== "accepted") {
      out.push({ kind: "stage", id: it.status || DEFAULT_STATUS, label: "Стадия: " + statusMeta(it.status).label, date: it.eta });
    }
    const pay = it.payments || {};
    PAYMENT_KINDS.forEach((k) => {
      const p = pay[k.id];
      if (p && p.date && !p.paid) out.push({ kind: "payment", id: k.id, label: k.label, date: p.date });
    });
    return out;
  }

  /* Комментарии-треды на позиции (волна A3, бенчмарк Programa) — отдельные от approve:
     решение клиента фиксируется кнопками, а здесь — переписка вокруг позиции. Для v1
     тред живёт на снимке портал-шары (клиент пишет через портал, дизайнер отвечает
     в «Версиях» — обе стороны читают/пишут ОДИН и тот же объект, поэтому не нужно
     сверять идентичность позиций между живой сметой дизайнера и снимком). */
  function blankComment(over) {
    const o = over || {};
    return {
      id: o.id || "cm_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      author: o.author === "client" ? "client" : "studio",
      text: str(o.text),
      at: o.at || new Date().toISOString(),
    };
  }
  // добавить комментарий в тред (пустой текст игнорируется)
  function addComment(comments, author, text) {
    const t = str(text);
    if (!t) return Array.isArray(comments) ? comments : [];
    return [...(Array.isArray(comments) ? comments : []), blankComment({ author, text: t })];
  }

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

  /* Паспорт свежести цен (роадмап «Стол комплектатора» шаг C1): агрегат по priceDate
     позиций сметы — честная нижняя граница «на что смотрел клиент». oldest — самая
     старая дата среди позиций, у которых она вообще проставлена (ISO-строки сравнимы
     лексикографически); null, если ни у одной позиции даты нет — заявлять нечего. */
  function priceFreshness(rooms) {
    let total = 0, checked = 0, oldest = null;
    (rooms || []).forEach((r) => (r.items || []).forEach((it) => {
      total++;
      if (it.priceDate) { checked++; if (!oldest || it.priceDate < oldest) oldest = it.priceDate; }
    }));
    if (!checked) return null;
    const days = Math.max(0, Math.floor((Date.now() - new Date(oldest + "T00:00:00").getTime()) / 86400000));
    return { checked, total, oldest, days, stale: days > 30 };
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
      rrp:      o.rrp != null && o.rrp !== "" ? num(o.rrp, 0) : "", // Розница за единицу (RRP), ₽ — база «выгоды клиента» (роадмап п.17); "" = не задана, слоя нет
      // канон схемы позиции — `sup` (сид, редактор supOf/setSup, PDF, xlsx, портал, закупка);
      // `supplier` принимаем как legacy-алиас входа (клиппер-экстракция, старые записи),
      // но НЕ эмитим — единое имя убирает класс багов «поставщик спрятался под другим полем»
      sup:      str(o.sup || o.supplier),      // Поставщик / фабрика / магазин
      url:      str(o.url),                    // Ссылка на товар (источник клиппера)
      code:     str(o.code),                   // Док-код позиции «МБ-01» (пусто = авто по разделу; правится вручную) — язык спецификаций, паттерн Programa CH02/TB01
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
      comments: Array.isArray(o.comments) ? o.comments.map((c) => blankComment(c)).filter((c) => c.text) : [], // Тред комментариев (волна A3)
      eta:      str(o.eta),                     // Ожидаемая дата ТЕКУЩЕЙ стадии закупки (YYYY-MM-DD) — сбрасывается при смене стадии (setStatus), иначе дата старой стадии ложно висела бы просрочкой на новой
      note:     str(o.note),                   // Примечание
      payments: blankPayments(o.payments),      // Платёжные даты закупки (волна C1) {id: {date, paid}}
      track:    blankTrack(o.track),            // Трек-номер отправления (волна C3) {number, url, note}
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
    p.code = str(p.code).trim().slice(0, 16);   // док-код — короткий, без ведущих/хвостовых пробелов
    p.price = Math.max(0, Math.round(num(p.price, 0)));
    if (p.rrp !== "") p.rrp = Math.max(0, Math.round(num(p.rrp, 0)));
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

  /* FF&E-подпись позиции для документов (PDF-подстрока, мета в UI): единый источник
     той же конвенции, что в строке сметы (project-detail.jsx) — «арт. X · материал ·
     80×45×120 см · N нед.». Материал/габариты видны и клиенту; артикул и срок —
     закупочная деталь, поэтому в клиентском документе (opts.client) их скрываем по
     умолчанию. K3: showSku/showLead/showWaste — точечный override дефолта (портал
     передаёт их из тумблеров приватности шары, см. SHARE_VISIBILITY_FIELDS ниже). */
  function ffeMeta(it, opts) {
    const o = opts || {};
    const client = !!o.client;
    const showSku = o.showSku != null ? o.showSku : !client;
    const showLead = o.showLead != null ? o.showLead : !client;
    const showWaste = o.showWaste != null ? o.showWaste : !client;
    return [
      showSku && it.sku ? "арт. " + it.sku : null,
      it.material || null,
      dimsLabel(it.dims) || null,
      showLead && it.leadWeeks ? it.leadWeeks + " нед." : null,
      showWaste && it.wastePct ? "запас " + it.wastePct + "%" : null,
    ].filter(Boolean).join(" · ");
  }

  // подпись количества с единицей измерения: «шт» → ×N (как было), иначе ×N ед. (×50 м²).
  // Единый хелпер — иначе дублировался бы в строке сметы / закупке / PDF / превью копирования
  const qtyLabel = (it) => "×" + ((it && it.qty) || 1) + (it && it.unit && it.unit !== "шт" ? " " + it.unit : "");

  // себестоимость единицы с учётом запаса/отхода (плитка, краска…) — округляется один
  // раз, тем же принципом, что и unitClient в clientPricing: «цена/шт округлена, сумма
  // строки = цена/шт × кол-во» — иначе колонки «Цена»/«Сумма» в Excel/PDF не бьются
  const costUnit = (it) => Math.round(num(it.price, 0) * (1 + num(it.wastePct || 0, 0) / 100));
  const lineTotal = (it) => costUnit(it) * num(it.qty || 1, 1);

  // розница за единицу (RRP) с тем же запасом/отходом, что costUnit: покупая в магазине,
  // клиент оплачивал бы и запас — сравнение «розница vs цена дизайнера» симметрично.
  // Округление тем же принципом: цена/ед. один раз, строка = цена × кол-во
  const rrpUnit = (it) => Math.round(num(it.rrp, 0) * (1 + num(it.wastePct || 0, 0) / 100));
  const rrpLine = (it) => rrpUnit(it) * num(it.qty || 1, 1);

  /* ---- Док-коды позиций (волна K1, паттерн Programa CH02/TB01) ----
     Короткий человекочитаемый код на позицию: префикс по разделу + номер по порядку.
     Язык спецификаций дизайнера («см. чертёж, поз. МБ-02»). Виден и клиенту (в отличие
     от артикула) — как в публичной смете Programa. */
  // двухбуквенный префикс известных разделов; свободный ввод → первые буквы слов
  const DOC_CODE_PREFIX = {
    "Мебель": "МБ", "Мягкая мебель": "ММ", "Кухня": "КХ", "Техника": "ТХ",
    "Сантехника": "СН", "Освещение": "СВ", "Свет": "СВ", "Текстиль": "ТК",
    "Декор": "ДК", "Хранение": "ХР", "Отделка": "ОТ", "Прочее": "ПР",
  };
  function docCodePrefix(cat) {
    const c = str(cat).trim();
    if (DOC_CODE_PREFIX[c]) return DOC_CODE_PREFIX[c];
    const words = c.split(/\s+/).filter((w) => /[А-Яа-яЁёA-Za-z]/.test(w));
    if (!words.length) return "ПЗ";   // «позиция» — раздел не задан/не буквенный
    const p = words.length >= 2 ? (words[0][0] + words[1][0]) : words[0].slice(0, 2);
    return p.toUpperCase();
  }
  // распарсить код «МБ-01»/«МБ 1»/«A12» → {prefix, num} (для резервирования ручных кодов)
  function parseDocCode(code) {
    const m = /^([^\d\s-]+)[\s-]*(\d+)$/.exec(str(code).trim());
    return m ? { prefix: m[1].toUpperCase(), num: parseInt(m[2], 10) } : null;
  }
  /* Заполнить пустые коды позиций по порядку документа, уважая заданные вручную
     (ручной код = override, его номер зарезервирован — авто его пропускают).
     Чистая, идемпотентная: повторный проход тот же результат. Возвращает НОВЫЙ rooms
     (позиции — копии с проставленным .code). Единый источник для UI/PDF/Excel/портала —
     каждый выход зовёт assignDocCodes на своих rooms, коды сходятся без координации. */
  function assignDocCodes(rooms) {
    if (!Array.isArray(rooms)) return rooms;
    const used = {};   // prefix -> Set(занятые номера)
    const setOf = (p) => (used[p] || (used[p] = new Set()));
    rooms.forEach((r) => (r && r.items || []).forEach((it) => {
      const pc = it && parseDocCode(it.code);
      if (pc) setOf(pc.prefix).add(pc.num);
    }));
    const counter = {};   // prefix -> последний выданный номер (пол для поиска)
    return rooms.map((r) => !r ? r : ({
      ...r,
      items: (r.items || []).map((it) => {
        if (!it) return it;
        if (str(it.code).trim()) return { ...it, code: str(it.code).trim() };
        const pref = docCodePrefix(it.cat);
        const set = setOf(pref);
        let n = counter[pref] || 0;
        do { n += 1; } while (set.has(n));
        counter[pref] = n; set.add(n);
        return { ...it, code: pref + "-" + String(n).padStart(2, "0") };
      }),
    }));
  }

  /* ----------------------------- БИБЛИОТЕКА ТОВАРОВ СТУДИИ (волна B1, бенчмарк Programa) -----------------------------
     Мастер-запись товара студии — то, что дизайнер подбирает снова и снова (диван,
     смеситель, люстра). Живёт отдельно от сметы (localStorage, LedgerAPI.library),
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
      priceDate: str(o.priceDate),               // Дата последней проверки цены (свежесть — волна B3); "" = неизвестно
      feedSku:   str(o.feedSku),                 // Артикул фида фабрик (волна B4, мостик) — пусто, пока фида нет
    };
  }
  /* Демо-товары для пустой библиотеки (K4, паттерн Programa «Add demo products»):
     один клик наполняет пустой реестр реалистичными записями, чтобы новый дизайнер
     сразу увидел, КАК товар выглядит в библиотеке и что он подставляет в смету, вместо
     пустого экрана с одним «создать вручную». Восемь позиций по разным разделам
     (мебель/мягкая/свет/сантехника/декор/текстиль) с поставщиком, артикулом и
     габаритами — витрина всех полей карточки. Цены — рыночный ориентир, средний
     сегмент (как в сид-проектах). Схему нормализует blankProduct на library.create;
     priceDate ставит сам API (сегодня). «Поставщики» — обобщённые, не реальные бренды. */
  const DEMO_LIBRARY_PRODUCTS = [
    { title: "Диван 3-местный, велюр", cat: "Мягкая мебель", price: 164900, sup: "Фабрика мягкой мебели", article: "SF-3200", dims: { w: 220, d: 95, h: 78 } },
    { title: "Кресло с деревянным каркасом", cat: "Мягкая мебель", price: 58000, sup: "Фабрика мягкой мебели", article: "AR-118", dims: { w: 74, d: 80, h: 82 } },
    { title: "Обеденный стол, дуб массив", cat: "Мебель", price: 92000, sup: "Столярная мастерская", article: "TB-160", dims: { w: 160, d: 90, h: 75 } },
    { title: "Люстра подвесная, латунь", cat: "Освещение", price: 38000, sup: "Салон света", article: "LM-05", dims: { w: 60, d: 60, h: 45 } },
    { title: "Торшер на треноге", cat: "Освещение", price: 21500, sup: "Салон света", article: "FL-22" },
    { title: "Смеситель для раковины", cat: "Сантехника", price: 18900, sup: "Салон сантехники", article: "MX-77" },
    { title: "Ковёр шерстяной, ручная работа", cat: "Декор", price: 46000, sup: "Ковровый дом", article: "RG-240" },
    { title: "Шторы льняные, комплект", cat: "Текстиль", price: 24000, sup: "Текстильная мастерская", article: "CT-01" },
  ];

  // позиция сметы → мастер-запись (собрать библиотеку из реальной работы); дата
  // проверки цены переезжает вместе с позицией — сбор в библиотеку не «освежает» цену
  const productFromPosition = (it) => {
    const o = it || {};
    return blankProduct({ title: o.title, cat: o.cat, unit: o.unit, price: o.price,
      sup: o.sup || o.supplier, article: o.sku || o.article, url: o.url, note: o.note, dims: o.dims,
      priceDate: o.priceDate });
  };
  // мастер-запись → черновик позиции сметы (кол-во 1). Давность цены наследуется
  // от товара (библиотека не «протухает» молча — волна B3); если у товара своей
  // даты нет, используем переданную или сегодня (совместимость со старыми записями).
  const positionFromProduct = (p, date) => {
    const o = p || {};
    const pos = { title: str(o.title), qty: 1, price: Math.max(0, Math.round(num(o.price, 0))) };
    if (str(o.cat)) pos.cat = str(o.cat);
    if (str(o.sup)) pos.sup = str(o.sup);
    pos.priceDate = str(o.priceDate) || date || today();
    return pos;
  };

  /* ----------------------------- КЛИЕНТСКИЕ ЦЕНЫ (инвариант UI = PDF = Excel = портал) -----------------------------
     Точное зеркало клиентской матши сметы (project-detail.jsx: catOf/pctOf/unitClient/
     lineClient/client + discountAmt/totalClient) — чтобы клиентский портал (волна A2)
     считал итог ТЕМИ ЖЕ числами, что видит дизайнер. Правило округления то же: округляем
     ЦЕНУ ЗА ШТУКУ, сумма строки = цена × кол-во. snap = снимок версии
     {rooms, markup, catMarkup, discount, delivery, install, extras}. */
  function clientPricing(snap) {
    const s = snap || {};
    const rooms = Array.isArray(s.rooms) ? s.rooms : [];
    const markup = +s.markup || 0;
    const catMarkup = s.catMarkup || {};
    const discount = +s.discount || 0, delivery = +s.delivery || 0, install = +s.install || 0;
    const extras = Array.isArray(s.extras) ? s.extras : [];
    const catOf = (it) => it.cat || "Прочее";
    const pctOf = (cat) => (catMarkup[cat] != null ? catMarkup[cat] : markup);
    // наценка — поверх себестоимости С УЧЁТОМ запаса/отхода (costUnit), не поверх сырой
    // цены: клиент оплачивает и материал, реально уходящий в закупку из-за запаса
    const unitClient = (it) => Math.round(costUnit(it) * (1 + pctOf(catOf(it)) / 100));
    const lineClient = (it) => unitClient(it) * (it.qty || 1);
    const client = rooms.reduce((a, r) => a + (r.items || []).reduce((x, it) => x + lineClient(it), 0), 0);
    const discountAmt = Math.round(client * discount / 100);
    // сборы (доставка/монтаж/НДС/кастомные, волна услуг) — % считаем от одной и той же базы
    // (товары после скидки, ДО доставки/монтажа/др. сборов — не каскадом друг на друга)
    const extrasBase = client - discountAmt;
    const extrasAmt = extrasTotal(extras, extrasBase);
    const totalClient = client - discountAmt + delivery + install + extrasAmt;
    // RRP-слой (роадмап п.17): выгода клиента = розница − клиентская цена, СТРОГО по позициям
    // с заданной розницей (позиции без rrp сравнивать не с чем — в обе суммы не входят).
    // Скидку/сборы не подмешиваем: выгода — построчная витрина ДО общескидочной математики.
    // Отрицательная выгода не обнуляется здесь (UI/выгрузки сами решают, что показывать) —
    // иначе итог «выгоды» врал бы, суммируя только удобные строки
    const lineSavings = (it) => (num(it.rrp, 0) > 0 ? rrpLine(it) - lineClient(it) : 0);
    let rrpTotal = 0, rrpBase = 0;
    rooms.forEach((r) => (r.items || []).forEach((it) => { if (num(it.rrp, 0) > 0) { rrpTotal += rrpLine(it); rrpBase += lineClient(it); } }));
    const savings = rrpTotal - rrpBase;
    return { catOf, pctOf, costUnit, unitClient, lineClient, client, discount, discountAmt, delivery, install, extras, extrasAmt, totalClient,
      rrpUnit, rrpLine, lineSavings, rrpTotal, savings };
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
      area: a, budget: goods + delivery, markupPct: DEFAULT_MARKUP_PCT, mode: "work",
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
  // color = ЗАЛИВКА (точка-индикатор), ink = ТЕКСТ (ink-пара ≥4.5:1 на бледном фоне чипа):
  // правило пар styles.css:21-30 — заливочные токены нельзя красить текстом (--faint ~2.3:1,
  // --accent <4.5:1). Паттерн Programa «pale-фон + dark-текст того же тона» (аудит §1, D1).
  const VERSION_STATUSES = [
    { id: "draft",    label: "Черновик",            color: "var(--faint)",    ink: "var(--muted)" },
    { id: "sent",     label: "Отправлена клиенту",  color: "var(--info)",     ink: "var(--info)" },
    { id: "approved", label: "Согласована",         color: "var(--accent-2)", ink: "var(--accent-2-ink)" },
    { id: "rejected", label: "Замечания",           color: "var(--accent)",   ink: "var(--accent-ink)" },
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
  // shareId — capability-токен: с живым API (portal-api.js) ссылка публична, поэтому
  // энтропия криптографическая (128 бит), а не Date+Math.random (подбираемо по времени);
  // формат прежний shr_[a-z0-9]+ — старые мок-ссылки остаются валидными. Байт→hex
  // (не base36 через % 36 — 256 не делится на 36 нацело, это давало смещение
  // распределения младших цифр; hex как степень двойки смещения не даёт, найдено ревью)
  const genShareId = () => {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const a = crypto.getRandomValues(new Uint8Array(16));
      return "shr_" + Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
    }
    return "shr_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  };
  /* K3: приватность шары — обобщение канона «SKU не клиенту» (см. ffeMeta выше) до
     модели «поле видимости по аудитории» (§4 бенчмарка Programa). Все поля по
     умолчанию ВЫКЛ — как и было жёстко раньше, тумблеры делают это настраиваемым,
     не меняя поведение уже созданных шар без явного действия дизайнера. Цена и итог
     сюда сознательно НЕ входят: без них клиент не может согласовать смету — это не
     «доп. деталь», а суть портала (отличие от публичной Programa-ссылки для браузинга). */
  const SHARE_VISIBILITY_FIELDS = [
    { id: "supplier", label: "Поставщик" },
    { id: "sku", label: "Артикул" },
    { id: "url", label: "Ссылка на товар" },
    { id: "details", label: "Срок поставки и запас" },
  ];
  function defaultShareVisibility() { return { supplier: false, sku: false, url: false, details: false }; }
  function createPortalShare(o) {
    const src = o || {};
    const rec = {
      shareId: genShareId(),
      projectId: src.projectId || null,
      projectName: str(src.projectName),
      versionId: src.versionId || null,
      versionLabel: str(src.versionLabel),
      studioName: str(src.studioName),          // брендинг портала (волна A5): имя студии на момент публикации ссылки
      // контакты студии для клиента (волна W4.1) — тот же снимок-на-момент-публикации;
      // ИНН намеренно не сюда — он для будущих счетов (волна D), не для клиентского портала
      studioCity: str(src.studioCity), studioPhone: str(src.studioPhone), studioEmail: str(src.studioEmail),
      snapshot: JSON.parse(JSON.stringify(src.snapshot || {})),
      visibility: Object.assign(defaultShareVisibility(), src.visibility || {}),
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
  // дизайнер меняет тумблеры уже после публикации ссылки (Programa-паттерн — правится
  // в любой момент, ссылка не перевыпускается); patch мержится частично поверх дефолта
  function setShareVisibility(shareId, patch) {
    const rec = loadPortalShare(shareId);
    if (!rec) return null;
    rec.visibility = Object.assign(defaultShareVisibility(), rec.visibility || {}, patch || {});
    try { localStorage.setItem(PKEY(shareId), JSON.stringify(rec)); } catch {}
    return rec;
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
  // комментарий к позиции снимка (волна A3): клиент пишет через портал, дизайнер —
  // из «Версий» в кабинете; оба читают/пишут один и тот же снимок портал-шары.
  // respondedAt штампуем только от клиента — ответ студии не должен выглядеть как «клиент ответил».
  function addPortalComment(shareId, ri, ii, author, text) {
    const rec = loadPortalShare(shareId);
    if (!rec || !rec.snapshot || !Array.isArray(rec.snapshot.rooms)) return null;
    const room = rec.snapshot.rooms[ri];
    if (!room || !Array.isArray(room.items) || !room.items[ii]) return rec;
    const it = room.items[ii];
    it.comments = addComment(it.comments, author, text);
    if (author === "client") rec.respondedAt = new Date().toISOString();
    try { localStorage.setItem(PKEY(shareId), JSON.stringify(rec)); } catch {}
    return rec;
  }

  /* ----------------------------- ПУЛЬС ПОРТАЛА (адаптация ченджлога Programa 12.07) -----------------------------
     Ч4 «клиент открыл»: счётчик визитов на портал-шаре — ClientPortal зовёт notePortalVisit
     при каждом открытии ссылки; дизайнер видит «портал открыт N раз · последний DD.MM».
     Честно: считаются ВСЕ открытия ссылки (в т.ч. самим дизайнером через «Открыть портал») —
     на моке отличить некого, с Worker+KV появится куки-сессия клиента.
     Ч3 «лента действий»: portalEventsFromShare разворачивает снимок шары в плоский список
     событий клиента (решения approve + комментарии) — чистая функция, кабинет собирает
     ленту по всем проектам из этих событий. */
  function notePortalVisit(shareId) {
    const rec = loadPortalShare(shareId);
    if (!rec) return null;
    const v = rec.visits || { count: 0, lastAt: "" };
    rec.visits = { count: (v.count || 0) + 1, lastAt: new Date().toISOString() };
    try { localStorage.setItem(PKEY(shareId), JSON.stringify(rec)); } catch {}
    return rec;
  }
  // события клиента из снимка шары: [{at(ISO|date), type: ok|revise|rejected|comment, title, text?, ri, ii}]
  // решения без даты (легаси-шары до approveAt) не выдумываем — пропускаем
  function portalEventsFromShare(rec) {
    const out = [];
    if (!rec || !rec.snapshot || !Array.isArray(rec.snapshot.rooms)) return out;
    rec.snapshot.rooms.forEach((r, ri) => (r.items || []).forEach((it, ii) => {
      if (it.approve && APPROVE_BY_ID[it.approve] && it.approveAt)
        out.push({ at: it.approveAt, type: it.approve, title: str(it.title), ri, ii });
      (it.comments || []).forEach((c) => {
        if (c && c.author === "client" && c.at)
          out.push({ at: c.at, type: "comment", title: str(it.title), text: str(c.text), ri, ii });
      });
    }));
    return out;
  }

  /* Ч2 «клиент отклонил → аналоги»: подбор замен из уже собранного (библиотека студии +
     позиции прошлых проектов), БЕЗ каталога фабрик — версия из своего; фид подключится
     тем же интерфейсом (роадмап §2 «Аналоги в один клик»). Чистый скоринг:
     совпадение раздела (+3) > пересечение слов названия (+1 за слово, максимум 2) >
     цена в коридоре ±40% (+1). Кандидаты без пересечений отбрасываются; сам товар
     (одинаковое название) исключён. Возврат: топ-n с дельтой цены в процентах. */
  const altWords = (s) => str(s).toLowerCase().split(/[^a-zа-яё0-9]+/).filter((w) => w.length > 2);
  function suggestAlternatives(target, candidates, n) {
    const t = target || {};
    const tw = altWords(t.title);
    const tPrice = Math.max(0, num(t.price, 0));
    const seen = new Set();
    const scored = [];
    (candidates || []).forEach((c) => {
      if (!c || !str(c.title)) return;
      const key = str(c.title).toLowerCase() + "¶" + num(c.price, 0);
      if (seen.has(key)) return;                     // дубли (товар и в библиотеке, и в проекте)
      if (str(c.title).toLowerCase() === str(t.title).toLowerCase()) return; // сам отклонённый товар
      // квалификация — только содержательное сходство (раздел/слова); цена — бонус
      // к рангу, НЕ пропуск: иначе любой случайный товар «в коридоре ±40%» лез в выдачу.
      // Дефолтный раздел «Прочее» сигналом не считается: «Прочее»≡«Прочее» совпадает
      // почти у всего неразмеченного и забивал бы выдачу случайными товарами
      let score = 0;
      if (str(c.cat) && str(c.cat) !== "Прочее" && str(c.cat) === str(t.cat)) score += 3;
      const cw = altWords(c.title);
      score += Math.min(2, cw.filter((w) => tw.includes(w)).length);
      if (score <= 0) return;
      const cPrice = Math.max(0, num(c.price, 0));
      if (tPrice > 0 && cPrice > 0 && Math.abs(cPrice - tPrice) / tPrice <= 0.4) score += 1;
      seen.add(key);
      const priceDeltaPct = tPrice > 0 && cPrice > 0 ? Math.round(((cPrice - tPrice) / tPrice) * 100) : null;
      scored.push({ product: c, score, priceDeltaPct });
    });
    return scored
      .sort((a, b) => b.score - a.score || num(a.product.price, 0) - num(b.product.price, 0))
      .slice(0, Math.max(1, n || 4));
  }

  /* Пробелы комплектации (их Pulse-карточки «Products missing suppliers / lead time»):
     позиции без поставщика и позиции без единой даты закупки (ни eta, ни платежей). */
  function collectGaps(rooms) {
    let noSup = 0, noDates = 0;
    (Array.isArray(rooms) ? rooms : []).forEach((r) => (r.items || []).forEach((it) => {
      if (!str(it.sup || it.supplier)) noSup++;   // обе схемы имени поля (см. productFromPosition)
      // «без дат закупки» = ни eta, ни одной платёжной даты (в т.ч. уже оплаченной —
      // погашенный платёж не «пробел», поэтому НЕ через itemDueItems, он гасит paid)
      const pay = it.payments || {};
      const anyPayDate = PAYMENT_KINDS.some((k) => pay[k.id] && str(pay[k.id].date));
      if (!str(it.eta) && !anyPayDate) noDates++;
    }));
    return { noSup, noDates };
  }

  /* ----------------------------- СТАДИИ ПЕТЛИ КОМПЛЕКТАТОРА (статус ПРОЕКТА) -----------------------------
     Не путать со статусом ПОЗИЦИИ (FFE_STATUSES) — это стадия всего проекта:
     «собрал → согласовал → закупил → сдал» (+ Архив). Цвета — язык темы; STAGE_NEXT —
     подсказка следующего шага (статичный смысл стадии, не имитация событий).
     Домовой словарь: и карточка проекта (cabinet-views), и Обзор проекта (project-detail, W2). */
  const PROJ_STATUSES = ["Сбор", "Согласование", "Закупка", "Сдача", "Архив"];
  const PROJ_STATUS_COLOR = { "Сбор": "var(--info)", "Согласование": "var(--chart)", "Закупка": "var(--accent)", "Сдача": "var(--accent-2)", "Архив": "var(--faint)" };
  const PROJ_STAGE_NEXT = {
    "Сбор": "собрать смету и отправить клиенту",
    "Согласование": "получить решение клиента по смете",
    "Закупка": "вести заказы и поставки по позициям",
    "Сдача": "выгрузить клиентский пакет документов",
  };

  window.LedgerFFE = {
    PROJ_STATUSES, PROJ_STATUS_COLOR, PROJ_STAGE_NEXT,
    FFE_CATEGORIES, FFE_UNITS, FFE_STATUSES, STATUS_LABEL, STATUS_BY_ID, DEFAULT_STATUS,
    DEFAULT_MARKUP_PCT,
    APPROVE_STATUSES, APPROVE_BY_ID, approveMeta, funnelStage,
    PAYMENT_KINDS, PAYKIND_BY_ID, blankPayment, blankPayments, blankTrack,
    URGENCY_BUCKETS, URGENCY_BY_ID, urgencyBucket, itemDueItems,
    EXTRA_PRESETS, statusMeta, statusProgress, stampStatus, today, priceFreshness,
    blankPosition, normalizePosition, dimsLabel, ffeMeta, qtyLabel, costUnit, lineTotal, rrpUnit, rrpLine,
    docCodePrefix, assignDocCodes,
    blankComment, addComment,
    blankProduct, productFromPosition, positionFromProduct, DEMO_LIBRARY_PRODUCTS,
    blankExtra, extraAmount, extrasTotal,
    BENCHMARK, estimateBudget, generateEstimate, setPendingDraft, takePendingDraft,
    loadEstimate, saveEstimate, clearEstimate,
    VERSION_STATUSES, vStatusMeta, loadVersions, saveVersions, clearVersions, makeSnapshot,
    clientPricing, createPortalShare, loadPortalShare, setPortalApprove, addPortalComment,
    notePortalVisit, portalEventsFromShare, suggestAlternatives, collectGaps,
    SHARE_VISIBILITY_FIELDS, defaultShareVisibility, setShareVisibility,
  };
})();
