"""
Orchestrator-Workers Workflow
==============================
A central orchestrator LLM analyzes a task and dynamically determines
the best subtasks. Worker LLMs then execute each subtask independently.

Best suited for tasks where:
- Multiple distinct approaches or perspectives are valuable
- The optimal breakdown depends on the specific input
- You want to compare strategies side-by-side

Based on: https://github.com/anthropics/claude-cookbooks/tree/main/patterns/agents
"""

from util import extract_xml, llm_call

MODEL = "claude-sonnet-4-6"


def parse_tasks(tasks_xml: str) -> list[dict]:
    """Parse XML task definitions into a list of task dictionaries."""
    tasks = []
    current_task = {}

    for line in tasks_xml.split("\n"):
        line = line.strip()
        if not line:
            continue

        if line.startswith("<task>"):
            current_task = {}
        elif line.startswith("<type>"):
            current_task["type"] = line[6:-7].strip()
        elif line.startswith("<description>"):
            current_task["description"] = line[12:-13].strip()
        elif line.startswith("</task>"):
            if "description" in current_task:
                if "type" not in current_task:
                    current_task["type"] = "default"
                tasks.append(current_task)

    return tasks


class FlexibleOrchestrator:
    """Break down tasks dynamically and run them via worker LLMs."""

    def __init__(
        self,
        orchestrator_prompt: str,
        worker_prompt: str,
        model: str = MODEL,
    ):
        self.orchestrator_prompt = orchestrator_prompt
        self.worker_prompt = worker_prompt
        self.model = model

    def _format_prompt(self, template: str, **kwargs) -> str:
        try:
            return template.format(**kwargs)
        except KeyError as e:
            raise ValueError(f"Missing required prompt variable: {e}") from e

    def process(self, task: str, context: dict | None = None) -> dict:
        """
        Process a task by:
        1. Having the orchestrator analyze it and define subtasks
        2. Running each subtask through a specialized worker
        """
        context = context or {}

        # Phase 1: Orchestrator analysis
        orchestrator_input = self._format_prompt(self.orchestrator_prompt, task=task, **context)
        orchestrator_response = llm_call(orchestrator_input, model=self.model)

        analysis = extract_xml(orchestrator_response, "analysis")
        tasks_xml = extract_xml(orchestrator_response, "tasks")
        tasks = parse_tasks(tasks_xml)

        print("\n" + "=" * 80)
        print("ORCHESTRATOR ANALYSIS")
        print("=" * 80)
        print(f"\n{analysis}\n")
        print("\n" + "=" * 80)
        print(f"IDENTIFIED {len(tasks)} APPROACHES")
        print("=" * 80)
        for i, t in enumerate(tasks, 1):
            print(f"\n{i}. {t['type'].upper()}")
            print(f"   {t['description']}")

        # Phase 2: Workers
        print("\n" + "=" * 80)
        print("GENERATING CONTENT")
        print("=" * 80 + "\n")

        worker_results = []
        for i, task_info in enumerate(tasks, 1):
            print(f"[{i}/{len(tasks)}] Processing: {task_info['type']}...")

            worker_input = self._format_prompt(
                self.worker_prompt,
                original_task=task,
                task_type=task_info["type"],
                task_description=task_info["description"],
                **context,
            )

            worker_response = llm_call(worker_input, model=self.model)
            worker_content = extract_xml(worker_response, "response")

            if not worker_content or not worker_content.strip():
                print(f"Warning: Worker '{task_info['type']}' returned no content")
                worker_content = f"[Error: Worker '{task_info['type']}' failed to generate content]"

            worker_results.append({
                "type": task_info["type"],
                "description": task_info["description"],
                "result": worker_content,
            })

        # Display results
        print("\n" + "=" * 80)
        print("RESULTS")
        print("=" * 80)
        for i, result in enumerate(worker_results, 1):
            print(f"\n{'-' * 80}")
            print(f"Approach {i}: {result['type'].upper()}")
            print(f"{'-' * 80}")
            print(f"\n{result['result']}\n")

        return {"analysis": analysis, "worker_results": worker_results}


# ---------------------------------------------------------------------------
# Example prompts
# ---------------------------------------------------------------------------

ORCHESTRATOR_PROMPT = """Analyze this task and break it down into 2-3 distinct approaches:

Task: {task}

Return your response in this format:

<analysis>
Explain your understanding of the task and which variations would be valuable.
</analysis>

<tasks>
    <task>
    <type>formal</type>
    <description>Write a precise, technical version that emphasizes specifications</description>
    </task>
    <task>
    <type>conversational</type>
    <description>Write an engaging, friendly version that connects with readers</description>
    </task>
</tasks>"""

WORKER_PROMPT = """Generate content based on:
Task: {original_task}
Style: {task_type}
Guidelines: {task_description}

Return your response in this format:

<response>
Your content here, maintaining the specified style and fully addressing requirements.
</response>"""


if __name__ == "__main__":
    orchestrator = FlexibleOrchestrator(
        orchestrator_prompt=ORCHESTRATOR_PROMPT,
        worker_prompt=WORKER_PROMPT,
    )

    results = orchestrator.process(
        task="Write a product description for a new eco-friendly water bottle",
        context={
            "target_audience": "environmentally conscious millennials",
            "key_features": ["plastic-free", "insulated", "lifetime warranty"],
        },
    )
