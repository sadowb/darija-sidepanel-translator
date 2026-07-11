package ma.aui.darija.application.service;

import ma.aui.darija.application.port.in.TranslateTextUseCase;
import ma.aui.darija.application.port.out.TranslationProvider;
import ma.aui.darija.domain.model.Translation;
import org.springframework.stereotype.Service;

@Service
public class TranslationService implements TranslateTextUseCase {
    private final TranslationProvider translationProvider;

    public TranslationService(TranslationProvider translationProvider) {
        this.translationProvider = translationProvider;
    }

    @Override
    public Translation translate(String sourceText, String apiKey) {
        String normalizedText = sourceText.trim();
        return new Translation(normalizedText, translationProvider.translateToDarija(normalizedText, apiKey));
    }
}
