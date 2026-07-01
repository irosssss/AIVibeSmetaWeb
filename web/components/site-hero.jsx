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
  const links = [["Возможности", "#features"], ["Как работает", "#how"], ["Тарифы", "#pricing"], ["Журнал", "#news"]];
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
   HERO — издательский разворот + живая смета на бумаге (вариант B)
-------------------------------------------------------------- */
function Hero({ go }) {
  return (
    <header className="minh-screen" style={{ position: "relative", display: "flex", alignItems: "center", paddingTop: "var(--nav-h)", overflow: "hidden" }}>
      <div className="container hero-grid" style={{ display: "grid", gridTemplateColumns: "0.82fr 1.18fr", gap: 56, alignItems: "center", position: "relative", zIndex: 2, paddingBlock: "clamp(40px,7vh,84px)" }}>
        <div>
          <span className="mono-eyebrow">смета-комплектация · для дизайнера</span>
          <h1 className="display hero-h1" style={{ fontSize: "clamp(38px, 4.8vw, 66px)", lineHeight: 1.02, letterSpacing: "-0.025em", marginTop: 20 }}>
            <span style={{ display: "block" }}>Смета клиенту —</span>
            <span style={{ display: "block" }}>с вашей <span style={{ color: "var(--accent-ink)", fontStyle: "italic" }}>наценкой</span></span>
          </h1>
          <p style={{ marginTop: 22, color: "var(--muted)", maxWidth: 430, fontSize: 17, lineHeight: 1.65 }}>
            Две цены в одном документе: себестоимость фабрики и цена клиенту. Собрано за минуту, а не за вечер в таблицах — проверено по нормам и готово к отправке.
          </p>
          <div style={{ marginTop: 30, display: "flex", gap: 14, flexWrap: "wrap" }} id="download">
            <button className="btn btn-primary" style={{ padding: "16px 26px", fontSize: 16 }} onClick={() => go("auth")}><I.layers size={19} /> Начать бесплатно</button>
            <a className="btn btn-ghost" style={{ padding: "16px 26px", fontSize: 16 }} href="#how">Как это работает <I.arrow size={17} /></a>
          </div>
          <div className="mono" style={{ marginTop: 12, fontSize: 12, color: "var(--spec-meta)", letterSpacing: ".02em" }}>
            первая смета — бесплатно, без карты
          </div>
          <div className="hero-chips">
            <span className="hchip"><i style={{ background: "var(--accent)" }} />Две цены и ваша наценка</span>
            <span className="hchip"><i style={{ background: "var(--accent-2)" }} />Экспорт клиенту PDF · Excel</span>
            <span className="hchip"><i style={{ background: "var(--info)" }} />Проверка эргономики</span>
          </div>
        </div>
        <SmetaPlate />
      </div>
      <div style={{ position: "absolute", bottom: 26, left: "50%", transform: "translateX(-50%)", color: "var(--faint)", fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        прокрутите
        <span style={{ width: 1, height: 34, background: "linear-gradient(var(--accent), transparent)" }} />
      </div>
    </header>
  );
}

/* Плита сметы: рендер-баннер проекта + таблица с ДВУМЯ ценами
   (себестоимость фабрики / цена клиенту), живой регулятор наценки —
   клиентские суммы и прибыль пересчитываются на лету, — и экспорт клиенту. */
function SmetaPlate() {
  const [markup, setMarkup] = useStateS(32);
  const fmt = (n) => new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₽";
  const ROWS = [
    ["01", "Диван 3-местный, велюр", "DV-2240", "1 шт", 112000],
    ["02", "Кресло лаунж, дуб/букле", "KR-118", "2 шт", 73000],
    ["03", "Люстра подвесная, латунь", "LT-905", "1 шт", 38600],
  ];
  const restCost = 896400, restCount = 35;
  const costTotal = ROWS.reduce((s, r) => s + r[4], restCost);
  const k = 1 + markup / 100;
  const clientTotal = costTotal * k;
  const profit = clientTotal - costTotal;
  return (
    <div className="plate" style={{ marginInline: "auto" }}>
      <div className="plate-banner">
        <Img src="img/hero-banner.jpg" label="рендер проекта" priority />
        <span className="plate-lab">Проект «Кирова, 17к1» <b>· гостиная · 42 м²</b></span>
      </div>
      <div className="plate-head">
        <div><div className="pt">Смета-комплектация</div><div className="ps">№ 024 · от 01.07.2026</div></div>
        <div className="plate-toggle"><span className="on">Для клиента</span><span>Рабочая</span></div>
      </div>
      <div className="spec2 head"><span>№</span><span>Позиция</span><span className="r">Кол-во</span><span className="r">Себест.</span><span className="r">Клиенту</span></div>
      {ROWS.map(([i, name, art, qty, cost]) => (
        <div className="spec2" key={i}>
          <span className="idx">{i}</span>
          <span className="pos">{name} <b className="art">· {art}</b></span>
          <span className="r q">{qty}</span>
          <span className="r cost">{fmt(cost)}</span>
          <span className="r cli">{fmt(cost * k)}</span>
        </div>
      ))}
      <div className="spec2 more">
        <span className="idx">—</span><span className="pos">ещё {restCount} позиций комплектации</span>
        <span className="r q">—</span><span className="r cost">{fmt(restCost)}</span><span className="r cli">{fmt(restCost * k)}</span>
      </div>
      <div className="plate-markup">
        <span className="k">Наценка дизайнера <b>+{markup}%</b></span>
        <input type="range" min="0" max="60" value={markup} onChange={(e) => setMarkup(+e.target.value)} aria-label="Наценка дизайнера, %" />
        <span className="profit">прибыль +{fmt(profit)}</span>
      </div>
      <div className="plate-tot">
        <div className="pt-card a"><div className="lab">Себестоимость</div><div className="val">{fmt(costTotal)}</div></div>
        <div className="pt-card b"><div className="lab">Цена клиенту</div><div className="val">{fmt(clientTotal)}</div></div>
      </div>
      <div className="plate-foot">
        <span className="ergo"><I.check size={13} /> проверка эргономики по нормам NKBA / Neufert</span>
        <span className="exp"><span>PDF</span><span>Excel</span></span>
      </div>
    </div>
  );
}

window.SiteNav = SiteNav;
window.Hero = Hero;
