/* YDB-стор портал-шар. Таблица (создаётся раннбуком, docs/PORTAL_DEPLOY_YC.md):
     CREATE TABLE portal_shares (
       share_id   Utf8,
       rec        JsonDocument,
       created_at Timestamp,
       updated_at Timestamp,
       PRIMARY KEY (share_id)
     );
   Запись хранится целиком как JsonDocument — та же форма, что localStorage-мок
   (инвариант «портал = смета»); операции применяет handler.mjs, стор отвечает
   только за атомарность read-modify-write (serializable-транзакция YDB).

   ⚠️ Этот слой офлайн НЕ тестируется (нет YDB в CI) — проверяется деплоем по
   раннбуку; вся логика операций живёт в handler.mjs и покрыта vitest. */
import { Driver, getCredentialsFromEnv, TypedValues } from "ydb-sdk";

let driverP = null;
function getDriver() {
  if (!driverP) {
    // В Cloud Function с привязанным сервис-аккаунтом ydb-sdk берёт креды из
    // метаданных сам (YDB_ENDPOINT/YDB_DATABASE — env функции, см. раннбук)
    const driver = new Driver({
      endpoint: process.env.YDB_ENDPOINT,
      database: process.env.YDB_DATABASE,
      authService: getCredentialsFromEnv(),
    });
    driverP = driver.ready(10000).then((ok) => {
      if (!ok) throw new Error("YDB driver not ready in 10s");
      return driver;
    });
  }
  return driverP;
}

const q = {
  get: `DECLARE $id AS Utf8;
        SELECT rec FROM portal_shares WHERE share_id = $id;`,
  insert: `DECLARE $id AS Utf8; DECLARE $rec AS JsonDocument;
           INSERT INTO portal_shares (share_id, rec, created_at, updated_at)
           VALUES ($id, $rec, CurrentUtcTimestamp(), CurrentUtcTimestamp());`,
  update: `DECLARE $id AS Utf8; DECLARE $rec AS JsonDocument;
           UPDATE portal_shares SET rec = $rec, updated_at = CurrentUtcTimestamp()
           WHERE share_id = $id;`,
};

const recOf = (rs) => {
  const row = rs && rs[0] && rs[0].rows && rs[0].rows[0];
  if (!row) return null;
  const v = row.items[0];
  const s = v.textValue != null ? v.textValue : (v.bytesValue ? Buffer.from(v.bytesValue).toString("utf8") : null);
  return s ? JSON.parse(s) : null;
};

export function createYdbStore() {
  const withSession = async (fn) => (await getDriver()).tableClient.withSession(fn);
  return {
    async get(id) {
      return withSession(async (s) => {
        const r = await s.executeQuery(q.get, { $id: TypedValues.utf8(id) });
        return recOf(r.resultSets);
      });
    },
    // атомарно «создать, если нет»: INSERT падает по PK-конфликту → возвращаем существующую
    async create(rec) {
      return withSession(async (s) => {
        try {
          await s.executeQuery(q.insert, { $id: TypedValues.utf8(rec.shareId), $rec: TypedValues.jsonDocument(JSON.stringify(rec)) });
          return { created: true, rec };
        } catch (e) {
          const existing = recOf((await s.executeQuery(q.get, { $id: TypedValues.utf8(rec.shareId) })).resultSets);
          if (existing) return { created: false, rec: existing };
          throw e;
        }
      });
    },
    // read-modify-write одной serializable-транзакцией: параллельные операции
    // (клиент ставит решение, дизайнер отвечает в треде) не затирают друг друга
    async update(id, fn) {
      return withSession(async (s) => {
        const tx = await s.beginTransaction({ serializableReadWrite: {} });
        try {
          const r = await s.executeQuery(q.get, { $id: TypedValues.utf8(id) }, { txId: tx.id });
          const rec = recOf(r.resultSets);
          if (!rec) { await s.rollbackTransaction(tx.id); return null; }
          fn(rec);
          await s.executeQuery(q.update, { $id: TypedValues.utf8(id), $rec: TypedValues.jsonDocument(JSON.stringify(rec)) }, { txId: tx.id });
          await s.commitTransaction(tx.id);
          return rec;
        } catch (e) {
          try { await s.rollbackTransaction(tx.id); } catch {}
          throw e;
        }
      });
    },
  };
}
