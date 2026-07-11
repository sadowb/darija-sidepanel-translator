export type TranslationResponse = {
  translation: string;
};

type ApiErrorResponse = {
  code?: string;
  message?: string;
  error?: string;
};

export class TranslationApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly username: string,
    private readonly password: string,
  ) {}

  async translate(text: string): Promise<TranslationResponse> {
    if (!this.username || !this.password) {
      throw new Error("Configure the API environment variables.");
    }

    const token = globalThis.btoa(`${this.username}:${this.password}`);
    const response = await fetch(`${this.baseUrl}/api/v1/translations`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
    const payload = (await response.json()) as TranslationResponse & ApiErrorResponse;
    if (!response.ok) {
      throw new Error(payload.message || payload.error || "Translation failed.");
    }
    return { translation: payload.translation };
  }
}
