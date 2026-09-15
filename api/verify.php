<?php
// api/verify.php
session_start();
require 'db.php';

$token = $_GET['token'] ?? '';

if (!$token) {
    echo "トークンが指定されていません。<a href='../login.html'>ログイン画面へ</a>";
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT * FROM app_users WHERE magic_token = ? AND token_expires > NOW() AND status = 'allowed'");
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if ($user) {
        // 新しい端末用の合言葉（セッショントークン）を発行
        $session_token = bin2hex(random_bytes(32));

        // セッション（ブラウザ側）に保存
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['session_token'] = $session_token;
        
        // データベースを更新（マジックリンクを無効化しつつ、新しい合言葉を保存）
        $update = $pdo->prepare("UPDATE app_users SET magic_token = NULL, token_expires = NULL, current_session_token = ? WHERE id = ?");
        $update->execute([$session_token, $user['id']]);

        header("Location: ../index.html");
        exit;
    } else {
        // トークンが無効か期限切れ、またはステータスが不適合
        $error_msg = "検証失敗: トークン " . substr($token, 0, 8) . "... は無効、期限切れ、またはユーザーのステータスが allowed ではありません。";
        error_log("[" . date('Y-m-d H:i:s') . "] " . $error_msg . "\n", 3, "error.log");
        echo "リンクが無効か、有効期限が切れています。<a href='../login.html'>もう一度ログイン画面へ</a>";
    }
} catch (Exception $e) {
    $error_msg = "検証時例外発生: " . $e->getMessage();
    error_log("[" . date('Y-m-d H:i:s') . "] " . $error_msg . "\n", 3, "error.log");
    echo "サーバーエラーが発生しました。システム管理者にお問い合わせください。";
}
?>