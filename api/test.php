<?php
require 'config.php';
// $pdo ist bereits durch config.php erstellt

// Testdaten einfügen
$sql = "INSERT INTO sensor_data (room_id, noise_level, air_quality, motion_detected) 
        VALUES (1, 65, 800, 0)";

$pdo->exec($sql);
echo "Testdaten erfolgreich eingefügt!";
?>