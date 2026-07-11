(function exposeSettingsStore(global) {
  const defaults = {
    apiUrl: "https://darija-sidepanel-translator-production.up.railway.app",
    username: "translator",
    password: "Black",
    llmApiKey: "",
    autoTranslate: true
  };

  global.SettingsStore = {
    get() {
      return chrome.storage.local.get(defaults);
    },
    save(settings) {
      return chrome.storage.local.set({
        apiUrl: settings.apiUrl.trim().replace(/\/$/, ""),
        username: settings.username.trim(),
        password: settings.password,
        llmApiKey: settings.llmApiKey ? settings.llmApiKey.trim() : "",
        autoTranslate: Boolean(settings.autoTranslate)
      });
    }
  };
})(globalThis);
