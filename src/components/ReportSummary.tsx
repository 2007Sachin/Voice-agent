import type { InterviewReport, InterviewSession } from '../../server/types';
import { MODE_LABELS, READINESS_LABELS } from '../../server/types';

function ScoreRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * (score / 100);
  return (
    <div className="score-ring">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--bg-inset)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
        />
      </svg>
      <div className="score-ring__value">
        <span className="score-ring__number">{score}</span>
        <span className="t-label">/ 100</span>
      </div>
    </div>
  );
}

interface ReportSummaryProps {
  report: InterviewReport;
  session: InterviewSession | null;
}

/** Overall verdict block at the top of the report page. */
export function ReportSummary({ report, session }: ReportSummaryProps) {
  const { overall } = report;
  const date = new Date(report.generatedAt);
  const meta = session
    ? `${MODE_LABELS[session.config.mode]} · ${session.config.topic} · ${session.config.difficulty} level · ${session.questions.length} questions`
    : null;

  return (
    <section className="card card--raised report-hero anim-in" aria-label="Overall result">
      <ScoreRing score={overall.score} />
      <div className="stack" style={{ gap: '0.8rem' }}>
        <div className="row row--wrap">
          <span className={`readiness readiness--${overall.readiness}`}>
            {READINESS_LABELS[overall.readiness]}
          </span>
          {meta && <span className="t-small t-muted">{meta}</span>}
        </div>
        <h1 className="t-title">Performance report</h1>
        <p className="t-secondary">{overall.summary}</p>
        <span className="t-small t-muted">
          Generated {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </section>
  );
}
