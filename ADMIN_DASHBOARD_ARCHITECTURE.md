# Admin Dashboard Architecture & Workflows

## 1. ADMIN DASHBOARD STRUCTURE

### File Organization

```
app/
├── admin/
│   ├── page.tsx                    # Main admin dashboard (client component)
│   └── feature-flags/
│       └── page.tsx                # Feature flags management page
│
├── api/
│   └── admin/
│       ├── list/
│       │   └── route.ts            # GET /api/admin/list - List registrations with filters
│       ├── approve/
│       │   └── route.ts            # POST /api/admin/approve - Approve registration
│       ├── reject/
│       │   └── route.ts            # POST /api/admin/reject - Reject registration
│       ├── counters/
│       │   └── route.ts            # GET /api/admin/counters - Get dashboard statistics
│       ├── export/
│       │   └── route.ts            # POST /api/admin/export - Export CSV data
│       └── feature-flags/
│           └── route.ts            # Feature flags API
│
lib/
├── auth.ts                         # Admin authentication & authorization
├── db-utils.ts                     # Database query utilities with performance monitoring
├── api-errors.ts                   # Standardized error handling
├── csrf-client.ts                  # CSRF token management (client-side)
├── csrf-edge.ts                    # CSRF validation (edge runtime)
└── email.ts                        # Email sending utilities

middleware.ts                       # Request middleware (auth, CSRF, rate limiting)
```

**Note:** There are no separate `components/admin/**` components - the admin dashboard is a single-page application with all UI logic in `app/admin/page.tsx`.

---

## 2. CORE WORKFLOWS

### A) How Pending Registrations Appear in Dashboard

**Flow:**
1. **Real-time Subscription** (lines 249-283 in `app/admin/page.tsx`)
   - On component mount, subscribes to Supabase realtime channel `registration_meta_changes`
   - Listens for `INSERT` events on `registration_meta` table where `status = 'pending'`
   - When new pending registration is detected:
     - If user is on `#applications` view → automatically refetches list
     - If user is on other views → increments `badgeNew` counter (red badge on "Applications" nav)

2. **Initial Load** (lines 120-175 in `app/admin/page.tsx`)
   - When user navigates to `#applications` view:
     - Calls `fetchApplications()` function
     - Makes GET request to `/api/admin/list` with current filters
     - Updates `items` state with fetched registrations

3. **Data Source**
   - Reads from `registration_meta` table
   - Filters by `status = 'pending'` (default filter)
   - Sorted by `created_at DESC` (newest first)

**Key Code:**
```typescript
// Real-time subscription
useEffect(() => {
  const channel = supabase
    .channel('registration_meta_changes')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'registration_meta',
      filter: 'status=eq.pending',
    }, () => {
      const currentHash = window.location.hash || "#overview";
      if (currentHash !== "#applications") {
        setBadgeNew((prev) => prev + 1);  // Show badge
      } else {
        fetchApplications();  // Auto-refresh list
      }
    })
    .subscribe();
}, [fetchApplications]);
```

---

### B) Approval Workflow (Button Click → Database Update)

**Complete Flow:**

1. **User Action** (lines 637-649 in `app/admin/page.tsx`)
   - User clicks "Approve" button on a pending registration row
   - Button is disabled during approval (`approvingId` state)
   - Shows spinner and "Approving..." text

2. **Client Request** (lines 288-327 in `app/admin/page.tsx`)
   ```typescript
   const handleApprove = async (registrationId: string, notes?: string) => {
     // Get CSRF token (pre-fetched on mount)
     const headers = await getHeadersWithCsrf();
     
     // POST to /api/admin/approve
     const response = await fetch("/api/admin/approve", {
       method: "POST",
       headers,
       credentials: "include",  // Sends cookies (auth + CSRF)
       body: JSON.stringify({
         registration_id: registrationId,
         notes: notes || undefined,
       }),
     });
   }
   ```

3. **Middleware Protection** (`middleware.ts` lines 188-336)
   - **CSRF Check**: Validates CSRF token in header/cookie (for POST requests)
   - **Rate Limiting**: Checks admin API rate limit (100 req/min per user)
   - **Auth Check**: Verifies user is authenticated admin
   - If any check fails → returns 403/429 error

4. **API Route Handler** (`app/api/admin/approve/route.ts`)
   - **Authentication**: Calls `checkAdmin(req)` to verify admin role
   - **Validation**: Validates payload with Zod schema
   - **Database RPC**: Calls `supabaseServer.rpc("approve_registration", {...})`
   - **Error Handling**: 
     - 409 Conflict if already processed
     - 500 for other database errors
   - **Background Tasks** (fire-and-forget):
     - Sends confirmation email
     - Tracks event in instrumentation

5. **Database RPC Function** (`db_schema/migrations/003_add_reject_locking.sql` lines 76-180)
   ```sql
   CREATE FUNCTION approve_registration(reg_id uuid, admin_user_id uuid, notes text)
   ```
   - **Row-Level Locking**: Uses `FOR UPDATE SKIP LOCKED` to prevent race conditions
   - **Validation**: Ensures registration exists and is `status = 'pending'`
   - **Team Creation**: 
     - Routes to appropriate table based on `event_type`:
       - `tn` → `team_meta`
       - `wu` → `wu_team_meta`
       - `sc` → `sc_team_meta`
   - **Status Update**: Sets `status = 'approved'`, `approved_by`, `approved_at`
   - **Returns**: New `team_meta_id` UUID

6. **UI Update** (lines 314-317 in `app/admin/page.tsx`)
   - On success: Shows success toast with team ID
   - Calls `fetchApplications()` to refresh list
   - Approved registration disappears from pending list (now has `status = 'approved'`)

**Data Flow Diagram:**
```
User Click → handleApprove()
  ↓
CSRF Token (pre-fetched)
  ↓
POST /api/admin/approve
  ↓
Middleware: CSRF + Rate Limit + Auth
  ↓
API Route: checkAdmin() + Zod validation
  ↓
RPC: approve_registration(reg_id, admin_user_id, notes)
  ↓
Database: 
  - Lock row (FOR UPDATE SKIP LOCKED)
  - Insert into team_meta/wu_team_meta/sc_team_meta
  - Update registration_meta.status = 'approved'
  ↓
Response: { ok: true, team_meta_id: uuid }
  ↓
UI: Toast + Refresh list
```

---

### C) Rejection Workflow

**Similar to approval, with key differences:**

1. **User Action**: Click "Reject" button (not shown in current UI - would need to be added)

2. **Client Request** (`app/api/admin/reject/route.ts`)
   - **Required Notes**: Rejection requires `notes` field (Zod validation)
   - POST to `/api/admin/reject` with `registration_id` and `notes`

3. **Database RPC** (`reject_registration` function)
   - Uses same row-level locking pattern
   - Updates `status = 'rejected'`
   - Stores `admin_notes` (rejection reason)
   - **No team creation** (unlike approval)

4. **UI Update**: Registration moves to "rejected" status, filtered out of pending list

**Key Difference:**
- Approval → Creates team record + updates status
- Rejection → Only updates status (no team record created)

---

### D) Registration Data Display/Filtering

**Display Logic** (lines 591-656 in `app/admin/page.tsx`)

1. **Table Rendering**
   - Maps `items` array to table rows
   - Shows: Team Name, Team Code, Event, Division, Manager, Email, Created, Status, Actions
   - Status badges: Green (approved), Red (rejected), Yellow (pending)

2. **Filtering** (lines 552-589)
   - **Search Box**: Searches across `team_name`, `org_name`, `email_1`, `team_code`
   - **Status Filter**: `pending` | `approved` | `rejected` | `all`
   - **Event Filter**: `tn` | `wu` | `sc` | `all`
   - Filters are applied via query parameters to `/api/admin/list`

3. **Pagination** (lines 658-684)
   - Default: 50 items per page (max 100)
   - Shows "Showing X to Y of Z"
   - Previous/Next buttons

4. **API Query** (`app/api/admin/list/route.ts`)
   - Uses Supabase query builder with:
     - `applySearchFilter()`: Multi-column ILIKE search
     - `applyPagination()`: LIMIT/OFFSET
     - Index-optimized filters:
       - `idx_registration_meta_status` for status
       - `idx_registration_meta_event_type` for event
       - `idx_registration_meta_created_at` for sorting
       - GIN indexes for text search

**Performance Optimizations:**
- Composite indexes for common filter combinations
- Debounced search (300ms delay)
- Request cancellation on filter change (AbortController)
- Parallel counter queries for overview

---

## 3. DATABASE INTERACTIONS

### Tables Read From

1. **`registration_meta`** (Primary table)
   - Stores all registration submissions
   - Columns: `id`, `status`, `event_type`, `team_name`, `team_code`, `season`, `division_code`, `category`, `team_manager_1`, `email_1`, `created_at`, `approved_by`, `approved_at`, etc.
   - Used by: List API, Counters API, Approve/Reject APIs

2. **`team_meta`** (TN teams)
   - Created when TN registration is approved
   - Used by: Export API (TN exports)

3. **`wu_team_meta`** (WU teams)
   - Created when WU registration is approved
   - Used by: Export API (WU exports)

4. **`sc_team_meta`** (SC teams)
   - Created when SC registration is approved
   - Used by: Export API (SC exports)

5. **Views** (for category-specific exports)
   - `men_open_team_list`
   - `ladies_open_team_list`
   - `mixed_open_team_list`
   - `mixed_corporate_team_list`

### Database Functions/RPCs

1. **`approve_registration(reg_id uuid, admin_user_id uuid, notes text)`**
   - **Returns**: `uuid` (new team_meta_id)
   - **Security**: `SECURITY DEFINER` (runs with elevated privileges)
   - **Concurrency**: Uses `FOR UPDATE SKIP LOCKED` for race condition prevention
   - **Logic**:
     - Locks and validates registration
     - Routes to appropriate team table based on `event_type`
     - Creates team record
     - Updates registration status
   - **Location**: `db_schema/migrations/003_add_reject_locking.sql`

2. **`reject_registration(reg_id uuid, admin_user_id uuid, notes text)`**
   - **Returns**: `void`
   - **Security**: `SECURITY DEFINER`
   - **Concurrency**: Same locking pattern as approve
   - **Logic**:
     - Locks and validates registration
     - Updates status to `rejected`
     - Stores rejection notes
   - **Location**: `db_schema/migrations/003_add_reject_locking.sql`

### Admin Authorization Check

**Flow:**

1. **Middleware** (`middleware.ts` lines 204-212)
   ```typescript
   const { isAdmin, user } = await checkAdmin(req);
   if (!isAdmin || !user) {
     // Returns 403 or redirects to /auth
   }
   ```

2. **`checkAdmin()` Function** (`lib/auth.ts` lines 30-77)
   - Creates Supabase server client from cookies
   - Calls `supabase.auth.getUser()` to get authenticated user
   - Checks admin role via `isAdminUser()` helper

3. **`isAdminUser()` Function** (`lib/auth.ts` lines 17-23)
   ```typescript
   function isAdminUser(user: AdminUser | null | undefined): boolean {
     if (!user) return false;
     const roles = (user.app_metadata?.roles ?? user.user_metadata?.roles ?? []) as string[];
     const role = (user.app_metadata?.role ?? user.user_metadata?.role) as string | undefined;
     return roles?.includes("admin") || role === "admin" || user.user_metadata?.is_admin === true;
   }
   ```
   - Checks for `roles` array containing `"admin"`
   - Or `role === "admin"`
   - Or `is_admin === true` in metadata

4. **Page Protection** (`middleware.ts` lines 359-393)
   - Routes starting with `/admin` are protected
   - Unauthenticated users → redirect to `/auth?redirectedFrom=/admin`
   - Non-admin users → redirect to `/auth?error=forbidden`

**Authorization Points:**
- ✅ Middleware (page access)
- ✅ API routes (all `/api/admin/*` endpoints)
- ✅ Database RLS (Row Level Security enabled, but bypassed by SECURITY DEFINER functions)

---

## 4. KEY FILES TO REVIEW

### Main Admin Dashboard Page
**File**: `app/admin/page.tsx` (825 lines)
- **Purpose**: Single-page admin dashboard with hash-based routing
- **Key Sections**:
  - State management (lines 24-83)
  - Data fetching (lines 120-244)
  - Real-time subscriptions (lines 249-283)
  - Approval handler (lines 288-327)
  - Export handler (lines 332-382)
  - UI rendering (lines 400-792)

### Registration List/Table Component
**Location**: Embedded in `app/admin/page.tsx` (lines 525-686)
- **Not a separate component** - inline table rendering
- **Features**:
  - Search input
  - Status/Event filters
  - Pagination controls
  - Action buttons (Approve)

### Approve API Route
**File**: `app/api/admin/approve/route.ts` (189 lines)
- **Method**: POST
- **Auth**: Admin required + CSRF token
- **Validation**: Zod schema
- **Database**: Calls `approve_registration` RPC
- **Background**: Email sending, event tracking

### Reject API Route
**File**: `app/api/admin/reject/route.ts` (132 lines)
- **Method**: POST
- **Auth**: Admin required + CSRF token
- **Validation**: Zod schema (notes required)
- **Database**: Calls `reject_registration` RPC

### Shared Utilities

**Authentication** (`lib/auth.ts`)
- `checkAdmin(req)` - Verify admin access
- `isAdminUser(user)` - Check user metadata for admin role

**Error Handling** (`lib/api-errors.ts`)
- `ApiErrors.forbidden()` - 403 errors
- `ApiErrors.conflict()` - 409 errors
- `handleApiError()` - Standardized error responses

**Database Utilities** (`lib/db-utils.ts`)
- `executeQuery()` - Query execution with performance monitoring
- `applyPagination()` - Pagination helper
- `applySearchFilter()` - Multi-column search
- `validatePagination()` - Input validation

**CSRF Protection** (`lib/csrf-client.ts`, `lib/csrf-edge.ts`)
- Client-side token fetching
- Edge runtime validation
- Cookie-based token storage

**Logging** (`lib/logger.ts`)
- Structured logging
- Request/response logging
- Performance tracking

---

## 5. STATE MANAGEMENT

### Data Fetching & Caching

**No External State Library** - Uses React `useState` and `useEffect`

1. **Registration List State** (lines 55-63 in `app/admin/page.tsx`)
   ```typescript
   const [items, setItems] = useState<AppRow[]>([]);
   const [total, setTotal] = useState(0);
   const [page, setPage] = useState(1);
   const [pageSize, setPageSize] = useState(50);
   const [q, setQ] = useState("");  // Search query
   const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
   const [event, setEvent] = useState<'tn' | 'wu' | 'sc' | 'all'>('all');
   ```

2. **Fetching Strategy**
   - **On Mount**: Fetches when `#applications` view is active
   - **On Filter Change**: Debounced search (300ms), immediate filter changes
   - **On Approval**: Manual refetch after successful approval
   - **Real-time**: Auto-refetch on new pending registration (if on applications view)

3. **Caching**
   - **No client-side caching** - Always fetches fresh data
   - **Server-side**: `lib/db-utils.ts` has in-memory query cache (not actively used for list API)
   - **Database**: Relies on PostgreSQL query planner and indexes

### UI Updates After Approval/Rejection

1. **Optimistic Updates**: ❌ None - waits for server response

2. **Update Flow**:
   ```
   User clicks Approve
     ↓
   Button disabled (approvingId state)
     ↓
   API call
     ↓
   Success response
     ↓
   Toast notification
     ↓
   fetchApplications() called
     ↓
   List refreshes (approved item disappears from pending)
   ```

3. **Real-time Updates**
   - **New Registrations**: Real-time subscription updates badge or list
   - **Status Changes**: Not subscribed to UPDATE events (only INSERT)
   - **Manual Refresh**: Required after approval/rejection

### Real-time Subscriptions

**Implementation** (lines 249-283 in `app/admin/page.tsx`)

```typescript
useEffect(() => {
  const channel = supabase
    .channel('registration_meta_changes')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'registration_meta',
      filter: 'status=eq.pending',
    }, (payload) => {
      // Handle new pending registration
    })
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}, [fetchApplications]);
```

**What It Monitors:**
- ✅ New pending registrations (INSERT events)
- ❌ Status changes (UPDATE events) - not subscribed
- ❌ Deletions (DELETE events) - not subscribed

**Limitations:**
- Only detects new registrations, not status changes
- Requires manual refresh to see approval/rejection updates
- Could be enhanced to subscribe to UPDATE events on `status` column

---

## 6. DATA FLOW DIAGRAM

### Complete Registration Management Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ registration_meta                                        │  │
│  │  - id (uuid)                                              │  │
│  │  - status: pending | approved | rejected                 │  │
│  │  - event_type: tn | wu | sc                              │  │
│  │  - team_name, team_code, ...                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ RPC Functions (SECURITY DEFINER)                         │  │
│  │  - approve_registration(reg_id, admin_user_id, notes)    │  │
│  │  - reject_registration(reg_id, admin_user_id, notes)     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────────┐
│                    API LAYER (Next.js)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ GET /api/admin/list                                       │  │
│  │  - Query registration_meta                                │  │
│  │  - Apply filters (status, event, search)                 │  │
│  │  - Pagination                                            │  │
│  │  - Returns: { ok, items[], total, page, pageSize }       │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ POST /api/admin/approve                                   │  │
│  │  - Validate admin + CSRF                                 │  │
│  │  - Call approve_registration RPC                         │  │
│  │  - Send confirmation email (background)                  │  │
│  │  - Returns: { ok, team_meta_id }                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ POST /api/admin/reject                                    │  │
│  │  - Validate admin + CSRF                                 │  │
│  │  - Call reject_registration RPC                         │  │
│  │  - Returns: { ok }                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ GET /api/admin/counters                                   │  │
│  │  - Parallel count queries                                │  │
│  │  - Returns: { total, pending, approved, rejected, new_today }│
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────────┐
│              MIDDLEWARE (middleware.ts)                        │
│  - CSRF Protection (POST/PUT/DELETE)                           │
│  - Rate Limiting (100 req/min for admin)                       │
│  - Admin Authentication Check                                   │
└─────────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────────┐
│              CLIENT (app/admin/page.tsx)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ State Management                                          │  │
│  │  - items: AppRow[]                                        │  │
│  │  - filters: status, event, search                         │  │
│  │  - pagination: page, pageSize                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Real-time Subscription                                    │  │
│  │  - Supabase channel: registration_meta_changes            │  │
│  │  - Listens for INSERT events (status=pending)           │  │
│  │  - Updates badge or refreshes list                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ User Actions                                              │  │
│  │  - Click "Approve" → handleApprove()                     │  │
│  │  - Change filters → fetchApplications()                  │  │
│  │  - Search → debounced fetchApplications()                │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ UI Rendering                                               │  │
│  │  - Table with registration rows                           │  │
│  │  - Filters (search, status, event)                        │  │
│  │  - Pagination controls                                     │  │
│  │  - Action buttons (Approve)                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Approval Flow Sequence

```
1. User clicks "Approve" button
   ↓
2. handleApprove(registrationId)
   - Sets approvingId state (disables button)
   - Gets CSRF token from cookie
   ↓
3. POST /api/admin/approve
   Headers: { "X-CSRF-Token": "...", Cookie: "..." }
   Body: { registration_id, notes }
   ↓
4. Middleware checks:
   - CSRF token valid? ✅
   - Rate limit OK? ✅
   - User is admin? ✅
   ↓
5. API Route Handler:
   - checkAdmin(req) → verifies admin role
   - Zod validation → validates payload
   ↓
6. Database RPC Call:
   supabaseServer.rpc("approve_registration", {
     reg_id: registrationId,
     admin_user_id: user.id,
     notes: notes
   })
   ↓
7. PostgreSQL Function:
   - SELECT ... FOR UPDATE SKIP LOCKED (locks row)
   - Validate: status = 'pending'
   - INSERT INTO team_meta/wu_team_meta/sc_team_meta
   - UPDATE registration_meta SET status = 'approved'
   - RETURN new_team_id
   ↓
8. Response:
   { ok: true, team_meta_id: "uuid" }
   ↓
9. Background Tasks (fire-and-forget):
   - Send confirmation email
   - Track event in instrumentation
   ↓
10. Client Updates:
    - Toast: "Registration approved! Team ID: ..."
    - fetchApplications() → refreshes list
    - Approved item disappears (now status='approved')
```

---

## 7. SECURITY FEATURES

### Authentication & Authorization
- ✅ Admin role check via user metadata
- ✅ Middleware protection for `/admin` routes
- ✅ API route protection for `/api/admin/*`

### CSRF Protection
- ✅ Token-based CSRF protection for state-changing requests
- ✅ Token stored in HTTP-only cookie
- ✅ Token validated in middleware (edge runtime)

### Rate Limiting
- ✅ Admin API: 100 requests/minute per user
- ✅ Public API: 10 requests/10 seconds per IP
- ✅ Headers: `X-RateLimit-*` for client awareness

### Input Validation
- ✅ Zod schema validation for all API inputs
- ✅ SQL injection prevention via parameterized queries (Supabase)
- ✅ XSS prevention via input sanitization (`sanitizeNotes()`)

### Database Security
- ✅ Row Level Security (RLS) enabled on tables
- ✅ SECURITY DEFINER functions for admin operations
- ✅ Row-level locking prevents race conditions

---

## 8. PERFORMANCE OPTIMIZATIONS

### Database Indexes
- `idx_registration_meta_status` - Fast status filtering
- `idx_registration_meta_status_created_at` - Status + sort
- `idx_registration_meta_event_type` - Event filtering
- `idx_registration_meta_season` - Season filtering
- `idx_registration_meta_created_at` - Date range queries
- GIN indexes for text search (`team_name_normalized`, `org_name`)

### Query Optimizations
- Parallel counter queries (5 queries in parallel)
- Pagination with LIMIT/OFFSET
- Index-optimized filters
- Query timeout protection (30s)

### Client Optimizations
- Debounced search (300ms)
- Request cancellation on filter change
- Pre-fetched CSRF token
- Real-time subscriptions (reduces polling)

---

## 9. ERROR HANDLING

### Error Types
- **403 Forbidden**: Not admin or not authenticated
- **409 Conflict**: Registration already processed
- **422 Validation Error**: Invalid input (Zod validation)
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Database or server error

### Error Flow
```
API Route → handleApiError(error)
  ↓
Standardized JSON response:
{
  error: "Error message",
  code: "ERROR_CODE",
  statusCode: 403
}
  ↓
Client → toast.error() or error banner
```

---

## 10. TESTING

### Test Files
- `app/api/admin/__tests__/approve.test.ts`
- `app/api/admin/__tests__/reject.test.ts`
- `app/api/admin/__tests__/list.test.ts`
- `app/api/admin/__tests__/export.test.ts`

### Test Coverage
- API route handlers
- Error cases (403, 409, 422)
- Success cases
- Database RPC mocking

---

## SUMMARY

The admin dashboard is a **single-page React application** with:
- **Hash-based routing** (`#overview`, `#applications`, `#practice`, `#exports`)
- **Real-time updates** via Supabase subscriptions
- **Server-side API routes** with middleware protection
- **Database RPC functions** for atomic approval/rejection
- **No external state management** (uses React hooks)
- **Optimistic UI updates** are not implemented (waits for server response)

**Key Design Decisions:**
1. Single component file for simplicity
2. Real-time subscriptions for new registrations only
3. Manual refresh required after approval/rejection
4. Row-level locking prevents concurrent approval conflicts
5. CSRF protection for all state-changing operations

