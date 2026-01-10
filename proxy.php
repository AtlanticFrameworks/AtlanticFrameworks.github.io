<?php
// Simple Proxy to bypass CORS for Roblox API
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

if (!isset($_GET['url'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No URL provided']);
    exit;
}

$url = $_GET['url'];

// Basic security: Only allow Roblox APIs
if (strpos($url, 'roblox.com') === false) {
    http_response_code(403);
    echo json_encode(['error' => 'Only Roblox APIs allowed']);
    exit;
}

// User Agent is required by Roblox API
$options = [
    "http" => [
        "header" => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36\r\n"
    ]
];
$context = stream_context_create($options);

$response = file_get_contents($url, false, $context);

if ($response === FALSE) {
    http_response_code(502);
    echo json_encode(['error' => 'Failed to fetch upstream']);
} else {
    echo $response;
}
?>
