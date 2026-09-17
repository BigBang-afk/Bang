<?php
/**
 * Zarghoon Jewellers - CSRF Protection
 *
 * Every state-changing POST form/AJAX request in this project must
 * include the token from csrfField()/generateCsrfToken(), and every
 * handler that processes a POST must call verifyCsrfToken() (or
 * requireCsrf() to auto-block the request) before touching the database.
 */

require_once __DIR__ . '/../config/config.php';

/**
 * Returns the current CSRF token, generating one for this session if
 * it does not exist yet.
 */
function generateCsrfToken(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Verifies a submitted CSRF token against the one stored in the session
 * using a timing-safe comparison.
 */
function verifyCsrfToken(?string $token): bool
{
    return !empty($_SESSION['csrf_token'])
        && !empty($token)
        && hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Convenience helper for forms: echoes a ready-to-use hidden input.
 * Usage inside a <form>: <?= csrfField() ?>
 */
function csrfField(): string
{
    return '<input type="hidden" name="csrf_token" value="' . htmlspecialchars(generateCsrfToken(), ENT_QUOTES, 'UTF-8') . '">';
}

/**
 * Blocks the request immediately with a 400 response if this is a POST
 * request carrying an invalid/missing CSRF token. Call this as the very
 * first line of any POST handler.
 */
function requireCsrf(): void
{
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $token = $_POST['csrf_token'] ?? null;
        if (!verifyCsrfToken($token)) {
            http_response_code(400);
            die('Invalid or expired form submission. Please go back, refresh the page, and try again.');
        }
    }
}
