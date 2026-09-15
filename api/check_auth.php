<?php
// api/check_auth.php
session_start();
header('Content-Type: application/json');

// ブラウザが合言葉（セッショントークン）を持っているか確認
if (isset($_SESSION['user_id']) && isset($_SESSION['session_token'])) {
    require 'db.php';
    
    // データベースに保存されている「最新の合言葉」を取得
    $stmt = $pdo->prepare("SELECT current_session_token FROM app_users WHERE id = ? AND status = 'allowed'");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();

    // 自分の持っている合言葉と、データベースの最新の合言葉が一致すればOK
    if ($user && $user['current_session_token'] === $_SESSION['session_token']) {
        echo json_encode(['authenticated' => true, 'email' => $_SESSION['user_email']]);
        exit;
    }
}

// 一致しない（別の端末でログインされた）、またはステータスがdenyになった場合は強制ログアウト
session_unset();
session_destroy();
echo json_encode(['authenticated' => false]);
?>