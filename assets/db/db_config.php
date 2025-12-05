<?php
// Configurar timezone para horário de Brasília
date_default_timezone_set('America/Sao_Paulo');

// Configuração do banco de dados Hostinger
$db_host = "localhost";                    // Hostinger usa "localhost" internamente
$db_name = "u793235469_safersql";         // nome do banco
$db_user = "u793235469_safer";            // usuário do banco
$db_pass = "Safer770";                     // senha do banco

// Cria a conexão PDO (seguro e com prepared statements)
try {
  $pdo = new PDO(
    "mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", 
    $db_user, 
    $db_pass, 
    [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES => false,
    ]
  );
  
  // Tabela de pings (ZVZ planner) — criada/verificada a cada inclusão do config
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
  
} catch (PDOException $e) {
  // Log do erro (em produção, grave em arquivo de log ao invés de mostrar)
  error_log("Database connection error: " . $e->getMessage());
  http_response_code(500);
  echo json_encode([
    "status" => "error", 
    "message" => "Database connection failed"
  ]);
  exit;
}
