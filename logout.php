<?php
require_once __DIR__ . '/includes/auth.php';
logout_user();
flash('info', 'You have been logged out.');
redirect(BASE_URL . '/index.php');
