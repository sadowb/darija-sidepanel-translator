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
        <div class="darija-spinner"></div>
        <span class="darija-loading-text">Translating…</span>
      </div>
    `;
    document.body.appendChild(el);

    // Position near selection but keep on screen
    const rect = el.getBoundingClientRect();
    let left = x;
    let top = y + 10;
    if (left + rect.width > window.innerWidth - 12) left = window.innerWidth - rect.width - 12;
    if (left < 12) left = 12;
    if (top + rect.height > window.innerHeight - 12) top = y - rect.height - 10;
    el.style.left = left + "px";
    el.style.top = top + "px";

    el.querySelector(".darija-close").addEventListener("click", removeOverlay);
    return el;
  }

  function showResult(overlay, translation) {
    const body = overlay.querySelector(".darija-body");
    body.innerHTML = `<p class="darija-result" dir="rtl" lang="ary">${escapeHtml(translation)}</p>
      <div class="darija-actions">
        <button class="darija-btn darija-copy">📋 Copy</button>
        <button class="darija-btn darija-speak">🔊 Read</button>
      </div>`;
    body.querySelector(".darija-copy").addEventListener("click", () => {
      navigator.clipboard.writeText(translation).catch(console.error);
      body.querySelector(".darija-copy").textContent = "✓ Copied";
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
    const body = overlay.querySelector(".darija-body");
    body.innerHTML = `<p class="darija-error">${escapeHtml(msg)}</p>`;
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  // Listen for messages from the service worker
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action !== "translateOverlay") return;

    const sel = window.getSelection();
    let x = 100, y = 100;
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0).getBoundingClientRect();
      x = r.left + window.scrollX;
      y = r.bottom + window.scrollY;
    }

    const overlay = createOverlay(x, y);

    // Fetch settings and translate
    chrome.storage.local.get({
      apiUrl: "https://darija-sidepanel-translator-production.up.railway.app",
      username: "translator",
      password: "Black",
      llmApiKey: ""
    }, async (settings) => {
      try {
        const res = await fetch(`${settings.apiUrl.replace(/\/$/, "")}/api/v1/translations`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Authorization": `Basic ${btoa(settings.username + ":" + settings.password)}`,
            "Content-Type": "application/json",
            "X-LLM-API-Key": settings.llmApiKey || ""
          },
          body: JSON.stringify({ text: msg.text })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Translation failed");
        showResult(overlay, data.translation);
      } catch (err) {
        showError(overlay, err.message || "Translation failed");
      }
    });

    sendResponse({ ok: true });
  });

  // Close overlay on click outside
  document.addEventListener("mousedown", (e) => {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay && !overlay.contains(e.target)) removeOverlay();
  });
})();
