/* ============================================================
   Design Ledger — АДРЕСНАЯ КНИГА ПОСТАВЩИКОВ (K5a, бенчмарк Programa Address Book)
   ------------------------------------------------------------
   Поставщик как сущность: карточка контактов (компания, контактное лицо,
   email, телефон, сайт, город, заметка) в центральном реестре
   LedgerAPI.suppliers (localStorage), схема — LedgerFFE.blankSupplier.
   Связь со сметой — ПО ИМЕНИ: позиция продолжает хранить строку `sup`
   (старые сметы/Excel/группировки закупки не мигрируют), карточка
   находится через LedgerFFE.supplierMatch и добавляет контакты поверх.
   Реестр наполняется из реальной работы: кнопка «В адресную книгу»
   на позиции сметы (паттерн «В библиотеку»). Имена top-level уникальны;
   NB: top-level функции соседних файлов НЕ видны (Vite: каждый файл —
   ES-модуль, «общая область» — только явные window.X), поэтому поля
   формы (SplFld) — свои, не LibFld из library-editor.jsx.
   ============================================================ */
const { useState: useSB, useEffect: useSBE } = React;

/* поля формы (копия LibFld из library-editor.jsx — тот модуль их не экспортирует) */
function SplFldLabel({ children }) {
  return <span style={{ display: "block", fontSize: "var(--fs-13)", color: "var(--muted)", marginBottom: 6, fontWeight: 600 }}>{children}</span>;
}
function SplFld({ label, children }) {
  return <label style={{ display: "block" }}><SplFldLabel>{label}</SplFldLabel>{children}</label>;
}

/* контакт одной строкой карточки: лицо · email · телефон */
const splMeta = (s) => [s.contact, s.email, s.phone].filter(Boolean).join(" · ");
const splBlankDraft = (over) => ({ __new: true, name: "", contact: "", email: "", phone: "", url: "", city: "", note: "", ...(over || {}) });

function SuppliersBook() {
  const [rows, setRows] = useSB(null);
  const [edit, setEdit] = useSB(null);   // редактируемая/создаваемая карточка (draft) | null
  const [q, setQ] = useSB("");
  const reload = () => LedgerAPI.suppliers.list().then(setRows);
  useSBE(() => { reload(); }, []);

  const createNew = () => setEdit(splBlankDraft());
  const remove = async (id) => {
    const s = (rows || []).find((x) => x.id === id);
    // правило целостности (см. ffe.js): удаление карточки позиции смет НЕ трогает —
    // поставщик в них остаётся строкой, исчезают только контакты из справочника
    const ok = await confirmDialog({ title: "Удалить поставщика?", text: "«" + ((s && s.name) || "Поставщик") + "» исчезнет из адресной книги. Позиции смет не изменятся — поставщик в них останется текстом, пропадут только контакты.", confirmLabel: "Удалить карточку" });
    if (!ok) return;
    await LedgerAPI.suppliers.remove(id); reload(); toast("Карточка поставщика удалена");
  };

  const norm = (s) => (s || "").toLowerCase();
  const all = (rows || []).slice().sort((a, b) => (a.name || "").localeCompare(b.name || "", "ru"));
  const qq = norm(q.trim());
  const shown = qq ? all.filter((s) => [s.name, s.contact, s.email, s.phone, s.city].some((f) => norm(f).includes(qq))) : all;

  return (
    <div className="reveal in" ref={useReveal()}>
      <PageHead eyebrow="Адресная книга" eyebrowIcon="truck" title={"Поставщики" + (all.length ? " · " + all.length : "")}
        sub="Контакты фабрик, салонов и магазинов, у которых вы заказываете. Карточка привязывается к позициям сметы по названию поставщика — контакты видны в закупке. Добавить можно прямо с позиции кнопкой «В адресную книгу»."
        right={<button className="btn btn-primary" onClick={createNew}><I.plus size={17} />Добавить поставщика</button>} />

      {!rows && <div className="proj-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="glass skel" style={{ borderRadius: "var(--r-lg)", height: 130 }} />)}</div>}

      {rows && all.length === 0 && (
        <EmptyState icon="truck" title="В адресной книге пока пусто"
          text="Заведите поставщиков, у которых заказываете: контакты подтянутся к позициям сметы по названию и будут под рукой в закупке. Быстрее всего — кнопкой «В адресную книгу» на позиции готовой сметы."
          action={<button className="btn btn-primary" onClick={createNew}><I.plus size={17} />Добавить поставщика</button>} />
      )}

      {rows && all.length > 0 && (
        <React.Fragment>
          <SearchField value={q} onChange={setQ} placeholder="Поиск: название, контакт, email, телефон, город"
            ariaLabel="Поиск по адресной книге" style={{ maxWidth: 360, marginBottom: 18 }} />
          {shown.length === 0
            ? <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", padding: "8px 2px" }}>По запросу «{q.trim()}» ничего не нашлось.</p>
            : (
              <div className="proj-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
                {shown.map((s) => <SupplierCard key={s.id} s={s} onEdit={() => setEdit({ ...s })} onRemove={() => remove(s.id)} />)}
              </div>
            )}
        </React.Fragment>
      )}

      {edit && <SupplierEditor draft={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </div>
  );
}

function SupplierCard({ s, onEdit, onRemove }) {
  const meta = splMeta(s);
  return (
    <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontFamily: "var(--font-display)", fontSize: "var(--fs-16)", letterSpacing: "-0.01em", lineHeight: 1.25 }}>{s.name}</div>
        {s.city && <div style={{ marginTop: 6 }}><span style={{ fontSize: "var(--fs-11)", fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: "var(--glass-2)", color: "var(--muted)", border: "1px solid var(--hairline)" }}>{s.city}</span></div>}
      </div>

      {(meta || s.note) && (
        <div style={{ fontSize: "var(--fs-12)", color: "var(--muted)", lineHeight: 1.5, display: "flex", flexDirection: "column", gap: 2 }}>
          {meta && <span style={{ overflowWrap: "anywhere" }}>{meta}</span>}
          {s.note && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--muted)" }}>{s.note}</span>}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, paddingTop: 10, marginTop: "auto", borderTop: "1px solid var(--hairline)" }}>
        {s.url && <a className="btn btn-ghost" href={s.url} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 11px", fontSize: "var(--fs-12)", marginRight: "auto" }} title="Открыть сайт поставщика"><I.arrow size={13} />Сайт</a>}
        <button className="icon-btn sm" title="Редактировать" aria-label={"Редактировать «" + s.name + "»"} onClick={onEdit}><I.edit size={15} /></button>
        <button className="icon-btn sm" title="Удалить" aria-label={"Удалить «" + s.name + "»"} onClick={onRemove}><I.trash size={15} /></button>
      </div>
    </div>
  );
}

/* ---------------- РЕДАКТОР КАРТОЧКИ ПОСТАВЩИКА ---------------- */
function SupplierEditor({ draft, onClose, onSaved }) {
  const [d, setD] = useSB(() => ({ ...draft }));
  const [busy, setBusy] = useSB(false);
  const [done, setDone] = useSB(false);
  const [nameErr, setNameErr] = useSB("");
  const set = (patch) => setD((x) => ({ ...x, ...patch }));

  const save = async () => {
    if (busy) return;
    const name = (d.name || "").trim();
    if (!name) { setNameErr("Дайте поставщику название — по нему карточка привязывается к позициям сметы."); return; }
    // дубль по имени = сломанная связь (supplierMatch вернёт первую попавшуюся) — не даём создать
    const all = await LedgerAPI.suppliers.list();
    if (all.some((s) => s.id !== d.id && (s.name || "").trim().toLowerCase() === name.toLowerCase())) {
      setNameErr("Поставщик «" + name + "» уже есть в адресной книге — отредактируйте существующую карточку.");
      return;
    }
    const payload = { name, contact: d.contact, email: d.email, phone: d.phone, url: d.url, city: d.city, note: d.note };
    setBusy(true);
    if (d.__new) await LedgerAPI.suppliers.create(payload);
    else await LedgerAPI.suppliers.update(d.id, payload);
    setBusy(false); setDone(true);
    setTimeout(onSaved, 650);
  };

  return (
    <Modal onClose={onClose} label={d.__new ? "Новый поставщик" : "Редактировать поставщика"} maxWidth={520}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--hairline)" }}>
        <h3 className="display" style={{ fontSize: "var(--fs-21)" }}>{d.__new ? "Новый поставщик" : "Редактировать поставщика"}</h3>
        <button className="icon-btn" onClick={onClose} aria-label="Закрыть"><I.close size={18} /></button>
      </div>

      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18, maxHeight: "68vh", overflow: "auto" }}>
        <SplFld label="Название (компания / фабрика / магазин)">
          <input className="fld" value={d.name} autoFocus aria-invalid={nameErr ? "true" : undefined}
            onChange={(e) => { set({ name: e.target.value }); if (nameErr) setNameErr(""); }} placeholder="Например: Фабрика мягкой мебели" />
          {nameErr && <span className="fld-err" role="alert"><I.info size={14} />{nameErr}</span>}
          <span style={{ display: "block", fontSize: "var(--fs-12)", color: "var(--muted)", marginTop: 5, lineHeight: 1.5 }}>
            Название связывает карточку с позициями сметы (поле «Поставщик») — пишите одинаково там и тут.
          </span>
        </SplFld>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <SplFld label="Контактное лицо">
            <input className="fld" value={d.contact} onChange={(e) => set({ contact: e.target.value })} placeholder="Имя менеджера" />
          </SplFld>
          <SplFld label="Город">
            <input className="fld" value={d.city} onChange={(e) => set({ city: e.target.value })} placeholder="Москва" />
          </SplFld>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <SplFld label="Email">
            <input className="fld" type="email" value={d.email} onChange={(e) => set({ email: e.target.value })} placeholder="orders@…" />
          </SplFld>
          <SplFld label="Телефон">
            <input className="fld" type="tel" value={d.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+7 …" />
          </SplFld>
        </div>

        <SplFld label="Сайт">
          <input className="fld" type="url" value={d.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://…" />
        </SplFld>

        <SplFld label="Примечание">
          <input className="fld" value={d.note} onChange={(e) => set({ note: e.target.value })} placeholder="условия, скидка студии, сроки…" />
        </SplFld>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 24px", borderTop: "1px solid var(--hairline)" }}>
        <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
        <button className="btn btn-primary" onClick={save} disabled={busy || done} style={done ? { background: "var(--accent-2)", color: "var(--on-accent)", opacity: 1 } : undefined}>
          {done ? <span className="save-pulse" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><I.check size={16} />Сохранено</span>
            : busy ? "Сохранение…" : <React.Fragment><I.check size={16} />Сохранить</React.Fragment>}
        </button>
      </div>
    </Modal>
  );
}

/* контакт-чип поставщика для закупки/редактора позиции: email/телефон из карточки,
   найденной по имени (supplierMatch); ничего не рендерит, если карточки нет */
function SupplierContactChip({ book, name }) {
  const F = window.LedgerFFE;
  const card = F && F.supplierMatch ? F.supplierMatch(book, name) : null;
  if (!card) return null;
  const meta = splMeta(card);
  if (!meta) return null;
  return (
    <span className="mono" title={"Из адресной книги: " + card.name}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "var(--fs-12)", color: "var(--info)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      <I.user size={12} style={{ flex: "none" }} />{meta}
    </span>
  );
}

window.SuppliersBook = SuppliersBook;
window.SupplierEditor = SupplierEditor;
window.SupplierContactChip = SupplierContactChip;
window.splBlankDraft = splBlankDraft;
