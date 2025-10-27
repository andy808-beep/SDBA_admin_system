# Registration Meta Table Restructure

## Overview
The `registration_meta` table has been restructured to be identical to the `team_meta` table structure. This change enables a streamlined admin approval workflow where registrations can be directly moved to the team_meta table after approval.

## Problem Solved
Previously, `registration_meta` had a different structure than `team_meta`, making it difficult for admins to:
- Review registration data in the same format as team data
- Directly approve and transfer data without transformation
- Maintain consistent validation across both tables

## Changes Made

### 1. Database Schema Changes
- **File**: `db_schema/main.sql`
- **Changes**:
  - Dropped old `registration_meta` table structure
  - Created new `registration_meta` with identical structure to `team_meta`
  - Added admin workflow fields: `status`, `admin_notes`, `approved_by`, `approved_at`
  - Added client tracking fields: `client_tx_id`, `event_short_ref`
  - Created triggers for team code assignment and normalization
  - Added indexes for performance
  - Created admin views: `v_pending_registrations`, `v_approved_registrations`
  - Added helper functions: `approve_registration()`, `reject_registration()`

### 2. Submit Function Changes
- **File**: `supabase/functions/submit_registration/index.ts`
- **Changes**:
  - Modified to insert individual team registrations into `registration_meta` instead of aggregate data
  - Removed direct insertion into `team_meta` (now handled by admin approval)
  - Removed race_day_requests and practice_preferences handling (moved to post-approval)
  - Updated response to return `registration_ids` instead of `team_ids`

## New Workflow

### Registration Submission
1. User submits registration form
2. Individual team records are created in `registration_meta` with `status = 'pending'`
3. Each team gets a unique team code assigned by trigger
4. Response returns registration IDs and team codes

### Admin Approval Process
1. Admin views pending registrations via `v_pending_registrations` view
2. Admin can approve individual teams using `approve_registration(reg_id, admin_user_id, notes)`
3. Approved teams are automatically moved to `team_meta` table
4. Admin can reject teams using `reject_registration(reg_id, admin_user_id, notes)`

### Post-Approval
1. Race day requests and practice preferences are handled after teams are in `team_meta`
2. All existing team_meta functionality remains unchanged

## Benefits

1. **Consistent Data Structure**: Both tables now have identical schemas
2. **Direct Data Transfer**: No transformation needed when moving from registration to team
3. **Better Admin UX**: Admin sees exact same data structure they'll be approving
4. **Simplified Workflow**: Single approval process moves data directly
5. **Maintained Validation**: Same constraints and triggers ensure data integrity
6. **Audit Trail**: Clear tracking of approval/rejection with admin notes

## Migration Steps

1. Deploy the updated `db_schema/main.sql` (contains the new registration_meta structure)
2. Deploy the updated submit function
3. Test the new workflow with sample registrations
4. Update any admin interfaces to use the new views and functions

## Backward Compatibility

- Existing `team_meta` data is unaffected
- Old `registration_meta` data is backed up in `registration_meta_backup` table
- All existing team_meta functionality remains unchanged

## Files Modified

1. `db_schema/main.sql` - Updated registration_meta table structure
2. `supabase/functions/submit_registration/index.ts` - Submit function updates
3. `REGISTRATION_META_RESTRUCTURE_SUMMARY.md` - This documentation

## Next Steps

1. Test the migration in a development environment
2. Update admin interfaces to use the new approval workflow
3. Consider adding admin UI for the approval process
4. Update documentation for the new workflow
