"""
Basic Agent Workflow Patterns
=============================
Three foundational patterns for multi-LLM workflows:

1. Prompt Chaining  - sequential LLM calls where each output feeds the next
2. Parallelization  - concurrent LLM calls for independent subtasks
3. Routing          - classify input and direct it to a specialized handler

Based on: https://github.com/anthropics/claude-cookbooks/tree/main/patterns/agents
"""

from concurrent.futures import ThreadPoolExecutor
from util import extract_xml, llm_call


# ---------------------------------------------------------------------------
# 1. Prompt Chaining
# ---------------------------------------------------------------------------

def chain(input_text: str, prompts: list[str]) -> str:
    """
    Run a sequence of LLM calls where each step's output becomes the next step's input.

    Example use case: raw data → extract → summarize → format as markdown
    """
    result = input_text
    for i, prompt in enumerate(prompts):
        print(f"\n--- Chain step {i + 1}/{len(prompts)} ---")
        result = llm_call(f"{prompt}\nInput: {result}")
        print(result)
    return result


# Example usage
CHAIN_PROMPTS = [
    "Extract the key financial metrics from this text. Be concise.",
    "Identify any risks or concerns from these metrics.",
    "Format the metrics and risks into a clean markdown summary table.",
]

# chain("Q3 revenue was $4.2M, up 18% YoY. Margins compressed to 32%. Cash burn at $800K/month.", CHAIN_PROMPTS)


# ---------------------------------------------------------------------------
# 2. Parallelization
# ---------------------------------------------------------------------------

def parallel(prompt: str, inputs: list[str], max_workers: int = 4) -> list[str]:
    """
    Run the same prompt over multiple inputs concurrently.

    Example use case: analyze the same market event from 4 stakeholder perspectives
    """
    def process(input_text: str) -> str:
        return llm_call(f"{prompt}\n\nInput: {input_text}")

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        results = list(executor.map(process, inputs))

    for i, (inp, out) in enumerate(zip(inputs, results)):
        print(f"\n--- Result {i + 1}: {inp[:60]}... ---")
        print(out)

    return results


# Example usage
STAKEHOLDERS = [
    "retail investors",
    "institutional investors",
    "company employees",
    "industry analysts",
]
# parallel("Analyze the impact of a 15% earnings miss on:", STAKEHOLDERS)


# ---------------------------------------------------------------------------
# 3. Routing
# ---------------------------------------------------------------------------

ROUTER_PROMPT = """Classify the following customer support ticket into exactly one category.
Categories: billing, technical, account, product

Think through your reasoning, then give your final answer.

Respond in this format:
<reasoning>your chain-of-thought here</reasoning>
<category>chosen category</category>

Ticket: {ticket}"""

SPECIALIZED_PROMPTS = {
    "billing": "You are a billing specialist. Help resolve this billing issue professionally:\n{ticket}",
    "technical": "You are a senior engineer. Provide a technical solution for:\n{ticket}",
    "account": "You are an account manager. Address this account concern with empathy:\n{ticket}",
    "product": "You are a product expert. Answer this product question thoroughly:\n{ticket}",
}


def route(ticket: str) -> str:
    """
    Classify input and route it to the appropriate specialized handler.

    Example use case: customer support ticket triage
    """
    # Step 1: classify
    router_response = llm_call(ROUTER_PROMPT.format(ticket=ticket))
    category = extract_xml(router_response, "category").strip().lower()
    reasoning = extract_xml(router_response, "reasoning")

    print(f"\n--- Router decision: '{category}' ---")
    print(f"Reasoning: {reasoning}")

    # Step 2: handle with specialist
    specialist_prompt = SPECIALIZED_PROMPTS.get(category, SPECIALIZED_PROMPTS["technical"])
    response = llm_call(specialist_prompt.format(ticket=ticket))

    print(f"\n--- Specialist response ---")
    print(response)
    return response


# Example usage
# route("I was charged twice for my subscription this month and need a refund.")
