/* Обработчик API клиентского портала (волна A2, живой доступ с чужого устройства).
   Чистая функция (event, store) → {status, body} — вся логика тестируется vitest
   с in-memory стором, без YDB/сети; YDB-слой — store-ydb.mjs, вход — index.mjs.

   Семантика операций — ПОРТ web/ffe.js (createPortalShare/setPortalApprove/
   addPortalComment/notePortalVisit): клиентский мок на localStorage и сервер обязаны
   вести себя одинаково, иначе оптимистичное локальное применение операции разойдётся
   с ответом сервера. При изменении семантики в ffe.js — менять и здесь (и наоборот).

   Дизайн API — ОПЕРАЦИИ, не whole-record PUT: дизайнер (ответ в треде) и клиент
   (решение по позиции) пишут в одну шару с разных устройств; PUT последнего затирал
   бы чужие правки, операция применяется сервером к текущей записи транзакционно.

   Маршруты:
     POST /portal/shares            — создать шару (идемпотентно: повтор с тем же id → существующая)
     GET  /portal/shares/{id}       — прочитать шару
     POST /portal/shares/{id}/ops   — применить операцию {op: approve|comment|visit, ...}

   Авторизации нет осознанно (v1 «смотреть + отвечать»): shareId — capability-токен,
   как и в localStorage-моке; энтропия id усилена в ffe.js (genShareId → crypto). */

const SHARE_ID_RE = /^shr_[a-z0-9]{6,40}$/;
const MAX_BODY = 1024 * 1024;        // 1 МБ — снапшот сметы больших проектов ~100 КБ, десятикратный запас
const MAX_TEXT = 4000;               // комментарий
const MAX_STR = 200;                 // имена/метки/контакты
const APPROVE_IDS = new Set(["ok", "revise", "rejected"]);   // словарь A1 (ffe.js APPROVE_STATUSES без pending)

const str = (v, max) => String(v == null ? "" : v).slice(0, max || MAX_STR);
const todayISO = () => new Date().toISOString().slice(0, 10);

const json = (status, body, extra) => ({
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    // CORS: портал — публичная capability-ссылка; при желании прижать до
    // https://designledger.ru — env PORTAL_ORIGIN (см. index.mjs / раннбук)
    "Access-Control-Allow-Origin": (extra && extra.origin) || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  },
  body: JSON.stringify(body),
});

/* Нормализация входящей шары: берём только известные поля (чужое не храним),
   строки ограничиваем — снапшот принимается как есть (это данные самого дизайнера,
   сервер не является участником их схемы; размер ограничен MAX_BODY на входе). */
function sanitizeShare(o) {
  const src = o || {};
  if (!SHARE_ID_RE.test(String(src.shareId || ""))) return null;
  if (!src.snapshot || typeof src.snapshot !== "object" || !Array.isArray(src.snapshot.rooms)) return null;
  return {
    shareId: src.shareId,
    projectId: src.projectId != null ? str(src.projectId) : null,
    projectName: str(src.projectName),
    versionId: src.versionId != null ? str(src.versionId) : null,
    versionLabel: str(src.versionLabel),
    studioName: str(src.studioName),
    studioCity: str(src.studioCity), studioPhone: str(src.studioPhone), studioEmail: str(src.studioEmail),
    snapshot: src.snapshot,
    createdAt: typeof src.createdAt === "string" ? str(src.createdAt, 40) : new Date().toISOString(),
    respondedAt: null,
  };
}

// «дата не в будущем и не абсурдно старая» — грубая защита от рассинхрона часов
// клиента, не строгая валидация; за пределами окна честнее взять серверное время
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const clientDate = (v) => {
  if (!ISO_DATE_RE.test(String(v || ""))) return null;
  const t = Date.parse(v + "T00:00:00Z");
  return Number.isFinite(t) && t <= Date.now() + 86400000 && t > Date.now() - 365 * 86400000 ? v : null;
};
const clientDateTime = (v) => {
  if (!ISO_DT_RE.test(String(v || ""))) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) && t <= Date.now() + 86400000 && t > Date.now() - 365 * 86400000 ? v : null;
};

/* Операции над записью — мутируют rec и возвращают true, если что-то изменилось.
   Несуществующие ri/ii — no-op (как в ffe.js): клиент уже применил операцию к своему
   локальному снимку той же формы, расхождение индексов означает битую ссылку, не атаку.

   at/approveAt: клиент передаёт СВОЙ исходный таймстемп действия (проставленный
   локально в момент клика/отправки, см. web/ffe.js) — сервер его уважает (с грубой
   санити-проверкой), а не штампует заново своим временем. Иначе операция, прошедшая
   через outbox-ретрай после долгого офлайна, получила бы дату «когда наконец
   отправилось», а не «когда клиент реально ответил» (найдено ревью). */
function opApprove(rec, ri, ii, approveId, clientApproveAt, clientRespondedAt) {
  const room = rec.snapshot && Array.isArray(rec.snapshot.rooms) ? rec.snapshot.rooms[ri] : null;
  const it = room && Array.isArray(room.items) ? room.items[ii] : null;
  if (!it) return false;
  if (approveId === "pending" || !APPROVE_IDS.has(approveId)) { delete it.approve; delete it.approveAt; }
  else { it.approve = approveId; it.approveAt = clientDate(clientApproveAt) || todayISO(); }
  rec.respondedAt = clientDateTime(clientRespondedAt) || new Date().toISOString();   // approve на портале ставит только клиент
  return true;
}
function opComment(rec, ri, ii, author, text, id, clientAt, clientRespondedAt) {
  const room = rec.snapshot && Array.isArray(rec.snapshot.rooms) ? rec.snapshot.rooms[ri] : null;
  const it = room && Array.isArray(room.items) ? room.items[ii] : null;
  const t = str(text, MAX_TEXT).trim();
  if (!it || !t) return false;
  it.comments = Array.isArray(it.comments) ? it.comments : [];
  // идемпотентность: outbox-ретрай после потерянного ответа сервера шлёт тот же id —
  // без этой проверки комментарий задваивался бы (найдено ревью)
  const idOk = /^cm_[a-z0-9]{6,40}$/.test(String(id || ""));
  if (idOk && it.comments.some((c) => c.id === id)) return true;
  const a = author === "client" ? "client" : "studio";
  it.comments = [...it.comments, {
    id: idOk ? id : "cm_" + Math.random().toString(36).slice(2, 12),
    author: a, text: t, at: clientDateTime(clientAt) || new Date().toISOString(),
  }];
  if (a === "client") rec.respondedAt = clientDateTime(clientRespondedAt) || new Date().toISOString();
  return true;
}
function opVisit(rec) {
  const v = rec.visits || { count: 0, lastAt: "" };
  rec.visits = { count: (v.count || 0) + 1, lastAt: new Date().toISOString() };
  return true;
}

/* store-интерфейс (реализации: store-ydb.mjs и in-memory в тестах):
     get(id)        → rec | null
     create(rec)    → {created: bool, rec}   — атомарно «создать, если нет»; есть → существующая
     update(id, fn) → rec | null             — read-modify-write транзакцией; fn мутирует rec */
export async function handleRequest(req, store, opts) {
  const origin = opts && opts.origin;
  const method = String(req.method || "").toUpperCase();
  const path = String(req.path || "");
  if (method === "OPTIONS") return json(204, {}, { origin });   // CORS preflight

  // общий catch: store.* — сеть/транзакция YDB, может кинуть исключение (например
  // конфликт serializable-транзакции при одновременной записи клиента и дизайнера);
  // без этого исключение ушло бы необработанным в index.mjs и Cloud Function отдала
  // бы платформенный краш без CORS-заголовков вместо структурированной ошибки (найдено ревью)
  try {
    // POST /portal/shares
    if (method === "POST" && /^\/?portal\/shares\/?$/.test(path)) {
      if ((req.rawBodyLength || 0) > MAX_BODY) return json(413, { error: "share too large" }, { origin });
      const rec = sanitizeShare(req.body);
      if (!rec) return json(400, { error: "bad share" }, { origin });
      const r = await store.create(rec);
      return json(r.created ? 201 : 200, r.rec, { origin });   // идемпотентный повтор — не ошибка
    }

    const m = path.match(/^\/?portal\/shares\/([^/]+)(\/ops)?\/?$/);
    if (!m || !SHARE_ID_RE.test(m[1])) return json(404, { error: "not found" }, { origin });
    const shareId = m[1];

    // GET /portal/shares/{id}
    if (method === "GET" && !m[2]) {
      const rec = await store.get(shareId);
      return rec ? json(200, rec, { origin }) : json(404, { error: "not found" }, { origin });
    }

    // POST /portal/shares/{id}/ops
    if (method === "POST" && m[2]) {
      const b = req.body || {};
      if (!["approve", "comment", "visit"].includes(b.op)) return json(400, { error: "bad op" }, { origin });
      const ri = Number.isInteger(b.ri) ? b.ri : -1;
      const ii = Number.isInteger(b.ii) ? b.ii : -1;
      let applied = false;
      const rec = await store.update(shareId, (r) => {
        if (b.op === "approve") applied = opApprove(r, ri, ii, String(b.approveId || ""), b.approveAt, b.respondedAt);
        else if (b.op === "comment") applied = opComment(r, ri, ii, b.author, b.text, b.id, b.at, b.respondedAt);
        else applied = opVisit(r);
      });
      if (!rec) return json(404, { error: "not found" }, { origin });
      return json(200, { applied, rec }, { origin });
    }

    return json(405, { error: "method not allowed" }, { origin });
  } catch (e) {
    return json(500, { error: "internal error" }, { origin });
  }
}
