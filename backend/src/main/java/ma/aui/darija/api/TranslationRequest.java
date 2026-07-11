package ma.aui.darija.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TranslationRequest(
        @NotBlank(message = "Text is required")
        @Size(max = 5000, message = "Text must not exceed 5000 characters")
        String text) {
}
