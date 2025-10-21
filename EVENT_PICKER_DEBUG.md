# Event Picker Debugging

## ✅ **Added Comprehensive Debugging**

### **1. Enhanced `loadTNTemplates()` Debugging:**
```javascript
console.log('🎯 loadTNTemplates: Starting template loading');
console.log('🎯 loadTNTemplates: Fetching tn_templates.html');
console.log('🎯 loadTNTemplates: Response status:', response.status, response.statusText);
console.log('🎯 loadTNTemplates: HTML loaded, length:', html.length);
```

### **2. Enhanced `showPicker()` Debugging:**
```javascript
console.log('🎯 showPicker: Picker element found:', !!picker);
console.log('🎯 showPicker: Picker display style:', picker.style.display);
console.error('🎯 showPicker: Picker element not found!');
```

### **3. Enhanced `renderEventCards()` Debugging:**
```javascript
console.log('🎯 renderEventCards: Starting to render', events.length, 'events');
console.log('🎯 renderEventCards: Grid element found:', !!grid);
console.log('🎯 renderEventCards: All cards rendered, grid children count:', grid.children.length);
```

## ✅ **Test Files Created**

### **1. Database Connection Test:**
- **File:** `public/test_connection.html`
- **Purpose:** Test Supabase database connection
- **URL:** `public/test_connection.html`

### **2. TN Config Test:**
- **File:** `public/test_tn_config.html`
- **Purpose:** Test TN fallback config creation
- **URL:** `public/test_tn_config.html`

### **3. Event Picker Test:**
- **File:** `public/test_picker.html`
- **Purpose:** Test event picker functionality in isolation
- **URL:** `public/test_picker.html`

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
🎯 showPicker: Picker shown
🎯 showPicker: Picker display style: block
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

## ✅ **Troubleshooting Steps**

### **1. Test Event Picker in Isolation:**
- Open `public/test_picker.html`
- Should show 3 event cards
- Check console for debugging output

### **2. Test Database Connection:**
- Open `public/test_connection.html`
- Should show database connection status
- Check for any connection errors

### **3. Test TN Config:**
- Open `public/test_tn_config.html`
- Should show TN config details
- Verify fallback config works

### **4. Check Main Register Page:**
- Open `public/register.html`
- Should show event picker with 3 cards
- Check console for detailed debugging output

## ✅ **Common Issues & Solutions**

### **Issue: "Picker element not found"**
- **Cause:** HTML structure issue or JavaScript loading error
- **Solution:** Check `#eventPicker` element exists in HTML

### **Issue: "Grid element not found"**
- **Cause:** HTML structure issue
- **Solution:** Check `#eventGrid` element exists in HTML

### **Issue: "Loading available events..." stuck**
- **Cause:** JavaScript error in `loadPicker()` or `renderEventCards()`
- **Solution:** Check console for specific error messages

### **Issue: Database connection errors**
- **Cause:** Supabase configuration or network issues
- **Solution:** Test with `test_connection.html`

### **Issue: TN templates not loading**
- **Cause:** File path issues or fetch errors
- **Solution:** Check `tn_templates.html` exists and is accessible

## ✅ **File Structure Verification**

### **Expected Structure:**
```
public/
├── register.html (main entry point)
├── env.js (environment variables)
├── supabase_config.js (database config)
├── tn_templates.html (TN templates)
├── css/
│   └── tn_legacy.css (TN styles)
├── js/
│   ├── event_bootstrap.js (main bootstrap)
│   ├── config_loader.js (config loading)
│   ├── ui_bindings.js (single-page renderer)
│   ├── tn_wizard.js (TN wizard)
│   └── tn_map.js (TN selectors)
└── test_*.html (test files)
```

The debugging will help identify exactly where the event picker is failing! 🔍
