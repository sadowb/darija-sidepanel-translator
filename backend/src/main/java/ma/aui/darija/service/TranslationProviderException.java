package ma.aui.darija.service;

public class TranslationProviderException extends RuntimeException {
    public TranslationProviderException(Throwable cause) {
        super("Translation provider failed", cause);
    }

    public TranslationProviderException() {
        super("Translation provider returned no text");
    }
}
