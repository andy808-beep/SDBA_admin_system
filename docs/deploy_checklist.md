# Production Deployment Checklist

**Branch:** `chore/cleanup-forms-2025-11-02` → `application-form`  
**Release Tag:** `release-2025-11-02`  
**Date:** 2025-11-02

---

## Pre-Deployment Verification

### ✅ Code Quality
- [ ] All smoke tests passed (see `docs/smoke_test_results_2025-11-02.md`)
- [ ] PR approved by at least 1 reviewer
- [ ] No merge conflicts with `application-form` branch
- [ ] All CI/CD checks passed (if applicable)

### ✅ Documentation
- [ ] `docs/form_code_flow_report.md` reviewed
- [ ] `docs/DEBUG_FUNCTIONS.md` accessible for team
- [ ] `ARCHITECTURE_SUMMARY.md` updated
- [ ] `README.md` current (if exists)

---

## 1. Database Setup

### Schema & Core Tables

**Checklist:**
- [ ] Review `db_schema/main.sql` for latest schema
- [ ] Verify `timeslot_catalog` table exists and populated
- [ ] Verify `team_meta` table structure current
- [ ] Verify `registration_meta` table structure current

**Commands:**
```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('timeslot_catalog', 'team_meta', 'registration_meta');

-- Check RPC functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';
```

---

### Event Configuration

**Checklist:**
- [ ] Apply `DB Config/annual.sql` (annual event config)
- [ ] Apply `DB Config/division.sql` (division definitions)
- [ ] Apply `DB Config/event.sql` (event metadata)
- [ ] Apply `DB Config/order.sql` (packages, items, pricing)

**Verification:**
```sql
-- Check event config loaded
SELECT event_short_ref, form_enabled, practice_enabled 
FROM annual_event_config;

-- Check divisions loaded
SELECT division_code, division_name 
FROM division_config_general;

-- Check packages loaded
SELECT package_code, package_name, base_price 
FROM package;
```

---

### Views & RPCs

**Checklist:**
- [ ] Apply `DB Config/view.sql` (public views for client)
- [ ] Apply `DB Config/rpc.sql` (stored procedures)
- [ ] Apply `DB Config/ui_text.sql` (localization/labels)
- [ ] Apply `DB Config/unique_client_tx_id.sql` (idempotency helpers)

**Verification:**
```sql
-- Check views exist
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name LIKE 'v_%';

-- Test config RPC
SELECT rpc_load_event_config('TN2025');

-- Test public view
SELECT * FROM v_event_config_public WHERE event_short_ref = 'TN2025';
```

---

### Security & RLS

**Checklist:**
- [ ] Apply `DB Config/secdef.sql` (Row Level Security policies)
- [ ] Verify RLS enabled on sensitive tables
- [ ] Confirm anon role permissions correct
- [ ] Test that client can only read public views

**Verification:**
```sql
-- Check RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- Check policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- Test anon access (should work)
SET ROLE anon;
SELECT * FROM v_event_config_public LIMIT 1;
RESET ROLE;

-- Test anon cannot write to core tables (should fail)
SET ROLE anon;
INSERT INTO team_meta (season, team_name) VALUES (2025, 'Test'); -- Should ERROR
RESET ROLE;
```

---

## 2. Edge Function Deployment

### Deploy Function

**Checklist:**
- [ ] Navigate to `supabase/functions/submit_registration/`
- [ ] Review `index.ts` for latest validation logic
- [ ] Deploy function via Supabase CLI or Dashboard

**Commands:**
```bash
# Via Supabase CLI
supabase functions deploy submit_registration

# Or via Dashboard:
# Supabase Dashboard → Edge Functions → submit_registration → Deploy
```

---

### Environment Variables

**Checklist:**
- [ ] `CORS_ALLOW_ORIGINS` includes production domains
- [ ] `CORS_ALLOW_ORIGINS` includes Vercel preview domains
- [ ] No hardcoded secrets in function code
- [ ] Function logs accessible for debugging

**Configuration:**
```bash
# Set CORS origins (comma-separated)
supabase secrets set CORS_ALLOW_ORIGINS="https://yourdomain.com,https://*.vercel.app"

# Verify secrets
supabase secrets list
```

---

### Function Testing

**Checklist:**
- [ ] Test endpoint returns 200 for valid TN payload
- [ ] Test endpoint returns 200 for valid WU payload
- [ ] Test endpoint returns 200 for valid SC payload
- [ ] Test idempotency (duplicate `client_tx_id` handled)
- [ ] Test validation errors return 400 with friendly codes
- [ ] Check logs show successful inserts to `registration_meta`

**Manual Test:**
```bash
# Test with curl (replace URL and payload)
curl -X POST https://[PROJECT_REF].supabase.co/functions/v1/submit_registration \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "eventShortRef": "TN2025",
    "category": "mixed_open",
    "season": 2025,
    "org_name": "Test Org",
    "counts": {"num_teams": 1, "num_teams_opt1": 1, "num_teams_opt2": 0},
    "team_names": ["Test Team"],
    "team_options": ["opt1"],
    "managers": [{"name": "Test Manager", "mobile": "1234567890", "email": "test@test.com"}],
    "race_day": null,
    "practice": {"teams": []},
    "client_tx_id": "test-'$(date +%s)'"
  }'
```

**Expected Response:**
```json
{
  "registration_ids": ["abc123..."],
  "team_codes": ["TN2025-001"]
}
```

---

## 3. Frontend Deployment

### Verify Production Footprint

**Checklist:**
- [ ] Only `public/` directory deployed
- [ ] No `main_form/` in production bundle
- [ ] No test files in production bundle
- [ ] No `.env` or sensitive files exposed

**Files That MUST Be Present:**
```
public/
├── register.html
├── tn_templates.html
├── wu_sc_templates.html
├── env.js
├── supabase_config.js
├── styles.css
├── css/
│   ├── theme.css
│   └── tn_legacy.css
└── js/
    ├── config_loader.js
    ├── event_bootstrap.js
    ├── submit.js
    ├── totals.js
    ├── ui_bindings.js
    ├── tn_wizard.js
    ├── tn_map.js
    ├── tn_practice_store.js
    ├── tn_verification.js
    └── wu_sc_wizard.js
```

---

### Environment Configuration

**Checklist:**
- [ ] `public/env.js` has correct Supabase URL
- [ ] `public/env.js` has correct Supabase anon key
- [ ] `window.__DEV__` flag defined correctly
- [ ] No hardcoded localhost URLs in production code

**Verify `public/env.js`:**
```javascript
window.ENV = {
  SUPABASE_URL: "https://[YOUR_PROJECT_REF].supabase.co",  // ✅ Production URL
  SUPABASE_ANON_KEY: "eyJhbG..."  // ✅ Production anon key
};

// Dev flag should be false on production hostnames
window.__DEV__ = ['localhost', '127.0.0.1'].includes(location.hostname);
```

---

### Debug Gating Verification (CRITICAL)

**Production Console Test:**

Open production URL in browser console:
```javascript
// ALL of these should be false on production:
({
  DEV: !!window.__DEV__,
  DBG: !!window.__DBG,
  DBG_TN: !!window.__DBG_TN,
  DBG_WUSC: !!window.__DBG_WUSC,
  FILL: !!window.fillWUSCAll
})

// Expected result:
// { DEV: false, DBG: false, DBG_TN: false, DBG_WUSC: false, FILL: false }
```

**Checklist:**
- [ ] `window.__DEV__` is `false` on production domain
- [ ] `window.__DBG` is `undefined` on production
- [ ] `window.__DBG_TN` is `undefined` on production
- [ ] `window.__DBG_WUSC` is `undefined` on production
- [ ] `window.fillWUSCAll` is `undefined` on production
- [ ] No debug console logs in production (minimal logging only)

**⚠️ If ANY debug objects are defined on production, DO NOT PROCEED. Fix the gating issue first.**

---

### Vercel Configuration

**Checklist:**
- [ ] Review `vercel.json` for correct routes
- [ ] Ensure `public/` is root directory
- [ ] Headers set correctly (CORS, security headers)
- [ ] Redirects configured (if any)

**Verify `vercel.json`:**
```json
{
  "routes": [
    {
      "src": "/register.html",
      "dest": "/public/register.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

---

## 4. Production E2E Testing

### Minimal Submission Tests

**Environment:** Production URL (e.g., `https://yourdomain.com/register.html`)

#### TN Form Test

**Checklist:**
- [ ] Navigate to `https://[prod-url]/register.html?e=tn`
- [ ] Verify no debug helpers available (console check)
- [ ] Fill minimal form data (1 team, basic info, minimal practice)
- [ ] Submit form
- [ ] Confirm success message with registration ID and team code
- [ ] **Record:** Team code (mask): `TN2025-XXX`

**Verification:**
```sql
-- Check registration exists in database
SELECT r.registration_id, t.team_code, t.team_name, t.org_name
FROM registration_meta r
JOIN team_meta t ON r.registration_id = t.registration_id
WHERE t.team_code LIKE 'TN2025-%'
ORDER BY r.created_at DESC
LIMIT 5;
```

---

#### WU Form Test

**Checklist:**
- [ ] Navigate to `https://[prod-url]/register.html?e=wu`
- [ ] Fill minimal form data (1 team minimum)
- [ ] Submit form
- [ ] Confirm success
- [ ] **Record:** Team code (mask): `WU2025-XXX`

**Verification:**
```sql
-- Check WU registrations
SELECT t.team_code, t.team_name, t.boat_type, t.division_code
FROM team_meta t
WHERE t.team_code LIKE 'WU2025-%'
ORDER BY t.created_at DESC
LIMIT 5;
```

---

#### SC Form Test

**Checklist:**
- [ ] Navigate to `https://[prod-url]/register.html?e=sc`
- [ ] Fill minimal form data
- [ ] Submit form
- [ ] Confirm success
- [ ] **Record:** Team code (mask): `SC2025-XXX`

**Verification:**
```sql
-- Check SC registrations
SELECT t.team_code, t.team_name, t.boat_type, t.division_code
FROM team_meta t
WHERE t.team_code LIKE 'SC2025-%'
ORDER BY t.created_at DESC
LIMIT 5;
```

---

### Idempotency Test

**Checklist:**
- [ ] Complete one submission (any form)
- [ ] Note the `client_tx_id` (check localStorage or network request)
- [ ] Click submit again WITHOUT refreshing page
- [ ] Verify duplicate handling works:
  - [ ] Either returns same registration IDs (200 OK)
  - [ ] Or shows friendly duplicate message (409 Conflict)
- [ ] No JavaScript errors in console
- [ ] Submit button re-enabled after response

---

### Error Handling Test

**Checklist:**
- [ ] Trigger network error (DevTools offline mode)
- [ ] Verify UI shows friendly error message
- [ ] Verify submit button re-enabled
- [ ] Trigger validation error (bad data)
- [ ] Verify server error mapped to friendly message

---

## 5. Release Process

### Pre-Merge Checklist

**Checklist:**
- [ ] All tests passed (see smoke test results doc)
- [ ] Production E2E tests completed above
- [ ] PR approved by required reviewers
- [ ] No outstanding blocking issues
- [ ] Database migrations applied
- [ ] Edge function deployed and tested

---

### Merge to Production Branch

**Commands:**
```bash
# Ensure you're on the cleanup branch
git checkout chore/cleanup-forms-2025-11-02

# Fetch latest from origin
git fetch origin

# Merge latest application-form into cleanup branch (resolve any conflicts)
git merge origin/application-form

# Push if there were any merge commits
git push origin chore/cleanup-forms-2025-11-02

# Switch to production branch
git checkout application-form

# Merge cleanup branch (should be fast-forward)
git merge chore/cleanup-forms-2025-11-02

# Push to production branch
git push origin application-form
```

**Checklist:**
- [ ] Merge completed without conflicts
- [ ] All commits from PR included
- [ ] No unexpected changes introduced
- [ ] `git log` shows clean history

---

### Tag Release

**Commands:**
```bash
# Create annotated tag
git tag -a release-2025-11-02 -m "Production cleanup: debug gating, legacy removal, comprehensive docs"

# Push tag
git push origin release-2025-11-02

# Verify tag
git tag -l "release-*"
```

**Checklist:**
- [ ] Tag created: `release-2025-11-02`
- [ ] Tag pushed to origin
- [ ] Tag visible in GitHub releases

---

### Vercel Production Deploy

**Checklist:**
- [ ] Vercel detects new push to `application-form`
- [ ] Build starts automatically
- [ ] Build completes successfully (green check)
- [ ] Production deployment live at production URL
- [ ] Smoke test production URL (repeat E2E tests above)

**Monitor:**
```bash
# Via Vercel CLI
vercel --prod

# Or via Dashboard:
# Vercel Dashboard → Deployments → Check latest deployment status
```

**Checklist:**
- [ ] Build time: _______ (should be < 2 min)
- [ ] Deploy time: _______ (should be < 1 min)
- [ ] Build logs clean (no critical errors)
- [ ] Deployment URL: `https://[your-domain]`
- [ ] Debug gating verified on live URL

---

## 6. Post-Deployment Verification

### Health Checks

**Checklist:**
- [ ] All form URLs load successfully
  - [ ] `/register.html` (event picker)
  - [ ] `/register.html?e=tn`
  - [ ] `/register.html?e=wu`
  - [ ] `/register.html?e=sc`
- [ ] No 404 errors on static assets
- [ ] CSS loads correctly (no broken styles)
- [ ] JavaScript loads correctly (no console errors)
- [ ] Forms are interactive (can navigate steps)

---

### Security Audit

**Checklist:**
- [ ] Debug helpers NOT exposed (`window.__DBG*` undefined)
- [ ] No sensitive data in HTML source
- [ ] No database credentials exposed
- [ ] CORS headers set correctly (check network tab)
- [ ] Content Security Policy headers present (if configured)

**Quick Security Check:**
```javascript
// In production console - ALL should be false/undefined:
console.table({
  "__DEV__": window.__DEV__,
  "__DBG": typeof window.__DBG,
  "__DBG_TN": typeof window.__DBG_TN,
  "__DBG_WUSC": typeof window.__DBG_WUSC,
  "fillWUSCAll": typeof window.fillWUSCAll,
  "Supabase Client": !!window.sb,  // Should be true (OK to expose)
  "Config": !!window.__CONFIG  // Should be true after form loads (OK to expose)
});
```

---

### Performance Check

**Checklist:**
- [ ] Page load time < 3 seconds (network throttling: Fast 3G)
- [ ] First Contentful Paint < 1.5 seconds
- [ ] Time to Interactive < 4 seconds
- [ ] No excessive JavaScript bundle size
- [ ] No memory leaks (check DevTools Performance tab)

**Lighthouse Audit (Optional):**
```bash
# Run Lighthouse via Chrome DevTools
# Target: Performance > 90, Accessibility > 90, Best Practices > 90
```

---

### Monitoring Setup

**Checklist:**
- [ ] Error tracking enabled (Sentry, LogRocket, etc.)
- [ ] Analytics configured (Google Analytics, etc.)
- [ ] Form submission metrics tracked
- [ ] Edge function logs monitored
- [ ] Database query performance acceptable

---

## 7. Rollback Plan

**If issues arise post-deployment:**

### Quick Rollback

```bash
# Option 1: Revert the merge commit
git checkout application-form
git revert HEAD -m 1  # Revert merge commit
git push origin application-form

# Option 2: Force push previous commit (use with caution)
git checkout application-form
git reset --hard origin/application-form~1
git push origin application-form --force-with-lease

# Option 3: Vercel rollback via Dashboard
# Vercel Dashboard → Deployments → Previous deployment → Promote to Production
```

### Rollback Checklist
- [ ] Identify issue clearly
- [ ] Determine if issue is blocking (immediate rollback needed)
- [ ] Execute rollback
- [ ] Verify rollback successful
- [ ] Notify team
- [ ] Create hotfix branch to address issue
- [ ] Test hotfix thoroughly before re-deploying

---

## 8. Team Communication

### Deployment Announcement

**Notify:**
- [ ] Development team
- [ ] QA team
- [ ] Product/business stakeholders
- [ ] Customer support (if forms are customer-facing)

**Message Template:**
```
🚀 Production Deployment Complete - Forms Cleanup

Date: 2025-11-02
Release: release-2025-11-02
Branch: application-form

Changes:
- Debug helpers now localhost-only (production security improved)
- Legacy prototype code removed (~2,000 lines)
- Comprehensive documentation added
- All forms tested and working (TN/WU/SC)

Production URL: https://[your-domain]/register.html

Verification:
✅ All E2E tests passed
✅ Debug gating verified (no helpers in production)
✅ Database integrations working
✅ Idempotency confirmed

Known Issues: None

Rollback Plan: Available if needed (see deploy checklist)

Please report any issues in #[your-channel]
```

---

## 9. Documentation Handoff

**Checklist:**
- [ ] Share `docs/form_code_flow_report.md` with team
- [ ] Share `docs/DEBUG_FUNCTIONS.md` for development
- [ ] Share `ARCHITECTURE_SUMMARY.md` for onboarding
- [ ] Update any external documentation (wikis, etc.)
- [ ] Record deployment in change log or release notes

---

## Final Sign-Off

**Deployment Completed By:** _______________________  
**Date:** _______________________  
**Time:** _______________________  
**Production URL:** _______________________  
**Release Tag:** `release-2025-11-02`

### Final Verification
- [ ] All checklist items completed
- [ ] Production fully functional
- [ ] Team notified
- [ ] Documentation updated
- [ ] Monitoring in place
- [ ] Rollback plan documented

---

**✅ Deployment Complete!** 🎉

---

## Appendix: Common Issues & Solutions

### Issue: Debug helpers visible in production
**Solution:** 
1. Check `public/env.js` has correct `window.__DEV__` definition
2. Clear browser cache
3. Verify correct branch deployed
4. Check that all debug functions wrapped in `if (!window.__DEV__) return;`

### Issue: Forms not submitting
**Solution:**
1. Check Edge Function is deployed
2. Verify Supabase URL/key correct in `env.js`
3. Check CORS settings in Edge Function
4. Review Edge Function logs for errors
5. Test Edge Function endpoint directly with curl

### Issue: Database records not appearing
**Solution:**
1. Check Edge Function logs for insert errors
2. Verify RLS policies allow insert from Edge Function
3. Check database connection from Edge Function
4. Verify table structure matches payload structure

### Issue: Page not loading
**Solution:**
1. Check Vercel build logs for errors
2. Verify static assets deployed correctly
3. Check browser console for JavaScript errors
4. Verify correct files in `public/` directory
5. Check Vercel configuration routes

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-02  
**Maintained By:** Development Team

