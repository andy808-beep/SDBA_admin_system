# Database Connection Debugging

## ✅ **Added Comprehensive Debugging**

### **1. Environment Variables Debugging:**
```javascript
// env.js
console.log('🔧 ENV: Loading environment variables');
// ... env vars ...
console.log('🔧 ENV: Environment variables loaded');
```

### **2. Supabase Config Debugging:**
```javascript
// supabase_config.js
console.log('🔗 Supabase Config: URL =', URL ? 'Present' : 'Missing');
console.log('🔗 Supabase Config: KEY =', KEY ? 'Present' : 'Missing');
console.log('🔗 Supabase Config: Client created successfully');
```

### **3. Config Loader Debugging:**
```javascript
// config_loader.js
console.log(`🔗 Config Loader: Loading configuration for event: ${eventShortRef}`);
console.log(`🔗 Config Loader: Using cached configuration for event: ${eventShortRef}`);
```

### **4. Event Bootstrap Debugging:**
```javascript
// event_bootstrap.js
console.log('🚀 Boot: Starting bootstrap sequence');
console.log('🚀 Boot: Resolved ref =', ref);
console.log('🎯 loadPicker: Starting event picker loading');
console.log('🎯 renderEventCards: Starting to render', events.length, 'events');
```

## ✅ **Database Connection Test**

### **Test File:** `public/test_connection.html`
- Tests direct database connection
- Shows connection status
- Displays any errors

### **Test URL:** `public/test_connection.html`

## ✅ **Expected Debug Output**

### **When Opening `public/register.html` (no `?e=`):**
```
🔧 ENV: Loading environment variables
🔧 ENV: Environment variables loaded
🔗 Supabase Config: URL = Present
🔗 Supabase Config: KEY = Present
🔗 Supabase Config: Client created successfully
🚀 Boot: Starting bootstrap sequence
🚀 Boot: Resolved ref = 
🚀 Boot → event=<none>, mode=picker
🎯 showPicker: Showing event picker
🎯 showPicker: Picker element found: true
🎯 showPicker: Form element found: true
🎯 showPicker: Picker shown
🎯 loadPicker: Starting event picker loading
🎯 loadPicker: Loading indicator shown
🎯 loadPicker: Created 3 events
🎯 renderEventCards: Starting to render 3 events
🎯 renderEventCards: Grid element found: true
🎯 renderEventCards: Loading element found: true
🎯 renderEventCards: Loading indicator hidden
🎯 renderEventCards: Grid cleared
🎯 renderEventCards: Creating card 1 for TN Dragon Boat Race
🎯 renderEventCards: Creating card 2 for WU Dragon Boat Race
🎯 renderEventCards: Creating card 3 for SC Dragon Boat Race
🎯 renderEventCards: All cards rendered, grid children count: 3
```

### **When Opening `public/register.html?e=tn`:**
```
🔧 ENV: Loading environment variables
🔧 ENV: Environment variables loaded
🔗 Supabase Config: URL = Present
🔗 Supabase Config: KEY = Present
🔗 Supabase Config: Client created successfully
🚀 Boot: Starting bootstrap sequence
🚀 Boot: Resolved ref = tn
🚀 Boot → event=tn, mode=tn_wizard
🎯 TN Mode: Loading templates and initializing wizard
```

## ✅ **Troubleshooting Steps**

### **1. Check Environment Variables:**
- Look for `🔧 ENV:` messages in console
- Verify both URL and KEY are present

### **2. Check Supabase Connection:**
- Look for `🔗 Supabase Config:` messages
- Verify client creation success

### **3. Test Database Connection:**
- Open `public/test_connection.html`
- Check for database errors
- Verify table access

### **4. Check Event Picker:**
- Look for `🎯 loadPicker:` and `🎯 renderEventCards:` messages
- Verify DOM elements are found
- Check final card count

## ✅ **Common Issues & Solutions**

### **Issue: "Missing SUPABASE_URL / SUPABASE_ANON_KEY"**
- **Cause:** `env.js` not loaded before `supabase_config.js`
- **Solution:** Ensure `env.js` is loaded first in HTML

### **Issue: Database connection timeout**
- **Cause:** Network issues or incorrect URL
- **Solution:** Check Supabase project status and URL

### **Issue: "Grid element not found"**
- **Cause:** HTML structure issue
- **Solution:** Check `#eventGrid` element exists in HTML

### **Issue: Events not rendering**
- **Cause:** JavaScript errors in event creation
- **Solution:** Check console for specific error messages

The debugging will help identify exactly where the database connection or event loading is failing! 🔍
