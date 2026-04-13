"""
Lesson 4: Call Transcript Summarizer
======================================
Goal: Convert raw customer service call transcripts into structured,
machine-readable JSON summaries — and gracefully handle problematic calls
(garbled audio, incomplete exchanges, language barriers).

Source: https://github.com/anthropics/courses/tree/master/real_world_prompting
"""

import json
import re
from anthropic import Anthropic

client = Anthropic()

# ── Sample transcripts ────────────────────────────────────────────────────────

transcripts = [
    # Complete, clean interaction
    """
Agent: Thank you for calling Acme Support. How can I help you today?
Customer: Hi, my smart thermostat keeps disconnecting from Wi-Fi every few hours.
Agent: I'm sorry to hear that. Can I get your device serial number?
Customer: Sure, it's ACM-2024-78523.
Agent: Thank you. I can see your device is running firmware 2.1.4. There's a known
  Wi-Fi stability issue in that version. I'll push firmware 2.1.5 to your device now.
Customer: How long will that take?
Agent: About 5 minutes. Once complete, your thermostat will reconnect automatically.
  If the issue persists after 24 hours, call us back and we'll arrange a replacement.
Customer: Great, thank you!
Agent: Is there anything else I can help you with today?
Customer: No, that's everything. Thanks!
Agent: Have a great day! Goodbye.
    """,
    # Incomplete — requires follow-up
    """
Agent: Acme Support, how can I help?
Customer: My smart lock stopped responding to the app three days ago.
  I've tried restarting it and reinstalling the app but nothing works.
Agent: I'm sorry to hear that. Let me look into this. Can I get your account email?
Customer: It's jsmith@email.com.
Agent: I see your account. Your lock firmware is up to date. This might be a hardware
  issue. I'll escalate this to our technical team — they'll email you within 48 hours
  with next steps, which may include a replacement.
Customer: Ok, I'll wait for the email. Thanks.
    """,
    # Garbled / insufficient data
    """
Agent: Acme Support, how can I help?
Customer: Bzzt... static... my device is... [garbled]... not working since...
Agent: I'm sorry, I'm having trouble hearing you. Could you repeat that?
Customer: [garbled] ...three days... [static] ...the screen shows...
Agent: I'm still having difficulty hearing you. Could you try calling from a different phone?
Customer: [line goes dead]
    """,
]

# ── System prompt ─────────────────────────────────────────────────────────────

system = """
You are an expert customer service analyst for Acme Corporation, a smart home device company.
Your role is to analyze call transcripts and extract key information into structured summaries.
Focus on accuracy and brevity. Never include personally identifiable information in summaries.
"""

# ── Main prompt ───────────────────────────────────────────────────────────────

prompt_template = """
Analyze the following customer service call transcript and provide a structured summary.

<transcript>
{transcript}
</transcript>

If the transcript contains a clear, complete interaction, output a JSON summary inside <summary> tags
with this exact structure:
{{
  "status": "COMPLETE",
  "summary": {{
    "customerIssue": "One sentence describing the customer's problem",
    "resolution": "One sentence describing how it was resolved",
    "followUpRequired": true or false,
    "followUpDetails": "Details if follow-up needed, otherwise null"
  }},
  "ambiguities": ["Any unclear points that may need clarification"]
}}

If the transcript is garbled, incomplete, or lacks enough information to summarize meaningfully,
output only:
{{"status": "INSUFFICIENT_DATA"}}

Think through the transcript carefully before responding. Put your thinking inside <thinking> tags,
then output your final JSON inside <summary> tags.

Examples of when to output INSUFFICIENT_DATA:
- Audio is garbled or call drops before resolution
- Language barrier prevents understanding the issue
- Transcript cuts off before any real exchange
"""

# ── Functions ─────────────────────────────────────────────────────────────────

def summarize_transcript(transcript: str) -> dict | None:
    prompt = prompt_template.format(transcript=transcript)
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system,
        messages=[{"role": "user", "content": prompt}]
    )
    text = response.content[0].text

    # Extract <summary> content
    match = re.search(r"<summary>\s*(.*?)\s*</summary>", text, re.DOTALL)
    if not match:
        print("Warning: No <summary> tags found in response.")
        return None

    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        print("Warning: Could not parse JSON from summary.")
        return None


def process_all_transcripts(transcript_list: list[str]) -> None:
    for i, transcript in enumerate(transcript_list, 1):
        print(f"\n{'=' * 60}")
        print(f"Transcript {i}")
        print("=" * 60)
        result = summarize_transcript(transcript)
        if result:
            print(json.dumps(result, indent=2))
        else:
            print("Failed to process transcript.")


# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    process_all_transcripts(transcripts)
