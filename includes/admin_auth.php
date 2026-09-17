<?php
/**
 * Admin authentication helpers. Admin sessions are kept separate from customer sessions.
 */

require_once __DIR__ . '/functions.php';

function current_admin(): ?array
{
    static $admin = false;

    if ($admin === false) {
        $admin = null;
        if (!empty($_SESSION['admin_id'])) {
            $stmt = db()->prepare('SELECT * FROM admins WHERE id = ? AND status = "active"');
            $stmt->execute([$_SESSION['admin_id']]);
            $row = $stmt->fetch();
            $admin = $row ?: null;
            if (!$admin) {
                unset($_SESSION['admin_id']);
            }
        }
    }

    return $admin;
}

function is_admin_logged_in(): bool
{
    return current_admin() !== null;
}

function require_admin(): void
{
    if (!is_admin_logged_in()) {
        redirect(BASE_URL . '/admin/login.php');
    }
}

function require_super_admin(): void
{
    require_admin();
    $admin = current_admin();
    if (($admin['role'] ?? '') !== 'super_admin') {
        http_response_code(403);
        die('You do not have permission to access this page.');
    }
}

function login_admin(int $adminId): void
{
    session_regenerate_id(true);
    $_SESSION['admin_id'] = $adminId;
    $stmt = db()->prepare('UPDATE admins SET last_login_at = NOW() WHERE id = ?');
    $stmt->execute([$adminId]);
}

function logout_admin(): void
{
    unset($_SESSION['admin_id']);
    session_regenerate_id(true);
}
