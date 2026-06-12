import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getSession, saveSession } from './store.js';
import type { InterviewSession } from './types.js';

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'ic-store-'));
  process.env.DATA_DIR = dir;
});

afterAll(async () => {
  delete process.env.DATA_DIR;
  await rm(dir, { recursive: true, force: true });
});

const session: InterviewSession = {
  id: 'abc-123',
  config: { mode: 'behavioral', topic: 'Frontend Engineer', difficulty: 'junior', questionCount: 3 },
  persona: { name: 'Jordan Avery', title: 'EM', style: 'Warm.' },
  brief: { roleSummary: 'x', focusAreas: ['a'], expectations: 'y', rubric: ['z'] },
  questions: [{ question: 'Tell me about yourself.', focus: 'motivation' }],
  answers: [],
  status: 'created',
  llm: 'mock',
  createdAt: new Date().toISOString(),
};

describe('store', () => {
  it('round-trips a session', async () => {
    await saveSession(session);
    const loaded = await getSession('abc-123');
    expect(loaded).toEqual(session);
  });

  it('returns null for unknown ids', async () => {
    expect(await getSession('does-not-exist')).toBeNull();
  });

  it('rejects path-traversal ids', async () => {
    await expect(getSession('../evil')).rejects.toThrow(/Invalid session id/);
  });
});
