const MENU_ID = "translate-to-darija";

// Register context menu and side panel behavior
async function setup() {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Translate to Darija",
    contexts: ["selection"]
  });
}

chrome.runtime.onInstalled.addListener(() => {
  setup().catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  setup().catch(console.error);
});

// Handle context menu click: store the selected text, then open the side panel
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText || !tab?.id) return;

  try {
    await chrome.storage.session.set({ pendingSelection: info.selectionText.trim() });
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch (err) {
    console.error("Failed to open side panel:", err);
  }
});
