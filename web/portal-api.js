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
   лифте не теряется молча. ~ Известное ограничение v1: пульс кабинета читает
   кэш — свежие ответы клиента дизайнер подтягивает открытием «Версий» (гидрация
   там) или открытием портала; фоновый poll — следующей волной.

   Гонка GET-vs-локальная-запись (код-ревью): hydrate() читает сервер и
   применяет ответ в кэш, а mirror() применяет локальную операцию синхронно и
   шлёт её на сервер в фоне — оба пути пишут в один и тот же кэш. Без защиты
   старый (запущенный ДО локального изменения) GET мог бы прилететь ПОСЛЕ
   этого изменения и затереть его пре-мутационными данными. Защита — счётчик
   версий на shareId (`localVersion`): любая локальная запись бампает версию;
   применение серверного ответа (и в hydrate, и после успешного mirror) идёт
   только если версия не изменилась с момента старта запроса — иначе более
   свежая локальная запись обязана победить устаревший в полёте ответ. */
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
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* -------- версия локального состояния на shareId (защита от гонки, см. шапку) -------- */
  const localVersion = new Map();
  const bumpVersion = (shareId) => localVersion.set(shareId, (localVersion.get(shareId) || 0) + 1);
  const versionOf = (shareId) => localVersion.get(shareId) || 0;

  /* -------- outbox: очередь незеркалированных операций --------
     Cap на 500: с запасом покрывает даже целиком офлайн-сессию на смете в
     100+ позиций (см. `CABINET_WORKPLACE_2026-07-06.md`) с двойными кликами.
     При переполнении дропаем САМЫЕ СТАРЫЕ (slice(-N)) — новые важнее для
     текущего состояния клиента, но это НЕ тихо: console.error + счётчик
     потерь в localStorage, который сможет прочитать будущий UI-баннер. */
  const OKEY = "aivibe:portal:outbox";
  const OLOST_KEY = "aivibe:portal:outboxLost";
  const MAX_OUTBOX = 500;
  const outRead = () => { try { return JSON.parse(localStorage.getItem(OKEY)) || []; } catch { return []; } };
  const outWrite = (q) => {
    const kept = q.slice(-MAX_OUTBOX);
    const droppedN = q.length - kept.length;
    if (droppedN > 0) {
      console.error("портал: outbox переполнен, потеряно " + droppedN + " неотправленных операций");
      try { localStorage.setItem(OLOST_KEY, String((Number(localStorage.getItem(OLOST_KEY)) || 0) + droppedN)); } catch {}
    }
    try { localStorage.setItem(OKEY, JSON.stringify(kept)); } catch {}
  };

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
  // применяет ответ сервера в кэш ТОЛЬКО если локальная версия не убежала вперёд,
  // пока запрос был в полёте — иначе более свежая локальная запись важнее ответа
  function applyIfFresh(shareId, v0, rec) {
    if (versionOf(shareId) !== v0) return false;   // локально что-то поменялось, пока ждали ответ
    if (rec && rec.shareId) saveCache(rec);
    return true;
  }
  function mirror(shareId, path, body) {
    if (!remote()) return;
    const v0 = versionOf(shareId);
    post(path, body)
      .then((res) => {
        // ответ операции — {applied, rec}; ответ создания шары — сама запись
        const rec = res && res.rec ? res.rec : res;
        applyIfFresh(shareId, v0, rec);   // подхватываем серверную нормализацию (напр. усечение MAX_TEXT)
        return flushOutbox();
      })
      .catch(() => {
        outWrite([...outRead(), { path, body }]);
        console.warn("портал: операция не дошла до сервера, отложена в outbox");
      });
  }

  /* -------- гидрация: свежая шара с сервера → локальный кэш --------
     retries — фолбэк на «шара только что создана, POST ещё в полёте» (mirror
     при createPortalShare не ждётся синхронно, см. F.createPortalShare ниже):
     если GET сразу после создания 404-ит на чужом устройстве, короткая пауза
     и повтор почти всегда успевают дождаться завершения создающего POST. */
  async function hydrate(shareId, retries) {
    if (!remote()) return F.loadPortalShare(shareId);
    const v0 = versionOf(shareId);
    try {
      // сначала дослать outbox: иначе GET вернёт запись БЕЗ неотправленных локальных
      // ответов, которую applyIfFresh мог бы принять за «свежую», если версия успела откатиться
      await flushOutbox();
      const res = await fetch(base() + "/portal/shares/" + encodeURIComponent(shareId));
      if (res.status === 404) {
        if ((retries || 0) > 0) { await sleep(600); return hydrate(shareId, (retries || 0) - 1); }
        return F.loadPortalShare(shareId);   // сервер не знает — вдруг есть локально (мок-эра)
      }
      if (!res.ok) throw new Error("portal api " + res.status);
      const rec = await res.json();
      if (applyIfFresh(shareId, v0, rec)) return rec;
      return F.loadPortalShare(shareId);   // локальная запись обогнала этот ответ — она главнее
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
    if (rec) { bumpVersion(rec.shareId); mirror(rec.shareId, "/portal/shares", rec); }
    return rec;
  };
  F.setPortalApprove = (shareId, ri, ii, approveId) => {
    const rec = orig.approve(shareId, ri, ii, approveId);
    if (rec) {
      bumpVersion(shareId);
      const it = rec.snapshot && rec.snapshot.rooms && rec.snapshot.rooms[ri] && rec.snapshot.rooms[ri].items && rec.snapshot.rooms[ri].items[ii];
      // передаём СВОЙ (клиентский) таймстемп действия — сервер его уважает, а не
      // штампует заново своим временем при outbox-ретрае после долгого офлайна
      mirror(shareId, "/portal/shares/" + shareId + "/ops",
        { op: "approve", ri, ii, approveId, approveAt: it && it.approveAt, respondedAt: rec.respondedAt });
    }
    return rec;
  };
  F.addPortalComment = (shareId, ri, ii, author, text) => {
    const rec = orig.comment(shareId, ri, ii, author, text);
    if (rec) {
      bumpVersion(shareId);
      // id и at комментария сгенерированы моком — передаём серверу: id — чтобы
      // зеркало/ретрай не плодили дубль, at — чтобы сервер не штамповал своё время
      const room = rec.snapshot && rec.snapshot.rooms && rec.snapshot.rooms[ri];
      const it = room && room.items && room.items[ii];
      const last = it && Array.isArray(it.comments) && it.comments[it.comments.length - 1];
      mirror(shareId, "/portal/shares/" + shareId + "/ops",
        { op: "comment", ri, ii, author, text, respondedAt: rec.respondedAt, ...(last ? { id: last.id, at: last.at } : {}) });
    }
    return rec;
  };
  F.notePortalVisit = (shareId) => {
    const rec = orig.visit(shareId);
    if (rec) { bumpVersion(shareId); mirror(shareId, "/portal/shares/" + shareId + "/ops", { op: "visit" }); }
    return rec;
  };

  window.LedgerPortalAPI = {
    remote,
    hydrate: (shareId) => hydrate(shareId, 2),   // до 2 повторов на «шара только что создана»
    flushOutbox,
  };
})();
