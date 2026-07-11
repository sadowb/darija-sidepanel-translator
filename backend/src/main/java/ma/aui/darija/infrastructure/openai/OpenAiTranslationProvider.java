package ma.aui.darija.infrastructure.openai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import ma.aui.darija.application.port.out.TranslationProvider;
import ma.aui.darija.domain.exception.TranslationUnavailableException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class OpenAiTranslationProvider implements TranslationProvider {
    private static final String SYSTEM_INSTRUCTION = """
            You are an expert translator specializing in Moroccan Darija.
            Translate the given English text into natural, authentic Moroccan Darija (Moroccan Arabic Dialect) using Arabic script.
            
            CRITICAL RULES:
            1. Use authentic Moroccan Darija words and grammatical structures (e.g., use 'كيداير', 'شنو', 'دابا', 'بزاف', 'ديال' instead of Modern Standard Arabic equivalents).
            2. Do NOT translate into Modern Standard Arabic (Fusha). Avoid standard Arabic words like 'كيف حالك', 'ماذا', 'الآن', 'كثيرا'.
            3. Preserve names, numbers, URLs, punctuation, and the original tone.
            4. Return ONLY the translation, with no explanations, notes, introductory text, or quotation marks.
            """;

    private final String apiUrl;
    private final String apiKey;
    private final String model;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public OpenAiTranslationProvider(
            @Value("${llm.api-url}") String apiUrl,
            @Value("${llm.api-key}") String apiKey,
            @Value("${llm.model}") String model,
            @Value("${llm.timeout-ms:30000}") int timeoutMs) {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
        this.model = model;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(timeoutMs))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public String translateToDarija(String sourceText, String requestApiKey) {
        String activeKey = (requestApiKey != null && !requestApiKey.isBlank()) ? requestApiKey : this.apiKey;
        if (activeKey == null || activeKey.isBlank()) {
            throw new TranslationUnavailableException("LLM API Key is not configured.");
        }

        try {
            Map<String, Object> requestBody = Map.of(
                    "model", model,
                    "messages", List.of(
                            Map.of("role", "system", "content", SYSTEM_INSTRUCTION),
                            Map.of("role", "user", "content", sourceText)
                    ),
                    "temperature", 0.3
            );

            String jsonPayload = objectMapper.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl))
                    .header("Authorization", "Bearer " + activeKey.trim())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new TranslationUnavailableException("LLM API returned HTTP " + response.statusCode() + ": " + response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String translation = root.path("choices")
                    .path(0)
                    .path("message")
                    .path("content")
                    .asText();

            if (translation == null || translation.isBlank()) {
                throw new TranslationUnavailableException("LLM returned an empty response");
            }

            return translation.trim();
        } catch (TranslationUnavailableException e) {
            throw e;
        } catch (Exception e) {
            throw new TranslationUnavailableException("Request to LLM provider failed", e);
        }
    }
}
