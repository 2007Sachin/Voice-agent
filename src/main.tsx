import '@fontsource-variable/inter';

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/character.css';
import './styles/screens.css';
import './styles/print.css';

import { createRoot } from 'react-dom/client';

import { App } from './App';

// Note: no StrictMode — its double-mounted effects would replay TTS
// greetings and double-start speech recognition in development.
createRoot(document.getElementById('root')!).render(<App />);
