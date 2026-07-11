<?php
declare(strict_types=1);

final class TranslationApiClient
{
    public function __construct(
        private readonly string $baseUrl,
        private readonly string $username,
        private readonly string $password,
    ) {
    }

    public static function fromEnvironment(): self
    {
        return new self(
            rtrim((string) getenv('API_URL'), '/'),
            (string) getenv('API_USERNAME'),
            (string) getenv('API_PASSWORD'),
        );
    }

    public function translate(string $text): string
    {
        if ($this->baseUrl === '' || $this->username === '' || $this->password === '') {
            throw new RuntimeException('The client is not configured.');
        }

        $handle = curl_init($this->baseUrl . '/api/v1/translations');
        curl_setopt_array($handle, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTPAUTH => CURLAUTH_BASIC,
            CURLOPT_USERPWD => $this->username . ':' . $this->password,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode(['text' => $text], JSON_THROW_ON_ERROR),
        ]);

        $body = curl_exec($handle);
        $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $transportError = curl_error($handle);
        curl_close($handle);

        $payload = is_string($body) ? json_decode($body, true) : null;
        if ($status === 200 && is_array($payload) && isset($payload['translation'])) {
            return (string) $payload['translation'];
        }

        $message = is_array($payload)
            ? (string) ($payload['message'] ?? $payload['error'] ?? '')
            : '';
        if ($message === '') {
            $message = $transportError !== '' ? 'Could not reach the server.' : 'Translation failed.';
        }
        throw new RuntimeException($message);
    }
}
