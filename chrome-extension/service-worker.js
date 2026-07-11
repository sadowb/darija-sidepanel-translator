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

// Context menu → send message to content script for inline overlay
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText || !tab?.id) return;

  chrome.tabs.sendMessage(tab.id, {
    action: "translateOverlay",
    text: info.selectionText.trim()
  }).catch(console.error);
});
