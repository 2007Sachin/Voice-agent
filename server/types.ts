/**
 * Domain types shared by the API server and the React client.
 * The client imports *types only* from this file, so nothing here may
 * have runtime side effects.
 */

export type InterviewMode = 'skill' | 'behavioral' | 'system-design';

export type Difficulty = 'junior' | 'mid' | 'senior';

export interface SessionConfig {
  mode: InterviewMode;
  /** Skill, target role, or design domain depending on mode. */
  topic: string;
  difficulty: Difficulty;
  questionCount: number;
  candidateName?: string;
}

export interface InterviewerPersona {
  name: string;
  title: string;
  /** One sentence describing how the interviewer behaves. */
  style: string;
}

export interface InterviewBrief {
  roleSummary: string;
  focusAreas: string[];
  expectations: string;
  /** Criteria answers are scored against. */
  rubric: string[];
}

export interface InterviewQuestion {
  question: string;
  /** Short tag naming what the question probes, e.g. "error handling". */
  focus: string;
}

export interface AnswerRecord {
  questionIndex: number;
  answer: string;
  durationMs: number;
  skipped: boolean;
}

/* ------------------------------------------------------------------ */
/* Post-interview report                                               */
/* ------------------------------------------------------------------ */

export type ReadinessLevel = 'needs-practice' | 'developing' | 'interview-ready';

export interface ReportOverall {
  /** 0-100. */
  score: number;
  summary: string;
  readiness: ReadinessLevel;
}

export interface SwotAnalysis {
  strengths: string[];
  weaknesses: string[];
  /** Areas where small effort yields big improvement; topics to learn next. */
  opportunities: string[];
  /** Habits or gaps that could cost the candidate in a real interview. */
  threats: string[];
}

export interface PerQuestionResult {
  question: string;
  answerSummary: string;
  /** 0-10. */
  score: number;
  feedback: string;
  howToImprove: string;
}

export interface InterviewReport {
  overall: ReportOverall;
  swot: SwotAnalysis;
  perQuestion: PerQuestionResult[];
  /** ISO timestamp. */
  generatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

export type SessionStatus = 'created' | 'in-progress' | 'completed';

export interface InterviewSession {
  id: string;
  config: SessionConfig;
  persona: InterviewerPersona;
  brief: InterviewBrief;
  questions: InterviewQuestion[];
  answers: AnswerRecord[];
  status: SessionStatus;
  /** 'groq' when the LLM produced the plan, 'mock' when running keyless. */
  llm: 'groq' | 'mock';
  createdAt: string;
  report?: InterviewReport;
}

export const MODE_LABELS: Record<InterviewMode, string> = {
  skill: 'Skill deep-dive',
  behavioral: 'Behavioral',
  'system-design': 'System design',
};

export const READINESS_LABELS: Record<ReadinessLevel, string> = {
  'needs-practice': 'Needs practice',
  developing: 'Developing',
  'interview-ready': 'Interview-ready',
};
