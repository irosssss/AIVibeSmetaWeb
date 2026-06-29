/* ============================================================
   AIVibe — ПРОМО-САЙТ
   Nav · Hero (издательский, рисованная line-art) ·
   How-it-works · Bento · Новости · GitHub · Footer
   ============================================================ */
const { useState: useStateS, useEffect: useEffectS, useRef: useRefS } = React;

/* нейтральные стоковые фото интерьеров (с graceful fallback на плейсхолдер) */
const U = (id, w = 1100) => `https://images.unsplash.com/${id}?q=80&w=${w}&auto=format&fit=crop`;
const PHOTOS = {
  hero:    U("photo-1618221195710-dd6b41faaea6", 1300),
  living:  U("photo-1586023492125-27b2c045efd7"),
  bedroom: U("photo-1505693416388-ac5ce068fe85"),
  kitchen: U("photo-1556911220-bff31c812dba"),
  office:  U("photo-1593476550610-87baa860004a"),
  deco:    U("photo-1618220179428-22790b461013"),
  studio:  U("photo-1502672260266-1c1ef2d93688"),
  light:   U("photo-1540932239986-30128078f3c5"),
  market:  U("photo-1540574163026-643ea20ade25"),
  warm:    U("photo-1567016432779-094069958ea5"),
  ar:      U("photo-1631679706909-1844bbd07221"),
};
window.PHOTOS = PHOTOS;

/* --------------------------------------------------------------
   NAV — бумажная панель (без тёмного стекла)
-------------------------------------------------------------- */
function SiteNav({ go }) {
  const [solid, setSolid] = useStateS(false);
  const [open, setOpen] = useStateS(false);
  useEffectS(() => {
    const f = () => setSolid(window.scrollY > 40);
    f(); window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  useEffectS(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  const links = [["Возможности", "#features"], ["Как работает", "#how"], ["Журнал", "#news"]];
  const jump = (h) => { setOpen(false); document.querySelector(h)?.scrollIntoView({ behavior: "smooth" }); };
  const lit = solid || open;
  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 90,
      height: "var(--nav-h)", transition: "background .3s, border-color .3s, backdrop-filter .3s",
      background: lit ? "rgba(251,248,242,0.88)" : "transparent",
      backdropFilter: lit ? "blur(10px)" : "none", WebkitBackdropFilter: lit ? "blur(10px)" : "none",
      borderBottom: `1px solid ${lit ? "var(--hairline)" : "transparent"}` }}>
      <div className="container" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Logo size={25} onClick={() => window.scrollTo({ top: 0 })} />
        <div className="site-navlinks" style={{ display: "flex", gap: 34 }}>
          {links.map(([t, h]) => (
            <a key={h} href={h} style={{ color: "var(--muted)", fontSize: 15, fontWeight: 500, transition: ".2s" }}
               onMouseEnter={(e) => (e.target.style.color = "var(--text)")}
               onMouseLeave={(e) => (e.target.style.color = "var(--muted)")}>{t}</a>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button className="btn btn-ghost site-cta" style={{ padding: "11px 20px" }} onClick={() => go("auth")}>Войти</button>
          <button className="btn btn-primary site-cta" style={{ padding: "11px 20px" }} onClick={() => go("auth")}>
            <I.layers size={17} /> Собрать смету
          </button>
          <button className="icon-btn nav-burger" aria-label="Меню" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <I.close size={20} /> : <Icon size={20} d="M4 7h16M4 12h16M4 17h16" />}
          </button>
        </div>
      </div>

      {/* мобильное выпадающее меню */}
      <div className="nav-sheet" data-open={open ? "1" : "0"}>
        <div style={{ display: "flex", flexDirection: "column", padding: "10px 0 18px" }}>
          {links.map(([t, h]) => (
            <button key={h} onClick={() => jump(h)} style={{ textAlign: "left", padding: "15px 4px", fontSize: 19, fontWeight: 600,
              fontFamily: "var(--font-display)", letterSpacing: "-0.01em", borderBottom: "1px solid var(--hairline-2)", color: "var(--text)" }}>{t}</button>
          ))}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 22 }}>
            <button className="btn btn-primary btn-block" style={{ padding: "15px" }} onClick={() => { setOpen(false); go("auth"); }}>
              <I.layers size={18} /> Собрать смету
            </button>
            <button className="btn btn-ghost btn-block" style={{ padding: "15px" }} onClick={() => { setOpen(false); go("auth"); }}>Личный кабинет</button>
          </div>
        </div>
      </div>
    </nav>
  );
}

/* --------------------------------------------------------------
   HERO — издательский разворот + рисованная сцена интерьера
-------------------------------------------------------------- */
function Hero({ go }) {
  return (
    <header className="minh-screen" style={{ position: "relative", display: "flex", alignItems: "center", paddingTop: "var(--nav-h)", overflow: "hidden" }}>
      <div className="container hero-grid" style={{ display: "grid", gridTemplateColumns: "1.08fr 0.92fr", gap: 56, alignItems: "center", position: "relative", zIndex: 2, paddingBlock: "clamp(40px,8vh,90px)" }}>
        <div>
          <div className="glass" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "9px 16px", borderRadius: "var(--r-pill)", marginBottom: 30, fontSize: 13.5, boxShadow: "var(--shadow-card)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-2)" }} />
            Для дизайнеров · смета и проверка норм
          </div>
          <h1 className="display hero-h1" style={{ fontSize: "clamp(44px, 5.7vw, 84px)", lineHeight: 1.0, letterSpacing: "-0.03em", textShadow: "3px 3px 0 rgba(194,90,54,0.14)" }}>
            <span style={{ display: "block" }}>Спецификация,</span>
            <span style={{ display: "block" }}>которая <span style={{ color: "var(--accent)", fontStyle: "italic" }}>сходится</span></span>
            <span style={{ display: "block", color: "var(--faint)" }}>сама</span>
          </h1>
          <p style={{ marginTop: 28, color: "var(--muted)", maxWidth: 540, fontSize: 19, lineHeight: 1.7 }}>
            Загрузите габариты комнаты, бюджет и стиль — AIVibe соберёт смету с артикулами и ценами и проверит расстановку по нормам эргономики. То, на что уходит вечер в таблицах, — за минуту.
          </p>
          <div style={{ marginTop: 36, display: "flex", gap: 14, flexWrap: "wrap" }} id="download">
            <button className="btn btn-primary" style={{ padding: "16px 28px", fontSize: 16 }} onClick={() => go("auth")}><I.layers size={19} /> Собрать смету</button>
            <a className="btn btn-ghost" style={{ padding: "16px 28px", fontSize: 16 }} href="#how">Как это работает <I.arrow size={17} /></a>
          </div>
          <div style={{ marginTop: 52, display: "flex", gap: 44, flexWrap: "wrap" }}>
            {[["1 мин", "Смета вместо вечера"], ["100%", "Предметов с ценой"], ["3", "Бюджета на выбор"]].map(([v, l]) => (
              <div key={l}>
                <div className="display" style={{ fontSize: 36 }}>{v}</div>
                <div style={{ color: "var(--muted)", fontSize: 14, marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <HeroVisual />
      </div>
      <div style={{ position: "absolute", bottom: 26, left: "50%", transform: "translateX(-50%)", color: "var(--faint)", fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        прокрутите
        <span style={{ width: 1, height: 34, background: "linear-gradient(var(--accent), transparent)" }} />
      </div>
    </header>
  );
}

/* Рисованная сцена интерьера: line-art, «дорисовывается» штрихом */
function HeroVisual() {
  const ref = useRefS(null);
  useEffectS(() => { const el = ref.current; if (el) { el.classList.remove("go"); void el.offsetWidth; el.classList.add("go"); } }, []);
  return (
    <div className="hero-visual" style={{ position: "relative", height: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg ref={ref} className="line-art go" viewBox="0 0 340 340" width="100%" style={{ maxWidth: 480, overflow: "visible", color: "var(--accent)" }}
           fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 300 H320" />
        <ellipse cx="172" cy="312" rx="140" ry="16" stroke="var(--accent-2)" />
        <path d="M210 44 H300 V128 H210 Z" />
        <path stroke="var(--accent-2)" d="M255 44 V128 M210 86 H300 M306 60 l16 -10 M306 82 l18 -3 M306 104 l16 5" />
        <path d="M40 62 H122 V130 H40 Z" />
        <path stroke="var(--accent-2)" d="M50 116 q15 -20 30 -8 q12 9 26 -7 M50 124 H112" />
        <path d="M64 250 L64 210 Q64 196 80 196 L244 196 Q260 196 260 210 L260 250 M50 250 H274 V272 H50 Z M74 272 V284 M250 272 V284" />
        <path stroke="var(--accent-2)" d="M130 196 V224 M194 196 V224 M50 260 H274" />
        <path d="M298 296 V150 M280 150 H316 L308 122 H288 Z" />
        <path stroke="var(--accent-2)" d="M30 296 L34 256 H70 L66 296 Z M50 256 q-15 -34 -30 -44 M50 256 q11 -34 31 -46 M50 256 q0 -30 0 -52" />
      </svg>

      {/* пришпиленная заметка-смета (бумага, лёгкий поворот) */}
      <div className="glass float-b" style={{ position: "absolute", bottom: 40, right: -6, width: 250, padding: 16, borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-pop)", transform: "rotate(-1.6deg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
          <I.layers size={16} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--accent)" }}>Смета AIVibe</span>
        </div>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, letterSpacing: "-.01em" }}>38 позиций · 1 240 000 ₽</p>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 10, fontSize: 12.5, color: "var(--accent-2)", fontWeight: 600 }}>
          <I.check size={15} /> проход у дивана 78 см — в норме
        </div>
      </div>

      {/* статус-чип эргономики */}
      <div className="glass float-a" style={{ position: "absolute", top: 36, left: -4, padding: "11px 16px", borderRadius: "var(--r-pill)", display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, fontWeight: 600, boxShadow: "var(--shadow-card)" }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--accent-2)" }} />
        Эргономика · проверено
      </div>
    </div>
  );
}

window.SiteNav = SiteNav;
window.Hero = Hero;
