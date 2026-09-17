<?php
require_once __DIR__ . '/../includes/admin_auth.php';
require_admin();

$pdo = db();
$errors = [];

$defaults = [
    'sku' => generate_sku(),
    'name' => '', 'category_id' => '', 'collection_id' => '', 'description' => '',
    'short_description' => '', 'purity' => '21K', 'gross_weight' => '', 'net_weight' => '',
    'gold_rate' => get_rate_for_karat('21K') ?? '', 'making_charges' => '0', 'stone_charges' => '0',
    'other_charges' => '0', 'discount' => '0', 'price' => '0', 'price_mode' => 'auto',
    'stock_status' => 'in_stock', 'featured' => 0, 'best_seller' => 0, 'new_arrival' => 0,
    'status' => 'active', 'seo_title' => '', 'seo_description' => '',
];
$data = array_merge($defaults, array_intersect_key($_POST, $defaults));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();

    $data['name'] = trim($_POST['name'] ?? '');
    $data['sku'] = trim($_POST['sku'] ?? '') ?: generate_sku();
    $data['category_id'] = $_POST['category_id'] !== '' ? (int) $_POST['category_id'] : null;
    $data['collection_id'] = $_POST['collection_id'] !== '' ? (int) $_POST['collection_id'] : null;
    $data['purity'] = in_array($_POST['purity'] ?? '', ['24K','22K','21K','18K'], true) ? $_POST['purity'] : '21K';
    $data['gross_weight'] = (float) ($_POST['gross_weight'] ?? 0);
    $data['net_weight'] = (float) ($_POST['net_weight'] ?? 0);
    $data['gold_rate'] = (float) ($_POST['gold_rate'] ?? 0);
    $data['making_charges'] = (float) ($_POST['making_charges'] ?? 0);
    $data['stone_charges'] = (float) ($_POST['stone_charges'] ?? 0);
    $data['other_charges'] = (float) ($_POST['other_charges'] ?? 0);
    $data['discount'] = (float) ($_POST['discount'] ?? 0);
    $data['price_mode'] = ($_POST['price_mode'] ?? 'auto') === 'manual' ? 'manual' : 'auto';
    $data['stock_status'] = in_array($_POST['stock_status'] ?? '', ['in_stock','out_of_stock','made_to_order'], true) ? $_POST['stock_status'] : 'in_stock';
    $data['status'] = ($_POST['status'] ?? 'active') === 'inactive' ? 'inactive' : 'active';
    $data['featured'] = !empty($_POST['featured']) ? 1 : 0;
    $data['best_seller'] = !empty($_POST['best_seller']) ? 1 : 0;
    $data['new_arrival'] = !empty($_POST['new_arrival']) ? 1 : 0;
    $data['description'] = trim($_POST['description'] ?? '');
    $data['short_description'] = trim($_POST['short_description'] ?? '');
    $data['seo_title'] = trim($_POST['seo_title'] ?? '');
    $data['seo_description'] = trim($_POST['seo_description'] ?? '');

    if ($data['price_mode'] === 'manual') {
        $data['price'] = (float) ($_POST['price'] ?? 0);
    } else {
        $data['price'] = calculate_product_price(
            $data['net_weight'], $data['gold_rate'], $data['making_charges'],
            $data['stone_charges'], $data['other_charges'], $data['discount']
        );
    }

    if ($data['name'] === '') $errors[] = 'Product name is required.';
    if ($data['net_weight'] <= 0) $errors[] = 'Net weight must be greater than zero.';

    $skuCheck = $pdo->prepare('SELECT COUNT(*) FROM products WHERE sku = ?');
    $skuCheck->execute([$data['sku']]);
    if ($skuCheck->fetchColumn() > 0) {
        $errors[] = 'SKU already exists. Please use a different SKU.';
    }

    $uploadedImages = [];
    if (!empty($_FILES['images']['name'][0])) {
        foreach ($_FILES['images']['name'] as $i => $name) {
            if ($name === '') continue;
            $file = [
                'name' => $_FILES['images']['name'][$i],
                'type' => $_FILES['images']['type'][$i],
                'tmp_name' => $_FILES['images']['tmp_name'][$i],
                'error' => $_FILES['images']['error'][$i],
                'size' => $_FILES['images']['size'][$i],
            ];
            try {
                $uploadedImages[] = handle_image_upload($file, 'products');
            } catch (RuntimeException $e) {
                $errors[] = $name . ': ' . $e->getMessage();
            }
        }
    }
    if (!$uploadedImages && !$errors) {
        // Product without an image still works (placeholder shown), but warn softly.
    }

    if (!$errors) {
        $slug = unique_slug(slugify($data['name']), 'products');
        $stmt = $pdo->prepare(
            'INSERT INTO products (sku, name, slug, category_id, collection_id, description, short_description,
                purity, gross_weight, net_weight, gold_rate, making_charges, stone_charges, other_charges, discount,
                price, price_mode, stock_status, featured, best_seller, new_arrival, status, seo_title, seo_description)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        );
        $stmt->execute([
            $data['sku'], $data['name'], $slug, $data['category_id'], $data['collection_id'],
            $data['description'], $data['short_description'], $data['purity'], $data['gross_weight'],
            $data['net_weight'], $data['gold_rate'], $data['making_charges'], $data['stone_charges'],
            $data['other_charges'], $data['discount'], $data['price'], $data['price_mode'],
            $data['stock_status'], $data['featured'], $data['best_seller'], $data['new_arrival'],
            $data['status'], $data['seo_title'], $data['seo_description'],
        ]);
        $productId = (int) $pdo->lastInsertId();

        foreach ($uploadedImages as $i => $path) {
            $stmt = $pdo->prepare('INSERT INTO product_images (product_id, image_path, is_main, sort_order) VALUES (?,?,?,?)');
            $stmt->execute([$productId, $path, $i === 0 ? 1 : 0, $i]);
        }

        log_activity('Product "' . $data['name'] . '" created.');
        flash('success', 'Product created successfully.');
        redirect(BASE_URL . '/admin/product-edit.php?id=' . $productId);
    }
}

$categories = $pdo->query('SELECT id, name FROM categories ORDER BY name')->fetchAll();
$collections = $pdo->query('SELECT id, name FROM collections ORDER BY name')->fetchAll();
$goldRates = get_current_gold_rates();

$pageTitle = 'Add Product';
$activeAdminNav = 'products';
require __DIR__ . '/../includes/admin_header.php';
require __DIR__ . '/_product_form.php';
require __DIR__ . '/../includes/admin_footer.php';
