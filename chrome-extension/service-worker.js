const MENU_ID = "translate-to-darija";

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

// Handle context menu click by translating in background (bypasses page CSP) and sending to content script
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText || !tab?.id) return;

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
    if (!settings.apiUrl || !settings.username || !settings.password) {
      chrome.tabs.sendMessage(tab.id, {
        action: "showTranslationError",
        error: "Please sign in via the extension side panel first."
      }).catch(console.error);
      return;
    }

    try {
      const cleanUrl = settings.apiUrl.replace(/\/$/, "");
      const res = await fetch(`${cleanUrl}/api/v1/translations`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Authorization": `Basic ${btoa(settings.username + ":" + settings.password)}`,
          "Content-Type": "application/json",
          "X-LLM-API-Key": settings.llmApiKey || ""
        },
        body: JSON.stringify({ text: info.selectionText.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Translation failed");

      // 3. Send successful translation to content script
      chrome.tabs.sendMessage(tab.id, {
        action: "showTranslationResult",
        translation: data.translation
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
