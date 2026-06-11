import type { PerQuestionResult } from '../../server/types';

function scoreTone(score: number): string {
  if (score >= 7) return 'qresult__score--good';
  if (score >= 4) return 'qresult__score--mid';
  return 'qresult__score--low';
}

interface QuestionResultCardProps {
  index: number;
  result: PerQuestionResult;
}

export function QuestionResultCard({ index, result }: QuestionResultCardProps) {
  return (
    <article className="card qresult anim-in" style={{ animationDelay: `${120 + index * 60}ms` }}>
      <header className="row row--between">
        <span className="t-label">Question {index + 1}</span>
        <span className={`qresult__score ${scoreTone(result.score)}`}>{result.score}/10</span>
      </header>
      <h3 className="t-title" style={{ fontSize: '1.125rem' }}>
        {result.question}
      </h3>
      <p className="t-small t-muted">{result.answerSummary}</p>
      <p className="t-secondary">{result.feedback}</p>
      <div className="qresult__improve">
        <strong>How to improve:</strong> {result.howToImprove}
      </div>
    </article>
  );
}
