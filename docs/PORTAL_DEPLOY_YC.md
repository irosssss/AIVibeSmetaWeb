# Портал: деплой на Yandex Cloud (волна A2 — живой доступ)

> Код готов и протестирован офлайн (`server/portal/` + `tests/portal-server.test.js`,
> паритет с localStorage-моком закреплён тестами). Этот раннбук — последняя миля:
> нужен только аккаунт Yandex Cloud владельца (тот же 🔴, что у клиппера этапа 2)
> и доступ к DNS designledger.ru. Решение «Yandex Cloud Function + YDB, не Cloudflare»
> принято 08.07 (рублёвый биллинг + 152-ФЗ), см. журнал роадмапа.

## Архитектура

```
клиент/дизайнер (браузер)
  └─ web/portal-api.js  — localStorage-кэш + зеркалирование операций + гидрация
       └─ https://api.designledger.ru/portal/...   (API Gateway)
            └─ Cloud Function (server/portal/index.mjs, Node.js 18)
                 └─ YDB serverless, таблица portal_shares
```

Сервер принимает **операции** (approve/comment/visit), не whole-record PUT —
дизайнер и клиент пишут в одну шару с разных устройств без затирания.
Авторизации в v1 нет осознанно: shareId — capability-токен (как в моке).

## Шаги (yc CLI, ~30 минут)

### 0. Предусловия
```bash
brew install yandex-cloud-cli   # или curl-инсталлер с cloud.yandex.ru/docs/cli
yc init                        # логин владельца, выбрать облако/каталог
FOLDER_ID=$(yc config get folder-id)
```

### 1. YDB (serverless) + таблица
```bash
yc ydb database create designledger-portal --serverless
YDB_ENDPOINT=$(yc ydb database get designledger-portal --format json | jq -r .endpoint)
YDB_DATABASE=$(yc ydb database get designledger-portal --format json | jq -r .database_path)

yc ydb yql execute --database "$YDB_DATABASE" --query '
CREATE TABLE portal_shares (
  share_id   Utf8,
  rec        JsonDocument,
  created_at Timestamp,
  updated_at Timestamp,
  PRIMARY KEY (share_id)
);'
```

### 2. Сервис-аккаунт
```bash
yc iam service-account create --name portal-fn-sa
SA_ID=$(yc iam service-account get portal-fn-sa --format json | jq -r .id)
yc resource-manager folder add-access-binding "$FOLDER_ID" --role ydb.editor --subject serviceAccount:$SA_ID
```

### 3. Функция
```bash
cd server/portal && npm install --omit=dev && zip -r portal-fn.zip index.mjs handler.mjs store-ydb.mjs package.json node_modules
yc serverless function create --name portal-api
yc serverless function version create \
  --function-name portal-api --runtime nodejs18 --entrypoint index.handler \
  --memory 256m --execution-timeout 10s --service-account-id "$SA_ID" \
  --source-path portal-fn.zip \
  --environment YDB_ENDPOINT="$YDB_ENDPOINT",YDB_DATABASE="$YDB_DATABASE",PORTAL_ORIGIN="*"
```
`PORTAL_ORIGIN` после проверки прижать до `https://designledger.ru`.

### 4. API Gateway + домен
```bash
FN_ID=$(yc serverless function get portal-api --format json | jq -r .id)
cat > gw.yaml <<EOF
openapi: 3.0.0
info: { title: portal, version: 1.0.0 }
paths:
  /portal/{proxy+}:
    x-yc-apigateway-any-method:
      parameters: [{ name: proxy, in: path, required: true, schema: { type: string } }]
      x-yc-apigateway-integration:
        type: cloud_functions
        function_id: $FN_ID
        service_account_id: $SA_ID
EOF
yc serverless api-gateway create --name portal-gw --spec gw.yaml
```
Домен: Certificate Manager → сертификат `api.designledger.ru` (DNS-01: добавить
CNAME-валидацию у регистратора) → `yc serverless api-gateway add-domain portal-gw
--domain api.designledger.ru --certificate-id <id>` → у регистратора CNAME
`api.designledger.ru` → канонический хост гейтвея (`yc serverless api-gateway get portal-gw`).

### 5. Смоук (curl)
```bash
B=https://api.designledger.ru
curl -s -X POST $B/portal/shares -H 'Content-Type: application/json' -d '{
  "shareId":"shr_smoke000001","projectName":"Смоук",
  "snapshot":{"rooms":[{"name":"К","items":[{"title":"Стул","price":1000,"qty":1}]}]}}'   # → 201
curl -s $B/portal/shares/shr_smoke000001                                                  # → 200, запись
curl -s -X POST $B/portal/shares/shr_smoke000001/ops -H 'Content-Type: application/json' \
  -d '{"op":"approve","ri":0,"ii":0,"approveId":"ok"}'                                    # → applied:true
```

### 6. Включить в приложении
Без пересборки, на задеплоенном билде (для проверки):
```js
localStorage.setItem("aivibe:portalApiBase", "https://api.designledger.ru")
```
Насовсем — в `web/index.html` до бандла:
```html
<script>window.LEDGER_PORTAL_API_BASE = "https://api.designledger.ru";</script>
```
Без конфига приложение работает как раньше (localStorage-мок) — слой полностью пассивен.

## Проверка «живого доступа» (критерий волны)
1. В кабинете: Версии → «Ссылка для клиента» → открыть `#portal/{id}` **в инкогнито/на телефоне**.
2. Смета открывается (гидрация), поставить «Согласовать» + комментарий.
3. В кабинете открыть «Версии» → ответ и комментарий видны (гидрация при открытии).

## Честные ограничения v1
- **YDB-слой (`store-ydb.mjs`) офлайн не тестируется** — нет YDB в CI; вся логика
  операций в `handler.mjs` покрыта vitest (13 тестов, включая паритет с моком).
  Проверяется смоуком шага 5.
- Пульс «Сегодня» читает локальный кэш: свежие ответы клиента появляются после
  открытия «Версий» (там гидрация) или портала. Фоновый poll — следующей волной.
- Шары, созданные ДО включения API, живут только в localStorage дизайнера —
  на сервер уедут при первом действии над ними (пересоздать ссылку).
- Rate-limit на создание шар — на стороне гейтвея (x-yc-apigateway-rate-limit),
  добавить при выходе из «свои пользователи».
