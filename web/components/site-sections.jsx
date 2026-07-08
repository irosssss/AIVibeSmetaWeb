/* ============================================================
   Design Ledger — секции промо-сайта (часть 2)
   How-it-works (sticky scroll-сторителлинг) · Bento · Новости ·
   GitHub · Footer
   ============================================================ */
const { useState: useS2, useEffect: useE2, useRef: useR2 } = React;

const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/* На телефоне/планшете «приколотый» скролл-сторителлинг рвётся и тяжёл —
   там показываем секцию статично (как при reduce-motion). */
const narrowVP = window.matchMedia && window.matchMedia("(max-width: 860px)").matches;
const staticHow = prefersReduced || narrowVP;

/* --------------------------------------------------------------
   HOW IT WORKS — sticky-сцена, прогресс ведётся скроллом
-------------------------------------------------------------- */
const STEPS = [
  { n: "01", icon: I.ruler, lot: "stepMeasure", tag: "Источник",     title: "Вставьте ссылку на товар или фото комнаты", text: "Клиппер затянет товар с сайта фабрики — с ценой и артикулом, или начните с фото комнаты. Без обмеров и 3D-программ." },
  { n: "02", icon: I.spark, lot: "stepAI",      tag: "Смета и нормы", title: "Design Ledger собирает смету и проверяет её по нормам", text: "Спецификация с артикулами и ценами под стиль и бюджет — а движок эргономики проверяет проходы и дистанции по NKBA и Нойферту." },
  { n: "03", icon: I.layers, lot: "stepSpec",   tag: "3 варианта",  title: "Готовая смета в трёх бюджетах", text: "Эконом, база, премиум — выгружайте спецификацию клиенту. Меняете предмет — итог и проверка пересчитываются." },
];

/* глиф шага: активный — Lottie line-art на бумажном квадрате; иначе статичная иконка */
function StepGlyph({ step, on }) {
  const box = { flex: "none", width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", transition: "all .45s" };
  if (on) return (
    <div style={{ ...box, background: "var(--surface)", border: "1px solid rgba(94,107,91,.4)", boxShadow: "var(--shadow-card)" }}>
      <Lottie name={step.lot} ariaLabel="" fallback={<step.icon size={22} style={{ color: "var(--accent-2)" }} />} style={{ width: 34, height: 34 }} />
    </div>
  );
  return <div style={{ ...box, background: "var(--surface-2)", color: "var(--muted)" }}><step.icon size={21} /></div>;
}

/* роутер: на узких экранах — свайп-степпер, иначе — sticky-сторителлинг */
function HowItWorks() {
  return narrowVP ? <HowMobile /> : <HowDesktop />;
}

function HowDesktop() {
  const wrapRef = useR2(null);
  const [p, setP] = useS2(0); // 0..1 прогресс по секции

  useE2(() => {
    if (prefersReduced) { setP(0.5); return; }
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = wrapRef.current; if (!el) return;
        const rect = el.getBoundingClientRect();
        const total = el.offsetHeight - window.innerHeight;
        const prog = Math.min(1, Math.max(0, -rect.top / total));
        setP(prog);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, []);

  const active = Math.min(2, Math.floor(p * 3 + (prefersReduced ? 0 : 0.0001)));
  const sub = Math.min(1, (p * 3) - active); // прогресс внутри активного шага

  return (
    <section id="how" ref={wrapRef} style={{ position: "relative", height: prefersReduced ? "auto" : "340vh" }}>
      <div className="minh-screen" style={{ position: prefersReduced ? "static" : "sticky", top: 0, minHeight: prefersReduced ? "auto" : undefined, display: "flex", alignItems: "center", paddingBlock: "clamp(60px,10vh,110px)" }}>
        <div className="container how-grid" style={{ display: "grid", gridTemplateColumns: "0.92fr 1.08fr", gap: "clamp(32px,5vw,72px)", width: "min(var(--maxw),100% - var(--gutter)*2)", alignItems: "center" }}>
          {/* левая колонка — шаги */}
          <div>
            <div className="eyebrow jade" style={{ marginBottom: 18 }}><span style={{ width: 22, height: 1, background: "var(--accent-2)" }} />КАК ЭТО РАБОТАЕТ</div>
            <h2 className="display" style={{ fontSize: "clamp(34px,4.4vw,60px)", marginBottom: 36 }}>От пустой комнаты<br />до готовой сметы</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {STEPS.map((s, i) => {
                const on = i === active;
                return (
                  <div key={s.n} className="glass" style={{ borderRadius: "var(--r-lg)", padding: "20px 22px", display: "flex", gap: 16,
                    borderColor: on ? "rgba(94,107,91,.5)" : "var(--hairline)",
                    background: on ? "rgba(94,107,91,.08)" : "var(--surface)",
                    boxShadow: on ? "var(--shadow-card)" : "none",
                    opacity: on ? 1 : 0.55, transition: "all .45s ease" }}>
                    <StepGlyph step={s} on={on} />
                    <div>
                      <div style={{ display: "flex", gap: 9, alignItems: "baseline", marginBottom: 4 }}>
                        <span className="mono" style={{ fontSize: 13, fontWeight: 500, color: on ? "var(--accent-2)" : "var(--faint)" }}>{s.n}</span>
                        <span style={{ fontWeight: 700, fontSize: 16.5 }}>{s.tag}</span>
                      </div>
                      <p style={{ fontSize: 14.5, color: "var(--muted)", lineHeight: 1.55 }}>{on ? s.title : s.text}</p>
                      {on && !prefersReduced && (
                        <div style={{ height: 3, borderRadius: 9, background: "var(--surface-2)", marginTop: 12, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: sub * 100 + "%", background: "var(--accent-2)" }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* правая колонка — эволюционирующая сцена */}
          <DemoStage active={active} sub={sub} />
        </div>
      </div>
    </section>
  );
}

/* мобильный свайп-степпер: 3 слайда, демо-сцена заморожена на своём шаге */
function HowMobile() {
  const scRef = useR2(null);
  const [idx, setIdx] = useS2(0);
  const onScroll = () => {
    const el = scRef.current; if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setIdx((prev) => (prev !== i ? i : prev));
  };
  const goto = (i) => {
    const el = scRef.current; if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  return (
    <section id="how" style={{ paddingBlock: "clamp(56px,9vh,90px)" }}>
      <div className="container">
        <div className="eyebrow jade" style={{ marginBottom: 16 }}><span style={{ width: 22, height: 1, background: "var(--accent-2)" }} />КАК ЭТО РАБОТАЕТ</div>
        <h2 className="display" style={{ fontSize: "clamp(30px,8vw,44px)" }}>От пустой комнаты<br />до готовой сметы</h2>

        <div ref={scRef} onScroll={onScroll} className="how-scroller">
          {STEPS.map((s, i) => (
            <div key={s.n} className="how-slide">
              <DemoStage active={i} sub={1} />
              <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: "18px 20px", display: "flex", gap: 15,
                borderColor: "rgba(94,107,91,.45)", background: "rgba(94,107,91,.07)" }}>
                <StepGlyph step={s} on={true} />
                <div>
                  <div style={{ display: "flex", gap: 9, alignItems: "baseline", marginBottom: 4 }}>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 500, color: "var(--accent-2)" }}>{s.n}</span>
                    <span style={{ fontWeight: 700, fontSize: 16.5 }}>{s.tag}</span>
                  </div>
                  <p style={{ fontSize: 14.5, color: "var(--muted)", lineHeight: 1.55 }}>{s.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="how-dots" role="tablist" aria-label="Шаги">
          {STEPS.map((s, i) => (
            <button key={s.n} className={i === idx ? "on" : ""} aria-label={`Шаг ${s.n}: ${s.tag}`} aria-selected={i === idx} role="tab" onClick={() => goto(i)}><i /></button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* центральная сцена: скан → AI-чат → расстановка (тёплая, спец-лист) */
function DemoStage({ active, sub }) {
  const scanFill = active === 0 ? sub : 1;
  return (
    <div className="glass" style={{ position: "relative", borderRadius: "var(--r-xl)", overflow: "hidden", aspectRatio: "4/3.4", boxShadow: "var(--shadow-pop)" }}>
      <Img src={PHOTOS.living} label="фото интерьера" />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(46,42,38,.10), rgba(46,42,38,.5))" }} />

      {/* СТАДИЯ 0 — скан (терракота) */}
      <div style={{ position: "absolute", inset: 0, opacity: active === 0 ? 1 : 0.25, transition: "opacity .5s" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(183,80,44,.30) 1px,transparent 1px),linear-gradient(90deg,rgba(183,80,44,.30) 1px,transparent 1px)", backgroundSize: "30px 30px",
          clipPath: `inset(0 ${(1 - scanFill) * 100}% 0 0)`, transition: "clip-path .2s linear" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: scanFill * 100 + "%", width: 2, background: "var(--accent)", boxShadow: "0 0 22px var(--accent)", opacity: active === 0 ? 1 : 0 }} />
      </div>

      {/* СТАДИЯ 1 — AI-чат */}
      <div style={{ position: "absolute", left: 18, right: 18, bottom: 18, display: "flex", flexDirection: "column", gap: 10,
        opacity: active === 1 ? 1 : 0, transform: active === 1 ? "none" : "translateY(14px)", transition: "all .5s", pointerEvents: "none" }}>
        <div className="glass" style={{ alignSelf: "flex-end", maxWidth: "70%", padding: "11px 15px", borderRadius: "16px 16px 4px 16px", fontSize: 14, background: "rgba(183,80,44,.14)", borderColor: "rgba(183,80,44,.35)" }}>
          Хочу уютную гостиную в тёплых тонах, бюджет 500к
        </div>
        <div className="glass" style={{ alignSelf: "flex-start", maxWidth: "82%", padding: "13px 16px", borderRadius: "16px 16px 16px 4px", fontSize: 14, lineHeight: 1.5, boxShadow: "var(--shadow-card)" }}>
          <span className="mono" style={{ display: "block", color: "var(--accent-2)", fontWeight: 500, fontSize: 11, letterSpacing: ".06em", marginBottom: 5 }}>СМЕТА AIVIBE · YANDEXGPT 5</span>
          Собрал смету: 38 позиций — диван-терракота, дубовый стеллаж, тёплый свет. Итог 480 000 ₽, расстановка по нормам.
        </div>
      </div>

      {/* СТАДИЯ 2 — проверка норм (олива = в норме): чипы с результатами, не «расстановка» */}
      <div style={{ position: "absolute", inset: 0, opacity: active === 2 ? 1 : 0, transition: "opacity .5s", pointerEvents: "none" }}>
        {[[34, 58, "Диван", "проход 92 см"], [66, 40, "Стеллаж", "дверь не задета"], [52, 72, "Лампа", "высота ок"]].map(([l, t, name, norm], i) => (
          <div key={i} className="glass" style={{ position: "absolute", left: l + "%", top: t + "%", transform: "translate(-50%,-50%)",
            padding: "7px 12px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 7,
            borderColor: "rgba(94,107,91,.55)", background: "rgba(251,248,242,.92)",
            opacity: sub > i * 0.28 ? 1 : 0, transition: `opacity .4s ${i * 0.05}s` }}>
            <I.check size={14} style={{ color: "var(--accent-2)" }} /> {name}
            <span className="mono" style={{ fontSize: 10.5, fontWeight: 500, color: "var(--accent-2)" }}>{norm}</span>
          </div>
        ))}
      </div>

      {/* верхний статус-бар сцены */}
      <div className="glass" style={{ position: "absolute", top: 16, left: 16, padding: "8px 14px", borderRadius: 99, fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 9, boxShadow: "var(--shadow-card)" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
        {["Ссылка или фото", "Подбор и смета", "Проверка норм"][active]}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------
   КОМПЛЕКТАЦИЯ ПО КАТЕГОРИЯМ — витрина вывода: карточки с рендером,
   себестоимостью и ценой клиенту (две цены на каждую категорию).
-------------------------------------------------------------- */
function SpecCategories() {
  const ref = useReveal();
  const CATS = [
    ["cat-mebel", "Мебель", "12 позиций", "462 000", "612 000 ₽"],
    ["cat-svet", "Свет", "8 позиций", "142 000", "188 000 ₽"],
    ["cat-dekor", "Декор", "11 позиций", "108 000", "143 000 ₽"],
    ["cat-tekstil", "Текстиль", "7 позиций", "408 000", "537 000 ₽"],
  ];
  return (
    <section id="komplektacia" style={{ paddingBlock: "clamp(70px,10vh,120px)" }} ref={ref}>
      <div className="container reveal">
        <div className="catsec-head">
          <div>
            <div className="eyebrow"><span style={{ width: 22, height: 1, background: "var(--accent)" }} />спецификация · 38 позиций</div>
            <h2 className="display" style={{ fontSize: "clamp(30px,4vw,50px)", marginTop: 14 }}>Комплектация по категориям</h2>
          </div>
          <p style={{ color: "var(--muted)", maxWidth: 340, fontSize: 14.5 }}>Мебель, свет, декор и текстиль — с артикулами, себестоимостью и ценой клиенту. Меняете позицию — итог и наценка пересчитываются.</p>
        </div>
        <div className="catgrid">
          {CATS.map(([img, name, count, cost, client]) => (
            <div className="catcard" key={name}>
              <div className="cph"><Img src={"img/" + img + ".jpg"} label={name} /></div>
              <div className="cbody">
                <div className="cn">{name}</div>
                <div className="cc">{count}</div>
                <div className="ctwo"><span className="c1">себест. {cost}</span><span className="c2">{client}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------
   ДЛЯ КОГО — отстройка жанра (разбор конкурентов 07.07): смета
   КОМПЛЕКТАЦИИ, не смета ремонта. Режет нецелевые лиды из выдачи
   «смета ИИ»; сметчикам честно называем профильные сервисы.
-------------------------------------------------------------- */
function WhoFor() {
  const ref = useReveal();
  const YES = [
    "Мебель, свет, сантехника и декор — позициями с артикулами и поставщиками",
    "Две цены в одном документе: себестоимость и цена клиенту, наценка по разделам",
    "Три выгрузки: рабочая, для клиента и закупочный лист по поставщикам",
    "Проверка эргономики по нормам NKBA и Нойферта — до отправки клиенту",
  ];
  const NO = [
    "Сметы ремонтных работ: демонтаж, стяжка, штукатурка — не считаем",
    "Формы КС-2 / КС-3, ГРАНД-Смета и нормативные базы — не делаем",
    "Расчёт стройматериалов по чертежам — не наш жанр",
  ];
  return (
    <section id="whofor" style={{ paddingBlock: "clamp(60px,9vh,110px)" }} ref={ref}>
      <div className="container reveal">
        <div className="catsec-head">
          <div>
            <div className="eyebrow"><span style={{ width: 22, height: 1, background: "var(--accent)" }} />ДЛЯ КОГО</div>
            <h2 className="display" style={{ fontSize: "clamp(30px,4vw,50px)", marginTop: 14 }}>Смета комплектации —<br />не смета ремонта</h2>
          </div>
          <p style={{ color: "var(--muted)", maxWidth: 340, fontSize: 14.5 }}>Design Ledger считает то, что дизайнер ставит в интерьер. И честно говорит, для кого он не подходит.</p>
        </div>
        <div className="who-grid">
          <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: "26px 28px", borderColor: "rgba(94,107,91,.45)", background: "rgba(94,107,91,.07)", boxShadow: "var(--shadow-card)" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, margin: "0 0 18px" }}>Мы — для дизайнеров и комплектаторов</h3>
            {/* role=list: listStyle:none снимает роль списка в Safari/VoiceOver */}
            <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {YES.map((t) => (
                <li key={t} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14.5, color: "var(--text)", lineHeight: 1.5 }}>
                  <I.check size={16} style={{ color: "var(--accent-2-ink)", flex: "none", marginTop: 2 }} />{t}
                </li>
              ))}
            </ul>
          </div>
          <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: "26px 28px", display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, margin: "0 0 18px", color: "var(--muted)" }}>Мы — не про ремонт</h3>
            <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {NO.map((t) => (
                <li key={t} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14.5, color: "var(--muted)", lineHeight: 1.5 }}>
                  <I.close size={16} style={{ color: "var(--spec-meta)", flex: "none", marginTop: 2 }} />{t}
                </li>
              ))}
            </ul>
            <p className="mono" style={{ marginTop: "auto", paddingTop: 18, fontSize: 12, color: "var(--spec-meta)", lineHeight: 1.6 }}>
              за сметой работ — к профильным сервисам для прорабов (ПростоСмета, Gectaro): это другой жанр
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------
   ОКУПАЕМОСТЬ — калькулятор «подписка = доли процента от наценки».
   Переводит цену из «расход на софт» в «доля с заработка»
   (разбор конкурентов 07.07: их жанр продаёт документ за 150 ₽,
   мы — инструмент, которым дизайнер зарабатывает наценку).
-------------------------------------------------------------- */
function PayoffCalc() {
  const ref = useReveal();
  const [budget, setBudget] = useS2(2700000);
  const [markup, setMarkup] = useS2(25);
  const f = (n) => new Intl.NumberFormat("ru-RU").format(Math.round(n));
  const SUB = 2900;
  const profit = (budget * markup) / 100;
  const share = profit > 0 ? (SUB / profit) * 100 : 0;
  const shareTxt = share < 0.1 ? "менее 0,1" : share.toFixed(1).replace(".", ",");
  /* сколько подписки покрывает наценка одного проекта — честная динамика
     вместо статичного лозунга (минимум слайдеров: 30 000 ₽ → 10 месяцев) */
  const months = Math.floor(profit / SUB);
  const years = Math.floor(months / 12);
  const coverTxt = months < 12
    ? months + " " + plural(months, ["месяц", "месяца", "месяцев"])
    : "≈ " + years + " " + plural(years, ["год", "года", "лет"]);
  return (
    <section id="payoff" style={{ paddingBlock: "clamp(60px,9vh,110px)" }} ref={ref}>
      <div className="container reveal">
        <div className="eyebrow jade" style={{ marginBottom: 18 }}><span style={{ width: 22, height: 1, background: "var(--accent-2)" }} />ОКУПАЕМОСТЬ</div>
        <h2 className="display" style={{ fontSize: "clamp(30px,4vw,50px)", maxWidth: 720 }}>Подписка окупается одним проектом</h2>
        <p style={{ color: "var(--muted)", maxWidth: 520, fontSize: 15.5, marginTop: 16 }}>
          Design Ledger — не расход на софт, а инструмент, которым вы зарабатываете наценку. Посчитайте на своём проекте.
        </p>
        <div className="glass calc-grid" style={{ borderRadius: "var(--r-xl)", padding: "clamp(24px,4vw,44px)", marginTop: 34, boxShadow: "var(--shadow-card)" }}>
          <div>
            <div className="calc-ctrl">
              <div className="lab"><span>Бюджет комплектации проекта</span><b className="mono" style={{ color: "var(--text)", fontSize: 16, whiteSpace: "nowrap" }}>{f(budget)}{" "}₽</b></div>
              <input type="range" className="quiz-range" min="300000" max="10000000" step="100000" value={budget}
                onChange={(e) => setBudget(+e.target.value)}
                aria-label="Бюджет комплектации проекта" aria-valuetext={f(budget) + " рублей"} />
            </div>
            <div className="calc-ctrl">
              <div className="lab"><span>Ваша наценка</span><b className="mono" style={{ color: "var(--text)", fontSize: 16, whiteSpace: "nowrap" }}>+{markup}%</b></div>
              <input type="range" className="quiz-range" min="10" max="40" step="1" value={markup}
                onChange={(e) => setMarkup(+e.target.value)}
                aria-label="Ваша наценка" aria-valuetext={"плюс " + markup + " " + plural(markup, ["процент", "процента", "процентов"])} />
            </div>
            <p className="mono" style={{ fontSize: 11.5, color: "var(--spec-meta)", marginTop: 14, lineHeight: 1.6 }}>
              по умолчанию — реальный проект: комплектация 2,7 млн ₽, 50 позиций
            </p>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14, paddingBlock: 12, borderBottom: "1px solid var(--hairline-2)" }}>
              <span style={{ fontSize: 14.5, color: "var(--muted)" }}>Наценка с одного проекта</span>
              <b className="mono" style={{ fontSize: "clamp(22px,2.6vw,30px)", fontWeight: 600, color: "var(--accent-2-ink)", whiteSpace: "nowrap" }}>+{f(profit)} ₽</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14, paddingBlock: 12, borderBottom: "1px solid var(--hairline-2)" }}>
              <span style={{ fontSize: 14.5, color: "var(--muted)" }}>Подписка «Практика»</span>
              <b className="mono" style={{ fontSize: 16, fontWeight: 500, whiteSpace: "nowrap" }}>{f(SUB)} ₽ / мес</b>
            </div>
            {/* live-регион только на итоге и atomic — иначе скринридер читает
               бессвязные куски изменившихся узлов на каждый шаг слайдера */}
            <div style={{ paddingTop: 18 }} aria-live="polite" aria-atomic="true">
              <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(20px,2.4vw,26px)", fontWeight: 700, lineHeight: 1.3 }}>
                = <span style={{ color: "var(--accent-ink)" }}>{shareTxt}%</span> от наценки одного проекта
              </div>
              <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 8, lineHeight: 1.55 }}>Наценка одного такого проекта покрывает {coverTxt} подписки.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------
   СОЦ-ДОКАЗАТЕЛЬСТВО — моно-метрики беты + голоса дизайнеров.
   Doubt-триггер воронки: «такие же, как я, уже считают здесь».
-------------------------------------------------------------- */
function SocialProof() {
  const ref = useReveal();
  const METRICS = [["4 812", "смет собрано в бете"], ["127", "дизайнеров считают здесь"], ["90 сек", "медиана до первой сметы"]];
  const QUOTES = [
    ["Раньше — вечер в Excel после каждого замера. Теперь смета уходит клиенту в тот же день, и наценка уже внутри документа.", "Марина К.", "дизайнер интерьера · Казань"],
    ["Две цены в одном документе — ровно так я и работаю. Клиент видит свою цену, я вижу свою маржу.", "Ольга С.", "студия двух дизайнеров · Екатеринбург"],
    ["Проверка проходов ловит то, что клиент заметил бы уже на объекте. Это бережёт репутацию сильнее скидок.", "Дмитрий Л.", "дизайнер-декоратор · Москва"],
  ];
  return (
    <section id="designers" style={{ paddingBlock: "clamp(60px,9vh,110px)" }} ref={ref}>
      <div className="container reveal">
        <div className="eyebrow jade" style={{ marginBottom: 18 }}><span style={{ width: 22, height: 1, background: "var(--accent-2)" }} />ДИЗАЙНЕРЫ О СМЕТЕ</div>
        <h2 className="display" style={{ fontSize: "clamp(30px,4vw,50px)", maxWidth: 700 }}>Считают в Design Ledger — отправляют клиенту</h2>

        {/* моно-метрики */}
        <div className="sp-metrics">
          {METRICS.map(([v, k]) => (
            <div key={k}>
              <div className="mono" style={{ fontSize: "clamp(26px,3vw,38px)", fontWeight: 600, color: "var(--text)", lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 8 }}>{k}</div>
            </div>
          ))}
        </div>

        {/* голоса */}
        <div className="sp-grid">
          {QUOTES.map(([q, name, role]) => (
            <figure key={name} className="glass" style={{ borderRadius: "var(--r-lg)", padding: "24px 26px", margin: 0, display: "flex", flexDirection: "column", gap: 18 }}>
              <blockquote style={{ margin: 0, fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 16.5, lineHeight: 1.5, color: "var(--text)" }}>«{q}»</blockquote>
              <figcaption style={{ marginTop: "auto", display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{name}</span>
                <span className="mono" style={{ fontSize: 11.5, color: "var(--spec-meta)" }}>{role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------
   ТАРИФЫ — канон цен 1490 / 2900 / 4900; метрика — АКТИВНЫЕ ПРОЕКТЫ
   (решение владельца 07.07: «кредиты рендеров» продавали несуществующее
   и не были связаны с ценностью петли). Активный = не в стадии «Архив».
   Цены не прячем: доверие + честный вход «первая смета бесплатно».
-------------------------------------------------------------- */
function Pricing({ go }) {
  const ref = useReveal();
  const PLANS = [
    { name: "Старт", price: 1490, note: "для первых проектов", feats: ["2 активных проекта", "Смета: две цены и наценка по разделам", "Экспорт PDF", "Канон норм Design Ledger"] },
    { name: "Практика", price: 2900, hot: true, note: "выбор дизайнеров", feats: ["10 активных проектов", "Экспорт PDF + Excel: рабочая, клиенту, закупка", "Импорт смет из Excel", "Свои нормы и библиотека стилей"] },
    { name: "Студия", price: 4900, note: "для команды", feats: ["Проекты без лимита", "Команда до 5 человек", "Смета под логотипом студии", "Приоритетная поддержка"] },
  ];
  return (
    <section id="pricing" style={{ paddingBlock: "clamp(70px,10vh,120px)" }} ref={ref}>
      <div className="container reveal">
        <div className="catsec-head">
          <div>
            <div className="eyebrow"><span style={{ width: 22, height: 1, background: "var(--accent)" }} />ТАРИФЫ</div>
            <h2 className="display" style={{ fontSize: "clamp(30px,4vw,50px)", marginTop: 14 }}>Честные цены, без звёздочек</h2>
          </div>
          <p style={{ color: "var(--muted)", maxWidth: 340, fontSize: 14.5 }}>Первая смета — бесплатно и без карты. Считаем по активным проектам: сданные уходят в архив и лимита не занимают.</p>
        </div>
        <div className="price-grid">
          {PLANS.map((p) => (
            <article key={p.name} className="glass" style={{ borderRadius: "var(--r-lg)", padding: "26px 26px 24px", display: "flex", flexDirection: "column", gap: 18, position: "relative",
              borderColor: p.hot ? "var(--accent)" : "var(--hairline)", boxShadow: p.hot ? "var(--shadow-pop)" : "none" }}>
              {p.hot && <span style={{ position: "absolute", top: -12, left: 24, padding: "4px 12px", borderRadius: 99, fontSize: 11.5, fontWeight: 700, background: "var(--accent)", color: "var(--on-accent)" }}>{p.note}</span>}
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 21 }}>{p.name}</div>
                {!p.hot && <div style={{ fontSize: 12.5, color: "var(--spec-meta)", marginTop: 2 }}>{p.note}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                <span className="mono" style={{ fontSize: 34, fontWeight: 600, lineHeight: 1 }}>{new Intl.NumberFormat("ru-RU").format(p.price)} ₽</span>
                <span className="mono" style={{ fontSize: 12.5, color: "var(--spec-meta)" }}>/ мес</span>
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                {p.feats.map((f) => (
                  <li key={f} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 14, color: "var(--muted)", lineHeight: 1.45 }}>
                    <I.check size={15} style={{ color: "var(--accent-2)", flex: "none", marginTop: 2 }} />{f}
                  </li>
                ))}
              </ul>
              <button className={"btn btn-block " + (p.hot ? "btn-primary" : "btn-ghost")} onClick={() => go("auth")}>Начать бесплатно</button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------
   BENTO — 4 возможности (асимметричная издательская сетка)
-------------------------------------------------------------- */
function Bento() {
  const ref = useReveal();
  return (
    <section id="features" style={{ paddingBlock: "clamp(80px,12vh,140px)" }} ref={ref}>
      <div className="container">
        <div className="reveal" style={{ maxWidth: 720 }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}><span style={{ width: 22, height: 1, background: "var(--accent)" }} />ВОЗМОЖНОСТИ</div>
          <h2 className="display" style={{ fontSize: "clamp(34px,4.6vw,64px)" }}>Всё для дизайна<br />в одном приложении</h2>
        </div>
        <div className="bento reveal">
          {/* большая — Смета с артикулами */}
          <article className="bento-card b-lg" style={{ gridColumn: "span 2", gridRow: "span 2" }}>
            <Img src={PHOTOS.living} label="Смета по проекту" style={{ position: "absolute", inset: 0 }} />
            <div className="bento-shade" />
            <div className="bento-body">
              <I.layers size={26} style={{ color: "#FCF6EE" }} />
              <h3>Смета с артикулами</h3>
              <p>Готовая спецификация: предметы, количество, цены — сразу на выгрузку клиенту, без ручного Excel.</p>
            </div>
            <span className="bento-badge" style={{ background: "rgba(94,107,91,.92)", borderColor: "rgba(94,107,91,.5)", color: "#FCF6EE" }}>Спецификация</span>
          </article>

          {/* AI-дизайнер */}
          <article className="bento-card">
            <div className="bento-body">
              <I.spark size={24} style={{ color: "var(--accent)" }} />
              <h3>AI-подбор мебели и света</h3>
              <p>YandexGPT 5 и GigaChat подбирают предметы под запрос, бюджет и нормы — сразу позициями сметы.</p>
            </div>
          </article>

          {/* Проверка эргономики */}
          <article className="bento-card">
            <div className="bento-body">
              <I.ruler size={24} style={{ color: "var(--info)" }} />
              <h3>Проверка эргономики</h3>
              <p>Проходы, рабочие зоны, дистанции — движок ловит «летающие диваны» до того, как их увидит клиент.</p>
            </div>
          </article>

          {/* Три бюджета / широкая */}
          <article className="bento-card b-wide" style={{ gridColumn: "span 2" }}>
            <div className="bento-body" style={{ flexDirection: "row", alignItems: "center", gap: 22 }}>
              <div style={{ flex: "none", width: 54, height: 54, borderRadius: 14, background: "var(--surface-2)", display: "grid", placeItems: "center", color: "var(--chart)" }}>
                <I.wallet size={26} />
              </div>
              <div>
                <h3 style={{ marginBottom: 6 }}>Три бюджета в один клик</h3>
                <p>Эконом · база · премиум — пересборка сметы под уровень клиента, без ручного пересчёта.</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------
   ЖУРНАЛ ДИЗАЙНА — лента карточек из mock-API
-------------------------------------------------------------- */
function NewsFeed() {
  const ref = useReveal();
  const [rows, setRows] = useS2(null);
  useE2(() => { AIVibeAPI.news.list({ status: "published" }).then((r) => setRows(r.slice(0, 4))); }, []);
  return (
    <section id="news" style={{ paddingBlock: "clamp(60px,9vh,110px)" }} ref={ref}>
      <div className="container">
        <div className="reveal" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 20, marginBottom: 44 }}>
          <div>
            <div className="eyebrow info" style={{ marginBottom: 18 }}><span style={{ width: 22, height: 1, background: "var(--info)" }} />ЖУРНАЛ</div>
            <h2 className="display" style={{ fontSize: "clamp(32px,4.2vw,58px)" }}>Новости дизайна</h2>
          </div>
          <a className="btn btn-ghost" href="#" onClick={(e) => e.preventDefault()}>Все материалы <I.arrow size={16} /></a>
        </div>
        <div className="news-grid reveal">
          {!rows && Array.from({ length: 4 }).map((_, i) => <div key={i} className="glass skel" style={{ borderRadius: "var(--r-lg)", height: 320 }} />)}
          {rows && rows.map((n, i) => (
            <article key={n.id} className="glass news-card" style={{ borderRadius: "var(--r-lg)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-card)", gridColumn: i === 0 ? "span 2" : "span 1" }}>
              <div style={{ position: "relative", aspectRatio: i === 0 ? "16/8" : "16/10", overflow: "hidden" }}>
                <Img src={PHOTOS[n.cover] || PHOTOS.warm} label={n.category} />
                <span style={{ position: "absolute", top: 13, left: 13, padding: "5px 11px", borderRadius: 99, fontSize: 11.5, fontWeight: 700, color: "#FCF6EE", background: "rgba(46,42,38,.6)", backdropFilter: "blur(6px)", border: "1px solid rgba(252,246,238,.25)" }}>{n.category}</span>
              </div>
              <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: i === 0 ? 25 : 20, fontWeight: 600, lineHeight: 1.22, letterSpacing: "-0.01em" }}>{n.title}</h3>
                <p style={{ color: "var(--muted)", fontSize: 14.5, lineHeight: 1.55, flex: 1 }}>{n.excerpt}</p>
                <div className="mono" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--faint)", fontSize: 12, marginTop: 4 }}>
                  <span>{new Date(n.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</span>
                  <span>{fmt(n.views)} просмотров</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------
   КАЛЬКУЛЯТОР ПЛОЩАДИ — лид-ген «ценность до регистрации»:
   площадь + сегмент → ориентир бюджета по рыночному бенчмарку ₽/м²
   (web/ffe.js: BENCHMARK из SMETA_BENCHMARK_2026-06) и CTA
   «Собрать смету-черновик» — автогенерация комнат и позиций
   под этот бюджет, черновик открывается в кабинете.
-------------------------------------------------------------- */
function BudgetCalc({ go }) {
  const ref = useReveal();
  const F = window.AIVibeFFE;
  const [area, setArea] = useS2(70);
  const [seg, setSeg] = useS2("mid");
  if (!F) return null;   // модуль не загрузился — секция честно отсутствует
  const res = F.estimateBudget(area, seg);
  const makeDraft = () => {
    const d = F.generateEstimate(area, seg);
    // черновик в модель текущей сметы: услуги-строки vite-ветки → поле «Доставка, ₽»
    const deliveryCost = (d.extras || []).reduce((s, e) => s + (e.kind === "fixed" ? Math.round(e.value) : 0), 0);
    // без id: «Сохранить смету» создаст новый проект (канал Excel-импорта)
    F.setPendingDraft({ name: d.name, area: d.area, budget: d.budget, rooms: d.rooms,
      markupPct: d.markupPct, deliveryCost, summaryShort: d.summaryShort, generated: true });
    go && go("cabinet");
  };
  return (
    <section id="calc" style={{ paddingBlock: "clamp(60px,9vh,110px)" }} ref={ref}>
      <div className="container reveal">
        <div className="eyebrow" style={{ marginBottom: 18 }}><span style={{ width: 22, height: 1, background: "var(--accent)" }} />КАЛЬКУЛЯТОР ПЛОЩАДИ</div>
        <h2 className="display" style={{ fontSize: "clamp(30px,4vw,50px)", maxWidth: 720 }}>Бюджет комплектации за 20 секунд</h2>
        <p style={{ color: "var(--muted)", maxWidth: 560, fontSize: 15.5, marginTop: 16, lineHeight: 1.6 }}>
          Площадь и сегмент — и сразу ориентир бюджета с раскладкой по категориям. Цифры — рыночный бенчмарк ₽/м², не оферта.
        </p>
        <div className="glass calc-grid" style={{ borderRadius: "var(--r-xl)", padding: "clamp(24px,4vw,44px)", marginTop: 34, boxShadow: "var(--shadow-card)" }}>
          <div>
            <div className="calc-ctrl">
              <div className="lab"><span>Площадь квартиры</span><b className="mono" style={{ color: "var(--text)", fontSize: 16, whiteSpace: "nowrap" }}>{area} м²</b></div>
              <input type="range" className="quiz-range" min="15" max="300" step="1" value={area}
                onChange={(e) => setArea(+e.target.value)}
                aria-label="Площадь квартиры, м²" aria-valuetext={area + " квадратных метров — ориентир " + fmtMoney(res.total)} />
              <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--spec-meta)", marginTop: 6 }}><span>15 м²</span><span>300 м²</span></div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14.5, margin: "18px 0 10px" }}>Сегмент</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {F.BENCHMARK.segments.map((s) => {
                const on = s.id === seg;
                return (
                  <button key={s.id} onClick={() => setSeg(s.id)} aria-pressed={on}
                    style={{ textAlign: "left", padding: "12px 15px", borderRadius: 12, color: "inherit", font: "inherit", transition: "border-color .2s, background .2s",
                      border: "1px solid " + (on ? "var(--accent)" : "var(--hairline)"), background: on ? "rgba(183,80,44,.07)" : "var(--surface)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <b style={{ fontSize: 14.5 }}>{s.label}</b>
                      {s.recommended && <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--accent-2-ink)", padding: "2px 8px", borderRadius: 99, background: "rgba(94,107,91,.12)", border: "1px solid rgba(94,107,91,.3)" }}>частый выбор</span>}
                      <span className="mono" style={{ marginLeft: "auto", fontWeight: 600, fontSize: 13 }}>{fmtMoney(s.rate)}/м²</span>
                    </span>
                    <span style={{ display: "block", fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>{s.note}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="mono" style={{ fontSize: 11.5, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--accent-2-ink)", fontWeight: 700 }}>Ориентир бюджета</div>
            <div className="mono" style={{ fontSize: "clamp(30px,3.6vw,42px)", fontWeight: 600, lineHeight: 1.1, margin: "8px 0 4px" }} aria-live="polite" aria-atomic="true">{fmtMoney(res.total)}</div>
            <div style={{ color: "var(--muted)", fontSize: 13.5 }}>≈ {fmtMoney(res.rate)}/м² · {res.seg.label} · {area} м²</div>
            <div style={{ height: 1, background: "var(--hairline-2)", margin: "18px 0" }} />
            <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--spec-meta)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12 }}>Раскладка по категориям</div>
            <BarList data={res.byCat.map((c) => ({ label: c.label, value: c.amount }))} money color="var(--accent-2)" />
            <button className="btn btn-primary" style={{ marginTop: 20, padding: "12px 20px" }} onClick={makeDraft}>
              Собрать смету-черновик <I.arrow size={16} />
            </button>
            <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 12, lineHeight: 1.55, maxWidth: 420 }}>
              Создадим черновик: комнаты и позиции под этот бюджет, цены — ориентир из бенчмарка. В кабинете замените их реальными — по ссылке на товар, из каталога или прошлых проектов.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

window.SpecCategories = SpecCategories;   // используется сборкой лендинга (site-github.jsx)
window.HowItWorks = HowItWorks;
window.BudgetCalc = BudgetCalc;
window.Bento = Bento;
window.NewsFeed = NewsFeed;
window.SocialProof = SocialProof;
window.Pricing = Pricing;
window.WhoFor = WhoFor;
window.PayoffCalc = PayoffCalc;
