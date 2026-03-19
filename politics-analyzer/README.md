# ⚡ Workplace Political Intelligence

> Decode power dynamics, hidden intent, and political signals in workplace communication.

A Chrome extension that analyzes workplace messages for corporate power moves, hidden intent, and political signals — then suggests the ideal reply strategy.

---

## Features

### Core Analysis
- **Political Signal Detection** — Identifies 12 types: Decision Deflection, Authority Signaling, Soft Rejection, Blame Pre-Positioning, Coalition Building, Territorial Behavior, Escalation Threats, and more
- **Hidden Intent Decoder** — Surface meaning vs. actual intent, with confidence scoring
- **Power Dynamics Map** — How the sender is positioning, what it means for you, and how power shifts
- **Risk Assessment** — Scored 1–10 with detailed risk breakdown

### Reply Intelligence
- **3 Strategic Reply Options** for every message:
  - 🕊 **Diplomatic** — Preserve relationship while protecting your position
  - 💪 **Assertive** — Hold your ground without escalation
  - ⚡ **Momentum** — Drive the outcome you want forward

### Platform Integration
- **Floating button** — Highlight any text on any page → "Analyze Politics" appears
- **Right-click context menu** — Right-click selected text → "Analyze workplace politics"
- **Full-page analysis** — Analyze entire emails/pages in one click
- **Native injection** on Gmail, Outlook Web, Slack, LinkedIn, Notion

### Sidebar Panel
- Full analysis view with collapsible sections
- **Signals Glossary** — Learn all 12 power moves with real examples
- **Reply Builder** — Compare all 3 strategies side-by-side
- **Analysis History** — Last 50 analyses stored locally

---

## Installation

### Step 1 — Generate Icons
Open `generate_icons.html` in Chrome and click "Generate & Download Icons".
Move the 3 downloaded files into the `icons/` folder:
- `icons/icon16.png`
- `icons/icon48.png`
- `icons/icon128.png`

### Step 2 — Load Extension
1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode** (top-right toggle)
3. Click **"Load unpacked"**
4. Select this `politics-analyzer/` folder

### Step 3 — Configure API Key
1. Click the extension icon → Settings (gear icon)
2. Choose your AI provider: **Claude** (recommended) or OpenAI
3. Paste your API key
4. Click **Save Settings**
5. Click **Test API Connection** to verify

---

## Getting an API Key

### Claude (Anthropic) — Recommended
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up / log in
3. Navigate to **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-`)

**Recommended model:** Claude Sonnet 4.6 — best balance of quality and speed.

### OpenAI (Alternative)
1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new key
3. Copy the key (starts with `sk-`)

---

## How to Use

### Method 1 — Highlight Text
1. On any webpage (Gmail, Slack, etc.), select text with your mouse
2. The **"Analyze Politics"** button appears
3. Click it → sidebar opens with full analysis

### Method 2 — Right-Click
1. Select any text
2. Right-click → **"Analyze workplace politics"**
3. Sidebar opens with full analysis

### Method 3 — Extension Popup
1. Click the ⚡ icon in Chrome toolbar
2. Paste text into the text area
3. Click **Analyze Politics**

### Method 4 — Full Page
1. Right-click anywhere on the page
2. Select **"Analyze entire page for politics"**

---

## Privacy

- Your API key is stored **locally** in Chrome's sync storage
- Message text is sent **only** to your chosen AI provider (Anthropic or OpenAI)
- Nothing is stored on external servers
- Analysis history is stored **locally** in Chrome storage only

---

## Roadmap (V2+)

- [ ] Gmail thread analysis button (injected into Gmail UI)
- [ ] Slack `/politics` slash command bot
- [ ] Email tone history across senders
- [ ] Power dynamics heat map for threads
- [ ] Export analysis as PDF/email
- [ ] Team mode — shared pattern library
- [ ] Meeting prep mode — analyze agenda items
