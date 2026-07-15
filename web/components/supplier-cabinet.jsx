/* ============================================================
   Design Ledger — КАБИНЕТ ПОСТАВЩИКА (портал поставщиков, срез 3)
   ------------------------------------------------------------
   ОТДЕЛЬНОЕ рабочее место для роли «поставщик» (выбор при регистрации):
   не дизайнерский кабинет. Три раздела:
   · Спрос     — статистика: какие его товары дизайнеры чаще ставят в сметы
                 (FFE.supplierStats по имени компании = user.supplierName);
   · Мои товары — каталог поставщика (артикул, варианты цвета, габариты, цена):
                 переиспользует ProductEditor/ProductCard, стор LedgerAPI.supplierCatalog;
   · Профиль   — компания + честный статус модерации (Programa-модель «approval»).
   Роутинг — лёгкий: #cabinet/<tab>, но с валидацией по SUP_TABS (свои id, не
   дизайнерские CAB_TABS). Персистенция — вся за LedgerAPI (localStorage), точки
   замены помечены → API. Денег дизайнера в «Спросе» нет по инварианту (тайна и
   от поставщика) — сводку считает FFE.supplierStats, где сумм/наценки нет.
   ============================================================ */
const { useState: useSC, useEffect: useSCE } = React;

const SUP_TABS = [["demand", "Спрос", "chart"], ["catalog", "Мои товары", "sofa"], ["profile", "Профиль", "user"]];
const SUP_TAB_IDS = SUP_TABS.map((t) => t[0]);

function SupplierCabinet({ user, onLogout, go }) {
  const r0 = parseRoute();
  const [tab, setTab] = useSC(() => (SUP_TAB_IDS.includes(r0.tab) ? r0.tab : "demand"));
  useSCE(() => {
    const on = () => { const r = parseRoute(); if (r.view === "cabinet") setTab(SUP_TAB_IDS.includes(r.tab) ? r.tab : "demand"); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  useSCE(() => { const r = parseRoute(); if (!SUP_TAB_IDS.includes(r.tab)) applyRoute("cabinet", "demand"); }, []);
  const change = (t) => { setTab(t); applyRoute("cabinet", t); };

  return (
    <div className="minh-screen" style={{ display: "flex", flexDirection: "column" }}>
      {/* шапка — визуально ИНОЙ хром, чем дизайнерский сайдбар: горизонтальная,
          с идентичностью компании и явной плашкой роли «Поставщик» */}
      <header style={{ borderBottom: "1px solid var(--hairline)", background: "var(--surface)", position: "sticky", top: 0, zIndex: 20 }}>
        <div className="container" style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", flexWrap: "wrap" }}>
          <Logo size={24} onClick={() => go("site")} />
          <span className="mono" style={{ fontSize: "var(--fs-11)", fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--accent)", background: "var(--accent-tint, var(--glass-2))", padding: "3px 9px", borderRadius: 99, border: "1px solid var(--hairline)" }}>Кабинет поставщика</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: "50%", background: user.avatar || "#7A5C3E", display: "grid", placeItems: "center", color: "#fff", fontWeight: 700, fontSize: "var(--fs-12)" }}>{(user.name || "П").slice(0, 1)}</span>
              <span style={{ fontSize: "var(--fs-13)", fontWeight: 600, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</span>
            </span>
            <button className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: "var(--fs-13)" }} onClick={onLogout}>Выйти</button>
          </div>
        </div>
        <div className="container" style={{ display: "flex", gap: 4, paddingBottom: 0 }}>
          {SUP_TABS.map(([k, t, ic]) => (
            <button key={k} onClick={() => change(k)} aria-current={tab === k ? "page" : undefined}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 16px", fontSize: "var(--fs-14)", fontWeight: 600,
                color: tab === k ? "var(--text)" : "var(--muted)", borderBottom: "2px solid " + (tab === k ? "var(--accent)" : "transparent"), marginBottom: -1 }}>
              {I[ic] && React.createElement(I[ic], { size: 16 })}{t}
            </button>
          ))}
        </div>
      </header>

      <main className="container" style={{ paddingBlock: "clamp(24px,4vw,40px)", flex: 1 }}>
        {tab === "demand" && <SupplierDemand user={user} onGoCatalog={() => change("catalog")} />}
        {tab === "catalog" && <SupplierCatalog user={user} />}
        {tab === "profile" && <SupplierProfile user={user} />}
      </main>
    </div>
  );
}

/* честная плашка модерации (Programa-модель «Submit for approval»): каталог станет
   виден дизайнерам после одобрения; пока — демо-режим на данных этого прототипа */
function ModerationBanner() {
  return (
    <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: "14px 18px", borderLeft: "3px solid var(--accent)", marginBottom: 22 }}>
      <p style={{ fontSize: "var(--fs-13)", lineHeight: 1.6, color: "var(--muted)" }}>
        <strong style={{ color: "var(--text)" }}>Аккаунт на модерации.</strong> Так устроено подключение: после проверки ваш
        каталог станет виден дизайнерам, и они смогут ставить товары в сметы. Сейчас — превью на демо-данных, чтобы вы увидели,
        как выглядит кабинет. <a href="#for-suppliers" style={{ color: "var(--accent-2)" }}>Как это работает</a>.
      </p>
    </div>
  );
}

/* ---------------- РАЗДЕЛ «СПРОС» (дашборд статистики) ----------------
   Какие товары поставщика дизайнеры чаще ставят в сметы. Формула Programa
   «Specified, not just seen». Данные — FFE.supplierStats по имени компании. */
function SupplierDemand({ user, onGoCatalog }) {
  const [stats, setStats] = useSC(null);
  useSCE(() => {
    const F = window.LedgerFFE;
    LedgerAPI.projects.list()
      .then((ps) => Promise.all(ps.map((p) => LedgerAPI.projects.get(p.id))))
      .then((projects) => {
        const shares = F && F.listPortalShares ? F.listPortalShares() : [];
        setStats(F && F.supplierStats ? F.supplierStats(projects, shares, user.supplierName || user.name) : null);
      });
  }, [user]);

  const kpi = (label, value, hint) => (
    <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: "18px 20px", flex: 1, minWidth: 150 }} title={hint}>
      <div className="mono" style={{ fontSize: "var(--fs-26)", fontWeight: 700, color: "var(--accent-2)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{value}</div>
      <div style={{ fontSize: "var(--fs-13)", color: "var(--muted)", marginTop: 4 }}>{label}</div>
    </div>
  );

  return (
    <div className="reveal in" ref={useReveal()}>
      <ModerationBanner />
      <PageHead eyebrow="Спрос" eyebrowIcon="chart" title="Ваши товары в сметах дизайнеров"
        sub="Сколько раз дизайнеры добавили ваши товары в сметы клиентам, что согласовано и ушло клиенту. Показываем спецификации, а не показы. Цен и наценки дизайнера здесь нет — это его тайна." />

      {!stats && <div className="proj-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="glass skel" style={{ borderRadius: "var(--r-lg)", height: 96 }} />)}</div>}

      {stats && stats.positions === 0 && (
        <EmptyState icon="chart" title="Спроса пока нет"
          text="Ваши товары ещё не встречаются в сметах дизайнеров. Как только они начнут добавлять их в проекты, здесь появится статистика: какие позиции ставят чаще, что согласуют клиенты."
          action={<button className="btn btn-primary" onClick={onGoCatalog}><I.sofa size={16} />Наполнить каталог</button>} />
      )}

      {stats && stats.positions > 0 && (
        <React.Fragment>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 26 }}>
            {kpi("в сметах" + (stats.qty > stats.positions ? " · ×" + stats.qty + " шт" : ""), stats.positions, "Позиций ваших товаров в сметах дизайнеров")}
            {kpi("проектов", stats.projects, "В скольких проектах есть ваши товары")}
            {kpi("согласовано клиентом", stats.approved, "Позиций, одобренных клиентами дизайнеров")}
            {kpi("ушло клиентам", stats.shared, "Ссылок-презентаций клиентам, где есть ваши товары")}
          </div>

          <h3 className="display" style={{ fontSize: "var(--fs-18)", marginBottom: 12 }}>Что ставят чаще</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stats.products.map((p, i) => {
              const max = stats.products[0].positions || 1;
              return (
                <div key={i} className="glass" style={{ borderRadius: "var(--r-lg)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                  <span className="mono" style={{ flex: "none", width: 22, textAlign: "right", color: "var(--muted)", fontSize: "var(--fs-13)" }}>{i + 1}</span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: "block", fontWeight: 600, fontSize: "var(--fs-14)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title || "Без названия"}</span>
                    {p.sku && <span className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--muted)" }}>арт. {p.sku}</span>}
                    {/* полоска спроса — доля от самого популярного */}
                    <span aria-hidden="true" style={{ display: "block", height: 4, borderRadius: 99, background: "var(--glass-2)", marginTop: 6, overflow: "hidden" }}>
                      <span style={{ display: "block", height: "100%", width: Math.round((p.positions / max) * 100) + "%", background: "var(--accent-2)" }} />
                    </span>
                  </span>
                  <span className="mono" style={{ flex: "none", textAlign: "right", fontSize: "var(--fs-12)", color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                    {p.positions} поз. · ×{p.qty}{p.approved ? " · согл. " + p.approved : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </React.Fragment>
      )}
    </div>
  );
}

/* ---------------- РАЗДЕЛ «МОИ ТОВАРЫ» (каталог поставщика) ----------------
   Переиспользует ProductCard/ProductEditor (window, срез 1) со стором
   LedgerAPI.supplierCatalog и supplierMode (без поля «Поставщик»/фид). */
function SupplierCatalog() {
  const [rows, setRows] = useSC(null);
  const [edit, setEdit] = useSC(null);
  const [q, setQ] = useSC("");
  const [cat, setCat] = useSC("");   // активный фильтр по разделу ("" = все)
  const [seeding, setSeeding] = useSC(false);
  const api = LedgerAPI.supplierCatalog;
  const reload = () => api.list().then(setRows);
  useSCE(() => { reload(); }, []);

  const createNew = () => setEdit(window.libBlankDraft());
  // наполнить пустой каталог демо-товарами (паттерн K4): последовательный await —
  // create штампует id по Date.now()+rand, но последовательность надёжнее против гонок
  const seedDemo = async () => {
    if (seeding) return;
    const demo = (window.LedgerFFE && window.LedgerFFE.DEMO_SUPPLIER_CATALOG) || [];
    if (!demo.length) return;
    setSeeding(true);
    try { for (const p of demo) await api.create(p); await reload(); toast("Добавлено демо-товаров: " + demo.length); }
    catch { toast("Не удалось добавить демо-товары — попробуйте ещё раз.", "warn"); }
    finally { setSeeding(false); }
  };
  const remove = async (id) => {
    const p = (rows || []).find((x) => x.id === id);
    const ok = await confirmDialog({ title: "Убрать товар из каталога?", text: "«" + ((p && p.title) || "Товар") + "» исчезнет из вашего каталога.", confirmLabel: "Убрать" });
    if (!ok) return;
    await api.remove(id); reload(); toast("Товар убран из каталога");
  };

  const norm = (s) => (s || "").toLowerCase();
  const all = (rows || []).slice().sort((a, b) => (a.title || "").localeCompare(b.title || "", "ru"));
  // разделы для фильтра — из самих товаров (с числом в каждом), алфавит
  const catList = Array.from(all.reduce((m, p) => m.set(p.cat || "Прочее", (m.get(p.cat || "Прочее") || 0) + 1), new Map()))
    .sort((a, b) => a[0].localeCompare(b[0], "ru"));
  // выбранный раздел исчез (удалили последний товар в нём) — молча возвращаемся ко «Всем»
  const activeCat = cat && catList.some(([c]) => c === cat) ? cat : "";
  const qq = norm(q.trim());
  const shown = all
    .filter((p) => !activeCat || (p.cat || "Прочее") === activeCat)
    .filter((p) => !qq || [p.title, p.cat, p.brand, p.article].some((f) => norm(f).includes(qq)));

  return (
    <div className="reveal in" ref={useReveal()}>
      <PageHead eyebrow="Каталог" eyebrowIcon="sofa" title={"Мои товары" + (all.length ? " · " + all.length : "")}
        sub="То, что вы предлагаете дизайнерам: артикул, варианты цвета со своим артикулом, габариты и цена. После модерации каталог станет доступен дизайнерам в подборе."
        right={<button className="btn btn-primary" onClick={createNew}><I.plus size={17} />Добавить товар</button>} />

      {!rows && <div className="proj-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>{Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass skel" style={{ borderRadius: "var(--r-lg)", height: 150 }} />)}</div>}

      {rows && all.length === 0 && (
        <EmptyState icon="sofa" title="В каталоге пока пусто"
          text="Добавьте товары, которые предлагаете дизайнерам: с артикулом, вариантами цвета и габаритами. Можно начать с демо-набора и отредактировать под себя."
          action={
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <button className="btn btn-primary" onClick={createNew}><I.plus size={17} />Добавить первый товар</button>
              <button className="btn btn-ghost" onClick={seedDemo} disabled={seeding}><I.sofa size={16} />{seeding ? "Добавляем…" : "Демо-товары"}</button>
            </div>
          } />
      )}

      {rows && all.length > 0 && (
        <React.Fragment>
          <SearchField value={q} onChange={setQ} placeholder="Поиск: название, раздел, бренд, артикул" ariaLabel="Поиск по каталогу" style={{ maxWidth: 360, marginBottom: 14 }} />

          {/* фильтр по разделам — чипы (раздел · число). Один раздел — фильтр не нужен */}
          {catList.length > 1 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }} role="group" aria-label="Фильтр по разделам">
              {[["", "Все · " + all.length], ...catList.map(([c, n]) => [c, c + " · " + n])].map(([val, label]) => {
                const on = activeCat === val;
                return (
                  <button key={val || "__all"} onClick={() => setCat(val)} aria-pressed={on}
                    style={{ padding: "6px 13px", fontSize: "var(--fs-13)", fontWeight: 600, borderRadius: 99,
                      background: on ? "var(--accent-2-tint)" : "transparent", color: on ? "var(--accent-2-ink)" : "var(--muted)",
                      border: "1px solid " + (on ? "rgba(94,107,91,.4)" : "var(--hairline)"), transition: "var(--dur-fast)" }}>
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {shown.length === 0
            ? <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", padding: "8px 2px" }}>
                {qq ? "По запросу «" + q.trim() + "»" : "В разделе «" + activeCat + "»"} ничего не нашлось.
              </p>
            : (
              <div className="proj-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
                {shown.map((p) => <ProductCard key={p.id} p={p} onEdit={() => setEdit(window.libToDraft(p))} onRemove={() => remove(p.id)} />)}
              </div>
            )}
        </React.Fragment>
      )}

      {edit && <ProductEditor draft={edit} api={api} supplierMode onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </div>
  );
}

/* ---------------- РАЗДЕЛ «ПРОФИЛЬ» ---------------- */
function SupplierProfile({ user }) {
  return (
    <div className="reveal in" ref={useReveal()} style={{ maxWidth: 640 }}>
      <PageHead eyebrow="Профиль" eyebrowIcon="user" title="Компания" sub="Данные, которые видят дизайнеры рядом с вашими товарами." />
      <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        {[["Компания", user.name], ["Город", user.city], ["Email", user.email], ["Вход через", user.provider === "yandex" ? "Яндекс ID" : user.provider === "vk" ? "VK ID" : "—"]].map(([l, v]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid var(--hairline)", paddingBottom: 12 }}>
            <span style={{ color: "var(--muted)", fontSize: "var(--fs-13)" }}>{l}</span>
            <span style={{ fontSize: "var(--fs-14)", fontWeight: 600, textAlign: "right" }}>{v || "—"}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <span style={{ color: "var(--muted)", fontSize: "var(--fs-13)" }}>Статус</span>
          <span className="mono" style={{ fontSize: "var(--fs-12)", fontWeight: 700, color: "var(--accent)", background: "var(--glass-2)", padding: "4px 10px", borderRadius: 99, border: "1px solid var(--hairline)" }}>На модерации</span>
        </div>
      </div>
      <p style={{ fontSize: "var(--fs-12)", color: "var(--muted)", lineHeight: 1.6, marginTop: 16 }}>
        Редактирование профиля и вход по e-mail появятся вместе с реальной авторизацией поставщиков — сейчас это демо-режим (вход через Яндекс/VK как у дизайнеров, роль выбирается при регистрации).
      </p>
    </div>
  );
}

window.SupplierCabinet = SupplierCabinet;
