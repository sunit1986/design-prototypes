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

  const tr  = r.tacticalRead || {};
  const wf  = r.warningFlags || [];
  const tl  = r.threatLevel || {};
  const fl  = r.fluffAnalysis || {};
  const mv  = r.motivation || {};
  const ra  = r.riskAssessment || {};

  const toneColors = {
    hostile:"#ef4444", manipulative:"#e94560", deceptive:"#f97316",
    "passive-aggressive":"#fb923c", threatening:"#dc2626",
    dismissive:"#a78bfa", genuine:"#22c55e", friendly:"#34d399", neutral:"#8888aa"
  };
  const toneColor = toneColors[tr.tone] || "#8888aa";

  area.innerHTML = `

    <!-- TACTICAL READ -->
    <div style="background:linear-gradient(135deg,#1a0a10,#1a1a2e);border:1px solid rgba(233,69,96,0.35);border-radius:12px;padding:14px;margin-bottom:10px;position:relative;overflow:hidden">
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#e94560,#c23152,transparent)"></div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:13px">⚡</span>
        <span style="font-size:10px;font-weight:800;color:#e94560;text-transform:uppercase;letter-spacing:1.2px;flex:1">TACTICAL READ</span>
        <span style="font-size:9px;font-weight:800;letter-spacing:.8px;padding:2px 7px;border-radius:9px;background:${toneColor}22;color:${toneColor};border:1px solid ${toneColor}44">${(tr.tone||"neutral").toUpperCase()}</span>
      </div>
      <div style="font-size:15px;font-weight:800;color:#fff;line-height:1.35;margin-bottom:8px;letter-spacing:-.2px">${escapeHtml(tr.headline||"—")}</div>
      ${(tr.bodyLanguage||[]).length > 0 ? `<ul style="list-style:none;display:flex;flex-direction:column;gap:4px">
        ${(tr.bodyLanguage||[]).map(b=>`<li style="font-size:11px;color:#c8c8e0;padding-left:14px;position:relative;line-height:1.5">
          <span style="position:absolute;left:2px;color:#e94560;font-size:15px;line-height:1;top:0">·</span>${escapeHtml(b)}</li>`).join("")}
      </ul>` : ""}
    </div>

    <!-- WARNING FLAGS -->
    ${wf.length > 0 ? wf.map(f => {
      const sevCfg = {
        critical:{c:"#dc2626",bg:"rgba(220,38,38,.12)",b:"rgba(220,38,38,.4)",icon:"🚨"},
        danger:  {c:"#ef4444",bg:"rgba(239,68,68,.10)",b:"rgba(239,68,68,.3)",icon:"⛔"},
        warning: {c:"#fb923c",bg:"rgba(251,146,60,.10)",b:"rgba(251,146,60,.3)",icon:"⚠️"}
      }[f.severity] || {c:"#fb923c",bg:"rgba(251,146,60,.10)",b:"rgba(251,146,60,.3)",icon:"⚠️"};
      return `
        <div style="background:${sevCfg.bg};border:1px solid ${sevCfg.b};border-left:3px solid ${sevCfg.c};border-radius:0 8px 8px 0;padding:9px 12px;margin-bottom:6px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span>${sevCfg.icon}</span>
            <span style="font-size:11px;font-weight:800;color:${sevCfg.c};flex:1">${escapeHtml(f.flag)}</span>
            <span style="font-size:9px;font-weight:800;color:${sevCfg.c}">${f.severity.toUpperCase()}</span>
          </div>
          <div style="font-size:11px;color:#c8c8e0;line-height:1.5">${escapeHtml(f.explanation)}</div>
        </div>`;
    }).join("") : ""}

    <!-- THREAT LEVEL (only if present) -->
    ${tl.level && tl.level !== "none" ? (() => {
      const tc = {severe:{c:"#dc2626",l:"SEVERE THREAT"},direct:{c:"#ef4444",l:"DIRECT THREAT"},moderate:{c:"#fb923c",l:"MODERATE THREAT"},subtle:{c:"#fbbf24",l:"SUBTLE THREAT"}}[tl.level]||{c:"#8888aa",l:"THREAT"};
      return `<div class="result-section" style="border-color:${tc.c}44">
        <div class="result-header" onclick="toggleSection(this)">
          <span style="font-size:13px">🔥</span>
          <span class="result-title" style="color:${tc.c}">${tc.l}</span>
          <svg class="chevron" width="12" height="12" fill="none" stroke="#8888aa" stroke-width="2" viewBox="0 0 24 24" style="margin-left:auto"><path d="M19 9l-7 7-7-7"/></svg>
        </div>
        <div class="result-body">
          <div style="font-size:12px;font-weight:700;color:${tc.c};margin-bottom:5px">${escapeHtml(tl.type||"")}</div>
          <div style="font-size:12px;color:#c8c8e0;line-height:1.6">${escapeHtml(tl.details||"")}</div>
        </div>
      </div>`;
    })() : ""}

    <!-- FLUFF ANALYSIS -->
    <div class="result-section">
      <div class="result-header" onclick="toggleSection(this)">
        <span style="font-size:13px">💨</span>
        <span class="result-title" style="color:#aaaacc">Fluff Analysis</span>
        <span style="margin-left:auto;font-size:11px;font-weight:700;color:${(fl.fluffScore||0)>=7?"#fb923c":(fl.fluffScore||0)>=4?"#fbbf24":"#22c55e"}">${fl.fluffScore||0}/10</span>
        <svg class="chevron" width="12" height="12" fill="none" stroke="#8888aa" stroke-width="2" viewBox="0 0 24 24" style="margin-left:6px"><path d="M19 9l-7 7-7-7"/></svg>
      </div>
      <div class="result-body">
        <div class="risk-score-bar"><div class="risk-score-fill" style="width:${(fl.fluffScore||0)*10}%"></div></div>
        ${(fl.fluffPhrases||[]).length > 0 ? `
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin:8px 0">
            ${(fl.fluffPhrases||[]).map(p=>`<span style="padding:2px 7px;background:rgba(251,146,60,.12);border:1px solid rgba(251,146,60,.25);border-radius:9px;font-size:10px;color:#fb923c;font-style:italic">"${escapeHtml(p)}"</span>`).join("")}
          </div>` : ""}
        <div style="font-size:12px;color:#e8e8f0;padding:8px 10px;background:rgba(34,197,94,.06);border-left:2px solid #22c55e;border-radius:0 6px 6px 0;line-height:1.6">${escapeHtml(fl.realContent||"Nothing substantive.")}</div>
      </div>
    </div>

    <!-- MOTIVATION -->
    <div class="result-section">
      <div class="result-header" onclick="toggleSection(this)">
        <span style="font-size:13px">🧠</span>
        <span class="result-title" style="color:#a78bfa">Their Motivation</span>
        <svg class="chevron" width="12" height="12" fill="none" stroke="#8888aa" stroke-width="2" viewBox="0 0 24 24" style="margin-left:auto"><path d="M19 9l-7 7-7-7"/></svg>
      </div>
      <div class="result-body">
        <div style="margin-bottom:8px"><div class="intent-label">What they actually want</div><div class="intent-text" style="color:#e8e8f0">${escapeHtml(mv.primary||"—")}</div></div>
        <div style="margin-bottom:8px"><div class="intent-label">Secondary goal</div><div class="intent-text">${escapeHtml(mv.secondary||"—")}</div></div>
        <div style="padding:8px 10px;background:rgba(233,69,96,.07);border-left:2px solid #e94560;border-radius:0 6px 6px 0">
          <div style="font-size:10px;font-weight:700;color:#e94560;text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px">What they need from you</div>
          <div style="font-size:12px;color:#e8e8f0;line-height:1.5">${escapeHtml(mv.whatTheyNeedFromYou||"—")}</div>
        </div>
      </div>
    </div>

    <!-- POLITICAL SIGNALS -->
    <div class="result-section">
      <div class="result-header" onclick="toggleSection(this)">
        <span style="font-size:13px">⚡</span>
        <span class="result-title" style="color:#fb923c">Political Signals</span>
        <span style="margin-left:auto;font-size:11px;color:#8888aa">${(r.politicalSignals||[]).length} detected</span>
        <svg class="chevron" width="12" height="12" fill="none" stroke="#8888aa" stroke-width="2" viewBox="0 0 24 24" style="margin-left:6px"><path d="M19 9l-7 7-7-7"/></svg>
      </div>
      <div class="result-body">
        ${(r.politicalSignals||[]).map(s=>`
          <div class="signal-item">
            <div class="signal-name"><span class="severity-dot sev-${s.severity}"></span>${escapeHtml(s.signal)}</div>
            ${s.quote?`<div class="signal-quote">"${escapeHtml(s.quote)}"</div>`:""}
            <div class="signal-explanation">${escapeHtml(s.explanation)}</div>
          </div>`).join("")}
      </div>
    </div>

    <!-- HIDDEN INTENT -->
    <div class="result-section">
      <div class="result-header" onclick="toggleSection(this)">
        <span style="font-size:13px">🔍</span>
        <span class="result-title" style="color:#a78bfa">Hidden Intent</span>
        <svg class="chevron" width="12" height="12" fill="none" stroke="#8888aa" stroke-width="2" viewBox="0 0 24 24" style="margin-left:auto"><path d="M19 9l-7 7-7-7"/></svg>
      </div>
      <div class="result-body">
        <div class="intent-grid">
          <div class="intent-box"><div class="intent-label">What they said</div><div class="intent-text">${escapeHtml(r.hiddenIntent?.surface||"")}</div></div>
          <div class="intent-box" style="border-left:2px solid #e94560"><div class="intent-label" style="color:#e94560">What they mean</div><div class="intent-text">${escapeHtml(r.hiddenIntent?.actual||"")}</div></div>
        </div>
      </div>
    </div>

    <!-- SUGGESTED REPLIES -->
    <div class="result-section">
      <div class="result-header" onclick="toggleSection(this)">
        <span style="font-size:13px">💬</span>
        <span class="result-title" style="color:#60a5fa">Suggested Replies</span>
        <svg class="chevron" width="12" height="12" fill="none" stroke="#8888aa" stroke-width="2" viewBox="0 0 24 24" style="margin-left:auto"><path d="M19 9l-7 7-7-7"/></svg>
      </div>
      <div class="result-body">
        <div class="reply-tabs">
          <button class="reply-tab active" data-reply="diplomatic" onclick="switchReplyTab(this,'diplomatic')">🕊 Diplomatic</button>
          <button class="reply-tab" data-reply="assertive" onclick="switchReplyTab(this,'assertive')">💪 Assertive</button>
          <button class="reply-tab" data-reply="momentum" onclick="switchReplyTab(this,'momentum')">⚡ Momentum</button>
        </div>
        <div id="replyContent">${renderReplyTab(r.suggestedResponses,"diplomatic")}</div>
      </div>
    </div>

    <!-- ACTION ADVICE -->
    ${(r.actionAdvice||[]).length > 0 ? `
    <div class="result-section">
      <div class="result-header" onclick="toggleSection(this)">
        <span style="font-size:13px">🚀</span>
        <span class="result-title" style="color:#fbbf24">Your Next Move</span>
        <svg class="chevron" width="12" height="12" fill="none" stroke="#8888aa" stroke-width="2" viewBox="0 0 24 24" style="margin-left:auto"><path d="M19 9l-7 7-7-7"/></svg>
      </div>
      <div class="result-body">
        <ul class="action-list">${(r.actionAdvice||[]).map(a=>`<li>${escapeHtml(a)}</li>`).join("")}</ul>
      </div>
    </div>` : ""}

  `;

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
