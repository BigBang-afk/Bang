<?php
require_once __DIR__ . '/functions.php';

/**
 * Renders any queued flash messages. Safe to call multiple times (queue is drained once).
 */
function render_alerts(): void
{
    foreach (get_flashes() as $f) {
        echo '<div class="alert alert-' . e($f['type']) . '" data-autohide>' . e($f['message']) . '</div>';
    }
}
