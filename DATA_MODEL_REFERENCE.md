# Data Model & Patterns Reference for Admin Edit Functionality

## 1. `registration_meta` Table Schema

**Full table definition** (from `db_schema/main.sql` lines 448-517):

```sql
CREATE TABLE public.registration_meta (
  -- Primary key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User reference
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Season
  season int NOT NULL CHECK (season BETWEEN 2000 AND 2100),
  
  -- Event type (TN/WU/SC)
  event_type text NOT NULL DEFAULT 'tn' CHECK (event_type IN ('tn', 'wu', 'sc')),
  
  -- Division/Category
  category text,  -- legacy, kept for compatibility
  division_code text,  -- e.g. 'M','L','X','C' for TN; 'WM','WL','WX','WPM','WPL','WPX','Y','YL','D' for WU; 'SM','SL','SX','SU','HKU','SPM','SPL','SPX' for SC
  
  -- Team options (TN only)
  option_choice text CHECK (option_choice IN ('Option 1','Option 2')),  -- Only required for TN events
  team_code text NOT NULL,  -- assigned/validated by trigger
  team_name citext NOT NULL,
  
  -- Normalized team name (GENERATED ALWAYS - cannot be manually set)
  team_name_normalized citext
    GENERATED ALWAYS AS (
      lower( regexp_replace(btrim(team_name::text), '\s+', ' ', 'g') )
    ) STORED,
  
  -- Organization info
  org_name text,
  org_address text,
  
  -- Managers (3 managers supported)
  team_manager_1 text NOT NULL,
  mobile_1 text,
  email_1 text,
  team_manager_2 text NOT NULL,
  mobile_2 text,
  email_2 text,
  team_manager_3 text,
  mobile_3 text,
  email_3 text,
  
  -- WU/SC specific fields (nullable for TN compatibility)
  package_choice text,  -- WU/SC package selection
  team_size int CHECK (team_size BETWEEN 8 AND 25),  -- WU/SC team size
  
  -- Link back to header registration (optional)
  registration_id uuid,
  
  -- Admin approval workflow fields
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  
  -- Client transaction tracking
  client_tx_id text,
  event_short_ref text,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT uniq_registration_teamcode_global UNIQUE (team_code),
  CONSTRAINT uniq_registration_teamname_per_div_season_norm UNIQUE (season, division_code, team_name_normalized),
  CHECK (length(btrim(team_name::text)) > 0),
  CHECK (length(btrim(team_code)) > 0),
  CONSTRAINT ck_option_choice_required_for_tn CHECK (
    (event_type = 'tn' AND option_choice IS NOT NULL) OR
    (event_type IN ('wu', 'sc'))
  )
);
```

**Indexes:**
- `idx_registration_meta_season_div` on (season, division_code)
- `idx_registration_meta_user` on (user_id)
- `idx_registration_meta_status` on (status)
- `idx_registration_meta_event_type` on (event_type)
- `idx_registration_meta_client_tx` on (event_short_ref, client_tx_id)

**Triggers:**
- `trg_registration_meta_updated_at` - Auto-updates `updated_at` on UPDATE
- `trg_registration_meta_before` - Normalizes and assigns team_code on INSERT/UPDATE

---

## 2. `team_meta` Table Schema

**Full table definition** (from `db_schema/main.sql` lines 178-224):

```sql
CREATE TABLE public.team_meta (
  -- Primary key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User reference
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Season
  season int NOT NULL CHECK (season BETWEEN 2000 AND 2100),
  
  -- Division/Category
  category text,  -- legacy, kept for compatibility
  division_code text,  -- e.g. 'M','L','X','C'
  
  -- Team options
  option_choice text NOT NULL CHECK (option_choice IN ('Option 1','Option 2')),
  team_code text NOT NULL,  -- assigned/validated by trigger
  team_name citext NOT NULL,
  
  -- Normalized team name (GENERATED ALWAYS - cannot be manually set)
  team_name_normalized citext
    GENERATED ALWAYS AS (
      lower( regexp_replace(btrim(team_name::text), '\s+', ' ', 'g') )
    ) STORED,
  
  -- Organization info
  org_name text,
  org_address text,
  
  -- Managers (3 managers supported)
  team_manager_1 text NOT NULL,
  mobile_1 text,
  email_1 text,
  team_manager_2 text NOT NULL,
  mobile_2 text,
  email_2 text,
  team_manager_3 text,
  mobile_3 text,
  email_3 text,
  
  -- Link back to registration (optional)
  registration_id uuid,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT uniq_teamcode_global UNIQUE (team_code),
  CONSTRAINT uniq_teamname_per_div_season_norm UNIQUE (season, division_code, team_name_normalized),
  CHECK (length(btrim(team_name::text)) > 0),
  CHECK (length(btrim(team_code)) > 0)
);
```

**Indexes:**
- `idx_teammeta_season_div` on (season, division_code)
- `idx_teammeta_user` on (user_id)
- `idx_team_meta_registration` on (registration_id)

**Triggers:**
- `trg_team_meta_before` - Normalizes and assigns team_code on INSERT/UPDATE
- `trg_team_meta_updated_at` - Auto-updates `updated_at` on UPDATE

**Foreign Keys:**
- `registration_id` → `registration_meta(id)` ON DELETE SET NULL

---

## 3. Status Values

**Status is a CHECK constraint, NOT an ENUM:**

```sql
status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
```

**Possible values:**
- `'pending'` - Default status for new registrations
- `'approved'` - Registration approved by admin (moved to team_meta)
- `'rejected'` - Registration rejected by admin

**Note:** Status is stored as `text` with a CHECK constraint, not a PostgreSQL ENUM type.

---

## 4. Existing Update Patterns

### Database Functions (SECURITY DEFINER)

#### `approve_registration(reg_id uuid, admin_user_id uuid, notes text DEFAULT NULL)`
- **Location:** `db_schema/main.sql` lines 922-1027
- **Purpose:** Approves a pending registration and moves it to appropriate team table
- **Update pattern:**
  ```sql
  UPDATE public.registration_meta
  SET 
    status = 'approved',
    admin_notes = notes,
    approved_by = admin_user_id,
    approved_at = now()
  WHERE id = reg_id;
  ```
- **Features:**
  - Uses `FOR UPDATE SKIP LOCKED` to prevent race conditions
  - Routes to `team_meta`, `wu_team_meta`, or `sc_team_meta` based on `event_type`
  - Verifies update succeeded

#### `reject_registration(reg_id uuid, admin_user_id uuid, notes text)`
- **Location:** `db_schema/main.sql` lines 1046-1088
- **Purpose:** Rejects a pending registration
- **Update pattern:**
  ```sql
  UPDATE public.registration_meta
  SET 
    status = 'rejected',
    admin_notes = notes,
    approved_by = admin_user_id,
    approved_at = now()
  WHERE id = reg_id;
  ```
- **Features:**
  - Uses `FOR UPDATE SKIP LOCKED` to prevent race conditions
  - Verifies update succeeded

### API Routes

#### `POST /api/admin/approve`
- **Location:** `app/api/admin/approve/route.ts`
- **Pattern:** Calls `approve_registration` RPC function
- **Authentication:** Requires admin role (checked via `checkAdmin()`)

#### `POST /api/admin/reject` (if exists)
- **Pattern:** Would call `reject_registration` RPC function

### `updated_at` Handling

**Automatic via trigger:**
```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF row(new.*) IS DISTINCT FROM row(old.*) THEN
    new.updated_at := now();
  END IF;
  RETURN new;
END;
$$;

CREATE TRIGGER trg_registration_meta_updated_at
BEFORE UPDATE ON public.registration_meta
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

**Key points:**
- Trigger fires BEFORE UPDATE
- Only updates `updated_at` if row data actually changed
- No manual `updated_at` handling needed in application code

---

## 5. Audit/History Patterns

### `team_meta_audit` Table

**Location:** `db_schema/main.sql` lines 349-382

```sql
CREATE TABLE public.team_meta_audit (
  id bigserial PRIMARY KEY,
  action text NOT NULL CHECK (action IN ('insert','update','delete')),
  row_id uuid,
  old_row jsonb,
  new_row jsonb,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.trg_audit_team_meta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF tg_op = 'INSERT' THEN
    INSERT INTO public.team_meta_audit(action, row_id, old_row, new_row)
    VALUES ('insert', new.id, null, to_jsonb(new));
    RETURN new;
  ELSIF tg_op = 'UPDATE' THEN
    INSERT INTO public.team_meta_audit(action, row_id, old_row, new_row)
    VALUES ('update', new.id, to_jsonb(old), to_jsonb(new));
    RETURN new;
  ELSE
    INSERT INTO public.team_meta_audit(action, row_id, old_row, new_row)
    VALUES ('delete', old.id, to_jsonb(old), null);
    RETURN old;
  END IF;
END;
$$;

CREATE TRIGGER trg_team_meta_audit
AFTER INSERT OR UPDATE OR DELETE ON public.team_meta
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_team_meta();
```

**Key points:**
- RLS is **intentionally disabled** on `team_meta_audit` (trigger needs to write freely)
- Captures full row state as JSONB (old_row, new_row)
- Tracks insert, update, and delete operations

### `registration_meta` Audit

**❌ NO AUDIT TABLE EXISTS for `registration_meta`**

- There is no `registration_meta_audit` table
- No triggers logging changes to `registration_meta`
- You may want to create one for admin edit functionality

---

## 6. RLS Policies

### `registration_meta` RLS Policies

**RLS is ENABLED** (line 1104)

**Policies defined:**

1. **Anonymous inserts** (form submissions)
   ```sql
   CREATE POLICY "Allow anonymous inserts" ON public.registration_meta
       FOR INSERT 
       TO anon 
       WITH CHECK (true);
   ```

2. **Users can view own registrations**
   ```sql
   CREATE POLICY "Users can view own registrations" ON public.registration_meta
       FOR SELECT 
       TO authenticated 
       USING (auth.uid() = user_id);
   ```

3. **Service role full access** (Edge Functions)
   ```sql
   CREATE POLICY "Service role full access" ON public.registration_meta
       FOR ALL 
       TO service_role 
       USING (true) 
       WITH CHECK (true);
   ```

4. **Admins can view all registrations**
   ```sql
   CREATE POLICY "Admins can view all registrations" ON public.registration_meta
       FOR SELECT 
       TO authenticated 
       USING (
           EXISTS (
               SELECT 1 FROM auth.users 
               WHERE auth.users.id = auth.uid() 
               AND auth.users.raw_user_meta_data->>'role' = 'admin'
           )
       );
   ```

5. **Admins can update registrations** (approve/reject)
   ```sql
   CREATE POLICY "Admins can update registrations" ON public.registration_meta
       FOR UPDATE 
       TO authenticated 
       USING (
           EXISTS (
               SELECT 1 FROM auth.users 
               WHERE auth.users.id = auth.uid() 
               AND auth.users.raw_user_meta_data->>'role' = 'admin'
           )
       );
   ```

**Admin role check:** Uses `auth.users.raw_user_meta_data->>'role' = 'admin'`

### `team_meta` RLS Policies

**RLS is ENABLED** (line 1189)

**⚠️ NO POLICIES DEFINED**

- RLS is enabled but no policies are created
- Access is effectively blocked for anon/auth clients
- Only `service_role` or `SECURITY DEFINER` functions can access
- Comment in schema: "With RLS on and no policies, anon/auth clients cannot read/write. Your server code (Edge Functions with service-role) or SECURITY DEFINER RPCs should perform all access."

**For admin edit functionality:**
- You'll need to create UPDATE policies for admins on `team_meta` if you want to allow direct updates
- Or use SECURITY DEFINER functions (recommended pattern)

---

## Summary for Admin Edit Implementation

### What You Can Edit

**`registration_meta` fields that can be updated:**
- ✅ All form fields (team_name, managers, contacts, org info, etc.)
- ✅ Status-related fields (status, admin_notes, approved_by, approved_at)
- ✅ WU/SC fields (package_choice, team_size)
- ⚠️ `team_code` - Auto-assigned by trigger (can be manually set but must match pattern)
- ❌ `team_name_normalized` - GENERATED ALWAYS (cannot be set manually)
- ❌ `created_at` - Should not be changed

**`team_meta` fields that can be updated:**
- ✅ All form fields (team_name, managers, contacts, org info, etc.)
- ⚠️ `team_code` - Auto-assigned by trigger (can be manually set but must match pattern)
- ❌ `team_name_normalized` - GENERATED ALWAYS (cannot be set manually)
- ❌ `created_at` - Should not be changed

### Recommended Patterns

1. **Use SECURITY DEFINER functions** for updates (like `approve_registration`)
2. **Use row-level locking** (`FOR UPDATE SKIP LOCKED`) for concurrent edits
3. **Verify updates succeeded** (check `NOT FOUND` after UPDATE)
4. **Consider creating `registration_meta_audit`** table for edit history
5. **Follow existing `updated_at` trigger pattern** (already in place)

### Missing Pieces

1. ❌ No `registration_meta_audit` table (consider creating one)
2. ❌ No general-purpose UPDATE function for `registration_meta` (only approve/reject)
3. ❌ No UPDATE policies for `team_meta` (RLS enabled but no policies)
4. ❌ No general-purpose UPDATE function for `team_meta`

