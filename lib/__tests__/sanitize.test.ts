// lib/__tests__/sanitize.test.ts
// Comprehensive tests for input sanitization utilities

// Mock isomorphic-dompurify to avoid ESM issues in Jest
jest.mock("isomorphic-dompurify", () => {
  // Mock implementation that simulates DOMPurify behavior
  return {
    __esModule: true,
    default: {
      sanitize: (dirty: string, config?: any) => {
        if (typeof dirty !== "string") return "";
        
        let cleaned = dirty;
        
        // Remove script tags and their content
        cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
        
        // Remove event handlers (onerror, onload, onclick, etc.)
        cleaned = cleaned.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");
        cleaned = cleaned.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, "");
        
        // Remove javascript: and other dangerous protocols from attributes
        cleaned = cleaned.replace(/javascript:/gi, "");
        cleaned = cleaned.replace(/data:text\/html/gi, "");
        cleaned = cleaned.replace(/vbscript:/gi, "");
        
        // If ALLOWED_TAGS is empty array, strip all tags
        if (config?.ALLOWED_TAGS && config.ALLOWED_TAGS.length === 0) {
          cleaned = cleaned.replace(/<[^>]*>/g, "");
        } else if (config?.ALLOWED_TAGS && config.ALLOWED_TAGS.length > 0) {
          // If ALLOWED_TAGS is specified, only allow those tags
          const allowedTags = config.ALLOWED_TAGS.join("|");
          const regex = new RegExp(`<(?!\/?(?:${allowedTags})(?:\s|>))[^>]+>`, "gi");
          cleaned = cleaned.replace(regex, "");
          // Remove all attributes from allowed tags
          cleaned = cleaned.replace(/<(\w+)([^>]*)>/g, "<$1>");
        } else {
          // Default: strip all tags
          cleaned = cleaned.replace(/<[^>]*>/g, "");
        }
        
        return cleaned;
      },
    },
  };
});

import {
  sanitizeHtml,
  sanitizeText,
  sanitizeFileName,
  validateEmail,
  escapeRegex,
  sanitizeUrl,
  sanitizeNotes,
} from "../sanitize";

describe("sanitizeHtml", () => {
  it("should remove all HTML tags", () => {
    expect(sanitizeHtml("<p>Hello</p>")).toBe("Hello");
    expect(sanitizeHtml("<div>Test</div>")).toBe("Test");
  });

  it("should remove script tags and content", () => {
    expect(sanitizeHtml("<script>alert('XSS')</script>")).toBe("");
    expect(sanitizeHtml("<script src='evil.js'></script>")).toBe("");
    expect(sanitizeHtml("Hello<script>alert('XSS')</script>World")).toBe("HelloWorld");
  });

  it("should remove event handlers", () => {
    expect(sanitizeHtml("<img onerror='alert(1)' src='x'>")).toBe("");
    expect(sanitizeHtml("<div onclick='alert(1)'>Click</div>")).toBe("Click");
    expect(sanitizeHtml("<a onmouseover='alert(1)'>Link</a>")).toBe("Link");
  });

  it("should remove javascript: protocol", () => {
    expect(sanitizeHtml("<a href='javascript:alert(1)'>Link</a>")).toBe("Link");
    expect(sanitizeHtml("javascript:alert('XSS')")).toBe("alert('XSS')");
  });

  it("should remove data: protocol", () => {
    expect(sanitizeHtml("<img src='data:text/html,<script>alert(1)</script>'>")).toBe("");
  });

  it("should handle nested tags", () => {
    expect(sanitizeHtml("<div><p><span>Nested</span></p></div>")).toBe("Nested");
  });

  it("should handle empty strings", () => {
    expect(sanitizeHtml("")).toBe("");
  });

  it("should handle non-string input", () => {
    expect(sanitizeHtml(null as any)).toBe("");
    expect(sanitizeHtml(undefined as any)).toBe("");
    expect(sanitizeHtml(123 as any)).toBe("");
  });

  it("should remove iframe tags", () => {
    expect(sanitizeHtml("<iframe src='evil.com'></iframe>")).toBe("");
  });

  it("should remove object and embed tags", () => {
    expect(sanitizeHtml("<object data='evil.swf'></object>")).toBe("");
    expect(sanitizeHtml("<embed src='evil.swf'>")).toBe("");
  });
});

describe("sanitizeText", () => {
  it("should strip all HTML tags", () => {
    expect(sanitizeText("<p>Hello</p>")).toBe("Hello");
    expect(sanitizeText("<div>Test</div>")).toBe("Test");
  });

  it("should decode HTML entities", () => {
    expect(sanitizeText("&amp;")).toBe("&");
    expect(sanitizeText("&lt;")).toBe("<");
    expect(sanitizeText("&gt;")).toBe(">");
    expect(sanitizeText("&quot;")).toBe('"');
    expect(sanitizeText("&#x27;")).toBe("'");
  });

  it("should remove script tags", () => {
    expect(sanitizeText("<script>alert('XSS')</script>")).toBe("");
    expect(sanitizeText("Hello<script>alert(1)</script>World")).toBe("HelloWorld");
  });

  it("should handle XSS payloads", () => {
    expect(sanitizeText("<img src=x onerror=alert(1)>")).toBe("");
    expect(sanitizeText("<svg onload=alert(1)>")).toBe("");
    expect(sanitizeText("<body onload=alert(1)>")).toBe("");
  });

  it("should trim whitespace", () => {
    expect(sanitizeText("  Hello  ")).toBe("Hello");
    expect(sanitizeText("\n\tTest\n\t")).toBe("Test");
  });

  it("should handle empty strings", () => {
    expect(sanitizeText("")).toBe("");
  });

  it("should handle non-string input", () => {
    expect(sanitizeText(null as any)).toBe("");
    expect(sanitizeText(undefined as any)).toBe("");
  });
});

describe("sanitizeFileName", () => {
  it("should remove path separators", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("etcpasswd");
    expect(sanitizeFileName("folder/file.txt")).toBe("folderfile.txt");
    expect(sanitizeFileName("C:\\Windows\\file.txt")).toBe("CWindowsfile.txt");
  });

  it("should remove parent directory references", () => {
    expect(sanitizeFileName("../../../etc/passwd")).toBe("etcpasswd");
    expect(sanitizeFileName("..\\..\\file.txt")).toBe("file.txt");
  });

  it("should remove Windows reserved characters", () => {
    expect(sanitizeFileName("file<name>.txt")).toBe("filename.txt");
    expect(sanitizeFileName("file:name.txt")).toBe("filename.txt");
    expect(sanitizeFileName('file"name.txt')).toBe("filename.txt");
    expect(sanitizeFileName("file|name.txt")).toBe("filename.txt");
    expect(sanitizeFileName("file?name.txt")).toBe("filename.txt");
    expect(sanitizeFileName("file*name.txt")).toBe("filename.txt");
  });

  it("should remove control characters", () => {
    expect(sanitizeFileName("file\x00name.txt")).toBe("filename.txt");
    expect(sanitizeFileName("file\nname.txt")).toBe("filename.txt");
  });

  it("should limit length to 255 characters", () => {
    const longName = "a".repeat(300);
    expect(sanitizeFileName(longName).length).toBe(255);
  });

  it("should handle empty or dangerous names", () => {
    expect(sanitizeFileName("")).toBe("file");
    expect(sanitizeFileName(".")).toBe("file");
    expect(sanitizeFileName("..")).toBe("file");
  });

  it("should preserve valid file names", () => {
    expect(sanitizeFileName("document.pdf")).toBe("document.pdf");
    expect(sanitizeFileName("my-file_123.txt")).toBe("my-file_123.txt");
  });

  it("should handle non-string input", () => {
    expect(sanitizeFileName(null as any)).toBe("file");
    expect(sanitizeFileName(undefined as any)).toBe("file");
  });
});

describe("validateEmail", () => {
  it("should validate correct email addresses", () => {
    expect(validateEmail("user@example.com")).toBe(true);
    expect(validateEmail("test.email+tag@example.co.uk")).toBe(true);
    expect(validateEmail("user123@test-domain.com")).toBe(true);
  });

  it("should reject invalid email formats", () => {
    expect(validateEmail("notanemail")).toBe(false);
    expect(validateEmail("@example.com")).toBe(false);
    expect(validateEmail("user@")).toBe(false);
    expect(validateEmail("user @example.com")).toBe(false);
  });

  it("should reject emails with dangerous patterns", () => {
    expect(validateEmail("<script>alert(1)</script>@example.com")).toBe(false);
    expect(validateEmail("user@example.com<script>")).toBe(false);
    expect(validateEmail("javascript:alert(1)@example.com")).toBe(false);
    expect(validateEmail("data:text/html@example.com")).toBe(false);
    expect(validateEmail("vbscript:alert(1)@example.com")).toBe(false);
  });

  it("should reject emails that are too long", () => {
    const longEmail = "a".repeat(250) + "@example.com";
    expect(validateEmail(longEmail)).toBe(false);
  });

  it("should reject emails with invalid local part length", () => {
    const longLocal = "a".repeat(65) + "@example.com";
    expect(validateEmail(longLocal)).toBe(false);
  });

  it("should reject emails with invalid domain length", () => {
    const longDomain = "user@" + "a".repeat(254) + ".com";
    expect(validateEmail(longDomain)).toBe(false);
  });

  it("should handle empty strings", () => {
    expect(validateEmail("")).toBe(false);
  });

  it("should handle non-string input", () => {
    expect(validateEmail(null as any)).toBe(false);
    expect(validateEmail(undefined as any)).toBe(false);
  });
});

describe("escapeRegex", () => {
  it("should escape regex special characters", () => {
    expect(escapeRegex(".*+?^${}()[]\\")).toBe("\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\[\\]\\\\");
  });

  it("should not escape regular characters", () => {
    expect(escapeRegex("hello world")).toBe("hello world");
    expect(escapeRegex("123abc")).toBe("123abc");
  });

  it("should handle empty strings", () => {
    expect(escapeRegex("")).toBe("");
  });

  it("should handle strings with mixed content", () => {
    expect(escapeRegex("test.*regex")).toBe("test\\.\\*regex");
  });

  it("should handle non-string input", () => {
    expect(escapeRegex(null as any)).toBe("");
    expect(escapeRegex(undefined as any)).toBe("");
  });
});

describe("sanitizeUrl", () => {
  it("should allow http URLs", () => {
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com");
    expect(sanitizeUrl("http://example.com/path")).toBe("http://example.com/path");
  });

  it("should allow https URLs", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com");
  });

  it("should allow mailto URLs", () => {
    expect(sanitizeUrl("mailto:user@example.com")).toBe("mailto:user@example.com");
  });

  it("should allow tel URLs", () => {
    expect(sanitizeUrl("tel:+1234567890")).toBe("tel:+1234567890");
  });

  it("should block javascript: protocol", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBe("");
    expect(sanitizeUrl("JAVASCRIPT:alert(1)")).toBe("");
  });

  it("should block data: protocol", () => {
    expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBe("");
  });

  it("should block vbscript: protocol", () => {
    expect(sanitizeUrl("vbscript:msgbox(1)")).toBe("");
  });

  it("should block file: protocol", () => {
    expect(sanitizeUrl("file:///etc/passwd")).toBe("");
  });

  it("should block about: protocol", () => {
    expect(sanitizeUrl("about:blank")).toBe("");
  });

  it("should handle relative URLs without protocol", () => {
    expect(sanitizeUrl("/path/to/page")).toBe("/path/to/page");
    expect(sanitizeUrl("relative/path")).toBe("relative/path");
  });

  it("should handle empty strings", () => {
    expect(sanitizeUrl("")).toBe("");
  });

  it("should handle non-string input", () => {
    expect(sanitizeUrl(null as any)).toBe("");
    expect(sanitizeUrl(undefined as any)).toBe("");
  });
});

describe("sanitizeNotes", () => {
  it("should allow basic formatting tags", () => {
    expect(sanitizeNotes("<p>Hello</p>")).toContain("Hello");
    expect(sanitizeNotes("<strong>Bold</strong>")).toContain("Bold");
    expect(sanitizeNotes("<em>Italic</em>")).toContain("Italic");
    expect(sanitizeNotes("<ul><li>Item</li></ul>")).toContain("Item");
  });

  it("should remove script tags", () => {
    const result = sanitizeNotes("<p>Hello</p><script>alert(1)</script>");
    expect(result).not.toContain("<script>");
    // Note: alert(1) text content may remain, but script execution is prevented
    // The important thing is that <script> tags are removed
  });

  it("should remove event handlers", () => {
    const result = sanitizeNotes("<p onclick='alert(1)'>Click</p>");
    expect(result).not.toContain("onclick");
  });

  it("should remove dangerous attributes", () => {
    const result = sanitizeNotes("<p style='color:red'>Text</p>");
    expect(result).not.toContain("style");
  });

  it("should preserve text content", () => {
    expect(sanitizeNotes("Plain text")).toBe("Plain text");
    expect(sanitizeNotes("<p>Text with <strong>formatting</strong></p>")).toContain("Text with");
    expect(sanitizeNotes("<p>Text with <strong>formatting</strong></p>")).toContain("formatting");
  });

  it("should trim whitespace", () => {
    expect(sanitizeNotes("  Hello  ")).toBe("Hello");
  });

  it("should handle empty strings", () => {
    expect(sanitizeNotes("")).toBe("");
  });

  it("should handle non-string input", () => {
    expect(sanitizeNotes(null as any)).toBe("");
    expect(sanitizeNotes(undefined as any)).toBe("");
  });
});

describe("XSS Attack Prevention", () => {
  const xssPayloads = [
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert(1)>",
    "<svg onload=alert(1)>",
    "<body onload=alert(1)>",
    "javascript:alert(1)",
    "<iframe src='javascript:alert(1)'></iframe>",
    "<object data='javascript:alert(1)'></object>",
    "<embed src='javascript:alert(1)'>",
    "<link rel=stylesheet href='javascript:alert(1)'>",
    "<style>@import'javascript:alert(1)';</style>",
    "<meta http-equiv='refresh' content='0;url=javascript:alert(1)'>",
    "<form action='javascript:alert(1)'><input type=submit></form>",
    "<input onfocus=alert(1) autofocus>",
    "<select onfocus=alert(1) autofocus>",
    "<textarea onfocus=alert(1) autofocus>",
    "<keygen onfocus=alert(1) autofocus>",
    "<video><source onerror='alert(1)'>",
    "<audio src=x onerror=alert(1)>",
    "<details open ontoggle=alert(1)>",
    "<marquee onstart=alert(1)>",
    "<div onmouseover='alert(1)'>",
    "<a href='javascript:alert(1)'>Click</a>",
    "<img src='data:text/html,<script>alert(1)</script>'>",
  ];

  it("should sanitize all XSS payloads in sanitizeHtml", () => {
    xssPayloads.forEach((payload) => {
      const sanitized = sanitizeHtml(payload);
      // Critical: No script tags should remain
      expect(sanitized).not.toContain("<script>");
      expect(sanitized).not.toContain("</script>");
      // Event handlers should be removed
      expect(sanitized).not.toMatch(/\son\w+\s*=/i);
      // Note: Plain text "javascript:" is safe if not in a tag/attribute
    });
  });

  it("should sanitize all XSS payloads in sanitizeText", () => {
    xssPayloads.forEach((payload) => {
      const sanitized = sanitizeText(payload);
      // Critical: No HTML tags should remain
      expect(sanitized).not.toMatch(/<[^>]+>/);
      // Note: Plain text strings like "javascript:alert(1)" are safe as text
      // The XSS risk only exists when they're in HTML attributes or script tags
    });
  });

  it("should sanitize all XSS payloads in sanitizeNotes", () => {
    xssPayloads.forEach((payload) => {
      const sanitized = sanitizeNotes(payload);
      // Critical: No script tags should remain
      expect(sanitized).not.toContain("<script>");
      expect(sanitized).not.toContain("</script>");
      // Event handlers should be removed
      expect(sanitized).not.toMatch(/\son\w+\s*=/i);
      // Note: Plain text content may remain, but execution is prevented
    });
  });
});

