/* ============================================================
   Design Ledger — НОРМЫ ДИЗАЙНА (редактируемый канон эргономики)
   ------------------------------------------------------------
   Вшитый канон Design Ledger (AIVibeEngine.NORMS) → слой правок пользователя.
   Храним ТОЛЬКО дельту (изменённые поля) в AIVibeAPI.settings.normsOverride —
   обновили эталон, подтянулось всё, что не трогали (модель Style Dictionary).
   UX редактируемых-с-дефолтом значений — из VS Code Settings: бейдж «изменено»,
   Reset у отклонённого, фильтр «только изменённые», вкл/выкл правила.
   Живая проверка справа — тот же движок AIVibeEngine.checkErgonomics.
   ============================================================ */
const { useState: useN, useEffect: useNE } = React;

const N_CANON = (window.AIVibeEngine && AIVibeEngine.NORMS) ||
  { walkwayMin: 70, walkwayComfort: 90, seatToCoffee: { min: 30, max: 45 }, tvComfort: { min: 150, max: 350 }, doorSwing: 90, occupancyWarn: 0.6 };

/* пресеты-базы (в единицах движка; occupancyWarn — доля) */
const N_PRESETS = {
  canon:      N_CANON,
  nkba:       { walkwayMin: 76, walkwayComfort: 107, seatToCoffee: { min: 36, max: 46 }, tvComfort: { min: 200, max: 350 }, doorSwing: 90,  occupancyWarn: 0.55 },
  neufert:    { walkwayMin: 80, walkwayComfort: 100, seatToCoffee: { min: 30, max: 45 }, tvComfort: { min: 180, max: 330 }, doorSwing: 95,  occupancyWarn: 0.60 },
  small:      { walkwayMin: 60, walkwayComfort: 75,  seatToCoffee: { min: 25, max: 40 }, tvComfort: { min: 130, max: 300 }, doorSwing: 80,  occupancyWarn: 0.70 },
  commercial: { walkwayMin: 90, walkwayComfort: 120, seatToCoffee: { min: 35, max: 50 }, tvComfort: { min: 200, max: 400 }, doorSwing: 100, occupancyWarn: 0.50 },
};
const N_PRESET_LABEL = { canon: "канон Design Ledger", nkba: "NKBA", neufert: "Нойферт", small: "малометражка", commercial: "коммерция" };

/* определения строк (диапазоны — в единицах отображения) */
const NORM_DEFS = [
  { key: "walkwayMin",     type: "single",  label: "Минимальный проход",       hint: "Магистральный проход между предметами мебели", unit: "см", min: 50,  max: 130, step: 5 },
  { key: "walkwayComfort", type: "single",  label: "Комфортный проход",         hint: "Свободный проход — «комната дышит»",            unit: "см", min: 60,  max: 150, step: 5 },
  { key: "seatToCoffee",   type: "range",   label: "Диван ↔ журнальный стол",   hint: "Дотянуться до стола, не вставая",               unit: "см", min: 15,  max: 80,  step: 5 },
  { key: "tvComfort",      type: "range",   label: "Диван ↔ ТВ-зона",           hint: "Комфортная дистанция просмотра",                unit: "см", min: 100, max: 450, step: 10 },
  { key: "doorSwing",      type: "single",  label: "Запас на открывание двери", hint: "Радиус распахивания входной двери",             unit: "см", min: 60,  max: 130, step: 5 },
  { key: "occupancyWarn",  type: "percent", label: "Плотность мебели",           hint: "Доля пола под мебелью — выше порога тесно",    unit: "%",  min: 30,  max: 80,  step: 5 },
];

/* пример комнаты для живой проверки (движок сам переведёт % → см) */
const N_ROOM = { w: 4.4, l: 5.2, door: "low-right" };
const N_PLAN = [
  { x: 12, y: 12, w: 50, h: 15, k: "seat",   label: "Диван" },
  { x: 30, y: 52, w: 26, h: 20, k: "rug",    label: "Ковёр" },
  { x: 34, y: 34, w: 16, h: 12, k: "table",  label: "Стол" },
  { x: 12, y: 80, w: 52, h: 8,  k: "media",  label: "ТВ-зона" },
  { x: 74, y: 30, w: 14, h: 26, k: "accent", label: "Кресло" },
];
/* чертёжные цвета мебели (line-art: контур + тинт) — ink-оттенки, как в LAYOUT_K детали проекта */
const N_COL = {
  seat:   { stroke: "#A6431F", fill: "rgba(183,80,44,.12)" },
  table:  { stroke: "#8D6017", fill: "rgba(201,138,46,.14)" },
  media:  { stroke: "#3E4A59", fill: "rgba(62,74,89,.12)" },
  accent: { stroke: "#556150", fill: "rgba(94,107,91,.14)" },
  rug:    { stroke: "rgba(46,42,38,.35)", fill: "transparent", dashed: true },
};

const nClone = (o) => JSON.parse(JSON.stringify(o));
const nEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const disp = (key, v) => key === "occupancyWarn" ? Math.round(v * 100) : v;                 // engine → экран
const store = (key, x) => key === "occupancyWarn" ? Math.round(x) / 100 : Math.round(x);    // экран → engine

/* Чистая логика слоя правок (без React) — её использует компонент ниже, её же
   покрывают юнит-тесты (tests/norms-editor.test.js).
   Контракты счётчиков:
   • modCount — только правки ЗНАЧЕНИЙ (им предупреждает applyPreset — пресеты
     тумблеры не трогают);
   • changedCount — строки, где правка значения ИЛИ выключен тумблер: ровно те же
     строки, что показывает фильтр «Только изменённые». Норма, у которой и правлено
     значение, и выключен тумблер — одна строка, не две. */
const NORMS_LOGIC = {
  // правка значения со связкой walkwayMin ≤ walkwayComfort (мягкий зажим + сноска)
  setKey(override, key, val, canon = N_CANON) {
    const n = { ...override, [key]: val };
    let note = "";
    const minV = key === "walkwayMin" ? val : (("walkwayMin" in n) ? n.walkwayMin : canon.walkwayMin);
    const comfV = key === "walkwayComfort" ? val : (("walkwayComfort" in n) ? n.walkwayComfort : canon.walkwayComfort);
    if (minV > comfV) {
      // зажимаем ТОЛЬКО при правке одной из walkway-норм: если нарушенная пара уже
      // лежала в сторе (сброс комфорта при поднятом минимуме), правка НЕСВЯЗАННОЙ
      // нормы не должна молча переписывать чужой порог (находка код-ревью 12.07)
      if (key === "walkwayMin") { n.walkwayComfort = minV; note = "Комфортный проход подтянут до " + minV + " см — он не бывает меньше минимального."; }
      else if (key === "walkwayComfort") { n.walkwayMin = comfV; note = "Минимальный проход опущен до " + comfV + " см — он не бывает больше комфортного."; }
    }
    return { override: n, note };
  },
  resetKey(override, key) { const n = { ...override }; delete n[key]; return n; },
  toggleKey(enabled, key) { return { ...enabled, [key]: enabled[key] === false ? true : false }; },
  resetAll() { return { override: {}, enabled: {}, baseKey: "canon" }; },
  // только реальные нормы: мусорный/устаревший ключ в сохранённом override не должен
  // расщеплять счётчики (confirm пресета видит «1 изменённый», а футер — «всё по канону»)
  modCount: (override) => NORM_DEFS.filter((d) => d.key in override).length,
  changedCount: (override, enabled) => NORM_DEFS.filter((d) => (d.key in override) || enabled[d.key] === false).length,
};
window.AIVibeNormsLogic = NORMS_LOGIC;   // наружу — для юнит-тестов

function NormsSettings() {
  const [loaded, setLoaded] = useN(false);
  const [override, setOverride] = useN({});
  const [enabled, setEnabled] = useN({});
  const [baseKey, setBaseKey] = useN("canon");
  const [onlyMod, setOnlyMod] = useN(false);
  const [saved, setSaved] = useN(true);
  const [justSaved, setJustSaved] = useN(false);  // success-пульс 2.2с после сохранения
  const [linkNote, setLinkNote] = useN("");        // сноска о мягком зажиме связанных порогов

  const reveal = useReveal();     // хук — до любого раннего return (Rules of Hooks)

  useNE(() => {
    AIVibeAPI.settings.get().then((s) => {
      setOverride((s && s.normsOverride) || {});
      setEnabled((s && s.enabledNorms) || {});
      setLoaded(true);
    });
  }, []);

  const eff = (key) => (key in override ? override[key] : N_CANON[key]);
  const isMod = (key) => key in override;
  const on = (key) => enabled[key] !== false;

  const setKey = (key, val) => {
    setOverride((o) => {
      // связанная пара walkwayMin ≤ walkwayComfort — мягкий зажим + сноска (NORMS_LOGIC)
      const r = NORMS_LOGIC.setKey(o, key, val);
      if (r.note) setLinkNote(r.note);
      return r.override;
    });
    setSaved(false);
  };
  useNE(() => { if (!linkNote) return; const t = setTimeout(() => setLinkNote(""), 4200); return () => clearTimeout(t); }, [linkNote]);
  const resetKey = (key) => { setOverride((o) => NORMS_LOGIC.resetKey(o, key)); setSaved(false); };
  const toggleKey = (key) => { setEnabled((e) => NORMS_LOGIC.toggleKey(e, key)); setSaved(false); };
  const resetAll = () => { const r = NORMS_LOGIC.resetAll(); setOverride(r.override); setEnabled(r.enabled); setBaseKey(r.baseKey); setSaved(false); };
  const applyPreset = async (key) => {
    // не затираем ручные правки молча — подтверждение (ошибка объясняет последствие)
    if (modCount > 0 && key !== baseKey) {
      const ok = await confirmDialog({
        title: "Заполнить из пресета?",
        text: "У вас " + modCount + " " + plural(modCount, ["изменённый порог", "изменённых порога", "изменённых порогов"]) + " — база «" + (N_PRESET_LABEL[key] || key) + "» перезапишет их значениями пресета.",
        confirmLabel: "Заполнить", cancelLabel: "Оставить мои",
      });
      if (!ok) return;
    }
    setBaseKey(key);
    const p = N_PRESETS[key], ov = {};
    NORM_DEFS.forEach((d) => { if (!nEq(p[d.key], N_CANON[d.key])) ov[d.key] = nClone(p[d.key]); });
    setOverride(ov); setSaved(false);
  };
  const save = () => {
    AIVibeAPI.settings.update({ normsOverride: override, enabledNorms: enabled }).then(() => {
      setSaved(true);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2200);
    });
  };

  const modCount = NORMS_LOGIC.modCount(override);                 // контракты счётчиков — см. NORMS_LOGIC
  const changedCount = NORMS_LOGIC.changedCount(override, enabled);
  const effNorms = { ...override, enabled };
  const check = (window.AIVibeEngine && loaded) ? AIVibeEngine.checkErgonomics({ plan: N_PLAN }, N_ROOM, effNorms) : { findings: [], warns: 0, ok: true };
  const okN = check.findings.filter((f) => f.kind === "plus").length;
  const warnN = check.warns;

  if (!loaded) return <div className="glass skel" style={{ borderRadius: "var(--r-lg)", height: 420 }} />;

  return (
    <div className="reveal in" ref={reveal}>
      <PageHead eyebrow="Нормы дизайна" eyebrowIcon="sliders" title="Правила эргономики"
        sub="Вшитый канон Design Ledger (NKBA / Нойферт) работает по умолчанию — здесь вы подстраиваете пороги под себя. Слой правок ложится поверх канона, хранится только отличие. Проверка проектов сразу считает по этим нормам."
        style={{ marginBottom: 8 }} />

      {/* тулбар */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", margin: "22px 0 16px" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "var(--fs-13)", color: "var(--muted)" }}>
          Заполнить из:
          <select value={baseKey} onChange={(e) => applyPreset(e.target.value)} className="fld" style={{ width: "auto", padding: "8px 12px", fontSize: "var(--fs-13)", fontWeight: 700, cursor: "pointer" }}>
            <option value="canon">Канон Design Ledger</option>
            <option value="nkba">NKBA (США)</option>
            <option value="neufert">Нойферт (ЕС)</option>
            <option value="small">Малометражка</option>
            <option value="commercial">Коммерция</option>
          </select>
        </label>
        <div style={{ flex: 1 }} />
        <button onClick={() => setOnlyMod((v) => !v)} aria-pressed={onlyMod} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 99, fontSize: "var(--fs-13)", fontWeight: 700,
          border: "1px solid " + (onlyMod ? "var(--accent)" : "var(--hairline)"), background: onlyMod ? "var(--accent-tint)" : "var(--surface)", color: onlyMod ? "var(--accent-ink)" : "var(--muted)" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "currentColor" }} />Только изменённые
        </button>
      </div>

      <div className="norms-layout" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 22, alignItems: "start" }}>
        {/* строки-правила */}
        <div className="glass" style={{ borderRadius: "var(--r-lg)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: "1px solid var(--hairline)" }}>
            <h3 style={{ fontSize: "var(--fs-15)", fontWeight: 700 }}>Пороги эргономики</h3>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-12)", color: "var(--faint)" }}>{changedCount ? changedCount + " изменено" : "всё по канону"}</span>
          </div>

          {linkNote && (
            <div role="status" style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 22px", fontSize: "var(--fs-13)", color: "var(--info)", background: "rgba(62,74,89,.07)", borderBottom: "1px solid var(--hairline-2)" }}>
              <I.info size={15} style={{ flex: "none" }} />{linkNote}
            </div>
          )}
          {/* «Только изменённые» обязан считать изменением и выключенный тумблер, не только
              правку значения — иначе выключение «Минимального прохода» прячет саму строку,
              а связанная залоченная строка «Комфортного» остаётся с подсказкой «включите
              его выше», указывающей в пустоту */}
          {NORM_DEFS.filter((d) => !onlyMod || isMod(d.key) || !on(d.key)).map((d) => {
            // «Комфортный проход» по контракту движка (engine.js) считается только внутри
            // блока «Минимального прохода» — выключенный минимум молча гасит и комфорт.
            // Показываем эту связку явно тумблером, а не тихим расхождением UI↔движок.
            const locked = d.key === "walkwayComfort" && !on("walkwayMin");
            return (
              <NormRow key={d.key} def={d} value={eff(d.key)} modified={isMod(d.key)} enabled={on(d.key)} locked={locked}
                onChange={(v) => setKey(d.key, v)} onReset={() => resetKey(d.key)} onToggle={() => toggleKey(d.key)} />
            );
          })}
          {onlyMod && changedCount === 0 && (
            <div style={{ padding: "34px 22px", textAlign: "center", color: "var(--muted)", fontSize: "var(--fs-14)" }}>Пока ничего не изменено — все нормы по канону Design Ledger.</div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "14px 22px", borderTop: "1px solid var(--hairline)", background: justSaved ? "var(--accent-2-tint)" : saved ? "transparent" : "rgba(183,80,44,.05)", transition: "background .3s" }}>
            <div className={justSaved ? "save-pulse" : ""} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: "var(--fs-13)", color: justSaved ? "var(--accent-2)" : "var(--muted)", fontWeight: justSaved ? 700 : 400 }}>
              {justSaved
                ? <I.check size={15} />
                : <span style={{ width: 8, height: 8, borderRadius: "50%", background: saved ? "var(--faint)" : "var(--accent)" }} />}
              {saved ? (changedCount ? "Сохранено · мой канон" : "Всё по канону") : "Есть несохранённые правки"}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" style={{ padding: "10px 16px" }} onClick={resetAll} disabled={changedCount === 0}>Сбросить всё</button>
              <button className="btn btn-primary" style={{ padding: "10px 18px" }} onClick={save} disabled={saved}>{saved ? "Сохранено" : "Сохранить"}</button>
            </div>
          </div>
        </div>

        {/* живая проверка */}
        <aside className="norms-aside" style={{ position: "sticky", top: "calc(var(--nav-h) + 20px)" }}>
          <div className="glass" style={{ borderRadius: "var(--r-lg)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--hairline)" }}>
              <h3 style={{ fontSize: "var(--fs-15)", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-2)" }} />Проверка на примере
              </h3>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-11)", color: "var(--faint)" }}>Гостиная · 4.4×5.2 м</span>
            </div>
            <div style={{ padding: "18px 20px 20px" }}>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <NormsMiniPlan />
                <div style={{ flex: 1 }}>
                  <div className="display" style={{ fontSize: "var(--fs-32)", lineHeight: 1, color: warnN === 0 ? "var(--accent-2)" : "var(--accent)" }}>{warnN === 0 ? "OK" : warnN}</div>
                  <div style={{ fontSize: "var(--fs-12)", color: "var(--muted)", marginTop: 4 }}>{warnN === 0 ? "по нормам" : plural(warnN, ["замечание", "замечания", "замечаний"])}</div>
                  <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
                    <div style={{ fontSize: "var(--fs-12)" }}><div style={{ fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: "var(--fs-18)", color: "var(--accent-2)" }}>{okN}</div>в норме</div>
                    <div style={{ fontSize: "var(--fs-12)" }}><div style={{ fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: "var(--fs-18)", color: "var(--accent)" }}>{warnN}</div>{plural(warnN, ["замечание", "замечания", "замечаний"])}</div>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 18 }}>
                {check.findings.map((f, i) => (
                  <div key={i} className={"find " + (f.kind === "plus" ? "plus" : "warn")}>
                    <span className="fi">{f.kind === "plus" ? <I.check size={14} /> : <I.info size={14} />}</span>
                    <span style={{ fontSize: "var(--fs-13)", lineHeight: 1.45, color: "var(--text)" }}>{f.text}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--hairline-2)", fontSize: "var(--fs-12)", color: "var(--muted)" }}>
                Меняете порог — проверка пересчитывается сразу. Эти же нормы применяются в проверке ваших проектов.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* строка-правило: слайдер/степперы + бейдж + reset + вкл/выкл.
   locked — правило технически выключено связкой (см. вызывающий код), а не своим тумблером:
   тумблер и контролы заблокированы, подпись объясняет причину вместо тихого расхождения с движком. */
function NormRow({ def, value, modified, enabled, locked, onChange, onReset, onToggle }) {
  const active = enabled && !locked;
  const clamp = (x) => Math.max(def.min, Math.min(def.max, Math.round(x / def.step) * def.step));
  const setSingle = (x) => onChange(store(def.key, clamp(x)));
  const setPart = (part, x) => {
    const cur = nClone(value); const v = clamp(x);
    cur[part] = v;
    if (part === "min" && cur.min > cur.max) cur.max = cur.min;
    if (part === "max" && cur.max < cur.min) cur.min = cur.max;
    onChange(cur);
  };
  const d1 = def.type === "range" ? null : disp(def.key, value);
  const canonDisp = def.type === "range"
    ? disp(def.key, N_CANON[def.key].min) + "–" + disp(def.key, N_CANON[def.key].max)
    : "" + disp(def.key, N_CANON[def.key]);
  return (
    <div className="norm-row" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "14px 20px", alignItems: "start", padding: "18px 22px", borderBottom: "1px solid var(--hairline-2)", opacity: active ? 1 : 0.45 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "var(--fs-15)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {def.label}
          {modified
            ? <span style={{ fontSize: "var(--fs-11)", fontWeight: 600, padding: "2px 9px", borderRadius: 99, background: "rgba(183,80,44,.14)", color: "var(--accent-ink)" }}>изменено</span>
            : <span style={{ fontSize: "var(--fs-11)", fontWeight: 600, padding: "2px 9px", borderRadius: 99, background: "var(--surface-2)", color: "var(--faint)" }}>по канону</span>}
        </div>
        <div style={{ color: locked ? "var(--accent-ink)" : "var(--muted)", fontSize: "var(--fs-13)", marginTop: 3 }}>
          {locked ? "Считается только вместе с «Минимальным проходом» — включите его выше." : def.hint}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-11)", color: "var(--faint)", marginTop: 6 }}>
          {modified ? "источник: мой канон" : "дефолт: канон Design Ledger · " + canonDisp + " " + def.unit}
        </div>
      </div>
      <div className="norm-ctrl" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, minWidth: 230 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {def.type === "range" ? (
            <React.Fragment>
              <Stepper value={disp(def.key, value.min)} step={def.step} onSet={(x) => setPart("min", x)} disabled={!active} />
              <span style={{ color: "var(--faint)", fontFamily: "var(--font-mono)" }}>–</span>
              <Stepper value={disp(def.key, value.max)} step={def.step} onSet={(x) => setPart("max", x)} disabled={!active} />
            </React.Fragment>
          ) : (
            <React.Fragment>
              <input type="range" min={def.min} max={def.max} step={def.step} value={d1} disabled={!active}
                onChange={(e) => setSingle(+e.target.value)} style={{ width: 150, accentColor: "var(--accent)", cursor: "pointer" }} />
              <Stepper value={d1} step={def.step} onSet={setSingle} disabled={!active} />
            </React.Fragment>
          )}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-12)", color: "var(--faint)", minWidth: 18 }}>{def.unit}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {modified && <button onClick={onReset} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-mono)", fontSize: "var(--fs-11)", color: "var(--muted)", border: "1px solid var(--hairline)", borderRadius: 99, padding: "5px 10px" }}>↺ сброс</button>}
          <Switch on={active} disabled={locked} onChange={onToggle}
            title={locked ? "Заблокировано — включите «Минимальный проход»" : (enabled ? "Выключить правило" : "Включить правило")}
            ariaLabel={"Правило «" + def.label + "»"} />
        </div>
      </div>
    </div>
  );
}

function Stepper({ value, step, onSet, disabled }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", background: "var(--surface-2)", border: "1px solid var(--hairline)", borderRadius: 10, overflow: "hidden", opacity: disabled ? 0.5 : 1 }}>
      <button onClick={() => onSet(value - step)} disabled={disabled} style={{ width: 30, height: 34, fontSize: "var(--fs-16)", color: "var(--muted)" }}>−</button>
      <input value={value} disabled={disabled} inputMode="numeric" onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) onSet(v); }}
        style={{ width: 48, height: 34, border: "none", textAlign: "center", background: "transparent", fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: "var(--fs-14)", color: "var(--text)" }} />
      <button onClick={() => onSet(value + step)} disabled={disabled} style={{ width: 30, height: 34, fontSize: "var(--fs-16)", color: "var(--muted)" }}>+</button>
    </span>
  );
}

/* мини-план комнаты — чертёжный язык, как FloorPlan/MiniLayout в детали проекта */
function NormsMiniPlan() {
  return (
    <div className="plan-box" style={{ position: "relative", width: 132, height: 160, flex: "none" }}>
      <span className="pl-win" style={{ left: "26%", width: "48%" }} />
      <span className="pl-door" style={{ right: "6%", width: "24%" }} />
      {N_PLAN.map((b, i) => {
        const k = N_COL[b.k] || N_COL.table;
        return (
          <span key={i} title={b.label} style={{ position: "absolute", left: b.x + "%", top: b.y + "%", width: b.w + "%", height: b.h + "%",
            borderRadius: 2, background: k.fill, border: (k.dashed ? "1.1px dashed " : "1.2px solid ") + k.stroke }} />
        );
      })}
    </div>
  );
}

window.NormsSettings = NormsSettings;