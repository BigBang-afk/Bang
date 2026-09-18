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

/**
 * Alias for getCurrentUser(), kept as a separate named function because
 * both names are used by convention across this project's pages.
 */
function currentUser(): ?array
{
    return getCurrentUser();
}

function isLoggedIn(): bool
{
    return getCurrentUser() !== null;
}

/**
 * Logs a customer in: regenerates the session ID (prevents session
 * fixation) and stores only the minimum needed in the session. Pass
 * the full user row fetched after password_verify() succeeds.
 */
function loginUser(array $user): void
{
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['logged_in'] = true;
}

function logoutUser(): void
{
    unset($_SESSION['user_id'], $_SESSION['username'], $_SESSION['logged_in']);
    session_regenerate_id(true);
}

/**
 * Validates that $path is a safe, local, internal path - used for the
 * post-login redirect below. Never allows an absolute URL, a
 * protocol-relative "//host/..." path, or anything containing a
 * scheme (e.g. "javascript:"), which would otherwise let an attacker
 * craft a link that bounces a logged-in customer off-site (open
 * redirect). Returns null if $path is not a safe local path.
 */
function safeInternalPath(?string $path): ?string
{
    if (empty($path)) {
        return null;
    }
    if ($path[0] !== '/' || (isset($path[1]) && $path[1] === '/') || str_contains($path, ':')) {
        return null;
    }
    return $path;
}

/**
 * Redirects to the login page if no customer is logged in, remembering
 * the page the guest was trying to reach so requireLogin()'s caller can
 * be sent back there after a successful login. Call this as the first
 * line of any page that requires a logged-in customer.
 */
function requireLogin(): void
{
    if (!isLoggedIn()) {
        $intended = safeInternalPath($_SERVER['REQUEST_URI'] ?? null);
        if ($intended !== null) {
            $_SESSION['redirect_after_login'] = $intended;
        }
        redirect(SITE_URL . '/login.php');
    }
}

/**
 * Returns the safe local path to send a customer to right after login
 * (set by requireLogin() above when they were bounced off a protected
 * page), clearing it so it is only ever used once. Falls back to
 * account.php when no intended page was recorded.
 */
function getAndClearRedirectAfterLogin(): string
{
    $path = safeInternalPath($_SESSION['redirect_after_login'] ?? null);
    unset($_SESSION['redirect_after_login']);
    return $path ?? '/account.php';
}

/**
 * Normalizes a Pakistani mobile number into one consistent storage
 * format: "03XXXXXXXXX" (11 digits, leading 0). Accepts common input
 * formats such as "0300 1234567", "+92-300-1234567", "923001234567",
 * or "3001234567". Returns null if the input cannot be recognized as a
 * valid Pakistani mobile number. This guarantees two different-looking
 * inputs for the same real number ("03001234567" vs "+923001234567")
 * always collapse to the same database value, preventing duplicate
 * accounts for the same person.
 */
function normalizeMobile(string $mobile): ?string
{
    $digits = preg_replace('/\D+/', '', $mobile); // strip spaces, dashes, +, parentheses

    if ($digits === '') {
        return null;
    }

    // Strip a leading international/local prefix down to the bare
    // "3XXXXXXXXX" (10 digits) core, then normalize onto a single "0".
    if (str_starts_with($digits, '0092')) {
        $digits = substr($digits, 4);
    } elseif (str_starts_with($digits, '92')) {
        $digits = substr($digits, 2);
    } elseif (str_starts_with($digits, '0')) {
        $digits = substr($digits, 1);
    }

    // $digits must now be exactly "3XXXXXXXXX" - 10 digits starting with 3.
    if (!preg_match('/^3\d{9}$/', $digits)) {
        return null;
    }

    return '0' . $digits;
}

/**
 * Looks up a customer account by either their username or mobile
 * number (accepting any of the flexible mobile formats normalizeMobile()
 * understands), for the "Username or Mobile Number" login field.
 * Only ever matches active accounts. Returns null if nothing matches.
 */
function findUserByLogin(string $login): ?array
{
    $login = trim($login);
    if ($login === '') {
        return null;
    }

    $normalizedMobile = normalizeMobile($login);
    if ($normalizedMobile !== null) {
        $user = dbFetchOne('SELECT * FROM users WHERE mobile = ? AND status = "active" LIMIT 1', [$normalizedMobile]);
        if ($user) {
            return $user;
        }
    }

    return dbFetchOne('SELECT * FROM users WHERE username = ? AND status = "active" LIMIT 1', [$login]);
}

/**
 * Creates a new customer account. Callers must validate and normalize
 * every field first (uniqueness checks, mobile normalization, password
 * length, etc.) - this function only performs the insert and password
 * hashing, so validation error messages stay in register.php where the
 * form that produced them lives. Expects $data with keys: full_name,
 * username, mobile (already normalized), email (string, '' if none),
 * password (plaintext - hashed here, never stored raw). Returns the
 * new user's id.
 */
function registerUser(array $data): int
{
    dbExecute(
        'INSERT INTO users (username, mobile, email, password, full_name, status) VALUES (?, ?, ?, ?, ?, "active")',
        [
            $data['username'],
            $data['mobile'],
            ($data['email'] ?? '') !== '' ? $data['email'] : null,
            password_hash($data['password'], PASSWORD_DEFAULT),
            $data['full_name'],
        ]
    );
    return (int) dbInsertId();
}

/**
 * Whether $userId has already added $productId to their wishlist.
 * Small reusable check for the future wishlist add/remove toggle
 * button (the wishlists table already exists from the Phase 1 schema;
 * the wishlist page itself is built in a later phase).
 */
function userHasWishlistItem(int $userId, int $productId): bool
{
    return (bool) dbFetchColumn(
        'SELECT COUNT(*) FROM wishlists WHERE user_id = ? AND product_id = ?',
        [$userId, $productId]
    );
}

// ---------------------------------------------------------------
// Customer login rate limiting (session-scoped brute-force throttling)
// Separate session keys from the admin login throttle below, so a
// customer and an admin failing to log in in the same browser session
// never affect each other's lockout state.
// ---------------------------------------------------------------

function recordFailedLogin(): void
{
    $_SESSION['login_attempts'] = ($_SESSION['login_attempts'] ?? 0) + 1;
    $_SESSION['login_last_attempt'] = time();
}

function resetLoginAttempts(): void
{
    unset($_SESSION['login_attempts'], $_SESSION['login_last_attempt']);
}

/**
 * True if this session has failed to log in too many times recently.
 * Not a permanent account lock - it clears itself once
 * LOGIN_LOCKOUT_SECONDS has passed since the last failed attempt.
 */
function isLoginBlocked(): bool
{
    $attempts = $_SESSION['login_attempts'] ?? 0;
    $lastAttempt = $_SESSION['login_last_attempt'] ?? 0;

    if ($attempts < LOGIN_MAX_ATTEMPTS) {
        return false;
    }

    if ((time() - $lastAttempt) >= LOGIN_LOCKOUT_SECONDS) {
        resetLoginAttempts();
        return false;
    }

    return true;
}

// ---------------------------------------------------------------
// Password reset (Phase 4)
// Tokens are never stored in plaintext: only a SHA-256 hash of the
// token is kept in password_resets.token_hash, so a database leak
// alone can never be used to reset anyone's password. Each token is
// single-use (used_at) and time-limited (expires_at). See
// forgot-password.php / reset-password.php for how these are used.
// ---------------------------------------------------------------

/**
 * Issues a new password reset token for $userId, invalidating any
 * previous unused tokens for that user first (so only the newest
 * request can ever be completed). Returns the RAW token - it exists
 * only in memory here, at issuance time, and must never be stored or
 * logged anywhere except to the out-of-band delivery channel (SMS/
 * email) the caller is responsible for.
 */
function createPasswordResetToken(int $userId): string
{
    dbExecute('UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL', [$userId]);

    $token = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $token);
    $expiresAt = date('Y-m-d H:i:s', time() + PASSWORD_RESET_EXPIRY);

    dbExecute(
        'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
        [$userId, $tokenHash, $expiresAt]
    );

    return $token;
}

/**
 * Validates a raw reset token from a reset link: looks it up by hash
 * and confirms it hasn't already been used or expired. Returns the
 * matching password_resets row (including user_id) or null if the
 * token is invalid, expired, or already used.
 */
function findValidPasswordResetToken(string $token): ?array
{
    $tokenHash = hash('sha256', $token);
    return dbFetchOne(
        'SELECT * FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW() LIMIT 1',
        [$tokenHash]
    );
}

/**
 * Marks a password_resets row as used, so the same token can never be
 * replayed to reset the password a second time.
 */
function markPasswordResetTokenUsed(int $resetId): void
{
    dbExecute('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [$resetId]);
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
 * Logs an admin in: regenerates the session ID (prevents session
 * fixation), stores the admin's id/username/role in the session, and
 * records the login timestamp. Pass the full admin row fetched after
 * password_verify() succeeds.
 */
function loginAdmin(array $admin): void
{
    session_regenerate_id(true);
    $_SESSION['admin_id'] = (int) $admin['id'];
    $_SESSION['admin_username'] = $admin['username'];
    $_SESSION['admin_role'] = $admin['role'];
    $_SESSION['admin_last_activity'] = time();
    dbExecute('UPDATE admins SET last_login = NOW() WHERE id = ?', [$admin['id']]);
}

/**
 * Destroys the admin's authentication data and regenerates the session
 * ID, without touching any customer session data that may also be
 * present in the same browser session.
 */
function logoutAdmin(): void
{
    unset($_SESSION['admin_id'], $_SESSION['admin_username'], $_SESSION['admin_role'], $_SESSION['admin_last_activity']);
    session_regenerate_id(true);
}

/**
 * Redirects to the admin login page if no admin is logged in, and also
 * enforces the admin session inactivity timeout (ADMIN_SESSION_TIMEOUT).
 * Call this as the first line of every protected admin/*.php page.
 */
function requireAdmin(): void
{
    if (!isAdminLoggedIn()) {
        redirect(SITE_URL . '/admin/login.php');
    }

    if (!empty($_SESSION['admin_last_activity']) && (time() - $_SESSION['admin_last_activity']) > ADMIN_SESSION_TIMEOUT) {
        logoutAdmin();
        if (function_exists('flash')) {
            flash('error', 'Your session has expired due to inactivity. Please log in again.');
        }
        redirect(SITE_URL . '/admin/login.php');
    }

    // Sliding expiry: any authenticated request resets the inactivity clock,
    // so an admin actively using the dashboard is never logged out mid-task.
    $_SESSION['admin_last_activity'] = time();
}

// ---------------------------------------------------------------
// Admin login rate limiting (session-scoped brute-force throttling)
// ---------------------------------------------------------------

/**
 * Records one failed admin login attempt for the current session.
 */
function recordFailedAdminLogin(): void
{
    $_SESSION['admin_login_attempts'] = ($_SESSION['admin_login_attempts'] ?? 0) + 1;
    $_SESSION['admin_login_last_attempt'] = time();
}

/**
 * Clears failed-login tracking for the current session (call on success).
 */
function resetAdminLoginAttempts(): void
{
    unset($_SESSION['admin_login_attempts'], $_SESSION['admin_login_last_attempt']);
}

/**
 * True if this session has failed to log in too many times recently.
 * Not a permanent account lock - it clears itself once
 * ADMIN_LOGIN_LOCKOUT_SECONDS has passed since the last failed attempt.
 */
function isAdminLoginBlocked(): bool
{
    $attempts = $_SESSION['admin_login_attempts'] ?? 0;
    $lastAttempt = $_SESSION['admin_login_last_attempt'] ?? 0;

    if ($attempts < ADMIN_LOGIN_MAX_ATTEMPTS) {
        return false;
    }

    if ((time() - $lastAttempt) >= ADMIN_LOGIN_LOCKOUT_SECONDS) {
        resetAdminLoginAttempts();
        return false;
    }

    return true;
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
