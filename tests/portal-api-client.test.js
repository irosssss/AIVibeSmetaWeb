/* Тесты клиентского сетевого слоя портала (web/portal-api.js) — код-ревью нашёл
   несколько багов здесь (гонка hydrate/mirror, потерянный ответ сервера, тихий
   drop outbox, гонка создания шары), и ни один из них не был покрыт тестами —
   этот файл закрывает тот пробел. fetch — не реальная сеть, а прямой вызов
   handleRequest (server/portal/handler.mjs) с in-memory стором: высокая точность
   (те же ветки, что в проде) без реального HTTP. */
import { describe, it, expect, beforeAll, vi } from "vitest";
import { handleRequest } from "../server/portal/handler.mjs";

let FFE, PAPI;

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

// fetch-шим поверх реального handleRequest — тестирует ровно ту логику, что в проде,
// с управляемыми задержками/сбоями по методу, чтобы воспроизводить гонки
function makeFetch(store, opts) {
  const o = opts || {};
  let getCalls = 0;
  return async (url, init) => {
    const u = new URL(url);
    const method = (init && init.method) || "GET";
    if (o.failAll) throw new Error("сеть недоступна");
    if (method === "GET") {
      getCalls++;
      if (o.getDelayMs) await new Promise((r) => setTimeout(r, o.getDelayMs));
      if (o.notFoundFirstNGets && getCalls <= o.notFoundFirstNGets) {
        return { ok: false, status: 404, json: async () => ({ error: "not found" }) };
      }
    }
    const body = init && init.body ? JSON.parse(init.body) : null;
    const rawBodyLength = init && init.body ? Buffer.byteLength(init.body, "utf8") : 0;
    const res = await handleRequest({ method, path: u.pathname, body, rawBodyLength }, store);
    return { ok: res.status < 300, status: res.status, json: async () => JSON.parse(res.body) };
  };
}

beforeAll(async () => {
  globalThis.window = globalThis.window || {};
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
  };
  window.LEDGER_PORTAL_API_BASE = "https://fake.test";   // включает remote() на весь файл
  await import("../web/ffe.js");
  await import("../web/portal-api.js");
  FFE = window.LedgerFFE;
  PAPI = window.LedgerPortalAPI;
});

const snap = () => ({ mode: "client", markup: 25, rooms: [
  { name: "Гостиная", items: [{ title: "Диван", price: 100000, qty: 1 }, { title: "Стол", price: 60000, qty: 1 }] },
] });

describe("hydrate(): защита от гонки с локальной записью (найдено ревью)", () => {
  it("GET, запущенный ДО локального клика, не затирает клик, если резолвится ПОСЛЕ него", async () => {
    const store = memStore();
    globalThis.fetch = makeFetch(store);
    const rec = FFE.createPortalShare({ projectName: "Гонка", snapshot: snap() });
    await new Promise((r) => setTimeout(r, 20));   // дать фоновому mirror создания долететь до "сервера"

    globalThis.fetch = makeFetch(store, { getDelayMs: 60 });   // GET теперь медленный
    const hydrating = PAPI.hydrate(rec.shareId);               // запущен ДО клика
    FFE.setPortalApprove(rec.shareId, 0, 0, "ok");              // клик ПОСЛЕ старта GET, но раньше его резолва
    await hydrating;

    expect(FFE.loadPortalShare(rec.shareId).snapshot.rooms[0].items[0].approve).toBe("ok");
  });

  it("без конкурентной локальной записи hydrate() как обычно применяет ответ сервера", async () => {
    const store = memStore();
    globalThis.fetch = makeFetch(store);
    const rec = FFE.createPortalShare({ projectName: "Без гонки", snapshot: snap() });
    await new Promise((r) => setTimeout(r, 20));
    const hydrated = await PAPI.hydrate(rec.shareId);
    expect(hydrated.projectName).toBe("Без гонки");
  });
});

describe("mirror(): успешный ответ сервера применяется обратно в кэш (найдено ревью)", () => {
  it("усечение MAX_TEXT сервером доезжает до локального кэша после успешного зеркалирования", async () => {
    const store = memStore();
    globalThis.fetch = makeFetch(store);
    const rec = FFE.createPortalShare({ projectName: "Усечение", snapshot: snap() });
    await new Promise((r) => setTimeout(r, 20));

    const longText = "А".repeat(5000);   // сервер: MAX_TEXT = 4000
    FFE.addPortalComment(rec.shareId, 0, 0, "client", longText);
    expect(FFE.loadPortalShare(rec.shareId).snapshot.rooms[0].items[0].comments[0].text.length).toBe(5000);   // локально пока полный

    await new Promise((r) => setTimeout(r, 20));   // дать mirror-ответу примениться
    expect(FFE.loadPortalShare(rec.shareId).snapshot.rooms[0].items[0].comments[0].text.length).toBe(4000);   // подхвачена серверная версия
  });

  it("клиентский approveAt переживает круг на сервер и обратно без замены на серверное время", async () => {
    const store = memStore();
    globalThis.fetch = makeFetch(store);
    const rec = FFE.createPortalShare({ projectName: "Таймстемп", snapshot: snap() });
    await new Promise((r) => setTimeout(r, 20));
    const local = FFE.setPortalApprove(rec.shareId, 0, 0, "ok");
    const at = local.snapshot.rooms[0].items[0].approveAt;
    await new Promise((r) => setTimeout(r, 20));
    expect(FFE.loadPortalShare(rec.shareId).snapshot.rooms[0].items[0].approveAt).toBe(at);
  });
});

describe("createPortalShare: гидрация на «чужом устройстве» переживает короткую задержку create-mirror (найдено ревью)", () => {
  it("hydrate() повторяет GET после 404 и подхватывает шару, как только create долетел", async () => {
    const store = memStore();
    globalThis.fetch = makeFetch(store, { notFoundFirstNGets: 1 });   // первый GET 404, второй — уже есть
    // имитация: шара уже лежит на "сервере" (как будто create-mirror дизайнера долетел
    // между первой и второй попыткой) — сам hydrate ничего о create не знает, только ретраит 404
    await store.create({ shareId: "shr_" + "a".repeat(32), projectName: "Только что создана", snapshot: snap(), createdAt: new Date().toISOString(), respondedAt: null });
    const rec = await PAPI.hydrate("shr_" + "a".repeat(32));
    expect(rec.projectName).toBe("Только что создана");
  });

  it("если сервер так и не узнал о шаре — после исчерпания ретраев честный фолбэк на локальный кэш", async () => {
    const store = memStore();
    globalThis.fetch = makeFetch(store, { notFoundFirstNGets: 99 });
    const rec = await PAPI.hydrate("shr_" + "b".repeat(32));
    expect(rec).toBe(null);   // нет ни на сервере, ни локально — честно null, не выдумка
  });
}, 10000);

describe("outbox: переполнение выше MAX_OUTBOX не тихое (найдено ревью)", () => {
  it("после 520 неудачных зеркалирований очередь ограничена, потеря залогирована и посчитана", async () => {
    globalThis.fetch = makeFetch(memStore(), { failAll: true });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const rec = FFE.createPortalShare({ projectName: "Оффлайн", snapshot: snap() });
    for (let i = 0; i < 520; i++) FFE.notePortalVisit(rec.shareId);
    await new Promise((r) => setTimeout(r, 50));   // дать всем неудачным mirror-промисам осесть в outbox

    const outbox = JSON.parse(localStorage.getItem("aivibe:portal:outbox") || "[]");
    expect(outbox.length).toBeLessThanOrEqual(500);
    expect(errSpy).toHaveBeenCalled();
    expect(Number(localStorage.getItem("aivibe:portal:outboxLost"))).toBeGreaterThan(0);
    errSpy.mockRestore();
  });
});
