<?php
// sensor_history.php
session_start();
header('Content-Type: application/json');

require_once '../system/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Invalid request method"]);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit;
}

$userId = (int) $_SESSION['user_id'];
$roomId = isset($_GET['room_id']) ? (int) $_GET['room_id'] : 0;
$limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 12;
$limit = max(3, min(48, $limit));

try {
    if ($roomId > 0) {
        $roomStmt = $pdo->prepare("SELECT id FROM rooms WHERE id = :room_id AND user_id = :user_id LIMIT 1");
        $roomStmt->execute([
            ':room_id' => $roomId,
            ':user_id' => $userId
        ]);
        if (!$roomStmt->fetch(PDO::FETCH_ASSOC)) {
            http_response_code(404);
            echo json_encode(["status" => "error", "message" => "Room not found"]);
            exit;
        }

        $historyStmt = $pdo->prepare("
            SELECT id, room_id, noise_level, air_quality, motion_detected, created_at
            FROM sensor_data
            WHERE room_id = :room_id
            ORDER BY id DESC
            LIMIT :limit
        ");
        $historyStmt->bindValue(':room_id', $roomId, PDO::PARAM_INT);
        $historyStmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $historyStmt->execute();
    } else {
        $historyStmt = $pdo->prepare("
            SELECT sd.id, sd.room_id, sd.noise_level, sd.air_quality, sd.motion_detected, sd.created_at
            FROM sensor_data sd
            INNER JOIN rooms r ON r.id = sd.room_id
            WHERE r.user_id = :user_id
            ORDER BY sd.id DESC
            LIMIT :limit
        ");
        $historyStmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $historyStmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $historyStmt->execute();
    }

    $history = array_reverse($historyStmt->fetchAll(PDO::FETCH_ASSOC));

    echo json_encode([
        "status" => "success",
        "points" => $history
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to load sensor history"]);
}
