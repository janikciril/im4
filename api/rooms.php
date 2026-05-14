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
    // Return the single room for this user
    $stmt = $pdo->prepare("SELECT id, name, user_id FROM rooms WHERE user_id = :user_id ORDER BY id ASC LIMIT 1");
    $stmt->execute([':user_id' => $userId]);
    $room = $stmt->fetch(PDO::FETCH_ASSOC);

    // Auto-create a room if the user doesn't have one yet (existing accounts)
    if (!$room) {
        $userStmt = $pdo->prepare("SELECT name, email FROM users WHERE id = :id");
        $userStmt->execute([':id' => $userId]);
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);

        // Derive display name from stored name or email prefix
        $displayName = !empty($user['name'])
            ? $user['name']
            : ucfirst(explode('.', explode('@', $user['email'])[0])[0]);

        $roomName = $displayName . "s Raum";

        $insert = $pdo->prepare("INSERT INTO rooms (name, user_id) VALUES (:name, :user_id)");
        $insert->execute([':name' => $roomName, ':user_id' => $userId]);

        $room = [
            'id'      => (int) $pdo->lastInsertId(),
            'name'    => $roomName,
            'user_id' => $userId
        ];
    }

    echo json_encode([
        "status" => "success",
        "rooms"  => [$room]
    ]);
    exit;
}

http_response_code(405);
echo json_encode(["status" => "error", "message" => "Invalid request method"]);
