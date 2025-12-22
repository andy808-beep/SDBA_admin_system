# Race Day Order Quantities Storage Analysis

## Summary

**Race day arrangement order quantities are NOT currently being persisted after form submission.**

The form collects and sends the data, but the edge function does not store it. This capability needs to be added.

---

## 1. Where Order Quantities Are Currently Stored

### Answer: **NOWHERE** ❌

The race day order quantities are:
- ✅ Collected in the frontend (`ui_bindings.js`, `tn_map.js`)
- ✅ Sent in the submission payload (`submit.js`)
- ✅ Received by the edge function (`submit_registration/index.ts`)
- ❌ **NOT stored in the database**

### Evidence:

**Edge Function Comment (line 639):**
```typescript
// Note: race_day_requests and practice_preferences will be handled after admin approval
// when teams are moved from registration_meta to team_meta
```

**Payload Structure (submit_registration/index.ts:95-98):**
```typescript
race_day?: {
  marqueeQty?: number; steerWithQty?: number; steerWithoutQty?: number;
  junkBoatNo?: string; junkBoatQty?: number; speedBoatNo?: string; speedboatQty?: number;
} | null;
```

The `race_day` field is extracted from the payload (line 210) but **never inserted into any table**.

---

## 2. Relevant Columns in registration_meta and team_meta

### registration_meta Table Structure

**No JSONB columns exist.** The table has these columns:

```sql
CREATE TABLE public.registration_meta (
  id uuid PRIMARY KEY,
  user_id uuid,
  season int,
  event_type text,              -- 'tn', 'wu', 'sc'
  category text,
  division_code text,
  option_choice text,
  team_code text,
  team_name_en citext,
  team_name_tc citext,
  team_name_normalized citext,
  org_name text,
  org_address text,
  team_manager_1 text,
  mobile_1 text,
  email_1 text,
  team_manager_2 text,
  mobile_2 text,
  email_2 text,
  team_manager_3 text,
  mobile_3 text,
  email_3 text,
  package_choice text,          -- WU/SC only
  team_size int,                -- WU/SC only
  registration_id uuid,          -- Link to header (optional)
  status text,                  -- 'pending', 'approved', 'rejected'
  admin_notes text,
  approved_by uuid,
  approved_at timestamptz,
  client_tx_id text,
  event_short_ref text,
  created_at timestamptz,
  updated_at timestamptz
);
```

**Key Points:**
- ❌ No JSONB columns
- ❌ No race_day quantity fields
- ✅ Has `client_tx_id` and `event_short_ref` for grouping registrations

### team_meta Table Structure

**No JSONB columns exist.** Similar structure to `registration_meta`:

```sql
CREATE TABLE public.team_meta (
  id uuid PRIMARY KEY,
  user_id uuid,
  season int,
  category text,
  division_code text,
  option_choice text,
  team_code text,
  team_name_en citext,
  team_name_tc citext,
  team_name_normalized citext,
  org_name text,
  org_address text,
  team_manager_1 text,
  mobile_1 text,
  email_1 text,
  team_manager_2 text,
  mobile_2 text,
  email_2 text,
  team_manager_3 text,
  mobile_3 text,
  email_3 text,
  registration_id uuid,         -- Links back to registration_meta
  created_at timestamptz,
  updated_at timestamptz
);
```

**Key Points:**
- ❌ No JSONB columns
- ❌ No race_day quantity fields
- ✅ Has `registration_id` to link back to `registration_meta`

### race_day_requests Table (Post-Approval)

This table exists but is designed for **post-approval** storage (links to `team_meta`, not `registration_meta`):

```sql
CREATE TABLE public.race_day_requests (
  id uuid PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.team_meta(id) ON DELETE CASCADE,
  
  marquee_qty int NOT NULL DEFAULT 0,
  steer_with_qty int NOT NULL DEFAULT 0,
  steer_without_qty int NOT NULL DEFAULT 0,
  junk_boat_no text,
  junk_boat_qty int NOT NULL DEFAULT 0,
  speed_boat_no text,
  speed_boat_qty int NOT NULL DEFAULT 0,
  
  created_at timestamptz,
  updated_at timestamptz,
  
  UNIQUE (team_id)  -- One row per team
);
```

**Key Points:**
- ✅ Has all the quantity fields needed
- ❌ Links to `team_meta` (not `registration_meta`)
- ❌ Designed for post-approval workflow
- ❌ Would create one row per team (not per registration)

---

## 3. How Form Submission Handles Race Day Quantities

### Frontend Collection (`ui_bindings.js:778-786`)

```javascript
// Race day
if (!raceDayHidden) {
    const rdInputs = dom.qa('[data-group="race_day"]');
    for (const el of rdInputs) {
        const item_code = el.getAttribute('data-code');
        const qty = Number(el.value || 0);
        if (item_code && qty > 0) state.race_day.push({ item_code, qty });
    }
}
```

**Format:** Array of `{ item_code, qty }` objects

### Payload Structure (`submit.js:83`)

```javascript
const payload = {
    client_tx_id: getClientTxId(),
    event_short_ref: base.event_short_ref || getEventShortRef(),
    contact: base.contact || {},
    teams: base.teams || [],
    race_day: base.race_day || [],  // Array of { item_code, qty }
    packages: base.packages || [],
    practice: ...,
    hp: readHoneypot()
};
```

### Edge Function Reception (`submit_registration/index.ts:210`)

```typescript
const {
  eventShortRef, category, season, org_name, org_address,
  counts, team_names = [], team_names_en = [], team_names_tc = [], 
  team_options = [], managers = [], 
  race_day = null,  // ← Extracted but never used
  practice: initialPractice = [],
} = payload ?? {} as Payload;
```

**The `race_day` variable is extracted but never persisted.**

---

## 4. Example of What Should Be Stored

### User Scenario:
- Registers **5 teams** (Team A, B, C, D, E)
- Orders:
  - **5 marquees** (one per team)
  - **4 with-practice-steerers** (for Teams A, B, C, D)
  - **1 without-practice-steerer** (for Team E)
  - **1 junk boat** (registration-wide)
  - **2 speedboats** (registration-wide)

### Current Behavior:
- ❌ Data is sent in payload
- ❌ Data is **NOT stored** in database
- ❌ Data is **LOST** after submission

### Required Behavior:
- ✅ Store quantities **ONCE per registration** (not per team)
- ✅ Attribute to **primary team** (Team A - first team in registration)
- ✅ Store in a way that links to the registration group

### Proposed Storage Format:

**Option A: Add JSONB column to registration_meta**
```sql
ALTER TABLE registration_meta ADD COLUMN race_day_quantities JSONB;
```

**Example data for primary team (Team A):**
```json
{
  "marquee_qty": 5,
  "steer_with_qty": 4,
  "steer_without_qty": 1,
  "junk_boat_qty": 1,
  "junk_boat_no": "ABC-123",
  "speed_boat_qty": 2,
  "speed_boat_no": "XYZ-456"
}
```

**Option B: Create registration-level race_day_requests table**
```sql
CREATE TABLE public.registration_race_day_requests (
  id uuid PRIMARY KEY,
  registration_group_id uuid,  -- Links to first team's registration_meta.id
  client_tx_id text,            -- Alternative grouping key
  event_short_ref text,
  
  marquee_qty int NOT NULL DEFAULT 0,
  steer_with_qty int NOT NULL DEFAULT 0,
  steer_without_qty int NOT NULL DEFAULT 0,
  junk_boat_no text,
  junk_boat_qty int NOT NULL DEFAULT 0,
  speed_boat_no text,
  speed_boat_qty int NOT NULL DEFAULT 0,
  
  created_at timestamptz,
  updated_at timestamptz,
  
  UNIQUE (registration_group_id)  -- One row per registration group
);
```

---

## 5. Recommendations

### Immediate Action Required:

1. **Add storage capability** for race day quantities at registration time
2. **Store once per registration** (not per team)
3. **Link to primary team** (first team in the registration group)
4. **Preserve data** through the approval workflow

### Implementation Options:

**Option 1: JSONB Column (Simpler)**
- Add `race_day_quantities JSONB` to `registration_meta`
- Store only on the **primary team's** registration record
- Identify primary team as first team with matching `client_tx_id` and `event_short_ref`

**Option 2: Separate Table (More Normalized)**
- Create `registration_race_day_requests` table
- Link via `client_tx_id` + `event_short_ref` or `registration_group_id`
- One row per registration submission

**Option 3: Extend Existing Table (Post-Approval)**
- Modify `race_day_requests` to also accept `registration_id` (nullable)
- Store at submission time with `registration_id` set
- After approval, update `team_id` and clear `registration_id`

### Recommended Approach: **Option 1 (JSONB Column)**

**Pros:**
- ✅ Simple to implement
- ✅ No new table needed
- ✅ Easy to query and update
- ✅ Flexible for future additions

**Cons:**
- ⚠️ Less normalized (but acceptable for this use case)

**Implementation Steps:**

1. Add column to `registration_meta`:
   ```sql
   ALTER TABLE public.registration_meta 
   ADD COLUMN race_day_quantities JSONB;
   ```

2. Update edge function to store race_day data:
   ```typescript
   // In submit_registration/index.ts, after creating registrationsToInsert
   // Identify primary team (first team)
   const primaryTeamIndex = 0;
   
   // Transform race_day array to JSONB object
   const raceDayQuantities: any = {};
   if (race_day && Array.isArray(race_day)) {
     for (const item of race_day) {
       switch (item.item_code) {
         case 'rd_marquee':
           raceDayQuantities.marquee_qty = item.qty;
           break;
         case 'rd_steerer':
           raceDayQuantities.steer_with_qty = item.qty;
           break;
         case 'rd_steerer_no_practice':
           raceDayQuantities.steer_without_qty = item.qty;
           break;
         case 'rd_junk':
           raceDayQuantities.junk_boat_qty = item.qty;
           raceDayQuantities.junk_boat_no = item.boat_no || null;
           break;
         case 'rd_speedboat':
           raceDayQuantities.speed_boat_qty = item.qty;
           raceDayQuantities.speed_boat_no = item.boat_no || null;
           break;
       }
     }
   }
   
   // Store only on primary team's registration
   if (Object.keys(raceDayQuantities).length > 0) {
     registrationsToInsert[primaryTeamIndex].race_day_quantities = raceDayQuantities;
   }
   ```

3. After approval, copy to `race_day_requests`:
   ```sql
   -- In approve_registration() function
   -- After inserting into team_meta, check if race_day_quantities exists
   -- and create race_day_requests record for the primary team
   ```

---

## 6. Current Data Flow

```
User fills form
    ↓
Frontend collects race_day quantities
    ↓
Payload sent to edge function
    ↓
Edge function receives race_day
    ↓
❌ DATA IS LOST (not stored)
    ↓
Registration records created (without race_day data)
    ↓
Admin approval workflow
    ↓
Teams moved to team_meta
    ↓
race_day_requests table remains empty
```

---

## 7. Required Data Flow

```
User fills form
    ↓
Frontend collects race_day quantities
    ↓
Payload sent to edge function
    ↓
Edge function receives race_day
    ↓
✅ Store in registration_meta.race_day_quantities (primary team only)
    ↓
Registration records created (with race_day data on primary team)
    ↓
Admin approval workflow
    ↓
Teams moved to team_meta
    ↓
✅ Copy race_day_quantities to race_day_requests (primary team only)
```

---

## Conclusion

**Race day order quantities are NOT currently being persisted.** The system needs to be updated to:

1. Store race day quantities at submission time
2. Store once per registration (on primary team)
3. Preserve through approval workflow
4. Transfer to `race_day_requests` after approval

The recommended solution is to add a `race_day_quantities JSONB` column to `registration_meta` and update the edge function to populate it.
