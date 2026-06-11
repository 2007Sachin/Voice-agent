import { describe, expect, it } from 'vitest';

import type { InterviewSession } from '../types.js';
import { parseLlmJson } from './groq.js';
import { heuristicReport, normalizeReport } from './scoring.js';

function fixtureSession(): InterviewSession {
  return {
    id: 'test-session',
    config: { mode: 'skill', topic: 'React', difficulty: 'mid', questionCount: 2 },
    persona: { name: 'Maya Chen', title: 'Staff Engineer', style: 'Direct.' },
    brief: {
      roleSummary: 'Mid-level React deep-dive.',
      focusAreas: ['fundamentals', 'debugging'],
      expectations: 'Answer out loud.',
      rubric: ['Accuracy', 'Clarity'],
    },
    questions: [
      { question: 'Explain React reconciliation.', focus: 'fundamentals' },
      { question: 'Debug a stale closure in a hook.', focus: 'debugging' },
    ],
    answers: [
      {
        questionIndex: 0,
        answer:
          'Reconciliation is how React diffs the virtual DOM tree against the previous render and applies the minimal set of DOM mutations. Keys help it match list items across renders.',
        durationMs: 42_000,
        skipped: false,
      },
      { questionIndex: 1, answer: '', durationMs: 0, skipped: true },
    ],
    status: 'completed',
    llm: 'mock',
    createdAt: new Date().toISOString(),
  };
}

describe('parseLlmJson', () => {
  it('parses plain JSON', () => {
    expect(parseLlmJson('{"a": 1}')).toEqual({ a: 1 });
  });

  it('strips markdown fences', () => {
    expect(parseLlmJson('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
    expect(parseLlmJson('```\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it('extracts JSON wrapped in prose', () => {
    expect(parseLlmJson('Here is the report:\n{"a": {"b": 2}}\nHope it helps!')).toEqual({
      a: { b: 2 },
    });
  });

  it('returns null for garbage', () => {
    expect(parseLlmJson('not json at all')).toBeNull();
    expect(parseLlmJson('')).toBeNull();
  });
});

describe('normalizeReport', () => {
  it('accepts a fully valid report', () => {
    const session = fixtureSession();
    const report = normalizeReport(
      {
        overall: { score: 72, summary: 'Good run.', readiness: 'developing' },
        swot: {
          strengths: ['Clear explanation of reconciliation'],
          weaknesses: ['Skipped the debugging question'],
          opportunities: ['Practice hooks debugging'],
          threats: ['Skipping under pressure'],
        },
        perQuestion: [
          {
            question: 'Explain React reconciliation.',
            answerSummary: 'Explained diffing and keys.',
            score: 8,
            feedback: 'Accurate.',
            howToImprove: 'Mention fibers.',
          },
          {
            question: 'Debug a stale closure in a hook.',
            answerSummary: 'Skipped.',
            score: 0,
            feedback: 'No attempt.',
            howToImprove: 'Attempt a partial answer.',
          },
        ],
      },
      session,
    );
    expect(report.overall.score).toBe(72);
    expect(report.overall.readiness).toBe('developing');
    expect(report.swot.strengths).toEqual(['Clear explanation of reconciliation']);
    expect(report.perQuestion).toHaveLength(2);
    expect(report.perQuestion[0].score).toBe(8);
    expect(report.generatedAt).toBeTruthy();
  });

  it('falls back entirely for unparseable input', () => {
    const session = fixtureSession();
    const report = normalizeReport(null, session);
    expect(report.perQuestion).toHaveLength(2);
    expect(report.overall.score).toBeGreaterThanOrEqual(0);
    expect(report.overall.score).toBeLessThanOrEqual(100);
    expect(report.swot.strengths.length).toBeGreaterThan(0);
    expect(report.swot.threats.length).toBeGreaterThan(0);
  });

  it('fills missing sections from the heuristic without dropping valid ones', () => {
    const session = fixtureSession();
    const report = normalizeReport(
      { overall: { score: 55, summary: 'Partial report.' } }, // no swot, no perQuestion
      session,
    );
    expect(report.overall.score).toBe(55);
    expect(report.overall.summary).toBe('Partial report.');
    expect(report.swot.opportunities.length).toBeGreaterThan(0);
    expect(report.perQuestion).toHaveLength(2);
    expect(report.perQuestion[1].score).toBe(0); // skipped question
  });

  it('clamps scores and coerces readiness synonyms', () => {
    const session = fixtureSession();
    const report = normalizeReport(
      {
        overall: { score: 150, summary: 'x', readiness: 'Ready for interviews!' },
        perQuestion: [{ score: -3 }, { score: 99 }],
      },
      session,
    );
    expect(report.overall.score).toBe(100);
    expect(report.overall.readiness).toBe('interview-ready');
    expect(report.perQuestion[0].score).toBe(0);
    expect(report.perQuestion[1].score).toBe(10);
  });

  it('derives readiness from score when the value is unrecognizable', () => {
    const session = fixtureSession();
    const low = normalizeReport({ overall: { score: 20, summary: 'x', readiness: '???' } }, session);
    expect(low.overall.readiness).toBe('needs-practice');
    const high = normalizeReport({ overall: { score: 90, summary: 'x', readiness: 7 } }, session);
    expect(high.overall.readiness).toBe('interview-ready');
  });

  it('caps SWOT sections at 4 bullets and drops non-string entries', () => {
    const session = fixtureSession();
    const report = normalizeReport(
      {
        swot: {
          strengths: ['a', 'b', 'c', 'd', 'e', 'f'],
          weaknesses: [1, null, 'real weakness', { x: 1 }],
        },
      },
      session,
    );
    expect(report.swot.strengths).toHaveLength(4);
    expect(report.swot.weaknesses).toEqual(['real weakness']);
  });
});

describe('heuristicReport', () => {
  it('always yields a complete, in-range report', () => {
    const session = fixtureSession();
    const report = heuristicReport(session);
    expect(report.perQuestion).toHaveLength(session.questions.length);
    for (const q of report.perQuestion) {
      expect(q.score).toBeGreaterThanOrEqual(0);
      expect(q.score).toBeLessThanOrEqual(10);
      expect(q.feedback).toBeTruthy();
      expect(q.howToImprove).toBeTruthy();
    }
    for (const section of Object.values(report.swot)) {
      expect(section.length).toBeGreaterThanOrEqual(1);
      expect(section.length).toBeLessThanOrEqual(4);
    }
    expect(['needs-practice', 'developing', 'interview-ready']).toContain(
      report.overall.readiness,
    );
  });

  it('references what the candidate actually said', () => {
    const session = fixtureSession();
    const report = heuristicReport(session);
    expect(report.perQuestion[0].answerSummary).toContain('Reconciliation is how React');
    expect(report.perQuestion[1].answerSummary).toContain('No answer');
  });
});
