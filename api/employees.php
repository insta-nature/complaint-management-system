<?php
require_once __DIR__ . '/helpers.php';

$action = input('action', $_GET['action'] ?? 'list');

switch ($action) {

    case 'list': {
        require_login();
        $rows = db()->query('SELECT * FROM employees ORDER BY id ASC')->fetchAll();
        json_ok(['employees' => $rows]);
        break;
    }

    case 'create': {
        require_admin();
        $name = trim((string) input('name', ''));
        $mobile = trim((string) input('mobile', ''));
        $designation = trim((string) input('designation', ''));
        if ($name === '' || !preg_match('/^[0-9]{10}$/', $mobile) || $designation === '') {
            json_err('Name, a valid 10-digit mobile number, and designation are required.');
        }
        $stmt = db()->prepare('INSERT INTO employees (name, mobile, email, department, designation, address, status)
                                VALUES (?,?,?,?,?,?,?)');
        $stmt->execute([
            $name, $mobile, input('email', ''), input('department', 'Public Works'),
            $designation, input('address', ''), input('status', 'Active'),
        ]);
        json_ok(['id' => db()->lastInsertId(), 'message' => 'Employee added successfully.']);
        break;
    }

    case 'update': {
        require_admin();
        $id = (int) input('id');
        if (!$id) json_err('Employee id is required.');
        $stmt = db()->prepare('UPDATE employees SET name=?, mobile=?, email=?, department=?, designation=?, address=?, status=? WHERE id=?');
        $stmt->execute([
            input('name'), input('mobile'), input('email', ''), input('department'),
            input('designation'), input('address', ''), input('status', 'Active'), $id,
        ]);
        json_ok(['message' => 'Employee updated successfully.']);
        break;
    }

    case 'delete': {
        require_admin();
        $id = (int) input('id');
        if (!$id) json_err('Employee id is required.');
        db()->prepare('DELETE FROM employees WHERE id=?')->execute([$id]);
        json_ok(['message' => 'Employee deleted.']);
        break;
    }

    default:
        json_err('Unknown employees action.', 404);
}
