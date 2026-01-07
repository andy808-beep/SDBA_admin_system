# Auto-Redirect Analysis - Form Submission Success Flow

## Summary
After successful form submission, users are automatically redirected to the event picker instead of staying on the confirmation page. This document identifies all auto-redirect code.

---

## AUTO-REDIRECT CODE FOUND

### 1. TN Form: `redirectToSuccessPage()` in `tn_wizard.js`

**Location:** `public/js/tn_wizard.js`, line 9216-9232

**What it does:**
- Called from `submitTNForm()` after successful submission (line 9079)
- Stores receipt data in sessionStorage
- **Redirects to:** `/register.html?success=true`
- This redirect is NEEDED to show the success page (not an auto-redirect away from it)

```javascript
function redirectToSuccessPage(receipt) {
  // Store receipt data for success page
  sessionStorage.setItem('success_receipt', JSON.stringify(receipt));
  
  // Build the redirect URL - always use register.html to ensure consistency
  const targetUrl = '/register.html?success=true';
  
  console.log('🔄 redirectToSuccessPage: Redirecting to', targetUrl);
  
  // Use location.href for reliable redirect
  window.location.href = targetUrl;  // <-- THIS REDIRECT IS OK (shows success page)
}
```

**Status:** ✅ KEEP THIS - This redirect TO the success page is necessary

---

### 2. WU/SC Form: `showConfirmation()` in `submit.js`

**Location:** `public/js/submit.js`, line 318-348

**What it does:**
- Called from `submitWUSCForm()` after successful submission (line 2985)
- Displays confirmation box inline (no redirect)
- No auto-redirect logic here

**Status:** ✅ NO CHANGES NEEDED - WU/SC form uses inline confirmation

---

### 3. Success Page Auto-Redirect Timer in `register.html`

**Location:** `public/register.html`, lines 613-653

**What it does:**
- Shows success page when `?success=true` is in URL
- Sets up 8-second countdown timer
- **Auto-redirects after countdown reaches 0** ❌
- Also provides "Redirect now" button for manual redirect

```javascript
// Countdown timer (8 seconds)
let countdown = 8;
const countdownEl = document.getElementById('countdown');
const redirectMessage = document.getElementById('redirectMessage');
const redirectNowBtn = document.getElementById('redirectNowBtn');

function redirectToEventSelection() {
  // Clear session data
  sessionStorage.removeItem('success_receipt');
  
  // Clear TN wizard data
  const tnKeys = Object.keys(sessionStorage).filter(key => key.startsWith('tn_'));
  tnKeys.forEach(key => sessionStorage.removeItem(key));
  
  // Redirect to event selection (clear URL parameters)
  window.location.href = '/register.html';  // <-- THIS IS THE AUTO-REDIRECT TO DISABLE
}

// Update countdown in redirect message
const timer = setInterval(function() {
  countdown--;
  if (redirectMessage && window.i18n) {
    const message = window.i18n.t('redirectingMessage', { seconds: countdown });
    redirectMessage.innerHTML = `<span>${message}</span>`;
  } else if (redirectMessage) {
    redirectMessage.innerHTML = `<span>Redirecting to event selection in ${countdown} second${countdown !== 1 ? 's' : ''}...</span>`;
  }
  
  if (countdown <= 0) {
    clearInterval(timer);
    redirectToEventSelection();  // <-- AUTO-REDIRECT AFTER 8 SECONDS - DISABLE THIS
  }
}, 1000);

// Set up redirect now button
if (redirectNowBtn) {
  redirectNowBtn.addEventListener('click', function() {
    clearInterval(timer);
    redirectToEventSelection();  // <-- KEEP THIS (manual navigation button)
  });
}
```

**Status:** ❌ **DISABLE THE AUTO-REDIRECT TIMER** - Keep manual button

---

### 4. Event Bootstrap: `boot()` in `event_bootstrap.js`

**Location:** `public/js/event_bootstrap.js`, lines 570-608

**What it does:**
- Checks for `?success=true` parameter
- **Skips boot if success page is active** (doesn't interfere)
- This is working correctly - no changes needed

```javascript
async function boot() {
  // CHECK FOR SUCCESS PAGE FIRST - before anything else
  const urlParams = new URLSearchParams(window.location.search);
  const isSuccessParam = urlParams.get('success') === 'true';
  const isSuccessFlag = window.__SUCCESS_PAGE_ACTIVE === true;
  
  if (isSuccessParam || isSuccessFlag) {
    console.log('🚀 Boot: Success page detected, skipping event bootstrap');
    return;  // <-- CORRECTLY SKIPS BOOT - NO CHANGES NEEDED
  }
  
  // ... rest of boot logic
}
```

**Status:** ✅ NO CHANGES NEEDED - Correctly skips boot when success page is active

---

## CHANGES REQUIRED

### Change 1: Disable Auto-Redirect Timer in `register.html`

**File:** `public/register.html`
**Lines:** 613-645

**Action:** 
- Comment out or remove the `setInterval` countdown timer
- Remove or hide the countdown message
- Keep the manual "Redirect now" button (rename to "Back to Event Selection" if desired)

**Current behavior:**
- Shows countdown: "Redirecting to event selection in 8 seconds..."
- Auto-redirects after 8 seconds

**Desired behavior:**
- Remove countdown message
- Remove auto-redirect
- Keep manual navigation button

---

## IMPLEMENTATION PLAN

1. ✅ Keep `redirectToSuccessPage()` in `tn_wizard.js` (needed to show success page)
2. ✅ No changes to `showConfirmation()` in `submit.js` (WU/SC inline confirmation)
3. ✅ No changes to `event_bootstrap.js` (correctly skips boot)
4. ❌ **Disable auto-redirect timer in `register.html`** (lines 613-645)
   - Comment out the `setInterval` timer
   - Remove/hide countdown message element updates
   - Keep manual navigation button functional

---

## TESTING CHECKLIST

After changes:
- [ ] TN form submission shows success page
- [ ] Success page does NOT auto-redirect after 8 seconds
- [ ] Manual "Back to Event Selection" button still works
- [ ] WU/SC form submission works (inline confirmation)
- [ ] Event picker shows correctly after manual navigation
- [ ] Session data is cleared on manual navigation

