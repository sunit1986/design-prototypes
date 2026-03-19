// ============================================================
// Workplace Political Intelligence — Popup Script
// ============================================================

let currentMode = "message";
let currentResult = null;
let activeReplyTab = "diplomatic";

// --- Init ---
document.addEventListener("DOMContentLoaded", async () => {
  await checkApiKey();
  await loadPendingText();
  bindEvents();
});

async function checkApiKey() {
  const { apiKey } = await chrome.storage.sync.get("apiKey");
  if (!apiKey) {
    document.getElementById("mainView").classList.add("hidden");
    document.getElementById("setupPrompt").classList.remove("hidden");
  }
}

async function loadPendingText() {
  const { pendingAnalysis } = await chrome.storage.session.get("pendingAnalysis");
  if (pendingAnalysis?.text) {
    document.getElementById("inputText").value = pendingAnalysis.text;
    await chrome.storage.session.remove("pendingAnalysis");
  }
}

function bindEvents() {
  // Mode tabs
  document.querySelectorAll(".mode-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".mode-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentMode = tab.dataset.mode;
      updatePlaceholder();
    });
  });

  document.getElementById("analyzeBtn").addEventListener("click", runAnalysis);
  document.getElementById("setupBtn")?.addEventListener("click", openOptions);
  document.getElementById("settingsBtn").addEventListener("click", openOptions);
  document.getElementById("footerSettings").addEventListener("click", openOptions);
  document.getElementById("openSidebarLink").addEventListener("click", openSidebar);
  document.getElementById("historyBtn").addEventListener("click", showHistory);
}

function updatePlaceholder() {
  const placeholders = {
    message: "Paste a workplace message, email, or Slack message…",
    thread: "Paste an entire email thread or Slack conversation…",
    quick: "Paste any text for an instant quick read…"
  };
  document.getElementById("inputText").placeholder = placeholders[currentMode];
}

async function runAnalysis() {
  const text = document.getElementById("inputText").value.trim();
  if (!text) {
    document.getElementById("inputText").focus();
    return;
  }

  const btn = document.getElementById("analyzeBtn");
  btn.disabled = true;

  showLoading();

  try {
    const result = await chrome.runtime.sendMessage({
      type: "ANALYZE_REQUEST",
      payload: { text, mode: currentMode }
    });

    if (result.success) {
      currentResult = result.result;
      renderResults(result.result);
      saveToHistory(text, result.result);
    } else {
      showError(result.error);
    }
  } catch (err) {
    showError(err.message || "Analysis failed. Check your API key in settings.");
  } finally {
    btn.disabled = false;
  }
}

function showLoading() {
  const area = document.getElementById("resultsArea");
  area.classList.remove("hidden");
  area.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <div class="loading-text">Decoding political signals…</div>
    </div>
  `;
}

function showError(errorMsg) {
  const area = document.getElementById("resultsArea");
  area.classList.remove("hidden");

  if (errorMsg === "NO_API_KEY") {
    area.innerHTML = `<div class="error-state">No API key configured. <a href="#" id="errorSetupLink" style="color:#e94560">Add your key →</a></div>`;
    area.querySelector("#errorSetupLink").addEventListener("click", openOptions);
  } else {
    area.innerHTML = `<div class="error-state">${escapeHtml(errorMsg)}</div>`;
  }
}

function renderResults(r) {
  const area = document.getElementById("resultsArea");
  area.classList.remove("hidden");

  const riskColor = { low: "#22c55e", medium: "#fb923c", high: "#ef4444", critical: "#dc2626" };
  const rc = riskColor[r.riskAssessment?.level] || "#fb923c";

  area.innerHTML = `

    <!-- Summary -->
    <div class="result-section">
      <div class="result-header" onclick="toggleSection(this)">
        <span style="font-size:14px">📋</span>
        <span class="result-title" style="color:#a0a0cc">Summary</span>
        <svg class="chevron" width="12" height="12" fill="none" stroke="#8888aa" stroke-width="2" viewBox="0 0 24 24" style="margin-left:auto"><path d="M19 9l-7 7-7-7"/></svg>
      </div>
      <div class="result-body">
        <p class="summary-text">${escapeHtml(r.summary || "")}</p>
      </div>
    </div>

    <!-- Risk Assessment -->
    <div class="result-section">
      <div class="result-header" onclick="toggleSection(this)">
        <span style="font-size:14px">🎯</span>
        <span class="result-title" style="color:#e94560">Risk Level</span>
        <span class="risk-badge risk-${r.riskAssessment?.level}" style="margin-left:auto">
          ${r.riskAssessment?.level?.toUpperCase()} · ${r.riskAssessment?.score}/10
        </span>
        <svg class="chevron" width="12" height="12" fill="none" stroke="#8888aa" stroke-width="2" viewBox="0 0 24 24" style="margin-left:6px"><path d="M19 9l-7 7-7-7"/></svg>
      </div>
      <div class="result-body">
        <div class="risk-score-bar">
          <div class="risk-score-fill" style="width:${(r.riskAssessment?.score || 0) * 10}%"></div>
        </div>
        <p style="font-size:12px;color:#e8e8f0;font-weight:600;margin-bottom:6px">${escapeHtml(r.riskAssessment?.primaryRisk || "")}</p>
        ${(r.riskAssessment?.risks || []).map(risk =>
          `<div style="font-size:11px;color:#aaaacc;padding:2px 0;padding-left:12px;position:relative">
            <span style="position:absolute;left:0;color:#e94560">·</span>${escapeHtml(risk)}
          </div>`
        ).join("")}
      </div>
    </div>

    <!-- Political Signals -->
    <div class="result-section">
      <div class="result-header" onclick="toggleSection(this)">
        <span style="font-size:14px">⚡</span>
        <span class="result-title" style="color:#fb923c">Political Signals</span>
        <span style="margin-left:auto;font-size:11px;color:#8888aa">${(r.politicalSignals || []).length} detected</span>
        <svg class="chevron" width="12" height="12" fill="none" stroke="#8888aa" stroke-width="2" viewBox="0 0 24 24" style="margin-left:6px"><path d="M19 9l-7 7-7-7"/></svg>
      </div>
      <div class="result-body">
        ${(r.politicalSignals || []).map(s => `
          <div class="signal-item">
            <div class="signal-name">
              <span class="severity-dot sev-${s.severity}"></span>${escapeHtml(s.signal)}
            </div>
            ${s.quote ? `<div class="signal-quote">"${escapeHtml(s.quote)}"</div>` : ""}
            <div class="signal-explanation">${escapeHtml(s.explanation)}</div>
          </div>
        `).join("")}
      </div>
    </div>

    <!-- Hidden Intent -->
    <div class="result-section">
      <div class="result-header" onclick="toggleSection(this)">
        <span style="font-size:14px">🔍</span>
        <span class="result-title" style="color:#a78bfa">Hidden Intent</span>
        <svg class="chevron" width="12" height="12" fill="none" stroke="#8888aa" stroke-width="2" viewBox="0 0 24 24" style="margin-left:auto"><path d="M19 9l-7 7-7-7"/></svg>
      </div>
      <div class="result-body">
        <div class="intent-grid">
          <div class="intent-box">
            <div class="intent-label">Surface meaning</div>
            <div class="intent-text">${escapeHtml(r.hiddenIntent?.surface || "")}</div>
          </div>
          <div class="intent-box" style="border-left:2px solid #e94560">
            <div class="intent-label" style="color:#e94560">Actual intent</div>
            <div class="intent-text">${escapeHtml(r.hiddenIntent?.actual || "")}</div>
          </div>
        </div>
        ${r.hiddenIntent?.confidence ? `
          <div style="margin-top:8px;font-size:10px;color:#555570;text-align:right">
            Confidence: ${r.hiddenIntent.confidence}
          </div>
        ` : ""}
      </div>
    </div>

    <!-- Power Dynamics -->
    <div class="result-section">
      <div class="result-header" onclick="toggleSection(this)">
        <span style="font-size:14px">⚖️</span>
        <span class="result-title" style="color:#34d399">Power Dynamics</span>
        <svg class="chevron" width="12" height="12" fill="none" stroke="#8888aa" stroke-width="2" viewBox="0 0 24 24" style="margin-left:auto"><path d="M19 9l-7 7-7-7"/></svg>
      </div>
      <div class="result-body">
        <div style="margin-bottom:8px">
          <div class="intent-label">Sender is positioning as</div>
          <div class="intent-text">${escapeHtml(r.powerDynamics?.senderPosition || "")}</div>
        </div>
        <div style="margin-bottom:8px">
          <div class="intent-label">What this means for you</div>
          <div class="intent-text">${escapeHtml(r.powerDynamics?.recipientImplication || "")}</div>
        </div>
        <div>
          <div class="intent-label">Power balance shift</div>
          <div class="intent-text">${escapeHtml(r.powerDynamics?.balanceShift || "")}</div>
        </div>
      </div>
    </div>

    <!-- Suggested Responses -->
    <div class="result-section">
      <div class="result-header" onclick="toggleSection(this)">
        <span style="font-size:14px">💬</span>
        <span class="result-title" style="color:#60a5fa">Suggested Replies</span>
        <svg class="chevron" width="12" height="12" fill="none" stroke="#8888aa" stroke-width="2" viewBox="0 0 24 24" style="margin-left:auto"><path d="M19 9l-7 7-7-7"/></svg>
      </div>
      <div class="result-body">
        <div class="reply-tabs">
          <button class="reply-tab active" data-reply="diplomatic" onclick="switchReplyTab(this, 'diplomatic')">Diplomatic</button>
          <button class="reply-tab" data-reply="assertive" onclick="switchReplyTab(this, 'assertive')">Assertive</button>
          <button class="reply-tab" data-reply="momentum" onclick="switchReplyTab(this, 'momentum')">Momentum</button>
        </div>
        <div id="replyContent">
          ${renderReplyTab(r.suggestedResponses, "diplomatic")}
        </div>
      </div>
    </div>

    <!-- Action Advice -->
    ${(r.actionAdvice || []).length > 0 ? `
    <div class="result-section">
      <div class="result-header" onclick="toggleSection(this)">
        <span style="font-size:14px">🎯</span>
        <span class="result-title" style="color:#fbbf24">Your Next Move</span>
        <svg class="chevron" width="12" height="12" fill="none" stroke="#8888aa" stroke-width="2" viewBox="0 0 24 24" style="margin-left:auto"><path d="M19 9l-7 7-7-7"/></svg>
      </div>
      <div class="result-body">
        <ul class="action-list">
          ${(r.actionAdvice || []).map(a => `<li>${escapeHtml(a)}</li>`).join("")}
        </ul>
      </div>
    </div>
    ` : ""}

  `;

  // Store result for reply switching
  window.__wpiResult = r;
}

function renderReplyTab(responses, type) {
  const r = responses?.[type];
  if (!r) return '<p style="color:#555570;font-size:12px">No suggestion available.</p>';
  return `
    <div class="reply-text">${escapeHtml(r.text || "")}</div>
    <div class="reply-rationale">${escapeHtml(r.rationale || "")}</div>
    <button class="copy-reply-btn" onclick="copyReply('${type}')">
      Copy this reply
    </button>
  `;
}

window.switchReplyTab = function(btn, type) {
  document.querySelectorAll(".reply-tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  activeReplyTab = type;
  document.getElementById("replyContent").innerHTML = renderReplyTab(window.__wpiResult?.suggestedResponses, type);
};

window.copyReply = async function(type) {
  const text = window.__wpiResult?.suggestedResponses?.[type]?.text;
  if (text) {
    await navigator.clipboard.writeText(text);
    const btns = document.querySelectorAll(".copy-reply-btn");
    btns.forEach(b => { b.textContent = "Copied!"; setTimeout(() => b.textContent = "Copy this reply", 1500); });
  }
};

window.toggleSection = function(header) {
  const body = header.nextElementSibling;
  const chevron = header.querySelector(".chevron");
  const isOpen = body.style.display !== "none";
  body.style.display = isOpen ? "none" : "block";
  chevron?.classList.toggle("open", !isOpen);
};

function openOptions() {
  chrome.runtime.openOptionsPage();
}

function openSidebar() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]) {
      chrome.runtime.sendMessage({ type: "OPEN_SIDEBAR" });
    }
  });
}

async function saveToHistory(text, result) {
  const { analysisHistory = [] } = await chrome.storage.local.get("analysisHistory");
  analysisHistory.unshift({
    text: text.slice(0, 200),
    result,
    timestamp: Date.now()
  });
  // Keep last 50
  await chrome.storage.local.set({ analysisHistory: analysisHistory.slice(0, 50) });
}

async function showHistory() {
  const { analysisHistory = [] } = await chrome.storage.local.get("analysisHistory");
  if (analysisHistory.length === 0) {
    alert("No analysis history yet.");
    return;
  }
  // Simple: load most recent into text area
  const latest = analysisHistory[0];
  document.getElementById("inputText").value = latest.text;
  if (latest.result) {
    currentResult = latest.result;
    renderResults(latest.result);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
