/* ============================================================
   Design Ledger — общие UI-примитивы (иконки, логотип, графики, утилиты)
   Экспортируется в window для других babel-скриптов.
   ============================================================ */
const { useState, useEffect, useRef, useCallback } = React;

/* ---------- Логотип: дековый веер + кинетический леттеринг ---------- */
function Logo({ size = 26, onClick }) {
  return (
    <div onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 11, cursor: onClick ? "pointer" : "default", userSelect: "none" }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="30" height="30" rx="9" stroke="var(--accent)" strokeWidth="1.5" opacity="0.5" />
        <path d="M16 6 L25 25 H7 Z" fill="none" stroke="var(--accent)" strokeWidth="1.6" />
        <path d="M16 6 L20.5 25 M16 6 L11.5 25 M16 6 L25 25 M16 6 L7 25" stroke="var(--accent)" strokeWidth="1" opacity="0.45" />
        <circle cx="16" cy="6" r="2.4" fill="var(--accent)" />
      </svg>
      <span className="logo-word" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: size * 0.72, letterSpacing: "-0.03em", whiteSpace: "nowrap" }}>
        Design <span style={{ color: "var(--accent-ink)" }}>Ledger</span>
      </span>
    </div>
  );
}

/* ---------- Иконки (тонкая линия, 1.6 stroke) ----------
   Пути — из Tabler Icons (MIT, © Paweł Kuna, tabler.io/icons), извлечены локально
   из пакета @tabler/icons (не рантайм-зависимость — только источник SVG-путей,
   см. NOTICE.md) под текущий формат словаря I/обёртку Icon; апстрим-имя — в
   комментарии у каждой записи. Инлайн SVG, без иконочного шрифта/CDN — тот же
   принцип self-host, что у шрифтов (П6): без внешних сетевых зависимостей и
   без обязательной видимой атрибуции (MIT её не требует). */
const Icon = ({ d, size = 20, stroke = 1.6, fill = "none", ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
       strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);
const I = {
  scan: (p) => <Icon {...p} d={<><path d="M5 12h14" /><path d="M3 7v-2a2 2 0 0 1 2 -2h2" /><path d="M3 17v2a2 2 0 0 0 2 2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M17 21h2a2 2 0 0 0 2 -2v-2" /></>} />, // tabler:scan
  spark: (p) => <Icon {...p} d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6" />, // tabler:sparkles
  cube: (p) => <Icon {...p} d={<><path d="M21 16.008v-8.018a1.98 1.98 0 0 0 -1 -1.717l-7 -4.008a2.016 2.016 0 0 0 -2 0l-7 4.008c-.619 .355 -1 1.01 -1 1.718v8.018c0 .709 .381 1.363 1 1.717l7 4.008a2.016 2.016 0 0 0 2 0l7 -4.008c.619 -.355 1 -1.01 1 -1.718" /><path d="M12 22v-10" /><path d="M12 12l8.73 -5.04" /><path d="M3.27 6.96l8.73 5.04" /></>} />, // tabler:cube
  cart: (p) => <Icon {...p} d={<><path d="M4 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M15 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M17 17h-11v-14h-2" /><path d="M6 5l14 1l-1 7h-13" /></>} />, // tabler:shopping-cart
  arrow: (p) => <Icon {...p} d={<><path d="M5 12l14 0" /><path d="M13 18l6 -6" /><path d="M13 6l6 6" /></>} />, // tabler:arrow-right
  arrowUp: (p) => <Icon {...p} d={<><path d="M12 5l0 14" /><path d="M18 11l-6 -6" /><path d="M6 11l6 -6" /></>} />, // tabler:arrow-up
  check: (p) => <Icon {...p} d="M5 12l5 5l10 -10" />, // tabler:check
  apple: (p) => <Icon {...p} fill="currentColor" stroke="none" d={<><path d="M15.079 5.999l.239 .012c1.43 .097 3.434 1.013 4.508 2.586a1 1 0 0 1 -.344 1.44c-.05 .028 -.372 .158 -.497 .217a4.15 4.15 0 0 0 -.722 .431c-.614 .461 -.948 1.009 -.942 1.694c.01 .885 .339 1.454 .907 1.846c.208 .143 .436 .253 .666 .33c.126 .043 .426 .116 .444 .122a1 1 0 0 1 .662 .942c0 2.621 -3.04 6.381 -5.286 6.381c-.79 0 -1.272 -.091 -1.983 -.315l-.098 -.031c-.463 -.146 -.702 -.192 -1.133 -.192c-.52 0 -.863 .06 -1.518 .237l-.197 .053c-.575 .153 -.964 .226 -1.5 .248c-2.749 0 -5.285 -5.093 -5.285 -9.072c0 -3.87 1.786 -6.92 5.286 -6.92c.297 0 .598 .045 .909 .128c.403 .107 .774 .26 1.296 .508c.787 .374 .948 .44 1.009 .44h.016c.03 -.003 .128 -.047 1.056 -.457c1.061 -.467 1.864 -.685 2.746 -.616l-.24 -.012z" /><path d="M14 1a1 1 0 0 1 1 1a3 3 0 0 1 -3 3a1 1 0 0 1 -1 -1a3 3 0 0 1 3 -3z" /></>} />, // tabler:brand-apple
  user: (p) => <Icon {...p} d={<><path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" /><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" /></>} />, // tabler:user
  grid: (p) => <Icon {...p} d={<><path d="M4 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /><path d="M14 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /><path d="M4 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /><path d="M14 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /></>} />, // tabler:layout-grid
  chart: (p) => <Icon {...p} d={<><path d="M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -6" /><path d="M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -10" /><path d="M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -14" /><path d="M4 20h14" /></>} />, // tabler:chart-bar
  news: (p) => <Icon {...p} d={<><path d="M16 6h3a1 1 0 0 1 1 1v11a2 2 0 0 1 -4 0v-13a1 1 0 0 0 -1 -1h-10a1 1 0 0 0 -1 1v12a3 3 0 0 0 3 3h11" /><path d="M8 8l4 0" /><path d="M8 12l4 0" /><path d="M8 16l4 0" /></>} />, // tabler:news
  users: (p) => <Icon {...p} d={<><path d="M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0 -3 -3.85" /></>} />, // tabler:users
  plus: (p) => <Icon {...p} d={<><path d="M12 5l0 14" /><path d="M5 12l14 0" /></>} />, // tabler:plus
  edit: (p) => <Icon {...p} d={<><path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1" /><path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415" /><path d="M16 5l3 3" /></>} />, // tabler:edit
  trash: (p) => <Icon {...p} d={<><path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></>} />, // tabler:trash
  close: (p) => <Icon {...p} d={<><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></>} />, // tabler:x
  logout: (p) => <Icon {...p} d={<><path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2" /><path d="M9 12h12l-3 -3" /><path d="M18 15l3 -3" /></>} />, // tabler:logout
  star: (p) => <Icon {...p} d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873l-6.158 -3.245" />, // tabler:star
  fork: (p) => <Icon {...p} d={<><path d="M10 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M5 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M15 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M7 8v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2 -2v-2" /><path d="M12 12l0 4" /></>} />, // tabler:git-fork
  bug: (p) => <Icon {...p} d={<><path d="M9 9v-1a3 3 0 0 1 6 0v1" /><path d="M8 9h8a6 6 0 0 1 1 3v3a5 5 0 0 1 -10 0v-3a6 6 0 0 1 1 -3" /><path d="M3 13l4 0" /><path d="M17 13l4 0" /><path d="M12 20l0 -6" /><path d="M4 19l3.35 -2" /><path d="M20 19l-3.35 -2" /><path d="M4 7l3.75 2.4" /><path d="M20 7l-3.75 2.4" /></>} />, // tabler:bug
  search: (p) => <Icon {...p} d={<><path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></>} />, // tabler:search
  ruler: (p) => <Icon {...p} d={<><path d="M17 3l4 4l-14 14l-4 -4l14 -14" /><path d="M16 7l-1.5 -1.5" /><path d="M13 10l-1.5 -1.5" /><path d="M10 13l-1.5 -1.5" /><path d="M7 16l-1.5 -1.5" /></>} />, // tabler:ruler-2
  layers: (p) => <Icon {...p} d={<><path d="M12 4l-8 4l8 4l8 -4l-8 -4" /><path d="M4 12l8 4l8 -4" /><path d="M4 16l8 4l8 -4" /></>} />, // tabler:stack-2
  copy: (p) => <Icon {...p} d={<><path d="M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" /><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" /></>} />, // tabler:copy
  wallet: (p) => <Icon {...p} d={<><path d="M17 8v-3a1 1 0 0 0 -1 -1h-10a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3m0 4v3a1 1 0 0 1 -1 1h-12a2 2 0 0 1 -2 -2v-12" /><path d="M20 12v4h-4a2 2 0 0 1 0 -4h4" /></>} />, // tabler:wallet
  truck: (p) => <Icon {...p} d={<><path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M15 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M5 17h-2v-11a1 1 0 0 1 1 -1h9v12m-4 0h6m4 0h2v-6h-8m0 -5h5l3 5" /></>} />, // tabler:truck
  chat: (p) => <Icon {...p} d="M3 20l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c3.255 2.777 3.695 7.266 1.029 10.501c-2.666 3.235 -7.615 4.215 -11.574 2.293l-4.7 1" />, // tabler:message-circle
  send: (p) => <Icon {...p} d={<><path d="M10 14l11 -11" /><path d="M21 3l-6.5 18a.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a.55 .55 0 0 1 0 -1l18 -6.5" /></>} />, // tabler:send
  sun: (p) => <Icon {...p} d={<><path d="M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7" /></>} />, // tabler:sun
  sliders: (p) => <Icon {...p} d={<><path d="M12 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M4 6l8 0" /><path d="M16 6l4 0" /><path d="M6 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M4 12l2 0" /><path d="M10 12l10 0" /><path d="M15 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M4 18l11 0" /><path d="M19 18l1 0" /></>} />, // tabler:adjustments-horizontal
  heart: (p) => <Icon {...p} d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />, // tabler:heart
  info: (p) => <Icon {...p} d={<><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M12 9h.01" /><path d="M11 12h1v4h1" /></>} />, // tabler:info-circle
  sofa: (p) => <Icon {...p} d={<><path d="M4 11a2 2 0 0 1 2 2v1h12v-1a2 2 0 1 1 4 0v5a1 1 0 0 1 -1 1h-18a1 1 0 0 1 -1 -1v-5a2 2 0 0 1 2 -2" /><path d="M4 11v-3a3 3 0 0 1 3 -3h10a3 3 0 0 1 3 3v3" /><path d="M12 5v9" /></>} />, // tabler:sofa
  lamp: (p) => <Icon {...p} d={<><path d="M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7" /><path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3" /><path d="M9.7 17l4.6 0" /></>} />, // tabler:bulb
  rug: (p) => <Icon {...p} d={<><path d="M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12" /><path d="M10 8v8" /><path d="M14 8v8" /><path d="M8 10h8" /><path d="M8 14h8" /></>} />, // tabler:grid-pattern
  plan: (p) => <Icon {...p} d={<><path d="M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12" /><path d="M4 9h8" /><path d="M12 15h8" /><path d="M12 4v16" /></>} />, // tabler:layout-board
  spinner: (p) => <Icon {...p} d="M12 3a9 9 0 1 0 9 9" />, // tabler:loader-2
  download: (p) => <Icon {...p} d={<><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></>} />, // tabler:download
  calendar: (p) => <Icon {...p} d={<><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12" /><path d="M16 3v4" /><path d="M8 3v4" /><path d="M4 11h16" /><path d="M11 15h1" /><path d="M12 15v3" /></>} />, // tabler:calendar
  chevron: (p) => <Icon {...p} d="M6 9l6 6l6 -6" />, // tabler:chevron-down
  gear: (p) => <Icon {...p} d={<><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065" /><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" /></>} />, // tabler:settings
};

/* ---------- Картинка с striped-плейсхолдером и fallback ---------- */
function Img({ src, alt, label, style, className, radius, priority }) {
  const [err, setErr] = useState(false);
  const base = { display: "block", width: "100%", height: "100%", objectFit: "cover", borderRadius: radius, ...style };
  if (err || !src) {
    // label="" — осознанно пустая плашка (декоративный слот); только отсутствующий label → дефолт-подпись
    return <div className={"ph " + (className || "")} style={{ ...base, objectFit: undefined }}>{label != null ? label : "изображение"}</div>;
  }
  // priority — для LCP-картинок (hero): eager + fetchpriority, в паре с <link rel="preload">
  return <img src={src} alt={alt || label || ""} loading={priority ? "eager" : "lazy"} fetchpriority={priority ? "high" : undefined}
              className={className} style={base} onError={() => setErr(true)} />;
}

/* ---------- Lottie-обёртка (lottie-web, без сборки) ----------
   • graceful: если lottie/asset недоступны — показываем fallback (старый SVG);
   • prefers-reduced-motion → статичный кадр, без петли;
   • playOnView → играем только когда в зоне видимости (экономия CPU);
   • intro → один проход [0..introOut], затем бесшовная ambient-петля. */
function Lottie({ name, loop, intro, playOnView = true, staticFrame, style, className, ariaLabel, fallback = null }) {
  const host = useRef(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const data = window.LedgerLottie && window.LedgerLottie[name];
    if (!data) return;                                   // нет ассета → остаётся fallback
    const meta = (window.LedgerLottieMeta && window.LedgerLottieMeta[name]) || {};
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const introOut = intro != null ? intro : meta.introOut;
    const wantLoop = loop != null ? loop : (meta.loop !== false);
    let anim, io, timer, tries = 0, cancelled = false;
    const start = () => {
      if (reduce) {
        const f = staticFrame != null ? staticFrame : (introOut != null ? introOut : Math.floor((data.op || 60) * 0.6));
        anim.goToAndStop(f, true); return;
      }
      // intro: первый проход рисует комнату + один ambient, дальше — ambient-петля
      // через re-trigger на 'complete' (playSegments-петля в этой сборке lottie-web
      // сбрасывается на полный диапазон → комната «стирается»; goToAndPlay надёжен).
      if (introOut != null) {
        anim.loop = false;
        if (!anim.__ambientBound) {
          anim.__ambientBound = true;
          anim.addEventListener("complete", () => anim.goToAndPlay(introOut, true));
        }
        anim.goToAndPlay(0, true);
      } else { anim.loop = wantLoop; anim.play(); }
    };
    const init = () => {
      if (cancelled) return;
      const el = host.current;
      if (!window.lottie) { if (tries++ < 80) timer = setTimeout(init, 40); return; } // ждём CDN (race-safe)
      if (!el) return;
      try {
        anim = window.lottie.loadAnimation({
          container: el, renderer: "svg", loop: reduce ? false : wantLoop, autoplay: false,
          animationData: JSON.parse(JSON.stringify(data)),
          rendererSettings: { progressiveLoad: false, preserveAspectRatio: "xMidYMid meet" },
        });
      } catch (e) { console.error("Lottie loadAnimation failed:", name, e); return; }
      anim.addEventListener("DOMLoaded", () => {
        setLoaded(true);
        if (!playOnView || reduce || !("IntersectionObserver" in window)) { start(); return; }
        io = new IntersectionObserver((es) => es.forEach((e) => {
          if (e.isIntersecting) { if (!anim.__started) { anim.__started = true; start(); } else anim.play(); }
          else anim.pause();
        }), { threshold: 0.2 });
        io.observe(el);
      });
    };
    init();
    return () => { cancelled = true; clearTimeout(timer); try { io && io.disconnect(); anim && anim.destroy(); } catch (e) {} };
  }, [name]);
  return (
    <div className={className} style={style}>
      <div ref={host} style={{ width: "100%", height: "100%", display: loaded ? "block" : "none" }}
           role="img" aria-label={ariaLabel || undefined} aria-hidden={ariaLabel ? undefined : true} />
      {!loaded && fallback}
    </div>
  );
}

/* explicit behavior:'smooth' в scrollTo/scrollIntoView игнорирует CSS scroll-behavior
   под prefers-reduced-motion (CSSOM-спека: явный JS-параметр важнее свойства) —
   вызывающий код сам решает behavior через этот хелпер */
function motionOK() {
  return !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

/* count-up для денег: сглаживает скачок числа за 250-350ms (ease-out), а не мгновенный джамп.
   Держит tabular-nums верстку неизменной — меняется только значение внутри. */
function useCountUp(target, duration = 300) {
  const [shown, setShown] = useState(target);
  // shownRef всегда = текущему отображаемому значению (не last-completed target) —
  // при быстрой смене target (drag слайдера) новая анимация стартует оттуда, где
  // реально остановилась предыдущая, а не прыгает к нулю/старому from.
  const shownRef = useRef(target);
  const rafRef = useRef(null);
  useEffect(() => {
    if (!motionOK()) { shownRef.current = target; setShown(target); return; }
    const from = shownRef.current;
    if (from === target) return;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = from + (target - from) * eased;
      shownRef.current = v;
      setShown(v);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else { shownRef.current = target; setShown(target); }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return shown;
}

/* число, которое считает вверх от 0 при первом появлении в viewport (once) — метрики соцдоказательств.
   "4 812" / "90 сек" — распознаёт числовую голову (с пробелом-разрядом), суффикс не трогает. */
function CountUpOnView({ value, duration = 900 }) {
  const m = String(value).match(/^(\d{1,3}(?:\s\d{3})*)(.*)$/);
  const num = m ? parseInt(m[1].replace(/\s/g, ""), 10) : null;
  const suffix = m ? m[2] : "";
  const ref = useRef(null);
  const rafRef = useRef(null);
  const [shown, setShown] = useState(num == null || !motionOK() ? num : 0);
  useEffect(() => {
    const el = ref.current;
    if (!el || num == null || !motionOK()) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / duration);
        setShown(Math.round(num * (1 - Math.pow(1 - p, 3))));
        if (p < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }), { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(rafRef.current); };
  }, [num, duration]);
  return <span ref={ref}>{num == null ? value : new Intl.NumberFormat("ru-RU").format(shown) + suffix}</span>;
}

/* ---------- Хук появления при скролле ---------- */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    el.querySelectorAll(".reveal").forEach((n) => io.observe(el === n ? n : n));
    if (el.classList.contains("reveal")) io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/* ---------- Инлайн-CTA — тонкая полоса между секциями лендинга
   (по Programa: CTA-пара повторяется 5+ раз по всей длине страницы,
   а не только в hero/footer). ---------- */
function InlineCta({ text, sub, cta = "Начать бесплатно", go }) {
  const ref = useReveal();
  return (
    <div className="container reveal" ref={ref} style={{ paddingBlock: "clamp(26px,4vh,48px)" }}>
      <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: "22px clamp(20px,4vw,34px)",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--fs-18)" }}>{text}</div>
          {sub && <div style={{ color: "var(--muted)", fontSize: "var(--fs-13)", marginTop: 4 }}>{sub}</div>}
        </div>
        <button type="button" className="btn btn-primary" style={{ padding: "12px 22px", flex: "none" }} onClick={() => go && go("auth")}>
          {cta} <I.arrow size={15} />
        </button>
      </div>
    </div>
  );
}
window.InlineCta = InlineCta;

/* ---------- Числовой форматтер ---------- */
const fmt = (n) => new Intl.NumberFormat("ru-RU").format(Math.round(n));
const fmtMoney = (n) => new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₽";

/* склонение числительных: plural(3, ["позиция","позиции","позиций"]) → «позиции»
   (правило n%10 / n%100 — корректно для 11–14, 21, 102 и т.д.) */
function plural(n, [one, few, many]) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
window.plural = plural;

/* ============================================================
   ОБРАТНАЯ СВЯЗЬ: toast + confirmDialog + promptDialog
   ------------------------------------------------------------
   Вместо нативных alert/confirm/prompt (серый бокс ОС рвал
   warm-editorial тон и блокировал поток). Plain DOM — зовутся
   из любого слоя. Esc/фокус — «как везде» (закон Якоба).
   ============================================================ */
const TOAST_ICO = {
  ok:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  warn: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/></svg>',
};
function toast(text, kind = "ok", ms = 3600) {
  let w = document.querySelector(".toast-wrap");
  if (!w) {
    w = document.createElement("div");
    w.className = "toast-wrap";
    w.setAttribute("role", "status");
    w.setAttribute("aria-live", "polite");
    document.body.appendChild(w);
  }
  const t = document.createElement("div");
  t.className = "toast " + kind;
  const i = document.createElement("span"); i.className = "ti"; i.innerHTML = TOAST_ICO[kind] || TOAST_ICO.ok;
  const s = document.createElement("span"); s.textContent = text;   // textContent: в тексте бывают имена проектов
  t.append(i, s);
  let gone = false;
  const hide = () => { if (gone) return; gone = true; t.classList.add("out"); setTimeout(() => t.remove(), 320); };
  t.addEventListener("click", hide);
  w.appendChild(t);
  setTimeout(hide, ms);
}
window.toast = toast;

/* базовый диалог: карточка + Esc/Tab-trap/возврат фокуса. build(card, close) наполняет содержимое */
function dlgOpen(label, role, build) {
  const prev = document.activeElement;
  const back = document.createElement("div"); back.className = "modal-back";
  const card = document.createElement("div"); card.className = "glass modal-card dlg-card";
  card.setAttribute("role", role); card.setAttribute("aria-modal", "true"); card.setAttribute("aria-label", label);
  back.appendChild(card); document.body.appendChild(back);
  const close = () => { back.remove(); document.removeEventListener("keydown", onKey, true); if (prev && prev.focus) prev.focus(); };
  const onKey = (e) => {
    if (e.key === "Escape") { e.stopPropagation(); card.dispatchEvent(new CustomEvent("dlg-cancel")); }
    if (e.key === "Tab") {   // ловушка фокуса внутри карточки
      const f = [...card.querySelectorAll("button, input, select, textarea, a[href]")].filter((el) => !el.disabled);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  document.addEventListener("keydown", onKey, true);
  back.addEventListener("mousedown", (e) => { if (e.target === back) card.dispatchEvent(new CustomEvent("dlg-cancel")); });
  build(card, close);
}

/* подтверждение: await confirmDialog({title, text, confirmLabel}) → true/false */
function confirmDialog({ title, text, confirmLabel = "Удалить", cancelLabel = "Отмена", danger = true }) {
  return new Promise((resolve) => {
    dlgOpen(title, "alertdialog", (card, close) => {
      const done = (v) => { close(); resolve(v); };
      card.addEventListener("dlg-cancel", () => done(false));
      const h = document.createElement("h3"); h.className = "display"; h.textContent = title;
      const p = document.createElement("p"); p.className = "dlg-text"; p.textContent = text || "";
      const row = document.createElement("div"); row.className = "dlg-row";
      const bC = document.createElement("button"); bC.className = "btn btn-ghost"; bC.textContent = cancelLabel; bC.onclick = () => done(false);
      const bY = document.createElement("button"); bY.className = "btn " + (danger ? "btn-primary" : "btn-ghost"); bY.textContent = confirmLabel; bY.onclick = () => done(true);
      row.append(bC, bY); card.append(h, p, row);
      bC.focus();   // безопасный дефолт — на «Отмена»
    });
  });
}
window.confirmDialog = confirmDialog;

/* подтверждение «уйти со сметы без сохранения» — общая формулировка для двух
   независимых гвардов несохранённых правок (долг W2/W6): guardSmetaLeave
   (cabinet.jsx — сайдбар/крошка-переключатель/⌘K/«Все проекты», через мост
   window.pdSmetaDirty) и guardedClose (project-detail.jsx — «Проекты»-крошка/
   стрелка назад/Esc внутри самой сметы, на локальном dirty). Один текст —
   один источник, не расходится при будущей правке формулировки в одном месте. */
function confirmLeaveSmeta() {
  return confirmDialog({
    title: "Уйти без сохранения?",
    text: "В смете есть несохранённые правки — они пропадут. Сохранить перед уходом?",
    confirmLabel: "Сохранить и уйти", cancelLabel: "Остаться",
  });
}
window.confirmLeaveSmeta = confirmLeaveSmeta;

/* ввод строки: await promptDialog({title, label, value}) → string | null */
function promptDialog({ title, label, value = "", confirmLabel = "Сохранить", placeholder = "" }) {
  return new Promise((resolve) => {
    dlgOpen(title, "dialog", (card, close) => {
      const done = (v) => { close(); resolve(v); };
      card.addEventListener("dlg-cancel", () => done(null));
      const h = document.createElement("h3"); h.className = "display"; h.textContent = title;
      const lb = document.createElement("label"); lb.className = "dlg-lb"; lb.textContent = label || "";
      const inp = document.createElement("input"); inp.className = "fld"; inp.value = value; inp.placeholder = placeholder;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") done(inp.value); });
      lb.appendChild(inp);
      const row = document.createElement("div"); row.className = "dlg-row";
      const bC = document.createElement("button"); bC.className = "btn btn-ghost"; bC.textContent = "Отмена"; bC.onclick = () => done(null);
      const bY = document.createElement("button"); bY.className = "btn btn-primary"; bY.textContent = confirmLabel; bY.onclick = () => done(inp.value);
      row.append(bC, bY); card.append(h, lb, row);
      inp.focus(); inp.select();
    });
  });
}
window.promptDialog = promptDialog;

/* стек открытых модалок + счётчик блокировки скролла — несколько Modal бывают
   смонтированы одновременно (напр. онбординг-квиз всплывает по таймеру поверх
   уже открытой NewProjectModal), поэтому Esc/Tab обрабатывает только верхняя,
   а body.overflow снимается лишь когда закрылась последняя */
let modalStack = [];
let modalLockCount = 0;
let modalIdSeq = 0;
function lockBodyScroll() { if (modalLockCount++ === 0) document.body.style.overflow = "hidden"; }
function unlockBodyScroll() { if (--modalLockCount <= 0) { modalLockCount = 0; document.body.style.overflow = ""; } }

/* ============================================================
   Modal — обёртка для React-модалок: role=dialog, aria-modal,
   ловушка фокуса, Esc → onClose, возврат фокуса на триггер.
   ============================================================ */
function Modal({ onClose, label, maxWidth, className, children }) {
  const cardRef = useRef(null);
  const idRef = useRef(null);
  const closingRef = useRef(false);
  const closeTimerRef = useRef(null);
  // ref, а не прямой onClose — keydown-эффект смонтирован один раз ([] deps) и должен
  // звать АКТУАЛЬНЫЙ колбэк родителя (иначе Esc после ре-рендера с новым onClose
  // срабатывает по устаревшему замыканию первого рендера)
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [closing, setClosing] = useState(false);
  if (idRef.current == null) idRef.current = ++modalIdSeq;
  // вход анимирован (pop/fadeIn), выход — нет, была асимметрия с toast; тут закрываем сами
  // (Esc/клик по фону), затем зовём реальный onClose — кнопки внутри контента закрывают как раньше
  const requestClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (!motionOK()) { onCloseRef.current(); return; }
    setClosing(true);
    closeTimerRef.current = setTimeout(() => onCloseRef.current(), 170);
  };
  useEffect(() => {
    const prev = document.activeElement;
    const card = cardRef.current;
    // фокус — сначала на поле ввода, иначе на первый интерактив (не на «Закрыть» в шапке)
    const first = card.querySelector("input, select, textarea") || card.querySelector("button:not([aria-label='Закрыть'])") || card.querySelector("button");
    (first || card).focus();
    const id = idRef.current;
    modalStack.push(id);
    const isTop = () => modalStack[modalStack.length - 1] === id;
    const onKey = (e) => {
      if (!isTop()) return;   // не самая верхняя модалка — не перехватываем клавиатуру
      if (e.key === "Escape") { e.stopPropagation(); requestClose(); }
      if (e.key === "Tab") {
        const f = [...card.querySelectorAll("button, input, select, textarea, a[href], [tabindex]:not([tabindex='-1'])")].filter((el) => !el.disabled && el.offsetParent !== null);
        if (!f.length) return;
        const firstF = f[0], lastF = f[f.length - 1];
        // фокус утёк наружу (например, на body) — затягиваем обратно в модалку
        if (!card.contains(document.activeElement)) { e.preventDefault(); firstF.focus(); return; }
        if (e.shiftKey && document.activeElement === firstF) { e.preventDefault(); lastF.focus(); }
        else if (!e.shiftKey && document.activeElement === lastF) { e.preventDefault(); firstF.focus(); }
      }
    };
    document.addEventListener("keydown", onKey, true);
    lockBodyScroll();
    return () => {
      modalStack = modalStack.filter((x) => x !== id);
      document.removeEventListener("keydown", onKey, true);
      unlockBodyScroll();
      clearTimeout(closeTimerRef.current);
      if (prev && prev.focus) prev.focus();
    };
  }, []);
  return (
    <div className={"modal-back" + (closing ? " closing" : "")} onMouseDown={(e) => e.target === e.currentTarget && requestClose()}>
      <div ref={cardRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label}
        className={"glass modal-card" + (closing ? " closing" : "") + (className ? " " + className : "")} style={{ borderRadius: "var(--r-xl)", ...(maxWidth ? { maxWidth, width: `min(${maxWidth}px, 100%)` } : {}) }}>
        {children}
      </div>
    </div>
  );
}
window.Modal = Modal;

/* ============================================================
   Атомарные контролы (роадмап UpRock #7) — вместо трёх самописных
   toggle, трёх сегмент-контролов и дублированных шапок/итогов.
   Цветовые роли: терракота = primary/выбор, олива = успех/включено.
   ============================================================ */

/* переключатель вкл/выкл (олива = включено) */
function Switch({ on, onChange, disabled, title, ariaLabel }) {
  return (
    <button type="button" className={"sw-toggle" + (on ? " on" : "")} onClick={onChange}
      disabled={disabled} aria-pressed={on} title={title} aria-label={ariaLabel}>
      <span className="knob" />
    </button>
  );
}

/* сегмент-переключатель «одно из N»: radiogroup, ←/→ двигают выбор.
   className задаёт скин: pd-seg (крупный) · spec-mode (компактный с подписью) · pd-seg seg-lite (светлый) */
function SegTabs({ items, value, onChange, ariaLabel, className = "pd-seg", cap, style }) {
  const move = (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = items.findIndex((it) => it.id === value);
    const next = e.key === "ArrowRight" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    onChange(items[next].id);
    const btns = e.currentTarget.parentElement.querySelectorAll("[role='radio']");
    if (btns[next]) btns[next].focus();
  };
  return (
    <div className={className} role="radiogroup" aria-label={ariaLabel} style={style}>
      {cap && <span className="spec-mode-cap">{cap}</span>}
      {items.map((it) => (
        <button key={it.id} type="button" role="radio" aria-checked={it.id === value} title={it.title}
          tabIndex={it.id === value ? 0 : -1} className={it.id === value ? "on" : ""}
          onClick={() => onChange(it.id)} onKeyDown={move}>
          {it.label}{it.sub && <span className="sn">{it.sub}</span>}
        </button>
      ))}
    </div>
  );
}

/* Контейнер выпадающего меню по канону §5.6 (W6-ревью) — позиционирование, слой и
   anchor в одном месте вместо копий по файлам. Триггер и пункты — у вызывающего;
   открытие/Esc/клик-мимо — useMenu там же. Старые меню (RoomJumpMenu, LoopStatusChip,
   AccountMenu, кебаб карточки) переводятся сюда следующей полировкой — см. журнал W6. */
function MenuPop({ open, label, minWidth = 210, style, children }) {
  if (!open) return null;
  return (
    <div className="menu menu-pop" role="menu" aria-label={label}
      style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth, zIndex: 60, transformOrigin: "top left", ...style }}>
      {children}
    </div>
  );
}

/* шапка оверлея проекта/сметы: назад + крошки + заголовок + бюджет-чип/правый слот.
   Не PageHead — это имя занято шапкой раздела админки (admin.jsx).
   Д2 (W6): crumbMenu — переключатель под-вьюх проекта прямо в крошке (паттерн Programa
   «Files > Project Schedule ▾»): каретка за последней крошкой, меню по канону §5.6.
   Форма: массив [{ id, label, on, onPick }]. */
function OverlayHead({ onBack, crumbs, title, sub, budget, right, crumbMenu }) {
  const [menuOpen, setMenuOpen] = useState(false);
  useMenu(menuOpen, () => setMenuOpen(false), "pd-crumb-switch");
  return (
    <header className="pd-head">
      <button className="icon-btn" onClick={onBack} title="Назад к проектам" aria-label="Назад"><I.arrow size={18} style={{ transform: "rotate(180deg)" }} /></button>
      <div className="pd-title" style={{ flex: 1 }}>
        <nav className="pd-crumbs" aria-label="Хлебные крошки">
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span aria-hidden="true">/</span>}
              {c.onClick
                ? <button onClick={c.onClick}>{c.label}</button>
                : <span aria-current={i === crumbs.length - 1 ? "page" : undefined}>{c.label}</span>}
            </React.Fragment>
          ))}
          {crumbMenu && crumbMenu.length > 0 && (
            <span className="pd-crumb-switch" style={{ position: "relative", display: "inline-flex", alignSelf: "center" }}>
              <button className="icon-btn xs" aria-haspopup="menu" aria-expanded={menuOpen}
                aria-label="Разделы проекта" title="Разделы проекта" onClick={() => setMenuOpen((o) => !o)}>
                <I.chevron size={12} stroke={2.4} />
              </button>
              <MenuPop open={menuOpen} label="Разделы проекта">
                {crumbMenu.map((it) => (
                  <button key={it.id} role="menuitem" className="menu-item" aria-current={it.on ? "true" : undefined}
                    onClick={() => { setMenuOpen(false); if (!it.on) it.onPick(); }}
                    style={it.on ? { background: "var(--surface-2)" } : undefined}>
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.label}</span>
                    {it.on && <I.check size={14} style={{ marginLeft: "auto", color: "var(--accent-2-ink)", flex: "none" }} />}
                  </button>
                ))}
              </MenuPop>
            </span>
          )}
        </nav>
        <h2>{title}</h2>
        <div className="pd-sub">{sub}</div>
      </div>
      {budget != null && (
        <span className="glass pd-bud" style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 99, fontSize: "var(--fs-12)", fontWeight: 700, whiteSpace: "nowrap" }}>
          <I.wallet size={15} style={{ color: "var(--accent-2)" }} />Бюджет {fmtMoney(budget)}
        </span>
      )}
      {right}
    </header>
  );
}

/* итог сметы: плитка-иконка + крупная mono-цифра (tabular) + подпись */
function SmetaTotal({ amount, caption, icon = "layers", size = 22 }) {
  const Ico = icon ? (I[icon] || I.layers) : null;
  const shown = useCountUp(amount);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
      {Ico && <span style={{ width: 40, height: 40, borderRadius: 12, background: "var(--accent)", color: "var(--on-accent)", display: "grid", placeItems: "center", flex: "none" }}><Ico size={20} /></span>}
      <div>
        <div className="mono" style={{ fontWeight: 600, fontSize: size, lineHeight: 1 }}>{fmtMoney(shown)}</div>
        {caption && <div style={{ fontSize: "var(--fs-12)", color: "var(--muted)", marginTop: 3 }}>{caption}</div>}
      </div>
    </div>
  );
}

/* ============================================================
   ДАШБОРД-ПРИМИТИВЫ (роадмап П3) — вместо дублей по admin.jsx /
   cabinet-views.jsx / library-editor.jsx /
   project-detail.jsx / portal.jsx. Деньги — всегда mono+tabular,
   Spectral (display) — только нецифровым заголовкам.
   ============================================================ */

/* строка итогового блока сметы-документа (подытог → скидка → доставка/монтаж → ИТОГО) */
const RS_ROW = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "8px 0", fontSize: "var(--fs-13)" };

/* давность цены: чип «цене N дней» — терракота после 30 дней (RU-волатильность цен).
   note(days, stale) — кастомный текст тултипа; по умолчанию «цена проверена…» */
const priceAgeDays = (d) => { const t = new Date(d + "T00:00:00").getTime(); return isNaN(t) ? null : Math.max(0, Math.floor((Date.now() - t) / 86400000)); };
function PriceAgeChip({ d, note }) {
  const days = priceAgeDays(d);
  if (days == null) return null;
  const stale = days > 30;
  const title = note ? note(days, stale) : "Цена проверена " + (days === 0 ? "сегодня" : days + " " + plural(days, ["день", "дня", "дней"]) + " назад") + (stale ? " — стоит перепроверить" : "");
  return (
    <span className="mono" title={title}
      style={{ flex: "none", fontSize: "var(--fs-10)", whiteSpace: "nowrap", padding: "1px 7px", borderRadius: 99,
        border: "1px solid " + (stale ? "rgba(183,80,44,.4)" : "var(--hairline)"), color: stale ? "var(--accent-ink)" : "var(--spec-meta)" }}>
      {days === 0 ? "цена от сегодня" : "цене " + days + " " + plural(days, ["день", "дня", "дней"])}
    </span>
  );
}

/* «Изменено N дней назад» (карточка проекта, волна W3, паттерн Programa
   «Edited N hours ago») — честно по дням: `updated` в данных хранится только
   датой (YYYY-MM-DD), без времени суток, так что часы/минуты были бы
   выдуманной точностью. За порогом в месяц — просто дата (day.month). */
function fmtRelDays(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  const days = Math.round((new Date(new Date().toDateString()) - d) / 86400000);
  if (days <= 0) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 30) return days + " " + plural(days, ["день", "дня", "дней"]) + " назад";
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}
window.fmtRelDays = fmtRelDays;

/* дата+время треда («08.07 14:32») — короче ISO, читаемо в переписке клиент↔студия */
const fmtCommentAt = (iso) => {
  // new Date(bogus) не бросает — даёт Invalid Date, toLocaleString тогда вернёт
  // литеральную строку "Invalid Date"; ловим через isNaN, а не try/catch
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch (e) { return ""; }
};
/* автолинки URL в комментариях (Ч5, PROGRAMA_CHANGELOG_2026-07-12 §2.6):
   переписка клиент↔студия постоянно содержит ссылки на карточки товаров
   («а можно вот такой?» + URL) — кликабельность вместо копипасты. Чистый
   разбор вынесен наружу для юнит-тестов (образец NORMS_LOGIC).
   Ловим только явные http(s):// и www. — «голые» домены (divan.ru) не
   трогаем: слишком много ложных срабатываний на сокращениях с точкой.
   Схема href всегда из этих двух форм, javascript: сюда не пролезает. */
const splitCommentLinks = (text) => {
  const parts = [];
  const re = /(?:https?:\/\/|www\.)[^\s<>]+/gi;
  let last = 0, m;
  while ((m = re.exec(String(text || "")))) {
    let url = m[0];
    // хвостовая пунктуация предложения — не часть ссылки («смотри example.com/x.»);
    // закрывающую скобку оставляем, только если внутри URL есть парная открывающая
    while (/[.,;:!?»)"'”]$/.test(url)) {
      if (url.endsWith(")") && (url.match(/\(/g) || []).length >= (url.match(/\)/g) || []).length) break;
      url = url.slice(0, -1);
    }
    // «www.» без хоста после обрезки — не ссылка (голое «www.» в тексте)
    if (!/^(?:https?:\/\/|www\.)[^\s]*[\w/]/i.test(url)) { re.lastIndex = m.index + m[0].length; continue; }
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ text: url, href: /^www\./i.test(url) ? "https://" + url : url });
    last = m.index + url.length;
    re.lastIndex = last;   // после обрезки хвоста — продолжить с реального конца ссылки
  }
  const s = String(text || "");
  if (last < s.length) parts.push({ text: s.slice(last) });
  return parts;
};
window.LedgerLinkify = { splitCommentLinks };   // наружу — для юнит-тестов

/* пузырь одного сообщения в треде. isMine — сообщение «твоей» стороны
   (на портале это клиент, в кабинете — дизайнер): заливка олива, без рамки.
   theirBg — фон «чужого» пузыря; по умолчанию --glass-2, но кабинет передаёт
   --glass — там карточка треда сама уже --glass-2, и пузырь иначе сливается с ней */
function CommentBubble({ comment, isMine, authorLabel, theirBg = "var(--glass-2)" }) {
  return (
    <div className="msg-in" style={{
      alignSelf: isMine ? "flex-end" : "flex-start", maxWidth: "88%",
      padding: "6px 10px", borderRadius: 10, fontSize: "var(--fs-12)", lineHeight: 1.5,
      background: isMine ? "var(--accent-2)" : theirBg,
      color: isMine ? "var(--on-accent)" : "var(--text)",
      border: isMine ? "none" : "1px solid var(--hairline)",
    }}>
      <div>{splitCommentLinks(comment.text).map((p, i) => p.href
        // color inherit: в «моём» пузыре текст --on-accent на оливе — дефолтно-синяя ссылка нечитаема
        ? <a key={i} href={p.href} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 2, wordBreak: "break-all" }}>{p.text}</a>
        : <React.Fragment key={i}>{p.text}</React.Fragment>)}</div>
      <div style={{ fontSize: "var(--fs-10)", opacity: .75, marginTop: 3 }}>{authorLabel} · {fmtCommentAt(comment.at)}</div>
    </div>
  );
}

/* статус-пилюля: точка + подпись, тон = семантика правила канона —
   accent2 (олива) = успех/включено, accent (терракота) = внимание, muted = нейтрально */
const PILL_TONES = {
  accent2: { bg: "rgba(94,107,91,.16)", fg: "var(--accent-2-ink)", bd: "rgba(94,107,91,.34)", dot: "var(--accent-2)" },
  accent: { bg: "rgba(183,80,44,.16)", fg: "var(--accent-ink)", bd: "rgba(183,80,44,.32)", dot: "var(--accent)" },
  muted: { bg: "var(--glass-2)", fg: "var(--muted)", bd: "var(--hairline)", dot: "var(--faint)" },
};
function StatusPill({ tone = "muted", dot = true, children, onClick, title }) {
  const t = PILL_TONES[tone] || PILL_TONES.muted;
  const Comp = onClick ? "button" : "span";
  return (
    <Comp type={onClick ? "button" : undefined} className="status-pill" onClick={onClick} title={title} style={{ background: t.bg, color: t.fg, borderColor: t.bd }}>
      {dot && <span style={{ width: 7, height: 7, borderRadius: "50%", background: t.dot, flex: "none" }} />}
      {children}
    </Comp>
  );
}

/* поле поиска: иконка + .fld — канон вместо самописных реализаций (админка/кабинет/библиотека) */
function SearchField({ value, onChange, placeholder, ariaLabel, style }) {
  return (
    <div style={{ position: "relative", ...style }}>
      <I.search size={16} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--faint)" }} />
      <input className="fld" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        aria-label={ariaLabel || placeholder} style={{ paddingLeft: 38, width: "100%" }} />
    </div>
  );
}

/* шапка раздела: eyebrow (опц.) + display-заголовок (responsive clamp) + подзаголовок + правый слот */
function PageHead({ eyebrow, eyebrowIcon, title, sub, right, style }) {
  const EyeIco = eyebrowIcon ? I[eyebrowIcon] : null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 26, ...style }}>
      <div>
        {eyebrow && (
          /* канон .eyebrow (styles.css) вместо инлайн-дубля: тот же mono/--tr-caps,
             но цвет --accent-ink (заливочный --accent как текст на бумаге < 4.5:1);
             .ico — иконка-лид вместо черты */
          <span className={"eyebrow" + (EyeIco ? " ico" : "")}>
            {EyeIco && <EyeIco size={15} />}{eyebrow}
          </span>
        )}
        <h1 className="display" style={{ fontSize: "clamp(26px,3vw,36px)", marginTop: eyebrow ? 10 : 0 }}>{title}</h1>
        {sub && <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", marginTop: eyebrow ? 8 : 6, maxWidth: eyebrow ? 640 : undefined, lineHeight: eyebrow ? 1.6 : undefined }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/* пустое состояние (W5.2, шаблон Programa §5.8): по центру, без тяжёлой карточки —
   маленькая иконка серым → заголовок → 1–2 строки ценности → CTA. Компактный вариант —
   для «после фильтра/поиска» внутри списков и модалок. */
function EmptyState({ icon, title, text, action, compact }) {
  const Ico = icon ? I[icon] : null;
  if (compact) {
    return (
      <div style={{ padding: "34px 20px", textAlign: "center", color: "var(--muted)" }}>
        {Ico && <Ico size={20} style={{ color: "var(--faint)" }} />}
        {text && <div style={{ marginTop: 8, fontSize: "var(--fs-13)", lineHeight: 1.6, maxWidth: 420, marginInline: "auto" }}>{text}</div>}
        {action && <div style={{ marginTop: 14, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>{action}</div>}
      </div>
    );
  }
  return (
    <div style={{ padding: "clamp(48px,10vh,96px) 24px", textAlign: "center" }}>
      {Ico && <Ico size={20} style={{ color: "var(--faint)" }} />}
      {title && <h3 style={{ fontSize: "var(--fs-15)", fontWeight: 600, marginTop: 10 }}>{title}</h3>}
      {text && <p style={{ color: "var(--muted)", fontSize: "var(--fs-13)", marginTop: 6, maxWidth: 420, marginInline: "auto", lineHeight: 1.6 }}>{text}</p>}
      {action && <div style={{ marginTop: 18, display: "flex", justifyContent: "center", alignItems: "center", gap: 12, flexWrap: "wrap" }}>{action}</div>}
    </div>
  );
}

/* KPI-плитка с дельтой (Stripe/Linear: число + изменение к прошлому периоду). Деньги — mono, остальное — display */
function KpiCard({ k }) {
  const isMoney = k.unit === "₽";
  // % не через fmt() — округление съедало десятичные (34.6% превращалось в «35%»)
  const val = isMoney ? fmtMoney(k.value)
    : k.unit === "abs" ? fmt(k.value)
    : k.unit === "%" ? k.value.toLocaleString("ru-RU") + "%"
    : fmt(k.value) + (k.unit || "");
  // токены шкалы (П2) — не сырые px; 22 в шкале нет, ближайшая ступень 21
  const big = val.length > 9 ? "var(--fs-21)" : (val.length > 7 ? "var(--fs-26)" : "var(--fs-30)");
  return (
    <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: 22 }}>
      <div style={{ color: "var(--muted)", fontSize: "var(--fs-13)", marginBottom: 12 }}>{k.label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span className={isMoney ? "mono" : "display"} style={{ fontSize: big, fontWeight: isMoney ? 600 : undefined, letterSpacing: isMoney ? undefined : "-0.02em", whiteSpace: "nowrap" }}>{val}</span>
        {k.delta != null && (
          <span style={{ fontSize: "var(--fs-13)", fontWeight: 700, color: k.delta >= 0 ? "var(--accent-2)" : "var(--accent)", display: "inline-flex", alignItems: "center", gap: 2 }}>
            <I.arrowUp size={13} style={{ transform: k.delta >= 0 ? "none" : "rotate(180deg)" }} />{Math.abs(k.delta)}{k.unit === "abs" ? "" : "%"}
          </span>
        )}
      </div>
    </div>
  );
}

/* карточка-контейнер графика: заголовок + источник справа (Stripe/Linear/Metabase паттерн) + скелетон-заглушка */
function ChartCard({ title, source, accent, children, style }) {
  return (
    <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: 24, ...style }}>
      {(title || source) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 18 }}>
          {title && <h3 style={{ fontSize: "var(--fs-16)", fontWeight: 700, minWidth: 0 }}>{title}</h3>}
          {source && <span style={{ fontSize: "var(--fs-11)", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: accent || "var(--muted)", whiteSpace: "nowrap", flex: "none" }}>{source}</span>}
        </div>
      )}
      {children}
    </div>
  );
}
function ChartSkel({ h = 150 }) { return <div className="skel" style={{ height: h, borderRadius: 12 }} />; }

/* ============================================================
   LedgerLibs — ленивые тяжёлые библиотеки (не грузим на промо):
   pdfmake ~2 МБ и SheetJS ~800 КБ подтягиваются при первом экспорте.
   ============================================================ */
const _libCache = {};
function loadScript(src) {
  if (!_libCache[src]) _libCache[src] = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src; s.async = true;
    s.onload = resolve;
    s.onerror = () => { delete _libCache[src]; s.remove(); reject(new Error("load failed: " + src)); };
    document.head.appendChild(s);
  });
  return _libCache[src];
}
window.LedgerLibs = {
  // pdfmake + шрифтовой vfs: npm-чанки Vite (LedgerLoad, vendor-globals.js);
  // CDN — фолбэк для окружений без сборки (standalone-прототипы)
  pdf: () => window.pdfMake && window.pdfMake.vfs
    ? Promise.resolve()
    : window.LedgerLoad
      ? LedgerLoad.pdf()
      : loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/pdfmake.min.js")
          .then(() => loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/vfs_fonts.js")),
  xlsx: () => window.XLSX
    ? Promise.resolve()
    : window.LedgerLoad
      ? LedgerLoad.xlsx()
      : loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"),
};
/* обёртка: тост «готовим…» только если реально грузим.
   Сбой сети и сбой самого экспорта — разные ошибки с разными текстами (и логом). */
function withLib(kind, run) {
  const label = kind === "pdf" ? "PDF" : "Excel";
  const loaded = kind === "pdf" ? (window.pdfMake && window.pdfMake.vfs) : window.XLSX;
  if (!loaded) toast("Готовим модуль " + label + "…", "info", 1800);
  return LedgerLibs[kind]().then(
    () => Promise.resolve().then(run).catch((e) => {
      console.error("[Design Ledger] " + label + "-экспорт упал:", e);
      toast("Не удалось выполнить экспорт " + label + " — попробуйте ещё раз.", "warn", 5000);
    }),
    () => toast("Не удалось загрузить модуль " + label + " — проверьте сеть и попробуйте ещё раз.", "warn", 5000)
  );
}
window.withLib = withLib;

/* ============================================================
   useMenu — клавиатура и click-outside для выпадающих меню:
   Esc → закрыть + вернуть фокус, ↑/↓ по [role=menuitem].
   wrapCls — класс контейнера (для click-outside).
   ============================================================ */
function useMenu(open, close, wrapCls) {
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement;
    const items = () => [...document.querySelectorAll("." + wrapCls + " [role='menuitem']")].filter((el) => !el.disabled);
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); close(); if (trigger && trigger.focus) trigger.focus(); }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const f = items(); if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        // с триггера (i=-1): ↓ — первый пункт, ↑ — последний
        const next = e.key === "ArrowDown" ? (i + 1) % f.length : (i < 0 ? f.length - 1 : (i - 1 + f.length) % f.length);
        f[next].focus();
      }
    };
    const onClick = (e) => { if (!e.target.closest("." + wrapCls)) close(); };
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("click", onClick);
    return () => { document.removeEventListener("keydown", onKey, true); window.removeEventListener("click", onClick); };
  }, [open]);
}
window.useMenu = useMenu;

/* Пункты меню статуса петли проекта (точка + подпись + галочка активного) —
   общий для карточки проекта (cabinet-views) и «Обзора» (project-detail, W2),
   чтобы не было копипаста двух дропдаунов. Словарь — из ffe.js. onPick(status)
   получает выбор (вызывающий сам решает закрыть меню / вернуть фокус). */
function StatusMenuItems({ current, onPick }) {
  const F = window.LedgerFFE || {};
  const statuses = F.PROJ_STATUSES || [], colors = F.PROJ_STATUS_COLOR || {};
  return statuses.map((s) => (
    <button key={s} role="menuitem" className="menu-item" onClick={(e) => { e.stopPropagation(); onPick(s); }}
      style={{ fontWeight: s === current ? 700 : 600 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[s], flex: "none" }} />{s}
      {s === current && <I.check size={14} style={{ marginLeft: "auto", color: "var(--accent-2)" }} />}
    </button>
  ));
}
window.StatusMenuItems = StatusMenuItems;

/* ============================================================
   ГРАФИКИ (рисуем сами на SVG, цвет --chart / Wasabi)
   ============================================================ */

/* площадь/линия */
function AreaChart({ data, color = "var(--chart)", height = 150, id = "ac" }) {
  const w = 560, h = height, pad = 8;
  const max = Math.max(...data) * 1.12, min = Math.min(...data) * 0.85;
  const px = (i) => pad + (i / (data.length - 1)) * (w - pad * 2);
  const py = (v) => h - pad - ((v - min) / (max - min)) * (h - pad * 2);
  const line = data.map((v, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
  const area = `${line} L${px(data.length - 1).toFixed(1)},${h} L${px(0).toFixed(1)},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {data.map((v, i) => i % 2 === 0 && <circle key={i} cx={px(i)} cy={py(v)} r="2.6" fill={color} />)}
    </svg>
  );
}

/* горизонтальные бары (источники / стили) */
function BarList({ data, color = "var(--chart)", money }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: "var(--fs-13)", marginBottom: 8, lineHeight: 1.3 }}>
            <span style={{ color: "var(--muted)" }}>{d.label}</span>
            <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{money ? fmtMoney(d.value) : d.value + "%"}</span>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: "var(--glass-2)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: "100%", borderRadius: 99, transformOrigin: "left",
              transform: `scaleX(${d.value / max})`,
              background: `linear-gradient(90deg, ${color}, ${color}aa)`, transition: "transform var(--dur-slow) var(--ease-pop)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* донат-кольцо */
function Donut({ data, size = 168 }) {
  const colors = ["var(--accent)", "var(--accent-2)", "var(--info)", "var(--chart)", "var(--accent-soft)", "#8a6fb0"];
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = size / 2 - 14, c = 2 * Math.PI * r;
  let off = 0;
  return (
    <div style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--glass-2)" strokeWidth="14" />
        {data.map((d, i) => {
          const len = (d.value / total) * c;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors[i % colors.length]}
            strokeWidth="14" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-off} strokeLinecap="butt" />;
          off += len; return el;
        })}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, minWidth: 150 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: "var(--fs-13)" }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: colors[i % colors.length], flex: "none" }} />
            <span style={{ color: "var(--muted)", flex: 1 }}>{d.label}</span>
            <span style={{ fontWeight: 700 }}>{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  Logo, Icon, I, Img, Lottie, useReveal, motionOK, useCountUp, CountUpOnView, fmt, fmtMoney, AreaChart, BarList, Donut, Switch, SegTabs, OverlayHead, SmetaTotal,
  RS_ROW, PriceAgeChip, fmtCommentAt, CommentBubble, StatusPill, SearchField, PageHead, EmptyState, KpiCard, ChartCard, ChartSkel, MenuPop,
});
