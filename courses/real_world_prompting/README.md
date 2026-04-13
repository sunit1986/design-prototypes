# Real World Prompting

Practical, production-grade prompt engineering with Claude.
Sequel to the Interactive Tutorial — applies all the core techniques to real use cases.

Source: https://github.com/anthropics/courses/tree/master/real_world_prompting

## Setup

```bash
pip install anthropic python-dotenv
export ANTHROPIC_API_KEY=your_key_here
```

## Lessons

| File | What you build | Key techniques |
|---|---|---|
| `01_prompting_recap.py` | Quick demos of all 7 core techniques | role, XML, few-shot, CoT, prefill |
| `02_medical_prompt.py` | Medical record summarizer | bad→good prompt evolution, JSON output |
| `03_prompt_engineering_process.py` | Support ticket classifier | systematic iteration methodology |
| `04_call_summarizer.py` | Call transcript summarizer | edge case handling, INSUFFICIENT_DATA |
| `05_customer_support_ai.py` | AcmeOS support chatbot | multi-turn, knowledge base, scope control |

## The 7 Core Techniques (Lesson 1)

1. Use the Prompt Generator (platform.claude.com)
2. Be clear and direct
3. Use examples (few-shot prompting)
4. Let Claude think (chain-of-thought)
5. Use XML tags
6. Give Claude a role (system prompt)
7. Long context tips — put long content first

## The Prompt Engineering Process (Lesson 3)

```
Define goal → Write simple draft → Test on examples
    → Identify failures → Add one technique → Repeat → Deploy
```

Change one thing at a time. Test on edge cases, not just the happy path.

## Run any lesson

```bash
python 02_medical_prompt.py
python 05_customer_support_ai.py
```
