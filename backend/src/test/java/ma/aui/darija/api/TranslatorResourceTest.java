package ma.aui.darija.api;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ma.aui.darija.infrastructure.GeminiClient;
import ma.aui.darija.service.TranslationProviderException;
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
        "gemini.model=test-model"
})
@AutoConfigureMockMvc
class TranslatorResourceTest {
    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    GeminiClient geminiClient;

    @Test
    void healthIsPublic() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void translationRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/translate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"Hello\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsIncorrectCredentials() throws Exception {
        mockMvc.perform(post("/api/translate")
                        .with(httpBasic("translator", "wrong-password"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"Hello\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void translatesValidText() throws Exception {
        when(geminiClient.translate("How are you?")).thenReturn("كيداير؟");

        mockMvc.perform(post("/api/translate")
                        .with(httpBasic("translator", "test-password"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"How are you?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.translation").value("كيداير؟"));
    }

    @Test
    void rejectsBlankText() throws Exception {
        mockMvc.perform(post("/api/translate")
                        .with(httpBasic("translator", "test-password"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Text is required"));
    }

    @Test
    void rejectsOversizedText() throws Exception {
        String body = "{\"text\":\"" + "a".repeat(5001) + "\"}";
        mockMvc.perform(post("/api/translate")
                        .with(httpBasic("translator", "test-password"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Text must not exceed 5000 characters"));
    }

    @Test
    void mapsProviderFailures() throws Exception {
        when(geminiClient.translate(anyString())).thenThrow(new TranslationProviderException());

        mockMvc.perform(post("/api/translate")
                        .with(httpBasic("translator", "test-password"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"Hello\"}"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.error").value("Translation service unavailable"));
    }
}
