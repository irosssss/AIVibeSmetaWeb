/* ============================================================
   Design Ledger — ДЕТАЛЬ ПРОЕКТА
   Анализ помещения · Стиль и варианты · Бюджет · Спецификация
   (каталог фабрик-партнёров) · AI-чат с дизайнером.
   Открывается из раздела «Мои проекты».
   ============================================================ */
const { useState: usePD, useEffect: usePDE, useRef: usePDR } = React;

const MP_NAME = { f1: "Дубрава", f2: "Линея" };
const TIER_NAME = { eco: "Эконом", opt: "Оптимально", prem: "Премиум" };
const FIND_ICON = { plus: (p) => <I.check {...p} />, warn: (p) => <I.info {...p} />, idea: (p) => <I.spark {...p} /> };

/* материалы/отделка по стилю — подставляются в карточки товаров, чтобы подбор
   визуально перекрашивался под выбранное направление (категории идут по порядку) */
const STYLE_MATERIALS = {
  deco:    ["велюр", "латунь", "мрамор", "рифление", "винный бархат"],
  warm:    ["лён", "тёплое дерево", "букле", "керамика", "шерсть"],
  japandi: ["светлый дуб", "графит", "ротанг", "лён", "матовый металл"],
  scandi:  ["светлый дуб", "хлопок", "белёный ясень", "мята", "фетр"],
  modern:  ["шпон", "латунь", "молдинг", "бархат", "мрамор"],
  indust:  ["чёрный металл", "дуб", "бетон", "кожа", "сталь"],
  midmod:  ["орех", "горчичный велюр", "тик", "латунь", "шерсть"],
};
const DEFAULT_MATERIALS = ["дерево", "ткань", "металл", "стекло", "текстиль"];

/* варианты расстановки мебели — выбираются внутри стиля.
   plan[] — схема сверху (x,y,w,h в %), pins[] — AR-метки на фото [left%, top%, label] */
const LAYOUTS = [
  {
    id: "window", name: "У окна", note: "Зона отдыха развёрнута к свету — диван у окна, мягкий вечерний сценарий.",
    pros: ["Максимум естественного света", "Уютная зона чтения"],
    plan: [
      { x: 14, y: 12, w: 48, h: 16, k: "seat", label: "Диван" },
      { x: 30, y: 40, w: 26, h: 26, k: "rug", label: "Ковёр" },
      { x: 36, y: 46, w: 14, h: 12, k: "table", label: "Стол" },
      { x: 70, y: 34, w: 16, h: 22, k: "accent", label: "Кресло" },
    ],
    pins: [[30, 40, "Диван"], [72, 52, "Кресло"], [48, 70, "Свет"]],
  },
  {
    id: "media", name: "Медиа-стена", note: "ТВ-зона на глухой стене напротив окон, диван — фронтально к экрану.",
    pros: ["Кино-зона на всю стену", "Чёткое зонирование"],
    plan: [
      { x: 10, y: 70, w: 60, h: 12, k: "media", label: "ТВ-стена" },
      { x: 18, y: 30, w: 46, h: 15, k: "seat", label: "Диван" },
      { x: 26, y: 50, w: 24, h: 14, k: "table", label: "Стол" },
      { x: 74, y: 30, w: 14, h: 34, k: "accent", label: "Стеллаж" },
    ],
    pins: [[36, 58, "Диван"], [62, 40, "ТВ-стена"], [80, 52, "Стеллаж"]],
  },
  {
    id: "symmetry", name: "Симметрия", note: "Центральная ось: диван по центру и парные кресла напротив.",
    pros: ["Парадная гостиная", "Баланс и порядок"],
    plan: [
      { x: 26, y: 16, w: 48, h: 15, k: "seat", label: "Диван" },
      { x: 18, y: 58, w: 16, h: 20, k: "accent", label: "Кресло" },
      { x: 66, y: 58, w: 16, h: 20, k: "accent", label: "Кресло" },
      { x: 40, y: 44, w: 20, h: 16, k: "table", label: "Стол" },
    ],
    pins: [[50, 38, "Диван"], [26, 66, "Кресло"], [72, 66, "Кресло"]],
  },
];
/* чертёжные цвета мебели: line-art (контур-чернила + лёгкий тинт), не сплошные заливки */
const LAYOUT_K = {
  seat:   { stroke: "var(--accent-ink)", fill: "rgba(183,80,44,.10)",  ink: "var(--accent-ink)" },
  media:  { stroke: "var(--info)",       fill: "rgba(62,74,89,.10)",   ink: "var(--info)" },
  table:  { stroke: "var(--accent-2)",   fill: "rgba(94,107,91,.12)",  ink: "var(--accent-2-ink)" },
  accent: { stroke: "var(--chart-ink)",  fill: "rgba(201,138,46,.14)", ink: "var(--chart-ink)" },
  rug:    { stroke: "rgba(46,42,38,.35)", fill: "transparent",         ink: "var(--spec-meta)", dashed: true },
};

/* дата в приемлемом для дизайнера формате (документ сметы, история цен) */
const fmtDateRu = (d) => { const t = new Date(d + "T00:00:00"); return isNaN(t.getTime()) ? String(d) : t.toLocaleDateString("ru-RU"); };
/* давность цены позиции, скопированной из прошлого проекта — тултип свой, геометрия чипа общая (PriceAgeChip, ui.jsx) */
const pastCopyNote = (d) => (days, stale) => "Цена скопирована из прошлого проекта, от " + fmtDateRu(d) + (stale ? " — стоит перепроверить" : "");

/* цена предмета с поправкой на выбранный стиль (округляем до сотен) */
const adjustPrice = (price, factor) => (price == null ? price : Math.round((price * factor) / 100) * 100);

/* детерминированный «хеш» из строки — чтобы наличие/доставка были стабильны между рендерами */
const hashStr = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

/* наличие + срок поставки — выводим из id/тира/отзывов (имитация ответа каталога фабрики) */
function stockInfo(item) {
  const h = hashStr(item.id);
  const mode = h % 10; // 0..9
  if (mode === 0) return { state: "order", label: "Под заказ", eta: "4–6 недель", color: "var(--faint)" };
  if (mode === 1 || mode === 2) {
    const left = 2 + (h % 5); // 2..6
    return { state: "low", label: `Осталось ${left} шт`, eta: item.mp === "f1" ? "1–2 недели" : "2–3 недели", color: "var(--accent)" };
  }
  return { state: "in", label: "На складе", eta: item.mp === "f1" ? "1–2 недели" : "2–3 недели", color: "var(--accent-2)" };
}

/* первичный выбор по одному товару из каждой категории под тариф */
function pickByTier(catalog, tier) {
  const sel = {};
  catalog.forEach((c, i) => {
    const it = c.items.find((x) => x.tier === tier) || c.items[0];
    sel[i] = it.id;
  });
  return sel;
}

function ProjectDetail({ id, onClose, initialStyle }) {
  const [data, setData] = usePD(null);
  const [styleId, setStyleId] = usePD(null);
  const [tier, setTier] = usePD("opt");
  const [sel, setSel] = usePD({});
  const [layoutId, setLayoutId] = usePD("window");
  const [chatOpen, setChatOpen] = usePD(false);
  const [settings, setSettings] = usePD(null);   // пользовательские нормы-override
  const [myStyles, setMyStyles] = usePD([]);     // стили из библиотеки пользователя
  const [specSaved, setSpecSaved] = usePD(false);

  const mainRef = usePDR(null);
  const secRefs = { analysis: usePDR(null), styles: usePDR(null), budget: usePDR(null), products: usePDR(null) };

  usePDE(() => {
    let alive = true;
    AIVibeAPI.projects.get(id).then((d) => {
      if (!alive) return;
      if (!d || !d.id) { toast("Проект не найден — возможно, ссылка устарела.", "warn", 5000); onClose(); return; }
      setData(d);
      setTitle("cabinet", d.name);
      if (d.rooms) return; // проект-квартира: смета-комплектация по комнатам (отдельный рендер)
      const match = initialStyle && d.styles.find((s) => s.id === initialStyle);
      setStyleId((match || d.styles.find((s) => s.active) || d.styles[0]).id);
      setSel(pickByTier(d.catalog, "opt"));
    });
    return () => { alive = false; setTitle("cabinet"); };
  }, [id]);

  usePDE(() => {
    AIVibeAPI.settings.get().then(setSettings);
    AIVibeAPI.styles.list().then((list) => setMyStyles(list.filter((s) => s.owner !== null)));
  }, []);

  // Esc закрывает оверлей (диалоги/модалки перехватывают Esc в capture-фазе раньше;
  // из полей ввода — чат AI-дизайнера — Esc не закрывает, а отдаёт фокус)
  usePDE(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) { e.target.blur(); return; }
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const goto = (key) => {
    const el = secRefs[key] && secRefs[key].current, box = mainRef.current;
    if (!el || !box) return;
    const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 8;
    box.scrollTo({ top, behavior: motionOK() ? "smooth" : "auto" });
  };
  const applyTier = (t) => { setTier(t); if (data) setSel(pickByTier(data.catalog, t)); };
  const onAction = (a) => {
    if (!a) return;
    if (a.type === "tier") applyTier(a.value);
    else if (a.type === "style") setStyleId(a.value);
    else if (a.type === "scroll") goto(a.value);
  };

  if (!data) {
    return (
      <div className="pd-overlay" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "var(--muted)" }}>
          <Lottie name="loader" playOnView={false} ariaLabel="Design Ledger собирает смету"
                  fallback={<span className="spin" style={{ width: 30, height: 30 }} />}
                  style={{ width: 230, height: 150 }} />
          Design Ledger собирает смету и проверяет расстановку…
        </div>
      </div>
    );
  }

  // key: при смене id через hash state оверлея (наценки/скидка/savedId) обязан переинициализироваться,
  // иначе «Сохранить» запишет значения предыдущего проекта в новый
  if (data.rooms) return <RoomSpecOverlay key={data.id || "imported"} data={data} onClose={onClose} />;

  const activeStyle = [...data.styles, ...myStyles].find((s) => s.id === styleId) || data.styles[0];
  const activeLayout = LAYOUTS.find((l) => l.id === layoutId) || LAYOUTS[0];
  const factor = activeStyle.factor || 1;
  const adj = (p) => adjustPrice(p, factor);
  const mats = (activeStyle.materials && activeStyle.materials.length ? activeStyle.materials : STYLE_MATERIALS[activeStyle.id]) || DEFAULT_MATERIALS;
  const cartItems = data.catalog.map((c, i) => c.items.find((x) => x.id === sel[i])).filter(Boolean);
  const total = cartItems.reduce((s, it) => s + adj(it.price), 0);
  const oldTotal = cartItems.reduce((s, it) => s + adj(it.old || it.price), 0);

  // Движок: проверка эргономики выбранной раскладки (с учётом моих норм) + строки сметы для PDF
  const effNorms = settings ? { ...(settings.normsOverride || {}), enabled: settings.enabledNorms || {} } : undefined;
  const checks = window.AIVibeEngine ? AIVibeEngine.checkErgonomics(activeLayout, data.analysis.plan, effNorms) : { findings: [], ok: true, warns: 0 };
  const specRows = data.catalog.map((c, i) => {
    const it = c.items.find((x) => x.id === sel[i]);
    return it ? { cat: c.cat, title: it.title, factory: MP_NAME[it.mp], tier: TIER_NAME[it.tier], price: adj(it.price) } : null;
  }).filter(Boolean);
  const exportPDF = () => { if (window.AIVibePDF) withLib("pdf", () => AIVibePDF.exportSpec({ project: data.name, styleName: activeStyle.name, rows: specRows, total, budget: data.budget, checks })); };
  const optimize = () => { if (window.AIVibeEngine) setSel(AIVibeEngine.optimizeSpec(data.catalog, data.budget, factor).selection); };
  const saveSpec = () => AIVibeAPI.projects.update(id, { style: activeStyle.name, items: cartItems.length }).then(() => { setSpecSaved(true); setTimeout(() => setSpecSaved(false), 1700); });

  return (
    <div className="pd-overlay" role="dialog" aria-label={"Проект: " + data.name}>
      {/* шапка */}
      <OverlayHead onBack={onClose} budget={data.budget}
        crumbs={[{ label: "Проекты", onClick: onClose }, { label: data.name }]}
        title={data.name}
        sub={data.room + " · " + activeStyle.name + " · " + data.area + " м²"} />

      <div className="pd-body">
        <div className="pd-main" ref={mainRef}>
          <StyleHero data={data} style={activeStyle} />
          <RoomAnalysis a={data.analysis} sref={secRefs.analysis} />
          <StylePicker data={data} styleId={styleId} onPick={setStyleId} sref={secRefs.styles} myStyles={myStyles} />
          <LayoutPicker layout={activeLayout} onPick={setLayoutId} />
          <BeforeAfter data={data} style={activeStyle} pins={activeLayout.pins} />
          <NormsCheck checks={checks} />
          <BudgetPicker data={data} tier={tier} onTier={applyTier} total={total} onOptimize={optimize} sref={secRefs.budget} />
          <ProductCatalog data={data} sel={sel} adj={adj} style={activeStyle} mats={mats} onPick={(i, idv) => setSel((s) => ({ ...s, [i]: idv }))} sref={secRefs.products} />
          <CartBar items={cartItems} total={total} oldTotal={oldTotal} budget={data.budget} style={activeStyle} onExport={exportPDF} onSave={saveSpec} saved={specSaved} />
        </div>

        <aside className={"pd-rail" + (chatOpen ? " open" : "")}>
          <AdvisorChat id={id} hello={data.chatHello} onAction={onAction} onClose={() => setChatOpen(false)} />
        </aside>
      </div>

      <button className="pd-chat-fab" onClick={() => setChatOpen(true)} style={{ display: chatOpen ? "none" : undefined }}><I.chat size={19} />Помощник</button>
    </div>
  );
}

/* ---------------- СМЕТА-КОМПЛЕКТАЦИЯ ПО КОМНАТАМ (реальный дизайн-проект) ---------------- */
function RoomSpecOverlay({ data, onClose }) {
  const [markup, setMarkup] = usePD(data.markupPct != null ? data.markupPct : 25);
  const [catMarkup, setCatMarkup] = usePD(data.catMarkupPct || {});  // {раздел: %} — своя наценка поверх базовой (пусто = наследует)
  const [catOpen, setCatOpen] = usePD(false);
  const [discount, setDiscount] = usePD(data.discountPct || 0);      // скидка клиенту, % от подытога
  const [delivery, setDelivery] = usePD(data.deliveryCost || 0);     // доставка, ₽ (транзитом, без наценки)
  const [install, setInstall] = usePD(data.installCost || 0);        // монтаж и сборка, ₽
  const [mode, setMode] = usePD("work");   // режим выгрузки: "work" (рабочая) / "client" (для клиента) / "procure" (закупка)
  const [rooms, setRooms] = usePD(data.rooms || []);  // позиции редактируемы: копии из прошлых проектов, шаблоны, поставщики
  const [addOpen, setAddOpen] = usePD(false);         // модалка «Из прошлого проекта / шаблона»
  const [roomSaved, setRoomSaved] = usePD(false);
  const [roomSaving, setRoomSaving] = usePD(false);   // guard: двойной клик «Сохранить» не должен создать проект-дубль
  const [savedId, setSavedId] = usePD(data.id || null);
  const [settings, setSettings] = usePD(null);   // мои нормы — для проверки эргономики по комнатам
  usePDE(() => { AIVibeAPI.settings.get().then(setSettings); }, []);
  const [me, setMe] = usePD(null);               // аккаунт — фолбэк имени студии для брендинга портала (волна A5)
  usePDE(() => { AIVibeAPI.profile.get().then(setMe); }, []);
  const [library, setLibrary] = usePD([]);       // библиотека товаров студии (волна B1): автоподстановка + пикер
  const reloadLibrary = () => AIVibeAPI.library.list().then(setLibrary);
  usePDE(() => { reloadLibrary(); }, []);
  const [pickerRoom, setPickerRoom] = usePD(null);   // индекс комнаты с открытым пикером библиотеки | null
  const saveRoom = () => {
    if (roomSaving) return;
    setRoomSaving(true);
    const done = () => { setRoomSaving(false); setRoomSaved(true); setTimeout(() => setRoomSaved(false), 1700); };
    const patch = { markupPct: markup, catMarkupPct: catMarkup, discountPct: discount, deliveryCost: delivery, installCost: install, rooms, items: itemsCount };
    if (savedId) { AIVibeAPI.projects.update(savedId, patch).then(done); return; }
    // импортированная из Excel смета не привязана к проекту — создаём его,
    // иначе «Сохранено» врало бы, а наценки терялись при закрытии оверлея
    AIVibeAPI.projects.create({
      name: data.name || "Смета из Excel", room: data.generated ? "Черновик по площади" : "Комплектация из Excel", style: "",
      area: data.area, budget: data.budget || 0,
      summaryShort: data.summaryShort, ...patch,
    }).then((p) => { setSavedId(p.id); toast("Смета сохранена в «Мои проекты»"); done(); });
  };

  // копии из прошлого проекта / шаблона: комнаты с одинаковым именем сливаются
  const addFrom = (entries, srcLabel) => {
    const n = entries.reduce((s, e) => s + e.items.length, 0);
    setRooms((prev) => {
      const next = prev.map((r) => ({ ...r, items: [...r.items] }));
      entries.forEach((e) => {
        const tgt = next.find((r) => r.name === e.name);
        if (tgt) tgt.items.push(...e.items);
        else next.push({ name: e.name, ...(e.area ? { area: e.area } : {}), items: e.items });
      });
      return next;
    });
    setAddOpen(false);
    toast("Добавлено " + n + " " + plural(n, ["позиция", "позиции", "позиций"]) + " — «" + srcLabel + "». Не забудьте сохранить смету.");
  };

  /* --- живое редактирование сметы (фаза 2 слияния, шаг 1) --- */
  const [editPos, setEditPos] = usePD(null); // {ri, ii} — открытый редактор строки; ii === -1 — новая позиция в комнате ri
  const [flashPos, setFlashPos] = usePD(null); // {ri, ii} — только что добавленная строка, короткая олива-подсветка
  const [flashSup, setFlashSup] = usePD(null); // {ri, ii} — строка только что сменила поставщика и переехала в новую группу закупки
  const todayISO = () => new Date().toISOString().slice(0, 10);
  // d — нормализованный черновик из PosEditor: {title, qty, price, cat, sup} (строки trim, числа целые)
  const savePos = (ri, ii, d) => {
    const newIndex = ii === -1 ? rooms[ri].items.length : ii;
    setRooms((prev) => prev.map((r, i) => {
      if (i !== ri) return r;
      const items = [...r.items];
      const base = ii === -1 ? {} : items[ii];
      const next = { ...base, title: d.title, qty: d.qty, price: d.price };
      if (d.cat) next.cat = d.cat; else delete next.cat;
      if (d.sup) next.sup = d.sup; else delete next.sup;
      // цену ввели/поменяли руками — значит проверили сейчас, пометка давности обнуляется
      if (ii === -1 || d.price !== base.price) next.priceDate = todayISO();
      // цена изменилась после решения клиента — решение больше не действует (иначе протокол согласования врал бы)
      if (ii !== -1 && base.approve && d.price !== base.price) {
        delete next.approve; delete next.approveAt;
        toast("Цена изменилась — позиция снова ждёт решения клиента.");
      }
      if (ii === -1) items.push(next); else items[ii] = next;
      return { ...r, items };
    }));
    setEditPos(null);
    if (ii === -1) {
      setFlashPos({ ri, ii: newIndex });
      setTimeout(() => setFlashPos((f) => (f && f.ri === ri && f.ii === newIndex ? null : f)), 1300);
    }
  };
  const removePos = (ri, ii) => {
    const it = rooms[ri].items[ii];
    setRooms((prev) => prev.map((r, i) => (i !== ri ? r : { ...r, items: r.items.filter((_, j) => j !== ii) })));
    setEditPos(null);
    toast("Позиция «" + it.title + "» удалена. Не забудьте сохранить смету.");
  };
  const renameRoom = async (ri) => {
    const name = await promptDialog({ title: "Переименовать комнату", label: "Название", value: rooms[ri].name });
    if (!name || !name.trim() || name.trim() === rooms[ri].name) return;
    const v = name.trim();
    if (rooms.some((r, i) => i !== ri && r.name === v)) { toast("Комната «" + v + "» уже есть — выберите другое имя"); return; }
    setRooms((prev) => prev.map((r, i) => (i === ri ? { ...r, name: v } : r)));
  };

  // Esc закрывает смету-оверлей (когда открыта напрямую, напр. из импорта Excel);
  // из полей ввода Esc не закрывает, а отдаёт фокус
  usePDE(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) { e.target.blur(); return; }
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  // наценка: базовая + необязательный оверрайд по разделу. Округляется ЦЕНА ЗА ШТУКУ,
  // сумма строки = цена × кол-во — тогда колонки документа бьются арифметически (UI = PDF = Excel)
  const catOf = (it) => it.cat || "Прочее";
  const pctOf = (cat) => (catMarkup[cat] != null ? catMarkup[cat] : markup);
  const lineCost = (it) => it.price * (it.qty || 1);
  const unitClient = (it) => Math.round(it.price * (1 + pctOf(catOf(it)) / 100));
  const lineClient = (it) => unitClient(it) * (it.qty || 1);
  const roomTotal = (r) => r.items.reduce((s, it) => s + lineCost(it), 0);
  const roomClient = (r) => r.items.reduce((s, it) => s + lineClient(it), 0);
  const grand = rooms.reduce((s, r) => s + roomTotal(r), 0);
  const client = rooms.reduce((s, r) => s + roomClient(r), 0);
  const itemsCount = rooms.reduce((s, r) => s + r.items.length, 0);
  const over = grand > data.budget;
  // разделы проекта — из фактических позиций, тяжёлые по себестоимости первыми
  const catCost = {}, catCli = {};   // catCli — суммой округлённых строк, чтобы панель сходилась с итогом и выгрузками
  rooms.forEach((r) => r.items.forEach((it) => { const k = catOf(it); catCost[k] = (catCost[k] || 0) + lineCost(it); catCli[k] = (catCli[k] || 0) + lineClient(it); }));
  const cats = Object.keys(catCost).sort((a, b) => catCost[b] - catCost[a]);
  const ovrCount = cats.filter((c) => catMarkup[c] != null).length;
  const setCatPct = (cat, v) => setCatMarkup((m) => { const n = { ...m }; if (v == null) delete n[cat]; else n[cat] = v; return n; });
  const effPct = grand > 0 ? Math.round((client / grand - 1) * 100) : markup;
  // режим «Закупка»: группировка по поставщику позиции (поле sup, редактируется тут же);
  // без поставщика — отдельная группа в конце. Цены — только себестоимость
  const NO_SUP = "Поставщик не указан";
  const supOf = (it) => (it.sup || "").trim();
  const supList = [...new Set(rooms.flatMap((r) => r.items.map(supOf)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
  const supGroups = (() => {
    const g = {};
    rooms.forEach((r, ri) => r.items.forEach((it, ii) => {
      const k = supOf(it) || NO_SUP;
      (g[k] = g[k] || []).push({ it, ri, ii, room: r.name });
    }));
    const total = (k) => g[k].reduce((s, x) => s + lineCost(x.it), 0);
    return Object.keys(g)
      .sort((a, b) => (a === NO_SUP ? 1 : b === NO_SUP ? -1 : total(b) - total(a)))
      .map((name) => ({ name, rows: g[name], total: total(name) }));
  })();
  const setSup = (ri, ii, v) => {
    setRooms((prev) => prev.map((r, i) => i !== ri ? r
      : { ...r, items: r.items.map((it, j) => j !== ii ? it : (() => { const { sup, ...rest } = it; const s = (v || "").trim(); return s ? { ...rest, sup: s } : rest; })()) }));
    // поставщик сменился — строка переехала в другую группу закупки, коротко подсветим её там
    setFlashSup({ ri, ii });
    setTimeout(() => setFlashSup((f) => (f && f.ri === ri && f.ii === ii ? null : f)), 1300);
  };

  /* --- стадии закупки по позициям (фаза 2 слияния, шаг 2; словарь стадий — web/ffe.js).
     Позиция без status считается «Подбор»; смена стадии штампует дату (stampStatus
     не затирает ранее пройденные). Живут только в «Закупке» — клиент их не видит. */
  const FFE = window.AIVibeFFE || null;
  const stOf = (it) => (FFE && FFE.STATUS_BY_ID[it.status] ? it.status : "specified");
  const setStatus = (ri, ii, id) => setRooms((prev) => prev.map((r, i) => i !== ri ? r
    : { ...r, items: r.items.map((it, j) => j !== ii ? it : { ...it, status: id, statusDates: FFE.stampStatus(it.statusDates, id) }) }));
  const rowsProgress = (rws) => (rws.length ? rws.reduce((s, x) => s + FFE.statusProgress(stOf(x.it)), 0) / rws.length : 0); // 0..1
  const allProcRows = supGroups.flatMap((g) => g.rows);
  const acceptedCount = FFE ? allProcRows.filter((x) => stOf(x.it) === "accepted").length : 0;

  /* --- согласование с клиентом ПО ПОЗИЦИЯМ (волна A1, бенчмарк Programa; словарь — web/ffe.js).
     Отдельное измерение от стадии закупки: пока портала нет, решения клиента отмечает
     дизайнер по ходу созвона. Отсутствие поля approve = «ждёт решения» (старые сметы
     не мигрируем). Живёт в «Рабочей» — клиентская выгрузка решений не показывает. */
  const apOf = (it) => (FFE && FFE.APPROVE_BY_ID[it.approve] ? it.approve : "pending");
  const setApprove = (ri, ii, id) => setRooms((prev) => prev.map((r, i) => i !== ri ? r
    : { ...r, items: r.items.map((it, j) => {
        if (j !== ii) return it;
        if (id === "pending") { const { approve, approveAt, ...rest } = it; return rest; }
        return { ...it, approve: id, approveAt: FFE.today() };
      }) }));
  // массовое согласование комнаты (паттерн Programa «bulk approve»): все ✓ → снять, иначе — всем ✓
  const approveRoom = (ri) => setRooms((prev) => prev.map((r, i) => {
    if (i !== ri) return r;
    const allOk = r.items.length > 0 && r.items.every((it) => apOf(it) === "ok");
    return { ...r, items: r.items.map((it) => {
      if (allOk) { const { approve, approveAt, ...rest } = it; return rest; }
      return { ...it, approve: "ok", approveAt: FFE.today() };
    }) };
  }));
  const apCnt = { ok: 0, revise: 0, rejected: 0, pending: 0 };
  if (FFE) rooms.forEach((r) => r.items.forEach((it) => { apCnt[apOf(it)]++; }));
  const apWaiting = itemsCount - apCnt.ok;   // всё, что не «Согласовано», требует внимания
  const [apFilter, setApFilter] = usePD(false);   // «ждут решения»: спрятать согласованные строки

  /* --- библиотека товаров студии (волна B1): собрать мастер-запись из позиции /
     добавить товары в комнату. Позиции сметы — независимые копии: правка библиотеки
     их не трогает (и наоборот). Дедуп по названию, чтобы не плодить дубли. */
  const saveToLibrary = (pos) => {
    if (!FFE || !pos || !String(pos.title || "").trim()) return;
    const title = String(pos.title).trim();
    if (library.some((p) => (p.title || "").trim().toLowerCase() === title.toLowerCase())) {
      toast("«" + title + "» уже есть в библиотеке студии."); return;
    }
    AIVibeAPI.library.create(FFE.productFromPosition(pos)).then(() => {
      reloadLibrary(); toast("«" + title + "» добавлен в библиотеку студии.");
    });
  };
  const addLibToRoom = (ri, products) => {
    if (!FFE || !products || !products.length) return;
    setRooms((prev) => prev.map((r, i) => (i !== ri ? r
      : { ...r, items: [...r.items, ...products.map((p) => FFE.positionFromProduct(p))] })));
    setPickerRoom(null);
    const n = products.length;
    toast("Добавлено " + n + " " + plural(n, ["позиция", "позиции", "позиций"]) + " из библиотеки. Не забудьте сохранить смету.");
  };
  // итог структурой: подытог (client) → скидка → доставка/монтаж → ИТОГО.
  // Скидка округляется до рубля от подытога — та же формула в PDF/Excel (инвариант выгрузок)
  const discountAmt = Math.round(client * discount / 100);
  const totalClient = client - discountAmt + delivery + install;
  // эргономика по комнатам: там, где в РД есть план расстановки (plan+layout); мои нормы учитываются.
  // До прихода settings не считаем — иначе первый кадр показан по канону и «мигает» при загрузке моих норм
  const effNorms = settings ? { ...(settings.normsOverride || {}), enabled: settings.enabledNorms || {} } : undefined;
  const ergo = window.AIVibeEngine && settings
    ? rooms.filter((r) => r.plan && r.layout).map((r) => ({ name: r.name, res: AIVibeEngine.checkErgonomics({ plan: r.layout }, r.plan, effNorms) }))
    : [];
  const ergoWarns = ergo.reduce((s, e) => s + e.res.warns, 0);
  const ergoSkipped = rooms.length - ergo.length;
  const specArgs = () => ({ project: data.name, area: data.area, rooms, grand, markupPct: markup, catMarkupPct: catMarkup, clientTotal: client, discountPct: discount, deliveryCost: delivery, installCost: install, budget: data.budget, mode });
  const exportPDF = () => { if (window.AIVibePDF && AIVibePDF.exportRoomSpec) withLib("pdf", () => AIVibePDF.exportRoomSpec(specArgs())); };
  const exportXLSX = () => { if (window.AIVibeXLSX) withLib("xlsx", () => AIVibeXLSX.exportRoomSpec(specArgs())); };

  /* --- версии + согласование (фаза 2 слияния, шаг 3; статусы и хранилище — web/ffe.js).
     Снимок = позиции + наценки + скидка/доставка/монтаж: восстановление возвращает смету
     в момент отправки клиенту (включая стадии закупки — они живут в позициях).
     Версии привязаны к проекту — несохранённую смету просим сначала сохранить. */
  const [versionsOpen, setVersionsOpen] = usePD(false);
  const [shareModal, setShareModal] = usePD(null);   // запись портал-шары для модалки «Ссылка для клиента» | null
  const [versions, setVersions] = usePD(() => (FFE && data.id ? FFE.loadVersions(data.id) : []));
  usePDE(() => { if (FFE && savedId) FFE.saveVersions(savedId, versions); }, [versions, savedId]);
  const approved = versions.find((v) => v.status === "approved");
  const openVersions = () => {
    if (!savedId) { toast("Сначала сохраните смету — версии привязаны к проекту.", "warn", 5000); return; }
    setVersionsOpen(true);
  };
  const saveVersion = (label) => {
    setVersions((prev) => [{
      id: "v_" + Date.now().toString(36),
      label: (label || "").trim() || "Версия от " + fmtDateRu(FFE.today()),
      createdAt: new Date().toISOString(),
      total: grand, clientTotal: totalClient, positions: itemsCount,
      status: "draft", statusAt: "", note: "",
      snapshot: JSON.parse(JSON.stringify({ rooms, markup, catMarkup, discount, delivery, install })),
    }, ...prev]);
  };
  const restoreVersion = (v) => {
    const s = v.snapshot || {};
    setRooms(Array.isArray(s.rooms) ? s.rooms : []);
    if (typeof s.markup === "number") setMarkup(s.markup);
    setCatMarkup(s.catMarkup || {});
    setDiscount(s.discount || 0); setDelivery(s.delivery || 0); setInstall(s.install || 0);
    setEditPos(null);
    setVersionsOpen(false);
    toast("Версия «" + v.label + "» загружена в рабочую смету. Не забудьте сохранить.");
  };
  const patchVersion = (id, patch) => setVersions((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const setVersionStatus = (id, status) => patchVersion(id, { status, statusAt: FFE.today() });
  const removeVersion = async (v) => {
    const ok = await confirmDialog({ title: "Удалить версию?", text: "«" + v.label + "» исчезнет из истории. Рабочую смету это не меняет.", confirmLabel: "Удалить версию" });
    if (ok) setVersions((prev) => prev.filter((x) => x.id !== v.id));
  };
  // «Ссылка для клиента» (волна A2): опубликовать снимок версии в портал и показать ссылку.
  // Ссылка на версию переиспользуется (снимок неизменен); первая выдача метит версию «Отправлена».
  const shareVersion = (v) => {
    let rec = v.shareId ? FFE.loadPortalShare(v.shareId) : null;
    if (!rec) {
      // брендинг портала (волна A5): своё имя студии из настроек, иначе — имя аккаунта
      const studioName = (settings && settings.studioName) || (me && me.name) || "";
      rec = FFE.createPortalShare({ projectId: savedId, projectName: data.name, versionId: v.id, versionLabel: v.label, snapshot: v.snapshot, studioName });
      patchVersion(v.id, { shareId: rec.shareId, status: v.status === "draft" ? "sent" : v.status, statusAt: FFE.today() });
    }
    setShareModal(rec);
  };

  return (
    <div className="pd-overlay" role="dialog" aria-label={"Смета: " + data.name}>
      <OverlayHead onBack={onClose} budget={data.budget}
        crumbs={[{ label: "Проекты", onClick: onClose }, { label: data.name }, { label: "Смета" }]}
        title={data.name}
        sub={"Комплектация по дизайн-проекту · " + data.area + " м² · " + itemsCount + " " + plural(itemsCount, ["позиция", "позиции", "позиций"])
          + (FFE && apCnt.ok > 0 ? " · согласовано " + apCnt.ok + " из " + itemsCount : "")}
        right={approved ? (
          <span className="glass" title={"Согласована версия «" + approved.label + "»" + (approved.statusAt ? " — " + fmtDateRu(approved.statusAt) : "")}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 99, fontSize: "var(--fs-12)", fontWeight: 700, whiteSpace: "nowrap", color: "var(--accent-2-ink)", borderColor: "rgba(94,107,91,.4)" }}>
            <I.check size={15} />Согласовано{approved.statusAt ? " · " + fmtDateRu(approved.statusAt) : ""}
          </span>
        ) : null} />

      {/* solo: у сметы нет правого чат-рейла — грид 1fr, контент центрируется */}
      <div className="pd-body solo">
        <div className="pd-main">
          <section className="pd-section" style={ergo.length ? undefined : { borderBottom: "none" }}>
            <div className="eyebrow jade" style={{ marginBottom: 14 }}>Спецификация-комплектация</div>
            <h3 className="pd-h">Смета по комнатам</h3>
            <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", marginTop: 4, marginBottom: 14, maxWidth: 820, lineHeight: 1.6 }}>{data.summaryShort}</p>

            {/* переиспользование наработанного: копии позиций из прошлых смет + типовые комплектации */}
            <div style={{ marginBottom: 20 }}>
              <button className="btn btn-ghost" onClick={() => setAddOpen(true)}
                title="Скопировать позиции из прошлого проекта (с пометкой давности цены) или добавить типовую комплектацию">
                <I.plus size={16} />Из прошлого проекта / шаблона
              </button>
              {FFE && (
                <button className="btn btn-ghost" onClick={openVersions} title="Снимки сметы, сравнение с текущей и статус согласования с клиентом">
                  <I.news size={16} />Версии{versions.length ? " · " + versions.length : ""}
                </button>
              )}
              {FFE && mode === "work" && itemsCount > 0 && (
                <button className="btn btn-ghost" onClick={() => setApFilter((f) => !f)} aria-pressed={apFilter}
                  title={apFilter ? "Показать все позиции" : "Оставить только позиции, ждущие решения клиента (согласованные скрыть)"}
                  style={apFilter ? { color: "var(--accent-ink)" } : undefined}>
                  <I.check size={16} />{apFilter ? "Показать все" : "Ждут решения · " + apWaiting}
                </button>
              )}
            </div>

            {/* наценка дизайнера: базовая на всё + свои проценты по разделам (в закупке не участвует) */}
            {mode !== "procure" && <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: "16px 20px", marginBottom: 22, maxWidth: 640 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: "var(--fs-14)" }}>Наценка дизайнера{ovrCount > 0 && <span style={{ fontWeight: 500, fontSize: "var(--fs-12)", color: "var(--muted)" }}> · базовая</span>}</span>
                <span className="mono" style={{ fontWeight: 600, fontSize: "var(--fs-16)", color: "var(--accent-ink)" }}>+{markup}%</span>
              </div>
              <input type="range" min="0" max="100" step="5" value={markup} onChange={(e) => setMarkup(+e.target.value)} className="quiz-range" style={{ marginTop: 10 }}
                aria-label="Базовая наценка дизайнера, %" aria-valuetext={"+" + markup + "% — итого клиенту " + fmtMoney(totalClient)} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: "var(--fs-13)", flexWrap: "wrap", gap: 8 }}>
                <span style={{ color: "var(--muted)" }}>Себестоимость (фабрика): <b style={{ color: "var(--text)" }}>{fmtMoney(grand)}</b></span>
                {/* это подытог ДО скидки/доставки — не путать с «Итого для клиента» в блоке итога */}
                <span style={{ color: "var(--muted)" }}>Подытог для клиента: <b style={{ color: "var(--accent-2)" }}>{fmtMoney(client)}</b></span>
              </div>

              {/* свои наценки по разделам: пустое поле = раздел наследует базовую */}
              <button onClick={() => setCatOpen((o) => !o)} aria-expanded={catOpen}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 14, fontSize: "var(--fs-13)", fontWeight: 600, color: "var(--info)" }}>
                <I.sliders size={14} />Наценка по разделам
                {ovrCount > 0 && <span className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--accent-ink)" }}>· {ovrCount} {plural(ovrCount, ["своя", "свои", "своих"])}</span>}
                <span aria-hidden="true" style={{ display: "inline-flex", transform: catOpen ? "rotate(180deg)" : "none", transition: "transform .2s var(--ease)" }}><Icon size={13} d="M4 9l8 7 8-7" /></span>
              </button>
              <div className="acc-collapse" data-open={catOpen ? "1" : "0"}>
                <div style={{ marginTop: 8, borderTop: "1px solid var(--hairline-2)" }}>
                  {cats.map((cat) => {
                    const ovr = catMarkup[cat] != null;
                    return (
                      <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--hairline-2)", fontSize: "var(--fs-13)" }}>
                        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat}</span>
                        <span className="mono rs-unit" style={{ fontSize: "var(--fs-12)", color: "var(--spec-meta)", whiteSpace: "nowrap" }}>{fmtMoney(catCost[cat])}</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <input className="fld" type="number" min="0" max="300" step="5" inputMode="numeric"
                            value={ovr ? catMarkup[cat] : ""} placeholder={"+" + markup}
                            aria-label={"Наценка на раздел «" + cat + "», % — пусто: базовая"}
                            onKeyDown={(e) => { if (!e.ctrlKey && !e.metaKey && ["e", "E", "+", "-", ".", ","].includes(e.key)) e.preventDefault(); }}
                            onChange={(e) => { const v = e.target.value; if (v === "") { setCatPct(cat, null); return; } const n = Math.max(0, Math.min(300, Math.round(+v))); if (!isNaN(n)) setCatPct(cat, n); }}
                            style={{ width: 64, padding: "6px 8px", fontSize: "var(--fs-12)", fontFamily: "var(--font-mono)", textAlign: "right" }} />
                          <span className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--faint)" }}>%</span>
                        </span>
                        <span className="mono" style={{ width: 96, textAlign: "right", fontSize: "var(--fs-12)", fontWeight: ovr ? 600 : 400, color: ovr ? "var(--accent-ink)" : "var(--muted)", whiteSpace: "nowrap" }}>
                          {fmtMoney(catCli[cat])}
                        </span>
                        {ovr
                          ? <button onClick={() => setCatPct(cat, null)} title="Вернуть базовую наценку" aria-label={"Вернуть разделу «" + cat + "» базовую наценку"} className="mono" style={{ flex: "none", fontSize: "var(--fs-11)", color: "var(--muted)", border: "1px solid var(--hairline)", borderRadius: 99, padding: "4px 9px" }}>↺</button>
                          : <span style={{ flex: "none", width: 31 }} aria-hidden="true" />}
                      </div>
                    );
                  })}
                  <div style={{ padding: "8px 0 2px", fontSize: "var(--fs-12)", color: "var(--muted)", lineHeight: 1.5 }}>
                    Пустое поле — раздел идёт по базовой наценке +{markup}%. Свои проценты действуют в смете и в выгрузках PDF и Excel.
                  </div>
                </div>
              </div>
            </div>}

            {/* комнаты — читаются как документ: шапка колонок + две цены построчно.
               В «Рабочей» каждая строка редактируема (карандаш → PosEditor), комнату
               можно переименовать, позицию — добавить вручную. «Для клиента» — чистый просмотр. */}
            {mode !== "procure" && <div key={"rooms-" + mode} className="view-enter" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {rooms.map((r, ri) => (
                <div key={r.name} className="glass" style={{ borderRadius: "var(--r-lg)", padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
                      <span style={{ fontWeight: 800, fontFamily: "var(--font-display)", fontSize: "var(--fs-16)" }}>{r.name}{r.area ? <span style={{ color: "var(--faint)", fontWeight: 500, fontSize: "var(--fs-13)" }}> · {r.area} м²</span> : null}</span>
                      {mode === "work" && (
                        <button className="icon-btn xs" aria-label={"Переименовать комнату «" + r.name + "»"} title="Переименовать комнату"
                          onClick={() => renameRoom(ri)} style={{ flex: "none", alignSelf: "center", color: "var(--spec-meta)" }}>
                          <I.edit size={13} />
                        </button>
                      )}
                      {mode === "work" && FFE && r.items.length > 0 && (() => {
                        const allOk = r.items.every((it) => apOf(it) === "ok");
                        const label = allOk ? "Снять отметку согласования со всей комнаты" : "Отметить всю комнату согласованной клиентом";
                        return (
                          <button className="icon-btn xs" aria-label={label + " «" + r.name + "»"} title={label}
                            onClick={() => approveRoom(ri)}
                            style={{ flex: "none", alignSelf: "center", color: allOk ? "var(--accent-2-ink)" : "var(--spec-meta)" }}>
                            <I.check size={13} />
                          </button>
                        );
                      })()}
                    </span>
                    <span style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                      {mode === "work" && <span className="mono" style={{ fontSize: "var(--fs-13)", color: "var(--muted)" }}>{fmtMoney(roomTotal(r))}</span>}
                      <span className="mono" style={{ fontWeight: 600, fontSize: "var(--fs-15)", color: mode === "work" ? "var(--accent-2)" : "var(--text)" }}>{fmtMoney(roomClient(r))}</span>
                    </span>
                  </div>
                  {/* шапка колонок */}
                  <div className="mono" style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "2px 0 6px", fontSize: "var(--fs-10)", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--spec-meta)", borderBottom: "1px solid var(--hairline)" }}>
                    <span style={{ flex: 1 }}>Позиция</span>
                    <span className="rs-cat" style={{ width: 78, textAlign: "right" }}>Раздел</span>
                    <span style={{ width: 34, textAlign: "right" }}>Кол</span>
                    <span className="rs-unit" style={{ width: 88, textAlign: "right" }}>Цена/шт</span>
                    {mode === "work" && <span style={{ width: 100, textAlign: "right" }}>Себест.</span>}
                    <span style={{ width: 104, textAlign: "right" }}>Клиенту</span>
                    {mode === "work" && FFE && <span className="rs-ap" style={{ width: 122, textAlign: "right" }}>Клиент решил</span>}
                    {mode === "work" && <span style={{ width: 26 }} aria-hidden="true" />}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {r.items.map((it, i) => {
                      const qty = it.qty || 1;
                      const editing = mode === "work" && editPos && editPos.ri === ri && editPos.ii === i;
                      // фильтр «ждут решения»: согласованные строки скрываем (редактируемую — никогда)
                      if (mode === "work" && apFilter && !editing && apOf(it) === "ok") return null;
                      return (
                      <React.Fragment key={i}>
                      <div className={flashPos && flashPos.ri === ri && flashPos.ii === i ? "row-flash" : undefined}
                        style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "7px 0", borderTop: i ? "1px solid var(--hairline-2)" : "none", fontSize: "var(--fs-13)" }}>
                        <span style={{ flex: 1, color: "var(--text)", lineHeight: 1.4 }}>{it.title}{mode === "work" && it.priceDate && <React.Fragment>{" "}<PriceAgeChip d={it.priceDate} note={pastCopyNote(it.priceDate)} /></React.Fragment>}</span>
                        <span className="rs-cat" style={{ color: "var(--spec-meta)", whiteSpace: "nowrap", fontSize: "var(--fs-12)", width: 78, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis" }}>{catOf(it)}</span>
                        <span className="mono" style={{ color: "var(--spec-meta)", whiteSpace: "nowrap", width: 34, textAlign: "right", fontSize: "var(--fs-12)" }}>×{qty}</span>
                        <span className="mono rs-unit" style={{ color: "var(--spec-meta)", whiteSpace: "nowrap", width: 88, textAlign: "right", fontSize: "var(--fs-12)" }}>{fmtMoney(mode === "client" ? unitClient(it) : it.price)}</span>
                        {mode === "work" && <span className="mono" style={{ color: "var(--muted)", whiteSpace: "nowrap", width: 100, textAlign: "right" }}>{fmtMoney(it.price * qty)}</span>}
                        <span className="mono" style={{ fontWeight: 600, whiteSpace: "nowrap", width: 104, textAlign: "right", color: mode === "work" ? "var(--accent-2)" : "var(--text)" }}>{fmtMoney(lineClient(it))}</span>
                        {mode === "work" && FFE && (() => {
                          const aid = apOf(it), m = FFE.approveMeta(aid);
                          return (
                            <span className="rs-ap" style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 6, width: 122, flex: "none", alignSelf: "center" }}
                              title={"Решение клиента: " + m.label + (it.approveAt ? " — " + fmtDateRu(it.approveAt) : "")}>
                              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: m.color, flex: "none" }} />
                              <select className="fld" value={aid} aria-label={"Решение клиента по позиции «" + it.title + "»"}
                                onChange={(e) => setApprove(ri, i, e.target.value)}
                                style={{ width: 108, flex: "none", padding: "5px 6px", fontSize: "var(--fs-12)" }}>
                                {FFE.APPROVE_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                              </select>
                            </span>
                          );
                        })()}
                        {mode === "work" && (
                          <button className="icon-btn xs" aria-label={"Редактировать позицию «" + it.title + "»"} aria-expanded={!!editing} title="Редактировать позицию"
                            onClick={() => setEditPos(editing ? null : { ri, ii: i })}
                            style={{ flex: "none", alignSelf: "center", color: editing ? "var(--accent-ink)" : "var(--spec-meta)" }}>
                            <I.edit size={14} />
                          </button>
                        )}
                      </div>
                      {editing && (
                        <PosEditor item={it} cats={cats} sups={supList} library={library} onToLibrary={saveToLibrary}
                          onCancel={() => setEditPos(null)} onSave={(d) => savePos(ri, i, d)} onDelete={() => removePos(ri, i)} />
                      )}
                      </React.Fragment>
                      );
                    })}
                  </div>
                  {mode === "work" && FFE && apFilter && r.items.length > 0 && !(editPos && editPos.ri === ri && editPos.ii >= 0)
                    && r.items.every((it) => apOf(it) === "ok") && (
                    <div style={{ padding: "8px 0 2px", fontSize: "var(--fs-12)", color: "var(--muted)" }}>Все позиции комнаты согласованы клиентом ✓</div>
                  )}
                  {mode === "work" && (editPos && editPos.ri === ri && editPos.ii === -1
                    ? <PosEditor isNew cats={cats} sups={supList} library={library} onToLibrary={saveToLibrary} onCancel={() => setEditPos(null)} onSave={(d) => savePos(ri, -1, d)} />
                    : <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                        <button className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: "var(--fs-12)" }}
                          onClick={() => setEditPos({ ri, ii: -1 })}><I.plus size={14} />Позиция вручную</button>
                        {FFE && <button className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: "var(--fs-12)" }}
                          onClick={() => setPickerRoom(ri)}><I.layers size={14} />Из библиотеки</button>}
                      </div>)}
                </div>
              ))}
            </div>}

            {/* закупочный лист (роадмап #10): группы по поставщикам, только себестоимость,
                поставщик — редактируемое поле позиции (datalist подсказывает уже введённых) */}
            {mode === "procure" && (
              <div key={"procure-" + mode} className="view-enter" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontSize: "var(--fs-12)", color: "var(--muted)", maxWidth: 820, lineHeight: 1.55 }}>
                  Позиции сгруппированы по поставщикам, цены — себестоимость без наценки. Поле «поставщик» редактируется прямо в строке; позиции без поставщика собраны в конце. В Excel каждый поставщик получает отдельный лист.
                </div>
                {supGroups.map((g) => (
                  <div key={g.name} className="glass" style={{ borderRadius: "var(--r-lg)", padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, fontFamily: "var(--font-display)", fontSize: "var(--fs-16)", color: g.name === NO_SUP ? "var(--muted)" : undefined }}>
                        {g.name}<span style={{ color: "var(--faint)", fontWeight: 500, fontSize: "var(--fs-13)" }}> · {g.rows.length} {plural(g.rows.length, ["позиция", "позиции", "позиций"])}</span>
                      </span>
                      <span style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                        {FFE && <span className="mono" title="Средний прогресс стадий закупки позиций поставщика" style={{ fontSize: "var(--fs-11)", color: "var(--spec-meta)" }}>готовность {Math.round(rowsProgress(g.rows) * 100)}%</span>}
                        <span className="mono" style={{ fontWeight: 600, fontSize: "var(--fs-15)" }}>{fmtMoney(g.total)}</span>
                      </span>
                    </div>
                    <div className="mono" style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "2px 0 6px", fontSize: "var(--fs-10)", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--spec-meta)", borderBottom: "1px solid var(--hairline)" }}>
                      <span style={{ flex: 1 }}>Позиция</span>
                      <span className="rs-cat" style={{ width: 104, textAlign: "right" }}>Помещение</span>
                      <span style={{ width: 34, textAlign: "right" }}>Кол</span>
                      <span className="rs-unit" style={{ width: 88, textAlign: "right" }}>Цена/шт</span>
                      <span style={{ width: 100, textAlign: "right" }}>Сумма</span>
                      <span style={{ width: 128, textAlign: "right" }}>Поставщик</span>
                      {FFE && <span style={{ width: 130, textAlign: "right" }}>Стадия</span>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {g.rows.map((x, i) => {
                        const qty = x.it.qty || 1;
                        return (
                          <div key={x.ri + ":" + x.ii} className={"rs-prow" + (flashSup && flashSup.ri === x.ri && flashSup.ii === x.ii ? " row-flash" : "")} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "7px 0", borderTop: i ? "1px solid var(--hairline-2)" : "none", fontSize: "var(--fs-13)" }}>
                            <span style={{ flex: 1, minWidth: 0, color: "var(--text)", lineHeight: 1.4, overflowWrap: "anywhere" }}>{x.it.title}{x.it.priceDate && <React.Fragment>{" "}<PriceAgeChip d={x.it.priceDate} note={pastCopyNote(x.it.priceDate)} /></React.Fragment>}</span>
                            <span className="rs-cat" style={{ color: "var(--spec-meta)", whiteSpace: "nowrap", fontSize: "var(--fs-12)", width: 104, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis" }}>{x.room}</span>
                            <span className="mono" style={{ color: "var(--spec-meta)", whiteSpace: "nowrap", width: 34, textAlign: "right", fontSize: "var(--fs-12)" }}>×{qty}</span>
                            <span className="mono rs-unit" style={{ color: "var(--spec-meta)", whiteSpace: "nowrap", width: 88, textAlign: "right", fontSize: "var(--fs-12)" }}>{fmtMoney(x.it.price)}</span>
                            <span className="mono" style={{ fontWeight: 600, whiteSpace: "nowrap", width: 100, textAlign: "right" }}>{fmtMoney(lineCost(x.it))}</span>
                            <input className="fld rs-sup" list="rs-sup-list" defaultValue={supOf(x.it)} key={"sup-" + x.ri + "-" + x.ii + "-" + supOf(x.it)}
                              placeholder="поставщик" aria-label={"Поставщик позиции «" + x.it.title + "»"}
                              onBlur={(e) => { const v = e.target.value.trim(); if (v !== supOf(x.it)) setSup(x.ri, x.ii, v); }}
                              onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                              style={{ width: 128, flex: "none", padding: "5px 8px", fontSize: "var(--fs-12)" }} />
                            {FFE && (() => {
                              const sid = stOf(x.it), m = FFE.statusMeta(sid);
                              const sd = x.it.statusDates && x.it.statusDates[sid];
                              return (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flex: "none" }} title={m.label + (sd ? " — с " + fmtDateRu(sd) : "")}>
                                  <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: m.color, flex: "none" }} />
                                  <select className="fld rs-st" value={sid} aria-label={"Стадия закупки позиции «" + x.it.title + "»"}
                                    onChange={(e) => setStatus(x.ri, x.ii, e.target.value)}
                                    style={{ width: 116, flex: "none", padding: "5px 6px", fontSize: "var(--fs-12)" }}>
                                    {FFE.FFE_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                                  </select>
                                </span>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <datalist id="rs-sup-list">{supList.map((s) => <option key={s} value={s} />)}</datalist>
              </div>
            )}

            {/* итог закупки: суммы по поставщикам + ИТОГО (зеркалит Excel-«Свод закупки») */}
            {mode === "procure" && (
              <div key={"totpr-" + mode} className="glass view-enter" style={{ borderRadius: "var(--r-lg)", padding: "16px 20px", marginTop: 18, maxWidth: 560, marginLeft: "auto" }}>
                <div className="mono" style={{ fontSize: "var(--fs-10)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--spec-meta)", paddingBottom: 8, borderBottom: "1px solid var(--hairline)" }}>Итог закупки</div>
                {supGroups.map((g) => (
                  <div key={g.name} style={{ ...RS_ROW, borderTop: "1px solid var(--hairline-2)" }}>
                    <span style={{ color: g.name === NO_SUP ? "var(--faint)" : "var(--muted)" }}>{g.name}</span>
                    <span className="mono rs-val">{fmtMoney(g.total)}</span>
                  </div>
                ))}
                {FFE && allProcRows.length > 0 && (
                  <div style={{ ...RS_ROW, borderTop: "1px solid var(--hairline-2)" }}>
                    <span style={{ color: "var(--muted)" }}>Готовность закупки</span>
                    <span className="mono rs-val" style={{ color: "var(--accent-2-ink)" }}>
                      {Math.round(rowsProgress(allProcRows) * 100)}% · принято {acceptedCount} из {allProcRows.length}
                    </span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, paddingTop: 12, marginTop: 4, borderTop: "2px solid var(--text)" }}>
                  <span style={{ fontWeight: 800, fontFamily: "var(--font-display)", fontSize: "var(--fs-15)" }}>Итого закупка</span>
                  <span className="mono rs-val" style={{ fontWeight: 600, fontSize: "var(--fs-24)", letterSpacing: "-0.01em" }}>{fmtMoney(grand)}</span>
                </div>
              </div>
            )}

            {/* итог документа: подытог → скидка → наценка → доставка/монтаж → ИТОГО (роадмап #6) */}
            {mode !== "procure" && <div key={"totwork-" + mode} className="glass view-enter" style={{ borderRadius: "var(--r-lg)", padding: "16px 20px", marginTop: 18, maxWidth: 560, marginLeft: "auto" }}>
              <div className="mono" style={{ fontSize: "var(--fs-10)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--spec-meta)", paddingBottom: 8, borderBottom: "1px solid var(--hairline)" }}>Итог сметы</div>
              {mode === "work" && (
                <React.Fragment>
                  <div style={RS_ROW}>
                    <span style={{ color: "var(--muted)" }}>Подытог — себестоимость (фабрика)</span>
                    <span className="mono rs-val">{fmtMoney(grand)}</span>
                  </div>
                  <div style={{ ...RS_ROW, borderTop: "1px solid var(--hairline-2)" }}>
                    <span style={{ color: "var(--muted)" }}>Наценка дизайнера {ovrCount > 0 ? "· по разделам ≈ +" + effPct + "%" : "+" + markup + "%"}</span>
                    <span className="mono rs-val" style={{ color: "var(--accent-2-ink)" }}>+{fmtMoney(client - grand)}</span>
                  </div>
                </React.Fragment>
              )}
              {(mode === "work" || discountAmt > 0 || delivery > 0 || install > 0) && (
                <div style={{ ...RS_ROW, borderTop: "1px solid var(--hairline-2)" }}>
                  <span style={{ fontWeight: 600 }}>{mode === "work" ? "Подытог для клиента" : "Подытог"}</span>
                  <span className="mono rs-val" style={{ fontWeight: 600 }}>{fmtMoney(client)}</span>
                </div>
              )}
              {mode === "work" ? (
                <React.Fragment>
                  <div style={{ ...RS_ROW, borderTop: "1px solid var(--hairline-2)" }}>
                    <span style={{ color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      Скидка клиенту
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <input className="fld" type="number" min="0" max="50" step="1" inputMode="numeric"
                          value={discount || ""} placeholder="0" aria-label="Скидка клиенту, % от подытога"
                          aria-describedby="rs-disc-val rs-total-val"
                          onKeyDown={(e) => { if (!e.ctrlKey && !e.metaKey && ["e", "E", "+", "-", ".", ","].includes(e.key)) e.preventDefault(); }}
                          onChange={(e) => { const v = e.target.value; if (v === "") { setDiscount(0); return; } const n = Math.max(0, Math.min(50, Math.round(+v))); if (!isNaN(n)) setDiscount(n); }}
                          style={{ width: 56, padding: "5px 8px", fontSize: "var(--fs-12)", fontFamily: "var(--font-mono)", textAlign: "right" }} />
                        <span className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--spec-meta)" }}>%</span>
                      </span>
                    </span>
                    {/* ноль — прочерк (не-данные, faint допустим); сумма — терракота-текст */}
                    <span id="rs-disc-val" className="mono rs-val" style={{ color: discountAmt > 0 ? "var(--accent-ink)" : "var(--faint)" }}>{discountAmt > 0 ? "−" + fmtMoney(discountAmt) : "—"}</span>
                  </div>
                  <div style={{ ...RS_ROW, borderTop: "1px solid var(--hairline-2)" }}>
                    <span style={{ color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      Доставка
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <input className="fld" type="number" min="0" max="1000000" step="500" inputMode="numeric"
                          value={delivery || ""} placeholder="0" aria-label="Доставка, ₽ — транзитом, без наценки"
                          aria-describedby="rs-deliv-val rs-total-val"
                          onKeyDown={(e) => { if (!e.ctrlKey && !e.metaKey && ["e", "E", "+", "-", ".", ","].includes(e.key)) e.preventDefault(); }}
                          onChange={(e) => { const v = e.target.value; if (v === "") { setDelivery(0); return; } const n = Math.max(0, Math.min(1000000, Math.round(+v))); if (!isNaN(n)) setDelivery(n); }}
                          style={{ width: 88, padding: "5px 8px", fontSize: "var(--fs-12)", fontFamily: "var(--font-mono)", textAlign: "right" }} />
                        <span className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--spec-meta)" }}>₽</span>
                      </span>
                    </span>
                    <span id="rs-deliv-val" className="mono rs-val" style={{ color: delivery > 0 ? undefined : "var(--faint)" }}>{delivery > 0 ? "+" + fmtMoney(delivery) : "—"}</span>
                  </div>
                  <div style={{ ...RS_ROW, borderTop: "1px solid var(--hairline-2)" }}>
                    <span style={{ color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      Монтаж и сборка
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <input className="fld" type="number" min="0" max="1000000" step="500" inputMode="numeric"
                          value={install || ""} placeholder="0" aria-label="Монтаж и сборка, ₽"
                          aria-describedby="rs-inst-val rs-total-val"
                          onKeyDown={(e) => { if (!e.ctrlKey && !e.metaKey && ["e", "E", "+", "-", ".", ","].includes(e.key)) e.preventDefault(); }}
                          onChange={(e) => { const v = e.target.value; if (v === "") { setInstall(0); return; } const n = Math.max(0, Math.min(1000000, Math.round(+v))); if (!isNaN(n)) setInstall(n); }}
                          style={{ width: 88, padding: "5px 8px", fontSize: "var(--fs-12)", fontFamily: "var(--font-mono)", textAlign: "right" }} />
                        <span className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--spec-meta)" }}>₽</span>
                      </span>
                    </span>
                    <span id="rs-inst-val" className="mono rs-val" style={{ color: install > 0 ? undefined : "var(--faint)" }}>{install > 0 ? "+" + fmtMoney(install) : "—"}</span>
                  </div>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  {discountAmt > 0 && <div style={{ ...RS_ROW, borderTop: "1px solid var(--hairline-2)" }}><span style={{ color: "var(--muted)" }}>Скидка −{discount}%</span><span className="mono rs-val">−{fmtMoney(discountAmt)}</span></div>}
                  {delivery > 0 && <div style={{ ...RS_ROW, borderTop: "1px solid var(--hairline-2)" }}><span style={{ color: "var(--muted)" }}>Доставка</span><span className="mono rs-val">+{fmtMoney(delivery)}</span></div>}
                  {install > 0 && <div style={{ ...RS_ROW, borderTop: "1px solid var(--hairline-2)" }}><span style={{ color: "var(--muted)" }}>Монтаж и сборка</span><span className="mono rs-val">+{fmtMoney(install)}</span></div>}
                </React.Fragment>
              )}
              {/* ИТОГО — жирная чертёжная линия + крупный mono */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, paddingTop: 12, marginTop: 4, borderTop: "2px solid var(--text)" }}>
                <span style={{ fontWeight: 800, fontFamily: "var(--font-display)", fontSize: "var(--fs-15)" }}>{mode === "work" ? "Итого для клиента" : "Итого"}</span>
                <span id="rs-total-val" className="mono rs-val" style={{ fontWeight: 600, fontSize: "var(--fs-24)", letterSpacing: "-0.01em" }} aria-live="off">{fmtMoney(totalClient)}</span>
              </div>
            </div>}
          </section>

          {/* проверка норм: эргономика по помещениям с планом расстановки из РД */}
          {ergo.length > 0 && (
            <section className="pd-section" style={{ borderBottom: "none" }}>
              <div className="eyebrow jade" style={{ marginBottom: 14 }}>Проверка норм · движок эргономики</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <h3 className="pd-h" style={{ marginBottom: 0 }}>Эргономика по помещениям</h3>
                <span className="glass" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 99, fontSize: "var(--fs-12)", fontWeight: 700,
                  color: ergoWarns === 0 ? "var(--accent-2-ink)" : "var(--accent-ink)", borderColor: ergoWarns === 0 ? "rgba(94,107,91,.4)" : "rgba(183,80,44,.4)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: ergoWarns === 0 ? "var(--accent-2)" : "var(--accent)", flex: "none" }} />
                  {ergoWarns === 0 ? "Все нормы соблюдены" : ergoWarns + " " + plural(ergoWarns, ["замечание", "замечания", "замечаний"])}
                </span>
              </div>
              <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", marginTop: 8, marginBottom: 4, maxWidth: 820, lineHeight: 1.6 }}>
                Движок проверил проходы, дистанции и плотность по плану расстановки из дизайн-проекта — детерминированно, по тем же нормам, что и подбор (правки из «Моих норм» учтены).
              </p>
              {ergo.map((e) => (
                <div key={e.name} style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 9 }}>
                    <span style={{ fontWeight: 800, fontFamily: "var(--font-display)", fontSize: "var(--fs-15)" }}>{e.name}</span>
                    <span className="mono" style={{ fontSize: "var(--fs-11)", color: e.res.warns ? "var(--accent-ink)" : "var(--accent-2-ink)" }}>
                      {e.res.warns ? e.res.warns + " " + plural(e.res.warns, ["замечание", "замечания", "замечаний"]) : "в норме"}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {/* замечания первыми — иерархия критичности (терракотовое ребро), «в норме» подчинённо */}
                    {[...e.res.findings].sort((a, b) => (a.kind === "warn" ? 0 : 1) - (b.kind === "warn" ? 0 : 1)).map((f, i) => {
                      const Ico = FIND_ICON[f.kind] || FIND_ICON.idea;
                      return (
                        <div key={i} className={"find " + f.kind}>
                          <span className="fi"><Ico size={15} /></span>
                          <span style={{ fontSize: "var(--fs-14)", lineHeight: 1.5, color: "var(--text)" }}>{f.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {ergoSkipped > 0 && (
                <div style={{ marginTop: 14, fontSize: "var(--fs-12)", color: "var(--muted)", maxWidth: 820, lineHeight: 1.55 }}>
                  Ещё {ergoSkipped} {plural(ergoSkipped, ["помещение", "помещения", "помещений"])} без плана расстановки (мокрые зоны, хранение) — движок проверяет комнаты, где в проекте есть геометрия. Проверяются крупные напольные предметы с плана; примыкающие вплотную и настенные позиции — вне геометрической проверки.
                </div>
              )}
            </section>
          )}

          {/* итог (sticky) */}
          <div className="pd-cart">
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              {/* без aria-live: сумму при драге озвучивает aria-valuetext слайдера; live — только статус бюджета */}
              {/* статус — с суммой бюджета: на ≤560px чип шапки скрыт, и это единственная цифра бюджета */}
              <SmetaTotal amount={mode === "procure" ? grand : totalClient}
                caption={<React.Fragment>{mode === "procure" ? "итого закупка" : "итого клиенту"} · {itemsCount} {plural(itemsCount, ["позиция", "позиции", "позиций"])} · <span role="status" aria-atomic="true">{over ? <span style={{ color: "var(--accent-ink)" }}>закупка сверх бюджета {fmtMoney(data.budget)}</span> : <span style={{ color: "var(--accent-2)" }}>закупка в бюджете {fmtMoney(data.budget)}</span>}</span></React.Fragment>} />
              {mode === "work" && (
                <span className="glass mono" style={{ padding: "7px 12px", borderRadius: 99, fontSize: "var(--fs-12)", fontWeight: 500, color: "var(--muted)" }}>
                  {/* маржа после скидки: убыток — терракотой, не оливой-успехом */}
                  себестоимость {fmtMoney(grand)} · наценка {ovrCount > 0 ? "≈ +" + effPct + "%" : "+" + markup + "%"}{discountAmt > 0 && " − скидка " + discount + "%"} = <b style={{ color: client - discountAmt - grand < 0 ? "var(--accent-ink)" : "var(--accent-2)", fontWeight: 600 }}>{fmtMoney(client - discountAmt - grand)}</b>
                </span>
              )}
              <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <SegTabs className="spec-mode" cap="Выгрузка" ariaLabel="Режим выгрузки" value={mode} onChange={setMode}
                  items={[
                    { id: "work", label: "Рабочая", title: "Рабочая смета: себестоимость, наценка и цена клиента" },
                    { id: "client", label: "Для клиента", title: "Для клиента: только итоговая цена, без себестоимости и наценки" },
                    { id: "procure", label: "Закупка", title: "Закупочный лист: только себестоимость, группировка по поставщикам, в Excel — лист на поставщика" },
                  ]} />
                <button className="btn btn-ghost" style={{ padding: "11px 16px" }} onClick={exportXLSX}><I.grid size={16} />Выгрузить Excel</button>
                <button className="btn btn-ghost" style={{ padding: "11px 16px" }} onClick={exportPDF}><I.layers size={16} />Выгрузить PDF</button>
                <button className="btn btn-primary" style={{ padding: "11px 18px" }} onClick={saveRoom} disabled={roomSaving}>{roomSaved ? <React.Fragment><I.check size={16} />Сохранено</React.Fragment> : <React.Fragment><I.check size={16} />Сохранить смету</React.Fragment>}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {addOpen && <AddPositionsModal excludeId={savedId} roomNames={rooms.map((r) => r.name)} onClose={() => setAddOpen(false)} onAdd={addFrom} />}
      {versionsOpen && (
        <VersionsModal versions={versions} current={{ project: data.name, studioName: (settings && settings.studioName) || (me && me.name) || "", rooms, grand, totalClient, itemsCount }}
          onSave={saveVersion} onRestore={restoreVersion} onSetStatus={setVersionStatus}
          onPatch={patchVersion} onRemove={removeVersion} onShare={shareVersion} onClose={() => setVersionsOpen(false)} />
      )}
      {shareModal && <ShareLinkModal share={shareModal} onClose={() => setShareModal(null)} />}
      {pickerRoom != null && rooms[pickerRoom] && (
        <LibraryPickerModal roomName={rooms[pickerRoom].name} onClose={() => setPickerRoom(null)}
          onAdd={(products) => addLibToRoom(pickerRoom, products)} />
      )}
    </div>
  );
}

/* ---------------- ВЕРСИИ + СОГЛАСОВАНИЕ (фаза 2 слияния, шаг 3) ----------------
   История снимков сметы: сохранить текущую, восстановить, сравнить с текущей
   (Δ итога клиенту, +добавлено/−удалено/~изменено), статус согласования с датой
   и комментарий клиента. Фундамент клиентского портала (роадмап #9).
   Позиции без id — диф по ключу «комната + название» с агрегацией дублей. */
function VersionsModal({ versions, current, onSave, onRestore, onSetStatus, onPatch, onRemove, onShare, onClose }) {
  const FFE = window.AIVibeFFE;
  const [label, setLabel] = usePD("");
  const [compareId, setCompareId] = usePD(null);
  const [cmtOpenId, setCmtOpenId] = usePD(null);   // id версии, у которой раскрыты комментарии-треды
  const [cmtTick, setCmtTick] = usePD(0);          // бампается после ответа студии — форсирует перечитать shareId из хранилища
  const fmtDT = (iso) => (iso && iso.length >= 10 ? iso.slice(8, 10) + "." + iso.slice(5, 7) + "." + iso.slice(0, 4) : "");
  const commentsCount = (sh) => (sh && sh.snapshot && Array.isArray(sh.snapshot.rooms)
    ? sh.snapshot.rooms.reduce((s, r) => s + (r.items || []).reduce((x, it) => x + ((it.comments || []).length), 0), 0) : 0);

  // комната + название → {qty, себестоимость}; дубликаты строк складываются
  const agg = (rooms) => {
    const m = new Map();
    (rooms || []).forEach((r) => (r.items || []).forEach((it) => {
      const k = r.name + "¶" + it.title;
      const e = m.get(k) || { title: it.title, qty: 0, total: 0 };
      e.qty += it.qty || 1; e.total += (it.price || 0) * (it.qty || 1);
      m.set(k, e);
    }));
    return m;
  };
  const diff = (v) => {
    const a = agg(v.snapshot && v.snapshot.rooms), b = agg(current.rooms);
    return {
      added: [...b.entries()].filter(([k]) => !a.has(k)).map(([, x]) => x),
      removed: [...a.entries()].filter(([k]) => !b.has(k)).map(([, x]) => x),
      changed: [...b.entries()].filter(([k, x]) => a.has(k) && (a.get(k).total !== x.total || a.get(k).qty !== x.qty)).map(([, x]) => x),
      dTotal: current.totalClient - (v.clientTotal || 0),
    };
  };

  const submit = (e) => { e.preventDefault(); onSave(label); setLabel(""); };

  return (
    <Modal onClose={onClose} label="Версии и согласование" maxWidth={680}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "20px 24px", borderBottom: "1px solid var(--hairline)" }}>
        <div>
          <h3 className="display" style={{ fontSize: "var(--fs-21)" }}>Версии и согласование</h3>
          <div style={{ fontSize: "var(--fs-13)", color: "var(--muted)", marginTop: 3 }}>Снимки сметы и статус согласования с клиентом</div>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Закрыть"><I.close size={18} /></button>
      </div>

      <div style={{ padding: "16px 24px 20px", display: "flex", flexDirection: "column", gap: 12, maxHeight: "62vh", overflow: "auto" }}>
        {/* сохранить текущую смету как версию */}
        <form onSubmit={submit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input className="fld" style={{ flex: "1 1 240px" }} value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder="Название версии — например «Клиенту, вариант 1»" aria-label="Название версии" />
          <button type="submit" className="btn btn-primary" style={{ padding: "10px 16px", whiteSpace: "nowrap", flex: "none" }}><I.plus size={15} />Сохранить версию</button>
        </form>
        <div style={{ fontSize: "var(--fs-12)", color: "var(--muted)", marginTop: -4 }}>
          Сейчас: себестоимость <b className="mono" style={{ color: "var(--text)", fontWeight: 600 }}>{fmtMoney(current.grand)}</b> · итог клиенту <b className="mono" style={{ color: "var(--accent-2-ink)", fontWeight: 600 }}>{fmtMoney(current.totalClient)}</b> · {current.itemsCount} {plural(current.itemsCount, ["позиция", "позиции", "позиций"])}. Снимок включает позиции, наценки, скидку и доставку/монтаж.
        </div>

        {!versions.length && (
          <div style={{ padding: "22px 8px", textAlign: "center", color: "var(--muted)", fontSize: "var(--fs-14)", lineHeight: 1.6 }}>
            Пока нет сохранённых версий.<br />Сохраните снимок перед отправкой клиенту — и отмечайте статус согласования по ответу.
          </div>
        )}

        {versions.map((v) => {
          const sm = FFE.vStatusMeta(v.status);
          const d = compareId === v.id ? diff(v) : null;
          // ответ клиента через портал (волна A2): читаем шару версии
          const sh = v.shareId && FFE.loadPortalShare ? FFE.loadPortalShare(v.shareId) : null;
          const shOk = sh && sh.snapshot ? (sh.snapshot.rooms || []).reduce((s, r) => s + (r.items || []).filter((it) => it.approve === "ok").length, 0) : 0;
          const cmCount = commentsCount(sh);
          return (
            <div key={v.id} className="glass" style={{ borderRadius: "var(--r-lg)", padding: "13px 15px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: "var(--fs-14)", flex: 1, minWidth: 140 }}>{v.label}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--fs-11)", fontWeight: 700, color: sm.ink || sm.color, padding: "3px 10px", borderRadius: 99, background: "var(--glass-2)", border: "1px solid var(--hairline)", whiteSpace: "nowrap" }}>
                  <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: sm.color, flex: "none" }} />{sm.label}{v.statusAt ? " · " + fmtDT(v.statusAt) : ""}
                </span>
              </div>
              <div className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--spec-meta)", margin: "7px 0 10px" }}>
                {fmtDT(v.createdAt)} · себест. {fmtMoney(v.total)} · клиенту {fmtMoney(v.clientTotal)} · {v.positions} поз.
                {sh && sh.respondedAt ? <span style={{ color: "var(--accent-2-ink)", fontWeight: 700 }}>{" · клиент ответил" + (shOk ? " · " + shOk + " ✓" : "")}</span> : ""}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <select className="fld" value={v.status} onChange={(e) => onSetStatus(v.id, e.target.value)} aria-label={"Статус согласования версии «" + v.label + "»"}
                  style={{ width: "auto", padding: "7px 9px", fontSize: "var(--fs-12)", fontWeight: 600 }}>
                  {FFE.VERSION_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <button className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: "var(--fs-12)" }} onClick={() => onRestore(v)} title="Загрузить эту версию в рабочую смету">Восстановить</button>
                <button className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: "var(--fs-12)" }} onClick={() => setCompareId(compareId === v.id ? null : v.id)} aria-expanded={compareId === v.id}>
                  {compareId === v.id ? "Скрыть сравнение" : "Сравнить с текущей"}
                </button>
                <button className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: "var(--fs-12)", ...(v.shareId ? { color: "var(--accent-2-ink)" } : {}) }} onClick={() => onShare(v)}
                  title={v.shareId ? "Показать ссылку для клиента" : "Создать ссылку для клиента"}>
                  <I.send size={14} />{v.shareId ? "Ссылка ✓" : "Ссылка клиенту"}
                </button>
                {v.shareId && (
                  <button className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: "var(--fs-12)", ...(cmCount > 0 ? { color: "var(--info)" } : {}) }}
                    onClick={() => setCmtOpenId(cmtOpenId === v.id ? null : v.id)} aria-expanded={cmtOpenId === v.id}
                    title="Комментарии клиента к позициям и ответы студии">
                    <I.chat size={14} />{cmtOpenId === v.id ? "Скрыть комментарии" : "Комментарии" + (cmCount ? " · " + cmCount : "")}
                  </button>
                )}
                <button className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: "var(--fs-12)" }}
                  onClick={() => withLib("pdf", () => AIVibePDF.exportApprovalProtocol({
                    project: current.project, versionLabel: v.label, createdAt: v.createdAt,
                    vStatusLabel: sm.label, statusAt: v.statusAt, respondedAt: sh && sh.respondedAt,
                    studioName: (sh && sh.studioName) || current.studioName,
                    snapshot: sh ? sh.snapshot : v.snapshot,
                  }))}
                  title="Скачать протокол согласования: решения клиента по позициям, переписка и таймстампы">
                  <I.news size={14} />Протокол PDF
                </button>
                <button className="icon-btn xs" onClick={() => onRemove(v)} title="Удалить версию" aria-label={"Удалить версию «" + v.label + "»"}
                  style={{ marginLeft: "auto", color: "var(--spec-meta)" }}><I.trash size={15} /></button>
              </div>
              {cmtOpenId === v.id && sh && (
                <PortalCommentsThreads sh={sh} onReply={(ri, ii, text) => { FFE.addPortalComment(v.shareId, ri, ii, "studio", text); setCmtTick((t) => t + 1); }} />
              )}
              {d && (
                <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: "var(--glass-2)", border: "1px solid var(--hairline)", fontSize: "var(--fs-12)", lineHeight: 1.55 }}>
                  <div style={{ marginBottom: 6 }}>
                    Текущая смета против этой версии: итог клиенту{" "}
                    <b className="mono" style={{ fontWeight: 600, color: d.dTotal > 0 ? "var(--accent-ink)" : d.dTotal < 0 ? "var(--accent-2-ink)" : "var(--text)" }}>
                      {d.dTotal === 0 ? "без изменений" : (d.dTotal > 0 ? "+" : "−") + fmtMoney(Math.abs(d.dTotal))}
                    </b>
                  </div>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                    <span style={{ color: "var(--accent-2-ink)" }}>+{d.added.length} добавлено</span>
                    <span style={{ color: "var(--accent-ink)" }}>−{d.removed.length} удалено</span>
                    <span style={{ color: "var(--muted)" }}>~{d.changed.length} изменено</span>
                  </div>
                  {(d.added.length + d.removed.length + d.changed.length) > 0 && (
                    <div style={{ marginTop: 7, color: "var(--spec-meta)" }}>
                      {d.added.slice(0, 3).map((x) => "＋ " + x.title)
                        .concat(d.removed.slice(0, 3).map((x) => "－ " + x.title), d.changed.slice(0, 3).map((x) => "≈ " + x.title))
                        .join(" · ")}
                    </div>
                  )}
                </div>
              )}
              <input className="fld" style={{ marginTop: 10, fontSize: "var(--fs-12)" }} value={v.note || ""} onChange={(e) => onPatch(v.id, { note: e.target.value })}
                placeholder="Комментарий клиента / замечания…" aria-label={"Комментарий к версии «" + v.label + "»"} />
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

/* ---------------- КОММЕНТАРИИ-ТРЕДЫ (волна A3) ----------------
   Клиент пишет через портал (`ClientPortal`); здесь дизайнер видит переписку по
   снимку версии и отвечает — читают/пишут ОДИН и тот же объект (портал-шара),
   поэтому не нужно сверять идентичность позиций между живой сметой и снимком.
   Показываем только позиции, где уже есть хотя бы один комментарий, —
   пустая переписка не начинается из кабинета (v1: инициатива — у клиента). */
function PortalCommentsThreads({ sh, onReply }) {
  const rooms = (sh.snapshot && sh.snapshot.rooms) || [];
  const groups = [];
  rooms.forEach((r, ri) => (r.items || []).forEach((it, ii) => {
    if ((it.comments || []).length) groups.push({ ri, ii, room: r.name || "Помещение", title: it.title, comments: it.comments });
  }));
  if (!groups.length) {
    return (
      <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: "var(--glass-2)", border: "1px solid var(--hairline)", fontSize: "var(--fs-12)", color: "var(--muted)" }}>
        Клиент пока не оставил комментариев к позициям.
      </div>
    );
  }
  return (
    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
      {groups.map((g) => (
        <CommentThreadCard key={g.ri + "_" + g.ii} group={g} onReply={(text) => onReply(g.ri, g.ii, text)} />
      ))}
    </div>
  );
}

function CommentThreadCard({ group, onReply }) {
  const [draft, setDraft] = usePD("");
  const send = (e) => {
    e.preventDefault();
    const t = draft.trim();
    if (!t) return;
    onReply(t);
    setDraft("");
  };
  return (
    <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--glass-2)", border: "1px solid var(--hairline)" }}>
      <div style={{ fontSize: "var(--fs-12)", fontWeight: 700, marginBottom: 6, color: "var(--spec-meta)" }}>{group.room} · {group.title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
        {group.comments.map((c) => (
          <CommentBubble key={c.id} comment={c} isMine={c.author !== "client"} authorLabel={c.author === "client" ? "Клиент" : "Вы"} theirBg="var(--glass)" />
        ))}
      </div>
      <form onSubmit={send} style={{ display: "flex", gap: 6 }}>
        <input className="fld" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ответить клиенту…"
          aria-label={"Ответить клиенту по позиции «" + group.title + "»"} style={{ fontSize: "var(--fs-12)", padding: "6px 9px", flex: 1 }} />
        <button type="submit" className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: "var(--fs-12)", flex: "none" }} disabled={!draft.trim()}>Ответить</button>
      </form>
    </div>
  );
}

/* ---------------- КАРТОЧКА-РЕДАКТОР ПОЗИЦИИ (фаза 2 слияния, шаг 1) ----------------
   Название/раздел/кол-во/цена/поставщик + удаление. Меняет только данные —
   деньги нормализуются до целых рублей, расчёты идут прежним конвейером
   (инвариант UI=PDF=Excel не трогаем). Enter — сохранить, Esc — закрыть
   редактор (не оверлей: stopPropagation до window-слушателя). */
function PosEditor({ item, cats, sups, isNew, onSave, onDelete, onCancel, library, onToLibrary }) {
  const [d, setD] = usePD({
    title: item ? item.title : "",
    cat: (item && item.cat) || "",
    qty: String((item && item.qty) || 1),
    price: item ? String(item.price) : "",
    sup: (item && item.sup) || "",
  });
  // кламп 1–999: реальный fat-finger из проверки — 350 000 «штук» гарнитура
  const qty = Math.max(1, Math.min(999, Math.round(+d.qty || 1)));
  const price = Math.round(+d.price || 0);
  const ok = !!d.title.trim() && price > 0;
  const draft = () => ({ title: d.title.trim(), qty, price, cat: d.cat.trim(), sup: d.sup.trim() });
  const submit = () => { if (ok) onSave(draft()); };
  // библиотека товаров студии (волна B1): подсказки по названию + подстановка цены/раздела/поставщика
  const lib = library || [];
  const libMatch = d.title.trim() ? lib.find((p) => (p.title || "").trim().toLowerCase() === d.title.trim().toLowerCase()) : null;
  const applyLib = (p, force) => setD((x) => ({
    ...x,
    price: force || !x.price ? String(p.price || 0) : x.price,
    cat:   force || !x.cat ? (p.cat || "") : x.cat,
    sup:   force || !x.sup ? (p.sup || "") : x.sup,
  }));
  // при вводе названия новой позиции — тихо подставить пустые поля из точного совпадения (не затирая введённое)
  const onTitle = (v) => {
    setD((x) => ({ ...x, title: v }));
    if (isNew && !d.price) { const m = lib.find((p) => (p.title || "").trim().toLowerCase() === v.trim().toLowerCase()); if (m) applyLib(m, false); }
  };
  const fld = { width: "100%", padding: "8px 10px", borderRadius: 9, border: "1px solid var(--hairline)", background: "var(--surface)", fontSize: "var(--fs-13)", color: "var(--text)", marginTop: 3 };
  const lab = { fontSize: "var(--fs-11)", color: "var(--muted)", display: "block", minWidth: 0 };
  return (
    <div className="view-enter" style={{ margin: "6px 0 8px", padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(94,107,91,.45)", background: "rgba(94,107,91,.06)", display: "flex", flexDirection: "column", gap: 10 }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target.tagName === "INPUT") { e.preventDefault(); submit(); }
        if (e.key === "Escape") { e.stopPropagation(); onCancel(); }
      }}>
      <label style={lab}>Название
        <input style={fld} value={d.title} autoFocus list="pe-lib-list" onChange={(e) => onTitle(e.target.value)} />
      </label>
      {libMatch && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--fs-12)", color: "var(--muted)", marginTop: -4 }}>
          <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent-2)", flex: "none" }} />
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            В библиотеке: {fmtMoney(libMatch.price || 0)}{libMatch.cat ? " · " + libMatch.cat : ""}{libMatch.sup ? " · " + libMatch.sup : ""}
          </span>
          <button type="button" className="btn btn-ghost" style={{ padding: "3px 9px", fontSize: "var(--fs-11)", flex: "none" }} onClick={() => applyLib(libMatch, true)}>Подставить</button>
        </div>
      )}
      <div className="pe-grid" style={{ display: "grid", gridTemplateColumns: "1fr 76px 116px 1fr", gap: 10 }}>
        <label style={lab}>Раздел
          <input style={fld} list="pe-cat-list" value={d.cat} placeholder="Прочее" onChange={(e) => setD((x) => ({ ...x, cat: e.target.value }))} />
        </label>
        <label style={lab}>Кол-во
          <input style={{ ...fld, fontFamily: "var(--font-mono)" }} type="number" min="1" max="999" step="1" inputMode="numeric" value={d.qty} onChange={(e) => setD((x) => ({ ...x, qty: e.target.value }))} />
        </label>
        <label style={lab}>Цена/шт, ₽
          <input style={{ ...fld, fontFamily: "var(--font-mono)" }} type="number" min="1" step="100" inputMode="numeric" value={d.price} onChange={(e) => setD((x) => ({ ...x, price: e.target.value }))} />
        </label>
        <label style={lab}>Поставщик
          <input style={fld} list="pe-sup-list" value={d.sup} placeholder="точка закупки" onChange={(e) => setD((x) => ({ ...x, sup: e.target.value }))} />
        </label>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn btn-primary" style={{ padding: "8px 14px", fontSize: "var(--fs-13)" }} disabled={!ok} onClick={submit}><I.check size={14} />{isNew ? "Добавить" : "Готово"}</button>
        <button className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: "var(--fs-13)" }} onClick={onCancel}>Отмена</button>
        {onToLibrary && (libMatch
          ? <button className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: "var(--fs-13)", color: "var(--accent-2-ink)" }} disabled title="Этот товар уже есть в библиотеке студии"><I.check size={14} />В библиотеке</button>
          : <button className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: "var(--fs-13)" }} disabled={!ok} title="Сохранить как мастер-запись в библиотеку студии" onClick={() => onToLibrary(draft())}><I.layers size={14} />В библиотеку</button>)}
        {!isNew && <button className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: "var(--fs-13)", color: "var(--accent-ink)", marginLeft: "auto" }} onClick={onDelete}>Удалить позицию</button>}
      </div>
      {/* редактор открыт один за раз — id datalist'ов не коллидируют */}
      <datalist id="pe-cat-list">{cats.map((c) => <option key={c} value={c} />)}</datalist>
      <datalist id="pe-sup-list">{sups.map((s) => <option key={s} value={s} />)}</datalist>
      <datalist id="pe-lib-list">{lib.map((p) => <option key={p.id} value={p.title} />)}</datalist>
    </div>
  );
}

/* ---------------- «ИЗ ПРОШЛОГО ПРОЕКТА / ШАБЛОНА / ПО ССЫЛКЕ» ----------------
   Роадмап #10: копирование позиций/комнат из прошлых смет (цены получают
   пометку давности — priceDate = дата обновления проекта-источника) и вставка
   типовых комплектаций. Двухшаговый выбор: источник → чекбоксы.
   Роадмап #1 (фаза 1 слияния): вкладка «По ссылке» — клиппер URL/HTML →
   позиция сметы через window.AIVibeClipper (перенос с vite-ветки); при
   CORS-блоке честный фолбэк «вставьте HTML страницы вручную». */
function AddPositionsModal({ excludeId, roomNames, onClose, onAdd }) {
  const [tab, setTab] = usePD("past");        // past | tpl | clip
  const [sources, setSources] = usePD(null);  // прошлые проекты со сметой по комнатам
  const [tpls, setTpls] = usePD(null);        // типовые комплектации
  const [src, setSrc] = usePD(null);          // выбранный источник {label, stamp?, note?, rooms}
  const [sel, setSel] = usePD({});            // {"ri:ii": true}
  /* --- состояние вкладки «По ссылке» --- */
  const [clipUrl, setClipUrl] = usePD("");
  const [clipBusy, setClipBusy] = usePD(false);
  const [clipErr, setClipErr] = usePD("");
  const [clipHtmlMode, setClipHtmlMode] = usePD(false); // CORS-блок → ручная вставка HTML
  const [clipHtml, setClipHtml] = usePD("");
  const [clipForm, setClipForm] = usePD(null);          // {title, price, qty, sup, room, note}

  usePDE(() => {
    // источники: только проекты со сметой по комнатам (каталожные демо-проекты отпадают)
    AIVibeAPI.projects.list()
      .then((list) => Promise.all(list.filter((p) => p.id !== excludeId).map((p) =>
        AIVibeAPI.projects.get(p.id).then((d) => (d && d.rooms && d.rooms.length
          ? { id: p.id, label: p.name, stamp: p.updated, rooms: d.rooms }
          : null)))))
      .then((xs) => setSources(xs.filter(Boolean)));
    AIVibeAPI.templates.list().then(setTpls);
  }, []);

  const cost = (items) => items.reduce((s, it) => s + it.price * (it.qty || 1), 0);
  const srcCount = (rooms) => rooms.reduce((s, r) => s + r.items.length, 0);
  const k = (ri, ii) => ri + ":" + ii;
  const pickSrc = (s, allSelected) => {
    setSrc(s);
    const n = {};
    if (allSelected) s.rooms.forEach((r, ri) => r.items.forEach((_, ii) => { n[k(ri, ii)] = true; }));
    setSel(n);
  };
  const roomAll = (ri) => src.rooms[ri].items.every((_, ii) => sel[k(ri, ii)]);
  const toggleRoom = (ri) => { const on = !roomAll(ri); setSel((s) => { const n = { ...s }; src.rooms[ri].items.forEach((_, ii) => { n[k(ri, ii)] = on; }); return n; }); };
  const chosen = src ? src.rooms.map((r, ri) => ({
    name: r.name, area: r.area,
    items: r.items.filter((_, ii) => sel[k(ri, ii)]).map((it) => {
      // копируем только данные позиции (без геометрии комнаты); давность цены:
      // своя пометка позиции сохраняется, иначе — дата проекта-источника
      const { title, qty, price, cat, sup, priceDate } = it;
      const pd = priceDate || src.stamp;
      return { title, qty: qty || 1, price, ...(cat ? { cat } : {}), ...(sup ? { sup } : {}), ...(pd ? { priceDate: pd } : {}) };
    }),
  })).filter((e) => e.items.length) : [];
  const nSel = chosen.reduce((s, e) => s + e.items.length, 0);
  const sumSel = chosen.reduce((s, e) => s + cost(e.items), 0);

  const switchTab = (t) => { setTab(t); setSrc(null); setSel({}); setClipErr(""); setClipForm(null); setClipHtmlMode(false); };
  const rowBtn = { display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, border: "1px solid var(--hairline)", background: "var(--surface)", textAlign: "left" };

  /* --- клиппер: извлечение и форма-превью --- */
  const clipPrefill = (extracted, via) => {
    const f = (extracted && extracted.fields) || {};
    const conf = (extracted && extracted.confidence) || {};
    setClipForm({
      title: f.title || "",
      price: f.price != null ? String(Math.round(f.price)) : "",
      qty: "1",
      sup: f.supplier || "",
      room: (roomNames && roomNames[0]) || "Гостиная",
      // низкая уверенность или отсутствие цены → предупреждение в форме
      warnPrice: f.price == null || (conf.price != null && conf.price < 0.7),
      via: via || "",
    });
    setClipErr("");
  };
  const doClip = async () => {
    const u = clipUrl.trim();
    if (!u || clipBusy) return;
    setClipBusy(true); setClipErr(""); setClipForm(null);
    try {
      const r = await window.AIVibeClipper.clip(u);
      if (r.ok) clipPrefill(r.extracted, r.via);
      else if (r.blocked) { setClipHtmlMode(true); setClipErr("Магазин не отдаёт страницу напрямую (защита/CORS). Откройте товар в соседней вкладке, скопируйте HTML (Ctrl+U → выделить всё) и вставьте ниже."); }
      else setClipErr(r.error || "Не удалось разобрать страницу.");
    } finally { setClipBusy(false); }
  };
  const doParseHtml = () => {
    const h = clipHtml.trim();
    if (!h) return;
    const ex = window.AIVibeClipper.extractFromHtml(h, clipUrl.trim());
    if (!ex.fields.title && ex.fields.price == null) setClipErr("В этом HTML не нашлось данных товара — проверьте, что скопирована страница целиком.");
    else clipPrefill(ex, "html");
  };
  const clipPrice = clipForm ? Math.round(+clipForm.price || 0) : 0;
  const clipQty = clipForm ? Math.max(1, Math.round(+clipForm.qty || 1)) : 1;
  const clipOk = clipForm && clipForm.title.trim() && clipPrice > 0 && clipForm.room.trim();
  const clipAdd = () => {
    if (!clipOk) return;
    const item = {
      title: clipForm.title.trim(), qty: clipQty, price: clipPrice,
      ...(clipForm.sup.trim() ? { sup: clipForm.sup.trim() } : {}),
      priceDate: new Date().toISOString().slice(0, 10), // цена свежая — извлечена сейчас
    };
    onAdd([{ name: clipForm.room.trim(), items: [item] }], "по ссылке");
  };
  const clipField = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--hairline)", background: "var(--surface)", fontSize: "var(--fs-14)", color: "var(--text)" };

  return (
    <Modal onClose={onClose} label="Добавить позиции в смету" maxWidth={620}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "20px 24px", borderBottom: "1px solid var(--hairline)", flexWrap: "wrap" }}>
        <div>
          <h3 className="display" style={{ fontSize: "var(--fs-21)" }}>Добавить позиции</h3>
          <div style={{ fontSize: "var(--fs-13)", color: "var(--muted)", marginTop: 3 }}>Из прошлого проекта или типовой комплектации</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SegTabs className="spec-mode" ariaLabel="Источник позиций" value={tab} onChange={switchTab}
            items={[{ id: "past", label: "Из проекта" }, { id: "tpl", label: "Из шаблона" }, { id: "clip", label: "По ссылке" }]} />
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть"><I.close size={18} /></button>
        </div>
      </div>

      {/* шаг 1 — выбор источника */}
      {!src && (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, maxHeight: "54vh", overflow: "auto" }}>
          {tab === "past" && !sources && Array.from({ length: 2 }).map((_, i) => <div key={i} className="skel" style={{ height: 62, borderRadius: 12 }} />)}
          {tab === "past" && sources && sources.length === 0 && (
            <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--muted)", fontSize: "var(--fs-14)", lineHeight: 1.55 }}>
              Пока нет прошлых проектов со сметой по комнатам.<br />Сохраните смету — и её позиции можно будет переиспользовать здесь.
            </div>
          )}
          {tab === "past" && sources && sources.map((s) => (
            <button key={s.id} onClick={() => pickSrc(s, false)} style={rowBtn}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--hairline)")}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "var(--fs-14)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</div>
                <div style={{ fontSize: "var(--fs-12)", color: "var(--muted)", marginTop: 2 }}>
                  {srcCount(s.rooms)} {plural(srcCount(s.rooms), ["позиция", "позиции", "позиций"])} · себестоимость {fmtMoney(s.rooms.reduce((a, r) => a + cost(r.items), 0))} · цены от {fmtDateRu(s.stamp)}
                </div>
              </div>
              <I.arrow size={16} style={{ color: "var(--faint)", flex: "none" }} />
            </button>
          ))}
          {tab === "tpl" && !tpls && Array.from({ length: 3 }).map((_, i) => <div key={i} className="skel" style={{ height: 62, borderRadius: 12 }} />)}
          {tab === "tpl" && tpls && tpls.map((t) => (
            <button key={t.id} onClick={() => pickSrc({ label: t.name, rooms: [{ name: t.room, items: t.items }] }, true)} style={rowBtn}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--hairline)")}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "var(--fs-14)" }}>{t.name}</div>
                <div style={{ fontSize: "var(--fs-12)", color: "var(--muted)", marginTop: 2, lineHeight: 1.4 }}>{t.note}</div>
                <div className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--spec-meta)", marginTop: 4 }}>{t.items.length} {plural(t.items.length, ["позиция", "позиции", "позиций"])} · ≈ {fmtMoney(cost(t.items))}</div>
              </div>
              <I.arrow size={16} style={{ color: "var(--faint)", flex: "none" }} />
            </button>
          ))}
          {tab === "tpl" && (
            <div style={{ padding: "6px 4px 0", fontSize: "var(--fs-12)", color: "var(--muted)", lineHeight: 1.5 }}>
              Цены в шаблонах — рыночный ориентир (средний сегмент), поставщики — типовые точки закупки. Всё редактируется после вставки.
            </div>
          )}

          {/* «По ссылке» — клиппер: URL → извлечение → форма-превью → позиция */}
          {tab === "clip" && (
            <div style={{ padding: "4px 8px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...clipField, flex: 1 }} type="url" placeholder="https://ссылка-на-товар в магазине или у фабрики"
                  value={clipUrl} onChange={(e) => setClipUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") doClip(); }} aria-label="Ссылка на товар" />
                <button className="btn btn-primary" style={{ padding: "10px 16px", flex: "none" }} disabled={!clipUrl.trim() || clipBusy} onClick={doClip}>
                  {clipBusy ? <span className="spin" style={{ width: 15, height: 15 }} /> : <I.spark size={15} />}Извлечь
                </button>
              </div>
              {clipErr && <div className="find warn" style={{ fontSize: "var(--fs-13)", lineHeight: 1.5 }}><span className="fi"><I.info size={14} /></span><span>{clipErr}</span></div>}
              {clipHtmlMode && !clipForm && (
                <React.Fragment>
                  <textarea style={{ ...clipField, minHeight: 110, resize: "vertical", fontFamily: "var(--font-mono)", fontSize: "var(--fs-12)" }}
                    placeholder="Вставьте сюда HTML страницы товара…" value={clipHtml} onChange={(e) => setClipHtml(e.target.value)} aria-label="HTML страницы товара" />
                  <button className="btn btn-ghost" style={{ alignSelf: "flex-start", padding: "9px 14px" }} disabled={!clipHtml.trim()} onClick={doParseHtml}>Разобрать HTML</button>
                </React.Fragment>
              )}
              {clipForm && (
                <div style={{ border: "1px solid var(--hairline)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <label style={{ fontSize: "var(--fs-12)", color: "var(--muted)" }}>Название позиции
                    <input style={{ ...clipField, marginTop: 4 }} value={clipForm.title} onChange={(e) => setClipForm((f) => ({ ...f, title: e.target.value }))} />
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 1fr", gap: 10 }}>
                    <label style={{ fontSize: "var(--fs-12)", color: "var(--muted)" }}>Цена, ₽ (себестоимость)
                      <input style={{ ...clipField, marginTop: 4, fontFamily: "var(--font-mono)" }} type="number" min="1" value={clipForm.price} onChange={(e) => setClipForm((f) => ({ ...f, price: e.target.value }))} />
                    </label>
                    <label style={{ fontSize: "var(--fs-12)", color: "var(--muted)" }}>Кол-во
                      <input style={{ ...clipField, marginTop: 4, fontFamily: "var(--font-mono)" }} type="number" min="1" value={clipForm.qty} onChange={(e) => setClipForm((f) => ({ ...f, qty: e.target.value }))} />
                    </label>
                    <label style={{ fontSize: "var(--fs-12)", color: "var(--muted)" }}>Поставщик
                      <input style={{ ...clipField, marginTop: 4 }} value={clipForm.sup} onChange={(e) => setClipForm((f) => ({ ...f, sup: e.target.value }))} />
                    </label>
                  </div>
                  <label style={{ fontSize: "var(--fs-12)", color: "var(--muted)" }}>Комната
                    <input style={{ ...clipField, marginTop: 4 }} list="clip-rooms" value={clipForm.room} onChange={(e) => setClipForm((f) => ({ ...f, room: e.target.value }))} />
                    <datalist id="clip-rooms">{(roomNames || []).map((n) => <option key={n} value={n} />)}</datalist>
                  </label>
                  {clipForm.warnPrice && (
                    <div style={{ fontSize: "var(--fs-12)", color: "var(--accent-ink)", lineHeight: 1.45 }}>Цена не извлеклась или извлечена неуверенно — проверьте её по странице товара.</div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span className="mono" style={{ fontSize: "var(--fs-12)", color: clipOk ? "var(--text)" : "var(--faint)" }}>
                      {clipOk ? "+" + fmtMoney(clipPrice * clipQty) + " · цена от " + fmtDateRu(new Date().toISOString().slice(0, 10)) : "заполните название и цену"}
                    </span>
                    <button className="btn btn-primary" disabled={!clipOk} onClick={clipAdd}><I.plus size={16} />Добавить в смету</button>
                  </div>
                </div>
              )}
              <div style={{ fontSize: "var(--fs-12)", color: "var(--muted)", lineHeight: 1.5 }}>
                Клиппер читает структурированные данные страницы (JSON-LD, микроразметку, OpenGraph) и подставляет название, цену и поставщика. Извлечение автоматическое — проверьте значения перед добавлением.
              </div>
            </div>
          )}
        </div>
      )}

      {/* шаг 2 — чекбоксы по комнатам и позициям */}
      {src && (
        <React.Fragment>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 24px 0" }}>
            <button className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: "var(--fs-13)" }} onClick={() => { setSrc(null); setSel({}); }}>
              <I.arrow size={14} style={{ transform: "rotate(180deg)" }} />Назад
            </button>
            <span style={{ fontWeight: 700, fontSize: "var(--fs-14)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{src.label}</span>
            {src.stamp && <span className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--spec-meta)", whiteSpace: "nowrap" }}>цены от {fmtDateRu(src.stamp)}</span>}
          </div>
          <div style={{ padding: "12px 24px 4px", display: "flex", flexDirection: "column", gap: 12, maxHeight: "46vh", overflow: "auto" }}>
            {src.rooms.map((r, ri) => (
              <div key={ri} style={{ border: "1px solid var(--hairline)", borderRadius: 12, padding: "10px 14px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "2px 0 6px" }}>
                  <input type="checkbox" checked={roomAll(ri)} onChange={() => toggleRoom(ri)} style={{ accentColor: "var(--accent-2)", width: 15, height: 15, flex: "none" }} />
                  <span style={{ fontWeight: 700, fontSize: "var(--fs-14)", flex: 1 }}>{r.name}{r.area ? <span style={{ color: "var(--faint)", fontWeight: 500, fontSize: "var(--fs-12)" }}> · {r.area} м²</span> : null}</span>
                  <span className="mono" style={{ fontSize: "var(--fs-12)", color: "var(--spec-meta)", whiteSpace: "nowrap" }}>{fmtMoney(cost(r.items))}</span>
                </label>
                <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid var(--hairline-2)" }}>
                  {r.items.map((it, ii) => (
                    <label key={ii} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "6px 0", borderTop: ii ? "1px solid var(--hairline-2)" : "none", fontSize: "var(--fs-13)", cursor: "pointer" }}>
                      <input type="checkbox" checked={!!sel[k(ri, ii)]} onChange={() => setSel((s) => ({ ...s, [k(ri, ii)]: !s[k(ri, ii)] }))} style={{ accentColor: "var(--accent-2)", width: 14, height: 14, flex: "none", position: "relative", top: 2 }} />
                      <span style={{ flex: 1, lineHeight: 1.4 }}>{it.title}</span>
                      <span className="mono" style={{ color: "var(--spec-meta)", whiteSpace: "nowrap", fontSize: "var(--fs-12)" }}>×{it.qty || 1}</span>
                      <span className="mono" style={{ whiteSpace: "nowrap", fontSize: "var(--fs-12)" }}>{fmtMoney(it.price * (it.qty || 1))}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {src.stamp && (
              <div style={{ fontSize: "var(--fs-12)", color: "var(--muted)", lineHeight: 1.5 }}>
                Скопированные позиции получат пометку давности цены — от {fmtDateRu(src.stamp)}; старше 30 дней она подсвечивается терракотой.
              </div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "14px 24px 18px", borderTop: "1px solid var(--hairline)", marginTop: 10, flexWrap: "wrap" }}>
            <span className="mono" style={{ fontSize: "var(--fs-12)", color: nSel ? "var(--text)" : "var(--faint)" }}>
              {nSel ? nSel + " " + plural(nSel, ["позиция", "позиции", "позиций"]) + " · +" + fmtMoney(sumSel) : "позиции не выбраны"}
            </span>
            <button className="btn btn-primary" disabled={!nSel} onClick={() => onAdd(chosen, src.label)}>
              <I.plus size={16} />Добавить в смету
            </button>
          </div>
        </React.Fragment>
      )}
    </Modal>
  );
}

/* ---------------- ГЕРОЙ (обложка + активная палитра стиля) ---------------- */
function StyleHero({ data, style }) {
  return (
    <div style={{ position: "relative", height: 188, overflow: "hidden", borderBottom: "1px solid var(--hairline)" }}>
      <Img src={PHOTOS[data.cover] || PHOTOS.living} label={data.room} style={{ position: "absolute", inset: 0 }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(46,42,38,.92) 0%, rgba(46,42,38,.55) 55%, rgba(46,42,38,.2) 100%)" }} />
      <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 8, padding: "0 clamp(16px,3vw,40px)", maxWidth: 560, color: "#FCF6EE" }}>
        <span style={{ fontSize: "var(--fs-12)", fontWeight: 700, color: "rgba(252,246,238,.74)", letterSpacing: ".06em" }}>{data.analysis.scannedAt}</span>
        <div className="display" style={{ fontSize: "clamp(22px,3vw,30px)", letterSpacing: "-0.02em" }}>Стиль: {style.name}</div>
        <div style={{ color: "rgba(252,246,238,.8)", fontSize: "var(--fs-14)" }}>{style.mood}</div>
        <div style={{ display: "flex", gap: 7, marginTop: 4 }}>
          {style.palette.map((c, i) => <span key={i} title={c} style={{ width: 30, height: 30, borderRadius: 7, background: c, border: "1px solid rgba(255,255,255,.2)" }} />)}
        </div>
      </div>
    </div>
  );
}

/* ---------------- АНАЛИЗ ПОМЕЩЕНИЯ ---------------- */
function RoomAnalysis({ a, sref }) {
  return (
    <section className="pd-section" ref={sref}>
      <div className="eyebrow jade" style={{ marginBottom: 14 }}>Анализ помещения · по плану и габаритам</div>
      <h3 className="pd-h">Что Design Ledger увидел в комнате</h3>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(220px,300px) 1fr", gap: 22, alignItems: "start", marginTop: 18 }} className="pd-an-top">
        <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: 18 }}>
          <FloorPlan plan={a.plan} />
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
              {/* солнце = охра (терракота у нас — варнинг, высокая инсоляция — не «плохо») */}
              <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "var(--fs-13)", fontWeight: 700 }}><I.sun size={15} style={{ color: "var(--chart-ink)" }} />{a.light.label}</span>
              <span className="mono" style={{ fontWeight: 600, fontSize: "var(--fs-15)" }}>{a.light.score}<span style={{ fontSize: "var(--fs-11)", color: "var(--spec-meta)", fontWeight: 400 }}>/100</span></span>
            </div>
            <div className="light-meter"><i style={{ width: a.light.score + "%" }} /></div>
            <div style={{ fontSize: "var(--fs-12)", color: "var(--muted)", marginTop: 7 }}>{a.light.note}</div>
          </div>
        </div>

        <div className="metric-grid">
          {a.metrics.map((m) => (
            <div className="m" key={m.label}><div className="k">{m.label}</div><div className="v">{m.value}</div></div>
          ))}
        </div>
      </div>

      <p style={{ marginTop: 20, fontSize: "var(--fs-15)", lineHeight: 1.7, color: "var(--muted)", maxWidth: 880, textWrap: "pretty" }}>{a.summary}</p>

      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: "var(--fs-13)", fontWeight: 700, color: "var(--faint)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12 }}>Зонирование</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px,1fr))", gap: 12 }}>
          {a.zones.map((z) => (
            <div key={z.name} className="glass" style={{ borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontWeight: 700, fontSize: "var(--fs-14)" }}>{z.name}</span>
                <span style={{ fontSize: "var(--fs-12)", color: "var(--accent-2)", fontWeight: 700, whiteSpace: "nowrap" }}>{z.area}</span>
              </div>
              <div style={{ fontSize: "var(--fs-13)", color: "var(--muted)", marginTop: 5, lineHeight: 1.4 }}>{z.note}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 9 }}>
        <div style={{ fontSize: "var(--fs-13)", fontWeight: 700, color: "var(--spec-meta)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 3 }}>Выводы по помещению</div>
        {a.findings.map((f, i) => {
          const Ico = FIND_ICON[f.kind] || FIND_ICON.idea;
          return (
            <div key={i} className={"find " + f.kind}>
              <span className="fi"><Ico size={15} /></span>
              <span style={{ fontSize: "var(--fs-14)", lineHeight: 1.5, color: "var(--text)" }}>{f.text}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* мини-план — фрагмент рабочего чертежа (язык интерьерных тех-инфографик из рефов):
   тушь-стены, окна двойной линией остекления с откосами, дверная дуга открывания,
   выносные размерные линии с косыми засечками, миллиметровка вместо штриховки */
function FloorPlan({ plan }) {
  const RW = 200, RH = Math.round(RW / (plan.w / plan.l));
  const M = { l: 8, t: 22, r: 36, b: 30 };                    // поля: сверху солнце, справа/снизу размеры
  const W = RW + M.l + M.r, H = RH + M.t + M.b;
  const x0 = M.l, y0 = M.t, x1 = x0 + RW, y1 = y0 + RH;
  const fmtM = (v) => String(v).replace(".", ",") + " м";
  // окна равномерно по верхней (световой) стене
  const seg = RW / plan.windows;
  const wins = Array.from({ length: plan.windows }, (_, i) => {
    const len = Math.min(seg * 0.6, 62), cx = x0 + seg * (i + 0.5);
    return [cx - len / 2, cx + len / 2];
  });
  // дверь на нижней стене: проём + полотно + дуга (петля у ближнего угла)
  const dw = Math.max(28, RW * 0.16);
  const hingeLeft = plan.door === "low-left";
  const dx = hingeLeft ? x0 + RW * 0.10 : x1 - RW * 0.10 - dw;
  const hx = hingeLeft ? dx : dx + dw;
  const arc = hingeLeft
    ? `M ${dx + dw} ${y1} A ${dw} ${dw} 0 0 0 ${dx} ${y1 - dw}`
    : `M ${dx} ${y1} A ${dw} ${dw} 0 0 1 ${dx + dw} ${y1 - dw}`;
  const tick = (x, y, key) => <line key={key} x1={x - 3} y1={y + 3} x2={x + 3} y2={y - 3} stroke="var(--spec-meta)" strokeWidth="1.1" />;
  const dimY = y1 + 18, dimX = x1 + 18;
  const mono = { fontFamily: "var(--font-mono)", fontSize: "var(--fs-10)", fill: "var(--spec-meta)" };
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", maxHeight: 240, margin: "0 auto" }} role="img"
           aria-label={"План комнаты " + plan.w + "×" + plan.l + " м, окна на " + plan.side}>
        <defs>
          <pattern id="fp-grid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M16 0H0V16" fill="none" stroke="var(--hairline-2)" strokeWidth="1" />
          </pattern>
        </defs>
        {/* бумага + миллиметровка */}
        <rect x={x0} y={y0} width={RW} height={RH} fill="var(--surface)" />
        <rect x={x0} y={y0} width={RW} height={RH} fill="url(#fp-grid)" />
        {/* стены */}
        <rect x={x0} y={y0} width={RW} height={RH} fill="none" stroke="var(--text)" strokeWidth="2.4" />
        {/* окна: разрыв стены + двойное остекление + откосы */}
        {wins.map(([a, b], i) => (
          <g key={i}>
            <line x1={a} y1={y0} x2={b} y2={y0} stroke="var(--surface)" strokeWidth="3.4" />
            <line x1={a} y1={y0 - 1.7} x2={b} y2={y0 - 1.7} stroke="var(--info)" strokeWidth="1.2" />
            <line x1={a} y1={y0 + 1.7} x2={b} y2={y0 + 1.7} stroke="var(--info)" strokeWidth="1.2" />
            <line x1={a} y1={y0 - 3.2} x2={a} y2={y0 + 3.2} stroke="var(--text)" strokeWidth="1.5" />
            <line x1={b} y1={y0 - 3.2} x2={b} y2={y0 + 3.2} stroke="var(--text)" strokeWidth="1.5" />
          </g>
        ))}
        {/* солнце + румб у световой стены (охра = свет) */}
        <g transform={`translate(${x1 - 34} ${y0 - 11})`}>
          <circle cx="0" cy="0" r="2.6" fill="none" stroke="var(--chart-ink)" strokeWidth="1.2" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1={4.2 * Math.cos(a * Math.PI / 180)} y1={4.2 * Math.sin(a * Math.PI / 180)}
                  x2={6 * Math.cos(a * Math.PI / 180)} y2={6 * Math.sin(a * Math.PI / 180)} stroke="var(--chart-ink)" strokeWidth="1" />
          ))}
          <text x="11" y="3.4" style={{ ...mono, fill: "var(--chart-ink)", letterSpacing: ".08em" }}>{plan.side}</text>
        </g>
        {/* дверь */}
        <line x1={dx} y1={y1} x2={dx + dw} y2={y1} stroke="var(--surface)" strokeWidth="3.4" />
        <line x1={dx} y1={y1 - 3.2} x2={dx} y2={y1 + 3.2} stroke="var(--text)" strokeWidth="1.5" />
        <line x1={dx + dw} y1={y1 - 3.2} x2={dx + dw} y2={y1 + 3.2} stroke="var(--text)" strokeWidth="1.5" />
        <line x1={hx} y1={y1} x2={hx} y2={y1 - dw} stroke="var(--accent-ink)" strokeWidth="1.6" />
        <path d={arc} fill="none" stroke="var(--accent-ink)" strokeWidth="1.1" strokeDasharray="3 3" opacity=".65" />
        {/* размер по ширине: выноски + линия + засечки + подпись */}
        <line x1={x0} y1={y1 + 4} x2={x0} y2={dimY + 3} stroke="var(--hairline)" strokeWidth="1" />
        <line x1={x1} y1={y1 + 4} x2={x1} y2={dimY + 3} stroke="var(--hairline)" strokeWidth="1" />
        <line x1={x0} y1={dimY} x2={x1} y2={dimY} stroke="var(--spec-meta)" strokeWidth="1" />
        {tick(x0, dimY, "tw1")}{tick(x1, dimY, "tw2")}
        <text x={(x0 + x1) / 2} y={dimY - 4} textAnchor="middle" style={mono}>{fmtM(plan.w)}</text>
        {/* размер по глубине */}
        <line x1={x1 + 4} y1={y0} x2={dimX + 3} y2={y0} stroke="var(--hairline)" strokeWidth="1" />
        <line x1={x1 + 4} y1={y1} x2={dimX + 3} y2={y1} stroke="var(--hairline)" strokeWidth="1" />
        <line x1={dimX} y1={y0} x2={dimX} y2={y1} stroke="var(--spec-meta)" strokeWidth="1" />
        {tick(dimX, y0, "th1")}{tick(dimX, y1, "th2")}
        <text x={dimX - 4} y={(y0 + y1) / 2} textAnchor="middle" transform={`rotate(-90 ${dimX - 4} ${(y0 + y1) / 2})`} style={mono}>{fmtM(plan.l)}</text>
      </svg>
      {/* легенда — те же условные обозначения, что на чертеже */}
      <div style={{ display: "flex", gap: 18, justifyContent: "center", marginTop: 10, fontFamily: "var(--font-mono)", fontSize: "var(--fs-10)", letterSpacing: ".07em", textTransform: "uppercase", color: "var(--spec-meta)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="18" height="8" aria-hidden="true"><line x1="1" y1="2.5" x2="17" y2="2.5" stroke="var(--info)" strokeWidth="1.3" /><line x1="1" y1="5.5" x2="17" y2="5.5" stroke="var(--info)" strokeWidth="1.3" /></svg>Окно
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="12" height="12" aria-hidden="true"><line x1="10.5" y1="1" x2="10.5" y2="11" stroke="var(--accent-ink)" strokeWidth="1.4" /><path d="M1 11 A 10 10 0 0 1 10.5 1.5" fill="none" stroke="var(--accent-ink)" strokeWidth="1" strokeDasharray="2.5 2.5" opacity=".7" /></svg>Вход
        </span>
      </div>
    </div>
  );
}

/* ---------------- СТИЛЬ И ВАРИАНТЫ ---------------- */
function StyleOptionCard({ s, on, onPick }) {
  const delta = Math.round(((s.factor || 1) - 1) * 100);
  const deltaLabel = delta === 0 ? "базовый бюджет" : (delta > 0 ? `≈ дороже на ${delta}%` : `≈ дешевле на ${Math.abs(delta)}%`);
  return (
    <button className={"style-card" + (on ? " sel" : "")} onClick={() => onPick(s.id)} aria-pressed={on}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontWeight: 800, fontFamily: "var(--font-display)", fontSize: "var(--fs-16)" }}>{s.name}</span>
        {on && <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--accent)", color: "var(--on-accent)", display: "grid", placeItems: "center", flex: "none" }}><I.check size={13} /></span>}
      </div>
      <div style={{ fontSize: "var(--fs-12)", color: "var(--muted)", marginTop: 4 }}>{s.mood}</div>
      <div className="sw">{(s.palette || []).map((c, i) => <span key={i} style={{ background: c }} />)}</div>
      {s.desc && <div style={{ fontSize: "var(--fs-13)", color: "var(--muted)", marginTop: 12, lineHeight: 1.45 }}>{s.desc}</div>}
      <div style={{ marginTop: 12, fontSize: "var(--fs-12)", fontWeight: 700, color: delta > 0 ? "var(--accent)" : (delta < 0 ? "var(--accent-2)" : "var(--faint)") }}>{deltaLabel}</div>
    </button>
  );
}

function StylePicker({ data, styleId, onPick, sref, myStyles }) {
  const mine = myStyles || [];
  return (
    <section className="pd-section" ref={sref}>
      <div className="eyebrow jade" style={{ marginBottom: 14 }}>Стиль и варианты</div>
      <h3 className="pd-h">Направления под эту комнату</h3>
      <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", marginTop: 4, marginBottom: 18, maxWidth: 720 }}>
        AI подобрал стили под пропорции, свет и назначение помещения. Выберите направление — палитра и акценты обновятся, а рядом видно ориентировочное влияние на бюджет.
      </p>
      <div className="pd-styles" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
        {data.styles.map((s) => <StyleOptionCard key={s.id} s={s} on={s.id === styleId} onPick={onPick} />)}
      </div>

      {mine.length > 0 && (
        <React.Fragment>
          <div style={{ display: "flex", alignItems: "center", gap: 9, margin: "22px 2px 12px" }}>
            <I.user size={16} style={{ color: "var(--accent)", flex: "none" }} />
            <span style={{ fontWeight: 700, fontSize: "var(--fs-14)" }}>Мои стили</span>
            <span style={{ fontSize: "var(--fs-12)", color: "var(--faint)" }}>· из библиотеки «Мои стили»</span>
          </div>
          <div className="pd-styles" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {mine.map((s) => <StyleOptionCard key={s.id} s={s} on={s.id === styleId} onPick={onPick} />)}
          </div>
        </React.Fragment>
      )}
    </section>
  );
}

/* ---------------- РАССТАНОВКА (варианты раскладки) ---------------- */
function LayoutPicker({ layout, onPick }) {
  return (
    <section className="pd-section">
      <div className="eyebrow jade" style={{ marginBottom: 14 }}>Расстановка</div>
      <h3 className="pd-h">Варианты раскладки мебели</h3>
      <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", marginTop: 4, marginBottom: 18, maxWidth: 720 }}>
        Готовые схемы расстановки под геометрию комнаты. Выберите раскладку — обновятся метки на визуализации «до/после» и акценты сцены.
      </p>
      <div className="pd-styles" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
        {LAYOUTS.map((l) => {
          const on = l.id === layout.id;
          return (
            <button key={l.id} className={"style-card" + (on ? " sel" : "")} onClick={() => onPick(l.id)} aria-pressed={on}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                <span style={{ fontWeight: 800, fontFamily: "var(--font-display)", fontSize: "var(--fs-16)" }}>{l.name}</span>
                {on && <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--accent)", color: "var(--on-accent)", display: "grid", placeItems: "center", flex: "none" }}><I.check size={13} /></span>}
              </div>
              <MiniLayout plan={l.plan} />
              <div style={{ fontSize: "var(--fs-13)", color: "var(--muted)", marginTop: 12, lineHeight: 1.45 }}>{l.note}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                {l.pros.map((p) => (
                  <span key={p} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "var(--fs-11)", fontWeight: 700, color: "var(--accent-2)", padding: "3px 9px", borderRadius: 99, background: "rgba(94,107,91,.12)", border: "1px solid rgba(94,107,91,.28)" }}>
                    <I.check size={12} />{p}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* схема раскладки сверху — тот же чертёжный язык, что и FloorPlan: тушь-стены, line-art мебель */
function MiniLayout({ plan }) {
  return (
    <div className="plan-box" style={{ position: "relative", width: "100%", aspectRatio: "16/11" }}>
      <span className="pl-win" style={{ left: "26%", width: "48%" }} />
      <span className="pl-door" style={{ left: "8%", width: "16%" }} />
      {plan.map((b, i) => {
        const k = LAYOUT_K[b.k] || LAYOUT_K.table;
        const tall = b.h * 0.6875 > b.w;   // вытянутый по вертикали блок (аспект карты 16/11) — подпись вертикально
        // подпись 10px (WCAG-порог читаемости, было 8.5px) только на крупных блоках;
        // мелким хватает тултипа title (уже есть на span) — 10px в них не помещается
        const showLabel = (tall ? b.h : b.w) >= 20;
        return (
          <span key={i} title={b.label} style={{ position: "absolute", left: b.x + "%", top: b.y + "%", width: b.w + "%", height: b.h + "%",
            borderRadius: 2, background: k.fill, border: (k.dashed ? "1.2px dashed " : "1.3px solid ") + k.stroke,
            display: "grid", placeItems: k.dashed ? "end center" : "center", overflow: "hidden" }}>
            {showLabel && (
              <span className="mono" style={{ fontSize: "var(--fs-10)", letterSpacing: ".05em", textTransform: "uppercase", color: k.ink, whiteSpace: "nowrap",
                padding: k.dashed ? "0 2px 2px" : "0 2px", writingMode: tall ? "vertical-rl" : undefined }}>{b.label}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

/* ---------------- ДО / ПОСЛЕ (слайдер визуализации) ---------------- */
function BeforeAfter({ data, style, pins }) {
  const [pos, setPos] = usePD(56);
  const [drag, setDrag] = usePD(false);
  const boxRef = usePDR(null);
  const knobRef = usePDR(null);   // фокус на ручку при клике (preventDefault гасит нативный фокус)
  const img = PHOTOS[data.cover] || PHOTOS.living;
  const pal = style.palette;
  const arPins = pins || [[31, 60, "Диван"], [69, 45, "Стеллаж"], [50, 74, "Свет"]];

  const setFromX = (clientX) => {
    const el = boxRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setPos(Math.max(6, Math.min(94, ((clientX - r.left) / r.width) * 100)));
  };
  usePDE(() => {
    if (!drag) return;
    const mv = (e) => { if (e.cancelable) e.preventDefault(); setFromX(e.clientX); };
    const up = () => setDrag(false);
    window.addEventListener("pointermove", mv, { passive: false });
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
  }, [drag]);

  const badge = (extra) => ({ position: "absolute", display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 99, fontSize: "var(--fs-11)", fontWeight: 700, letterSpacing: ".04em", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", ...extra });

  return (
    <section className="pd-section">
      <div className="eyebrow jade" style={{ marginBottom: 14 }}>Визуализация</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h3 className="pd-h" style={{ marginBottom: 0 }}>До и после</h3>
        <span className="glass" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 99, fontSize: "var(--fs-12)", fontWeight: 700 }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: pal[0], flex: "none" }} />{style.name}
        </span>
      </div>
      <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", marginTop: 8, marginBottom: 18, maxWidth: 760 }}>
        Слева — исходное фото комнаты, справа — тональное превью в палитре стиля «{style.name}» с метками расстановки (это демо-визуализация, не рендер). Перетащите ползунок, чтобы сравнить.
      </p>

      <div ref={boxRef} onPointerDown={(e) => { e.preventDefault(); if (knobRef.current) knobRef.current.focus({ preventScroll: true }); setDrag(true); setFromX(e.clientX); }}
        style={{ position: "relative", borderRadius: "var(--r-xl)", overflow: "hidden", aspectRatio: "16/9", userSelect: "none", touchAction: "none", cursor: "ew-resize", boxShadow: "var(--shadow-pop)", border: "1px solid var(--hairline)" }}>

        {/* ПОСЛЕ — полный слой снизу, цветокоррекция + тон палитры стиля */}
        <div style={{ position: "absolute", inset: 0 }}>
          <Img src={img} label="после" style={{ position: "absolute", inset: 0, filter: "saturate(1.2) contrast(1.06) brightness(1.05)" }} />
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(125deg, ${pal[0]}66 0%, transparent 42%), linear-gradient(305deg, ${(pal[1] || pal[0])}55 0%, transparent 46%)`, mixBlendMode: "soft-light" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, rgba(46,42,38,.55))" }} />
          {/* AR-метки расставленной мебели */}
          {arPins.map(([l, t, name], i) => (
            <span key={i} className="glass" style={{ position: "absolute", left: l + "%", top: t + "%", transform: "translate(-50%,-50%)", padding: "6px 11px", borderRadius: 9, fontSize: "var(--fs-12)", fontWeight: 700, display: "flex", alignItems: "center", gap: 6, borderColor: "rgba(94,107,91,.6)", background: "rgba(46,42,38,.58)", color: "#FCF6EE", whiteSpace: "nowrap" }}>
              <I.check size={13} style={{ color: "var(--accent-2)" }} />{name}
            </span>
          ))}
          <span style={badge({ right: 14, top: 14, background: "rgba(94,107,91,.92)", border: "1px solid rgba(94,107,91,.5)", color: "#FCF6EE" })}>
            <I.spark size={13} />ПОСЛЕ · превью стиля
          </span>
          <div style={{ position: "absolute", left: 14, bottom: 14, display: "flex", gap: 6 }}>
            {pal.map((c, i) => <span key={i} style={{ width: 22, height: 22, borderRadius: 6, background: c, border: "1px solid rgba(255,255,255,.25)" }} />)}
          </div>
        </div>

        {/* ДО — верхний слой, обрезан по ползунку (показываем левую часть) */}
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <Img src={img} label="скан" style={{ position: "absolute", inset: 0, filter: "grayscale(.92) brightness(.58) contrast(1.06)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(46,42,38,.3), rgba(46,42,38,.5))" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(94,107,91,.22) 1px,transparent 1px),linear-gradient(90deg,rgba(94,107,91,.22) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
          <span style={badge({ left: 14, top: 14, background: "rgba(46,42,38,.6)", border: "1px solid rgba(252,246,238,.22)", color: "#FCF6EE" })}>
            <I.scan size={13} style={{ color: "var(--accent-2)" }} />ДО · исходное фото
          </span>
        </div>

        {/* разделитель + ручка (доступна с клавиатуры: role=slider, ←/→) */}
        <div style={{ position: "absolute", top: 0, bottom: 0, left: pos + "%", width: 2, background: "#fff", transform: "translateX(-1px)", boxShadow: "0 0 14px rgba(0,0,0,.55)" }}>
          <button ref={knobRef} type="button" role="slider" aria-label="Сравнение до и после"
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pos)}
            aria-valuetext={"«до» занимает " + Math.round(pos) + "% кадра"}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); setPos((p) => Math.max(6, p - 5)); }
              if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); setPos((p) => Math.min(94, p + 5)); }
              if (e.key === "Home") { e.preventDefault(); setPos(6); }
              if (e.key === "End") { e.preventDefault(); setPos(94); }
            }}
            style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 42, height: 42, borderRadius: "50%", background: "var(--surface)", color: "var(--text)", display: "grid", placeItems: "center", boxShadow: "0 4px 18px rgba(46,42,38,.4)", cursor: "ew-resize" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 7l-4 5 4 5M15 7l4 5-4 5" /></svg>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------------- ПРОВЕРКА НОРМ (движок эргономики) ---------------- */
function NormsCheck({ checks }) {
  const c = checks || { findings: [], ok: true, warns: 0 };
  return (
    <section className="pd-section">
      <div className="eyebrow jade" style={{ marginBottom: 14 }}>Проверка норм</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h3 className="pd-h" style={{ marginBottom: 0 }}>Эргономика расстановки</h3>
        <span className="glass" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 99, fontSize: "var(--fs-12)", fontWeight: 700,
          color: c.ok ? "var(--accent-2)" : "var(--accent)", borderColor: c.ok ? "rgba(94,107,91,.4)" : "rgba(183,80,44,.4)" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.ok ? "var(--accent-2)" : "var(--accent)", flex: "none" }} />
          {c.ok ? "Все нормы соблюдены" : c.warns + " " + plural(c.warns, ["замечание", "замечания", "замечаний"])}
        </span>
      </div>
      <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", marginTop: 8, marginBottom: 18, maxWidth: 760 }}>
        Движок проверил проходы, дистанции и плотность по нормам эргономики — детерминированно, из геометрии выбранной раскладки. Меняете раскладку выше — проверка пересчитывается.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {/* замечания первыми — иерархия критичности, «в норме» подчинённо */}
        {[...c.findings].sort((a, b) => (a.kind === "warn" ? 0 : 1) - (b.kind === "warn" ? 0 : 1)).map((f, i) => {
          const Ico = FIND_ICON[f.kind] || FIND_ICON.idea;
          return (
            <div key={i} className={"find " + f.kind}>
              <span className="fi"><Ico size={15} /></span>
              <span style={{ fontSize: "var(--fs-14)", lineHeight: 1.5, color: "var(--text)" }}>{f.text}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- БЮДЖЕТ ---------------- */
function BudgetPicker({ data, tier, onTier, total, onOptimize, sref }) {
  const budget = data.budget;
  const pct = Math.min(100, Math.round((total / budget) * 100));
  const over = total > budget;
  const cur = data.budgets.find((b) => b.id === tier) || data.budgets[1];
  return (
    <section className="pd-section" ref={sref}>
      <div className="eyebrow jade" style={{ marginBottom: 14 }}>Бюджет</div>
      <h3 className="pd-h">Под какой бюджет собираем</h3>
      <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", marginTop: 4, marginBottom: 18, maxWidth: 720 }}>
        Тариф меняет наполнение сметы целиком — AI пересобирает подбор под выбранный уровень. Отдельные предметы потом можно заменить вручную ниже.
      </p>

      <SegTabs className="pd-seg" style={{ maxWidth: 520 }} ariaLabel="Уровень бюджета" value={tier} onChange={onTier}
        items={data.budgets.map((b) => ({ id: b.id, label: b.name, sub: b.recommended ? "рекомендация AI" : null }))} />
      <div style={{ fontSize: "var(--fs-13)", color: "var(--muted)", marginTop: 12 }}>{cur.note}</div>

      <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: "18px 20px", marginTop: 18, maxWidth: 640 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: "var(--fs-14)", color: "var(--muted)" }}>Подобрано на</span>
          <span className="mono" style={{ fontSize: "var(--fs-21)", fontWeight: 600 }}>{fmtMoney(total)} <span style={{ fontSize: "var(--fs-13)", color: "var(--spec-meta)", fontWeight: 400 }}>из {fmtMoney(budget)}</span></span>
        </div>
        <div className="budget-bar"><i style={{ transform: `scaleX(${pct / 100})`, background: over ? "linear-gradient(90deg,#B7502C,#ff7849)" : "linear-gradient(90deg,var(--accent-2),#39b88c)" }} /></div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: "var(--fs-13)" }}>
          <span style={{ color: over ? "var(--accent)" : "var(--accent-2)", fontWeight: 700 }}>
            {over ? `Превышение на ${fmtMoney(total - budget)}` : `Остаток ${fmtMoney(budget - total)}`}
          </span>
          <span style={{ color: "var(--faint)" }}>{pct}% бюджета</span>
        </div>
      </div>

      <button className="btn btn-ghost" style={{ marginTop: 14, padding: "11px 18px" }} onClick={onOptimize}>
        <I.spark size={16} />Уложить в бюджет автоматически
      </button>
    </section>
  );
}

/* ---------------- СПЕЦИФИКАЦИЯ (каталог фабрик) ---------------- */
function ProductCatalog({ data, sel, onPick, sref, adj, style, mats }) {
  return (
    <section className="pd-section" ref={sref} style={{ borderBottom: "none" }}>
      <div className="eyebrow jade" style={{ marginBottom: 14 }}>Спецификация</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h3 className="pd-h" style={{ marginBottom: 0 }}>Подбор по каталогу фабрик</h3>
        <span className="mp f1">Дубрава</span><span className="mp f2">Линея</span>
        {/* честная метка: фабрики и цены каталога — демонстрационные, реальные позиции придут из клиппера/фида */}
        <span style={{ padding: "4px 10px", borderRadius: 99, fontSize: "var(--fs-11)", fontWeight: 700, letterSpacing: ".04em", color: "var(--muted)", background: "var(--glass-2)", border: "1px dashed var(--hairline)" }}>демо-каталог</span>
      </div>
      <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", marginTop: 8, marginBottom: 18, maxWidth: 760 }}>
        В каждой категории — 3 варианта по цене и фабрике (демо-данные для примера работы). Нажмите на карточку, чтобы заменить предмет в смете: итог и полоса бюджета пересчитаются автоматически.
      </p>
      <div className="glass" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "8px 14px", borderRadius: 99, marginBottom: 22, fontSize: "var(--fs-13)" }}>
        <span style={{ width: 11, height: 11, borderRadius: 4, background: style.palette[0], border: "1px solid rgba(255,255,255,.25)", flex: "none" }} />
        Подбор и цены адаптированы под стиль <b style={{ color: "var(--text)" }}>{style.name}</b>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        {data.catalog.map((c, ci) => {
          const Ico = I[c.icon] || I.layers;
          const selItem = c.items.find((x) => x.id === sel[ci]);
          // самый дешёвый «не под заказ» аналог в категории (для умного действия)
          const cheapest = c.items.filter((x) => stockInfo(x).state !== "order").sort((a, b) => a.price - b.price)[0] || c.items[0];
          const canSave = selItem && cheapest && cheapest.id !== selItem.id && adj(cheapest.price) < adj(selItem.price);
          const saving = canSave ? adj(selItem.price) - adj(cheapest.price) : 0;
          return (
            <div key={c.cat}>
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--surface-2)", color: "var(--accent)", display: "grid", placeItems: "center", flex: "none" }}><Ico size={18} /></span>
                <span style={{ fontWeight: 700, fontSize: "var(--fs-16)" }}>{c.cat}</span>
                {selItem && <span className="mono" style={{ marginLeft: "auto", fontWeight: 600, fontSize: "var(--fs-15)" }}>{fmtMoney(adj(selItem.price))}</span>}
              </div>

              {canSave && (
                <button onClick={() => onPick(ci, cheapest.id)} className="save-banner">
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(94,107,91,.18)", color: "var(--accent-2)", display: "grid", placeItems: "center", flex: "none" }}><I.spark size={16} /></span>
                  <span style={{ flex: 1, textAlign: "left", fontSize: "var(--fs-13)", lineHeight: 1.4 }}>
                    <b style={{ color: "var(--text)" }}>Аналог дешевле на {fmtMoney(saving)}</b>
                    <span style={{ color: "var(--muted)" }}> — «{cheapest.title}», рейтинг {cheapest.rating}</span>
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "var(--fs-13)", fontWeight: 700, color: "var(--accent-2)", whiteSpace: "nowrap" }}>Заменить<I.arrow size={15} /></span>
                </button>
              )}

              <div className="cat-row">
                {c.items.map((it) => (
                  <ProductCard key={it.id} item={it} selected={sel[ci] === it.id}
                    priceAdj={adj(it.price)} oldAdj={it.old ? adj(it.old) : null}
                    material={mats[ci % mats.length]} dot={style.palette[1] || style.palette[0]}
                    onClick={() => onPick(ci, it.id)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProductCard({ item, selected, onClick, priceAdj, oldAdj, material, dot }) {
  const price = priceAdj != null ? priceAdj : item.price;
  const old = oldAdj != null ? oldAdj : item.old;
  const disc = old && old > price ? Math.round((1 - price / old) * 100) : 0;
  const stock = stockInfo(item);
  return (
    <button className={"prod-card" + (selected ? " sel" : "")} onClick={onClick} aria-pressed={selected}>
      <div className="pim">
        <Img src={item.img} label={MP_NAME[item.mp]} style={{ position: "absolute", inset: 0 }} />
        <span className={"mp mp-badge " + item.mp}>{MP_NAME[item.mp]}</span>
        {selected && <span className="selflag"><I.check size={13} /></span>}
      </div>
      <div className="pbody">
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <span className={"tier-tag " + item.tier}>{TIER_NAME[item.tier]}</span>
          {material && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "var(--fs-11)", fontWeight: 700, color: "var(--muted)", padding: "3px 8px", borderRadius: 99, background: "var(--glass-2)", border: "1px solid var(--hairline)" }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: dot, flex: "none" }} />{material}
            </span>
          )}
        </div>
        <div className="pt">{item.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "var(--fs-12)", color: "var(--muted)" }}>
          <I.star size={13} style={{ color: "var(--accent)" }} /><span style={{ fontWeight: 700, color: "var(--text)" }}>{item.rating}</span>
          <span style={{ color: "var(--faint)" }}>· {fmt(item.reviews)} отз.</span>
        </div>
        {/* наличие + доставка */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "var(--fs-11)", marginTop: "auto", flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 700, color: stock.color }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: stock.color, flex: "none" }} />{stock.label}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--faint)" }}>
            <I.truck size={13} />{stock.eta}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className="pprice">{fmtMoney(price)}</span>
          {disc > 0 && <span className="pold">{fmtMoney(old)}</span>}
          {disc > 0 && <span style={{ marginLeft: "auto", fontSize: "var(--fs-11)", fontWeight: 700, color: "var(--accent-2)" }}>−{disc}%</span>}
        </div>
      </div>
    </button>
  );
}

/* ---------------- СМЕТА (sticky) ---------------- */
function CartBar({ items, total, oldTotal, budget, style, onExport, onSave, saved }) {
  const discount = oldTotal - total;
  const over = total > budget;
  return (
    <div className="pd-cart">
      <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <SmetaTotal amount={total} size={21}
          caption={<React.Fragment>{items.length} {plural(items.length, ["позиция", "позиции", "позиций"])} · {over ? <span style={{ color: "var(--accent-ink)" }}>сверх бюджета</span> : <span style={{ color: "var(--accent-2)" }}>в рамках бюджета</span>}</React.Fragment>} />
        {style && <span className="glass" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 99, fontSize: "var(--fs-12)", fontWeight: 700 }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: style.palette[0], flex: "none" }} />{style.name}
        </span>}
        {discount > 0 && <span className="glass" style={{ padding: "7px 12px", borderRadius: 99, fontSize: "var(--fs-12)", fontWeight: 700, color: "var(--accent-2)" }}>Скидка по каталогу: −{fmtMoney(discount)}</span>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" style={{ padding: "11px 16px" }} onClick={onExport}><I.layers size={16} />Выгрузить PDF</button>
          <button className="btn btn-primary" style={{ padding: "11px 18px" }} onClick={onSave}>{saved ? <React.Fragment><I.check size={16} />Сохранено</React.Fragment> : <React.Fragment><I.check size={16} />Сохранить смету</React.Fragment>}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- AI-ЧАТ ---------------- */
function AdvisorChat({ id, hello, onAction, onClose }) {
  const [msgs, setMsgs] = usePD([{ role: "ai", text: hello }]);
  const [val, setVal] = usePD("");
  const [busy, setBusy] = usePD(false);
  const scrollRef = usePDR(null);
  const chips = ["Сделай дешевле", "Собери премиум", "Что с освещением?", "Покажи стиль Japandi", "Итоговая смета"];

  usePDE(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy]);

  const send = async (text) => {
    const t = (text || "").trim();
    if (!t || busy) return;
    setMsgs((m) => [...m, { role: "me", text: t }]);
    setVal("");
    setBusy(true);
    const res = await AIVibeAPI.projects.chat(id, t);
    setBusy(false);
    setMsgs((m) => [...m, { role: "ai", text: res.text }]);
    if (res.action) setTimeout(() => onAction(res.action), 250);
  };

  return (
    <React.Fragment>
      <div className="pd-chat-head">
        <span style={{ width: 38, height: 38, borderRadius: 11, background: "var(--accent)", color: "var(--on-accent)", display: "grid", placeItems: "center", flex: "none" }}><I.spark size={20} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "var(--fs-15)" }}>Помощник проекта</div>
          {/* честный лейбл: чат работает на сценариях-командах (дешевле/премиум/стиль), настоящий ИИ подключится Worker-слоем */}
          <div style={{ fontSize: "var(--fs-12)", color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent-2)" }} />демо-сценарии · без ИИ</div>
        </div>
        <button className="icon-btn pd-rail-close" onClick={onClose} aria-label="Свернуть чат"><I.close size={18} /></button>
      </div>

      <div className="pd-chat-scroll" ref={scrollRef} role="log" aria-label="Диалог с помощником проекта">
        {msgs.map((m, i) => <div key={i} className={"pd-msg " + m.role}>{m.text}</div>)}
        {busy && <div className="pd-msg ai" role="status" aria-label="Помощник печатает"><span className="pd-typing"><i /><i /><i /></span></div>}
      </div>

      <div className="pd-chips">
        {chips.map((c) => <button key={c} onClick={() => send(c)} disabled={busy}>{c}</button>)}
      </div>

      <form className="pd-chat-input" onSubmit={(e) => { e.preventDefault(); send(val); }}>
        <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Команда помощнику…" aria-label="Сообщение" />
        <button type="submit" className="btn btn-primary" disabled={busy || !val.trim()} style={{ padding: "0 16px" }} aria-label="Отправить"><I.send size={17} /></button>
      </form>
    </React.Fragment>
  );
}

window.ProjectDetail = ProjectDetail;
window.RoomSpecOverlay = RoomSpecOverlay;   // рендерится из кабинета (импорт Excel / черновик калькулятора); в ES-модулях без явного экспорта был бы ReferenceError
