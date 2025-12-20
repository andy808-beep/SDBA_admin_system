# Browser Testing - Quick Start

## Setup

### 1. Install Dependencies

```bash
npm install --save-dev @playwright/test
```

### 2. Install Browsers

```bash
npx playwright install
```

### 3. Include Feature Detection

Add to your HTML file (before error-system.js):

```html
<script src="js/feature-detection.js"></script>
<script src="js/error-system.js"></script>
```

## Running Tests

### Run All Browser Tests

```bash
npx playwright test
```

### Run Specific Browser

```bash
# Chrome
npx playwright test --project=chromium

# Firefox
npx playwright test --project=firefox

# Safari
npx playwright test --project=webkit

# Edge
npx playwright test --project=edge

# Mobile
npx playwright test --project=iPhone
npx playwright test --project=Android
```

### Run with UI

```bash
npx playwright test --ui
```

### Run in Debug Mode

```bash
npx playwright test --debug
```

### Generate Report

```bash
npx playwright show-report
```

## Test Structure

```
tests/browser/
├── error-system-browser.test.js  # Main browser tests
├── BROWSER_TEST_CHECKLIST.md      # Manual testing checklist
└── README.md                      # This file
```

## What Gets Tested

1. **Field Errors** - Display, styling, ARIA
2. **Form Summaries** - Display, links, dismissal
3. **System Errors** - Display, animations, dismissal
4. **Animations** - Smooth transitions
5. **Smooth Scroll** - Scroll behavior
6. **ARIA Attributes** - Accessibility
7. **Keyboard Navigation** - Tab, Enter, Escape
8. **Real-time Validation** - Input/blur events
9. **Feature Detection** - CSS/JS support
10. **Mobile Viewport** - Responsive behavior

## Expected Results

All tests should pass in:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ⚠️ Safari 14+ (with workarounds)
- ✅ Edge 90+

## Troubleshooting

### Tests Failing

1. **Check server is running**
   ```bash
   npm run start
   ```

2. **Check browser installation**
   ```bash
   npx playwright install
   ```

3. **Check feature detection**
   - Verify `feature-detection.js` is loaded
   - Check browser console for feature support

### Safari-Specific Issues

If Safari tests fail:
1. Check ARIA announcement timing (may be delayed)
2. Verify smooth scroll polyfill is active
3. Check focus-visible fallback CSS is applied

### Mobile Tests Failing

1. Check viewport size
2. Verify touch targets are large enough
3. Check keyboard behavior

## CI/CD Integration

### GitHub Actions

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run browser tests
  run: npx playwright test

- name: Upload test results
  uses: actions/upload-artifact@v2
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## Manual Testing

See `BROWSER_TEST_CHECKLIST.md` for manual testing procedures.

## Resources

- [Playwright Docs](https://playwright.dev/)
- [Cross-Browser Testing Plan](../CROSS_BROWSER_TESTING_PLAN.md)
- [Feature Detection Code](../../public/js/feature-detection.js)
