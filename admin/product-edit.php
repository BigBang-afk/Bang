<?php
require_once __DIR__ . '/../includes/admin_auth.php';
require_admin();

$pdo = db();
$productId = (int) ($_GET['id'] ?? 0);

$stmt = $pdo->prepare('SELECT * FROM products WHERE id = ?');
$stmt->execute([$productId]);
$product = $stmt->fetch();

if (!$product) {
    flash('error', 'Product not found.');
    redirect(BASE_URL . '/admin/products.php');
}

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();
    $action = $_POST['action'] ?? 'update';

    if ($action === 'add_images') {
        if (!empty($_FILES['images']['name'][0])) {
            $stmt = $pdo->prepare('SELECT COUNT(*) FROM product_images WHERE product_id = ?');
            $stmt->execute([$productId]);
            $existingCount = (int) $stmt->fetchColumn();

            foreach ($_FILES['images']['name'] as $i => $name) {
                if ($name === '') continue;
                $file = [
                    'name' => $_FILES['images']['name'][$i], 'type' => $_FILES['images']['type'][$i],
                    'tmp_name' => $_FILES['images']['tmp_name'][$i], 'error' => $_FILES['images']['error'][$i],
                    'size' => $_FILES['images']['size'][$i],
                ];
                try {
                    $path = handle_image_upload($file, 'products');
                    $isMain = $existingCount === 0 ? 1 : 0;
                    $pdo->prepare('INSERT INTO product_images (product_id, image_path, is_main, sort_order) VALUES (?,?,?,?)')
                        ->execute([$productId, $path, $isMain, $existingCount]);
                    $existingCount++;
                } catch (RuntimeException $e) {
                    flash('error', $name . ': ' . $e->getMessage());
                }
            }
            flash('success', 'Images uploaded.');
        }
        redirect(BASE_URL . '/admin/product-edit.php?id=' . $productId);
    }

    if ($action === 'set_main_image') {
        $imageId = (int) ($_POST['image_id'] ?? 0);
        $pdo->prepare('UPDATE product_images SET is_main = 0 WHERE product_id = ?')->execute([$productId]);
        $pdo->prepare('UPDATE product_images SET is_main = 1 WHERE id = ? AND product_id = ?')->execute([$imageId, $productId]);
        flash('success', 'Main image updated.');
        redirect(BASE_URL . '/admin/product-edit.php?id=' . $productId);
    }

    if ($action === 'delete_image') {
        $imageId = (int) ($_POST['image_id'] ?? 0);
        $stmt = $pdo->prepare('SELECT * FROM product_images WHERE id = ? AND product_id = ?');
        $stmt->execute([$imageId, $productId]);
        $img = $stmt->fetch();
        if ($img) {
            $pdo->prepare('DELETE FROM product_images WHERE id = ?')->execute([$imageId]);
            delete_uploaded_image($img['image_path']);
            if ($img['is_main']) {
                $stmt = $pdo->prepare('SELECT id FROM product_images WHERE product_id = ? ORDER BY sort_order ASC LIMIT 1');
                $stmt->execute([$productId]);
                $next = $stmt->fetch();
                if ($next) {
                    $pdo->prepare('UPDATE product_images SET is_main = 1 WHERE id = ?')->execute([$next['id']]);
                }
            }
            flash('success', 'Image removed.');
        }
        redirect(BASE_URL . '/admin/product-edit.php?id=' . $productId);
    }

    // Default: update product fields
    $data = [
        'name' => trim($_POST['name'] ?? ''),
        'sku' => trim($_POST['sku'] ?? ''),
        'category_id' => $_POST['category_id'] !== '' ? (int) $_POST['category_id'] : null,
        'collection_id' => $_POST['collection_id'] !== '' ? (int) $_POST['collection_id'] : null,
        'purity' => in_array($_POST['purity'] ?? '', ['24K','22K','21K','18K'], true) ? $_POST['purity'] : '21K',
        'gross_weight' => (float) ($_POST['gross_weight'] ?? 0),
        'net_weight' => (float) ($_POST['net_weight'] ?? 0),
        'gold_rate' => (float) ($_POST['gold_rate'] ?? 0),
        'making_charges' => (float) ($_POST['making_charges'] ?? 0),
        'stone_charges' => (float) ($_POST['stone_charges'] ?? 0),
        'other_charges' => (float) ($_POST['other_charges'] ?? 0),
        'discount' => (float) ($_POST['discount'] ?? 0),
        'price_mode' => ($_POST['price_mode'] ?? 'auto') === 'manual' ? 'manual' : 'auto',
        'stock_status' => in_array($_POST['stock_status'] ?? '', ['in_stock','out_of_stock','made_to_order'], true) ? $_POST['stock_status'] : 'in_stock',
        'status' => ($_POST['status'] ?? 'active') === 'inactive' ? 'inactive' : 'active',
        'featured' => !empty($_POST['featured']) ? 1 : 0,
        'best_seller' => !empty($_POST['best_seller']) ? 1 : 0,
        'new_arrival' => !empty($_POST['new_arrival']) ? 1 : 0,
        'description' => trim($_POST['description'] ?? ''),
        'short_description' => trim($_POST['short_description'] ?? ''),
        'seo_title' => trim($_POST['seo_title'] ?? ''),
        'seo_description' => trim($_POST['seo_description'] ?? ''),
    ];

    if ($data['price_mode'] === 'manual') {
        $data['price'] = (float) ($_POST['price'] ?? 0);
    } else {
        $data['price'] = calculate_product_price(
            $data['net_weight'], $data['gold_rate'], $data['making_charges'],
            $data['stone_charges'], $data['other_charges'], $data['discount']
        );
    }

    if ($data['name'] === '') $errors[] = 'Product name is required.';
    if ($data['sku'] === '') $errors[] = 'SKU is required.';
    if ($data['net_weight'] <= 0) $errors[] = 'Net weight must be greater than zero.';

    if ($data['sku'] !== $product['sku']) {
        $skuCheck = $pdo->prepare('SELECT COUNT(*) FROM products WHERE sku = ? AND id != ?');
        $skuCheck->execute([$data['sku'], $productId]);
        if ($skuCheck->fetchColumn() > 0) {
            $errors[] = 'SKU already exists. Please use a different SKU.';
        }
    }

    if (!$errors) {
        $slug = $data['name'] !== $product['name'] ? unique_slug(slugify($data['name']), 'products', $productId) : $product['slug'];
        $stmt = $pdo->prepare(
            'UPDATE products SET sku=?, name=?, slug=?, category_id=?, collection_id=?, description=?, short_description=?,
                purity=?, gross_weight=?, net_weight=?, gold_rate=?, making_charges=?, stone_charges=?, other_charges=?,
                discount=?, price=?, price_mode=?, stock_status=?, featured=?, best_seller=?, new_arrival=?, status=?,
                seo_title=?, seo_description=? WHERE id=?'
        );
        $stmt->execute([
            $data['sku'], $data['name'], $slug, $data['category_id'], $data['collection_id'],
            $data['description'], $data['short_description'], $data['purity'], $data['gross_weight'],
            $data['net_weight'], $data['gold_rate'], $data['making_charges'], $data['stone_charges'],
            $data['other_charges'], $data['discount'], $data['price'], $data['price_mode'],
            $data['stock_status'], $data['featured'], $data['best_seller'], $data['new_arrival'],
            $data['status'], $data['seo_title'], $data['seo_description'], $productId,
        ]);
        log_activity('Product "' . $data['name'] . '" updated.');
        flash('success', 'Product updated successfully.');
        redirect(BASE_URL . '/admin/product-edit.php?id=' . $productId);
    }

    // Re-merge for re-display on validation error
    $product = array_merge($product, $data);
}

$data = [
    'sku' => $product['sku'], 'name' => $product['name'], 'category_id' => $product['category_id'],
    'collection_id' => $product['collection_id'], 'description' => $product['description'],
    'short_description' => $product['short_description'], 'purity' => $product['purity'],
    'gross_weight' => $product['gross_weight'], 'net_weight' => $product['net_weight'],
    'gold_rate' => $product['gold_rate'], 'making_charges' => $product['making_charges'],
    'stone_charges' => $product['stone_charges'], 'other_charges' => $product['other_charges'],
    'discount' => $product['discount'], 'price' => $product['price'], 'price_mode' => $product['price_mode'],
    'stock_status' => $product['stock_status'], 'featured' => $product['featured'],
    'best_seller' => $product['best_seller'], 'new_arrival' => $product['new_arrival'],
    'status' => $product['status'], 'seo_title' => $product['seo_title'], 'seo_description' => $product['seo_description'],
];

$categories = $pdo->query('SELECT id, name FROM categories ORDER BY name')->fetchAll();
$collections = $pdo->query('SELECT id, name FROM collections ORDER BY name')->fetchAll();
$goldRates = get_current_gold_rates();

$stmt = $pdo->prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_main DESC, sort_order ASC');
$stmt->execute([$productId]);
$images = $stmt->fetchAll();

$pageTitle = 'Edit Product';
$activeAdminNav = 'products';
require __DIR__ . '/../includes/admin_header.php';
require __DIR__ . '/_product_form.php';
require __DIR__ . '/../includes/admin_footer.php';
