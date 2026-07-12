/* ============================================================
   Design Ledger — ПРОМО-САЙТ
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
   ЕДИНЫЙ ПОРЯДОК СЕКЦИЙ — один источник правды для трёх мест, которые
   раньше держались в синхроне только комментарием: ссылки навбара,
   колонка «Продукт» футера и порядок скролла SitePage. Порядок здесь =
   порядок секций в <main> (site-github.jsx). nav/foot — подписи там,
   где секция попадает в навбар / футер (пусто = не попадает).
   Навбар и футер выводятся отсюда фильтром — рассинхрону взяться неоткуда.
   При добавлении/переносе секции правим ЭТОТ список (и JSX SitePage). */
const LANDING_SECTIONS = [
  { id: "features",     nav: "Возможности",  foot: "Возможности" },
  { id: "how",          nav: "Как работает", foot: "Как работает" },
  { id: "clientportal",                      foot: "Клиентский портал" },
  { id: "whofor",                            foot: "Для кого" },
  { id: "payoff",                            foot: "Окупаемость" },
  { id: "pricing",      nav: "Тарифы",       foot: "Тарифы" },
  { id: "news",         nav: "Журнал",       foot: "Новости" },
];
window.LANDING_SECTIONS = LANDING_SECTIONS;
const navLinksFrom = (secs) => secs.filter((s) => s.nav).map((s) => [s.nav, "#" + s.id]);
const footLinksFrom = (secs) => secs.filter((s) => s.foot).map((s) => [s.foot, "#" + s.id]);
window.footLinksFrom = footLinksFrom;

/* --------------------------------------------------------------
   ХЕЛПЕРЫ МИНИ-ИЛЛЮСТРАЦИЙ мока — единый визуальный язык бумажных
   мокапов фич: Fv* (сетка фич, site-sections) и Clip* (/changelog,
   site-github). Один набор вместо двух почти-одинаковых копий.
   Радиус карточки — токен --r-md; чип — .06em трекинг.
-------------------------------------------------------------- */
const mockCardCss = { background: "var(--bg-base)", border: "1px solid var(--hairline)", borderRadius: "var(--r-md)", boxShadow: "var(--shadow-card)" };
const mockMono = (extra) => ({ fontFamily: "var(--font-mono)", fontSize: "var(--fs-11)", ...extra });
const mockTag = { fontFamily: "var(--font-mono)", fontSize: "var(--fs-10)", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--accent-2-ink)", padding: "3px 9px", borderRadius: 99, background: "var(--accent-2-tint)" };
Object.assign(window, { mockCardCss, mockMono, mockTag });

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
  const links = navLinksFrom(LANDING_SECTIONS);   // единый источник порядка (см. LANDING_SECTIONS выше)
  const jump = (h) => { setOpen(false); document.querySelector(h)?.scrollIntoView({ behavior: motionOK() ? "smooth" : "auto" }); };
  const lit = solid || open;
  return (
    <nav style={{ position: "fixed", top: lit ? 10 : 0, left: lit ? 12 : 0, right: lit ? 12 : 0, zIndex: 90,
      height: "var(--nav-h)", borderRadius: lit ? 999 : 0,
      transition: "background .3s, border-color .3s, backdrop-filter .3s, top .3s var(--ease), left .3s var(--ease), right .3s var(--ease), border-radius .3s var(--ease), box-shadow .3s",
      background: lit ? "rgba(251,248,242,0.92)" : "transparent",
      backdropFilter: lit ? "blur(8px)" : "none", WebkitBackdropFilter: lit ? "blur(8px)" : "none",
      boxShadow: lit ? "var(--shadow-card)" : "none",
      border: `1px solid ${lit ? "var(--hairline)" : "transparent"}` }}>
      <div className="container" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Logo size={25} onClick={() => window.scrollTo({ top: 0 })} />
        <div className="site-navlinks" style={{ display: "flex", gap: 34 }}>
          {links.map(([t, h]) => (
            <a key={h} href={h} style={{ color: "var(--muted)", fontSize: "var(--fs-15)", fontWeight: 500, transition: "var(--dur-fast)" }}
               onMouseEnter={(e) => (e.target.style.color = "var(--text)")}
               onMouseLeave={(e) => (e.target.style.color = "var(--muted)")}>{t}</a>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button className="btn btn-ghost site-cta" style={{ padding: "11px 20px" }} onClick={() => go("auth")}>Войти</button>
          <button className="btn btn-primary nav-cta-primary" style={{ padding: "11px 20px" }} onClick={() => go("auth")}>
            <I.layers size={17} /> <span className="nav-cta-label">Собрать смету</span>
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
            <button key={h} onClick={() => jump(h)} style={{ textAlign: "left", padding: "15px 4px", fontSize: "var(--fs-18)", fontWeight: 600,
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
   HERO — центрированный «Programa-разворот» (реш. владельца 12.07,
   образец programa.design): анонс-чип → крупный serif-заголовок →
   CTA → живая смета-«скриншот» ниже. Вокруг заголовка — летающие
   бумажные артефакты продукта (карточка товара, клиппер, наценка,
   согласование) — наши аналоги их floating-cards. Чистый декор:
   aria-hidden, на узких экранах скрыты (styles.css .fc).
-------------------------------------------------------------- */
/* артефакты: контент = реальные сущности продукта, стиль = бумажные
   мини-карточки; позиция/поворот — в CSS (.fc1….fc6), бобинг — .fc-bob */
/* [позиция-класс .fcN, стиль вкладыша, содержимое] — контент карточек
   разнородный (у каждой своя сущность продукта), но обёртку .fc/.fc-bob
   гоним одним .map(), как STEPS/CATS/CARDS в остальном коде */
const HERO_FLEET = [
  ["fc1", { width: 158 }, (         // карточка товара из библиотеки
    <React.Fragment>
      <div style={{ height: 62, borderRadius: 8, background: "linear-gradient(135deg, #C4886B, #8F5B41)" }} />
      <div style={{ fontWeight: 600, fontSize: "var(--fs-13)", marginTop: 9, lineHeight: 1.3 }}>Диван «Милано»</div>
      <div className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--spec-meta)", marginTop: 3 }}>128 000 ₽ · MIL-3</div>
    </React.Fragment>
  )],
  ["fc2", { width: 190 }, (         // клиппер: ссылка стала позицией
    <React.Fragment>
      <div className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>divan.ru/product/milano-3</div>
      <div className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--accent-2-ink)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}><I.check size={13} /> позиция в смете</div>
    </React.Fragment>
  )],
  ["fc3", { display: "flex", gap: 7, alignItems: "center" }, (   // выгрузка клиенту
    <React.Fragment>
      <span className="fc-pill">PDF</span><span className="fc-pill">Excel</span>
      <span style={{ fontSize: "var(--fs-11)", color: "var(--muted)" }}>клиенту</span>
    </React.Fragment>
  )],
  ["fc4", { width: 168 }, (         // согласование в портале
    <React.Fragment>
      <div style={{ fontSize: "var(--fs-12)", fontWeight: 600, lineHeight: 1.3 }}>Кресло лаунж, букле</div>
      <span className="mono" style={{ display: "inline-block", marginTop: 7, fontSize: "var(--fs-10)", fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--accent-2-ink)", background: "var(--accent-2-tint)", padding: "3px 9px", borderRadius: 99 }}>Согласовано</span>
    </React.Fragment>
  )],
  ["fc5", { width: 172 }, (         // наценка — живая математика продукта
    <React.Fragment>
      <div className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--spec-meta)" }}>наценка <b style={{ color: "var(--text)" }}>+32%</b></div>
      <div className="mono" style={{ fontSize: "var(--fs-12)", color: "var(--accent-2-ink)", fontWeight: 700, marginTop: 5 }}>прибыль +212 400 ₽</div>
    </React.Fragment>
  )],
  ["fc6", { width: 178, borderRadius: "14px 14px 14px 4px", background: "rgba(183,80,44,.07)", borderColor: "rgba(183,80,44,.3)" }, (  // реплика клиента
    <div style={{ fontSize: "var(--fs-12)", lineHeight: 1.45 }}>Можно светлее обивку? Остальное нравится.</div>
  )],
];

function HeroFleet() {
  return (
    <div aria-hidden="true">
      {HERO_FLEET.map(([cls, style, content]) => (
        <div className={"fc " + cls} key={cls}><div className="fc-bob fc-card" style={style}>{content}</div></div>
      ))}
    </div>
  );
}

function Hero({ go }) {
  return (
    <header style={{ position: "relative", overflow: "hidden", paddingTop: "calc(var(--nav-h) + clamp(44px, 9vh, 104px))" }}>
      <HeroFleet />
      <div className="container" style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <button type="button" className="hero-announce mono" onClick={() => go("changelog")}>
          <i /> Новое: клиент согласует смету по ссылке <I.arrow size={13} />
        </button>
        <h1 className="display" style={{ fontSize: "clamp(40px, 6.4vw, 86px)", lineHeight: 1.0, letterSpacing: "-0.03em", marginTop: 26 }}>
          <span style={{ display: "block" }}>Смета клиенту —</span>
          <span style={{ display: "block" }}>а не вечер в <span style={{ color: "var(--accent-ink)", fontStyle: "italic" }}>Excel</span></span>
        </h1>
        <p style={{ marginTop: 22, color: "var(--muted)", maxWidth: 540, fontSize: "var(--fs-16)", lineHeight: 1.65 }}>
          Себестоимость фабрики и цена клиенту — в одном документе. Проверено по нормам, готово к отправке за минуту.
        </p>
        <div style={{ marginTop: 30, display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }} id="download">
          <button className="btn btn-primary" style={{ padding: "16px 26px", fontSize: "var(--fs-16)" }} onClick={() => go("auth")}><I.layers size={19} /> Начать бесплатно</button>
          <a className="btn btn-ghost" style={{ padding: "16px 26px", fontSize: "var(--fs-16)" }} href="#how">Как это работает <I.arrow size={17} /></a>
        </div>
        <div className="mono" style={{ marginTop: 14, fontSize: "var(--fs-12)", color: "var(--spec-meta)", letterSpacing: ".02em" }}>
          первая смета — бесплатно · без карты · 2 проекта на тарифе «Старт»
        </div>
      </div>
      {/* «скриншот приложения» по-нашему: живая плита сметы, крупно и по центру */}
      <div className="container hero-plate-wrap" style={{ position: "relative", zIndex: 2 }}>
        <SmetaPlate />
      </div>
    </header>
  );
}

/* --------------------------------------------------------------
   МАРКВИЗ ФАКТОВ — наш ответ ленте наград Programa. Наград у
   прототипа нет (канон честности) — бежит строка того, что продукт
   реально умеет. Дубль контента ×2 — бесшовная петля translateX(-50%);
   reduced-motion глушится глобальным правилом styles.css.
-------------------------------------------------------------- */
function FactsMarquee() {
  const FACTS = [
    "две цены в одном документе", "наценка по разделам", "PDF · Excel · закупочный лист",
    "проверка норм NKBA / Neufert", "портал согласования для клиента", "смета из ссылки на магазин",
    "библиотека позиций студии", "сбор → согласование → закупка → сдача",
  ];
  return (
    <section className="marq" aria-label="Что умеет Design Ledger">
      <div className="marq-track">
        {FACTS.concat(FACTS).map((f, i) => (
          <span key={i} className="marq-item mono" aria-hidden={i >= FACTS.length || undefined}>{f}<i /></span>
        ))}
      </div>
    </section>
  );
}

/* Плита сметы: рендер-баннер проекта + таблица с ДВУМЯ ценами
   (себестоимость фабрики / цена клиенту), живой регулятор наценки —
   клиентские суммы и прибыль пересчитываются на лету, — и экспорт клиенту. */
function SmetaPlate() {
  const [markup, setMarkup] = useStateS(32);
  /* демо-ход «две цены» (аудит Programa): «Рабочая» — как сейчас, себестоимость+наценка+прибыль;
     «Для клиента» — реальная клиентская выгрузка, где себестоимость и наценка не показываются.
     Дефолт — «клиенту»: первое, что видит посетитель промо, должно совпадать с обещанием
     «наценка скрыта» из маркетинга (так было и в старой статичной плите до этого тумблера). */
  const [mode, setMode] = useStateS("client");
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
  const clientTotalShown = useCountUp(clientTotal);
  const profitShown = useCountUp(profit);
  return (
    <div className={"plate" + (mode === "client" ? " mode-client" : "")} style={{ marginInline: "auto" }}>
      <div className="plate-banner">
        <Img src="img/hero-banner.jpg" label="рендер проекта" priority />
        <span className="plate-lab">Проект «Кирова, 17к1» <b>· гостиная · 42 м²</b></span>
      </div>
      <div className="plate-head">
        <div><div className="pt">Смета-комплектация</div><div className="ps">№ 024 · от 01.07.2026</div></div>
        <div className="plate-toggle" role="tablist" aria-label="Вид сметы">
          <button type="button" role="tab" aria-selected={mode === "client"} className={mode === "client" ? "on" : ""} onClick={() => setMode("client")}>Для клиента</button>
          <button type="button" role="tab" aria-selected={mode === "work"} className={mode === "work" ? "on" : ""} onClick={() => setMode("work")}>Рабочая</button>
        </div>
      </div>
      <div className="spec2 head"><span>№</span><span>Позиция</span><span className="r">Кол-во</span><span className="r">Себест.</span><span className="r">Клиенту</span></div>
      {ROWS.map(([i, name, art, qty, cost], idx) => (
        <div className="spec2 plate-row-in" key={i} style={{ animationDelay: (0.15 + idx * 0.08) + "s" }}>
          <span className="idx">{i}</span>
          <span className="pos">{name} <b className="art">· {art}</b></span>
          <span className="r q">{qty}</span>
          <span className="r cost">{fmt(cost)}</span>
          <span className="r cli">{fmt(cost * k)}</span>
        </div>
      ))}
      <div className="spec2 more plate-row-in" style={{ animationDelay: (0.15 + ROWS.length * 0.08) + "s" }}>
        <span className="idx">—</span><span className="pos">ещё {restCount} позиций комплектации</span>
        <span className="r q">—</span><span className="r cost">{fmt(restCost)}</span><span className="r cli">{fmt(restCost * k)}</span>
      </div>
      <div className="plate-markup">
        <span className="k">Наценка дизайнера <b>+{markup}%</b></span>
        <input type="range" min="0" max="60" value={markup} onChange={(e) => setMarkup(+e.target.value)} aria-label="Наценка дизайнера, %" />
        <span className="profit">прибыль +{fmt(profitShown)}</span>
      </div>
      <div className="plate-tot">
        <div className="pt-card a"><div className="lab">Себестоимость</div><div className="val">{fmt(costTotal)}</div></div>
        <div className="pt-card b"><div className="lab">Цена клиенту</div><div className="val">{fmt(clientTotalShown)}</div></div>
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
window.FactsMarquee = FactsMarquee;
