<?php
// scripts/migrate_create_app_users.php
// 実行方法: php scripts/migrate_create_app_users.php

// 実行パスに合わせた db.php 読み込み
$db_file = dirname(__DIR__) . '/api/db.php';
if (!file_exists($db_file)) {
    die("Error: db.php not found at: {$db_file}\n");
}
require $db_file;

echo "=== Migration: Create app_users table ===\n";

try {
    // 1. テーブル作成
    $sql = "CREATE TABLE IF NOT EXISTS app_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        magic_token VARCHAR(255) DEFAULT NULL,
        token_expires DATETIME DEFAULT NULL,
        current_session_token VARCHAR(255) DEFAULT NULL,
        status VARCHAR(50) DEFAULT 'allowed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $pdo->exec($sql);
    echo "[OK] Table 'app_users' created or already exists.\n";

    // 2. 初期許可ユーザー (eie@ymail.ne.jp) の登録
    $initial_email = 'eie@ymail.ne.jp';
    $stmt = $pdo->prepare("INSERT INTO app_users (email, status) VALUES (?, 'allowed') ON DUPLICATE KEY UPDATE status = 'allowed'");
    $stmt->execute([$initial_email]);
    echo "[OK] Initial user '{$initial_email}' registered with status 'allowed'.\n";

    // 3. 登録確認
    $check = $pdo->query("SELECT id, email, status, created_at FROM app_users");
    $users = $check->fetchAll(PDO::FETCH_ASSOC);
    echo "\n=== Current app_users table records ===\n";
    foreach ($users as $u) {
        echo "ID: {$u['id']} | Email: {$u['email']} | Status: {$u['status']} | Created: {$u['created_at']}\n";
    }
    echo "=======================================\n";
    echo "Migration completed successfully.\n";

} catch (PDOException $e) {
    echo "[ERROR] Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
