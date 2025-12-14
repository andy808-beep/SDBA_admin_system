// lib/sanitize.ts
// Input sanitization utilities to prevent XSS attacks

// Simple regex-based HTML sanitization (works on both server and client)
function simpleSanitizeHtml(input: string): string {
  if (typeof input !== "string") {
    return "";
  }
  // Remove all HTML tags and decode entities
  let cleaned = input
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&amp;/g, "&");
  return cleaned;
}

/**
 * Sanitize HTML content, removing potentially dangerous elements and attributes
 * @param input - HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(input: string): string {
  // Use simple regex-based sanitization to avoid jsdom build issues
  return simpleSanitizeHtml(input);
}

/**
 * Strip all HTML tags from input, returning plain text
 * @param input - String that may contain HTML
 * @returns Plain text with all HTML removed
 */
export function sanitizeText(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  // First sanitize HTML, then decode HTML entities
  const sanitized = sanitizeHtml(input);
  
  // Decode common HTML entities
  const decoded = sanitized
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#x60;/g, "`")
    .replace(/&#x3D;/g, "=");

  return decoded.trim();
}

/**
 * Sanitize file names to prevent directory traversal and other attacks
 * @param input - File name to sanitize
 * @returns Sanitized file name
 */
export function sanitizeFileName(input: string): string {
  if (typeof input !== "string") {
    return "file";
  }

  // Remove path separators and dangerous characters
  let sanitized = input
    .replace(/[\/\\]/g, "") // Remove path separators
    .replace(/\.\./g, "") // Remove parent directory references
    .replace(/[<>:"|?*]/g, "") // Remove Windows reserved characters
    .replace(/[\x00-\x1f\x7f]/g, "") // Remove control characters
    .trim();

  // Limit length
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255);
  }

  // Ensure it's not empty or just dots
  if (!sanitized || sanitized === "." || sanitized === "..") {
    return "file";
  }

  return sanitized;
}

/**
 * Strict email validation
 * @param input - Email address to validate
 * @returns true if email is valid, false otherwise
 */
export function validateEmail(input: string): boolean {
  if (typeof input !== "string") {
    return false;
  }

  // RFC 5322 compliant email regex (simplified but strict)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  // Additional checks
  if (input.length > 254) {
    return false; // RFC 5321 limit
  }

  const parts = input.split("@");
  if (parts.length !== 2) {
    return false;
  }

  const [localPart, domain] = parts;
  
  // Local part checks
  if (localPart.length === 0 || localPart.length > 64) {
    return false; // RFC 5321 limit
  }

  // Domain checks
  if (domain.length === 0 || domain.length > 253) {
    return false;
  }

  // Check for dangerous patterns
  if (
    input.includes("<") ||
    input.includes(">") ||
    input.includes("javascript:") ||
    input.includes("data:") ||
    input.includes("vbscript:")
  ) {
    return false;
  }

  return emailRegex.test(input);
}

/**
 * Escape special regex characters to prevent regex injection
 * @param input - String that may contain regex special characters
 * @returns Escaped string safe for use in regex
 */
export function escapeRegex(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  // Escape all regex special characters
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Sanitize URL to prevent javascript: and data: protocol attacks
 * @param input - URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  const trimmed = input.trim();

  // Block dangerous protocols
  const dangerousProtocols = [
    "javascript:",
    "data:",
    "vbscript:",
    "file:",
    "about:",
  ];

  const lowerInput = trimmed.toLowerCase();
  for (const protocol of dangerousProtocols) {
    if (lowerInput.startsWith(protocol)) {
      return "";
    }
  }

  // Only allow http, https, mailto, tel
  const allowedProtocols = ["http:", "https:", "mailto:", "tel:"];
  const hasAllowedProtocol = allowedProtocols.some((protocol) =>
    lowerInput.startsWith(protocol)
  );

  if (!hasAllowedProtocol && trimmed.includes("://")) {
    return "";
  }

  return trimmed;
}

/**
 * Sanitize notes/comments field - allows some basic formatting but removes scripts
 * @param input - Notes text that may contain HTML
 * @returns Sanitized notes with safe HTML
 */
export function sanitizeNotes(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  // Strip all HTML tags for notes (security first)
  return simpleSanitizeHtml(input).trim();
}

