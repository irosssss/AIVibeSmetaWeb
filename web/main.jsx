/* ============================================================
   Design Ledger — точка входа Vite. Импорты выполняются по порядку
   как side-effect; порядок ВАЖЕН (тот же, что раньше в index.html):
   сначала npm-глобалы, затем data/lib-слой, затем компоненты,
   и в самом конце app.jsx — он рендерит приложение.
   ============================================================ */
import "./vendor-globals.js";

/* Self-host шрифтов (П6, 09.07): Google Fonts CDN убран из index.html — там
   зависимость от gstatic.com (риск для RU + FOUT на цифрах денег в момент
   доезда шрифта). Вместо CDN подключаем @fontsource напрямую: Vite тянет
   .woff2 из node_modules, хэширует ассеты в бандл, инжектит @font-face.
   Inter/JBMono — variable-woff2 (один файл покрывает все веса), Spectral
   variable не выпущен → статические веса, реально используемые в стеке
   (400/500/600/700/800 + italic 400 для .spec2.more .pos и цитат-blockquote). */
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource/spectral/400.css";
import "@fontsource/spectral/500.css";
import "@fontsource/spectral/600.css";
import "@fontsource/spectral/700.css";
import "@fontsource/spectral/800.css";
import "@fontsource/spectral/400-italic.css";

// data + движок + выгрузки (пишут в window.Design Ledger*)
import "./mock.js";
import "./project-data.js";
import "./engine.js";
import "./pdf.js";
import "./xlsx.js";
import "./ffe.js";
import "./clipper.js";
import "./lottie-assets.js";

// UI-примитивы и экраны (порядок важен — компоненты ссылаются друг на друга через window)
import "./components/ui.jsx";
import "./components/site-hero.jsx";
import "./components/site-sections.jsx";
import "./components/site-github.jsx";
import "./components/cabinet.jsx";
import "./components/cabinet-views.jsx";
import "./components/style-quiz.jsx";
import "./components/project-detail.jsx";
import "./components/norms-editor.jsx";
import "./components/style-editor.jsx";
import "./components/library-editor.jsx";
import "./components/admin.jsx";
import "./components/admin-views.jsx";
import "./components/portal.jsx";

// последним — app.jsx: монтирует <App/> в #root
import "./components/app.jsx";
