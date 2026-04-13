"""
Lesson 1: Prompting Recap
==========================
A quick reference of the 7 core prompting techniques before applying them
in production-grade prompts (Lessons 2–5).

Source: https://github.com/anthropics/courses/tree/master/real_world_prompting
"""

# 7 Essential Prompting Techniques
# ---------------------------------
# 0. Use the Prompt Generator (platform.claude.com → Console)
# 1. Be clear and direct
# 2. Use examples (multishot / few-shot prompting)
# 3. Let Claude think (chain-of-thought prompting)
# 4. Use XML tags to structure input and output
# 5. Give Claude a role (system prompts)
# 6. Long context tips (put long content near the top)

# Quick demo of each technique
from anthropic import Anthropic

client = Anthropic()

# ── 1. Be clear and direct ────────────────────────────────────────────────────
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=256,
    messages=[{
        "role": "user",
        "content": "Write a haiku about the ocean. Skip the preamble; go straight into the poem."
    }]
)
print("1. Clear & Direct:\n", response.content[0].text)

# ── 2. Few-shot examples ──────────────────────────────────────────────────────
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=256,
    messages=[{
        "role": "user",
        "content": """Classify the sentiment of each sentence as POSITIVE or NEGATIVE.

Sentence: "I love this product!" → POSITIVE
Sentence: "This is terrible." → NEGATIVE
Sentence: "I can't believe how great this is!" →"""
    }]
)
print("\n2. Few-shot:\n", response.content[0].text)

# ── 3. Chain-of-thought ───────────────────────────────────────────────────────
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=512,
    messages=[{
        "role": "user",
        "content": """Is 17 a prime number? Think through it step by step inside <thinking> tags,
then give your final answer inside <answer> tags."""
    }]
)
print("\n3. Chain-of-thought:\n", response.content[0].text)

# ── 4. XML tags ───────────────────────────────────────────────────────────────
email = "Hi, I was charged twice last month. Please help!"
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=256,
    messages=[{
        "role": "user",
        "content": f"""Classify this email as: billing, technical, account, or product.
Respond with only the category word.

<email>
{email}
</email>"""
    }]
)
print("\n4. XML tags:\n", response.content[0].text)

# ── 5. Role (system prompt) ───────────────────────────────────────────────────
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=256,
    system="You are a senior Python engineer. Answer questions concisely with code examples.",
    messages=[{
        "role": "user",
        "content": "How do I reverse a list in Python?"
    }]
)
print("\n5. Role:\n", response.content[0].text)

# ── 6. Long context tip ───────────────────────────────────────────────────────
# When passing long documents, put them FIRST, then ask your question.
# Claude pays more attention to content at the start of the prompt.
long_doc = "..." * 500  # placeholder for a real document
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=256,
    messages=[{
        "role": "user",
        "content": f"""<document>
{long_doc}
</document>

Based on the document above, what is the main topic? Answer in one sentence."""
    }]
)
print("\n6. Long context (structure):\n", response.content[0].text)
