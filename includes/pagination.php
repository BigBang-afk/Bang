<?php
/**
 * Renders pagination links. $pagination is the array returned by paginate().
 * $baseUrl should already contain other query params with a trailing '&' or '?'.
 */
function render_pagination(array $pagination, string $baseUrl): void
{
    if ($pagination['totalPages'] <= 1) {
        return;
    }
    $sep = (strpos($baseUrl, '?') === false) ? '?' : '&';
    $current = $pagination['currentPage'];
    $total = $pagination['totalPages'];

    echo '<nav class="pagination" aria-label="Pagination">';

    if ($current > 1) {
        echo '<a href="' . e($baseUrl . $sep . 'page=' . ($current - 1)) . '">&laquo;</a>';
    }

    $start = max(1, $current - 2);
    $end = min($total, $current + 2);

    if ($start > 1) {
        echo '<a href="' . e($baseUrl . $sep . 'page=1') . '">1</a>';
        if ($start > 2) echo '<span>&hellip;</span>';
    }

    for ($i = $start; $i <= $end; $i++) {
        if ($i === $current) {
            echo '<span class="current">' . $i . '</span>';
        } else {
            echo '<a href="' . e($baseUrl . $sep . 'page=' . $i) . '">' . $i . '</a>';
        }
    }

    if ($end < $total) {
        if ($end < $total - 1) echo '<span>&hellip;</span>';
        echo '<a href="' . e($baseUrl . $sep . 'page=' . $total) . '">' . $total . '</a>';
    }

    if ($current < $total) {
        echo '<a href="' . e($baseUrl . $sep . 'page=' . ($current + 1)) . '">&raquo;</a>';
    }

    echo '</nav>';
}
