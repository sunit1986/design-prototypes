// ============================================================
// Workplace Political Intelligence — Content Script
// Injects floating button, listens for text selection
// ============================================================

(function () {
  "use strict";

  let floatingBtn = null;
  let lastSelectedText = "";

  // --- Floating Analyze Button ---
  function createFloatingButton() {
    if (floatingBtn) return;

    floatingBtn = document.createElement("div");
    floatingBtn.id = "wpi-float-btn";
    floatingBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>Analyze Politics</span>
    `;
    floatingBtn.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      display: none;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      color: #e94560;
      border: 1px solid #e94560;
      border-radius: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(233,69,96,0.3);
      transition: all 0.2s ease;
      white-space: nowrap;
      letter-spacing: 0.3px;
    `;

    floatingBtn.addEventListener("mouseenter", () => {
      floatingBtn.style.background = "linear-gradient(135deg, #e94560, #c23152)";
      floatingBtn.style.color = "#fff";
    });
    floatingBtn.addEventListener("mouseleave", () => {
      floatingBtn.style.background = "linear-gradient(135deg, #1a1a2e, #16213e)";
      floatingBtn.style.color = "#e94560";
    });

    floatingBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      hideFloatingButton();
      triggerAnalysis(lastSelectedText);
    });

    document.body.appendChild(floatingBtn);
  }

  function showFloatingButton(x, y) {
    createFloatingButton();
    floatingBtn.style.display = "flex";

    // Position near selection, avoid going off-screen
    const btnW = 150;
    const btnH = 34;
    let left = Math.min(x, window.innerWidth - btnW - 16);
    let top = y - btnH - 8;
    if (top < 8) top = y + 8;

    floatingBtn.style.left = `${left}px`;
    floatingBtn.style.top = `${top}px`;
  }

  function hideFloatingButton() {
    if (floatingBtn) floatingBtn.style.display = "none";
  }

  // --- Text Selection Listener ---
  document.addEventListener("mouseup", (e) => {
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length > 20) {
        lastSelectedText = text;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        showFloatingButton(
          rect.left + window.scrollX + rect.width / 2,
          rect.top + window.scrollY
        );

        // Also notify background (for context menu)
        chrome.runtime.sendMessage({
          type: "TEXT_SELECTED",
          text: text
        }).catch(() => {});
      } else {
        // Delay hide to allow button click to register
        setTimeout(hideFloatingButton, 150);
      }
    }, 10);
  });

  // Hide button on scroll or escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideFloatingButton();
  });
  document.addEventListener("scroll", hideFloatingButton, { passive: true });

  // --- Trigger Analysis (opens sidebar) ---
  function triggerAnalysis(text) {
    chrome.runtime.sendMessage({
      type: "OPEN_SIDEBAR",
      text: text
    }).catch(() => {
      // Fallback: open popup
      chrome.runtime.sendMessage({ type: "TEXT_SELECTED", text });
    });
  }

  // --- Platform-specific integrations ---
  const platform = detectPlatform();
  if (platform) injectPlatformButton(platform);

  function detectPlatform() {
    const host = window.location.hostname;
    if (host.includes("mail.google.com")) return "gmail";
    if (host.includes("outlook.live.com") || host.includes("outlook.office")) return "outlook";
    if (host.includes("slack.com")) return "slack";
    if (host.includes("linkedin.com")) return "linkedin";
    if (host.includes("notion.so")) return "notion";
    return null;
  }

  function injectPlatformButton(platform) {
    // Wait for DOM to be ready with the platform UI
    const observer = new MutationObserver(() => {
      tryInjectButton(platform, observer);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 15000); // stop after 15s
  }

  function tryInjectButton(platform, observer) {
    const configs = {
      gmail: {
        containerSel: ".btC", // Gmail compose/read toolbar
        buttonClass: "wpi-gmail-btn"
      },
      outlook: {
        containerSel: "[data-testid='message-body-content']",
        buttonClass: "wpi-outlook-btn"
      },
      slack: {
        containerSel: ".c-message_actions__container",
        buttonClass: "wpi-slack-btn"
      }
    };

    const cfg = configs[platform];
    if (!cfg) return;

    const containers = document.querySelectorAll(cfg.containerSel);
    containers.forEach(container => {
      if (container.querySelector("." + cfg.buttonClass)) return; // already injected

      const btn = document.createElement("button");
      btn.className = cfg.buttonClass + " wpi-platform-btn";
      btn.textContent = "⚡ Analyze Politics";
      btn.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        margin: 0 4px;
        background: transparent;
        color: #e94560;
        border: 1px solid #e94560;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
      `;

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        const text = extractPlatformText(platform);
        if (text) triggerAnalysis(text);
      });

      container.appendChild(btn);
    });
  }

  function extractPlatformText(platform) {
    const selectors = {
      gmail: [".a3s.aiL", ".ii.gt", ".gmail_quote"],
      outlook: ["[data-testid='message-body']", ".allowTextSelection"],
      slack: [".c-message_kit__text", "[data-qa='message_content']"],
      linkedin: [".msg-s-event-listitem__body"],
      notion: [".notion-page-content"]
    };

    const sels = selectors[platform] || [];
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (el?.innerText?.length > 20) return el.innerText.trim();
    }

    // Fallback to selected text
    return window.getSelection()?.toString().trim() || "";
  }

})();
