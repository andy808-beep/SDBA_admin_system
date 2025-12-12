# Feature Flags Usage Examples

Practical examples of using feature flags in the SDBA Admin System.

## Example 1: Conditional Rate Limiting

```typescript
// middleware.ts
import { isFeatureEnabled, FEATURE_FLAGS } from "@/lib/feature-flags";

export async function middleware(req: NextRequest) {
  // Check if rate limiting is enabled
  const rateLimitingEnabled = await isFeatureEnabled(
    FEATURE_FLAGS.ENABLE_RATE_LIMITING
  );
  
  if (rateLimitingEnabled && url.pathname.startsWith("/api/public/")) {
    const rateLimitResult = await checkPublicApiLimit(clientIp);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }
  }
  
  // ... rest of middleware
}
```

## Example 2: Bulk Operations UI

```typescript
// app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { isFeatureEnabled, FEATURE_FLAGS } from "@/lib/feature-flags";

export default function AdminPage() {
  const [bulkOpsEnabled, setBulkOpsEnabled] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  useEffect(() => {
    // Check feature flag on mount
    const checkFlag = async () => {
      const response = await fetch("/api/admin/feature-flags?flagKey=ENABLE_BULK_OPERATIONS");
      const data = await response.json();
      setBulkOpsEnabled(data.flag?.enabled || false);
    };
    checkFlag();
  }, []);
  
  return (
    <div>
      {bulkOpsEnabled && (
        <div className="bulk-operations-toolbar">
          <button onClick={handleBulkApprove}>
            Approve Selected ({selectedItems.length})
          </button>
          <button onClick={handleBulkReject}>
            Reject Selected ({selectedItems.length})
          </button>
        </div>
      )}
      {/* ... rest of UI */}
    </div>
  );
}
```

## Example 3: Email Notifications

```typescript
// app/api/admin/approve/route.ts
import { isFeatureEnabled, FEATURE_FLAGS } from "@/lib/feature-flags";

export async function POST(req: NextRequest) {
  const { isAdmin, user } = await checkAdmin(req);
  
  // ... approval logic ...
  
  // Send email notification if enabled
  const emailNotificationsEnabled = await isFeatureEnabled(
    FEATURE_FLAGS.ENABLE_EMAIL_NOTIFICATIONS,
    user?.id
  );
  
  if (emailNotificationsEnabled) {
    await sendEmailNotification({
      to: registrationEmail,
      subject: "Registration Approved",
      body: "Your registration has been approved.",
    });
  }
  
  return NextResponse.json({ ok: true });
}
```

## Example 4: Advanced Filtering

```typescript
// app/admin/page.tsx
"use client";

export default function AdminPage() {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  useEffect(() => {
    const checkFlag = async () => {
      const response = await fetch("/api/admin/feature-flags?flagKey=ENABLE_ADVANCED_FILTERING");
      const data = await response.json();
      setShowAdvancedFilters(data.flag?.enabled || false);
    };
    checkFlag();
  }, []);
  
  return (
    <div>
      {/* Basic filters - always visible */}
      <div className="basic-filters">
        <input type="text" placeholder="Search..." />
        <select>
          <option>All Status</option>
          <option>Pending</option>
          <option>Approved</option>
        </select>
      </div>
      
      {/* Advanced filters - only if flag enabled */}
      {showAdvancedFilters && (
        <div className="advanced-filters">
          <input type="date" placeholder="Date Range" />
          <select>
            <option>All Categories</option>
            <option>Men's Open</option>
            <option>Ladies' Open</option>
          </select>
          {/* More advanced options */}
        </div>
      )}
    </div>
  );
}
```

## Example 5: New Dashboard Design

```typescript
// app/admin/page.tsx
"use client";

export default function AdminPage() {
  const [useNewDesign, setUseNewDesign] = useState(false);
  
  useEffect(() => {
    const checkFlag = async () => {
      // Get user ID from session
      const userResponse = await fetch("/api/auth/user");
      const userData = await userResponse.json();
      
      // Check flag with user context for percentage rollouts
      const flagResponse = await fetch(
        `/api/admin/feature-flags?flagKey=NEW_DASHBOARD_DESIGN`
      );
      const flagData = await flagResponse.json();
      
      if (flagData.flag?.enabled) {
        // Check if user is in rollout percentage
        const result = await fetch("/api/check-feature-flag", {
          method: "POST",
          body: JSON.stringify({
            flagKey: "NEW_DASHBOARD_DESIGN",
            userId: userData.user?.id,
          }),
        });
        const { enabled } = await result.json();
        setUseNewDesign(enabled);
      }
    };
    checkFlag();
  }, []);
  
  if (useNewDesign) {
    return <NewDashboardDesign />;
  }
  
  return <OldDashboardDesign />;
}
```

## Example 6: Server-Side Feature Check

```typescript
// app/api/admin/export/route.ts
import { isFeatureEnabled, FEATURE_FLAGS } from "@/lib/feature-flags";

export async function POST(req: NextRequest) {
  const { isAdmin, user } = await checkAdmin(req);
  
  // Check if advanced export features are enabled
  const advancedExportEnabled = await isFeatureEnabled(
    FEATURE_FLAGS.ENABLE_ADVANCED_FILTERING,
    user?.id
  );
  
  const body = await req.json();
  
  // Only allow advanced filters if flag is enabled
  if (body.advancedFilters && !advancedExportEnabled) {
    throw ApiErrors.forbidden("Advanced filters not enabled");
  }
  
  // ... export logic ...
}
```

## Example 7: Percentage Rollout Testing

```typescript
// Test script to verify percentage rollouts
import { isFeatureEnabled, FEATURE_FLAGS } from "@/lib/feature-flags";

async function testRollout() {
  const testUsers = [
    "user-1-uuid",
    "user-2-uuid",
    "user-3-uuid",
    // ... more test users
  ];
  
  const results = await Promise.all(
    testUsers.map(async (userId) => {
      const enabled = await isFeatureEnabled(
        FEATURE_FLAGS.NEW_DASHBOARD_DESIGN,
        userId
      );
      return { userId, enabled };
    })
  );
  
  const enabledCount = results.filter((r) => r.enabled).length;
  const percentage = (enabledCount / results.length) * 100;
  
  console.log(`Rollout percentage: ${percentage}%`);
  console.log(`Enabled users: ${enabledCount}/${results.length}`);
}
```

## Example 8: User Allowlist

```typescript
// Enable feature for specific users
// In admin UI or via API:

// PATCH /api/admin/feature-flags
{
  "flagKey": "ENABLE_BULK_OPERATIONS",
  "enabled_for_users": [
    "admin-user-uuid-1",
    "admin-user-uuid-2"
  ]
}

// These users will have the feature enabled regardless of rollout percentage
```

## Example 9: Email Allowlist

```typescript
// Enable feature for specific email addresses
// Useful for testing with external users

// PATCH /api/admin/feature-flags
{
  "flagKey": "NEW_DASHBOARD_DESIGN",
  "enabled_for_emails": [
    "beta-tester-1@example.com",
    "beta-tester-2@example.com"
  ]
}
```

## Example 10: Gradual Rollout Strategy

```typescript
// Gradual rollout workflow:

// Week 1: 0% - Feature disabled
await updateFeatureFlag("NEW_FEATURE", { enabled: true, rollout_percentage: 0 });

// Week 2: 10% - Beta testers
await updateFeatureFlag("NEW_FEATURE", { enabled: true, rollout_percentage: 10 });

// Week 3: 50% - Half of users
await updateFeatureFlag("NEW_FEATURE", { enabled: true, rollout_percentage: 50 });

// Week 4: 100% - All users
await updateFeatureFlag("NEW_FEATURE", { enabled: true, rollout_percentage: 100 });

// After validation: Remove flag checks, make feature permanent
```

---

**Last Updated**: 2025-01-01

