import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * ChessReportCard
 * ----------------
 * A premium "report card" dashboard for a chess coaching app.
 * Reads a report from localStorage (key: "chessCoach_reportCard") and falls
 * back to rich, fully-written demo data so it looks complete immediately.
 *
 * Drop this file into any React app (Vite/CRA/Next "use client") — it has
 * zero external dependencies beyond React itself and ships its own CSS.
 *
 * To wire up real data, write JSON matching DEFAULT_REPORT's shape to:
 *   localStorage.setItem("chessCoach_reportCard", JSON.stringify(report))
 */

// ---------------------------------------------------------------------------
// Demo / fallback data — written out in full so the component is beautiful
// on first render, with no setup required.
// ---------------------------------------------------------------------------
const DEFAULT_REPORT = {
  player: {
    name: "Alex Morgan",
    initials: "AM",
    rankTitle: "Class C \u00b7 Rising",
    currentRating: 1487,
  },
  ratingHistory: [
    { game: 1, elo: 1392, result: "loss" },
    { game: 2, elo: 1405, result: "win" },
    { game: 3, elo: 1398, result: "loss" },
    { game: 4, elo: 1421, result: "win" },
    { game: 5, elo: 1440, result: "win" },
    { game: 6, elo: 1435, result: "loss" },
    { game: 7, elo: 1458, result: "win" },
    { game: 8, elo: 1470, result: "win" },
    { game: 9, elo: 1465, result: "loss" },
    { game: 10, elo: 1487, result: "win" },
  ],
  level: {
    current: 6,
    next: 7,
    label: "Tactical Apprentice",
    nextLabel: "Positional Strategist",
    xp: 240,
    xpNeeded: 400,
  },
  badges: [
    {
      id: "zero-blunders",
      glyph: "\u265B", // black queen
      title: "Zero Blunders",
      desc: "No blunders across your last 5 rated games",
      earned: "2 days ago",
    },
    {
      id: "endgame-ace",
      glyph: "\u265A", // black king
      title: "Endgame Ace",
      desc: "92% conversion rate in won endgames",
      earned: "5 days ago",
    },
    {
      id: "five-streak",
      glyph: "\u265E", // black knight
      title: "5-Game Streak",
      desc: "Five consecutive wins without a loss",
      earned: "1 week ago",
    },
    {
      id: "opening-scholar",
      glyph: "\u265D", // black bishop
      title: "Opening Scholar",
      desc: "Studied 12 opening lines in depth this month",
      earned: "1 week ago",
    },
  ],
};

// ---------------------------------------------------------------------------
// Data loading — swap point for real localStorage data
// ---------------------------------------------------------------------------
function loadReport() {
  try {
    const raw = window.localStorage.getItem("chessCoach_reportCard");
    if (!raw) return DEFAULT_REPORT;
    const parsed = JSON.parse(raw);
    // Shallow-merge so a partially-populated record still renders fully.
    return {
      ...DEFAULT_REPORT,
      ...parsed,
      player: { ...DEFAULT_REPORT.player, ...(parsed.player || {}) },
      level: { ...DEFAULT_REPORT.level, ...(parsed.level || {}) },
      ratingHistory:
        parsed.ratingHistory && parsed.ratingHistory.length
          ? parsed.ratingHistory
          : DEFAULT_REPORT.ratingHistory,
      badges:
        parsed.badges && parsed.badges.length
          ? parsed.badges
          : DEFAULT_REPORT.badges,
    };
  } catch (err) {
    return DEFAULT_REPORT;
  }
}

// ---------------------------------------------------------------------------
// Elo trend graph — hand-annotated scoresheet aesthetic
// ---------------------------------------------------------------------------
function EloGraph({ history }: { history: any[] }) {
  const pathRef = useRef<SVGPathElement>(null);
  const [drawn, setDrawn] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const W = 640;
  const H = 220;
  const PAD_X = 28;
  const PAD_TOP = 24;
  const PAD_BOTTOM = 36;

  const values = history.map((h) => h.elo);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);

  const points = useMemo(() => {
    return history.map((h, i) => {
      const x =
        PAD_X + (i / (history.length - 1)) * (W - PAD_X * 2);
      const y =
        H -
        PAD_BOTTOM -
        ((h.elo - min) / span) * (H - PAD_TOP - PAD_BOTTOM);
      return { x, y, ...h };
    });
  }, [history, min, span]);

  const linePath = useMemo(() => {
    return points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(" ");
  }, [points]);

  const areaPath = useMemo(() => {
    if (!points.length) return "";
    const first = points[0];
    const last = points[points.length - 1];
    return `${linePath} L ${last.x.toFixed(2)} ${H - PAD_BOTTOM} L ${first.x.toFixed(
      2
    )} ${H - PAD_BOTTOM} Z`;
  }, [linePath, points]);

  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 120);
    return () => clearTimeout(t);
  }, []);

  const pathLength = 1400; // generous constant; real length not required for the effect

  return (
    <div className="crc-graph-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="crc-graph-svg"
        role="img"
        aria-label="Estimated Elo over the last 10 games"
      >
        <defs>
          <linearGradient id="crc-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--crc-sage)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--crc-sage)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="crc-line-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--crc-sage-dim)" />
            <stop offset="100%" stopColor="var(--crc-gold)" />
          </linearGradient>
        </defs>

        {/* faint algebraic grid, evoking a scoresheet */}
        {points.map((p, i) => (
          <line
            key={`grid-${i}`}
            x1={p.x}
            y1={PAD_TOP}
            x2={p.x}
            y2={H - PAD_BOTTOM}
            className="crc-grid-line"
          />
        ))}

        <path d={areaPath} fill="url(#crc-area-fill)" className="crc-area" />

        <path
          ref={pathRef}
          d={linePath}
          className={`crc-line ${drawn ? "crc-line--drawn" : ""}`}
          style={{
            strokeDasharray: pathLength,
            strokeDashoffset: drawn ? 0 : pathLength,
          }}
        />

        {points.map((p, i) => (
          <g
            key={p.game}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
            className="crc-point-group"
          >
            <circle cx={p.x} cy={p.y} r="10" fill="transparent" />
            <circle
              cx={p.x}
              cy={p.y}
              r={hoverIdx === i ? 5.5 : 3.5}
              className={`crc-point ${
                p.result === "win" ? "crc-point--win" : "crc-point--loss"
              }`}
              style={{ transitionDelay: drawn ? `${i * 40}ms` : "0ms" }}
            />
            <text x={p.x} y={H - 12} className="crc-axis-label">
              {p.game}
            </text>
          </g>
        ))}

        {hoverIdx !== null && (
          <g>
            <line
              x1={points[hoverIdx].x}
              y1={PAD_TOP}
              x2={points[hoverIdx].x}
              y2={H - PAD_BOTTOM}
              className="crc-hover-line"
            />
          </g>
        )}
      </svg>

      {hoverIdx !== null && (
        <div
          className="crc-tooltip"
          style={{
            left: `${(points[hoverIdx].x / W) * 100}%`,
            top: `${(points[hoverIdx].y / H) * 100}%`,
          }}
        >
          <span className="crc-tooltip-elo">{points[hoverIdx].elo}</span>
          <span
            className={`crc-tooltip-result ${
              points[hoverIdx].result === "win" ? "is-win" : "is-loss"
            }`}
          >
            {points[hoverIdx].result === "win" ? "Win" : "Loss"} · Game{" "}
            {points[hoverIdx].game}
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Level progress bar
// ---------------------------------------------------------------------------
function LevelProgress({ level }: { level: any }) {
  const [fill, setFill] = useState(0);
  const pct = Math.min(100, Math.round((level.xp / level.xpNeeded) * 100));

  useEffect(() => {
    const t = setTimeout(() => setFill(pct), 200);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className="crc-level">
      <div className="crc-level-labels">
        <div className="crc-level-badge">
          <span className="crc-level-num">{level.current}</span>
          <span className="crc-level-name">{level.label}</span>
        </div>
        <div className="crc-level-badge crc-level-badge--next">
          <span className="crc-level-name">{level.nextLabel}</span>
          <span className="crc-level-num">{level.next}</span>
        </div>
      </div>

      <div className="crc-progress-track">
        <div
          className="crc-progress-fill"
          style={{ width: `${fill}%` }}
        >
          <span className="crc-progress-glow" />
        </div>
        <div className="crc-progress-marker" style={{ left: `${fill}%` }} />
      </div>

      <div className="crc-progress-meta">
        <span>
          {level.xp} / {level.xpNeeded} XP
        </span>
        <span>{level.xpNeeded - level.xp} XP to Level {level.next}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------
function BadgeMedallion({ badge, index }: { badge: any; index: number; key?: any }) {
  return (
    <div
      className="crc-badge"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className="crc-badge-medallion">
        <span className="crc-badge-glyph">{badge.glyph}</span>
      </div>
      <div className="crc-badge-copy">
        <h4>{badge.title}</h4>
        <p>{badge.desc}</p>
        <span className="crc-badge-earned">{badge.earned}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------
export function ChessReportCard() {
  const [report, setReport] = useState(DEFAULT_REPORT);

  useEffect(() => {
    setReport(loadReport());

    // Listen for a custom event or storage event to auto-refresh real-time changes
    const handleUpdate = () => {
      setReport(loadReport());
    };
    window.addEventListener("reportCardUpdated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("reportCardUpdated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const first = report.ratingHistory[0]?.elo ?? 0;
  const last =
    report.ratingHistory[report.ratingHistory.length - 1]?.elo ?? 0;
  const delta = last - first;

  return (
    <div className="crc-root">
      <style>{STYLES}</style>

      <div className="crc-card">
        {/* Header */}
        <header className="crc-header">
          <div className="crc-player">
            <div className="crc-avatar">{report.player.initials}</div>
            <div>
              <h1>{report.player.name}</h1>
              <p className="crc-rank">{report.player.rankTitle}</p>
            </div>
          </div>
          <div className="crc-rating">
            <span className="crc-rating-num">
              {report.player.currentRating}
            </span>
            <span
              className={`crc-rating-delta ${
                delta >= 0 ? "is-up" : "is-down"
              }`}
            >
              {delta >= 0 ? "\u2191" : "\u2193"} {Math.abs(delta)} in 10 games
            </span>
          </div>
        </header>

        <div className="crc-divider" />

        {/* Elo trend */}
        <section className="crc-section">
          <div className="crc-section-head">
            <p className="crc-eyebrow">Elo Trend</p>
            <h2>Last 10 Games</h2>
          </div>
          <EloGraph history={report.ratingHistory} />
        </section>

        <div className="crc-divider" />

        {/* Level progress */}
        <section className="crc-section">
          <div className="crc-section-head">
            <p className="crc-eyebrow">Progression</p>
            <h2>Current Level</h2>
          </div>
          <LevelProgress level={report.level} />
        </section>

        <div className="crc-divider" />

        {/* Badges */}
        <section className="crc-section">
          <div className="crc-section-head">
            <p className="crc-eyebrow">Achievements</p>
            <h2>Active Badges</h2>
          </div>
          <div className="crc-badge-grid">
            {report.badges.map((badge, i) => (
              <BadgeMedallion badge={badge} index={i} key={badge.id} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles — self-contained, no build-step CSS dependency required
// ---------------------------------------------------------------------------
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');

.crc-root {
  --crc-bg: #15130f;
  --crc-panel: #1c1914;
  --crc-panel-2: #211d17;
  --crc-line: #322c22;
  --crc-ivory: #ede6d6;
  --crc-muted: #a79c89;
  --crc-gold: #c9a25d;
  --crc-gold-dim: #8f764a;
  --crc-sage: #7c9068;
  --crc-sage-dim: #56684a;
  --crc-loss: #a85c3b;

  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: radial-gradient(120% 140% at 15% 0%, #201b14 0%, var(--crc-bg) 55%);
  color: var(--crc-ivory);
  padding: 32px 16px;
  min-height: 100%;
  display: flex;
  justify-content: center;
  border-radius: 20px;
}

.crc-card {
  width: 100%;
  max-width: 720px;
  background: linear-gradient(180deg, var(--crc-panel) 0%, var(--crc-panel-2) 100%);
  border: 1px solid var(--crc-line);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 30px 80px -30px rgba(0,0,0,0.65), 0 1px 0 rgba(255,255,255,0.03) inset;
}

.crc-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--crc-line) 15%, var(--crc-line) 85%, transparent);
  margin: 20px 0;
}

/* Header */
.crc-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.crc-player {
  display: flex;
  align-items: center;
  gap: 16px;
}

.crc-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 20px;
  color: var(--crc-bg);
  background: linear-gradient(135deg, var(--crc-gold) 0%, #e3c98a 100%);
  flex-shrink: 0;
}

.crc-player h1 {
  font-family: 'Fraunces', serif;
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 4px;
  letter-spacing: 0.01em;
  color: var(--crc-ivory);
}

.crc-rank {
  margin: 0;
  font-size: 13px;
  color: var(--crc-muted);
  letter-spacing: 0.02em;
}

.crc-rating {
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.crc-rating-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 32px;
  font-weight: 600;
  line-height: 1;
  color: var(--crc-ivory);
}

.crc-rating-delta {
  margin-top: 6px;
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  padding: 3px 8px;
  border-radius: 999px;
  letter-spacing: 0.01em;
}
.crc-rating-delta.is-up {
  color: #bcd1a8;
  background: rgba(124, 144, 104, 0.14);
}
.crc-rating-delta.is-down {
  color: #d9a48c;
  background: rgba(168, 92, 59, 0.14);
}

/* Section headers */
.crc-section-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}

.crc-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--crc-gold-dim);
  margin: 0;
}

.crc-section-head h2 {
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 16px;
  margin: 0;
  color: var(--crc-ivory);
}

/* Graph */
.crc-graph-wrap {
  position: relative;
  width: 100%;
}

.crc-graph-svg {
  width: 100%;
  height: auto;
  overflow: visible;
}

.crc-grid-line {
  stroke: var(--crc-line);
  stroke-width: 1;
  opacity: 0.55;
}

.crc-area {
  opacity: 0.9;
}

.crc-line {
  fill: none;
  stroke: url(#crc-line-stroke);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.crc-point {
  fill: var(--crc-bg);
  stroke-width: 2.5;
  transition: r 0.2s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: center;
}
.crc-point--win { stroke: var(--crc-sage); }
.crc-point--loss { stroke: var(--crc-loss); }

.crc-point-group { cursor: pointer; }

.crc-axis-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  fill: var(--crc-muted);
  text-anchor: middle;
}

.crc-hover-line {
  stroke: var(--crc-gold-dim);
  stroke-width: 1;
  stroke-dasharray: 3 3;
}

.crc-tooltip {
  position: absolute;
  transform: translate(-50%, -130%);
  background: #0f0d0a;
  border: 1px solid var(--crc-line);
  border-radius: 10px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  pointer-events: none;
  box-shadow: 0 12px 30px -8px rgba(0,0,0,0.6);
  white-space: nowrap;
  z-index: 5;
}

.crc-tooltip-elo {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  font-size: 14px;
  color: var(--crc-ivory);
}

.crc-tooltip-result {
  font-size: 10px;
  letter-spacing: 0.02em;
}
.crc-tooltip-result.is-win { color: #a9c193; }
.crc-tooltip-result.is-loss { color: #d9a48c; }

/* Level progress */
.crc-level-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.crc-level-badge {
  display: flex;
  align-items: center;
  gap: 8px;
}
.crc-level-badge--next {
  flex-direction: row-reverse;
  opacity: 0.6;
}

.crc-level-num {
  font-family: 'Fraunces', serif;
  font-weight: 700;
  font-size: 18px;
  color: var(--crc-gold);
}

.crc-level-name {
  font-size: 12px;
  color: var(--crc-muted);
  letter-spacing: 0.01em;
}

.crc-progress-track {
  position: relative;
  height: 10px;
  border-radius: 999px;
  background: #0f0d0a;
  border: 1px solid var(--crc-line);
  overflow: visible;
}

.crc-progress-fill {
  position: relative;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--crc-sage-dim) 0%, var(--crc-gold) 100%);
  transition: width 1.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.crc-progress-glow {
  position: absolute;
  right: -2px;
  top: 50%;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  transform: translate(50%, -50%);
  background: var(--crc-gold);
  box-shadow: 0 0 14px 3px rgba(201, 162, 93, 0.55);
}

.crc-progress-marker {
  position: absolute;
  top: 50%;
  width: 2px;
  height: 18px;
  background: transparent;
  transform: translate(-50%, -50%);
}

.crc-progress-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--crc-muted);
}

/* Badges */
.crc-badge-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

@media (max-width: 520px) {
  .crc-badge-grid { grid-template-columns: 1fr; }
  .crc-card { padding: 16px; }
  .crc-rating-num { font-size: 24px; }
}

.crc-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0));
  border: 1px solid var(--crc-line);
  opacity: 0;
  animation: crc-badge-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  transition: border-color 0.25s ease, transform 0.25s ease;
}

.crc-badge:hover {
  border-color: var(--crc-gold-dim);
  transform: translateY(-2px);
}

@keyframes crc-badge-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.crc-badge-medallion {
  position: relative;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 30% 30%, #2a2419, #14120d 75%);
  border: 1.5px dashed var(--crc-gold-dim);
}

.crc-badge-glyph {
  font-size: 18px;
  color: var(--crc-gold);
}

.crc-badge-copy h4 {
  margin: 0 0 2px;
  font-family: 'Fraunces', serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--crc-ivory);
}

.crc-badge-copy p {
  margin: 0 0 4px;
  font-size: 11px;
  line-height: 1.4;
  color: var(--crc-muted);
}

.crc-badge-earned {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--crc-gold-dim);
  letter-spacing: 0.02em;
}
`;
