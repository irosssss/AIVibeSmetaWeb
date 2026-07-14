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
  const [cab, setCab] = useSB(null);     // поставщик, чей кабинет-превью открыт | null
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
                {shown.map((s) => <SupplierCard key={s.id} s={s} onEdit={() => setEdit({ ...s })} onRemove={() => remove(s.id)} onCabinet={() => setCab(s)} />)}
              </div>
            )}
        </React.Fragment>
      )}

      {edit && <SupplierEditor draft={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
      {cab && <SupplierCabinetModal s={cab} onClose={() => setCab(null)} />}
    </div>
  );
}

function SupplierCard({ s, onEdit, onRemove, onCabinet }) {
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
        <button className="icon-btn sm" title="Кабинет поставщика: спрос на его товары в ваших сметах" aria-label={"Кабинет поставщика «" + s.name + "»"} onClick={onCabinet}><I.chart size={15} /></button>
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

/* ---------------- КАБИНЕТ ПОСТАВЩИКА (превью, PRD портала поставщиков §6) ----------------
   Спрос на товары поставщика из РЕАЛЬНЫХ смет этого дизайнера: сколько раз его товары
   специфицированы, согласованы клиентом, ушли в шары. Формула Programa «Specified,
   not just seen». Сейчас это рабочий инструмент дизайнера («на что я живу с этим
   поставщиком»); когда кабинеты поставщиков заработают онлайн, ту же сводку — уже
   агрегатом по всем дизайнерам — увидит сам поставщик. ДЕНЕГ В СВОДКЕ НЕТ (инвариант:
   себестоимость/наценка — тайна дизайнера, в т.ч. от поставщика). */
function SupplierCabinetModal({ s, onClose }) {
  const [stats, setStats] = useSB(null);
  useSBE(() => {
    const F = window.LedgerFFE;
    // list() отдаёт карточки без смет — комнаты живут в get(id) (project-data.js);
    // тянем полные проекты параллельно, статистика ждёт все
    LedgerAPI.projects.list()
      .then((ps) => Promise.all(ps.map((p) => LedgerAPI.projects.get(p.id))))
      .then((projects) => {
        const shares = F && F.listPortalShares ? F.listPortalShares() : [];
        setStats(F && F.supplierStats ? F.supplierStats(projects, shares, s.name) : null);
      });
  }, [s]);

  const kpi = (label, value, hint) => (
    <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: "14px 16px", flex: 1, minWidth: 120 }} title={hint}>
      <div className="mono" style={{ fontSize: "var(--fs-21)", fontWeight: 700, color: "var(--accent-2)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{value}</div>
      <div style={{ fontSize: "var(--fs-12)", color: "var(--muted)", marginTop: 2 }}>{label}</div>
    </div>
  );

  return (
    <Modal onClose={onClose} label={"Кабинет поставщика «" + s.name + "»"} maxWidth={620}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, padding: "20px 24px", borderBottom: "1px solid var(--hairline)" }}>
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Кабинет поставщика · превью</div>
          <h3 className="display" style={{ fontSize: "var(--fs-21)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</h3>
          {(s.city || splMeta(s)) && <div style={{ fontSize: "var(--fs-12)", color: "var(--muted)", marginTop: 4 }}>{[s.city, splMeta(s)].filter(Boolean).join(" · ")}</div>}
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Закрыть"><I.close size={18} /></button>
      </div>

      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18, maxHeight: "68vh", overflow: "auto" }}>
        {!stats && <div className="skel" style={{ height: 120, borderRadius: 12 }} />}

        {stats && stats.positions === 0 && (
          <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", lineHeight: 1.6 }}>
            Товары этого поставщика пока не встречаются в ваших сметах. Название карточки должно совпадать
            с полем «Поставщик» у позиций — проверьте написание, если статистика кажется пустой зря.
          </p>
        )}

        {stats && stats.positions > 0 && (
          <React.Fragment>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {kpi("в сметах", stats.positions + (stats.qty > stats.positions ? " · ×" + stats.qty : ""), "Позиций поставщика в ваших сметах (и штук с учётом количества)")}
              {kpi("проектов", stats.projects, "В скольких проектах есть его товары")}
              {kpi("согласовано", stats.approved, "Позиций, одобренных клиентом")}
              {kpi("ушло клиентам", stats.shared, "Шар-ссылок клиентам, где есть его товары")}
            </div>

            <div>
              <SplFldLabel>Какие товары дизайнер ставит чаще</SplFldLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {stats.products.slice(0, 8).map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, border: "1px solid var(--hairline)", background: "var(--surface)" }}>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: "block", fontWeight: 600, fontSize: "var(--fs-13)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title || "Без названия"}</span>
                      {p.sku && <span className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--muted)" }}>арт. {p.sku}</span>}
                    </span>
                    <span className="mono" style={{ flex: "none", fontSize: "var(--fs-12)", color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                      {p.positions} поз. · ×{p.qty}{p.approved ? " · ✓" + p.approved : ""}
                    </span>
                  </div>
                ))}
                {stats.products.length > 8 && (
                  <span style={{ fontSize: "var(--fs-12)", color: "var(--muted)" }}>…и ещё {stats.products.length - 8}</span>
                )}
              </div>
            </div>
          </React.Fragment>
        )}

        {/* честная рамка превью: что это и чем станет; денег дизайнера здесь нет по инварианту */}
        <p style={{ fontSize: "var(--fs-12)", color: "var(--muted)", lineHeight: 1.6, borderTop: "1px solid var(--hairline)", paddingTop: 14 }}>
          Это превью на данных ваших смет: так поставщик увидит спрос на свои товары, когда кабинеты
          поставщиков заработают онлайн (агрегатом по всем дизайнерам, без ваших цен и наценки).
          Поставщикам о подключении — страница <a href="#for-suppliers">«Поставщикам»</a>.
        </p>
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
window.SupplierCabinetModal = SupplierCabinetModal;
window.SupplierEditor = SupplierEditor;
window.SupplierContactChip = SupplierContactChip;
window.splBlankDraft = splBlankDraft;
