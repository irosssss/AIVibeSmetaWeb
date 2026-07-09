/* ============================================================
   Design Ledger — АДМИНКА
   Shell (sidebar) · Дашборд-аналитика (Яндекс Метрика / AppMetrica)
   ============================================================ */
const { useState: useA, useEffect: useAE } = React;

function Admin({ user, onLogout, go }) {
  const [view, setView] = useA("dash");
  const nav = [
    ["dash", "Дашборд", I.chart],
    ["news", "Новости", I.news],
    ["users", "Пользователи", I.users],
  ];
  return (
    <div className="admin-wrap minh-screen" style={{ display: "grid", gridTemplateColumns: "260px 1fr" }}>
      {/* SIDEBAR */}
      <aside className="admin-side" style={{ borderRight: "1px solid var(--hairline)", padding: "24px 18px", display: "flex", flexDirection: "column", gap: 8, position: "sticky", top: 0, height: "100dvh", background: "var(--bg-deep)" }}>
        <div style={{ padding: "6px 10px 20px" }}><Logo size={23} onClick={() => go("site")} /></div>
        <div style={{ fontSize: "var(--fs-11)", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--faint)", padding: "0 12px 8px", fontWeight: 700 }}>Панель управления</div>
        {nav.map(([k, t, Ico]) => {
          const on = view === k;
          return (
            <button key={k} onClick={() => setView(k)} aria-current={on ? "page" : undefined} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, fontSize: "var(--fs-14)", fontWeight: 600, textAlign: "left",
              background: on ? "var(--surface)" : "transparent", color: on ? "var(--text)" : "var(--muted)", borderLeft: on ? "2px solid var(--accent)" : "2px solid transparent", transition: ".2s" }}>
              <Ico size={19} style={{ color: on ? "var(--accent)" : "var(--muted)" }} />{t}
            </button>
          );
        })}
        <div style={{ marginTop: "auto", borderTop: "1px solid var(--hairline)", paddingTop: 16 }}>
          <div className="glass" style={{ borderRadius: 14, padding: 14, display: "flex", alignItems: "center", gap: 11 }}>
            <Avatar user={user} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: "var(--fs-13)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
              <div style={{ fontSize: "var(--fs-12)", color: "var(--accent)" }}>Администратор</div>
            </div>
            <button className="icon-btn" title="Выйти" onClick={onLogout}><I.logout size={17} /></button>
          </div>
        </div>
      </aside>

      {/* CONTENT */}
      <main style={{ padding: "clamp(22px,3vw,40px)", minWidth: 0 }}>
        {view === "dash" && <Dashboard />}
        {view === "news" && <NewsAdmin />}
        {view === "users" && <UsersAdmin />}
      </main>
    </div>
  );
}

/* ------------------------- ДАШБОРД ------------------------- */
function Dashboard() {
  const [data, setData] = useA(null);
  useAE(() => { AIVibeAPI.analytics.overview().then(setData); }, []);

  return (
    <div>
      <PageHead title="Дашборд аналитики" sub="Сводка по Яндекс Метрике и AppMetrica · последние 14 дней"
        right={<div className="glass" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 15px", borderRadius: 99, fontSize: "var(--fs-13)" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-2)" }} />Данные в реальном времени</div>} />

      {/* KPI */}
      <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 18 }}>
        {!data && Array.from({ length: 4 }).map((_, i) => <div key={i} className="glass skel" style={{ borderRadius: "var(--r-lg)", height: 124 }} />)}
        {data && data.kpis.map((k) => <KpiCard key={k.key} k={k} />)}
      </div>

      {/* графики */}
      <div className="chart-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
        <ChartCard title="Визиты в день" source="Яндекс Метрика" accent="var(--chart)">
          {data ? <AreaChart data={data.traffic} color="var(--chart)" id="traffic" /> : <ChartSkel />}
        </ChartCard>
        <ChartCard title="AI-события" source="AppMetrica" accent="var(--info)">
          {data ? <AreaChart data={data.aiEvents} color="var(--info)" id="ai" /> : <ChartSkel />}
        </ChartCard>
      </div>

      <div className="chart-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <ChartCard title="Источники трафика" source="Яндекс Метрика">
          {data ? <div style={{ paddingTop: 8 }}><Donut data={data.sources} /></div> : <ChartSkel />}
        </ChartCard>
        <ChartCard title="Популярные стили дизайна" source="AppMetrica · события">
          {data ? <div style={{ paddingTop: 8 }}><BarList data={data.styles} color="var(--chart)" /></div> : <ChartSkel />}
        </ChartCard>
      </div>
    </div>
  );
}

window.Admin = Admin;
