<?php
// log_sensor.php
header('Content-Type: application/json');

require_once '../system/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Only POST is allowed"]);
    exit;
}

/*
 * Optional device-level protection:
 * If DEVICE_API_KEY is defined on the server (e.g. in config.php),
 * requests must include header: X-Device-Key: <your-key>
 */
if (defined('DEVICE_API_KEY')) {
    $deviceKey = $_SERVER['HTTP_X_DEVICE_KEY'] ?? '';
    if (!hash_equals(DEVICE_API_KEY, $deviceKey)) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Unauthorized device"]);
        exit;
    }
}

$data = json_decode(file_get_contents('php://input'), true);

$roomId = (int) ($data['room_id'] ?? 0);
$noiseLevel = isset($data['noise_level']) ? (float) $data['noise_level'] : null;
$airQuality = isset($data['air_quality']) ? (float) $data['air_quality'] : null;

if ($roomId <= 0 || $noiseLevel === null || $airQuality === null) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "room_id, noise_level and air_quality are required"
    ]);
    exit;
}

try {
    // Validate room exists
    $roomStmt = $pdo->prepare("SELECT id FROM rooms WHERE id = :room_id LIMIT 1");
    $roomStmt->execute([':room_id' => $roomId]);
    $room = $roomStmt->fetch(PDO::FETCH_ASSOC);

    if (!$room) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Room not found"]);
        exit;
    }

    // Insert sensor data
    $insert = $pdo->prepare("
        INSERT INTO sensor_data (room_id, noise_level, air_quality)
        VALUES (:room_id, :noise_level, :air_quality)
    ");
    $insert->execute([
        ':room_id' => $roomId,
        ':noise_level' => $noiseLevel,
        ':air_quality' => $airQuality,
    ]);

    echo json_encode([
        "status" => "success",
        "message" => "Sensor data logged successfully"
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Failed to log sensor data"
    ]);
}
