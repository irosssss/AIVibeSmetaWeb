/* Вход Yandex Cloud Function (Node.js 18+) для API портала.
   Событие приходит от API Gateway (http-интеграция) либо от прямого HTTP-триггера
   функции — оба формата разбираются в единый req для handler.mjs.
   Деплой и создание таблицы — docs/PORTAL_DEPLOY_YC.md. */
import { handleRequest } from "./handler.mjs";
import { createYdbStore } from "./store-ydb.mjs";

const store = createYdbStore();
const ORIGIN = process.env.PORTAL_ORIGIN || "*";   // прижать до https://designledger.ru после DNS

export async function handler(event) {
  const method = event.httpMethod || (event.requestContext && event.requestContext.httpMethod) || "GET";
  // API Gateway кладёт полный путь в event.url/path; греедый префикс гейтвея срезается
  // маской маршрута — handler матчит по хвосту /portal/shares...
  const rawPath = event.path || event.url || (event.requestContext && event.requestContext.path) || "/";
  const path = String(rawPath).replace(/\?.*$/, "");
  let body = null;
  const rawBody = event.body ? (event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body) : "";
  if (rawBody) { try { body = JSON.parse(rawBody); } catch { body = null; } }

  const res = await handleRequest({ method, path, body, rawBodyLength: rawBody.length }, store, { origin: ORIGIN });
  return { statusCode: res.status, headers: res.headers, body: res.body };
}
