/* Библиотека бенчмарка клиппера (волна E1, план CLIPPER_LLM_PLAN_2026-07-09 §3 этап 1).
   Общая для офлайн-прогона структурного слоя (clipper-bench.mjs) и LLM-прогона
   (clipper-llm-bench.mjs): загрузка фикстур, метрики по полям, markdown-отчёт.

   Фикстуры: tests/fixtures/clipper/<slug>.html + <slug>.url;
   эталон:   tests/fixtures/clipper/expected/<slug>.json:
   { url, title, price (число, БАЗА не промо; null если цены нет), currency,
     dims {w,d,h} в СМ (канон FF&E — web/ffe.js:203 "Габариты, см"; web/clipper.js:65
     toCm() — все структурные источники нормализуются в см, не в мм) | null,
     sku, brand, material, img, traps [..], notes } */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

export const FIXTURES_DIR = new URL("../tests/fixtures/clipper/", import.meta.url).pathname;

/* Дистилляты старых тестов (divan_ru_product.html и т.п.) живут прямо в tests/fixtures/ —
   бенч читает только каталог clipper/ с полноразмерными страницами. */
export function loadFixtures(dir = FIXTURES_DIR) {
  const out = [];
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith(".html")) continue;
    const slug = f.replace(/\.html$/, "");
    const urlFile = join(dir, slug + ".url");
    const expFile = join(dir, "expected", slug + ".json");
    out.push({
      slug,
      html: readFileSync(join(dir, f), "utf8"),
      url: existsSync(urlFile) ? readFileSync(urlFile, "utf8").trim() : "",
      expected: existsSync(expFile) ? JSON.parse(readFileSync(expFile, "utf8")) : null,
    });
  }
  return out;
}

/* Экстрактор из web/clipper.js — файл пишет в window (легаси-глобалы), шимим как в тестах. */
export async function loadClipper() {
  globalThis.window = globalThis.window || {};
  await import("../web/ffe.js");
  await import("../web/clipper.js");
  return globalThis.window.AIVibeClipper;
}

/* ------------------------------- метрики по полям ------------------------------- */
const norm = (s) => String(s || "").toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/g, " ").trim();

function titleOk(got, exp) {
  const g = norm(got), e = norm(exp);
  if (!g || !e) return false;
  if (g.includes(e) || e.includes(g)) return true;
  const gt = new Set(g.split(" ")), et = e.split(" ");
  const hit = et.filter((t) => gt.has(t)).length;
  return hit / et.length >= 0.6;   // fuzzy: ≥60% слов эталона найдены
}

const numOk = (got, exp, tol = 0) => got != null && exp != null && Math.abs(Number(got) - Number(exp)) <= tol;

function dimsOk(got, exp) {
  if (!exp) return got == null;                       // эталон «нет габаритов» → и мы не выдумали
  if (!got) return false;
  const axes = ["w", "d", "h"].filter((a) => exp[a] != null);
  if (!axes.length) return true;
  return axes.every((a) => numOk(got[a], exp[a], 1)); // ±1 см (округления текст vs JSON-LD)
}

function imgOk(got, exp) {
  // W6/E1-ревью: было `if (!exp) return true` — эталон img:null (реально «нет фото»,
  // отличать от отсутствующего поля — см. v.img в judge()) маскировал выдуманное фото,
  // если структурный слой всё же что-то нашёл. Симметрично dimsOk() ниже.
  if (!exp) return !got;
  if (!got) return false;
  const tail = (u) => String(u).split("?")[0].split("/").pop();
  return got === exp || (tail(got) && tail(got) === tail(exp));
}

/* Вердикт по полю: ok | wrong (извлекли, но не то) | miss (пусто, а эталон есть) | n/a */
export function judge(fields, exp) {
  const v = {};
  v.title = !exp.title ? "n/a" : !fields.title ? "miss" : titleOk(fields.title, exp.title) ? "ok" : "wrong";
  v.price = exp.price == null ? (fields.price == null ? "ok" : "wrong")
    : fields.price == null ? "miss" : numOk(fields.price, exp.price) ? "ok" : "wrong";
  v.dims = exp.dims === undefined ? "n/a" : !exp.dims && !fields.dims ? "ok" : dimsOk(fields.dims, exp.dims) ? "ok" : fields.dims ? "wrong" : "miss";
  v.sku = !exp.sku ? "n/a" : !fields.sku ? "miss" : norm(fields.sku) === norm(exp.sku) ? "ok" : "wrong";
  v.material = !exp.material ? "n/a" : !fields.material ? "miss" : (norm(fields.material).includes(norm(exp.material)) || norm(exp.material).includes(norm(fields.material))) ? "ok" : "wrong";
  v.img = exp.img === undefined ? "n/a" : imgOk(fields.img, exp.img) ? "ok" : fields.img ? "wrong" : "miss";
  // brand ↔ supplier: у структурного слоя supplier часто = магазин, не бренд — считаем слабым
  v.brand = !exp.brand ? "n/a" : !fields.supplier ? "miss" : (norm(fields.supplier).includes(norm(exp.brand)) || norm(exp.brand).includes(norm(fields.supplier))) ? "ok" : "wrong";
  return v;
}

export const JUDGED_FIELDS = ["title", "price", "dims", "sku", "material", "img", "brand"];

/* ------------------------------- markdown-отчёт ------------------------------- */
const MARK = { ok: "✅", wrong: "❌", miss: "—", "n/a": "·" };

export function report({ label, rows }) {
  // rows: [{slug, url, productSchema, verdicts, traps}]
  const lines = [];
  lines.push(`## ${label}`, "");
  lines.push("| Фикстура | schema.org | " + JUDGED_FIELDS.join(" | ") + " |");
  lines.push("|---|---|" + JUDGED_FIELDS.map(() => "---").join("|") + "|");
  for (const r of rows) {
    lines.push(`| ${r.slug} | ${r.productSchema ? "да" : "нет"} | ` + JUDGED_FIELDS.map((f) => MARK[r.verdicts[f]]).join(" | ") + " |");
  }
  lines.push("");
  // агрегаты: точность по полю среди применимых (не n/a); miss отдельно — это «работа для LLM»
  lines.push("| Поле | ok | wrong | miss | точность среди извлечённых |");
  lines.push("|---|---|---|---|---|");
  for (const f of JUDGED_FIELDS) {
    let ok = 0, wrong = 0, miss = 0;
    rows.forEach((r) => { const x = r.verdicts[f]; if (x === "ok") ok++; else if (x === "wrong") wrong++; else if (x === "miss") miss++; });
    const acc = ok + wrong ? Math.round((ok / (ok + wrong)) * 100) + "%" : "—";
    lines.push(`| ${f} | ${ok} | ${wrong} | ${miss} | ${acc} |`);
  }
  const noSchema = rows.filter((r) => !r.productSchema).length;
  lines.push("", `Без schema.org/Product: **${noSchema} из ${rows.length}** (гипотеза «длинного хвоста без разметки»).`);
  return lines.join("\n");
}
