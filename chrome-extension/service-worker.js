const MENU_ID = "translate-to-darija";

async function configureExtension() {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Translate to Darija",
    contexts: ["selection"]
  });
}

chrome.runtime.onInstalled.addListener(() => {
  configureExtension().catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText || !tab?.id) return;

  chrome.storage.session
    .set({ pendingSelection: info.selectionText.trim() })
    .then(() => chrome.sidePanel.open({ tabId: tab.id }))
    .catch(console.error);
});
