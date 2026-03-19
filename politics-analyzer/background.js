// ============================================================
// Workplace Political Intelligence — Background Service Worker
// ============================================================

// --- Context Menu Setup ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "analyzeSelection",
    title: "Analyze workplace politics",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "analyzeFullPage",
    title: "Analyze entire page for politics",
    contexts: ["page"]
  });

  chrome.contextMenus.create({
    id: "separator1",
    type: "separator",
    contexts: ["selection", "page"]
  });

  chrome.contextMenus.create({
    id: "openSidebar",
    title: "Open Politics Intelligence Panel",
    contexts: ["selection", "page"]
  });
});

// --- Context Menu Click Handler ---
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "analyzeSelection" && info.selectionText) {
    // Store text for popup to read, then open sidebar
    await chrome.storage.session.set({
      pendingAnalysis: {
        text: info.selectionText,
        source: tab.url,
        timestamp: Date.now(),
        mode: "selection"
      }
    });
    // Open side panel for rich analysis
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }

  if (info.menuItemId === "analyzeFullPage") {
    // Inject content script to extract main text
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageText
    });
    if (results && results[0] && results[0].result) {
      await chrome.storage.session.set({
        pendingAnalysis: {
          text: results[0].result,
          source: tab.url,
          timestamp: Date.now(),
          mode: "fullPage"
        }
      });
      await chrome.sidePanel.open({ windowId: tab.windowId });
    }
  }

  if (info.menuItemId === "openSidebar") {
    if (info.selectionText) {
      await chrome.storage.session.set({
        pendingAnalysis: {
          text: info.selectionText,
          source: tab.url,
          timestamp: Date.now(),
          mode: "selection"
        }
      });
    }
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// --- Page text extractor (runs in page context) ---
function extractPageText() {
  // Try to get main content, excluding nav/footer noise
  const selectors = [
    "main", "article", "[role='main']",
    ".email-body", ".message-body", ".thread-body",
    // Gmail
    ".a3s", ".ii.gt",
    // Outlook Web
    "[data-testid='message-body']",
    // Slack
    "[data-qa='message_content']",
    // LinkedIn
    ".msg-s-event-listitem__body",
    // Notion
    ".notion-page-content"
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.innerText && el.innerText.length > 50) {
      return el.innerText.trim().slice(0, 4000);
    }
  }

  // Fallback: body text
  return document.body.innerText.trim().slice(0, 4000);
}

// --- Message relay from content script to popup/sidebar ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TEXT_SELECTED") {
    chrome.storage.session.set({
      pendingAnalysis: {
        text: message.text,
        source: sender.tab?.url || "",
        timestamp: Date.now(),
        mode: "selection"
      }
    });
    sendResponse({ status: "stored" });
  }

  if (message.type === "ANALYZE_REQUEST") {
    handleAnalysisRequest(message.payload)
      .then(result => sendResponse({ success: true, result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // async response
  }

  if (message.type === "OPEN_SIDEBAR") {
    chrome.sidePanel.open({ windowId: sender.tab?.windowId });
    sendResponse({ status: "opened" });
  }
});

// --- Core AI Analysis Handler ---
async function handleAnalysisRequest(payload) {
  const { text, mode, history } = payload;

  const config = await chrome.storage.sync.get([
    "apiProvider", "apiKey", "claudeModel", "openaiModel"
  ]);

  const provider = config.apiProvider || "anthropic";
  const apiKey = config.apiKey;

  if (!apiKey) {
    throw new Error("NO_API_KEY");
  }

  const prompt = buildAnalysisPrompt(text, mode, history);

  if (provider === "anthropic") {
    return await callClaude(apiKey, config.claudeModel || "claude-sonnet-4-6", prompt);
  } else {
    return await callOpenAI(apiKey, config.openaiModel || "gpt-4o", prompt);
  }
}

// --- Prompt Engineering (Core Engine) ---
function buildAnalysisPrompt(text, mode) {
  const systemPrompt = `You are a brutal, accurate workplace political intelligence analyst. You have deep expertise in:

- Corporate power dynamics, dominance signaling, and political maneuvering
- Detecting fluff, empty corporate speak, and deliberate vagueness
- Identifying threats (direct, indirect, and veiled)
- Spotting when someone is throwing you under the bus, pushing responsibility, or setting you up
- Reading the real motivation behind polished professional language
- Distinguishing genuine messages from manipulative ones
- Flagging dangerous patterns: gaslighting, blame-shifting, career threats, political traps

YOUR MOST IMPORTANT JOB: Give a raw, direct "Tactical Read" — a clear street-level summary of what is ACTUALLY happening. No corporate softness. Examples of the right tone:
- "He's bullshitting you — there's no real commitment here."
- "She's throwing you under the bus and building her escape hatch."
- "This is a soft rejection dressed up as a question."
- "He's pushing all the risk onto you while keeping the credit."
- "Pure fluff. Nothing real is being said."
- "This is a political trap. If you say yes, you own the failure."
- "He's not serious. This is stalling."
- "Warning: escalation threat buried in the last line."

Be accurate. Do not over-dramatize. If a message is genuinely clean, say so.

IMPORTANT: Return ONLY valid JSON. No markdown. No text outside the JSON object.

Schema:
{
  "tacticalRead": {
    "headline": "string — one brutal, clear sentence: what is actually happening. e.g. 'He is throwing you under the bus.'",
    "bodyLanguage": ["string — 2-4 bullet points expanding the headline with specific observations"],
    "tone": "hostile|manipulative|deceptive|passive-aggressive|genuine|friendly|neutral|threatening|dismissive"
  },
  "fluffAnalysis": {
    "fluffScore": number (0-10, where 0=totally real, 10=pure empty corporate speak),
    "fluffPhrases": ["string — exact phrases that are fluff or filler"],
    "realContent": "string — what is actually being communicated stripped of all fluff. If nothing real, say so."
  },
  "motivation": {
    "primary": "string — what they actually want from this message",
    "secondary": "string — the underlying secondary goal (e.g. protecting themselves, avoiding blame)",
    "whatTheyNeedFromYou": "string — what action or response they are hoping to extract from you"
  },
  "threatLevel": {
    "level": "none|subtle|moderate|direct|severe",
    "type": "string — e.g. 'implicit career threat', 'escalation to management', 'blame transfer', 'none'",
    "details": "string — explain the threat if present, or 'No threat detected' if clean"
  },
  "warningFlags": [
    {
      "flag": "string — name of the warning (e.g. 'Blame Pre-Positioning', 'Political Trap', 'Gaslighting')",
      "severity": "warning|danger|critical",
      "explanation": "string — what specifically is happening and why it matters"
    }
  ],
  "politicalSignals": [
    {
      "signal": "string — name (e.g. 'Decision Deflection', 'Authority Signaling', 'Soft Rejection', 'CYA Language', 'Credit Claiming Setup', 'Territorial Behavior', 'Coalition Building', 'Escalation Threat', 'Passive Resistance', 'Scope Creep Attack', 'Strategic Ambiguity', 'Blame Pre-Positioning')",
      "quote": "string — exact phrase from the text",
      "explanation": "string — what this reveals about their intent",
      "severity": "low|medium|high"
    }
  ],
  "hiddenIntent": {
    "surface": "string — what they appear to be saying",
    "actual": "string — what they actually mean",
    "confidence": "low|medium|high"
  },
  "powerDynamics": {
    "senderPosition": "string — how the sender is positioning themselves in this exchange",
    "recipientImplication": "string — what this message is trying to do to your position",
    "balanceShift": "string — how this shifts the power balance if left unanswered"
  },
  "riskAssessment": {
    "score": number (1-10),
    "level": "low|medium|high|critical",
    "primaryRisk": "string",
    "risks": ["string"]
  },
  "suggestedResponses": {
    "diplomatic": {
      "label": "Diplomatic",
      "text": "string — actual reply text the user can send",
      "rationale": "string — why this response works politically"
    },
    "assertive": {
      "label": "Assertive",
      "text": "string — actual reply text",
      "rationale": "string — why this response works politically"
    },
    "momentum": {
      "label": "Momentum",
      "text": "string — actual reply text",
      "rationale": "string — why this response works politically"
    }
  },
  "actionAdvice": ["string — specific action steps, not generic advice. e.g. 'Document this in writing immediately', 'Do not accept ownership of this task verbally'"]
}`;

  const userPrompts = {
    thread: `Analyze the full political dynamics of this workplace conversation thread. Track how power shifts across messages, identify who is building position, who is retreating, and what the overall political trajectory is. Flag the most dangerous moment in the thread.\n\nThread:\n${text}`,
    quick: `Give a fast, accurate political read on this message. Focus on the Tactical Read and Warning Flags first. Be direct.\n\nMessage:\n${text}`,
    message: `Analyze the workplace political dynamics in this message. Be accurate and ruthlessly clear.\n\nMessage:\n${text}`
  };

  return { system: systemPrompt, user: userPrompts[mode] || userPrompts.message };
}

// --- Claude API Call ---
async function callClaude(apiKey, model, prompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: prompt.system,
      messages: [{ role: "user", content: prompt.user }]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const raw = data.content[0].text;
  return JSON.parse(raw);
}

// --- OpenAI API Call ---
async function callOpenAI(apiKey, model, prompt) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user }
      ],
      max_tokens: 2048,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const raw = data.choices[0].message.content;
  return JSON.parse(raw);
}
