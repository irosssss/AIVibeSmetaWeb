/* ============================================================
   Design Ledger — футер + сборка промо-страницы
   ============================================================ */
const { useEffect: useE3 } = React;

/* --------------------------------------------------------------
   CTA + FOOTER
-------------------------------------------------------------- */
function Footer({ go }) {
  /* [название, якорь|null] — null = раздел ещё не написан, честная заглушка без мёртвого клика.
     Порядок «Продукт» — по факту скролла SitePage (ниже), не по важности. */
  const cols = [
    ["Продукт", [["Возможности", "#features"], ["Как работает", "#how"], ["Клиентский портал", "#clientportal"], ["Для кого", "#whofor"], ["Окупаемость", "#payoff"], ["Тарифы", "#pricing"], ["Новости", "#news"]]],
    ["Технологии", [["Движок эргономики", "#how"], ["Каталог фабрик", "#komplektacia"], ["YandexGPT 5", "#features"], ["Выгрузка сметы", "#komplektacia"]]],
    ["Компания", [["Что нового", "#changelog"], ["О проекте", null], ["Контакты", null], ["Политика", null], ["Оферта", null]]],
  ];
  return (
    <footer style={{ marginTop: 40 }}>
      {/* CTA */}
      <div className="container">
        <div className="glass" style={{ position: "relative", overflow: "hidden", borderRadius: "var(--r-xl)", padding: "clamp(48px,7vw,88px)", textAlign: "center" }}>
          <div style={{ position: "absolute", width: 600, height: 360, left: "50%", top: "50%", transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(183,80,44,.22), transparent 70%)", filter: "blur(40px)" }} />
          <div style={{ position: "relative" }}>
            <h2 className="display" style={{ fontSize: "clamp(34px,5vw,72px)", lineHeight: 0.95 }}>Первая смета —<br />сегодня и бесплатно</h2>
            <p style={{ color: "var(--muted)", maxWidth: 540, margin: "24px auto 36px", fontSize: "var(--fs-18)" }}>Design Ledger соберёт спецификацию с ценами, посчитает вашу наценку и проверит эргономику по нормам — документ готов к отправке клиенту.</p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn btn-primary" style={{ padding: "16px 30px", fontSize: "var(--fs-16)" }} onClick={() => go("auth")}><I.layers size={19} /> Начать бесплатно</button>
              <button className="btn btn-ghost" style={{ padding: "16px 30px", fontSize: "var(--fs-16)" }} onClick={() => document.querySelector("#komplektacia")?.scrollIntoView({ behavior: motionOK() ? "smooth" : "auto" })}>Посмотреть пример сметы</button>
            </div>
            <div className="mono" style={{ marginTop: 16, fontSize: "var(--fs-12)", color: "var(--spec-meta)" }}>без карты · тарифы от 1 490 ₽/мес после беты</div>
            {/* второе закрытие — снятие последнего возражения «кто поможет», честно для соло-продукта */}
            <div className="mono" style={{ marginTop: 8, fontSize: "var(--fs-12)", color: "var(--spec-meta)" }}>на вопросы до старта отвечает автор продукта — не бот и не саппорт-скрипт</div>
          </div>
        </div>
      </div>

      {/* low footer */}
      <div className="container" style={{ paddingBlock: "clamp(50px,7vh,84px)" }}>
        <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 36 }}>
          <div>
            <Logo size={26} />
            <p style={{ color: "var(--muted)", maxWidth: 360, marginTop: 18, fontSize: "var(--fs-14)", lineHeight: 1.6 }}>
              Смета и проверка норм для дизайнеров интерьера. Каталог фабрик-партнёров и российский AI.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              {window.DEV_MODE && <button className="btn btn-ghost" style={{ padding: "10px 16px", fontSize: "var(--fs-13)" }} onClick={() => go("admin")}>Админка</button>}
              <button className="btn btn-ghost" style={{ padding: "10px 16px", fontSize: "var(--fs-13)" }} onClick={() => go("auth")}>Войти</button>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <a className="social-chip vk" href="#" onClick={(e) => e.preventDefault()} aria-label="Design Ledger во ВКонтакте" title="ВКонтакте">
                <svg width="21" height="21" viewBox="0 0 256 256" aria-hidden="true"><path fill="currentColor" d="M136.21 184.43c-58.34 0-91.62-40-93.01-106.56h29.23c.96 48.85 22.5 69.54 39.57 73.81V77.87h27.52V120c16.85-1.81 34.56-21.01 40.53-42.13h27.52c-4.58 26.02-23.78 45.22-37.44 53.12 13.66 6.4 35.52 23.14 43.84 53.44h-30.29c-6.5-20.27-22.72-35.95-44.16-38.08v38.08h-3.3z" /></svg>
              </a>
              <a className="social-chip tg" href="#" onClick={(e) => e.preventDefault()} aria-label="Design Ledger в Telegram" title="Telegram">
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" /></svg>
              </a>
            </div>
          </div>
          {cols.map(([h, items]) => (
            <div key={h}>
              <div style={{ fontWeight: 700, marginBottom: 16, fontSize: "var(--fs-15)" }}>{h}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {items.map(([t, href]) => href
                  ? <a key={t} href={href} style={{ color: "var(--muted)", fontSize: "var(--fs-14)", transition: "var(--dur-fast)" }}
                      onMouseEnter={(e) => (e.target.style.color = "var(--text)")} onMouseLeave={(e) => (e.target.style.color = "var(--muted)")}>{t}</a>
                  : <span key={t} title="Раздел скоро" style={{ color: "var(--faint)", fontSize: "var(--fs-14)", cursor: "default" }}>{t}</span>)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid var(--hairline)", marginTop: 44, paddingTop: 26, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, color: "var(--faint)", fontSize: "var(--fs-13)" }}>
          <span>© 2026 Design Ledger. Прототип интерфейса.</span>
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
  /* диплинк /#pricing и т.п. должен доскроллить до секции, а не обнулять
     скролл — раньше useEffect всегда сбрасывал в 0 (аудит Programa) */
  useE3(() => {
    const h = window.location.hash;
    // хэш может быть не CSS-ID-селектором (соц.сети/маркетинг-ссылки дописывают
    // #!promo, #foo bar, #123start) — querySelector на таком бросает SyntaxError
    let el = null;
    if (/^#[A-Za-z][\w-]*$/.test(h)) { try { el = document.querySelector(h); } catch (e) {} }
    if (el) { el.scrollIntoView({ behavior: motionOK() ? "smooth" : "auto" }); return; }
    window.scrollTo({ top: 0 });
  }, []);
  return (
    <div>
      <SiteNav go={go} />
      {/* порядок — по рецепту стартовой Programa (реш. владельца 12.07):
         hero → лента фактов → сетка фич → интерактив-демо → цитата →
         путь → портал → витрина → отстройка → калькуляторы → голоса →
         тарифы → журнал */}
      <main id="main">
        <Hero go={go} />
        <FactsMarquee />
        <FeatureGrid go={go} />
        <ClipperDemo go={go} />
        <QuoteBand />
        <HowItWorks go={go} />
        <ClientPortalPromo />
        <InlineCta go={go} text="Согласование — без вотсапа и созвонов" sub="Клиентский портал входит в любой тариф" />
        <SpecCategories />
        <WhoFor />
        <InlineCta go={go} text="Хотите смету по своему проекту?" sub="Первая — бесплатно, без карты" />
        <BudgetCalc go={go} />
        <PayoffCalc />
        <SocialProof />
        <Pricing go={go} />
        <NewsFeed />
      </main>
      <Footer go={go} />
    </div>
  );
}

/* --------------------------------------------------------------
   /CHANGELOG — публичная страница «Что нового» (волна F3 бенчмарка
   Programa, PROGRAMA_BENCHMARK_2026-07-08.md §3: «дёшево, доверие»).
   Не путать с NewsFeed («Новости дизайна» — редакционный журнал):
   здесь только наши собственные релизы простым языком, без
   внутреннего жаргона роадмапа/номеров PR/код-ревью.
-------------------------------------------------------------- */
/* Два калибра записей (образец Programa §1.4): крупные релизы — лонгрид с
   hero-иллюстрацией (наш React-мокап, не скриншот — не устаревает по стилю),
   подзаголовками-фичами и секцией «Где найти»; остальное — плоский список
   «Недавно добавили». Плюс анонс «Скоро» (бейдж, §1.5) — честно помечен как
   ещё не релиз (канон «пример, не факт»). Мокапы-иллюстрации ниже (Clip*). */

// Анонс до релиза — тизер роадмапа (клиппер, роадмап п.8). Бейдж «Скоро».
const CHANGELOG_SOON = {
  hero: "clip",
  tag: "Клиппер", title: "Смета из ссылки на магазин",
  text: "Вставьте ссылку на карточку товара — сервис сам достанет название, артикул, цену и бренд и добавит позицию в смету. Первым появится клиппер по ссылке, следом — заливка PDF-коммерческих предложений фабрик и салонов.",
  where: "В редакторе сметы — кнопкой «Добавить по ссылке» между комнатами (сама кнопка уже стоит, включаем извлечение).",
};

// Крупные релизы — по одному лонгриду с иллюстрацией.
const CHANGELOG_BIG = [
  {
    date: "2026-07-08", hero: "portal", tag: "Портал",
    title: "Клиент согласует смету по ссылке — без вашего Excel и созвонов",
    text: "Отправьте ссылку на портал вместо PDF в переписке. Клиент открывает смету в браузере без пароля, видит только свою цену и решает по каждой позиции.",
    feats: [
      "Комментарий и статус на каждой позиции: согласовано / обсуждается / на рассмотрении",
      "Протокол согласования — один PDF со всеми решениями клиента и датами",
    ],
    where: "Версии сметы → «Ссылка для клиента». В настройках студии добавьте лого и реквизиты — они попадут в шапку портала.",
  },
  {
    date: "2026-07-01", hero: "price", tag: "Смета",
    title: "Две цены в одной смете — себестоимость для вас, цена для клиента",
    text: "В каждой строке рядом стоят закупочная цена и цена клиенту. Наценка пересчитывается на лету, а в клиентской выгрузке себестоимость и процент не показываются.",
    feats: [
      "Свой процент наценки по разделам, а не одна цифра на всю смету",
      "Профили «Мои стандарты» — сохранённая наценка со скидками применяется к проекту одним кликом",
    ],
    where: "Карточка наценки в смете: ползунок процента и панель «Мои стандарты».",
  },
  {
    date: "2026-07-09", hero: "today", tag: "Закупка",
    title: "Аванс просрочен? Поставка едет три недели? Всё видно на одном экране",
    text: "У каждой позиции закупки — даты авансов и остатков клиенту и поставщику и трек-номер отправления кликабельной ссылкой. Виджет «Сегодня в работе» собирает просроченные и ближайшие платежи по всем проектам сразу.",
    feats: [
      "Отдельные даты аванса и остатка для клиента и для поставщика",
      "Трек-номер с прямой ссылкой на отслеживание",
    ],
    where: "Кабинет → «Сегодня». Даты и трек заводятся в стадии закупки на карточке позиции.",
  },
];

// Мелочи — плоский список «Недавно добавили» (Programa §1.4).
const CHANGELOG_RECENT = [
  { date: "2026-07-09", tag: "Смета", title: "Паспорт свежести цен", text: "Во всех выгрузках видно, на какую дату проверены цены — если давно, документ честно предупредит." },
  { date: "2026-07-09", tag: "Лендинг", title: "Бесплатный шаблон сметы в Excel", text: "Пустой шаблон в нашем формате без регистрации — заполните и сразу импортируйте обратно." },
  { date: "2026-07-08", tag: "Библиотека", title: "Библиотека товаров студии", text: "Сохраняйте проверенные позиции с артикулом, поставщиком и ценой — добавляйте в новые сметы одним кликом." },
  { date: "2026-07-07", tag: "Закупка", title: "Закупочный лист по поставщикам", text: "Позиции группируются по поставщикам — отдельный лист на каждого в Excel и PDF, готовый к отправке." },
  { date: "2026-07-07", tag: "Смета", title: "Из прошлого проекта и готовые шаблоны", text: "Копируйте комнаты и позиции из прошлых смет или начните с готовой комплектации — санузел, спальня, прихожая, кухня." },
  { date: "2026-07-06", tag: "Эргономика", title: "Проверка норм и стадии работы", text: "Смета проверяет проходы и расстановку по нормам NKBA/Neufert. Проект идёт по стадиям: Сбор → Согласование → Закупка → Сдача." },
  { date: "2026-06-29", tag: "Экспорт", title: "Импорт из Excel и два режима выгрузки", text: "Загружайте готовую комплектацию из Excel. Выгрузка бывает рабочей (с себестоимостью) и для клиента (только его цена)." },
];

function groupChangelogByDate(list) {
  const byDate = new Map();
  list.forEach((item) => {
    if (!byDate.has(item.date)) byDate.set(item.date, { date: item.date, items: [] });
    byDate.get(item.date).items.push(item);
  });
  return Array.from(byDate.values());
}
const CHANGELOG_RECENT_GROUPS = groupChangelogByDate(CHANGELOG_RECENT); // список не меняется — считаем один раз

const fmtLongDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

/* --- hero-иллюстрации записей: стилизованные мокапы фичи, не скриншоты --- */
function ClipHero({ kind }) {
  return (
    <div style={{ borderRadius: "var(--r-lg)", padding: "clamp(20px,4vw,30px)", background: "var(--surface-glass, rgba(255,255,255,.4))", border: "1px solid var(--hairline)", display: "grid", placeItems: "center", minHeight: 168 }}>
      {kind === "clip" && <ClipMockClipper />}
      {kind === "portal" && <ClipMockPortal />}
      {kind === "price" && <ClipMockPrice />}
      {kind === "today" && <ClipMockToday />}
    </div>
  );
}

const clipCardCss = { background: "var(--bg-base, #fff)", border: "1px solid var(--hairline)", borderRadius: "var(--r-md, 12px)", boxShadow: "var(--shadow-card)" };
const clipMono = (extra) => ({ fontFamily: "var(--font-mono)", fontSize: "var(--fs-11)", ...extra });
const clipTag = { fontFamily: "var(--font-mono)", fontSize: "var(--fs-10)", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--accent-2-ink)", padding: "3px 9px", borderRadius: 99, background: "var(--accent-2-tint)" };

function ClipMockClipper() {
  return (
    <div style={{ width: "min(340px,100%)", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ ...clipCardCss, display: "flex", alignItems: "center", gap: 8, padding: "10px 12px" }}>
        <I.scan size={15} style={{ color: "var(--spec-meta)", flex: "none" }} />
        <span style={clipMono({ color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>divan.ru/product/sofa-milano-3</span>
      </div>
      <div style={{ display: "flex", justifyContent: "center", color: "var(--spec-meta)" }}><I.arrow size={16} style={{ transform: "rotate(90deg)" }} /></div>
      <div style={{ ...clipCardCss, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontWeight: 700, fontSize: "var(--fs-14)", fontFamily: "var(--font-display)" }}>Диван «Милано», 3-местный</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={clipMono({ color: "var(--spec-meta)" })}>арт. MIL-3 · Divan.ru</span>
          <span style={clipMono({ fontWeight: 700, color: "var(--text)" })}>128 000 ₽</span>
        </div>
      </div>
    </div>
  );
}

function ClipMockPortal() {
  return (
    <div style={{ width: "min(340px,100%)", ...clipCardCss, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: "var(--fs-13)" }}>Кресло лаунж, дуб/букле</span>
        <span style={clipMono({ fontWeight: 600, padding: "3px 9px", borderRadius: 99, background: "rgba(94,107,91,.14)", color: "var(--accent-2-ink)" })}>Согласовано</span>
      </div>
      <div style={{ alignSelf: "flex-start", maxWidth: "90%", padding: "9px 12px", borderRadius: "12px 12px 12px 3px", fontSize: "var(--fs-12)", background: "rgba(183,80,44,.08)", border: "1px solid rgba(183,80,44,.28)", lineHeight: 1.45 }}>
        Можно светлее обивку? Остальное нравится.
      </div>
      <div style={{ alignSelf: "flex-end", maxWidth: "90%", padding: "9px 12px", borderRadius: "12px 12px 3px 12px", fontSize: "var(--fs-12)", ...clipCardCss, boxShadow: "none", lineHeight: 1.45 }}>
        Заменю на бежевый букле, пришлю фото сегодня
      </div>
    </div>
  );
}

function ClipMockPrice() {
  const ROWS = [["Диван «Милано», 3-местный", 128000, 173000], ["Кресло лаунж, дуб/букле", 73000, 98600]];
  const fmt = (n) => new Intl.NumberFormat("ru-RU").format(n) + " ₽";
  return (
    <div style={{ width: "min(340px,100%)", ...clipCardCss, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, ...clipMono({ color: "var(--spec-meta)", fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }) }}>
        <span>Позиция</span><span style={{ textAlign: "right" }}>Себест.</span><span style={{ textAlign: "right" }}>Клиенту</span>
      </div>
      {ROWS.map(([n, c, cli]) => (
        <div key={n} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center", fontSize: "var(--fs-12)" }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n}</span>
          <span style={clipMono({ color: "var(--muted)", textAlign: "right" })}>{fmt(c)}</span>
          <span style={clipMono({ color: "var(--text)", fontWeight: 700, textAlign: "right" })}>{fmt(cli)}</span>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2, paddingTop: 10, borderTop: "1px solid var(--hairline)" }}>
        <span style={clipTag}>наценка +35%</span>
        <span style={clipMono({ color: "var(--accent-2-ink)", fontWeight: 700, marginLeft: "auto" })}>прибыль +70 600 ₽</span>
      </div>
    </div>
  );
}

function ClipMockToday() {
  const ROWS = [
    ["Аванс поставщику · «Милано»", "просрочен 2 дня", true],
    ["Остаток клиенту · кресло", "до 15 июля", false],
  ];
  return (
    <div style={{ width: "min(340px,100%)", ...clipCardCss, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <I.calendar size={15} style={{ color: "var(--accent-2-ink)" }} />
        <span style={{ fontWeight: 700, fontSize: "var(--fs-13)" }}>Сегодня в работе</span>
      </div>
      {ROWS.map(([n, when, late]) => (
        <div key={n} style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
          <span style={{ fontSize: "var(--fs-12)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n}</span>
          <span style={clipMono({ fontWeight: 600, flex: "none", padding: "3px 9px", borderRadius: 99, color: late ? "var(--accent-ink)" : "var(--spec-meta)", background: late ? "var(--accent-tint)" : "var(--hairline)" })}>{when}</span>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 7, paddingTop: 10, borderTop: "1px solid var(--hairline)" }}>
        <I.truck size={14} style={{ color: "var(--spec-meta)", flex: "none" }} />
        <span style={clipMono({ color: "var(--muted)" })}>трек RU284…19 · в пути</span>
      </div>
    </div>
  );
}

/* --- крупная запись: иллюстрация + стори + фичи + «Где найти» --- */
function ClipBigEntry({ item, soon }) {
  return (
    <article className="glass" style={{ borderRadius: "var(--r-xl)", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
      <div style={{ position: "relative", padding: "clamp(18px,3vw,26px)", paddingBottom: 0 }}>
        {soon && <span className="mono" style={{ position: "absolute", top: "clamp(28px,4vw,38px)", right: "clamp(28px,4vw,38px)", zIndex: 1, fontSize: "var(--fs-10)", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#FCF6EE", background: "var(--accent-2-ink)", padding: "5px 11px", borderRadius: 99 }}>Скоро</span>}
        <ClipHero kind={item.hero} />
      </div>
      <div style={{ padding: "clamp(20px,3.4vw,30px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <span className="mono" style={clipTag}>{item.tag}</span>
          <span className="mono" style={{ fontSize: "var(--fs-12)", color: "var(--spec-meta)", fontWeight: 600 }}>
            {soon ? "в планах" : fmtLongDate(item.date)}
          </span>
        </div>
        <h2 className="display" style={{ fontSize: "clamp(21px,2.6vw,30px)", lineHeight: 1.15, letterSpacing: "-0.01em" }}>{item.title}</h2>
        <p style={{ color: "var(--muted)", fontSize: "var(--fs-15)", marginTop: 12, lineHeight: 1.65, maxWidth: 620 }}>{item.text}</p>
        {item.feats && (
          <ul role="list" style={{ listStyle: "none", margin: "18px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 11 }}>
            {item.feats.map((f) => (
              <li key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: "var(--fs-14)", color: "var(--text)", lineHeight: 1.5 }}>
                <I.check size={16} style={{ color: "var(--accent-2-ink)", flex: "none", marginTop: 2 }} />{f}
              </li>
            ))}
          </ul>
        )}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--hairline)", display: "flex", gap: 9, alignItems: "flex-start" }}>
          <I.info size={15} style={{ color: "var(--spec-meta)", flex: "none", marginTop: 2 }} />
          <div>
            <span className="mono" style={{ fontSize: "var(--fs-11)", fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--spec-meta)" }}>Где найти</span>
            <p style={{ color: "var(--muted)", fontSize: "var(--fs-13)", marginTop: 5, lineHeight: 1.55 }}>{item.where}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function ChangelogPage({ go, user }) {
  useE3(() => { window.scrollTo({ top: 0 }); }, []);
  return (
    <React.Fragment>
      <PortalWrap>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 40, flexWrap: "wrap" }}>
          <Logo size={25} onClick={() => go("site")} />
          <div style={{ display: "flex", gap: 10 }}>
            {user
              ? <button className="btn btn-ghost" style={{ padding: "9px 16px", fontSize: "var(--fs-13)" }} onClick={() => go("cabinet")}><I.arrow size={15} style={{ transform: "rotate(180deg)" }} /> В кабинет</button>
              : <React.Fragment>
                  <button className="btn btn-ghost" style={{ padding: "9px 16px", fontSize: "var(--fs-13)" }} onClick={() => go("site")}>На главную</button>
                  <button className="btn btn-primary" style={{ padding: "9px 16px", fontSize: "var(--fs-13)" }} onClick={() => go("auth")}>Войти</button>
                </React.Fragment>}
          </div>
        </div>

        <div className="eyebrow jade" style={{ marginBottom: 16 }}>ЖУРНАЛ ИЗМЕНЕНИЙ</div>
        <h1 className="display" style={{ fontSize: "clamp(32px,4.6vw,52px)" }}>Что нового в Design Ledger</h1>
        <p style={{ color: "var(--muted)", fontSize: "var(--fs-15)", marginTop: 14, maxWidth: 560, lineHeight: 1.6 }}>
          Что добавили и починили — по датам, без маркетинга. Ведём открыто с первого дня прототипа.
        </p>

        {/* Анонс «Скоро» + крупные релизы */}
        <div style={{ marginTop: 44, display: "flex", flexDirection: "column", gap: 22 }}>
          <ClipBigEntry item={CHANGELOG_SOON} soon />
          {CHANGELOG_BIG.map((item) => <ClipBigEntry key={item.title} item={item} />)}
        </div>

        {/* Недавно добавили — плоский список мелочей */}
        <h2 className="display" style={{ fontSize: "var(--fs-21)", marginTop: 52, marginBottom: 4 }}>Недавно добавили</h2>
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 28 }}>
          {CHANGELOG_RECENT_GROUPS.map((g) => (
            <div key={g.date} style={{ display: "grid", gridTemplateColumns: "clamp(72px,18vw,104px) 1fr", gap: 18 }}>
              <div className="mono" style={{ fontSize: "var(--fs-12)", fontWeight: 700, color: "var(--spec-meta)", paddingTop: 4 }}>
                {new Date(g.date + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {g.items.map((item, i) => (
                  <div key={i} className="glass" style={{ borderRadius: "var(--r-lg)", padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6, flexWrap: "wrap" }}>
                      <span className="mono" style={{ fontSize: "var(--fs-10)", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--accent-2-ink)", padding: "3px 9px", borderRadius: 99, background: "var(--accent-2-tint)" }}>{item.tag}</span>
                      <h3 style={{ fontSize: "var(--fs-16)", fontWeight: 700, fontFamily: "var(--font-display)" }}>{item.title}</h3>
                    </div>
                    <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", lineHeight: 1.6 }}>{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PortalWrap>
      <Footer go={go} />
    </React.Fragment>
  );
}

window.Footer = Footer;
window.SitePage = SitePage;
window.ChangelogPage = ChangelogPage;
