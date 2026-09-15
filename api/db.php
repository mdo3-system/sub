<?php
// api/db.php
$host = 'localhost';
$dbname = 'eie_w7'; // WordPressと同じDB名でOK
$user = 'eie_w7';
$pass = 'kx6hqiboh9ea';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Database connection failed.");
}
?>