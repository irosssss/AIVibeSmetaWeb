/* ============================================================
   Design Ledger — КЛИЕНТСКИЙ ПОРТАЛ (волна A2 бенчмарка Programa, groundwork)
   ------------------------------------------------------------
   Отдельная клиент-facing страница по ссылке #portal/{shareId}: клиент
   видит смету в режиме «для клиента» (цены с наценкой, без себестоимости,
   только чтение) и отвечает по позициям — то же поле approve словаря A1
   (AIVibeFFE.APPROVE_STATUSES). Данные — снимок версии из localStorage
   (AIVibeFFE.loadPortalShare); ответы персистятся туда же. Живой доступ
   с другого устройства подключится с Worker+KV/доменом БЕЗ переписывания UI.
   Имена top-level уникальны — общая глобальная область (как остальные файлы).
   ============================================================ */
const { useState: useP, useEffect: usePE } = React;

/* три решения клиента (pending = не ответил). Цвета — из словаря A1. */
const PORTAL_CHOICES = [
  { id: "ok", label: "Согласовать", color: "var(--accent-2)" },
  { id: "revise", label: "На пересмотр", color: "var(--info)" },
  { id: "rejected", label: "Отклонить", color: "var(--accent)" },
];

/* Дата+время треда — короче ISO, читаемо в переписке («08.07 14:32»). */
const fmtCommentAt = (iso) => {
  try { return new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
};

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
            <div key={c.id} style={{
              alignSelf: c.author === "client" ? "flex-end" : "flex-start", maxWidth: "88%",
              padding: "6px 10px", borderRadius: 10, fontSize: 12.5, lineHeight: 1.5,
              background: c.author === "client" ? "var(--accent-2)" : "var(--glass-2)",
              color: c.author === "client" ? "var(--on-accent)" : "var(--text)",
              border: c.author === "client" ? "none" : "1px solid var(--hairline)",
            }}>
              <div>{c.text}</div>
              <div style={{ fontSize: 10.5, opacity: .75, marginTop: 3 }}>{c.author === "client" ? "Вы" : "Студия"} · {fmtCommentAt(c.at)}</div>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={send} style={{ display: "flex", gap: 6 }}>
        <input className="fld" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Комментарий к позиции…"
          aria-label="Комментарий к позиции" style={{ fontSize: 12.5, padding: "6px 9px", flex: 1 }} />
        <button type="submit" className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12, flex: "none" }} disabled={!draft.trim()}>Отправить</button>
      </form>
    </div>
  );
}

function PortalWrap({ children }) {
  return (
    <div className="minh-screen" style={{ background: "var(--bg)" }}>
      <div className="container" style={{ maxWidth: 760, paddingBlock: "clamp(24px,5vh,56px)" }}>{children}</div>
    </div>
  );
}

function ClientPortal({ shareId }) {
  const F = window.AIVibeFFE || null;
  const [rec, setRec] = useP(() => (F ? F.loadPortalShare(shareId) : null));
  usePE(() => { document.title = "Design Ledger · Смета на согласование"; }, []);

  if (!F || !rec) {
    return (
      <PortalWrap>
        <div style={{ textAlign: "center", paddingTop: "12vh" }}>
          <Logo size={26} />
          <h1 className="display" style={{ fontSize: 26, marginTop: 24 }}>Ссылка недействительна</h1>
          <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 420, margin: "12px auto 0", lineHeight: 1.6 }}>
            Смета по этой ссылке не найдена — возможно, она устарела или открыта в другом браузере. Попросите дизайнера прислать ссылку заново.
          </p>
        </div>
      </PortalWrap>
    );
  }

  const snap = rec.snapshot || {};
  const rooms = Array.isArray(snap.rooms) ? snap.rooms : [];
  const cp = F.clientPricing(snap);
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

  const RS_ROW = { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", fontSize: 14 };
  return (
    <PortalWrap>
      {/* шапка студии — брендинг портала (волна A5): имя студии дизайнера над платформенным лого */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
        <Logo size={24} />
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--faint)" }}>Смета на согласование</span>
      </div>
      {rec.studioName && <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--accent-ink)", marginTop: 14 }}>{rec.studioName}</div>}
      <h1 className="display" style={{ fontSize: "clamp(26px,4vw,34px)", marginTop: rec.studioName ? 4 : 14 }}>{rec.projectName || "Смета комплектации"}</h1>
      <p style={{ color: "var(--muted)", fontSize: 14.5, marginTop: 6 }}>
        {itemsCount} {plural(itemsCount, ["позиция", "позиции", "позиций"])} · итог {fmtMoney(cp.totalClient)}
        {okCount > 0 ? " · согласовано " + okCount + " из " + itemsCount : ""}
      </p>

      {/* честная заметка про демо-ссылку (доступ с др. устройства — с доменом) */}
      <div className="glass" style={{ borderRadius: 12, padding: "11px 14px", margin: "16px 0 22px", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <I.info size={16} style={{ color: "var(--accent)", flex: "none", marginTop: 1 }} />
        <span>Отметьте по каждой позиции решение — <b>согласовать</b>, <b>на пересмотр</b> или <b>отклонить</b> — и, если нужно, напишите комментарий дизайнеру. Ответы сохраняются автоматически. Это демо-ссылка (работает в этом браузере); доступ с другого устройства подключится вместе с доменом студии.</span>
      </div>

      {/* комнаты и позиции */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {rooms.map((r, ri) => (
          <div key={ri} className="glass" style={{ borderRadius: "var(--r-lg)", padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
              <h2 style={{ fontSize: 16.5, fontWeight: 700 }}>{r.name || "Помещение"}</h2>
              <span className="mono" style={{ fontSize: 12.5, color: "var(--spec-meta)" }}>{fmtMoney((r.items || []).reduce((s, it) => s + cp.lineClient(it), 0))}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {(r.items || []).map((it, ii) => {
                const cur = apOf(it);
                const qty = it.qty || 1;
                return (
                  <div key={ii} style={{ padding: "12px 0", borderTop: ii ? "1px solid var(--hairline-2)" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 600 }}>{it.title}</div>
                        <div className="mono" style={{ fontSize: 12, color: "var(--spec-meta)", marginTop: 2 }}>
                          {qty} × {fmtMoney(cp.unitClient(it))}{it.cat ? " · " + it.cat : ""}
                        </div>
                      </div>
                      <span className="mono" style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", color: "var(--accent-2-ink)" }}>{fmtMoney(cp.lineClient(it))}</span>
                    </div>
                    {/* решение клиента */}
                    <div role="group" aria-label={"Ваше решение по позиции «" + it.title + "»"} style={{ display: "flex", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
                      {PORTAL_CHOICES.map((c) => {
                        const on = cur === c.id;
                        return (
                          <button key={c.id} onClick={() => respond(ri, ii, c.id)} aria-pressed={on}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 99, fontSize: 12.5, fontWeight: 700,
                              border: "1px solid " + (on ? c.color : "var(--hairline)"),
                              background: on ? c.color : "transparent",
                              color: on ? "var(--on-accent)" : "var(--muted)" }}>
                            {on && <I.check size={13} />}{c.label}
                          </button>
                        );
                      })}
                    </div>
                    <PortalCommentThread comments={it.comments || []} onSend={(text) => comment(ri, ii, text)} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* итог для клиента (структура = клиентский режим сметы) */}
      <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: "16px 20px", marginTop: 20 }}>
        <div style={{ ...RS_ROW }}><span style={{ color: "var(--muted)" }}>Подытог</span><span className="mono">{fmtMoney(cp.client)}</span></div>
        {cp.discountAmt > 0 && <div style={{ ...RS_ROW, borderTop: "1px solid var(--hairline-2)" }}><span style={{ color: "var(--muted)" }}>Скидка −{cp.discount}%</span><span className="mono" style={{ color: "var(--accent-ink)" }}>−{fmtMoney(cp.discountAmt)}</span></div>}
        {cp.delivery > 0 && <div style={{ ...RS_ROW, borderTop: "1px solid var(--hairline-2)" }}><span style={{ color: "var(--muted)" }}>Доставка</span><span className="mono">{fmtMoney(cp.delivery)}</span></div>}
        {cp.install > 0 && <div style={{ ...RS_ROW, borderTop: "1px solid var(--hairline-2)" }}><span style={{ color: "var(--muted)" }}>Сборка и монтаж</span><span className="mono">{fmtMoney(cp.install)}</span></div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 12, marginTop: 8, borderTop: "2px solid var(--text)" }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Итого</span>
          <span className="mono" style={{ fontWeight: 600, fontSize: 24, letterSpacing: "-0.01em" }}>{fmtMoney(cp.totalClient)}</span>
        </div>
      </div>

      <p style={{ textAlign: "center", color: "var(--faint)", fontSize: 12.5, marginTop: 22, lineHeight: 1.6 }}>
        {answered > 0 ? "Ваши решения сохранены (" + answered + " из " + itemsCount + "). " : ""}Дизайнер увидит ответы и свяжется с вами. · Design Ledger
      </p>
    </PortalWrap>
  );
}

/* ---------------- ССЫЛКА ДЛЯ КЛИЕНТА (модалка дизайнера) ---------------- */
function ShareLinkModal({ share, onClose }) {
  const [copied, setCopied] = useP(false);
  const link = location.origin + location.pathname + "#portal/" + share.shareId;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { const el = document.getElementById("share-link-inp"); if (el) { el.select(); document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 1800); } }
  };
  return (
    <Modal onClose={onClose} label="Ссылка для клиента" maxWidth={520}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--hairline)" }}>
        <h3 className="display" style={{ fontSize: 20 }}>Ссылка для клиента</h3>
        <button className="icon-btn" onClick={onClose} aria-label="Закрыть"><I.close size={18} /></button>
      </div>
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6 }}>
          Отправьте клиенту ссылку на версию «{share.versionLabel || "смета"}». Он увидит смету в режиме «для клиента» (без себестоимости) и отметит решение по каждой позиции — вы увидите ответы здесь.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <input id="share-link-inp" className="fld" readOnly value={link} onFocus={(e) => e.target.select()} style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }} />
          <button className="btn btn-primary" style={{ padding: "0 16px", flex: "none" }} onClick={copy}>{copied ? <React.Fragment><I.check size={15} />Скопировано</React.Fragment> : "Копировать"}</button>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <a className="btn btn-ghost" href={link} target="_blank" rel="noopener noreferrer" style={{ padding: "8px 14px", fontSize: 13 }}><I.arrow size={14} />Открыть портал</a>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--faint)", lineHeight: 1.55, display: "flex", gap: 9, alignItems: "flex-start", marginTop: 2 }}>
          <I.info size={15} style={{ color: "var(--accent)", flex: "none", marginTop: 1 }} />
          <span>Пока это демо-ссылка — она работает в этом браузере. Доступ клиента с его устройства подключится вместе с доменом студии и облаком (Worker + KV), без изменений в интерфейсе.</span>
        </div>
      </div>
    </Modal>
  );
}

window.ClientPortal = ClientPortal;
window.ShareLinkModal = ShareLinkModal;
