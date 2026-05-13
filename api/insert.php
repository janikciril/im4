<?php
require '../system/config.php';

$room_id     = $_POST['room_id']     ?? 1;
$noise_level = $_POST['noise_level'] ?? 0;
$air_quality = $_POST['air_quality'] ?? 0;

$stmt = $pdo->prepare("INSERT INTO sensor_data (room_id, noise_level, air_quality) 
                        VALUES (?, ?, ?)");
$stmt->execute([$room_id, $noise_level, $air_quality]);
echo "OK";
?>