# Event Picker Fix

## ✅ **Issue Identified and Fixed**

### **Problem:**
`register.html` was showing the form instead of the event picker when accessed without a `?e=` parameter.

### **Root Cause:**
The `resolveInitialRef()` function was using `localStorage.getItem(LS_EVENT_KEY)` as a fallback, which meant if you previously visited the site with `?e=tn` or `?e=wu`, it stored that reference and was automatically using it.

### **Solution Applied:**

#### **1. Fixed `resolveInitialRef()` Function:**
```javascript
// BEFORE (problematic)
function resolveInitialRef() {
  const params = new URLSearchParams(location.search);
  const fromUrl = params.get('e');
  if (fromUrl) return fromUrl;
  try { return localStorage.getItem(LS_EVENT_KEY) || ''; } catch { return ''; }
}

// AFTER (fixed)
function resolveInitialRef() {
  const params = new URLSearchParams(location.search);
  const fromUrl = params.get('e');
  if (fromUrl) return fromUrl;
  // Don't use localStorage fallback - always show event picker when no ?e= parameter
  return null;
}
```

#### **2. Enhanced Debugging:**
```javascript
// Added more detailed logging
console.log('🚀 Boot: Showing event picker for no event parameter');
console.log('🎯 showPicker: Picker computed style:', window.getComputedStyle(picker).display);
```

## ✅ **Expected Behavior Now**

### **No URL Parameter (`public/register.html`):**
```
🚀 Boot: Starting bootstrap sequence
🚀 Boot: Resolved ref = null
🚀 Boot → event=<none>, mode=picker
🚀 Boot: Showing event picker for no event parameter
🎯 showPicker: Showing event picker
🎯 showPicker: Picker element found: true
🎯 showPicker: Form element found: true
🎯 showPicker: Form hidden
🎯 showPicker: Picker shown
🎯 showPicker: Picker display style: block
🎯 showPicker: Picker computed style: block
🎯 loadPicker: Starting event picker loading
🎯 renderEventCards: Starting to render 3 events
🎯 renderEventCards: All cards rendered, grid children count: 3
```
**Result:** Shows event picker with 3 race cards

### **With URL Parameter (`public/register.html?e=tn`):**
```
🚀 Boot: Starting bootstrap sequence
🚀 Boot: Resolved ref = tn
🚀 Boot → event=tn, mode=tn_wizard
🎯 TN Mode: Loading templates and initializing wizard
```
**Result:** Shows TN wizard

## ✅ **Test Files Created**

### **1. Simple Event Picker Test:**
- **File:** `public/test_event_picker_simple.html`
- **Purpose:** Test event picker functionality in isolation
- **URL:** `public/test_event_picker_simple.html`

### **2. Main Register Page:**
- **File:** `public/register.html`
- **Purpose:** Universal entry point with event picker
- **URL:** `public/register.html` (should show event picker)

## ✅ **Verification Steps**

### **1. Clear Browser Data:**
- Clear localStorage to remove any stored event references
- Or open in incognito/private mode

### **2. Test Event Picker:**
- Open `public/register.html` (no `?e=` parameter)
- Should show event picker with 3 race cards
- Check console for debugging output

### **3. Test Event Selection:**
- Click on any race card
- Should redirect to appropriate mode (`?e=tn`, `?e=wu`, or `?e=sc`)

### **4. Test Direct Access:**
- Open `public/register.html?e=tn` directly
- Should show TN wizard
- Open `public/register.html?e=wu` directly
- Should show WU single-page form

## ✅ **Benefits of the Fix**

### **1. Predictable Behavior:**
- No URL parameter = event picker
- URL parameter = appropriate form mode
- No localStorage interference

### **2. Clean User Experience:**
- Users see event picker by default
- Clear choice between race types
- No confusion about which form to use

### **3. Proper Routing:**
- URL parameters control mode
- Event picker for user selection
- Clear boot sequence logging

The event picker should now show properly when accessing `public/register.html` without a `?e=` parameter! 🎯
