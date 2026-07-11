const apiUrl = document.querySelector("#apiUrl");
const username = document.querySelector("#username");
const password = document.querySelector("#password");
const autoTranslate = document.querySelector("#autoTranslate");
const status = document.querySelector("#settingsStatus");

async function loadSettings() {
  const saved = await chrome.storage.local.get({
    apiUrl: "http://localhost:8080",
    username: "",
    password: "",
    autoTranslate: true
  });
  apiUrl.value = saved.apiUrl;
  username.value = saved.username;
  password.value = saved.password;
  autoTranslate.checked = saved.autoTranslate;
}

async function saveSettings() {
  await chrome.storage.local.set({
    apiUrl: apiUrl.value.trim().replace(/\/$/, ""),
    username: username.value.trim(),
    password: password.value,
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
    const response = await fetch(`${apiUrl.value.trim().replace(/\/$/, "")}/health`);
    if (!response.ok) throw new Error();
    status.textContent = "Connection successful.";
  } catch {
    status.textContent = "Connection failed. Check the URL and server.";
  }
});

loadSettings();
