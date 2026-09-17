<?php
require_once __DIR__ . '/../includes/admin_auth.php';
logout_admin();
redirect(BASE_URL . '/admin/login.php');
