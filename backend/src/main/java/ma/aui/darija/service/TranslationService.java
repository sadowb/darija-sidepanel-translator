package ma.aui.darija.service;

import ma.aui.darija.model.Translation;
import org.springframework.stereotype.Service;

@Service
public class TranslationService {
    private final TranslationProvider translationProvider;

    public TranslationService(TranslationProvider translationProvider) {
        this.translationProvider = translationProvider;
    }

    public Translation translate(String sourceText, String apiKey) {
        String normalizedText = sourceText.trim();
        String translatedText = translationProvider.translateToDarija(normalizedText, apiKey);
        return new Translation(normalizedText, translatedText);
    }
}
