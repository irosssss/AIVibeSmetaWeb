/* ============================================================
   Design Ledger — мост npm-зависимостей в глобальный реестр window.*
   (перенос с ветки audit-sprint0-1-vite, адаптация 08.07)
   ------------------------------------------------------------
   Код фронта исторически написан на глобалах (React, ReactDOM,
   lottie, pdfMake, XLSX и компоненты через window). При миграции
   на Vite мы НЕ переписываем файлы на import/export, а кладём
   npm-пакеты в window. Свободные переменные в ES-модулях
   разрешаются через глобальный объект, поэтому старый код
   работает без правок.

   Code-splitting: React/ReactDOM/lottie нужны на старте — грузим
   статически. pdfmake (+ кириллические шрифты Roboto) и SheetJS
   нужны ТОЛЬКО при выгрузке/импорте сметы — грузим их лениво через
   динамический import(): они уходят в отдельные чанки и не
   раздувают стартовый бандл. Доступ — window.LedgerLoad.pdf()/.xlsx()
   (мемоизированный Promise; результат попутно кладётся в
   window.pdfMake / window.XLSX — старый код на глобалах работает
   без правок; LedgerLibs в ui.jsx использует LedgerLoad вместо CDN).
   ============================================================ */
import React from "react";
import ReactDOM from "react-dom/client";
import lottie from "lottie-web";

window.React = React;
window.ReactDOM = ReactDOM;
window.lottie = lottie;   // раньше — CDN bodymovin; обёртка <Lottie> в ui.jsx ждёт window.lottie

let pdfPromise = null;
let xlsxPromise = null;

// pdfmake + vfs со шрифтами. Промис мемоизируется — повторные вызовы
// (и прогрев) не приводят к повторной загрузке чанка.
function loadPdf() {
  if (!pdfPromise) {
    pdfPromise = Promise.all([
      import("pdfmake/build/pdfmake"),
      import("pdfmake/build/vfs_fonts"),
    ]).then(([pdfMod, pdfFontsMod]) => {
      const pdfMake = pdfMod.default || pdfMod;
      // В pdfmake 0.2.x vfs_fonts.js делает `module.exports = vfs` (карта файлов
      // шрифтов), поэтому при interop это default-экспорт.
      const pf = pdfFontsMod.default || pdfFontsMod;
      const vfs = (pf && pf.pdfMake && pf.pdfMake.vfs) || (pf && pf.vfs) || pf; // pf сам = карта шрифтов
      if (vfs && typeof vfs === "object" && Object.keys(vfs).length) pdfMake.vfs = vfs;
      else console.warn("[Design Ledger] pdfmake vfs (шрифты) не найдены — кириллица в PDF может не отрисоваться");
      window.pdfMake = pdfMake;
      return pdfMake;
      // Кэшируем только успешную загрузку: при ошибке чанка сбрасываем промис,
      // иначе rejected-промис (он тоже truthy) залип бы навсегда и повтор по
      // клику никогда бы не сработал.
    }).catch((e) => { pdfPromise = null; throw e; });
  }
  return pdfPromise;
}

// SheetJS (ESM-namespace с .utils). Кэшируем только успешную загрузку.
function loadXlsx() {
  if (!xlsxPromise) {
    xlsxPromise = import("xlsx").then((mod) => {
      const XLSX = mod && mod.utils ? mod : mod.default || mod;
      window.XLSX = XLSX;
      return XLSX;
    }).catch((e) => { xlsxPromise = null; throw e; });
  }
  return xlsxPromise;
}

window.LedgerLoad = { pdf: loadPdf, xlsx: loadXlsx };

// Прогрев в простое: после первого кадра тихо подтягиваем тяжёлые чанки,
// чтобы первая выгрузка шла без задержки. Не блокирует старт; ошибки
// глотаем — реальная загрузка повторится (и покажет ошибку) по клику.
const warm = () => { loadPdf().catch(() => {}); loadXlsx().catch(() => {}); };
if (typeof requestIdleCallback === "function") requestIdleCallback(warm, { timeout: 4000 });
else setTimeout(warm, 2500);
