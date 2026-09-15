/**
 * Minimal SSRF guard for the CRM webhook feature: the URL is user-supplied
 * and our server makes the outbound request on the caller's behalf, so an
 * unchecked value could be used to probe internal services from inside our
 * network. This rejects non-HTTPS URLs and common private/internal
 * hostname patterns. It does not resolve DNS, so a public hostname that
 * only *resolves* to a private IP (DNS rebinding) would slip through — a
 * production version would resolve the hostname and check the returned IP,
 * not just the string; acceptable for this scope, not a claim of full
 * SSRF hardening.
 */
const BLOCKED_HOSTNAME_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^0\.0\.0\.0$/,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^\[?::1\]?$/,
  /\.local$/i,
  /\.internal$/i,
];

export function isSafeWebhookUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return !BLOCKED_HOSTNAME_PATTERNS.some((pattern) => pattern.test(url.hostname));
}
