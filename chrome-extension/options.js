const apiUrl = document.querySelector("#apiUrl");
const username = document.querySelector("#username");
const password = document.querySelector("#password");
const llmApiKey = document.querySelector("#llmApiKey");
const autoTranslate = document.querySelector("#autoTranslate");
const status = document.querySelector("#settingsStatus");

async function loadSettings() {
  const saved = await SettingsStore.get();
  apiUrl.value = saved.apiUrl;
  username.value = saved.username;
  password.value = saved.password;
  llmApiKey.value = saved.llmApiKey;
  autoTranslate.checked = saved.autoTranslate;
}

async function saveSettings() {
  await SettingsStore.save({
    apiUrl: apiUrl.value.trim().replace(/\/$/, ""),
    username: username.value.trim(),
    password: password.value,
    llmApiKey: llmApiKey.value.trim(),
    autoTranslate: autoTranslate.checked
  });
  status.textContent = "Settings saved.";
}

document.querySelector("#settingsForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveSettings();
});

document.querySelector("#testButton").addEventListener("click", async () => {
  status.textContent = "Testing…";
  try {
    await saveSettings();
    const client = new TranslatorApi.TranslatorApiClient(await SettingsStore.get());
    await client.health();
    status.textContent = "Connection successful.";
  } catch {
    status.textContent = "Connection failed. Check the URL and server.";
  }
});

loadSettings();

// Request Microphone permission if queried (allows side panel to bypass Chrome restrictions)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("requestMic") === "true") {
  if (status) {
    status.textContent = "Requesting microphone permission...";
    status.className = "settings-status";
  }
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then((stream) => {
      // Permission granted! Stop the stream immediately
      stream.getTracks().forEach(track => track.stop());
      if (status) {
        status.textContent = "🎤 Microphone permission granted successfully! You can now close this tab and use voice translation in the side panel.";
        status.style.color = "var(--green)";
      }
    })
    .catch((err) => {
      console.error(err);
      if (status) {
        status.textContent = "Failed to obtain microphone permission: " + err.message;
        status.style.color = "var(--red)";
      }
    });
}
