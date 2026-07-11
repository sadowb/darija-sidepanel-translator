package ma.aui.darija.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ma.aui.darija.application.port.out.TranslationProvider;
import ma.aui.darija.domain.model.Translation;
import org.junit.jupiter.api.Test;

class TranslationServiceTest {
    @Test
    void normalizesInputAndReturnsDomainResult() {
        TranslationProvider provider = mock(TranslationProvider.class);
        when(provider.translateToDarija("Hello", null)).thenReturn("سلام");
        TranslationService service = new TranslationService(provider);

        Translation result = service.translate("  Hello  ", null);

        assertThat(result.sourceText()).isEqualTo("Hello");
        assertThat(result.translatedText()).isEqualTo("سلام");
        verify(provider).translateToDarija("Hello", null);
    }
}
