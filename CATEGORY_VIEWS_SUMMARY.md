# Category Views Summary - Auto Team Separation

## Overview
This document describes how teams are automatically separated into category-specific views after admin approval, similar to how `team_meta` splits TN teams into 4 category views.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User submits registration                                    │
│    ↓                                                             │
│    registration_meta (status='pending')                         │
│    - event_type: 'tn', 'wu', or 'sc'                           │
│    - division_code: 'M', 'WM', 'SM', etc.                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Admin approves → approve_registration() function             │
│    ↓                                                             │
│    Routes based on event_type:                                  │
│    - 'tn' → team_meta                                           │
│    - 'wu' → wu_team_meta                                        │
│    - 'sc' → sc_team_meta                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Team appears in appropriate category view                    │
│    Automatically filtered by division_code                      │
└─────────────────────────────────────────────────────────────────┘
```

## TN (Main Race) - 4 Category Views

**Base Table:** `team_meta`

| View Name | Division Code | Description |
|-----------|---------------|-------------|
| `men_open_team_list` | M | Men's Open Division |
| `ladies_open_team_list` | L | Ladies' Open Division |
| `mixed_open_team_list` | X | Mixed Open Division |
| `mixed_corporate_team_list` | C | Mixed Corporate Division |

**Example:**
```sql
SELECT * FROM men_open_team_list;
-- Returns all teams where category = 'men_open'
```

---

## WU (Warm-Up) - 9 Category Views

**Base Table:** `wu_team_meta`

### Standard Boat Divisions (3)
| View Name | Division Code | Description |
|-----------|---------------|-------------|
| `wu_men_std_team_list` | WM | Standard Boat - Men |
| `wu_ladies_std_team_list` | WL | Standard Boat - Ladies |
| `wu_mixed_std_team_list` | WX | Standard Boat - Mixed |

### Small Boat Divisions (3)
| View Name | Division Code | Description |
|-----------|---------------|-------------|
| `wu_men_smallboat_team_list` | WPM | Small Boat - Men |
| `wu_ladies_smallboat_team_list` | WPL | Small Boat - Ladies |
| `wu_mixed_smallboat_team_list` | WPX | Small Boat - Mixed |

### Special Divisions - By Invitation (3)
| View Name | Division Code | Description |
|-----------|---------------|-------------|
| `wu_youth_open_team_list` | Y | Hong Kong Youth Group - Open |
| `wu_youth_ladies_team_list` | YL | Hong Kong Youth Group - Ladies |
| `wu_disciplinary_forces_team_list` | D | Disciplinary Forces |

**Example:**
```sql
SELECT * FROM wu_men_std_team_list;
-- Returns all teams where division_code = 'WM'

SELECT * FROM wu_youth_open_team_list;
-- Returns all teams where division_code = 'Y'
```

---

## SC (Short Course) - 8 Category Views

**Base Table:** `sc_team_meta`

### Standard Boat Divisions (3)
| View Name | Division Code | Description |
|-----------|---------------|-------------|
| `sc_men_std_team_list` | SM | Standard Boat - Men |
| `sc_ladies_std_team_list` | SL | Standard Boat - Ladies |
| `sc_mixed_std_team_list` | SX | Standard Boat - Mixed |

### Small Boat Divisions (3)
| View Name | Division Code | Description |
|-----------|---------------|-------------|
| `sc_men_smallboat_team_list` | SPM | Small Boat - Men |
| `sc_ladies_smallboat_team_list` | SPL | Small Boat - Ladies |
| `sc_mixed_smallboat_team_list` | SPX | Small Boat - Mixed |

### Special Divisions - By Invitation (2)
| View Name | Division Code | Description |
|-----------|---------------|-------------|
| `sc_post_secondary_team_list` | SU | Post-Secondary |
| `sc_hku_invitational_team_list` | HKU | HKU Invitational Cup |

**Example:**
```sql
SELECT * FROM sc_men_std_team_list;
-- Returns all teams where division_code = 'SM'

SELECT * FROM sc_post_secondary_team_list;
-- Returns all teams where division_code = 'SU'
```

---

## How It Works

### 1. **Views are Filters, Not Separate Tables**
- All TN teams are stored in ONE table: `team_meta`
- All WU teams are stored in ONE table: `wu_team_meta`
- All SC teams are stored in ONE table: `sc_team_meta`
- Views are just SQL queries that filter by `division_code`

### 2. **Automatic Real-Time Updates**
- When a team is added/updated in the base table, the view updates instantly
- No triggers needed - views are just dynamic queries
- Example:
  ```sql
  -- Insert a new WU Men's Standard Boat team
  INSERT INTO wu_team_meta (division_code, team_name, ...)
  VALUES ('WM', 'Dragon Warriors', ...);
  
  -- Immediately visible in the view
  SELECT * FROM wu_men_std_team_list;
  -- Returns 'Dragon Warriors' and all other WM teams
  ```

### 3. **Division Code Mapping**
- Division codes come from `division_config_general` table
- Examples:
  - `WM` = Warm-Up, Standard Boat, Men
  - `SPL` = Short Course, Small Boat, Ladies
  - `Y` = Warm-Up, Youth Group Open

### 4. **Security**
- All views use `security_invoker = true`
- Access control is enforced through RLS (Row Level Security) on base tables
- Views inherit the security context of the calling user

---

## Query Examples

### Get all WU Small Boat teams
```sql
SELECT team_name, team_code, division_code
FROM wu_team_meta
WHERE division_code IN ('WPM', 'WPL', 'WPX');

-- Or use individual views
SELECT * FROM wu_men_smallboat_team_list
UNION ALL
SELECT * FROM wu_ladies_smallboat_team_list
UNION ALL
SELECT * FROM wu_mixed_smallboat_team_list;
```

### Get all SC Invitational teams
```sql
SELECT team_name, team_code, division_code
FROM sc_team_meta
WHERE division_code IN ('SU', 'HKU');

-- Or use individual views
SELECT * FROM sc_post_secondary_team_list
UNION ALL
SELECT * FROM sc_hku_invitational_team_list;
```

### Count teams per division
```sql
-- WU divisions
SELECT 
  'WU Men Std' as division,
  COUNT(*) as team_count
FROM wu_men_std_team_list
UNION ALL
SELECT 'WU Ladies Std', COUNT(*) FROM wu_ladies_std_team_list
UNION ALL
SELECT 'WU Mixed Std', COUNT(*) FROM wu_mixed_std_team_list;

-- SC divisions
SELECT 
  'SC Men Std' as division,
  COUNT(*) as team_count
FROM sc_men_std_team_list
UNION ALL
SELECT 'SC Ladies Std', COUNT(*) FROM sc_ladies_std_team_list
UNION ALL
SELECT 'SC Mixed Std', COUNT(*) FROM sc_mixed_std_team_list;
```

---

## Summary

✅ **Total Category Views Created:**
- **TN:** 4 views (Men Open, Ladies Open, Mixed Open, Mixed Corporate)
- **WU:** 9 views (6 regular + 3 by invitation)
- **SC:** 8 views (6 regular + 2 by invitation)
- **Total:** 21 category views

✅ **Key Benefits:**
- Instant automatic categorization after admin approval
- No manual sorting or data migration needed
- Real-time updates as teams are added/modified
- Consistent pattern across all event types
- Easy to query specific divisions

✅ **Database Schema Location:**
- All views defined in: `/db_schema/main.sql`
- Division definitions in: `/DB Config/division.sql`
- Approval logic in: `approve_registration()` function

