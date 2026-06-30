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
   HERO — издательский разворот + живая смета на бумаге (вариант B)
-------------------------------------------------------------- */
function Hero({ go }) {
  return (
    <header className="minh-screen" style={{ position: "relative", display: "flex", alignItems: "center", paddingTop: "var(--nav-h)", overflow: "hidden" }}>
      <div className="container hero-grid" style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 64, alignItems: "center", position: "relative", zIndex: 2, paddingBlock: "clamp(40px,7vh,84px)" }}>
        <div>
          <span className="mono-eyebrow">живая смета · лист 1/1</span>
          <h1 className="display hero-h1" style={{ fontSize: "clamp(40px, 5vw, 72px)", lineHeight: 1.04, letterSpacing: "-0.025em", marginTop: 22 }}>
            <span style={{ display: "block" }}>Смета собирается</span>
            <span style={{ display: "block" }}>у вас <span style={{ color: "var(--accent)", fontStyle: "italic" }}>на глазах</span></span>
          </h1>
          <p style={{ marginTop: 24, color: "var(--muted)", maxWidth: 480, fontSize: 18, lineHeight: 1.7 }}>
            Вставьте ссылку на товар или фото комнаты — AIVibe заполнит лист сметы строка за строкой, с артикулами, количеством и ценой. Не абстрактный экран, а привычный документ со штампом.
          </p>
          <div style={{ marginTop: 34, display: "flex", gap: 14, flexWrap: "wrap" }} id="download">
            <button className="btn btn-primary" style={{ padding: "16px 26px", fontSize: 16 }} onClick={() => go("auth")}><I.layers size={19} /> Собрать смету</button>
            <a className="btn btn-ghost" style={{ padding: "16px 26px", fontSize: 16 }} href="#how">Как это работает <I.arrow size={17} /></a>
          </div>
          <div style={{ marginTop: 46, display: "flex", gap: 38, flexWrap: "wrap" }}>
            {[["1 мин", "вместо вечера в таблицах"], ["38", "позиций с ценой"], ["3", "бюджета на выбор"]].map(([v, l]) => (
              <div key={l}>
                <div className="mono" style={{ fontWeight: 500, fontSize: 26 }}>{v}</div>
                <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <SmetaSheet />
      </div>
      <div style={{ position: "absolute", bottom: 26, left: "50%", transform: "translateX(-50%)", color: "var(--faint)", fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        прокрутите
        <span style={{ width: 1, height: 34, background: "linear-gradient(var(--accent), transparent)" }} />
      </div>
    </header>
  );
}

/* Живая смета на бумаге: лист со штампом, строки «впечатываются» при
   попадании в экран, итог считается счётчиком. Респектит reduced-motion. */
function SmetaSheet() {
  const ref = useRefS(null);
  const ROWS = [
    ["01", "Демонтаж перегородок", "12 м²", "18 400 ₽"],
    ["02", "Стяжка пола", "42 м²", "63 000 ₽"],
    ["03", "Штукатурка стен", "96 м²", "51 200 ₽"],
    ["04", "Электрика, точки", "38 шт", "47 500 ₽"],
    ["05", "Плитка, санузел", "14 м²", "32 900 ₽"],
  ];
  const TARGET = 1240000;
  useEffectS(() => {
    const sheet = ref.current; if (!sheet) return;
    const rows = sheet.querySelectorAll(".smeta-row:not(.head)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const STAGGER = 0.11, FIRST = 0.12;
    rows.forEach((r, i) => { r.style.animationDelay = (FIRST + i * STAGGER) + "s"; });
    const rowsDone = FIRST + (rows.length - 1) * STAGGER + 0.42;
    const totalEl = sheet.querySelector(".smeta-total .val");
    const noteEl = sheet.querySelector(".smeta-note");
    const stampEl = sheet.querySelector(".smeta-stamp");
    if (totalEl) totalEl.style.animationDelay = rowsDone + "s";
    if (noteEl) noteEl.style.animationDelay = (rowsDone + 0.5) + "s";
    if (stampEl) stampEl.style.animationDelay = (rowsDone + 0.15) + "s";
    const fmt = new Intl.NumberFormat("ru-RU");
    let raf, timer;
    const countUp = () => {
      if (reduce || !totalEl) { if (totalEl) totalEl.textContent = fmt.format(TARGET) + " ₽"; return; }
      let start = null;
      const step = (ts) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / 950, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        totalEl.textContent = fmt.format(Math.round(TARGET * eased)) + " ₽";
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const play = () => { sheet.classList.add("play"); timer = setTimeout(countUp, reduce ? 0 : rowsDone * 1000); };
    if (reduce) { play(); return () => { cancelAnimationFrame(raf); clearTimeout(timer); }; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { play(); io.disconnect(); } });
    }, { threshold: 0.2, rootMargin: "0px 0px -8% 0px" });
    io.observe(sheet);
    return () => { io.disconnect(); cancelAnimationFrame(raf); clearTimeout(timer); };
  }, []);
  return (
    <div className="smeta-sheet" ref={ref} style={{ marginInline: "auto" }}>
      <span className="smeta-grain" aria-hidden="true" />
      <div className="smeta-head">
        <div>
          <div className="ttl">Смета ремонта</div>
          <div className="sub">Квартира · 42 м² · черновой + чистовой</div>
        </div>
        <div className="meta">№ 024<br />от 30.06.2026</div>
      </div>
      <div className="smeta-rows">
        <div className="smeta-row head"><span>№</span><span className="pos">Позиция</span><span className="qty">Кол-во</span><span className="sum">Сумма</span></div>
        {ROWS.map(([i, p, q, s]) => (
          <div className="smeta-row" key={i}><span className="idx">{i}</span><span className="pos">{p}</span><span className="qty">{q}</span><span className="sum">{s}</span></div>
        ))}
        <div className="smeta-row more"><span className="idx">—</span><span className="pos">ещё 33 позиции</span><span className="qty">—</span><span className="sum">1 027 000 ₽</span></div>
      </div>
      <div className="smeta-total"><span className="lab">Итого</span><span className="val">0 ₽</span></div>
      <div className="smeta-note">
        <svg width="40" height="20" viewBox="0 0 40 20" aria-hidden="true"><path d="M38 4 C18 -2 6 8 4 17 M4 17 l-1 -7 M4 17 l7 -2" /></svg>
        <span>с НДС и логистикой</span>
      </div>
      <div className="smeta-stamp">
        <div><div className="k">Объект</div><div className="v">Квартира</div></div>
        <div><div className="k">Площадь</div><div className="v">42 м²</div></div>
        <div><div className="k">Стадия</div><div className="v">Рабочая</div></div>
        <div><div className="k">Дата</div><div className="v">30.06.2026</div></div>
        <div><div className="k">Сметчик</div><div className="v">AIVibe AI</div></div>
        <div><div className="k">Лист</div><div className="v">1 / 1</div></div>
      </div>
    </div>
  );
}

window.SiteNav = SiteNav;
window.Hero = Hero;
