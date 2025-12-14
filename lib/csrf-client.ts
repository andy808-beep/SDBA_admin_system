// lib/csrf-client.ts
// Client-side CSRF token utilities

const CSRF_HEADER_NAME = "X-CSRF-Token";

// Store CSRF token in memory (fetched from API)
let csrfTokenCache: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

/**
 * Fetch CSRF token from API endpoint
 * The token is also set in an httpOnly cookie by the server
 * @returns CSRF token
 */
async function fetchCsrfToken(): Promise<string> {
  try {
    const response = await fetch("/api/csrf-token", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch CSRF token");
    }

    const data = await response.json();
    if (data.ok && data.token) {
      csrfTokenCache = data.token;
      return data.token;
    }

    throw new Error("Invalid CSRF token response");
  } catch (error) {
    console.error("Error fetching CSRF token:", error);
    throw error;
  }
}

/**
 * Get CSRF token (cached or fetched)
 * @returns CSRF token
 */
export async function getCsrfToken(): Promise<string> {
  // Return cached token if available
  if (csrfTokenCache) {
    return csrfTokenCache;
  }

  // If a fetch is already in progress, wait for it
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  // Fetch new token
  csrfTokenPromise = fetchCsrfToken();
  const token = await csrfTokenPromise;
  csrfTokenPromise = null;
  return token;
}

/**
 * Get headers object with CSRF token included
 * @param additionalHeaders - Additional headers to include
 * @returns Headers object with CSRF token
 */
export async function getHeadersWithCsrf(additionalHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getCsrfToken();
  return {
    "Content-Type": "application/json",
    [CSRF_HEADER_NAME]: token,
    ...additionalHeaders,
  };
}

/**
 * Clear CSRF token cache (useful for testing or logout)
 */
export function clearCsrfTokenCache(): void {
  csrfTokenCache = null;
  csrfTokenPromise = null;
}

