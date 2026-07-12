/* ============================================================
   Design Ledger — секции промо-сайта (часть 2)
   How-it-works (статичная сетка шагов) · Bento · Новости ·
   GitHub · Footer
   ============================================================ */
const { useState: useS2, useEffect: useE2 } = React;

// единая точка канона наценки (web/ffe.js) — не дублировать литерал 25 по файлам
const S2_DEFAULT_MARKUP = (window.LedgerFFE && window.LedgerFFE.DEFAULT_MARKUP_PCT) || 25;

/* --------------------------------------------------------------
   HOW IT WORKS — статичная сетка 7 шагов (реш. владельца 12.07:
   sticky-скролл-сторителлинг убран — «прибитая» сцена на 6.5 экранов
   глючила и по сути ничего не показывала; весь путь читается сразу)
-------------------------------------------------------------- */
/* нумерованный путь 01–07 (рецепт Programa: Client Dashboard/Procurement/Library
   на страницах фич — mono-номер + глагол + сцена); лендинг-версия «пути сметы»,
   волна F1 бенчмарка (PROGRAMA_BENCHMARK_2026-07-08.md §3): нарратив доведён до
   конца петли комплектатора «Сбор → Согласование → Закупка → Сдача» (шаги 06–07
   отражают уже сделанные волны C и «Стол комплектатора», не забегают вперёд) */
const STEPS = [
  { n: "01", icon: I.ruler,  lot: "stepMeasure", tag: "Источник",              title: "Вставьте ссылку на товар или фото комнаты", text: "Клиппер затянет товар с сайта фабрики — с ценой и артикулом, или начните с фото комнаты. Без обмеров и 3D-программ." },
  { n: "02", icon: I.spark,  lot: "stepAI",      tag: "Позиция в смете",       title: "Design Ledger добавляет позицию в смету", text: "Каждая ссылка или фото — сразу строка спецификации: артикул, фото, цена фабрики. Эргономика проверяется рядом, без отдельного шага." },
  { n: "03", icon: I.layers, lot: "stepSpec",    tag: "Наценка · две цены",    title: "Наценка — и в документе уже две цены", text: "Регулятор наценки пересчитывает цену клиенту и вашу прибыль на лету. Себестоимость видите только вы." },
  { n: "04", icon: I.send,   lot: null,          tag: "PDF клиенту",           title: "Смета уходит клиенту — без себестоимости", text: "Клиентская выгрузка PDF или Excel показывает только его цену. Рабочая версия с наценкой остаётся у вас." },
  { n: "05", icon: I.chat,   lot: null,          tag: "Согласование",          title: "Клиент согласовывает прямо в смете", text: "Комментарии по позициям и статус согласования — в общей ссылке, без созвонов и вотсапа." },
  { n: "06", icon: I.truck,  lot: null,          tag: "Закупка · сроки",       title: "Закупка идёт по датам — ничего не теряется", text: "Стадии заказ → отгрузка → доставка → монтаж, платежи клиенту и поставщику по датам, трек-номера отправлений — видно на одном столе комплектатора." },
  { n: "07", icon: I.download, lot: null,        tag: "Сдача проекта",         title: "Сдаёте проект — клиент получает документы", text: "Протокол согласования, спецификация, закупочный лист — единым пакетом. Проект уходит в архив, история остаётся в кабинете." },
];
/* глиф шага: Lottie line-art на бумажном квадрате (играет по видимости),
   для шагов без анимации — статичная иконка тем же кеглем */
function StepGlyph({ step }) {
  return (
    <div style={{ flex: "none", width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--surface)", border: "1px solid rgba(94,107,91,.4)", boxShadow: "var(--shadow-card)" }}>
      {step.lot
        ? <Lottie name={step.lot} ariaLabel="" fallback={<step.icon size={22} style={{ color: "var(--accent-2)" }} />} style={{ width: 34, height: 34 }} />
        : <step.icon size={22} style={{ color: "var(--accent-2)" }} />}
    </div>
  );
}

function HowItWorks({ go }) {
  const ref = useReveal();
  return (
    <section id="how" style={{ paddingBlock: "clamp(70px,10vh,120px)" }} ref={ref}>
      <div className="container reveal">
        <div className="catsec-head">
          <div>
            <div className="eyebrow jade">КАК ЭТО РАБОТАЕТ</div>
            <h2 className="display" style={{ fontSize: "clamp(30px,4vw,50px)", marginTop: 14 }}>От пустой комнаты<br />до сданного проекта</h2>
          </div>
          <p style={{ color: "var(--muted)", maxWidth: 340, fontSize: "var(--fs-14)" }}>Смета — собрана. Наценка — скрыта. Клиент — согласовал. Закупка — под контролем.</p>
        </div>
        <div className="how-static">
          {STEPS.map((s) => (
            <div key={s.n} className="glass" style={{ borderRadius: "var(--r-lg)", padding: "20px 22px", display: "flex", gap: 16, alignItems: "flex-start" }}>
              <StepGlyph step={s} />
              <div>
                <div className="mono" style={{ fontSize: "var(--fs-12)", fontWeight: 500, letterSpacing: ".06em", color: "var(--accent-2)", marginBottom: 6 }}>{s.n} · {s.tag}</div>
                <div style={{ fontWeight: 700, fontSize: "var(--fs-16)", lineHeight: 1.35 }}>{s.title}</div>
                <p style={{ fontSize: "var(--fs-14)", color: "var(--muted)", lineHeight: 1.55, marginTop: 6 }}>{s.text}</p>
              </div>
            </div>
          ))}
          {/* 8-я ячейка добивает сетку 2×4 и закрывает путь конверсией */}
          <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: "20px 22px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 14, borderColor: "rgba(183,80,44,.4)", background: "rgba(183,80,44,.05)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--fs-21)", lineHeight: 1.3 }}>Весь путь — в одном кабинете, без вечера в Excel</div>
            <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={() => go && go("auth")}>Собрать первую смету — бесплатно</button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------
   КОМПЛЕКТАЦИЯ ПО КАТЕГОРИЯМ — витрина вывода: карточки с рендером,
   себестоимостью и ценой клиенту (две цены на каждую категорию).
-------------------------------------------------------------- */
// лид-магнит (роадмап п.12): пустой шаблон в НАШЕМ реальном формате — теми же
// листами/заголовками, что и боевой экспорт LedgerXLSX.exportRoomSpec, поэтому
// designer может тут же скачать обратно через «Импорт из Excel» без переделок.
function downloadSpecTemplate() {
  const markupPct = S2_DEFAULT_MARKUP;
  const rooms = [
    { name: "Гостиная", items: [
      { title: "Диван 3-местный, велюр", cat: "Мебель", price: 120000, qty: 1 },
      { title: "Журнальный столик", cat: "Мебель", price: 18000, qty: 1 },
      { title: "Люстра подвесная", cat: "Свет", price: 25000, qty: 1 },
    ] },
    { name: "Спальня", items: [
      { title: "Кровать с изголовьем 160×200", cat: "Мебель", price: 65000, qty: 1 },
      { title: "Прикроватная тумба", cat: "Мебель", price: 12000, qty: 2 },
    ] },
  ];
  // клиентская сторона — через тот же canonical-расчёт, что портал/деталь проекта (LedgerFFE.clientPricing);
  // себестоимость он не считает (не его забота), поэтому подытог — по факту той же формулой lineCost
  const grand = rooms.reduce((s, r) => s + r.items.reduce((a, it) => a + it.price * it.qty, 0), 0);
  const clientTotal = window.LedgerFFE.clientPricing({ rooms, markup: markupPct }).client;
  withLib("xlsx", () => LedgerXLSX.exportRoomSpec({ project: "Шаблон сметы", area: "", rooms, grand, markupPct, catMarkupPct: {}, clientTotal, discountPct: 0, deliveryCost: 0, installCost: 0, budget: 300000, mode: "work" }));
}

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
            <div className="eyebrow">спецификация · 38 позиций</div>
            <h2 className="display" style={{ fontSize: "clamp(30px,4vw,50px)", marginTop: 14 }}>Комплектация по категориям</h2>
          </div>
          <p style={{ color: "var(--muted)", maxWidth: 340, fontSize: "var(--fs-14)" }}>Мебель, свет, декор и текстиль — с артикулами, себестоимостью и ценой клиенту. Меняете позицию — итог и наценка пересчитываются.</p>
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
        <button type="button" className="btn btn-ghost" onClick={downloadSpecTemplate} style={{ marginTop: 24 }}>
          <I.download size={15} />Скачать пустой шаблон Excel
        </button>
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
            <div className="eyebrow">ДЛЯ КОГО</div>
            <h2 className="display" style={{ fontSize: "clamp(30px,4vw,50px)", marginTop: 14 }}>Смета комплектации —<br />не смета ремонта</h2>
          </div>
          <p style={{ color: "var(--muted)", maxWidth: 340, fontSize: "var(--fs-14)" }}>Design Ledger считает то, что дизайнер ставит в интерьер. И честно говорит, для кого он не подходит.</p>
        </div>
        <div className="who-grid">
          <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: "26px 28px", borderColor: "rgba(94,107,91,.45)", background: "rgba(94,107,91,.07)", boxShadow: "var(--shadow-card)" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--fs-21)", margin: "0 0 18px" }}>Мы — для дизайнеров и комплектаторов</h3>
            {/* role=list: listStyle:none снимает роль списка в Safari/VoiceOver */}
            <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {YES.map((t) => (
                <li key={t} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: "var(--fs-14)", color: "var(--text)", lineHeight: 1.5 }}>
                  <I.check size={16} style={{ color: "var(--accent-2-ink)", flex: "none", marginTop: 2 }} />{t}
                </li>
              ))}
            </ul>
          </div>
          <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: "26px 28px", display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--fs-21)", margin: "0 0 18px", color: "var(--muted)" }}>Мы — не про ремонт</h3>
            <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {NO.map((t) => (
                <li key={t} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: "var(--fs-14)", color: "var(--muted)", lineHeight: 1.5 }}>
                  <I.close size={16} style={{ color: "var(--spec-meta)", flex: "none", marginTop: 2 }} />{t}
                </li>
              ))}
            </ul>
            <p className="mono" style={{ marginTop: "auto", paddingTop: 18, fontSize: "var(--fs-12)", color: "var(--spec-meta)", lineHeight: 1.6 }}>
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
  const [markup, setMarkup] = useS2(S2_DEFAULT_MARKUP);
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
        <div className="eyebrow jade" style={{ marginBottom: 18 }}>ОКУПАЕМОСТЬ</div>
        <h2 className="display" style={{ fontSize: "clamp(30px,4vw,50px)", maxWidth: 720 }}>Подписка окупается одним проектом</h2>
        <p style={{ color: "var(--muted)", maxWidth: 520, fontSize: "var(--fs-15)", marginTop: 16 }}>
          Design Ledger — не расход на софт, а инструмент, которым вы зарабатываете наценку. Посчитайте на своём проекте.
        </p>
        <div className="glass calc-grid" style={{ borderRadius: "var(--r-xl)", padding: "clamp(24px,4vw,44px)", marginTop: 34, boxShadow: "var(--shadow-card)" }}>
          <div>
            <div className="calc-ctrl">
              <div className="lab"><span>Бюджет комплектации проекта</span><b className="mono" style={{ color: "var(--text)", fontSize: "var(--fs-16)", whiteSpace: "nowrap" }}>{f(budget)}{" "}₽</b></div>
              <input type="range" className="quiz-range" min="300000" max="10000000" step="100000" value={budget}
                onChange={(e) => setBudget(+e.target.value)}
                aria-label="Бюджет комплектации проекта" aria-valuetext={f(budget) + " рублей"} />
            </div>
            <div className="calc-ctrl">
              <div className="lab"><span>Ваша наценка</span><b className="mono" style={{ color: "var(--text)", fontSize: "var(--fs-16)", whiteSpace: "nowrap" }}>+{markup}%</b></div>
              <input type="range" className="quiz-range" min="10" max="40" step="1" value={markup}
                onChange={(e) => setMarkup(+e.target.value)}
                aria-label="Ваша наценка" aria-valuetext={"плюс " + markup + " " + plural(markup, ["процент", "процента", "процентов"])} />
            </div>
            <p className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--spec-meta)", marginTop: 14, lineHeight: 1.6 }}>
              по умолчанию — реальный проект: комплектация 2,7 млн ₽, 50 позиций
            </p>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14, paddingBlock: 12, borderBottom: "1px solid var(--hairline-2)" }}>
              <span style={{ fontSize: "var(--fs-14)", color: "var(--muted)" }}>Наценка с одного проекта</span>
              <b className="mono" style={{ fontSize: "clamp(22px,2.6vw,30px)", fontWeight: 600, color: "var(--accent-2-ink)", whiteSpace: "nowrap" }}>+{f(profit)} ₽</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14, paddingBlock: 12, borderBottom: "1px solid var(--hairline-2)" }}>
              <span style={{ fontSize: "var(--fs-14)", color: "var(--muted)" }}>Подписка «Практика»</span>
              <b className="mono" style={{ fontSize: "var(--fs-16)", fontWeight: 500, whiteSpace: "nowrap" }}>{f(SUB)} ₽ / мес</b>
            </div>
            {/* live-регион только на итоге и atomic — иначе скринридер читает
               бессвязные куски изменившихся узлов на каждый шаг слайдера */}
            <div style={{ paddingTop: 18 }} aria-live="polite" aria-atomic="true">
              <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(20px,2.4vw,26px)", fontWeight: 700, lineHeight: 1.3 }}>
                = <span style={{ color: "var(--accent-ink)" }}>{shareTxt}%</span> от наценки одного проекта
              </div>
              <p style={{ fontSize: "var(--fs-13)", color: "var(--muted)", marginTop: 8, lineHeight: 1.55 }}>Наценка одного такого проекта покрывает {coverTxt} подписки.</p>
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
        <div className="eyebrow jade" style={{ marginBottom: 18 }}>ДИЗАЙНЕРЫ О СМЕТЕ</div>
        <h2 className="display" style={{ fontSize: "clamp(30px,4vw,50px)", maxWidth: 700 }}>Считают в Design Ledger — отправляют клиенту</h2>

        {/* честная метка (реш. владельца 09.07): продукт — прототип, соц-доказательства
           показаны как пример, а не как факт. Ставим до метрик и голосов, чтобы ничто
           из блока не читалось как реальные данные. */}
        <p className="mono" style={{ fontSize: "var(--fs-12)", color: "var(--spec-meta)", letterSpacing: ".04em", lineHeight: 1.55, marginTop: 14, maxWidth: 640 }}>
          Демонстрация интерфейса: цифры и отзывы приведены как пример, а не как реальные данные.
        </p>

        {/* моно-метрики */}
        <div className="sp-metrics">
          {METRICS.map(([v, k]) => (
            <div key={k}>
              <div className="mono" style={{ fontSize: "clamp(26px,3vw,38px)", fontWeight: 600, color: "var(--text)", lineHeight: 1 }}><CountUpOnView value={v} /></div>
              <div style={{ fontSize: "var(--fs-13)", color: "var(--muted)", marginTop: 8 }}>{k}</div>
            </div>
          ))}
        </div>

        {/* голоса */}
        <div className="sp-grid">
          {QUOTES.map(([q, name, role]) => (
            <figure key={name} className="glass" style={{ borderRadius: "var(--r-lg)", padding: "24px 26px", margin: 0, display: "flex", flexDirection: "column", gap: 18 }}>
              <blockquote style={{ margin: 0, fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--fs-16)", lineHeight: 1.5, color: "var(--text)" }}>«{q}»</blockquote>
              <figcaption style={{ marginTop: "auto", display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: "var(--fs-14)" }}>{name}</span>
                <span className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--spec-meta)" }}>{role}</span>
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
const PRICING_FAQ = [
  ["Нужна ли карта для первой сметы?", "Нет. Первая смета — бесплатно и без привязки карты. Тариф подключаете, когда решите продолжить."],
  ["Что считается «активным проектом»?", "Любой проект не в архиве. Сданный клиенту проект переносите в архив — он освобождает место в лимите тарифа."],
  ["Можно сменить тариф в любой момент?", "Да, без долгосрочных обязательств — переключаетесь в любой момент."],
  ["Что будет с проектами при понижении тарифа?", "Ничего не удаляется. Если активных проектов больше нового лимита — заранее заархивируйте лишние."],
  ["Тарифы отличаются функциями сметы?", "Нет — две цены, наценка и проверка эргономики одинаковы везде. Отличие — в лимите проектов, форматах выгрузки и команде."],
];

/* FAQ-аккордеон под тарифами (Programa: «Pricing: одна карточка + FAQ» —
   снимает возражения до формы регистрации). Раскрытие — grid-rows 0fr→1fr,
   тот же приём, что чинит .nav-sheet (styles.css). */
function PricingFaq() {
  const [open, setOpen] = useS2(null);
  return (
    <div style={{ maxWidth: 720, marginTop: "clamp(48px,7vh,84px)" }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>ВОПРОСЫ О ЦЕНЕ</div>
      <div>
        {PRICING_FAQ.map(([q, a], i) => {
          const isOpen = open === i;
          return (
            <div key={q} className="faq-item">
              <button type="button" className="faq-q" aria-expanded={isOpen} aria-controls={`faq-a-${i}`} onClick={() => setOpen(isOpen ? null : i)}>
                {q}
                <I.arrow size={16} style={{ flex: "none", color: "var(--muted)", transition: "transform var(--dur-base) var(--ease)", transform: isOpen ? "rotate(-90deg)" : "rotate(90deg)" }} />
              </button>
              <div className="faq-a" id={`faq-a-${i}`} data-open={isOpen ? "1" : "0"}><div><p>{a}</p></div></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
            <div className="eyebrow">ТАРИФЫ</div>
            <h2 className="display" style={{ fontSize: "clamp(30px,4vw,50px)", marginTop: 14 }}>Честные цены, без звёздочек</h2>
          </div>
          <p style={{ color: "var(--muted)", maxWidth: 340, fontSize: "var(--fs-14)" }}>Первая смета — бесплатно и без карты. Считаем по активным проектам: сданные уходят в архив и лимита не занимают.</p>
        </div>
        <div className="price-grid">
          {PLANS.map((p) => (
            <article key={p.name} className="glass" style={{ borderRadius: "var(--r-lg)", padding: "26px 26px 24px", display: "flex", flexDirection: "column", gap: 18, position: "relative",
              borderColor: p.hot ? "var(--accent)" : "var(--hairline)", boxShadow: p.hot ? "var(--shadow-pop)" : "none" }}>
              {p.hot && <span style={{ position: "absolute", top: -12, left: 24, padding: "4px 12px", borderRadius: 99, fontSize: "var(--fs-11)", fontWeight: 700, background: "var(--accent)", color: "var(--on-accent)" }}>{p.note}</span>}
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--fs-21)" }}>{p.name}</div>
                {!p.hot && <div style={{ fontSize: "var(--fs-12)", color: "var(--spec-meta)", marginTop: 2 }}>{p.note}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                <span className="mono" style={{ fontSize: "var(--fs-32)", fontWeight: 600, lineHeight: 1 }}>{new Intl.NumberFormat("ru-RU").format(p.price)} ₽</span>
                <span className="mono" style={{ fontSize: "var(--fs-12)", color: "var(--spec-meta)" }}>/ мес</span>
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                {p.feats.map((f) => (
                  <li key={f} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: "var(--fs-14)", color: "var(--muted)", lineHeight: 1.45 }}>
                    <I.check size={15} style={{ color: "var(--accent-2)", flex: "none", marginTop: 2 }} />{f}
                  </li>
                ))}
              </ul>
              <button className={"btn btn-block " + (p.hot ? "btn-primary" : "btn-ghost")} onClick={() => go("auth")}>Начать бесплатно</button>
            </article>
          ))}
        </div>
        <PricingFaq />
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
          <div className="eyebrow" style={{ marginBottom: 18 }}>ВОЗМОЖНОСТИ</div>
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
   КЛИЕНТСКИЙ ПОРТАЛ — жемчужина волны A бенчмарка Programa
   (согласование по позициям, статусы, протокол PDF), на лендинге
   раньше не была показана нигде — продавали вчерашний продукт.
-------------------------------------------------------------- */
function ClientPortalPromo() {
  const ref = useReveal();
  const FEATS = [
    "Комментарии на каждой позиции — не в чате и не по телефону",
    "Статус согласования по строке: Согласовано / Обсуждается / На рассмотрении",
    "Протокол согласования — один PDF со всеми решениями клиента",
    "Ссылка без пароля и установки — открывается в браузере с телефона",
  ];
  return (
    <section id="clientportal" style={{ paddingBlock: "clamp(60px,9vh,110px)" }} ref={ref}>
      <div className="container reveal calc-grid">
        <div>
          <div className="eyebrow info" style={{ marginBottom: 18 }}>КЛИЕНТСКИЙ ПОРТАЛ</div>
          <h2 className="display" style={{ fontSize: "clamp(30px,4vw,50px)" }}>Клиент видит смету — без вашего Excel и созвонов</h2>
          <p style={{ color: "var(--text)", fontWeight: 600, marginTop: 14, fontSize: "var(--fs-16)" }}>Меньше сообщений в вотсапе. Больше ясности клиенту.</p>
          <p style={{ color: "var(--muted)", maxWidth: 460, fontSize: "var(--fs-14)", marginTop: 10, lineHeight: 1.6 }}>
            Отправьте ссылку на портал вместо PDF в переписке. Клиент видит только свою цену, комментирует прямо на позиции и подтверждает выбор — а вы получаете протокол согласования одним PDF.
          </p>
          <ul role="list" style={{ listStyle: "none", margin: "22px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {FEATS.map((t) => (
              <li key={t} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: "var(--fs-14)", color: "var(--text)", lineHeight: 1.5 }}>
                <I.check size={16} style={{ color: "var(--accent-2-ink)", flex: "none", marginTop: 2 }} />{t}
              </li>
            ))}
          </ul>
        </div>
        <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: 22, display: "flex", flexDirection: "column", gap: 14, boxShadow: "var(--shadow-card)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "var(--fs-14)" }}>Кресло лаунж, дуб/букле</span>
            <span className="mono" style={{ fontSize: "var(--fs-11)", fontWeight: 600, padding: "4px 10px", borderRadius: 99, background: "rgba(94,107,91,.14)", color: "var(--accent-2-ink)" }}>Согласовано</span>
          </div>
          <div className="glass" style={{ alignSelf: "flex-start", maxWidth: "88%", padding: "11px 14px", borderRadius: "14px 14px 14px 4px", fontSize: "var(--fs-13)", background: "rgba(183,80,44,.08)", borderColor: "rgba(183,80,44,.3)" }}>
            Можно светлее обивку? Остальное нравится.
          </div>
          <div className="glass" style={{ alignSelf: "flex-end", maxWidth: "88%", padding: "11px 14px", borderRadius: "14px 14px 4px 14px", fontSize: "var(--fs-13)" }}>
            Заменю на бежевый букле, пришлю фото сегодня
          </div>
          <span className="mono" style={{ marginTop: 4, alignSelf: "flex-start", padding: "8px 14px", fontSize: "var(--fs-12)", color: "var(--muted)", border: "1px solid var(--hairline)", borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 7 }}>
            <I.layers size={14} /> протокол согласования — один PDF
          </span>
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
  useE2(() => { LedgerAPI.news.list({ status: "published" }).then((r) => setRows(r.slice(0, 4))); }, []);
  return (
    <section id="news" style={{ paddingBlock: "clamp(60px,9vh,110px)" }} ref={ref}>
      <div className="container">
        <div className="reveal" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 20, marginBottom: 44 }}>
          <div>
            <div className="eyebrow info" style={{ marginBottom: 18 }}>ЖУРНАЛ</div>
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
                <span style={{ position: "absolute", top: 13, left: 13, padding: "5px 11px", borderRadius: 99, fontSize: "var(--fs-11)", fontWeight: 700, color: "#FCF6EE", background: "rgba(46,42,38,.6)", backdropFilter: "blur(6px)", border: "1px solid rgba(252,246,238,.25)" }}>{n.category}</span>
              </div>
              <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: i === 0 ? 25 : 20, fontWeight: 600, lineHeight: 1.22, letterSpacing: "-0.01em" }}>{n.title}</h3>
                <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", lineHeight: 1.55, flex: 1 }}>{n.excerpt}</p>
                <div className="mono" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--spec-meta)", fontSize: "var(--fs-12)", marginTop: 4 }}>
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
  const F = window.LedgerFFE;
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
        <div className="eyebrow" style={{ marginBottom: 18 }}>КАЛЬКУЛЯТОР ПЛОЩАДИ</div>
        <h2 className="display" style={{ fontSize: "clamp(30px,4vw,50px)", maxWidth: 720 }}>Бюджет комплектации за 20 секунд</h2>
        <p style={{ color: "var(--muted)", maxWidth: 560, fontSize: "var(--fs-15)", marginTop: 16, lineHeight: 1.6 }}>
          Площадь и сегмент — и сразу ориентир бюджета с раскладкой по категориям. Цифры — рыночный бенчмарк ₽/м², не оферта.
        </p>
        <div className="glass calc-grid" style={{ borderRadius: "var(--r-xl)", padding: "clamp(24px,4vw,44px)", marginTop: 34, boxShadow: "var(--shadow-card)" }}>
          <div>
            <div className="calc-ctrl">
              <div className="lab"><span>Площадь квартиры</span><b className="mono" style={{ color: "var(--text)", fontSize: "var(--fs-16)", whiteSpace: "nowrap" }}>{area} м²</b></div>
              <input type="range" className="quiz-range" min="15" max="300" step="1" value={area}
                onChange={(e) => setArea(+e.target.value)}
                aria-label="Площадь квартиры, м²" aria-valuetext={area + " квадратных метров — ориентир " + fmtMoney(res.total)} />
              <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-11)", color: "var(--spec-meta)", marginTop: 6 }}><span>15 м²</span><span>300 м²</span></div>
            </div>
            <div style={{ fontWeight: 700, fontSize: "var(--fs-14)", margin: "18px 0 10px" }}>Сегмент</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {F.BENCHMARK.segments.map((s) => {
                const on = s.id === seg;
                return (
                  <button key={s.id} onClick={() => setSeg(s.id)} aria-pressed={on}
                    style={{ textAlign: "left", padding: "12px 15px", borderRadius: 12, color: "inherit", font: "inherit", transition: "border-color .2s, background .2s",
                      border: "1px solid " + (on ? "var(--accent)" : "var(--hairline)"), background: on ? "rgba(183,80,44,.07)" : "var(--surface)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <b style={{ fontSize: "var(--fs-14)" }}>{s.label}</b>
                      {s.recommended && <span style={{ fontSize: "var(--fs-10)", fontWeight: 700, color: "var(--accent-2-ink)", padding: "2px 8px", borderRadius: 99, background: "rgba(94,107,91,.12)", border: "1px solid rgba(94,107,91,.3)" }}>частый выбор</span>}
                      <span className="mono" style={{ marginLeft: "auto", fontWeight: 600, fontSize: "var(--fs-13)" }}>{fmtMoney(s.rate)}/м²</span>
                    </span>
                    <span style={{ display: "block", fontSize: "var(--fs-12)", color: "var(--muted)", marginTop: 3 }}>{s.note}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="mono" style={{ fontSize: "var(--fs-11)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--accent-2-ink)", fontWeight: 700 }}>Ориентир бюджета</div>
            <div className="mono" style={{ fontSize: "clamp(30px,3.6vw,42px)", fontWeight: 600, lineHeight: 1.1, margin: "8px 0 4px" }} aria-live="polite" aria-atomic="true">{fmtMoney(res.total)}</div>
            <div style={{ color: "var(--muted)", fontSize: "var(--fs-13)" }}>≈ {fmtMoney(res.rate)}/м² · {res.seg.label} · {area} м²</div>
            <div style={{ height: 1, background: "var(--hairline-2)", margin: "18px 0" }} />
            <div className="mono" style={{ fontSize: "var(--fs-11)", fontWeight: 700, color: "var(--spec-meta)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12 }}>Раскладка по категориям</div>
            <BarList data={res.byCat.map((c) => ({ label: c.label, value: c.amount }))} money color="var(--accent-2)" />
            <button className="btn btn-primary" style={{ marginTop: 20, padding: "12px 20px" }} onClick={makeDraft}>
              Собрать смету-черновик <I.arrow size={16} />
            </button>
            <p style={{ fontSize: "var(--fs-12)", color: "var(--muted)", marginTop: 12, lineHeight: 1.55, maxWidth: 420 }}>
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
window.ClientPortalPromo = ClientPortalPromo;
window.NewsFeed = NewsFeed;
window.SocialProof = SocialProof;
window.Pricing = Pricing;
window.WhoFor = WhoFor;
window.PayoffCalc = PayoffCalc;
