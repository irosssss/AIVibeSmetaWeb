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
        Design <span style={{ color: "var(--accent)" }}>Ledger</span>
      </span>
    </div>
  );
}

/* ---------- Иконки (тонкая линия, 1.6 stroke) ---------- */
const Icon = ({ d, size = 20, stroke = 1.6, fill = "none", ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
       strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);
const I = {
  scan: (p) => <Icon {...p} d={<><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><rect x="8.5" y="8.5" width="7" height="7" rx="1.5" /></>} />,
  spark: (p) => <Icon {...p} d={<><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="M12 8.5 13 11l2.5 1-2.5 1-1 2.5-1-2.5L8.5 12 11 11z" /></>} />,
  cube: (p) => <Icon {...p} d={<><path d="M12 2.5 21 7v10l-9 4.5L3 17V7z" /><path d="M3 7l9 4.5L21 7M12 11.5V21.5" /></>} />,
  cart: (p) => <Icon {...p} d={<><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.4 12.4a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L21 7H6" /></>} />,
  arrow: (p) => <Icon {...p} d="M5 12h14M13 6l6 6-6 6" />,
  arrowUp: (p) => <Icon {...p} d="M12 19V5M6 11l6-6 6 6" />,
  check: (p) => <Icon {...p} d="M4 12.5l5 5L20 6.5" />,
  apple: (p) => <Icon {...p} fill="currentColor" stroke="none" d="M17.05 12.04c-.03-2.6 2.13-3.85 2.23-3.91-1.22-1.78-3.11-2.03-3.78-2.05-1.61-.16-3.14.95-3.96.95-.81 0-2.07-.93-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.15-.46 7.8 1.3 10.36.86 1.25 1.88 2.66 3.22 2.61 1.29-.05 1.78-.83 3.34-.83 1.55 0 2 .83 3.37.81 1.39-.03 2.27-1.28 3.12-2.54.98-1.45 1.39-2.85 1.41-2.92-.03-.01-2.7-1.04-2.73-4.11M14.6 4.5c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.44" />,
  user: (p) => <Icon {...p} d={<><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></>} />,
  grid: (p) => <Icon {...p} d={<><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>} />,
  chart: (p) => <Icon {...p} d={<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>} />,
  news: (p) => <Icon {...p} d={<><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M7 9h10M7 13h6M7 16h4" /></>} />,
  users: (p) => <Icon {...p} d={<><circle cx="9" cy="8" r="3.2" /><path d="M3 19c0-3 3-4.5 6-4.5s6 1.5 6 4.5" /><path d="M16 5.2A3 3 0 0 1 16 11M21 19c0-2.4-1.8-3.8-4-4.3" /></>} />,
  plus: (p) => <Icon {...p} d="M12 5v14M5 12h14" />,
  edit: (p) => <Icon {...p} d="M4 20h4L18.5 9.5a2 2 0 0 0-2.8-2.8L5 17.2zM14 7l3 3" />,
  trash: (p) => <Icon {...p} d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13" />,
  close: (p) => <Icon {...p} d="M6 6l12 12M18 6L6 18" />,
  logout: (p) => <Icon {...p} d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 16l4-4-4-4M20 12H9" />,
  star: (p) => <Icon {...p} d="M12 3.5l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 17l-5.3 3 1.2-6L3.4 9.8l6-.7z" />,
  fork: (p) => <Icon {...p} d={<><circle cx="6" cy="5" r="2" /><circle cx="18" cy="5" r="2" /><circle cx="12" cy="19" r="2" /><path d="M6 7v3a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M12 12v5" /></>} />,
  bug: (p) => <Icon {...p} d={<><rect x="8" y="8" width="8" height="11" rx="4" /><path d="M8 11H4M20 11h-4M8 15H3M21 15h-5M9 6l1.5 2M15 6l-1.5 2" /></>} />,
  search: (p) => <Icon {...p} d={<><circle cx="11" cy="11" r="6" /><path d="M20 20l-3.5-3.5" /></>} />,
  ruler: (p) => <Icon {...p} d={<><rect x="3" y="8" width="18" height="8" rx="1.5" /><path d="M7 8v3M11 8v4M15 8v3M19 8v4" /></>} />,
  layers: (p) => <Icon {...p} d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5" />,
  wallet: (p) => <Icon {...p} d={<><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18M16 14.5h2" /></>} />,
  truck: (p) => <Icon {...p} d={<><path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17.5" cy="17.5" r="1.6" /></>} />,
  chat: (p) => <Icon {...p} d={<><path d="M21 11.5a8.38 8.38 0 0 1-9 8.3 8.5 8.5 0 0 1-3.9-.8L3 20l1-4.1A8.38 8.38 0 0 1 3 11.5a8.5 8.5 0 0 1 9-8.3 8.38 8.38 0 0 1 9 8.3z" /></>} />,
  send: (p) => <Icon {...p} d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />,
  sun: (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>} />,
  sliders: (p) => <Icon {...p} d={<><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /></>} />,
  heart: (p) => <Icon {...p} d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />,
  info: (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5h.01" /></>} />,
  sofa: (p) => <Icon {...p} d={<><path d="M4 12V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" /><path d="M2 13a2 2 0 0 1 4 0v3h12v-3a2 2 0 0 1 4 0v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" /><path d="M6 12h12" /></>} />,
  lamp: (p) => <Icon {...p} d={<><path d="M9 2h6l3 7H6zM12 9v9M8 21h8" /></>} />,
  rug: (p) => <Icon {...p} d={<><rect x="3" y="6" width="18" height="12" rx="1" /><path d="M3 9h18M3 15h18M7 6v12M17 6v12" /></>} />,
  plan: (p) => <Icon {...p} d={<><rect x="3" y="3" width="18" height="18" rx="1.5" /><path d="M3 14h7V3M10 14v7M14 3v6h7" /></>} />,
  spinner: (p) => <Icon {...p} d="M12 3a9 9 0 1 0 9 9" />,
};

/* ---------- Картинка с striped-плейсхолдером и fallback ---------- */
function Img({ src, alt, label, style, className, radius, priority }) {
  const [err, setErr] = useState(false);
  const base = { display: "block", width: "100%", height: "100%", objectFit: "cover", borderRadius: radius, ...style };
  if (err || !src) {
    return <div className={"ph " + (className || "")} style={{ ...base, objectFit: undefined }}>{label || "изображение"}</div>;
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
    const data = window.AIVibeLottie && window.AIVibeLottie[name];
    if (!data) return;                                   // нет ассета → остаётся fallback
    const meta = (window.AIVibeLottieMeta && window.AIVibeLottieMeta[name]) || {};
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
  const fromRef = useRef(target);
  const rafRef = useRef(null);
  useEffect(() => {
    if (!motionOK()) { fromRef.current = target; setShown(target); return; }
    const from = fromRef.current;
    if (from === target) return;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(from + (target - from) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
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
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
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
        <button className="btn btn-primary" style={{ padding: "12px 22px", flex: "none" }} onClick={() => go && go("auth")}>
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
  const [closing, setClosing] = useState(false);
  if (idRef.current == null) idRef.current = ++modalIdSeq;
  // вход анимирован (pop/fadeIn), выход — нет, была асимметрия с toast; тут закрываем сами
  // (Esc/клик по фону), затем зовём реальный onClose — кнопки внутри контента закрывают как раньше
  const requestClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (!motionOK()) { onClose(); return; }
    setClosing(true);
    setTimeout(onClose, 170);
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

/* шапка оверлея проекта/сметы: назад + крошки + заголовок + бюджет-чип/правый слот.
   Не PageHead — это имя занято шапкой раздела админки (admin.jsx). */
function OverlayHead({ onBack, crumbs, title, sub, budget, right }) {
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
   cabinet-views.jsx / library-editor.jsx / norms-editor.jsx /
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

/* дата+время треда («08.07 14:32») — короче ISO, читаемо в переписке клиент↔студия */
const fmtCommentAt = (iso) => {
  try { return new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
  catch (e) { return ""; }
};
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
      <div>{comment.text}</div>
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
    <Comp className="status-pill" onClick={onClick} title={title} style={{ background: t.bg, color: t.fg, borderColor: t.bd }}>
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
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-12)", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 9 }}>
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

/* пустое состояние: полное (первый запуск — крупная иконка + заголовок + CTA)
   или компактное (после фильтра/поиска — маленькая иконка + строка текста) */
function EmptyState({ icon, title, text, action, compact }) {
  const Ico = icon ? I[icon] : null;
  if (compact) {
    return (
      <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: 40, textAlign: "center", color: "var(--muted)" }}>
        {Ico && <Ico size={26} style={{ color: "var(--faint)" }} />}
        {text && <div style={{ marginTop: 10, fontSize: "var(--fs-14)" }}>{text}</div>}
        {action}
      </div>
    );
  }
  return (
    <div className="glass" style={{ borderRadius: "var(--r-xl)", padding: "52px 32px", textAlign: "center" }}>
      {Ico && <span style={{ width: 58, height: 58, borderRadius: 17, background: "var(--surface-2)", color: "var(--accent)", display: "grid", placeItems: "center", margin: "0 auto 18px" }}><Ico size={27} /></span>}
      {title && <h3 className="display" style={{ fontSize: "var(--fs-21)" }}>{title}</h3>}
      {text && <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", marginTop: 8, maxWidth: 440, marginInline: "auto", lineHeight: 1.6 }}>{text}</p>}
      {action}
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
  const big = val.length > 9 ? 22 : (val.length > 7 ? 26 : 30);
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
          {source && <span style={{ fontSize: "var(--fs-11)", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: accent || "var(--faint)", whiteSpace: "nowrap", flex: "none" }}>{source}</span>}
        </div>
      )}
      {children}
    </div>
  );
}
function ChartSkel({ h = 150 }) { return <div className="skel" style={{ height: h, borderRadius: 12 }} />; }

/* ============================================================
   AIVibeLibs — ленивые тяжёлые библиотеки (не грузим на промо):
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
window.AIVibeLibs = {
  // pdfmake + шрифтовой vfs: npm-чанки Vite (AIVibeLoad, vendor-globals.js);
  // CDN — фолбэк для окружений без сборки (standalone-прототипы)
  pdf: () => window.pdfMake && window.pdfMake.vfs
    ? Promise.resolve()
    : window.AIVibeLoad
      ? AIVibeLoad.pdf()
      : loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/pdfmake.min.js")
          .then(() => loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/vfs_fonts.js")),
  xlsx: () => window.XLSX
    ? Promise.resolve()
    : window.AIVibeLoad
      ? AIVibeLoad.xlsx()
      : loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"),
};
/* обёртка: тост «готовим…» только если реально грузим.
   Сбой сети и сбой самого экспорта — разные ошибки с разными текстами (и логом). */
function withLib(kind, run) {
  const label = kind === "pdf" ? "PDF" : "Excel";
  const loaded = kind === "pdf" ? (window.pdfMake && window.pdfMake.vfs) : window.XLSX;
  if (!loaded) toast("Готовим модуль " + label + "…", "info", 1800);
  return AIVibeLibs[kind]().then(
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
  RS_ROW, PriceAgeChip, fmtCommentAt, CommentBubble, StatusPill, SearchField, PageHead, EmptyState, KpiCard, ChartCard, ChartSkel,
});
