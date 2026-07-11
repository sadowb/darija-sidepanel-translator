<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/src/TranslationApiClient.php';

$translation = '';
$error = '';
$text = trim((string) ($_POST['text'] ?? ''));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($text === '' || mb_strlen($text) > 5000) {
        $error = 'Enter between 1 and 5000 characters.';
    } else {
        try {
            $translation = TranslationApiClient::fromEnvironment()->translate($text);
        } catch (RuntimeException $exception) {
            $error = $exception->getMessage();
        }
    }
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>English to Darija</title>
  <style>
    *{box-sizing:border-box}body{margin:0;background:#f6f8fb;color:#172033;font-family:system-ui,sans-serif}.card{width:min(700px,calc(100% - 32px));margin:48px auto;padding:28px;background:#fff;border:1px solid #dbe1ea;border-radius:14px}h1{margin:0 0 6px}.muted{color:#64748b}textarea{width:100%;min-height:180px;padding:14px;border:1px solid #dbe1ea;border-radius:10px;font:inherit}button{margin-top:12px;padding:11px 20px;border:0;border-radius:8px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer}.result{margin-top:24px;padding:18px;background:#f8fafc;border-radius:10px;font:21px/1.8 Tahoma,sans-serif}.error{color:#b42318;background:#fff1f0;padding:12px;border-left:3px solid #b42318}
  </style>
</head>
<body>
  <main class="card">
    <p class="muted">MOROCCAN DARIJA</p>
    <h1>English to Darija</h1>
    <form method="post">
      <p><label for="text">English text</label></p>
      <textarea id="text" name="text" maxlength="5000" required><?= htmlspecialchars($text, ENT_QUOTES, 'UTF-8') ?></textarea>
      <button type="submit">Translate</button>
    </form>
    <?php if ($error !== ''): ?><p class="error"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></p><?php endif; ?>
    <?php if ($translation !== ''): ?><section class="result" lang="ary" dir="rtl"><?= htmlspecialchars($translation, ENT_QUOTES, 'UTF-8') ?></section><?php endif; ?>
  </main>
</body>
</html>
