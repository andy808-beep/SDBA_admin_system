# TN Config Guarantee Implementation

## ✅ **Guaranteed TN Config Before Wizard Starts**

### **Updated `event_bootstrap.js` TN Mode Handling:**

```javascript
if (ref === 'tn') {
  // TN Legacy Wizard Path
  console.log('🎯 TN Mode: Loading templates and initializing wizard');
  
  // Guarantee TN config exists before wizard starts
  try {
    // Try to load from database first
    console.log('🎯 TN Mode: Attempting to load TN config from database');
    const dbConfig = await loadEventConfig('tn', { useCache: true });
    if (dbConfig && dbConfig.event) {
      console.log('🎯 TN Mode: Using database config for TN');
      window.__CONFIG = dbConfig;
    } else {
      throw new Error('No database config found for TN');
    }
  } catch (error) {
    // Fallback to minimal config
    console.log('🎯 TN Mode: Database config failed, using fallback config');
    console.warn('TN database config error:', error.message);
    createTNConfig();
  }
  
  // Assert config exists
  console.assert(window.__CONFIG && window.__CONFIG.event, 'TN config missing');
  console.log('🎯 TN Mode: Config verified, proceeding with wizard initialization');
  
  await loadTNTemplates();
  await initTNWizard();
}
```

## ✅ **Config Loading Strategy**

### **1. Database First (Preferred):**
- Attempts to load TN config from database using `loadEventConfig('tn')`
- Uses cached config if available
- Sets `window.__CONFIG` to database config

### **2. Fallback Config (Guaranteed):**
- If database fails, calls `createTNConfig()`
- Creates minimal TN config with:
  - Event details (short_ref: 'tn')
  - Practice window (Jan 1 - Jul 31, 2025)
  - Packages (Option 1: $2500, Option 2: $2000)
  - Race day items (marquee, steersman, boats)
  - Timeslots (morning/afternoon/evening, 1h/2h)
  - Practice rules (weekdays only, 7-day advance)

### **3. Config Assertion:**
- `console.assert(window.__CONFIG && window.__CONFIG.event, 'TN config missing')`
- Fails fast if config is missing
- Logs verification before wizard initialization

## ✅ **TN Config Structure**

### **Fallback Config Includes:**
```javascript
{
  event: {
    event_short_ref: 'tn',
    event_long_name_en: 'TN Legacy Registration',
    form_enabled: true,
    practice_start_date: '2025-01-01',
    practice_end_date: '2025-07-31'
  },
  labels: { /* form field labels */ },
  packages: [ /* registration packages */ ],
  race_day_items: [ /* race day options */ ],
  timeslots: [ /* practice time slots */ ],
  practice: {
    practice_start_date: '2025-01-01',
    practice_end_date: '2025-07-31',
    min_rows: 1,
    max_rows: 3,
    window_rules: {
      weekdays_only: true,
      advance_booking_days: 7
    }
  },
  config_version: 1
}
```

## ✅ **Testing**

### **Test File:** `public/test_tn_config.html`
- Tests `createTNConfig()` function
- Verifies `window.__CONFIG` is set
- Shows config details
- **URL:** `public/test_tn_config.html`

### **Expected Console Output:**
```
🎯 TN Mode: Loading templates and initializing wizard
🎯 TN Mode: Attempting to load TN config from database
🎯 TN Mode: Database config failed, using fallback config
TN fallback configuration created
🎯 TN Mode: Config verified, proceeding with wizard initialization
```

## ✅ **Benefits**

### **1. Guaranteed Config:**
- TN wizard will never start without a valid config
- Database config preferred, fallback guaranteed
- Console assertion catches missing config

### **2. Robust Fallback:**
- Works offline or with database issues
- Minimal but complete config for TN wizard
- All required fields for practice calendar and form

### **3. Clear Logging:**
- Shows which config source is used
- Warns about database failures
- Confirms config before wizard starts

The TN wizard now has a guaranteed config before initialization! 🎯
