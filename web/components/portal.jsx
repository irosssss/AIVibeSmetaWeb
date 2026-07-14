/* ============================================================
   Design Ledger — КЛИЕНТСКИЙ ПОРТАЛ (волна A2 бенчмарка Programa, groundwork)
   ------------------------------------------------------------
   Отдельная клиент-facing страница по ссылке #portal/{shareId}: клиент
   видит смету в режиме «для клиента» (цены с наценкой, без себестоимости,
   только чтение) и отвечает по позициям — то же поле approve словаря A1
   (LedgerFFE.APPROVE_STATUSES). Данные — снимок версии из localStorage
   (LedgerFFE.loadPortalShare); ответы персистятся туда же. Живой доступ
   с другого устройства подключится с Worker+KV/доменом БЕЗ переписывания UI.
   Имена top-level уникальны — общая глобальная область (как остальные файлы).
   ============================================================ */
const { useState: useP, useEffect: usePE } = React;

/* относительное время с минутами/часами для шапки портала «Обновлено N назад»
   (K1, паттерн Programa «Last Updated N minutes ago»). Вход — ISO-строка
   (rec.createdAt = момент публикации снимка). fmtRelDays (ui.jsx) даёт только дни. */
function fmtRelTime(iso) {
  const t = Date.parse(iso || "");
  if (!t) return "";
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 60) return "только что";
  const min = Math.floor(sec / 60);
  if (min < 60) return min + " " + plural(min, ["минуту", "минуты", "минут"]) + " назад";
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + " " + plural(hr, ["час", "часа", "часов"]) + " назад";
  const day = Math.floor(hr / 24);
  if (day < 30) return day + " " + plural(day, ["день", "дня", "дней"]) + " назад";
  const mon = Math.floor(day / 30);
  return mon + " " + plural(mon, ["месяц", "месяца", "месяцев"]) + " назад";
}

/* три решения клиента (pending = не ответил). Цвета — из словаря A1. */
const PORTAL_CHOICES = [
  { id: "ok", label: "Согласовать", color: "var(--accent-2)" },
  { id: "revise", label: "На пересмотр", color: "var(--info)" },
  { id: "rejected", label: "Отклонить", color: "var(--accent)" },
];

/* ---------------- КОММЕНТАРИИ-ТРЕД НА ПОЗИЦИИ (волна A3) ----------------
   Клиент пишет здесь; ответ студии появляется тем же треугольником (дизайнер
   отвечает из «Версий» в кабинете — читают/пишут один и тот же снимок портал-шары). */
function PortalCommentThread({ comments, onSend }) {
  const [draft, setDraft] = useP("");
  const send = (e) => {
    e.preventDefault();
    const t = draft.trim();
    if (!t) return;
    onSend(t);
    setDraft("");
  };
  return (
    <div style={{ marginTop: 10 }}>
      {comments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
          {comments.map((c) => (
            <CommentBubble key={c.id} comment={c} isMine={c.author === "client"} authorLabel={c.author === "client" ? "Вы" : "Студия"} />
          ))}
        </div>
      )}
      <form onSubmit={send} style={{ display: "flex", gap: 6 }}>
        <input className="fld" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Комментарий к позиции…"
          aria-label="Комментарий к позиции" style={{ fontSize: "var(--fs-12)", padding: "6px 9px", flex: 1 }} />
        <button type="submit" className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: "var(--fs-12)", flex: "none" }} disabled={!draft.trim()}>Отправить</button>
      </form>
    </div>
  );
}

/* K5c: фото-бокс карточки галереи с листанием мультифото — большое фото + ряд
   мини-тумбнейлов ([главное, ...доп.], клик меняет большое). Отдельный компонент,
   потому что renderItem — функция, а не компонент (стейту листания нужен хук). */
function PortalPhotoBox({ it, onZoom }) {
  const all = [it.img, ...(Array.isArray(it.images) ? it.images : [])].filter(Boolean);
  const [cur, setCur] = useP(0);
  const shown = all[Math.min(cur, all.length - 1)] || it.img;
  return (
    <React.Fragment>
      {/* onZoom (лайтбокс, 14.07): и в галерее фото кропится cover'ом — клик открывает целиком */}
      <div style={{ position: "relative", aspectRatio: "4 / 3", background: "var(--surface-2)", overflow: "hidden", cursor: onZoom ? "zoom-in" : undefined }}
        onClick={onZoom || undefined} role={onZoom ? "button" : undefined} tabIndex={onZoom ? 0 : undefined}
        onKeyDown={onZoom ? ((e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onZoom(); } }) : undefined}
        aria-label={onZoom ? "Показать фото крупно: " + (it.title || "") : undefined}>
        <Img src={shown} label="" style={{ position: "absolute", inset: 0 }} />
      </div>
      {all.length > 1 && (
        <div style={{ display: "flex", gap: 6, padding: "8px 10px 0" }} role="group" aria-label="Фото позиции">
          {all.map((u, i) => (
            <button key={i} type="button" onClick={() => setCur(i)} aria-pressed={i === cur}
              aria-label={"Фото " + (i + 1) + " из " + all.length}
              style={{ width: 40, height: 40, flex: "none", borderRadius: 7, overflow: "hidden", padding: 0, cursor: "pointer",
                border: i === cur ? "2px solid var(--accent-2)" : "1px solid var(--hairline)", opacity: i === cur ? 1 : 0.75 }}>
              <Img src={u} label="" radius={5} />
            </button>
          ))}
        </div>
      )}
    </React.Fragment>
  );
}

/* Лайтбокс фото позиции (14.07, жалоба владельца: тумбнейл 46px в «Списке» не рассмотреть):
   клик по фото → крупный просмотр с листалкой мультифото. Esc/клик по фону закрывают.
   <img> с object-fit:contain, НЕ общий Img: тот кропит cover'ом — для разглядывания
   товара нужна вся фотография целиком. */
function PortalLightbox({ it, onClose }) {
  const all = [it.img, ...(Array.isArray(it.images) ? it.images : [])].filter(Boolean);
  const [cur, setCur] = useP(0);
  usePE(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  const shown = all[Math.min(cur, all.length - 1)] || it.img;
  return (
    <div role="dialog" aria-modal="true" aria-label={"Фото: " + (it.title || "позиция")} onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(46,42,38,.8)", backdropFilter: "blur(4px)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, cursor: "zoom-out" }}>
      <button className="icon-btn" onClick={onClose} aria-label="Закрыть фото"
        style={{ position: "absolute", top: 18, right: 18 }}><I.close size={18} /></button>
      <img src={shown} alt={it.title || ""} onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "min(92vw, 900px)", maxHeight: "72vh", objectFit: "contain", borderRadius: 12,
          background: "var(--surface)", boxShadow: "var(--shadow-pop)", cursor: "default" }} />
      <div style={{ color: "#F7F2EA", fontSize: "var(--fs-14)", fontWeight: 600, textAlign: "center", maxWidth: 640 }}>{it.title}</div>
      {all.length > 1 && (
        <div style={{ display: "flex", gap: 8 }} role="group" aria-label="Фото позиции" onClick={(e) => e.stopPropagation()}>
          {all.map((u, i) => (
            <button key={i} type="button" onClick={() => setCur(i)} aria-pressed={i === cur}
              aria-label={"Фото " + (i + 1) + " из " + all.length}
              style={{ width: 52, height: 52, flex: "none", borderRadius: 8, overflow: "hidden", padding: 0, cursor: "pointer",
                border: i === cur ? "2px solid var(--accent-2)" : "2px solid rgba(247,242,234,.4)", opacity: i === cur ? 1 : 0.7 }}>
              <Img src={u} label="" radius={6} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PortalWrap({ children }) {
  return (
    <div className="minh-screen" style={{ background: "var(--bg-base)" }}>
      <main id="main" className="container" style={{ maxWidth: 760, paddingBlock: "clamp(24px,5vh,56px)" }}>{children}</main>
    </div>
  );
}

function ClientPortal({ shareId }) {
  const F = window.LedgerFFE || null;
  const PAPI = window.LedgerPortalAPI || null;
  const live = !!(PAPI && PAPI.remote());
  const [rec, setRec] = useP(() => (F ? F.loadPortalShare(shareId) : null));
  // живой доступ (A2): гидрация с сервера — чужое устройство получает шару по ссылке,
  // своё — подтягивает свежие ответы; пока грузится, не пугаем «ссылка недействительна»
  const [hydrating, setHydrating] = useP(live);
  const [view, setView] = useP("list");   // K1: Список / Галерея (галерея — крупные фото сеткой)
  const [zoom, setZoom] = useP(null);      // позиция с открытым лайтбоксом фото | null
  usePE(() => {
    if (!live) return;
    let alive = true;
    PAPI.hydrate(shareId)
      .then((r) => { if (alive && r) setRec({ ...r }); })
      .finally(() => { if (alive) setHydrating(false); });
    return () => { alive = false; };
  }, [shareId]);
  usePE(() => { document.title = "Design Ledger · Смета на согласование"; }, []);
  // Ч4 «клиент открыл» (адаптация ченджлога Programa): каждый заход по ссылке — визит;
  // rec в стейт не переливаем — счётчик клиенту не показывается, лишний ререндер не нужен.
  // Зависимость от «rec появился»: на чужом устройстве запись есть только после гидрации
  usePE(() => { if (F && rec) F.notePortalVisit(shareId); }, [shareId, rec ? 1 : 0]);

  if (hydrating && !rec) {
    return (
      <PortalWrap>
        <div style={{ textAlign: "center", paddingTop: "12vh" }}>
          <Logo size={26} />
          <p style={{ color: "var(--muted)", fontSize: "var(--fs-15)", marginTop: 24 }}>Загружаем смету…</p>
        </div>
      </PortalWrap>
    );
  }
  if (!F || !rec) {
    return (
      <PortalWrap>
        <div style={{ textAlign: "center", paddingTop: "12vh" }}>
          <Logo size={26} />
          <h1 className="display" style={{ fontSize: "var(--fs-26)", marginTop: 24 }}>Ссылка недействительна</h1>
          <p style={{ color: "var(--muted)", fontSize: "var(--fs-15)", maxWidth: 420, margin: "12px auto 0", lineHeight: 1.6 }}>
            Смета по этой ссылке не найдена — возможно, она устарела или открыта в другом браузере. Попросите дизайнера прислать ссылку заново.
          </p>
        </div>
      </PortalWrap>
    );
  }

  const snap = rec.snapshot || {};
  // K3: тумблеры приватности шары — старые ссылки без rec.visibility получают дефолт
  // (всё выкл), т.е. ведут себя ровно как раньше, когда тумблеров не было
  const vis = Object.assign(F.defaultShareVisibility ? F.defaultShareVisibility() : {}, rec.visibility || {});
  // док-коды позиций (K1) — тем же assignDocCodes, что смета/PDF/Excel; коды сходятся везде
  const rawRooms = Array.isArray(snap.rooms) ? snap.rooms : [];
  const rooms = F.assignDocCodes ? F.assignDocCodes(rawRooms) : rawRooms;
  const cp = F.clientPricing(snap);
  const anyPhoto = rooms.some((r) => (r.items || []).some((it) => it.img));
  const itemsCount = rooms.reduce((s, r) => s + (r.items || []).length, 0);
  const apOf = (it) => (F.APPROVE_BY_ID[it.approve] ? it.approve : "pending");
  const okCount = rooms.reduce((s, r) => s + (r.items || []).filter((it) => apOf(it) === "ok").length, 0);
  const answered = rooms.reduce((s, r) => s + (r.items || []).filter((it) => apOf(it) !== "pending").length, 0);

  const respond = (ri, ii, id) => {
    const cur = apOf(rooms[ri].items[ii]);
    const updated = F.setPortalApprove(shareId, ri, ii, cur === id ? "pending" : id); // повторный клик — снять
    if (updated) setRec({ ...updated });
  };
  const comment = (ri, ii, text) => {
    const updated = F.addPortalComment(shareId, ri, ii, "client", text);
    if (updated) setRec({ ...updated });
  };
  // K1: клиент скачивает смету PDF — та же клиентская выгрузка, что в кабинете (mode:"client",
  // без себестоимости), аргументы = specArgs дизайнера, собранные из снимка портал-шары
  const exportClientPDF = () => {
    if (!(window.LedgerPDF && window.LedgerPDF.exportRoomSpec)) { if (window.toast) toast("PDF-модуль ещё загружается — попробуйте через секунду.", "info"); return; }
    const run = window.withLib || ((k, fn) => fn());
    run("pdf", () => window.LedgerPDF.exportRoomSpec({
      project: rec.projectName || "Смета комплектации", area: "", rooms, grand: 0,
      markupPct: snap.markup, catMarkupPct: snap.catMarkup || {}, clientTotal: cp.client,
      discountPct: snap.discount || 0, deliveryCost: snap.delivery || 0, installCost: snap.install || 0,
      extras: snap.extras || [], budget: 0, mode: "client",
      studioName: rec.studioName || "",
      studioContact: [rec.studioCity, rec.studioPhone, rec.studioEmail].filter(Boolean).join(" · "),
    }));
  };

  // K1: одна позиция — общий рендер для «Списка» и «Галереи» (решения+комментарии те же,
  // меняется только раскладка). Код позиции — серым перед названием, виден клиенту.
  const renderItem = (r, ri, it, ii) => {
    const cur = apOf(it);
    const qty = it.qty || 1;
    // FF&E-детали для клиента: материал/габариты всегда, артикул/срок/запас — по тумблерам
    // приватности шары (K3), поставщик и ссылка на товар — отдельно (не через ffeMeta)
    const ffe = F && F.ffeMeta ? F.ffeMeta(it, { client: true, showSku: vis.sku, showLead: vis.details, showWaste: vis.details }) : "";
    const metaTxt = [ffe, vis.supplier && it.sup ? it.sup : ""].filter(Boolean).join(" · ");
    const urlLink = vis.url && it.url ? (
      <a className="mono" href={it.url} target="_blank" rel="noreferrer"
        style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: "var(--fs-11)", color: "var(--info)", marginTop: 2 }}>
        Ссылка на товар <I.arrow size={11} />
      </a>
    ) : null;
    const codeTitle = (
      <React.Fragment>
        {it.code && <span className="mono" style={{ color: "var(--spec-meta)", fontWeight: 500, marginRight: 7 }}>{it.code}</span>}
        {it.title}
      </React.Fragment>
    );
    const decisions = (
      <div role="group" aria-label={"Ваше решение по позиции «" + it.title + "»"} style={{ display: "flex", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
        {PORTAL_CHOICES.map((c) => {
          const on = cur === c.id;
          return (
            <button key={c.id} onClick={() => respond(ri, ii, c.id)} aria-pressed={on}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 99, fontSize: "var(--fs-12)", fontWeight: 700,
                border: "1px solid " + (on ? c.color : "var(--hairline)"),
                background: on ? c.color : "transparent",
                color: on ? "var(--on-accent)" : "var(--muted)",
                transition: "background var(--dur-fast), border-color var(--dur-fast), color var(--dur-fast)" }}>
              {on && <I.check size={13} />}{c.label}
            </button>
          );
        })}
      </div>
    );
    const thread = <PortalCommentThread comments={it.comments || []} onSend={(text) => comment(ri, ii, text)} />;

    if (view === "gallery") {
      return (
        <div key={ii} className="glass" style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--hairline)", display: "flex", flexDirection: "column" }}>
          {/* K5c: мультифото — большое фото + мини-тумбнейлы листания (если фото больше одного) */}
          <PortalPhotoBox it={it} onZoom={() => setZoom(it)} />
          <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
            <div style={{ fontSize: "var(--fs-14)", fontWeight: 600, lineHeight: 1.35 }}>{codeTitle}</div>
            {metaTxt && <div className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--spec-meta)", overflowWrap: "anywhere" }}>{metaTxt}</div>}
            {urlLink}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginTop: 4 }}>
              <span className="mono" style={{ fontSize: "var(--fs-12)", color: "var(--spec-meta)" }}>{qty} × {fmtMoney(cp.unitClient(it))}</span>
              <span className="mono" style={{ fontSize: "var(--fs-15)", fontWeight: 700, color: "var(--accent-2-ink)" }}>{fmtMoney(cp.lineClient(it))}</span>
            </div>
            {cp.lineSavings(it) > 0 && <div className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--accent-2-ink)", textAlign: "right" }}>выгода {fmtMoney(cp.lineSavings(it))}</div>}
            {decisions}
            {thread}
          </div>
        </div>
      );
    }

    return (
      <div key={ii} style={{ padding: "12px 0", borderTop: ii ? "1px solid var(--hairline-2)" : "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, minWidth: 0 }}>
            {anyPhoto && (it.img
              ? <button type="button" onClick={() => setZoom(it)} aria-label={"Показать фото крупно: " + it.title}
                  title="Показать фото крупно"
                  style={{ width: 46, height: 46, flex: "none", borderRadius: 8, overflow: "hidden", padding: 0, cursor: "zoom-in", border: "1px solid var(--hairline)" }}>
                  <Img src={it.img} label="" radius={8} />
                </button>
              : <span style={{ width: 46, flex: "none" }} aria-hidden="true" />)}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "var(--fs-14)", fontWeight: 600 }}>{codeTitle}</div>
              {metaTxt && <div className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--spec-meta)", marginTop: 2, overflowWrap: "anywhere" }}>{metaTxt}</div>}
              {urlLink}
              <div className="mono" style={{ fontSize: "var(--fs-12)", color: "var(--spec-meta)", marginTop: 2 }}>
                {qty} × {fmtMoney(cp.unitClient(it))}{it.cat ? " · " + it.cat : ""}
              </div>
            </div>
          </div>
          {/* RRP-слой (п.17): под ценой — выгода клиента от розницы (только положительная, витрина) */}
          <span className="mono" style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", fontSize: "var(--fs-14)", fontWeight: 700, whiteSpace: "nowrap", color: "var(--accent-2-ink)" }}>
            {fmtMoney(cp.lineClient(it))}
            {cp.lineSavings(it) > 0 && <span style={{ fontSize: "var(--fs-11)", fontWeight: 500 }}>выгода {fmtMoney(cp.lineSavings(it))}</span>}
          </span>
        </div>
        {decisions}
        {thread}
      </div>
    );
  };

  return (
    <PortalWrap>
      {/* шапка студии — брендинг портала (волна A5): имя студии дизайнера над платформенным лого */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
        <Logo size={24} />
        <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: "var(--fs-12)", fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)" }}>Смета на согласование</span>
          {itemsCount > 0 && (
            <button className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: "var(--fs-12)", flex: "none" }} onClick={exportClientPDF} title="Скачать смету в PDF">
              <I.download size={14} />Скачать PDF
            </button>
          )}
        </span>
      </div>
      {rec.studioName && <div style={{ fontSize: "var(--fs-13)", fontWeight: 700, color: "var(--accent-ink)", marginTop: 14 }}>{rec.studioName}</div>}
      {/* контакты студии (волна W4.1) — снимок на момент публикации ссылки, как и studioName */}
      {(rec.studioCity || rec.studioPhone || rec.studioEmail) && (
        <div style={{ fontSize: "var(--fs-12)", color: "var(--muted)", marginTop: 2 }}>
          {[rec.studioCity, rec.studioPhone, rec.studioEmail].filter(Boolean).join(" · ")}
        </div>
      )}
      <h1 className="display" style={{ fontSize: "clamp(26px,4vw,34px)", marginTop: rec.studioName ? 4 : 14 }}>{rec.projectName || "Смета комплектации"}</h1>
      <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", marginTop: 6 }}>
        {itemsCount} {plural(itemsCount, ["позиция", "позиции", "позиций"])} · итог {fmtMoney(cp.totalClient)}
        {okCount > 0 ? " · согласовано " + okCount + " из " + itemsCount : ""}
      </p>
      {/* K1 (паттерн Programa «Last Updated N ago»): свежесть снимка сметы = момент публикации ссылки */}
      {fmtRelTime(rec.createdAt) && (
        <div className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--spec-meta)", marginTop: 3 }}>Обновлено {fmtRelTime(rec.createdAt)}</div>
      )}
      {/* паспорт стиля проекта («стили ожили», 14.07) — снимок на момент публикации, как studioName:
         клиент видит направление (палитра + материалы), по которому собрана комплектация */}
      {rec.style && rec.style.name && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          {rec.style.palette && rec.style.palette.length > 0 && (
            <span style={{ display: "inline-flex", gap: 3 }} aria-hidden="true">
              {rec.style.palette.map((c, i) => <span key={i} style={{ width: 16, height: 16, borderRadius: 5, background: c, border: "1px solid var(--hairline)" }} />)}
            </span>
          )}
          <span style={{ fontSize: "var(--fs-13)", fontWeight: 700 }}>{rec.style.name}</span>
          {rec.style.materials && rec.style.materials.length > 0 && (
            <span style={{ fontSize: "var(--fs-12)", color: "var(--muted)" }}>{rec.style.materials.slice(0, 5).join(" · ")}</span>
          )}
        </div>
      )}
      {itemsCount > 0 && (
        <div style={{ marginTop: 10, maxWidth: 340 }}>
          <div className="budget-bar" style={{ height: 6 }}>
            <i style={{ transform: `scaleX(${answered / itemsCount})`, background: "linear-gradient(90deg,var(--accent-2),#39b88c)" }} />
          </div>
          <div className="mono" style={{ fontSize: "var(--fs-11)", color: "var(--spec-meta)", marginTop: 5 }}>отвечено {answered} из {itemsCount}</div>
        </div>
      )}

      {/* честная заметка про демо-ссылку (доступ с др. устройства — с доменом) */}
      <div className="glass" style={{ borderRadius: 12, padding: "11px 14px", margin: "16px 0 22px", fontSize: "var(--fs-12)", color: "var(--muted)", lineHeight: 1.5, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <I.info size={16} style={{ color: "var(--accent)", flex: "none", marginTop: 1 }} />
        <span>Отметьте по каждой позиции решение — <b>согласовать</b>, <b>на пересмотр</b> или <b>отклонить</b> — и, если нужно, напишите комментарий дизайнеру. Ответы сохраняются автоматически. Это демо-ссылка (работает в этом браузере); доступ с другого устройства подключится вместе с доменом студии.</span>
      </div>

      {/* K1: переключатель Список / Галерея (паттерн Programa List/Grid) — только если есть фото */}
      {anyPhoto && itemsCount > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <SegTabs className="spec-mode" ariaLabel="Вид сметы"
            items={[{ id: "list", label: "Список" }, { id: "gallery", label: "Галерея" }]}
            value={view} onChange={setView} />
        </div>
      )}

      {/* комнаты и позиции */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {rooms.map((r, ri) => (
          <div key={ri} className="glass" style={{ borderRadius: "var(--r-lg)", padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
              <h2 style={{ fontSize: "var(--fs-16)", fontWeight: 800, fontFamily: "var(--font-display)" }}>{r.name || "Помещение"}</h2>
              <span className="mono" style={{ fontSize: "var(--fs-12)", color: "var(--spec-meta)" }}>{fmtMoney((r.items || []).reduce((s, it) => s + cp.lineClient(it), 0))}</span>
            </div>
            {view === "gallery"
              ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 }}>
                  {(r.items || []).map((it, ii) => renderItem(r, ri, it, ii))}
                </div>
              : <div style={{ display: "flex", flexDirection: "column" }}>
                  {(r.items || []).map((it, ii) => renderItem(r, ri, it, ii))}
                </div>}
          </div>
        ))}
      </div>

      {/* итог для клиента (структура = клиентский режим сметы) */}
      <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: "16px 20px", marginTop: 20 }}>
        <div style={{ ...RS_ROW }}><span style={{ color: "var(--muted)" }}>Подытог</span><span className="mono">{fmtMoney(cp.client)}</span></div>
        {cp.discountAmt > 0 && <div style={{ ...RS_ROW, borderTop: "1px solid var(--hairline-2)" }}><span style={{ color: "var(--muted)" }}>Скидка −{cp.discount}%</span><span className="mono" style={{ color: "var(--accent-ink)" }}>−{fmtMoney(cp.discountAmt)}</span></div>}
        {cp.delivery > 0 && <div style={{ ...RS_ROW, borderTop: "1px solid var(--hairline-2)" }}><span style={{ color: "var(--muted)" }}>Доставка</span><span className="mono">{fmtMoney(cp.delivery)}</span></div>}
        {cp.install > 0 && <div style={{ ...RS_ROW, borderTop: "1px solid var(--hairline-2)" }}><span style={{ color: "var(--muted)" }}>Сборка и монтаж</span><span className="mono">{fmtMoney(cp.install)}</span></div>}
        {(cp.extras || []).map((ex) => {
          const exAmt = F.extraAmount(ex, cp.client - cp.discountAmt);
          return exAmt > 0 ? (
            <div key={ex.id} style={{ ...RS_ROW, borderTop: "1px solid var(--hairline-2)" }}><span style={{ color: "var(--muted)" }}>{ex.label}</span><span className="mono">{fmtMoney(exAmt)}</span></div>
          ) : null;
        })}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 12, marginTop: 8, borderTop: "2px solid var(--text)" }}>
          <span style={{ fontWeight: 800, fontFamily: "var(--font-display)", fontSize: "var(--fs-15)" }}>Итого</span>
          <span className="mono" style={{ fontWeight: 600, fontSize: "var(--fs-24)", letterSpacing: "-0.01em" }}>{fmtMoney(cp.totalClient)}</span>
        </div>
        {/* RRP-слой (п.17): выгода от розницы — те же числа, что в смете дизайнера/PDF/Excel */}
        {cp.savings > 0 && (
          <div className="mono" style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--hairline-2)", fontSize: "var(--fs-11)", color: "var(--accent-2-ink)" }}>
            Розница в магазинах {fmtMoney(cp.rrpTotal)} — ваша выгода {fmtMoney(cp.savings)}
          </div>
        )}
      </div>

      <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "var(--fs-12)", marginTop: 22, lineHeight: 1.6 }}>
        {answered > 0 ? "Ваши решения сохранены (" + answered + " из " + itemsCount + "). " : ""}Дизайнер увидит ответы и свяжется с вами. · Design Ledger
      </p>
      {zoom && <PortalLightbox it={zoom} onClose={() => setZoom(null)} />}
    </PortalWrap>
  );
}

/* ---------------- ССЫЛКА ДЛЯ КЛИЕНТА (модалка дизайнера) ---------------- */
function ShareLinkModal({ share, onClose }) {
  const F = window.LedgerFFE || null;
  const [copied, setCopied] = useP(false);
  // K3: тумблеры приватности — правятся в любой момент, ссылка не перевыпускается
  // (паттерн Programa); локальный стейт синхронный с localStorage через setShareVisibility
  const [vis, setVis] = useP(() => Object.assign(F && F.defaultShareVisibility ? F.defaultShareVisibility() : {}, share.visibility || {}));
  const toggleVis = (id) => {
    const next = { ...vis, [id]: !vis[id] };
    setVis(next);
    if (F && F.setShareVisibility) F.setShareVisibility(share.shareId, { [id]: next[id] });
  };
  const link = location.origin + location.pathname + "#portal/" + share.shareId;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { const el = document.getElementById("share-link-inp"); if (el) { el.select(); document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 1800); } }
  };
  return (
    <Modal onClose={onClose} label="Ссылка для клиента" maxWidth={520}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--hairline)" }}>
        <h3 className="display" style={{ fontSize: "var(--fs-21)" }}>Ссылка для клиента</h3>
        <button className="icon-btn" onClick={onClose} aria-label="Закрыть"><I.close size={18} /></button>
      </div>
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", lineHeight: 1.6 }}>
          Отправьте клиенту ссылку на версию «{share.versionLabel || "смета"}». Он увидит смету в режиме «для клиента» (без себестоимости) и отметит решение по каждой позиции — вы увидите ответы здесь.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <input id="share-link-inp" className="fld" readOnly value={link} onFocus={(e) => e.target.select()} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-12)" }} />
          <button className="btn btn-primary" style={{ padding: "0 16px", flex: "none" }} onClick={copy}>{copied ? <React.Fragment><I.check size={15} />Скопировано</React.Fragment> : "Копировать"}</button>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <a className="btn btn-ghost" href={link} target="_blank" rel="noopener noreferrer" style={{ padding: "8px 14px", fontSize: "var(--fs-13)" }}><I.arrow size={14} />Открыть портал</a>
        </div>
        {/* K3: тумблеры приватности — поле видимости по аудитории (обобщение канона
           «SKU не клиенту»), всё выкл по умолчанию; цена и итог не тумблер — суть портала */}
        {F && F.SHARE_VISIBILITY_FIELDS && (
          <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 14 }}>
            <div style={{ fontWeight: 600, fontSize: "var(--fs-13)", marginBottom: 9 }}>Что дополнительно видит клиент</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {F.SHARE_VISIBILITY_FIELDS.map((f) => (
                <label key={f.id} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: "var(--fs-13)", cursor: "pointer" }}>
                  <input type="checkbox" checked={!!vis[f.id]} onChange={() => toggleVis(f.id)}
                    style={{ width: 15, height: 15, accentColor: "var(--accent-2)", flex: "none" }} />
                  {f.label}
                </label>
              ))}
            </div>
            <div style={{ fontSize: "var(--fs-11)", color: "var(--muted)", marginTop: 9, lineHeight: 1.5 }}>
              Цена и итог видны клиенту всегда — без них он не сможет согласовать смету. Материал и габариты видны по умолчанию.
            </div>
          </div>
        )}
        <div style={{ fontSize: "var(--fs-12)", color: "var(--muted)", lineHeight: 1.55, display: "flex", gap: 9, alignItems: "flex-start", marginTop: 2 }}>
          <I.info size={15} style={{ color: "var(--accent)", flex: "none", marginTop: 1 }} />
          <span>Пока это демо-ссылка — она работает в этом браузере. Доступ клиента с его устройства подключится вместе с доменом студии и облаком (Worker + KV), без изменений в интерфейсе.</span>
        </div>
      </div>
    </Modal>
  );
}

window.ClientPortal = ClientPortal;
window.ShareLinkModal = ShareLinkModal;
window.PortalWrap = PortalWrap;
