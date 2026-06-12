import asyncio
import logging

from dotenv import load_dotenv
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.plugins import deepgram, groq, silero

load_dotenv()

logger = logging.getLogger("voice-agent")


def create_chat_ctx() -> llm.ChatContext:
    return llm.ChatContext().append(
        role="system",
        text=(
            "You are a friendly and helpful voice assistant. "
            "Keep your responses concise and conversational since they will be spoken aloud."
        ),
    )


async def entrypoint(ctx: JobContext):
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    assistant = VoiceAssistant(
        vad=silero.VAD.load(),
        stt=deepgram.STT(),
        llm=groq.LLM(model="llama3-8b-8192"),
        tts=deepgram.TTS(model="aura-asteria-en"),
        chat_ctx=create_chat_ctx(),
    )

    assistant.start(ctx.room)

    await asyncio.sleep(1)
    await assistant.say("Hey, I'm ready to chat. What's on your mind?", allow_interruptions=True)

    await asyncio.Future()


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
