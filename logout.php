<?php
require_once __DIR__ . '/includes/functions.php';

// Only ever unsets customer auth session keys (user_id/username/
// logged_in) - any unrelated session data (e.g. a future guest cart)
// is left untouched, per Phase 4's requirement.
logoutUser();
flash('success', 'Logged out successfully.');
redirect(SITE_URL . '/');
