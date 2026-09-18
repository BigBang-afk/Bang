<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$statusLabels = ['new' => 'Unread', 'read' => 'Read', 'replied' => 'Replied', 'archived' => 'Archived'];

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
$message = $id ? dbFetchOne('SELECT * FROM messages WHERE id = ?', [$id]) : null;

if (!$message) {
    flash('error', 'Message not found.');
    redirect(SITE_URL . '/admin/messages.php');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();
    $newStatus = $_POST['status'] ?? '';

    if (!array_key_exists($newStatus, $statusLabels)) {
        flash('error', 'Invalid status.');
    } else {
        dbExecute('UPDATE messages SET status = ? WHERE id = ?', [$newStatus, $id]);
        flash('success', 'Message marked as "' . $statusLabels[$newStatus] . '".');
    }
    redirect(SITE_URL . '/admin/message-view.php?id=' . $id);
}

// Viewing an unread message automatically marks it read - matches how
// every real inbox behaves, and still leaves "Replied"/"Archived" as
// explicit admin actions below.
if ($message['status'] === 'new') {
    dbExecute('UPDATE messages SET status = "read" WHERE id = ?', [$id]);
    $message['status'] = 'read';
}

$pageTitle = 'Message from ' . $message['name'];
$activeNav = 'messages';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel-head">
    <h2 style="font-family:'Playfair Display',serif;font-size:1.3rem;">Message from <?= e($message['name']) ?></h2>
    <a href="<?= SITE_URL ?>/admin/messages.php" class="btn btn-outline btn-sm">&larr; Back to Messages</a>
</div>

<div class="admin-grid-2">
    <div class="admin-panel">
        <div class="admin-panel-head"><h2>Sender</h2></div>
        <p><strong>Name:</strong> <?= e($message['name']) ?></p>
        <p><strong>Mobile:</strong> <?= e($message['mobile'] ?: '-') ?></p>
        <p><strong>Email:</strong> <?= e($message['email'] ?: '-') ?></p>
        <p><strong>Subject:</strong> <?= e($message['subject'] ?: '-') ?></p>
        <p><strong>Received:</strong> <?= date('d M Y, H:i', strtotime($message['created_at'])) ?></p>
    </div>
    <div class="admin-panel">
        <div class="admin-panel-head"><h2>Status</h2></div>
        <p><span class="status-pill status-<?= e($message['status']) ?>"><?= e($statusLabels[$message['status']] ?? $message['status']) ?></span></p>
        <form method="post">
            <?= csrfField() ?>
            <div class="form-group">
                <label for="status">Change Status</label>
                <select id="status" name="status" class="form-control">
                    <?php foreach ($statusLabels as $val => $label): ?>
                        <option value="<?= $val ?>" <?= $message['status'] === $val ? 'selected' : '' ?>><?= e($label) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <button type="submit" class="btn btn-gold btn-sm">Update Status</button>
        </form>
    </div>
</div>

<div class="admin-panel">
    <div class="admin-panel-head"><h2>Message</h2></div>
    <p style="white-space:pre-wrap;"><?= nl2br(e($message['message'])) ?></p>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
