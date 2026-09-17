<?php
require_once __DIR__ . '/../includes/functions.php';

logoutAdmin();
redirect(SITE_URL . '/admin/login.php');
