/* Darija Translator – Inline Overlay Content Script */
(function () {
  const OVERLAY_ID = "darija-translator-overlay";

  function removeOverlay() {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) existing.remove();
  }

  function createOverlay() {
    removeOverlay();

    const el = document.createElement("div");
    el.id = OVERLAY_ID;
    el.innerHTML = `
      <div class="darija-header">
        <span class="darija-title">🇲🇦 Darija</span>
        <div class="darija-header-actions">
          <button class="darija-voice" title="Voice command">🎤</button>
          <button class="darija-minimize" title="Minimize">➖</button>
          <button class="darija-close" title="Close">✕</button>
        </div>
      </div>
      <div class="darija-body">
        <div class="darija-loading">
          <div class="darija-spinner"></div>
          <span class="darija-loading-text">Translating…</span>
        </div>
      </div>
    `;
    document.body.appendChild(el);

    const closeBtn = el.querySelector(".darija-close");

    const voiceBtn = el.querySelector(".darija-voice");
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeOverlay();
    });

    const minimizeBtn = el.querySelector(".darija-minimize");
    minimizeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      el.classList.toggle("darija-minimized");
      if (el.classList.contains("darija-minimized")) {
        minimizeBtn.title = "Expand";
        minimizeBtn.textContent = "➕";
      } else {
        minimizeBtn.title = "Minimize";
        minimizeBtn.textContent = "➖";
      }
    });

    if (voiceBtn) {
      voiceBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await startVoiceCommand(el);
      });
    }

    el.addEventListener("click", (e) => {
      if (el.classList.contains("darija-minimized")) {
        el.classList.remove("darija-minimized");
        minimizeBtn.title = "Minimize";
        minimizeBtn.textContent = "➖";
      }
    });

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

  function setOverlayLoading(overlay, message) {
    if (!overlay) return;
    const body = overlay.querySelector(".darija-body");
    if (!body) return;
    body.innerHTML = `
      <div class="darija-loading">
        <div class="darija-spinner"></div>
        <span class="darija-loading-text">${escapeHtml(message)}</span>
      </div>
    `;
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

  function getSpeechRecognitionCtor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function translateText(text) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: "translateText", text }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || "Could not reach the translator."));
          return;
        }

        if (!response?.ok) {
          reject(new Error(response?.error || "Translation failed"));
          return;
        }

        resolve(response.translation);
      });
    });
  }

  let recognition = null;
  let recordingOverlay = null;

  async function startVoiceCommand(overlay) {
    const SpeechRecognition = getSpeechRecognitionCtor();
    if (!SpeechRecognition) {
      showError(overlay, "Voice command is only available in Chrome or Edge.");
      return;
    }

    if (recognition) {
      try { recognition.stop(); } catch (err) { console.error(err); }
    }

    recordingOverlay = overlay;
    setOverlayLoading(overlay, "Listening…");
    const voiceBtn = overlay.querySelector(".darija-voice");
    if (voiceBtn) {
      voiceBtn.classList.add("recording");
      voiceBtn.textContent = "🛑";
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript.trim();
      if (!transcript) {
        showError(overlay, "Could not understand the voice input.");
        return;
      }

      setOverlayLoading(overlay, "Translating…");

      try {
        const translation = await translateText(transcript);
        showResult(overlay, translation);
      } catch (error) {
        showError(overlay, error.message || "Translation failed.");
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      if (event.error === "not-allowed") {
        showError(overlay, "Microphone permission blocked. Enable microphone access and try again.");
      } else if (event.error === "network") {
        showError(overlay, "Voice input error: network. Try Chrome or Edge with a working speech service, or type the text instead.");
      } else {
        showError(overlay, `Voice input error: ${event.error}`);
      }
      stopRecording();
    };

    recognition.onend = () => stopRecording();

    try {
      recognition.start();
    } catch (err) {
      console.error(err);
      showError(overlay, "Could not start microphone: " + err.message);
      stopRecording();
    }
  }

  function minimizeOverlay() {
    const el = document.getElementById(OVERLAY_ID);
    if (!el || el.classList.contains("darija-minimized")) return;
    el.classList.add("darija-minimized");
    const minimizeBtn = el.querySelector(".darija-minimize");
    if (minimizeBtn) {
      minimizeBtn.title = "Expand";
      minimizeBtn.textContent = "➕";
    }
  }

  function stopRecording() {
    if (recordingOverlay) {
      const voiceBtn = recordingOverlay.querySelector(".darija-voice");
      if (voiceBtn) {
        voiceBtn.textContent = "🎤";
        voiceBtn.classList.remove("recording");
      }
      recordingOverlay = null;
    }

    if (recognition) {
      try { recognition.stop(); } catch (err) { console.error(err); }
    }
  }

  // Listen for messages from the service worker
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === "showLoadingOverlay") {
      createOverlay();
    }
    else if (msg.action === "showTranslationResult") {
      const overlay = document.getElementById(OVERLAY_ID);
      showResult(overlay, msg.translation);
    }
    else if (msg.action === "showTranslationError") {
      const overlay = document.getElementById(OVERLAY_ID);
      showError(overlay, msg.error);
    }
    else if (msg.action === "showVoiceListening") {
      const overlay = createOverlay();
      setOverlayLoading(overlay, "Listening…");
    }
    else if (msg.action === "showVoiceTranslation") {
      const overlay = document.getElementById(OVERLAY_ID) || createOverlay();
      setOverlayLoading(overlay, "Translating…");
      translateText(msg.text)
        .then((translation) => showResult(overlay, translation))
        .catch((err) => showError(overlay, err.message || "Translation failed"));
    }

    if (sendResponse) sendResponse({ ok: true });
  });

  // Minimize overlay on click outside (instead of closing)
  document.addEventListener("mousedown", (e) => {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay && !overlay.contains(e.target)) {
      minimizeOverlay();
    }
  });
})();
