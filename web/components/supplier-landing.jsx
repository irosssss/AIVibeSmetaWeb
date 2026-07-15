/* ============================================================
   Design Ledger — СТРАНИЦА «ПОСТАВЩИКАМ» (#for-suppliers, PRD портала поставщиков §4)
   ------------------------------------------------------------
   Публичная страница-питч + заявка на подключение. Модель Programa
   Trade Portal for Brands: не self-serve регистрация, а «Apply to join» —
   заявка → модерация владельцем → онбординг каталога руками (V0 PRD).
   Заявка уходит ЧЕСТНО: письмом владельцу через mailto (реальный эффект,
   без имитации «аккаунт создан»); онлайн-кабинет поставщика — после
   бэкенда. → API: POST /api/suppliers/apply
   Паттерн страницы — LegalPage (PortalWrap + инлайн-шапка + Footer).
   ============================================================ */
const { useState: useSL } = React;

/* → API: адрес приёма заявок; после бэкенда заменяется серверным приёмом */
const SUPPLIER_APPLY_EMAIL = "AiVibepro@yandex.com";

const SL_STEPS = [
  { n: "01", t: "Заявка", d: "Расскажите о компании: что производите или продаёте, город, сайт. Форма ниже — две минуты." },
  { n: "02", t: "Модерация и каталог", d: "Мы связываемся, проверяем данные и помогаем загрузить каталог: артикулы, цвета и варианты, габариты, цены — из вашего прайса или фида (YML/1С/Excel)." },
  { n: "03", t: "Спецификации и лиды", d: "Дизайнеры находят ваши товары в библиотеке и ставят их в сметы клиентам. Вы получаете заказы поставщику (PO) и запросы напрямую." },
];

const SL_VALUE = [
  { icon: "layers", t: "Товары в сметах, а не в витрине", d: "Смета — документ, по которому клиент платит. Попадание в неё ценнее показа в каталоге: ваш товар специфицирован в реальный проект." },
  { icon: "chart", t: "Кабинет со статистикой спроса", d: "Какие ваши товары дизайнеры добавляют в сметы чаще, что согласуют клиенты, что уходит в заказ — воронка по каждому артикулу." },
  { icon: "truck", t: "Заказы и запросы без посредника", d: "PO-документы и запросы дизайнеров приходят вам напрямую. Мы не маркетплейс: сделка и деньги — между вами и дизайнером." },
];

function ForSuppliersPage({ go, user }) {
  React.useEffect(() => { window.scrollTo({ top: 0 }); }, []);
  const [d, setD] = useSL({ company: "", city: "", cats: "", url: "", contact: "", email: "", phone: "", note: "" });
  const [err, setErr] = useSL("");
  const set = (patch) => { setD((x) => ({ ...x, ...patch })); if (err) setErr(""); };

  // заявка = структурированное письмо владельцу; mailto — единственный канал без
  // бэкенда, который НЕ имитирует успех (письмо реально уходит из почты поставщика)
  const submit = () => {
    if (!d.company.trim()) { setErr("Укажите название компании — без него заявку не разобрать."); return; }
    if (!d.email.trim() && !d.phone.trim()) { setErr("Оставьте email или телефон — иначе нам некуда ответить."); return; }
    const body = [
      "Заявка поставщика с designledger.ru", "",
      "Компания: " + d.company.trim(),
      d.city.trim() && "Город: " + d.city.trim(),
      d.cats.trim() && "Что производим/продаём: " + d.cats.trim(),
      d.url.trim() && "Сайт/каталог: " + d.url.trim(),
      d.contact.trim() && "Контактное лицо: " + d.contact.trim(),
      d.email.trim() && "Email: " + d.email.trim(),
      d.phone.trim() && "Телефон: " + d.phone.trim(),
      d.note.trim() && "Комментарий: " + d.note.trim(),
    ].filter(Boolean).join("\n");
    location.href = "mailto:" + SUPPLIER_APPLY_EMAIL +
      "?subject=" + encodeURIComponent("Заявка поставщика — " + d.company.trim()) +
      "&body=" + encodeURIComponent(body);
  };

  const fld = (label, key, placeholder, type) => (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: "var(--fs-13)", color: "var(--muted)", marginBottom: 6, fontWeight: 600 }}>{label}</span>
      <input className="fld" type={type || "text"} value={d[key]} placeholder={placeholder} onChange={(e) => set({ [key]: e.target.value })} />
    </label>
  );

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

        <div className="eyebrow" style={{ marginBottom: 16 }}>Поставщикам</div>
        <h1 className="display" style={{ fontSize: "clamp(30px,4.4vw,48px)", lineHeight: 1.08, maxWidth: 640 }}>
          Ваши товары — в сметах дизайнеров интерьера
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: 620, marginTop: 18, fontSize: "var(--fs-16)", lineHeight: 1.65 }}>
          Design Ledger — рабочее место дизайнера-комплектатора: здесь собирают сметы FF&E, которые
          согласует и оплачивает клиент. Подключите каталог — с артикулами, вариантами цвета и
          габаритами — и ваши товары будут попадать в эти сметы напрямую.
        </p>

        {/* как подключиться: заявка → модерация → спецификации (модель Programa «Apply to join») */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 40 }}>
          {SL_STEPS.map((s) => (
            <div key={s.n} className="glass" style={{ borderRadius: "var(--r-lg)", padding: 20 }}>
              <div className="mono" style={{ fontSize: "var(--fs-12)", color: "var(--accent)", fontWeight: 700 }}>{s.n}</div>
              <div style={{ fontWeight: 800, fontFamily: "var(--font-display)", fontSize: "var(--fs-16)", marginTop: 8 }}>{s.t}</div>
              <p style={{ fontSize: "var(--fs-13)", color: "var(--muted)", lineHeight: 1.6, marginTop: 8 }}>{s.d}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 14 }}>
          {SL_VALUE.map((v) => (
            <div key={v.t} className="glass" style={{ borderRadius: "var(--r-lg)", padding: 20 }}>
              {I[v.icon] && React.createElement(I[v.icon], { size: 20, style: { color: "var(--accent-2)" } })}
              <div style={{ fontWeight: 800, fontFamily: "var(--font-display)", fontSize: "var(--fs-16)", marginTop: 10 }}>{v.t}</div>
              <p style={{ fontSize: "var(--fs-13)", color: "var(--muted)", lineHeight: 1.6, marginTop: 8 }}>{v.d}</p>
            </div>
          ))}
        </div>

        {/* заявка */}
        <div className="glass" style={{ borderRadius: "var(--r-xl)", padding: "clamp(24px,4vw,36px)", marginTop: 40, maxWidth: 640 }}>
          <h2 className="display" style={{ fontSize: "var(--fs-24)" }}>Заявка на подключение</h2>
          <p style={{ fontSize: "var(--fs-13)", color: "var(--muted)", lineHeight: 1.6, marginTop: 8 }}>
            Подключение сейчас — ручное и бесплатное: мы отбираем первых поставщиков и помогаем
            с каталогом сами. Кнопка откроет письмо с заявкой в вашей почте — так она точно дойдёт
            до основателя, а не в пустоту формы.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
            {fld("Компания *", "company", "Фабрика, салон или магазин")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {fld("Город", "city", "Москва")}
              {fld("Что производите / продаёте", "cats", "мягкая мебель, свет…")}
            </div>
            {fld("Сайт или каталог", "url", "https://…", "url")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {fld("Контактное лицо", "contact", "Имя")}
              {fld("Email *", "email", "sales@…", "email")}
              {fld("Телефон", "phone", "+7 …", "tel")}
            </div>
            {fld("Комментарий", "note", "сколько SKU, есть ли фид/прайс…")}
            {err && <span className="fld-err" role="alert"><I.info size={14} />{err}</span>}
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <button className="btn btn-primary" style={{ padding: "12px 22px" }} onClick={submit}><I.arrow size={16} />Отправить заявку письмом</button>
              <span className="mono" style={{ fontSize: "var(--fs-12)", color: "var(--spec-meta)" }}>ответ — от автора продукта, обычно в тот же день</span>
            </div>
          </div>
        </div>
      </PortalWrap>
      <Footer go={go} />
    </React.Fragment>
  );
}

window.ForSuppliersPage = ForSuppliersPage;
