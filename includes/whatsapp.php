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
