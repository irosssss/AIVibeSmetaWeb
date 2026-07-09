/* ============================================================
   Design Ledger — СТИЛЬ-КВИЗ (онбординг)
   Несколько визуальных вопросов → AI рекомендует направление.
   Паттерн style-quiz из Modsy / Havenly: набор баллов по стилям,
   затем показ победителя с палитрой и CTA.
   ============================================================ */
const { useState: useQ } = React;

/* направления, между которыми распределяются баллы */
const QUIZ_STYLES = {
  deco:   { name: "Neo Deco",          mood: "Геометрия, латунь, винные тона",  palette: ["#7E2B3F", "#C79A4B", "#2C2A33", "#E8DFD3"], desc: "Выразительно и нарядно: рифление, латунь, глубокие оттенки." },
  warm:   { name: "Тёплый минимализм", mood: "Лён, тёплое дерево, букле",        palette: ["#B07A52", "#D8C5B0", "#8A8170", "#EFE7DB"], desc: "Спокойно и уютно: мягкие текстуры и натуральные тона." },
  japandi:{ name: "Japandi",           mood: "Дуб, графит, ротанг",              palette: ["#B79B82", "#3A3D3A", "#D9D2C7", "#6E7F6A"], desc: "Сдержанная гармония японского и скандинавского." },
  scandi: { name: "Сканди",            mood: "Светлый дуб, хлопок, мята",         palette: ["#CDB79A", "#E9E3D8", "#9BB3A3", "#6E6256"], desc: "Светло и функционально: воздух, дерево, мягкий текстиль." },
  indust: { name: "Индустриальный",    mood: "Металл, бетон, кожа",              palette: ["#2B2B2E", "#7A4B2E", "#9A9A93", "#D6CFC4"], desc: "Характерно и брутально: открытый металл и дерево." },
  midmod: { name: "Mid-century",       mood: "Орех, горчица, олива",             palette: ["#7A5A3A", "#C29B3B", "#5E6B4E", "#E5DCCB"], desc: "Тёплое дерево, графичные ножки, ретро-характер." },
};

/* вопросы. score — сколько баллов добавляет вариант каждому стилю */
const QUIZ = [
  {
    key: "room", q: "Какую комнату оформляем?", sub: "Подберём подходящий сценарий и мебель",
    type: "room",
    options: [
      { v: "Гостиную", icon: "sofa" },
      { v: "Спальню", icon: "cube" },
      { v: "Кухню-столовую", icon: "grid" },
      { v: "Кабинет", icon: "ruler" },
    ],
  },
  {
    key: "mood", q: "Какая атмосфера ближе?", sub: "Выберите палитру, которая откликается",
    type: "palette",
    options: [
      { v: "Нарядная и глубокая", score: { deco: 3, midmod: 1 }, style: "deco" },
      { v: "Тёплая и уютная", score: { warm: 3, scandi: 1 }, style: "warm" },
      { v: "Спокойная и собранная", score: { japandi: 3, scandi: 1 }, style: "japandi" },
      { v: "Светлая и лёгкая", score: { scandi: 3, warm: 1 }, style: "scandi" },
      { v: "Брутальная, с характером", score: { indust: 3, midmod: 1 }, style: "indust" },
      { v: "Ретро и тёплая", score: { midmod: 3, deco: 1 }, style: "midmod" },
    ],
  },
  {
    key: "material", q: "Что важнее в материалах?", sub: "AI подберёт фактуры под ваш вкус",
    type: "chips",
    options: [
      { v: "Натуральное дерево", score: { scandi: 2, japandi: 2, warm: 1 } },
      { v: "Металл и бетон", score: { indust: 3, deco: 1 } },
      { v: "Бархат и латунь", score: { deco: 3, midmod: 1 } },
      { v: "Лён и хлопок", score: { warm: 2, scandi: 2 } },
      { v: "Орех и тик", score: { midmod: 3 } },
    ],
  },
  {
    key: "vibe", q: "Сколько деталей и декора?", sub: "От лаконичности до насыщенности",
    type: "chips",
    options: [
      { v: "Минимум, только нужное", score: { japandi: 2, scandi: 2 } },
      { v: "Золотая середина", score: { warm: 2, midmod: 1 } },
      { v: "Люблю акценты и декор", score: { deco: 3 } },
    ],
  },
];

const ROOM_ICON = { "Гостиную": "sofa", "Спальню": "cube", "Кухню-столовую": "grid", "Кабинет": "ruler" };

function StyleQuiz({ onClose, onDone }) {
  const [step, setStep] = useQ(0);          // 0..QUIZ.length-1, затем результат
  const [ans, setAns] = useQ({});           // key -> выбранный вариант (для chips — массив)
  const [budget, setBudget] = useQ(420000);
  const total = QUIZ.length + 1;            // +1 шаг бюджета
  const isBudget = step === QUIZ.length;
  const isResult = step === total;

  const advT = React.useRef(null);   // дебаунс авто-перехода: быстрые клики меняют выбор, переход один
  const pick = (q, opt) => {
    if (q.type === "chips") {
      setAns((a) => {
        const cur = a[q.key] || [];
        const has = cur.includes(opt.v);
        return { ...a, [q.key]: has ? cur.filter((x) => x !== opt.v) : [...cur, opt.v] };
      });
    } else {
      setAns((a) => ({ ...a, [q.key]: opt.v }));
      // без дебаунса и клампа два быстрых клика = два таймера → step уезжал за total и ронял рендер
      clearTimeout(advT.current);
      advT.current = setTimeout(() => setStep((s) => Math.min(s + 1, QUIZ.length)), 220);   // авто-переход для одиночного выбора
    }
  };

  // подсчёт баллов
  const result = (() => {
    const sc = {};
    Object.keys(QUIZ_STYLES).forEach((k) => (sc[k] = 0));
    QUIZ.forEach((q) => {
      const a = ans[q.key];
      if (!a) return;
      const vals = Array.isArray(a) ? a : [a];
      vals.forEach((v) => {
        const opt = q.options.find((o) => o.v === v);
        if (opt && opt.score) Object.entries(opt.score).forEach(([k, n]) => (sc[k] += n));
      });
    });
    const top = Object.entries(sc).sort((a, b) => b[1] - a[1]);
    const winner = top[0][1] > 0 ? top[0][0] : "warm";
    const runner = top[1][0];
    return { winner, runner, sc };
  })();

  const curQ = !isBudget && !isResult ? QUIZ[step] : null;
  const answered = curQ ? (curQ.type === "chips" ? (ans[curQ.key] || []).length > 0 : !!ans[curQ.key]) : true;
  const progress = isResult ? 100 : Math.round((step / total) * 100);

  const next = () => setStep((s) => Math.min(s + 1, total));   // двойной клик «Показать результат» не уводит за результат
  const back = () => setStep((s) => Math.max(0, s - 1));

  // Modal ловит фокус только на монтировании — а квиз меняет содержимое шагов
  // внутри одной живущей модалки (авто-переход через 220мс уносит вместе с собой
  // сфокусированную кнопку варианта). Перефокусируем первый интерактив шага сами.
  const bodyRef = React.useRef(null);
  React.useEffect(() => {
    const body = bodyRef.current;
    const first = body && body.querySelector("button, input, [tabindex]:not([tabindex='-1'])");
    if (first) first.focus();
  }, [step]);

  return (
    <Modal onClose={onClose} label="Стиль-квиз" className="quiz-card">
        {/* шапка с прогрессом */}
        <div style={{ padding: "20px 26px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "var(--fs-12)", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--accent)" }}>
              <I.spark size={15} />Стиль-квиз
            </span>
            <span style={{ marginLeft: "auto", fontSize: "var(--fs-12)", color: "var(--faint)" }}>{isResult ? "Готово" : `Шаг ${step + 1} из ${total}`}</span>
            <button className="icon-btn sm" onClick={onClose} aria-label="Закрыть"><I.close size={16} /></button>
          </div>
          <div style={{ height: 5, borderRadius: 99, background: "var(--glass-2)", overflow: "hidden", marginTop: 14 }}>
            <div style={{ height: "100%", width: progress + "%", background: "var(--accent)", borderRadius: 99, transition: "width var(--dur-base) var(--ease-pop)" }} />
          </div>
        </div>

        <div className="quiz-body" ref={bodyRef}>
          {curQ && <QuizStep q={curQ} ans={ans[curQ.key]} onPick={pick} />}
          {isBudget && <BudgetStep budget={budget} setBudget={setBudget} />}
          {isResult && <QuizResult result={result} budget={budget} room={ans.room} />}
        </div>

        {/* футер-навигация */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 26px", borderTop: "1px solid var(--hairline)" }}>
          {!isResult && step > 0 && <button className="btn btn-ghost" onClick={back}><I.arrow size={15} style={{ transform: "rotate(180deg)" }} />Назад</button>}
          <div style={{ flex: 1 }} />
          {isResult ? (
            <React.Fragment>
              <button className="btn btn-ghost" onClick={onClose}>Закрыть</button>
              <button className="btn btn-primary" onClick={() => onDone && onDone(result.winner, { budget, room: ans.room })}><I.arrow size={16} />Создать проект в этом стиле</button>
            </React.Fragment>
          ) : isBudget ? (
            <button className="btn btn-primary" onClick={next}>Показать результат<I.arrow size={16} /></button>
          ) : (
            curQ && curQ.type === "chips" && <button className="btn btn-primary" onClick={next} disabled={!answered} style={{ opacity: answered ? 1 : 0.5, pointerEvents: answered ? "auto" : "none" }}>Далее<I.arrow size={16} /></button>
          )}
        </div>
    </Modal>
  );
}

/* шаг-вопрос */
function QuizStep({ q, ans, onPick }) {
  const selected = (v) => (Array.isArray(ans) ? ans.includes(v) : ans === v);
  return (
    <div>
      <h2 className="display" style={{ fontSize: "var(--fs-24)", letterSpacing: "-0.02em" }}>{q.q}</h2>
      <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", marginTop: 6, marginBottom: 22 }}>{q.sub}{q.type === "chips" && " · можно выбрать несколько"}</p>

      {q.type === "room" && (
        <div className="quiz-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
          {q.options.map((o) => {
            const Ico = I[o.icon] || I.cube;
            const on = selected(o.v);
            return (
              <button key={o.v} className={"quiz-opt" + (on ? " on" : "")} onClick={() => onPick(q, o)} aria-pressed={on}>
                <span style={{ width: 46, height: 46, borderRadius: 13, background: on ? "var(--accent)" : "var(--surface-2)", color: on ? "var(--on-accent)" : "var(--accent)", display: "grid", placeItems: "center", flex: "none", transition: ".18s" }}><Ico size={23} /></span>
                <span style={{ fontWeight: 700, fontSize: "var(--fs-16)" }}>{o.v}</span>
                {on && <span style={{ marginLeft: "auto" }}><I.check size={18} style={{ color: "var(--accent-2)" }} /></span>}
              </button>
            );
          })}
        </div>
      )}

      {q.type === "palette" && (
        <div className="quiz-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
          {q.options.map((o) => {
            const st = QUIZ_STYLES[o.style];
            const on = selected(o.v);
            return (
              <button key={o.v} className={"quiz-pal" + (on ? " on" : "")} onClick={() => onPick(q, o)} aria-pressed={on}>
                <div style={{ display: "flex", height: 56, borderRadius: 10, overflow: "hidden" }}>
                  {st.palette.map((c, i) => <span key={i} style={{ flex: 1, background: c }} />)}
                </div>
                <div style={{ fontWeight: 700, fontSize: "var(--fs-14)", marginTop: 11 }}>{o.v}</div>
                <div style={{ color: "var(--faint)", fontSize: "var(--fs-12)", marginTop: 3 }}>{st.mood}</div>
                {on && <span className="quiz-pal-check"><I.check size={13} /></span>}
              </button>
            );
          })}
        </div>
      )}

      {q.type === "chips" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {q.options.map((o) => {
            const on = selected(o.v);
            return (
              <button key={o.v} onClick={() => onPick(q, o)} aria-pressed={on}
                style={{ padding: "11px 17px", borderRadius: 99, fontSize: "var(--fs-14)", fontWeight: 700, border: "1.5px solid " + (on ? "var(--accent-2)" : "var(--hairline)"),
                  background: on ? "rgba(94,107,91,.14)" : "var(--glass-2)", color: on ? "var(--text)" : "var(--muted)", transition: ".16s", display: "inline-flex", alignItems: "center", gap: 8 }}>
                {on && <I.check size={15} style={{ color: "var(--accent-2)" }} />}{o.v}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* шаг бюджета */
function BudgetStep({ budget, setBudget }) {
  const fmtRange = (n) => new Intl.NumberFormat("ru-RU").format(n) + " ₽";
  return (
    <div>
      <h2 className="display" style={{ fontSize: "var(--fs-24)", letterSpacing: "-0.02em" }}>Какой бюджет на комнату?</h2>
      <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", marginTop: 6, marginBottom: 28 }}>Design Ledger соберёт смету с артикулами и ценами в этих рамках</p>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <span className="mono" style={{ fontSize: "var(--fs-42)", fontWeight: 500, letterSpacing: "-0.01em" }}>{fmtMoney(budget)}</span>
      </div>
      <input type="range" min="120000" max="1200000" step="20000" value={budget} onChange={(e) => setBudget(+e.target.value)} className="quiz-range" />
      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--faint)", fontSize: "var(--fs-12)", marginTop: 10 }}>
        <span>{fmtRange(120000)}</span><span>{fmtRange(1200000)}</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 22, flexWrap: "wrap", justifyContent: "center" }}>
        {[250000, 420000, 650000, 900000].map((b) => (
          <button key={b} onClick={() => setBudget(b)} style={{ padding: "8px 15px", borderRadius: 99, fontSize: "var(--fs-13)", fontWeight: 700, border: "1px solid " + (budget === b ? "var(--accent)" : "var(--hairline)"), background: budget === b ? "var(--accent)" : "var(--glass-2)", color: budget === b ? "var(--on-accent)" : "var(--muted)" }}>{fmtRange(b)}</button>
        ))}
      </div>
    </div>
  );
}

/* экран результата */
function QuizResult({ result, budget, room }) {
  const st = QUIZ_STYLES[result.winner];
  const runner = QUIZ_STYLES[result.runner];
  return (
    <div className="reveal in" ref={useReveal()}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: "var(--fs-13)", fontWeight: 700, color: "var(--accent-2)", padding: "6px 13px", borderRadius: 99, background: "rgba(94,107,91,.12)", border: "1px solid rgba(94,107,91,.28)" }}>
          <I.spark size={14} />Ваш стиль по версии AI
        </span>
      </div>

      <div style={{ borderRadius: "var(--r-lg)", overflow: "hidden", border: "1px solid var(--hairline)" }}>
        <div style={{ display: "flex", height: 84 }}>
          {st.palette.map((c, i) => <span key={i} style={{ flex: 1, background: c }} />)}
        </div>
        <div style={{ padding: "20px 22px" }}>
          <h2 className="display" style={{ fontSize: "var(--fs-30)", letterSpacing: "-0.02em" }}>{st.name}</h2>
          <p style={{ color: "var(--muted)", fontSize: "var(--fs-14)", lineHeight: 1.55, marginTop: 8 }}>{st.desc}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--hairline)" }}>
            <Stat label="Комната" value={room || "—"} />
            <Stat label="Бюджет" value={fmtMoney(budget)} />
            <Stat label="Похожий стиль" value={runner.name} />
          </div>
        </div>
      </div>

      <p style={{ color: "var(--faint)", fontSize: "var(--fs-13)", textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
        Откроем готовый проект в стиле «{st.name}» — с расстановкой по нормам и сметой под ваш бюджет.
      </p>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ color: "var(--faint)", fontSize: "var(--fs-12)", marginBottom: 3 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: "var(--fs-15)" }}>{value}</div>
    </div>
  );
}

window.StyleQuiz = StyleQuiz;
