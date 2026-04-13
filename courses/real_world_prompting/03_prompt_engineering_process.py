"""
Lesson 3: The Prompt Engineering Process
=========================================
Prompt engineering is "the art and science of crafting effective instructions
for LLMs to produce desired outputs — repeatably."

This lesson covers the methodology: how to think about building any prompt
from scratch, not just the techniques themselves.

Source: https://github.com/anthropics/courses/tree/master/real_world_prompting
"""

# ── What is prompt engineering? ───────────────────────────────────────────────
#
# More than just asking questions — it's a systematic process:
#
# 1. DEFINE THE TASK
#    - What exactly do you want Claude to produce?
#    - What are the inputs? What's the ideal output?
#    - What does failure look like?
#
# 2. START SIMPLE
#    - Write the most direct prompt possible first
#    - Identify what's wrong before adding complexity
#    - Don't over-engineer before you know what's needed
#
# 3. ADD TECHNIQUES ONE AT A TIME
#    - System prompt (role)
#    - XML tags (structure)
#    - Clear instructions (specificity)
#    - Examples (few-shot)
#    - Chain-of-thought (reasoning)
#    - Output format (XML, JSON, markdown)
#    Each addition should solve a specific identified problem
#
# 4. TEST ACROSS EDGE CASES
#    - Happy path: standard input
#    - Edge cases: unusual, ambiguous, or adversarial input
#    - Volume: does it hold up across 50+ examples, not just 3?
#
# 5. ITERATE
#    - Prompt engineering is scientific trial-and-error
#    - Change one thing at a time so you know what helped
#    - Keep a log of what you tried and what changed
#
# ── The Prompt Engineering Lifecycle ─────────────────────────────────────────
#
#   Define goal
#       ↓
#   Write first draft
#       ↓
#   Test on examples  ←─────────────────┐
#       ↓                               │
#   Identify failures                   │
#       ↓                               │
#   Add / adjust technique  ────────────┘
#       ↓
#   Deploy + monitor
#
# ── Key distinctions: basic prompting vs. prompt engineering ─────────────────
#
# | Dimension      | Basic prompting          | Prompt engineering          |
# |----------------|--------------------------|---------------------------  |
# | Complexity     | Single simple request    | Multi-step, multi-technique |
# | Precision      | Approximate output OK    | Exact format required       |
# | Iteration      | One-shot                 | Systematic refinement       |
# | Scalability    | One-off                  | Runs on thousands of inputs |
#
# ── Worked example: building a prompt systematically ─────────────────────────

from anthropic import Anthropic

client = Anthropic()

# TASK: Classify support tickets and route them to the right team.
# Input: free-text ticket. Output: exactly one of {billing, technical, account, product}

# ── Draft 1: too vague ────────────────────────────────────────────────────────
draft_1 = "What kind of support ticket is this? {ticket}"

# Problem identified: output varies wildly — sometimes a word, sometimes a sentence.

# ── Draft 2: add format instruction ──────────────────────────────────────────
draft_2 = """Classify the following support ticket into exactly one category.
Categories: billing, technical, account, product
Respond with only the category word, nothing else.

Ticket: {ticket}"""

# Problem identified: ambiguous tickets get wrong category, no reasoning visible.

# ── Draft 3: add role + chain-of-thought + XML ───────────────────────────────
system = "You are a customer support routing specialist with 10 years of experience."

draft_3 = """Classify the following support ticket into exactly one category.
Categories: billing, technical, account, product

Think through your reasoning step by step, then give your final answer.

<ticket>
{ticket}
</ticket>

Respond in this format:
<reasoning>Your step-by-step thinking</reasoning>
<category>chosen category</category>"""

# ── Draft 4: add few-shot examples for ambiguous cases ───────────────────────
draft_4 = """Classify the following support ticket into exactly one category.
Categories: billing, technical, account, product

<examples>
<example>
<ticket>I was charged twice this month</ticket>
<category>billing</category>
</example>
<example>
<ticket>The app crashes when I try to export a PDF</ticket>
<category>technical</category>
</example>
<example>
<ticket>I need to change the email on my account</ticket>
<category>account</category>
</example>
<example>
<ticket>Does your product support dark mode?</ticket>
<category>product</category>
</example>
</examples>

Now classify this ticket. Think through your reasoning, then give your final answer.

<ticket>
{ticket}
</ticket>

<reasoning>Your step-by-step thinking</reasoning>
<category>chosen category</category>"""


def classify_ticket(ticket: str, draft: str, use_system: bool = False) -> str:
    prompt = draft.format(ticket=ticket)
    kwargs = {
        "model": "claude-sonnet-4-6",
        "max_tokens": 512,
        "messages": [{"role": "user", "content": prompt}],
    }
    if use_system:
        kwargs["system"] = system
    response = client.messages.create(**kwargs)
    return response.content[0].text


# ── Test all drafts on the same ticket to see improvement ────────────────────
if __name__ == "__main__":
    test_tickets = [
        "I was charged twice this month and need a refund.",
        "The app keeps freezing when I upload files larger than 10MB.",
        "I want to cancel my subscription but can't find the button.",
        "Can your tool integrate with Salesforce?",
        # Edge case: ambiguous
        "My invoice shows a charge I don't recognize, and when I click the link it 404s.",
    ]

    for ticket in test_tickets:
        print(f"\nTicket: {ticket}")
        print(f"Draft 1: {classify_ticket(ticket, draft_1)}")
        print(f"Draft 3: {classify_ticket(ticket, draft_3, use_system=True)}")
        print(f"Draft 4: {classify_ticket(ticket, draft_4, use_system=True)}")
        print("-" * 60)
