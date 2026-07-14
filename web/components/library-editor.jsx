/* ============================================================
   Design Ledger — БИБЛИОТЕКА ТОВАРОВ СТУДИИ (волна B1, бенчмарк Programa)
   ------------------------------------------------------------
   Мастер-записи товаров, которые дизайнер подбирает снова и снова
   (диван, смеситель, люстра). Реестр LedgerAPI.library (localStorage),
   схема — LedgerFFE.blankProduct. Товар втекает в смету: по названию
   (автоподстановка в PosEditor) и через пикер-каталог в комнате;
   собирается обратно из позиции кнопкой «В библиотеку». Системных
   пресетов нет — всё своё. Имена top-level уникальны: файлы делят
   одну глобальную область (как остальные компоненты).
   ============================================================ */
const { useState: useL, useEffect: useLE } = React;

/* поставщик + артикул одной строкой карточки/пикера */
const libMeta = (p) => [p.sup, p.article ? "арт. " + p.article : ""].filter(Boolean).join(" · ");
const libBlankDraft = () => ({ __new: true, title: "", cat: "", unit: "шт", price: "", sup: "", article: "", url: "", note: "", feedSku: "", dims: { w: "", d: "", h: "" } });
// запись из хранилища → черновик редактора (числа → строки для полей ввода)
const libToDraft = (p) => {
  const s = (v) => (v === "" || v == null ? "" : String(v));
  const d = p.dims || {};
  return { ...p, price: s(p.price), dims: { w: s(d.w), d: s(d.d), h: s(d.h) } };
};

function ProductsLibrary() {
  const [rows, setRows] = useL(null);
  const [edit, setEdit] = useL(null);   // редактируемый/создаваемый товар (draft) | null
  const [q, setQ] = useL("");
  const [seeding, setSeeding] = useL(false);
  const [importing, setImporting] = useL(false);
  const reload = () => LedgerAPI.library.list().then(setRows);
  useLE(() => { reload(); }, []);

  const createNew = () => setEdit(libBlankDraft());
  // п.19 (восьмой Programa-заход): «Import products from Excel» — прайс-лист/каталог
  // поставщика пачкой. Дедуп по названию (регистронезависимо) — та же проверка, что
  // ProductEditor.save() требует для ручного создания; дубли ВНУТРИ файла тоже не плодим
  // (existingNames растёт по ходу цикла). Последовательный await — та же гонка id, что
  // в seedDemo (library.create штампует id="lib_"+Date.now(), Promise.all столкнул бы id).
  const onImportExcel = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f || importing) return;
    if (!(window.LedgerXLSX && LedgerXLSX.importLibrary)) return;
    setImporting(true);
    withLib("xlsx", () => LedgerXLSX.importLibrary(f)
      .then(async (res) => {
        const products = (res && res.products) || [];
        if (!products.length) {
          toast("Не удалось распознать товары в файле. Нужна колонка «Наименование» (+ опционально Раздел/Цена/Поставщик/Артикул).", "warn", 7000);
          return;
        }
        const existing = await LedgerAPI.library.list();
        const existingNames = new Set(existing.map((p) => (p.title || "").trim().toLowerCase()));
        let created = 0, dup = 0;
        for (const p of products) {
          const key = p.title.trim().toLowerCase();
          if (existingNames.has(key)) { dup++; continue; }
          existingNames.add(key);
          await LedgerAPI.library.create(p);
          created++;
        }
        await reload();
        const parts = ["Импортировано товаров: " + created];
        if (dup) parts.push(dup + " пропущено (уже есть по названию)");
        if (res.skipped) parts.push(res.skipped + " строк без названия пропущено");
        toast(parts.join(" · "), created ? "ok" : "warn");
      })
      .catch(() => toast("Не удалось прочитать файл — нужен .xlsx, .xls или .csv.", "warn", 5000))
    ).finally(() => setImporting(false));
  };
  // K4: наполнить пустую библиотеку демо-товарами (Programa «Add demo products»).
  // Создаём ПОСЛЕДОВАТЕЛЬНО, а не Promise.all: library.create штампует id = "lib_"+Date.now(),
  // параллельные вызовы в одну миллисекунду дали бы одинаковый id (коллизия) — await по одному
  // разводит их по времени. Кнопка живёт только в пустом состоянии → повторный сид исключён.
  const seedDemo = async () => {
    if (seeding) return;
    const demo = (window.LedgerFFE && window.LedgerFFE.DEMO_LIBRARY_PRODUCTS) || [];
    if (!demo.length) return;
    setSeeding(true);
    try {
      for (const p of demo) await LedgerAPI.library.create(p);
      await reload();
      toast("Добавлено демо-товаров: " + demo.length + ". Отредактируйте или удалите — это ваши записи.");
    } catch (e) {
      toast("Не удалось добавить демо-товары — попробуйте ещё раз.", "warn");
    } finally {
      setSeeding(false);
    }
  };
  const remove = async (id) => {
    const p = (rows || []).find((x) => x.id === id);
    const ok = await confirmDialog({ title: "Удалить товар?", text: "«" + ((p && p.title) || "Товар") + "» исчезнет из библиотеки. В уже собранных сметах позиции останутся — они независимые копии.", confirmLabel: "Удалить товар" });
    if (!ok) return;
    await LedgerAPI.library.remove(id); reload(); toast("Товар удалён из библиотеки");
  };

  const norm = (s) => (s || "").toLowerCase();
  const all = (rows || []).slice().sort((a, b) => (a.title || "").localeCompare(b.title || "", "ru"));
  const qq = norm(q.trim());
  const shown = qq ? all.filter((p) => [p.title, p.cat, p.sup, p.article].some((f) => norm(f).includes(qq))) : all;

  return (
    <div className="reveal in" ref={useReveal()}>
      <PageHead eyebrow="Библиотека товаров" eyebrowIcon="layers" title={"Мои товары" + (all.length ? " · " + all.length : "")}
        sub="Мастер-записи того, что вы ставите в сметы снова и снова. В смете название подставляет цену, раздел и поставщика; в комнате — пикер-каталог. Собрать библиотеку можно прямо из готовой сметы кнопкой «В библиотеку» на позиции."
        right={<div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <label className="btn btn-ghost" style={{ cursor: importing ? "default" : "pointer", opacity: importing ? .6 : 1 }}
            title="Загрузить прайс-лист или каталог поставщика из Excel/CSV (колонки: Наименование + опционально Раздел/Цена/Поставщик/Артикул/Ссылка/Габариты)">
            <I.grid size={16} />{importing ? "Импортируем…" : "Импорт из Excel"}
            <input type="file" accept=".xlsx,.xls,.csv" hidden disabled={importing} onChange={onImportExcel} />
          </label>
          <button className="btn btn-primary" onClick={createNew}><I.plus size={17} />Создать товар</button>
        </div>} />

      {!rows && <div className="proj-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="glass skel" style={{ borderRadius: "var(--r-lg)", height: 150 }} />)}</div>}

      {rows && all.length === 0 && (
        <EmptyState icon="layers" title="В библиотеке пока пусто"
          text="Добавьте товары, которые подбираете из проекта в проект. Они начнут подставляться в сметы по названию и появятся в пикере комнаты. Можно собрать библиотеку и постепенно — кнопкой «В библиотеку» на позициях готовой сметы."
          action={
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <button className="btn btn-primary" onClick={createNew}><I.plus size={17} />Создать первый товар</button>
              {/* K4: быстрый старт — наполнить демо-набором, чтобы увидеть, как товар живёт в библиотеке и смете */}
              <button className="btn btn-ghost" onClick={seedDemo} disabled={seeding}>
                <I.layers size={16} />{seeding ? "Добавляем…" : "Добавить демо-товары"}
              </button>
            </div>
          } />
      )}

      {rows && all.length > 0 && (
        <React.Fragment>
          <SearchField value={q} onChange={setQ} placeholder="Поиск: название, раздел, поставщик, артикул"
            ariaLabel="Поиск по библиотеке товаров" style={{ maxWidth: 360, marginBottom: 18 }} />
          {shown.length === 0
            ? <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", padding: "8px 2px" }}>По запросу «{q.trim()}» ничего не нашлось.</p>
            : (
              <div className="proj-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
                {shown.map((p) => <ProductCard key={p.id} p={p} onEdit={() => setEdit(libToDraft(p))} onRemove={() => remove(p.id)} />)}
              </div>
            )}
        </React.Fragment>
      )}

      {edit && <ProductEditor draft={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </div>
  );
}

function ProductCard({ p, onEdit, onRemove }) {
  const F = window.LedgerFFE;
  const dims = F && F.dimsLabel ? F.dimsLabel(p.dims) : "";
  const meta = libMeta(p);
  return (
    <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontFamily: "var(--font-display)", fontSize: "var(--fs-16)", letterSpacing: "-0.01em", lineHeight: 1.25 }}>{p.title}</div>
          {p.cat && <div style={{ marginTop: 6 }}><span style={{ fontSize: "var(--fs-11)", fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: "var(--glass-2)", color: "var(--muted)", border: "1px solid var(--hairline)" }}>{p.cat}</span></div>}
        </div>
        <div style={{ textAlign: "right", flex: "none" }}>
          <div className="mono" style={{ fontWeight: 700, fontSize: "var(--fs-15)", color: "var(--accent-2)", whiteSpace: "nowrap" }}>{fmtMoney(p.price || 0)}</div>
          <div style={{ fontSize: "var(--fs-11)", color: "var(--muted)" }}>за {p.unit || "шт"}</div>
        </div>
      </div>

      {(meta || dims) && (
        <div style={{ fontSize: "var(--fs-12)", color: "var(--muted)", lineHeight: 1.5, display: "flex", flexDirection: "column", gap: 2 }}>
          {meta && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta}</span>}
          {dims && <span className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--muted)" }}>{dims}</span>}
        </div>
      )}

      {(p.priceDate || p.feedSku) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {p.priceDate && <PriceAgeChip d={p.priceDate} />}
          {p.feedSku && (
            <span className="mono" title={"Артикул фида: " + p.feedSku + " — автообновление цены подключится вместе с фидом фабрик"}
              style={{ fontSize: "var(--fs-10)", whiteSpace: "nowrap", padding: "1px 7px", borderRadius: 99, border: "1px solid var(--hairline)", color: "var(--info)" }}>
              Фид · {p.feedSku}
            </span>
          )}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, paddingTop: 10, marginTop: "auto", borderTop: "1px solid var(--hairline)" }}>
        {p.url && <a className="btn btn-ghost" href={p.url} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 11px", fontSize: "var(--fs-12)", marginRight: "auto" }} title="Открыть страницу товара"><I.arrow size={13} />Ссылка</a>}
        <button className="icon-btn sm" title="Редактировать" aria-label={"Редактировать «" + p.title + "»"} onClick={onEdit}><I.edit size={15} /></button>
        <button className="icon-btn sm" title="Удалить" aria-label={"Удалить «" + p.title + "»"} onClick={onRemove}><I.trash size={15} /></button>
      </div>
    </div>
  );
}

/* ---------------- РЕДАКТОР ТОВАРА ---------------- */
function ProductEditor({ draft, onClose, onSaved }) {
  const [d, setD] = useL(() => ({ ...draft, dims: { ...(draft.dims || { w: "", d: "", h: "" }) } }));
  const [busy, setBusy] = useL(false);
  const [done, setDone] = useL(false);
  const [nameErr, setNameErr] = useL("");
  const set = (patch) => setD((x) => ({ ...x, ...patch }));
  const setDim = (k, v) => setD((x) => ({ ...x, dims: { ...x.dims, [k]: v } }));
  const F = window.LedgerFFE;
  const cats = (F && F.FFE_CATEGORIES) || [];
  const units = (F && F.FFE_UNITS) || ["шт"];

  const save = async () => {
    if (busy) return;
    const title = (d.title || "").trim();
    if (!title) { setNameErr("Дайте товару название — по нему он ищется в библиотеке и подставляется в смету."); return; }
    const all = await LedgerAPI.library.list();
    if (all.some((p) => p.id !== d.id && (p.title || "").trim().toLowerCase() === title.toLowerCase())) {
      setNameErr("Товар «" + title + "» уже есть в библиотеке — назовите этот иначе или отредактируйте существующий.");
      return;
    }
    const payload = { title, cat: d.cat, unit: d.unit, price: d.price, sup: d.sup, article: d.article, url: d.url, note: d.note, feedSku: d.feedSku, dims: d.dims };
    setBusy(true);
    if (d.__new) await LedgerAPI.library.create(payload);
    else await LedgerAPI.library.update(d.id, payload);
    setBusy(false); setDone(true);
    setTimeout(onSaved, 650);
  };

  const dimF = { width: "100%", padding: "8px 10px", borderRadius: 9, border: "1px solid var(--hairline)", background: "var(--surface)", fontSize: "var(--fs-13)", color: "var(--text)", fontFamily: "var(--font-mono)", textAlign: "center" };
  return (
    <Modal onClose={onClose} label={d.__new ? "Новый товар" : "Редактировать товар"} maxWidth={560}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--hairline)" }}>
        <h3 className="display" style={{ fontSize: "var(--fs-21)" }}>{d.__new ? "Новый товар" : "Редактировать товар"}</h3>
        <button className="icon-btn" onClick={onClose} aria-label="Закрыть"><I.close size={18} /></button>
      </div>

      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18, maxHeight: "68vh", overflow: "auto" }}>
        <LibFld label="Название">
          <input className="fld" value={d.title} autoFocus aria-invalid={nameErr ? "true" : undefined}
            onChange={(e) => { set({ title: e.target.value }); if (nameErr) setNameErr(""); }} placeholder="Например: Диван модульный, букле" />
          {nameErr && <span className="fld-err" role="alert"><I.info size={14} />{nameErr}</span>}
        </LibFld>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 1fr", gap: 12 }}>
          <LibFld label="Раздел">
            <input className="fld" list="lib-cat-list" value={d.cat} placeholder="Прочее" onChange={(e) => set({ cat: e.target.value })} />
            <datalist id="lib-cat-list">{cats.map((c) => <option key={c} value={c} />)}</datalist>
          </LibFld>
          <LibFld label="Единица">
            <select className="fld" value={d.unit} onChange={(e) => set({ unit: e.target.value })}>
              {units.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </LibFld>
          <LibFld label="Цена/ед, ₽">
            <input className="fld" style={{ fontFamily: "var(--font-mono)" }} type="number" min="0" step="100" inputMode="numeric"
              value={d.price} onChange={(e) => set({ price: e.target.value })} placeholder="0" />
          </LibFld>
        </div>
        {!d.__new && d.priceDate && (
          <div style={{ marginTop: -10 }}><PriceAgeChip d={d.priceDate} /></div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <LibFld label="Поставщик / фабрика">
            <input className="fld" value={d.sup} onChange={(e) => set({ sup: e.target.value })} placeholder="точка закупки" />
          </LibFld>
          <LibFld label="Артикул">
            <input className="fld" value={d.article} onChange={(e) => set({ article: e.target.value })} placeholder="SKU / код" />
          </LibFld>
        </div>

        <LibFld label="Артикул фида фабрик (SKU)">
          <input className="fld" value={d.feedSku || ""} onChange={(e) => set({ feedSku: e.target.value })} placeholder="пока вводится вручную" />
          <span style={{ display: "block", fontSize: "var(--fs-12)", color: "var(--muted)", marginTop: 5, lineHeight: 1.5 }}>
            Задел под фид фабрик: когда он подключится, цены по этому артикулу начнут обновляться сами.
          </span>
        </LibFld>

        <LibFld label="Ссылка на товар">
          <input className="fld" type="url" value={d.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://…" />
        </LibFld>

        <div>
          <LibFldLabel>Габариты, см (Ш × Г × В)</LibFldLabel>
          <div style={{ display: "flex", alignItems: "center", gap: 8, maxWidth: 260 }}>
            <input style={dimF} type="number" min="0" inputMode="numeric" aria-label="Ширина, см" value={d.dims.w} onChange={(e) => setDim("w", e.target.value)} placeholder="Ш" />
            <span style={{ color: "var(--faint)" }}>×</span>
            <input style={dimF} type="number" min="0" inputMode="numeric" aria-label="Глубина, см" value={d.dims.d} onChange={(e) => setDim("d", e.target.value)} placeholder="Г" />
            <span style={{ color: "var(--faint)" }}>×</span>
            <input style={dimF} type="number" min="0" inputMode="numeric" aria-label="Высота, см" value={d.dims.h} onChange={(e) => setDim("h", e.target.value)} placeholder="В" />
          </div>
        </div>

        <LibFld label="Примечание">
          <input className="fld" value={d.note} onChange={(e) => set({ note: e.target.value })} placeholder="комплектация, цвет, нюансы заказа…" />
        </LibFld>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 24px", borderTop: "1px solid var(--hairline)" }}>
        <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
        <button className="btn btn-primary" onClick={save} disabled={busy || done} style={done ? { background: "var(--accent-2)", color: "var(--on-accent)", opacity: 1 } : undefined}>
          {done ? <span className="save-pulse" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><I.check size={16} />Сохранено</span>
            : busy ? "Сохранение…" : <React.Fragment><I.check size={16} />Сохранить товар</React.Fragment>}
        </button>
      </div>
    </Modal>
  );
}

/* ---------------- ПИКЕР-КАТАЛОГ ДЛЯ КОМНАТЫ ----------------
   Открывается из строки комнаты в смете: поиск + мультивыбор → onAdd(товары[]).
   Вызывающий сам маппит записи в позиции (LedgerFFE.positionFromProduct). */
function LibraryPickerModal({ roomName, onClose, onAdd }) {
  const [rows, setRows] = useL(null);
  const [q, setQ] = useL("");
  const [sel, setSel] = useL({});   // { id: true }
  useLE(() => { LedgerAPI.library.list().then(setRows); }, []);

  const norm = (s) => (s || "").toLowerCase();
  const all = (rows || []).slice().sort((a, b) => (a.title || "").localeCompare(b.title || "", "ru"));
  const qq = norm(q.trim());
  const shown = qq ? all.filter((p) => [p.title, p.cat, p.sup, p.article].some((f) => norm(f).includes(qq))) : all;
  const toggle = (id) => setSel((s) => ({ ...s, [id]: !s[id] }));
  const chosen = all.filter((p) => sel[p.id]);
  const sum = chosen.reduce((s, p) => s + (p.price || 0), 0);
  const add = () => { if (chosen.length) onAdd(chosen); };

  return (
    <Modal onClose={onClose} label="Добавить из библиотеки" maxWidth={560}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--hairline)" }}>
        <div>
          <h3 className="display" style={{ fontSize: "var(--fs-21)" }}>Из библиотеки</h3>
          {roomName && <div style={{ fontSize: "var(--fs-12)", color: "var(--muted)", marginTop: 2 }}>в комнату «{roomName}»</div>}
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Закрыть"><I.close size={18} /></button>
      </div>

      <div style={{ padding: "16px 24px 8px" }}>
        <SearchField value={q} onChange={setQ} placeholder="Поиск по библиотеке" ariaLabel="Поиск по библиотеке" />
      </div>

      <div style={{ padding: "4px 24px", maxHeight: "52vh", overflow: "auto" }}>
        {!rows && <div className="skel" style={{ height: 120, borderRadius: 12 }} />}
        {rows && all.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", lineHeight: 1.6, padding: "20px 0" }}>
            Библиотека пуста. Наполните её в разделе «Мастерская → Товары» или кнопкой «В библиотеку» на позициях сметы — потом сможете добавлять товары в комнаты в один клик.
          </p>
        )}
        {rows && all.length > 0 && shown.length === 0 && <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", padding: "16px 0" }}>По запросу «{q.trim()}» ничего не нашлось.</p>}
        {rows && shown.map((p) => {
          const on = !!sel[p.id];
          const meta = libMeta(p);
          return (
            <button key={p.id} onClick={() => toggle(p.id)} aria-pressed={on}
              style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 12, marginBottom: 6,
                border: "1px solid " + (on ? "rgba(94,107,91,.5)" : "var(--hairline)"), background: on ? "var(--accent-2-tint)" : "var(--surface)" }}>
              <span aria-hidden="true" style={{ width: 20, height: 20, flex: "none", borderRadius: 6, border: "1.5px solid " + (on ? "var(--accent-2)" : "var(--hairline-2)"), background: on ? "var(--accent-2)" : "transparent", display: "grid", placeItems: "center", color: "var(--on-accent)" }}>
                {on && <I.check size={13} />}
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: "block", fontWeight: 600, fontSize: "var(--fs-13)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span>
                {(p.cat || meta) && <span style={{ display: "block", fontSize: "var(--fs-12)", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[p.cat, meta].filter(Boolean).join(" · ")}</span>}
              </span>
              <span className="mono" style={{ fontSize: "var(--fs-13)", fontWeight: 700, color: "var(--accent-2)", flex: "none" }}>{fmtMoney(p.price || 0)}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "14px 24px", borderTop: "1px solid var(--hairline)" }}>
        <span style={{ fontSize: "var(--fs-13)", color: "var(--muted)" }}>{chosen.length ? "Выбрано " + chosen.length + " · " + fmtMoney(sum) : "Отметьте товары"}</span>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={add} disabled={!chosen.length}><I.plus size={16} />Добавить{chosen.length ? " · " + chosen.length : ""}</button>
        </div>
      </div>
    </Modal>
  );
}

/* поля формы (локальные — общая глобальная область, имена не должны пересекаться) */
function LibFldLabel({ children }) {
  return <span style={{ display: "block", fontSize: "var(--fs-13)", color: "var(--muted)", marginBottom: 6, fontWeight: 600 }}>{children}</span>;
}
function LibFld({ label, children }) {
  return <label style={{ display: "block" }}><LibFldLabel>{label}</LibFldLabel>{children}</label>;
}

window.ProductsLibrary = ProductsLibrary;
window.ProductEditor = ProductEditor;
window.LibraryPickerModal = LibraryPickerModal;
