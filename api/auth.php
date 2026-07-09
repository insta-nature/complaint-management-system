<?php
require_once __DIR__ . '/helpers.php';

$action = input('action', $_GET['action'] ?? '');

switch ($action) {

    case 'login': {
        $username = trim((string) input('username', ''));
        $password = (string) input('password', '');
        if ($username === '' || $password === '') json_err('Username and password are required.');

        $stmt = db()->prepare('SELECT u.*, e.name AS employee_name FROM users u
                                LEFT JOIN employees e ON e.id = u.employee_id
                                WHERE u.username = ? LIMIT 1');
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            json_err('Invalid username or password.', 401);
        }

        $_SESSION['user'] = [
            'id' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
            'employee_id' => $user['employee_id'],
            'display_name' => $user['role'] === 'admin' ? 'Administrator' : $user['employee_name'],
        ];
        json_ok(['user' => $_SESSION['user']]);
        break;
    }

    case 'logout': {
        unset($_SESSION['user']);
        session_destroy();
        json_ok(['message' => 'Logged out.']);
        break;
    }

    case 'me': {
        json_ok(['user' => current_user()]);
        break;
    }

    default:
        json_err('Unknown auth action.', 404);
}
