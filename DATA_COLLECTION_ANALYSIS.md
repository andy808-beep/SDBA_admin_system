# Data Collection Analysis

This document reviews what data is collected in the registration forms to identify any sensitive information (credit cards, passwords, HKID numbers) versus standard contact and team information.

---

## Summary

### ❌ **NO Sensitive Financial Data**
- **No credit card information** collected
- **No payment processing** in forms
- **No bank account details** collected

### ❌ **NO Authentication Credentials**
- **No password fields** in registration forms
- **No user accounts** required (anonymous submissions)
- **No login/authentication** required

### ❌ **NO Government ID Numbers**
- **No HKID (Hong Kong ID) numbers** collected
- **No passport numbers** collected
- **No national ID numbers** collected
- **No SSN/Social Security numbers** collected

### ✅ **Standard Contact & Team Information Only**
- Team names (English and Traditional Chinese)
- Organization name and mailing address
- Manager contact information (name, phone, email)
- Team preferences (categories, divisions, boat types)
- Race day arrangements (quantities for services)
- Practice booking preferences

---

## Detailed Data Collection

### 1. Team Information

**TN Wizard:**
- **Team Names:**
  - English name (`teamNameEn`)
  - Traditional Chinese name (`teamNameTc`) - Optional
- **Team Category:** 
  - Men Open, Ladies Open, Mixed Open, Mixed Corporate
- **Entry Option:**
  - Option 1 or Option 2 (package selection)
- **Team Count:** Number of teams (1-10)

**WU/SC Wizard:**
- **Team Names:**
  - English name (`teamNameEn`)
  - Traditional Chinese name (`teamNameTc`) - Optional
- **Boat Type:** Selected from available packages
- **Division:** Selected from available divisions
- **Team Count:** Number of teams

**Database Storage:**
```sql
-- From db_schema/main.sql (lines 530-539)
team_code     text NOT NULL,
team_name_en  citext NOT NULL,
team_name_tc  citext,
category text,
division_code text,
option_choice text CHECK (option_choice IN ('Option 1','Option 2')),
```

**Example from Payload:**
```javascript
// From tn_wizard.js (lines 6294-6297)
team_names: teams.map(t => t.name_en || t.name),
team_names_en: teams.map(t => t.name_en || t.name),
team_names_tc: teams.map(t => t.name_tc || ''),
team_options: teams.map(t => t.option),
```

---

### 2. Organization Information

**Fields Collected:**
- **Organization/Group Name** (`orgName`) - Required
- **Mailing Address** (`orgAddress` / `mailingAddress`) - Required

**Form Input:**
```html
<!-- From tn_templates.html (lines 76-81) -->
<label for="orgName">Organization / Group Name</label>
<input type="text" id="orgName" name="orgName" required />

<label for="mailingAddress">Mailing Address</label>
<textarea id="mailingAddress" name="mailingAddress" rows="3" 
  placeholder="Room/Floor, Building Name, Street, District, City" required></textarea>
```

**Database Storage:**
```sql
-- From db_schema/main.sql (lines 541-543)
org_name    text,
org_address text,
```

**Example from Payload:**
```javascript
// From tn_wizard.js (lines 6287-6288)
org_name: contact.name,
org_address: contact.address,
```

---

### 3. Manager Contact Information

**Fields Collected (Manager 1 & 2 - Required):**
- **Name** (`manager1Name`, `manager2Name`) - Required
- **Phone** (`manager1Phone`, `manager2Phone`) - Required, 8-digit HK phone
- **Email** (`manager1Email`, `manager2Email`) - Required, validated email format

**Fields Collected (Manager 3 - Optional):**
- **Name** (`manager3Name`) - Optional
- **Phone** (`manager3Phone`) - Optional, but required if name provided
- **Email** (`manager3Email`) - Optional, but required if name provided

**Form Input:**
```html
<!-- From tn_wizard.js (lines 1582-1601) - Manager 1 -->
<label for="manager1Name">Name</label>
<input type="text" id="manager1Name" name="manager1Name" required />

<label for="manager1Phone">Phone</label>
<input type="tel" id="manager1Phone" name="manager1Phone" required 
  placeholder="8-digit HK phone" maxlength="8" />

<label for="manager1Email">Email</label>
<input type="email" id="manager1Email" name="manager1Email" required />
```

**Phone Normalization:**
```javascript
// From tn_wizard.js (lines 5995-6001)
const normalized = normalizeHKPhone(manager1Phone.value);
sessionStorage.setItem('tn_manager1_phone', normalized);
// Result: +85212345678 format
```

**Database Storage:**
```sql
-- From db_schema/main.sql (lines 545-554)
team_manager_1 text NOT NULL,
mobile_1       text,
email_1        text,
team_manager_2 text NOT NULL,
mobile_2       text,
email_2        text,
team_manager_3 text,
mobile_3       text,
email_3        text,
```

**Example from Payload:**
```javascript
// From tn_wizard.js (line 6298)
managers: managers,  // Array of { name, mobile, email }
```

**Manager Payload Structure:**
```javascript
// From submit_registration/index.ts (lines 250-283)
const mgrs: Manager[] = [
  { name: "Manager 1 Name", mobile: "+85212345678", email: "manager1@example.com" },
  { name: "Manager 2 Name", mobile: "+85287654321", email: "manager2@example.com" },
  { name: "Manager 3 Name", mobile: "+85211223344", email: "manager3@example.com" }  // Optional
];
```

---

### 4. Race Day Arrangements

**Fields Collected:**
- **Athlete Marquee** (`marqueeQty`) - Quantity (number)
- **Official Steersman (With Practice)** (`steerWithQty`) - Quantity
- **Official Steersman (Without Practice)** (`steerWithoutQty`) - Quantity
- **Junk Boat Registration:**
  - Boat Number (`junkBoatNo`) - Text
  - Quantity (`junkBoatQty`) - Number
- **Speed Boat Registration:**
  - Boat Number (`speedBoatNo`) - Text
  - Quantity (`speedboatQty`) - Number

**Form Input:**
```html
<!-- From tn_templates.html (lines 105-140) -->
<input type="number" id="marqueeQty" name="marqueeQty" min="0" value="0" />
<input type="number" id="steerWithQty" name="steerWithQty" min="0" value="0" />
<input type="number" id="steerWithoutQty" name="steerWithoutQty" min="0" value="0" />
<input type="text" id="junkBoatNo" name="junkBoatNo" />
<input type="number" id="junkBoatQty" name="junkBoatQty" min="0" value="0"/>
<input type="text" id="speedBoatNo" name="speedBoatNo" />
<input type="number" id="speedboatQty" name="speedboatQty" min="0" value="0"/>
```

**Example from Payload:**
```javascript
// From tn_wizard.js (lines 6299-6307)
race_day: {
  marqueeQty: 2,
  steerWithQty: 1,
  steerWithoutQty: 0,
  junkBoatQty: 1,
  junkBoatNo: "ABC123",
  speedboatQty: 0,
  speedBoatNo: ""
}
```

---

### 5. Practice Booking (TN Only)

**Fields Collected:**
- **Practice Dates:** Selected dates from calendar
- **Time Slot Preferences:**
  - 2-hour session preferences (1st, 2nd, 3rd choice)
  - 1-hour session preferences (1st, 2nd, 3rd choice)

**Form Input:**
```html
<!-- From tn_templates.html (lines 188-199) -->
<select id="slotPref2h_1" required>
  <option value="">-- Select --</option>
  <!-- Options populated dynamically -->
</select>
<select id="slotPref1h_1">
  <option value="">-- Select --</option>
</select>
```

**Example from Payload:**
```javascript
// From tn_wizard.js (line 6308)
practice: practice  // Array of practice blocks with dates and slot preferences
```

---

## What is NOT Collected

### ❌ Credit Card Information
**Search Results:** No matches for "credit", "card", "payment" in form templates or JavaScript files.

**Evidence:**
- No payment form fields
- No credit card input types (`type="credit-card"` or similar)
- No payment processing integration
- No PCI-DSS compliance requirements

**Note:** Sentry configuration includes filtering for credit card data, but this is a precautionary measure, not because it's actually collected:
```javascript
// From sentry-config.js (line 106) - Precautionary filtering only
const sensitiveFields = ['password', 'credit_card', 'ssn', 'hp', 'honeypot'];
```

---

### ❌ Passwords
**Search Results:** No password fields found in registration forms.

**Evidence:**
- No `type="password"` input fields
- No authentication required
- Anonymous submissions allowed (`user_id` is NULL)
- No user accounts created

**Note:** Sentry configuration includes password filtering as a precaution:
```javascript
// From sentry-config.js (line 106) - Precautionary filtering only
const sensitiveFields = ['password', 'credit_card', 'ssn', 'hp', 'honeypot'];
```

---

### ❌ HKID Numbers
**Search Results:** No matches for "hkid", "id.*number", "passport", "ssn", "social.*security" in form templates or JavaScript files.

**Evidence:**
- No ID number input fields
- No government ID collection
- No identity verification fields

---

### ❌ Other Sensitive Data
**Not Collected:**
- Date of birth
- Nationality
- Passport numbers
- Social Security numbers
- Bank account details
- Tax identification numbers
- Driver's license numbers

---

## Data Sensitivity Classification

### Low Sensitivity (Public/Organizational Information)
- ✅ Team names (English and Traditional Chinese)
- ✅ Organization name
- ✅ Organization mailing address
- ✅ Team categories/divisions
- ✅ Boat types and preferences
- ✅ Race day service quantities
- ✅ Practice booking preferences

### Medium Sensitivity (Contact Information)
- ⚠️ Manager names (personal names)
- ⚠️ Manager phone numbers (8-digit HK phone, normalized to +852 format)
- ⚠️ Manager email addresses

**Note:** While contact information is personal, it's standard business contact data, not highly sensitive like financial or government ID information.

---

## Data Storage

### Frontend Storage (sessionStorage)
**Data stored temporarily in browser:**
- All form fields stored with prefixes (`tn_`, `wu_`, `sc_`)
- Phone numbers normalized to `+852xxxxxxxx` format
- Data cleared after successful submission

**Example Keys:**
```
tn_team_count
tn_team_name_en_1
tn_team_name_tc_1
tn_org_name
tn_mailing_address
tn_manager1_name
tn_manager1_phone  // Normalized: +85212345678
tn_manager1_email
```

### Backend Storage (Database)
**Data stored in `registration_meta` table:**
```sql
-- From db_schema/main.sql (lines 517-587)
CREATE TABLE public.registration_meta (
  id uuid PRIMARY KEY,
  user_id uuid,  -- NULL for anonymous submissions
  season int,
  event_type text,
  team_code text,
  team_name_en citext,
  team_name_tc citext,
  org_name text,
  org_address text,
  team_manager_1 text,
  mobile_1 text,      -- Normalized: +85212345678
  email_1 text,
  team_manager_2 text,
  mobile_2 text,
  email_2 text,
  team_manager_3 text,  -- Optional
  mobile_3 text,        -- Optional
  email_3 text,         -- Optional
  -- ... other fields
);
```

---

## Privacy Considerations

### Data Minimization
✅ **Good:** Only collects necessary information for registration
- No unnecessary personal data
- No financial information
- No government ID numbers

### Contact Information
⚠️ **Standard Business Practice:** Manager contact info is necessary for:
- Event communication
- Team coordination
- Emergency contacts

### Anonymous Submissions
✅ **Good:** No user authentication required
- Users remain anonymous until submission
- No user accounts created
- `user_id` is NULL for form submissions

### Data Retention
**Not specified in codebase:**
- No explicit data retention policy found
- Data stored in database indefinitely (until manually deleted)
- sessionStorage cleared after submission

---

## Security Measures

### Input Validation
✅ **Email validation:** Format checking via `isValidEmail()`
✅ **Phone validation:** 8-digit HK phone format via `isValidHKPhone()`
✅ **Required field validation:** Per-step validation before progression

### Data Sanitization
✅ **XSS Prevention:** User input escaped before HTML insertion
```javascript
// From wu_sc_wizard.js (lines 1534-1538)
const safeName = SafeDOM.escapeHtml(manager1Name);
const safePhone = SafeDOM.escapeHtml(manager1Phone);
const safeEmail = SafeDOM.escapeHtml(manager1Email);
```

### Error Logging
✅ **Sentry Filtering:** Contact information partially masked in error logs
```javascript
// From sentry-config.js (lines 114-122)
if (formData.contact.email) {
  formData.contact.email = formData.contact.email.replace(/(.{2}).*(@.*)/, '$1***$2');
}
if (formData.contact.phone) {
  formData.contact.phone = formData.contact.phone.replace(/\d(?=\d{4})/g, '*');
}
```

---

## Complete Data Inventory

### TN Wizard Data Collection

| Category | Fields | Required | Sensitive |
|----------|--------|----------|-----------|
| **Team Info** | Team names (EN/TC), Category, Option | Yes | No |
| **Organization** | Name, Mailing Address | Yes | No |
| **Manager 1** | Name, Phone, Email | Yes | Medium |
| **Manager 2** | Name, Phone, Email | Yes | Medium |
| **Manager 3** | Name, Phone, Email | No | Medium |
| **Race Day** | Marquee, Steersman, Boat quantities | No | No |
| **Practice** | Dates, Time slot preferences | No | No |

### WU/SC Wizard Data Collection

| Category | Fields | Required | Sensitive |
|----------|--------|----------|-----------|
| **Team Info** | Team names (EN/TC), Boat Type, Division | Yes | No |
| **Organization** | Name, Mailing Address | Yes | No |
| **Manager 1** | Name, Phone, Email | Yes | Medium |
| **Manager 2** | Name, Phone, Email | Yes | Medium |
| **Manager 3** | Name, Phone, Email | No | Medium |
| **Race Day** | Marquee, Steersman, Boat quantities | No | No |

---

## Conclusion

### ✅ **Safe Data Collection**
The registration forms collect **standard business contact and team information only**:
- No financial data (credit cards, bank accounts)
- No authentication credentials (passwords)
- No government ID numbers (HKID, passport, SSN)
- No highly sensitive personal information

### ⚠️ **Standard Contact Information**
Manager contact details (name, phone, email) are:
- Necessary for event coordination
- Standard business practice
- Medium sensitivity (not highly sensitive)
- Properly validated and normalized

### 📋 **Recommendations**
1. **Privacy Policy:** Ensure privacy policy clearly states what data is collected and how it's used
2. **Data Retention:** Consider implementing data retention policies
3. **GDPR Compliance:** If applicable, ensure consent mechanisms for EU users
4. **Data Access:** Provide mechanism for users to request data deletion

---

## Related Files

- `public/tn_templates.html` - TN form templates
- `public/wu_sc_templates.html` - WU/SC form templates
- `public/js/tn_wizard.js` - TN wizard data collection (lines 6282-6309)
- `public/js/wu_sc_wizard.js` - WU/SC wizard data collection (lines 2151-2160)
- `db_schema/main.sql` - Database schema (lines 517-587)
- `supabase/functions/submit_registration/index.ts` - Backend payload processing
- `public/js/sentry-config.js` - Error logging with data filtering

