<?php
require_once __DIR__ . '/../includes/admin_auth.php';
require_once __DIR__ . '/../includes/pagination.php';
require_admin();

$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    require_csrf();
    $id = (int) ($_POST['id'] ?? 0);
    if ($_POST['action'] === 'set_status' && $id) {
        $status = in_array($_POST['status'] ?? '', ['new','read','replied'], true) ? $_POST['status'] : 'new';
        $pdo->prepare('UPDATE messages SET status = ? WHERE id = ?')->execute([$status, $id]);
        flash('success', 'Message status updated.');
    } elseif ($_POST['action'] === 'delete' && $id) {
        $pdo->prepare('DELETE FROM messages WHERE id = ?')->execute([$id]);
        flash('success', 'Message deleted.');
    }
    redirect(BASE_URL . '/admin/messages.php');
}

$viewId = (int) ($_GET['view'] ?? 0);
if ($viewId) {
    $pdo->prepare("UPDATE messages SET status = 'read' WHERE id = ? AND status = 'new'")->execute([$viewId]);
}

$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = 20;
$countStmt = $pdo->query('SELECT COUNT(*) FROM messages');
$pagination = paginate((int) $countStmt->fetchColumn(), $perPage, $page);

$stmt = $pdo->prepare("SELECT m.*, p.name AS product_name FROM messages m LEFT JOIN products p ON p.id = m.product_id ORDER BY m.created_at DESC LIMIT {$pagination['perPage']} OFFSET {$pagination['offset']}");
$stmt->execute();
$messages = $stmt->fetchAll();

$pageTitle = 'Messages';
$activeAdminNav = 'messages';
require __DIR__ . '/../includes/admin_header.php';
?>

<div class="admin-panel">
    <div class="admin-panel-head"><h2>Customer Messages &amp; Enquiries</h2></div>
    <div class="table-wrap">
        <table class="data-table">
            <thead><tr><th>Name</th><th>Contact</th><th>Subject / Product</th><th>Message</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
            <?php if (!$messages): ?><tr><td colspan="7">No messages yet.</td></tr><?php endif; ?>
            <?php foreach ($messages as $m): ?>
                <tr id="msg-<?= (int) $m['id'] ?>">
                    <td><?= e($m['name']) ?></td>
                    <td><?= e($m['phone'] ?: $m['email']) ?></td>
                    <td><?= e($m['subject'] ?: ($m['product_name'] ?? '-')) ?></td>
                    <td style="max-width:280px;"><?= nl2br(e(mb_strimwidth($m['message'], 0, 160, '...'))) ?></td>
                    <td>
                        <form method="post" style="display:inline;">
                            <?= csrf_field() ?>
                            <input type="hidden" name="action" value="set_status">
                            <input type="hidden" name="id" value="<?= (int) $m['id'] ?>">
                            <select name="status" onchange="this.form.submit()" class="status-pill status-<?= e($m['status']) ?>" style="border:none;">
                                <option value="new" <?= $m['status'] === 'new' ? 'selected' : '' ?>>New</option>
                                <option value="read" <?= $m['status'] === 'read' ? 'selected' : '' ?>>Read</option>
                                <option value="replied" <?= $m['status'] === 'replied' ? 'selected' : '' ?>>Replied</option>
                            </select>
                        </form>
                    </td>
                    <td><?= date('d M Y', strtotime($m['created_at'])) ?></td>
                    <td>
                        <form method="post" style="display:inline;">
                            <?= csrf_field() ?>
                            <input type="hidden" name="action" value="delete">
                            <input type="hidden" name="id" value="<?= (int) $m['id'] ?>">
                            <button type="submit" class="btn btn-danger btn-sm" data-confirm="Delete this message?">Delete</button>
                        </form>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php render_pagination($pagination, 'messages.php'); ?>
</div>

<?php require __DIR__ . '/../includes/admin_footer.php'; ?>
