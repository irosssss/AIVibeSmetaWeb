/* ============================================================
   AIVibe — футер + сборка промо-страницы
   ============================================================ */
const { useEffect: useE3 } = React;

/* --------------------------------------------------------------
   CTA + FOOTER
-------------------------------------------------------------- */
function Footer({ go }) {
  const cols = [
    ["Продукт", ["Возможности", "Как работает", "Новости", "Войти"]],
    ["Технологии", ["Движок эргономики", "Каталог фабрик", "YandexGPT 5", "Выгрузка сметы"]],
    ["Компания", ["О проекте", "Контакты", "Политика", "Оферта"]],
  ];
  return (
    <footer style={{ marginTop: 40 }}>
      {/* CTA */}
      <div className="container">
        <div className="glass" style={{ position: "relative", overflow: "hidden", borderRadius: "var(--r-xl)", padding: "clamp(48px,7vw,88px)", textAlign: "center" }}>
          <div style={{ position: "absolute", width: 600, height: 360, left: "50%", top: "50%", transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(194,90,54,.22), transparent 70%)", filter: "blur(40px)" }} />
          <div style={{ position: "relative" }}>
            <h2 className="display" style={{ fontSize: "clamp(34px,5vw,72px)", lineHeight: 0.95 }}>Соберите смету<br />сегодня</h2>
            <p style={{ color: "var(--muted)", maxWidth: 540, margin: "24px auto 36px", fontSize: 18 }}>Загрузите габариты комнаты — AIVibe соберёт спецификацию с ценами и проверит расстановку по нормам эргономики.</p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn btn-primary" style={{ padding: "16px 30px", fontSize: 16 }} onClick={() => go("auth")}><I.layers size={19} /> Собрать смету</button>
              <button className="btn btn-ghost" style={{ padding: "16px 30px", fontSize: 16 }} onClick={() => go("auth")}>Личный кабинет</button>
            </div>
          </div>
        </div>
      </div>

      {/* low footer */}
      <div className="container" style={{ paddingBlock: "clamp(50px,7vh,84px)" }}>
        <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 36 }}>
          <div>
            <Logo size={26} />
            <p style={{ color: "var(--muted)", maxWidth: 360, marginTop: 18, fontSize: 14.5, lineHeight: 1.6 }}>
              Смета и проверка норм для дизайнеров интерьера. Каталог фабрик-партнёров и российский AI.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button className="btn btn-ghost" style={{ padding: "10px 16px", fontSize: 13.5 }} onClick={() => go("admin")}>Админка</button>
              <button className="btn btn-ghost" style={{ padding: "10px 16px", fontSize: 13.5 }} onClick={() => go("auth")}>Войти</button>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <a className="social-chip vk" href="#" onClick={(e) => e.preventDefault()} aria-label="AIVibe во ВКонтакте" title="ВКонтакте">
                <svg width="21" height="21" viewBox="0 0 256 256" aria-hidden="true"><path fill="currentColor" d="M136.21 184.43c-58.34 0-91.62-40-93.01-106.56h29.23c.96 48.85 22.5 69.54 39.57 73.81V77.87h27.52V120c16.85-1.81 34.56-21.01 40.53-42.13h27.52c-4.58 26.02-23.78 45.22-37.44 53.12 13.66 6.4 35.52 23.14 43.84 53.44h-30.29c-6.5-20.27-22.72-35.95-44.16-38.08v38.08h-3.3z" /></svg>
              </a>
              <a className="social-chip tg" href="#" onClick={(e) => e.preventDefault()} aria-label="AIVibe в Telegram" title="Telegram">
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" /></svg>
              </a>
            </div>
          </div>
          {cols.map(([h, items]) => (
            <div key={h}>
              <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>{h}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {items.map((t) => <a key={t} href="#" onClick={(e) => e.preventDefault()} style={{ color: "var(--muted)", fontSize: 14, transition: ".2s" }}
                  onMouseEnter={(e) => (e.target.style.color = "var(--text)")} onMouseLeave={(e) => (e.target.style.color = "var(--muted)")}>{t}</a>)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid var(--hairline)", marginTop: 44, paddingTop: 26, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, color: "var(--faint)", fontSize: 13 }}>
          <span>© 2026 AIVibe. Прототип интерфейса.</span>
          <span>Сделано в России · Yandex Cloud</span>
        </div>
      </div>
    </footer>
  );
}

/* --------------------------------------------------------------
   СБОРКА промо-страницы
-------------------------------------------------------------- */
function SitePage({ go }) {
  useE3(() => { window.scrollTo({ top: 0 }); }, []);
  return (
    <div>
      <SiteNav go={go} />
      <Hero go={go} />
      <SpecCategories />
      <HowItWorks />
      <Bento />
      <NewsFeed />
      <Footer go={go} />
    </div>
  );
}

window.Footer = Footer;
window.SitePage = SitePage;
