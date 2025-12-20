# User Identification & Tracking Analysis

This document analyzes user identification, email collection, and tracking mechanisms in the registration system.

---

## 1. Email Collection Before Form Submission

### **Email is NOT collected early - only at Step 2 (Organization & Managers)**

#### TN Form Email Collection

**No separate contact email field exists.**

Email is collected only through **Team Manager fields** in Step 2:

```javascript
// From tn_wizard.js - Step 2 (Organization & Managers)
// Manager 1 (Required)
<input type="email" id="manager1Email" name="manager1Email" required />
// Manager 2 (Required)
<input type="email" id="manager2Email" name="manager2Email" required />
// Manager 3 (Optional)
<input type="email" id="manager3Email" name="manager3Email" />
```

**Collection Timeline:**
- Step 0: Race Info - No email collection
- Step 1: Team Details - No email collection
- **Step 2: Organization & Managers** - ✅ Email collected here (manager emails)
- Step 3: Race Day - No email collection
- Step 4: Practice Booking - No email collection
- Step 5: Summary - No email collection

#### WU/SC Form Email Collection

**Same pattern as TN form** - no separate contact email field:

```javascript
// From wu_sc_wizard.js - Step 2 (Organization & Managers)
// Manager 1 (Required)
<input type="email" id="manager1Email" name="manager1Email" required />
// Manager 2 (Required)
<input type="email" id="manager2Email" name="manager2Email" required />
// Manager 3 (Optional)
<input type="email" id="manager3Email" name="manager3Email" />
```

**Collection Timeline:**
- Step 0: Race Info - No email collection
- Step 1: Team Details - No email collection
- **Step 2: Organization & Managers** - ✅ Email collected here (manager emails)
- Step 3: Race Day - No email collection
- Step 4: Summary - No email collection

#### Single-Page Form Email Collection

**Has optional contact email field**, but it's not required early:

```javascript
// From ui_bindings.js
const emailField = renderField('contact_email', { 
  type: 'email', 
  required: false,  // Optional!
  label: getLabel(labels, 'contact_email', 'Email'),
  placeholder: getLabel(labels, 'contact_email_placeholder', 'Enter your email')
}, labels);
```

**Note:** Single-page forms are not used for TN/WU/SC wizards - they use multi-step wizards instead.

### Email Storage

**Manager emails are saved to sessionStorage when Step 2 is validated:**

```javascript
// From tn_wizard.js (saveStep2Data)
sessionStorage.setItem('tn_manager1_email', manager1Email.value.trim());
sessionStorage.setItem('tn_manager2_email', manager2Email.value.trim());
sessionStorage.setItem('tn_manager3_email', manager3Email.value.trim());

// From wu_sc_wizard.js (validateStep2)
sessionStorage.setItem(`${eventType}_manager1Email`, manager1Email.value.trim());
sessionStorage.setItem(`${eventType}_manager2Email`, manager2Email.value.trim());
sessionStorage.setItem(`${eventType}_manager3Email`, manager3Email.value.trim());
```

### Email Validation

**Real-time validation occurs on blur:**

```javascript
// From wu_sc_wizard.js (setupStep2Validation)
field.addEventListener('blur', () => {
  if (field.value.trim()) {
    if (!isValidEmail(field.value.trim())) {
      window.errorSystem.showFieldError(fieldId, 'invalidEmail', {
        scrollTo: false,
        focus: false
      });
    } else {
      window.errorSystem.clearFieldError(fieldId);
    }
  }
});
```

---

## 2. Are Users Anonymous Until Final Submit?

### **YES - Users are completely anonymous until final submit**

#### No Authentication Required

**The system does NOT require user authentication:**

```javascript
// From supabase_config.js
export const sb = createClient(URL, KEY, { auth: { persistSession: false } });
```

**Key Points:**
- `persistSession: false` - No session persistence
- No login required
- No user accounts
- No authentication checks

#### Database Schema

**`user_id` field exists but is NULL for anonymous submissions:**

```sql
-- From db_schema/main.sql
create table public.registration_meta (
  id uuid primary key default gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL for anonymous users
  -- ... other fields ...
);
```

**Row Level Security (RLS) Policy:**

```sql
-- Policy for anonymous inserts (form submissions)
CREATE POLICY "Allow anonymous inserts" ON public.registration_meta
    FOR INSERT 
    TO anon 
    WITH CHECK (true);
```

**This means:**
- Anonymous users (`anon` role) can insert registrations
- `user_id` will be `NULL` for all form submissions
- No user identification until data is submitted

#### Edge Function Handling

**Edge function does NOT set `user_id`:**

```typescript
// From submit_registration/index.ts
registrationsToInsert = teams.map((team: any) => ({
  event_type: eventType,
  event_short_ref: eventShortRef,
  client_tx_id: payload.client_tx_id,
  // user_id is NOT set - remains NULL
  // ... other fields ...
}));
```

**No authentication check in edge function:**
- No `auth.uid()` calls
- No user lookup
- No session validation

---

## 3. Existing Session/Tracking Mechanisms

### Client Transaction ID (`client_tx_id`)

**Primary tracking mechanism for form submissions:**

#### Generation & Storage

```javascript
// From submit.js (getClientTxId)
function getClientTxId() {
  const key = 'raceApp:client_tx_id';
  let id = localStorage.getItem(key);
  if (!id) {
    // Generate UUID or fallback to timestamp-based ID
    id = (self.crypto?.randomUUID && self.crypto.randomUUID()) || 
         String(Date.now()) + Math.random().toString(16).slice(2);
    localStorage.setItem(key, id);
  }
  return id;
}
```

**Characteristics:**
- **Generated once** per browser/device
- **Stored in localStorage** (persists across sessions)
- **Reused for all submissions** from same browser
- **Purpose**: Idempotency (prevents duplicate submissions)

#### Usage

```javascript
// Included in every payload
const payload = {
  client_tx_id: getClientTxId(),
  // ... other fields ...
};
```

**Database Index:**
```sql
CREATE INDEX idx_registration_meta_client_tx 
ON public.registration_meta (event_short_ref, client_tx_id);
```

**Note:** The unique constraint on `(event_short_ref, client_tx_id)` was removed to allow multiple teams per submission.

### SessionStorage (Form Data)

**Temporary storage for form data between steps:**

#### Storage Keys

**TN Form:**
- `tn_current_step` - Current step number
- `tn_team_count` - Number of teams
- `tn_team_name_en_{i}`, `tn_team_name_tc_{i}` - Team names
- `tn_org_name`, `tn_mailing_address` - Organization info
- `tn_manager1_email`, `tn_manager1_phone`, `tn_manager1_name` - Manager 1
- `tn_manager2_email`, `tn_manager2_phone`, `tn_manager2_name` - Manager 2
- `tn_manager3_email`, `tn_manager3_phone`, `tn_manager3_name` - Manager 3
- `tn_race_day` - Race day data (JSON)
- `tn_practice_all_teams` - Practice data (JSON)

**WU/SC Form:**
- `{eventType}_current_step` - Current step number
- `{eventType}_team_count` - Number of teams
- `{eventType}_team{i}_name_en`, `{eventType}_team{i}_name_tc` - Team names
- `{eventType}_team{i}_boatType`, `{eventType}_team{i}_division` - Team details
- `{eventType}_orgName`, `{eventType}_mailingAddress` - Organization info
- `{eventType}_manager1Email`, `{eventType}_manager1Phone`, `{eventType}_manager1Name` - Manager 1
- `{eventType}_manager2Email`, `{eventType}_manager2Phone`, `{eventType}_manager2Name` - Manager 2
- `{eventType}_manager3Email`, `{eventType}_manager3Phone`, `{eventType}_manager3Name` - Manager 3
- `{eventType}_marqueeQty`, `{eventType}_steerWithQty`, etc. - Race day data

**Characteristics:**
- **Session-scoped** - Cleared when browser tab closes
- **Not user identification** - Just form state
- **No cross-session persistence**

### LocalStorage (Persistent Tracking)

**Persistent storage across browser sessions:**

#### Client Transaction ID
```javascript
localStorage.setItem('raceApp:client_tx_id', id);
```

#### Receipt Storage
```javascript
// From submit.js (saveReceipt)
function saveReceipt({ registration_id, team_codes, email }) {
  const receipt = {
    registration_id,
    team_codes,
    event_short_ref: getEventShortRef(),
    email: email || '',  // Manager email from response
    ts: Date.now(),
    version: 1
  };
  localStorage.setItem(`raceApp:receipt:${registration_id}`, JSON.stringify(receipt));
  localStorage.setItem('raceApp:last_receipt', JSON.stringify(receipt));
}
```

**Note:** The `email` in receipt comes from the **server response**, not from form submission. It's likely the first manager's email.

#### Config Cache
```javascript
// From config_loader.js
localStorage.setItem(`raceApp:config:${eventShortRef}`, JSON.stringify(config));
```

### Rate Limiting Tracking

**Tracks submission attempts to prevent abuse:**

```javascript
// From submit.js
const RATE_LIMIT_CONFIG = {
  maxRequests: 3,
  windowMs: 60000, // 1 minute
  storage: 'localStorage' // Shared across tabs
};

const rateLimiter = new RateLimiter(RATE_LIMIT_CONFIG);
```

**Storage:**
- Uses `localStorage` (shared across tabs)
- Tracks request timestamps
- Enforces 3 submissions per minute limit

### Sentry Error Tracking (Optional)

**Error monitoring with privacy filters:**

```javascript
// From error-handler.js
export function setUserContext(user = {}) {
  if (isSentryAvailable()) {
    // Mask email for privacy
    const maskedUser = { ...user };
    if (maskedUser.email) {
      maskedUser.email = maskedUser.email.replace(/(.{2}).*(@.*)/, '$1***$2');
    }
    window.Sentry.setUser(maskedUser);
  }
}
```

**Note:** Sentry is optional and only tracks errors, not user identification.

### Breadcrumb Tracking

**Action tracking for debugging:**

```javascript
// From error-handler.js
addBreadcrumb('Form submission started', 'user', 'info', {
  eventRef: payload.event_short_ref,
  teamCount: payload.teams?.length || 0,
  hasPractice: !!payload.practice,
  raceDayItems: payload.race_day?.length || 0
});
```

**Purpose:** Debugging and error context, not user identification.

---

## Summary

### 1. Email Collection
- ❌ **No early email collection**
- ✅ **Email collected at Step 2** (Organization & Managers step)
- ✅ **Manager emails only** - no separate contact email field
- ✅ **Real-time validation** on blur

### 2. User Anonymity
- ✅ **Users are completely anonymous** until final submit
- ❌ **No authentication required**
- ❌ **No user accounts**
- ❌ **No login system**
- ✅ **`user_id` is NULL** for all form submissions
- ✅ **Anonymous inserts allowed** via RLS policy

### 3. Tracking Mechanisms
- ✅ **`client_tx_id`** - Primary tracking (localStorage, persistent)
- ✅ **sessionStorage** - Form state between steps (session-scoped)
- ✅ **localStorage** - Receipts, config cache (persistent)
- ✅ **Rate limiting** - Submission attempt tracking (localStorage)
- ⚠️ **Sentry** - Optional error tracking (not user identification)
- ⚠️ **Breadcrumbs** - Debug tracking (not user identification)

### Key Insights

1. **No user identification before submission** - System is fully anonymous
2. **Email collected mid-form** - Step 2, not at the beginning
3. **Client transaction ID is the primary tracking mechanism** - Not user-based
4. **No authentication system** - All submissions are anonymous
5. **SessionStorage is temporary** - Cleared on tab close, not for user tracking
6. **LocalStorage persists** - But only for client_tx_id and receipts, not user identity

---

## Implications for Auto-Save

If implementing auto-save with user identification:

1. **No existing user identification** - Would need to add authentication or email collection early
2. **`client_tx_id` could be used** - But it's device/browser-specific, not user-specific
3. **Manager emails available at Step 2** - Could potentially use first manager email for identification
4. **SessionStorage is temporary** - Not suitable for cross-session persistence
5. **LocalStorage persists** - Could store auto-save data keyed by `client_tx_id` or email

---

## Related Files

- `public/js/submit.js` - Client transaction ID generation
- `public/js/tn_wizard.js` - TN form email collection (Step 2)
- `public/js/wu_sc_wizard.js` - WU/SC form email collection (Step 2)
- `public/js/ui_bindings.js` - Single-page form contact email (optional)
- `public/supabase_config.js` - Supabase client (no auth persistence)
- `db_schema/main.sql` - Database schema (user_id nullable)
- `supabase/functions/submit_registration/index.ts` - Edge function (no user_id setting)

