"""
Lesson 5: Customer Support Chatbot
====================================
Goal: Build an AcmeOS technical support assistant that:
- Answers questions using a fixed knowledge base
- Rejects off-topic, harmful, or profane questions consistently
- Never mentions the knowledge base or that it was "provided context"
- Uses <thinking> + <final_answer> tags to separate reasoning from output

Shows iterative improvement through 3 prompt drafts.

Source: https://github.com/anthropics/courses/tree/master/real_world_prompting
"""

import re
from anthropic import Anthropic

client = Anthropic()

# ── Knowledge base ────────────────────────────────────────────────────────────

ACME_OS_KNOWLEDGE_BASE = """
AcmeOS Technical Support Knowledge Base

SYSTEM REQUIREMENTS:
- Processor: 1.5 GHz dual-core or higher
- RAM: 4GB minimum, 8GB recommended
- Storage: 64GB minimum free space
- Display: 1280x720 minimum resolution
- Internet: Required for initial setup and updates

INSTALLATION:
1. Download the AcmeOS installer from the official website
2. Run the installer as administrator
3. Accept the license agreement
4. Choose installation directory (default recommended)
5. Wait for installation to complete (15-30 minutes)
6. Restart your computer when prompted

UPDATES:
- AcmeOS checks for updates automatically every 7 days
- Manual check: Settings > System > Check for Updates
- Updates download in the background and install on next restart
- Update history: Settings > System > Update History

ERROR CODES:
- ERR_001: Insufficient disk space — free up at least 10GB and retry
- ERR_002: Network connection required — check internet connection
- ERR_003: Corrupted installation files — re-download installer
- ERR_004: Incompatible hardware — check system requirements
- ERR_005: License validation failed — check license key and internet

PERFORMANCE OPTIMIZATION:
- Disable unused startup programs: Settings > Startup Manager
- Run disk cleanup: Tools > Disk Cleanup
- Adjust visual effects: Settings > Performance > Visual Effects
- Enable hardware acceleration: Settings > Display > Hardware Acceleration

BACKUP & RECOVERY:
- Create backup: Tools > Backup > Create New Backup
- Restore from backup: Tools > Backup > Restore
- Auto-backup: Settings > Backup > Enable Auto Backup (daily/weekly/monthly)
- Cloud backup: Requires AcmeOS Pro subscription

SECURITY:
- Built-in firewall enabled by default
- Antivirus: Settings > Security > Antivirus
- Automatic security updates: enabled by default
- Two-factor authentication: Settings > Account > 2FA

ACCESSIBILITY:
- Screen reader support: Settings > Accessibility > Screen Reader
- High contrast mode: Settings > Accessibility > Display
- Text size: Settings > Accessibility > Text Size (75%-200%)
- Keyboard shortcuts: Settings > Accessibility > Keyboard

TROUBLESHOOTING:
- Safe mode: Hold F8 during startup
- System restore: Tools > System Restore
- Reset to defaults: Settings > System > Factory Reset (WARNING: deletes all data)
- Diagnostic tool: Tools > System Diagnostics

LICENSING:
- AcmeOS Home: single device, personal use
- AcmeOS Pro: up to 3 devices, includes cloud backup and priority support
- AcmeOS Business: unlimited devices, volume licensing available
- License transfer: Settings > Account > Transfer License
"""

# ── Draft 1: Basic (has problems) ────────────────────────────────────────────

draft_1_system = f"""
You are AcmeOS Assistant, a technical support chatbot for AcmeOS.
Use the following information to answer user questions:

{ACME_OS_KNOWLEDGE_BASE}

Be helpful and concise.
"""

# Problems: answers off-topic questions, mentions "provided information"

# ── Draft 2: Better scope (still has problems) ───────────────────────────────

draft_2_system = f"""
You are AcmeOS Assistant, a technical support chatbot for AcmeOS.

Use the following information to answer user questions:
{ACME_OS_KNOWLEDGE_BASE}

Rules:
- Only answer questions about AcmeOS
- Reject off-topic questions politely
- Never mention that you have a knowledge base or provided context
"""

# Problems: still sometimes says "based on the information provided"

# ── Draft 3: Production-ready (strict, structured) ────────────────────────────

draft_3_system = f"""
You are AcmeOS Assistant, a technical support chatbot for AcmeOS software.

<knowledge_base>
{ACME_OS_KNOWLEDGE_BASE}
</knowledge_base>

IMPORTANT RULES:
1. You are an expert on AcmeOS. All knowledge you have about AcmeOS is your own expertise —
   never say "based on the information provided" or "according to my context." Speak as an expert.
2. ONLY answer questions directly related to AcmeOS installation, usage, troubleshooting, or features.
3. For ANY off-topic question (other software, general computing, personal questions, harmful content,
   profanity), respond with exactly: "I'm only able to assist with AcmeOS-related questions."
4. Always think through your answer inside <thinking> tags before writing your final response.
5. Write your final response to the user inside <final_answer> tags only.
"""


def chat(user_message: str, draft: int = 3) -> str:
    """Send a message to the AcmeOS chatbot and return the visible response."""
    system = {1: draft_1_system, 2: draft_2_system, 3: draft_3_system}[draft]

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system,
        messages=[{"role": "user", "content": user_message}]
    )
    text = response.content[0].text

    if draft == 3:
        # Extract only the final answer — hide the thinking
        match = re.search(r"<final_answer>\s*(.*?)\s*</final_answer>", text, re.DOTALL)
        return match.group(1) if match else text
    return text


# ── Multi-turn conversation helper ────────────────────────────────────────────

def run_conversation(messages: list[dict]) -> str:
    """Run a multi-turn conversation with the Draft 3 chatbot."""
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=draft_3_system,
        messages=messages
    )
    text = response.content[0].text
    match = re.search(r"<final_answer>\s*(.*?)\s*</final_answer>", text, re.DOTALL)
    return match.group(1) if match else text


# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    test_questions = [
        # On-topic
        "How do I install AcmeOS?",
        "What does error code ERR_003 mean?",
        "How do I enable two-factor authentication?",
        "What are the system requirements?",
        # Off-topic / harmful
        "How do I install Windows 11?",
        "Can you write me a poem?",
        "What's the weather like today?",
        "How do I hack into a computer?",
    ]

    print("=== Draft 1 vs Draft 3 comparison ===\n")
    for question in test_questions[:4]:  # just on-topic for comparison
        print(f"Q: {question}")
        print(f"  Draft 1: {chat(question, draft=1)[:120]}...")
        print(f"  Draft 3: {chat(question, draft=3)[:120]}...")
        print()

    print("\n=== Draft 3: off-topic rejection ===\n")
    for question in test_questions[4:]:
        print(f"Q: {question}")
        print(f"  A: {chat(question, draft=3)}")
        print()

    print("\n=== Multi-turn conversation ===\n")
    conversation = [
        {"role": "user", "content": "My AcmeOS keeps showing ERR_001. What should I do?"},
    ]
    reply = run_conversation(conversation)
    print(f"User: {conversation[0]['content']}")
    print(f"Assistant: {reply}\n")

    conversation.append({"role": "assistant", "content": reply})
    conversation.append({"role": "user", "content": "I freed up space but it's still happening."})
    reply2 = run_conversation(conversation)
    print(f"User: {conversation[-1]['content']}")
    print(f"Assistant: {reply2}")
