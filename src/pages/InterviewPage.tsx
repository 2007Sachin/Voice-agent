import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../components/Button';
import { InterviewerCharacter, type CharacterState } from '../components/InterviewerCharacter';
import { ProgressBar } from '../components/ProgressBar';
import { QuestionCard } from '../components/QuestionCard';
import { ScreenShell } from '../components/ScreenShell';
import { StatePill } from '../components/StatePill';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { useSession } from '../state/session';

type Phase = 'idle' | 'asking' | 'answering' | 'transition' | 'finishing';

export function InterviewPage() {
  const navigate = useNavigate();
  const { session, loading, recordAnswer, finish } = useSession();
  const tts = useSpeechSynthesis();
  const stt = useSpeechRecognition();

  const [phase, setPhase] = useState<Phase>('idle');
  const [qIndex, setQIndex] = useState(0);
  const [micPaused, setMicPaused] = useState(false);
  const [typing, setTyping] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startedRef = useRef(false);
  const questionStartRef = useRef(Date.now());
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;

  const total = session?.questions.length ?? 0;

  useEffect(() => {
    if (!loading && !session) navigate('/');
    if (session?.report) navigate(`/report/${session.id}`);
  }, [loading, session, navigate]);

  const beginListening = useCallback(
    (fresh: boolean) => {
      if (fresh) {
        stt.reset();
        setTypedText('');
        setTyping(false);
        questionStartRef.current = Date.now();
        setSeconds(0);
      }
      setMicPaused(false);
      if (stt.supported) stt.start();
      setPhase('answering');
    },
    [stt],
  );

  const ask = useCallback(
    (index: number, preamble = '') => {
      if (!session) return;
      setQIndex(index);
      setPhase('asking');
      stt.stop();
      tts.speak(`${preamble}${session.questions[index].question}`, () => {
        // Only proceed if we're still on this question (not ended early).
        if (phaseRef.current === 'asking') beginListening(true);
      });
    },
    [session, stt, tts, beginListening],
  );

  // Kick off the interview once the session is ready.
  useEffect(() => {
    if (!session || startedRef.current) return;
    startedRef.current = true;
    const name = session.config.candidateName;
    ask(0, `${name ? `Alright ${name}` : 'Alright'}, let's begin. First question: `);
  }, [session, ask]);

  // Per-question timer.
  useEffect(() => {
    if (phase !== 'answering') return;
    const interval = setInterval(
      () => setSeconds(Math.round((Date.now() - questionStartRef.current) / 1000)),
      1000,
    );
    return () => clearInterval(interval);
  }, [phase]);

  const collectAnswer = useCallback(() => {
    const spoken = `${stt.transcript} ${stt.interim}`.trim();
    const typed = typedText.trim();
    return [spoken, typed].filter(Boolean).join('\n');
  }, [stt.transcript, stt.interim, typedText]);

  const finishInterview = useCallback(async () => {
    setPhase('finishing');
    tts.cancel();
    stt.stop();
    try {
      const report = await finish();
      void report;
      if (session) navigate(`/report/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate your report');
      setPhase('idle');
    }
  }, [finish, navigate, session, stt, tts]);

  const advance = useCallback(
    (nextIndex: number) => {
      if (!session) return;
      if (nextIndex >= session.questions.length) {
        void finishInterview();
      } else {
        setPhase('transition');
        // A breath between questions so the hand-off feels human.
        setTimeout(() => ask(nextIndex), 700);
      }
    },
    [session, ask, finishInterview],
  );

  const submitCurrent = useCallback(
    async (skipped: boolean) => {
      if (!session) return;
      const answer = skipped ? '' : collectAnswer();
      stt.stop();
      setPhase('transition');
      setError(null);
      try {
        await recordAnswer(qIndex, answer, Date.now() - questionStartRef.current, skipped);
        advance(qIndex + 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save your answer');
        setPhase('answering');
      }
    },
    [session, collectAnswer, stt, recordAnswer, qIndex, advance],
  );

  const repeatQuestion = useCallback(() => {
    if (!session || phase === 'asking') return;
    setPhase('asking');
    stt.stop();
    tts.speak(session.questions[qIndex].question, () => {
      if (phaseRef.current === 'asking') beginListening(false);
    });
  }, [session, phase, qIndex, stt, tts, beginListening]);

  const toggleMic = useCallback(() => {
    if (micPaused) {
      if (stt.supported) stt.start();
      setMicPaused(false);
    } else {
      stt.stop();
      setMicPaused(true);
    }
  }, [micPaused, stt]);

  const endEarly = useCallback(async () => {
    setConfirmEnd(false);
    if (!session) return;
    const answer = collectAnswer();
    stt.stop();
    tts.cancel();
    if (answer) {
      await recordAnswer(qIndex, answer, Date.now() - questionStartRef.current, false).catch(
        () => undefined,
      );
    }
    void finishInterview();
  }, [session, collectAnswer, stt, tts, recordAnswer, qIndex, finishInterview]);

  if (!session) return null;

  const question = session.questions[qIndex];
  const isLast = qIndex === total - 1;
  const completed = phase === 'transition' || phase === 'finishing' ? qIndex + 1 : qIndex;

  const characterState: CharacterState =
    phase === 'asking'
      ? 'speaking'
      : phase === 'answering'
        ? micPaused
          ? 'idle'
          : 'listening'
        : phase === 'transition' || phase === 'finishing'
          ? 'thinking'
          : 'idle';

  const pillState = phase === 'answering' && micPaused ? 'paused' : characterState;

  if (phase === 'finishing') {
    return (
      <ScreenShell width="wide">
        <div className="generating">
          <InterviewerCharacter state="thinking" size="lg" />
          <div className="stack" style={{ gap: '0.4rem' }}>
            <h1 className="t-title">Compiling your report…</h1>
            <p className="t-secondary">
              Scoring each answer and running the SWOT analysis. This takes a few seconds.
            </p>
          </div>
        </div>
      </ScreenShell>
    );
  }

  const wordCount = collectAnswer() ? collectAnswer().split(/\s+/).length : 0;

  return (
    <ScreenShell width="wide" headerRight={<StatePill state={pillState} />}>
      <div className="room">
        <div className="stack" style={{ gap: '0.55rem' }}>
          <div className="row row--between">
            <span className="t-label">
              Question {Math.min(qIndex + 1, total)} of {total}
            </span>
            <span className="t-label">
              {firstName(session.persona.name)} · {session.config.topic}
            </span>
          </div>
          <ProgressBar value={completed} max={total} label="Interview progress" />
        </div>

        <div className="room__stage">
          <InterviewerCharacter state={characterState} />
          {/* keyed: re-mounts with its entrance animation on every question */}
          <QuestionCard
            key={qIndex}
            index={qIndex}
            total={total}
            focus={question.focus}
            question={question.question}
          />
        </div>

        <section className="stack" style={{ gap: '0.6rem' }} aria-label="Your answer">
          <div className="row row--between">
            <span className="t-label">Your answer</span>
            <span className="t-label">
              {wordCount} words · {formatTime(seconds)}
            </span>
          </div>
          <div className="transcript" aria-live="polite">
            {stt.transcript || stt.interim || typedText ? (
              <>
                {stt.transcript}
                {stt.interim && <span className="transcript__interim"> {stt.interim}</span>}
                {typedText && (
                  <>
                    {stt.transcript || stt.interim ? <br /> : null}
                    {typedText}
                  </>
                )}
              </>
            ) : (
              <span className="transcript__placeholder">
                {phase === 'asking'
                  ? 'Listen to the question…'
                  : stt.supported
                    ? micPaused
                      ? 'Mic paused — resume when ready.'
                      : 'Speak your answer — it will appear here.'
                    : 'Type your answer below.'}
              </span>
            )}
          </div>

          {(typing || !stt.supported) && (
            <label className="field type-answer">
              <span className="t-label">Typed answer</span>
              <textarea
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder="Type here if speaking isn't an option…"
              />
            </label>
          )}
        </section>

        {error && (
          <div className="notice notice--danger" role="alert">
            {error}
          </div>
        )}

        {confirmEnd ? (
          <div className="row row--wrap card" style={{ padding: '0.9rem 1.2rem' }}>
            <span className="t-small t-secondary" style={{ flex: 1 }}>
              End the interview now? You'll get a report on the {qIndex} question
              {qIndex === 1 ? '' : 's'} answered so far.
            </span>
            <Button variant="danger-ghost" onClick={() => void endEarly()}>
              End & get report
            </Button>
            <Button variant="ghost" onClick={() => setConfirmEnd(false)}>
              Keep going
            </Button>
          </div>
        ) : (
          <div className="room__controls no-print">
            <Button
              variant="primary"
              size="lg"
              disabled={phase !== 'answering'}
              onClick={() => void submitCurrent(false)}
            >
              {isLast ? 'Finish & get my report' : 'Done — next question'}
            </Button>
            <Button disabled={phase === 'asking'} onClick={repeatQuestion}>
              Repeat question
            </Button>
            {stt.supported && (
              <Button disabled={phase !== 'answering'} onClick={toggleMic}>
                {micPaused ? 'Resume mic' : 'Pause mic'}
              </Button>
            )}
            {stt.supported && (
              <Button variant="ghost" disabled={phase !== 'answering'} onClick={() => setTyping((t) => !t)}>
                {typing ? 'Hide typing' : 'Type instead'}
              </Button>
            )}
            <Button variant="ghost" disabled={phase !== 'answering'} onClick={() => void submitCurrent(true)}>
              Skip
            </Button>
            <Button variant="danger-ghost" onClick={() => setConfirmEnd(true)}>
              End early
            </Button>
          </div>
        )}
      </div>
    </ScreenShell>
  );
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function firstName(name: string): string {
  return name.split(' ')[0];
}
