// ============================================================
// Workplace Political Intelligence — Sidebar Script
// ============================================================

let currentResult = null;
let activeReplyType = "diplomatic";

const SIGNAL_GLOSSARY = [
  { name: "Decision Deflection",     icon: "🔄", color: "#e94560", description: "Shifting the burden of a decision to avoid accountability.", examples: ["We should align with leadership first.", "Let's get buy-in before moving forward."] },
  { name: "Authority Signaling",     icon: "👑", color: "#fb923c", description: "Dropping names or titles to establish dominance or legitimacy.", examples: ["I spoke with the CEO about this.", "The board is very focused on this."] },
  { name: "Soft Rejection",          icon: "🚫", color: "#a78bfa", description: "Declining something without saying no to maintain political cover.", examples: ["Interesting, but maybe not the right timing.", "I'm not sure the team is ready."] },
  { name: "Credit Pre-Positioning",  icon: "🏆", color: "#fbbf24", description: "Setting up to claim credit for an outcome before it happens.", examples: ["I've been pushing this internally for months.", "My team has been working on this."] },
  { name: "Blame Pre-Positioning",   icon: "🎯", color: "#ef4444", description: "Laying groundwork to assign blame to others if something fails.", examples: ["I had concerns about this from the start.", "I did flag this risk earlier."] },
  { name: "Coalition Building",      icon: "🤝", color: "#34d399", description: "Testing if you'll join their side, or revealing their alliances.", examples: ["I think most people on the team agree.", "Several stakeholders share my view."] },
  { name: "Territorial Behavior",    icon: "🗺️", color: "#60a5fa", description: "Marking a domain as their own to block others from influencing it.", examples: ["This falls under my team's scope.", "We've already handled this area."] },
  { name: "Escalation Threat",       icon: "⬆️", color: "#ef4444", description: "Implying they will take things to a higher authority if not accommodated.", examples: ["I may need to bring this to leadership.", "This might need a broader discussion."] },
  { name: "Strategic Ambiguity",     icon: "🌫️", color: "#8888aa", description: "Being deliberately vague to preserve options and avoid commitment.", examples: ["We'll see how things develop.", "There are a lot of factors to consider."] },
  { name: "Passive Resistance",      icon: "🐢", color: "#fb923c", description: "Appearing to agree while doing nothing to kill momentum slowly.", examples: ["Absolutely, let's schedule a follow-up soon.", "I'll loop in the team when I get a chance."] },
  { name: "Scope Creep Attack",      icon: "🕸️", color: "#a78bfa", description: "Adding complexity or dependencies to delay, control, or take over a project.", examples: ["We also need to consider X, Y, and Z.", "There's a dependency on the other team."] },
  { name: "CYA Language",            icon: "🛡️", color: "#34d399", description: "Cover-your-ass language that insulates the sender from future criticism.", examples: ["As I mentioned in my previous email…", "I just want to make sure we're aligned…"] }
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
  const badge = document.getElementById("providerBadge");
  if (badge) badge.textContent = apiProvider === "openai" ? "OpenAI" : "Claude";

  if (!apiKey) {
    document.getElementById("noKeyWarning").classList.remove("hidden");
    document.getElementById("analyzeForm").classList.add("hidden");
    return;
  }

  const { pendingAnalysis } = await chrome.storage.session.get("pendingAnalysis");
  if (pendingAnalysis?.text) {
    document.getElementById("sidebarInput").value = pendingAnalysis.text;
    await chrome.storage.session.remove("pendingAnalysis");
    setTimeout(() => runAnalysis(), 300);
  }
}

function bindEvents() {
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
  if (!text) { document.getElementById("sidebarInput").focus(); return; }

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
      clearInterval(window.__loadingInterval);
      currentResult = response.result;
      renderResults(response.result);
      updateRepliesTab(response.result);
      if ((await chrome.storage.sync.get("saveHistory")).saveHistory !== false) {
        await saveToHistory(text, response.result);
      }
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
  const steps = ["Reading message structure…", "Detecting political signals…", "Analyzing power dynamics…", "Building tactical read…"];
  let i = 0;
  document.getElementById("sidebarResults").innerHTML = `
    <div class="loading-wrap">
      <div class="spinner"></div>
      <div class="loading-text">Decoding workplace politics…</div>
      <div class="loading-steps">
        ${steps.map((s, idx) => `<div class="loading-step ${idx === 0 ? "active" : ""}" id="ls${idx}">${s}</div>`).join("")}
      </div>
    </div>`;
  window.__loadingInterval = clearInterval(window.__loadingInterval) || setInterval(() => {
    document.getElementById(`ls${i}`)?.classList.remove("active");
    i++;
    const el = document.getElementById(`ls${i}`);
    if (el) el.classList.add("active"); else clearInterval(window.__loadingInterval);
  }, 600);
}

function showError(err) {
  const msg = err === "NO_API_KEY"
    ? `No API key configured. <a href="#" id="errLink" style="color:#e94560">Configure now →</a>`
    : escHtml(String(err));
  document.getElementById("sidebarResults").innerHTML = `<div class="error-box">${msg}</div>`;
  document.getElementById("errLink")?.addEventListener("click", () => chrome.runtime.openOptionsPage());
}

// ── Render Results ──
function renderResults(r) {
  const ra = r.riskAssessment || {};
  const tr = r.tacticalRead || {};
  const fl = r.fluffAnalysis || {};
  const mv = r.motivation || {};
  const tl = r.threatLevel || {};
  const wf = r.warningFlags || [];

  document.getElementById("sidebarResults").innerHTML = `

    <!-- TACTICAL READ — top card, most prominent -->
    ${renderTacticalRead(tr, ra)}

    <!-- WARNING FLAGS — only if present -->
    ${wf.length > 0 ? renderWarningFlags(wf) : ""}

    <!-- THREAT LEVEL — only if not "none" -->
    ${tl.level && tl.level !== "none" ? renderThreatLevel(tl) : ""}

    <!-- FLUFF ANALYSIS -->
    ${renderFluffAnalysis(fl)}

    <!-- MOTIVATION -->
    ${renderMotivation(mv)}

    <!-- POLITICAL SIGNALS -->
    ${renderCard("signals", "⚡", "Political Signals",
        `<span style="font-size:11px;color:var(--muted)">${(r.politicalSignals||[]).length} detected</span>`,
        renderSignals(r.politicalSignals || []))}

    <!-- HIDDEN INTENT -->
    ${renderCard("intent", "🔍", "Hidden Intent",
        `<span style="font-size:10px;color:var(--muted)">Confidence: ${r.hiddenIntent?.confidence || "—"}</span>`,
        renderHiddenIntent(r.hiddenIntent || {}))}

    <!-- POWER DYNAMICS -->
    ${renderCard("power", "⚖️", "Power Dynamics", "", renderPowerDynamics(r.powerDynamics || {}))}

    <!-- RISK ASSESSMENT -->
    ${renderCard("risk", "🎯", "Risk Assessment",
        `<span class="badge badge-${ra.level}">${(ra.level||"").toUpperCase()} · ${ra.score||0}/10</span>`,
        renderRisk(ra))}

    <!-- SUGGESTED REPLIES -->
    ${renderCard("replies", "💬", "Suggested Replies", "", renderReplies(r.suggestedResponses))}

    <!-- ACTION ADVICE -->
    ${(r.actionAdvice||[]).length > 0
      ? renderCard("advice", "🚀", "Your Next Move", "", `<ul class="advice-list">${(r.actionAdvice||[]).map(a=>`<li>${escHtml(a)}</li>`).join("")}</ul>`)
      : ""}
  `;

  // Bind card toggles
  document.querySelectorAll(".card-header[data-card]").forEach(h => {
    h.addEventListener("click", () => {
      const body = document.getElementById(`card-body-${h.dataset.card}`);
      const chevron = h.querySelector(".chevron");
      const isOpen = h.classList.contains("open");
      h.classList.toggle("open", !isOpen);
      if (body) body.style.display = isOpen ? "none" : "block";
      chevron?.classList.toggle("rotated", !isOpen);
    });
  });
}

// ── Section Renderers ──

function renderTacticalRead(tr, ra) {
  const toneColors = {
    hostile: "#ef4444", manipulative: "#e94560", deceptive: "#f97316",
    "passive-aggressive": "#fb923c", threatening: "#dc2626",
    dismissive: "#a78bfa", genuine: "#22c55e", friendly: "#34d399", neutral: "#8888aa"
  };
  const toneColor = toneColors[tr.tone] || "#8888aa";
  const tone = tr.tone || "neutral";

  return `
    <div class="tactical-card">
      <div class="tactical-top">
        <div class="tactical-icon">⚡</div>
        <div class="tactical-label">TACTICAL READ</div>
        <div class="tone-badge" style="background:${toneColor}22;color:${toneColor};border:1px solid ${toneColor}44">
          ${tone.toUpperCase()}
        </div>
      </div>
      <div class="tactical-headline">${escHtml(tr.headline || "Analyzing…")}</div>
      ${(tr.bodyLanguage||[]).length > 0 ? `
        <ul class="tactical-bullets">
          ${(tr.bodyLanguage||[]).map(b => `<li>${escHtml(b)}</li>`).join("")}
        </ul>` : ""}
    </div>`;
}

function renderWarningFlags(flags) {
  const sevConfig = {
    critical: { color: "#dc2626", bg: "rgba(220,38,38,0.12)", border: "rgba(220,38,38,0.4)", icon: "🚨" },
    danger:   { color: "#ef4444", bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.3)", icon: "⛔" },
    warning:  { color: "#fb923c", bg: "rgba(251,146,60,0.10)", border: "rgba(251,146,60,0.3)", icon: "⚠️" }
  };

  return `
    <div class="warning-section">
      ${flags.map(f => {
        const cfg = sevConfig[f.severity] || sevConfig.warning;
        return `
          <div class="warning-flag" style="background:${cfg.bg};border:1px solid ${cfg.border};border-left:3px solid ${cfg.color}">
            <div class="wf-top">
              <span class="wf-icon">${cfg.icon}</span>
              <span class="wf-name" style="color:${cfg.color}">${escHtml(f.flag)}</span>
              <span class="wf-sev" style="color:${cfg.color}">${f.severity.toUpperCase()}</span>
            </div>
            <div class="wf-explain">${escHtml(f.explanation)}</div>
          </div>`;
      }).join("")}
    </div>`;
}

function renderThreatLevel(tl) {
  const cfg = {
    severe:   { color: "#dc2626", bg: "rgba(220,38,38,0.12)", label: "SEVERE THREAT" },
    direct:   { color: "#ef4444", bg: "rgba(239,68,68,0.10)", label: "DIRECT THREAT" },
    moderate: { color: "#fb923c", bg: "rgba(251,146,60,0.10)", label: "MODERATE THREAT" },
    subtle:   { color: "#fbbf24", bg: "rgba(251,191,36,0.08)", label: "SUBTLE THREAT" }
  }[tl.level] || { color: "#8888aa", bg: "rgba(136,136,170,0.08)", label: "THREAT DETECTED" };

  return `
    <div class="result-card" style="border-color:${cfg.color}44">
      <div class="card-header open" data-card="threat" style="border-bottom:1px solid ${cfg.color}22">
        <span class="card-icon">🔥</span>
        <span class="card-title" style="color:${cfg.color}">${cfg.label}</span>
        <div class="card-meta">
          <svg class="chevron rotated" width="12" height="12" fill="none" stroke="var(--muted)" stroke-width="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>
        </div>
      </div>
      <div class="card-body" id="card-body-threat">
        <div style="font-size:12px;font-weight:700;color:${cfg.color};margin-bottom:6px">${escHtml(tl.type || "")}</div>
        <div style="font-size:12px;color:var(--text2);line-height:1.6">${escHtml(tl.details || "")}</div>
      </div>
    </div>`;
}

function renderFluffAnalysis(fl) {
  const score = fl.fluffScore ?? 0;
  const fluffColor = score >= 7 ? "#fb923c" : score >= 4 ? "#fbbf24" : "#22c55e";
  const fluffLabel = score >= 8 ? "Mostly fluff" : score >= 5 ? "Significant fluff" : score >= 2 ? "Some fluff" : "Clean";

  return renderCard("fluff", "💨", "Fluff Analysis",
    `<span style="font-size:11px;color:${fluffColor};font-weight:700">${fluffLabel} ${score}/10</span>`,
    `
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.6px">Fluff Score</span>
          <span style="font-size:11px;font-weight:700;color:${fluffColor}">${score}/10</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,.07);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${score*10}%;background:linear-gradient(90deg,#22c55e,#fbbf24,#fb923c);border-radius:3px;transition:width .6s ease"></div>
        </div>
      </div>
      ${(fl.fluffPhrases||[]).length > 0 ? `
        <div style="margin-bottom:10px">
          <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px">Empty phrases detected</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${(fl.fluffPhrases||[]).map(p => `<span style="padding:2px 8px;background:rgba(251,146,60,.12);border:1px solid rgba(251,146,60,.25);border-radius:10px;font-size:11px;color:#fb923c;font-style:italic">"${escHtml(p)}"</span>`).join("")}
          </div>
        </div>` : ""}
      <div>
        <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:5px">What is actually being said</div>
        <div style="font-size:12px;color:var(--text);line-height:1.6;padding:10px 12px;background:rgba(34,197,94,.06);border-left:2px solid #22c55e;border-radius:0 6px 6px 0">${escHtml(fl.realContent || "Nothing substantive.")}</div>
      </div>`
  );
}

function renderMotivation(mv) {
  return renderCard("motivation", "🧠", "Their Motivation", "",
    `<div class="power-row">
      <div class="plabel">What they actually want</div>
      <div class="ptext" style="color:var(--text)">${escHtml(mv.primary || "—")}</div>
    </div>
    <div class="power-row">
      <div class="plabel">Secondary goal</div>
      <div class="ptext">${escHtml(mv.secondary || "—")}</div>
    </div>
    <div style="padding:10px 12px;background:rgba(233,69,96,.07);border-left:2px solid var(--accent);border-radius:0 6px 6px 0;margin-top:4px">
      <div style="font-size:10px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:4px">What they need from you</div>
      <div style="font-size:12px;color:var(--text);line-height:1.5">${escHtml(mv.whatTheyNeedFromYou || "—")}</div>
    </div>`
  );
}

function renderSignals(signals) {
  if (!signals.length) return `<p style="color:var(--muted);font-size:12px">No political signals detected.</p>`;
  return signals.map(s => `
    <div class="signal-item">
      <div class="signal-top">
        <span class="dot dot-${s.severity}"></span>
        <span class="signal-name">${escHtml(s.signal)}</span>
      </div>
      ${s.quote ? `<div class="signal-quote">"${escHtml(s.quote)}"</div>` : ""}
      <div class="signal-explain">${escHtml(s.explanation)}</div>
    </div>`).join("");
}

function renderHiddenIntent(hi) {
  return `
    <div class="intent-grid">
      <div class="intent-box">
        <div class="ilabel">What they said</div>
        <div class="itext">${escHtml(hi.surface || "—")}</div>
      </div>
      <div class="intent-box highlighted">
        <div class="ilabel" style="color:var(--accent)">What they mean</div>
        <div class="itext">${escHtml(hi.actual || "—")}</div>
      </div>
    </div>
    ${hi.confidence ? `<div style="margin-top:6px;font-size:10px;color:#555570;text-align:right">Confidence: ${hi.confidence}</div>` : ""}`;
}

function renderPowerDynamics(pd) {
  return `
    <div class="power-row"><div class="plabel">Sender positioning as</div><div class="ptext">${escHtml(pd.senderPosition||"—")}</div></div>
    <div class="power-row"><div class="plabel">What this does to your position</div><div class="ptext">${escHtml(pd.recipientImplication||"—")}</div></div>
    <div class="power-row"><div class="plabel">Power balance shift</div><div class="ptext">${escHtml(pd.balanceShift||"—")}</div></div>`;
}

function renderRisk(ra) {
  const ld = ra.level || "medium";
  return `
    <div class="risk-row">
      <div class="risk-score-num" style="color:${riskColor(ld)}">${ra.score||0}</div>
      <div class="risk-bar-wrap">
        <div class="risk-label-text">${escHtml(ra.primaryRisk||"")}</div>
        <div class="risk-bar"><div class="risk-bar-fill" style="width:${(ra.score||0)*10}%"></div></div>
      </div>
    </div>
    ${(ra.risks||[]).map(r => `
      <div style="font-size:11px;color:var(--muted);padding:3px 0 3px 14px;position:relative;line-height:1.4">
        <span style="position:absolute;left:0;color:var(--accent)">·</span>${escHtml(r)}
      </div>`).join("")}`;
}

function renderReplies(responses) {
  if (!responses) return `<p style="color:var(--muted);font-size:12px">No replies generated.</p>`;
  return `
    <div class="reply-tabs">
      <button class="reply-tab active" onclick="switchReply(this,'diplomatic')">🕊 Diplomatic</button>
      <button class="reply-tab" onclick="switchReply(this,'assertive')">💪 Assertive</button>
      <button class="reply-tab" onclick="switchReply(this,'momentum')">⚡ Momentum</button>
    </div>
    <div id="replyContent">${renderReplyContent(responses, "diplomatic")}</div>`;
}

function renderReplyContent(responses, type) {
  const r = responses?.[type];
  if (!r?.text) return `<p style="color:var(--muted);font-size:12px">No suggestion available.</p>`;
  return `
    <div class="reply-box">
      <div class="reply-text">${escHtml(r.text)}</div>
      <div class="reply-rationale">${escHtml(r.rationale||"")}</div>
    </div>
    <button class="reply-copy-btn" onclick="copyReply('${type}')">Copy this reply</button>`;
}

function renderCard(id, icon, title, meta, body) {
  return `
    <div class="result-card">
      <div class="card-header open" data-card="${id}">
        <span class="card-icon">${icon}</span>
        <span class="card-title" style="color:var(--text2)">${title}</span>
        <div class="card-meta">${meta}
          <svg class="chevron rotated" width="12" height="12" fill="none" stroke="var(--muted)" stroke-width="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>
        </div>
      </div>
      <div class="card-body" id="card-body-${id}">${body}</div>
    </div>`;
}

// ── Replies Tab ──
window.switchReply = function(btn, type) {
  document.querySelectorAll(".reply-tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  const rc = document.getElementById("replyContent");
  if (rc && currentResult) rc.innerHTML = renderReplyContent(currentResult.suggestedResponses, type);
};

window.copyReply = async function(type) {
  const text = currentResult?.suggestedResponses?.[type]?.text;
  if (text) {
    await navigator.clipboard.writeText(text);
    document.querySelectorAll(".reply-copy-btn").forEach(b => {
      b.textContent = "Copied!";
      setTimeout(() => b.textContent = "Copy this reply", 1500);
    });
  }
};

function updateRepliesTab(result) {
  const panel = document.getElementById("repliesPanel");
  if (!panel || !result?.suggestedResponses) return;
  const icons = { diplomatic: "🕊", assertive: "💪", momentum: "⚡" };
  const colors = { diplomatic: "var(--teal)", assertive: "var(--red)", momentum: "var(--yellow)" };

  panel.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px">Choose your strategy</div>
    ${["diplomatic","assertive","momentum"].map(type => {
      const r = result.suggestedResponses[type];
      if (!r) return "";
      return `
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:18px">${icons[type]}</span>
            <span style="font-size:13px;font-weight:700;color:${colors[type]}">${r.label || type}</span>
          </div>
          <div style="font-size:13px;color:var(--text);line-height:1.6;margin-bottom:6px">${escHtml(r.text)}</div>
          <div style="font-size:11px;color:var(--muted);font-style:italic;margin-bottom:10px">${escHtml(r.rationale||"")}</div>
          <button style="width:100%;padding:7px;background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:6px;color:var(--text2);font-size:11px;font-weight:600;cursor:pointer"
                  onclick="copyTextDirect(this, \`${r.text.replace(/`/g,"\\`")}\`)">Copy reply</button>
        </div>`;
    }).join("")}`;
}

window.copyTextDirect = async function(btn, text) {
  await navigator.clipboard.writeText(text);
  btn.textContent = "Copied!";
  setTimeout(() => btn.textContent = "Copy reply", 1500);
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
        <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">Examples</div>
        ${sig.examples.map(ex => `<div style="font-size:12px;color:var(--muted);font-style:italic;padding:2px 0">"${ex}"</div>`).join("")}
      </div>
    </div>`).join("");
}

// ── History ──
async function loadHistory() {
  const { analysisHistory = [] } = await chrome.storage.local.get("analysisHistory");
  const container = document.getElementById("historyList");
  if (!analysisHistory.length) {
    container.innerHTML = `<p style="color:var(--muted);font-size:12px;text-align:center;padding:20px">No history yet.</p>`;
    return;
  }
  container.innerHTML = analysisHistory.map((item, idx) => {
    const ra = item.result?.riskAssessment;
    const headline = item.result?.tacticalRead?.headline;
    return `
      <div class="history-item" onclick="loadHistoryItem(${idx})">
        ${headline ? `<div style="font-size:12px;font-weight:600;color:var(--accent);margin-bottom:4px">${escHtml(headline)}</div>` : ""}
        <div class="history-preview">${escHtml((item.text||"").slice(0,100))}${item.text?.length>100?"…":""}</div>
        <div class="history-meta">
          <span>${new Date(item.timestamp).toLocaleString()}</span>
          ${ra ? `<span class="badge badge-${ra.level}">${(ra.level||"").toUpperCase()} ${ra.score}/10</span>` : ""}
        </div>
      </div>`;
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
  return { low:"#22c55e", medium:"#fb923c", high:"#ef4444", critical:"#dc2626" }[level] || "#fb923c";
}
function escHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
