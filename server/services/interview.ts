import type {
  Difficulty,
  InterviewBrief,
  InterviewMode,
  InterviewQuestion,
  InterviewerPersona,
  SessionConfig,
} from '../types.js';
import { chatJson, llmAvailable, parseLlmJson } from './groq.js';

export interface SessionPlan {
  persona: InterviewerPersona;
  brief: InterviewBrief;
  questions: InterviewQuestion[];
  source: 'groq' | 'mock';
}

const DIFFICULTY_HINTS: Record<Difficulty, string> = {
  junior: 'early-career candidate; favor fundamentals and concrete basics',
  mid: 'mid-level candidate; expect applied experience and trade-off awareness',
  senior: 'senior candidate; probe depth, judgment, and leading-edge decisions',
};

const MODE_PROMPTS: Record<InterviewMode, string> = {
  skill:
    'a technical skill deep-dive interview focused on the named skill: concepts, applied usage, debugging, and trade-offs',
  behavioral:
    'a behavioral interview for the named target role: past experience, collaboration, conflict, ownership — answers should follow STAR',
  'system-design':
    'a system design interview in the named domain: requirements, architecture, data, scaling, and failure modes',
};

export async function generatePlan(config: SessionConfig): Promise<SessionPlan> {
  if (!llmAvailable()) return mockPlan(config);
  try {
    const raw = await chatJson(planSystemPrompt(), planUserPrompt(config), {
      temperature: 0.5,
    });
    const parsed = parseLlmJson(raw);
    const plan = normalizePlan(parsed, config);
    if (plan) return { ...plan, source: 'groq' };
  } catch (err) {
    console.error('[interview] plan generation failed, using mock plan:', err);
  }
  return mockPlan(config);
}

function planSystemPrompt(): string {
  return [
    'You design realistic mock job interviews and reply with JSON only.',
    'Schema:',
    '{',
    '  "persona": { "name": string, "title": string, "style": string },',
    '  "brief": { "roleSummary": string, "focusAreas": string[], "expectations": string, "rubric": string[] },',
    '  "questions": [ { "question": string, "focus": string } ]',
    '}',
    'Rules: focusAreas has 3-5 short items; rubric has 4-6 scoring criteria;',
    'each question is a single spoken-style question under 40 words with a 2-4 word focus tag.',
  ].join('\n');
}

function planUserPrompt(config: SessionConfig): string {
  return [
    `Design ${MODE_PROMPTS[config.mode]}.`,
    `Topic: ${config.topic}.`,
    `Level: ${DIFFICULTY_HINTS[config.difficulty]}.`,
    `Produce exactly ${config.questionCount} questions, ordered easiest to hardest.`,
    config.candidateName ? `The candidate's name is ${config.candidateName}.` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asStringArray(value: unknown, fallback: string[], max = 6): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim())
    .slice(0, max);
  return items.length > 0 ? items : fallback;
}

export function normalizePlan(
  parsed: unknown,
  config: SessionConfig,
): Omit<SessionPlan, 'source'> | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const raw = parsed as Record<string, unknown>;
  const mock = mockPlan(config);

  const personaRaw = (raw.persona ?? {}) as Record<string, unknown>;
  const briefRaw = (raw.brief ?? {}) as Record<string, unknown>;

  const questionsRaw = Array.isArray(raw.questions) ? raw.questions : [];
  const questions: InterviewQuestion[] = questionsRaw
    .map((q): InterviewQuestion | null => {
      if (!q || typeof q !== 'object') return null;
      const item = q as Record<string, unknown>;
      const question = asString(item.question, '');
      if (!question) return null;
      return { question, focus: asString(item.focus, 'general') };
    })
    .filter((q): q is InterviewQuestion => q !== null)
    .slice(0, config.questionCount);

  if (questions.length === 0) return null;
  // Pad from the mock bank if the model under-delivered.
  for (const filler of mock.questions) {
    if (questions.length >= config.questionCount) break;
    questions.push(filler);
  }

  return {
    persona: {
      name: asString(personaRaw.name, mock.persona.name),
      title: asString(personaRaw.title, mock.persona.title),
      style: asString(personaRaw.style, mock.persona.style),
    },
    brief: {
      roleSummary: asString(briefRaw.roleSummary, mock.brief.roleSummary),
      focusAreas: asStringArray(briefRaw.focusAreas, mock.brief.focusAreas, 5),
      expectations: asString(briefRaw.expectations, mock.brief.expectations),
      rubric: asStringArray(briefRaw.rubric, mock.brief.rubric, 6),
    },
    questions,
  };
}

/* ------------------------------------------------------------------ */
/* Keyless fallback                                                    */
/* ------------------------------------------------------------------ */

const MOCK_QUESTIONS: Record<InterviewMode, (topic: string) => InterviewQuestion[]> = {
  skill: (topic) => [
    { question: `To warm up: how would you explain ${topic} to a teammate who has never used it?`, focus: 'fundamentals' },
    { question: `Walk me through a recent problem you solved with ${topic}. What made it tricky?`, focus: 'applied experience' },
    { question: `What mistakes do people commonly make when working with ${topic}, and how do you avoid them?`, focus: 'pitfalls' },
    { question: `Tell me about debugging something hard in ${topic}. How did you narrow it down?`, focus: 'debugging' },
    { question: `When would you advise a team NOT to use ${topic}? What would you reach for instead?`, focus: 'trade-offs' },
    { question: `How do you keep your ${topic} knowledge current, and what recent change mattered most?`, focus: 'growth' },
    { question: `If you owned performance for a slow ${topic} codebase, where would you look first and why?`, focus: 'performance' },
  ],
  behavioral: (topic) => [
    { question: `Tell me about yourself and why you're pursuing a ${topic} role.`, focus: 'motivation' },
    { question: 'Describe a project you are proud of. What was your specific contribution?', focus: 'ownership' },
    { question: 'Tell me about a time you disagreed with a teammate. How was it resolved?', focus: 'conflict' },
    { question: 'Describe a time you missed a deadline or shipped a bug. What did you change afterwards?', focus: 'accountability' },
    { question: 'Tell me about receiving difficult feedback. How did you respond?', focus: 'feedback' },
    { question: 'Describe a time you had to learn something quickly under pressure.', focus: 'learning agility' },
    { question: `Where do you want to grow in your next ${topic} role?`, focus: 'self-awareness' },
  ],
  'system-design': (topic) => [
    { question: `Let's design ${topic}. What clarifying questions would you ask before drawing anything?`, focus: 'requirements' },
    { question: `Sketch the high-level architecture for ${topic}. What are the main components?`, focus: 'architecture' },
    { question: `How would you model and store the data for ${topic}? Why that choice?`, focus: 'data modeling' },
    { question: `Traffic grows 100x overnight. What breaks first in your ${topic} design, and how do you fix it?`, focus: 'scaling' },
    { question: `What are the failure modes of your ${topic} design, and how do you stay reliable?`, focus: 'reliability' },
    { question: `How would you monitor ${topic} in production? Which signals page someone at 3am?`, focus: 'observability' },
    { question: `What would you cut from your ${topic} design to ship a v1 in four weeks?`, focus: 'prioritization' },
  ],
};

const MOCK_PERSONAS: Record<InterviewMode, InterviewerPersona> = {
  skill: { name: 'Maya Chen', title: 'Staff Engineer', style: 'Direct but encouraging; digs into the "why" behind every answer.' },
  behavioral: { name: 'Jordan Avery', title: 'Engineering Manager', style: 'Warm and curious; listens for concrete situations and your specific role in them.' },
  'system-design': { name: 'Priya Raghavan', title: 'Principal Architect', style: 'Calm and methodical; cares more about your reasoning than the final diagram.' },
};

export function mockPlan(config: SessionConfig): SessionPlan {
  const bank = MOCK_QUESTIONS[config.mode](config.topic);
  return {
    persona: MOCK_PERSONAS[config.mode],
    brief: {
      roleSummary: `A ${config.difficulty}-level mock interview on ${config.topic}. Questions move from fundamentals to harder applied territory.`,
      focusAreas: [...new Set(bank.slice(0, config.questionCount).map((q) => q.focus))].slice(0, 5),
      expectations:
        'Answer out loud as you would in a real interview: structure your thoughts, use concrete examples from your own experience, and say "I don\'t know" rather than bluffing.',
      rubric: [
        'Technical accuracy and depth',
        'Structure and clarity of communication',
        'Use of specific, concrete examples',
        'Awareness of trade-offs and limitations',
        'Conciseness — answers the question without rambling',
      ],
    },
    questions: bank.slice(0, config.questionCount),
    source: 'mock',
  };
}
