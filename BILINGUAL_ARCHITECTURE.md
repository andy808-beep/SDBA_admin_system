# Bilingual Architecture Analysis

**Date:** December 15, 2025  
**Analyzed by:** Cursor AI  
**Branch:** `application-form`

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total unique strings to translate** | ~180-200 |
| **Database tables with bilingual columns** | 6 |
| **Functions needing updates** | ~35-40 |
| **Alert/confirm/prompt dialogs** | 0 (none found) |
| **Estimated implementation time** | 16-24 hours |
| **Complexity** | Medium |

---

## 1. Static Text Inventory

### 1.1 Buttons & Navigation

| Text | File | Line(s) |
|------|------|---------|
| `"Next →"` | `tn_templates.html` | 63, 90, 147, 220 |
| `"← Back"` | `tn_templates.html` | 89, 146, 219, 291 |
| `"Next: Team Information →"` | `tn_wizard.js` | 450 |
| `"← Back: Team Selection"` | `tn_wizard.js` | 1112 |
| `"Next: Race Day Arrangements →"` | `tn_wizard.js` | 1114 |
| `"← Back: Team Information"` | `tn_wizard.js` | 1385 |
| `"Next: Practice Booking →"` | `tn_wizard.js` | 1388 |
| `"← Back: Race Day"` | `tn_wizard.js` | (Step 4 nav) |
| `"Next: Summary →"` | `tn_wizard.js` | (Step 4 nav) |
| `"Submit Application"` | `tn_templates.html` | 292 |
| `"📋 Copy Details"` | `register.html` | 463 |
| `"Go Now"` | `register.html` | 471 |
| `"📋 Copy from Team 1"` | `tn_templates.html` | 167 |

### 1.2 Page Titles & Headings

| Text | File | Line(s) |
|------|------|---------|
| `"Race Registration"` | `register.html` | 6, 421 |
| `"Please select the race you would like to register for:"` | `register.html` | 422 |
| `"Application Submitted Successfully!"` | `register.html` | 439 |
| `"Thank you for your registration..."` | `register.html` | 440-441 |
| `"Registration Details"` | `register.html` | 445 |
| `"Redirecting to event selection in X seconds..."` | `register.html` | 468-469 |
| `"Select Race Category"` | `tn_templates.html` | 7 |
| `"Team Information"` | `tn_templates.html` | 72 |
| `"Race Day Arrangement"` | `tn_templates.html` | 99 |
| `"🛶 Practice Booking (Jan–Jul 2026)"` | `tn_templates.html` | 156 |
| `"Application Summary"` | `tn_templates.html` | 228 |
| `"Select Team Details"` | `wu_sc_templates.html` | 6 |
| `"Organization & Team Manager Information"` | `tn_wizard.js` | 1007 |
| `"Organization/Group Information"` | `tn_wizard.js` | 1011 |
| `"Team Manager 1 (Required)"` | `tn_wizard.js` | 1025 |
| `"Team Manager 2 (Required)"` | `tn_wizard.js` | 1053 |
| `"Team Manager 3 (Optional)"` | `tn_wizard.js` | 1081 |
| `"Race Day Arrangements"` | `tn_wizard.js` | 1358 |
| `"Time Slot Preference Ranking"` | `tn_templates.html` | 175 |
| `"Practice Booking Summary"` | `tn_templates.html` | 210 |

### 1.3 Stepper Steps

| Text | File | Line(s) |
|------|------|---------|
| `"1. Teams"` | `tn_wizard.js` | 182 |
| `"2. Organization"` | `tn_wizard.js` | 183 |
| `"3. Race Day"` | `tn_wizard.js` | 184 |
| `"4. Practice"` | `tn_wizard.js` | 185 |
| `"5. Summary"` | `tn_wizard.js` | 186 |
| `"1. Teams"` | `wu_sc_wizard.js` | 326 |
| `"2. Team Information"` | `wu_sc_wizard.js` | 327 |
| `"3. Race Day"` | `wu_sc_wizard.js` | 328 |
| `"4. Summary"` | `wu_sc_wizard.js` | 329 |

### 1.4 Form Labels

| Text | File | Line(s) |
|------|------|---------|
| `"Choose category:"` | `tn_templates.html` | 9 |
| `"How many teams will you register?"` | `tn_templates.html` | 17 |
| `"Organization / Group Name"` | `tn_templates.html` | 76 |
| `"Mailing Address"` | `tn_templates.html` | 80 |
| `"Team Manager Contact"` | `tn_templates.html` | 83 |
| `"Name *"` | `tn_wizard.js` | 1030, 1058, 1087 |
| `"Phone *"` | `tn_wizard.js` | 1035, 1063, 1092 |
| `"Email *"` | `tn_wizard.js` | 1045, 1073, 1102 |
| `"Team Name *"` | `tn_wizard.js` | 770 |
| `"Race Category *"` | `tn_wizard.js` | 775 |
| `"Entry Option *"` | `tn_wizard.js` | 781 |
| `"How many teams do you want to register?"` | `tn_wizard.js` | 431 |
| `"Select Team:"` | `tn_templates.html` | 160 |
| `"Athlete Marquee"` | `tn_templates.html` | 103 |
| `"Official Steersman"` | `tn_templates.html` | 109 |
| `"Junk Registration"` | `tn_templates.html` | 124 |
| `"Speed Boat Registration"` | `tn_templates.html` | 134 |
| `"Pleasure Boat No.:"` | `tn_templates.html` | 126 |
| `"Speed Boat No.:"` | `tn_templates.html` | 136 |
| `"Division"` | `wu_sc_wizard.js` | 549 |
| `"Entry Group"` | `wu_sc_wizard.js` | 553 |

### 1.5 Placeholder Text

| Text | File | Line(s) |
|------|------|---------|
| `"-- Please choose --"` | `tn_templates.html` | 11 |
| `"-- Select --"` | `tn_templates.html` | 188, etc. |
| `"-- Select number of teams --"` | `tn_wizard.js` | 433 |
| `"-- Select category --"` | `tn_wizard.js` | 778 |
| `"Enter team name"` | `tn_wizard.js` | 771 |
| `"Enter organization or group name"` | `tn_wizard.js` | 1014 |
| `"Enter complete address"` | `tn_wizard.js` | 1021 |
| `"Enter full name"` | `tn_wizard.js` | 1031, 1059, 1087 |
| `"8-digit number"` | `tn_wizard.js` | 1038, 1066, 1095 |
| `"Enter email address"` | `tn_wizard.js` | 1047, 1075, 1103 |
| `"e.g. 2"` | `tn_templates.html` | 19 |
| `"Room/Floor, Building Name, Street, District, City"` | `tn_templates.html` | 81 |

### 1.6 Validation Messages

| Text | File | Function |
|------|------|----------|
| `"Please select number of teams"` | `tn_wizard.js` | `validateStep1()` |
| `"Please enter team name for Team X"` | `tn_wizard.js` | `validateStep1()` |
| `"Please select Division for Team X"` | `wu_sc_wizard.js` | `validateStep1()` |
| `"Please select Entry Group for Team X"` | `wu_sc_wizard.js` | `validateStep1()` |
| `"Please enter organization name"` | `wu_sc_wizard.js` | `validateStep2()` |
| `"Please enter mailing address"` | `wu_sc_wizard.js` | `validateStep2()` |
| `"Please enter Team Manager X name"` | `wu_sc_wizard.js` | `validateStep2()` |
| `"Please enter Team Manager X phone"` | `wu_sc_wizard.js` | `validateStep2()` |
| `"Please enter Team Manager X email"` | `wu_sc_wizard.js` | `validateStep2()` |
| `"Team Manager X phone must be an 8-digit Hong Kong number"` | `wu_sc_wizard.js` | `validateStep2()` |
| `"Team Manager X email is invalid"` | `wu_sc_wizard.js` | `validateStep2()` |
| `"Please enter a valid email address."` | `validation.js` | `validateEmailField()` |
| `"Please enter an 8-digit Hong Kong phone number."` | `validation.js` | `validatePhoneField()` |
| `"Warning: Duplicate team names found in the same category..."` | `tn_wizard.js` | `checkForDuplicateNames()` |
| `"Configuration not loaded. Please refresh the page."` | `wu_sc_wizard.js` | `renderTeamDetails()` |
| `"⚠️ Configuration Issue: No boat types are configured..."` | `wu_sc_wizard.js` | `renderTeamDetails()` |
| `"No entry groups available for X. Please contact support."` | `wu_sc_wizard.js` | `showDivisionRow()` |

### 1.7 Status/Loading Messages

| Text | File | Line(s) |
|------|------|---------|
| `"Loading..."` | (implicit in CSS spinner) | `register.html` |
| `"Submitting..."` | `submit.js` | (implied in button state) |
| `"Network error. Please try again."` | `submit.js` | 427 |
| `"Please wait before submitting again..."` | `submit.js` | 339 |
| `"Registration Confirmation"` | `submit.js` | 315 |
| `"✓ Copied!"` | `register.html` | 598 |
| `"Clear Cache & Reload"` | `wu_sc_wizard.js` | 527 |

### 1.8 Error Messages (from submit.js mapError)

| Code | Text | File | Line(s) |
|------|------|------|---------|
| `E.EVENT_DISABLED` | `"This event is currently not accepting registrations."` | `submit.js` | 138 |
| `E.DIVISION_INACTIVE` | `"That division is not open."` | `submit.js` | 139 |
| `E.PACKAGE_INACTIVE` | `"Selected package is unavailable."` | `submit.js` | 140 |
| `E.QTY_LIMIT` | `"Quantity exceeds the allowed limit."` | `submit.js` | 141 |
| `E.PRACTICE_WINDOW` | `"Selected practice date is outside the allowed window."` | `submit.js` | 142 |
| `E.SLOT_INVALID` | `"Selected practice time slot is invalid."` | `submit.js` | 143 |
| `E.DUPLICATE` | `"A submission with the same details already exists."` | `submit.js` | 144 |
| `E.HONEYPOT` | `"Submission blocked. Please try again."` | `submit.js` | 145 |
| `E.RATE_LIMIT` | `"Too many attempts. Please wait a minute and try again."` | `submit.js` | 146 |
| `E.BAD_PAYLOAD` | `"Your submission looks incomplete. Please review and resubmit."` | `submit.js` | 147 |
| `E.UNKNOWN` | `"Something went wrong. Please try again."` | `submit.js` | 148 |

### 1.9 Summary Page Labels

| Text | File | Line(s) |
|------|------|---------|
| `"Basics"` | `tn_templates.html` | 231 |
| `"Season"` | `tn_templates.html` | 233 |
| `"Organization"` | `tn_templates.html` | 234 |
| `"Mailing Address"` | `tn_templates.html` | 235 |
| `"Teams"` | `tn_templates.html` | 239 |
| `"Team Name"` | `tn_templates.html` | 244 |
| `"Entry Option"` | `tn_templates.html` | 245 |
| `"No teams"` | `tn_templates.html` | 248 |
| `"(Team codes are assigned at submit time.)"` | `tn_templates.html` | 251 |
| `"Team Managers"` | `tn_templates.html` | 254 |
| `"Name"` | `tn_templates.html` | 259 |
| `"Mobile"` | `tn_templates.html` | 260 |
| `"Email"` | `tn_templates.html` | 261 |
| `"No manager information"` | `tn_templates.html` | 264 |
| `"Race Day Arrangement"` | `tn_templates.html` | 268 |
| `"Marquee Qty"` | `tn_templates.html` | 272 |
| `"Steersman (with boat)"` | `tn_templates.html` | 273 |
| `"Steersman (no boat)"` | `tn_templates.html` | 274 |
| `"Junk Boat # / Qty"` | `tn_templates.html` | 275 |
| `"Speed Boat # / Qty"` | `tn_templates.html` | 276 |
| `"Practice Booking (per Team)"` | `tn_templates.html` | 282 |
| `"No practice booking data."` | `tn_templates.html` | 284 |
| `"Total Hours Selected:"` | `tn_templates.html` | 211 |
| `"Extra Practice Sessions"` | `tn_templates.html` | 212 |
| `"Trainer Sessions"` | `tn_templates.html` | 213 |
| `"Steersman Sessions"` | `tn_templates.html` | 214 |
| `"Division"` | `wu_sc_templates.html` | 134 |
| `"Entry Group"` | `wu_sc_templates.html` | 135 |
| `"Total Amount"` | `wu_sc_templates.html` | 165 |
| `"Total Cost"` | `wu_sc_templates.html` | 163 |

### 1.10 Category Options (TN)

| Text | File | Line(s) |
|------|------|---------|
| `"Men Open"` | `tn_templates.html` | 12 |
| `"Ladies Open"` | `tn_templates.html` | 13 |
| `"Mixed Open"` | `tn_templates.html` | 14 |
| `"Mixed Corporate"` | `tn_templates.html` | 15 |
| `"Open Division – Men"` | `tn_wizard.js` | 703 |
| `"Open Division – Ladies"` | `tn_wizard.js` | 704 |
| `"Mixed Division – Open"` | `tn_wizard.js` | 705 |
| `"Mixed Division – Corporate"` | `tn_wizard.js` | 706 |

### 1.11 Package Content Labels

| Text | File | Line(s) |
|------|------|---------|
| `"Entry Fee"` | `tn_templates.html` | 29 |
| `"Practice with equipment x12hrs"` | `tn_templates.html` | 30 |
| `"Souvenir Tee x20 pieces"` | `tn_templates.html` | 31 |
| `"20L Dry Bag x1"` | `tn_templates.html` | 32 |
| `"Padded Shorts x20 pieces"` | `tn_templates.html` | 33 |
| `"per team"` | `tn_templates.html` | 34, 48 |
| `"How many teams choose Option X:"` | `tn_templates.html` | 36, 50 |
| `"Practice:"` | `tn_wizard.js` | 875 |
| `"T-Shirts:"` | `tn_wizard.js` | 879 |
| `"Padded Shorts:"` | `tn_wizard.js` | 883 |
| `"Dry Bags:"` | `tn_wizard.js` | 887 |
| `"Click to select"` | `tn_wizard.js` | 891 |
| `"Selected"` | `tn_wizard.js` | 951 |

### 1.12 Calendar/Practice Labels

| Text | File | Line(s) |
|------|------|---------|
| `"Rank"` | `tn_templates.html` | 180 |
| `"2-Hour Session"` | `tn_templates.html` | 181 |
| `"1-Hour Session"` | `tn_templates.html` | 182 |
| `"1st Choice"` | `tn_templates.html` | 186 |
| `"2nd Choice"` | `tn_templates.html` | 191 |
| `"3rd Choice"` | `tn_templates.html` | 196 |
| `"Sun"`, `"Mon"`, `"Tue"`, `"Wed"`, `"Thu"`, `"Fri"`, `"Sat"` | `tn_wizard.js` | 1846-1852 |
| `"1h"` / `"2h"` | `tn_wizard.js` | 1919-1920 |
| `"NONE"` / `"S"` / `"T"` / `"ST"` | `tn_wizard.js` | 1923-1926 |
| `"Teams hired Official Steersman during practice"` | `tn_templates.html` | 111 |
| `"Teams DID NOT hire Official Steersman during practice"` | `tn_templates.html` | 116 |
| `"Unit Price:"` | `tn_templates.html` | 104, 113, 118, 128, 138 |

### 1.13 Success Page Labels

| Text | File | Line(s) |
|------|------|---------|
| `"Registration ID:"` | `register.html` | 447 |
| `"Team Codes:"` | `register.html` | 449 |
| `"Confirmation Email:"` | `register.html` | 451 |
| `"Please save your Registration ID and Team Codes for your records."` | `register.html` | 457-458 |

### 1.14 Miscellaneous

| Text | File | Line(s) |
|------|------|---------|
| `"—"` (em dash placeholder) | Multiple | Throughout |
| `"N/A"` | `register.html` | 588, 590, 591 |
| `"hours"` | `tn_wizard.js` | 875 |
| `"pieces"` / `"piece"` | `tn_wizard.js` | 879, 883, 887 |
| `"HK$"` | Multiple | Throughout |
| `"second(s)"` / `"minute(s)"` | `submit.js` | 173-180 |

---

## 2. Database Content Analysis

### 2.1 Tables with Bilingual Columns

Based on analysis of `config_loader.js` and database views, these tables/views have bilingual columns:

| Table/View | English Column | Chinese Column | Used In |
|------------|----------------|----------------|---------|
| `v_divisions_public` | `name_en` | `name_tc` | `tn_wizard.js`, `wu_sc_wizard.js`, `config_loader.js` |
| `v_packages_public` | `title_en` | `title_tc` | `tn_wizard.js`, `wu_sc_wizard.js`, `config_loader.js` |
| `v_race_day_items_public` | `title_en` | `title_tc` | `tn_wizard.js`, `config_loader.js` |
| `v_practice_items_public` | `title_en` | `title_tc` | `config_loader.js` |
| `v_ui_texts_public` | `text_en` | `text_tc` | `config_loader.js` |
| `v_event_config_public` | `event_long_name_en` | (likely `event_long_name_tc`) | `event_bootstrap.js` |
| `v_event_config_public` | `event_date_en` | (likely `event_date_tc`) | `event_bootstrap.js` |
| `v_event_config_public` | `event_location_en` | (likely `event_location_tc`) | `event_bootstrap.js` |

### 2.2 Config Object Structure

The `window.__CONFIG` object contains these bilingual-capable collections:

```javascript
{
  divisions: [{ name_en, name_tc, division_code, ... }],
  packages: [{ title_en, title_tc, package_code, listed_unit_price, ... }],
  race_day_items: [{ title_en, title_tc, item_code, listed_unit_price, ... }],
  practice: [{ title_en, title_tc, item_code, ... }],
  timeslots: [{ label, slot_code, ... }],  // May need label_en/label_tc
  uiTexts: [{ text_en, text_tc, key, screen, ... }],
  event: { event_long_name_en, event_short_ref, ... }
}
```

---

## 3. Functions Requiring Updates

### 3.1 Functions Displaying Database Content

| Function | File | Description | Change Needed |
|----------|------|-------------|---------------|
| `generateTeamFields()` | `tn_wizard.js:674` | Displays division names | Use `name_en`/`name_tc` based on lang |
| `populatePackageOptions()` | `tn_wizard.js:835` | Displays package titles | Use `title_en`/`title_tc` based on lang |
| `createRaceDayForm()` | `tn_wizard.js:1331` | Displays race day items | Use `title_en`/`title_tc` based on lang |
| `groupRaceDayItems()` | `tn_wizard.js:1425` | Groups race day items | Labels need translation |
| `loadBoatTypesForTeam()` | `wu_sc_wizard.js:582` | Displays boat types | Use `title_en`/`title_tc` based on lang |
| `loadDivisionsForTeam()` | `wu_sc_wizard.js:668` | Displays divisions | Use `name_en`/`name_tc` based on lang |
| `showDivisionRow()` | `wu_sc_wizard.js:688` | Displays divisions | Use `name_en`/`name_tc` based on lang |
| `populateTeamsSummary()` | `wu_sc_wizard.js:980` | Displays team summary | Dynamic content |
| `populateManagersSummary()` | `wu_sc_wizard.js:1019` | Displays manager summary | Labels need translation |
| `populateRaceDaySummary()` | `wu_sc_wizard.js:1076` | Displays race day summary | Dynamic content |
| `renderEventCards()` | `event_bootstrap.js:280` | Displays event names | Use `name_en`/`name_tc` based on lang |
| `loadBoatTypes()` | `ui_bindings.js:447` | Displays boat types | Use `name_en`/`name_tc` based on lang |
| `loadDivisions()` | `ui_bindings.js:495` | Displays divisions | Use `name_en`/`name_tc` based on lang |

### 3.2 Functions Showing Validation/Error Messages

| Function | File | Description |
|----------|------|-------------|
| `validateStep1()` | `tn_wizard.js` | Team validation messages |
| `validateStep2()` | `tn_wizard.js`, `wu_sc_wizard.js` | Manager validation messages |
| `validateStep3()` | `tn_wizard.js`, `wu_sc_wizard.js` | Race day validation |
| `validateEmailField()` | `validation.js:135` | Email validation message |
| `validatePhoneField()` | `validation.js:164` | Phone validation message |
| `showError()` | `submit.js:153`, `wu_sc_wizard.js:1433` | Error display |
| `mapError()` | `submit.js:133` | Error code mapping |
| `checkForDuplicateNames()` | `tn_wizard.js:575` | Duplicate warning |

### 3.3 Functions Creating Static UI Text

| Function | File | Description |
|----------|------|-------------|
| `initStepNavigation()` | `tn_wizard.js:175` | Stepper labels |
| `initStepper()` | `wu_sc_wizard.js:322` | Stepper labels |
| `createTeamCountSelector()` | `tn_wizard.js:421` | Team count labels |
| `createOrganizationForm()` | `tn_wizard.js:1000` | Form labels |
| `renderManagerFields()` | `wu_sc_wizard.js:844` | Manager form labels |
| `populateSummary()` | `wu_sc_wizard.js:943` | Summary labels |
| `showConfirmation()` | `submit.js:288` | Confirmation dialog |

### 3.4 Functions with Template Literals

| Function | File | Lines | Description |
|----------|------|-------|-------------|
| `createDayContent()` | `tn_wizard.js:1899` | Duration/helper dropdowns |
| `createMonthBlock()` | `tn_wizard.js:1830` | Weekday headers |
| `initStep1()` - `teamField.innerHTML` | `tn_wizard.js:764` | Team field template |
| `createOrganizationForm()` | `tn_wizard.js:1005` | Full form template |
| `createRaceDayForm()` | `tn_wizard.js:1356` | Race day form template |
| `renderManagerFields()` | `wu_sc_wizard.js:848` | Manager fields template |
| `populatePackageOptions()` | `tn_wizard.js:861` | Package box template |

---

## 4. Proposed File Structure

```
public/
├── js/
│   ├── i18n/
│   │   ├── translations.js      # Translation dictionary (en/zh-Hant)
│   │   ├── i18n-engine.js       # Core i18n logic class
│   │   ├── db-localization.js   # Helpers for database content
│   │   └── language-switcher.js # UI component logic
│   └── ... (existing files)
├── css/
│   └── language-switcher.css    # Styles for switcher
└── ... (existing files)

Files to Update:
├── public/register.html              # Add switcher, i18n data attributes
├── public/tn_templates.html          # Add i18n data attributes
├── public/wu_sc_templates.html       # Add i18n data attributes
├── public/js/tn_wizard.js            # Use i18n for dynamic text
├── public/js/wu_sc_wizard.js         # Use i18n for dynamic text
├── public/js/validation.js           # Use i18n for messages
├── public/js/submit.js               # Use i18n for error messages
├── public/js/event_bootstrap.js      # Use i18n for event names
├── public/js/ui_bindings.js          # Use i18n for labels
└── public/js/config_loader.js        # Enhance to support localized config
```

---

## 5. Implementation Recommendations

### 5.1 Language Switcher Placement

**Recommended:** Top-right corner of `.form-container`, visible on all steps.

```html
<!-- In register.html, inside .form-container -->
<div id="languageSwitcher" class="language-switcher">
  <button data-lang="en" class="active">EN</button>
  <button data-lang="zh-Hant">繁</button>
</div>
```

### 5.2 Load Order for i18n Scripts

```html
<!-- In register.html, before other JS -->
<script type="module" src="./js/i18n/translations.js"></script>
<script type="module" src="./js/i18n/i18n-engine.js"></script>
<script type="module" src="./js/i18n/db-localization.js"></script>
<script type="module" src="./js/i18n/language-switcher.js"></script>
```

### 5.3 Translation Key Strategy

Use dot-notation keys for organization:

```javascript
{
  "buttons.next": "Next →",
  "buttons.back": "← Back",
  "buttons.submit": "Submit Application",
  "steps.teams": "1. Teams",
  "steps.organization": "2. Organization",
  "labels.teamName": "Team Name",
  "validation.required": "This field is required",
  "errors.E.RATE_LIMIT": "Too many attempts. Please wait and try again."
}
```

### 5.4 Database Content Strategy

Create a helper function:

```javascript
// db-localization.js
export function getLocalizedField(item, fieldBase) {
  const lang = getCurrentLanguage(); // 'en' or 'zh-Hant'
  const suffix = lang === 'en' ? '_en' : '_tc';
  return item[fieldBase + suffix] || item[fieldBase + '_en'] || '';
}

// Usage:
const divisionName = getLocalizedField(division, 'name'); // Returns name_en or name_tc
```

### 5.5 Re-render Strategy on Language Change

```javascript
// When language changes:
window.addEventListener('languageChange', (e) => {
  const lang = e.detail.language;
  
  // 1. Update all static text with data-i18n attributes
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  
  // 2. Re-render dynamic content (wizard steps)
  if (window.__CURRENT_WIZARD === 'tn') {
    // Re-initialize current step
    loadStep(currentStep);
  } else if (window.__CURRENT_WIZARD === 'wu_sc') {
    loadStep(currentStep);
  }
});
```

### 5.6 Testing Strategy

1. **Unit Tests**: Test translation function with all keys
2. **Visual Review**: Screenshot comparison EN vs ZH
3. **Validation**: Ensure all validation messages appear in correct language
4. **Dynamic Content**: Verify database content displays correct language
5. **Persistence**: Verify language preference persists across page reloads
6. **Edge Cases**: Test with missing translations (fallback to English)

### 5.7 Potential Issues to Watch

1. **Text Overflow**: Chinese text may be longer/shorter than English
2. **Font Support**: Ensure Chinese fonts are loaded
3. **Date/Number Formatting**: Consider locale-specific formatting
4. **Form Validation**: Native HTML5 validation messages are browser-language
5. **PDF/Email Generation**: If forms generate documents, those need translation too
6. **Cached Translations**: Clear localStorage if translation version changes
7. **Missing Translations**: Always fallback to English gracefully

---

## 6. Questions & Answers

### Q1: How many unique user-facing strings exist?

**~180-200 unique strings** need translation, broken down as:
- Buttons/Navigation: ~25
- Page Titles/Headings: ~30
- Form Labels: ~40
- Placeholders: ~15
- Validation Messages: ~25
- Error Messages: ~15
- Summary Labels: ~30
- Misc (weekdays, units, etc.): ~20

### Q2: Which database tables have bilingual columns?

**6 tables/views** have bilingual columns:
1. `v_divisions_public` (name_en/name_tc)
2. `v_packages_public` (title_en/title_tc)
3. `v_race_day_items_public` (title_en/title_tc)
4. `v_practice_items_public` (title_en/title_tc)
5. `v_ui_texts_public` (text_en/text_tc)
6. `v_event_config_public` (event_long_name_en, event_date_en, event_location_en - likely have _tc counterparts)

### Q3: Which functions render database content?

**~13 functions** render database content directly:
- `generateTeamFields()`, `populatePackageOptions()`, `createRaceDayForm()` (tn_wizard.js)
- `loadBoatTypesForTeam()`, `loadDivisionsForTeam()`, `showDivisionRow()` (wu_sc_wizard.js)
- `loadBoatTypes()`, `loadDivisions()` (ui_bindings.js)
- `renderEventCards()` (event_bootstrap.js)
- Summary population functions in both wizards

### Q4: How many alert/confirm/prompt dialogs exist?

**0 dialogs** - The codebase uses inline error messages and toast-style notifications instead of browser dialogs. No `alert()`, `confirm()`, or `prompt()` calls were found in the analyzed files.

### Q5: Which files need the most changes?

**Ranked by changes needed:**
1. `tn_wizard.js` - HIGH (~50+ changes, most text is here)
2. `wu_sc_wizard.js` - HIGH (~40 changes)
3. `tn_templates.html` - MEDIUM (~30 changes)
4. `wu_sc_templates.html` - MEDIUM (~15 changes)
5. `register.html` - MEDIUM (~20 changes)
6. `validation.js` - LOW (~5 changes)
7. `submit.js` - LOW (~15 changes for error messages)
8. `event_bootstrap.js` - LOW (~5 changes)
9. `ui_bindings.js` - LOW (~5 changes)
10. `config_loader.js` - LOW (~2 changes)

### Q6: Are there any third-party libraries showing text?

**No third-party libraries** with user-facing text were identified. The codebase uses:
- Native JavaScript
- Supabase client (no UI)
- Custom utilities (SafeDOM, Logger, etc.)

### Q7: What's the best place to inject the language switcher?

**Top-right of `.form-container`** in `register.html`, positioned:
- Before the event picker
- Fixed position on mobile
- Visible across all wizard steps

### Q8: Are there any generated/templated HTML strings?

**Yes, significant amounts:**
- `tn_wizard.js` has multiple template literal blocks (lines 428-458, 764-793, 861-896, 1005-1118, 1356-1391)
- `wu_sc_wizard.js` has template literals (lines 542-558, 848-917)
- These all need to use the translation system

### Q9: What's the estimated complexity?

**MEDIUM complexity** because:
- ✅ Clear separation between static and dynamic content
- ✅ Database already has bilingual columns
- ✅ No third-party library conflicts
- ⚠️ Many template literals need refactoring
- ⚠️ Two separate wizard implementations to update
- ⚠️ Need to handle re-rendering on language change

### Q10: Any edge cases or concerns?

1. **Form Revalidation**: When switching languages mid-form, validation messages should update
2. **SessionStorage Keys**: Team data keys use English prefixes - keep consistent
3. **Practice Calendar**: Weekday abbreviations need translation (Sun, Mon, etc.)
4. **Currency Format**: HK$ symbol should stay consistent
5. **Date Format**: Consider Chinese date format (2026年1月)
6. **Long Chinese Text**: Some labels may need CSS adjustments for overflow
7. **Email Templates**: If confirmation emails are sent, they need separate translation

---

## 7. Next Steps

### Step 2: Create Translation Dictionary
- Create `translations.js` with all ~180-200 strings
- Organize by category (buttons, labels, errors, etc.)
- Include both English and Traditional Chinese

### Step 3: Build i18n Engine
- Create `i18n-engine.js` with:
  - `t(key)` function for translations
  - `getCurrentLanguage()` / `setLanguage()`
  - localStorage persistence
  - Fallback handling

### Step 4: Build Database Localization Helper
- Create `db-localization.js` with:
  - `getLocalizedField(item, fieldBase)` function
  - Integration with i18n-engine

### Step 5: Build Language Switcher Component
- Create `language-switcher.js` with:
  - UI component
  - Event dispatching
  - Visual feedback

### Step 6: Update HTML Templates
- Add `data-i18n` attributes to `register.html`
- Add `data-i18n` attributes to `tn_templates.html`
- Add `data-i18n` attributes to `wu_sc_templates.html`

### Step 7: Update JavaScript Files
- Refactor `tn_wizard.js` to use i18n
- Refactor `wu_sc_wizard.js` to use i18n
- Update `validation.js`, `submit.js`, `event_bootstrap.js`

### Step 8: Testing & QA
- Visual testing in both languages
- Validation message testing
- Dynamic content testing
- Mobile responsive testing

---

**End of Analysis**

*Awaiting approval to proceed to Step 2: Create Translation Dictionary*
