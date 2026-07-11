/* Darija Translator – Inline Overlay Content Script */
(function () {
  const OVERLAY_ID = "darija-translator-overlay";

  function removeOverlay() {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) existing.remove();
  }

  function createOverlay(x, y) {
    removeOverlay();

    const el = document.createElement("div");
    el.id = OVERLAY_ID;
    el.innerHTML = `
      <div class="darija-header">
        <span class="darija-title">🇲🇦 Darija</span>
        <button class="darija-close" title="Close">✕</button>
      </div>
      <div class="darija-body">
        <div class="darija-loading">
          <div class="darija-spinner"></div>
          <span class="darija-loading-text">Translating…</span>
        </div>
      </div>
    `;
    document.body.appendChild(el);

    // Position relative to viewport (fixed positioning is robust against scroll & parents)
    const rect = el.getBoundingClientRect();
    let left = x;
    let top = y + 8;
    if (left + rect.width > window.innerWidth - 12) left = window.innerWidth - rect.width - 12;
    if (left < 12) left = 12;
    if (top + rect.height > window.innerHeight - 12) top = y - rect.height - 8;
    el.style.left = left + "px";
    el.style.top = top + "px";

    el.querySelector(".darija-close").addEventListener("click", removeOverlay);
    return el;
  }

  function showResult(overlay, translation) {
    if (!overlay) return;
    const body = overlay.querySelector(".darija-body");
    if (!body) return;
    body.innerHTML = `
      <p class="darija-result" dir="rtl" lang="ary">${escapeHtml(translation)}</p>
      <div class="darija-actions">
        <button class="darija-btn darija-copy">📋 Copy</button>
        <button class="darija-btn darija-speak">🔊 Read aloud</button>
      </div>
    `;
    body.querySelector(".darija-copy").addEventListener("click", () => {
      navigator.clipboard.writeText(translation).catch(console.error);
      body.querySelector(".darija-copy").textContent = "✓ Copied!";
      setTimeout(() => body.querySelector(".darija-copy").textContent = "📋 Copy", 1200);
    });
    body.querySelector(".darija-speak").addEventListener("click", () => {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(translation);
      u.lang = "ar-MA";
      speechSynthesis.speak(u);
    });
  }

  function showError(overlay, msg) {
    if (!overlay) return;
    const body = overlay.querySelector(".darija-body");
    if (!body) return;
    body.innerHTML = `<p class="darija-error">${escapeHtml(msg)}</p>`;
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  // Listen for messages from the service worker
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === "showLoadingOverlay") {
      const sel = window.getSelection();
      let x = 100, y = 100;
      if (sel && sel.rangeCount > 0) {
        const r = sel.getRangeAt(0).getBoundingClientRect();
        x = r.left;
        y = r.bottom;
      }
      createOverlay(x, y);
    }
    else if (msg.action === "showTranslationResult") {
      const overlay = document.getElementById(OVERLAY_ID);
      showResult(overlay, msg.translation);
    }
    else if (msg.action === "showTranslationError") {
      const overlay = document.getElementById(OVERLAY_ID);
      showError(overlay, msg.error);
    }

    if (sendResponse) sendResponse({ ok: true });
  });

  // Close overlay on click outside
  document.addEventListener("mousedown", (e) => {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay && !overlay.contains(e.target)) removeOverlay();
  });
})();
