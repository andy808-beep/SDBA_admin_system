# Pre-Deployment Checklist

Complete checklist to verify everything is ready before deploying to production.

## Security & Code Quality

### XSS Protection
- [ ] All XSS fixes applied (see `XSS_FIX_SUMMARY.md`)
- [ ] All `innerHTML` assignments replaced with `SafeDOM.setText()` or `SafeDOM.setHTML()`
- [ ] No user input directly inserted into DOM without sanitization
- [ ] All dynamic content properly escaped
- [ ] Tested with XSS payloads (e.g., `<script>alert('XSS')</script>`)

### Rate Limiting
- [ ] Rate limiting implemented (see `RATE_LIMITING_IMPLEMENTATION.md`)
- [ ] Rate limiter tested locally
- [ ] Multiple rapid submissions blocked correctly
- [ ] Rate limit messages user-friendly
- [ ] Countdown timer works correctly
- [ ] Rate limit persists across page refreshes (localStorage)
- [ ] Rate limit works across multiple browser tabs

### Error Monitoring
- [ ] Sentry configured (see `SENTRY_INTEGRATION_SUMMARY.md`)
- [ ] Sentry DSN set in environment variables
- [ ] Error tracking tested (trigger test error, verify in Sentry)
- [ ] Breadcrumbs working (user actions logged)
- [ ] Sensitive data filtered (no PII in error reports)
- [ ] Development errors filtered out (not sent to Sentry)
- [ ] Production errors sent to Sentry correctly

### Code Quality
- [ ] All linter errors fixed
- [ ] No console.log statements in production code (using Logger)
- [ ] Debug helpers disabled in production (`window.__DEV__` check)
- [ ] No hardcoded credentials or secrets
- [ ] All TODO/FIXME comments addressed or documented
- [ ] Code reviewed and approved

---

## Environment Configuration

### Environment Variables
- [ ] `SUPABASE_URL` set correctly (production URL)
- [ ] `SUPABASE_ANON_KEY` set correctly (production anon key)
- [ ] `SENTRY_DSN` set (if using Sentry)
- [ ] Environment variables set in deployment platform
- [ ] Build script (`scripts/inject-env.js`) tested
- [ ] `public/env.js` will be updated during build
- [ ] No environment variables hardcoded in source files

### Supabase Configuration
- [ ] Production Supabase project created
- [ ] Database schema applied (`db_schema/main.sql`)
- [ ] All tables created and populated
- [ ] RLS (Row Level Security) policies applied
- [ ] Edge function deployed (`supabase/functions/submit_registration`)
- [ ] Edge function environment variables set
- [ ] CORS settings configured in Edge function
- [ ] Production domain added to CORS allowed origins

### Supabase Testing
- [ ] Test connection to production Supabase
- [ ] Test database queries work
- [ ] Test Edge function endpoint directly
- [ ] Test form submission to production Supabase
- [ ] Verify data appears in production database
- [ ] Test RLS policies (anon user can only read public views)
- [ ] Test Edge function can write to database

---

## Testing

### Manual Smoke Tests
- [ ] **TN Form**: Load, fill, submit successfully
- [ ] **WU Form**: Load, fill, submit successfully
- [ ] **SC Form**: Load, fill, submit successfully
- [ ] **Event Picker**: Loads and displays events correctly
- [ ] **Form Navigation**: All steps work (next/back buttons)
- [ ] **Validation**: Required fields show errors
- [ ] **Error Handling**: Network errors show user-friendly messages
- [ ] **Success Flow**: Confirmation page shows after submission
- [ ] **Receipt**: Registration ID and team codes displayed

### Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Device Testing
- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)
- [ ] Touch interactions work
- [ ] Forms usable on small screens
- [ ] No horizontal scrolling

### Error Scenarios
- [ ] Network offline → Shows error message
- [ ] Invalid form data → Shows validation errors
- [ ] Server error (500) → Shows user-friendly message
- [ ] Rate limit exceeded → Shows rate limit message
- [ ] Duplicate submission → Handled correctly (idempotency)

---

## Infrastructure

### DNS & Domain
- [ ] Domain name registered
- [ ] DNS records configured (A, CNAME, or ALIAS)
- [ ] DNS propagation verified (check with `dig` or `nslookup`)
- [ ] Domain points to deployment platform
- [ ] Custom domain configured in deployment platform

### SSL Certificate
- [ ] SSL certificate active (HTTPS enabled)
- [ ] Certificate valid (not expired)
- [ ] Certificate covers all domains (including www)
- [ ] HTTP redirects to HTTPS
- [ ] No mixed content warnings
- [ ] SSL Labs grade A or A+

### CORS Settings
- [ ] Supabase Edge Function CORS configured
- [ ] Production domain in allowed origins
- [ ] Preview/staging domains in allowed origins (if applicable)
- [ ] CORS headers verified (check Network tab)
- [ ] No CORS errors in browser console

### Deployment Platform
- [ ] Deployment platform account active
- [ ] Git repository connected
- [ ] Correct branch selected (`application-form`)
- [ ] Build settings configured
- [ ] Environment variables set
- [ ] Build script tested
- [ ] Deployment logs accessible

---

## Monitoring & Logging

### Error Monitoring
- [ ] Sentry project created
- [ ] Sentry DSN configured
- [ ] Sentry alerts configured (email/Slack)
- [ ] Test error sent to Sentry successfully
- [ ] Sentry dashboard accessible

### Logging
- [ ] Deployment platform logs accessible
- [ ] Supabase logs accessible
- [ ] Edge function logs accessible
- [ ] Log retention period configured
- [ ] Log aggregation set up (if applicable)

### Analytics (Optional)
- [ ] Analytics tool configured (Google Analytics, etc.)
- [ ] Tracking code added
- [ ] Events tracked (form submissions, errors)
- [ ] Dashboard accessible

---

## Documentation

### Code Documentation
- [ ] `DEPLOYMENT.md` reviewed and up to date
- [ ] `TESTING_CHECKLIST.md` created
- [ ] `PRE_DEPLOYMENT_CHECKLIST.md` (this file) completed
- [ ] `env.example` updated
- [ ] README.md updated (if exists)

### Runbooks
- [ ] Rollback procedure documented
- [ ] Emergency contact list available
- [ ] Troubleshooting guide accessible
- [ ] Deployment runbook reviewed

---

## Final Verification

### Pre-Deploy Verification
- [ ] All checklist items above completed
- [ ] Code reviewed and approved
- [ ] All tests passing
- [ ] No blocking issues
- [ ] Team notified of deployment
- [ ] Deployment window scheduled (if applicable)

### Deployment Readiness
- [ ] Backup of current production (if updating)
- [ ] Rollback plan ready
- [ ] Monitoring dashboards open
- [ ] Team available for support
- [ ] Communication channels ready

---

## Sign-Off

**Prepared By:** _______________________  
**Date:** _______________________  
**Time:** _______________________  

**Reviewed By:** _______________________  
**Date:** _______________________  

**Approved By:** _______________________  
**Date:** _______________________  

---

## Notes

_Use this section to document any issues, concerns, or special considerations:_




---

**Last Updated:** 2025-01-XX  
**Version:** 1.0

