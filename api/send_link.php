<?php
// api/send_link.php
require 'db.php';
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$email = $data['email'] ?? '';

if (!$email) {
    echo json_encode(['success' => false, 'message' => 'メールアドレスを入力してください。']);
    exit;
}

try {
    // ユーザーが存在し、かつ allowed かチェック
    $stmt = $pdo->prepare("SELECT id FROM app_users WHERE email = ? AND status = 'allowed'");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user) {
        $token = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));

        $update = $pdo->prepare("UPDATE app_users SET magic_token = ?, token_expires = ? WHERE id = ? AND status = 'allowed'");
        $update->execute([$token, $expires, $user['id']]);

        if ($update->rowCount() === 0) {
            // DBへの書き込みに失敗（行が更新されなかった）
            $error_msg = "UPDATE失敗: ユーザーID " . $user['id'] . " のトークンを更新できませんでした。ステータスが allowed ではない可能性があります。";
            error_log("[" . date('Y-m-d H:i:s') . "] " . $error_msg . "\n", 3, "error.log");
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'データベースの更新に失敗しました。', 'debug' => $error_msg]);
            exit;
        }

        // 動的なマジックリンクURLの生成
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
        $base_dir = dirname($_SERVER['SCRIPT_NAME']);
        $login_url = $protocol . $_SERVER['HTTP_HOST'] . $base_dir . "/verify.php?token=" . $token;

        // メール送信処理
        $subject = "構造計算補助ツール ログイン用マジックリンク";
        $message = "以下のリンクをクリックしてログインしてください（有効期限1時間）:\n\n" . $login_url;
        $headers = "From: no-reply@" . $_SERVER['HTTP_HOST'];

        if (!mail($email, $subject, $message, $headers)) {
            $error_msg = "メール送信失敗: mail()関数が false を返しました。サーバーのメール設定を確認してください。";
            error_log("[" . date('Y-m-d H:i:s') . "] " . $error_msg . "\n", 3, "error.log");
            // メール送信失敗は致命的なのでエラーとして返す
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'メールの送信に失敗しました。システム管理者にお問い合わせください。', 'debug' => $error_msg]);
            exit;
        }

        echo json_encode(['success' => true, 'message' => 'ログインリンクを送信しました（有効期限1時間）。']);
    } else {
        // ユーザーが見つからない
        $error_msg = "ユーザー未検出: メールアドレス " . $email . " は登録されていないか、status が allowed ではありません。";
        error_log("[" . date('Y-m-d H:i:s') . "] " . $error_msg . "\n", 3, "error.log");
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => '指定されたメールアドレスは見つからないか、ログインが許可されていません。', 'debug' => $error_msg]);
    }
} catch (Exception $e) {
    $error_msg = "例外発生: " . $e->getMessage();
    error_log("[" . date('Y-m-d H:i:s') . "] " . $error_msg . "\n", 3, "error.log");
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'サーバーエラーが発生しました。', 'debug' => $error_msg]);
}
?>