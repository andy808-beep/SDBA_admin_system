# Sentry Error Monitoring Integration Summary

## Overview
Sentry error monitoring has been integrated into the vanilla JavaScript application to track errors, API failures, and user actions. The implementation provides centralized error handling with privacy filters and development/production mode detection.

## Files Created

### 1. `public/js/sentry-config.js`
Centralized Sentry configuration with:
- **DSN Management**: Reads from `window.ENV.SENTRY_DSN` or document data attribute
- **Environment Detection**: Automatically detects development, staging, or production
- **Privacy Filters**: Filters sensitive form data (passwords, emails, phone numbers)
- **Sample Rates**: Configurable error and transaction sample rates
- **Before Send Hooks**: Filters development errors and sensitive data

**Key Features:**
- Environment-based configuration
- Automatic sensitive data filtering
- Development mode filtering (optional)
- Configurable sample rates

### 2. `public/js/error-handler.js`
Centralized error handling utilities with:
- **Error Logging**: `logError()`, `logWarning()`, `logInfo()`
- **Breadcrumbs**: `addBreadcrumb()` for user action tracking
- **Safe Fetch**: `safeFetch()` wrapper with automatic error logging
- **Context Data**: Automatically adds form state, browser info, and URL
- **Global Handlers**: Catches unhandled errors and promise rejections

**Key Functions:**
- `logError(error, context, level, tags)` - Log errors with context
- `addBreadcrumb(message, category, level, data)` - Track user actions
- `safeFetch(url, options, context)` - Fetch wrapper with error handling
- `wrapAsync(fn, context)` - Wrap async functions with error handling

## Files Modified

### 1. `public/register.html`
- Added Sentry SDK CDN script tag (before other scripts)
- Added Sentry initialization module script
- SDK loads from: `https://browser.sentry-cdn.com/7.91.0/bundle.min.js`

### 2. `public/env.js`
- Added `SENTRY_DSN` placeholder in `window.ENV` object
- Commented instructions for setting DSN

### 3. `public/js/submit.js`
**Error Handling Integration:**
- Wrapped `postJSON()` with `safeFetch()` for automatic error logging
- Added breadcrumbs for:
  - Submit button clicks
  - Rate limit hits
  - Form submission start/success/failure
  - API errors
- Error logging with context for:
  - Form submission failures
  - Network errors
  - API errors

### 4. `public/js/event_bootstrap.js`
**Breadcrumbs Added:**
- Event selection
- Event loading start/success/failure
- Navigation events

### 5. `public/js/tn_wizard.js`
- Imported error handler utilities
- Added breadcrumbs for step navigation

## Configuration

### Setting Up Sentry DSN

1. **Get your Sentry DSN:**
   - Go to https://sentry.io
   - Create a project or select existing
   - Navigate to: Settings → Projects → Your Project → Client Keys (DSN)
   - Copy your DSN

2. **Configure DSN in `public/env.js`:**
   ```javascript
   window.ENV = {
     // ... other config
     SENTRY_DSN: "https://xxxxx@xxxxx.ingest.sentry.io/xxxxx"
   };
   ```

3. **Alternative: Set via HTML data attribute:**
   ```html
   <html data-sentry-dsn="https://xxxxx@xxxxx.ingest.sentry.io/xxxxx">
   ```

### Environment Detection

The system automatically detects environment:
- **Development**: `localhost`, `127.0.0.1`, `192.168.*`, `*.local`
- **Staging**: Hostnames containing `staging`, `test`, or `dev`
- **Production**: All other hostnames

### Privacy & Data Filtering

**Automatic Filtering:**
- Passwords, credit cards, SSN, honeypot fields → `[FILTERED]`
- Email addresses → Partially masked (e.g., `us***@example.com`)
- Phone numbers → Partially masked (e.g., `***1234`)

**Development Mode:**
- Errors are filtered out by default in development
- Set `window.__ENABLE_SENTRY_IN_DEV__ = true` to enable in dev

## Breadcrumbs Tracked

### User Actions
- Form step navigation
- Button clicks (submit, next, previous)
- Event selection
- Form submission attempts

### Navigation
- Step changes
- Event loading
- Page navigation

### HTTP Requests
- API calls (URL, method, status)
- Form submissions
- Fetch requests

### Errors
- Validation errors
- API failures
- Network errors
- Unhandled exceptions

## Usage Examples

### Logging Errors
```javascript
import { logError } from './error-handler.js';

try {
  // Some operation
} catch (error) {
  logError(error, {
    action: 'form_validation',
    field: 'email',
    value: 'invalid@'
  }, 'error', ['validation']);
}
```

### Adding Breadcrumbs
```javascript
import { addBreadcrumb } from './error-handler.js';

addBreadcrumb('User clicked next button', 'user', 'info', {
  step: 3,
  action: 'step_navigation'
});
```

### Safe Fetch
```javascript
import { safeFetch } from './error-handler.js';

const response = await safeFetch('/api/submit', {
  method: 'POST',
  body: JSON.stringify(data)
}, 'form_submission');
```

### Wrapping Async Functions
```javascript
import { wrapAsync } from './error-handler.js';

const safeOperation = wrapAsync(async (data) => {
  // Your async code
}, 'data_processing');
```

## Error Context Automatically Added

Every error logged includes:
- **Form State**: Current step, event ref, team count, etc.
- **Browser Info**: User agent, language, platform, online status
- **URL**: Current page URL
- **Timestamp**: ISO timestamp
- **Custom Context**: Any additional context passed to `logError()`

## Global Error Handlers

The system automatically catches:
- **Unhandled Errors**: JavaScript errors not caught by try-catch
- **Unhandled Promise Rejections**: Promise rejections without .catch()

These are automatically logged to Sentry with full context.

## Template Files

**Note**: Template files (`tn_templates.html`, `wu_sc_templates.html`) are HTML fragments, not full documents. They don't need Sentry initialization as they're loaded into the main page which already has Sentry initialized.

## Testing

### Test Error Logging
```javascript
// In browser console
import { logError } from './js/error-handler.js';
logError(new Error('Test error'), { test: true });
```

### Test Breadcrumbs
```javascript
import { addBreadcrumb } from './js/error-handler.js';
addBreadcrumb('Test breadcrumb', 'user', 'info', { test: true });
```

### Verify Sentry is Initialized
```javascript
// In browser console
console.log(window.Sentry);
// Should show Sentry object if initialized
```

## Production Checklist

- [ ] Set `SENTRY_DSN` in `env.js` or HTML data attribute
- [ ] Verify environment detection works correctly
- [ ] Test error logging in production environment
- [ ] Verify sensitive data is filtered correctly
- [ ] Check Sentry dashboard for incoming errors
- [ ] Configure alerts in Sentry dashboard
- [ ] Set up release tracking (optional)

## Security Considerations

1. **Sensitive Data**: All sensitive fields are automatically filtered
2. **Development Mode**: Errors filtered by default in development
3. **DSN Security**: DSN is public (by design), but only allows sending errors
4. **Rate Limiting**: Sentry has built-in rate limiting
5. **Privacy**: Email and phone numbers are partially masked

## Troubleshooting

### Sentry Not Initializing
- Check browser console for errors
- Verify DSN is set correctly
- Check if Sentry SDK loaded (check Network tab)
- Verify `sentry-config.js` is loaded before initialization

### Errors Not Appearing in Sentry
- Check if environment is development (errors filtered by default)
- Set `window.__ENABLE_SENTRY_IN_DEV__ = true` for testing
- Check browser console for Sentry errors
- Verify DSN is correct

### Too Many Errors
- Adjust `sampleRate` in `sentry-config.js`
- Add more filters in `beforeSend` hook
- Check for error loops

## Future Enhancements

Potential improvements:
1. **Performance Monitoring**: Enable BrowserTracing integration
2. **Session Replay**: Add Sentry Replay for debugging
3. **Release Tracking**: Add version/release tracking
4. **Custom Tags**: Add more custom tags for filtering
5. **Error Grouping**: Configure error grouping rules in Sentry
6. **Alerts**: Set up email/Slack alerts for critical errors

---

**Date**: Integration completed
**Status**: ✅ Fully integrated and ready for configuration

