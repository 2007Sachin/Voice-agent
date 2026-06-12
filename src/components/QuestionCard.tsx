interface QuestionCardProps {
  index: number;
  total: number;
  focus: string;
  question: string;
}

/**
 * The current question. Parent keys this by question index so it
 * re-mounts and replays its fade+slide entrance on every change.
 */
export function QuestionCard({ index, total, focus, question }: QuestionCardProps) {
  return (
    <article className="question-card">
      <span className="t-label">
        Question {index + 1} of {total} · {focus}
      </span>
      <h1 className="t-display">{question}</h1>
    </article>
  );
}
