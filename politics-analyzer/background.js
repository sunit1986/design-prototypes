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
function buildAnalysisPrompt(text, mode, history) {
  const systemPrompt = `You are an expert in organizational psychology, corporate power dynamics, and workplace political intelligence. You have deep expertise in:

- Detecting subtle power moves and authority signaling
- Identifying decision deflection and responsibility shifting
- Recognizing soft rejection, passive resistance, and strategic ambiguity
- Spotting escalation tactics, coalition building signals, and territorial behavior
- Reading subtext in corporate communication
- Identifying CYA (cover your ass) language, blame pre-positioning, and credit claiming setups

Your analysis is precise, actionable, and non-judgmental. You help people navigate complex workplace dynamics with clarity.

IMPORTANT: Always return valid JSON matching the exact schema below. No markdown, no extra text outside JSON.

Schema:
{
  "politicalSignals": [
    {
      "signal": "string (e.g. Decision Deflection)",
      "quote": "string (exact phrase from text)",
      "explanation": "string (what this reveals)",
      "severity": "low|medium|high"
    }
  ],
  "hiddenIntent": {
    "surface": "string (what they appear to be saying)",
    "actual": "string (what they likely mean)",
    "confidence": "low|medium|high"
  },
  "powerDynamics": {
    "senderPosition": "string (how sender is positioning themselves)",
    "recipientImplication": "string (what this means for the recipient)",
    "balanceShift": "string (how this shifts power balance)"
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
      "text": "string",
      "rationale": "string"
    },
    "assertive": {
      "label": "Assertive",
      "text": "string",
      "rationale": "string"
    },
    "momentum": {
      "label": "Momentum",
      "text": "string",
      "rationale": "string"
    }
  },
  "summary": "string (2-3 sentence plain-English summary of political situation)",
  "actionAdvice": ["string"]
}`;

  const userPrompt = mode === "thread"
    ? `Analyze the political dynamics in this workplace conversation thread. Look for shifting alliances, escalating tension, power plays across multiple messages, and how the dynamic evolves.\n\nThread:\n${text}`
    : `Analyze the workplace political dynamics in this message. Identify all power moves, hidden intent, and political signals.\n\nMessage:\n${text}`;

  return { system: systemPrompt, user: userPrompt };
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
