/* Тесты API портала (server/portal/handler.mjs) — волна A2, живой доступ.
   Обработчик чистый: гоняем с in-memory стором, без YDB/сети (YDB-слой store-ydb.mjs
   офлайн не тестируется — проверяется деплоем, см. docs/PORTAL_DEPLOY_YC.md).
   Ключевой инвариант — ПАРИТЕТ с localStorage-моком web/ffe.js: клиент применяет
   операцию оптимистично локально и зеркалирует на сервер; разная семантика = рассинхрон. */
import { describe, it, expect, beforeAll } from "vitest";
import { handleRequest } from "../server/portal/handler.mjs";

let FFE;
beforeAll(async () => {
  globalThis.window = globalThis.window || {};
  // localStorage-шим: портальный мок ffe.js персистит шары именно туда
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
  };
  await import("../web/ffe.js");
  FFE = globalThis.window.LedgerFFE;
});

function memStore() {
  const db = new Map();
  return {
    async get(id) { return db.has(id) ? JSON.parse(JSON.stringify(db.get(id))) : null; },
    async create(rec) {
      if (db.has(rec.shareId)) return { created: false, rec: JSON.parse(JSON.stringify(db.get(rec.shareId))) };
      db.set(rec.shareId, JSON.parse(JSON.stringify(rec)));
      return { created: true, rec };
    },
    async update(id, fn) {
      if (!db.has(id)) return null;
      const rec = JSON.parse(JSON.stringify(db.get(id)));
      fn(rec);
      db.set(id, rec);
      return JSON.parse(JSON.stringify(rec));
    },
  };
}

// байты, не .length (UTF-16 code units) — кириллица иначе занижала бы размер вдвое (найдено ревью)
const call = (store, method, path, body) =>
  handleRequest({ method, path, body, rawBodyLength: body ? Buffer.byteLength(JSON.stringify(body), "utf8") : 0 }, store);
const parse = (res) => JSON.parse(res.body);

const share = (over) => ({
  shareId: "shr_abc123def456",
  projectId: "p_1", projectName: "Гостиная на Патриках",
  versionId: "v_1", versionLabel: "Версия 1",
  studioName: "Студия", studioCity: "Москва", studioPhone: "+7 900 000-00-00", studioEmail: "s@x.ru",
  snapshot: { mode: "client", markup: 25, rooms: [
    { name: "Гостиная", items: [
      { title: "Диван «Морти»", price: 129000, qty: 1, rrp: 189000 },
      { title: "Стол", price: 60000, qty: 1 },
    ] },
  ] },
  createdAt: "2026-07-13T10:00:00.000Z",
  ...(over || {}),
});

describe("создание и чтение шары", () => {
  it("POST создаёт (201), повтор того же id — идемпотентно возвращает существующую (200)", async () => {
    const st = memStore();
    const r1 = await call(st, "POST", "/portal/shares", share());
    expect(r1.status).toBe(201);
    // повтор (ретрай после сетевой ошибки) с изменённым снапшотом НЕ перезаписывает
    const r2 = await call(st, "POST", "/portal/shares", share({ projectName: "Другое имя" }));
    expect(r2.status).toBe(200);
    expect(parse(r2).projectName).toBe("Гостиная на Патриках");
  });
  it("GET отдаёт запись; несуществующий id и мусорный формат — 404", async () => {
    const st = memStore();
    await call(st, "POST", "/portal/shares", share());
    const ok = await call(st, "GET", "/portal/shares/shr_abc123def456");
    expect(ok.status).toBe(200);
    expect(parse(ok).snapshot.rooms[0].items[0].rrp).toBe(189000);   // снапшот доехал как есть (вкл. RRP)
    expect((await call(st, "GET", "/portal/shares/shr_nope00nope")).status).toBe(404);
    expect((await call(st, "GET", "/portal/shares/<script>")).status).toBe(404);
  });
  it("битая шара — 400: без снапшота, с чужим форматом id", async () => {
    const st = memStore();
    expect((await call(st, "POST", "/portal/shares", { shareId: "shr_abc123def456" })).status).toBe(400);
    expect((await call(st, "POST", "/portal/shares", share({ shareId: "hack" }))).status).toBe(400);
  });
  it("лишние поля тела не сохраняются (санитайз по белому списку)", async () => {
    const st = memStore();
    const r = await call(st, "POST", "/portal/shares", { ...share(), isAdmin: true, respondedAt: "2026-01-01" });
    const rec = parse(r);
    expect(rec.isAdmin).toBeUndefined();
    expect(rec.respondedAt).toBeNull();   // respondedAt ставит только операция клиента, не создание
  });
});

describe("операции: approve / comment / visit", () => {
  const setup = async () => { const st = memStore(); await call(st, "POST", "/portal/shares", share()); return st; };
  const OPS = "/portal/shares/shr_abc123def456/ops";

  it("approve ставит решение + approveAt + respondedAt; повтор с pending снимает", async () => {
    const st = await setup();
    const r = parse(await call(st, "POST", OPS, { op: "approve", ri: 0, ii: 0, approveId: "ok" }));
    expect(r.applied).toBe(true);
    const it0 = r.rec.snapshot.rooms[0].items[0];
    expect(it0.approve).toBe("ok");
    expect(it0.approveAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.rec.respondedAt).toBeTruthy();
    const r2 = parse(await call(st, "POST", OPS, { op: "approve", ri: 0, ii: 0, approveId: "pending" }));
    expect(r2.rec.snapshot.rooms[0].items[0].approve).toBeUndefined();
  });
  it("несуществующие ri/ii — no-op (applied:false), запись не трогается (семантика ffe.js)", async () => {
    const st = await setup();
    const r = parse(await call(st, "POST", OPS, { op: "approve", ri: 5, ii: 0, approveId: "ok" }));
    expect(r.applied).toBe(false);
    expect(r.rec.respondedAt).toBeNull();
  });
  it("comment клиента дописывается в тред с ЕГО id (зеркалирование не плодит дубль) и штампует respondedAt", async () => {
    const st = await setup();
    const r = parse(await call(st, "POST", OPS, { op: "comment", ri: 0, ii: 1, author: "client", text: "Можно дешевле?", id: "cm_test123abc" }));
    const c = r.rec.snapshot.rooms[0].items[1].comments;
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ id: "cm_test123abc", author: "client", text: "Можно дешевле?" });
    expect(r.rec.respondedAt).toBeTruthy();
  });
  it("comment студии НЕ выглядит как ответ клиента (respondedAt не штампуется); пустой текст — no-op", async () => {
    const st = await setup();
    const r = parse(await call(st, "POST", OPS, { op: "comment", ri: 0, ii: 0, author: "studio", text: "Отвечаю" }));
    expect(r.rec.respondedAt).toBeNull();
    expect(parse(await call(st, "POST", OPS, { op: "comment", ri: 0, ii: 0, author: "client", text: "   " })).applied).toBe(false);
  });
  it("чужой author приводится к studio (не даём вписать произвольную роль)", async () => {
    const st = await setup();
    const r = parse(await call(st, "POST", OPS, { op: "comment", ri: 0, ii: 0, author: "admin", text: "x" }));
    expect(r.rec.snapshot.rooms[0].items[0].comments[0].author).toBe("studio");
  });
  it("visit инкрементирует счётчик открытий", async () => {
    const st = await setup();
    await call(st, "POST", OPS, { op: "visit" });
    const r = parse(await call(st, "POST", OPS, { op: "visit" }));
    expect(r.rec.visits.count).toBe(2);
    expect(r.rec.visits.lastAt).toBeTruthy();
  });
  it("мусорный op — 400; операция по несуществующей шаре — 404; PUT — 405; OPTIONS — 204 (CORS)", async () => {
    const st = await setup();
    expect((await call(st, "POST", OPS, { op: "drop" })).status).toBe(400);
    expect((await call(st, "POST", "/portal/shares/shr_missing0000/ops", { op: "visit" })).status).toBe(404);
    expect((await call(st, "PUT", "/portal/shares/shr_abc123def456")).status).toBe(405);
    expect((await call(st, "OPTIONS", OPS)).status).toBe(204);
  });
  it("comment: повтор с ТЕМ ЖЕ id (outbox-ретрай после потерянного ответа) не дублирует запись (найдено ревью)", async () => {
    const st = await setup();
    const body = { op: "comment", ri: 0, ii: 1, author: "client", text: "Можно дешевле?", id: "cm_test123abc" };
    const r1 = parse(await call(st, "POST", OPS, body));
    expect(r1.rec.snapshot.rooms[0].items[1].comments).toHaveLength(1);
    // тот же id прилетает снова (клиент решил, что первый POST не дошёл)
    const r2 = parse(await call(st, "POST", OPS, body));
    expect(r2.applied).toBe(true);   // идемпотентный повтор — не ошибка, но и не дубль
    expect(r2.rec.snapshot.rooms[0].items[1].comments).toHaveLength(1);
  });
  it("approve/comment: клиентский таймстемп уважается (не штампуется заново временем сервера) — найдено ревью", async () => {
    const st = await setup();
    const past = new Date(Date.now() - 3 * 3600 * 1000).toISOString();   // 3 часа назад — «отправилось после офлайна»
    const pastDate = past.slice(0, 10);
    const rA = parse(await call(st, "POST", OPS, { op: "approve", ri: 0, ii: 0, approveId: "ok", approveAt: pastDate, respondedAt: past }));
    expect(rA.rec.snapshot.rooms[0].items[0].approveAt).toBe(pastDate);
    expect(rA.rec.respondedAt).toBe(past);
    const rC = parse(await call(st, "POST", OPS, { op: "comment", ri: 0, ii: 1, author: "client", text: "Отвечаю из офлайна", id: "cm_offline0001", at: past, respondedAt: past }));
    expect(rC.rec.snapshot.rooms[0].items[1].comments[0].at).toBe(past);
    expect(rC.rec.respondedAt).toBe(past);
  });
  it("approve/comment: неправдоподобный клиентский таймстемп (будущее/мусор) игнорируется — сервер берёт своё время", async () => {
    const st = await setup();
    const future = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const rA = parse(await call(st, "POST", OPS, { op: "approve", ri: 0, ii: 0, approveId: "ok", approveAt: future }));
    expect(rA.rec.snapshot.rooms[0].items[0].approveAt).not.toBe(future);
    expect(rA.rec.snapshot.rooms[0].items[0].approveAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const rC = parse(await call(st, "POST", OPS, { op: "comment", ri: 0, ii: 1, author: "client", text: "x", at: "не дата" }));
    expect(rC.rec.snapshot.rooms[0].items[1].comments[0].at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
  it("исключение store.* (напр. конфликт транзакции YDB) — структурированный 500 с CORS, не необработанный краш (найдено ревью)", async () => {
    const st = await setup();
    const boom = { ...st, update: async () => { throw new Error("serializable transaction conflict"); } };
    const res = await call(boom, "POST", OPS, { op: "visit" });
    expect(res.status).toBe(500);
    expect(res.headers["Access-Control-Allow-Origin"]).toBeTruthy();
    expect(parse(res).error).toBeTruthy();
  });
  it("MAX_BODY считается в БАЙТАХ — кириллический снапшот у границы 1МБ по .length не проскакивает мимо лимита (найдено ревью)", async () => {
    const st = memStore();
    // «Диван угловой большой» — 21 символ (.length), но 40 байт UTF-8 (см. верификацию ревью);
    // строим тело, чьи .length и байтовый размер по разные стороны границы MAX_BODY
    const bigTitle = "Диван угловой большой раскладной модульный".repeat(20000);   // ~860K code units, ~1.6МБ UTF-8
    const big = share({ snapshot: { mode: "client", markup: 0, rooms: [{ name: "К", items: [{ title: bigTitle, price: 1, qty: 1 }] }] } });
    const bodyStr = JSON.stringify(big);
    expect(bodyStr.length).toBeLessThan(1024 * 1024);            // по .length — под лимитом
    expect(Buffer.byteLength(bodyStr, "utf8")).toBeGreaterThan(1024 * 1024);   // по факту — над лимитом
    const res = await handleRequest({ method: "POST", path: "/portal/shares", body: big, rawBodyLength: Buffer.byteLength(bodyStr, "utf8") }, st);
    expect(res.status).toBe(413);
  });
});

describe("паритет с localStorage-моком ffe.js (инвариант зеркалирования)", () => {
  // клиент применяет операцию локально через FFE.* и зеркалирует её на сервер:
  // результат обязан совпасть по содержательным полям, иначе кэш разъедется с сервером
  it("approve: FFE.setPortalApprove и серверный op дают одинаковые approve/approveAt/факт respondedAt", async () => {
    const rec = FFE.createPortalShare({ projectName: "Паритет", snapshot: share().snapshot });
    const local = FFE.setPortalApprove(rec.shareId, 0, 0, "revise");
    const st = memStore();
    await call(st, "POST", "/portal/shares", { ...share(), shareId: rec.shareId });
    const remote = parse(await call(st, "POST", `/portal/shares/${rec.shareId}/ops`, { op: "approve", ri: 0, ii: 0, approveId: "revise" })).rec;
    const li = local.snapshot.rooms[0].items[0], si = remote.snapshot.rooms[0].items[0];
    expect(si.approve).toBe(li.approve);
    expect(si.approveAt).toBe(li.approveAt);              // оба — «сегодня» YYYY-MM-DD
    expect(!!remote.respondedAt).toBe(!!local.respondedAt);
  });
  it("comment: одинаковые author/text/наличие id, respondedAt — только от клиента (оба слоя)", async () => {
    const rec = FFE.createPortalShare({ projectName: "Паритет-2", snapshot: share().snapshot });
    const local = FFE.addPortalComment(rec.shareId, 0, 1, "studio", "Ответ студии");
    const st = memStore();
    await call(st, "POST", "/portal/shares", { ...share(), shareId: rec.shareId });
    const remote = parse(await call(st, "POST", `/portal/shares/${rec.shareId}/ops`, { op: "comment", ri: 0, ii: 1, author: "studio", text: "Ответ студии" })).rec;
    const lc = local.snapshot.rooms[0].items[1].comments[0], sc = remote.snapshot.rooms[0].items[1].comments[0];
    expect(sc.author).toBe(lc.author);
    expect(sc.text).toBe(lc.text);
    expect(remote.respondedAt).toBeNull();
    expect(local.respondedAt).toBeNull();
  });
});
