export type MobileSettings = {
  apiUrl: string;
  username: string;
  password: string;
  llmApiKey: string;
  autoTranslate: boolean;
};

const STORAGE_KEY = "darija-translator-mobile-settings";

const defaults: MobileSettings = {
  apiUrl: "https://darija-sidepanel-translator-production.up.railway.app",
  username: "translator",
  password: "Black",
  llmApiKey: "",
  autoTranslate: true,
};

let memoryStore: MobileSettings = defaults;

function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export const SettingsStore = {
  async get(): Promise<MobileSettings> {
    if (!hasLocalStorage()) {
      return memoryStore;
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaults;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<MobileSettings>;
      return {
        apiUrl: parsed.apiUrl?.trim().replace(/\/$/, "") || defaults.apiUrl,
        username: parsed.username?.trim() || defaults.username,
        password: parsed.password || defaults.password,
        llmApiKey: parsed.llmApiKey?.trim() || "",
        autoTranslate: typeof parsed.autoTranslate === "boolean" ? parsed.autoTranslate : defaults.autoTranslate,
      };
    } catch {
      return defaults;
    }
  },

  async save(settings: MobileSettings): Promise<void> {
    const nextSettings: MobileSettings = {
      apiUrl: settings.apiUrl.trim().replace(/\/$/, ""),
      username: settings.username.trim(),
      password: settings.password,
      llmApiKey: settings.llmApiKey ? settings.llmApiKey.trim() : "",
      autoTranslate: Boolean(settings.autoTranslate),
    };

    memoryStore = nextSettings;

    if (!hasLocalStorage()) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
  },

  async clear(): Promise<void> {
    memoryStore = defaults;

    if (!hasLocalStorage()) {
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);
  },
};
