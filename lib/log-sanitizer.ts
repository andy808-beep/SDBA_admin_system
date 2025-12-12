// lib/log-sanitizer.ts
// PII (Personally Identifiable Information) sanitization for logs

/**
 * Sensitive fields that should be redacted from logs
 */
const SENSITIVE_FIELDS = [
  "password",
  "passwd",
  "pwd",
  "secret",
  "token",
  "api_key",
  "apikey",
  "access_token",
  "refresh_token",
  "authorization",
  "auth",
  "credit_card",
  "cc_number",
  "card_number",
  "cvv",
  "cvc",
  "ssn",
  "social_security",
  "ssn_number",
  "phone",
  "mobile",
  "telephone",
  "email",
  "email_address",
] as const;

/**
 * Patterns to detect and redact sensitive data
 */
const SENSITIVE_PATTERNS = [
  /password["\s:=]+([^"}\s,]+)/gi,
  /token["\s:=]+([^"}\s,]+)/gi,
  /secret["\s:=]+([^"}\s,]+)/gi,
  /api[_-]?key["\s:=]+([^"}\s,]+)/gi,
  /authorization["\s:=]+([^"}\s,]+)/gi,
  /bearer\s+([a-zA-Z0-9._-]+)/gi,
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
  /\b\d{3}\.\d{2}\.\d{4}\b/g, // SSN with dots
] as const;

/**
 * Hash an email address for logging (one-way hash)
 * @param email - Email address to hash
 * @returns Hashed email (first 3 chars + hash)
 */
export function hashEmail(email: string): string {
  if (!email || typeof email !== "string") {
    return "[invalid]";
  }

  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return "[invalid]";
  }

  // Show first 3 characters of local part, hash the rest
  const visiblePart = localPart.substring(0, 3);
  const hash = simpleHash(localPart + domain);
  return `${visiblePart}***@${domain}`;
}

/**
 * Simple hash function for email hashing
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36).substring(0, 6);
}

/**
 * Mask phone number (show last 4 digits only)
 */
export function maskPhone(phone: string): string {
  if (!phone || typeof phone !== "string") {
    return "[invalid]";
  }

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) {
    return "***";
  }

  return `***-***-${digits.slice(-4)}`;
}

/**
 * Redact sensitive fields from an object
 * @param obj - Object to sanitize
 * @param depth - Current depth (to prevent infinite recursion)
 * @returns Sanitized object
 */
export function sanitizeObject(obj: any, depth: number = 0): any {
  if (depth > 10) {
    return "[max depth reached]";
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1));
  }

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Check if field is sensitive
    if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))) {
      if (typeof value === "string") {
        // Special handling for emails
        if (lowerKey.includes("email")) {
          sanitized[key] = hashEmail(value);
        } else if (lowerKey.includes("phone") || lowerKey.includes("mobile")) {
          sanitized[key] = maskPhone(value);
        } else {
          sanitized[key] = "[REDACTED]";
        }
      } else {
        sanitized[key] = "[REDACTED]";
      }
    } else if (typeof value === "object" && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitize a string by redacting sensitive patterns
 * @param str - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(str: string): string {
  if (!str || typeof str !== "string") {
    return str;
  }

  let sanitized = str;

  // Replace sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match) => {
      if (match.length > 20) {
        return match.substring(0, 10) + "***[REDACTED]";
      }
      return "[REDACTED]";
    });
  }

  return sanitized;
}

/**
 * Sanitize request/response body for logging
 * @param body - Request or response body
 * @returns Sanitized body
 */
export function sanitizeBody(body: any): any {
  if (!body) {
    return body;
  }

  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body);
      return sanitizeObject(parsed);
    } catch {
      return sanitizeString(body);
    }
  }

  if (typeof body === "object") {
    return sanitizeObject(body);
  }

  return body;
}

/**
 * Sanitize headers for logging
 * @param headers - Headers object
 * @returns Sanitized headers
 */
export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();

    // Redact sensitive headers
    if (
      lowerKey.includes("authorization") ||
      lowerKey.includes("cookie") ||
      lowerKey.includes("x-api-key") ||
      lowerKey.includes("x-csrf-token")
    ) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

