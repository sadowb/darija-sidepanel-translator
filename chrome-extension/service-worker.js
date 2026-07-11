const MENU_ID = "translate-to-darija";

async function translateText(settings, text) {
  const url = (settings.apiUrl || "https://darija-sidepanel-translator-production.up.railway.app").trim().replace(/\/$/, "");
  const user = (settings.username || "translator").trim();
  const pass = settings.password || "Black";

  if (!url || !user || !pass) {
    throw new Error("Please sign in via the extension side panel first.");
  }

  const res = await fetch(`${url}/api/v1/translations`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Authorization": `Basic ${btoa(user + ":" + pass)}`,
      "Content-Type": "application/json",
      "X-LLM-API-Key": settings.llmApiKey || ""
    },
    body: JSON.stringify({ text })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Translation failed");
  return data.translation;
}

function setup() {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Translate to Darija",
      contexts: ["selection"]
    });
  });
}

chrome.runtime.onInstalled.addListener(() => setup());
chrome.runtime.onStartup.addListener(() => setup());

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action !== "translateText") {
    return false;
  }

  chrome.storage.local.get({
    apiUrl: "https://darija-sidepanel-translator-production.up.railway.app",
    username: "translator",
    password: "Black",
    llmApiKey: ""
  }, async (settings) => {
    try {
      const translation = await translateText(settings, (msg.text || "").trim());
      sendResponse({ ok: true, translation });
    } catch (err) {
      sendResponse({ ok: false, error: err?.message || "Translation failed" });
    }
  });

  return true;
});

// Handle context menu click by translating in background (bypasses page CSP) and sending to content script
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText || !tab?.id) return;

  // Save selection in session storage so sidepanel fallback can read it if triggered
  chrome.storage.session.set({ pendingSelection: info.selectionText.trim() }).catch(console.error);

  // 1. Tell content script to show the loading overlay immediately
  chrome.tabs.sendMessage(tab.id, {
    action: "showLoadingOverlay"
  }).catch(() => {
    // If content script isn't loaded (e.g. on chrome:// pages or pre-existing tabs before reload),
    // open the side panel as a reliable fallback.
    chrome.sidePanel.open({ tabId: tab.id }).catch(console.error);
  });

  // 2. Fetch settings and perform translation in the background service worker
  chrome.storage.local.get({
    apiUrl: "https://darija-sidepanel-translator-production.up.railway.app",
    username: "translator",
    password: "Black",
    llmApiKey: ""
  }, async (settings) => {
    try {
      const translation = await translateText(settings, info.selectionText.trim());

      // 3. Send successful translation to content script
      chrome.tabs.sendMessage(tab.id, {
        action: "showTranslationResult",
        translation
      }).catch(console.error);

    } catch (err) {
      // 4. Send error details to content script
      chrome.tabs.sendMessage(tab.id, {
        action: "showTranslationError",
        error: err.message || "Translation failed"
      }).catch(console.error);
    }
  });
});
