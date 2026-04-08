<?php
// oauth.php - Local PHP Backend for Roblox OAuth 2.0
header('Access-Control-Allow-Origin: *'); // Can restrict to https://bwrp.net in production
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ----------------------------------------------------
// FETCH ROBLOX CLIENT SECRET FROM ENVIRONMENT
// ----------------------------------------------------
$clientSecret = getenv('ROBLOX_AUTH_SECRET');
if (!$clientSecret) {
    $clientSecret = getenv('ROBLOX_CLIENT_SECRET'); // Fallback naming
}

if (!$clientSecret) {
    http_response_code(500);
    echo json_encode([
        "error" => "Server missing configuration: ROBLOX_AUTH_SECRET is not set.",
        "hint" => "Ensure the environment variable is configured on your server."
    ]);
    exit;
}

$inputSource = file_get_contents('php://input');
$body = json_decode($inputSource, true);

if (!$body || !isset($body['code'])) {
    http_response_code(400);
    echo json_encode(["error" => "Missing authorization code"]);
    exit;
}

$client_id = isset($body['client_id']) ? $body['client_id'] : '7548633832168341641';
$code = $body['code'];
$redirect_uri = isset($body['redirect_uri']) ? $body['redirect_uri'] : 'https://bwrp.net/team';

// 1. Exchange Code for Access Token
$tokenUrl = "https://apis.roblox.com/oauth/v1/token";
$tokenData = [
    "client_id" => $client_id,
    "client_secret" => $clientSecret,
    "grant_type" => "authorization_code",
    "code" => $code,
    "redirect_uri" => $redirect_uri
];

$ch = curl_init($tokenUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($tokenData));
// Roblox API requires a User-Agent sometimes
curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 BWRP/1.0");

$tokenResponse = curl_exec($ch);
$tokenStatusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($tokenStatusCode >= 400) {
    http_response_code(400);
    $decodedResponse = json_decode($tokenResponse, true);
    echo json_encode(["error" => "Token exchange failed", "details" => $decodedResponse ? $decodedResponse : $tokenResponse]);
    exit;
}

$tokenJson = json_decode($tokenResponse, true);
if (!isset($tokenJson['access_token'])) {
    http_response_code(400);
    echo json_encode(["error" => "Failed to get access token from response"]);
    exit;
}

$accessToken = $tokenJson['access_token'];

// 2. Fetch User Profile Info
$userInfoUrl = "https://apis.roblox.com/oauth/v1/userinfo";
$ch = curl_init($userInfoUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer " . $accessToken,
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 BWRP/1.0"
]);

$userResponse = curl_exec($ch);
$userStatusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($userStatusCode >= 400) {
    http_response_code(400);
    $decodedResponse = json_decode($userResponse, true);
    echo json_encode(["error" => "Failed to fetch userinfo", "details" => $decodedResponse ? $decodedResponse : $userResponse]);
    exit;
}

$userJson = json_decode($userResponse, true);

// 3. Return user profile back to frontend
$finalResponse = [
    "success" => true,
    "userId" => isset($userJson['sub']) ? $userJson['sub'] : null,
    "username" => isset($userJson['preferred_username']) ? $userJson['preferred_username'] : (isset($userJson['name']) ? $userJson['name'] : null),
    "picture" => isset($userJson['picture']) ? $userJson['picture'] : null,
    "raw" => $userJson
];

http_response_code(200);
echo json_encode($finalResponse);
?>
