package ma.aui.darija.interfaces.rest.v1;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import ma.aui.darija.application.port.in.TranslateTextUseCase;
import ma.aui.darija.domain.model.Translation;
import ma.aui.darija.interfaces.rest.v1.dto.TranslationRequest;
import ma.aui.darija.interfaces.rest.v1.dto.TranslationResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/translations")
public class TranslationController {
    private final TranslateTextUseCase translateText;

    public TranslationController(TranslateTextUseCase translateText) {
        this.translateText = translateText;
    }

    @PostMapping
    @Operation(summary = "Translate English text to Moroccan Darija")
    @SecurityRequirement(name = "basicAuth")
    public ResponseEntity<TranslationResponse> translate(
            @org.springframework.web.bind.annotation.RequestHeader(value = "X-LLM-API-Key", required = false) String userApiKey,
            @Valid @RequestBody TranslationRequest request) {
        Translation translation = translateText.translate(request.text(), userApiKey);
        return ResponseEntity.ok(new TranslationResponse(translation.translatedText()));
    }
}
