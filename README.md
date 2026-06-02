# LiveKit Voice Agent

A real-time voice agent built with the LiveKit Agents framework.

**Stack:**
- **STT** — Deepgram Nova-2
- **LLM** — Groq (Llama 3 8B)
- **TTS** — Deepgram Aura (Asteria voice)
- **VAD** — Silero (bundled, no extra key needed)

---

## API Keys You Need

| Service | Where to get it | `.env` variable |
|---------|----------------|-----------------|
| **LiveKit Cloud** — URL | cloud.livekit.io → Project → Settings → Keys | `LIVEKIT_URL` |
| **LiveKit Cloud** — API Key | same page | `LIVEKIT_API_KEY` |
| **LiveKit Cloud** — API Secret | same page | `LIVEKIT_API_SECRET` |
| **Deepgram** | console.deepgram.com → API Keys | `DEEPGRAM_API_KEY` |
| **Groq** | console.groq.com → API Keys | `GROQ_API_KEY` |

---

## Local Setup

```bash
# 1. Clone and enter the repo
git clone https://github.com/2007sachin/voice-agent.git
cd voice-agent

# 2. Create a virtual environment
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy the example env file and fill in your keys
cp .env.example .env
# Open .env and replace every placeholder value with a real key

# 5. Download the Silero VAD model (one-time)
python agent.py download-files

# 6. Run the agent in dev mode (connects to LiveKit Cloud, watches for jobs)
python agent.py dev
```

When you see `connected to LiveKit Cloud`, the agent is running and waiting for a caller.

---

## Talk to It in Your Browser (LiveKit Hosted Test Page)

1. Go to [https://agents-playground.livekit.io](https://agents-playground.livekit.io).
2. Click **Connect**.
3. Enter your **LiveKit URL**, **API Key**, and **API Secret** in the fields shown.
4. Click **Connect** — a room is created and the agent joins automatically.
5. Allow microphone access and start talking.

> The playground generates a short-lived token client-side using your credentials, so your keys stay in the browser only.

---

## Deploy to LiveKit Cloud (Managed Agent)

LiveKit Cloud can run your agent for you so you don't need a local machine.

### Prerequisites

```bash
pip install livekit-cli          # installs the `lk` CLI
lk cloud login                   # browser OAuth to your LiveKit account
```

### Deploy

```bash
lk cloud agent deploy \
  --project <your-project-name> \
  --name voice-agent \
  --entrypoint agent.py \
  --env DEEPGRAM_API_KEY=<key> \
  --env GROQ_API_KEY=<key>
```

LiveKit Cloud injects `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` automatically — you do **not** pass them via `--env`.

### Verify

```bash
lk cloud agent list --project <your-project-name>
```

Once the agent shows `RUNNING`, open the [playground](https://agents-playground.livekit.io) again and it will dispatch jobs to your cloud-hosted agent instead of the local one.

---

## Project Structure

```
voice-agent/
├── agent.py          # main agent entrypoint
├── requirements.txt  # Python dependencies
├── .env.example      # template — copy to .env and fill in keys
├── .gitignore        # keeps .env out of git
└── README.md
```

---

## Common Issues

| Problem | Fix |
|---------|-----|
| `No module named 'livekit'` | Run `pip install -r requirements.txt` inside your venv |
| Agent connects but no audio | Check microphone permissions in the browser |
| `401 Unauthorized` from Deepgram/Groq | Double-check the key in `.env` — no extra spaces or quotes |
| Agent doesn't appear in playground | Make sure `python agent.py dev` is still running (or cloud deploy succeeded) |
