<?php
// rooms.php
session_start();
header('Content-Type: application/json');

require_once '../system/config.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit;
}

$userId = (int) $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'] ?? '';

if ($method === 'GET') {
    $stmt = $pdo->prepare("SELECT id, name, user_id FROM rooms WHERE user_id = :user_id ORDER BY id DESC");
    $stmt->execute([':user_id' => $userId]);
    $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "rooms" => $rooms
    ]);
    exit;
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $name = trim($data['name'] ?? '');

    if ($name === '') {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Room name is required"]);
        exit;
    }

    $insert = $pdo->prepare("INSERT INTO rooms (name, user_id) VALUES (:name, :user_id)");
    $insert->execute([
        ':name' => $name,
        ':user_id' => $userId
    ]);

    echo json_encode([
        "status" => "success",
        "message" => "Room created successfully"
    ]);
    exit;
}

http_response_code(405);
echo json_encode(["status" => "error", "message" => "Invalid request method"]);
