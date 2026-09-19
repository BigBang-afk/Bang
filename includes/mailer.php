<?php
/**
 * Zarghoon Jewellers - Minimal SMTP mailer (Phase 10)
 *
 * A small, dependency-free SMTP client (raw sockets, no Composer/PHPMailer)
 * since this project deliberately stays plain PHP + MySQL. It is used
 * only when Admin > Settings > Email has a SMTP Host configured; with no
 * host configured, sendEmail() returns false immediately and logs why -
 * it never pretends to have sent something it didn't, and the caller is
 * always expected to continue normally either way (an email failure must
 * never fail an order, a registration, or a contact form submission).
 *
 * Only ever logs the fact that sending failed and the SMTP server's own
 * response text - never the account password, and never the full email
 * body of a customer's order (see sendEmail() callers for what's
 * actually included in a message).
 *
 * Expects includes/functions.php to already be loaded (it is - see the
 * require_once list at the top of that file) for getSetting()/SITE_NAME.
 */

/**
 * Sends a plain-text email via the SMTP server configured in
 * Admin > Settings > Email. Returns true only on a real, confirmed send;
 * false (with the reason logged via error_log) otherwise - including
 * when SMTP simply isn't configured, which is an expected, normal state
 * for a store that hasn't set up email yet.
 */
function sendEmail(string $toEmail, string $toName, string $subject, string $body): bool
{
    $host = getSetting('smtp_host', '');
    if ($host === '') {
        return false;
    }

    $port = (int) getSetting('smtp_port', '587');
    $username = getSetting('smtp_username', '');
    $password = getSetting('smtp_password', '');
    $encryption = getSetting('smtp_encryption', 'tls');
    $fromEmail = getSetting('smtp_from_email', '') ?: $username;
    $fromName = getSetting('smtp_from_name', '') ?: getSetting('shop_name', SITE_NAME);

    if ($fromEmail === '' || !filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
        error_log('sendEmail: missing From address or invalid To address, not sending.');
        return false;
    }

    $socket = null;

    try {
        $transport = ($encryption === 'ssl' ? 'ssl://' : 'tcp://') . $host;
        $socket = @stream_socket_client($transport . ':' . $port, $errno, $errstr, 15);
        if (!$socket) {
            throw new RuntimeException("Could not connect to SMTP host: $errstr ($errno)");
        }
        stream_set_timeout($socket, 15);

        smtpExpect($socket, [220]);
        smtpCommand($socket, 'EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost'), [250]);

        if ($encryption === 'tls') {
            smtpCommand($socket, 'STARTTLS', [220]);
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new RuntimeException('STARTTLS negotiation failed.');
            }
            // EHLO must be re-sent after STARTTLS per RFC 3207.
            smtpCommand($socket, 'EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost'), [250]);
        }

        if ($username !== '') {
            smtpCommand($socket, 'AUTH LOGIN', [334]);
            smtpCommand($socket, base64_encode($username), [334]);
            smtpCommand($socket, base64_encode($password), [235]);
        }

        smtpCommand($socket, 'MAIL FROM:<' . $fromEmail . '>', [250]);
        smtpCommand($socket, 'RCPT TO:<' . $toEmail . '>', [250, 251]);
        smtpCommand($socket, 'DATA', [354]);

        $headers = [
            'From: ' . smtpEncodeHeader($fromName) . ' <' . $fromEmail . '>',
            'To: ' . smtpEncodeHeader($toName) . ' <' . $toEmail . '>',
            'Subject: ' . smtpEncodeHeader($subject),
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Date: ' . date('r'),
        ];
        // A lone "." on its own line inside the body would otherwise be
        // read by the SMTP server as the end-of-DATA marker - "dot
        // stuffing" it (prefixing with an extra ".") is the standard fix.
        $escapedBody = preg_replace('/^\./m', '..', $body);
        $message = implode("\r\n", $headers) . "\r\n\r\n" . $escapedBody . "\r\n.";
        smtpCommand($socket, $message, [250]);

        smtpCommand($socket, 'QUIT', [221], false);
        fclose($socket);
        return true;
    } catch (Throwable $e) {
        error_log('sendEmail failed: ' . $e->getMessage());
        if (is_resource($socket)) {
            fclose($socket);
        }
        return false;
    }
}

/**
 * Sends $command (or just reads a response if $command is null), then
 * reads the SMTP response and throws if its code isn't in $expectedCodes.
 * $requireResponse = false allows QUIT's response to be skipped/ignored
 * since we're closing the connection immediately after regardless.
 */
function smtpCommand($socket, string $command, array $expectedCodes, bool $requireResponse = true): string
{
    fwrite($socket, $command . "\r\n");
    return $requireResponse ? smtpExpect($socket, $expectedCodes) : '';
}

function smtpExpect($socket, array $expectedCodes): string
{
    $response = '';
    while (($line = fgets($socket, 512)) !== false) {
        $response .= $line;
        // A multi-line SMTP response uses "250-" for every line except
        // the last, which uses "250 " - stop once we hit that last line.
        if (strlen($line) >= 4 && $line[3] === ' ') {
            break;
        }
    }

    $code = (int) substr($response, 0, 3);
    if (!in_array($code, $expectedCodes, true)) {
        throw new RuntimeException('Unexpected SMTP response: ' . trim($response));
    }

    return $response;
}

/**
 * Encodes a header value that may contain non-ASCII characters (e.g. an
 * Urdu customer name) per RFC 2047, so it can never break the raw header
 * block being sent to the SMTP server.
 */
function smtpEncodeHeader(string $value): string
{
    if (preg_match('/^[\x20-\x7E]*$/', $value)) {
        return $value;
    }
    return '=?UTF-8?B?' . base64_encode($value) . '?=';
}
