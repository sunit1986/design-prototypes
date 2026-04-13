"""
Evaluator-Optimizer Workflow
=============================
One LLM generates a solution; another evaluates it and provides feedback.
The loop continues until the evaluator is satisfied (returns PASS).

Best suited for tasks where:
- There are clear evaluation criteria
- Iterative refinement meaningfully improves results
- The model can provide actionable critique

Based on: https://github.com/anthropics/claude-cookbooks/tree/main/patterns/agents
"""

from util import extract_xml, llm_call


def generate(prompt: str, task: str, context: str = "") -> tuple[str, str]:
    """Generate (or improve) a solution, optionally using prior feedback as context."""
    full_prompt = f"{prompt}\n{context}\nTask: {task}" if context else f"{prompt}\nTask: {task}"
    response = llm_call(full_prompt)
    thoughts = extract_xml(response, "thoughts")
    result = extract_xml(response, "response")

    print("\n=== GENERATION START ===")
    print(f"Thoughts:\n{thoughts}\n")
    print(f"Generated:\n{result}")
    print("=== GENERATION END ===\n")

    return thoughts, result


def evaluate(prompt: str, content: str, task: str) -> tuple[str, str]:
    """Evaluate a solution against the original task requirements."""
    full_prompt = f"{prompt}\nOriginal task: {task}\nContent to evaluate: {content}"
    response = llm_call(full_prompt)
    evaluation = extract_xml(response, "evaluation")
    feedback = extract_xml(response, "feedback")

    print("=== EVALUATION START ===")
    print(f"Status: {evaluation}")
    print(f"Feedback: {feedback}")
    print("=== EVALUATION END ===\n")

    return evaluation, feedback


def loop(task: str, evaluator_prompt: str, generator_prompt: str) -> tuple[str, list[dict]]:
    """
    Iteratively generate and evaluate until the evaluator returns PASS.

    Returns the final accepted result and the full chain-of-thought history.
    """
    memory = []
    chain_of_thought = []

    # Initial generation
    thoughts, result = generate(generator_prompt, task)
    memory.append(result)
    chain_of_thought.append({"thoughts": thoughts, "result": result})

    while True:
        evaluation, feedback = evaluate(evaluator_prompt, result, task)

        if evaluation.strip().upper() == "PASS":
            print("=== ACCEPTED ===")
            return result, chain_of_thought

        # Build context from prior attempts + feedback
        context = "\n".join(
            ["Previous attempts:", *[f"- {m}" for m in memory], f"\nFeedback: {feedback}"]
        )

        thoughts, result = generate(generator_prompt, task, context)
        memory.append(result)
        chain_of_thought.append({"thoughts": thoughts, "result": result})


# ---------------------------------------------------------------------------
# Example: iterative coding task
# ---------------------------------------------------------------------------

GENERATOR_PROMPT = """You are an expert Python engineer. Generate clean, well-documented code.

Respond in this format:
<thoughts>
Your reasoning about the approach and design decisions.
</thoughts>
<response>
The complete Python code.
</response>"""

EVALUATOR_PROMPT = """You are a senior code reviewer. Evaluate the provided code strictly.

Check for:
- Correctness and edge case handling
- Type hints on all functions
- Docstrings on all public methods
- Proper exception handling

Respond in this format:
<evaluation>PASS or NEEDS_IMPROVEMENT</evaluation>
<feedback>
Specific, actionable feedback. If PASS, write "Looks good."
</feedback>"""


if __name__ == "__main__":
    task = "Implement a MinStack class that supports push, pop, top, and getMin in O(1) time."
    final_result, history = loop(task, EVALUATOR_PROMPT, GENERATOR_PROMPT)
    print(f"\nCompleted in {len(history)} iteration(s).")
