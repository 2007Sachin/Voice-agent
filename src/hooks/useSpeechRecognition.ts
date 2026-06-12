import { useCallback, useEffect, useRef, useState } from 'react';

function getRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/**
 * Browser STT via the Web Speech API. Continuous dictation: Chrome stops
 * recognition after pauses, so we transparently restart while listening
 * is requested. `transcript` accumulates final results; `interim` holds
 * the live partial.
 */
export function useSpeechRecognition() {
  const supported = getRecognitionCtor() !== null;
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldListenRef = useRef(false);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
    setInterim('');
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || shouldListenRef.current) return;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) {
          setTranscript((prev) => `${prev}${prev && text ? ' ' : ''}${text.trim()}`);
        } else {
          interimText += text;
        }
      }
      setInterim(interimText);
    };

    recognition.onerror = (event) => {
      // 'no-speech' / 'aborted' are routine; permission errors end the run.
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        shouldListenRef.current = false;
        setListening(false);
      }
    };

    recognition.onend = () => {
      setInterim('');
      if (shouldListenRef.current) {
        // Chrome auto-stops on silence — keep the mic open.
        try {
          recognition.start();
        } catch {
          shouldListenRef.current = false;
          setListening(false);
        }
      } else {
        setListening(false);
      }
    };

    recognitionRef.current = recognition;
    shouldListenRef.current = true;
    setListening(true);
    try {
      recognition.start();
    } catch {
      shouldListenRef.current = false;
      setListening(false);
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterim('');
  }, []);

  useEffect(
    () => () => {
      shouldListenRef.current = false;
      recognitionRef.current?.abort();
    },
    [],
  );

  return { supported, listening, transcript, interim, start, stop, reset };
}
