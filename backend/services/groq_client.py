# backend/services/groq_client.py
import os
import re

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

_client = None

def get_groq_client() -> Groq:
    """Returns a singleton Groq client."""
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not found in environment variables.")
        _client = Groq(api_key=api_key)
    return _client

def _strip_thinking(text: str) -> str:
    """Removes <think>...</think> blocks, including incomplete ones."""
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
    text = re.sub(r'<think>.*', '', text, flags=re.DOTALL)
    return text.strip()

def chat(system_prompt: str, user_message: str, model: str = "openai/gpt-oss-20b", max_tokens: int = 600) -> str:
    """
    Sends a message to Groq and returns the assistant's text response.

    Args:
        system_prompt: Instructions for how the LLM should behave
        user_message: The actual question or prompt
        model: Groq model to use
        max_tokens: Maximum tokens in the response

    Returns:
        The LLM's response as a string, with thinking tags stripped
    """
    client = get_groq_client()
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        temperature=0.2,
        max_tokens=max_tokens,
    )
    raw = response.choices[0].message.content
    return _strip_thinking(raw)