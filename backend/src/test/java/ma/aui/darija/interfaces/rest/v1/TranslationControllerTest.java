package ma.aui.darija.interfaces.rest.v1;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ma.aui.darija.application.port.out.TranslationProvider;
import ma.aui.darija.domain.exception.TranslationUnavailableException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "app.security.username=translator",
        "app.security.password=test-password",
        "llm.api-key=test-key",
        "llm.model=test-model"
})
@AutoConfigureMockMvc
class TranslationControllerTest {
    private static final String TRANSLATIONS_URL = "/api/v1/translations";

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    TranslationProvider translationProvider;

    @Test
    void healthIsPublic() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void openApiIsPublic() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.version").value("v1"));
    }

    @Test
    void translationRequiresAuthentication() throws Exception {
        mockMvc.perform(post(TRANSLATIONS_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"Hello\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsIncorrectCredentials() throws Exception {
        mockMvc.perform(post(TRANSLATIONS_URL)
                        .with(httpBasic("translator", "wrong-password"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"Hello\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void translatesValidText() throws Exception {
        when(translationProvider.translateToDarija("How are you?", null)).thenReturn("كيداير؟");

        mockMvc.perform(post(TRANSLATIONS_URL)
                        .with(httpBasic("translator", "test-password"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"How are you?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.translation").value("كيداير؟"));
    }

    @Test
    void rejectsBlankText() throws Exception {
        mockMvc.perform(post(TRANSLATIONS_URL)
                        .with(httpBasic("translator", "test-password"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("Text is required"));
    }

    @Test
    void rejectsOversizedText() throws Exception {
        String body = "{\"text\":\"" + "a".repeat(5001) + "\"}";
        mockMvc.perform(post(TRANSLATIONS_URL)
                        .with(httpBasic("translator", "test-password"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("Text must not exceed 5000 characters"));
    }

    @Test
    void mapsProviderFailures() throws Exception {
        when(translationProvider.translateToDarija(anyString(), org.mockito.ArgumentMatchers.any()))
                .thenThrow(new TranslationUnavailableException("Provider failed"));

        mockMvc.perform(post(TRANSLATIONS_URL)
                        .with(httpBasic("translator", "test-password"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"Hello\"}"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("TRANSLATION_PROVIDER_UNAVAILABLE"))
                .andExpect(jsonPath("$.message").value("Translation service unavailable"));
    }
}
