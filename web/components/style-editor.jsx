/* ============================================================
   Design Ledger — БИБЛИОТЕКА СТИЛЕЙ (редактировать / создавать свои)
   ------------------------------------------------------------
   Единый реестр LedgerAPI.styles заменяет три хардкода. Системные пресеты
   (owner:null) — read-only база; «Дублировать» форкает в свой (Shopify «Copy of…»),
   «Создать» — с нуля. Стиль = палитра + материалы + уровень декора + бюджет-factor,
   применяется к смете по id (правишь стиль — смета пересчитывается).
   ============================================================ */
const { useState: useS, useEffect: useSE } = React;

const DECOR = [["min", "Минимум"], ["mid", "Середина"], ["rich", "Насыщенно"]];
const DECOR_LABEL = { min: "Минимум декора", mid: "Средний декор", rich: "Насыщенный декор" };
const factorDelta = (f) => { const d = Math.round(((f || 1) - 1) * 100); return d === 0 ? "базовый бюджет" : d > 0 ? "≈ дороже на " + d + "%" : "≈ дешевле на " + Math.abs(d) + "%"; };

function StylesLibrary() {
  const [rows, setRows] = useS(null);
  const [edit, setEdit] = useS(null);       // редактируемый/создаваемый стиль (draft) | null
  const reload = () => LedgerAPI.styles.list().then(setRows);
  useSE(() => { reload(); }, []);

  const duplicate = async (id) => { const c = await LedgerAPI.styles.duplicate(id); await reload(); if (c) setEdit(c); };
  const remove = async (id) => {
    const s = (rows || []).find((x) => x.id === id);
    const ok = await confirmDialog({ title: "Удалить стиль?", text: "«" + ((s && s.name) || "Стиль") + "» исчезнет из библиотеки. Проекты, где он был выбран, вернутся к базовому стилю — цены пересчитаются.", confirmLabel: "Удалить стиль" });
    if (!ok) return;
    await LedgerAPI.styles.remove(id); reload(); toast("Стиль удалён");
  };
  const createNew = () => setEdit({ __new: true, name: "", owner: "me", mood: "", desc: "", palette: ["#C57B57", "#E7D3C0", "#8A8175", "#2E2A28"], materials: ["дерево", "ткань", "металл"], decorLevel: "mid", factor: 1.0 });

  const system = rows ? rows.filter((s) => s.owner === null) : [];
  const mine = rows ? rows.filter((s) => s.owner !== null) : [];

  return (
    <div className="reveal in" ref={useReveal()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap", gap: 14 }}>
        <div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-12)", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 9 }}>
            <I.spark size={15} />Библиотека стилей
          </span>
          <h1 className="display" style={{ fontSize: "var(--fs-30)", marginTop: 10 }}>Мои стили</h1>
          <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", marginTop: 8, maxWidth: 640, lineHeight: 1.6 }}>
            Системные пресеты — основа (только чтение). Дублируйте любой в свой и правьте палитру, материалы, уровень декора и класс бюджета — или соберите стиль с нуля. Стиль применяется к смете и влияет на подбор.
          </p>
        </div>
        <button className="btn btn-primary" onClick={createNew}><I.plus size={17} />Создать стиль</button>
      </div>

      {!rows && <div className="proj-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass skel" style={{ borderRadius: "var(--r-lg)", height: 210 }} />)}</div>}

      {mine.length > 0 && (
        <React.Fragment>
          <SectionLabel icon={I.user} text={"Мои стили · " + mine.length} />
          <div className="proj-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16, marginBottom: 30 }}>
            {mine.map((s) => <StyleLibCard key={s.id} s={s} onEdit={() => setEdit(s)} onDuplicate={() => duplicate(s.id)} onRemove={() => remove(s.id)} />)}
          </div>
        </React.Fragment>
      )}

      {rows && <SectionLabel icon={I.layers} text={"Системные пресеты · " + system.length} sub="read-only база" />}
      <div className="proj-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
        {system.map((s) => <StyleLibCard key={s.id} s={s} system onDuplicate={() => duplicate(s.id)} />)}
      </div>

      {edit && <StyleEditor draft={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </div>
  );
}

function SectionLabel({ icon: Ico, text, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, margin: "6px 2px 14px", flexWrap: "wrap" }}>
      <Ico size={17} style={{ color: "var(--accent)", flex: "none" }} />
      <h2 style={{ fontSize: "var(--fs-16)", fontWeight: 700 }}>{text}</h2>
      {sub && <span style={{ fontSize: "var(--fs-12)", fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)" }}>· {sub}</span>}
    </div>
  );
}

function StyleLibCard({ s, system, onEdit, onDuplicate, onRemove }) {
  return (
    <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontFamily: "var(--font-display)", fontSize: "var(--fs-18)", letterSpacing: "-0.01em" }}>{s.name}</div>
          <div style={{ fontSize: "var(--fs-12)", color: "var(--muted)", marginTop: 3 }}>{s.mood || DECOR_LABEL[s.decorLevel] || ""}</div>
        </div>
        {system
          ? <span style={{ fontSize: "var(--fs-11)", fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: "var(--surface-2)", color: "var(--muted)", flex: "none" }}>база</span>
          : <span style={{ fontSize: "var(--fs-11)", fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: "rgba(94,107,91,.14)", color: "var(--accent-2)", flex: "none" }}>мой</span>}
      </div>

      <div style={{ display: "flex", height: 40, borderRadius: 9, overflow: "hidden", border: "1px solid var(--hairline)" }}>
        {(s.palette || []).map((c, i) => <span key={i} title={c} style={{ flex: 1, background: c }} />)}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {(s.materials || []).slice(0, 5).map((m, i) => (
          <span key={i} style={{ fontSize: "var(--fs-11)", fontWeight: 600, color: "var(--muted)", padding: "3px 9px", borderRadius: 99, background: "var(--glass-2)", border: "1px solid var(--hairline)" }}>{m}</span>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, paddingTop: 12, marginTop: "auto", borderTop: "1px solid var(--hairline)" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: "var(--fs-12)" }} onClick={onDuplicate} title="Дублировать в свой"><I.layers size={14} />Дублировать</button>
          {!system && <button className="icon-btn sm" title="Редактировать" aria-label="Редактировать" onClick={onEdit}><I.edit size={15} /></button>}
          {!system && <button className="icon-btn sm" title="Удалить" aria-label="Удалить" onClick={onRemove}><I.trash size={15} /></button>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- РЕДАКТОР СТИЛЯ ---------------- */
function StyleEditor({ draft, onClose, onSaved }) {
  const [d, setD] = useS(() => ({ ...draft, palette: [...(draft.palette || [])], materials: [...(draft.materials || [])] }));
  const [busy, setBusy] = useS(false);
  const [done, setDone] = useS(false);   // короткая галочка «Сохранено» перед закрытием
  const [mat, setMat] = useS("");
  const [nameErr, setNameErr] = useS("");  // валидация: имя обязательно и уникально
  const set = (patch) => setD((x) => ({ ...x, ...patch }));

  const setColor = (i, v) => setD((x) => { const p = [...x.palette]; p[i] = v; return { ...x, palette: p }; });
  const addColor = () => setD((x) => x.palette.length >= 6 ? x : { ...x, palette: [...x.palette, "#B79B82"] });
  const rmColor = (i) => setD((x) => x.palette.length <= 2 ? x : { ...x, palette: x.palette.filter((_, j) => j !== i) });
  const addMat = () => { const v = mat.trim(); if (!v) return; setD((x) => x.materials.includes(v) ? x : { ...x, materials: [...x.materials, v] }); setMat(""); };
  const rmMat = (i) => setD((x) => ({ ...x, materials: x.materials.filter((_, j) => j !== i) }));

  const save = async () => {
    if (busy) return;
    const name = (d.name || "").trim();
    if (!name) { setNameErr("Дайте стилю имя — без него его не найти в библиотеке и в смете."); return; }
    const all = await LedgerAPI.styles.list();
    if (all.some((s) => s.id !== d.id && (s.name || "").trim().toLowerCase() === name.toLowerCase())) {
      setNameErr("Стиль «" + name + "» уже есть в библиотеке — назовите этот иначе.");
      return;
    }
    const payload = { name, mood: d.mood, desc: d.desc, palette: d.palette, materials: d.materials, decorLevel: d.decorLevel, factor: d.factor };
    setBusy(true);
    if (d.__new) await LedgerAPI.styles.create(payload);
    else await LedgerAPI.styles.update(d.id, payload);
    setBusy(false);
    setDone(true);
    setTimeout(onSaved, 650);   // дать увидеть «Сохранено», затем закрыть
  };

  const delta = Math.round(((d.factor || 1) - 1) * 100);
  return (
    <Modal onClose={onClose} label={d.__new ? "Новый стиль" : "Редактировать стиль"} maxWidth={560}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--hairline)" }}>
          <h3 className="display" style={{ fontSize: "var(--fs-21)" }}>{d.__new ? "Новый стиль" : "Редактировать стиль"}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть"><I.close size={18} /></button>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20, maxHeight: "68vh", overflow: "auto" }}>
          <Fld label="Название">
            <input className="fld" value={d.name} aria-invalid={nameErr ? "true" : undefined}
              onChange={(e) => { set({ name: e.target.value }); if (nameErr) setNameErr(""); }} placeholder="Например: Тёплый лофт" />
            {nameErr && <span className="fld-err" role="alert"><I.info size={14} />{nameErr}</span>}
          </Fld>
          <Fld label="Настроение / описание">
            <input className="fld" value={d.mood} onChange={(e) => set({ mood: e.target.value })} placeholder="Терракота, металл, дерево" />
          </Fld>

          {/* палитра: свотч + HEX-ввод (точные бренд-цвета, не только пипетка) */}
          <div>
            <FldLabel>Палитра</FldLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-start" }}>
              {d.palette.map((c, i) => (
                <div key={i} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
                  <input type="color" value={c} onChange={(e) => setColor(i, e.target.value)}
                    style={{ width: 46, height: 46, border: "1px solid var(--hairline)", borderRadius: 10, padding: 0, background: "none", cursor: "pointer" }} title={c} />
                  <HexInput value={c} onSet={(v) => setColor(i, v)} />
                  {d.palette.length > 2 && <button onClick={() => rmColor(i)} aria-label="Убрать цвет" style={{ position: "absolute", top: -7, right: -7, width: 20, height: 20, borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--muted)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-card)" }}><I.close size={11} /></button>}
                </div>
              ))}
              {d.palette.length < 6 && <button onClick={addColor} style={{ width: 46, height: 46, borderRadius: 10, border: "1.5px dashed var(--hairline)", color: "var(--muted)", display: "grid", placeItems: "center" }} title="Добавить цвет"><I.plus size={18} /></button>}
            </div>
          </div>

          {/* материалы */}
          <div>
            <FldLabel>Материалы и фактуры</FldLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {d.materials.map((m, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: "var(--fs-13)", fontWeight: 600, color: "var(--text)", padding: "6px 12px", borderRadius: 99, background: "var(--glass-2)", border: "1px solid var(--hairline)" }}>
                  {m}<button onClick={() => rmMat(i)} aria-label="Убрать" style={{ display: "grid", placeItems: "center", color: "var(--faint)" }}><I.close size={13} /></button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="fld" value={mat} onChange={(e) => setMat(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMat(); } }} placeholder="Добавить материал…" />
              <button className="btn btn-ghost" style={{ padding: "0 16px" }} onClick={addMat}><I.plus size={16} /></button>
            </div>
          </div>

          {/* уровень декора */}
          <div>
            <FldLabel>Уровень декора</FldLabel>
            <SegTabs className="pd-seg seg-lite" style={{ maxWidth: 360 }} ariaLabel="Уровень декора"
              value={d.decorLevel} onChange={(k) => set({ decorLevel: k })}
              items={DECOR.map(([k, t]) => ({ id: k, label: t }))} />
          </div>

          {/* бюджет-класс (factor) */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <FldLabel>Класс бюджета</FldLabel>
              <span style={{ fontSize: "var(--fs-12)", fontWeight: 700, color: delta > 0 ? "var(--accent)" : delta < 0 ? "var(--accent-2)" : "var(--muted)" }}>{factorDelta(d.factor)}</span>
            </div>
            <input type="range" min="0.7" max="1.4" step="0.02" value={d.factor} onChange={(e) => set({ factor: +e.target.value })} style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-11)", color: "var(--muted)", marginTop: 6 }}><span>−30% (эконом)</span><span>база</span><span>+40% (премиум)</span></div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 24px", borderTop: "1px solid var(--hairline)" }}>
          <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={save} disabled={busy || done} style={done ? { background: "var(--accent-2)", color: "var(--on-accent)", opacity: 1 } : undefined}>
            {done ? <span className="save-pulse" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><I.check size={16} />Сохранено</span>
              : busy ? "Сохранение…" : <React.Fragment><I.check size={16} />Сохранить стиль</React.Fragment>}
          </button>
        </div>
    </Modal>
  );
}

/* HEX-ввод свотча: применяет только валидный #RRGGBB, черновик живёт локально */
function HexInput({ value, onSet }) {
  const [v, setV] = useS(value);
  useSE(() => { setV(value); }, [value]);
  const ok = /^#[0-9A-Fa-f]{6}$/.test(v);
  return (
    <input className="fld" value={v} aria-label="HEX цвета" aria-invalid={ok ? undefined : "true"} spellCheck={false}
      onChange={(e) => { const x = e.target.value.trim(); setV(x); if (/^#[0-9A-Fa-f]{6}$/.test(x)) onSet(x); }}
      style={{ width: 78, padding: "5px 6px", fontFamily: "var(--font-mono)", fontSize: "var(--fs-11)", textAlign: "center" }} />
  );
}

function FldLabel({ children }) {
  return <span style={{ display: "block", fontSize: "var(--fs-13)", color: "var(--muted)", marginBottom: 8, fontWeight: 600 }}>{children}</span>;
}
function Fld({ label, children }) {
  return <label style={{ display: "block" }}><FldLabel>{label}</FldLabel>{children}</label>;
}

window.StylesLibrary = StylesLibrary;
window.StyleEditor = StyleEditor;