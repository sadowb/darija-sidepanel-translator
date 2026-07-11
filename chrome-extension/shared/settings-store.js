(function exposeSettingsStore(global) {
  const defaults = {
    apiUrl: "http://localhost:8081",
    username: "translator",
    password: "Black",
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
        autoTranslate: Boolean(settings.autoTranslate)
      });
    }
  };
})(globalThis);
