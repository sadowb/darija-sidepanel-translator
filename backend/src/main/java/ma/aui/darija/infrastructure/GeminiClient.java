package ma.aui.darija.infrastructure;

import com.google.genai.Client;
import com.google.genai.types.GenerateContentResponse;
import ma.aui.darija.service.TranslationProviderException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class GeminiClient {
    private static final String INSTRUCTION = """
            Translate the following English text into natural Moroccan Darija using Arabic script.
            Preserve names, numbers, URLs, punctuation, and the original tone.
            Return only the translation with no explanation or quotation marks.

            Text:
            """;

    private final String model;

    public GeminiClient(@Value("${gemini.model}") String model) {
        this.model = model;
    }

    public String translate(String text) {
        try (Client client = new Client()) {
            GenerateContentResponse response = client.models.generateContent(model, INSTRUCTION + text, null);
            String translation = response.text();
            if (translation == null || translation.isBlank()) {
                throw new TranslationProviderException();
            }
            return translation.trim();
        } catch (TranslationProviderException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new TranslationProviderException(exception);
        }
    }
}
