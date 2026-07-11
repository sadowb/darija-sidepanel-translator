package ma.aui.darija.service;

import ma.aui.darija.infrastructure.GeminiClient;
import org.springframework.stereotype.Service;

@Service
public class TranslationService {
    private final GeminiClient geminiClient;

    public TranslationService(GeminiClient geminiClient) {
        this.geminiClient = geminiClient;
    }

    public String translate(String text) {
        return geminiClient.translate(text.trim());
    }
}
