<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// ⚠️ เปลี่ยนค่าเหล่านี้เป็นของคุณเอง
$SUPABASE_URL = 'https://jburieqpvqjyelhqdnkd.supabase.co';  // URL ของ Supabase
$SERVICE_ROLE_KEY = 'sb_secret_hsSzdG2W1eN-0gsmzQckjQ_ThXoAdar';  // Service Role Key จาก Supabase Dashboard > Settings > API
$ADMIN_TOKEN = 'sun2542';  // ตั้งรหัสลับขึ้นมาเอง

$input = json_decode(file_get_contents('php://input'), true);
$user_id = $input['user_id'] ?? null;
$new_password = $input['new_password'] ?? null;
$admin_token = $input['admin_token'] ?? null;

// ตรวจสอบ admin token
if ($admin_token !== $ADMIN_TOKEN) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
    exit;
}

if (!$user_id || !$new_password) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing user_id or new_password']);
    exit;
}

// เรียก Supabase Admin API
$ch = curl_init("$SUPABASE_URL/auth/v1/admin/users/$user_id");
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => 'PUT',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "apikey: $SERVICE_ROLE_KEY",
        "Authorization: Bearer $SERVICE_ROLE_KEY",
        "Content-Type: application/json"
    ],
    CURLOPT_POSTFIELDS => json_encode(['password' => $new_password])
]);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code >= 200 && $http_code < 300) {
    echo json_encode(['ok' => true]);
} else {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $response]);
}
