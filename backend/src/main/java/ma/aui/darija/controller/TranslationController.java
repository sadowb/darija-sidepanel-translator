package ma.aui.darija.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import ma.aui.darija.dto.TranslationRequest;
import ma.aui.darija.dto.TranslationResponse;
import ma.aui.darija.model.Translation;
import ma.aui.darija.service.TranslationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/translations")
public class TranslationController {
    private final TranslationService translationService;

    public TranslationController(TranslationService translationService) {
        this.translationService = translationService;
    }

    @PostMapping
    @Operation(summary = "Translate English text to Moroccan Darija")
    @SecurityRequirement(name = "basicAuth")
    public ResponseEntity<TranslationResponse> translate(
            @RequestHeader(value = "X-LLM-API-Key", required = false) String userApiKey,
            @Valid @RequestBody TranslationRequest request) {
        Translation translation = translationService.translate(request.text(), userApiKey);
        return ResponseEntity.ok(new TranslationResponse(translation.translatedText()));
    }
}
