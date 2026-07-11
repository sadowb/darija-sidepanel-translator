package ma.aui.darija.domain.exception;

public class TranslationUnavailableException extends RuntimeException {
    public TranslationUnavailableException(String message) {
        super(message);
    }

    public TranslationUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
