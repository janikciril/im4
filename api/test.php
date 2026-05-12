<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require '../system/config.php';

$sql = "INSERT INTO sensor_data (room_id, noise_level, air_quality, motion_detected) 
        VALUES (4, 35, 300, 0)";

$pdo->exec($sql);
echo "Testdaten erfolgreich eingefügt!";
?>