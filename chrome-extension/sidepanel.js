const sourceText = document.querySelector("#sourceText");
const characterCount = document.querySelector("#characterCount");
const translateButton = document.querySelector("#translateButton");
const clearButton = document.querySelector("#clearButton");
const loading = document.querySelector("#loading");
const resultSection = document.querySelector("#resultSection");
const translationResult = document.querySelector("#translationResult");
const errorMessage = document.querySelector("#errorMessage");
const connectionDot = document.querySelector("#connectionDot");
const connectionText = document.querySelector("#connectionText");

// Onboarding Elements
const connectionScreen = document.querySelector("#connectionScreen");
const translatorScreen = document.querySelector("#translatorScreen");
const onboardingForm = document.querySelector("#onboardingForm");
const onboardApiUrl = document.querySelector("#onboardApiUrl");
const onboardUsername = document.querySelector("#onboardUsername");
const onboardPassword = document.querySelector("#onboardPassword");
const onboardApiKey = document.querySelector("#onboardApiKey");
const onboardStatus = document.querySelector("#onboardStatus");
const disconnectButton = document.querySelector("#disconnectButton");

function setBusy(busy) {
  if (translateButton) translateButton.disabled = busy;
  if (sourceText) sourceText.disabled = busy;
  if (loading) loading.hidden = !busy;
}

function showError(message) {
  if (errorMessage) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
  }
}

function clearError() {
  if (errorMessage) {
    errorMessage.textContent = "";
    errorMessage.hidden = true;
  }
}

async function getSettings() {
  return SettingsStore.get();
}

async function updateConnectionStatus() {
  const settings = await getSettings();
  const configured = Boolean(settings.apiUrl && settings.username && settings.password);
  
  if (!configured) {
    showConnectionScreen(settings);
    return false;
  }
  
  if (connectionDot) {
    connectionDot.className = "status-dot";
  }
  if (connectionText) {
    connectionText.textContent = "Checking connection…";
  }
  
  try {
    const client = new TranslatorApi.TranslatorApiClient(settings);
    await client.health();
    if (connectionDot) connectionDot.classList.add("connected");
    if (connectionText) connectionText.textContent = "Ready";
    showTranslatorScreen();
    return true;
  } catch (err) {
    if (connectionDot) connectionDot.classList.remove("connected");
    if (connectionText) connectionText.textContent = "Connection failed";
    showConnectionScreen(settings);
    onboardStatus.style.color = "var(--danger)";
    onboardStatus.textContent = "Could not connect to backend. Check URL/credentials.";
    return false;
  }
}

function showConnectionScreen(settings) {
  if (connectionScreen) connectionScreen.hidden = false;
  if (translatorScreen) translatorScreen.hidden = true;
  
  if (onboardApiUrl) onboardApiUrl.value = settings.apiUrl || "https://darija-sidepanel-translator-production.up.railway.app";
  if (onboardUsername) onboardUsername.value = settings.username || "translator";
  if (onboardPassword) onboardPassword.value = settings.password || "Black";
  if (onboardApiKey) onboardApiKey.value = settings.llmApiKey || "";
}

function showTranslatorScreen() {
  if (connectionScreen) connectionScreen.hidden = true;
  if (translatorScreen) translatorScreen.hidden = false;
  if (onboardStatus) onboardStatus.textContent = "";
}

// Onboarding Form Submit handler
if (onboardingForm) {
  onboardingForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (onboardStatus) {
      onboardStatus.style.color = "var(--text)";
      onboardStatus.textContent = "Testing connection…";
    }
    
    const settings = {
      apiUrl: onboardApiUrl.value.trim(),
      username: onboardUsername.value.trim(),
      password: onboardPassword.value,
      llmApiKey: onboardApiKey.value.trim(),
      autoTranslate: true
    };
    
    try {
      const client = new TranslatorApi.TranslatorApiClient(settings);
      await client.health();
      
      // Save settings if successful
      await SettingsStore.save(settings);
      showTranslatorScreen();
      await updateConnectionStatus();
    } catch (err) {
      if (onboardStatus) {
        onboardStatus.style.color = "var(--danger)";
        onboardStatus.textContent = "Connection failed. Please verify URL and credentials.";
      }
    }
  });
}

// Disconnect handler
if (disconnectButton) {
  disconnectButton.addEventListener("click", async () => {
    if (confirm("Are you sure you want to sign out / disconnect?")) {
      await SettingsStore.save({
        apiUrl: "",
        username: "",
        password: "",
        llmApiKey: "",
        autoTranslate: true
      });
      const settings = await getSettings();
      showConnectionScreen(settings);
    }
  });
}

async function translate() {
  clearError();
  const text = sourceText.value.trim();
  if (!text) {
    showError("Enter some English text first.");
    sourceText.focus();
    return;
  }

  const settings = await getSettings();
  if (!settings.apiUrl || !settings.username || !settings.password) {
    showError("Configure the backend URL and credentials in Settings.");
    return;
  }

  setBusy(true);
  if (resultSection) resultSection.hidden = true;
  try {
    const client = new TranslatorApi.TranslatorApiClient(settings);
    translationResult.textContent = await client.translate(text);
    if (resultSection) resultSection.hidden = false;
  } catch (error) {
    showError(error.message === "Failed to fetch"
      ? "Could not reach the server. Make sure it is running."
      : error.message);
  } finally {
    setBusy(false);
  }
}

if (sourceText) {
  sourceText.addEventListener("input", () => {
    characterCount.textContent = `${sourceText.value.length} / 5000`;
  });
}

if (translateButton) {
  translateButton.addEventListener("click", translate);
}

if (clearButton) {
  clearButton.addEventListener("click", () => {
    sourceText.value = "";
    characterCount.textContent = "0 / 5000";
    if (resultSection) resultSection.hidden = true;
    translationResult.textContent = "";
    clearError();
  });
}

const copyButton = document.querySelector("#copyButton");
if (copyButton) {
  copyButton.addEventListener("click", async () => {
    const text = translationResult.textContent;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const originalText = copyButton.textContent;
      copyButton.textContent = "Copied!";
      setTimeout(() => copyButton.textContent = originalText, 1500);
    } catch (err) {
      console.error(err);
    }
  });
}

const speakButton = document.querySelector("#speakButton");
if (speakButton) {
  speakButton.addEventListener("click", () => {
    const text = translationResult.textContent;
    if (!text) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ar-MA";
    speechSynthesis.speak(utterance);
  });
}

window.addEventListener("unload", () => {
  speechSynthesis.cancel();
  if (recognition) {
    recognition.stop();
  }
});

const recordButton = document.querySelector("#recordButton");
let recognition = null;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.lang = "en-US";
  recognition.interimResults = false;

  recognition.onstart = () => {
    recordButton.textContent = "🛑 Listening…";
    recordButton.classList.add("recording");
    clearError();
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    sourceText.value = (sourceText.value + " " + transcript).trim();
    characterCount.textContent = `${sourceText.value.length} / 5000`;
    translate().catch(console.error);
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error", event.error);
    showError(`Voice input error: ${event.error}`);
    stopRecording();
  };

  recognition.onend = () => {
    stopRecording();
  };
} else {
  if (recordButton) {
    recordButton.style.display = "none";
  }
}

function stopRecording() {
  if (recordButton) {
    recordButton.textContent = "🎤 Voice";
    recordButton.classList.remove("recording");
  }
}

if (recordButton && recognition) {
  recordButton.addEventListener("click", () => {
    if (recordButton.classList.contains("recording")) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (err) {
        console.error(err);
      }
    }
  });
}

async function initialize() {
  await updateConnectionStatus();
  const { pendingSelection } = await chrome.storage.session.get("pendingSelection");
  if (pendingSelection) {
    await chrome.storage.session.remove("pendingSelection");
    sourceText.value = pendingSelection.slice(0, 5000);
    characterCount.textContent = `${sourceText.value.length} / 5000`;
    const { autoTranslate } = await getSettings();
    if (autoTranslate) await translate();
  }
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "session" && changes.pendingSelection?.newValue) {
    const newValue = changes.pendingSelection.newValue;
    chrome.storage.session.remove("pendingSelection").catch(console.error);
    sourceText.value = newValue.slice(0, 5000);
    characterCount.textContent = `${sourceText.value.length} / 5000`;
    getSettings().then(async ({ autoTranslate }) => {
      if (autoTranslate) await translate();
    }).catch(console.error);
  }
});

initialize().catch(() => showError("Could not initialize the extension."));
