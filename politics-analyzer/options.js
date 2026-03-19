// ============================================================
// Workplace Political Intelligence — Options Script
// ============================================================

let currentProvider = "anthropic";

// ── Init ──
document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  bindModelChange();
});

async function loadSettings() {
  const settings = await chrome.storage.sync.get([
    "apiProvider", "apiKey", "claudeModel", "openaiModel",
    "showFloatingBtn", "autoAnalyze", "saveHistory", "defaultMode"
  ]);

  // Provider
  const provider = settings.apiProvider || "anthropic";
  selectProvider(provider, document.querySelector(`[data-provider="${provider}"]`));

  // API key
  document.getElementById("apiKeyInput").value = settings.apiKey || "";

  // Models
  if (provider === "anthropic") {
    document.getElementById("modelSelect").value = settings.claudeModel || "claude-sonnet-4-6";
  } else {
    populateOpenAIModels();
    document.getElementById("modelSelect").value = settings.openaiModel || "gpt-4o";
  }

  // Toggles
  document.getElementById("showFloatingBtn").checked = settings.showFloatingBtn !== false;
  document.getElementById("autoAnalyze").checked = !!settings.autoAnalyze;
  document.getElementById("saveHistory").checked = settings.saveHistory !== false;

  // Default mode
  document.getElementById("defaultMode").value = settings.defaultMode || "message";
}

window.selectProvider = function(provider, tabEl) {
  currentProvider = provider;

  document.querySelectorAll(".provider-tab").forEach(t => t.classList.remove("active"));
  if (tabEl) tabEl.classList.add("active");

  const isAnthropic = provider === "anthropic";

  document.getElementById("apiKeyLabel").textContent = isAnthropic ? "Anthropic API Key" : "OpenAI API Key";
  document.getElementById("apiKeyInput").placeholder = isAnthropic ? "sk-ant-..." : "sk-...";
  document.getElementById("apiKeyHint").textContent = isAnthropic
    ? "Get your key at console.anthropic.com → API Keys"
    : "Get your key at platform.openai.com/api-keys";

  if (isAnthropic) {
    populateClaudeModels();
  } else {
    populateOpenAIModels();
  }
};

function populateClaudeModels() {
  const select = document.getElementById("modelSelect");
  select.innerHTML = `
    <option value="claude-sonnet-4-6">Claude Sonnet 4.6 — Best balance (Recommended)</option>
    <option value="claude-opus-4-6">Claude Opus 4.6 — Most powerful</option>
    <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 — Fastest &amp; cheapest</option>
  `;
  updateModelInfo("claude-sonnet-4-6");
}

function populateOpenAIModels() {
  const select = document.getElementById("modelSelect");
  select.innerHTML = `
    <option value="gpt-4o">GPT-4o — Best balance (Recommended)</option>
    <option value="gpt-4o-mini">GPT-4o Mini — Faster &amp; cheaper</option>
    <option value="gpt-4-turbo">GPT-4 Turbo — High capability</option>
  `;
  updateModelInfo("gpt-4o");
}

function bindModelChange() {
  document.getElementById("modelSelect").addEventListener("change", (e) => {
    updateModelInfo(e.target.value);
  });
}

function updateModelInfo(model) {
  const info = {
    "claude-sonnet-4-6": "Sonnet 4.6: Excellent analysis quality with fast responses. Best choice for daily use.",
    "claude-opus-4-6": "Opus 4.6: Most powerful Claude model. Deepest analysis but slightly slower.",
    "claude-haiku-4-5-20251001": "Haiku 4.5: Fastest and most affordable. Good for quick checks.",
    "gpt-4o": "GPT-4o: OpenAI's best multimodal model. High quality analysis.",
    "gpt-4o-mini": "GPT-4o Mini: Fast and cost-efficient. Great for frequent use.",
    "gpt-4-turbo": "GPT-4 Turbo: High capability with large context window."
  };

  const el = document.getElementById("modelInfo");
  if (el) el.textContent = info[model] || "";
}

window.toggleKeyVisibility = function() {
  const input = document.getElementById("apiKeyInput");
  const btn = document.getElementById("toggleKeyBtn");
  if (input.type === "password") {
    input.type = "text";
    btn.textContent = "Hide";
  } else {
    input.type = "password";
    btn.textContent = "Show";
  }
};

window.saveSettings = async function() {
  const apiKey = document.getElementById("apiKeyInput").value.trim();
  const modelValue = document.getElementById("modelSelect").value;

  const settings = {
    apiProvider: currentProvider,
    apiKey,
    showFloatingBtn: document.getElementById("showFloatingBtn").checked,
    autoAnalyze: document.getElementById("autoAnalyze").checked,
    saveHistory: document.getElementById("saveHistory").checked,
    defaultMode: document.getElementById("defaultMode").value,
  };

  if (currentProvider === "anthropic") {
    settings.claudeModel = modelValue;
  } else {
    settings.openaiModel = modelValue;
  }

  await chrome.storage.sync.set(settings);
  showStatus("success", "✓ Settings saved successfully!");
};

window.testConnection = async function() {
  const apiKey = document.getElementById("apiKeyInput").value.trim();
  if (!apiKey) {
    showStatus("error", "Please enter an API key first.");
    return;
  }

  const btn = document.getElementById("testBtn");
  btn.disabled = true;
  btn.textContent = "Testing…";
  showStatus("info", "Sending test request…");

  try {
    const response = await chrome.runtime.sendMessage({
      type: "ANALYZE_REQUEST",
      payload: {
        text: "We should align with leadership before moving forward on this initiative.",
        mode: "message"
      }
    });

    if (response.success) {
      const signals = response.result?.politicalSignals?.length || 0;
      showStatus("success", `✓ Connection successful! Detected ${signals} political signal(s) in test message.`);
    } else {
      showStatus("error", `✗ ${response.error || "Connection failed."}`);
    }
  } catch (err) {
    showStatus("error", `✗ ${err.message || "Connection test failed."}`);
  } finally {
    btn.disabled = false;
    btn.textContent = "Test API Connection";
  }
};

function showStatus(type, message) {
  const el = document.getElementById("statusMsg");
  el.className = `status-msg ${type}`;
  el.textContent = message;
  if (type !== "info") {
    setTimeout(() => { el.className = "status-msg"; }, 5000);
  }
}
