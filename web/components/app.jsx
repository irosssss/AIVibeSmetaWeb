/* ============================================================
   AIVibe — App shell: роутинг между промо / кабинет / админка
   + прототип-навигация (свитчер)
   ============================================================ */
const { useState: useApp, useEffect: useAppE } = React;

const VIEWS = ["site", "auth", "cabinet", "admin"];
const routeView = () => { const v = parseRoute().view; return VIEWS.includes(v) ? v : "site"; };

function App() {
  const [view, setView] = useApp(routeView);   // site | auth | cabinet | admin
  const [user, setUser] = useApp(null);
  const [ready, setReady] = useApp(false);      // сессия проверена
  const initView = useApp(routeView())[0];      // куда целились при загрузке (для гейта мигания)

  // синтетический админ для прямого входа в админку из dev-свитчера
  const ADMIN = { id: "u_1", name: "Ирина Соколова", email: "irina@aivibe.ru", role: "admin", provider: "yandex", avatar: "#C25A36" };

  // регидратация сессии: без неё F5 всегда выкидывал на промо
  useAppE(() => {
    AIVibeAPI.auth.getSession().then((s) => { if (s && s.user) setUser(s.user); }).finally(() => setReady(true));
  }, []);

  // back/forward и ручная правка адреса
  useAppE(() => {
    const on = () => setView(routeView());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const go = (v) => {
    if (v === "cabinet") {
      if (user) { setView("cabinet"); setRoute("cabinet", parseRoute().tab || "projects"); }
      else { setView("auth"); setRoute("auth"); }
      return;
    }
    if (v === "admin") {
      if (!DEV_MODE) return;                       // эскалация в админку — только в dev
      if (!user || user.role !== "admin") setUser(ADMIN);
      setView("admin"); setRoute("admin"); return;
    }
    setView(v); setRoute(v);
  };

  const onAuthed = (u) => { setUser(u); setView("cabinet"); setRoute("cabinet", "projects"); };
  const onLogout = () => { AIVibeAPI.auth.logout(); setUser(null); setView("site"); setRoute("site"); };

  // ждём проверку сессии, если целимся в кабинет — чтобы не мигнуть промо/логином
  if (!ready && (initView === "cabinet" || initView === "auth")) {
    return <div className="minh-screen" style={{ display: "grid", placeItems: "center" }}><span className="spin" style={{ width: 30, height: 30 }} /></div>;
  }

  let screen;
  if (view === "auth") screen = <AuthScreen onAuthed={onAuthed} go={go} />;
  else if (view === "cabinet") screen = user ? <Cabinet user={user} onLogout={onLogout} go={go} /> : <AuthScreen onAuthed={onAuthed} go={go} />;
  else if (view === "admin") screen = DEV_MODE ? <Admin user={user || ADMIN} onLogout={onLogout} go={go} /> : <SitePage go={go} />;
  else screen = <SitePage go={go} />;

  return (
    <React.Fragment>
      {screen}
      {DEV_MODE && <ProtoSwitch view={view} go={go} user={user} />}
    </React.Fragment>
  );
}

/* свитчер областей прототипа */
function ProtoSwitch({ view, go, user }) {
  const cur = view === "auth" ? "cabinet" : view;
  const items = [["site", "Промо"], ["cabinet", "Кабинет"], ["admin", "Админка"]];
  return (
    <div className="proto-switch" role="tablist" aria-label="Навигация по прототипу">
      <span className="pl">AIVibe</span>
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
  componentDidCatch(err, info) { console.error("[AIVibe] render error:", err, info); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="minh-screen" style={{ display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
        <div>
          <div className="display" style={{ fontSize: 26, marginBottom: 10 }}>Что-то пошло не так…</div>
          <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 420, margin: "0 auto 20px", lineHeight: 1.6 }}>
            Экран споткнулся на ошибке. Обновите страницу — проекты и настройки сохранены.
          </p>
          <button className="btn btn-primary" onClick={() => location.reload()}>Обновить страницу</button>
        </div>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(<ErrorBoundary><App /></ErrorBoundary>);
