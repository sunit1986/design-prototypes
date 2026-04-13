import os
import re
from anthropic import Anthropic

client = Anthropic()


def llm_call(prompt: str, system_prompt: str = "", model: str = "claude-sonnet-4-6") -> str:
    """Calls the model with the given prompt and returns the response."""
    messages = [{"role": "user", "content": prompt}]
    kwargs = {
        "model": model,
        "max_tokens": 4096,
        "temperature": 0.1,
        "messages": messages,
    }
    if system_prompt:
        kwargs["system"] = system_prompt

    response = client.messages.create(**kwargs)
    return response.content[0].text


def extract_xml(text: str, tag: str) -> str:
    """Extracts the content of the specified XML tag from the given text."""
    match = re.search(f"<{tag}>(.*?)</{tag}>", text, re.DOTALL)
    return match.group(1).strip() if match else ""
