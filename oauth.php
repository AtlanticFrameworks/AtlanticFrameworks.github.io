<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$client_id = '1185800266267472506';
$client_secret = getenv('ROBLOX_AUTH_SECRET')
    ?: ($_ENV['ROBLOX_AUTH_SECRET'] ?? null)
    ?: ($_SERVER['ROBLOX_AUTH_SECRET'] ?? null);

if (!$client_secret) {
    http_response_code(500);
    echo json_encode(['error' => 'Server Configuration Error: ROBLOX_AUTH_SECRET not set']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$code = $input['code'] ?? null;
$redirect_uri = $input['redirect_uri'] ?? 'https://bwrp.net/team';

if (!$code) {
    http_response_code(400);
    echo json_encode(['error' => 'No authorization code provided']);
    exit;
}

// 1. Exchange code for access token
$ch = curl_init('https://apis.roblox.com/oauth/v1/token');
$data = http_build_query([
    'client_id' => $client_id,
    'client_secret' => $client_secret,
    'grant_type' => 'authorization_code',
    'code' => $code,
    'redirect_uri' => $redirect_uri
]);

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/x-www-form-urlencoded'
]);

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpcode !== 200) {
    http_response_code(502);
    echo json_encode(['error' => 'Failed to exchange token', 'details' => json_decode($response, true)]);
    exit;
}

$token_data = json_decode($response, true);
$access_token = $token_data['access_token'] ?? null;

if (!$access_token) {
    http_response_code(502);
    echo json_encode(['error' => 'Invalid token response received']);
    exit;
}

// 2. Fetch User Info
$user_ch = curl_init('https://apis.roblox.com/oauth/v1/userinfo');
curl_setopt($user_ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($user_ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $access_token
]);

$user_response = curl_exec($user_ch);
$user_httpcode = curl_getinfo($user_ch, CURLINFO_HTTP_CODE);
curl_close($user_ch);

if ($user_httpcode !== 200) {
    http_response_code(502);
    echo json_encode(['error' => 'Failed to fetch user info', 'details' => json_decode($user_response, true)]);
    exit;
}

$user_data = json_decode($user_response, true);

// Roblox returns "sub" as the User ID and "preferred_username" or "name" as the username.
echo json_encode([
    'success' => true,
    'userId' => $user_data['sub'],
    'username' => $user_data['preferred_username'] ?? $user_data['nickname'] ?? $user_data['name'] ?? null,
    'profile' => $user_data['profile'] ?? null,
    'picture' => $user_data['picture'] ?? null
]);
?>
