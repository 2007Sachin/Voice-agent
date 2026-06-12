import type { InterviewReport, InterviewSession, SessionConfig } from '../../server/types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // keep the generic message
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export function createSession(config: SessionConfig): Promise<InterviewSession> {
  return request('/api/sessions', { method: 'POST', body: JSON.stringify(config) });
}

export function fetchSession(id: string): Promise<InterviewSession> {
  return request(`/api/sessions/${id}`);
}

export function submitAnswer(
  id: string,
  payload: { questionIndex: number; answer: string; durationMs: number; skipped: boolean },
): Promise<InterviewSession> {
  return request(`/api/sessions/${id}/answers`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function finishSession(id: string): Promise<InterviewReport> {
  const { report } = await request<{ report: InterviewReport }>(`/api/sessions/${id}/finish`, {
    method: 'POST',
  });
  return report;
}

export async function fetchReport(id: string): Promise<InterviewReport> {
  const { report } = await request<{ report: InterviewReport }>(`/api/sessions/${id}/report`);
  return report;
}
