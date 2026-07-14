/* ============================================================
   Design Ledger — App shell: роутинг между промо / кабинет / админка
   + прототип-навигация (свитчер)
   ============================================================ */
const { useState: useApp, useEffect: useAppE } = React;

const VIEWS = ["site", "auth", "cabinet", "admin", "portal", "changelog", "journal", "article", "policy", "offer", "for-suppliers"];
/* публичные страницы без кабинет-хрома и dev-свитчера (портал клиента + контент-страницы) */
const PUBLIC_VIEWS = ["portal", "changelog", "journal", "article", "policy", "offer", "for-suppliers"];
const routeView = () => { const v = parseRoute().view; return VIEWS.includes(v) ? v : "site"; };

/* document.title раньше ставил только портал — кабинет/смета/админка жили с одним
   90-символьным SEO-тайтлом промо (вкладки в браузере неразличимы). sub — читаемая
   деталь (имя открытого проекта в смете); без неё — просто заголовок вкладки. */
const VIEW_TITLE = { auth: "Вход", cabinet: "Кабинет", admin: "Админка", changelog: "Что нового", journal: "Журнал", article: "Журнал", policy: "Политика конфиденциальности", offer: "Публичная оферта", "for-suppliers": "Поставщикам" };
const SITE_TITLE = document.title;   // SEO-тайтл промо из index.html — захвачен один раз при загрузке
function setTitle(view, sub) {
  if (view === "portal") return;               // портал ставит свой тайтл сам (ClientPortal)
  if (view === "site") { document.title = SITE_TITLE; return; }
  const label = VIEW_TITLE[view];
  document.title = (sub ? sub + " — " : "") + (label ? label + " — " : "") + "Design Ledger";
}
window.setTitle = setTitle;

function App() {
  const [view, setView] = useApp(routeView);   // site | auth | cabinet | admin
  const [user, setUser] = useApp(null);
  const [ready, setReady] = useApp(false);      // сессия проверена
  const initView = useApp(routeView())[0];      // куда целились при загрузке (для гейта мигания)

  // синтетический админ для прямого входа в админку из dev-свитчера
  const ADMIN = { id: "u_1", name: "Ирина Соколова", email: "irina@designledger.ru", role: "admin", provider: "yandex", avatar: "#B7502C" };

  // регидратация сессии: без неё F5 всегда выкидывал на промо
  useAppE(() => {
    LedgerAPI.auth.getSession().then((s) => { if (s && s.user) setUser(s.user); }).finally(() => setReady(true));
  }, []);

  // back/forward и ручная правка адреса
  useAppE(() => {
    const on = () => setView(routeView());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  // вкладка браузера различима между промо/кабинетом/админкой (ProjectDetail сам
  // уточняет тайтл именем проекта, когда открыт — см. project-detail.jsx).
  // Тайтл считаем по той же логике, что ниже решает screen — иначе для
  // #cabinet без сессии или #admin вне DEV_MODE вкладка врёт: экран уже
  // логин/промо, а title всё ещё «Кабинет»/«Админка».
  const effectiveView = view === "cabinet" && !user ? "auth" : view === "admin" && !DEV_MODE ? "site" : view;
  useAppE(() => { setTitle(effectiveView); }, [effectiveView]);

  // дефолтная вкладка кабинета (сейчас «Сегодня», волна W3) решается ОДИН раз —
  // в Cabinet (cabinet.jsx: CAB_TAB_IDS.includes(t) ? t : "today"); здесь и в
  // onAuthed ниже НЕ дублируем этот выбор хардкодом — при пустом табе просто не
  // указываем его в адресе, и Cabinet сам подставит дефолт при монтировании
  // guardSmetaLeave (cabinet.jsx) — go()/onLogout() меняют view/user ДО вызова
  // setRoute (Logo/аккаунт-меню видны и при открытом проекте, cabinet.jsx WsSidebar
  // ws-head), а setView сам по себе уже размонтирует Cabinet/RoomSpecOverlay —
  // без guardSmetaLeave вокруг ВСЕГО тела спрошенный setRoute внутри опоздал бы
  // (тот же класс бага, что был у closeProject/changeTab, долг W2/W6). applyRoute —
  // не setRoute: guardSmetaLeave уже спросил/сохранил, повторный вопрос был бы гонкой.
  const go = (v, tab) => {
    guardSmetaLeave(() => {
      if (v === "cabinet") {
        // tab — необязательный целевой таб (сейчас только «Собрать смету-черновик»
        // калькулятора на лендинге: без него садится на дефолт «Сегодня», где черновик
        // не виден — его подхватывает эффект внутри Projects); без tab — прежнее
        // поведение (сохранить текущий таб адреса, дефолт решает Cabinet при монтировании).
        if (user) { setView("cabinet"); applyRoute("cabinet", tab || parseRoute().tab); }
        else { setView("auth"); applyRoute("auth"); }
        return;
      }
      if (v === "admin") {
        if (!DEV_MODE) return;                       // эскалация в админку — только в dev
        if (!user || user.role !== "admin") setUser(ADMIN);
        setView("admin"); applyRoute("admin"); return;
      }
      setView(v); applyRoute(v);
    });
  };

  const onAuthed = (u) => { setUser(u); setView("cabinet"); setRoute("cabinet"); };
  const onLogout = () => { guardSmetaLeave(() => { LedgerAPI.auth.logout(); setUser(null); setView("site"); applyRoute("site"); }); };

  // ждём проверку сессии, если целимся в кабинет — чтобы не мигнуть промо/логином
  if (!ready && (initView === "cabinet" || initView === "auth")) {
    return (
      <div className="minh-screen" style={{ display: "grid", placeItems: "center" }} role="status" aria-label="Загрузка">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <span className="spin" style={{ width: 30, height: 30 }} aria-hidden="true" />
          <span className="mono" style={{ fontSize: "var(--fs-12)", color: "var(--muted)" }}>Загрузка…</span>
        </div>
      </div>
    );
  }

  let screen;
  // клиентский портал (волна A2): публичная страница-ссылка, без кабинет-хрома и авторизации
  if (view === "portal") screen = <ClientPortal shareId={parseRoute().tab} />;
  else if (view === "changelog") screen = <ChangelogPage go={go} user={user} />;
  else if (view === "journal") screen = <JournalPage go={go} user={user} />;
  else if (view === "article") screen = <ArticlePage id={parseRoute().tab} go={go} user={user} />;
  else if (view === "policy") screen = <PolicyPage go={go} user={user} />;
  else if (view === "offer") screen = <OfferPage go={go} user={user} />;
  else if (view === "for-suppliers") screen = <ForSuppliersPage go={go} user={user} />;
  else if (view === "auth") screen = <AuthScreen onAuthed={onAuthed} go={go} />;
  else if (view === "cabinet") screen = user ? <Cabinet user={user} onLogout={onLogout} go={go} /> : <AuthScreen onAuthed={onAuthed} go={go} />;
  else if (view === "admin") screen = DEV_MODE ? <Admin user={user || ADMIN} onLogout={onLogout} go={go} /> : <SitePage go={go} />;
  else screen = <SitePage go={go} />;

  return (
    <React.Fragment>
      {screen}
      {DEV_MODE && !PUBLIC_VIEWS.includes(view) && <ProtoSwitch view={view} go={go} user={user} />}
    </React.Fragment>
  );
}

/* свитчер областей прототипа */
function ProtoSwitch({ view, go, user }) {
  const cur = view === "auth" ? "cabinet" : view;
  const items = [["site", "Промо"], ["cabinet", "Кабинет"], ["admin", "Админка"]];
  return (
    <div className="proto-switch" role="tablist" aria-label="Навигация по прототипу">
      <span className="pl">Design Ledger</span>
      {items.map(([k, t]) => (
        <button key={k} className={cur === k ? "on" : ""} onClick={() => go(k)} role="tab" aria-selected={cur === k}>{t}</button>
      ))}
    </div>
  );
}

/* границa ошибок: сбой любого экрана → тёплая заглушка вместо белого экрана */
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error("[Design Ledger] render error:", err, info); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="minh-screen" style={{ display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
        <div>
          <div className="display" style={{ fontSize: "var(--fs-26)", marginBottom: 10 }}>Что-то пошло не так…</div>
          <p style={{ color: "var(--muted)", fontSize: "var(--fs-15)", maxWidth: 420, margin: "0 auto 20px", lineHeight: 1.6 }}>
            Экран споткнулся на ошибке. Обновите страницу — проекты и настройки сохранены.
          </p>
          <button className="btn btn-primary" onClick={() => location.reload()}>Обновить страницу</button>
        </div>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(<ErrorBoundary><App /></ErrorBoundary>);
