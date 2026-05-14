<?php
// register.php
session_start();
header('Content-Type: application/json');

require_once '../system/config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $data = json_decode(file_get_contents("php://input"), true);

    $name     = trim($data['name'] ?? '');
    $email    = trim($data['email'] ?? '');
    $password = trim($data['password'] ?? '');

    if (!$name || !$email || !$password) {
        echo json_encode(["status" => "error", "message" => "Name, email and password are required"]);
        exit;
    }

    // Check if email already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = :email");
    $stmt->execute([':email' => $email]);
    if ($stmt->fetch()) {
        echo json_encode(["status" => "error", "message" => "Email is already in use"]);
        exit;
    }

    // Hash the password
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    // Insert the new user (with name)
    $insert = $pdo->prepare("INSERT INTO users (name, email, password) VALUES (:name, :email, :pass)");
    $insert->execute([
        ':name'  => $name,
        ':email' => $email,
        ':pass'  => $hashedPassword
    ]);

    $newUserId = (int) $pdo->lastInsertId();

    // Auto-create a room named after the user
    $roomName = $name . "s Raum";
    $roomInsert = $pdo->prepare("INSERT INTO rooms (name, user_id) VALUES (:name, :user_id)");
    $roomInsert->execute([
        ':name'    => $roomName,
        ':user_id' => $newUserId
    ]);

    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error", "message" => "Invalid request method"]);
}
