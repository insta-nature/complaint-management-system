<?php
require_once __DIR__ . '/helpers.php';

$action = input('action', $_GET['action'] ?? 'list');

/** Fetch a complaint with its assigned employee name, files and status log. */
function fetch_complaint_full(int $id): ?array {
    $stmt = db()->prepare('SELECT c.*, e.name AS employee_name, e.mobile AS employee_mobile
                            FROM complaints c LEFT JOIN employees e ON e.id = c.assigned_to
                            WHERE c.id = ? LIMIT 1');
    $stmt->execute([$id]);
    $c = $stmt->fetch();
    if (!$c) return null;

    $files = db()->prepare('SELECT id, kind, file_name, file_path FROM complaint_files WHERE complaint_id = ? ORDER BY id');
    $files->execute([$id]);
    $allFiles = $files->fetchAll();

    $c['attachments'] = array_values(array_filter($allFiles, fn($f) => $f['kind'] === 'attachment'));
    $c['before_photos'] = array_values(array_filter($allFiles, fn($f) => $f['kind'] === 'before'));
    $c['after_photos'] = array_values(array_filter($allFiles, fn($f) => $f['kind'] === 'after'));

    $logs = db()->prepare('SELECT status, remark, changed_by, changed_at FROM complaint_logs WHERE complaint_id = ? ORDER BY changed_at ASC, id ASC');
    $logs->execute([$id]);
    $c['logs'] = $logs->fetchAll();

    return $c;
}

function log_status(int $complaintId, string $status, ?string $remark, string $changedBy): void {
    $stmt = db()->prepare('INSERT INTO complaint_logs (complaint_id, status, remark, changed_by) VALUES (?,?,?,?)');
    $stmt->execute([$complaintId, $status, $remark, $changedBy]);
}

switch ($action) {

    /* ---------------------------------------------------------------
       CREATE — public complaint registration (no login required)
       Accepts multipart/form-data with optional attachments[] files
    --------------------------------------------------------------- */
    case 'create': {
        $name = trim((string) input('name', ''));
        $mobile = trim((string) input('mobile', ''));
        $subject = trim((string) input('subject', ''));
        $category = trim((string) input('category', ''));
        $description = trim((string) input('description', ''));
        $date = input('date', date('Y-m-d'));

        if ($name === '' || !preg_match('/^[0-9]{10}$/', $mobile) || $subject === '' || $category === '' || $description === '') {
            json_err('Please fill all required fields with a valid 10-digit mobile number.');
        }

        db()->beginTransaction();
        try {
            $stmt = db()->prepare('INSERT INTO complaints (name, mobile, email, subject, category, description, complaint_date, status, priority)
                                    VALUES (?,?,?,?,?,?,?,\'Pending\',\'Medium\')');
            $stmt->execute([$name, $mobile, input('email', ''), $subject, $category, $description, $date]);
            $id = (int) db()->lastInsertId();

            foreach (normalize_files('attachments') as $file) {
                $saved = save_uploaded_file($file, 'attachment');
                db()->prepare('INSERT INTO complaint_files (complaint_id, kind, file_name, file_path, file_type) VALUES (?,\'attachment\',?,?,?)')
                    ->execute([$id, $saved['file_name'], $saved['file_path'], $saved['file_type']]);
            }

            log_status($id, 'Pending', null, 'system');
            db()->commit();
            json_ok(['id' => $id, 'message' => "Complaint Registered Successfully. Your Complaint ID is $id."]);
        } catch (Throwable $e) {
            db()->rollBack();
            json_err('Could not register complaint: ' . $e->getMessage(), 500);
        }
        break;
    }

    /* ---------------------------------------------------------------
       LIST — admin sees all (with filters); employee sees only their own
    --------------------------------------------------------------- */
    case 'list': {
        $user = require_login();
        $where = [];
        $params = [];

        if ($user['role'] === 'employee') {
            $where[] = 'c.assigned_to = ?';
            $params[] = $user['employee_id'];
        }
        if ($status = input('status')) { $where[] = 'c.status = ?'; $params[] = $status; }
        if ($category = input('category')) { $where[] = 'c.category = ?'; $params[] = $category; }
        if ($search = input('search')) {
            $where[] = '(c.id LIKE ? OR c.name LIKE ? OR c.subject LIKE ? OR c.mobile LIKE ?)';
            $like = '%' . $search . '%';
            array_push($params, $like, $like, $like, $like);
        }

        $sql = 'SELECT c.*, e.name AS employee_name FROM complaints c LEFT JOIN employees e ON e.id = c.assigned_to';
        if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
        $sql .= ' ORDER BY c.created_at DESC';

        $stmt = db()->prepare($sql);
        $stmt->execute($params);
        json_ok(['complaints' => $stmt->fetchAll()]);
        break;
    }

    /* ---------------------------------------------------------------
       GET — full detail (admin/employee)
    --------------------------------------------------------------- */
    case 'get': {
        require_login();
        $id = (int) input('id');
        $c = fetch_complaint_full($id);
        if (!$c) json_err('Complaint not found.', 404);
        json_ok(['complaint' => $c]);
        break;
    }

    /* ---------------------------------------------------------------
       TRACK — public lookup, limited fields, no login required
    --------------------------------------------------------------- */
    case 'track': {
        $id = (int) input('id');
        $stmt = db()->prepare('SELECT id, subject, category, status, complaint_date FROM complaints WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $c = $stmt->fetch();
        if (!$c) json_err('No complaint found with that ID.', 404);
        json_ok(['complaint' => $c]);
        break;
    }

    /* ---------------------------------------------------------------
       ASSIGN — admin only: set employee, priority, expected date
    --------------------------------------------------------------- */
    case 'assign': {
        $user = require_admin();
        $id = (int) input('id');
        $employeeId = (int) input('employee_id');
        if (!$id || !$employeeId) json_err('Complaint id and employee are required.');

        $stmt = db()->prepare('SELECT status FROM complaints WHERE id=?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) json_err('Complaint not found.', 404);

        $newStatus = $row['status'] === 'Pending' ? 'Assigned' : $row['status'];

        db()->prepare('UPDATE complaints SET assigned_to=?, priority=?, expected_completion_date=?, remark=COALESCE(NULLIF(?,\'\'), remark), status=? WHERE id=?')
            ->execute([$employeeId, input('priority', 'Medium'), input('expected_date') ?: null, input('remark', ''), $newStatus, $id]);

        log_status($id, $newStatus, input('remark', null), $user['display_name'] ?? $user['username']);
        json_ok(['message' => 'Complaint assigned successfully.']);
        break;
    }

    /* ---------------------------------------------------------------
       UPDATE — admin or the employee it's assigned to.
       Accepts multipart/form-data with optional before[]/after[] photo files.
    --------------------------------------------------------------- */
    case 'update': {
        $user = require_login();
        $id = (int) input('id');
        if (!$id) json_err('Complaint id is required.');

        $stmt = db()->prepare('SELECT * FROM complaints WHERE id=?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch();
        if (!$existing) json_err('Complaint not found.', 404);

        if ($user['role'] === 'employee' && (int)$existing['assigned_to'] !== (int)$user['employee_id']) {
            json_err('You can only update complaints assigned to you.', 403);
        }

        $status = input('status', $existing['status']);
        $remark = input('remark', $existing['remark']);
        $employeeId = input('employee_id', $existing['assigned_to']);
        $completionDate = input('completion_date') ?: $existing['completion_date'];

        db()->beginTransaction();
        try {
            $stmt = db()->prepare('UPDATE complaints SET status=?, remark=?, assigned_to=?, completion_date=? WHERE id=?');
            $stmt->execute([$status, $remark, $employeeId ?: null, $completionDate, $id]);

            foreach (normalize_files('before') as $file) {
                $saved = save_uploaded_file($file, 'before');
                db()->prepare('INSERT INTO complaint_files (complaint_id, kind, file_name, file_path, file_type) VALUES (?,\'before\',?,?,?)')
                    ->execute([$id, $saved['file_name'], $saved['file_path'], $saved['file_type']]);
            }
            foreach (normalize_files('after') as $file) {
                $saved = save_uploaded_file($file, 'after');
                db()->prepare('INSERT INTO complaint_files (complaint_id, kind, file_name, file_path, file_type) VALUES (?,\'after\',?,?,?)')
                    ->execute([$id, $saved['file_name'], $saved['file_path'], $saved['file_type']]);
            }

            if ($status !== $existing['status']) {
                log_status($id, $status, $remark, $user['display_name'] ?? $user['username']);
            }
            db()->commit();
            json_ok(['message' => "Complaint #$id updated successfully."]);
        } catch (Throwable $e) {
            db()->rollBack();
            json_err('Update failed: ' . $e->getMessage(), 500);
        }
        break;
    }

    /* ---------------------------------------------------------------
       DELETE — admin only
    --------------------------------------------------------------- */
    case 'delete': {
        require_admin();
        $id = (int) input('id');
        if (!$id) json_err('Complaint id is required.');
        db()->prepare('DELETE FROM complaints WHERE id=?')->execute([$id]);
        json_ok(['message' => 'Complaint deleted.']);
        break;
    }

    /* ---------------------------------------------------------------
       STATS — dashboard counts, category & employee breakdowns
    --------------------------------------------------------------- */
    case 'stats': {
        require_login();
        $counts = db()->query("SELECT status, COUNT(*) AS n FROM complaints GROUP BY status")->fetchAll(PDO::FETCH_KEY_PAIR);
        $byCategory = db()->query("SELECT category, COUNT(*) AS n FROM complaints GROUP BY category")->fetchAll();
        $byEmployee = db()->query("SELECT e.id, e.name,
                                        COUNT(c.id) AS assigned,
                                        SUM(CASE WHEN c.status IN ('Completed','Closed') THEN 1 ELSE 0 END) AS done
                                    FROM employees e LEFT JOIN complaints c ON c.assigned_to = e.id
                                    GROUP BY e.id, e.name")->fetchAll();
        $employeeCount = (int) db()->query("SELECT COUNT(*) FROM employees")->fetchColumn();

        json_ok([
            'counts' => $counts,
            'by_category' => $byCategory,
            'by_employee' => $byEmployee,
            'employee_count' => $employeeCount,
            'total' => array_sum($counts),
        ]);
        break;
    }

    default:
        json_err('Unknown complaints action.', 404);
}
