<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$productId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$productId) {
    flash('error', 'Invalid product ID.');
    redirect(SITE_URL . '/admin/products.php');
}

$product = dbFetchOne('SELECT * FROM products WHERE id = ?', [$productId]);
if (!$product) {
    flash('error', 'Product not found.');
    redirect(SITE_URL . '/admin/products.php');
}

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();
    $action = $_POST['action'] ?? 'update_details';

    // ---- Image management actions ----
    if ($action === 'add_images') {
        if (!empty($_FILES['images']['name'][0])) {
            $existingCount = (int) dbFetchColumn('SELECT COUNT(*) FROM product_images WHERE product_id = ?', [$productId]);
            foreach ($_FILES['images']['name'] as $i => $fileName) {
                if ($fileName === '') {
                    continue;
                }
                $file = [
                    'name' => $_FILES['images']['name'][$i], 'type' => $_FILES['images']['type'][$i],
                    'tmp_name' => $_FILES['images']['tmp_name'][$i], 'error' => $_FILES['images']['error'][$i],
                    'size' => $_FILES['images']['size'][$i],
                ];
                try {
                    $filename = secureImageUpload($file, PRODUCTS_UPLOAD_PATH);
                    $isPrimary = $existingCount === 0 ? 1 : 0;
                    dbExecute(
                        'INSERT INTO product_images (product_id, image, is_primary, sort_order) VALUES (?, ?, ?, ?)',
                        [$productId, $filename, $isPrimary, $existingCount]
                    );
                    $existingCount++;
                } catch (RuntimeException $e) {
                    flash('error', $fileName . ': ' . $e->getMessage());
                }
            }
            flash('success', 'Images uploaded.');
        }
        redirect(SITE_URL . '/admin/product-edit.php?id=' . $productId);
    }

    if ($action === 'set_primary') {
        $imageId = filter_input(INPUT_POST, 'image_id', FILTER_VALIDATE_INT);
        if ($imageId) {
            $image = dbFetchOne('SELECT id FROM product_images WHERE id = ? AND product_id = ?', [$imageId, $productId]);
            if ($image) {
                dbExecute('UPDATE product_images SET is_primary = 0 WHERE product_id = ?', [$productId]);
                dbExecute('UPDATE product_images SET is_primary = 1 WHERE id = ?', [$imageId]);
                flash('success', 'Primary image updated.');
            }
        }
        redirect(SITE_URL . '/admin/product-edit.php?id=' . $productId);
    }

    if ($action === 'move_image') {
        $imageId = filter_input(INPUT_POST, 'image_id', FILTER_VALIDATE_INT);
        $direction = $_POST['direction'] ?? '';
        $current = $imageId ? dbFetchOne('SELECT * FROM product_images WHERE id = ? AND product_id = ?', [$imageId, $productId]) : null;
        if ($current) {
            $cmp = $direction === 'up' ? '<' : '>';
            $order = $direction === 'up' ? 'DESC' : 'ASC';
            $neighbor = dbFetchOne(
                "SELECT id, sort_order FROM product_images WHERE product_id = ? AND sort_order $cmp ? ORDER BY sort_order $order LIMIT 1",
                [$productId, $current['sort_order']]
            );
            if ($neighbor) {
                dbExecute('UPDATE product_images SET sort_order = ? WHERE id = ?', [$neighbor['sort_order'], $current['id']]);
                dbExecute('UPDATE product_images SET sort_order = ? WHERE id = ?', [$current['sort_order'], $neighbor['id']]);
            }
        }
        redirect(SITE_URL . '/admin/product-edit.php?id=' . $productId);
    }

    if ($action === 'delete_image') {
        $imageId = filter_input(INPUT_POST, 'image_id', FILTER_VALIDATE_INT);
        $image = $imageId ? dbFetchOne('SELECT * FROM product_images WHERE id = ? AND product_id = ?', [$imageId, $productId]) : null;
        if ($image) {
            dbExecute('DELETE FROM product_images WHERE id = ?', [$imageId]);
            deleteUploadedImage($image['image'], PRODUCTS_UPLOAD_PATH);

            // Never leave the product with remaining images but no primary
            // one: if the deleted image was primary, promote the next image.
            if ($image['is_primary']) {
                $next = dbFetchOne('SELECT id FROM product_images WHERE product_id = ? ORDER BY sort_order ASC LIMIT 1', [$productId]);
                if ($next) {
                    dbExecute('UPDATE product_images SET is_primary = 1 WHERE id = ?', [$next['id']]);
                }
            }
            flash('success', 'Image removed.');
        }
        redirect(SITE_URL . '/admin/product-edit.php?id=' . $productId);
    }

    // ---- Default: update product details ----
    $name = trim($_POST['name'] ?? '');
    $sku = trim($_POST['sku'] ?? '');
    $categoryId = $_POST['category_id'] !== '' ? filter_var($_POST['category_id'], FILTER_VALIDATE_INT) : null;
    $collectionId = $_POST['collection_id'] !== '' ? filter_var($_POST['collection_id'], FILTER_VALIDATE_INT) : null;
    $shortDescription = trim($_POST['short_description'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $purity = in_array($_POST['purity'] ?? '', ['24K', '22K', '21K', '18K'], true) ? $_POST['purity'] : '21K';
    $grossWeight = filter_var($_POST['gross_weight'] ?? '', FILTER_VALIDATE_FLOAT);
    $netWeight = filter_var($_POST['net_weight'] ?? '', FILTER_VALIDATE_FLOAT);
    $pricingType = ($_POST['pricing_type'] ?? 'auto') === 'manual' ? 'manual' : 'auto';
    $makingCharges = filter_var($_POST['making_charges'] ?? '0', FILTER_VALIDATE_FLOAT);
    $stoneCharges = filter_var($_POST['stone_charges'] ?? '0', FILTER_VALIDATE_FLOAT);
    $otherCharges = filter_var($_POST['other_charges'] ?? '0', FILTER_VALIDATE_FLOAT);
    $discount = filter_var($_POST['discount'] ?? '0', FILTER_VALIDATE_FLOAT);
    $manualPrice = filter_var($_POST['price'] ?? '0', FILTER_VALIDATE_FLOAT);
    $stockStatus = in_array($_POST['stock_status'] ?? '', ['in_stock', 'out_of_stock', 'made_to_order'], true) ? $_POST['stock_status'] : 'in_stock';
    $status = ($_POST['status'] ?? 'active') === 'inactive' ? 'inactive' : 'active';
    $featured = !empty($_POST['featured']) ? 1 : 0;
    $bestSeller = !empty($_POST['best_seller']) ? 1 : 0;
    $newArrival = !empty($_POST['new_arrival']) ? 1 : 0;

    if ($name === '') {
        $errors[] = 'Product name is required.';
    } elseif (mb_strlen($name) > 150) {
        $errors[] = 'Product name must be 150 characters or fewer.';
    }
    if ($sku === '') {
        $errors[] = 'SKU is required.';
    }

    if ($categoryId !== null) {
        if ($categoryId === false || !dbFetchColumn('SELECT COUNT(*) FROM categories WHERE id = ?', [$categoryId])) {
            $errors[] = 'Please select a valid category.';
            $categoryId = null;
        }
    }
    if ($collectionId !== null) {
        if ($collectionId === false || !dbFetchColumn('SELECT COUNT(*) FROM collections WHERE id = ?', [$collectionId])) {
            $errors[] = 'Please select a valid collection.';
            $collectionId = null;
        }
    }

    if ($grossWeight === false || $grossWeight < 0) {
        $errors[] = 'Gross weight must be a number that is zero or greater.';
        $grossWeight = 0;
    }
    if ($netWeight === false || $netWeight < 0) {
        $errors[] = 'Net gold weight must be a number that is zero or greater.';
        $netWeight = 0;
    }
    if ($grossWeight !== false && $netWeight !== false && $netWeight > $grossWeight) {
        $errors[] = 'Net gold weight cannot exceed gross weight.';
    }

    foreach (['making_charges' => $makingCharges, 'stone_charges' => $stoneCharges, 'other_charges' => $otherCharges, 'discount' => $discount] as $label => $value) {
        if ($value === false || $value < 0) {
            $errors[] = str_replace('_', ' ', ucfirst($label)) . ' must be a number that is zero or greater.';
        }
    }
    $makingCharges = max(0, (float) $makingCharges);
    $stoneCharges = max(0, (float) $stoneCharges);
    $otherCharges = max(0, (float) $otherCharges);
    $discount = max(0, (float) $discount);

    if ($pricingType === 'manual' && ($manualPrice === false || $manualPrice < 0)) {
        $errors[] = 'Final price must be a number that is zero or greater.';
        $manualPrice = 0;
    }

    if ($sku !== $product['sku'] && dbFetchColumn('SELECT COUNT(*) FROM products WHERE sku = ? AND id != ?', [$sku, $productId])) {
        $errors[] = "SKU \"$sku\" is already in use by another product.";
    }

    // Recalculate the price entirely server-side, never trusting the browser.
    $goldRateSnapshot = getGoldRate($purity) ?? (float) $product['gold_rate'];
    $priceInputs = [
        'pricing_type' => $pricingType, 'purity' => $purity, 'net_weight' => $netWeight,
        'gold_rate' => $goldRateSnapshot, 'making_charges' => $makingCharges,
        'stone_charges' => $stoneCharges, 'other_charges' => $otherCharges,
        'discount' => $discount, 'price' => $manualPrice,
    ];
    $finalPrice = calculateProductPrice($priceInputs)['final_price'];

    if (!$errors) {
        $slug = ($name !== $product['name']) ? generateSlug($name, 'products', $productId) : $product['slug'];

        dbExecute(
            'UPDATE products SET sku=?, name=?, slug=?, category_id=?, collection_id=?, description=?, short_description=?,
                purity=?, gross_weight=?, net_weight=?, gold_rate=?, making_charges=?, stone_charges=?, other_charges=?,
                discount=?, price=?, pricing_type=?, stock_status=?, featured=?, best_seller=?, new_arrival=?, status=?
             WHERE id=?',
            [
                $sku, $name, $slug, $categoryId, $collectionId, $description ?: null, $shortDescription ?: null,
                $purity, $grossWeight, $netWeight, $goldRateSnapshot, $makingCharges, $stoneCharges, $otherCharges,
                $discount, $finalPrice, $pricingType, $stockStatus, $featured, $bestSeller, $newArrival, $status,
                $productId,
            ]
        );

        flash('success', "Product \"$name\" updated successfully.");
        redirect(SITE_URL . '/admin/product-edit.php?id=' . $productId);
    }

    // Re-merge submitted values so the form redisplays what was typed.
    $product = array_merge($product, [
        'sku' => $sku, 'name' => $name, 'category_id' => $categoryId, 'collection_id' => $collectionId,
        'description' => $description, 'short_description' => $shortDescription, 'purity' => $purity,
        'gross_weight' => $grossWeight, 'net_weight' => $netWeight, 'gold_rate' => $goldRateSnapshot,
        'making_charges' => $makingCharges, 'stone_charges' => $stoneCharges, 'other_charges' => $otherCharges,
        'discount' => $discount, 'price' => $pricingType === 'manual' ? $manualPrice : $finalPrice,
        'pricing_type' => $pricingType, 'stock_status' => $stockStatus, 'featured' => $featured,
        'best_seller' => $bestSeller, 'new_arrival' => $newArrival, 'status' => $status,
    ]);
}

$data = [
    'name' => $product['name'], 'sku' => $product['sku'], 'category_id' => $product['category_id'],
    'collection_id' => $product['collection_id'], 'short_description' => $product['short_description'],
    'description' => $product['description'], 'purity' => $product['purity'], 'gross_weight' => $product['gross_weight'],
    'net_weight' => $product['net_weight'], 'pricing_type' => $product['pricing_type'], 'gold_rate' => $product['gold_rate'],
    'making_charges' => $product['making_charges'], 'stone_charges' => $product['stone_charges'],
    'other_charges' => $product['other_charges'], 'discount' => $product['discount'], 'price' => $product['price'],
    'stock_status' => $product['stock_status'], 'featured' => $product['featured'], 'best_seller' => $product['best_seller'],
    'new_arrival' => $product['new_arrival'], 'status' => $product['status'],
];

$categories = dbFetchAll('SELECT id, name FROM categories ORDER BY name ASC');
$collections = dbFetchAll('SELECT id, name FROM collections ORDER BY name ASC');
$goldRates = getCurrentGoldRates();
$images = dbFetchAll('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC', [$productId]);
$isEdit = true;

$pageTitle = 'Edit Product';
$activeNav = 'products';
require __DIR__ . '/../includes/admin-header.php';
require __DIR__ . '/_product-form.php';
require __DIR__ . '/../includes/admin-footer.php';
