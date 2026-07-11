package ma.aui.darija.application.port.in;

import ma.aui.darija.domain.model.Translation;

public interface TranslateTextUseCase {
    Translation translate(String sourceText, String apiKey);
}
