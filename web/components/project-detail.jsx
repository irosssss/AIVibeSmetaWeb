/* ============================================================
   Design Ledger — ДЕТАЛЬ ПРОЕКТА (смета-комплектация)
   Обзор · Смета по комнатам · Согласование · Закупка · Версии ·
   Настройки. Открывается из раздела «Мои проекты».
   ============================================================ */
const { useState: usePD, useEffect: usePDE, useRef: usePDR } = React;

// единая точка канона наценки (web/ffe.js) — не дублировать литерал 25 по файлам
const PD_DEFAULT_MARKUP = (window.LedgerFFE && window.LedgerFFE.DEFAULT_MARKUP_PCT) || 25;

const FIND_ICON = { plus: (p) => <I.check {...p} />, warn: (p) => <I.info {...p} />, idea: (p) => <I.spark {...p} /> };

/* дата в приемлемом для дизайнера формате (документ сметы, история цен) */
const fmtDateRu = (d) => { const t = new Date(d + "T00:00:00"); return isNaN(t.getTime()) ? String(d) : t.toLocaleDateString("ru-RU"); };
/* давность цены позиции, скопированной из прошлого проекта — тултип свой, геометрия чипа общая (PriceAgeChip, ui.jsx) */
const pastCopyNote = (d) => (days, stale) => "Цена скопирована из прошлого проекта, от " + fmtDateRu(d) + (stale ? " — стоит перепроверить" : "");

function ProjectDetail({ id, nav, onClose }) {
  const [data, setData] = usePD(null);

  usePDE(() => {
    let alive = true;
    LedgerAPI.projects.get(id).then((d) => {
      if (!alive) return;
      if (!d || !d.id) { toast("Проект не найден — возможно, ссылка устарела.", "warn", 5000); onClose(); return; }
      setData(d);
      setTitle("cabinet", d.name);
    });
    return () => { alive = false; setTitle("cabinet"); };
  }, [id]);
  // «Настройки» (волна W4.2) сохраняют через LedgerAPI напрямую, не через setData — без
  // этого Обзор показывал бы старые значения до следующего полного перемонтирования.
  // projects.update(...) уже возвращает свежую запись — мержим её в data локально, вместо
  // повторного projects.get(id) (тот делает 2 цепочки delay() ради данных, которые уже есть)
  const applyPatch = (patch) => setData((d) => (d ? { ...d, ...patch } : d));

  // Esc закрывает Обзор/Настройки (смета НЕ здесь: у RoomSpecOverlay свой Esc
  // через guardedClose — несохранённые правки спрашивают, а не теряются)
  usePDE(() => {
    if (nav !== "" && nav !== "settings") return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) { e.target.blur(); return; }
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [nav]);

  if (!data) {
    return (
      <div className="pd-overlay" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "var(--muted)" }}>
          <Lottie name="loader" playOnView={false} ariaLabel="Design Ledger собирает смету"
                  fallback={<span className="spin" style={{ width: 30, height: 30 }} />}
                  style={{ width: 230, height: 150 }} />
          Design Ledger собирает смету…
        </div>
      </div>
    );
  }

  // W2: раздел '' — «Обзор» (лицо проекта), смета живёт на 'smeta'.
  // key: при смене id через hash state оверлея (наценки/скидка/savedId) обязан переинициализироваться,
  // иначе «Сохранить» запишет значения предыдущего проекта в новый.
  // Проект без сида (новый/квиз/копия) получает rooms: [] от projects.get — пустая смета, не чужие данные.
  if (nav === "") return <ProjectOverview key={data.id || "overview"} data={data} onClose={onClose} />;
  // W4.2: «Настройки» — детали проекта (не режим выгрузки сметы), отдельная от RoomSpecOverlay ветка
  if (nav === "settings") return <ProjectSettings key={data.id || "settings"} data={data} onClose={onClose} onSaved={applyPatch} />;
  return <RoomSpecOverlay key={data.id || "imported"} data={data} nav={nav} onClose={onClose} onSaved={applyPatch} />;
}

/* W5.1: «К комнате ▾» — прыжок по секциям длинной сметы (паттерн Programa «View section»):
   пункты-menuitem «имя + счётчик позиций» по канону .menu (§5.6), Esc/↑↓/click-outside —
   useMenu, т.е. работает с клавиатуры. Скролл — scrollIntoView внутри .pd-main. */
function RoomJumpMenu({ rooms }) {
  const [open, setOpen] = usePD(false);
  useMenu(open, () => setOpen(false), "rs-jump-wrap");
  const jump = (ri) => {
    setOpen(false);
    const el = document.getElementById("rs-room-" + ri);
    if (el) el.scrollIntoView({ behavior: motionOK() ? "smooth" : "auto", block: "start" });
  };
  return (
    <div className="rs-jump-wrap" style={{ position: "relative" }}>
      <button className="btn-ws" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} title="Перейти к комнате">
        <I.plan size={15} />К комнате
        <I.chevron size={11} stroke={2.4} style={{ color: "var(--faint)" }} />
      </button>
      {open && (
        <div className="menu menu-pop" role="menu" aria-label="Комнаты сметы"
          style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: 220, maxHeight: 320, overflowY: "auto", zIndex: 40, transformOrigin: "top left" }}>
          {rooms.map((r, ri) => (
            <button key={ri} role="menuitem" className="menu-item" onClick={() => jump(ri)}>
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
              <span className="mi-count">{r.items.length}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* Д2 (W6): меню переключателя под-вьюх проекта для крошки OverlayHead (паттерн Programa
   «Files > Project Schedule ▾»). Список разделов — WS_PROJ_ITEMS сайдбара (cabinet.jsx,
   через window — кросс-файловые bare-const в этом Vite-трансформе нестабильны, журнал W2).
   Только для сохранённых смет-комплектаций: у AI-демо-проекта разделов нет. */
const projCrumbMenu = (id, current) => {
  const items = (window.WS_PROJ_ITEMS || []).map(([s2, label]) => ({
    id: s2 || "overview", label, on: (current || "") === s2,
    onPick: () => setRoute("cabinet", "projects", id, s2),
  }));
  return items.length ? items : null;
};
const projS2Label = (s2) => { const it = (window.WS_PROJ_ITEMS || []).find(([k]) => k === s2); return it ? it[1] : "Смета"; };

/* Д4 (W6): метрика «значение над подписью» для раскрытой полосы итога (физика Programa §5.5) */
function CartMetric({ v, cap, tone }) {
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
      <span className="mono" style={{ fontSize: "var(--fs-13)", fontWeight: 600, lineHeight: 1, color: tone || "var(--text)" }}>{v}</span>
      <span className="mono" style={{ fontSize: "var(--fs-10)", color: "var(--spec-meta)", letterSpacing: ".05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{cap}</span>
    </span>
  );
}

/* ---------------- СМЕТА-КОМПЛЕКТАЦИЯ ПО КОМНАТАМ (реальный дизайн-проект) ----------------
   nav — раздел из сайдбара проекта (волна W1): '' смета · client · procure · versions */
function RoomSpecOverlay({ data, nav, onClose, onSaved }) {
  const [markup, setMarkup] = usePD(data.markupPct != null ? data.markupPct : PD_DEFAULT_MARKUP);
  const [catMarkup, setCatMarkup] = usePD(data.catMarkupPct || {});  // {раздел: %} — своя наценка поверх базовой (пусто = наследует)
  const [catOpen, setCatOpen] = usePD(false);
  const [discount, setDiscount] = usePD(data.discountPct || 0);      // скидка клиенту, % от подытога
  const [delivery, setDelivery] = usePD(data.deliveryCost || 0);     // доставка, ₽ (транзитом, без наценки)
  const [install, setInstall] = usePD(data.installCost || 0);        // монтаж и сборка, ₽
  const [extras, setExtras] = usePD(data.extras || []);              // доп. сборы (доставка/монтаж/НДС/кастом) — {id,label,kind,value}
  const [addExtraOpen, setAddExtraOpen] = usePD(false);               // меню «+ Добавить сбор» (пресеты + «Другое»)
  const [addCustomOpen, setAddCustomOpen] = usePD(false);             // инлайн-форма кастомного сбора
  const [customLabel, setCustomLabel] = usePD("");
  const [customKind, setCustomKind] = usePD("fixed");
  useMenu(addExtraOpen, () => setAddExtraOpen(false), "pd-add-extra");
  const [mode, setMode] = usePD("work");   // режим выгрузки: "work" (рабочая) / "client" (для клиента) / "procure" (закупка)
  const [cartOpen, setCartOpen] = usePD(false);   // Д4 (W6): раскладка липкого итога (паттерн Programa Financial-полосы)
  const [rooms, setRooms] = usePD(data.rooms || []);  // позиции редактируемы: копии из прошлых проектов, шаблоны, поставщики
  // модалка «Из прошлого проекта / шаблона / по ссылке»: null | {tab, room?} —
  // Д1 (W6): инлайн-панель комнаты открывает сразу вкладку «По ссылке» со своей комнатой
  const [addOpen, setAddOpen] = usePD(null);
  const [roomSaved, setRoomSaved] = usePD(false);
  const [roomSaving, setRoomSaving] = usePD(false);   // guard: двойной клик «Сохранить» не должен создать проект-дубль
  const [savedId, setSavedId] = usePD(data.id || null);
  const [settings, setSettings] = usePD(null);   // мои нормы — для проверки эргономики по комнатам
  usePDE(() => { LedgerAPI.settings.get().then(setSettings); }, []);
  const [me, setMe] = usePD(null);               // аккаунт — фолбэк имени студии для брендинга портала (волна A5)
  usePDE(() => { LedgerAPI.profile.get().then(setMe); }, []);
  // брендинг + контакты студии (волна A5 + W4.1) — один источник для портала/протокола/PDF,
  // вместо повтора одной и той же сборки в 3 местах
  const studioName = (settings && settings.studioName) || (me && me.name) || "";
  const studioContact = settings ? [settings.studioCity, settings.studioPhone, settings.studioEmail].filter(Boolean).join(" · ") : "";
  const [library, setLibrary] = usePD([]);       // библиотека товаров студии (волна B1): автоподстановка + пикер
  const reloadLibrary = () => LedgerAPI.library.list().then(setLibrary);
  usePDE(() => { reloadLibrary(); }, []);
  const [pickerRoom, setPickerRoom] = usePD(null);   // индекс комнаты с открытым пикером библиотеки | null
  // адресная книга поставщиков (K5a): контакты подтягиваются к позициям по имени (supplierMatch)
  const [supBook, setSupBook] = usePD([]);
  const reloadSupBook = () => LedgerAPI.suppliers.list().then(setSupBook);
  usePDE(() => { reloadSupBook(); }, []);

  /* --- профили наценки «мой стандарт» (роадмап п.4): применить одним кликом
     на новый проект или сохранить текущую настройку под именем --- */
  const [profiles, setProfiles] = usePD([]);
  const reloadProfiles = () => LedgerAPI.markupProfiles.list().then(setProfiles);
  usePDE(() => { reloadProfiles(); }, []);
  const [profName, setProfName] = usePD("");
  const [profSaving, setProfSaving] = usePD(false);   // guard: двойной клик «Сохранить как стандарт» не должен создать дубль
  const applyProfile = (p) => {
    setMarkup(p.markupPct != null ? p.markupPct : PD_DEFAULT_MARKUP);
    setCatMarkup(p.catMarkupPct || {});
    setDiscount(p.discountPct || 0);
    setDelivery(p.deliveryCost || 0);
    setInstall(p.installCost || 0);
    setExtras(p.extras || []);
    toast("Применён стандарт «" + p.name + "»");
  };
  const saveProfile = (e) => {
    e.preventDefault();
    const name = profName.trim();
    if (!name || profSaving) return;
    setProfSaving(true);
    LedgerAPI.markupProfiles.create({ name, markupPct: markup, catMarkupPct: catMarkup, discountPct: discount, deliveryCost: delivery, installCost: install, extras })
      .then((row) => { setProfiles((ps) => [...ps, row]); setProfName(""); setProfSaving(false); toast("Стандарт «" + row.name + "» сохранён"); });
  };
  const removeProfile = async (p) => {
    const ok = await confirmDialog({ title: "Удалить стандарт?", text: "«" + p.name + "» исчезнет из списка. На уже применённые проекты это не влияет.", confirmLabel: "Удалить стандарт" });
    if (!ok) return;
    LedgerAPI.markupProfiles.remove(p.id).then(() => setProfiles((ps) => ps.filter((x) => x.id !== p.id)));
  };
  /* --- dirty-флаг несохранённых правок (долг W2/W6): сайдбар/крошка/⌘K уходили со
     сметы, молча теряя правки в этом локальном стейте (rooms/markup/... персистятся
     только по клику «Сохранить»). savedSnapRef — снимок ПОСЛЕДНЕГО сохранённого
     состояния (тех же полей, что несёт patch ниже); dirty — плоское сравнение на
     каждый рендер (JSON.stringify недорог на размере сметы, а useMemo здесь дал бы
     ложный «неизменившийся» результат — deps не видят мутацию ref после сохранения). */
  const pdSnap = (m, cm, d, dl, ins, ex, rm) => JSON.stringify({ m, cm, d, dl, ins, ex, rm });
  const savedSnapRef = usePDR(pdSnap(
    data.markupPct != null ? data.markupPct : PD_DEFAULT_MARKUP, data.catMarkupPct || {},
    data.discountPct || 0, data.deliveryCost || 0, data.installCost || 0, data.extras || [], data.rooms || []));
  const dirty = pdSnap(markup, catMarkup, discount, delivery, install, extras, rooms) !== savedSnapRef.current;
  const savingRef = usePDR(null);   // промис уже идущего сохранения — вторая правка не должна коротить мимо него Promise.resolve()
  const saveRoom = () => {
    if (savingRef.current) return savingRef.current;
    setRoomSaving(true);
    const snap = pdSnap(markup, catMarkup, discount, delivery, install, extras, rooms);
    const done = (pid) => {
      savedSnapRef.current = snap; savingRef.current = null; setRoomSaving(false); setRoomSaved(true); setTimeout(() => setRoomSaved(false), 1700);
      // сайдбар кабинета (cabinet.jsx WsSidebar) держит СВОЮ копию proj.rooms, фетчнутую
      // по [projId] — первое сохранение сметы (rooms 0→>0) иначе не подхватится без
      // смены projId; тот же событийный мост, что и aivibe:project-renamed
      window.dispatchEvent(new CustomEvent("aivibe:project-rooms-changed", { detail: { id: pid, rooms: rooms.length > 0 } }));
    };
    const patch = { markupPct: markup, catMarkupPct: catMarkup, discountPct: discount, deliveryCost: delivery, installCost: install, extras, rooms, items: itemsCount };
    const p = savedId
      // родитель (ProjectDetail) держит СВОЮ копию data, фетчнутую один раз при монтировании —
      // без onSaved(updated) Обзор/шапка после сохранения показывали бы устаревшие итоги
      // (в частности, только что добавленные сборы) до полной перезагрузки
      ? LedgerAPI.projects.update(savedId, patch).then((updated) => { if (onSaved) onSaved(updated); done(savedId); })
      // импортированная из Excel смета не привязана к проекту — создаём его,
      // иначе «Сохранено» врало бы, а наценки терялись при закрытии оверлея
      : LedgerAPI.projects.create({
          name: data.name || "Смета из Excel", room: data.generated ? "Черновик по площади" : "Комплектация из Excel", style: "",
          area: data.area, budget: data.budget || 0,
          summaryShort: data.summaryShort, ...patch,
        }).then((p2) => { setSavedId(p2.id); if (onSaved) onSaved(p2); toast("Смета сохранена в «Мои проекты»"); done(p2.id); });
    savingRef.current = p;
    return p;
  };
  // saveRoom/guardedClose пересоздаются КАЖДЫЙ рендер (закрывают текущие markup/
  // catMarkup/rooms/...), а мост наружу и Esc-листенер ниже регистрируются РЕЖЕ —
  // только на переход dirty false→true — поэтому обязаны звать через ref на
  // последнее значение, не напрямую: иначе застрявшее в замыкании эффекта значение
  // saveRoom навсегда осталось бы на состоянии ПЕРВОЙ правки dirty-сессии, и
  // «Сохранить и уйти» после ВТОРОЙ правки тихо ушло бы с данными первой
  // (найдено код-ревью 12.07 — баг сводил на нет весь смысл этой волны).
  const saveRoomRef = usePDR(saveRoom);
  saveRoomRef.current = saveRoom;
  // мост наружу (сайдбар/крошка-переключатель/⌘K живут в cabinet.jsx — другое дерево
  // компонентов): пока правки не сохранены, window.setRoute/changeTab спросят
  // подтверждение перед уходом со сметы (guardSmetaLeave, cabinet.jsx)
  usePDE(() => {
    window.pdSmetaDirty = dirty ? { save: () => saveRoomRef.current() } : null;
    return () => { window.pdSmetaDirty = null; };
  }, [dirty]);
  // «Проекты»-крошка/стрелка назад/Esc уходят из ЭТОЙ смёты напрямую (не через
  // setRoute) — тот же вопрос локально, на местном dirty, без моста
  const guardedClose = () => {
    if (!dirty) { onClose(); return; }
    confirmLeaveSmeta().then((ok) => {
      if (!ok) return;
      saveRoomRef.current().then(onClose).catch(() => toast("Не удалось сохранить смету — попробуйте вручную.", "warn"));
    });
  };
  const guardedCloseRef = usePDR(guardedClose);
  guardedCloseRef.current = guardedClose;

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
    setAddOpen(null);
    // «Первые шаги» на «Сегодня» (волна W3.1): честный флаг ровно для пути «по ссылке»
    // (AddPositionsModal, вкладка «По ссылке») — остальные источники (из проекта/шаблона)
    // не считаются этим шагом чек-листа. markOnboardStep живёт в cabinet-views.jsx —
    // читаем через window (bare cross-файловый const в этом Vite-транcформе нестабилен,
    // см. журнал W2 про PROJ_STATUSES/STAGE_NEXT); ffe.js/cabinet-views.jsx грузятся раньше.
    if (srcLabel === "по ссылке" && window.markOnboardStep) window.markOnboardStep("clip");
    toast("Добавлено " + n + " " + plural(n, ["позиция", "позиции", "позиций"]) + " — «" + srcLabel + "». Не забудьте сохранить смету.");
  };

  /* --- живое редактирование сметы (фаза 2 слияния, шаг 1) --- */
  const [editPos, setEditPos] = usePD(null); // {ri, ii} — открытый редактор строки; ii === -1 — новая позиция в комнате ri
  const [flashPos, setFlashPos] = usePD(null); // {ri, ii} — только что добавленная строка, короткая олива-подсветка
  const [flashSup, setFlashSup] = usePD(null); // {ri, ii} — строка только что сменила поставщика и переехала в новую группу закупки
  // таймеры флэша — в ref (не в замыкание setTimeout), иначе повторный флэш той же
  // комнаты не гасит предыдущий таймер (стек тайм-аутов) и оверлей может размонтироваться
  // раньше 1300мс без отмены — setState летит на unmounted-компонент
  const flashPosTimerRef = usePDR(null);
  const flashSupTimerRef = usePDR(null);
  usePDE(() => () => { clearTimeout(flashPosTimerRef.current); clearTimeout(flashSupTimerRef.current); }, []);
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
      if (d.unit && d.unit !== "шт") next.unit = d.unit; else delete next.unit;   // дефолт «шт» не храним
      // FF&E-детали: пустые не храним (delete), чтобы позиция не таскала "" по схеме;
      // d.* приходят из PosEditor.draft() (sku/url/material тримнуты, dims/leadWeeks — число или "")
      if (d.code) next.code = d.code; else delete next.code;   // ручной док-код = override; пусто = авто по разделу (assignDocCodes)
      if (d.sku) next.sku = d.sku; else delete next.sku;
      if (d.url) next.url = d.url; else delete next.url;
      if (d.img) next.img = d.img; else delete next.img;
      if (d.material) next.material = d.material; else delete next.material;
      if (d.leadWeeks !== "") next.leadWeeks = d.leadWeeks; else delete next.leadWeeks;
      if (d.wastePct !== "") next.wastePct = d.wastePct; else delete next.wastePct;
      if (d.rrp !== "" && d.rrp > 0) next.rrp = d.rrp; else delete next.rrp;   // розница (RRP): 0 = «не задана», слоя нет
      if (d.dims && (d.dims.w !== "" || d.dims.d !== "" || d.dims.h !== "")) next.dims = d.dims; else delete next.dims;
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
      clearTimeout(flashPosTimerRef.current);
      setFlashPos({ ri, ii: newIndex });
      flashPosTimerRef.current = setTimeout(() => setFlashPos((f) => (f && f.ri === ri && f.ii === newIndex ? null : f)), 1300);
    }
  };
  const removePos = (ri, ii) => {
    const it = rooms[ri].items[ii];
    setRooms((prev) => prev.map((r, i) => (i !== ri ? r : { ...r, items: r.items.filter((_, j) => j !== ii) })));
    // удаление сдвигает индексы всех позиций после ii в этой комнате — отложенный
    // флэш-таргет (flashPos/flashSup) мог указывать на строку, которая теперь
    // на другом месте; проще и безопаснее погасить оба флэша этой комнаты сразу
    clearTimeout(flashPosTimerRef.current);
    clearTimeout(flashSupTimerRef.current);
    setFlashPos((f) => (f && f.ri === ri ? null : f));
    setFlashSup((f) => (f && f.ri === ri ? null : f));
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
  // Д1 (W6): новая пустая комната после ri — раньше комнату в смете создавали только
  // импорт/копия/клиппер. Дубль имени запрещаем: комнаты рендерятся по key=name,
  // а addFrom сливает вставки по имени. editPos/flashPos держат индексы комнат —
  // сдвигаем их за точкой вставки, НЕ сбрасывая: незакрытый черновик позиции
  // (W6-ревью: setEditPos(null) молча съедал полунабранную позицию в другой комнате).
  const addRoomAfter = async (ri) => {
    const name = await promptDialog({ title: "Новая комната", label: "Название", value: "" });
    if (!name || !name.trim()) return;
    const v = name.trim();
    if (rooms.some((r) => r.name === v)) { toast("Комната «" + v + "» уже есть — выберите другое имя"); return; }
    // сдвигаем только editPos (черновик пользователя — его терять нельзя);
    // флэши — косметика на 1.3s, чьи clear-таймеры гвардятся СТАРЫМИ индексами:
    // сдвиг сделал бы подсветку вечной (таймер no-op), поэтому просто гасим (ревью р.2)
    setEditPos((p) => (p && p.ri > ri ? { ...p, ri: p.ri + 1 } : p));
    setFlashPos(null); setFlashSup(null);
    setRooms((prev) => { const next = [...prev]; next.splice(ri + 1, 0, { name: v, items: [] }); return next; });
    toast("Комната «" + v + "» добавлена — не забудьте сохранить смету.");
  };

  // Esc закрывает смету-оверлей (когда открыта напрямую, напр. из импорта Excel);
  // из полей ввода Esc не закрывает, а отдаёт фокус. Регистрируем ОДИН раз ([] —
  // не [dirty]) и зовём через guardedCloseRef: слушатель с deps=[dirty] пересобирался
  // бы только на переход dirty, застревая на guardedClose первой правки сессии
  // (тот же класс бага, что был у моста window.pdSmetaDirty — см. выше).
  usePDE(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) { e.target.blur(); return; }
      guardedCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  // W5.4: хоткей N — новая позиция (в первой комнате, подсказка-бейдж на её кнопке).
  // Не срабатывает из полей ввода, при открытом редакторе/модалке и вне «Рабочей».
  usePDE(() => {
    const onKey = (e) => {
      if (e.code !== "KeyN" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
      if (mode !== "work" || editPos || !rooms.length) return;
      if (document.querySelector(".modal-back")) return;   // поверх — модалка (версии/диалог/квиз)
      e.preventDefault();
      setEditPos({ ri: 0, ii: -1 });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mode, editPos, rooms.length]);
  // наценка: базовая + необязательный оверрайд по разделу. Округляется ЦЕНА ЗА ШТУКУ,
  // сумма строки = цена × кол-во — тогда колонки документа бьются арифметически (UI = PDF = Excel).
  // Формула — из FFE.clientPricing (ffe.js), единый источник для UI/PDF/Excel/портала:
  // себестоимость учитывает запас/отход (costUnit), наценка — поверх неё.
  const FFE = window.LedgerFFE;
  const cp = FFE.clientPricing({ rooms, markup, catMarkup });
  const catOf = cp.catOf;
  const pctOf = cp.pctOf;
  const lineCost = (it) => cp.costUnit(it) * (it.qty || 1);
  const unitClient = cp.unitClient;
  const lineClient = cp.lineClient;
  const roomTotal = (r) => r.items.reduce((s, it) => s + lineCost(it), 0);
  const roomClient = (r) => r.items.reduce((s, it) => s + lineClient(it), 0);
  const grand = rooms.reduce((s, r) => s + roomTotal(r), 0);
  const client = cp.client;
  const itemsCount = rooms.reduce((s, r) => s + r.items.length, 0);
  // док-коды позиций (K1): вычисляем производно от rooms (пул по разделу + ручной override
  // в it.code), не мигрируя сохранённое — тот же assignDocCodes зовут PDF/Excel/портал,
  // коды сходятся везде. codeOf(ri, i) — эффективный код строки для рендера.
  const docCoded = FFE && FFE.assignDocCodes ? FFE.assignDocCodes(rooms) : rooms;
  const codeOf = (ri, i) => (docCoded[ri] && docCoded[ri].items[i] && docCoded[ri].items[i].code) || "";
  const over = grand > data.budget;
  // паспорт свежести цен (роадмап «Стол комплектатора» шаг C1) — та же честная нижняя граница, что уходит в PDF/Excel
  const fresh = window.LedgerFFE && window.LedgerFFE.priceFreshness ? window.LedgerFFE.priceFreshness(rooms) : null;
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
    clearTimeout(flashSupTimerRef.current);
    setFlashSup({ ri, ii });
    flashSupTimerRef.current = setTimeout(() => setFlashSup((f) => (f && f.ri === ri && f.ii === ii ? null : f)), 1300);
  };

  /* --- стадии закупки по позициям (фаза 2 слияния, шаг 2; словарь стадий — web/ffe.js).
     Позиция без status считается «Подбор»; смена стадии штампует дату (stampStatus
     не затирает ранее пройденные). Живут только в «Закупке» — клиент их не видит.
     FFE уже объявлен выше (формула клиентских цен). */
  const stOf = (it) => (FFE && FFE.STATUS_BY_ID[it.status] ? it.status : "specified");
  // смена стадии сбрасывает eta — дата была ожиданием ПРЕЖНЕЙ стадии, на новой
  // она бы ложно висела просрочкой (см. комментарий к eta в ffe.js)
  const setStatus = (ri, ii, id) => setRooms((prev) => prev.map((r, i) => i !== ri ? r
    : { ...r, items: r.items.map((it, j) => j !== ii ? it : { ...it, status: id, eta: "", statusDates: FFE.stampStatus(it.statusDates, id) }) }));
  const rowsProgress = (rws) => (rws.length ? rws.reduce((s, x) => s + FFE.statusProgress(stOf(x.it)), 0) / rws.length : 0); // 0..1
  const allProcRows = supGroups.flatMap((g) => g.rows);
  const acceptedCount = FFE ? allProcRows.filter((x) => stOf(x.it) === "accepted").length : 0;

  /* --- платёжные даты + трек-номер (волна C, бенчмарк Programa) — общий drawer
     «Оплата и сроки» на строку закупки: ожидаемая дата стадии (eta) + 4 даты
     оплаты + трек отправления. Отдельное измерение от статуса-стадии (setStatus) —
     деньги и товар двигаются не синхронно. */
  const [payEdit, setPayEdit] = usePD(null); // {ri, ii} — открытый drawer «Оплата и сроки»
  const savePayTrack = (ri, ii, patch) => {
    setRooms((prev) => prev.map((r, i) => i !== ri ? r
      : { ...r, items: r.items.map((it, j) => j !== ii ? it : { ...it, ...patch }) }));
    setPayEdit(null);
  };
  const dueOf = (it) => (FFE ? FFE.itemDueItems(it).map((d) => FFE.urgencyBucket(d.date)).filter(Boolean) : []);
  // ранг — порядок URGENCY_BUCKETS в ffe.js (единственный источник правды: не дублировать список id)
  const urgentColor = (buckets) => {
    if (!FFE || !buckets.length) return null;
    const top = FFE.URGENCY_BUCKETS.find((b) => buckets.includes(b.id));
    return top ? top.color : null;
  };

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
    LedgerAPI.library.create(FFE.productFromPosition(pos)).then(() => {
      reloadLibrary(); toast("«" + title + "» добавлен в библиотеку студии.");
    });
  };
  // K5a: поставщик позиции → карточка адресной книги (паттерн saveToLibrary; дедуп по имени —
  // supplierMatch, той же функцией, что находит карточку для контакт-чипа)
  const saveToSupBook = (name) => {
    const n = String(name || "").trim();
    if (!FFE || !n) return;
    if (FFE.supplierMatch(supBook, n)) { toast("«" + n + "» уже есть в адресной книге."); return; }
    LedgerAPI.suppliers.create({ name: n }).then(() => {
      reloadSupBook(); toast("«" + n + "» добавлен в адресную книгу. Контакты заполните в Мастерской → Поставщики.");
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
  // итог структурой: подытог (client) → скидка → доставка/монтаж/сборы → ИТОГО.
  // Скидка округляется до рубля от подытога — та же формула в PDF/Excel (инвариант выгрузок)
  const discountAmt = Math.round(client * discount / 100);
  // сборы (доставка/монтаж/НДС/кастом) — % считаем от той же базы, что ffe.js clientPricing
  // (товары после скидки, не каскадом друг на друга); FFE.extrasTotal — единый источник
  const extrasAmt = FFE.extrasTotal(extras, client - discountAmt);
  // производные наценки/маржи — ОДНО место для липкой полосы (Д4) и блока «Итог сметы»
  // (W6-ревью: формулы были скопированы, правка «наценки по разделам» разъехалась бы)
  const markupAmt = client - grand;
  const markupLabel = ovrCount > 0 ? "≈ +" + effPct + "%" : "+" + markup + "%";
  const margin = client - discountAmt - grand;   // транзитные доставка/монтаж/сборы в марже не участвуют
  const totalClient = client - discountAmt + delivery + install + extrasAmt;
  // эргономика по комнатам: там, где в РД есть план расстановки (plan+layout); мои нормы учитываются.
  // До прихода settings не считаем — иначе первый кадр показан по канону и «мигает» при загрузке моих норм
  const effNorms = settings ? { ...(settings.normsOverride || {}), enabled: settings.enabledNorms || {} } : undefined;
  const ergo = window.LedgerEngine && settings
    ? rooms.filter((r) => r.plan && r.layout).map((r) => ({ name: r.name, res: LedgerEngine.checkErgonomics({ plan: r.layout }, r.plan, effNorms) }))
    : [];
  const ergoWarns = ergo.reduce((s, e) => s + e.res.warns, 0);
  const ergoSkipped = rooms.length - ergo.length;
  const specArgs = () => ({ project: data.name, area: data.area, rooms, grand, markupPct: markup, catMarkupPct: catMarkup, clientTotal: client, discountPct: discount, deliveryCost: delivery, installCost: install, extras, budget: data.budget, mode, studioName, studioContact });
  const exportPDF = () => { if (window.LedgerPDF && LedgerPDF.exportRoomSpec) withLib("pdf", () => LedgerPDF.exportRoomSpec(specArgs())); };
  const exportXLSX = () => { if (window.LedgerXLSX) withLib("xlsx", () => LedgerXLSX.exportRoomSpec(specArgs())); };

  /* --- версии + согласование (фаза 2 слияния, шаг 3; статусы и хранилище — web/ffe.js).
     Снимок = позиции + наценки + скидка/доставка/монтаж: восстановление возвращает смету
     в момент отправки клиенту (включая стадии закупки — они живут в позициях).
     Версии привязаны к проекту — несохранённую смету просим сначала сохранить. */
  const [versionsOpen, setVersionsOpen] = usePD(false);
  const [shareModal, setShareModal] = usePD(null);   // запись портал-шары для модалки «Ссылка для клиента» | null
  const [versions, setVersions] = usePD(() => (FFE && data.id ? FFE.loadVersions(data.id) : []));
  usePDE(() => { if (FFE && savedId) FFE.saveVersions(savedId, versions); }, [versions, savedId]);
  const approved = versions.find((v) => v.status === "approved");
  // K2: единственный сигнал «смету вообще показывали клиенту» — есть версия с активной
  // ссылкой-шарой; funnelStage использует это, чтобы отличить «Черновик» от «На согласовании»
  const hasActiveShare = versions.some((v) => v.shareId);
  const openVersions = () => {
    if (!savedId) { toast("Сначала сохраните смету — версии привязаны к проекту.", "warn", 5000); return; }
    setVersionsOpen(true);
    if (nav != null) wsSyncNav("versions");   // подсветка сайдбара проекта (W1) следует за модалкой
  };
  const saveVersion = (label) => {
    setVersions((prev) => [{
      id: "v_" + Date.now().toString(36),
      label: (label || "").trim() || "Версия от " + fmtDateRu(FFE.today()),
      createdAt: new Date().toISOString(),
      total: grand, clientTotal: totalClient, positions: itemsCount,
      status: "draft", statusAt: "", note: "",
      snapshot: JSON.parse(JSON.stringify({ rooms, markup, catMarkup, discount, delivery, install, extras })),
    }, ...prev]);
  };
  const restoreVersion = (v) => {
    const s = v.snapshot || {};
    setRooms(Array.isArray(s.rooms) ? s.rooms : []);
    if (typeof s.markup === "number") setMarkup(s.markup);
    setCatMarkup(s.catMarkup || {});
    setDiscount(s.discount || 0); setDelivery(s.delivery || 0); setInstall(s.install || 0); setExtras(s.extras || []);
    setEditPos(null);
    closeVersions();   // не голый setVersionsOpen(false): роут /versions обязан сброситься, иначе пункт сайдбара «Версии» мёртв (hash уже равен цели — hashchange не случится)
    toast("Версия «" + v.label + "» загружена в рабочую смету. Не забудьте сохранить.");
  };
  const patchVersion = (id, patch) => setVersions((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const setVersionStatus = (id, status) => patchVersion(id, { status, statusAt: FFE.today() });
  const removeVersion = async (v) => {
    const ok = await confirmDialog({ title: "Удалить версию?", text: "«" + v.label + "» исчезнет из истории. Рабочую смету это не меняет.", confirmLabel: "Удалить версию" });
    if (ok) setVersions((prev) => prev.filter((x) => x.id !== v.id));
  };
  /* Ч2 «клиент отклонил → аналоги» (адаптация ченджлога Programa 12.07): замена позиции
     рабочей сметы товаром-аналогом. Позицию ищем по комнате+названию (как diff версий —
     у позиций снимка нет общих id с рабочей сметой); поля старого товара затираем полями
     аналога (url/sku/габариты/фото старого товара стали бы враньём), план закупки
     (стадия/даты/платежи/трек) и переписку сохраняем — меняется товар, не слот.
     Решение клиента сбрасываем: новый товар ждёт нового решения. */
  const replaceFromAlternative = (roomName, title, product, ordinal) => {
    const p = product || {};
    const nth = Math.max(1, +ordinal || 1);   // какое по счёту вхождение title в комнате менять (дубли названий штатны)
    let ri = -1, ii = -1;
    rooms.some((r, i) => {
      if (r.name !== roomName) return false;
      let seen = 0;
      const j = (r.items || []).findIndex((it) => it.title === title && ++seen === nth);
      if (j < 0) return false;
      ri = i; ii = j; return true;
    });
    if (ri < 0) {
      toast("Позиция «" + title + "» не найдена в текущей смете — возможно, уже заменена или переименована.", "warn", 6000);
      return false;
    }
    setRooms((prev) => prev.map((r, i) => i !== ri ? r : {
      ...r,
      items: r.items.map((it, j) => {
        if (j !== ii) return it;
        return { ...it,
          title: p.title || it.title,
          cat: p.cat || it.cat,
          // unit НЕ берём у товара: blankProduct дефолтит "шт", и слот «12 м²» превращался бы
          // в «12 шт» с ценой за штуку — объём закупки принадлежит слоту, не товару
          price: Math.max(0, Math.round(+p.price || 0)),
          // рабочая смета/закупка/PDF/Excel читают it.sup (supOf, setSup, группировка листов) —
          // НЕ blankPosition.supplier: та схема в живых позициях не используется
          sup: p.sup || p.supplier || "",
          sku: p.article || p.sku || "",
          url: p.url || "",
          material: "", img: "",
          dims: p.dims && (p.dims.w || p.dims.d || p.dims.h) ? { ...p.dims } : { w: "", d: "", h: "" },
          priceDate: p.priceDate || FFE.today(),
          approve: "", approveAt: "",
        };
      }),
    }));
    // индексы не сдвигаются (тот же слот) — черновик editPos гасим только если он ровно на заменяемой строке (урок W6: чужие черновики не терять)
    setEditPos((e) => (e && e.ri === ri && e.ii === ii ? null : e));
    toast("Позиция заменена: «" + (p.title || "") + "». Не забудьте сохранить смету и отправить клиенту новую версию.");
    return true;
  };

  // «Ссылка для клиента» (волна A2): опубликовать снимок версии в портал и показать ссылку.
  // Ссылка на версию переиспользуется (снимок неизменен); первая выдача метит версию «Отправлена».
  const shareVersion = (v) => {
    let rec = v.shareId ? FFE.loadPortalShare(v.shareId) : null;
    if (!rec) {
      rec = FFE.createPortalShare({ projectId: savedId, projectName: data.name, versionId: v.id, versionLabel: v.label, snapshot: v.snapshot, studioName, studioCity: settings && settings.studioCity, studioPhone: settings && settings.studioPhone, studioEmail: settings && settings.studioEmail });
      patchVersion(v.id, { shareId: rec.shareId, status: v.status === "draft" ? "sent" : v.status, statusAt: FFE.today() });
      // «Первые шаги» на «Сегодня» (волна W3.1): честный флаг — первая настоящая выдача
      // ссылки клиенту (не повторная, см. `if (!rec)` выше)
      if (window.markOnboardStep) window.markOnboardStep("share");
    }
    setShareModal(rec);
  };

  /* --- сайдбар проекта (волна W1): раздел из адреса (s2) управляет режимом выгрузки
     и модалкой версий, а внутренние переключатели пишут адрес обратно — подсветка
     сайдбара и «назад» браузера остаются честными. Синхронизируем только смету,
     открытую роутингом (nav задан); Excel-импорт без адреса живёт как раньше. --- */
  const wsRouted = () => { const r = parseRoute(); return r.view === "cabinet" && r.tab === "projects" && r.sub ? r : null; };
  const wsSyncNav = (s2) => { const r = wsRouted(); if (r && (r.s2 || "") !== s2) setRoute("cabinet", "projects", r.sub, s2); };
  const modeToS2 = (m) => (m === "work" ? "smeta" : m);   // единственное место маппинга режим→сегмент адреса (W2: смета на 'smeta', '' — Обзор)
  usePDE(() => {
    if (nav == null) return;
    if (nav === "client" || nav === "procure" || nav === "spec") { setMode(nav); setVersionsOpen(false); }
    else if (nav === "versions") {
      if (savedId) setVersionsOpen(true);
      else { toast("Сначала сохраните смету — версии привязаны к проекту.", "warn", 5000); wsSyncNav("smeta"); }
    } else { setMode("work"); setVersionsOpen(false); }   // nav === 'smeta' (и любой неожиданный) → рабочая смета
  }, [nav]);
  const changeMode = (m) => { setMode(m); if (nav != null) wsSyncNav(modeToS2(m)); };
  const closeVersions = () => { setVersionsOpen(false); if (nav === "versions") wsSyncNav(modeToS2(mode)); };
  // текущая под-вьюха для крошки и её меню — ОДНО место (W6-ревью: было два дубля выражения,
  // рассинхрон дал бы крошку «Смета» с галкой на «Версиях»)
  const curS2 = versionsOpen ? "versions" : modeToS2(mode);

  return (
    <div className={"pd-overlay" + (nav == null ? " pd-fullscreen" : "")} role="dialog" aria-label={"Смета: " + data.name}>
      <OverlayHead onBack={guardedClose} budget={data.budget}
        crumbs={[{ label: "Проекты", onClick: guardedClose }, { label: data.name }, { label: projS2Label(curS2) }]}
        crumbMenu={nav != null && savedId ? projCrumbMenu(savedId, curS2) : null}
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

            {/* тулбар сметы (W5.0: компактные .btn-ws 28px с ring-тенью):
               прыжок по комнатам + переиспользование наработанного + версии + фильтр решения */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {mode !== "procure" && rooms.length > 1 && <RoomJumpMenu rooms={rooms} />}
              <button className="btn-ws" onClick={() => setAddOpen({ tab: "past" })}
                title="Скопировать позиции из прошлого проекта (с пометкой давности цены) или добавить типовую комплектацию">
                <I.plus size={15} />Из прошлого проекта / шаблона
              </button>
              {FFE && (
                <button className="btn-ws" onClick={openVersions} title="Снимки сметы, сравнение с текущей и статус согласования с клиентом">
                  <I.news size={15} />Версии{versions.length ? " · " + versions.length : ""}
                </button>
              )}
              {FFE && mode === "work" && itemsCount > 0 && (
                <button className="btn-ws" onClick={() => setApFilter((f) => !f)} aria-pressed={apFilter}
                  title={apFilter ? "Показать все позиции" : "Оставить только позиции, ждущие решения клиента (согласованные скрыть)"}>
                  <I.check size={15} />{apFilter ? "Показать все" : "Ждут решения · " + apWaiting}
                </button>
              )}
            </div>

            {/* наценка дизайнера: базовая на всё + свои проценты по разделам (в закупке и спецификации — без денег — не участвует) */}
            {mode !== "procure" && mode !== "spec" && <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: "16px 20px", marginBottom: 22, maxWidth: 640 }}>
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

              {/* мои стандарты наценки: применить готовый профиль (базовая+разделы+скидка+доставка+монтаж)
                 к текущему проекту одним кликом, или сохранить текущую настройку под именем */}
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--hairline-2)" }}>
                <div style={{ fontWeight: 600, fontSize: "var(--fs-13)", marginBottom: profiles.length ? 6 : 0 }}>Мои стандарты</div>
                {profiles.map((p) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--hairline-2)", fontSize: "var(--fs-12)" }}>
                    <button onClick={() => applyProfile(p)} style={{ flex: 1, minWidth: 0, textAlign: "left", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={"Применить: базовая +" + p.markupPct + "%" + (Object.keys(p.catMarkupPct || {}).length ? " · " + Object.keys(p.catMarkupPct).length + " по разделам" : "")}>
                      {p.name}
                    </button>
                    <span className="mono" style={{ color: "var(--muted)", flex: "none" }}>+{p.markupPct}%</span>
                    <button onClick={() => removeProfile(p)} className="icon-btn xs" title={"Удалить стандарт «" + p.name + "»"} aria-label={"Удалить стандарт «" + p.name + "»"} style={{ flex: "none" }}><I.close size={12} /></button>
                  </div>
                ))}
                <form onSubmit={saveProfile} style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <input className="fld" style={{ flex: "1 1 200px" }} value={profName} onChange={(e) => setProfName(e.target.value)}
                    placeholder="Название стандарта — например «Премиум»" aria-label="Название стандарта наценки" />
                  <button type="submit" className="btn btn-ghost" disabled={profSaving} style={{ padding: "7px 12px", fontSize: "var(--fs-12)", whiteSpace: "nowrap", flex: "none" }}><I.plus size={14} />Сохранить как стандарт</button>
                </form>
              </div>
            </div>}

            {/* пустая смета (новый проект / квиз / копия без сида): продающее пустое
               состояние вместо тупика — кнопка «Комната» иначе живёт только внутри
               уже существующей комнаты (Д1) */}
            {mode !== "procure" && rooms.length === 0 && (
              <EmptyState icon="plan" text={<React.Fragment>В смете пока нет комнат.<br />Добавьте первую — и наполняйте её позициями: по ссылке на товар, из библиотеки или вручную.</React.Fragment>}
                action={<button className="btn btn-primary" onClick={() => addRoomAfter(-1)}><I.plus size={16} /> Добавить первую комнату</button>} />
            )}

            {/* комнаты — читаются как документ: шапка колонок + две цены построчно.
               В «Рабочей» каждая строка редактируема (карандаш → PosEditor), комнату
               можно переименовать, позицию — добавить вручную. «Для клиента» — чистый просмотр. */}
            {mode !== "procure" && <div key={"rooms-" + mode} className="view-enter" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {rooms.map((r, ri) => (
                <div key={r.name} id={"rs-room-" + ri} className="glass" style={{ borderRadius: "var(--r-lg)", padding: "16px 18px", scrollMarginTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
                      <span style={{ fontWeight: 800, fontFamily: "var(--font-display)", fontSize: "var(--fs-16)" }}>{r.name}{r.area ? <span style={{ color: "var(--muted)", fontWeight: 500, fontSize: "var(--fs-13)" }}> · {r.area} м²</span> : null}</span>
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
                      {mode === "spec"
                        ? <span className="mono" style={{ fontSize: "var(--fs-13)", color: "var(--muted)" }}>{r.items.length + " " + plural(r.items.length, ["позиция", "позиции", "позиций"])}</span>
                        : <span className="mono" style={{ fontWeight: 600, fontSize: "var(--fs-15)", color: mode === "work" ? "var(--accent-2)" : "var(--text)" }}>{fmtMoney(roomClient(r))}</span>}
                    </span>
                  </div>
                  {/* шапка колонок */}
                  <div className="mono" style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "2px 0 6px", fontSize: "var(--fs-10)", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--spec-meta)", borderBottom: "1px solid var(--hairline)" }}>
                    {r.items.some((p) => p.img) && <span style={{ width: 38, flex: "none" }} aria-hidden="true" />}{/* слот тумбнейла — только если в комнате есть фото (иначе строки не теряют ширину) */}
                    <span style={{ flex: 1 }}>Позиция</span>
                    <span className="rs-cat" style={{ width: 78, textAlign: "right" }}>Раздел</span>
                    <span style={{ width: 62, textAlign: "right" }}>Кол</span>
                    {mode !== "spec" && <span className="rs-unit" style={{ width: 88, textAlign: "right" }}>Цена/ед.</span>}
                    {mode === "work" && <span style={{ width: 100, textAlign: "right" }}>Себест.</span>}
                    {mode !== "spec" && <span style={{ width: 104, textAlign: "right" }}>Клиенту</span>}
                    {mode === "work" && FFE && <span className="rs-ap" style={{ width: 122, textAlign: "right" }}>Статус</span>}
                    {mode === "work" && <span style={{ width: 26 }} aria-hidden="true" />}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {r.items.map((it, i) => {
                      const editing = mode === "work" && editPos && editPos.ri === ri && editPos.ii === i;
                      // фильтр «ждут решения»: согласованные строки скрываем (редактируемую — никогда)
                      if (mode === "work" && apFilter && !editing && apOf(it) === "ok") return null;
                      return (
                      <React.Fragment key={i}>
                      <div className={flashPos && flashPos.ri === ri && flashPos.ii === i ? "row-flash" : undefined}
                        style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "7px 0", borderTop: i ? "1px solid var(--hairline-2)" : "none", fontSize: "var(--fs-13)" }}>
                        {/* ведущий тумбнейл фото (паттерн Programa, плотность наша) — слот 38px зарезервирован
                           для выравнивания, но рамку/фото рисуем ТОЛЬКО когда фото есть: иначе пустой слот
                           (не «сетка коробок», flash строки просвечивает); alignSelf center при baseline-строке */}
                        {r.items.some((p) => p.img) && (it.img
                          ? <span style={{ width: 38, height: 38, flex: "none", alignSelf: "center", borderRadius: 8, overflow: "hidden", border: "1px solid var(--hairline)" }} aria-hidden="true"><Img src={it.img} label="" radius={8} /></span>
                          : <span style={{ width: 38, flex: "none" }} aria-hidden="true" />)}
                        <span style={{ flex: 1, minWidth: 0, color: "var(--text)", lineHeight: 1.4 }}>
                          {codeOf(ri, i) && <span className="mono" style={{ color: "var(--spec-meta)", fontSize: "var(--fs-11)", marginRight: 7 }}>{codeOf(ri, i)}</span>}
                          {it.title}{mode === "work" && it.priceDate && <React.Fragment>{" "}<PriceAgeChip d={it.priceDate} note={pastCopyNote(it.priceDate)} /></React.Fragment>}
                          {(() => {
                            // мета-строка FF&E-деталей под названием: материал/габариты видны и клиенту,
                            // артикул/срок — только в рабочей (закупочная деталь). dimsLabel — общий хелпер ffe.js
                            const dl = FFE && FFE.dimsLabel ? FFE.dimsLabel(it.dims) : "";
                            // спецификация (K3) — те же закупочные детали, что в рабочей: без денег, но не «для клиента» урезано
                            const fullMeta = mode === "work" || mode === "spec";
                            const parts = [
                              fullMeta && it.sku ? "арт. " + it.sku : null,
                              it.material || null,
                              dl || null,
                              fullMeta && it.leadWeeks ? it.leadWeeks + " нед." : null,
                              fullMeta && it.wastePct ? "запас " + it.wastePct + "%" : null,
                            ].filter(Boolean);
                            return parts.length ? <div className="mono" style={{ fontSize: "var(--fs-10)", color: "var(--spec-meta)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{parts.join(" · ")}</div> : null;
                          })()}
                        </span>
                        <span className="rs-cat" style={{ color: "var(--spec-meta)", whiteSpace: "nowrap", fontSize: "var(--fs-12)", width: 78, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis" }}>{catOf(it)}</span>
                        <span className="mono" style={{ color: "var(--spec-meta)", whiteSpace: "nowrap", width: 62, textAlign: "right", fontSize: "var(--fs-12)", overflow: "hidden", textOverflow: "ellipsis" }}>{FFE.qtyLabel(it)}</span>
                        {mode !== "spec" && <span className="mono rs-unit" style={{ color: "var(--spec-meta)", whiteSpace: "nowrap", width: 88, textAlign: "right", fontSize: "var(--fs-12)" }}>{fmtMoney(mode === "client" ? unitClient(it) : it.price)}</span>}
                        {mode === "work" && <span className="mono" style={{ color: "var(--muted)", whiteSpace: "nowrap", width: 100, textAlign: "right" }}>{fmtMoney(lineCost(it))}</span>}
                        {/* RRP-слой (п.17): под суммой клиенту — выгода от розницы (только положительная, витрина); спецификация — без денег вообще */}
                        {mode !== "spec" && (
                          <span className="mono" style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", fontWeight: 600, whiteSpace: "nowrap", width: 104, textAlign: "right", color: mode === "work" ? "var(--accent-2)" : "var(--text)" }}>
                            {fmtMoney(lineClient(it))}
                            {cp.lineSavings(it) > 0 && <span style={{ fontSize: "var(--fs-10)", fontWeight: 500, color: "var(--accent-2-ink)" }}>выгода {fmtMoney(cp.lineSavings(it))}</span>}
                          </span>
                        )}
                        {mode === "work" && FFE && (
                          <FunnelChip it={it} hasActiveShare={hasActiveShare}
                            onChangeApprove={(id) => setApprove(ri, i, id)}
                            onOpenProcure={() => setMode("procure")} />
                        )}
                        {mode === "work" && (
                          <button className="icon-btn xs" aria-label={"Редактировать позицию «" + it.title + "»"} aria-expanded={!!editing} title="Редактировать позицию"
                            onClick={() => setEditPos(editing ? null : { ri, ii: i })}
                            style={{ flex: "none", alignSelf: "center", color: editing ? "var(--accent-ink)" : "var(--spec-meta)" }}>
                            <I.edit size={14} />
                          </button>
                        )}
                      </div>
                      {editing && (() => {
                        // W5.3: соседний индекс без пропусков — фильтр «ждут решения» прячет строку
                        // ТОЛЬКО когда она не редактируется (см. `!editing` в гварде рендера выше),
                        // а prev/next сам делает целевую позицию editing → она рендерится в любом случае
                        const adjIdx = (dir) => { const j = i + dir; return j >= 0 && j < r.items.length ? j : null; };
                        return (
                          <PosEditor item={it} cats={cats} sups={supList} library={library} onToLibrary={saveToLibrary}
                            supBook={supBook} onToSupBook={saveToSupBook}
                            markup={markup} catMarkup={catMarkup} codeHint={codeOf(ri, i)}
                            posNav={{ index: i, total: r.items.length, prev: adjIdx(-1), next: adjIdx(1),
                              go: (j, draft) => { if (draft) savePos(ri, i, draft); setEditPos({ ri, ii: j }); } }}
                            onCancel={() => setEditPos(null)} onSave={(d) => savePos(ri, i, d)} onDelete={() => removePos(ri, i)} />
                        );
                      })()}
                      </React.Fragment>
                      );
                    })}
                  </div>
                  {mode === "work" && FFE && apFilter && r.items.length > 0 && !(editPos && editPos.ri === ri && editPos.ii >= 0)
                    && r.items.every((it) => apOf(it) === "ok") && (
                    <div style={{ padding: "8px 0 2px", fontSize: "var(--fs-12)", color: "var(--muted)" }}>Все позиции комнаты согласованы клиентом ✓</div>
                  )}
                  {mode === "work" && (editPos && editPos.ri === ri && editPos.ii === -1
                    ? <PosEditor isNew cats={cats} sups={supList} library={library} onToLibrary={saveToLibrary}
                        supBook={supBook} onToSupBook={saveToSupBook} markup={markup} catMarkup={catMarkup}
                        onCancel={() => setEditPos(null)} onSave={(d) => savePos(ri, -1, d)} />
                    : <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                        {/* Д1 (W6): инлайн-панель добавления в контексте комнаты — паттерн Programa
                           «строка вставки между секциями»; «По ссылке» первым с искоркой (клиппер) */}
                        <button className="btn-ws" onClick={() => setAddOpen({ tab: "clip", room: r.name })}
                          title={"Вставить ссылку на товар — клиппер извлечёт название и цену сразу в комнату «" + r.name + "»"}>
                          <I.spark size={14} style={{ color: "var(--accent)" }} />По ссылке</button>
                        {FFE && <button className="btn-ws" onClick={() => setPickerRoom(ri)}><I.layers size={14} />Из библиотеки</button>}
                        <button className="btn-ws" onClick={() => setEditPos({ ri, ii: -1 })}>
                          <I.plus size={14} />Вручную{ri === 0 && <span className="kbd">N</span>}</button>
                        <button className="btn-ws" onClick={() => addRoomAfter(ri)} title="Добавить новую комнату после этой">
                          <I.plan size={14} />Комната</button>
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
                      <span style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, fontFamily: "var(--font-display)", fontSize: "var(--fs-16)", color: g.name === NO_SUP ? "var(--muted)" : undefined }}>
                          {g.name}<span style={{ color: "var(--faint)", fontWeight: 500, fontSize: "var(--fs-13)" }}> · {g.rows.length} {plural(g.rows.length, ["позиция", "позиции", "позиций"])}</span>
                        </span>
                        {/* K5a: контакты поставщика из адресной книги — прямо там, где дизайнер звонит/пишет по заказу */}
                        {g.name !== NO_SUP && <SupplierContactChip book={supBook} name={g.name} />}
                      </span>
                      <span style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                        {FFE && <span className="mono" title="Средний прогресс стадий закупки позиций поставщика" style={{ fontSize: "var(--fs-11)", color: "var(--spec-meta)" }}>готовность {Math.round(rowsProgress(g.rows) * 100)}%</span>}
                        <span className="mono" style={{ fontWeight: 600, fontSize: "var(--fs-15)" }}>{fmtMoney(g.total)}</span>
                      </span>
                    </div>
                    <div className="mono" style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "2px 0 6px", fontSize: "var(--fs-10)", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--spec-meta)", borderBottom: "1px solid var(--hairline)" }}>
                      {g.rows.some((x) => x.it.img) && <span style={{ width: 38, flex: "none" }} aria-hidden="true" />}{/* слот тумбнейла — только если в группе есть фото */}
                      <span style={{ flex: 1 }}>Позиция</span>
                      <span className="rs-cat" style={{ width: 104, textAlign: "right" }}>Помещение</span>
                      <span style={{ width: 62, textAlign: "right" }}>Кол</span>
                      <span className="rs-unit" style={{ width: 88, textAlign: "right" }}>Цена/ед.</span>
                      <span style={{ width: 100, textAlign: "right" }}>Сумма</span>
                      <span style={{ width: 128, textAlign: "right" }}>Поставщик</span>
                      {FFE && <span style={{ width: 130, textAlign: "right" }}>Стадия</span>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {g.rows.map((x, i) => {
                        const editingPay = payEdit && payEdit.ri === x.ri && payEdit.ii === x.ii;
                        const due = dueOf(x.it), dueColor = urgentColor(due);
                        return (
                          <React.Fragment key={x.ri + ":" + x.ii}>
                          <div className={"rs-prow" + (flashSup && flashSup.ri === x.ri && flashSup.ii === x.ii ? " row-flash" : "")} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "7px 0", borderTop: i ? "1px solid var(--hairline-2)" : "none", fontSize: "var(--fs-13)" }}>
                            {g.rows.some((y) => y.it.img) && (x.it.img
                              ? <span style={{ width: 38, height: 38, flex: "none", alignSelf: "center", borderRadius: 8, overflow: "hidden", border: "1px solid var(--hairline)" }} aria-hidden="true"><Img src={x.it.img} label="" radius={8} /></span>
                              : <span style={{ width: 38, flex: "none" }} aria-hidden="true" />)}
                            <span style={{ flex: 1, minWidth: 0, color: "var(--text)", lineHeight: 1.4, overflowWrap: "anywhere" }}>
                              {x.it.title}
                              {x.it.priceDate && <React.Fragment>{" "}<PriceAgeChip d={x.it.priceDate} note={pastCopyNote(x.it.priceDate)} /></React.Fragment>}
                              {x.it.track && x.it.track.number && (
                                <React.Fragment>{" "}
                                  {x.it.track.url
                                    ? <a className="mono" href={x.it.track.url} target="_blank" rel="noopener noreferrer" title="Отследить отправление" style={{ fontSize: "var(--fs-10)", color: "var(--info)" }}>№{x.it.track.number}</a>
                                    : <span className="mono" style={{ fontSize: "var(--fs-10)", color: "var(--spec-meta)" }} title="Трек-номер отправления">№{x.it.track.number}</span>}
                                </React.Fragment>
                              )}
                            </span>
                            <span className="rs-cat" style={{ color: "var(--spec-meta)", whiteSpace: "nowrap", fontSize: "var(--fs-12)", width: 104, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis" }}>{x.room}</span>
                            <span className="mono" style={{ color: "var(--spec-meta)", whiteSpace: "nowrap", width: 62, textAlign: "right", fontSize: "var(--fs-12)", overflow: "hidden", textOverflow: "ellipsis" }}>{FFE.qtyLabel(x.it)}</span>
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
                            {FFE && (
                              <button className="icon-btn xs" aria-label={"Оплата и сроки позиции «" + x.it.title + "»"} aria-expanded={!!editingPay}
                                title={dueColor ? "Есть непогашенные даты" : "Оплата и сроки"} onClick={() => setPayEdit(editingPay ? null : { ri: x.ri, ii: x.ii })}
                                style={{ flex: "none", alignSelf: "center", position: "relative", color: editingPay ? "var(--accent-ink)" : "var(--spec-meta)" }}>
                                <I.wallet size={14} />
                                {dueColor && <span aria-hidden="true" style={{ position: "absolute", top: -1, right: -1, width: 7, height: 7, borderRadius: "50%", background: dueColor, border: "1.5px solid var(--surface)" }} />}
                              </button>
                            )}
                          </div>
                          {editingPay && (
                            <PayTrackEditor item={x.it} onCancel={() => setPayEdit(null)} onSave={(patch) => savePayTrack(x.ri, x.ii, patch)} />
                          )}
                          </React.Fragment>
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

            {/* итог документа: подытог → скидка → наценка → доставка/монтаж → ИТОГО (роадмап #6); спецификация — без денег, весь блок скрыт */}
            {mode !== "procure" && mode !== "spec" && <div key={"totwork-" + mode} className="glass view-enter" style={{ borderRadius: "var(--r-lg)", padding: "16px 20px", marginTop: 18, maxWidth: 560, marginLeft: "auto" }}>
              <div className="mono" style={{ fontSize: "var(--fs-10)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--spec-meta)", paddingBottom: 8, borderBottom: "1px solid var(--hairline)" }}>Итог сметы</div>
              {mode === "work" && (
                <React.Fragment>
                  <div style={RS_ROW}>
                    <span style={{ color: "var(--muted)" }}>Подытог — себестоимость (фабрика)</span>
                    <span className="mono rs-val">{fmtMoney(grand)}</span>
                  </div>
                  <div style={{ ...RS_ROW, borderTop: "1px solid var(--hairline-2)" }}>
                    <span style={{ color: "var(--muted)" }}>Наценка дизайнера {ovrCount > 0 ? "· по разделам " : ""}{markupLabel}</span>
                    <span className="mono rs-val" style={{ color: "var(--accent-2-ink)" }}>+{fmtMoney(markupAmt)}</span>
                  </div>
                </React.Fragment>
              )}
              {(mode === "work" || discountAmt > 0 || delivery > 0 || install > 0 || extrasAmt > 0) && (
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
                  {/* доп. сборы (доставка/монтаж/НДС/кастом) — редактируемый список поверх Доставки/Монтажа выше */}
                  {extras.map((ex) => {
                    const exAmt = FFE.extraAmount(ex, client - discountAmt);
                    return (
                      <div key={ex.id} style={{ ...RS_ROW, borderTop: "1px solid var(--hairline-2)" }}>
                        <span style={{ color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          {ex.label}
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <input className="fld" type="number" min="0" max={ex.kind === "percent" ? 100 : 1000000} step={ex.kind === "percent" ? 1 : 500} inputMode="numeric"
                              value={ex.value || ""} placeholder="0" aria-label={ex.label + ", " + (ex.kind === "percent" ? "%" : "₽")}
                              onKeyDown={(e) => { if (!e.ctrlKey && !e.metaKey && ["e", "E", "+", "-", ".", ","].includes(e.key)) e.preventDefault(); }}
                              onChange={(e) => { const v = e.target.value; const cap = ex.kind === "percent" ? 100 : 1000000; const n = v === "" ? 0 : Math.max(0, Math.min(cap, Math.round(+v))); if (!isNaN(n)) setExtras((xs) => xs.map((x) => (x.id === ex.id ? { ...x, value: n } : x))); }}
                              style={{ width: ex.kind === "percent" ? 56 : 88, padding: "5px 8px", fontSize: "var(--fs-12)", fontFamily: "var(--font-mono)", textAlign: "right" }} />
                            <span className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--spec-meta)" }}>{ex.kind === "percent" ? "%" : "₽"}</span>
                          </span>
                          <button type="button" className="icon-btn xs" aria-label={"Удалить сбор «" + ex.label + "»"} title="Удалить сбор"
                            onClick={() => setExtras((xs) => xs.filter((x) => x.id !== ex.id))} style={{ color: "var(--spec-meta)" }}>
                            <I.close size={12} />
                          </button>
                        </span>
                        <span className="mono rs-val" style={{ color: exAmt > 0 ? undefined : "var(--faint)" }}>{exAmt > 0 ? "+" + fmtMoney(exAmt) : "—"}</span>
                      </div>
                    );
                  })}
                  <div style={{ ...RS_ROW, borderTop: "1px solid var(--hairline-2)" }}>
                    {addCustomOpen ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap", width: "100%" }}>
                        <input className="fld" value={customLabel} placeholder="Название сбора" autoFocus onChange={(e) => setCustomLabel(e.target.value)}
                          style={{ width: 140, padding: "5px 8px", fontSize: "var(--fs-12)" }} />
                        <select className="fld" value={customKind} aria-label="Тип сбора" onChange={(e) => setCustomKind(e.target.value)} style={{ padding: "5px 6px", fontSize: "var(--fs-12)" }}>
                          <option value="fixed">₽</option>
                          <option value="percent">%</option>
                        </select>
                        <button type="button" className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: "var(--fs-12)" }}
                          disabled={!customLabel.trim()}
                          onClick={() => { setExtras((xs) => [...xs, FFE.blankExtra({ label: customLabel, kind: customKind, value: 0 })]); setCustomLabel(""); setCustomKind("fixed"); setAddCustomOpen(false); }}>
                          Добавить
                        </button>
                        <button type="button" className="icon-btn xs" aria-label="Отменить добавление сбора" onClick={() => { setAddCustomOpen(false); setCustomLabel(""); }}><I.close size={12} /></button>
                      </span>
                    ) : (
                      <span className="pd-add-extra" style={{ position: "relative", display: "inline-flex" }}>
                        <button type="button" className="btn btn-ghost" aria-haspopup="menu" aria-expanded={addExtraOpen}
                          style={{ padding: "4px 10px", fontSize: "var(--fs-12)", color: "var(--muted)" }} onClick={() => setAddExtraOpen((o) => !o)}>
                          + Добавить сбор
                        </button>
                        <MenuPop open={addExtraOpen} label="Добавить сбор">
                          {FFE.EXTRA_PRESETS.map((p) => (
                            <button key={p.key} role="menuitem" className="menu-item" onClick={() => { setExtras((xs) => [...xs, FFE.blankExtra(p)]); setAddExtraOpen(false); }}>{p.label}</button>
                          ))}
                          <button role="menuitem" className="menu-item" onClick={() => { setAddExtraOpen(false); setAddCustomOpen(true); }}>Другое…</button>
                        </MenuPop>
                      </span>
                    )}
                  </div>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  {discountAmt > 0 && <div style={{ ...RS_ROW, borderTop: "1px solid var(--hairline-2)" }}><span style={{ color: "var(--muted)" }}>Скидка −{discount}%</span><span className="mono rs-val">−{fmtMoney(discountAmt)}</span></div>}
                  {delivery > 0 && <div style={{ ...RS_ROW, borderTop: "1px solid var(--hairline-2)" }}><span style={{ color: "var(--muted)" }}>Доставка</span><span className="mono rs-val">+{fmtMoney(delivery)}</span></div>}
                  {install > 0 && <div style={{ ...RS_ROW, borderTop: "1px solid var(--hairline-2)" }}><span style={{ color: "var(--muted)" }}>Монтаж и сборка</span><span className="mono rs-val">+{fmtMoney(install)}</span></div>}
                  {extras.map((ex) => {
                    const exAmt = FFE.extraAmount(ex, client - discountAmt);
                    return exAmt > 0 ? (
                      <div key={ex.id} style={{ ...RS_ROW, borderTop: "1px solid var(--hairline-2)" }}>
                        <span style={{ color: "var(--muted)" }}>{ex.label}</span>
                        <span className="mono rs-val">+{fmtMoney(exAmt)}</span>
                      </div>
                    ) : null;
                  })}
                </React.Fragment>
              )}
              {/* ИТОГО — жирная чертёжная линия + крупный mono */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, paddingTop: 12, marginTop: 4, borderTop: "2px solid var(--text)" }}>
                <span style={{ fontWeight: 800, fontFamily: "var(--font-display)", fontSize: "var(--fs-15)" }}>{mode === "work" ? "Итого для клиента" : "Итого"}</span>
                <span id="rs-total-val" className="mono rs-val" style={{ fontWeight: 600, fontSize: "var(--fs-24)", letterSpacing: "-0.01em" }} aria-live="off">{fmtMoney(totalClient)}</span>
              </div>
              {/* RRP-слой (п.17): выгода клиента от розницы — витринная строка под итогом, только когда
                  суммарная выгода положительна (по позициям с заданной розницей; та же математика в PDF/Excel/портале) */}
              {cp.savings > 0 && (
                <div className="mono" style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--hairline-2)", fontSize: "var(--fs-11)", color: "var(--accent-2-ink)" }}>
                  Розница в магазинах {fmtMoney(cp.rrpTotal)} — выгода клиента {fmtMoney(cp.savings)}
                </div>
              )}
              {/* паспорт свежести цен: та же честная нижняя граница, что уходит в PDF/Excel */}
              {fresh && (
                <div className="mono" style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--hairline-2)", fontSize: "var(--fs-11)", color: fresh.stale ? "var(--accent-ink)" : "var(--spec-meta)" }}>
                  {fresh.checked === fresh.total ? "Цены проверены не позднее " : "Цены проверены у " + fresh.checked + " из " + fresh.total + " позиций — не позднее "}
                  {fmtDateRu(fresh.oldest)}{fresh.stale ? " · рекомендуем перепроверить" : ""}
                </div>
              )}
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

          {/* итог (sticky); в пустой смете (0 комнат) не рендерим — полупрозрачная полоса
             перекрывала бы кнопку «Добавить первую комнату» пустого состояния (elementFromPoint).
             Панель несёт не только сумму, но и переключатель режимов + экспорт/сохранение — поэтому
             в спецификации (K3, без денег) остаётся сама панель, скрыта только сумма (SmetaTotal). */}
          {rooms.length > 0 && <div className="pd-cart">
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              {/* без aria-live: сумму при драге озвучивает aria-valuetext слайдера; live — только статус бюджета */}
              {/* статус — с суммой бюджета: на ≤560px чип шапки скрыт, и это единственная цифра бюджета */}
              {mode === "spec"
                ? <span className="mono" style={{ fontSize: "var(--fs-13)", color: "var(--muted)" }}>{itemsCount} {plural(itemsCount, ["позиция", "позиции", "позиций"])}</span>
                : <SmetaTotal amount={mode === "procure" ? grand : totalClient}
                    caption={<React.Fragment>{mode === "procure" ? "итого закупка" : "итого клиенту"} · {itemsCount} {plural(itemsCount, ["позиция", "позиции", "позиций"])} · <span role="status" aria-atomic="true">{over ? <span style={{ color: "var(--accent-ink)" }}>закупка сверх бюджета {fmtMoney(data.budget)}</span> : <span style={{ color: "var(--accent-2)" }}>закупка в бюджете {fmtMoney(data.budget)}</span>}</span></React.Fragment>} />}
              {mode === "work" && (() => {
                // Д4 (W6): раскладка итога по образцу Financial-полосы Programa — свёрнуто
                // наценка + маржа (ключевой взгляд дизайнера), кнопка ›/‹ разворачивает
                // метрики «значение над подписью». Цепочка профита идёт подряд
                // (себестоимость → наценка → скидка → маржа), транзитные доставка/монтаж —
                // в конце с явной подписью «вне наценки», чтобы «+» не читался слагаемым маржи.
                // Маржа после скидки: убыток — терракотой, не оливой-успехом.
                const marginTone = margin < 0 ? "var(--accent-ink)" : "var(--accent-2)";
                return (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    {cartOpen ? (
                      <span style={{ display: "inline-flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                        <CartMetric v={fmtMoney(grand)} cap="себестоимость" />
                        <CartMetric v={"+" + fmtMoney(markupAmt)} cap={"наценка " + markupLabel} />
                        {discountAmt > 0 && <CartMetric v={"−" + fmtMoney(discountAmt)} cap={"скидка " + discount + "%"} tone="var(--accent-ink)" />}
                        <CartMetric v={fmtMoney(margin)} cap="ваша маржа" tone={marginTone} />
                        {(delivery > 0 || install > 0 || extrasAmt > 0) && <CartMetric v={fmtMoney(delivery + install + extrasAmt)} cap="доставка/монтаж/сборы · вне наценки" />}
                      </span>
                    ) : (
                      <span className="glass mono" style={{ padding: "7px 12px", borderRadius: 99, fontSize: "var(--fs-12)", fontWeight: 500, color: "var(--muted)" }}>
                        наценка {markupLabel} · маржа <b style={{ color: marginTone, fontWeight: 600 }}>{fmtMoney(margin)}</b>
                      </span>
                    )}
                    <button className="btn-mini" onClick={() => setCartOpen((o) => !o)} aria-expanded={cartOpen}
                      aria-label={cartOpen ? "Свернуть раскладку итога" : "Показать раскладку итога: себестоимость, наценка, скидка, доставка"}
                      title={cartOpen ? "Свернуть" : "Раскладка итога"}>
                      {/* базовый шеврон смотрит вниз: -90° = «›» (раскрыть), 90° = «‹» (свернуть) */}
                      <I.chevron size={12} stroke={2.4} style={{ transform: cartOpen ? "rotate(90deg)" : "rotate(-90deg)", transition: "transform .15s var(--ease-pop)" }} />
                    </button>
                  </span>
                );
              })()}
              <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <SegTabs className="spec-mode" cap="Выгрузка" ariaLabel="Режим выгрузки" value={mode} onChange={changeMode}
                  items={[
                    { id: "work", label: "Рабочая", title: "Рабочая смета: себестоимость, наценка и цена клиента" },
                    { id: "spec", label: "Спецификация", title: "Спецификация без денег: артикул, материал, габариты, срок — для подрядчика или печати" },
                    { id: "client", label: "Для клиента", title: "Для клиента: только итоговая цена, без себестоимости и наценки" },
                    { id: "procure", label: "Закупка", title: "Закупочный лист: только себестоимость, группировка по поставщикам, в Excel — лист на поставщика" },
                  ]} />
                <button className="btn btn-ghost" style={{ padding: "11px 16px" }} onClick={exportXLSX}><I.grid size={16} />Выгрузить Excel</button>
                <button className="btn btn-ghost" style={{ padding: "11px 16px" }} onClick={exportPDF}><I.layers size={16} />Выгрузить PDF</button>
                <button className="btn btn-primary" style={{ padding: "11px 18px" }} onClick={saveRoom} disabled={roomSaving}>{roomSaved ? <React.Fragment><I.check size={16} />Сохранено</React.Fragment> : <React.Fragment><I.check size={16} />Сохранить смету</React.Fragment>}</button>
              </div>
            </div>
          </div>}
        </div>
      </div>
      {addOpen && <AddPositionsModal excludeId={savedId} roomNames={rooms.map((r) => r.name)}
        initialTab={addOpen.tab} initialRoom={addOpen.room} onClose={() => setAddOpen(null)} onAdd={addFrom} />}
      {versionsOpen && (
        <VersionsModal versions={versions} current={{ project: data.name, studioName, studioContact, rooms, grand, totalClient, itemsCount }}
          onSave={saveVersion} onRestore={restoreVersion} onSetStatus={setVersionStatus}
          onPatch={patchVersion} onRemove={removeVersion} onShare={shareVersion} onClose={closeVersions}
          projectId={savedId} onReplacePos={replaceFromAlternative} />
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
/* ---------------- Ч2: ЗАМЕНЫ ПО ОТВЕТУ КЛИЕНТА (адаптация ченджлога Programa 12.07) ----------------
   Клиент отклонил / отправил на пересмотр позицию в портале → подбираем аналоги из УЖЕ
   собранного дизайнером: библиотека товаров + позиции прошлых проектов (скоринг —
   LedgerFFE.suggestAlternatives; фид фабрик подключится тем же интерфейсом, роадмап §2).
   «Заменить» правит рабочую смету через onReplace (RoomSpecOverlay.replaceFromAlternative);
   снимок отправленной версии не трогаем — он исторический документ. */
function AlternativesModal({ rejected, projectId, onReplace, onClose }) {
  const FFE = window.LedgerFFE;
  const [cands, setCands] = usePD(null);   // null = грузим; [] = источники пусты
  const [done, setDone] = usePD({});       // room¶title → название замены (в этой сессии)
  usePDE(() => {
    let alive = true;
    Promise.all([
      LedgerAPI.library.list().catch(() => []),
      LedgerAPI.projects.list()
        .then((list) => Promise.all(list.filter((p) => p.id !== projectId).map((p) => LedgerAPI.projects.get(p.id).catch(() => null))))
        .catch(() => []),
    ]).then(([lib, projs]) => {
      if (!alive) return;
      const fromLib = (lib || []).map((x) => ({ ...x, _src: "библиотека" }));
      const fromProjects = (projs || []).filter((p) => p && p.rooms).flatMap((p) =>
        (p.rooms || []).flatMap((r) => (r.items || []).map((it) => ({ ...FFE.productFromPosition(it), _src: p.name }))));
      setCands([...fromLib, ...fromProjects]);
    });
    return () => { alive = false; };
  }, []);
  // скоринг всей выдачи один раз на загрузку кандидатов: пул большой (библиотека + все
  // прошлые проекты), а клик «Заменить» (setDone) выдачу не меняет — без memo каждый клик
  // перегонял бы полный O(отклонённые × кандидаты) проход заново
  const scored = React.useMemo(() => {
    if (!cands) return {};
    const out = {};
    rejected.forEach((rj) => { out[rj.room + "¶" + rj.title + "¶" + rj.ordinal] = FFE.suggestAlternatives(rj, cands, 4); });
    return out;
  }, [cands, rejected]);
  return (
    <Modal onClose={onClose} label="Замены по ответу клиента" maxWidth={680}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "20px 24px", borderBottom: "1px solid var(--hairline)" }}>
        <div>
          <h3 className="display" style={{ fontSize: "var(--fs-21)" }}>Замены по ответу клиента</h3>
          <div style={{ fontSize: "var(--fs-13)", color: "var(--muted)", marginTop: 3 }}>Аналоги из вашей библиотеки и прошлых проектов — замена правит рабочую смету</div>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Закрыть"><I.close size={18} /></button>
      </div>
      <div style={{ padding: "16px 24px 20px", display: "flex", flexDirection: "column", gap: 14, maxHeight: "62vh", overflow: "auto" }}>
        {!cands && <div className="glass skel" style={{ borderRadius: "var(--r-lg)", height: 120 }} />}
        {cands && rejected.map((rj) => {
          // ordinal в ключе: две отклонённые позиции с одним названием в комнате — разные карточки
          const key = rj.room + "¶" + rj.title + "¶" + rj.ordinal;
          const am = FFE.approveMeta(rj.approve);
          const sugg = scored[key] || [];
          return (
            <div key={key} className="glass" style={{ borderRadius: "var(--r-lg)", padding: "13px 15px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: "var(--fs-14)", flex: 1, minWidth: 160 }}>{rj.title}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--fs-11)", fontWeight: 700, color: am.color, whiteSpace: "nowrap" }}>
                  <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: am.color, flex: "none" }} />{am.label}
                </span>
              </div>
              <div className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--spec-meta)", marginTop: 3 }}>
                {rj.room}{rj.cat ? " · " + rj.cat : ""} · {fmtMoney(rj.price)}
              </div>
              {rj.comment && (
                <div style={{ fontSize: "var(--fs-12)", color: "var(--muted)", fontStyle: "italic", marginTop: 6 }}>Клиент: «{rj.comment}»</div>
              )}
              {done[key] ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: "var(--fs-13)", fontWeight: 600, color: "var(--accent-2-ink)" }}>
                  <I.check size={15} style={{ flex: "none" }} />Заменено на «{done[key]}» — сохраните смету и отправьте клиенту новую версию
                </div>
              ) : sugg.length === 0 ? (
                <div style={{ fontSize: "var(--fs-13)", color: "var(--muted)", marginTop: 10 }}>
                  Похожего в библиотеке и прошлых проектах не нашлось. Добавьте аналог по ссылке на товар — клиппер затянет карточку.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", marginTop: 8 }}>
                  {sugg.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i ? "1px solid var(--hairline-2)" : "none" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "var(--fs-13)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.product.title}</div>
                        <div className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--spec-meta)", marginTop: 2 }}>
                          {s.product._src}{s.product.sup ? " · " + s.product.sup : ""}
                        </div>
                      </div>
                      {s.priceDeltaPct != null && s.priceDeltaPct !== 0 && (
                        <span className="mono" style={{ fontSize: "var(--fs-11)", fontWeight: 700, flex: "none", color: s.priceDeltaPct < 0 ? "var(--accent-2-ink)" : "var(--accent-ink)" }}>
                          {s.priceDeltaPct < 0 ? "−" : "+"}{Math.abs(s.priceDeltaPct)}%
                        </span>
                      )}
                      <span className="mono" style={{ fontSize: "var(--fs-13)", fontWeight: 600, flex: "none", whiteSpace: "nowrap" }}>{fmtMoney(s.product.price)}</span>
                      <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: "var(--fs-12)", flex: "none" }}
                        onClick={() => { if (onReplace(rj.room, rj.title, s.product, rj.ordinal)) setDone((d) => ({ ...d, [key]: s.product.title })); }}>
                        Заменить
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function VersionsModal({ versions, current, onSave, onRestore, onSetStatus, onPatch, onRemove, onShare, onClose, projectId, onReplacePos }) {
  const FFE = window.LedgerFFE;
  const [label, setLabel] = usePD("");
  const [compareId, setCompareId] = usePD(null);
  const [cmtOpenId, setCmtOpenId] = usePD(null);   // id версии, у которой раскрыты комментарии-треды
  const [cmtTick, setCmtTick] = usePD(0);          // бампается после ответа студии — форсирует перечитать shareId из хранилища
  const [altList, setAltList] = usePD(null);       // Ч2: отклонённые позиции версии для модалки аналогов | null
  // живой портал (A2): при открытии «Версий» подтягиваем свежие шары с сервера —
  // ответы клиента с ЕГО устройства иначе не доехали бы до кабинета (кэш локальный).
  // Бамп cmtTick форсирует перечитать кэш после гидрации; без API — no-op
  usePDE(() => {
    const PAPI = window.LedgerPortalAPI;
    if (!PAPI || !PAPI.remote()) return;
    let alive = true;
    Promise.all(versions.filter((v) => v.shareId).map((v) => PAPI.hydrate(v.shareId)))
      .then(() => { if (alive) setCmtTick((t) => t + 1); });
    return () => { alive = false; };
  }, []);
  const fmtDT = (iso) => (iso && iso.length >= 10 ? iso.slice(8, 10) + "." + iso.slice(5, 7) + "." + iso.slice(0, 4) : "");
  const commentsCount = (sh) => (sh && sh.snapshot && Array.isArray(sh.snapshot.rooms)
    ? sh.snapshot.rooms.reduce((s, r) => s + (r.items || []).reduce((x, it) => x + ((it.comments || []).length), 0), 0) : 0);
  // Ч2: отклонённые/на пересмотр позиции снимка шары — кандидаты на замену аналогом.
  // Последний комментарий клиента едет рядом: он объясняет, ЧТО не понравилось.
  // ordinal — номер вхождения названия в комнате (дубли названий здесь штатны, см. agg):
  // различает две отклонённые «Кресло» и адресует замену в правильный слот, а не в первый
  const rejectedOf = (sh) => {
    const out = [];
    if (!sh || !sh.snapshot) return out;
    (sh.snapshot.rooms || []).forEach((r) => {
      const seen = {};
      (r.items || []).forEach((it) => {
        const ord = (seen[it.title] = (seen[it.title] || 0) + 1);
        if (it.approve !== "rejected" && it.approve !== "revise") return;
        const lastClient = (it.comments || []).filter((c) => c.author === "client").slice(-1)[0];
        out.push({ room: r.name, title: it.title, ordinal: ord, price: it.price || 0, cat: it.cat || "",
          approve: it.approve, comment: lastClient ? lastClient.text : "" });
      });
    });
    return out;
  };

  // комната + название → {qty, себестоимость}; дубликаты строк складываются
  const agg = (rooms) => {
    const m = new Map();
    (rooms || []).forEach((r) => (r.items || []).forEach((it) => {
      const k = r.name + "¶" + it.title;
      const e = m.get(k) || { title: it.title, qty: 0, total: 0 };
      e.qty += it.qty || 1; e.total += FFE ? FFE.lineTotal(it) : (it.price || 0) * (it.qty || 1);   // себестоимость с запасом
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
          <EmptyState compact icon="news" text={<React.Fragment>Пока нет сохранённых версий.<br />Сохраните снимок перед отправкой клиенту — и отмечайте статус согласования по ответу.</React.Fragment>} />
        )}

        {versions.map((v) => {
          const sm = FFE.vStatusMeta(v.status);
          const d = compareId === v.id ? diff(v) : null;
          // ответ клиента через портал (волна A2): читаем шару версии
          const sh = v.shareId && FFE.loadPortalShare ? FFE.loadPortalShare(v.shareId) : null;
          const shOk = sh && sh.snapshot ? (sh.snapshot.rooms || []).reduce((s, r) => s + (r.items || []).filter((it) => it.approve === "ok").length, 0) : 0;
          const cmCount = commentsCount(sh);
          const rejected = sh ? rejectedOf(sh) : [];
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
                {/* Ч4 «клиент открыл» — визиты по ссылке портала (считаются все открытия, вкл. предпросмотр дизайнера) */}
                {sh && sh.visits && sh.visits.count > 0 ? " · портал открыт " + sh.visits.count + " " + plural(sh.visits.count, ["раз", "раза", "раз"]) + (sh.visits.lastAt ? " · посл. " + fmtDT(sh.visits.lastAt) : "") : ""}
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
                {/* Ч2: клиент отклонил/на пересмотр → подбор замен из библиотеки и прошлых проектов */}
                {rejected.length > 0 && (
                  <button className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: "var(--fs-12)", color: "var(--accent-ink)" }}
                    onClick={() => setAltList(rejected)}
                    title="Клиент отклонил или отправил на пересмотр — подобрать замены из библиотеки и прошлых проектов">
                    <I.spark size={14} />Подобрать замены · {rejected.length}
                  </button>
                )}
                <button className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: "var(--fs-12)" }}
                  onClick={() => withLib("pdf", () => LedgerPDF.exportApprovalProtocol({
                    project: current.project, versionLabel: v.label, createdAt: v.createdAt,
                    vStatusLabel: sm.label, statusAt: v.statusAt, respondedAt: sh && sh.respondedAt,
                    studioName: (sh && sh.studioName) || current.studioName,
                    studioContact: (sh && [sh.studioCity, sh.studioPhone, sh.studioEmail].filter(Boolean).join(" · ")) || current.studioContact,
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
      {altList && <AlternativesModal rejected={altList} projectId={projectId} onReplace={onReplacePos} onClose={() => setAltList(null)} />}
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

/* ---------------- ЕДИНЫЙ СТАТУС-ЧИП СТРОКИ (K2, паттерн Programa «один дропдаун») ----------------
   Сводит решение клиента (approve) и стадию закупки (status) в одну колонку вместо
   двух раздельных панелей смета/закупка — FFE.funnelStage считает, какая половина
   актуальна. До заказа — редактируемый селект (то же поведение, что раньше «Клиент
   решил», просто с точным словом «Черновик»/«На согласовании» вместо общего «Ждёт
   решения»); с ordered+ — read-only бейдж реальной стадии закупки, клик уводит
   в «Закупку» (там правится полная 8-стадийная лестница + даты/платежи/трек). */
function FunnelChip({ it, hasActiveShare, onChangeApprove, onOpenProcure }) {
  const FFE = window.LedgerFFE;
  const stage = FFE.funnelStage(it, hasActiveShare);
  if (stage.locked) {
    return (
      <button type="button" className="mono rs-ap" onClick={onOpenProcure}
        title={"Стадия закупки: " + stage.label + " — открыть «Закупку»"}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 6, width: 122, flex: "none", alignSelf: "center",
          background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--text)", fontSize: "var(--fs-12)" }}>
        <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: stage.color, flex: "none" }} />
        {stage.label}
      </button>
    );
  }
  const aid = FFE.APPROVE_BY_ID[it.approve] ? it.approve : "pending";
  return (
    <span className="rs-ap" style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 6, width: 122, flex: "none", alignSelf: "center" }}
      title={"Статус: " + stage.label + (it.approveAt ? " — " + fmtDateRu(it.approveAt) : "")}>
      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: stage.color, flex: "none" }} />
      <select className="fld" value={aid} aria-label={"Статус позиции «" + it.title + "»"}
        onChange={(e) => onChangeApprove(e.target.value)}
        style={{ width: 108, flex: "none", padding: "5px 6px", fontSize: "var(--fs-12)" }}>
        {FFE.APPROVE_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.id === "pending" ? (hasActiveShare ? "На согласовании" : "Черновик") : s.label}</option>)}
      </select>
    </span>
  );
}

/* ---------------- КАРТОЧКА-РЕДАКТОР ПОЗИЦИИ (фаза 2 слияния, шаг 1) ----------------
   Название/раздел/кол-во/цена/поставщик + удаление. Меняет только данные —
   деньги нормализуются до целых рублей, расчёты идут прежним конвейером
   (инвариант UI=PDF=Excel не трогаем). Enter — сохранить, Esc — закрыть
   редактор (не оверлей: stopPropagation до window-слушателя). */
function PosEditor({ item, cats, sups, isNew, onSave, onDelete, onCancel, library, onToLibrary, supBook, onToSupBook, posNav, markup, catMarkup, codeHint }) {
  const dm = (item && item.dims) || {};
  const s = (v) => (v == null || v === "" ? "" : String(v));
  const [d, setD] = usePD({
    title: item ? item.title : "",
    cat: (item && item.cat) || "",
    qty: String((item && item.qty) || 1),
    unit: (item && item.unit) || "шт",
    price: item ? String(item.price) : "",
    rrp: s(item && item.rrp),
    sup: (item && item.sup) || "",
    wastePct: s(item && item.wastePct),
    // FF&E-поля (проф-уровень спецификации) — редактируются на вкладке «Основное»
    code: (item && item.code) || "",   // док-код (пусто = авто по разделу)
    sku: (item && item.sku) || "",
    url: (item && item.url) || "",
    img: (item && item.img) || "",
    material: (item && item.material) || "",
    dimW: s(dm.w), dimD: s(dm.d), dimH: s(dm.h),
    leadWeeks: s(item && item.leadWeeks),
  });
  // две вкладки как в карточке позиции Programa: «Финансы» — количество/цена/запас
  // (обязательны для сохранения, самый частый путь при добавлении), «Основное» — раздел
  // и спецификация (артикул/материал/габариты/срок). Открыты не одновременно — переключатель.
  const [tab, setTab] = usePD("fin");
  // кламп 1–999: реальный fat-finger из проверки — 350 000 «штук» гарнитура
  const qty = Math.max(1, Math.min(999, Math.round(+d.qty || 1)));
  const price = Math.round(+d.price || 0);
  const ok = !!d.title.trim() && price > 0;
  // габариты/срок/запас: пустая строка → "" (не 0), число → округляем ≥0
  const nOrEmpty = (v) => { const t = String(v).trim(); return t === "" ? "" : Math.max(0, Math.round(+t || 0)); };
  const wastePct = nOrEmpty(d.wastePct);   // нормализуем один раз — draft/превью/подпись берут отсюда
  const rrp = nOrEmpty(d.rrp);             // розница (RRP): "" = не задана
  const draft = () => ({
    title: d.title.trim(), qty, price, cat: d.cat.trim(), sup: d.sup.trim(),
    unit: d.unit, wastePct, rrp,
    code: d.code.trim(), sku: d.sku.trim(), url: d.url.trim(), img: d.img.trim(), material: d.material.trim(),
    dims: { w: nOrEmpty(d.dimW), d: nOrEmpty(d.dimD), h: nOrEmpty(d.dimH) },
    leadWeeks: nOrEmpty(d.leadWeeks),
  });
  const submit = () => { if (ok) onSave(draft()); };
  // W5.3: правил ли пользователь поля (для prev/next: изменённый валидный черновик сохраняем перед переходом)
  const dirty = !!item && (d.title.trim() !== item.title || qty !== (item.qty || 1) || price !== item.price
    || d.cat.trim() !== (item.cat || "") || d.sup.trim() !== (item.sup || "") || d.wastePct !== s(item.wastePct) || d.rrp !== s(item.rrp) || d.unit !== (item.unit || "шт")
    || d.code.trim() !== (item.code || "") || d.sku.trim() !== (item.sku || "") || d.url.trim() !== (item.url || "") || d.img.trim() !== (item.img || "") || d.material.trim() !== (item.material || "")
    || d.dimW !== s(dm.w) || d.dimD !== s(dm.d) || d.dimH !== s(dm.h) || d.leadWeeks !== s(item.leadWeeks));
  // живой итог на вкладке «Финансы» — считаем ровно тем же FFE.clientPricing, что UI/PDF/
  // Excel/портал (единый источник формулы: запас в costUnit → наценка раздела поверх →
  // округление цены/шт). Синтетический снимок из одной позиции, чтобы превью не разъезжалось
  // с реальной строкой при будущих правках формулы.
  const FFE = window.LedgerFFE;
  const previewItem = { price, qty, cat: d.cat.trim(), wastePct: wastePct || 0, rrp: rrp || 0 };
  const unitLabel = d.unit && d.unit !== "шт" ? " " + d.unit : "";
  const cpPreview = FFE.clientPricing({ rooms: [{ items: [previewItem] }], markup, catMarkup });
  const costUnitPreview = cpPreview.costUnit(previewItem);
  const unitClientPreview = cpPreview.unitClient(previewItem);
  const savingsPreview = cpPreview.lineSavings(previewItem);   // выгода клиента от розницы (RRP), может быть ≤0
  // dirty, но невалидно (например, стёрли название) — не топим правку молча: держим редактор
  // на месте, пусть починят или явно жмут «Отмена» (кнопки честно обещают «правки сохранятся»)
  const goNav = (j) => {
    if (j == null || !posNav) return;
    if (dirty && !ok) { toast("Заполните название и цену/шт — или отмените правки, прежде чем перейти к другой позиции.", "warn"); return; }
    posNav.go(j, dirty ? draft() : null);
  };
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
      {/* W5.3 (§5.7): листание позиций комнаты не закрывая редактор — мини-стрелки в шапке;
         изменённый валидный черновик сохраняется при переходе, нетронутый — просто листаем */}
      {!isNew && posNav && posNav.total > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: -2 }}>
          <span className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--spec-meta)" }}>Позиция {posNav.index + 1} из {posNav.total}</span>
          <span style={{ display: "inline-flex", gap: 4 }}>
            <button type="button" className="btn-mini" disabled={posNav.prev == null} onClick={() => goNav(posNav.prev)}
              title="К предыдущей позиции (правки сохранятся)" aria-label="Предыдущая позиция"><Icon size={12} stroke={2} d="M5 15l7-7 7 7" /></button>
            <button type="button" className="btn-mini" disabled={posNav.next == null} onClick={() => goNav(posNav.next)}
              title="К следующей позиции (правки сохранятся)" aria-label="Следующая позиция"><Icon size={12} stroke={2} d="M5 9l7 7 7-7" /></button>
          </span>
        </div>
      )}
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
      <div className="plate-toggle" role="tablist" aria-label="Раздел редактора позиции" style={{ alignSelf: "flex-start" }}>
        <button type="button" role="tab" aria-selected={tab === "fin"} className={tab === "fin" ? "on" : ""} onClick={() => setTab("fin")}>Финансы</button>
        <button type="button" role="tab" aria-selected={tab === "main"} className={tab === "main" ? "on" : ""} onClick={() => setTab("main")}>Основное</button>
      </div>

      {tab === "fin" && (
        <div className="view-enter" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="pe-grid" style={{ display: "grid", gridTemplateColumns: "76px 72px 108px 108px 1fr 76px", gap: 10 }}>
            <label style={lab}>Кол-во
              <input style={{ ...fld, fontFamily: "var(--font-mono)" }} type="number" min="1" max="999" step="1" inputMode="numeric" value={d.qty} onChange={(e) => setD((x) => ({ ...x, qty: e.target.value }))} />
            </label>
            <label style={lab}>Ед.
              <select style={fld} value={d.unit} onChange={(e) => setD((x) => ({ ...x, unit: e.target.value }))}>
                {((FFE && FFE.FFE_UNITS) || ["шт"]).map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
            <label style={lab}>Цена/ед., ₽
              <input style={{ ...fld, fontFamily: "var(--font-mono)" }} type="number" min="1" step="100" inputMode="numeric" value={d.price} onChange={(e) => setD((x) => ({ ...x, price: e.target.value }))} />
            </label>
            <label style={lab} title="Розничная цена в магазине (РРЦ) за единицу — клиент увидит свою выгоду от работы с вами">Розница, ₽
              <input style={{ ...fld, fontFamily: "var(--font-mono)" }} type="number" min="0" step="100" inputMode="numeric" value={d.rrp} placeholder="—" onChange={(e) => setD((x) => ({ ...x, rrp: e.target.value }))} />
            </label>
            <label style={lab}>Поставщик
              <input style={fld} list="pe-sup-list" value={d.sup} placeholder="точка закупки" onChange={(e) => setD((x) => ({ ...x, sup: e.target.value }))} />
              {/* K5a: контакты из адресной книги под полем; карточки нет — кнопка создать (паттерн «В библиотеку») */}
              {(() => {
                const nm = (d.sup || "").trim();
                const F2 = window.LedgerFFE;
                if (!nm || !F2 || !F2.supplierMatch) return null;
                if (F2.supplierMatch(supBook, nm)) return <span style={{ display: "block", marginTop: 4, overflow: "hidden" }}><SupplierContactChip book={supBook} name={nm} /></span>;
                return onToSupBook ? (
                  <button type="button" onClick={() => onToSupBook(nm)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: "var(--fs-11)", color: "var(--info)" }}
                    title="Создать карточку поставщика в адресной книге — контакты заполните в Мастерской → Поставщики">
                    <I.plus size={11} />В адресную книгу
                  </button>
                ) : null;
              })()}
            </label>
            <label style={lab} title="Запас на подрезку/бой — для плитки, краски и т.п.">Запас, %
              <input style={{ ...fld, fontFamily: "var(--font-mono)" }} type="number" min="0" step="1" inputMode="numeric" value={d.wastePct} placeholder="0" onChange={(e) => setD((x) => ({ ...x, wastePct: e.target.value }))} />
            </label>
          </div>
          {/* живой итог позиции — аналог блока Totals в карточке деталей Programa */}
          {price > 0 && (
            <div className="mono" style={{ display: "flex", flexDirection: "column", gap: 2, padding: "8px 10px", borderRadius: 9, background: "var(--surface)", border: "1px solid var(--hairline)", fontSize: "var(--fs-12)" }}>
              <span style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
                <span>Себестоимость{wastePct ? " (с запасом)" : ""}</span>
                <span>{fmtMoney(costUnitPreview)} × {qty}{unitLabel} = {fmtMoney(costUnitPreview * qty)}</span>
              </span>
              <span style={{ display: "flex", justifyContent: "space-between", color: "var(--accent-2-ink)", fontWeight: 600 }}>
                <span>Клиенту</span>
                <span>{fmtMoney(unitClientPreview)} × {qty}{unitLabel} = {fmtMoney(unitClientPreview * qty)}</span>
              </span>
              {/* RRP-слой (п.17): выгода клиента от розницы; ≤0 — честно предупреждаем, а не прячем молча */}
              {rrp > 0 && (savingsPreview > 0 ? (
                <span style={{ display: "flex", justifyContent: "space-between", color: "var(--accent-2-ink)" }}>
                  <span>Выгода клиента (розница {fmtMoney(cpPreview.rrpUnit(previewItem))})</span>
                  <span>{fmtMoney(savingsPreview)}</span>
                </span>
              ) : (
                <span style={{ color: "var(--accent-ink)" }}>Розница не выше цены клиенту — выгода в смете не показывается</span>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "main" && (
        <div className="view-enter" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="pe-grid" style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 10 }}>
            <label style={lab}>Раздел
              <input style={fld} list="pe-cat-list" value={d.cat} placeholder="Прочее" onChange={(e) => setD((x) => ({ ...x, cat: e.target.value }))} />
            </label>
            <label style={lab} title="Код позиции для спецификации и чертежей (напр. МБ-01). Пусто — присвоится автоматически по разделу.">Код
              <input style={{ ...fld, fontFamily: "var(--font-mono)" }} value={d.code} placeholder={codeHint || "авто"} maxLength={16} onChange={(e) => setD((x) => ({ ...x, code: e.target.value }))} />
            </label>
          </div>
          <div className="pe-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={lab}>Артикул
              <input style={fld} value={d.sku} placeholder="напр. MIL-3" onChange={(e) => setD((x) => ({ ...x, sku: e.target.value }))} />
            </label>
            <label style={lab}>Материал / отделка
              <input style={fld} value={d.material} placeholder="дуб, велюр, латунь…" onChange={(e) => setD((x) => ({ ...x, material: e.target.value }))} />
            </label>
          </div>
          <label style={lab}>Ссылка на товар
            <input style={{ ...fld, fontFamily: "var(--font-mono)", fontSize: "var(--fs-12)" }} type="url" inputMode="url" value={d.url} placeholder="https://…" onChange={(e) => setD((x) => ({ ...x, url: e.target.value }))} />
          </label>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <label style={{ ...lab, flex: 1 }}>Фото (URL)
              <input style={{ ...fld, fontFamily: "var(--font-mono)", fontSize: "var(--fs-12)" }} type="url" inputMode="url" value={d.img} placeholder="https://…jpg" onChange={(e) => setD((x) => ({ ...x, img: e.target.value }))} />
            </label>
            <div style={{ width: 56, height: 56, flex: "none", borderRadius: 8, overflow: "hidden", border: "1px solid var(--hairline)" }} aria-hidden="true">
              <Img src={d.img.trim()} label="фото" radius={8} />
            </div>
          </div>
          <div className="pe-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 96px", gap: 10, alignItems: "end" }}>
            <label style={lab}>Ширина, см
              <input style={{ ...fld, fontFamily: "var(--font-mono)" }} type="number" min="0" step="1" inputMode="numeric" value={d.dimW} onChange={(e) => setD((x) => ({ ...x, dimW: e.target.value }))} />
            </label>
            <label style={lab}>Глубина, см
              <input style={{ ...fld, fontFamily: "var(--font-mono)" }} type="number" min="0" step="1" inputMode="numeric" value={d.dimD} onChange={(e) => setD((x) => ({ ...x, dimD: e.target.value }))} />
            </label>
            <label style={lab}>Высота, см
              <input style={{ ...fld, fontFamily: "var(--font-mono)" }} type="number" min="0" step="1" inputMode="numeric" value={d.dimH} onChange={(e) => setD((x) => ({ ...x, dimH: e.target.value }))} />
            </label>
            <label style={lab}>Срок, нед.
              <input style={{ ...fld, fontFamily: "var(--font-mono)" }} type="number" min="0" step="1" inputMode="numeric" value={d.leadWeeks} onChange={(e) => setD((x) => ({ ...x, leadWeeks: e.target.value }))} />
            </label>
          </div>
        </div>
      )}

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
      {/* K5a: подсказки — использованные в смете + вся адресная книга (без дублей, книга после) */}
      <datalist id="pe-sup-list">{[...sups, ...(supBook || []).map((b) => b.name).filter((n) => n && !sups.includes(n))].map((s) => <option key={s} value={s} />)}</datalist>
      <datalist id="pe-lib-list">{lib.map((p) => <option key={p.id} value={p.title} />)}</datalist>
    </div>
  );
}

/* «Оплата и сроки» на позицию (волна C, бенчмарк Programa): ожидаемая дата
   текущей стадии закупки (eta) + 4 платёжные даты с чекбоксом «оплачено» +
   трек-номер отправления. Отдельный drawer, а не поля в PosEditor — правится
   реже (по ходу закупки, не при вводе позиции) и живёт только в «Закупке». */
function PayTrackEditor({ item, onCancel, onSave }) {
  const FFE = window.LedgerFFE;
  const [d, setD] = usePD({ eta: item.eta || "", payments: FFE.blankPayments(item.payments), track: FFE.blankTrack(item.track) });
  const setPayField = (id, field, v) => setD((x) => ({ ...x, payments: { ...x.payments, [id]: { ...x.payments[id], [field]: v } } }));
  const setTrackField = (field, v) => setD((x) => ({ ...x, track: { ...x.track, [field]: v } }));
  const submit = () => onSave({ eta: d.eta.trim(), payments: d.payments, track: { number: d.track.number.trim(), url: d.track.url.trim(), note: d.track.note.trim() } });
  // те же fld/lab, что в PosEditor выше — общий вид всех инлайн-drawer'ов строки
  const fld = { width: "100%", padding: "8px 10px", borderRadius: 9, border: "1px solid var(--hairline)", background: "var(--surface)", fontSize: "var(--fs-13)", color: "var(--text)", marginTop: 3 };
  const lab = { fontSize: "var(--fs-11)", color: "var(--muted)", display: "block", minWidth: 0 };
  return (
    <div className="view-enter" style={{ margin: "6px 0 8px", padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(94,107,91,.45)", background: "rgba(94,107,91,.06)", display: "flex", flexDirection: "column", gap: 12 }}
      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onCancel(); } }}>
      <label style={lab}>Ожидаемая дата стадии («{FFE.statusMeta(item.status).label}»)
        <input type="date" style={{ ...fld, width: 160 }} value={d.eta} onChange={(e) => setD((x) => ({ ...x, eta: e.target.value }))} />
      </label>
      <div>
        <div style={{ ...lab, marginBottom: 6 }}>Платёжные даты</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {FFE.PAYMENT_KINDS.map((k) => (
            <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--fs-12)", color: "var(--text)", minWidth: 180 }}>
                <input type="checkbox" checked={d.payments[k.id].paid} onChange={(e) => setPayField(k.id, "paid", e.target.checked)} />
                {k.label}
              </label>
              <input type="date" style={{ ...fld, width: 160, marginTop: 0 }} value={d.payments[k.id].date} aria-label={k.label + " — дата"} onChange={(e) => setPayField(k.id, "date", e.target.value)} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label style={lab}>Трек-номер
          <input style={fld} value={d.track.number} onChange={(e) => setTrackField("number", e.target.value)} />
        </label>
        <label style={lab}>Ссылка отслеживания
          <input style={fld} value={d.track.url} placeholder="https://…" onChange={(e) => setTrackField("url", e.target.value)} />
        </label>
      </div>
      <label style={lab}>Заметка по отправлению
        <input style={fld} value={d.track.note} onChange={(e) => setTrackField("note", e.target.value)} />
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary" style={{ padding: "8px 14px", fontSize: "var(--fs-13)" }} onClick={submit}><I.check size={14} />Готово</button>
        <button className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: "var(--fs-13)" }} onClick={onCancel}>Отмена</button>
      </div>
    </div>
  );
}

/* ---------------- «ИЗ ПРОШЛОГО ПРОЕКТА / ШАБЛОНА / ПО ССЫЛКЕ» ----------------
   Роадмап #10: копирование позиций/комнат из прошлых смет (цены получают
   пометку давности — priceDate = дата обновления проекта-источника) и вставка
   типовых комплектаций. Двухшаговый выбор: источник → чекбоксы.
   Роадмап #1 (фаза 1 слияния): вкладка «По ссылке» — клиппер URL/HTML →
   позиция сметы через window.LedgerClipper (перенос с vite-ветки); при
   CORS-блоке честный фолбэк «вставьте HTML страницы вручную». */
function AddPositionsModal({ excludeId, roomNames, initialTab, initialRoom, onClose, onAdd }) {
  const FFE = window.LedgerFFE;   // себестоимость превью — с запасом (FFE.lineTotal), как в Смете
  // Д1 (W6): инлайн-панель комнаты открывает модалку сразу на «По ссылке» со своей комнатой
  const [tab, setTab] = usePD(initialTab || "past");        // past | tpl | clip
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
  const [clipForm, setClipForm] = usePD(null);          // {title, price, rrp, qty, sup, room, note}

  usePDE(() => {
    // источники: только проекты со сметой по комнатам (каталожные демо-проекты отпадают)
    LedgerAPI.projects.list()
      .then((list) => Promise.all(list.filter((p) => p.id !== excludeId).map((p) =>
        LedgerAPI.projects.get(p.id).then((d) => (d && d.rooms && d.rooms.length
          ? { id: p.id, label: p.name, stamp: p.updated, rooms: d.rooms }
          : null)))))
      .then((xs) => setSources(xs.filter(Boolean)));
    LedgerAPI.templates.list().then(setTpls);
  }, []);

  const cost = (items) => items.reduce((s, it) => s + (FFE ? FFE.lineTotal(it) : it.price * (it.qty || 1)), 0);
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
      const { title, qty, price, cat, sup, priceDate, rrp } = it;
      const pd = priceDate || src.stamp;
      return { title, qty: qty || 1, price, ...(cat ? { cat } : {}), ...(sup ? { sup } : {}), ...(pd ? { priceDate: pd } : {}), ...(rrp ? { rrp } : {}) };
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
      // розница (RRP-слой, п.17) — извлечённая «старая цена», если санити extractFromHtml её пропустила
      rrp: f.oldPrice != null && f.oldPrice > 0 ? String(Math.round(f.oldPrice)) : "",
      qty: "1",
      sup: f.supplier || "",
      room: initialRoom || (roomNames && roomNames[0]) || "Гостиная",
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
      const r = await window.LedgerClipper.clip(u);
      if (r.ok) clipPrefill(r.extracted, r.via);
      else if (r.blocked) { setClipHtmlMode(true); setClipErr("Магазин не отдаёт страницу напрямую (защита/CORS). Откройте товар в соседней вкладке, скопируйте HTML (Ctrl+U → выделить всё) и вставьте ниже."); }
      else setClipErr(r.error || "Не удалось разобрать страницу.");
    } finally { setClipBusy(false); }
  };
  const doParseHtml = () => {
    const h = clipHtml.trim();
    if (!h) return;
    const ex = window.LedgerClipper.extractFromHtml(h, clipUrl.trim());
    if (!ex.fields.title && ex.fields.price == null) setClipErr("В этом HTML не нашлось данных товара — проверьте, что скопирована страница целиком.");
    else clipPrefill(ex, "html");
  };
  const clipPrice = clipForm ? Math.round(+clipForm.price || 0) : 0;
  const clipRrp = clipForm ? Math.round(+clipForm.rrp || 0) : 0;   // розница (RRP-слой, п.17) — необязательна
  const clipQty = clipForm ? Math.max(1, Math.round(+clipForm.qty || 1)) : 1;
  const clipOk = clipForm && clipForm.title.trim() && clipPrice > 0 && clipForm.room.trim();
  const clipAdd = () => {
    if (!clipOk) return;
    const item = {
      title: clipForm.title.trim(), qty: clipQty, price: clipPrice,
      ...(clipForm.sup.trim() ? { sup: clipForm.sup.trim() } : {}),
      ...(clipRrp > 0 ? { rrp: clipRrp } : {}),
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
          <div style={{ fontSize: "var(--fs-13)", color: "var(--muted)", marginTop: 3 }}>Из прошлого проекта, шаблона или по ссылке на товар</div>
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
            <EmptyState compact icon="layers" text={<React.Fragment>Пока нет прошлых проектов со сметой по комнатам.<br />Сохраните смету — и её позиции можно будет переиспользовать здесь.</React.Fragment>} />
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
                  {/* розница (RRP-слой, п.17) — клиппер иногда находит зачёркнутую цену магазина; необязательна,
                      показываем только когда что-то извлеклось или дизайнер сам решит её вписать */}
                  <label style={{ fontSize: "var(--fs-12)", color: "var(--muted)" }} title="Розничная цена в магазине — клиент увидит свою выгоду от работы с вами">Розница, ₽ (необязательно)
                    <input style={{ ...clipField, marginTop: 4, fontFamily: "var(--font-mono)" }} type="number" min="0" placeholder="—" value={clipForm.rrp} onChange={(e) => setClipForm((f) => ({ ...f, rrp: e.target.value }))} />
                  </label>
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
                  <span style={{ fontWeight: 700, fontSize: "var(--fs-14)", flex: 1 }}>{r.name}{r.area ? <span style={{ color: "var(--muted)", fontWeight: 500, fontSize: "var(--fs-12)" }}> · {r.area} м²</span> : null}</span>
                  <span className="mono" style={{ fontSize: "var(--fs-12)", color: "var(--spec-meta)", whiteSpace: "nowrap" }}>{fmtMoney(cost(r.items))}</span>
                </label>
                <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid var(--hairline-2)" }}>
                  {r.items.map((it, ii) => (
                    <label key={ii} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "6px 0", borderTop: ii ? "1px solid var(--hairline-2)" : "none", fontSize: "var(--fs-13)", cursor: "pointer" }}>
                      <input type="checkbox" checked={!!sel[k(ri, ii)]} onChange={() => setSel((s) => ({ ...s, [k(ri, ii)]: !s[k(ri, ii)] }))} style={{ accentColor: "var(--accent-2)", width: 14, height: 14, flex: "none", position: "relative", top: 2 }} />
                      <span style={{ flex: 1, lineHeight: 1.4 }}>{it.title}</span>
                      <span className="mono" style={{ color: "var(--spec-meta)", whiteSpace: "nowrap", fontSize: "var(--fs-12)" }}>{FFE ? FFE.qtyLabel(it) : "×" + (it.qty || 1)}</span>
                      <span className="mono" style={{ whiteSpace: "nowrap", fontSize: "var(--fs-12)" }}>{fmtMoney(FFE ? FFE.lineTotal(it) : it.price * (it.qty || 1))}</span>
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

/* ============================================================
   ОБЗОР ПРОЕКТА (волна W2, бенчмарк Programa «Overview») — «лицо» проекта:
   шапка (статус-петля + описание + обложка) · KPI-ряд ЖИВЫХ цифр · Recent-
   документы. Все цифры считаются ИЗ СОХРАНЁННОЙ записи проекта теми же
   формулами, что и смета (FFE.clientPricing/priceFreshness/статусы/версии) —
   чтобы Обзор и Смета не противоречили друг другу. Каждая KPI и карточка —
   переход в соответствующий раздел (setRoute s2), нулевые состояния словами.
   ============================================================ */

/* Чистый агрегат метрик проекта из его записи (rooms + настройки наценки).
   Зеркалит клиентскую матшу сметы (RoomSpecOverlay): grand — себестоимость,
   client/totalClient/profit — через FFE.clientPricing; согласование, стадии
   закупки, свежесть цен, версии — из тех же справочников FFE. */
function projectMetrics(data) {
  const FFE = window.LedgerFFE;
  const rooms = (data && data.rooms) || [];
  const markup = data.markupPct != null ? data.markupPct : PD_DEFAULT_MARKUP;
  const catMarkup = data.catMarkupPct || {};
  const discount = data.discountPct || 0, delivery = data.deliveryCost || 0, install = data.installCost || 0, extras = data.extras || [];
  const items = rooms.flatMap((r) => r.items || []);
  const itemsCount = items.length;
  // себестоимость включает запас/отход (FFE.lineTotal) — тем же costUnit, что и Смета
  // (RoomSpecOverlay), иначе profit = client − grand завышался бы на стоимость запаса
  const grand = items.reduce((s, it) => s + (FFE ? FFE.lineTotal(it) : (it.price || 0) * (it.qty || 1)), 0);
  const pricing = FFE ? FFE.clientPricing({ rooms, markup, catMarkup, discount, delivery, install, extras })
    : { client: 0, discountAmt: 0, totalClient: 0 };
  const profit = pricing.client - pricing.discountAmt - grand;  // доставка/монтаж — транзит (без наценки), в профит не входят
  // согласование клиента по позициям (то же правило: отсутствие поля = «ждёт»);
  // K5b: возвраты (пересмотр/отклонено) считаем отдельно — «клиент вернул» требует
  // действия ДИЗАЙНЕРА, смешивать с «клиент ещё не смотрел» нечестно (Programa
  // различает тем же сабстатусом «No rejected items» под Pending approval)
  const apOk = FFE ? items.filter((it) => FFE.APPROVE_BY_ID[it.approve] && it.approve === "ok").length : 0;
  const apRevise = FFE ? items.filter((it) => it.approve === "revise").length : 0;
  const apRejected = FFE ? items.filter((it) => it.approve === "rejected").length : 0;
  const apWaiting = itemsCount - apOk;
  // стадии закупки: заказано..установлено = «в работе», принято = закрыто; просрочка — по датам стадий/платежей
  let inWork = 0, accepted = 0, overdue = 0;
  if (FFE) items.forEach((it) => {
    const order = FFE.statusMeta(it.status).order;
    if (order >= 8) accepted++; else if (order >= 3) inWork++;
    if (FFE.itemDueItems(it).some((d) => FFE.urgencyBucket(d.date) === "overdue")) overdue++;
  });
  const fresh = FFE && FFE.priceFreshness ? FFE.priceFreshness(rooms) : null;
  const versions = FFE && data.id ? FFE.loadVersions(data.id) : [];
  const approved = versions.find((v) => v.status === "approved") || null;
  const share = versions.find((v) => v.shareId) || null;   // портал клиента выпущен, если у версии есть shareId
  const photos = items.map((it) => it.img).filter(Boolean);
  return { itemsCount, grand, client: pricing.client, totalClient: pricing.totalClient, profit,
    apOk, apRevise, apRejected, apWaiting, inWork, accepted, overdue, fresh, versions, approved, share, photos, roomsCount: rooms.length };
}

/* тумбнейл документа: коллаж 2×2 из фото позиций (паттерн Programa); нет фото —
   обложка проекта striped-плейсхолдером (Img сам рисует ph при отсутствии src) */
function DocThumb({ photos, cover, label }) {
  const pics = (photos || []).slice(0, 4);
  if (pics.length <= 1) return <Img src={pics[0] || PHOTOS[cover]} label={label} style={{ borderRadius: 0 }} />;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 2, width: "100%", height: "100%", background: "var(--hairline)" }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ overflow: "hidden", background: "var(--surface-2)" }}>
          {pics[i] && <Img src={pics[i]} label="" style={{ borderRadius: 0 }} />}
        </div>
      ))}
    </div>
  );
}

/* тумбнейл-иконка для документов без фото-коллажа (портал/протокол/закупка):
   центрированная иконка на плашке; цвет/фон задаёт состояние документа */
function IconThumb({ icon, bg, color }) {
  const Ico = I[icon] || I.grid;
  return <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", background: bg, color }}><Ico size={34} /></div>;
}

/* карточка-документ Recent: тумбнейл + тип + подпись, вся кликабельна в раздел */
function DocCard({ thumb, title, sub, onClick }) {
  return (
    <button className="glass" onClick={onClick} style={{ borderRadius: "var(--r-lg)", overflow: "hidden", textAlign: "left", display: "flex", flexDirection: "column", cursor: "pointer" }}>
      <div style={{ aspectRatio: "16/10", position: "relative", overflow: "hidden" }}>{thumb}</div>
      <div style={{ padding: "13px 16px" }}>
        <div style={{ fontWeight: 700, fontSize: "var(--fs-15)" }}>{title}</div>
        <div style={{ color: "var(--muted)", fontSize: "var(--fs-12)", marginTop: 3, lineHeight: 1.4 }}>{sub}</div>
      </div>
    </button>
  );
}

/* KPI-плитка обзора: подпись + стрелка-переход + крупная цифра + подпись-контекст
   (нулевое состояние словами). Деньги — mono, счётчики — display (канон П2). */
function OvKpi({ label, value, mono, sub, subTone, onClick, title }) {
  return (
    <button className="glass ov-kpi" onClick={onClick} title={title}
      style={{ borderRadius: "var(--r-lg)", padding: 22, textAlign: "left", display: "flex", flexDirection: "column", cursor: "pointer" }}>
      <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, color: "var(--muted)", fontSize: "var(--fs-13)", marginBottom: 12 }}>
        {label}<I.arrow size={15} style={{ color: "var(--faint)", flex: "none" }} />
      </span>
      <span className={mono ? "mono" : "display"} style={{ fontSize: "var(--fs-26)", fontWeight: mono ? 600 : undefined, letterSpacing: mono ? undefined : "-0.02em", lineHeight: 1, whiteSpace: "nowrap" }}>{value}</span>
      {sub && <span style={{ fontSize: "var(--fs-12)", color: subTone || "var(--muted)", marginTop: 8, lineHeight: 1.4 }}>{sub}</span>}
    </button>
  );
}

/* чип-статус петли комплектатора с дропдауном — общий словарь ffe.js
   (FFE.PROJ_STATUSES/PROJ_STATUS_COLOR) и общие пункты меню (StatusMenuItems),
   те же, что на карточке проекта: без копипаста дропдауна. */
function LoopStatusChip({ status, onChange }) {
  const colors = (window.LedgerFFE && window.LedgerFFE.PROJ_STATUS_COLOR) || {};
  const [open, setOpen] = usePD(false);
  useMenu(open, () => setOpen(false), "ov-status-wrap");
  return (
    <div className="ov-status-wrap" style={{ position: "relative" }}>
      <button className="glass" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 13px", borderRadius: 99, fontSize: "var(--fs-13)", fontWeight: 700, whiteSpace: "nowrap" }}>
        <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: colors[status], flex: "none" }} />
        {status}
        <I.chevron size={12} stroke={2.4} style={{ color: "var(--faint)" }} />
      </button>
      {open && (
        <div className="menu menu-pop" role="menu" style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, minWidth: 200, zIndex: 40 }}>
          <StatusMenuItems current={status} onPick={(s) => { setOpen(false); if (s !== status) onChange(s); }} />
        </div>
      )}
    </div>
  );
}

function ProjectOverview({ data, onClose }) {
  const [status, setStatus] = usePD(data.status || "Сбор");
  // метрики зависят только от data — мемоизируем, чтобы смена статуса (частый ре-рендер)
  // не гоняла flatMap/reduce/clientPricing и синхронное чтение localStorage (loadVersions)
  const m = React.useMemo(() => projectMetrics(data), [data]);
  const stageNext = (window.LedgerFFE && window.LedgerFFE.PROJ_STAGE_NEXT) || {};   // подсказка следующего шага петли (словарь — ffe.js)
  const goSection = (s2) => setRoute("cabinet", "projects", data.id, s2);
  const changeStatus = (s) => {
    if (!data.id) { setStatus(s); return; }   // несохранённая смета — некуда persist'ить, просто отражаем
    const prev = status;
    setStatus(s);   // оптимистично — чип реагирует сразу
    LedgerAPI.projects.update(data.id, { status: s })
      .then(() => toast("Статус проекта: «" + s + "»"))
      .catch(() => { setStatus(prev); toast("Не удалось сменить статус — попробуйте ещё раз.", "warn", 5000); });   // откат оптимизма
  };
  const meta = [data.room, data.style, data.area ? data.area + " м²" : null, data.updated ? "изменён " + fmtDateRu(data.updated) : null].filter(Boolean).join(" · ");

  return (
    <div className="pd-overlay" role="dialog" aria-label={"Обзор проекта: " + data.name}>
      <OverlayHead onBack={onClose} budget={data.budget}
        crumbs={[{ label: "Проекты", onClick: onClose }, { label: data.name }, { label: "Обзор" }]}
        crumbMenu={data.id ? projCrumbMenu(data.id, "") : null}
        title={data.name} sub={meta}
        right={<React.Fragment>
          {/* Д6 (W6): срок — чипом рядом со статусом (Programa: ряд чипов в шапке проекта);
             клик ведёт в Настройки, где срок и задаётся (W4.2) */}
          {(data.dateStart || data.dateEnd) && (
            <button className="glass mono ov-dates" onClick={() => goSection("settings")}
              title="Срок проекта — изменить в настройках"
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 99, fontSize: "var(--fs-12)", fontWeight: 600, whiteSpace: "nowrap", color: "var(--muted)" }}>
              <I.calendar size={14} style={{ color: "var(--accent-2)" }} />
              {data.dateStart ? fmtDateRu(data.dateStart) : "—"} → {data.dateEnd ? fmtDateRu(data.dateEnd) : "—"}
            </button>
          )}
          <LoopStatusChip status={status} onChange={changeStatus} />
        </React.Fragment>} />

      <div className="pd-body solo">
        <div className="pd-main">
          <section className="pd-section" style={{ borderBottom: "none" }}>
            {/* ── шапка проекта: описание + обложка + следующий шаг петли ── */}
            <div className="ov-hero" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start", marginBottom: 30 }}>
              <div>
                <div className="eyebrow jade" style={{ marginBottom: 12 }}>Обзор проекта</div>
                {/* адрес объекта (волна W4.2) — задаётся в Настройках, здесь только чтение;
                   срок переехал чипом в шапку рядом со статусом (Д6, W6) */}
                {data.address && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: "var(--fs-13)", color: "var(--muted)", marginBottom: 10 }}>
                    <span>{data.address}</span>
                  </div>
                )}
                {data.summaryShort
                  ? <p style={{ color: "var(--muted)", fontSize: "var(--fs-15)", lineHeight: 1.65, maxWidth: 640 }}>{data.summaryShort}</p>
                  : <p style={{ color: "var(--faint)", fontSize: "var(--fs-15)", lineHeight: 1.65 }}>Описание проекта появится здесь — соберите смету, задайте наценку и опубликуйте версию клиенту.</p>}
                {stageNext[status] && (
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: "var(--fs-13)", color: "var(--muted)", marginTop: 16 }}>
                    <span style={{ fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap" }}>Дальше:</span>
                    <span style={{ lineHeight: 1.4 }}>{stageNext[status]}</span>
                  </div>
                )}
              </div>
              <div style={{ aspectRatio: "16/10", borderRadius: "var(--r-lg)", overflow: "hidden", border: "1px solid var(--hairline)" }}>
                <Img src={PHOTOS[data.cover]} label={data.room || data.name} />
              </div>
            </div>

            {/* ── KPI-ряд живых цифр (каждая = переход в раздел) ── */}
            <h3 className="pd-h" style={{ fontSize: "var(--fs-18)", marginBottom: 14 }}>Ключевые цифры</h3>
            <div className="ov-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 34 }}>
              <OvKpi label="Позиции" value={m.itemsCount} onClick={() => goSection("smeta")}
                title="Открыть смету"
                // K5b: возвраты клиента первыми — «на пересмотр/отклонено» требует действия дизайнера,
                // «ждут решения» — только терпения; смешивать их в одну цифру нечестно
                sub={m.itemsCount === 0 ? "добавьте первую позицию"
                  : (m.apRevise + m.apRejected) > 0
                    ? [m.apRevise ? m.apRevise + " на пересмотр" : null, m.apRejected ? m.apRejected + " отклонено" : null, m.apOk + " согласовано"].filter(Boolean).join(" · ")
                  : m.apWaiting > 0 ? m.apWaiting + " ждут решения · " + m.apOk + " согласовано"
                  : "все " + m.apOk + " согласованы"}
                subTone={m.itemsCount > 0 && m.apWaiting > 0 ? "var(--accent-ink)" : m.itemsCount > 0 ? "var(--accent-2-ink)" : undefined} />
              <OvKpi label="Сумма для клиента" mono value={fmtMoney(m.totalClient)} onClick={() => goSection("client")}
                title="Открыть смету для клиента"
                sub={m.profit > 0 ? "ваша наценка " + fmtMoney(m.profit) : "наценка не задана"}
                subTone={m.profit > 0 ? "var(--accent-2-ink)" : undefined} />
              <OvKpi label="Закупка" value={m.itemsCount === 0 ? "—" : m.inWork} onClick={() => goSection("procure")}
                title="Открыть закупку"
                sub={m.itemsCount === 0 ? "смета ещё пустая"
                  : m.overdue > 0 ? m.overdue + " просрочено · " + m.accepted + " принято"
                  : m.inWork > 0 ? (m.accepted > 0 ? "в работе · " + m.accepted + " принято" : "в работе · просрочек нет")
                  : m.accepted > 0 ? "всё принято · " + m.accepted + " " + plural(m.accepted, ["позиция", "позиции", "позиций"])
                  : "закупка не начата"}
                subTone={m.overdue > 0 ? "var(--accent-ink)" : (m.itemsCount > 0 && m.inWork === 0 && m.accepted > 0 ? "var(--accent-2-ink)" : undefined)} />
              <OvKpi label="Свежесть цен" value={!m.fresh ? "—" : m.fresh.days === 0 ? "сегодня" : m.fresh.days + " " + plural(m.fresh.days, ["день", "дня", "дней"])}
                onClick={() => goSection("smeta")} title="Проверить цены в смете"
                sub={!m.fresh ? "цены не датированы" : "проверено " + m.fresh.checked + " из " + m.fresh.total + (m.fresh.stale ? " · перепроверьте" : "")}
                subTone={m.fresh && m.fresh.stale ? "var(--accent-ink)" : undefined} />
              <OvKpi label="Версии" value={m.versions.length} onClick={() => goSection("versions")}
                title="Открыть версии и согласование"
                sub={m.approved ? "согласована «" + m.approved.label + "»" : m.versions.length ? "снимков сохранено" : "снимков ещё нет"}
                subTone={m.approved ? "var(--accent-2-ink)" : undefined} />
            </div>

            {/* ── Recent-документы: смета (коллаж фото) · портал · протокол · закупка ── */}
            <h3 className="pd-h" style={{ fontSize: "var(--fs-18)", marginBottom: 14 }}>Документы проекта</h3>
            <div className="ov-docs" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, maxWidth: 960 }}>
              <DocCard onClick={() => goSection("smeta")}
                thumb={<DocThumb photos={m.photos} cover={data.cover} label={data.room || data.name} />}
                title="Смета"
                sub={m.itemsCount + " " + plural(m.itemsCount, ["позиция", "позиции", "позиций"]) + " · " + m.roomsCount + " " + plural(m.roomsCount, ["комната", "комнаты", "комнат"])} />
              <DocCard onClick={() => goSection("versions")}
                thumb={<IconThumb icon="user" bg={m.share ? "var(--accent-2)" : "var(--surface-2)"} color={m.share ? "var(--on-accent)" : "var(--faint)"} />}
                title="Портал клиента"
                sub={m.share ? "ссылка выпущена" + (m.share.label ? " · " + m.share.label : "") : "ещё не выпущен"} />
              <DocCard onClick={() => goSection("versions")}
                thumb={<IconThumb icon="check" bg="var(--surface-2)" color={m.apOk > 0 ? "var(--accent-2-ink)" : "var(--faint)"} />}
                title="Протокол согласования"
                sub={m.apOk > 0 ? "согласовано " + m.apOk + " из " + m.itemsCount : "решения ещё не собраны"} />
              <DocCard onClick={() => goSection("procure")}
                thumb={<IconThumb icon="truck" bg="var(--surface-2)" color={m.overdue > 0 ? "var(--accent-ink)" : "var(--muted)"} />}
                title="Закупочный лист"
                sub={m.itemsCount === 0 ? "смета ещё пустая" : m.overdue > 0 ? m.inWork + " в работе · " + m.overdue + " просрочено" : m.inWork > 0 ? m.inWork + " в работе" : m.accepted > 0 ? "всё принято" : "закупка не начата"} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ---------------- НАСТРОЙКИ ПРОЕКТА (волна W4.2) ----------------
   «Детали»: имя/срок/адрес объекта/описание/обложка + Архив (= статус петли «Архив»,
   не отдельная сущность — тот же LedgerAPI.projects.update, что и смена статуса в
   Обзоре/карточке). «Портал клиента» (дефолтная вьюха, список клиентов) сознательно НЕ
   строим сейчас — у нас нет ни режима просмотра сметы клиентом (кроме единственного,
   который уже есть), ни multi-user доступа: делать переключатель без реального эффекта
   значило бы имитировать функцию. Вернётся вместе с режимом «Превью» (роадмап #11,
   отмечен 🔴 «нужны детали от владельца») — см. журнал волны W4. */
const SETTINGS_COVERS = ["living", "bedroom", "kitchen", "office", "deco", "studio"];
function ProjectSettings({ data, onClose, onSaved }) {
  const [name, setName] = usePD(data.name || "");
  const [address, setAddress] = usePD(data.address || "");
  const [dateStart, setDateStart] = usePD(data.dateStart || "");
  const [dateEnd, setDateEnd] = usePD(data.dateEnd || "");
  const [summaryShort, setSummaryShort] = usePD(data.summaryShort || "");
  const [cover, setCover] = usePD(data.cover || "living");
  const [saving, setSaving] = usePD(false);
  const [archiving, setArchiving] = usePD(false);
  const goSection = (s2) => setRoute("cabinet", "projects", data.id, s2);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const cleanName = name.trim() || data.name;
    try {
      const updated = await LedgerAPI.projects.update(data.id, { name: cleanName, address: address.trim(), dateStart, dateEnd, summaryShort: summaryShort.trim(), cover });
      onSaved(updated);   // Обзор держит отдельную копию data — без мержа показал бы старое
      setName(cleanName);
      setTitle("cabinet", cleanName);
      // шапка сайдбара (cabinet.jsx WsSidebar) держит СВОЮ отдельную копию имени, фетчнутую
      // по [projId] — событие, не проп: тот эффект живёт в другом компоненте дерева
      window.dispatchEvent(new CustomEvent("aivibe:project-renamed", { detail: { id: data.id, name: cleanName } }));
      toast("Настройки проекта сохранены");
    } catch (e) {
      toast("Не удалось сохранить настройки — попробуйте ещё раз.", "warn", 5000);
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (archiving) return;
    const ok = await confirmDialog({ title: "Архивировать проект?", text: "«" + data.name + "» перейдёт в статус «Архив» — данные останутся на месте, просто уйдёт из активных.", confirmLabel: "В архив" });
    if (!ok) return;
    setArchiving(true);
    try {
      const updated = await LedgerAPI.projects.update(data.id, { status: "Архив" });
      onSaved(updated);
      toast("Проект «" + data.name + "» отправлен в архив");
    } catch (e) {
      toast("Не удалось архивировать проект — попробуйте ещё раз.", "warn", 5000);
      setArchiving(false);
      return;
    }
    goSection("");   // назад в Обзор — новый статус там уже отразится
  };

  const fld = { display: "block" };
  const lbl = { display: "block", fontSize: "var(--fs-13)", color: "var(--muted)", marginBottom: 7, fontWeight: 600 };

  return (
    <div className="pd-overlay" role="dialog" aria-label={"Настройки проекта: " + data.name}>
      <OverlayHead onBack={onClose} budget={data.budget}
        crumbs={[{ label: "Проекты", onClick: onClose }, { label: data.name, onClick: () => goSection("") }, { label: "Настройки" }]}
        crumbMenu={data.id ? projCrumbMenu(data.id, "settings") : null}
        title="Настройки проекта" sub="Имя, срок, адрес объекта и обложка — видны в Обзоре и выгрузках" />

      <div className="pd-body solo">
        <div className="pd-main">
          <section className="pd-section" style={{ borderBottom: "none" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 640 }}>
              <label style={fld}>
                <span style={lbl}>Название проекта</span>
                <input className="fld" value={name} onChange={(e) => setName(e.target.value)} aria-label="Название проекта" />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={fld}>
                  <span style={lbl}>Начало работ</span>
                  <input className="fld" type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} aria-label="Начало работ" />
                </label>
                <label style={fld}>
                  <span style={lbl}>Окончание</span>
                  <input className="fld" type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} aria-label="Окончание работ" />
                </label>
              </div>

              <label style={fld}>
                <span style={lbl}>Адрес объекта</span>
                <input className="fld" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Напр. Москва, ул. Тверская, 12" aria-label="Адрес объекта" />
              </label>

              <label style={fld}>
                <span style={lbl}>Описание <span style={{ color: "var(--faint)", fontWeight: 400 }}>(показывается в Обзоре)</span></span>
                <textarea className="fld" rows={3} value={summaryShort} onChange={(e) => setSummaryShort(e.target.value)}
                  placeholder="Пара предложений о проекте — увидите на Обзоре и на портале" style={{ resize: "vertical", minHeight: 74 }} aria-label="Описание" />
              </label>

              <div>
                <span style={lbl}>Обложка</span>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {SETTINGS_COVERS.map((c) => (
                    <button key={c} type="button" onClick={() => setCover(c)} aria-pressed={cover === c} aria-label={"Обложка: " + c}
                      style={{ width: 72, height: 52, borderRadius: 10, overflow: "hidden", border: "2px solid " + (cover === c ? "var(--accent)" : "var(--hairline)"), flex: "none" }}>
                      <Img src={PHOTOS[c]} label="" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "16px 26px", borderTop: "1px solid var(--hairline)", background: "var(--surface)" }}>
        <button className="btn btn-ghost" onClick={archive} disabled={archiving}>{archiving ? "Архивируем…" : "Архивировать проект"}</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Сохраняем…" : <React.Fragment><I.check size={16} />Сохранить</React.Fragment>}</button>
      </div>
    </div>
  );
}

window.ProjectDetail = ProjectDetail;
window.ProjectSettings = ProjectSettings;
window.ProjectOverview = ProjectOverview;
window.RoomSpecOverlay = RoomSpecOverlay;   // рендерится из кабинета (импорт Excel / черновик калькулятора); в ES-модулях без явного экспорта был бы ReferenceError
