<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$pdo = db();
$errors = [];

$defaults = [
    'name' => '', 'sku' => '', 'category_id' => '', 'collection_id' => '',
    'short_description' => '', 'description' => '', 'purity' => '21K',
    'gross_weight' => '', 'net_weight' => '', 'pricing_type' => 'auto',
    'gold_rate' => '', 'making_charges' => '0', 'stone_charges' => '0',
    'other_charges' => '0', 'discount' => '0', 'price' => '0',
    'stock_status' => 'in_stock', 'featured' => 0, 'best_seller' => 0,
    'new_arrival' => 0, 'status' => 'active',
];
$data = array_merge($defaults, array_intersect_key($_POST, $defaults));
if ($data['gold_rate'] === '') {
    $data['gold_rate'] = getGoldRate($data['purity']) ?? '';
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();

    $name = trim($_POST['name'] ?? '');
    $sku = trim($_POST['sku'] ?? '');
    $categoryId = ($_POST['category_id'] ?? '') !== '' ? filter_var($_POST['category_id'], FILTER_VALIDATE_INT) : null;
    $collectionId = ($_POST['collection_id'] ?? '') !== '' ? filter_var($_POST['collection_id'], FILTER_VALIDATE_INT) : null;
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

    // ---- Server-side validation (Part G) - never trust the browser ----
    if ($name === '') {
        $errors[] = 'Product name is required.';
    } elseif (mb_strlen($name) > 150) {
        $errors[] = 'Product name must be 150 characters or fewer.';
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

    // SKU: auto-generate if left empty; otherwise must be unique.
    if ($sku === '') {
        $sku = generateProductSku($categoryId);
    } elseif (dbFetchColumn('SELECT COUNT(*) FROM products WHERE sku = ?', [$sku])) {
        $errors[] = "SKU \"$sku\" is already in use. Please choose a different one or leave it empty to auto-generate.";
    }

    // Recalculate the price entirely server-side - the browser's live
    // preview is a convenience only and is never trusted for the save.
    $goldRateSnapshot = getGoldRate($purity) ?? 0.0;
    $priceInputs = [
        'pricing_type' => $pricingType, 'purity' => $purity, 'net_weight' => $netWeight,
        'gold_rate' => $goldRateSnapshot, 'making_charges' => $makingCharges,
        'stone_charges' => $stoneCharges, 'other_charges' => $otherCharges,
        'discount' => $discount, 'price' => $manualPrice,
    ];
    $priceBreakdown = calculateProductPrice($priceInputs);
    $finalPrice = $priceBreakdown['final_price'];

    // Multi-image upload (first successfully uploaded image becomes primary).
    $uploadedImages = [];
    if (!$errors && !empty($_FILES['images']['name'][0])) {
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
                $uploadedImages[] = secureImageUpload($file, PRODUCTS_UPLOAD_PATH);
            } catch (RuntimeException $e) {
                $errors[] = $fileName . ': ' . $e->getMessage();
            }
        }
    }

    if (!$errors) {
        $slug = generateSlug($name, 'products');

        try {
            $productId = dbTransaction(function () use (
                $name, $sku, $slug, $categoryId, $collectionId, $description, $shortDescription,
                $purity, $grossWeight, $netWeight, $goldRateSnapshot, $makingCharges, $stoneCharges,
                $otherCharges, $discount, $finalPrice, $pricingType, $stockStatus, $featured,
                $bestSeller, $newArrival, $status, $uploadedImages
            ) {
                dbExecute(
                    'INSERT INTO products (sku, name, slug, category_id, collection_id, description, short_description,
                        purity, gross_weight, net_weight, gold_rate, making_charges, stone_charges, other_charges,
                        discount, price, pricing_type, stock_status, featured, best_seller, new_arrival, status)
                     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                    [
                        $sku, $name, $slug, $categoryId, $collectionId, $description ?: null, $shortDescription ?: null,
                        $purity, $grossWeight, $netWeight, $goldRateSnapshot, $makingCharges, $stoneCharges,
                        $otherCharges, $discount, $finalPrice, $pricingType, $stockStatus, $featured,
                        $bestSeller, $newArrival, $status,
                    ]
                );
                $newId = (int) dbInsertId();

                foreach ($uploadedImages as $i => $filename) {
                    dbExecute(
                        'INSERT INTO product_images (product_id, image, is_primary, sort_order) VALUES (?, ?, ?, ?)',
                        [$newId, $filename, $i === 0 ? 1 : 0, $i]
                    );
                }

                return $newId;
            });

            logAdminActivity('create', 'product', $productId, "Created product \"$name\" (SKU: $sku).");
            flash('success', "Product \"$name\" created successfully.");
            redirect(SITE_URL . '/admin/product-edit.php?id=' . $productId);
        } catch (Throwable $e) {
            error_log('Product creation failed: ' . $e->getMessage());
            $errors[] = 'Something went wrong while saving the product. Please try again.';
            foreach ($uploadedImages as $filename) {
                deleteUploadedImage($filename, PRODUCTS_UPLOAD_PATH);
            }
        }
    }

    // Re-populate the form with what was submitted so nothing is lost.
    $data = [
        'name' => $name, 'sku' => $sku, 'category_id' => $categoryId, 'collection_id' => $collectionId,
        'short_description' => $shortDescription, 'description' => $description, 'purity' => $purity,
        'gross_weight' => $grossWeight, 'net_weight' => $netWeight, 'pricing_type' => $pricingType,
        'gold_rate' => $goldRateSnapshot, 'making_charges' => $makingCharges, 'stone_charges' => $stoneCharges,
        'other_charges' => $otherCharges, 'discount' => $discount, 'price' => $pricingType === 'manual' ? $manualPrice : $finalPrice,
        'stock_status' => $stockStatus, 'featured' => $featured, 'best_seller' => $bestSeller,
        'new_arrival' => $newArrival, 'status' => $status,
    ];
}

$categories = dbFetchAll('SELECT id, name FROM categories ORDER BY name ASC');
$collections = dbFetchAll('SELECT id, name FROM collections ORDER BY name ASC');
$goldRates = getCurrentGoldRates();
$isEdit = false;

$pageTitle = 'Add Product';
$activeNav = 'products';
require __DIR__ . '/../includes/admin-header.php';
require __DIR__ . '/_product-form.php';
require __DIR__ . '/../includes/admin-footer.php';
