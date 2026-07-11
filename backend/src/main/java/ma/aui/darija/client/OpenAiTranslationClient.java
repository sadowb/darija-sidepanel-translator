package ma.aui.darija.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import ma.aui.darija.exception.TranslationUnavailableException;
import ma.aui.darija.service.TranslationProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class OpenAiTranslationClient implements TranslationProvider {
    private static final String SYSTEM_INSTRUCTION = """
            You are an expert translator specializing in Moroccan Darija.
            Translate the given English text into natural, authentic Moroccan Darija using Arabic script.

            CRITICAL RULES:
            1. Use authentic Moroccan Darija words and grammar such as كيداير, شنو, دابا, بزاف, and ديال.
            2. Do not translate into Modern Standard Arabic.
            3. Preserve names, numbers, URLs, punctuation, and the original tone.
            4. Return only the translation without explanations or quotation marks.
            """;

    private final String apiUrl;
    private final String configuredApiKey;
    private final String model;
    private final Duration requestTimeout;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public OpenAiTranslationClient(
            @Value("${llm.api-url}") String apiUrl,
            @Value("${llm.api-key}") String apiKey,
            @Value("${llm.model}") String model,
            @Value("${llm.timeout-ms:30000}") int timeoutMs,
            ObjectMapper objectMapper) {
        this.apiUrl = apiUrl;
        this.configuredApiKey = apiKey;
        this.model = model;
        this.requestTimeout = Duration.ofMillis(timeoutMs);
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(requestTimeout)
                .build();
        this.objectMapper = objectMapper;
    }

    @Override
    public String translateToDarija(String sourceText, String requestApiKey) {
        String activeKey = requestApiKey != null && !requestApiKey.isBlank()
                ? requestApiKey.trim()
                : configuredApiKey;
        if (activeKey == null || activeKey.isBlank()) {
            throw new TranslationUnavailableException("LLM API key is not configured");
        }

        try {
            Map<String, Object> requestBody = Map.of(
                    "model", model,
                    "messages", List.of(
                            Map.of("role", "system", "content", SYSTEM_INSTRUCTION),
                            Map.of("role", "user", "content", sourceText)),
                    "temperature", 0.3);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl))
                    .timeout(requestTimeout)
                    .header("Authorization", "Bearer " + activeKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)))
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new TranslationUnavailableException(
                        "LLM API returned HTTP " + response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String translation = root.path("choices")
                    .path(0)
                    .path("message")
                    .path("content")
                    .asText();
            if (translation.isBlank()) {
                throw new TranslationUnavailableException("LLM returned an empty response");
            }
            return translation.trim();
        } catch (TranslationUnavailableException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new TranslationUnavailableException("Request to LLM provider failed", exception);
        }
    }
}
