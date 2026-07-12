/* Юнит-тесты автолинков URL в комментариях (Ч5, PROGRAMA_CHANGELOG_2026-07-12
   §2.6): чистый разбор splitCommentLinks (web/components/ui.jsx →
   window.LedgerLinkify). Компонент — React/JSX, но разбор вынесен в чистую
   функцию; для импорта модуля хватает глобального React (образец
   norms-editor.test.js). */
import { describe, it, expect, beforeAll } from "vitest";
import React from "react";

let split;
beforeAll(async () => {
  globalThis.React = React;                      // top-level `const { useState } = React`
  globalThis.window = globalThis.window || {};   // модуль пишет в window.*
  await import("../web/components/ui.jsx");
  split = globalThis.window.LedgerLinkify.splitCommentLinks;
});

describe("базовый разбор", () => {
  it("текст без ссылок — один текстовый сегмент, href нет", () => {
    expect(split("Можно светлее обивку?")).toEqual([{ text: "Можно светлее обивку?" }]);
  });
  it("https-ссылка в середине — три сегмента, href как есть", () => {
    const p = split("смотрите https://divan.ru/p/sofa тут");
    expect(p).toEqual([
      { text: "смотрите " },
      { text: "https://divan.ru/p/sofa", href: "https://divan.ru/p/sofa" },
      { text: " тут" },
    ]);
  });
  it("www-ссылка — href получает протокол, текст без него", () => {
    const p = split("вот www.divan.ru/p/1");
    expect(p[1]).toEqual({ text: "www.divan.ru/p/1", href: "https://www.divan.ru/p/1" });
  });
  it("две ссылки в одном сообщении", () => {
    const p = split("либо https://a.ru/1 либо https://b.ru/2");
    expect(p.filter((x) => x.href).map((x) => x.href)).toEqual(["https://a.ru/1", "https://b.ru/2"]);
  });
  it("пустой/недо-текст не падает", () => {
    expect(split("")).toEqual([]);
    expect(split(null)).toEqual([]);
    expect(split(undefined)).toEqual([]);
  });
});

describe("границы ссылки", () => {
  it("точка в конце предложения — не часть URL", () => {
    const p = split("гляньте https://divan.ru/p/sofa.");
    expect(p[1].href).toBe("https://divan.ru/p/sofa");
    expect(p[2].text).toBe(".");
  });
  it("вопрос и кавычка-ёлочка после ссылки отрезаются", () => {
    const p = split("может https://a.ru/x?» — как вам");
    expect(p[1].href).toBe("https://a.ru/x");
  });
  it("закрывающая скобка без парной внутри URL — отрезается", () => {
    const p = split("(смотрите https://a.ru/x)");
    expect(p[1].href).toBe("https://a.ru/x");
    expect(p[2].text).toBe(")");
  });
  it("парные скобки внутри URL — скобка остаётся (вики-стиль)", () => {
    const p = split("https://ru.wikipedia.org/wiki/Диван_(мебель)");
    expect(p[0].href).toBe("https://ru.wikipedia.org/wiki/Диван_(мебель)");
  });
  it("query-параметры и якорь не режутся", () => {
    const p = split("https://shop.ru/p?id=1&color=beige#reviews");
    expect(p[0].href).toBe("https://shop.ru/p?id=1&color=beige#reviews");
  });
});

describe("не-ссылки не линкуются", () => {
  it("голый домен без протокола/www — обычный текст", () => {
    expect(split("сайт divan.ru не открывается").some((p) => p.href)).toBe(false);
  });
  it("голое «www.» с точкой — обычный текст", () => {
    expect(split("см. www. выше").some((p) => p.href)).toBe(false);
  });
  it("javascript: не становится href (схема только из http/www-форм)", () => {
    const withHref = split("javascript:alert(1)").filter((p) => p.href);
    expect(withHref).toEqual([]);
  });
});
