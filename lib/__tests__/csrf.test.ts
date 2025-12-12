// lib/__tests__/csrf.test.ts
// Comprehensive tests for CSRF protection

import {
  generateCsrfToken,
  verifyCsrfToken,
  getCsrfTokenFromCookie,
  getCsrfTokenFromHeader,
  verifyCsrfRequest,
  requiresCsrfProtection,
  checkCsrfProtection,
} from "../csrf";
import { NextRequest } from "next/server";

// Mock environment variable
const originalEnv = process.env.CSRF_SECRET;

beforeEach(() => {
  process.env.CSRF_SECRET = "test-secret-key-for-csrf-protection";
});

afterEach(() => {
  process.env.CSRF_SECRET = originalEnv;
});

describe("generateCsrfToken", () => {
  it("should generate a valid CSRF token", () => {
    const token = generateCsrfToken();
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
    expect(token).toMatch(/^[a-f0-9]+\.[a-f0-9]+$/); // hex.hex format
  });

  it("should generate unique tokens", () => {
    const token1 = generateCsrfToken();
    const token2 = generateCsrfToken();
    expect(token1).not.toBe(token2);
  });
});

describe("verifyCsrfToken", () => {
  it("should verify a valid token", () => {
    const token = generateCsrfToken();
    expect(verifyCsrfToken(token)).toBe(true);
  });

  it("should reject an invalid token", () => {
    const invalidToken = "invalid.token.here";
    expect(verifyCsrfToken(invalidToken)).toBe(false);
  });

  it("should reject a token with wrong signature", () => {
    const token = generateCsrfToken();
    const [tokenPart] = token.split(".");
    const fakeSignature = "a".repeat(64);
    const fakeToken = `${tokenPart}.${fakeSignature}`;
    expect(verifyCsrfToken(fakeToken)).toBe(false);
  });

  it("should reject empty string", () => {
    expect(verifyCsrfToken("")).toBe(false);
  });

  it("should reject null/undefined", () => {
    expect(verifyCsrfToken(null as any)).toBe(false);
    expect(verifyCsrfToken(undefined as any)).toBe(false);
  });

  it("should reject token without signature", () => {
    expect(verifyCsrfToken("tokenwithoutsignature")).toBe(false);
  });

  it("should reject token with multiple dots", () => {
    expect(verifyCsrfToken("token.with.multiple.dots")).toBe(false);
  });
});

describe("getCsrfTokenFromCookie", () => {
  it("should extract token from cookie", () => {
    const token = generateCsrfToken();
    const req = new NextRequest("http://localhost:3000/api/admin/approve", {
      headers: {
        cookie: `__Host-csrf-token=${token}`,
      },
    });

    expect(getCsrfTokenFromCookie(req)).toBe(token);
  });

  it("should return null if cookie is missing", () => {
    const req = new NextRequest("http://localhost:3000/api/admin/approve");
    expect(getCsrfTokenFromCookie(req)).toBeNull();
  });

  it("should return null if cookie has different name", () => {
    const req = new NextRequest("http://localhost:3000/api/admin/approve", {
      headers: {
        cookie: "other-cookie=value",
      },
    });
    expect(getCsrfTokenFromCookie(req)).toBeNull();
  });
});

describe("getCsrfTokenFromHeader", () => {
  it("should extract token from header", () => {
    const token = generateCsrfToken();
    const req = new NextRequest("http://localhost:3000/api/admin/approve", {
      headers: {
        "X-CSRF-Token": token,
      },
    });

    expect(getCsrfTokenFromHeader(req)).toBe(token);
  });

  it("should return null if header is missing", () => {
    const req = new NextRequest("http://localhost:3000/api/admin/approve");
    expect(getCsrfTokenFromHeader(req)).toBeNull();
  });

  it("should be case-insensitive for header name", () => {
    const token = generateCsrfToken();
    const req = new NextRequest("http://localhost:3000/api/admin/approve", {
      headers: {
        "x-csrf-token": token,
      },
    });

    expect(getCsrfTokenFromHeader(req)).toBe(token);
  });
});

describe("verifyCsrfRequest", () => {
  it("should verify request with matching cookie and header tokens", () => {
    const token = generateCsrfToken();
    const req = new NextRequest("http://localhost:3000/api/admin/approve", {
      method: "POST",
      headers: {
        cookie: `__Host-csrf-token=${token}`,
        "X-CSRF-Token": token,
      },
    });

    expect(verifyCsrfRequest(req)).toBe(true);
  });

  it("should reject request with missing cookie token", () => {
    const token = generateCsrfToken();
    const req = new NextRequest("http://localhost:3000/api/admin/approve", {
      method: "POST",
      headers: {
        "X-CSRF-Token": token,
      },
    });

    expect(verifyCsrfRequest(req)).toBe(false);
  });

  it("should reject request with missing header token", () => {
    const token = generateCsrfToken();
    const req = new NextRequest("http://localhost:3000/api/admin/approve", {
      method: "POST",
      headers: {
        cookie: `__Host-csrf-token=${token}`,
      },
    });

    expect(verifyCsrfRequest(req)).toBe(false);
  });

  it("should reject request with mismatched tokens", () => {
    const token1 = generateCsrfToken();
    const token2 = generateCsrfToken();
    const req = new NextRequest("http://localhost:3000/api/admin/approve", {
      method: "POST",
      headers: {
        cookie: `__Host-csrf-token=${token1}`,
        "X-CSRF-Token": token2,
      },
    });

    expect(verifyCsrfRequest(req)).toBe(false);
  });

  it("should reject request with invalid token", () => {
    const req = new NextRequest("http://localhost:3000/api/admin/approve", {
      method: "POST",
      headers: {
        cookie: "__Host-csrf-token=invalid.token",
        "X-CSRF-Token": "invalid.token",
      },
    });

    expect(verifyCsrfRequest(req)).toBe(false);
  });
});

describe("requiresCsrfProtection", () => {
  it("should require protection for POST", () => {
    expect(requiresCsrfProtection("POST")).toBe(true);
  });

  it("should require protection for PUT", () => {
    expect(requiresCsrfProtection("PUT")).toBe(true);
  });

  it("should require protection for DELETE", () => {
    expect(requiresCsrfProtection("DELETE")).toBe(true);
  });

  it("should require protection for PATCH", () => {
    expect(requiresCsrfProtection("PATCH")).toBe(true);
  });

  it("should not require protection for GET", () => {
    expect(requiresCsrfProtection("GET")).toBe(false);
  });

  it("should not require protection for HEAD", () => {
    expect(requiresCsrfProtection("HEAD")).toBe(false);
  });

  it("should not require protection for OPTIONS", () => {
    expect(requiresCsrfProtection("OPTIONS")).toBe(false);
  });

  it("should be case-insensitive", () => {
    expect(requiresCsrfProtection("post")).toBe(true);
    expect(requiresCsrfProtection("get")).toBe(false);
  });
});

describe("checkCsrfProtection", () => {
  it("should return null for GET requests", () => {
    const req = new NextRequest("http://localhost:3000/api/admin/list", {
      method: "GET",
    });

    expect(checkCsrfProtection(req)).toBeNull();
  });

  it("should return null for HEAD requests", () => {
    const req = new NextRequest("http://localhost:3000/api/admin/list", {
      method: "HEAD",
    });

    expect(checkCsrfProtection(req)).toBeNull();
  });

  it("should return null for OPTIONS requests", () => {
    const req = new NextRequest("http://localhost:3000/api/admin/approve", {
      method: "OPTIONS",
    });

    expect(checkCsrfProtection(req)).toBeNull();
  });

  it("should return 403 for POST without CSRF token", () => {
    const req = new NextRequest("http://localhost:3000/api/admin/approve", {
      method: "POST",
    });

    const response = checkCsrfProtection(req);
    expect(response).not.toBeNull();
    expect(response?.status).toBe(403);
  });

  it("should return 403 for POST with invalid CSRF token", () => {
    const req = new NextRequest("http://localhost:3000/api/admin/approve", {
      method: "POST",
      headers: {
        cookie: "__Host-csrf-token=invalid",
        "X-CSRF-Token": "invalid",
      },
    });

    const response = checkCsrfProtection(req);
    expect(response).not.toBeNull();
    expect(response?.status).toBe(403);
  });

  it("should return 403 for POST with mismatched tokens", () => {
    const token1 = generateCsrfToken();
    const token2 = generateCsrfToken();
    const req = new NextRequest("http://localhost:3000/api/admin/approve", {
      method: "POST",
      headers: {
        cookie: `__Host-csrf-token=${token1}`,
        "X-CSRF-Token": token2,
      },
    });

    const response = checkCsrfProtection(req);
    expect(response).not.toBeNull();
    expect(response?.status).toBe(403);
  });

  it("should return null for POST with valid CSRF token", () => {
    const token = generateCsrfToken();
    const req = new NextRequest("http://localhost:3000/api/admin/approve", {
      method: "POST",
      headers: {
        cookie: `__Host-csrf-token=${token}`,
        "X-CSRF-Token": token,
      },
    });

    expect(checkCsrfProtection(req)).toBeNull();
  });

  it("should return 403 response with correct error format", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/approve", {
      method: "POST",
    });

    const response = checkCsrfProtection(req);
    expect(response).not.toBeNull();
    
    const body = await response!.json();
    expect(body).toMatchObject({
      ok: false,
      error: "CSRF token validation failed",
      code: "CSRF_ERROR",
    });
  });
});

