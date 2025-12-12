# CSRF Protection

This document describes the CSRF (Cross-Site Request Forgery) protection implementation for the SDBA Admin System.

## Overview

CSRF protection is implemented using the **double-submit cookie pattern**, which requires:
1. A CSRF token stored in an HTTP-only cookie
2. The same token sent in the request header (`X-CSRF-Token`)
3. Both tokens must match and be valid

## How It Works

### Token Generation
- CSRF tokens are generated using HMAC-SHA256 with a secret key
- Tokens consist of a random 32-byte value and a signature
- Format: `{random_hex}.{hmac_signature}`

### Token Validation
- For state-changing requests (POST, PUT, DELETE, PATCH), the middleware checks:
  1. Token exists in cookie (`__Host-csrf-token`)
  2. Token exists in header (`X-CSRF-Token`)
  3. Both tokens match exactly
  4. Token signature is valid

### Protected Routes
- All `/api/admin/*` routes with state-changing methods require CSRF protection
- GET, HEAD, and OPTIONS requests are exempt
- Public API routes (`/api/public/*`) are exempt (they use other authentication)

## Environment Variables

### CSRF_SECRET (Required in Production)

A strong random secret used to sign CSRF tokens. This should be:
- At least 32 characters long
- Randomly generated
- Kept secret (never committed to version control)

**Development**: A default secret is used if not set (not secure, only for development)

**Production**: Must be set or the application will throw an error

#### Generating a Secret

```bash
# Using OpenSSL
openssl rand -hex 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Setting the Secret

Add to your `.env.local` file:
```env
CSRF_SECRET=your-generated-secret-here
```

## Frontend Integration

### Getting a CSRF Token

Fetch the token from the API endpoint:
```javascript
const response = await fetch('/api/csrf-token');
const { token } = await response.json();
```

The token is also automatically set in a cookie by the middleware.

### Including Token in Requests

Include the token in the `X-CSRF-Token` header for all state-changing requests:

```javascript
fetch('/api/admin/approve', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token, // Get from cookie or API endpoint
  },
  body: JSON.stringify({ ... }),
});
```

### Reading Token from Cookie

If using a library that automatically includes cookies, you can read the token from the cookie:

```javascript
// The cookie is httpOnly, so you can't read it from JavaScript
// Instead, fetch it from the API endpoint or use a server-side component
```

### Example: React Hook

```typescript
import { useEffect, useState } from 'react';

function useCsrfToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/csrf-token')
      .then(res => res.json())
      .then(data => setToken(data.token))
      .catch(err => console.error('Failed to get CSRF token:', err));
  }, []);

  return token;
}

// Usage
function MyComponent() {
  const csrfToken = useCsrfToken();

  const handleSubmit = async () => {
    if (!csrfToken) {
      console.error('CSRF token not available');
      return;
    }

    await fetch('/api/admin/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ ... }),
    });
  };
}
```

## Error Handling

### CSRF Validation Failed (403)

If CSRF validation fails, the API returns:
```json
{
  "ok": false,
  "error": "CSRF token validation failed",
  "code": "CSRF_ERROR"
}
```

### Handling Token Expiry

If a token expires or becomes invalid:
1. Fetch a new token from `/api/csrf-token`
2. Retry the request with the new token

## Security Considerations

### Cookie Security
- Uses `__Host-` prefix to prevent subdomain attacks
- `httpOnly: true` prevents JavaScript access
- `secure: true` in production (HTTPS only)
- `sameSite: strict` prevents cross-site requests

### Token Security
- Tokens are signed with HMAC-SHA256
- Random token component prevents prediction
- Timing-safe comparison prevents timing attacks

### Limitations
- CSRF protection only works for same-origin requests
- Requires JavaScript to include the token in headers
- Does not protect against XSS attacks (use input sanitization)

## Testing

CSRF protection is tested in `lib/__tests__/csrf.test.ts`:
- Token generation and validation
- Request verification
- Error handling
- Method exemption (GET, HEAD, OPTIONS)

Run tests:
```bash
npm test -- lib/__tests__/csrf.test.ts
```

## Troubleshooting

### "CSRF token validation failed" Error

1. **Check token is included**: Ensure `X-CSRF-Token` header is set
2. **Check cookie is set**: Verify `__Host-csrf-token` cookie exists
3. **Check tokens match**: Cookie and header tokens must be identical
4. **Check CSRF_SECRET**: Ensure environment variable is set correctly

### Token Not Available

1. Fetch token from `/api/csrf-token` endpoint
2. Ensure cookies are enabled in the browser
3. Check that the domain matches (no subdomain issues)

### Development Issues

- In development, a default secret is used if `CSRF_SECRET` is not set
- This is not secure and should not be used in production
- Always set `CSRF_SECRET` in production environments

