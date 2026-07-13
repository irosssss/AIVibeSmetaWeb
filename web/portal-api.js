/* ============================================================
   Design Ledger — СЕТЕВОЙ СЛОЙ ПОРТАЛА (волна A2, живой доступ с чужого устройства)
   ------------------------------------------------------------
   Мост между localStorage-моком портала (ffe.js) и API на Yandex Cloud
   (server/portal, деплой — docs/PORTAL_DEPLOY_YC.md). Дизайн: localStorage
   остаётся ЛОКАЛЬНЫМ КЭШЕМ и оптимистичным стором — операция применяется
   локально мгновенно (UI как был, синхронный), а на сервер ЗЕРКАЛИРУЕТСЯ
   в фоне той же семантикой (паритет закреплён tests/portal-server.test.js).
   Чтение с чужого устройства — гидрация: GET шары → в кэш → обычный рендер.

   Включение: window.LEDGER_PORTAL_API_BASE = "https://api.designledger.ru"
   (index.html / билд-конфиг) либо localStorage "aivibe:portalApiBase" — удобно
   включить на задеплоенном билде без пересборки. Без конфига файл НИЧЕГО не
   меняет: все функции ffe.js работают как раньше (мок) — поведение байт-в-байт.

   Реализация — патч СВОЙСТВ window.LedgerFFE (не замена объекта): компоненты
   зовут F.setPortalApprove(...) property-access'ом на том же объекте, поэтому
   ловушка «снимок глобала при загрузке» (см. память проекта) не срабатывает.

   Надёжность: упавшая зеркалируемая операция уходит в outbox (localStorage) и
   ретраится при следующей операции/гидрации — ответ клиента с мобильного в
   лифте не теряется молча. Конфликтов нет by design: сервер применяет операции,
   а не принимает whole-record PUT. ~ Известное ограничение v1: пульс кабинета
   читает кэш — свежие ответы клиента дизайнер подтягивает открытием «Версий»
   (гидрация там) или открытием портала; фоновый poll — следующей волной. */
(function () {
  const F = window.LedgerFFE;
  if (!F || !F.createPortalShare) return;   // ffe.js обязан загрузиться раньше (main.jsx)

  const base = () => {
    let b = window.LEDGER_PORTAL_API_BASE || "";
    if (!b) { try { b = localStorage.getItem("aivibe:portalApiBase") || ""; } catch {} }
    return String(b).replace(/\/+$/, "");
  };
  const remote = () => !!base();
  const PKEY = (id) => "aivibe:portal:" + id;   // тот же ключ, что в ffe.js — единый кэш
  const saveCache = (rec) => { try { localStorage.setItem(PKEY(rec.shareId), JSON.stringify(rec)); } catch {} };

  /* -------- outbox: очередь незеркалированных операций -------- */
  const OKEY = "aivibe:portal:outbox";
  const outRead = () => { try { return JSON.parse(localStorage.getItem(OKEY)) || []; } catch { return []; } };
  const outWrite = (q) => { try { localStorage.setItem(OKEY, JSON.stringify(q.slice(-50))); } catch {} };

  async function post(path, body) {
    const res = await fetch(base() + path, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!res.ok && res.status !== 200 && res.status !== 201) throw new Error("portal api " + res.status);
    return res.json();
  }
  async function flushOutbox() {
    if (!remote()) return;
    const q = outRead();
    if (!q.length) return;
    outWrite([]);
    for (const job of q) {
      try { await post(job.path, job.body); }
      catch { outWrite([...outRead(), job]); }   // не ушло снова — вернуть в хвост
    }
  }
  function mirror(path, body) {
    if (!remote()) return;
    post(path, body).then(flushOutbox).catch(() => {
      outWrite([...outRead(), { path, body }]);
      console.warn("портал: операция не дошла до сервера, отложена в outbox");
    });
  }

  /* -------- гидрация: свежая шара с сервера → локальный кэш -------- */
  async function hydrate(shareId) {
    if (!remote()) return F.loadPortalShare(shareId);
    try {
      // сначала дослать outbox: иначе GET вернёт запись БЕЗ неотправленных локальных
      // ответов и saveCache затёр бы их в кэше (ответ клиента «пропал» бы визуально)
      await flushOutbox();
      const res = await fetch(base() + "/portal/shares/" + encodeURIComponent(shareId));
      if (res.status === 404) return F.loadPortalShare(shareId);   // сервер не знает — вдруг есть локально (мок-эра)
      if (!res.ok) throw new Error("portal api " + res.status);
      const rec = await res.json();
      if (rec && rec.shareId) { saveCache(rec); return rec; }
      return F.loadPortalShare(shareId);
    } catch {
      return F.loadPortalShare(shareId);   // офлайн/сбой — честный фолбэк на кэш
    }
  }

  /* -------- зеркалирование операций поверх мока ffe.js -------- */
  const orig = {
    create: F.createPortalShare, approve: F.setPortalApprove,
    comment: F.addPortalComment, visit: F.notePortalVisit,
  };
  F.createPortalShare = (o) => {
    const rec = orig.create(o);
    if (rec) mirror("/portal/shares", rec);
    return rec;
  };
  F.setPortalApprove = (shareId, ri, ii, approveId) => {
    const rec = orig.approve(shareId, ri, ii, approveId);
    if (rec) mirror("/portal/shares/" + shareId + "/ops", { op: "approve", ri, ii, approveId });
    return rec;
  };
  F.addPortalComment = (shareId, ri, ii, author, text) => {
    const rec = orig.comment(shareId, ri, ii, author, text);
    if (rec) {
      // id комментария сгенерирован моком — передаём серверу, чтобы зеркало не плодило дубль
      const room = rec.snapshot && rec.snapshot.rooms && rec.snapshot.rooms[ri];
      const it = room && room.items && room.items[ii];
      const last = it && Array.isArray(it.comments) && it.comments[it.comments.length - 1];
      mirror("/portal/shares/" + shareId + "/ops", { op: "comment", ri, ii, author, text, ...(last ? { id: last.id } : {}) });
    }
    return rec;
  };
  F.notePortalVisit = (shareId) => {
    const rec = orig.visit(shareId);
    if (rec) mirror("/portal/shares/" + shareId + "/ops", { op: "visit" });
    return rec;
  };

  window.LedgerPortalAPI = { remote, hydrate, flushOutbox };
})();
