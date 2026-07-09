/* Страж типо-шкалы (волна П2, реш. владельца 09.07: «полная честная система»).
   После рационализации ~29 ad-hoc размеров в токены --fs-* этот тест держит дисциплину:
   в вёрстке НЕ должно появляться сырых font-size — только var(--fs-*) или clamp() (fluid-дисплей).
   Исключение — web/pdf.js: pdfmake требует ЧИСЛОВОЙ fontSize (это не CSS), там своя шкала. */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const COMPONENTS = fs
  .readdirSync(path.join(ROOT, "web/components"))
  .filter((f) => f.endsWith(".jsx"))
  .map((f) => "web/components/" + f);
const STYLES = ["web/styles.css", "web/app.css"];

// строка → [{line, text}] с сырым размером
function rawInlineFontSize(src) {
  const hits = [];
  src.split("\n").forEach((line, i) => {
    // fontSize: <цифра...>  (не строка "var(...)", не вычисление size * k)
    if (/fontSize:\s*\d/.test(line)) hits.push({ line: i + 1, text: line.trim().slice(0, 90) });
  });
  return hits;
}
function rawCssFontSize(src) {
  const hits = [];
  src.split("\n").forEach((line, i) => {
    // font-size: <цифра>  (clamp() и var() начинаются с буквы → не ловятся)
    if (/font-size:\s*\d/.test(line)) hits.push({ line: i + 1, text: line.trim().slice(0, 90) });
  });
  return hits;
}

describe("типо-шкала: сырых font-size в вёрстке нет (только var(--fs-*)/clamp)", () => {
  for (const rel of COMPONENTS) {
    it(`${rel} — нет инлайновых fontSize: <число>`, () => {
      const hits = rawInlineFontSize(read(rel));
      expect(hits, `сырые размеры (замени на var(--fs-*)):\n${hits.map((h) => `  ${rel}:${h.line}  ${h.text}`).join("\n")}`).toEqual([]);
    });
  }
  for (const rel of STYLES) {
    it(`${rel} — нет font-size: <px> (только токены/clamp)`, () => {
      const hits = rawCssFontSize(read(rel));
      expect(hits, `сырые размеры (замени на var(--fs-*)):\n${hits.map((h) => `  ${rel}:${h.line}  ${h.text}`).join("\n")}`).toEqual([]);
    });
  }

  it("все токены --fs-* объявлены (шкала не врёт) и покрывают ссылки в коде", () => {
    const rootCss = read("web/styles.css");
    const declared = new Set([...rootCss.matchAll(/--fs-(\d+):/g)].map((m) => m[1]));
    const referenced = new Set();
    [...COMPONENTS, ...STYLES].forEach((rel) => {
      for (const m of read(rel).matchAll(/var\(--fs-(\d+)\)/g)) referenced.add(m[1]);
    });
    const missing = [...referenced].filter((r) => !declared.has(r));
    expect(missing, `ссылки на необъявленные токены: ${missing.map((m) => "--fs-" + m).join(", ")}`).toEqual([]);
  });
});
