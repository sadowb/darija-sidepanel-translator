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
  return chrome.storage.local.get({
    apiUrl: "http://localhost:8080",
    username: "",
    password: "",
    autoTranslate: true
  });
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
    const response = await fetch(`${settings.apiUrl.replace(/\/$/, "")}/api/translate`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${settings.username}:${settings.password}`)}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || (response.status === 401
        ? "The username or password is incorrect."
        : "Translation failed. Please try again."));
    }
    translationResult.textContent = payload.translation;
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

window.addEventListener("unload", () => speechSynthesis.cancel());

async function initialize() {
  await updateConnectionStatus();
  const { pendingSelection } = await chrome.storage.session.get("pendingSelection");
  if (!pendingSelection) return;
  await chrome.storage.session.remove("pendingSelection");
  sourceText.value = pendingSelection.slice(0, 5000);
  characterCount.textContent = `${sourceText.value.length} / 5000`;
  const { autoTranslate } = await getSettings();
  if (autoTranslate) await translate();
}

initialize().catch(() => showError("Could not initialize the extension."));
