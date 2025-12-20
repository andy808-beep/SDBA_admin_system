# Team Name Mapping Verification

This document verifies that WU/SC form payloads correctly map `team_name_en` and `team_name_tc` from frontend to database.

---

## Verification Summary

### ✅ **All mappings are CORRECT**

Both the frontend payload construction and edge function mapping properly handle `name_en` and `name_tc` fields.

---

## 1. Frontend Payload Construction

### Location: `public/js/wu_sc_wizard.js` - `collectFormData()` function

**Lines 2255-2274:**

```javascript
function collectFormData() {
  const cfg = window.__CONFIG;
  const teamCount = parseInt(sessionStorage.getItem(`${eventType}_team_count`) || 0);
  const teams = [];
  
  // Collect team data
  for (let i = 1; i <= teamCount; i++) {
    const teamNameEn = sessionStorage.getItem(`${eventType}_team${i}_name_en`);
    const teamNameTc = sessionStorage.getItem(`${eventType}_team${i}_name_tc`);
    const boatType = sessionStorage.getItem(`${eventType}_team${i}_boatType`);
    const division = sessionStorage.getItem(`${eventType}_team${i}_division`);
    
    teams.push({
      name: teamNameEn,        // ✅ Backward compatibility
      name_en: teamNameEn,     // ✅ Explicit EN field
      name_tc: teamNameTc || '', // ✅ TC field (empty string if not provided)
      boat_type: boatType,
      division: division,
      category: division
    });
  }
  
  // ... rest of function
}
```

**Status:** ✅ **CORRECT**
- Includes `name_en` field
- Includes `name_tc` field (defaults to empty string)
- Includes `name` field for backward compatibility

---

## 2. Edge Function Payload Type Definition

### Location: `supabase/functions/submit_registration/index.ts` - Payload type

**Lines 102-110:**

```typescript
type Payload = {
  eventShortRef: string;
  category: string;
  season?: number;
  org_name: string;
  org_address?: string | null;
  // ... TN-specific fields ...
  
  // New structure for WU/SC
  teams?: Array<{
    name: string;        // ✅ Backward compatibility
    name_en?: string;   // ✅ Explicit EN field (optional)
    name_tc?: string;   // ✅ Explicit TC field (optional)
    category: string;
    boat_type: string;
    division: string;
    team_size?: number;
  }>;
};
```

**Status:** ✅ **CORRECT**
- Type definition includes both `name_en` and `name_tc` as optional fields

---

## 3. Edge Function Database Mapping

### Location: `supabase/functions/submit_registration/index.ts` - WU/SC processing

**Lines 595-619:**

```typescript
registrationsToInsert = teams.map((team: any) => ({
  event_type: eventType,  // Use normalized event type ('wu' or 'sc')
  event_short_ref: eventShortRef,
  client_tx_id: payload.client_tx_id,
  season: seasonNum,
  category: team.category || team.boat_type || '',
  division_code: divisionMap.get(team.division) || '',
  option_choice: null,  // Not used for WU/SC events
  
  // ✅ CORRECT MAPPING:
  team_name_en: team.name_en || team.name || '',           // Line 603
  team_name_tc: (team.name_tc || '').trim() || null,       // Line 604
  
  org_name,
  org_address: org_address ?? null,
  package_choice: team.boat_type || '',
  team_size: team.team_size || null,
  team_manager_1: mgrs[0]?.name || "",
  mobile_1:       mgrs[0]?.mobile || "",
  email_1:        mgrs[0]?.email  || "",
  team_manager_2: mgrs[1]?.name || "",
  mobile_2:       mgrs[1]?.mobile || "",
  email_2:        mgrs[1]?.email  || "",
  team_manager_3: mgrs[2]?.name || "",
  mobile_3:       mgrs[2]?.mobile || "",
  email_3:        mgrs[2]?.email  || "",
  status: 'pending'
}));
```

**Status:** ✅ **CORRECT**

**Mapping Details:**
- **Line 603:** `team_name_en: team.name_en || team.name || ''`
  - ✅ Uses `team.name_en` if available
  - ✅ Falls back to `team.name` for backward compatibility
  - ✅ Defaults to empty string if both are missing
  
- **Line 604:** `team_name_tc: (team.name_tc || '').trim() || null`
  - ✅ Uses `team.name_tc` if available
  - ✅ Trims whitespace
  - ✅ Converts empty string to `null` (database-friendly)

---

## 4. Database Schema

### Location: `db_schema/main.sql`

**Lines 530-539:**

```sql
team_name_en  citext NOT NULL,
team_name_tc  citext,
```

**Status:** ✅ **CONFIRMED**
- `team_name_en` is required (NOT NULL)
- `team_name_tc` is optional (nullable)

---

## Complete Data Flow

### Frontend → Edge Function → Database

```
1. Frontend (wu_sc_wizard.js):
   sessionStorage: wu_team1_name_en = "Team Alpha"
   sessionStorage: wu_team1_name_tc = "隊伍甲"
   
   ↓ collectFormData()
   
   Payload:
   {
     teams: [{
       name: "Team Alpha",        // Backward compatibility
       name_en: "Team Alpha",     // ✅ Explicit EN
       name_tc: "隊伍甲",        // ✅ Explicit TC
       boat_type: "Standard Boat",
       division: "Standard Boat – Men"
     }]
   }

2. Edge Function (submit_registration/index.ts):
   Receives payload.teams[0]
   
   ↓ Mapping (line 603-604)
   
   Database Insert:
   {
     team_name_en: "Team Alpha",     // ✅ From team.name_en || team.name
     team_name_tc: "隊伍甲",         // ✅ From team.name_tc (trimmed)
     ...
   }

3. Database (registration_meta table):
   ✅ team_name_en = "Team Alpha" (citext NOT NULL)
   ✅ team_name_tc = "隊伍甲" (citext nullable)
```

---

## Verification Results

| Component | Field | Status | Notes |
|-----------|-------|--------|-------|
| **Frontend Payload** | `name_en` | ✅ | Included in teams array |
| **Frontend Payload** | `name_tc` | ✅ | Included in teams array (empty string default) |
| **Edge Function Type** | `name_en?` | ✅ | Optional field in TypeScript type |
| **Edge Function Type** | `name_tc?` | ✅ | Optional field in TypeScript type |
| **Edge Function Mapping** | `team_name_en` | ✅ | Maps `team.name_en \|\| team.name \|\| ''` |
| **Edge Function Mapping** | `team_name_tc` | ✅ | Maps `(team.name_tc \|\| '').trim() \|\| null` |
| **Database Schema** | `team_name_en` | ✅ | citext NOT NULL |
| **Database Schema** | `team_name_tc` | ✅ | citext nullable |

---

## Conclusion

### ✅ **All mappings are CORRECT**

1. **Frontend** correctly includes both `name_en` and `name_tc` in the payload
2. **Edge Function** correctly maps both fields to database columns
3. **Database Schema** supports both fields (EN required, TC optional)

**No fixes needed** - the implementation is correct.

---

## Related Code References

- **Frontend Payload:** `public/js/wu_sc_wizard.js` lines 2255-2274 (`collectFormData()`)
- **Edge Function Type:** `supabase/functions/submit_registration/index.ts` lines 102-110
- **Edge Function Mapping:** `supabase/functions/submit_registration/index.ts` lines 603-604
- **Database Schema:** `db_schema/main.sql` lines 530-539
