(function exposeTranslatorApi(global) {
  class ApiError extends Error {
    constructor(message, status, code) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.code = code;
    }
  }

  class TranslatorApiClient {
    constructor({ apiUrl, username, password }) {
      this.apiUrl = apiUrl.replace(/\/$/, "");
      this.authorization = `Basic ${btoa(`${username}:${password}`)}`;
    }

    async health() {
      const response = await fetch(`${this.apiUrl}/health`, {
        credentials: "include"
      });
      if (!response.ok) throw new ApiError("Server health check failed.", response.status);
      return response.json();
    }

    async translate(text) {
      const settings = await SettingsStore.get();
      const response = await fetch(`${this.apiUrl}/api/v1/translations`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Authorization": this.authorization,
          "Content-Type": "application/json",
          "X-LLM-API-Key": settings.llmApiKey || ""
        },
        body: JSON.stringify({ text })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const fallback = response.status === 401
          ? "The username or password is incorrect."
          : "Translation failed. Please try again.";
        throw new ApiError(payload.message || payload.error || fallback, response.status, payload.code);
      }
      return payload.translation;
    }
  }

  global.TranslatorApi = { ApiError, TranslatorApiClient };
})(globalThis);
