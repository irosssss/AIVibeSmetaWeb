/* ============================================================
   Design Ledger — ЛИЧНЫЙ КАБИНЕТ
   Вход (OAuth Яндекс ID / VK ID) · Профиль · Сохранённые проекты
   ============================================================ */
const { useState: useC, useEffect: useCE } = React;

/* ---------- Хеш-роутинг: #view/tab/sub/s2 (переживает F5, работает «назад»,
   sub — открытый проект: #cabinet/projects/p_1 → deep-link в проект (обзор смет-
   комплектаций — волна W2; для AI-демо — сразу деталь),
   s2 — раздел открытого проекта: '' обзор · smeta · client · procure · versions — W1/W2.
   Волна W3: студийные вкладки today (домашний экран «Сегодня») и procure
   (закупка-хаб — сквозная очередь по всем проектам) — не путать с тем же именем
   `procure` в s2: это студийный tab (#cabinet/procure), а s2 — раздел ОДНОГО
   открытого проекта (#cabinet/projects/p_1/procure); разные позиции адреса. ---------- */
const CAB_TABS = [["today", "Сегодня"], ["projects", "Проекты"], ["workshop", "Мастерская"], ["procure", "Закупка"], ["favorites", "Избранное"], ["profile", "Профиль"]];
const CAB_TAB_IDS = CAB_TABS.map((t) => t[0]);
/* старые адреса вкладок-редакторов живут как deep-links внутрь Мастерской:
   #cabinet/styles → #cabinet/workshop/styles */
const LEGACY_WORKSHOP = { styles: "styles" };
function parseRoute() {
  const h = (location.hash || "").replace(/^#\/?/, "");
  const [view, tab, sub, s2] = h.split("/");
  return { view: view || "site", tab: tab || "", sub: sub || "", s2: s2 || "" };
}
function applyRoute(view, tab, sub, s2) {
  const next = "#" + view + (tab ? "/" + tab : "") + (sub ? "/" + sub : "") + (s2 ? "/" + s2 : "");
  if (location.hash !== next) location.hash = next;
}
/* Долг W2/W6: уход со сметы (сайдбар/крошка-переключатель/⌘K/«Все проекты») без
   сохранения молча терял правки RoomSpecOverlay. window.pdSmetaDirty — мост: сама
   смета регистрирует {save}, пока в ней есть несохранённые правки (project-detail.jsx
   RoomSpecOverlay), снимает при сохранении/размонтировании. guardSmetaLeave — общая
   точка «спросить и сохранить, если есть что терять» для setRoute (сайдбар/крошка/
   назад) и смены студийной вкладки (только ⌘K может её вызвать при открытом проекте —
   сайдбар в этот момент показывает разделы проекта, не вкладки). Переход МЕЖДУ
   режимами той же сметы (smeta/client/procure/versions — RoomSpecOverlay не
   размонтируется, W1: «внутренние переключатели пишут адрес обратно») не спрашивает —
   держит staysInOverlay в setRoute. «Проекты»-крошка/стрелка назад/Esc внутри самой
   смёты — не отсюда, гвардятся локально (project-detail.jsx guardedClose). */
function guardSmetaLeave(action) {
  const g = window.pdSmetaDirty;
  if (!g) { action(); return; }
  confirmLeaveSmeta().then((ok) => {
    if (!ok) return;
    g.save().then(action).catch(() => toast("Не удалось сохранить смету — попробуйте вручную.", "warn"));
  });
}
function setRoute(view, tab, sub, s2) {
  const g = window.pdSmetaDirty;
  if (g) {
    const cur = parseRoute();
    const s2n = s2 || "";
    const staysInOverlay = view === cur.view && tab === cur.tab && sub === cur.sub && s2n !== "" && s2n !== "settings";
    if (!staysInOverlay) { guardSmetaLeave(() => applyRoute(view, tab, sub, s2)); return; }
  }
  applyRoute(view, tab, sub, s2);
}
/* прототип-свитчер и синтетический вход в админку — только в dev-окружении */
const DEV_MODE = location.hostname === "localhost" || location.hostname === "127.0.0.1" || /[?&]dev=1\b/.test(location.search);
window.parseRoute = parseRoute; window.setRoute = setRoute; window.applyRoute = applyRoute; window.guardSmetaLeave = guardSmetaLeave; window.DEV_MODE = DEV_MODE;

/* провайдерские кнопки — фирменные SVG-логотипы (Яндекс / VK) */
function YandexBtn({ onClick, loading }) {
  return (
    <button className="btn btn-block oauth-btn" onClick={onClick} disabled={loading}
      style={{ padding: "15px 20px", background: "#FC3F1D", color: "#fff", fontSize: "var(--fs-15)" }}>
      <svg width="20" height="20" viewBox="0 0 64 64" aria-hidden="true" style={{ flex: "none" }}>
        <path fill="#fff" d="M49.07 0c.524.405.262.88.095 1.333l-6.643 18.095-8.047 22.12a4.21 4.21 0 0 0-.262 1.429v19.81c0 1.2-.024 1.2-1.214 1.2-1.238 0-2.476-.048-3.714.024-.786.024-1.07-.238-1.048-1.024l.024-7.333V42.928c0-.5-.07-1.048-.262-1.524L14.976 7.333c-.095-.262-.238-.476-.357-.714v-.5c.38-.12.762-.3 1.143-.3l4.12-.024s1.357 0 1.81 1.286l9.7 27.31.405.976.333-1.095 1.905-6.976 8.5-26.31c.12-.333.405-.62.62-.93L49.07 0z"/>
      </svg>
      Войти через Яндекс ID
    </button>
  );
}
function VKBtn({ onClick, loading }) {
  return (
    <button className="btn btn-block oauth-btn" onClick={onClick} disabled={loading}
      style={{ padding: "15px 20px", background: "#0077FF", color: "#fff", fontSize: "var(--fs-15)" }}>
      <svg width="24" height="24" viewBox="0 0 256 256" aria-hidden="true" style={{ flex: "none" }}>
        <path fill="#fff" d="M136.21 184.43c-58.34 0-91.62-40-93.01-106.56h29.23c.96 48.85 22.5 69.54 39.57 73.81V77.87h27.52V120c16.85-1.81 34.56-21.01 40.53-42.13h27.52c-4.58 26.02-23.78 45.22-37.44 53.12 13.66 6.4 35.52 23.14 43.84 53.44h-30.29c-6.5-20.27-22.72-35.95-44.16-38.08v38.08h-3.3z"/>
      </svg>
      Войти через VK ID
    </button>
  );
}

/* ---------------- ЭКРАН ВХОДА / РЕГИСТРАЦИИ ---------------- */
function AuthScreen({ onAuthed, go }) {
  const [mode, setMode] = useC("login");      // login | register
  const [loading, setLoading] = useC(null);   // 'yandex' | 'vk' | null

  const login = async (provider) => {
    setLoading(provider);
    const ses = await (provider === "yandex" ? LedgerAPI.auth.loginWithYandex() : LedgerAPI.auth.loginWithVK());
    setLoading(null);
    onAuthed(ses.user);
  };

  return (
    <div className="auth-wrap minh-screen" style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr" }}>
      {/* левая — бренд-визуал */}
      <div className="auth-aside" style={{ position: "relative", overflow: "hidden", padding: "clamp(36px,5vw,64px)", display: "flex", flexDirection: "column", justifyContent: "space-between", borderRight: "1px solid var(--hairline)" }}>
        <Img src={PHOTOS.deco} label="интерьер" style={{ position: "absolute", inset: 0 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(46,42,38,.72), rgba(46,42,38,.9))" }} />
        <div style={{ position: "relative", zIndex: 2, color: "#FCF6EE" }}><Logo size={27} onClick={() => go("site")} /></div>
        <div style={{ position: "relative", zIndex: 2, color: "#FCF6EE" }}>
          <h2 className="display" style={{ fontSize: "clamp(30px,3.4vw,46px)", lineHeight: 1 }}>С возвращением<br />в студию</h2>
          <p style={{ color: "rgba(252,246,238,.82)", marginTop: 18, maxWidth: 380, fontSize: "var(--fs-15)", lineHeight: 1.6 }}>
            Проекты, сметы-комплектации, свои нормы и стили — рабочее место дизайнера в одном месте.
          </p>
        </div>
      </div>

      {/* правая — форма */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(28px,4vw,56px)" }}>
        <div style={{ width: "min(400px, 100%)" }}>
          <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--glass-2)", border: "1px solid var(--hairline)", borderRadius: 99, marginBottom: 30 }}>
            {[["login", "Вход"], ["register", "Регистрация"]].map(([k, t]) => (
              <button key={k} onClick={() => setMode(k)} style={{ flex: 1, padding: "10px", borderRadius: 99, fontWeight: 700, fontSize: "var(--fs-14)",
                background: mode === k ? "var(--accent)" : "transparent", color: mode === k ? "var(--on-accent)" : "var(--muted)", transition: "var(--dur-fast)" }}>{t}</button>
            ))}
          </div>

          <h1 className="display" style={{ fontSize: "var(--fs-30)", marginBottom: 8 }}>{mode === "login" ? "Вход в Design Ledger" : "Создать аккаунт"}</h1>
          <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", marginBottom: 26 }}>{mode === "login" ? "Войдите через российские сервисы — быстро и без пароля." : "Регистрация в один тап через Яндекс ID или VK ID."}</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <YandexBtn onClick={() => login("yandex")} loading={loading === "yandex"} />
            <VKBtn onClick={() => login("vk")} loading={loading === "vk"} />
          </div>

          {loading && <div style={{ marginTop: 16, fontSize: "var(--fs-13)", color: "var(--accent-2)", display: "flex", alignItems: "center", gap: 8 }}><span className="spin" />Авторизация через {loading === "yandex" ? "Яндекс ID" : "VK ID"}…</div>}

          {/* вход по e-mail появится вместе с реальной аутентификацией — декоративную форму убрали (честность превыше «полноты» экрана) */}

          <p style={{ color: "var(--muted)", fontSize: "var(--fs-12)", marginTop: 26, textAlign: "center", lineHeight: 1.5 }}>
            Продолжая, вы принимаете <a href="#offer" style={{ color: "var(--muted)", textDecoration: "underline" }}>оферту</a> и{" "}
            <a href="#policy" style={{ color: "var(--muted)", textDecoration: "underline" }}>политику конфиденциальности</a> Design Ledger.
          </p>
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <button onClick={() => go("site")} style={{ color: "var(--muted)", fontSize: "var(--fs-13)", textDecoration: "underline" }}>← На главную</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- КАБИНЕТ (рабочее пространство, волны W1+W3) ----------------
   Двухуровневая оболочка по эталону Programa: постоянный сайдбар студии
   (Сегодня / Проекты / Мастерская / Закупка / Избранное / Профиль), при открытом
   проекте сайдбар подменяется контекстом проекта (← назад · Обзор · Смета · Для
   клиента · Закупка · Версии). Роутинг прежний: #cabinet/{tab}/{sub}/{s2}. */

/* конфиг сайдбара студии; Мастерская — группа с под-пунктами (те же адреса, что были) */
const WS_ICONS = { today: "sun", projects: "layers", workshop: "sliders", procure: "truck", favorites: "heart", profile: "user" };
const WS_SUB_ICONS = { styles: "spark", products: "sofa", suppliers: "truck" };
/* разделы открытого проекта (s2 адреса); только для смет-комплектаций (data.rooms).
   W2: «Обзор» — лицо проекта и новый дефолт посадки (s2=''), смета переехала на
   'smeta' (паттерн Programa «клик по проекту = обзор, не сразу таблица»). */
const WS_PROJ_ITEMS = [
  ["", "Обзор", "chart"],
  ["smeta", "Смета", "grid"],
  ["client", "Для клиента", "user"],
  ["procure", "Закупка", "truck"],
  ["versions", "Версии и согласование", "news"],
  ["settings", "Настройки", "gear"],   // волна W4.2: детали проекта (срок/адрес/обложка/архив)
];
// Д2 (W6): список нужен и переключателю под-вьюх в крошке (OverlayHead, project-detail.jsx) —
// через window: кросс-файловые bare-const в этом Vite-трансформе нестабильны (журнал W2)
window.WS_PROJ_ITEMS = WS_PROJ_ITEMS;

/* Д3 (W6): «Недавнее» для ⌘K (паттерн Programa «Recently visited» при пустом запросе).
   История — за LedgerAPI.recents (mock.js, конвенция «вся персистенция за сигнатурой API»);
   пишет Cabinet при смене адреса, читает CmdK. Относительное время: свежее — минуты/часы,
   старше сегодняшнего дня — календарный fmtRelDays из ui.jsx («вчера» по границе суток
   честнее 24-часового окна; W6-ревью: Math.round давал «2 ч назад» на 90 минутах). */
const fmtAgo = (ts) => {
  const m = Math.floor(Math.max(0, Date.now() - ts) / 60000);
  if (m < 1) return "только что";
  if (m < 60) return m + " мин назад";
  const d = new Date(ts);
  if (d.toDateString() === new Date().toDateString()) return Math.floor(m / 60) + " ч назад";
  const pad = (n) => String(n).padStart(2, "0");
  return window.fmtRelDays(d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()));
};

function Cabinet({ user, onLogout, go }) {
  // старый адрес #cabinet/styles сразу переписываем на Мастерскую
  const normTab = (t) => (LEGACY_WORKSHOP[t] ? "workshop" : t);
  const r0 = parseRoute();   // один разбор адреса на все инициализаторы (useC-инициализатор выполняется единожды)
  const [tab, setTab] = useC(() => { const t = normTab(r0.tab); return CAB_TAB_IDS.includes(t) ? t : "today"; });
  const [projId, setProjId] = useC((r0.tab === "projects" && r0.sub) || null);
  const [projS2, setProjS2] = useC(r0.s2 || "");
  // подраздел Мастерской — СТЕЙТ, а не parseRoute() в рендере сайдбара: клик по подпункту
  // менял только hash, а все сеттеры hashchange-обработчика получали прежние значения →
  // React bail-out, Cabinet не ре-рендерился и подсветка сайдбара замирала на старом пункте
  // (контент при этом переключался — у Workshop свой hashchange-слушатель)
  const [wsSub, setWsSub] = useC(() => (WS_SUBS.some((x) => x.id === r0.sub) ? r0.sub : "styles"));
  const [proj, setProj] = useC(null);            // мета открытого проекта для сайдбара (имя, rooms?)
  const [drawer, setDrawer] = useC(false);       // мобильный сайдбар-drawer
  const [cmdk, setCmdk] = useC(false);           // W5.4: ⌘K-палитра поиска
  // ⌘K/Ctrl+K — везде в кабинете (e.code: не зависит от раскладки), повторное нажатие закрывает.
  // Закрытие (setCmdk(false)) разрешено всегда даже из полей ввода — это просто Esc-эквивалент;
  // ОТКРЫТИЕ из текстового поля/contentEditable глушим — иначе ⌘K посреди печати (переименование,
  // поле PosEditor, настройки) обрывает ввод и крадёт фокус под открывшуюся палитру.
  useCE(() => {
    const onKey = (e) => {
      if (e.code !== "KeyK" || !(e.metaKey || e.ctrlKey)) return;
      if (!cmdk && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable)) return;
      e.preventDefault();
      setCmdk((o) => !o);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cmdk]);
  const changeTab = (t) => {
    // studio-вкладки скрыты из сайдбара, пока открыт проект (WsSidebar: {!proj && ...}) —
    // единственный путь сюда при дирти-смете — студийный пункт из ⌘K; guardSmetaLeave
    // не даст setTab (эта смена не идёт через setRoute) молча снести RoomSpecOverlay
    guardSmetaLeave(() => {
      if (LEGACY_WORKSHOP[t]) { setTab("workshop"); applyRoute("cabinet", "workshop", LEGACY_WORKSHOP[t]); return; }
      setTab(t); applyRoute("cabinet", t);
    });
  };

  // синхронизация с адресом (кнопка «назад», deep-link, ручная правка hash)
  useCE(() => {
    const on = () => {
      const r = parseRoute();
      if (LEGACY_WORKSHOP[r.tab]) { setRoute("cabinet", "workshop", LEGACY_WORKSHOP[r.tab]); return; }
      if (CAB_TAB_IDS.includes(r.tab)) setTab(r.tab);
      if (r.tab === "workshop") setWsSub(WS_SUBS.some((x) => x.id === r.sub) ? r.sub : "styles");
      setProjId((r.view === "cabinet" && r.tab === "projects" && r.sub) || null);
      setProjS2(r.s2 || "");
      setDrawer(false);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  // при заходе без явной вкладки (или по старому адресу) — зафиксировать дефолт в адресе
  useCE(() => {
    const r = parseRoute();
    if (LEGACY_WORKSHOP[r.tab]) setRoute("cabinet", "workshop", LEGACY_WORKSHOP[r.tab]);
    else if (!CAB_TAB_IDS.includes(r.tab)) setRoute("cabinet", tab);
  }, []);

  // мета открытого проекта — только для сайдбара (имя + есть ли смета-комплектация)
  useCE(() => {
    if (!projId) { setProj(null); return; }
    let alive = true;
    // !!d.rooms был бы всегда true — .get() всегда отдаёт rooms как массив
    // (пустой сид-фолбэк для новых проектов, project-data.js), а [] тоже truthy
    LedgerAPI.projects.get(projId).then((d) => { if (alive) setProj(d && d.id ? { id: d.id, name: d.name, rooms: !!(d.rooms && d.rooms.length) } : null); });
    return () => { alive = false; };
  }, [projId]);
  // «Настройки» проекта (волна W4.2) переименовывают, пока сайдбар уже держит своё имя
  // из фетча выше (не перезапускается — он завязан на [projId], а не на смену имени) —
  // без этого шапка сайдбара показывала бы старое имя до закрытия/переоткрытия проекта
  useCE(() => {
    const onRenamed = (e) => { if (e.detail && e.detail.id === projId) setProj((p) => (p ? { ...p, name: e.detail.name } : p)); };
    window.addEventListener("aivibe:project-renamed", onRenamed);
    return () => window.removeEventListener("aivibe:project-renamed", onRenamed);
  }, [projId]);
  // то же для proj.rooms: первое сохранение сметы (RoomSpecOverlay.saveRoom) не меняет
  // projId, поэтому без моста сайдбар показывал бы плоский пункт «Проект» вместо
  // 4 стадий до закрытия/переоткрытия проекта
  useCE(() => {
    const onRoomsChanged = (e) => { if (e.detail && e.detail.id === projId) setProj((p) => (p ? { ...p, rooms: !!e.detail.rooms } : p)); };
    window.addEventListener("aivibe:project-rooms-changed", onRoomsChanged);
    return () => window.removeEventListener("aivibe:project-rooms-changed", onRoomsChanged);
  }, [projId]);

  // Д3 (W6): пишем «Недавнее» для ⌘K — открытый проект важнее вкладки-контейнера.
  // «Сегодня» (дефолт-посадка) и «Проекты» (список-контейнер, всегда один клик из сайдбара)
  // не пишем: при закрытии проекта переходное состояние projId=null/tab='projects'
  // забивало бы слоты строкой «Проекты» поверх только что покинутого проекта (W6-ревью)
  useCE(() => {
    if (projId) LedgerAPI.recents.push("proj", projId);
    else if (tab !== "today" && tab !== "projects") LedgerAPI.recents.push("tab", tab);
  }, [tab, projId]);

  const newProject = () => { setDrawer(false); changeTab("projects"); setTimeout(() => window.dispatchEvent(new CustomEvent("aivibe:new-project")), 0); };

  return (
    <div className="ws minh-screen">
      {cmdk && <CmdK onClose={() => setCmdk(false)} onTab={changeTab} />}
      <WsSidebar user={user} onLogout={onLogout} go={go} tab={tab} onTab={changeTab} wsSub={wsSub}
        proj={projId ? (proj || { id: projId, name: "", pending: true }) : null} projS2={projS2} onNewProject={newProject}
        onSearch={() => setCmdk(true)}
        open={drawer} onClose={() => setDrawer(false)} />
      {drawer && <div className="ws-scrim" onClick={() => setDrawer(false)} aria-hidden="true" />}
      <div className="ws-content">
        <div className="ws-topbar">
          <button className="icon-btn" onClick={() => setDrawer(true)} aria-label="Открыть меню кабинета"><I.grid size={19} /></button>
          <Logo size={21} onClick={() => go("site")} />
          <button className="btn btn-primary" style={{ padding: "8px 13px", fontSize: "var(--fs-13)", marginLeft: "auto" }} onClick={newProject}><I.plus size={15} />Проект</button>
        </div>
        <main id="main" className="container" style={{ paddingBlock: "clamp(28px,4vh,48px)" }}>
          <div key={tab} className="view-enter">
            {tab === "profile" ? <Profile user={user} />
              : tab === "favorites" ? <Favorites />
              : tab === "workshop" ? <Workshop />
              : tab === "procure" ? <ProcureHub onOpen={(id) => setRoute("cabinet", "projects", id)} />
              : tab === "projects" ? <Projects />
              : <Today user={user} onNewProject={newProject} onOpenProjects={() => changeTab("projects")} />}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ---------------- Сайдбар воркспейса (W1) ----------------
   Студийный уровень ↔ уровень проекта: при открытом проекте контент сайдбара
   полностью подменяется (паттерн Programa), «←» возвращает к списку проектов. */
function WsSidebar({ user, onLogout, go, tab, onTab, proj, projS2, onNewProject, onSearch, open, onClose, wsSub: wsSubProp }) {
  // подсветка подпункта — из стейта Cabinet (см. wsSub там), НЕ из parseRoute() в рендере
  const wsSub = tab === "workshop" ? wsSubProp : null;
  const goProjSection = (s2) => proj && setRoute("cabinet", "projects", proj.id, s2);

  const item = (key, label, icon, { on, onClick, sub } = {}) => {
    const Ico = I[icon] || I.grid;
    return (
      <button key={key} className={"ws-item" + (on ? " on" : "") + (sub ? " sub" : "")} onClick={onClick} aria-current={on ? "page" : undefined}>
        <Ico size={16} style={{ flex: "none" }} />
        <span className="ws-item-t">{label}</span>
      </button>
    );
  };
  /* W5.4: «Поиск ⌘K» над навигацией (паттерн Programa) — бейдж хоткея видим в UI */
  const searchItem = (
    <button className="ws-item" onClick={() => { onClose(); onSearch(); }}>
      <I.search size={16} style={{ flex: "none" }} />
      <span className="ws-item-t">Поиск</span>
      <span className="kbd" style={{ marginLeft: "auto" }}>⌘K</span>
    </button>
  );

  return (
    <aside className={"ws-side" + (open ? " open" : "")} aria-label={proj ? "Разделы проекта" : "Разделы кабинета"}>
      <div className="ws-head">
        <Logo size={22} onClick={() => go("site")} />
        <button className="icon-btn ws-close" onClick={onClose} aria-label="Закрыть меню"><I.close size={17} /></button>
      </div>

      {!proj && (
        <React.Fragment>
          <button className="btn btn-primary ws-new" onClick={onNewProject}><I.plus size={16} />Новый проект</button>
          {searchItem}
          <div style={{ height: 6 }} />
          <nav className="ws-nav" aria-label="Кабинет">
            {CAB_TABS.map(([k, t]) => (
              <React.Fragment key={k}>
                {item(k, t, WS_ICONS[k], { on: tab === k, onClick: () => onTab(k) })}
                {k === "workshop" && tab === "workshop" && WS_SUBS.map((s) =>
                  item("ws_" + s.id, s.label, WS_SUB_ICONS[s.id], { sub: true, on: wsSub === s.id, onClick: () => setRoute("cabinet", "workshop", s.id) }))}
              </React.Fragment>
            ))}
          </nav>
        </React.Fragment>
      )}

      {proj && (
        <React.Fragment>
          <button className="ws-back" onClick={() => setRoute("cabinet", "projects")}><I.arrow size={15} style={{ transform: "rotate(180deg)" }} />Все проекты</button>
          {searchItem}
          <div style={{ height: 6 }} />
          {/* пока мета проекта грузится — скелетон вместо ложного студийного меню (у оверлея уже проектный контекст) */}
          {proj.pending
            ? <div style={{ padding: "0 12px" }}><div className="skel" style={{ height: 22, borderRadius: 8, marginBottom: 14 }} /><div className="skel" style={{ height: 120, borderRadius: 10 }} /></div>
            : <React.Fragment>
                <div className="ws-proj-name display" title={proj.name}>{proj.name}</div>
                <nav className="ws-nav" aria-label="Разделы проекта">
                  {proj.rooms
                    ? WS_PROJ_ITEMS.map(([s2, label, icon]) => item("p_" + s2, label, icon, { on: (projS2 || "") === s2, onClick: () => goProjSection(s2) }))
                    : item("p_", "Проект", "cube", { on: true, onClick: () => goProjSection("") })}
                </nav>
              </React.Fragment>}
        </React.Fragment>
      )}

      <div className="ws-foot">
        {item("changelog", "Что нового", "news", { onClick: () => go("changelog") })}
        <div style={{ height: 8 }} />
        <AccountMenu user={user} onLogout={onLogout} onTab={(t) => { onClose(); onTab(t); }} up />
      </div>
    </aside>
  );
}

/* ---------------- МАСТЕРСКАЯ: стили + товары + поставщики под одной крышей ----------------
   Редакторы недельного ритма (библиотека стилей, товары студии, поставщики) собраны
   в один раздел — топбар остаётся языку петли дня. Каждый редактор рендерит
   свою шапку сам, здесь только переключатель и sub-роут #cabinet/workshop/{sub}. */
const WS_SUBS = [{ id: "styles", label: "Мои стили" }, { id: "products", label: "Товары" }, { id: "suppliers", label: "Поставщики" }];
function Workshop() {
  const [sub, setSub] = useC(() => { const s = parseRoute().sub; return WS_SUBS.some((x) => x.id === s) ? s : "styles"; });
  const change = (s) => { setSub(s); setRoute("cabinet", "workshop", s); };
  useCE(() => {
    const on = () => { const r = parseRoute(); if (r.tab === "workshop" && WS_SUBS.some((x) => x.id === r.sub)) setSub(r.sub); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  useCE(() => { const r = parseRoute(); if (r.tab === "workshop" && !WS_SUBS.some((x) => x.id === r.sub)) setRoute("cabinet", "workshop", sub); }, []);
  return (
    <div>
      {/* на десктопе разделы Мастерской ведёт сайдбар (W1); сег-табы остаются мобильной навигацией */}
      <SegTabs className="pd-seg ws-dup-tabs" items={WS_SUBS} value={sub} onChange={change} ariaLabel="Раздел мастерской" style={{ marginBottom: 22 }} />
      {sub === "products" ? <ProductsLibrary /> : sub === "suppliers" ? <SuppliersBook /> : <StylesLibrary />}
    </div>
  );
}

/* AppTopBar (фикс-топбар с вкладками) удалён в W1: кабинет целиком на WsSidebar,
   других потребителей у топбара не было (админка рендерит свою шапку сама) */

/* ---------------- ⌘K-палитра (W5.4, спека §5.9) ----------------
   Поиск по проектам и разделам кабинета: ↑↓ — по результатам, ↵ — открыть,
   Esc — закрыть (Modal). Проекты первыми, футер — видимые подсказки клавиш. */
function CmdK({ onClose, onTab }) {
  const [q, setQ] = useC("");
  const [projects, setProjects] = useC(null);
  const [recents, setRecents] = useC([]);   // Д3: история читается раз на открытие палитры
  const [idx, setIdx] = useC(0);
  const [here] = useC(() => parseRoute());  // текущее место — самоссылку в «Недавнем» не показываем
  useCE(() => {
    LedgerAPI.projects.list().then((l) => {
      const list = l || [];
      // мёртвые id (удалённые проекты) чистятся из слотов истории по живому списку.
      // Оба setState — в ОДНОМ колбэке (батч React 18): иначе список успевал кадр
      // отрисоваться без «Недавнего» и строки съезжали под Enter/курсором (ревью р.2)
      LedgerAPI.recents.prune(list.map((p) => p.id)).then((keep) => { setRecents(keep); setProjects(list); });
    });
  }, []);
  const qq = q.trim().toLowerCase();
  const match = (s) => !qq || (s.label + " " + (s.sub || "")).toLowerCase().includes(qq);
  const curProj = (here.view === "cabinet" && here.tab === "projects" && here.sub) || null;
  // Д3 (W6): пустой запрос = «Недавнее» первым (паттерн Programa «Recently visited»);
  // ниже — полные списки без дублей недавнего. Поиск — по полным спискам, как раньше.
  // До загрузки проектов список пуст (только «Загрузка…») — иначе Enter в первый миг
  // улетал бы в случайно выживший ряд (W6-ревью).
  const recentRows = qq ? [] : recents.map((r) => {
    if (r.kind === "proj") {
      if (r.id === curProj) return null;
      const p = (projects || []).find((x) => x.id === r.id);
      return p && { kind: "proj", id: p.id, label: p.name, sub: fmtAgo(r.at), group: "Недавнее" };
    }
    if (!curProj && r.id === here.tab) return null;
    const t = CAB_TABS.find(([id]) => id === r.id);   // легаси-вкладка из старой истории — тихо выпадает
    return t && { kind: "tab", id: t[0], label: t[1], sub: fmtAgo(r.at), group: "Недавнее" };
  }).filter(Boolean);
  const inRecent = new Set(recentRows.map((r) => r.kind + ":" + r.id));
  const results = projects == null ? [] : [
    ...recentRows,
    ...projects.map((p) => ({ kind: "proj", id: p.id, label: p.name, sub: [p.status, p.style, p.room].filter(Boolean).join(" · ") }))
      .filter(match).filter((r) => !inRecent.has("proj:" + r.id)),
    ...CAB_TABS.map(([id, label]) => ({ kind: "tab", id, label, sub: "Раздел кабинета" }))
      .filter(match).filter((r) => !inRecent.has("tab:" + r.id)),
  ];
  const cur = Math.min(idx, Math.max(0, results.length - 1));
  const pick = (r) => { if (!r) return; onClose(); if (r.kind === "proj") setRoute("cabinet", "projects", r.id); else onTab(r.id); };
  const onKey = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => { const n = results.length; if (!n) return 0; return e.key === "ArrowDown" ? (Math.min(i, n - 1) + 1) % n : (Math.min(i, n - 1) - 1 + n) % n; });
    }
    if (e.key === "Enter") { e.preventDefault(); pick(results[cur]); }
  };
  let lastGroup = null;   // заголовки групп: «Недавнее» → «Проекты» → «Разделы» (Д3)
  return (
    <Modal onClose={onClose} label="Поиск по кабинету" maxWidth={560}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid var(--hairline)" }}>
        <I.search size={17} style={{ color: "var(--faint)", flex: "none" }} />
        <input value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); }} onKeyDown={onKey}
          placeholder="Проекты и разделы кабинета…" aria-label="Поиск по кабинету"
          style={{ flex: 1, border: "none", outline: "none", background: "none", font: "inherit", fontSize: "var(--fs-15)", color: "var(--text)" }} />
      </div>
      <div style={{ maxHeight: 380, overflowY: "auto", padding: 6 }} role="listbox" aria-label="Результаты поиска">
        {projects == null && <div style={{ padding: "14px 12px", fontSize: "var(--fs-13)", color: "var(--muted)" }}>Загрузка…</div>}
        {projects != null && results.length === 0 && <div style={{ padding: "14px 12px", fontSize: "var(--fs-13)", color: "var(--muted)" }}>По запросу «{q.trim()}» ничего не нашлось.</div>}
        {results.map((r, i) => {
          const group = r.group || (r.kind === "proj" ? "Проекты" : "Разделы");
          const head = group !== lastGroup ? (lastGroup = group, group) : null;
          const Ico = r.kind === "proj" ? I.layers : (I[WS_ICONS[r.id]] || I.grid);
          return (
            <React.Fragment key={(r.group ? "rec:" : "") + r.kind + r.id}>
              {head && <div style={{ fontSize: "var(--fs-11)", fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--faint)", padding: "8px 10px 4px" }}>{head}</div>}
              <button role="option" aria-selected={i === cur} className="menu-item" onClick={() => pick(r)} onMouseEnter={() => setIdx(i)}
                style={i === cur ? { background: "var(--surface-2)" } : undefined}>
                <Ico size={16} style={{ color: "var(--muted)", flex: "none" }} />
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
                {r.sub && <span style={{ marginLeft: "auto", fontSize: "var(--fs-11)", color: "var(--spec-meta)", whiteSpace: "nowrap", flex: "none" }}>{r.sub}</span>}
              </button>
            </React.Fragment>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 16px", borderTop: "1px solid var(--hairline)", fontSize: "var(--fs-11)", color: "var(--spec-meta)" }}>
        <span><span className="kbd">↑↓</span> — по списку</span>
        <span><span className="kbd">↵</span> — открыть</span>
        <span style={{ marginLeft: "auto" }}><span className="kbd">esc</span> — закрыть</span>
      </div>
    </Modal>
  );
}

/* аккаунт-меню: профиль · тариф/биллинг · настройки · выйти
   up — раскрытие вверх (низ сайдбара воркспейса, волна W1) */
function AccountMenu({ user, onLogout, onTab, up }) {
  const [open, setOpen] = useC(false);
  useMenu(open, () => setOpen(false), "acc-menu");   // Esc/стрелки/click-outside — единый паттерн меню
  const billing = () => { setOpen(false); LedgerAPI.billing.createPayment({ plan: "pro_month" }).then((r) => toast(r.message || "Оплата подключится позже.", "info", 5000)); };
  const item = (label, Ico, onClick, danger) => (
    <button role="menuitem" className="menu-item" onClick={onClick} style={danger ? { color: "var(--accent-ink)" } : undefined}>
      <Ico size={16} style={{ color: danger ? "var(--accent)" : "var(--muted)", flex: "none" }} />{label}
    </button>
  );
  return (
    <div className="acc-menu" style={{ position: "relative" }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} style={{ display: "flex", alignItems: "center", gap: 10 }} aria-haspopup="menu" aria-expanded={open}>
        <Avatar user={user} size={36} />
        <div className="cab-username" style={{ lineHeight: 1.2, textAlign: "left" }}>
          <div style={{ fontWeight: 700, fontSize: "var(--fs-14)" }}>{user.name}</div>
          <div style={{ fontSize: "var(--fs-12)", color: "var(--muted)" }}>{user.provider === "yandex" ? "Яндекс ID" : "VK ID"}</div>
        </div>
        <I.arrow size={13} style={{ color: "var(--faint)", flex: "none", transform: open ? "rotate(-90deg)" : "rotate(90deg)", transition: "var(--dur-fast)" }} />
      </button>
      {open && (
        <div className="menu menu-pop" role="menu" style={{ position: "absolute", ...(up ? { bottom: "calc(100% + 10px)", left: 0 } : { top: "calc(100% + 10px)", right: 0 }), minWidth: 214, zIndex: 90 }}>
          <div style={{ padding: "6px 12px 10px", borderBottom: "1px solid var(--hairline)", marginBottom: 6 }}>
            <div style={{ fontWeight: 700, fontSize: "var(--fs-13)" }}>{user.name}</div>
            <div style={{ fontSize: "var(--fs-12)", color: "var(--muted)" }}>{user.email}</div>
          </div>
          {item("Профиль", I.user, () => { setOpen(false); onTab("profile"); })}
          {item("Тариф и биллинг", I.wallet, billing)}
          <div style={{ height: 1, background: "var(--hairline)", margin: "6px 4px" }} />
          {item("Выйти", I.logout, () => { setOpen(false); onLogout(); }, true)}
        </div>
      )}
    </div>
  );
}

function Avatar({ user, size = 40 }) {
  const initials = user.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: user.avatar || "var(--accent)", color: "var(--on-accent)",
      display: "grid", placeItems: "center", fontWeight: 800, fontSize: size * 0.36, flex: "none", fontFamily: "var(--font-display)" }}>{initials}</div>
  );
}

window.AuthScreen = AuthScreen;
window.Cabinet = Cabinet;
window.Avatar = Avatar;
