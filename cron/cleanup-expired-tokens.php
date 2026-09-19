<?php
/**
 * Zarghoon Jewellers - Expired password-reset token cleanup (Phase 10)
 *
 * Not required for the site to function (findValidPasswordResetToken()
 * already ignores any row where expires_at has passed), so this is
 * housekeeping only: it keeps the password_resets table from growing
 * forever. Nothing else in the project depends on a cron job running -
 * do not schedule this until you've actually set it up in cPanel.
 *
 * CLI ONLY. Not part of any web-facing flow, and refuses to run if
 * somehow requested over HTTP (the root .htaccess also blocks the whole
 * cron/ folder from direct HTTP access - this check is defense in depth,
 * not the only protection).
 *
 * cPanel setup: cPanel > Cron Jobs > Add New Cron Job
 *   Command:  php /home/YOURCPANELUSER/public_html/cron/cleanup-expired-tokens.php
 *   Schedule: once daily is plenty, e.g. "0 3 * * *" (3am server time)
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('This script can only be run from the command line.');
}

require_once __DIR__ . '/../includes/functions.php';

$deleted = dbExecute('DELETE FROM password_resets WHERE expires_at < NOW()');
$count = db()->query('SELECT ROW_COUNT()')->fetchColumn();

echo date('Y-m-d H:i:s') . " - cleanup-expired-tokens: removed $count expired password reset token(s).\n";
