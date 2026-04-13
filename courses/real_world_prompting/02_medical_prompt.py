"""
Lesson 2: Real-World Prompt — Medical Record Summarizer
========================================================
Goal: Take long patient medical records and generate consistent, structured
summaries to help doctors prepare for upcoming appointments.

Shows the full journey: bad prompt → improved prompt → JSON output.

Source: https://github.com/anthropics/courses/tree/master/real_world_prompting
"""

import re
import json
from anthropic import Anthropic

client = Anthropic()

# ── Sample patient records ────────────────────────────────────────────────────

patient_records = [
    """
Patient Name: Evelyn Thompson
Age: 78
Medical Record:

1985: Diagnosed with type 2 diabetes, started on metformin
1992: Developed hypertension, prescribed lisinopril
1998: Total hip replacement (right) due to osteoarthritis
2000: Diagnosed with hypothyroidism, started on levothyroxine
2003: Cataract surgery (both eyes)
2005: Admitted for atrial fibrillation, started on warfarin
2008: Vitamin B12 deficiency diagnosed, monthly injections started
2010: Increased metformin dose due to rising A1C levels
2011: Admitted for transient ischemic attack (TIA), added aspirin to regimen
2013: Diagnosed with stage 2 breast cancer, underwent lumpectomy and radiation
2014: Started on anastrozole for breast cancer recurrence prevention
2015: Developed chronic kidney disease (CKD) stage 3, metformin adjusted
2017: Total knee replacement (left) due to osteoarthritis
2018: Hospitalized for pneumonia, treated with IV antibiotics
2019: Mild cognitive impairment noted, started on donepezil
2020: Lisinopril dosage increased due to refractory hypertension
2021: Recurrent UTIs, prescribed low-dose prophylactic antibiotics
2022: Annual mammogram clear, but eGFR shows worsening kidney function
2023: Mobility declining, started physical therapy and home health aide visits
    """,
    """
Patient Name: Marcus Reyes
Age: 42
Medical Record:

2001: Diagnosed with generalized anxiety disorder (GAD), started on paroxetine
2003: Diagnosed with major depressive disorder (MDD), added bupropion
2005: Hospitalized for suicidal ideation, added cognitive behavioral therapy (CBT)
2007: Diagnosed with ADHD, started on methylphenidate
2009: Switched from paroxetine to escitalopram due to side effects
2012: Diagnosed with obstructive sleep apnea (OSA), started CPAP therapy
2014: Diagnosed with hypertension, started on losartan
2016: Diagnosed with type 2 diabetes, started on metformin
2017: Hospitalized for diabetic ketoacidosis (DKA), insulin therapy initiated
2018: Switched from bupropion to venlafaxine due to nightmares
2019: GERD diagnosis, started on omeprazole
2020: Divorce, increased therapy sessions, added dialectical behavior therapy (DBT)
2021: Developed plantar fasciitis, prescribed orthotics and physical therapy
2023: Attempted suicide, inpatient psychiatric treatment for 30 days
2023: Post-discharge, started on quetiapine and lamotrigine
2024: Reports improvement in mood and sleep, weight loss noted
2024: A1C levels improved, insulin dose decreased
    """,
    """
Patient Name: Jason Tran
Age: 25
Medical Record:

2010 (11 yrs): Diagnosed with asthma, started on albuterol inhaler
2012 (13 yrs): First football concussion, brief loss of consciousness
2014 (15 yrs): Second concussion, post-concussion syndrome
  - Symptoms: headaches, dizziness, memory problems
2015 (16 yrs): Developed anxiety and depression, started on fluoxetine
2016 (17 yrs): ACL tear (left knee), reconstructive surgery, 6-month rehab
2018 (19 yrs): Diagnosed with PTSD related to sports injuries, started CBT
2021 (22 yrs): Diagnosed with sleep apnea, started CPAP therapy
2022 (23 yrs): Gradual return to low-impact sports, improved mood and sleep
2023 (24 yrs): Graduated college, started job in sports analytics
2024 (25 yrs): Asthma well-controlled, mental health stable, training for half-marathon
    """,
]


# ── Step 1: The "bad" prompt — inconsistent, vague ───────────────────────────

initial_prompt = """
I have this patient medical record. Can you summarize it for me?

{record}

I need this for a quick review before the patient's appointment tomorrow.
"""

def generate_summary_bad(patient_record: str) -> None:
    prompt = initial_prompt.format(record=patient_record)
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}]
    )
    print("=" * 60)
    print(response.content[0].text)


# ── Step 2: Improved prompt — role + XML + clear instructions + example ──────

system = """
You are a highly experienced medical professional with a specialty in translating
complex patient histories into concise, actionable summaries. Your role is to
analyze patient records, identify critical information, and present it in a clear,
structured format that aids in diagnosis and treatment planning.
"""

updated_prompt = """
I need your help summarizing patient medical records for our team of doctors.
We have a series of follow-up appointments tomorrow, and the doctors need quick,
insightful summaries to prepare.

Each summary should include the following elements in this order:
- The patient's name
- The patient's age
- A bulleted list of key diagnoses in chronological order
- A bulleted list of medications the patient is prescribed
- A bulleted list of other treatments (non-medication: CBT, physical therapy, etc.)
- A short bulleted list of recent concerns
- A bulleted list of key action items to help doctors prepare

Here's an example of a well-formatted summary:

<example>
<patient_record>
Patient Name: Ethan Blackwood
Age: 55
Medical Record:

2010: Annual check-up, mild hypertension noted — started on lifestyle modifications
2012: Diagnosed with moderate depression — started on sertraline and CBT
2016: Hypertension worsened, started on lisinopril
2018: GERD diagnosed, started on omeprazole
2019: OSA diagnosed, started CPAP therapy
2022: Pre-diabetes (A1C 6.1%), referred to nutritionist, omeprazole discontinued
2023: Elevated PSA — biopsy negative; agreed to arthroscopic knee surgery
2024: Post-op knee recovery good; A1C improved (5.8%); mild LVH on echo — started ACE inhibitor
</patient_record>

<summary>
Name: Ethan Blackwood
Age: 55

Key Diagnoses:
- Hypertension (2010)
- Depression (2012)
- GERD (2018)
- Obstructive Sleep Apnea (2019)
- Pre-diabetes (2022)
- Meniscus Tear (2023)
- Left Ventricular Hypertrophy (2024)

Medications:
- Sertraline (depression)
- Lisinopril (hypertension)
- Low-dose ACE inhibitor (cardioprotection, 2024)

Other Treatments:
- Cognitive Behavioral Therapy (CBT) — depression
- Physical therapy — back pain and post-op knee recovery
- CPAP therapy — OSA
- Arthroscopic knee surgery (2023)

Recent Concerns:
- Elevated PSA (2023) — biopsy negative
- Mild LVH on echocardiogram (2024)

Action Items:
- Follow up on post-op knee recovery and PT progress
- Monitor PSA levels and prostate health
- Assess cardiac health after LVH finding
- Review blood pressure management
</summary>
</example>

Now, please summarize the following patient record in the same format:

<patient_record>
{record}
</patient_record>
"""

def generate_summary_improved(patient_record: str) -> None:
    prompt = updated_prompt.format(record=patient_record)
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=system,
        messages=[{"role": "user", "content": prompt}]
    )
    print("=" * 60)
    print(response.content[0].text)


# ── Step 3: JSON output ───────────────────────────────────────────────────────

updated_json_prompt = """
I need your help summarizing patient medical records for our team of doctors.
Please provide summaries in JSON format with this structure:

{
  "name": "Patient's full name",
  "age": <integer>,
  "key_diagnoses": [{"diagnosis": "...", "year": <integer>}],
  "medications": [{"name": "...", "purpose": "..."}],
  "other_treatments": [{"treatment": "...", "purpose": "..."}],
  "recent_concerns": ["..."],
  "action_items": ["..."]
}

<example>
<patient_record>
Patient Name: Ethan Blackwood / Age: 55 / [record truncated for brevity]
</patient_record>
<summary>
{
  "name": "Ethan Blackwood",
  "age": 55,
  "key_diagnoses": [
    {"diagnosis": "Hypertension", "year": 2010},
    {"diagnosis": "Depression", "year": 2012},
    {"diagnosis": "GERD", "year": 2018},
    {"diagnosis": "Obstructive Sleep Apnea", "year": 2019},
    {"diagnosis": "Left Ventricular Hypertrophy", "year": 2024}
  ],
  "medications": [
    {"name": "Sertraline", "purpose": "Depression"},
    {"name": "Lisinopril", "purpose": "Hypertension"},
    {"name": "ACE inhibitor (low-dose)", "purpose": "Cardioprotection"}
  ],
  "other_treatments": [
    {"treatment": "CBT", "purpose": "Depression management"},
    {"treatment": "Physical therapy", "purpose": "Back pain and knee recovery"},
    {"treatment": "CPAP therapy", "purpose": "OSA"},
    {"treatment": "Arthroscopic knee surgery", "purpose": "Meniscus tear repair"}
  ],
  "recent_concerns": [
    "Elevated PSA (2023), biopsy negative",
    "Mild left ventricular hypertrophy (2024)"
  ],
  "action_items": [
    "Follow up on post-op knee recovery",
    "Monitor PSA and prostate health",
    "Assess cardiac health post-LVH finding",
    "Review blood pressure management"
  ]
}
</summary>
</example>

Now summarize the following. Output the JSON inside <summary> tags.
"""

medical_record_input = """
<patient_record>
{record}
</patient_record>
"""

def generate_summary_json(patient_record: str) -> str:
    prompt = updated_json_prompt + medical_record_input.format(record=patient_record)
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=system,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text

def extract_action_items(model_response: str) -> None:
    match = re.search(r"<summary>\s*(.*?)\s*</summary>", model_response, re.DOTALL)
    if not match:
        print("No <summary> tags found.")
        return
    try:
        data = json.loads(match.group(1))
        print(f"\nAction Items for {data.get('name', 'Unknown')}:")
        for i, item in enumerate(data.get("action_items", []), 1):
            print(f"  {i}. {item}")
    except json.JSONDecodeError:
        print("Failed to parse JSON from summary.")

def generate_daily_action_items(records: list[str]) -> None:
    for record in records:
        response = generate_summary_json(record)
        extract_action_items(response)


# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n--- BAD PROMPT (inconsistent output) ---")
    generate_summary_bad(patient_records[0])

    print("\n\n--- IMPROVED PROMPT (structured output) ---")
    generate_summary_improved(patient_records[0])

    print("\n\n--- JSON PROMPT (machine-readable output) ---")
    generate_summary_json(patient_records[0])

    print("\n\n--- DAILY ACTION ITEMS (all patients) ---")
    generate_daily_action_items(patient_records)
