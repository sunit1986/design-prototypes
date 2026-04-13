# Agent Patterns

Reference implementations of the core agent workflow patterns from Anthropic's
[Building Effective Agents](https://anthropic.com/research/building-effective-agents) research.

## Setup

```bash
pip install anthropic
export ANTHROPIC_API_KEY=your_key_here
```

## Patterns

### 1. Basic Workflows (`basic_workflows.py`)

Three foundational building blocks:

| Pattern | When to use |
|---|---|
| **Prompt Chaining** | Sequential steps where each output feeds the next (extract → analyze → format) |
| **Parallelization** | Same prompt over multiple independent inputs concurrently |
| **Routing** | Classify input first, then dispatch to a specialized handler |

```python
from basic_workflows import chain, parallel, route

# Chain: raw data through 3 transform steps
result = chain(raw_data, [step1_prompt, step2_prompt, step3_prompt])

# Parallel: analyze 4 stakeholder perspectives at once
results = parallel("Analyze the impact on:", ["investors", "employees", "customers", "regulators"])

# Route: triage a support ticket to the right specialist
response = route("I was charged twice this month and need a refund.")
```

---

### 2. Evaluator-Optimizer (`evaluator_optimizer.py`)

One LLM generates, another evaluates. Loop until `PASS`.

```python
from evaluator_optimizer import loop

result, history = loop(
    task="Implement a MinStack with O(1) getMin()",
    evaluator_prompt=EVALUATOR_PROMPT,
    generator_prompt=GENERATOR_PROMPT,
)
```

Best for: code generation, writing refinement, any task with clear quality criteria.

---

### 3. Orchestrator-Workers (`orchestrator_workers.py`)

Orchestrator dynamically breaks a task into subtasks; workers execute in sequence.

```python
from orchestrator_workers import FlexibleOrchestrator

orchestrator = FlexibleOrchestrator(
    orchestrator_prompt=ORCHESTRATOR_PROMPT,
    worker_prompt=WORKER_PROMPT,
)

results = orchestrator.process(
    task="Write a product description for our new water bottle",
    context={"target_audience": "millennials", "key_features": ["eco-friendly", "insulated"]},
)
```

Best for: generating multiple variations, comparing approaches, tasks where the ideal
breakdown depends on the specific input.

---

## Files

```
patterns/agents/
├── README.md                  # This file
├── util.py                    # llm_call() and extract_xml() helpers
├── basic_workflows.py         # chain, parallel, route
├── evaluator_optimizer.py     # generate / evaluate / loop
└── orchestrator_workers.py    # FlexibleOrchestrator + parse_tasks
```
