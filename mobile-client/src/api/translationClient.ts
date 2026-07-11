export type TranslationResponse = {
  translation: string;
};

type ApiErrorResponse = {
  code?: string;
  message?: string;
  error?: string;
};

function btoa(input: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  for (
    let block = 0, charCode, i = 0, map = chars;
    input.charAt(i | 0) || (map = "=", i % 1);
    output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))
  ) {
    charCode = input.charCodeAt((i += 3 / 4));
    if (charCode > 0xff) {
      throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
    }
    block = (block << 8) | charCode;
  }
  return output;
}

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

    const token = btoa(`${this.username}:${this.password}`);
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
