/* ============================================================
   Design Ledger — ЛИЧНЫЙ КАБИНЕТ
   Вход (OAuth Яндекс ID / VK ID) · Профиль · Сохранённые проекты
   ============================================================ */
const { useState: useC, useEffect: useCE } = React;

/* ---------- Хеш-роутинг: #view/tab/sub (переживает F5, работает «назад»,
   sub — открытый проект: #cabinet/projects/p_1 → deep-link на смету) ---------- */
const CAB_TABS = [["projects", "Проекты"], ["workshop", "Мастерская"], ["favorites", "Избранное"], ["profile", "Профиль"]];
const CAB_TAB_IDS = CAB_TABS.map((t) => t[0]);
/* старые адреса вкладок-редакторов живут как deep-links внутрь Мастерской:
   #cabinet/styles → #cabinet/workshop/styles, #cabinet/norms → #cabinet/workshop/norms */
const LEGACY_WORKSHOP = { styles: "styles", norms: "norms" };
function parseRoute() {
  const h = (location.hash || "").replace(/^#\/?/, "");
  const [view, tab, sub] = h.split("/");
  return { view: view || "site", tab: tab || "", sub: sub || "" };
}
function setRoute(view, tab, sub) {
  const next = "#" + view + (tab ? "/" + tab : "") + (sub ? "/" + sub : "");
  if (location.hash !== next) location.hash = next;
}
/* прототип-свитчер и синтетический вход в админку — только в dev-окружении */
const DEV_MODE = location.hostname === "localhost" || location.hostname === "127.0.0.1" || /[?&]dev=1\b/.test(location.search);
window.parseRoute = parseRoute; window.setRoute = setRoute; window.DEV_MODE = DEV_MODE;

/* провайдерские кнопки — фирменные SVG-логотипы (Яндекс / VK) */
function YandexBtn({ onClick, loading }) {
  return (
    <button className="btn btn-block oauth-btn" onClick={onClick} disabled={loading}
      style={{ padding: "15px 20px", background: "#FC3F1D", color: "#fff", fontSize: 15.5 }}>
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
      style={{ padding: "15px 20px", background: "#0077FF", color: "#fff", fontSize: 15.5 }}>
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
    const ses = await (provider === "yandex" ? AIVibeAPI.auth.loginWithYandex() : AIVibeAPI.auth.loginWithVK());
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
          <p style={{ color: "rgba(252,246,238,.82)", marginTop: 18, maxWidth: 380, fontSize: 15.5, lineHeight: 1.6 }}>
            Проекты, сметы-комплектации, свои нормы и стили — рабочее место дизайнера в одном месте.
          </p>
        </div>
      </div>

      {/* правая — форма */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(28px,4vw,56px)" }}>
        <div style={{ width: "min(400px, 100%)" }}>
          <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--glass-2)", border: "1px solid var(--hairline)", borderRadius: 99, marginBottom: 30 }}>
            {[["login", "Вход"], ["register", "Регистрация"]].map(([k, t]) => (
              <button key={k} onClick={() => setMode(k)} style={{ flex: 1, padding: "10px", borderRadius: 99, fontWeight: 700, fontSize: 14,
                background: mode === k ? "var(--accent)" : "transparent", color: mode === k ? "var(--on-accent)" : "var(--muted)", transition: ".2s" }}>{t}</button>
            ))}
          </div>

          <h1 className="display" style={{ fontSize: 30, marginBottom: 8 }}>{mode === "login" ? "Вход в Design Ledger" : "Создать аккаунт"}</h1>
          <p style={{ color: "var(--muted)", fontSize: 14.5, marginBottom: 26 }}>{mode === "login" ? "Войдите через российские сервисы — быстро и без пароля." : "Регистрация в один тап через Яндекс ID или VK ID."}</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <YandexBtn onClick={() => login("yandex")} loading={loading === "yandex"} />
            <VKBtn onClick={() => login("vk")} loading={loading === "vk"} />
          </div>

          {loading && <div style={{ marginTop: 16, fontSize: 13.5, color: "var(--accent-2)", display: "flex", alignItems: "center", gap: 8 }}><span className="spin" />Авторизация через {loading === "yandex" ? "Яндекс ID" : "VK ID"}…</div>}

          {/* вход по e-mail появится вместе с реальной аутентификацией — декоративную форму убрали (честность превыше «полноты» экрана) */}

          <p style={{ color: "var(--faint)", fontSize: 12.5, marginTop: 26, textAlign: "center", lineHeight: 1.5 }}>
            Продолжая, вы соглашаетесь с условиями и политикой конфиденциальности Design Ledger.
          </p>
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <button onClick={() => go("site")} style={{ color: "var(--muted)", fontSize: 13.5, textDecoration: "underline" }}>← На главную</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- КАБИНЕТ (рабочее пространство) ---------------- */
function Cabinet({ user, onLogout, go }) {
  // старые адреса #cabinet/styles|norms сразу переписываем на Мастерскую
  const normTab = (t) => (LEGACY_WORKSHOP[t] ? "workshop" : t);
  const [tab, setTab] = useC(() => { const t = normTab(parseRoute().tab); return CAB_TAB_IDS.includes(t) ? t : "projects"; });
  const changeTab = (t) => {
    if (LEGACY_WORKSHOP[t]) { setTab("workshop"); setRoute("cabinet", "workshop", LEGACY_WORKSHOP[t]); return; }
    setTab(t); setRoute("cabinet", t);
  };

  // синхронизация с адресом (кнопка «назад», deep-link, ручная правка hash)
  useCE(() => {
    const on = () => {
      const r = parseRoute();
      if (LEGACY_WORKSHOP[r.tab]) { setRoute("cabinet", "workshop", LEGACY_WORKSHOP[r.tab]); return; }
      if (CAB_TAB_IDS.includes(r.tab)) setTab(r.tab);
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

  const newProject = () => { changeTab("projects"); setTimeout(() => window.dispatchEvent(new CustomEvent("aivibe:new-project")), 0); };

  return (
    <div className="minh-screen">
      <AppTopBar user={user} onLogout={onLogout} go={go} tabs={CAB_TABS} tab={tab} setTab={changeTab} onNewProject={newProject} />
      <main id="main" className="container" style={{ paddingBlock: "clamp(28px,4vh,48px)", paddingTop: "calc(var(--nav-h) + 28px)" }}>
        {tab === "profile" ? <Profile user={user} />
          : tab === "favorites" ? <Favorites />
          : tab === "workshop" ? <Workshop />
          : <Projects />}
      </main>
    </div>
  );
}

/* ---------------- МАСТЕРСКАЯ: стили + нормы под одной крышей ----------------
   Редакторы недельного ритма (библиотека стилей, правила эргономики) собраны
   в один раздел — топбар остаётся языку петли дня. Каждый редактор рендерит
   свою шапку сам, здесь только переключатель и sub-роут #cabinet/workshop/{sub}. */
const WS_SUBS = [{ id: "styles", label: "Мои стили" }, { id: "products", label: "Товары" }, { id: "norms", label: "Нормы" }];
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
      <SegTabs className="pd-seg" items={WS_SUBS} value={sub} onChange={change} ariaLabel="Раздел мастерской" style={{ marginBottom: 22 }} />
      {sub === "norms" ? <NormsSettings /> : sub === "products" ? <ProductsLibrary /> : <StylesLibrary />}
    </div>
  );
}

/* верхняя панель приложения (кабинет): логотип · вкладки · +Новый проект · аккаунт-меню */
function AppTopBar({ user, onLogout, go, tabs, tab, setTab, onNewProject }) {
  return (
    <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 80, height: "var(--nav-h)", background: "rgba(251,248,242,.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--hairline)" }}>
      <div className="container" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, minWidth: 0 }}>
          <Logo size={23} onClick={() => go("site")} />
          {tabs && (
            <div className="cab-tabs" style={{ display: "flex", gap: 4, padding: 4, background: "var(--glass-2)", borderRadius: 99, border: "1px solid var(--hairline)" }}>
              {tabs.map(([k, t]) => (
                <button key={k} onClick={() => setTab(k)} aria-current={tab === k ? "page" : undefined} style={{ padding: "8px 15px", borderRadius: 99, fontWeight: 700, fontSize: 13.5,
                  background: tab === k ? "var(--surface-2)" : "transparent", color: tab === k ? "var(--text)" : "var(--muted)" }}>{t}</button>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {onNewProject && <button className="btn btn-primary cab-new" style={{ padding: "9px 15px", fontSize: 13.5 }} onClick={onNewProject} aria-label="Новый проект"><I.plus size={16} /><span className="cab-new-t">Новый проект</span></button>}
          <AccountMenu user={user} onLogout={onLogout} onTab={setTab} />
        </div>
      </div>
    </header>
  );
}

/* аккаунт-меню: профиль · тариф/биллинг · настройки · выйти */
function AccountMenu({ user, onLogout, onTab }) {
  const [open, setOpen] = useC(false);
  useMenu(open, () => setOpen(false), "acc-menu");   // Esc/стрелки/click-outside — единый паттерн меню
  const billing = () => { setOpen(false); AIVibeAPI.billing.createPayment({ plan: "pro_month" }).then((r) => toast(r.message || "Оплата подключится позже.", "info", 5000)); };
  const item = (label, Ico, onClick, danger) => (
    <button role="menuitem" onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 14, fontWeight: 600,
      color: danger ? "var(--accent-ink)" : "var(--text)", textAlign: "left" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
      <Ico size={17} style={{ color: danger ? "var(--accent)" : "var(--muted)", flex: "none" }} />{label}
    </button>
  );
  return (
    <div className="acc-menu" style={{ position: "relative" }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} style={{ display: "flex", alignItems: "center", gap: 10 }} aria-haspopup="menu" aria-expanded={open}>
        <Avatar user={user} size={36} />
        <div className="cab-username" style={{ lineHeight: 1.2, textAlign: "left" }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{user.name}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{user.provider === "yandex" ? "Яндекс ID" : "VK ID"}</div>
        </div>
        <I.arrow size={13} style={{ color: "var(--faint)", flex: "none", transform: open ? "rotate(-90deg)" : "rotate(90deg)", transition: ".2s" }} />
      </button>
      {open && (
        <div className="glass" role="menu" style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, minWidth: 214, borderRadius: 14, boxShadow: "var(--shadow-pop)", padding: 7, zIndex: 90 }}>
          <div style={{ padding: "6px 12px 10px", borderBottom: "1px solid var(--hairline)", marginBottom: 6 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{user.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{user.email}</div>
          </div>
          {item("Профиль", I.user, () => { setOpen(false); onTab("profile"); })}
          {item("Тариф и биллинг", I.wallet, billing)}
          {item("Настройки норм", I.sliders, () => { setOpen(false); onTab("norms"); })}
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
window.AppTopBar = AppTopBar;
window.Avatar = Avatar;
