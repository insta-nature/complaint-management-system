<?php
/**
 * config.php
 * Database connection settings. Edit these to match your local / server setup.
 */

define('DB_HOST', 'localhost');
define('DB_PORT', '10022');		  // change if your MySQL runs on a different port
define('DB_NAME', 'cms_db');
define('DB_USER', 'root');
define('DB_PASS', 'root');       // set your MySQL password here
define('DB_CHARSET', 'utf8mb4');

// Absolute path to the uploads folder on disk, and its public URL base.
define('UPLOAD_DIR', dirname(__DIR__) . '/uploads');
define('UPLOAD_URL', 'uploads'); // relative to the project root, used when returning file URLs

define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10 MB
define('ALLOWED_EXTENSIONS', ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx']);

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
            exit;
        }
    }
    return $pdo;
}
