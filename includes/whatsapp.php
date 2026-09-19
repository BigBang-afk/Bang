<?php
/**
 * Zarghoon Jewellers - WhatsApp Enquiry Helper
 *
 * Builds wa.me links using the WhatsApp number configured in
 * Admin > Settings (setting_key = 'whatsapp_number'). The number must
 * be digits only, including country code (e.g. 923001234567).
 */

require_once __DIR__ . '/functions.php';

/**
 * Builds a wa.me link for an arbitrary pre-filled message.
 */
function buildWhatsAppLink(string $message, ?string $number = null): string
{
    $number = $number ?? getSetting('whatsapp_number', '');
    $number = preg_replace('/[^0-9]/', '', $number ?? '');
    return 'https://wa.me/' . $number . '?text=' . rawurlencode($message);
}

/**
 * Builds a wa.me link pre-filled with a product enquiry, automatically
 * including the product name, SKU, current price, and a link back to
 * the product page.
 */
function buildProductWhatsAppLink(array $product): string
{
    $url = SITE_URL . '/product.php?slug=' . $product['slug'];
    $message = sprintf(
        "Hello %s, I am interested in %s.\nSKU: %s\nPrice: %s\nLink: %s",
        getSetting('shop_name', SITE_NAME),
        $product['name'],
        $product['sku'],
        formatPrice(getProductPrice($product)),
        $url
    );
    return buildWhatsAppLink($message);
}

/**
 * Builds a wa.me link a CUSTOMER can use to contact the shop about their
 * own order (used on order.php / order-success.php) - opens a chat
 * addressed to the shop's configured WhatsApp number. Deliberately
 * includes only the order number, customer name, and total - never a
 * password, internal admin note, or any other unnecessary personal data.
 */
function buildOrderWhatsAppLink(array $order): string
{
    $message = sprintf(
        "%s\nOrder Number: %s\nCustomer: %s\nTotal: %s",
        getSetting('shop_name', SITE_NAME),
        $order['order_number'],
        $order['customer_name'],
        formatPrice((float) $order['total'])
    );
    return buildWhatsAppLink($message);
}

/**
 * Builds a wa.me link an ADMIN can use to confirm an order with the
 * CUSTOMER (used on admin/order-view.php's "Confirm via WhatsApp") -
 * opens a chat addressed to the CUSTOMER's own mobile number, the
 * opposite direction from buildOrderWhatsAppLink() above. Bug fix
 * (Phase 11 QA): this previously reused buildOrderWhatsAppLink(), which
 * opened a chat to the shop's own number instead of the customer's.
 */
function buildAdminOrderWhatsAppLink(array $order): string
{
    $message = sprintf(
        "%s\nOrder Number: %s\nCustomer: %s\nTotal: %s",
        getSetting('shop_name', SITE_NAME),
        $order['order_number'],
        $order['customer_name'],
        formatPrice((float) $order['total'])
    );
    // Orders store the customer's mobile in normalizeMobile()'s local
    // "03XXXXXXXXX" format (see includes/auth.php); wa.me needs full
    // international digits with no leading 0, so "0" is swapped for the
    // country code "92" here rather than changing the stored format.
    $customerNumber = '92' . substr($order['mobile'], 1);
    return buildWhatsAppLink($message, $customerNumber);
}
