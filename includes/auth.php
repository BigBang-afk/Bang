<?php
/**
 * Zarghoon Jewellers - Authentication
 *
 * Handles both customer sessions ($_SESSION['user_id']) and admin
 * sessions ($_SESSION['admin_id']) separately, so a staff member and a
 * customer can be logged in at the same time in the same browser
 * without conflict.
 */

require_once __DIR__ . '/../config/database.php';

/**
 * Defined here (rather than only in functions.php) so that auth.php is
 * self-sufficient: requireLogin()/requireAdmin() below both depend on
 * it, and auth.php may be included on its own.
 */
if (!function_exists('redirect')) {
    function redirect(string $url): void
    {
        header('Location: ' . $url);
        exit;
    }
}

// ---------------------------------------------------------------
// Customer authentication
// ---------------------------------------------------------------

/**
 * Returns the logged-in customer's row, or null if not logged in
 * (or if the account has since been deactivated).
 */
function getCurrentUser(): ?array
{
    static $user = false; // false = not looked up yet this request

    if ($user === false) {
        $user = null;
        if (!empty($_SESSION['user_id'])) {
            $row = dbFetchOne('SELECT * FROM users WHERE id = ? AND status = "active"', [$_SESSION['user_id']]);
            if ($row) {
                $user = $row;
            } else {
                unset($_SESSION['user_id']);
            }
        }
    }

    return $user;
}

function isLoggedIn(): bool
{
    return getCurrentUser() !== null;
}

/**
 * Logs a customer in: regenerates the session ID (prevents session
 * fixation) and stores only the user's ID in the session.
 */
function loginUser(int $userId): void
{
    session_regenerate_id(true);
    $_SESSION['user_id'] = $userId;
}

function logoutUser(): void
{
    unset($_SESSION['user_id']);
    session_regenerate_id(true);
}

/**
 * Redirects to the login page if no customer is logged in. Call this
 * as the first line of any page that requires a logged-in customer.
 */
function requireLogin(): void
{
    if (!isLoggedIn()) {
        $_SESSION['redirect_after_login'] = $_SERVER['REQUEST_URI'] ?? (SITE_URL . '/account.php');
        redirect(SITE_URL . '/login.php');
    }
}

// ---------------------------------------------------------------
// Admin authentication
// ---------------------------------------------------------------

/**
 * Returns the logged-in admin's row, or null if not logged in
 * (or if the account has since been deactivated).
 */
function getCurrentAdmin(): ?array
{
    static $admin = false;

    if ($admin === false) {
        $admin = null;
        if (!empty($_SESSION['admin_id'])) {
            $row = dbFetchOne('SELECT * FROM admins WHERE id = ? AND status = "active"', [$_SESSION['admin_id']]);
            if ($row) {
                $admin = $row;
            } else {
                unset($_SESSION['admin_id']);
            }
        }
    }

    return $admin;
}

function isAdminLoggedIn(): bool
{
    return getCurrentAdmin() !== null;
}

/**
 * Logs an admin in: regenerates the session ID and records the login
 * timestamp.
 */
function loginAdmin(int $adminId): void
{
    session_regenerate_id(true);
    $_SESSION['admin_id'] = $adminId;
    dbExecute('UPDATE admins SET last_login = NOW() WHERE id = ?', [$adminId]);
}

function logoutAdmin(): void
{
    unset($_SESSION['admin_id']);
    session_regenerate_id(true);
}

/**
 * Redirects to the admin login page if no admin is logged in. Call this
 * as the first line of every protected admin/*.php page.
 */
function requireAdmin(): void
{
    if (!isAdminLoggedIn()) {
        redirect(SITE_URL . '/admin/login.php');
    }
}

/**
 * Stricter variant of requireAdmin() for pages that only a super_admin
 * (not a regular "admin") should be able to reach, e.g. managing other
 * admin accounts in a later phase.
 */
function requireSuperAdmin(): void
{
    requireAdmin();
    $admin = getCurrentAdmin();
    if (($admin['role'] ?? '') !== 'super_admin') {
        http_response_code(403);
        die('You do not have permission to access this page.');
    }
}
