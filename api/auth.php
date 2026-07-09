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

    case 'signup': {
        $name = trim((string) input('name', ''));
        $username = trim((string) input('username', '')); // mobile number
        $email = trim((string) input('email', ''));
        $password = (string) input('password', '');

        if ($name === '') json_err('Full name is required.');
        if (!preg_match('/^[0-9]{10}$/', $username)) json_err('Enter a valid 10-digit mobile number.');
        if (strlen($password) < 6) json_err('Password must be at least 6 characters.');

        $exists = db()->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
        $exists->execute([$username]);
        if ($exists->fetch()) json_err('An account with this mobile number already exists. Please sign in instead.', 409);

        db()->beginTransaction();
        try {
            // New self-registered staff start in "Administration" / "New Staff" until an
            // admin updates their department & designation from the Employee Master screen.
            $stmt = db()->prepare('INSERT INTO employees (name, mobile, email, department, designation, status)
                                    VALUES (?,?,?,\'Administration\',\'New Staff\',\'Active\')');
            $stmt->execute([$name, $username, $email]);
            $employeeId = (int) db()->lastInsertId();

            $hash = password_hash($password, PASSWORD_BCRYPT);
            $stmt = db()->prepare('INSERT INTO users (username, password_hash, role, employee_id) VALUES (?,?,\'employee\',?)');
            $stmt->execute([$username, $hash, $employeeId]);
            $userId = (int) db()->lastInsertId();

            db()->commit();
        } catch (Throwable $e) {
            db()->rollBack();
            json_err('Could not create your account: ' . $e->getMessage(), 500);
        }

        $_SESSION['user'] = [
            'id' => $userId,
            'username' => $username,
            'role' => 'employee',
            'employee_id' => $employeeId,
            'display_name' => $name,
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
