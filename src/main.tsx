import '@fontsource-variable/inter';

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/character.css';
import './styles/screens.css';
import './styles/print.css';

import { createRoot } from 'react-dom/client';

import { App } from './App';

// Warm the SpeechSynthesis engine: Chrome lazy-loads voices on first
// call to getVoices(), which adds ~150-400ms before the very first
// utterance starts. Touching it at module load shaves that delay off
// the interview's opening question.
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
}

// Note: no StrictMode — its double-mounted effects would replay TTS
// greetings and double-start speech recognition in development.
createRoot(document.getElementById('root')!).render(<App />);
