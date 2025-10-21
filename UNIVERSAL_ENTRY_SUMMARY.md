# Universal Entry Point Implementation Summary

## ✅ **Restored `register.html` as True Universal Entry**

### **Single Entry Point:**
- **`public/register.html`** - The one true entry point for all modes
- **No static links** - Removed hardcoded links to `1_category.html` and `universal_form.html`
- **Event picker** - Shows when no `?e=` parameter is present

### **Boot Rules Implemented:**

#### **1. Event Picker Mode (No `?e=` parameter):**
```
🚀 Boot → event=<none>, mode=picker
```
- Shows event selection cards
- User clicks → Sets `?e=<ref>` and reloads page

#### **2. TN Mode (`?e=tn`):**
```
🚀 Boot → event=tn, mode=tn_wizard
🎯 TN Mode: Loading templates and initializing wizard
```
- Loads `tn_templates.html`
- Initializes `tn_wizard.js`
- Skips single-page renderer

#### **3. WU/SC Mode (`?e=wu` or `?e=sc`):**
```
🚀 Boot → event=wu, mode=single_page
🎯 Single Page Mode: Loading config and initializing form
```
- Loads database config
- Runs `initFormForEvent()`
- Skips TN wizard

### **Event Picker Cards:**
1. **TN Dragon Boat Race** → `?e=tn` → TN wizard with calendar
2. **WU Dragon Boat Race** → `?e=wu` → WU single-page form
3. **SC Dragon Boat Race** → `?e=sc` → SC single-page form

### **URL Routing:**
- `public/register.html` → Event picker
- `public/register.html?e=tn` → TN wizard
- `public/register.html?e=wu` → WU form
- `public/register.html?e=sc` → SC form

### **Logging Banner:**
Every boot now shows:
```
🚀 Boot → event=<ref>, mode=<tn_wizard|single_page|picker>
```

### **Key Functions Added:**
- `loadPicker()` - Creates static event options
- `renderEventCards()` - Renders clickable event cards
- `selectEvent(ref)` - Sets URL parameter and reloads
- `showPicker()` / `hidePicker()` - Show/hide event picker
- `showForm()` - Show form container

### **Boot Sequence:**
1. **Check URL parameter** (`resolveInitialRef()`)
2. **If no `?e=`** → Show event picker
3. **If `?e=tn`** → TN wizard path
4. **If `?e=wu|sc`** → Single-page form path
5. **Log mode** → Console banner for debugging

### **Test URLs:**
- `public/register.html` → Event picker (3 cards)
- `public/register.html?e=tn` → TN wizard with calendar
- `public/register.html?e=wu` → WU single-page form
- `public/register.html?e=sc` → SC single-page form

The universal entry point is now fully functional with proper routing, logging, and event picker! 🎉
