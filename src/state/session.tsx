import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { InterviewReport, InterviewSession, SessionConfig } from '../../server/types';
import * as api from '../lib/api';

const STORAGE_KEY = 'interview-studio.session-id';

interface SessionContextValue {
  session: InterviewSession | null;
  loading: boolean;
  create(config: SessionConfig): Promise<InterviewSession>;
  recordAnswer(questionIndex: number, answer: string, durationMs: number, skipped: boolean): Promise<void>;
  finish(): Promise<InterviewReport>;
  reset(): void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the in-flight session after a refresh.
  useEffect(() => {
    const id = sessionStorage.getItem(STORAGE_KEY);
    if (!id) {
      setLoading(false);
      return;
    }
    api
      .fetchSession(id)
      .then(setSession)
      .catch(() => sessionStorage.removeItem(STORAGE_KEY))
      .finally(() => setLoading(false));
  }, []);

  const create = useCallback(async (config: SessionConfig) => {
    const created = await api.createSession(config);
    sessionStorage.setItem(STORAGE_KEY, created.id);
    setSession(created);
    return created;
  }, []);

  const recordAnswer = useCallback(
    async (questionIndex: number, answer: string, durationMs: number, skipped: boolean) => {
      if (!session) throw new Error('No active session');
      const updated = await api.submitAnswer(session.id, {
        questionIndex,
        answer,
        durationMs,
        skipped,
      });
      setSession(updated);
    },
    [session],
  );

  const finish = useCallback(async () => {
    if (!session) throw new Error('No active session');
    const report = await api.finishSession(session.id);
    setSession((prev) => (prev ? { ...prev, report, status: 'completed' } : prev));
    return report;
  }, [session]);

  const reset = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, loading, create, recordAnswer, finish, reset }),
    [session, loading, create, recordAnswer, finish, reset],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
