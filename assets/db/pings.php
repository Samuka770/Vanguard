<?php
// Simple endpoint to store ZVZ pings
// Expects JSON: { name: string, role_key: string, role_label?: string }

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
// CORS (adjust origin in production if needed)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
  exit;
}

require_once __DIR__ . '/db_config.php'; // provides $pdo

// Read body as JSON first; fallback to form-encoded
$rawBody = file_get_contents('php://input');
$data = json_decode($rawBody, true);
if (!is_array($data)) {
  $data = $_POST ?? [];
}

$name = trim($data['name'] ?? '');
$roleKey = trim($data['role_key'] ?? '');
$roleLabel = trim($data['role_label'] ?? '');

if ($name === '' || $roleKey === '') {
  http_response_code(400);
  echo json_encode(['status' => 'error', 'message' => 'Missing name or role_key']);
  exit;
}

// Provision table if needed
$pdo->exec(<<<SQL
CREATE TABLE IF NOT EXISTS pings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  role_key VARCHAR(64) NOT NULL,
  role_label VARCHAR(150) DEFAULT NULL,
  ip VARCHAR(45) DEFAULT NULL,
  user_agent VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_role_key (role_key),
  KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL);

$ip = $_SERVER['REMOTE_ADDR'] ?? null;
$ua = $_SERVER['HTTP_USER_AGENT'] ?? null;

try {
  $stmt = $pdo->prepare('INSERT INTO pings (name, role_key, role_label, ip, user_agent) VALUES (?, ?, ?, ?, ?)');
  $stmt->execute([$name, $roleKey, $roleLabel ?: null, $ip, $ua]);
  echo json_encode(['status' => 'ok', 'id' => (int)$pdo->lastInsertId()]);
} catch (Throwable $e) {
  error_log('Ping insert error: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['status' => 'error', 'message' => 'Insert failed']);
}
