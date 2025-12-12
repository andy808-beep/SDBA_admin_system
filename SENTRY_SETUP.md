# Sentry Error Monitoring Setup

This document describes the Sentry error monitoring and performance tracking setup for the SDBA Admin System.

## Overview

Sentry has been integrated to provide:
- **Error Monitoring**: Automatic error tracking and alerting
- **Performance Monitoring**: API response times and database query performance
- **Release Tracking**: Track errors by git commit SHA
- **User Context**: Associate errors with admin users

## Configuration Files

### Sentry Configuration Files

- `sentry.client.config.ts` - Client-side (browser) configuration
- `sentry.server.config.ts` - Server-side (Node.js) configuration
- `sentry.edge.config.ts` - Edge runtime (middleware) configuration

### Integration Files

- `lib/instrumentation/server.ts` - Server-side performance tracking utilities
- `lib/instrumentation/edge.ts` - Edge runtime performance tracking
- `lib/sentry-context.ts` - User context management
- `instrumentation.ts` - Next.js instrumentation entry point

## Environment Variables

Add the following to your `.env.local` or deployment environment:

```bash
# Sentry DSN (required)
SENTRY_DSN=your_sentry_dsn
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn

# Sentry Auth Token (for source maps upload in CI/CD)
SENTRY_AUTH_TOKEN=your_sentry_auth_token

# Sentry Organization and Project (for source maps upload)
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project
```

### Getting Your Sentry DSN

1. Go to https://sentry.io and create an account or log in
2. Create a new project (select Next.js)
3. Copy the DSN from the project settings
4. Add it to your environment variables

### Getting Your Sentry Auth Token

1. Go to https://sentry.io/settings/account/api/auth-tokens/
2. Create a new token with the following scopes:
   - `project:read`
   - `project:releases`
   - `org:read`
3. Add it to your environment variables

## Features

### Error Filtering

The following errors are automatically filtered out (not sent to Sentry):

- **401/403 Authentication Errors**: Expected authentication failures
- **Validation Errors**: Zod validation errors (user input errors)
- **Browser Extension Errors**: Errors from browser extensions

### Performance Tracking

The following operations are automatically tracked:

- **API Routes**: Response times for all API endpoints
- **Database Queries**: Performance of Supabase queries
- **RPC Calls**: Performance of database function calls
- **Registration Events**: Approval and rejection operations

### User Context

Admin user information is automatically attached to errors:

- User ID
- Email address
- Admin role tag

### Release Tracking

Releases are tracked using git commit SHA. To build with release tracking:

```bash
npm run build:with-sentry
```

Or set `SENTRY_RELEASE` environment variable manually:

```bash
SENTRY_RELEASE=your-release-version npm run build
```

## Custom Instrumentation

### Tracking API Performance

API routes automatically track performance through the error handler. For custom tracking:

```typescript
import { trackRpcCall } from "@/lib/instrumentation/server";

const { data, error } = await trackRpcCall(
  () => supabaseServer.rpc("function_name", params),
  "function_name",
  params
);
```

### Tracking Registration Events

```typescript
import { trackRegistrationEvent } from "@/lib/instrumentation/server";

trackRegistrationEvent("approve", registrationId, adminUserId, true);
```

### Setting User Context

```typescript
import { setSentryUser, clearSentryUser } from "@/lib/sentry-context";

// Set user context
setSentryUser(user);

// Clear user context
clearSentryUser();
```

## Error Grouping

Sentry automatically groups similar errors together. Custom fingerprinting is configured in the Sentry config files to improve error grouping for:

- API errors with similar patterns
- Database errors
- Authentication errors

## Alert Rules

Configure alert rules in Sentry:

1. Go to your Sentry project settings
2. Navigate to Alerts
3. Create rules for:
   - New errors
   - Error rate spikes
   - Performance degradation
   - Release regression

## Source Maps

Source maps are automatically uploaded during build when:

- `SENTRY_AUTH_TOKEN` is set
- `SENTRY_ORG` is set
- `SENTRY_PROJECT` is set

This allows Sentry to show original source code in error stack traces.

## Testing

Sentry functions are designed to fail silently if Sentry is not configured, so tests will continue to work without Sentry credentials.

## Disabling Sentry

To disable Sentry:

1. Remove or comment out the `SENTRY_DSN` environment variable
2. Sentry will not initialize and will not send any data

## Troubleshooting

### Errors not appearing in Sentry

1. Check that `SENTRY_DSN` is set correctly
2. Check browser console for Sentry initialization errors
3. Verify network requests to `sentry.io` are not blocked

### Source maps not working

1. Verify `SENTRY_AUTH_TOKEN` is set
2. Check that `SENTRY_ORG` and `SENTRY_PROJECT` match your Sentry project
3. Check build logs for source map upload errors

### Too many errors

1. Review error filtering in `sentry.*.config.ts`
2. Adjust `ignoreErrors` and `denyUrls` patterns
3. Use `beforeSend` hook for custom filtering

