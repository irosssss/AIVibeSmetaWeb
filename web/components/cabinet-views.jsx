/* ============================================================
   Design Ledger — Кабинет: Профиль и Сохранённые проекты
   ============================================================ */
const { useState: useCV, useEffect: useCVE, useRef: useCVR } = React;

const STUDIO_FIELDS = ["studioName", "studioCity", "studioPhone", "studioEmail", "studioTaxId"];
function Profile({ user }) {
  const [an, setAn] = useCV(null);
  // брендинг + реквизиты студии (волна A5 + W4.1) — подставляются в портал, протокол
  // согласования и PDF-выгрузки клиенту (шапки «Смета клиенту»/«Закупочный лист»)
  const [studio, setStudio] = useCV({ studioName: "", studioCity: "", studioPhone: "", studioEmail: "", studioTaxId: "" });
  useCVE(() => {
    AIVibeAPI.profile.analytics().then(setAn);
    AIVibeAPI.settings.get().then((s) => { if (s) setStudio(Object.fromEntries(STUDIO_FIELDS.map((k) => [k, s[k] || ""]))); });
  }, []);
  const setStudioField = (k) => (e) => setStudio((s) => ({ ...s, [k]: e.target.value }));
  // дебаунс: табуляция по всем 5 полям блюрит каждое по очереди — без задержки это было бы
  // 5 отдельных PATCH одним и тем же объектом и 5 сложенных тостов «сохранено» подряд
  const saveTimer = useCVR(null);
  const saveStudio = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const trimmed = Object.fromEntries(STUDIO_FIELDS.map((k) => [k, (studio[k] || "").trim()]));
      setStudio(trimmed);
      AIVibeAPI.settings.update(trimmed).then(() => toast("Реквизиты студии сохранены — подставятся в портал, протокол и PDF клиенту.", "info", 3500));
    }, 600);
  };
  return (
    <div className="reveal in" style={{ display: "flex", flexDirection: "column", gap: 22 }} ref={useReveal()}>
      <PageHead title="Профиль" sub="Аккаунт и сводка по вашей работе" style={{ marginBottom: 0 }} />
      {/* ── верх: карточка профиля + KPI ── */}
      <div className="profile-grid" style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 22, alignItems: "start" }}>
        {/* карточка профиля */}
        <div className="glass cab-col" style={{ borderRadius: "var(--r-xl)", padding: 30, height: "fit-content" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14, paddingBottom: 24, borderBottom: "1px solid var(--hairline)" }}>
            <Avatar user={user} size={84} />
            <div>
              <div className="display" style={{ fontSize: "var(--fs-24)" }}>{user.name}</div>
              <div style={{ color: "var(--muted)", fontSize: "var(--fs-14)", marginTop: 4 }}>{user.email}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span className="glass" style={{ padding: "6px 13px", borderRadius: 99, fontSize: "var(--fs-12)", fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: user.provider === "yandex" ? "#FC3F1D" : "#0077FF" }} />
                {user.provider === "yandex" ? "Яндекс ID" : "VK ID"}
              </span>
              {user.role === "admin" && <span style={{ padding: "6px 13px", borderRadius: 99, fontSize: "var(--fs-12)", fontWeight: 700, background: "rgba(183,80,44,.16)", color: "var(--accent-ink)", border: "1px solid rgba(183,80,44,.32)" }}>Администратор</span>}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 22 }}>
            {/* только то, что правда: тарифов пока нет (бета), данные живут в localStorage этого браузера */}
            <Row k="Тариф" v="Бета · бесплатно" />
            <Row k="Хранение данных" v="локально, в этом браузере" />
          </div>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 24 }} onClick={() => toast("Редактирование профиля появится вместе с настоящими аккаунтами — в бете данные приходят из Яндекс/VK ID.", "info", 5000)}>Редактировать профиль</button>
        </div>

        {/* KPI 2×2 с дельтами */}
        <div className="cab-stats" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
          {!an && Array.from({ length: 4 }).map((_, i) => <div key={i} className="glass skel" style={{ borderRadius: "var(--r-lg)", height: 110 }} />)}
          {an && an.kpis.map((k) => <KpiCard key={k.key} k={k} />)}
        </div>
      </div>

      {/* ── аналитика профиля: только то, что честно считается из проектов ──
          (график «AI-сессий» и муляж переписки убраны — таких событий не существует;
          вернутся настоящими после появления версий/статусов) */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, margin: "4px 2px 14px", flexWrap: "wrap" }}>
          <I.chart size={18} style={{ color: "var(--accent)", flex: "none" }} />
          <h2 style={{ fontSize: "var(--fs-18)", fontWeight: 700, whiteSpace: "nowrap" }}>По вашим проектам</h2>
        </div>

        <div className="chart-row" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
          <ChartCard title="Бюджет по проектам" source="из ваших смет" accent="var(--accent-2)">
            {an ? <BarList data={an.spendByProject} color="var(--accent-2)" money /> : <ChartSkel h={120} />}
          </ChartCard>
          <ChartCard title="Стили в проектах" source="доля бюджета">
            {an ? <div style={{ paddingTop: 4 }}><Donut data={an.styleSplit} size={150} /></div> : <ChartSkel h={150} />}
          </ChartCard>
        </div>
      </div>

      {/* ── рабочее место: мосты в Мастерскую вместо тумблеров-пустышек ── */}
      <div className="glass" style={{ borderRadius: "var(--r-xl)", padding: 30 }}>
        <h3 style={{ fontSize: "var(--fs-18)", fontWeight: 700, marginBottom: 6 }}>Рабочее место</h3>
        <p style={{ color: "var(--muted)", fontSize: "var(--fs-13)", lineHeight: 1.5, marginBottom: 18, maxWidth: 640 }}>
          Ваши нормы эргономики, библиотека стилей и товары студии применяются к каждой смете. Уведомления и синхронизация между устройствами появятся вместе с реальными аккаунтами.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-ghost" onClick={() => setRoute("cabinet", "workshop", "products")}><I.layers size={16} />Мои товары</button>
          <button className="btn btn-ghost" onClick={() => setRoute("cabinet", "workshop", "norms")}><I.sliders size={16} />Мои нормы</button>
          <button className="btn btn-ghost" onClick={() => setRoute("cabinet", "workshop", "styles")}><I.spark size={16} />Мои стили</button>
        </div>
      </div>

      {/* ── студия: брендинг + реквизиты (волна A5 + W4.1) — имя студии над платформенной
          подписью «Design Ledger» (её отключение — white-label — появится с платным тарифом
          и настоящим биллингом, см. роадмап п.9); город/телефон/e-mail/ИНН — контакты для
          клиента и реквизиты к счетам (волна D) — подставляются в портал, протокол и PDF */}
      <div className="glass" style={{ borderRadius: "var(--r-xl)", padding: 30 }}>
        <h3 style={{ fontSize: "var(--fs-18)", fontWeight: 700, marginBottom: 6 }}>Студия</h3>
        <p style={{ color: "var(--muted)", fontSize: "var(--fs-13)", lineHeight: 1.5, marginBottom: 20, maxWidth: 640 }}>
          Имя, контакты и реквизиты студии — клиент увидит их на портале согласования и в PDF-выгрузках. Пустое имя — на портале покажем имя вашего аккаунта.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 480 }}>
          {[
            ["studioName", "Название студии", "text", user.name],
            ["studioCity", "Город", "text", "Напр. Москва"],
          ].map(([k, label, type, ph]) => (
            <label key={k} style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: "var(--fs-13)", color: "var(--muted)", marginBottom: 6, fontWeight: 600 }}>{label}</span>
              <input className="fld" type={type} value={studio[k]} onChange={setStudioField(k)}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                onBlur={saveStudio} placeholder={ph} aria-label={label} />
            </label>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: "var(--fs-13)", color: "var(--muted)", marginBottom: 6, fontWeight: 600 }}>Телефон для клиента</span>
              <input className="fld" type="tel" value={studio.studioPhone} onChange={setStudioField("studioPhone")}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} onBlur={saveStudio} placeholder="+7 900 000-00-00" aria-label="Телефон для клиента" />
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: "var(--fs-13)", color: "var(--muted)", marginBottom: 6, fontWeight: 600 }}>E-mail для клиента</span>
              <input className="fld" type="email" value={studio.studioEmail} onChange={setStudioField("studioEmail")}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} onBlur={saveStudio} placeholder={user.email} aria-label="E-mail для клиента" />
            </label>
          </div>
          <label style={{ display: "block" }}>
            <span style={{ display: "block", fontSize: "var(--fs-13)", color: "var(--muted)", marginBottom: 6, fontWeight: 600 }}>ИНН <span style={{ color: "var(--faint)", fontWeight: 400 }}>(пригодится для счетов)</span></span>
            <input className="fld mono" value={studio.studioTaxId} onChange={setStudioField("studioTaxId")}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} onBlur={saveStudio} placeholder="770000000000" aria-label="ИНН" />
          </label>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: "var(--fs-14)" }}><span style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{k}</span><span style={{ fontWeight: 600, whiteSpace: "nowrap", textAlign: "right" }}>{v}</span></div>;
}

/* стиль-квиз → читаемое имя стиля для нового проекта */
const QUIZ_STYLE_NAME = { deco: "Neo Deco", warm: "Тёплый минимализм", japandi: "Japandi", scandi: "Сканди", indust: "Индустриальный", midmod: "Mid-century" };
/* стадии петли комплектатора (статус ПРОЕКТА «собрал → согласовал → закупил →
   сдал») — единый домовой словарь в ffe.js (как STATUS/APPROVE), общий с «Обзором»
   проекта (W2). Здесь только алиасы; ffe.js грузится раньше (main.jsx). */
const PROJ_STATUSES = window.AIVibeFFE.PROJ_STATUSES;
const statusColor = window.AIVibeFFE.PROJ_STATUS_COLOR;
const STAGE_NEXT = window.AIVibeFFE.PROJ_STAGE_NEXT;
const fmtDCV = (d) => { const t = new Date(d + "T00:00:00"); return isNaN(t.getTime()) ? String(d) : t.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }); };

/* «Сегодня в работе» (волна C2, шаг «Стол комплектатора», бенчмарк Programa) —
   сквозной список по ВСЕМ сохранённым проектам: непогашенные даты стадий
   закупки (eta) и платежей (FFE.itemDueItems), разложенные по срочности
   (FFE.urgencyBucket). Чистая функция от полных карточек проектов (с rooms) —
   без побочных эффектов. Ранг — порядок FFE.URGENCY_BUCKETS, не дублируем список id. */
function buildUrgentQueue(projects) {
  const FFE = window.AIVibeFFE;
  if (!FFE) return [];
  const rank = Object.fromEntries(FFE.URGENCY_BUCKETS.map((b, i) => [b.id, i]));
  const rows = [];
  (projects || []).forEach((p) => (p.rooms || []).forEach((r) => (r.items || []).forEach((it) => {
    FFE.itemDueItems(it).forEach((d) => {
      const bucket = FFE.urgencyBucket(d.date);
      if (!bucket) return;
      rows.push({ bucket, projectId: p.id, projectName: p.name, room: r.name, title: it.title, kind: d.kind, label: d.label, date: d.date, sup: it.sup || "" });
    });
  })));
  return rows.sort((a, b) => rank[a.bucket] - rank[b.bucket] || a.date.localeCompare(b.date));
}

// AIVibeAPI.projects.list() отдаёт rooms только у проектов, хоть раз сохранённых
// через RoomSpecOverlay (saveRoom патчит rooms в запись списка) — свежие/каталожные
// проекты молча выпадали бы из виджета. Тянем полную карточку каждого, как
// AddPositionsModal уже делает для вкладки «из прошлого проекта».
function loadUrgentQueue(projects) {
  return Promise.all((projects || []).map((p) => AIVibeAPI.projects.get(p.id).catch(() => null)))
    .then((full) => buildUrgentQueue(full.filter((d) => d && d.rooms)));
}

/* строка очереди срочности (дата · точка-цвет · заголовок+контекст · подпись) — общая
   для TodayWidget (топ-8, компактная) и ProcureHub (полный список, волна W3.2), чтобы
   исправление разметки/a11y не приходилось повторять в двух местах */
function UrgencyRow({ r, onOpen, first, compact }) {
  const FFE = window.AIVibeFFE;
  const b = FFE.URGENCY_BY_ID[r.bucket];
  return (
    <button onClick={() => onOpen(r.projectId)}
      style={{ display: "flex", alignItems: "baseline", gap: compact ? 10 : 12, padding: compact ? "7px 0" : "12px 0", borderTop: first ? "none" : "1px solid var(--hairline-2)", fontSize: compact ? "var(--fs-13)" : "var(--fs-14)", textAlign: "left", width: "100%" }}>
      <span aria-hidden="true" style={{ width: compact ? 7 : 8, height: compact ? 7 : 8, borderRadius: "50%", background: b.color, flex: "none", alignSelf: "center" }} />
      <span className="mono" style={{ fontSize: compact ? "var(--fs-11)" : "var(--fs-12)", color: "var(--muted)", flex: "none", width: compact ? 40 : 44 }}>{fmtDCV(r.date)}</span>
      <span style={{ flex: 1, minWidth: 0, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {r.title} <span style={{ color: "var(--spec-meta)" }}>· {r.projectName} · {r.room}{r.sup ? " · " + r.sup : ""}</span>
      </span>
      <span style={{ color: "var(--spec-meta)", fontSize: compact ? "var(--fs-12)" : "var(--fs-13)", flex: "none", whiteSpace: "nowrap" }}>{r.label}</span>
    </button>
  );
}

function TodayWidget({ rows, onOpen }) {
  const FFE = window.AIVibeFFE;
  if (!FFE) return null;
  const counts = Object.fromEntries(FFE.URGENCY_BUCKETS.map((b) => [b.id, 0]));
  rows.forEach((r) => counts[r.bucket]++);
  const actionable = rows.filter((r) => r.bucket !== "later").slice(0, 8);
  return (
    <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: "16px 18px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: actionable.length ? 10 : 0 }}>
        <span style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
          <I.wallet size={16} style={{ color: "var(--accent)", position: "relative", top: 1 }} />
          <span style={{ fontWeight: 800, fontFamily: "var(--font-display)", fontSize: "var(--fs-16)" }}>Сегодня в работе</span>
        </span>
        <span style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {FFE.URGENCY_BUCKETS.filter((b) => counts[b.id] > 0).map((b) => (
            <span key={b.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--fs-12)", color: "var(--muted)" }}>
              <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: b.color, flex: "none" }} />
              {b.label} · {counts[b.id]}
            </span>
          ))}
        </span>
      </div>
      {!actionable.length
        ? <div style={{ fontSize: "var(--fs-13)", color: "var(--muted)" }}>Ничего не горит — по датам стадий закупки и платежам всё под контролем.</div>
        : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {actionable.map((r, i) => <UrgencyRow key={i} r={r} onOpen={onOpen} first={i === 0} compact />)}
          </div>
        )}
    </div>
  );
}

/* ---------------- «СЕГОДНЯ» — домашний экран студийного уровня (волна W3.1) ----------------
   Паттерн Programa Pulse: дата+приветствие serif, чек-лист первых шагов, затем очередь
   срочности (TodayWidget переехал сюда с «Проектов» — новый пользователь видит путь,
   опытный сразу очередь). Чек-лист — честные локальные флаги: ставятся в местах РЕАЛЬНЫХ
   действий (onCreated/finishQuiz ниже; addFrom «по ссылке» и первый shareVersion —
   в project-detail.jsx), не имитация прогресса. Живая перепроверка Programa (09/10.07):
   у них шаги тоже не кликаются инлайн — отмечаются переходом на отдельную onboarding-
   страницу; мы проще — отмечаем сам факт действия, без отдельного тур-флоу. */
const ONBOARD_STEPS = [
  { id: "project", flag: "aivibe_step_project", label: "Создайте свой первый проект" },
  { id: "clip", flag: "aivibe_step_clip", label: "Добавьте позицию по ссылке на товар" },
  { id: "share", flag: "aivibe_step_share", label: "Отправьте ссылку клиенту" },
];
const greetingWord = () => { const h = new Date().getHours(); return h < 5 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : "Добрый вечер"; };
/* единая точка записи флагов чек-листа (вместо сырых localStorage.setItem-литералов,
   разбросанных по вызывающим местам, в т.ч. в project-detail.jsx — оттуда через
   window.markOnboardStep, см. конвенцию window.PROJ_STATUSES выше про кросс-файловые const) */
const markOnboardStep = (id) => {
  const step = ONBOARD_STEPS.find((s) => s.id === id);
  if (!step) return;
  try { localStorage.setItem(step.flag, "1"); } catch (e) {}
};
window.markOnboardStep = markOnboardStep;

function OnboardChecklist({ onNewProject, onOpenProjects, hasProjects }) {
  // шаг 1 — бутстрап для аккаунтов СО СТАРШИМ данными (флага ещё нет, проекты уже есть):
  // «создайте первый проект» не должен звучать нелепо, если их уже 5 — это факт, не имитация
  const done = ONBOARD_STEPS.map((s, i) => {
    if (i === 0 && hasProjects) return true;
    try { return !!localStorage.getItem(s.flag); } catch (e) { return false; }
  });
  const n = done.filter(Boolean).length;
  if (n >= ONBOARD_STEPS.length) return null;   // весь чек-лист выполнен — не занимаем место у опытного пользователя
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
        <h2 style={{ fontSize: "var(--fs-16)", fontWeight: 700 }}>Первые шаги</h2>
        <span className="glass" style={{ padding: "3px 10px", borderRadius: 99, fontSize: "var(--fs-11)", fontWeight: 700, color: "var(--accent-ink)", background: "var(--accent-tint)" }}>{n}/{ONBOARD_STEPS.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ONBOARD_STEPS.map((s, i) => (
          <div key={s.id} className="glass" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: "var(--r-md)" }}>
            {done[i]
              ? <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--accent-2)", color: "var(--on-accent)", display: "grid", placeItems: "center", flex: "none" }}><I.check size={13} /></span>
              : <span className="mono" style={{ width: 24, height: 24, borderRadius: "50%", border: "1.5px solid var(--hairline)", color: "var(--faint)", fontSize: "var(--fs-12)", fontWeight: 700, display: "grid", placeItems: "center", flex: "none" }}>{i + 1}</span>}
            <span style={{ flex: 1, fontSize: "var(--fs-14)", fontWeight: 600, textDecoration: done[i] ? "line-through" : "none", color: done[i] ? "var(--faint)" : "var(--text)" }}>{s.label}</span>
            {!done[i] && (
              <button className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: "var(--fs-12)", flex: "none" }}
                onClick={s.id === "project" ? onNewProject : onOpenProjects}>Перейти <I.arrow size={13} /></button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Today({ user, onNewProject, onOpenProjects }) {
  const [rows, setRows] = useCV(null);
  const [urgent, setUrgent] = useCV([]);
  useCVE(() => { AIVibeAPI.projects.list().then((list) => { setRows(list); loadUrgentQueue(list).then(setUrgent); }); }, []);
  const dateStr = new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="reveal in" ref={useReveal()}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--muted)", fontSize: "var(--fs-13)", marginBottom: 4 }}>
          <I.calendar size={14} style={{ flex: "none" }} />{dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}
        </div>
        <h1 className="display" style={{ fontSize: "var(--fs-30)" }}>{greetingWord()}, {(user.name || "").split(" ")[0]}</h1>
      </div>
      <OnboardChecklist onNewProject={onNewProject} onOpenProjects={onOpenProjects} hasProjects={!!(rows && rows.length > 0)} />
      {!rows && <div className="glass skel" style={{ borderRadius: "var(--r-lg)", height: 140 }} />}
      {rows && rows.length > 0 && <TodayWidget rows={urgent} onOpen={(id) => setRoute("cabinet", "projects", id)} />}
      {rows && rows.length === 0 && (
        <EmptyState icon="layers" title="Пока нет проектов"
          text="Создайте первый проект — задайте комнату и бюджет, дальше Design Ledger соберёт смету и проверит эргономику."
          action={<button className="btn btn-primary" onClick={onNewProject}><I.plus size={17} />Создать первый проект</button>} />
      )}
    </div>
  );
}

/* ---------------- ЗАКУПКА-ХАБ (волна W3.2) ----------------
   Сквозная страница студийного уровня: та же очередь срочности, что в TodayWidget
   (buildUrgentQueue), но полная (без среза в 8) + фильтр по проекту/поставщику —
   паттерн Programa Financials→Purchase Orders. Разведка 09.07 живого Purchase Orders
   у Programa застала пустой триал-аккаунт (0 заказов ни в одном из 3 проектов) — у
   нас, в отличие от их пустого демо, хаб сразу содержит живые даты стадий закупки и
   платежей по всем сохранённым проектам. */
function ProcureHub({ onOpen }) {
  const [rows, setRows] = useCV(null);
  const [projF, setProjF] = useCV("Все");
  const [supF, setSupF] = useCV("Все");
  useCVE(() => { AIVibeAPI.projects.list().then((list) => loadUrgentQueue(list).then(setRows)); }, []);
  const projects = rows ? ["Все", ...Array.from(new Set(rows.map((r) => r.projectName)))] : ["Все"];
  const suppliers = rows ? ["Все", ...Array.from(new Set(rows.map((r) => r.sup).filter(Boolean)))] : ["Все"];
  const shown = rows ? rows.filter((r) => (projF === "Все" || r.projectName === projF) && (supF === "Все" || r.sup === supF)) : null;
  const FFE = window.AIVibeFFE;
  return (
    <div className="reveal in" ref={useReveal()}>
      <PageHead title="Закупка" sub="Сквозная очередь срочности по всем проектам — даты стадий закупки и платежи" />

      {rows && rows.length > 0 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
          <select className="fld" value={projF} onChange={(e) => setProjF(e.target.value)} style={{ width: "auto", padding: "9px 12px", fontSize: "var(--fs-13)", fontWeight: 700, cursor: "pointer" }}>
            {projects.map((p) => <option key={p} value={p}>{p === "Все" ? "Все проекты" : p}</option>)}
          </select>
          {suppliers.length > 1 && (
            <select className="fld" value={supF} onChange={(e) => setSupF(e.target.value)} style={{ width: "auto", padding: "9px 12px", fontSize: "var(--fs-13)", fontWeight: 700, cursor: "pointer" }}>
              {suppliers.map((s) => <option key={s} value={s}>{s === "Все" ? "Все поставщики" : s}</option>)}
            </select>
          )}
        </div>
      )}

      {!rows && <div className="glass skel" style={{ borderRadius: "var(--r-lg)", height: 320 }} />}

      {rows && rows.length === 0 && (
        <EmptyState icon="truck" title="Закупка пока пуста"
          text="Как только у позиций появятся даты стадий закупки или платежей, здесь появится сквозная очередь срочности по всем проектам." />
      )}

      {shown && shown.length === 0 && rows.length > 0 && (
        <EmptyState compact icon="search" text="По этим фильтрам ничего не нашлось."
          action={<button className="btn btn-ghost" onClick={() => { setProjF("Все"); setSupF("Все"); }}>Сбросить фильтры</button>} />
      )}

      {shown && shown.length > 0 && FFE && (
        <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: "6px 18px" }}>
          {shown.map((r, i) => <UrgencyRow key={i} r={r} onOpen={onOpen} first={i === 0} />)}
        </div>
      )}
    </div>
  );
}

/* ---------------- СОХРАНЁННЫЕ ПРОЕКТЫ (рабочий список) ---------------- */
function Projects() {
  const [rows, setRows] = useCV(null);
  const [sum, setSum] = useCV(null);          // сводная аналитика
  const [openId, setOpenId] = useCV(() => parseRoute().sub || null);   // открытая деталь проекта (из hash — deep-link/F5)
  const [openNav, setOpenNav] = useCV(() => parseRoute().s2 || "");    // раздел проекта из сайдбара W1: '' | client | procure | versions
  const [openStyle, setOpenStyle] = useCV(null); // стиль, с которым открыть проект (из квиза)
  const [newOpen, setNewOpen] = useCV(false); // модалка «Новый проект»
  const [quizOpen, setQuizOpen] = useCV(false);
  const [importData, setImportData] = useCV(null); // смета, загруженная из Excel
  const [q, setQ] = useCV("");                // поиск
  const [statusF, setStatusF] = useCV("Все"); // фильтр по статусу
  const [sort, setSort] = useCV("updated");   // updated | budget | name
  const [menuId, setMenuId] = useCV(null);    // открытое ⋯-меню карточки

  const refresh = () => {
    AIVibeAPI.projects.list().then(setRows);
    AIVibeAPI.projects.summary().then(setSum);
  };

  /* открытый проект живёт в адресе: #cabinet/projects/p_1 → F5 переоткрывает,
     «назад» закрывает оверлей, ссылкой можно поделиться (wayfinding UpRock) */
  const openProject = (id) => { setOpenId(id); setRoute("cabinet", "projects", id); };
  // applyRoute (НЕ guarded setRoute): closeProject доходит сюда либо когда нечего
  // терять, либо УЖЕ после подтверждения+сохранения через guardedClose
  // (project-detail.jsx) — повторный вопрос был бы гонкой с эффектом, снимающим
  // window.pdSmetaDirty (setRoomSaving/setRoomSaved ещё не отрисовались к этому тику)
  const closeProject = () => { setOpenId(null); setOpenStyle(null); refresh(); applyRoute("cabinet", "projects"); };

  useCVE(() => {
    refresh();
    // черновик из калькулятора площади (лендинг → кабинет) — открываем сразу
    // в смете-комплектации, каналом Excel-импорта (RoomSpecOverlay без id)
    const F = window.AIVibeFFE;
    const draft = F && F.takePendingDraft && F.takePendingDraft();
    if (draft) setImportData(draft);
    // онбординг-квиз не всплывает поверх открытого по диплинку проекта/сметы
    // (первый заход по ссылке «#cabinet/projects/id» — человек пришёл смотреть смету)
    // и поверх черновика из калькулятора — человек пришёл смотреть свою смету
    try { if (!localStorage.getItem("aivibe_quiz_done") && !parseRoute().sub && !draft) setTimeout(() => setQuizOpen(true), 700); } catch (e) {}
    const onNew = () => setNewOpen(true);   // кнопка «+ Новый проект» из топбара
    window.addEventListener("aivibe:new-project", onNew);
    // back/forward и ручная правка адреса — синхронизируем открытый проект;
    // закрытие «назад» чистит и стиль квиза, и обновляет список (как closeProject)
    const onHash = () => {
      const r = parseRoute();
      if (r.view !== "cabinet" || r.tab !== "projects") return;
      const sub = r.sub || null;
      setOpenId(sub);
      setOpenNav(r.s2 || "");
      if (!sub) { setOpenStyle(null); refresh(); }
    };
    window.addEventListener("hashchange", onHash);
    return () => { window.removeEventListener("aivibe:new-project", onNew); window.removeEventListener("hashchange", onHash); };
  }, []);

  // «Первые шаги» на «Сегодня» (волна W3.1): честный флаг ставится в момент реального
  // создания проекта, а не имитацией — здесь и в finishQuiz (оба пути создают проект)
  const onCreated = (p) => { markOnboardStep("project"); setNewOpen(false); refresh(); openProject(p.id); };

  const finishQuiz = (styleId, extra) => {
    try { localStorage.setItem("aivibe_quiz_done", "1"); } catch (e) {}
    setQuizOpen(false);
    const room = (extra && extra.room) || "Гостиная";
    const budget = (extra && extra.budget) || 420000;
    const styleName = QUIZ_STYLE_NAME[styleId] || "";
    AIVibeAPI.projects.create({ name: room + " · " + (styleName || "проект"), room, budget, style: styleName }).then((p) => { markOnboardStep("project"); refresh(); setOpenStyle(styleId); openProject(p.id); });
  };

  // импорт сметы из Excel → открываем в той же смете-комплектации (RoomSpecOverlay)
  const onImport = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = ""; // чтобы можно было выбрать тот же файл повторно
    if (!f || !(window.AIVibeXLSX && AIVibeXLSX.importRoomSpec)) return;
    withLib("xlsx", () => AIVibeXLSX.importRoomSpec(f)
      .then((d) => {
        if (d && d.rooms && d.rooms.length) setImportData(d);
        else toast("Не удалось распознать смету. Нужны колонки: Помещение, Раздел, Наименование, Кол-во, Цена.", "warn", 7000);
      })
      .catch(() => toast("Не удалось прочитать файл — нужен .xlsx или .xls.", "warn", 5000)));
  };

  // действия над проектом
  const rename = async (p) => {
    setMenuId(null);
    const name = await promptDialog({ title: "Переименовать проект", label: "Название", value: p.name });
    if (name && name.trim()) { await AIVibeAPI.projects.update(p.id, { name: name.trim() }); refresh(); toast("Проект переименован"); }
  };
  // pinned не копируем — закреп это выбор пользователя про КОНКРЕТНУЮ карточку,
  // копия не должна молча запрыгивать наверх сетки без его действия
  const duplicate = async (p) => { setMenuId(null); const { id, pinned, ...rest } = p; await AIVibeAPI.projects.create({ ...rest, name: p.name + " (копия)" }); refresh(); toast("Копия создана — «" + p.name + " (копия)»"); };
  const changeStatus = async (p, status) => { setMenuId(null); await AIVibeAPI.projects.update(p.id, { status }); refresh(); };
  // закрепить сверху сетки (волна W3.3, паттерн Programa: hover-кнопка на обложке)
  const togglePin = async (p) => { await AIVibeAPI.projects.update(p.id, { pinned: !p.pinned }); refresh(); };
  const removeP = async (p) => {
    setMenuId(null);
    const ok = await confirmDialog({ title: "Удалить проект?", text: "«" + p.name + "» будет удалён вместе со сметой. Это действие нельзя отменить.", confirmLabel: "Удалить проект" });
    if (ok) { await AIVibeAPI.projects.remove(p.id); refresh(); toast("Проект «" + p.name + "» удалён"); }
  };

  const shown = rows ? rows
    .filter((p) => statusF === "Все" || p.status === statusF)
    .filter((p) => !q.trim() || ((p.name || "") + " " + (p.style || "") + " " + (p.room || "")).toLowerCase().includes(q.trim().toLowerCase()))
    .slice()
    .sort((a, b) => (a.pinned ? 0 : 1) - (b.pinned ? 0 : 1)
      || (sort === "budget" ? b.budget - a.budget : sort === "name" ? (a.name || "").localeCompare(b.name || "") : (b.updated || "").localeCompare(a.updated || ""))) : null;

  return (
    <div className="reveal in" ref={useReveal()}>
      <PageHead title="Мои проекты" sub="Сохранённые комнаты и сметы для клиентов"
        right={<div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-ghost" onClick={() => setQuizOpen(true)}><I.spark size={16} /> Стиль-квиз</button>
          <label className="btn btn-ghost" style={{ cursor: "pointer" }} title="Загрузить готовую комплектацию из Excel (колонки: Помещение, Раздел, Наименование, Кол-во, Цена)">
            <I.grid size={16} /> Импорт из Excel
            <input type="file" accept=".xlsx,.xls" hidden onChange={onImport} />
          </label>
          <button className="btn btn-primary" onClick={() => setNewOpen(true)}><I.plus size={17} /> Новый проект</button>
        </div>} />

      {/* ── сводная аналитика по проектам ── */}
      <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 16 }}>
        {!sum && Array.from({ length: 4 }).map((_, i) => <div key={i} className="glass skel" style={{ borderRadius: "var(--r-lg)", height: 104 }} />)}
        {sum && sum.kpis.map((k) => <KpiCard key={k.key} k={k} />)}
      </div>

      {/* ── тулбар: поиск · статус · сортировка ── */}
      {rows && rows.length > 0 && (
        <div className="proj-toolbar" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <SearchField value={q} onChange={setQ} placeholder="Поиск по названию, стилю, комнате" ariaLabel="Поиск по проектам" style={{ flex: "1 1 240px", maxWidth: 340 }} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["Все", ...PROJ_STATUSES].map((s) => (
              <button key={s} onClick={() => setStatusF(s)} aria-pressed={statusF === s} style={{ padding: "8px 13px", borderRadius: 99, fontSize: "var(--fs-13)", fontWeight: 700, border: "1px solid " + (statusF === s ? "var(--accent)" : "var(--hairline)"),
                background: statusF === s ? "var(--accent)" : "var(--surface)", color: statusF === s ? "var(--on-accent)" : "var(--muted)" }}>{s}</button>
            ))}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="fld" style={{ width: "auto", padding: "9px 12px", fontSize: "var(--fs-13)", fontWeight: 700, cursor: "pointer", marginLeft: "auto" }}>
            <option value="updated">Сначала новые</option>
            <option value="budget">По бюджету</option>
            <option value="name">По названию</option>
          </select>
        </div>
      )}

      {/* ── сетка проектов / пустые состояния ── */}
      {!rows && <div className="proj-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 18 }}>{Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass skel" style={{ borderRadius: "var(--r-lg)", height: 280 }} />)}</div>}

      {rows && rows.length === 0 && (
        <EmptyState icon="layers" title="Пока нет проектов"
          text="Создайте первый проект — задайте комнату и бюджет, дальше Design Ledger соберёт смету и проверит эргономику."
          action={<button className="btn btn-primary" onClick={() => setNewOpen(true)}><I.plus size={17} />Создать первый проект</button>} />
      )}

      {shown && shown.length === 0 && rows.length > 0 && (
        <EmptyState compact icon="search"
          text={q.trim() ? <React.Fragment>По запросу <b style={{ color: "var(--text)" }}>«{q.trim()}»</b> ничего не нашлось{statusF !== "Все" ? " среди «" + statusF + "»" : ""}.</React.Fragment> : <React.Fragment>В статусе «{statusF}» пока нет проектов.</React.Fragment>}
          action={<button className="btn btn-ghost" onClick={() => { setQ(""); setStatusF("Все"); }}>Показать все проекты</button>} />
      )}

      {shown && shown.length > 0 && (
        <div className="proj-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 18 }}>
          {shown.map((p) => (
            <ProjectCard key={p.id} p={p} menuOpen={menuId === p.id}
              onOpen={() => openProject(p.id)} onMenu={() => setMenuId((m) => m === p.id ? null : p.id)}
              onRename={() => rename(p)} onDuplicate={() => duplicate(p)} onStatus={(s) => changeStatus(p, s)} onRemove={() => removeP(p)} onPin={() => togglePin(p)} />
          ))}
        </div>
      )}

      {openId && <ProjectDetail id={openId} nav={openNav} initialStyle={openStyle} onClose={closeProject} />}
      {importData && <RoomSpecOverlay data={importData} onClose={() => { setImportData(null); refresh(); }} />}
      {newOpen && <NewProjectModal onClose={() => setNewOpen(false)} onCreate={onCreated} onExample={() => { setNewOpen(false); openProject("p_1"); }} />}
      {quizOpen && <StyleQuiz onClose={() => { setQuizOpen(false); try { localStorage.setItem("aivibe_quiz_done", "1"); } catch (e) {} }} onDone={finishQuiz} />}
    </div>
  );
}

/* карточка проекта с меню действий (⋯): переименовать · дублировать · статус · удалить.
   Волна W3.3 (полировка по Programa): закреп на hover (звезда, всегда видна если закреплён —
   CSS .pc-pin в app.css), «Изменено N назад» в статус-чипе (fmtRelDays, ui.jsx), обложка шире
   (2/1 вместо 16/10 — их пропорция превью), плашка-заглушка serif-именем вместо стокового
   фото у проектов без единой позиции (p.items===0) — честнее случайного интерьерного кадра. */
function ProjectCard({ p, menuOpen, onOpen, onMenu, onRename, onDuplicate, onStatus, onRemove, onPin }) {
  useMenu(menuOpen, onMenu, "pc-menu-wrap");   // Esc/стрелки/click-outside — единый паттерн меню
  const trigRef = useCVR(null);                 // «⋯»: сюда возвращаем фокус перед действием —
                                                // иначе диалог запомнит размонтированный пункт меню
  const mItem = (label, Ico, onClick, danger) => (
    <button role="menuitem" className="menu-item" onClick={(e) => { e.stopPropagation(); if (trigRef.current) trigRef.current.focus(); onClick(); }}
      style={danger ? { color: "var(--accent-ink)" } : undefined}>
      <Ico size={16} style={{ color: danger ? "var(--accent-ink)" : "var(--muted)", flex: "none" }} />{label}
    </button>
  );
  return (
    <article className="glass news-card" style={{ position: "relative", borderRadius: "var(--r-lg)", display: "flex", flexDirection: "column", cursor: "pointer" }}>
      <div onClick={onOpen} style={{ position: "relative", aspectRatio: "2/1", overflow: "hidden", borderRadius: "var(--r-lg) var(--r-lg) 0 0" }}>
        {p.items
          ? <Img src={PHOTOS[p.cover] || PHOTOS.living} label={p.room} />
          : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 18, textAlign: "center", background: "var(--surface-2)" }}>
              <div>
                <div className="display" style={{ fontSize: "var(--fs-18)", lineHeight: 1.25 }}>{p.name}</div>
                <div style={{ marginTop: 5, fontSize: "var(--fs-12)", color: "var(--muted)" }}>{[p.style, p.room].filter(Boolean).join(" · ")}</div>
              </div>
            </div>}
        <span style={{ position: "absolute", top: 12, left: 12, padding: "5px 11px", borderRadius: 99, fontSize: "var(--fs-11)", fontWeight: 700, color: "#FCF6EE", background: "rgba(46,42,38,.62)", backdropFilter: "blur(6px)", border: "1px solid rgba(252,246,238,.22)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor[p.status] }} />{p.status}{p.updated && <React.Fragment> · {fmtRelDays(p.updated)}</React.Fragment>}
        </span>
      </div>

      {/* закреп + «⋯» в одном флекс-ряду — размер кнопок (34px десктоп / 44px мобильный
          бамп app.css:159) не захардкожен смещением, ряд сам подстраивается под любой брейкпоинт */}
      <div style={{ position: "absolute", top: 10, right: 10, display: "flex", alignItems: "center", gap: 6 }}>
      {/* закреп: видна на hover карточки (кроме touch — см. .pc-pin в app.css), остаётся видна
          (заливкой) если уже закреплён */}
      <button className={"icon-btn sm pc-pin" + (p.pinned ? " on" : "")} aria-label={p.pinned ? "Открепить" : "Закрепить"} aria-pressed={!!p.pinned}
        onClick={(e) => { e.stopPropagation(); onPin(); }}
        style={{ background: p.pinned ? "var(--accent)" : "rgba(251,248,242,.92)", border: "1px solid " + (p.pinned ? "var(--accent)" : "var(--hairline)"), color: p.pinned ? "var(--on-accent)" : "var(--muted)" }}>
        <I.star size={15} fill={p.pinned ? "currentColor" : "none"} />
      </button>

      {/* ⋯ меню */}
      <div className="pc-menu-wrap" style={{ position: "relative" }}>
        <button ref={trigRef} className="icon-btn sm" aria-label="Действия" aria-haspopup="menu" aria-expanded={menuOpen} onClick={(e) => { e.stopPropagation(); onMenu(); }}
          style={{ background: "rgba(251,248,242,.92)", border: "1px solid var(--hairline)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>
        </button>
        {menuOpen && (
          <div className="menu menu-pop" role="menu" onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, minWidth: 194, zIndex: 40 }}>
            {mItem("Переименовать", I.edit, onRename)}
            {mItem("Дублировать", I.layers, onDuplicate)}
            <div style={{ height: 1, background: "var(--hairline)", margin: "5px 4px" }} />
            <div style={{ fontSize: "var(--fs-11)", fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--faint)", padding: "4px 12px 6px" }}>Статус</div>
            <StatusMenuItems current={p.status} onPick={(s) => { if (trigRef.current) trigRef.current.focus(); onStatus(s); }} />
            {/* меню закрывается через onStatus→changeStatus (setMenuId null) */}
            <div style={{ height: 1, background: "var(--hairline)", margin: "5px 4px" }} />
            {mItem("Удалить", I.trash, onRemove, true)}
          </div>
        )}
      </div>
      </div>

      <div onClick={onOpen} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        <div>
          <h3 style={{ fontSize: "var(--fs-18)", fontWeight: 700, letterSpacing: "-0.01em" }}>{p.name}</h3>
          <div style={{ color: "var(--muted)", fontSize: "var(--fs-13)", marginTop: 3 }}>{[p.style, p.room].filter(Boolean).join(" · ")}</div>
          {STAGE_NEXT[p.status] && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: "var(--fs-12)", color: "var(--faint)", marginTop: 7 }}>
              <span style={{ fontWeight: 700, color: "var(--muted)", whiteSpace: "nowrap" }}>Дальше:</span>
              <span style={{ lineHeight: 1.35 }}>{STAGE_NEXT[p.status]}</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: "var(--fs-13)", color: "var(--muted)", marginTop: "auto" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><I.ruler size={15} />{p.area} м²</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><I.layers size={15} />{p.items} предм.</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid var(--hairline)" }}>
          <span className="mono" style={{ fontWeight: 600, fontSize: "var(--fs-16)" }}>{fmtMoney(p.budget)}</span>
          <span className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: "var(--fs-13)" }}>Открыть <I.arrow size={14} /></span>
        </div>
      </div>
    </article>
  );
}

/* модалка «Новый проект» — форма (комната · габариты · бюджет) → создаёт проект */
function NewProjectModal({ onClose, onCreate, onExample }) {
  const [name, setName] = useCV("");
  const [room, setRoom] = useCV("Гостиная");
  const [area, setArea] = useCV(24);
  const [budget, setBudget] = useCV(420000);
  const [busy, setBusy] = useCV(false);
  const rooms = ["Гостиная", "Спальня", "Кухня", "Кабинет", "Детская", "Прихожая", "Ванная"];
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    const p = await AIVibeAPI.projects.create({ name: name.trim() || (room + " — новый проект"), room, area: +area || 0, budget: +budget || 0, style: "" });
    setBusy(false);
    onCreate(p);
  };
  return (
    <Modal onClose={onClose} label="Новый проект">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 26px", borderBottom: "1px solid var(--hairline)" }}>
          <h3 className="display" style={{ fontSize: "var(--fs-21)" }}>Новый проект</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть"><I.close size={18} /></button>
        </div>
        <div style={{ padding: 26, display: "flex", flexDirection: "column", gap: 16 }}>
          <label style={{ display: "block" }}>
            <span style={{ display: "block", fontSize: "var(--fs-13)", color: "var(--muted)", marginBottom: 7, fontWeight: 600 }}>Название</span>
            <input className="fld" value={name} onChange={(e) => setName(e.target.value)} placeholder="Напр. Гостиная на Патриках" />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: "var(--fs-13)", color: "var(--muted)", marginBottom: 7, fontWeight: 600 }}>Комната</span>
              <select className="fld" value={room} onChange={(e) => setRoom(e.target.value)} style={{ cursor: "pointer" }}>{rooms.map((r) => <option key={r} value={r}>{r}</option>)}</select>
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: "var(--fs-13)", color: "var(--muted)", marginBottom: 7, fontWeight: 600 }}>Площадь, м²</span>
              <input className="fld" type="number" min="1" value={area} onChange={(e) => setArea(e.target.value)} />
            </label>
          </div>
          <label style={{ display: "block" }}>
            <span style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-13)", color: "var(--muted)", marginBottom: 7, fontWeight: 600 }}>Бюджет<b className="mono" style={{ color: "var(--accent)", fontWeight: 600, fontSize: "var(--fs-15)" }}>{fmtMoney(budget)}</b></span>
            <input type="range" min="120000" max="1500000" step="20000" value={budget} onChange={(e) => setBudget(+e.target.value)} style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }} />
          </label>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "18px 26px", borderTop: "1px solid var(--hairline)", flexWrap: "wrap" }}>
          <button className="btn btn-ghost" onClick={onExample}>Открыть пример</button>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
            <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? "Создаём…" : <React.Fragment><I.plus size={16} />Создать проект</React.Fragment>}</button>
          </div>
        </div>
    </Modal>
  );
}

/* ---------------- ИЗБРАННОЕ / МУДБОРД ---------------- */
const FAV_MP = { f1: "Дубрава", f2: "Линея" };

function Favorites() {
  const [items, setItems] = useCV(null);
  const [room, setRoom] = useCV("Все");
  const [pickOpen, setPickOpen] = useCV(false);
  useCVE(() => { AIVibeAPI.favorites.list().then(setItems); }, []);

  const remove = async (id) => {
    setItems((arr) => arr.filter((f) => f.id !== id));   // оптимистично
    AIVibeAPI.favorites.remove(id);
  };

  const rooms = items ? ["Все", ...Array.from(new Set(items.map((f) => f.room)))] : ["Все"];
  const shown = items ? (room === "Все" ? items : items.filter((f) => f.room === room)) : null;
  const total = shown ? shown.reduce((s, f) => s + f.price, 0) : 0;
  const saved = shown ? shown.reduce((s, f) => s + ((f.old || f.price) - f.price), 0) : 0;

  return (
    <div className="reveal in" ref={useReveal()}>
      <PageHead title="Избранное" sub="Мудборд сохранённых вещей и готовый список покупок"
        right={<div className="glass" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 15px", borderRadius: 99, fontSize: "var(--fs-13)", fontWeight: 700 }}>
          <I.heart size={15} style={{ color: "var(--accent)" }} />{items ? items.length : "…"} в избранном
        </div>} />

      {/* фильтр по комнатам */}
      <div className="fav-chips" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {rooms.map((r) => (
          <button key={r} onClick={() => setRoom(r)} aria-pressed={room === r} style={{ padding: "8px 15px", borderRadius: 99, fontSize: "var(--fs-13)", fontWeight: 700, border: "1px solid var(--hairline)",
            background: room === r ? "var(--accent)" : "var(--glass-2)", color: room === r ? "var(--on-accent)" : "var(--muted)", transition: "var(--dur-fast)" }}>{r}</button>
        ))}
      </div>

      <div className="fav-layout" style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 22, alignItems: "start" }}>
        {/* мудборд */}
        <div>
          {!shown && <div className="glass skel" style={{ borderRadius: "var(--r-lg)", height: 460 }} />}
          {shown && shown.length === 0 && (
            <EmptyState compact icon="heart"
              text={room === "Все" ? "В избранном пока пусто. Сохранение предметов из каталога появится вместе с реальным каталогом фабрик." : "В комнате «" + room + "» пока нет избранного."}
              action={room !== "Все" && <button className="btn btn-ghost" onClick={() => setRoom("Все")}>Показать все комнаты</button>} />
          )}
          {shown && shown.length > 0 && (
            <div className="fav-board" style={{ columnCount: 2, columnGap: 14 }}>
              {shown.map((f, i) => <FavCard key={f.id} item={f} ar={["3 / 4", "4 / 5", "1 / 1", "5 / 6"][i % 4]} onRemove={() => remove(f.id)} />)}
            </div>
          )}
        </div>

        {/* шоп-лист */}
        <div className="glass fav-shop" style={{ borderRadius: "var(--r-xl)", padding: 24, position: "sticky", top: "calc(var(--nav-h) + 20px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
            <I.cart size={18} style={{ color: "var(--accent)" }} />
            <h3 style={{ fontSize: "var(--fs-16)", fontWeight: 700 }}>Список покупок</h3>
            <span style={{ marginLeft: "auto", fontSize: "var(--fs-13)", color: "var(--faint)" }}>{shown ? shown.length : 0} шт.</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", maxHeight: 320, overflow: "auto", marginInline: -4, paddingInline: 4 }}>
            {!shown && Array.from({ length: 4 }).map((_, i) => <div key={i} className="skel" style={{ height: 56, borderRadius: 10, marginBottom: 8 }} />)}
            {shown && shown.map((f, i) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: i === shown.length - 1 ? "none" : "1px solid var(--hairline)" }}>
                <div style={{ width: 46, height: 46, borderRadius: 9, overflow: "hidden", flex: "none" }}><Img src={f.img} label="" /></div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: "var(--fs-13)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.title}</div>
                  <div style={{ fontSize: "var(--fs-12)", color: "var(--faint)", marginTop: 2 }}>{FAV_MP[f.mp]}</div>
                </div>
                <div className="mono" style={{ fontWeight: 600, fontSize: "var(--fs-13)", whiteSpace: "nowrap" }}>{fmtMoney(f.price)}</div>
                <button className="icon-btn sm" title="Убрать" onClick={() => remove(f.id)} style={{ flex: "none" }}><I.close size={15} /></button>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid var(--hairline)", marginTop: 14, paddingTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {saved > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-13)", color: "var(--accent-2)", fontWeight: 700 }}><span>Скидка по каталогу</span><span className="mono">−{fmtMoney(saved)}</span></div>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ color: "var(--muted)", fontSize: "var(--fs-14)" }}>Итого</span>
              {/* деньги — всегда mono+tabular, Spectral только нецифровым заголовкам */}
              <span className="mono" style={{ fontSize: "var(--fs-21)", fontWeight: 600 }}>{fmtMoney(total)}</span>
            </div>
          </div>
          <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} disabled={!shown || shown.length === 0} onClick={() => setPickOpen(true)}><I.layers size={16} />Перенести в проект</button>
          {/* «Поделиться доской» убрана: механизма шаринга нет (URL доски ничего не открывает
              без этого браузера) — вернётся настоящей ссылкой вместе с Worker-шарингом */}
        </div>
      </div>

      {pickOpen && <FavTransferModal count={shown ? shown.length : 0} total={total} onClose={() => setPickOpen(false)}
        onDone={(p) => { const n = shown ? shown.length : 0; setPickOpen(false); toast(n + " " + plural(n, ["позиция перенесена", "позиции перенесены", "позиций перенесено"]) + " в проект «" + p.name + "»."); }} />}
    </div>
  );
}

/* модалка «Перенести в проект» — выбор проекта-получателя (мост избранное → смета) */
function FavTransferModal({ count, total, onClose, onDone }) {
  const [rows, setRows] = useCV(null);
  const [busy, setBusy] = useCV(false);
  useCVE(() => { AIVibeAPI.projects.list().then(setRows); }, []);
  const pick = async (p) => {
    if (busy) return;
    setBusy(true);
    await AIVibeAPI.projects.update(p.id, { items: (p.items || 0) + count });
    setBusy(false);
    onDone(p);
  };
  return (
    <Modal onClose={onClose} label="Перенести в проект" maxWidth={480}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--hairline)" }}>
          <div>
            <h3 className="display" style={{ fontSize: "var(--fs-21)" }}>Перенести в проект</h3>
            <div style={{ fontSize: "var(--fs-13)", color: "var(--muted)", marginTop: 3 }}>{count} {plural(count, ["позиция", "позиции", "позиций"])} · {fmtMoney(total)}</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть"><I.close size={18} /></button>
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, maxHeight: "56vh", overflow: "auto" }}>
          {!rows && Array.from({ length: 3 }).map((_, i) => <div key={i} className="skel" style={{ height: 58, borderRadius: 12 }} />)}
          {rows && rows.map((p) => (
            <button key={p.id} onClick={() => pick(p)} disabled={busy} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, border: "1px solid var(--hairline)", background: "var(--surface)", textAlign: "left" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--hairline)")}>
              <div style={{ width: 46, height: 46, borderRadius: 9, overflow: "hidden", flex: "none" }}><Img src={PHOTOS[p.cover] || PHOTOS.living} label="" /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "var(--fs-14)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                <div style={{ fontSize: "var(--fs-12)", color: "var(--muted)" }}>{p.room} · {fmtMoney(p.budget)}</div>
              </div>
              <I.arrow size={16} style={{ color: "var(--faint)", flex: "none" }} />
            </button>
          ))}
        </div>
    </Modal>
  );
}

function FavCard({ item, onRemove, ar }) {
  const disc = item.old && item.old > item.price ? Math.round((1 - item.price / item.old) * 100) : 0;
  return (
    <div className="glass" style={{ breakInside: "avoid", marginBottom: 14, borderRadius: "var(--r-lg)", overflow: "hidden", position: "relative" }}>
      <div style={{ position: "relative", aspectRatio: ar || "3 / 4" }}>
        <Img src={item.img} label={item.room} style={{ position: "absolute", inset: 0 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 45%, rgba(46,42,38,.78))" }} />
        <button onClick={onRemove} aria-label="Убрать из избранного" style={{ position: "absolute", top: 10, right: 10, width: 34, height: 34, borderRadius: "50%", background: "rgba(46,42,38,.6)", backdropFilter: "blur(6px)", border: "1px solid var(--hairline)", color: "var(--accent)", display: "grid", placeItems: "center" }}>
          <I.heart size={16} fill="var(--accent)" stroke="var(--accent)" />
        </button>
        <span className={"mp mp-badge " + item.mp} style={{ position: "absolute", top: 12, left: 12 }}>{FAV_MP[item.mp]}</span>
        <div style={{ position: "absolute", left: 13, right: 13, bottom: 12 }}>
          <div style={{ fontSize: "var(--fs-14)", fontWeight: 700, lineHeight: 1.3, color: "var(--on-dark)", textShadow: "0 1px 8px rgba(0,0,0,.5)" }}>{item.title}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
            <span className="mono" style={{ fontWeight: 600, fontSize: "var(--fs-16)", color: "var(--on-dark)" }}>{fmtMoney(item.price)}</span>
            {disc > 0 && <span style={{ fontSize: "var(--fs-12)", color: "rgba(252,246,238,.6)", textDecoration: "line-through" }}>{fmtMoney(item.old)}</span>}
            {disc > 0 && <span style={{ marginLeft: "auto", fontSize: "var(--fs-11)", fontWeight: 700, color: "var(--accent-2)" }}>−{disc}%</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

window.Profile = Profile;
window.Projects = Projects;
window.Favorites = Favorites;
window.NewProjectModal = NewProjectModal;
window.Today = Today;
window.ProcureHub = ProcureHub;
