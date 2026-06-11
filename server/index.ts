import { randomUUID } from 'node:crypto';
import path from 'node:path';

import express from 'express';

import { generatePlan } from './services/interview.js';
import { generateReport } from './services/scoring.js';
import { getSession, saveSession } from './store.js';
import type { Difficulty, InterviewMode, InterviewSession, SessionConfig } from './types.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

const MODES: InterviewMode[] = ['skill', 'behavioral', 'system-design'];
const DIFFICULTIES: Difficulty[] = ['junior', 'mid', 'senior'];

function parseConfig(body: unknown): SessionConfig | null {
  if (!body || typeof body !== 'object') return null;
  const raw = body as Record<string, unknown>;
  const mode = raw.mode as InterviewMode;
  const difficulty = raw.difficulty as Difficulty;
  const topic = typeof raw.topic === 'string' ? raw.topic.trim() : '';
  const questionCount = Number(raw.questionCount);
  if (!MODES.includes(mode) || !DIFFICULTIES.includes(difficulty)) return null;
  if (!topic || topic.length > 120) return null;
  if (![3, 5, 7].includes(questionCount)) return null;
  const candidateName =
    typeof raw.candidateName === 'string' && raw.candidateName.trim()
      ? raw.candidateName.trim().slice(0, 60)
      : undefined;
  return { mode, topic, difficulty, questionCount, candidateName };
}

app.post('/api/sessions', async (req, res) => {
  const config = parseConfig(req.body);
  if (!config) {
    res.status(400).json({ error: 'Invalid session config' });
    return;
  }
  try {
    const plan = await generatePlan(config);
    const session: InterviewSession = {
      id: randomUUID(),
      config,
      persona: plan.persona,
      brief: plan.brief,
      questions: plan.questions,
      answers: [],
      status: 'created',
      llm: plan.source,
      createdAt: new Date().toISOString(),
    };
    await saveSession(session);
    res.json(session);
  } catch (err) {
    console.error('[api] failed to create session:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

app.get('/api/sessions/:id', async (req, res) => {
  const session = await getSession(req.params.id).catch(() => null);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json(session);
});

app.post('/api/sessions/:id/answers', async (req, res) => {
  const session = await getSession(req.params.id).catch(() => null);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  const raw = (req.body ?? {}) as Record<string, unknown>;
  const questionIndex = Number(raw.questionIndex);
  if (!Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex >= session.questions.length) {
    res.status(400).json({ error: 'Invalid questionIndex' });
    return;
  }
  const answer = {
    questionIndex,
    answer: typeof raw.answer === 'string' ? raw.answer.slice(0, 20_000) : '',
    durationMs: Number.isFinite(Number(raw.durationMs)) ? Math.max(0, Number(raw.durationMs)) : 0,
    skipped: Boolean(raw.skipped),
  };
  session.answers = [...session.answers.filter((a) => a.questionIndex !== questionIndex), answer];
  session.status = 'in-progress';
  await saveSession(session);
  res.json(session);
});

app.post('/api/sessions/:id/finish', async (req, res) => {
  const session = await getSession(req.params.id).catch(() => null);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  try {
    if (!session.report) {
      session.report = await generateReport(session);
      session.status = 'completed';
      await saveSession(session);
    }
    res.json({ report: session.report });
  } catch (err) {
    console.error('[api] failed to generate report:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

app.get('/api/sessions/:id/report', async (req, res) => {
  const session = await getSession(req.params.id).catch(() => null);
  if (!session?.report) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }
  res.json({ report: session.report });
});

// In production the same process serves the built client.
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(process.cwd(), 'dist');
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(dist, 'index.html'));
  });
}

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});
