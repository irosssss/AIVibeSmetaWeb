/* Офлайн-бенч СТРУКТУРНОГО слоя клиппера (E1.3): extractFromHtml по фикстурам против
   эталона, без единого LLM-вызова. Показывает, что закрывает бесплатный слой и что
   остаётся LLM (miss/wrong). Запуск: node scripts/clipper-bench.mjs [--json]
   Эталоны опциональны: фикстуры без expected/<slug>.json попадают в отчёт разведкой
   (какие поля вообще извлеклись), но не в метрики точности. */
import { loadFixtures, loadClipper, judge, report, JUDGED_FIELDS } from "./clipper-bench-lib.mjs";

const CL = await loadClipper();
const fixtures = loadFixtures();
if (!fixtures.length) { console.error("Нет фикстур в tests/fixtures/clipper/"); process.exit(1); }

const rows = [];
const recon = [];
for (const fx of fixtures) {
  const ex = CL.extractFromHtml(fx.html, fx.url);
  if (fx.expected) {
    rows.push({ slug: fx.slug, url: fx.url, productSchema: ex.productSchema, verdicts: judge(ex.fields, fx.expected), traps: fx.expected.traps || [] });
  } else {
    recon.push({ slug: fx.slug, productSchema: ex.productSchema,
      got: Object.fromEntries(["title", "price", "sku", "material", "img"].map((k) => [k, ex.fields[k] != null && ex.fields[k] !== "" ? "✓" : "—"])),
      dims: ex.fields.dims ? "✓" : "—", confidence: ex.confidence });
  }
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ rows, recon }, null, 2));
  process.exit(0);
}

if (rows.length) console.log(report({ label: "Структурный слой против эталона (" + rows.length + " фикстур)", rows }), "\n");
if (recon.length) {
  console.log("## Разведка (эталона ещё нет)\n");
  console.log("| Фикстура | schema.org | title | price | dims | sku | material | img | conf |");
  console.log("|---|---|---|---|---|---|---|---|---|");
  for (const r of recon) console.log(`| ${r.slug} | ${r.productSchema ? "да" : "нет"} | ${r.got.title} | ${r.got.price} | ${r.dims} | ${r.got.sku} | ${r.got.material} | ${r.got.img} | ${r.confidence} |`);
}
