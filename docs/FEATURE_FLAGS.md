# Feature Flags Documentation

Complete guide to the feature flags system in the SDBA Admin System.

## 📋 Table of Contents

- [Overview](#overview)
- [Feature Flags List](#feature-flags-list)
- [Usage](#usage)
- [Admin UI](#admin-ui)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Best Practices](#best-practices)
- [Migration Guide](#migration-guide)

## 🎯 Overview

The feature flags system allows you to enable/disable features at runtime without deploying new code. This enables:

- **Gradual Rollouts**: Test features with a percentage of users
- **Quick Rollbacks**: Disable problematic features instantly
- **A/B Testing**: Test different feature variations
- **User-Specific Features**: Enable features for specific users or emails

### Architecture

The feature flags system uses:
- **Database-backed**: Flags stored in PostgreSQL for runtime changes
- **Consistent Hashing**: Same user always gets same result for percentage rollouts
- **Audit Logging**: All changes are logged for compliance
- **Fail Closed**: If flags can't be checked, features are disabled by default

## 🚩 Feature Flags List

### ENABLE_RATE_LIMITING

**Default**: `true` (100%)

**Purpose**: Enable rate limiting for API endpoints

**When to Enable**: Always enabled in production. Disable only for debugging.

**Usage**:
```typescript
if (await isFeatureEnabled(FEATURE_FLAGS.ENABLE_RATE_LIMITING)) {
  // Apply rate limiting
}
```

### ENABLE_EMAIL_NOTIFICATIONS

**Default**: `false` (0%)

**Purpose**: Send email notifications for registration events

**When to Enable**: When email service is configured and tested

**Usage**:
```typescript
if (await isFeatureEnabled(FEATURE_FLAGS.ENABLE_EMAIL_NOTIFICATIONS, userId)) {
  await sendEmailNotification(...);
}
```

### ENABLE_ADVANCED_FILTERING

**Default**: `false` (0%)

**Purpose**: Enable advanced filtering options in admin dashboard

**When to Enable**: After testing with beta users

**Usage**:
```typescript
const showAdvancedFilters = await isFeatureEnabled(
  FEATURE_FLAGS.ENABLE_ADVANCED_FILTERING,
  userId
);
```

### ENABLE_BULK_OPERATIONS

**Default**: `false` (0%)

**Purpose**: Enable bulk approve/reject operations

**When to Enable**: After thorough testing

**Usage**:
```typescript
if (await isFeatureEnabled(FEATURE_FLAGS.ENABLE_BULK_OPERATIONS, userId)) {
  // Show bulk operations UI
}
```

### NEW_DASHBOARD_DESIGN

**Default**: `false` (10% rollout)

**Purpose**: Enable new dashboard design (beta)

**When to Enable**: Gradually increase rollout percentage as design is validated

**Usage**:
```typescript
const useNewDesign = await isFeatureEnabled(
  FEATURE_FLAGS.NEW_DASHBOARD_DESIGN,
  userId
);
```

## 💻 Usage

### Server-Side Usage

```typescript
import { isFeatureEnabled, FEATURE_FLAGS } from "@/lib/feature-flags";

// Check if feature is enabled (no user context)
const enabled = await isFeatureEnabled(FEATURE_FLAGS.ENABLE_RATE_LIMITING);

// Check with user context (for user-specific flags)
const enabled = await isFeatureEnabled(
  FEATURE_FLAGS.ENABLE_BULK_OPERATIONS,
  userId,
  userEmail
);
```

### In API Routes

```typescript
// app/api/admin/approve/route.ts
import { isFeatureEnabled, FEATURE_FLAGS } from "@/lib/feature-flags";

export async function POST(req: NextRequest) {
  const { isAdmin, user } = await checkAdmin(req);
  
  // Check feature flag
  const enableBulkOps = await isFeatureEnabled(
    FEATURE_FLAGS.ENABLE_BULK_OPERATIONS,
    user?.id
  );
  
  if (enableBulkOps) {
    // Handle bulk operations
  }
  
  // ... rest of handler
}
```

### In Middleware

```typescript
// middleware.ts
import { isFeatureEnabled, FEATURE_FLAGS } from "@/lib/feature-flags";

export async function middleware(req: NextRequest) {
  // Check rate limiting flag
  const rateLimitingEnabled = await isFeatureEnabled(
    FEATURE_FLAGS.ENABLE_RATE_LIMITING
  );
  
  if (rateLimitingEnabled) {
    // Apply rate limiting
  }
  
  // ... rest of middleware
}
```

### Getting Detailed Results

```typescript
import { getFeatureFlagResult, FEATURE_FLAGS } from "@/lib/feature-flags";

const result = await getFeatureFlagResult(
  FEATURE_FLAGS.NEW_DASHBOARD_DESIGN,
  userId
);

console.log(result.enabled); // true/false
console.log(result.reason); // "globally_enabled" | "rollout_percentage" | etc.
console.log(result.rollout_percentage); // 10
```

## 🎨 Admin UI

Access the feature flags management UI at `/admin/feature-flags` (admin-only).

### Features

- **View All Flags**: See all feature flags and their current status
- **Toggle Flags**: Enable/disable flags with one click
- **Edit Configuration**: Update rollout percentage, user allowlists, email allowlists
- **View Audit Log**: See history of all flag changes
- **Expand Details**: View detailed information for each flag

### Toggling a Flag

1. Navigate to `/admin/feature-flags`
2. Find the flag you want to toggle
3. Click "Enable" or "Disable"
4. Confirm the change

### Editing Flag Configuration

1. Click "Edit" on a flag
2. Update:
   - **Rollout Percentage**: 0-100%
   - **Enabled for User IDs**: Comma-separated UUIDs
   - **Enabled for Emails**: Comma-separated email addresses
3. Click "Save Changes"

### Viewing Audit Log

1. Click "Show Details" on a flag
2. View audit log entries showing:
   - Action taken (enabled, disabled, updated, etc.)
   - Timestamp
   - User who made the change
   - Old and new values

## 📡 API Reference

### GET /api/admin/feature-flags

Get all feature flags or a specific flag.

**Query Parameters:**
- `flagKey` (optional): Get specific flag
- `includeAudit` (optional): Include audit log (requires `flagKey`)

**Response:**
```json
{
  "ok": true,
  "flags": [
    {
      "id": "uuid",
      "flag_key": "ENABLE_RATE_LIMITING",
      "flag_name": "Rate Limiting",
      "description": "Enable rate limiting for API endpoints",
      "enabled": true,
      "rollout_percentage": 100,
      "enabled_for_users": [],
      "enabled_for_emails": [],
      "metadata": {},
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### PATCH /api/admin/feature-flags

Update a feature flag.

**Request Body:**
```json
{
  "flagKey": "ENABLE_RATE_LIMITING",
  "enabled": true,
  "rollout_percentage": 50,
  "enabled_for_users": ["user-uuid-1", "user-uuid-2"],
  "enabled_for_emails": ["admin@example.com"]
}
```

**Response:**
```json
{
  "ok": true,
  "flag": { /* updated flag object */ }
}
```

## 🧪 Testing

### Unit Tests

```typescript
import { isFeatureEnabled, FEATURE_FLAGS } from "@/lib/feature-flags";

describe("Feature Flags", () => {
  it("should check if feature is enabled", async () => {
    const enabled = await isFeatureEnabled(FEATURE_FLAGS.ENABLE_RATE_LIMITING);
    expect(enabled).toBe(true);
  });
});
```

### Integration Tests

```typescript
// Test feature behavior when enabled/disabled
describe("Bulk Operations", () => {
  it("should show bulk operations when flag is enabled", async () => {
    // Mock flag as enabled
    // Test UI shows bulk operations
  });
  
  it("should hide bulk operations when flag is disabled", async () => {
    // Mock flag as disabled
    // Test UI hides bulk operations
  });
});
```

### Testing Percentage Rollouts

The system uses consistent hashing, so the same user always gets the same result. To test different percentages:

1. Create test users
2. Set rollout percentage
3. Check which users have the feature enabled
4. Adjust percentage and verify changes

## ✅ Best Practices

### 1. Fail Closed

Always assume features are disabled if flags can't be checked:

```typescript
// ✅ Good
if (await isFeatureEnabled(FLAG)) {
  // Feature code
}

// ❌ Bad
const enabled = await isFeatureEnabled(FLAG);
if (enabled === true) { // What if enabled is null/undefined?
  // Feature code
}
```

### 2. Use User Context

Always pass user context for user-specific features:

```typescript
// ✅ Good
const enabled = await isFeatureEnabled(FLAG, userId, userEmail);

// ❌ Bad
const enabled = await isFeatureEnabled(FLAG); // Can't do user-specific rollouts
```

### 3. Gradual Rollouts

Start with low percentages and gradually increase:

1. **0%**: Disabled (default)
2. **10%**: Beta testers
3. **50%**: Half of users
4. **100%**: All users
5. **Remove flag**: Feature is permanent

### 4. Monitor Performance

Monitor feature flag checks for performance:

- Cache flags when possible
- Batch flag checks
- Monitor database query performance

### 5. Clean Up Old Flags

Remove flags after features are permanent:

1. Ensure feature is at 100% rollout
2. Remove flag checks from code
3. Delete flag from database
4. Update documentation

## 🔄 Migration Guide

### Adding a New Feature Flag

1. **Add to database**:
   ```sql
   INSERT INTO public.feature_flags (flag_key, flag_name, description, enabled, rollout_percentage)
   VALUES ('NEW_FEATURE', 'New Feature', 'Description', false, 0);
   ```

2. **Add to code**:
   ```typescript
   // lib/feature-flags.ts
   export const FEATURE_FLAGS = {
     // ... existing flags
     NEW_FEATURE: "NEW_FEATURE",
   } as const;
   ```

3. **Use in code**:
   ```typescript
   if (await isFeatureEnabled(FEATURE_FLAGS.NEW_FEATURE, userId)) {
     // New feature code
   }
   ```

4. **Test**: Test with 0%, 10%, 50%, 100% rollouts

5. **Document**: Add to this documentation

### Removing a Feature Flag

1. **Set to 100%**: Ensure all users have the feature
2. **Remove flag checks**: Remove `isFeatureEnabled` calls
3. **Remove flag constant**: Remove from `FEATURE_FLAGS`
4. **Delete from database**: Remove flag record
5. **Update documentation**: Remove from this guide

### Making a Feature Permanent

1. **Verify 100% rollout**: All users have feature enabled
2. **Remove flag checks**: Replace with direct code
3. **Keep flag in database**: Mark as deprecated (optional)
4. **Update documentation**: Note feature is permanent

## 📚 Additional Resources

- [Feature Flags API](./API.md#feature-flags)
- [Admin UI Guide](./README.md#admin-ui)
- [Database Schema](../db_schema/migrations/005_add_feature_flags.sql)

---

**Last Updated**: 2025-01-01

