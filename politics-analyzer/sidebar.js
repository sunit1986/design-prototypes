// ============================================================
// Workplace Political Intelligence — Sidebar Script
// ============================================================

let currentResult = null;
let activeReplyType = "diplomatic";

// Political Signal Glossary (built-in education)
const SIGNAL_GLOSSARY = [
  {
    name: "Decision Deflection",
    icon: "🔄",
    description: "Shifting the burden of a decision to someone else to avoid accountability.",
    examples: ["We should align with leadership first.", "Let's get buy-in before moving forward."],
    color: "#e94560"
  },
  {
    name: "Authority Signaling",
    icon: "👑",
    description: "Dropping names, titles, or relationships to establish dominance or legitimacy.",
    examples: ["I spoke with the CEO about this.", "The board is very focused on this."],
    color: "#fb923c"
  },
  {
    name: "Soft Rejection",
    icon: "🚫",
    description: "Declining something without saying no directly to maintain political cover.",
    examples: ["This is interesting, but maybe not the right timing.", "I'm not sure the team is ready."],
    color: "#a78bfa"
  },
  {
    name: "Credit Pre-Positioning",
    icon: "🏆",
    description: "Setting up to claim credit for an outcome before it happens.",
    examples: ["I've been pushing this internally for months.", "My team has been working on this."],
    color: "#fbbf24"
  },
  {
    name: "Blame Pre-Positioning",
    icon: "🎯",
    description: "Laying groundwork to assign blame to others if something fails.",
    examples: ["I had concerns about this from the start.", "I did flag this risk earlier."],
    color: "#ef4444"
  },
  {
    name: "Coalition Building Signal",
    icon: "🤝",
    description: "Subtly testing if you'll join their side or revealing their alliances.",
    examples: ["I think most people on the team agree.", "Several stakeholders share my view."],
    color: "#34d399"
  },
  {
    name: "Territorial Behavior",
    icon: "🗺️",
    description: "Marking a domain as their own to block others from influencing it.",
    examples: ["This falls under my team's scope.", "We've already handled this area."],
    color: "#60a5fa"
  },
  {
    name: "Escalation Threat",
    icon: "⬆️",
    description: "Implying they will escalate to a higher authority if not accommodated.",
    examples: ["I may need to bring this to leadership.", "This might need a broader discussion."],
    color: "#ef4444"
  },
  {
    name: "Strategic Ambiguity",
    icon: "🌫️",
    description: "Being deliberately vague to preserve options and avoid commitment.",
    examples: ["We'll see how things develop.", "There are a lot of factors to consider."],
    color: "#8888aa"
  },
  {
    name: "Passive Resistance",
    icon: "🐢",
    description: "Appearing to agree while doing nothing, or moving at a pace that kills momentum.",
    examples: ["Absolutely, let's schedule a follow-up soon.", "I'll loop in the team when I get a chance."],
    color: "#fb923c"
  },
  {
    name: "Scope Creep Attack",
    icon: "🕸️",
    description: "Adding complexity or dependencies to a project to delay, control, or claim it.",
    examples: ["We also need to consider X, Y, and Z.", "There's a dependency on the other team."],
    color: "#a78bfa"
  },
  {
    name: "CYA Language",
    icon: "🛡️",
    description: "Cover-your-ass language that insulates the sender from future criticism.",
    examples: ["As I mentioned in my previous email…", "I just want to make sure we're aligned…"],
    color: "#34d399"
  }
];

// ── Init ──
document.addEventListener("DOMContentLoaded", async () => {
  await init();
  bindEvents();
  renderSignalGlossary();
  await loadHistory();
});

async function init() {
  const { apiKey, apiProvider } = await chrome.storage.sync.get(["apiKey", "apiProvider"]);

  // Update provider badge
  const badge = document.getElementById("providerBadge");
  if (badge) badge.textContent = apiProvider === "openai" ? "OpenAI" : "Claude";

  if (!apiKey) {
    document.getElementById("noKeyWarning").classList.remove("hidden");
    document.getElementById("analyzeForm").classList.add("hidden");
  }

  // Load any pending analysis
  const { pendingAnalysis } = await chrome.storage.session.get("pendingAnalysis");
  if (pendingAnalysis?.text) {
    document.getElementById("sidebarInput").value = pendingAnalysis.text;
    await chrome.storage.session.remove("pendingAnalysis");
    // Auto-run analysis
    setTimeout(() => runAnalysis(), 300);
  }
}

function bindEvents() {
  // Nav tabs
  document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`tab-${tab.dataset.tab}`)?.classList.add("active");
      if (tab.dataset.tab === "history") loadHistory();
    });
  });

  document.getElementById("sidebarAnalyzeBtn").addEventListener("click", runAnalysis);
  document.getElementById("closeBtn").addEventListener("click", () => window.close());
  document.getElementById("goToSettings")?.addEventListener("click", () => chrome.runtime.openOptionsPage());
  document.getElementById("settingsLink").addEventListener("click", () => chrome.runtime.openOptionsPage());
  document.getElementById("clearHistoryLink").addEventListener("click", clearHistory);
}

// ── Analysis ──
async function runAnalysis() {
  const text = document.getElementById("sidebarInput").value.trim();
  if (!text) {
    document.getElementById("sidebarInput").focus();
    return;
  }

  const mode = document.getElementById("analyzeMode").value;
  const btn = document.getElementById("sidebarAnalyzeBtn");
  btn.disabled = true;

  showLoading();

  try {
    const response = await chrome.runtime.sendMessage({
      type: "ANALYZE_REQUEST",
      payload: { text, mode }
    });

    if (response.success) {
      currentResult = response.result;
      renderResults(response.result);
      updateRepliesTab(response.result);
      await saveToHistory(text, response.result);
    } else {
      showError(response.error);
    }
  } catch (err) {
    showError(err.message || "Analysis failed.");
  } finally {
    btn.disabled = false;
  }
}

function showLoading() {
  const steps = [
    "Reading message structure…",
    "Detecting political signals…",
    "Analyzing power dynamics…",
    "Building reply strategies…"
  ];
  let stepIdx = 0;

  document.getElementById("sidebarResults").innerHTML = `
    <div class="loading-wrap">
      <div class="spinner"></div>
      <div class="loading-text">Decoding workplace politics…</div>
      <div class="loading-steps">
        ${steps.map((s, i) => `<div class="loading-step ${i === 0 ? 'active' : ''}" id="lstep${i}">${s}</div>`).join("")}
      </div>
    </div>
  `;

  const interval = setInterval(() => {
    const prev = document.getElementById(`lstep${stepIdx}`);
    if (prev) prev.classList.remove("active");
    stepIdx++;
    const next = document.getElementById(`lstep${stepIdx}`);
    if (next) {
      next.classList.add("active");
    } else {
      clearInterval(interval);
    }
  }, 600);
}

function showError(err) {
  const msg = err === "NO_API_KEY"
    ? `No API key configured. <a href="#" id="errSettingsLink" style="color:#e94560">Configure now →</a>`
    : escHtml(String(err));

  document.getElementById("sidebarResults").innerHTML = `
    <div class="error-box">${msg}</div>
  `;

  document.getElementById("errSettingsLink")?.addEventListener("click", () => chrome.runtime.openOptionsPage());
}

// ── Render Results ──
function renderResults(r) {
  const ra = r.riskAssessment || {};
  const ld = ra.level || "medium";

  document.getElementById("sidebarResults").innerHTML = `

    <!-- Summary Insight -->
    <div class="insight-tip">
      ${escHtml(r.summary || "")}
    </div>

    <!-- Risk -->
    ${renderCard("risk", "🎯", "Risk Assessment", `<span class="badge badge-${ld}">${ld.toUpperCase()} · ${ra.score || 0}/10</span>`, `
      <div class="risk-row">
        <div class="risk-score-num" style="color:${riskColor(ld)}">${ra.score || 0}</div>
        <div class="risk-bar-wrap">
          <div class="risk-label-text">${escHtml(ra.primaryRisk || "")}</div>
          <div class="risk-bar">
            <div class="risk-bar-fill" style="width:${(ra.score || 0) * 10}%"></div>
          </div>
        </div>
      </div>
      ${(ra.risks || []).map(risk => `
        <div style="font-size:11px;color:var(--muted);padding:3px 0 3px 14px;position:relative;line-height:1.4">
          <span style="position:absolute;left:0;color:var(--accent)">·</span>${escHtml(risk)}
        </div>
      `).join("")}
    `)}

    <!-- Political Signals -->
    ${renderCard("signals", "⚡", "Political Signals", `<span style="font-size:11px;color:var(--muted)">${(r.politicalSignals || []).length} found</span>`, `
      ${(r.politicalSignals || []).map(s => `
        <div class="signal-item">
          <div class="signal-top">
            <span class="dot dot-${s.severity}"></span>
            <span class="signal-name">${escHtml(s.signal)}</span>
          </div>
          ${s.quote ? `<div class="signal-quote">"${escHtml(s.quote)}"</div>` : ""}
          <div class="signal-explain">${escHtml(s.explanation)}</div>
        </div>
      `).join("")}
    `)}

    <!-- Hidden Intent -->
    ${renderCard("intent", "🔍", "Hidden Intent", `<span style="font-size:10px;color:var(--muted)">Confidence: ${r.hiddenIntent?.confidence || "—"}</span>`, `
      <div class="intent-grid">
        <div class="intent-box">
          <div class="ilabel">What they said</div>
          <div class="itext">${escHtml(r.hiddenIntent?.surface || "")}</div>
        </div>
        <div class="intent-box highlighted">
          <div class="ilabel" style="color:var(--accent)">What they mean</div>
          <div class="itext">${escHtml(r.hiddenIntent?.actual || "")}</div>
        </div>
      </div>
    `)}

    <!-- Power Dynamics -->
    ${renderCard("power", "⚖️", "Power Dynamics", "", `
      <div class="power-row">
        <div class="plabel">Sender is positioning as</div>
        <div class="ptext">${escHtml(r.powerDynamics?.senderPosition || "")}</div>
      </div>
      <div class="power-row">
        <div class="plabel">What this means for you</div>
        <div class="ptext">${escHtml(r.powerDynamics?.recipientImplication || "")}</div>
      </div>
      <div class="power-row">
        <div class="plabel">Balance shift</div>
        <div class="ptext">${escHtml(r.powerDynamics?.balanceShift || "")}</div>
      </div>
    `)}

    <!-- Suggested Replies -->
    ${renderCard("replies", "💬", "Suggested Replies", "", renderReplies(r.suggestedResponses))}

    <!-- Action Advice -->
    ${(r.actionAdvice || []).length > 0 ? renderCard("advice", "🚀", "Your Next Move", "", `
      <ul class="advice-list">
        ${(r.actionAdvice || []).map(a => `<li>${escHtml(a)}</li>`).join("")}
      </ul>
    `) : ""}

  `;

  // Bind card toggles
  document.querySelectorAll(".card-header[data-card]").forEach(header => {
    header.addEventListener("click", () => {
      const cardId = header.dataset.card;
      const body = document.getElementById(`card-body-${cardId}`);
      const chevron = header.querySelector(".chevron");
      const isOpen = header.classList.contains("open");
      header.classList.toggle("open", !isOpen);
      if (body) body.style.display = isOpen ? "none" : "block";
      chevron?.classList.toggle("rotated", !isOpen);
    });
  });
}

function renderCard(id, icon, title, meta, bodyHtml) {
  return `
    <div class="result-card">
      <div class="card-header open" data-card="${id}">
        <span class="card-icon">${icon}</span>
        <span class="card-title" style="color:var(--text2)">${title}</span>
        <div class="card-meta">${meta}
          <svg class="chevron rotated" width="12" height="12" fill="none" stroke="var(--muted)" stroke-width="2" viewBox="0 0 24 24">
            <path d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </div>
      <div class="card-body" id="card-body-${id}">${bodyHtml}</div>
    </div>
  `;
}

function renderReplies(responses) {
  if (!responses) return "<p style='color:var(--muted);font-size:12px'>No replies generated.</p>";

  return `
    <div class="reply-tabs">
      <button class="reply-tab active" onclick="switchReply(this,'diplomatic')">Diplomatic</button>
      <button class="reply-tab" onclick="switchReply(this,'assertive')">Assertive</button>
      <button class="reply-tab" onclick="switchReply(this,'momentum')">Momentum</button>
    </div>
    <div id="replyContent">${renderReplyContent(responses, "diplomatic")}</div>
  `;
}

function renderReplyContent(responses, type) {
  const r = responses?.[type];
  if (!r?.text) return "<p style='color:var(--muted);font-size:12px'>No suggestion.</p>";
  return `
    <div class="reply-box">
      <div class="reply-text">${escHtml(r.text)}</div>
      <div class="reply-rationale">${escHtml(r.rationale || "")}</div>
    </div>
    <button class="reply-copy-btn" onclick="copyReply('${type}')">Copy this reply</button>
  `;
}

window.switchReply = function(btn, type) {
  document.querySelectorAll(".reply-tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  activeReplyType = type;
  const rc = document.getElementById("replyContent");
  if (rc && currentResult) {
    rc.innerHTML = renderReplyContent(currentResult.suggestedResponses, type);
  }
};

window.copyReply = async function(type) {
  const text = currentResult?.suggestedResponses?.[type]?.text;
  if (text) {
    await navigator.clipboard.writeText(text);
    const btns = document.querySelectorAll(".reply-copy-btn");
    btns.forEach(b => { b.textContent = "Copied!"; setTimeout(() => b.textContent = "Copy this reply", 1500); });
  }
};

// ── Signal Glossary ──
function renderSignalGlossary() {
  const container = document.getElementById("signalGlossary");
  if (!container) return;

  container.innerHTML = SIGNAL_GLOSSARY.map(sig => `
    <div class="result-card">
      <div style="padding:12px 14px;border-left:3px solid ${sig.color}">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:18px">${sig.icon}</span>
          <span style="font-size:13px;font-weight:700;color:var(--text)">${sig.name}</span>
        </div>
        <p style="font-size:12px;color:var(--text2);line-height:1.5;margin-bottom:8px">${sig.description}</p>
        <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.6px">Examples</div>
        ${sig.examples.map(ex => `
          <div style="font-size:12px;color:var(--muted);font-style:italic;padding:2px 0">"${ex}"</div>
        `).join("")}
      </div>
    </div>
  `).join("");
}

// ── Replies Tab ──
function updateRepliesTab(result) {
  const panel = document.getElementById("repliesPanel");
  if (!panel || !result?.suggestedResponses) return;

  panel.innerHTML = `
    <div style="margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px">
        Choose your strategy
      </div>
      ${["diplomatic", "assertive", "momentum"].map(type => {
        const r = result.suggestedResponses[type];
        if (!r) return "";
        const icons = { diplomatic: "🕊", assertive: "💪", momentum: "⚡" };
        const colors = { diplomatic: "var(--teal)", assertive: "var(--red)", momentum: "var(--yellow)" };
        return `
          <div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px;cursor:pointer"
               onclick="selectFullReply('${type}', this)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <span style="font-size:16px">${icons[type]}</span>
              <span style="font-size:13px;font-weight:700;color:${colors[type]}">${r.label || type}</span>
            </div>
            <div style="font-size:13px;color:var(--text);line-height:1.6;margin-bottom:6px">${escHtml(r.text)}</div>
            <div style="font-size:11px;color:var(--muted);font-style:italic">${escHtml(r.rationale || "")}</div>
            <button style="margin-top:10px;width:100%;padding:6px;background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:6px;color:var(--text2);font-size:11px;cursor:pointer"
                    onclick="event.stopPropagation(); copyTextDirect('${escHtml(r.text).replace(/'/g, "\\'")}', this)">
              Copy reply
            </button>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

window.selectFullReply = function(type, card) {
  document.querySelectorAll("#repliesPanel [onclick^='selectFullReply']").forEach(c => {
    c.style.borderColor = "var(--border)";
  });
  card.style.borderColor = "var(--accent)";
};

window.copyTextDirect = async function(text, btn) {
  await navigator.clipboard.writeText(text);
  btn.textContent = "Copied!";
  setTimeout(() => btn.textContent = "Copy reply", 1500);
};

// ── History ──
async function loadHistory() {
  const { analysisHistory = [] } = await chrome.storage.local.get("analysisHistory");
  const container = document.getElementById("historyList");

  if (!analysisHistory.length) {
    container.innerHTML = "<p style='color:var(--muted);font-size:12px;text-align:center;padding:20px'>No history yet.</p>";
    return;
  }

  container.innerHTML = analysisHistory.map((item, idx) => {
    const ra = item.result?.riskAssessment;
    const date = new Date(item.timestamp).toLocaleString();
    return `
      <div class="history-item" onclick="loadHistoryItem(${idx})">
        <div class="history-preview">${escHtml((item.text || "").slice(0, 100))}${item.text?.length > 100 ? "…" : ""}</div>
        <div class="history-meta">
          <span>${date}</span>
          ${ra ? `<span class="badge badge-${ra.level}">${ra.level?.toUpperCase()} ${ra.score}/10</span>` : ""}
        </div>
      </div>
    `;
  }).join("");
}

window.loadHistoryItem = async function(idx) {
  const { analysisHistory = [] } = await chrome.storage.local.get("analysisHistory");
  const item = analysisHistory[idx];
  if (!item) return;

  document.getElementById("sidebarInput").value = item.text || "";
  if (item.result) {
    currentResult = item.result;
    renderResults(item.result);
    updateRepliesTab(item.result);
  }

  // Switch to analyze tab
  document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.querySelector("[data-tab='analyze']")?.classList.add("active");
  document.getElementById("tab-analyze")?.classList.add("active");
};

async function saveToHistory(text, result) {
  const { analysisHistory = [] } = await chrome.storage.local.get("analysisHistory");
  analysisHistory.unshift({ text: text.slice(0, 500), result, timestamp: Date.now() });
  await chrome.storage.local.set({ analysisHistory: analysisHistory.slice(0, 50) });
}

async function clearHistory() {
  if (confirm("Clear all analysis history?")) {
    await chrome.storage.local.remove("analysisHistory");
    loadHistory();
  }
}

// ── Helpers ──
function riskColor(level) {
  return { low: "#22c55e", medium: "#fb923c", high: "#ef4444", critical: "#dc2626" }[level] || "#fb923c";
}

function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
