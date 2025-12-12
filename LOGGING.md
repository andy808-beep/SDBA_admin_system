# Request and Response Logging

This document describes the comprehensive request and response logging implementation for the SDBA Admin System.

## Overview

All requests and responses are logged with structured logging, including:
- Request metadata (method, path, IP, user agent)
- User identification (user ID if authenticated)
- Request/response timing
- Error details (sanitized)
- Correlation IDs for request tracing

## Log Format

### Development Format (Pretty)
```
[2024-01-01T12:00:00.000Z] [INFO] [REQ-1234567890-ABC123] Request started method=POST path=/api/admin/approve
```

### Production Format (JSON)
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "INFO",
  "message": "Request started",
  "requestId": "REQ-1234567890-ABC123",
  "method": "POST",
  "path": "/api/admin/approve",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "userId": "user-id-123"
}
```

## Log Levels

- **DEBUG**: Detailed debugging information (development only)
- **INFO**: General informational messages (10% sampled in production)
- **WARN**: Warning messages (50% sampled in production)
- **ERROR**: Error messages (100% logged, always)

## Request Logging

### Middleware Logging

All requests are logged in `middleware.ts` with:
- Request ID (generated per request)
- Method and path
- IP address
- User agent
- User ID (if authenticated)
- Request duration
- Response status code
- Response size (if available)

### API Route Logging

Use `withApiLogging()` wrapper for detailed API route logging:

```typescript
import { withApiLogging } from "@/lib/api-logger";

export const POST = withApiLogging(async (req: NextRequest) => {
  // Your route handler
}, "approve_registration");
```

## Request Context

Request context is available throughout the request lifecycle:

```typescript
import { getRequestId, getRequestContext } from "@/lib/request-context";

// Get request ID
const requestId = getRequestId();

// Get full context
const context = getRequestContext();
```

## PII Sanitization

All logs are automatically sanitized to remove PII:

### Sanitized Fields
- Passwords, tokens, API keys
- Credit card numbers
- Social Security Numbers
- Email addresses (hashed)
- Phone numbers (masked)

### Example
```typescript
// Input
{ email: "user@example.com", password: "secret123" }

// Logged
{ email: "use***@example.com", password: "[REDACTED]" }
```

## Performance Markers

### Slow Request Detection
- **> 1 second**: Logged as WARNING
- **> 5 seconds**: Logged as ERROR

### Example Log
```
[WARN] POST /api/admin/list 200 [SLOW] duration=1500ms
```

## Request ID

Every request gets a unique request ID:
- Format: `REQ-{timestamp}-{random}`
- Included in response headers: `X-Request-ID`
- Used for correlation across logs

### Using Request ID

1. **In Logs**: Automatically included in all log entries
2. **In Responses**: Available in `X-Request-ID` header
3. **For Support**: Users can reference request ID when reporting issues

## Log Sampling

In production, logs are sampled to reduce volume:

- **DEBUG**: 0% (disabled in production)
- **INFO**: 10% (1 in 10 requests)
- **WARN**: 50% (1 in 2 warnings)
- **ERROR**: 100% (all errors)

This reduces log volume while maintaining visibility into errors.

## Privacy Considerations

### GDPR Compliance

1. **Data Minimization**: Only log necessary data
2. **PII Sanitization**: All PII is automatically redacted
3. **Retention Policy**: Logs retained for 7 days
4. **Right to Deletion**: Logs can be deleted on request

### What We Log

✅ **Logged**:
- Request metadata (method, path, IP)
- User ID (for authenticated requests)
- Error messages (sanitized)
- Performance metrics

❌ **Never Logged**:
- Passwords
- API keys/tokens
- Credit card numbers
- Full email addresses
- Phone numbers (masked)

## Log Retention

### Configuration

- **Retention Period**: 7 days
- **Rotation**: Daily
- **Compression**: Old logs are compressed
- **Location**: Application logs directory

### Log Files

- `logs/app-YYYY-MM-DD.log` - Daily log files
- `logs/app-YYYY-MM-DD.log.gz` - Compressed old logs

## Environment Configuration

### Development
```env
LOG_LEVEL=DEBUG
LOG_SAMPLING_INFO=1.0
LOG_SAMPLING_WARN=1.0
```

### Production
```env
LOG_LEVEL=INFO
LOG_SAMPLING_INFO=0.1
LOG_SAMPLING_WARN=0.5
```

## Querying Logs

### By Request ID
```bash
grep "REQ-1234567890-ABC123" logs/app-*.log
```

### By User ID
```bash
grep '"userId":"user-id-123"' logs/app-*.log
```

### By Status Code
```bash
grep '"statusCode":500' logs/app-*.log
```

### Slow Requests
```bash
grep "\[SLOW\]" logs/app-*.log
```

## Integration with Monitoring

### Sentry Integration

- Errors are automatically sent to Sentry
- Request context is included in Sentry events
- User feedback is captured in Sentry

### External Log Shipping

To ship logs to an external service (e.g., Datadog, LogRocket):

1. Configure log shipping in your deployment
2. Use structured JSON format (production)
3. Filter sensitive data before shipping

## Troubleshooting

### Logs Not Appearing

1. Check log level configuration
2. Verify log sampling settings
3. Check file permissions for log directory
4. Verify logger is imported correctly

### Too Many Logs

1. Adjust log sampling rates
2. Increase log level (DEBUG → INFO → WARN)
3. Review what's being logged
4. Consider log aggregation service

### Missing Request IDs

1. Verify middleware is running
2. Check `X-Request-ID` header in responses
3. Ensure request context is set correctly

## Best Practices

1. **Always use structured logging**: Use logger methods with context
2. **Sanitize user input**: Never log raw user input
3. **Include request ID**: Always include request ID in error messages
4. **Log at appropriate level**: Use DEBUG for development, INFO for production
5. **Monitor log volume**: Adjust sampling if logs are too verbose
6. **Review logs regularly**: Check for patterns and issues

## Example Usage

### Basic Logging
```typescript
import { logger } from "@/lib/logger";

logger.info("User action", { action: "approve", registrationId: "123" });
logger.error("Operation failed", error, { context: "approval" });
```

### Request Logging
```typescript
import { logger } from "@/lib/logger";

logger.request({
  method: "POST",
  path: "/api/admin/approve",
  statusCode: 200,
  duration: 150,
  userId: "user-123",
});
```

### With Request Context
```typescript
import { getRequestId } from "@/lib/request-context";
import { logger } from "@/lib/logger";

const requestId = getRequestId();
logger.info("Processing request", { requestId, data: sanitizedData });
```

