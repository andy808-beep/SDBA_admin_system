# Cross-Browser Testing Plan - Unified Error System

## Overview

This document outlines the cross-browser testing strategy for the Unified Error System, targeting Chrome 90+, Firefox 88+, Safari 14+, and Edge 90+.

**Last Updated:** 2025-01-XX  
**Version:** 2.0.0

---

## Target Browsers

| Browser | Version | Priority | Testing Method |
|---------|---------|----------|----------------|
| Chrome | 90+ | Primary | Automated + Manual |
| Firefox | 88+ | Secondary | Automated + Manual |
| Safari | 14+ | Secondary (iOS support) | Automated + Manual |
| Edge | 90+ | Secondary | Automated + Manual |

---

## Feature Support Matrix

| Feature | Chrome 90+ | Firefox 88+ | Safari 14+ | Edge 90+ | Notes |
|---------|------------|------------|------------|----------|-------|
| **Field Error Styling** | ✅ | ✅ | ✅ | ✅ | Full support |
| **Form Error Summary** | ✅ | ✅ | ✅ | ✅ | Full support |
| **System Error** | ✅ | ✅ | ✅ | ✅ | Full support |
| **CSS Animations** | ✅ | ✅ | ✅ | ✅ | Full support |
| **requestAnimationFrame** | ✅ | ✅ | ✅ | ✅ | Full support |
| **ARIA Live Regions** | ✅ | ✅ | ⚠️ | ✅ | Safari: Polite works, assertive may be delayed |
| **Smooth Scroll** | ✅ | ✅ | ⚠️ | ✅ | Safari: May need `-webkit-` prefix |
| **CSS Grid** | ✅ | ✅ | ✅ | ✅ | Full support |
| **Flexbox** | ✅ | ✅ | ✅ | ✅ | Full support |
| **CSS Variables** | ✅ | ✅ | ✅ | ✅ | Full support |
| **:focus-visible** | ✅ | ✅ | ⚠️ | ✅ | Safari 15.4+ only |
| **scrollIntoView(options)** | ✅ | ✅ | ✅ | ✅ | Full support |
| **Map/Set** | ✅ | ✅ | ✅ | ✅ | Full support |
| **Arrow Functions** | ✅ | ✅ | ✅ | ✅ | Full support |
| **Template Literals** | ✅ | ✅ | ✅ | ✅ | Full support |
| **DocumentFragment** | ✅ | ✅ | ✅ | ✅ | Full support |
| **classList API** | ✅ | ✅ | ✅ | ✅ | Full support |
| **getElementById** | ✅ | ✅ | ✅ | ✅ | Full support |
| **addEventListener** | ✅ | ✅ | ✅ | ✅ | Full support |

**Legend:**
- ✅ Full support - Works as expected
- ⚠️ Partial support - Works with limitations or workarounds
- ❌ Not supported - Requires fallback

---

## CSS Feature Detection

### Feature Detection Code

```javascript
/**
 * CSS Feature Detection
 * Detects support for CSS features used by error system
 */

const CSSFeatureDetection = {
  /**
   * Check if CSS Grid is supported
   */
  supportsGrid() {
    return CSS.supports('display', 'grid');
  },

  /**
   * Check if Flexbox is supported
   */
  supportsFlexbox() {
    return CSS.supports('display', 'flex');
  },

  /**
   * Check if CSS Variables are supported
   */
  supportsCSSVariables() {
    return CSS.supports('--custom-property', 'value');
  },

  /**
   * Check if :focus-visible is supported
   */
  supportsFocusVisible() {
    try {
      document.querySelector(':focus-visible');
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Check if CSS animations are supported
   */
  supportsAnimations() {
    return CSS.supports('animation', 'test 1s');
  },

  /**
   * Check if CSS transitions are supported
   */
  supportsTransitions() {
    return CSS.supports('transition', 'opacity 1s');
  },

  /**
   * Apply fallbacks for unsupported features
   */
  applyFallbacks() {
    // Focus-visible fallback for Safari < 15.4
    if (!this.supportsFocusVisible()) {
      const style = document.createElement('style');
      style.textContent = `
        /* Fallback for :focus-visible */
        input:focus,
        select:focus,
        textarea:focus,
        button:focus {
          outline: 2px solid #005fcc;
          outline-offset: 2px;
        }
      `;
      document.head.appendChild(style);
    }

    // Smooth scroll fallback for older Safari
    if (!CSS.supports('scroll-behavior', 'smooth')) {
      // Use JavaScript smooth scroll polyfill
      this.polyfillSmoothScroll();
    }
  },

  /**
   * Polyfill smooth scroll for browsers that don't support it
   */
  polyfillSmoothScroll() {
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function(options) {
      if (options && options.behavior === 'smooth') {
        const start = window.pageYOffset || document.documentElement.scrollTop;
        const target = this.getBoundingClientRect().top + start;
        const distance = target - start;
        const duration = 500;
        let startTime = null;

        function animate(currentTime) {
          if (startTime === null) startTime = currentTime;
          const timeElapsed = currentTime - startTime;
          const progress = Math.min(timeElapsed / duration, 1);
          
          const ease = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

          window.scrollTo(0, start + distance * ease);

          if (timeElapsed < duration) {
            requestAnimationFrame(animate);
          } else {
            // Restore original if needed
            Element.prototype.scrollIntoView = originalScrollIntoView;
          }
        }

        requestAnimationFrame(animate);
        return;
      }
      return originalScrollIntoView.call(this, options);
    };
  }
};

// Run feature detection on load
if (typeof window !== 'undefined') {
  window.CSSFeatureDetection = CSSFeatureDetection;
  CSSFeatureDetection.applyFallbacks();
}
```

---

## JavaScript Feature Detection

### Feature Detection Code

```javascript
/**
 * JavaScript Feature Detection
 * Detects support for JS features used by error system
 */

const JSFeatureDetection = {
  /**
   * Check if scrollIntoView with options is supported
   */
  supportsScrollIntoViewOptions() {
    try {
      const div = document.createElement('div');
      div.scrollIntoView({ behavior: 'smooth' });
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Check if IntersectionObserver is supported
   */
  supportsIntersectionObserver() {
    return 'IntersectionObserver' in window;
  },

  /**
   * Check if Map is supported
   */
  supportsMap() {
    return typeof Map !== 'undefined';
  },

  /**
   * Check if Set is supported
   */
  supportsSet() {
    return typeof Set !== 'undefined';
  },

  /**
   * Check if Arrow Functions are supported
   */
  supportsArrowFunctions() {
    try {
      eval('(() => {})');
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Check if Template Literals are supported
   */
  supportsTemplateLiterals() {
    try {
      eval('`test`');
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Check if requestAnimationFrame is supported
   */
  supportsRequestAnimationFrame() {
    return typeof requestAnimationFrame !== 'undefined';
  },

  /**
   * Check if DocumentFragment is supported
   */
  supportsDocumentFragment() {
    return typeof DocumentFragment !== 'undefined';
  },

  /**
   * Check if classList API is supported
   */
  supportsClassList() {
    return 'classList' in document.createElement('div');
  },

  /**
   * Get browser information
   */
  getBrowserInfo() {
    const ua = navigator.userAgent;
    const info = {
      name: 'Unknown',
      version: 0,
      isMobile: /Mobile|Android|iPhone|iPad/.test(ua)
    };

    if (ua.includes('Chrome') && !ua.includes('Edg')) {
      const match = ua.match(/Chrome\/(\d+)/);
      info.name = 'Chrome';
      info.version = match ? parseInt(match[1]) : 0;
    } else if (ua.includes('Firefox')) {
      const match = ua.match(/Firefox\/(\d+)/);
      info.name = 'Firefox';
      info.version = match ? parseInt(match[1]) : 0;
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      const match = ua.match(/Version\/(\d+)/);
      info.name = 'Safari';
      info.version = match ? parseInt(match[1]) : 0;
    } else if (ua.includes('Edg')) {
      const match = ua.match(/Edg\/(\d+)/);
      info.name = 'Edge';
      info.version = match ? parseInt(match[1]) : 0;
    }

    return info;
  },

  /**
   * Log feature support status
   */
  logFeatureSupport() {
    const browser = this.getBrowserInfo();
    console.log('Browser:', browser.name, browser.version);
    console.log('Features:', {
      scrollIntoViewOptions: this.supportsScrollIntoViewOptions(),
      IntersectionObserver: this.supportsIntersectionObserver(),
      Map: this.supportsMap(),
      Set: this.supportsSet(),
      ArrowFunctions: this.supportsArrowFunctions(),
      TemplateLiterals: this.supportsTemplateLiterals(),
      RequestAnimationFrame: this.supportsRequestAnimationFrame(),
      DocumentFragment: this.supportsDocumentFragment(),
      ClassList: this.supportsClassList()
    });
  }
};

// Run feature detection
if (typeof window !== 'undefined') {
  window.JSFeatureDetection = JSFeatureDetection;
  JSFeatureDetection.logFeatureSupport();
}
```

---

## Known Issues & Workarounds

### Safari Issues

#### Issue 1: ARIA Live Region Delays
**Description:** Safari may delay or skip `aria-live="assertive"` announcements, especially for rapid changes.

**Workaround:**
```javascript
// Add small delay for Safari
if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
  setTimeout(() => {
    errorDiv.setAttribute('aria-live', 'assertive');
  }, 100);
}
```

#### Issue 2: Smooth Scroll Behavior
**Description:** Older Safari versions may not support `scroll-behavior: smooth` in CSS.

**Workaround:** Use JavaScript polyfill (see CSSFeatureDetection.polyfillSmoothScroll above)

#### Issue 3: Focus Visible Support
**Description:** `:focus-visible` only supported in Safari 15.4+

**Workaround:** Use `:focus` fallback for older Safari versions

#### Issue 4: requestAnimationFrame Timing
**Description:** Safari may have slightly different timing for requestAnimationFrame

**Workaround:** Use double RAF for animations:
```javascript
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    // Animation code
  });
});
```

### Firefox Issues

#### Issue 1: ARIA Live Region Interruptions
**Description:** Firefox may interrupt current announcements with assertive live regions.

**Workaround:** Use `polite` for field errors, `assertive` only for critical system errors

#### Issue 2: ScrollIntoView Performance
**Description:** Firefox may be slower with smooth scrolling on long pages.

**Workaround:** Use `block: 'center'` instead of `block: 'start'` for better performance

### Chrome/Edge Issues

**No known issues** - Full support for all features

---

## Playwright Test Configuration

### playwright.config.js

```javascript
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Desktop Browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'edge',
      use: { 
        ...devices['Desktop Edge'],
        channel: 'msedge',
      },
    },
    
    // Mobile Browsers
    {
      name: 'iPhone',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'Android',
      use: { ...devices['Pixel 5'] },
    },
    
    // Tablet
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] },
    },
  ],

  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Browser Test Example

```javascript
// tests/browser/error-system-browser.test.js
const { test, expect } = require('@playwright/test');

test.describe('Error System - Cross Browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register.html');
  });

  test('field error displays correctly', async ({ page, browserName }) => {
    // Show field error
    await page.evaluate(() => {
      window.errorSystem.showFieldError('email', 'emailRequired');
    });

    // Wait for error to appear
    await page.waitForSelector('#error-email');

    // Check error is visible
    const errorDiv = await page.locator('#error-email');
    await expect(errorDiv).toBeVisible();
    await expect(errorDiv).toHaveText('Email is required');

    // Check field has error class
    const field = await page.locator('#email');
    await expect(field).toHaveClass(/field-error/);

    // Browser-specific checks
    if (browserName === 'webkit') {
      // Safari-specific: Check ARIA attributes
      const ariaInvalid = await field.getAttribute('aria-invalid');
      expect(ariaInvalid).toBe('true');
    }
  });

  test('form error summary displays correctly', async ({ page }) => {
    await page.evaluate(() => {
      const errors = [
        { field: 'email', messageKey: 'emailRequired' },
        { field: 'phone', messageKey: 'phoneRequired' }
      ];
      window.errorSystem.showFormErrors(errors, { containerId: 'testForm' });
    });

    const summary = await page.locator('.form-error-summary');
    await expect(summary).toBeVisible();

    const links = await page.locator('.error-list a');
    await expect(links).toHaveCount(2);
  });

  test('system error displays correctly', async ({ page }) => {
    await page.evaluate(() => {
      window.errorSystem.showSystemError('networkErrorDetailed');
    });

    const systemError = await page.locator('.system-error');
    await expect(systemError).toBeVisible();
    await expect(systemError).toHaveCSS('position', 'fixed');
    await expect(systemError).toHaveCSS('top', '0px');
  });

  test('animations work correctly', async ({ page }) => {
    await page.evaluate(() => {
      window.errorSystem.showSystemError('networkErrorDetailed');
    });

    const systemError = await page.locator('.system-error');
    
    // Check initial opacity (should be 0, then animate to 1)
    await page.waitForTimeout(100);
    const opacity = await systemError.evaluate(el => 
      window.getComputedStyle(el).opacity
    );
    
    // Should be animating or animated
    expect(parseFloat(opacity)).toBeGreaterThan(0);
  });

  test('smooth scroll works', async ({ page, browserName }) => {
    // Create long page
    await page.evaluate(() => {
      document.body.style.height = '5000px';
      const field = document.createElement('input');
      field.id = 'email';
      field.style.marginTop = '4000px';
      document.body.appendChild(field);
    });

    await page.evaluate(() => {
      window.errorSystem.showFieldError('email', 'emailRequired', {
        scrollTo: true
      });
    });

    // Wait for scroll
    await page.waitForTimeout(500);

    // Check field is in viewport
    const field = await page.locator('#email');
    const isVisible = await field.isVisible();
    expect(isVisible).toBe(true);
  });

  test('ARIA attributes are set correctly', async ({ page }) => {
    await page.evaluate(() => {
      window.errorSystem.showFieldError('email', 'emailRequired');
    });

    const field = await page.locator('#email');
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    
    const describedBy = await field.getAttribute('aria-describedby');
    expect(describedBy).toContain('error-email');

    const errorDiv = await page.locator('#error-email');
    await expect(errorDiv).toHaveAttribute('role', 'alert');
    await expect(errorDiv).toHaveAttribute('aria-live', 'polite');
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.evaluate(() => {
      const errors = [
        { field: 'email', messageKey: 'emailRequired' },
        { field: 'phone', messageKey: 'phoneRequired' }
      ];
      window.errorSystem.showFormErrors(errors, { containerId: 'testForm' });
    });

    // Tab to first error link
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const focused = await page.evaluate(() => document.activeElement.tagName);
    expect(focused).toBe('A');
  });
});
```

---

## Testing Checklist

### Chrome 90+ Testing Checklist

- [ ] Field error styling displays correctly
- [ ] Form error summary displays correctly
- [ ] System error displays correctly
- [ ] Animations are smooth
- [ ] ARIA announcements work
- [ ] Smooth scroll works
- [ ] Keyboard navigation works
- [ ] Focus indicators are visible
- [ ] Error messages are readable
- [ ] Close buttons work
- [ ] Auto-dismiss works
- [ ] Real-time validation works
- [ ] Performance is acceptable

### Firefox 88+ Testing Checklist

- [ ] Field error styling displays correctly
- [ ] Form error summary displays correctly
- [ ] System error displays correctly
- [ ] Animations are smooth
- [ ] ARIA announcements work (check for interruptions)
- [ ] Smooth scroll works
- [ ] Keyboard navigation works
- [ ] Focus indicators are visible
- [ ] Error messages are readable
- [ ] Close buttons work
- [ ] Auto-dismiss works
- [ ] Real-time validation works
- [ ] Performance is acceptable

### Safari 14+ Testing Checklist

- [ ] Field error styling displays correctly
- [ ] Form error summary displays correctly
- [ ] System error displays correctly
- [ ] Animations are smooth
- [ ] ARIA announcements work (may be delayed)
- [ ] Smooth scroll works (check polyfill)
- [ ] Keyboard navigation works
- [ ] Focus indicators are visible (check :focus-visible fallback)
- [ ] Error messages are readable
- [ ] Close buttons work
- [ ] Auto-dismiss works
- [ ] Real-time validation works
- [ ] Performance is acceptable
- [ ] iOS Safari specific: Touch interactions work

### Edge 90+ Testing Checklist

- [ ] Field error styling displays correctly
- [ ] Form error summary displays correctly
- [ ] System error displays correctly
- [ ] Animations are smooth
- [ ] ARIA announcements work
- [ ] Smooth scroll works
- [ ] Keyboard navigation works
- [ ] Focus indicators are visible
- [ ] Error messages are readable
- [ ] Close buttons work
- [ ] Auto-dismiss works
- [ ] Real-time validation works
- [ ] Performance is acceptable

### Mobile Testing Checklist

- [ ] Touch targets are large enough (44x44px minimum)
- [ ] Error messages are readable on small screens
- [ ] Form summary is scrollable on mobile
- [ ] System error doesn't block content
- [ ] Keyboard doesn't cover error messages
- [ ] Zoom works correctly
- [ ] Orientation changes handled correctly

---

## Automated Testing Setup

### BrowserStack Configuration

```javascript
// browserstack.config.js
module.exports = {
  browsers: [
    {
      browser: 'Chrome',
      browser_version: '90.0',
      os: 'Windows',
      os_version: '10'
    },
    {
      browser: 'Firefox',
      browser_version: '88.0',
      os: 'Windows',
      os_version: '10'
    },
    {
      browser: 'Safari',
      browser_version: '14.0',
      os: 'OS X',
      os_version: 'Big Sur'
    },
    {
      browser: 'Edge',
      browser_version: '90.0',
      os: 'Windows',
      os_version: '10'
    },
    {
      device: 'iPhone 12',
      os: 'ios',
      os_version: '14'
    },
    {
      device: 'Samsung Galaxy S21',
      os: 'android',
      os_version: '11.0'
    }
  ]
};
```

### Running Tests

```bash
# Install Playwright
npm install --save-dev @playwright/test

# Install browsers
npx playwright install

# Run all browser tests
npx playwright test

# Run specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run with UI
npx playwright test --ui

# Generate report
npx playwright show-report
```

---

## Manual Testing Guide

### Desktop Testing

1. **Open browser** (Chrome, Firefox, Safari, Edge)
2. **Navigate to** test page with error system
3. **Test each feature:**
   - Show field error
   - Show form error summary
   - Show system error
   - Clear errors
   - Real-time validation
4. **Check:**
   - Visual appearance
   - Functionality
   - Performance
   - Accessibility

### Mobile Testing

1. **Open mobile browser** (Safari iOS, Chrome Android)
2. **Navigate to** test page
3. **Test:**
   - Touch interactions
   - Scrolling
   - Keyboard behavior
   - Orientation changes
4. **Check:**
   - Responsive layout
   - Touch targets
   - Readability

---

## Test Results Template

### Browser Test Results

```
Browser: Chrome 90
Date: 2025-01-XX
Tester: [Name]

Feature Tests:
✅ Field error styling
✅ Form error summary
✅ System error
✅ Animations
✅ ARIA announcements
✅ Smooth scroll
✅ Keyboard navigation

Issues Found:
- None

Notes:
- All features working as expected
```

---

## Continuous Integration

### GitHub Actions Example

```yaml
name: Cross-Browser Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npx playwright install ${{ matrix.browser }}
      - run: npx playwright test --project=${{ matrix.browser }}
      - uses: actions/upload-artifact@v2
        if: always()
        with:
          name: playwright-report-${{ matrix.browser }}
          path: playwright-report/
```

---

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [BrowserStack Documentation](https://www.browserstack.com/docs)
- [Can I Use](https://caniuse.com/) - Browser compatibility
- [MDN Web Docs](https://developer.mozilla.org/) - Feature documentation
