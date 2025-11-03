# Admin System Testing Checklist

This document outlines the manual testing steps for the admin system.

## Prerequisites

1. Ensure your `.env.local` file has valid Supabase credentials:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. Make sure the dev server is running:
   ```bash
   npm run dev
   ```

3. Have an admin user account in Supabase with admin role/metadata set.

## Phase 1: Data Setup

### Step 1.1: Insert Test Data

1. Open Supabase SQL Editor or connect via psql
2. Run the SQL from `test_setup.sql`:
   ```bash
   # Option 1: Via Supabase Dashboard SQL Editor
   # Copy contents of test_setup.sql and paste into SQL Editor, then Execute
   
   # Option 2: Via psql (if you have connection string)
   # psql -h your-db-host -U postgres -d postgres -f test_setup.sql
   ```

3. Verify 3 rows were inserted:
   ```sql
   SELECT COUNT(*) FROM public.registration_meta WHERE status = 'pending';
   -- Should return 3
   ```

**Expected Result:** ✅ 3 rows inserted with:
   - TN/L (Traditional, Ladies division)
   - WU/WX (Warm-Up, Mixed division)  
   - SC/SM (Sprint Challenge, Men division)

---

## Phase 2: API Testing

### Step 2.1: Test `/api/admin/list` API

1. **With Admin Session:**
   - Open browser DevTools (Network tab)
   - Navigate to `/admin#applications`
   - Check the API call to `/api/admin/list?page=1&pageSize=2&status=pending`
   - Inspect response:
     ```json
     {
       "ok": true,
       "page": 1,
       "pageSize": 2,
       "total": 3,
       "items": [
         // Should have <= 2 items
       ]
     }
     ```

   **Expected Result:** ✅ `ok: true`, `items.length <= 2`, `total >= 3`

2. **Without Admin Session (403 Test):**
   - Open a new incognito/private window
   - Open DevTools → Application/Storage → Clear all cookies
   - Try to access: `http://localhost:3000/api/admin/list?page=1&pageSize=2&status=pending`
   - Or use curl without auth:
     ```bash
     curl http://localhost:3000/api/admin/list?page=1&pageSize=2&status=pending
     ```

   **Expected Result:** ✅ Returns `403 Forbidden` or redirects to `/auth`

### Step 2.2: Test `/api/admin/counters` API

1. **With Admin Session:**
   - Navigate to `/admin#overview`
   - Check the API call to `/api/admin/counters`
   - Inspect response:
     ```json
     {
       "ok": true,
       "total": 3,
       "pending": 3,
       "approved": 0,
       "rejected": 0,
       "new_today": 3
     }
     ```

   **Expected Result:** ✅ `ok: true`, `pending >= 3`

2. **Without Admin Session (403 Test):**
   - In incognito window or with cleared cookies:
     ```bash
     curl http://localhost:3000/api/admin/counters
     ```

   **Expected Result:** ✅ Returns `403 Forbidden`

---

## Phase 3: UI Testing

### Step 3.1: Verify Applications View

1. Navigate to `http://localhost:3000/admin#applications`
2. Verify you see 3 rows in the table
3. Check columns display:
   - Team Name
   - Team Code
   - Event (TN/WU/SC)
   - Division
   - Manager Name/Email
   - Created At
   - Status (should show "Pending")
   - Approve button visible for pending rows

**Expected Result:** ✅ Table shows 3 rows with all columns populated correctly

### Step 3.2: Test Approval Flow

1. In `/admin#applications`, click "Approve" button on one TN row
2. Wait for:
   - Button shows "Approving..." (disabled state)
   - Success toast/alert: "Registration approved! Team ID: ..."
   - List automatically refetches
   - Row count decreases from 3 to 2

**Expected Result:** ✅ 
- Success toast appears
- List refreshes automatically
- Pending count decreases by 1
- Approved row no longer shows in pending list

### Step 3.3: Verify Overview Counters Update

1. Navigate to `/admin#overview`
2. Check KPI cards:
   - **New Today:** Should show count
   - **Approved:** Should increment after approval
   - **Pending:** Should decrement after approval
   - **Total Submissions:** Should remain same or increment

3. Refresh the page or navigate back to `#overview`
4. Verify counters update automatically

**Expected Result:** ✅ 
- Counters reflect current database state
- After approval: Pending decreases, Approved increases

### Step 3.4: Test Realtime Badge Increment

1. Start on `/admin#overview` (NOT on #applications)
2. Open Supabase SQL Editor
3. Insert a new pending registration:
   ```sql
   INSERT INTO public.registration_meta (
     season, event_type, division_code, team_code, team_name,
     team_manager_1, team_manager_2, option_choice, status
   ) VALUES (
     2025, 'tn', 'L', 'S25-L999', 'Realtime Test Team',
     'Manager One', 'Manager Two', 'Option 1', 'pending'
   );
   ```

4. Watch the "Applications" badge in the sidebar
5. Verify the badge increments by 1 (shows red badge with count)

**Expected Result:** ✅ 
- Badge appears/updates on sidebar "Applications" link
- Badge increments without page refresh
- Badge shows correct count

6. Navigate to `/admin#applications`
7. Verify badge resets to 0 (or hidden if no pending)
8. New row should appear in the list automatically

**Expected Result:** ✅ 
- Badge resets when viewing #applications
- New row appears in list automatically

---

## Phase 4: Database Verification

### Step 4.1: Verify TN Approval Creates team_meta Row

1. After approving a TN registration (from Step 3.2)
2. Run verification query (from `test_verification.sql`):
   ```sql
   SELECT 
     tm.id as team_meta_id,
     tm.team_code,
     tm.team_name,
     rm.team_code as registration_team_code,
     rm.status as registration_status
   FROM public.team_meta tm
   LEFT JOIN public.registration_meta rm ON tm.registration_id = rm.id
   WHERE rm.event_type = 'tn' AND rm.status = 'approved'
   ORDER BY rm.approved_at DESC
   LIMIT 1;
   ```

**Expected Result:** ✅ 
- Row exists in `team_meta` table
- `team_meta.team_code` matches `registration_meta.team_code`
- `registration_meta.status` = 'approved'
- `registration_meta.approved_by` is set (admin user ID)
- `registration_meta.approved_at` is set (timestamp)

### Step 4.2: Verify WU/SC Approval (Future Test)

**Note:** This can be tested later when WU/SC approval is fully implemented.

1. Approve a WU registration
2. Check `wu_team_meta` table:
   ```sql
   SELECT * FROM public.wu_team_meta 
   WHERE registration_id = '<approved_registration_id>';
   ```

**Expected Result:** ✅ 
- Row exists in `wu_team_meta`
- `team_code` is auto-generated by trigger (format: S25-WX###)
- `registration_meta.status` = 'approved'

3. Approve an SC registration
4. Check `sc_team_meta` table:
   ```sql
   SELECT * FROM public.sc_team_meta 
   WHERE registration_id = '<approved_registration_id>';
   ```

**Expected Result:** ✅ 
- Row exists in `sc_team_meta`
- `team_code` is auto-generated by trigger (format: S25-SM###)
- `registration_meta.status` = 'approved'

---

## Quick Test Script

You can also use this Node.js script to test APIs programmatically (requires admin session cookie):

```javascript
// test-api.js
const baseUrl = 'http://localhost:3000';

// Test list API
async function testListAPI() {
  const response = await fetch(`${baseUrl}/api/admin/list?page=1&pageSize=2&status=pending`, {
    credentials: 'include', // Include cookies
  });
  const data = await response.json();
  console.log('List API:', data);
  console.assert(data.ok === true, 'List API should return ok:true');
  console.assert(data.items.length <= 2, 'Items should be <= pageSize');
  console.assert(data.total >= 3, 'Total should be >= 3');
}

// Test counters API
async function testCountersAPI() {
  const response = await fetch(`${baseUrl}/api/admin/counters`, {
    credentials: 'include',
  });
  const data = await response.json();
  console.log('Counters API:', data);
  console.assert(data.ok === true, 'Counters API should return ok:true');
  console.assert(data.pending >= 3, 'Pending should be >= 3');
}

// Run tests (must be logged in as admin first)
testListAPI();
testCountersAPI();
```

---

## Test Results Template

```
Date: __________
Tester: __________

✅ Data Setup
  - [ ] 3 test rows inserted successfully

✅ API Tests
  - [ ] /api/admin/list returns ok:true with correct pagination
  - [ ] /api/admin/counters returns ok:true with pending >= 3
  - [ ] APIs return 403 without admin session

✅ UI Tests
  - [ ] Applications view shows 3 rows
  - [ ] Approve button works, shows success toast
  - [ ] List decreases after approval
  - [ ] Overview counters update correctly
  - [ ] Realtime badge increments when not on #applications

✅ Database Verification
  - [ ] TN approval creates row in team_meta with same team_code
  - [ ] registration_meta.status updated to 'approved'
  - [ ] approved_by and approved_at are set

Notes:
_________________________________________________________________
_________________________________________________________________
```

---

## Troubleshooting

### API returns 401/403
- Ensure you're logged in as admin user
- Check admin user has `is_admin: true` in user_metadata or roles include "admin"
- Verify cookies are being sent with requests

### Realtime badge not incrementing
- Check Supabase Realtime is enabled for `registration_meta` table
- Verify subscription channel is active (check browser console)
- Ensure RLS policies allow reading registration_meta

### Approval doesn't create team_meta row
- Check SQL function `approve_registration` exists and is correct
- Verify trigger for team_code assignment is active
- Check for database errors in Supabase logs

### Counters not updating
- Refresh the page or navigate away and back to #overview
- Check API is being called (Network tab)
- Verify `/api/admin/counters` returns correct data

