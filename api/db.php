<?php
// api/db.php
$host = 'localhost';
$dbname = 'mdo3_b1gz3'; // XServer WordPressと同DB
$user = 'mdo3_0a090';
$pass = 'ws4YeGaaS9os';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Database connection failed.");
}
?>