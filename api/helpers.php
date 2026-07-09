<?php
/**
 * helpers.php
 * Shared response, session, validation and file-upload helpers for all API endpoints.
 */

require_once __DIR__ . '/config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
// Allow the front-end to be opened from the same origin. Adjust if you host frontend separately.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function json_ok($data = [], int $code = 200): void {
    http_response_code($code);
    echo json_encode(['success' => true] + (is_array($data) ? $data : ['data' => $data]));
    exit;
}

function json_err(string $message, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}

function body(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function input($key, $default = null) {
    // Works for JSON body, form-encoded POST, and query string.
    static $jsonBody = null;
    if ($jsonBody === null) $jsonBody = body();
    if (isset($jsonBody[$key])) return $jsonBody[$key];
    if (isset($_POST[$key])) return $_POST[$key];
    if (isset($_GET[$key])) return $_GET[$key];
    return $default;
}

function current_user(): ?array {
    return $_SESSION['user'] ?? null;
}

function require_login(): array {
    $u = current_user();
    if (!$u) json_err('Not authenticated. Please log in.', 401);
    return $u;
}

function require_admin(): array {
    $u = require_login();
    if ($u['role'] !== 'admin') json_err('Admin access required.', 403);
    return $u;
}

/**
 * Save one uploaded file into UPLOAD_DIR/{kind}/ and return its stored info.
 * $kind is 'attachment' | 'before' | 'after'
 */
function save_uploaded_file(array $file, string $kind): array {
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new RuntimeException('Upload error code ' . $file['error']);
    }
    if ($file['size'] > MAX_FILE_SIZE) {
        throw new RuntimeException($file['name'] . ' exceeds the 10MB size limit.');
    }
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ALLOWED_EXTENSIONS, true)) {
        throw new RuntimeException($file['name'] . ' has an unsupported file type.');
    }
    $dir = UPLOAD_DIR . '/' . $kind;
    if (!is_dir($dir)) mkdir($dir, 0775, true);

    $safeName = preg_replace('/[^A-Za-z0-9_.-]/', '_', pathinfo($file['name'], PATHINFO_FILENAME));
    $storedName = uniqid($kind . '_', true) . '_' . $safeName . '.' . $ext;
    $destination = $dir . '/' . $storedName;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        throw new RuntimeException('Failed to save ' . $file['name']);
    }

    return [
        'file_name' => $file['name'],
        'file_path' => UPLOAD_URL . '/' . $kind . '/' . $storedName,
        'file_type' => $file['type'],
    ];
}

/** Normalize $_FILES['field'] (which may be a single file or an array of files) into a list. */
function normalize_files(string $field): array {
    if (!isset($_FILES[$field])) return [];
    $f = $_FILES[$field];
    if (!is_array($f['name'])) return [$f];
    $out = [];
    foreach ($f['name'] as $i => $name) {
        if ($f['error'][$i] === UPLOAD_ERR_NO_FILE) continue;
        $out[] = [
            'name' => $f['name'][$i], 'type' => $f['type'][$i],
            'tmp_name' => $f['tmp_name'][$i], 'error' => $f['error'][$i], 'size' => $f['size'][$i],
        ];
    }
    return $out;
}
