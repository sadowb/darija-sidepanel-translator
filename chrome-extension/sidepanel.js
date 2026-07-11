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

function setBusy(busy) {
  translateButton.disabled = busy;
  sourceText.disabled = busy;
  loading.hidden = !busy;
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function clearError() {
  errorMessage.textContent = "";
  errorMessage.hidden = true;
}

async function getSettings() {
  return SettingsStore.get();
}

async function updateConnectionStatus() {
  const settings = await getSettings();
  const configured = Boolean(settings.apiUrl && settings.username && settings.password);
  connectionDot.classList.toggle("connected", configured);
  connectionText.textContent = configured ? "Ready" : "Open settings to connect";
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
  resultSection.hidden = true;
  try {
    const client = new TranslatorApi.TranslatorApiClient(settings);
    translationResult.textContent = await client.translate(text);
    resultSection.hidden = false;
  } catch (error) {
    showError(error.message === "Failed to fetch"
      ? "Cannot reach the translation server. Check Settings and your connection."
      : error.message);
  } finally {
    setBusy(false);
  }
}

sourceText.addEventListener("input", () => {
  characterCount.textContent = `${sourceText.value.length} / 5000`;
  clearError();
});

translateButton.addEventListener("click", translate);
clearButton.addEventListener("click", () => {
  speechSynthesis.cancel();
  sourceText.value = "";
  translationResult.textContent = "";
  characterCount.textContent = "0 / 5000";
  resultSection.hidden = true;
  clearError();
  sourceText.focus();
});

document.querySelector("#copyButton").addEventListener("click", async (event) => {
  await navigator.clipboard.writeText(translationResult.textContent);
  const original = event.currentTarget.textContent;
  event.currentTarget.textContent = "Copied";
  setTimeout(() => { event.currentTarget.textContent = original; }, 1200);
});

document.querySelector("#speakButton").addEventListener("click", () => {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(translationResult.textContent);
  utterance.lang = "ar-MA";
  speechSynthesis.speak(utterance);
});

document.querySelector("#settingsButton").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

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
