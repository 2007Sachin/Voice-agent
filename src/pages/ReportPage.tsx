import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { InterviewReport, InterviewSession } from '../../server/types';
import { Button } from '../components/Button';
import { InterviewerCharacter } from '../components/InterviewerCharacter';
import { QuestionResultCard } from '../components/QuestionResultCard';
import { ReportSummary } from '../components/ReportSummary';
import { ScreenShell } from '../components/ScreenShell';
import { SwotGrid } from '../components/SwotGrid';
import * as api from '../lib/api';
import { useSession } from '../state/session';

export function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session: activeSession, reset } = useSession();

  const [report, setReport] = useState<InterviewReport | null>(null);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    // Prefer the in-memory session (normal flow); fall back to fetching
    // so a refreshed or shared /report/:id URL still renders.
    if (activeSession?.id === id && activeSession.report) {
      setSession(activeSession);
      setReport(activeSession.report);
      return;
    }
    let cancelled = false;
    Promise.all([api.fetchReport(id), api.fetchSession(id).catch(() => null)])
      .then(([fetchedReport, fetchedSession]) => {
        if (cancelled) return;
        setReport(fetchedReport);
        setSession(fetchedSession);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Report not found');
      });
    return () => {
      cancelled = true;
    };
  }, [id, activeSession]);

  function practiceAgain() {
    reset();
    navigate('/');
  }

  if (error) {
    return (
      <ScreenShell>
        <div className="screen-head">
          <h1 className="t-display">Report not found</h1>
          <p className="t-secondary">{error}</p>
          <div>
            <Button variant="primary" onClick={practiceAgain}>
              Start a new interview
            </Button>
          </div>
        </div>
      </ScreenShell>
    );
  }

  if (!report) {
    return (
      <ScreenShell width="wide">
        <div className="generating">
          <InterviewerCharacter state="thinking" size="lg" />
          <p className="t-secondary">Loading your report…</p>
        </div>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      width="wide"
      headerRight={
        <div className="row no-print">
          <Button onClick={() => window.print()}>Download report</Button>
          <Button variant="primary" onClick={practiceAgain}>
            Practice again
          </Button>
        </div>
      }
    >
      <div className="stack stack--loose" style={{ paddingTop: '1rem' }}>
        <ReportSummary report={report} session={session} />

        <section className="stack" aria-label="SWOT">
          <h2 className="t-label">SWOT analysis</h2>
          <SwotGrid swot={report.swot} />
        </section>

        <section className="stack" aria-label="Question-by-question feedback">
          <h2 className="t-label">Question by question</h2>
          {report.perQuestion.map((result, i) => (
            <QuestionResultCard key={i} index={i} result={result} />
          ))}
        </section>
      </div>
    </ScreenShell>
  );
}
