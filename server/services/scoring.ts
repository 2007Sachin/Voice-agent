import type {
  AnswerRecord,
  InterviewReport,
  InterviewSession,
  PerQuestionResult,
  ReadinessLevel,
  SwotAnalysis,
} from '../types.js';
import { chatJson, llmAvailable, parseLlmJson } from './groq.js';

/**
 * Post-interview scoring service. Produces an InterviewReport with an
 * overall verdict, a SWOT analysis of the candidate's performance, and
 * per-question feedback. Prefers the LLM; every layer degrades
 * gracefully (per-section) to a deterministic heuristic so the report
 * page always renders something sensible.
 */

export async function generateReport(session: InterviewSession): Promise<InterviewReport> {
  const fallback = heuristicReport(session);
  if (!llmAvailable()) return fallback;

  try {
    const raw = await chatJson(reportSystemPrompt(), reportUserPrompt(session), {
      temperature: 0.25,
      maxTokens: 4000,
    });
    return normalizeReport(parseLlmJson(raw), session);
  } catch (err) {
    console.error('[scoring] report generation failed, using heuristic report:', err);
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/* Prompts                                                             */
/* ------------------------------------------------------------------ */

function reportSystemPrompt(): string {
  return [
    'You are an experienced interview coach writing a post-interview performance report.',
    'Reply with JSON only, exactly this schema:',
    '{',
    '  "overall": { "score": number (0-100), "summary": string (one paragraph), "readiness": "needs-practice" | "developing" | "interview-ready" },',
    '  "swot": {',
    '    "strengths": string[], "weaknesses": string[],',
    '    "opportunities": string[], "threats": string[]',
    '  },',
    '  "perQuestion": [ { "question": string, "answerSummary": string, "score": number (0-10), "feedback": string, "howToImprove": string } ]',
    '}',
    'SWOT rules: 2-4 bullets per section. Every bullet must reference something specific the candidate actually said or failed to cover — quote or paraphrase them; no generic advice.',
    '"opportunities" = areas where small effort gives big improvement and topics to learn next.',
    '"threats" = habits or gaps that could cost them in a real interview (rambling, missing fundamentals, weak examples, bluffing).',
    'perQuestion must cover every question in order. Skipped or empty answers score 0-2 with feedback acknowledging the skip.',
    'Be honest and specific; encouragement is welcome but never at the cost of accuracy.',
  ].join('\n');
}

function reportUserPrompt(session: InterviewSession): string {
  const { config, brief, questions } = session;
  const transcript = questions
    .map((q, i) => {
      const a = answerFor(session, i);
      const answerText = !a || a.skipped || !a.answer.trim()
        ? '(skipped — no answer given)'
        : a.answer.trim();
      const secs = a ? Math.round(a.durationMs / 1000) : 0;
      return `Q${i + 1} [${q.focus}]: ${q.question}\nA${i + 1} (${secs}s): ${answerText}`;
    })
    .join('\n\n');

  return [
    `Interview type: ${config.mode} — topic: ${config.topic} — level: ${config.difficulty}.`,
    `Brief: ${brief.roleSummary}`,
    `Rubric:\n- ${brief.rubric.join('\n- ')}`,
    `Full transcript:\n\n${transcript}`,
    'Write the report JSON now.',
  ].join('\n\n');
}

/* ------------------------------------------------------------------ */
/* Validation / normalization                                          */
/* ------------------------------------------------------------------ */

const READINESS_VALUES: ReadinessLevel[] = ['needs-practice', 'developing', 'interview-ready'];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function asScore(value: unknown, fallback: number, max: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(clamp(n, 0, max));
}

function asText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asBullets(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim())
    .slice(0, 4);
  return items.length > 0 ? items : fallback;
}

function asReadiness(value: unknown, score: number): ReadinessLevel {
  if (typeof value === 'string') {
    const v = value.toLowerCase();
    const exact = READINESS_VALUES.find((r) => r === v);
    if (exact) return exact;
    if (v.includes('ready')) return 'interview-ready';
    if (v.includes('develop')) return 'developing';
    if (v.includes('practice') || v.includes('needs')) return 'needs-practice';
  }
  return readinessFromScore(score);
}

function readinessFromScore(score: number): ReadinessLevel {
  if (score >= 75) return 'interview-ready';
  if (score >= 45) return 'developing';
  return 'needs-practice';
}

/**
 * Coerce whatever the LLM returned into a valid InterviewReport.
 * Any missing or malformed section is replaced by the corresponding
 * section of the deterministic heuristic report — never throws.
 */
export function normalizeReport(parsed: unknown, session: InterviewSession): InterviewReport {
  const fallback = heuristicReport(session);
  if (!parsed || typeof parsed !== 'object') return fallback;
  const raw = parsed as Record<string, unknown>;

  const overallRaw = (raw.overall ?? {}) as Record<string, unknown>;
  const swotRaw = (raw.swot ?? {}) as Record<string, unknown>;
  const perQuestionRaw = Array.isArray(raw.perQuestion) ? raw.perQuestion : [];

  const score = asScore(overallRaw.score, fallback.overall.score, 100);

  const swot: SwotAnalysis = {
    strengths: asBullets(swotRaw.strengths, fallback.swot.strengths),
    weaknesses: asBullets(swotRaw.weaknesses, fallback.swot.weaknesses),
    opportunities: asBullets(swotRaw.opportunities, fallback.swot.opportunities),
    threats: asBullets(swotRaw.threats, fallback.swot.threats),
  };

  const perQuestion: PerQuestionResult[] = session.questions.map((q, i) => {
    const item = (perQuestionRaw[i] ?? {}) as Record<string, unknown>;
    const fb = fallback.perQuestion[i];
    return {
      question: asText(item.question, q.question),
      answerSummary: asText(item.answerSummary, fb.answerSummary),
      score: asScore(item.score, fb.score, 10),
      feedback: asText(item.feedback, fb.feedback),
      howToImprove: asText(item.howToImprove, fb.howToImprove),
    };
  });

  return {
    overall: {
      score,
      summary: asText(overallRaw.summary, fallback.overall.summary),
      readiness: asReadiness(overallRaw.readiness, score),
    },
    swot,
    perQuestion,
    generatedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* Deterministic fallback                                              */
/* ------------------------------------------------------------------ */

function answerFor(session: InterviewSession, index: number): AnswerRecord | undefined {
  return session.answers.find((a) => a.questionIndex === index);
}

function snippet(text: string, words = 10): string {
  const parts = text.trim().split(/\s+/);
  const cut = parts.slice(0, words).join(' ');
  return parts.length > words ? `${cut}…` : cut;
}

function heuristicQuestionScore(answer: AnswerRecord | undefined): number {
  if (!answer || answer.skipped || !answer.answer.trim()) return 0;
  const words = answer.answer.trim().split(/\s+/).length;
  if (words < 10) return 2;
  if (words < 30) return 4;
  if (words < 80) return 6;
  if (words < 200) return 7;
  return 5; // very long answers usually ramble
}

/**
 * Report built without an LLM: scores from answer substance, SWOT
 * bullets that quote what the candidate actually said (or skipped).
 * Used when the API key is absent, the call fails, or a section of the
 * LLM's JSON is unusable.
 */
export function heuristicReport(session: InterviewSession): InterviewReport {
  const { questions } = session;

  const perQuestion: PerQuestionResult[] = questions.map((q, i) => {
    const a = answerFor(session, i);
    const score = heuristicQuestionScore(a);
    const skipped = !a || a.skipped || !a.answer.trim();
    const words = skipped ? 0 : a.answer.trim().split(/\s+/).length;
    return {
      question: q.question,
      answerSummary: skipped
        ? 'No answer was given for this question.'
        : `Answered in ~${words} words, opening with “${snippet(a.answer)}”.`,
      score,
      feedback: skipped
        ? 'This question was skipped, which scores zero in a real interview — even a partial, structured attempt earns credit.'
        : score >= 6
          ? `A substantial answer that engaged with the ${q.focus} focus of the question.`
          : `The answer was brief for a ${q.focus} question; it likely left the interviewer wanting more depth.`,
      howToImprove: skipped
        ? `Prepare a fallback structure for ${q.focus} questions: restate the question, share what you do know, and reason out loud toward an answer.`
        : score >= 6
          ? 'Tighten the opening: lead with your conclusion in one sentence, then support it with your strongest example.'
          : `Aim for 45-90 seconds: one concrete example, the decision you made, and the outcome — especially for ${q.focus}.`,
    };
  });

  const answered = perQuestion.filter((p) => p.score > 0);
  const skippedCount = perQuestion.length - answered.length;
  const avg = perQuestion.length
    ? perQuestion.reduce((sum, p) => sum + p.score, 0) / perQuestion.length
    : 0;
  const score = Math.round(avg * 10);

  const best = [...perQuestion].sort((a, b) => b.score - a.score)[0];
  const worst = [...perQuestion].sort((a, b) => a.score - b.score)[0];
  const focusList = questions.map((q) => q.focus);

  const swot: SwotAnalysis = {
    strengths:
      answered.length > 0
        ? [
            `Strongest moment: “${snippet(best.question, 12)}” — ${best.answerSummary}`,
            `Completed ${answered.length} of ${perQuestion.length} questions with substantive answers.`,
          ]
        : [
            'You showed up and ran a full practice round — repetition is how interview comfort is built.',
            'The session is recorded below question by question, giving you a concrete baseline to beat.',
          ],
    weaknesses: [
      skippedCount > 0
        ? `${skippedCount} question${skippedCount > 1 ? 's' : ''} went unanswered, including “${snippet(worst.question, 12)}”.`
        : `Weakest answer: “${snippet(worst.question, 12)}” — ${worst.feedback}`,
      'Answers were scored on substance only here; structure and delivery need a second listen.',
    ],
    opportunities: [
      `Re-attempt the lowest-scoring question (“${snippet(worst.question, 12)}”) tomorrow — one rep on a known weak spot is the fastest score gain.`,
      `Prepare one strong story or example for each focus area: ${[...new Set(focusList)].slice(0, 4).join(', ')}.`,
    ],
    threats: [
      skippedCount > 0
        ? 'Skipping questions under pressure is a habit real interviewers notice immediately — always attempt a structured partial answer.'
        : 'Short answers can read as shallow knowledge in a real interview, even when you know more than you said.',
      'Without leading examples ("for example, when I…"), claims sound theoretical — interviewers discount unevidenced answers.',
    ],
  };

  return {
    overall: {
      score,
      summary:
        answered.length === 0
          ? `You skipped every question this round. Treat it as a dry run: the questions below are now known territory — re-run the same ${session.config.topic} interview and attempt each one, even partially.`
          : `You answered ${answered.length} of ${perQuestion.length} questions on ${session.config.topic}, averaging ${avg.toFixed(1)}/10. ${score >= 70 ? 'Solid substance overall — polish structure and pacing next.' : score >= 45 ? 'A workable base to build on — depth and concrete examples are the gap.' : 'The fundamentals need reps before this would convert in a real interview.'} The per-question notes below point at the next rep.`,
      readiness: readinessFromScore(score),
    },
    swot,
    perQuestion,
    generatedAt: new Date().toISOString(),
  };
}
