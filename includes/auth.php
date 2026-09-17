<?php
/**
 * Customer authentication helpers.
 */

require_once __DIR__ . '/functions.php';

function current_user(): ?array
{
    static $user = false; // false = not loaded yet, null = no user

    if ($user === false) {
        $user = null;
        if (!empty($_SESSION['user_id'])) {
            $stmt = db()->prepare('SELECT * FROM users WHERE id = ? AND status = "active"');
            $stmt->execute([$_SESSION['user_id']]);
            $row = $stmt->fetch();
            $user = $row ?: null;
            if (!$user) {
                unset($_SESSION['user_id']);
            }
        }
    }

    return $user;
}

function is_logged_in(): bool
{
    return current_user() !== null;
}

function require_login(): void
{
    if (!is_logged_in()) {
        $_SESSION['redirect_after_login'] = $_SERVER['REQUEST_URI'] ?? '/account.php';
        redirect(BASE_URL . '/login.php');
    }
}

function login_user(int $userId): void
{
    session_regenerate_id(true);
    $_SESSION['user_id'] = $userId;
}

function logout_user(): void
{
    unset($_SESSION['user_id']);
    session_regenerate_id(true);
}

function wishlist_count(): int
{
    $user = current_user();
    if (!$user) {
        return 0;
    }
    $stmt = db()->prepare('SELECT COUNT(*) FROM wishlists WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    return (int) $stmt->fetchColumn();
}

function cart_count(): int
{
    $user = current_user();
    if ($user) {
        $stmt = db()->prepare('SELECT COALESCE(SUM(quantity),0) FROM cart_items WHERE user_id = ?');
        $stmt->execute([$user['id']]);
        return (int) $stmt->fetchColumn();
    }
    // Guest cart stored in session
    $cart = $_SESSION['guest_cart'] ?? [];
    return array_sum($cart);
}
