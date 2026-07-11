const MENU_ID = "translate-to-darija";

// Register context menu and side panel behavior
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

// Handle context menu click
// CRITICAL: sidePanel.open() MUST be called FIRST, synchronously,
// before any async operation — otherwise Chrome drops the user gesture.
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText || !tab?.id) return;

  // 1. Open side panel IMMEDIATELY (preserves user gesture context)
  chrome.sidePanel.open({ tabId: tab.id }).catch(console.error);

  // 2. Store selected text AFTER (the side panel JS will pick it up)
  chrome.storage.session.set({ pendingSelection: info.selectionText.trim() }).catch(console.error);
});
