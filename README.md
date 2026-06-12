# Interview Studio

Voice-driven mock interview practice. The app speaks questions out loud, transcribes your spoken answers live in the browser, and ends every session with a **SWOT performance report**.

**Stack**

- **Frontend** — React + Vite (`src/`): browser STT (Web Speech API) and TTS (SpeechSynthesis), no audio leaves the page
- **Backend** — Express + TypeScript (`server/`): question generation and scoring via **Groq** (`llama-3.3-70b-versatile`), JSON-file session store in `data/`
- **Optional phone agent** — LiveKit Agents service in `services/voice-agent/` (Deepgram STT/TTS + Groq LLM), unchanged and independent of the web app

No paid services are required: without a `GROQ_API_KEY` the app runs fully offline using a built-in question bank and a deterministic heuristic report.

---

## Quickstart

```bash
npm install
cp .env.example .env        # optional: add GROQ_API_KEY for LLM questions/reports
npm run dev                 # API on :8787, web app on :5173
```

Open http://localhost:5173 in **Chrome or Edge** (best Web Speech API support) and allow microphone access.

### Flow

1. **Setup** — pick a mode, topic, level, and question count
2. **Briefing** — role summary, focus areas, and the scoring rubric
3. **Mic check** — live input meter + speech-recognition sanity test
4. **Meet the interviewer** — persona intro, optional voice preview
5. **Interview room** — spoken questions, live transcript, pacing controls (repeat / skip / pause mic / type instead / end early)
6. **Report** — overall score + readiness, SWOT 2×2, per-question feedback, print-friendly download

### Modes

| Mode | Focus |
|------|-------|
| **Skill deep-dive** | one technical skill, fundamentals → trade-offs |
| **Behavioral** | STAR-style experience, conflict, ownership |
| **System design** | requirements, architecture, scaling, failure modes |

---

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | API server + Vite dev server together |
| `npm run build` | production client bundle to `dist/` |
| `npm start` | serve API + built client from one process |
| `npm run lint` | ESLint over `src/` and `server/` |
| `npm run typecheck` | strict TS check of both tsconfig projects |
| `npm test` | Vitest — report parsing/normalization + store tests |

---

## The SWOT report

`POST /api/sessions/:id/finish` asks the LLM for strict JSON shaped as:

```jsonc
{
  "overall": { "score": 0-100, "summary": "one paragraph", "readiness": "needs-practice | developing | interview-ready" },
  "swot": {
    "strengths":     ["2-4 bullets, each citing something the candidate said"],
    "weaknesses":    ["…"],
    "opportunities": ["small effort → big improvement; what to learn next"],
    "threats":       ["habits that cost you in real interviews"]
  },
  "perQuestion": [
    { "question": "…", "answerSummary": "…", "score": 0-10, "feedback": "…", "howToImprove": "…" }
  ]
}
```

The server strips markdown fences, safe-parses, and **per-section** falls back to a deterministic heuristic report (`server/services/scoring.ts`), so the report page always renders. Reports persist with the session in the JSON store and stay available at `/report/:id`.

## Design system

All colors, type sizes, radii, and motion curves are tokens in `src/styles/tokens.css` ("warm professional": off-white `#FAF9F6` surfaces, deep indigo `#4F46E5` primary, warm amber `#D97706` accent). Animations are transform/opacity only and respect `prefers-reduced-motion`; the interviewer character layers ambient breathing under per-state waveform / ripple / orbital animations (`src/styles/character.css`).

---

## LiveKit phone agent (optional)

The original standalone voice agent lives in `services/voice-agent/` and still works exactly as before — it is **not** required for the web app.

```bash
cd services/voice-agent
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python app/agent.py download-files   # one-time Silero VAD download
python app/agent.py dev              # connects to LiveKit Cloud
```

It needs `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `DEEPGRAM_API_KEY`, and `GROQ_API_KEY` in the environment (see `.env.example`). Talk to it via the [LiveKit Agents Playground](https://agents-playground.livekit.io).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No speech recognition | Use Chrome/Edge; Firefox lacks the Web Speech API — the app offers a typed-answer fallback automatically |
| Mic check shows "blocked" | Re-allow the microphone in the browser's site settings and reload |
| Generic/mock questions | Set `GROQ_API_KEY` in `.env` and restart `npm run dev` |
| `401` from Groq | Check the key in `.env` — no extra spaces or quotes |
