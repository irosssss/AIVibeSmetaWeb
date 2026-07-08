/* ============================================================
   AIVibe — точка входа Vite. Импорты выполняются по порядку
   как side-effect; порядок ВАЖЕН (тот же, что раньше в index.html):
   сначала npm-глобалы, затем data/lib-слой, затем компоненты,
   и в самом конце app.jsx — он рендерит приложение.
   ============================================================ */
import "./vendor-globals.js";

// data + движок + выгрузки (пишут в window.AIVibe*)
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
import "./components/admin.jsx";
import "./components/admin-views.jsx";

// последним — app.jsx: монтирует <App/> в #root
import "./components/app.jsx";
