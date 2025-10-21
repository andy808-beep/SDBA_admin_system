# Calendar Initialization Implementation

## ✅ **Proper Calendar Initialization for TN Step 4**

### **Implementation Details:**

#### **1. Enhanced `initCalendarContainer()` Function:**
```javascript
function initCalendarContainer() {
  const calendarEl = document.getElementById('calendarContainer');
  if (!calendarEl) return;
  
  // Guard against double-init if the user navigates back/forward
  if (calendarEl.dataset.initialized === 'true') {
    console.log('initCalendarContainer: Calendar already initialized, skipping');
    return;
  }
  
  // Check if there's existing calendar initialization (legacy)
  if (window.initCalendar && typeof window.initCalendar === 'function') {
    console.log('initCalendarContainer: Using legacy window.initCalendar');
    window.initCalendar();
    calendarEl.dataset.initialized = 'true';
    return;
  }
  
  // Use new initTNCalendar function
  console.log('initCalendarContainer: Using initTNCalendar');
  const p = window.__CONFIG?.practice || {};
  initTNCalendar({
    mount: '#calendarContainer',
    windowStart: p.practice_start_date || p.window_start,
    windowEnd: p.practice_end_date || p.window_end,
    allowedWeekdays: p.allowed_weekdays || [1,2,3,4,5,6,0]
  });
  
  // Mark as initialized to prevent double-init
  calendarEl.dataset.initialized = 'true';
  
  // Dev logger
  logCalendarState();
}
```

#### **2. New `initTNCalendar()` Function:**
```javascript
function initTNCalendar(options) {
  console.log('initTNCalendar: Initializing calendar with options:', options);
  
  const container = document.querySelector(options.mount);
  if (!container) {
    console.error('initTNCalendar: Container not found:', options.mount);
    return;
  }
  
  // Create functional calendar for TN wizard
  createTNCalendar(container, options);
}
```

#### **3. Dev Logger `logCalendarState()`:**
```javascript
function logCalendarState() {
  console.log('📅 Calendar State:');
  console.log('  - Config:', window.__CONFIG?.practice);
  console.log('  - Container:', document.getElementById('calendarContainer'));
  console.log('  - Initialized:', document.getElementById('calendarContainer')?.dataset.initialized);
  console.log('  - Window start:', window.__CONFIG?.practice?.practice_start_date);
  console.log('  - Window end:', window.__CONFIG?.practice?.practice_end_date);
  console.log('  - Allowed weekdays:', window.__CONFIG?.practice?.allowed_weekdays);
}
```

## ✅ **Calendar Configuration**

### **Options Parameter:**
```javascript
initTNCalendar({
  mount: '#calendarContainer',           // CSS selector for calendar container
  windowStart: p.practice_start_date,   // Practice window start date
  windowEnd: p.practice_end_date,        // Practice window end date
  allowedWeekdays: p.allowed_weekdays   // Allowed weekdays [1,2,3,4,5,6,0]
});
```

### **Weekday Mapping:**
- `0` = Sunday
- `1` = Monday
- `2` = Tuesday
- `3` = Wednesday
- `4` = Thursday
- `5` = Friday
- `6` = Saturday

### **Default Configuration:**
```javascript
const p = window.__CONFIG?.practice || {};
const options = {
  mount: '#calendarContainer',
  windowStart: p.practice_start_date || p.window_start,
  windowEnd: p.practice_end_date || p.window_end,
  allowedWeekdays: p.allowed_weekdays || [1,2,3,4,5,6,0] // All days allowed by default
};
```

## ✅ **Double-Init Prevention**

### **Guard Mechanism:**
```javascript
// Guard against double-init if the user navigates back/forward
if (calendarEl.dataset.initialized === 'true') {
  console.log('initCalendarContainer: Calendar already initialized, skipping');
  return;
}

// Mark as initialized to prevent double-init
calendarEl.dataset.initialized = 'true';
```

### **Benefits:**
- **Prevents duplicate calendar initialization**
- **Handles back/forward navigation gracefully**
- **Avoids DOM conflicts and performance issues**

## ✅ **Legacy Fallback Support**

### **Legacy Calendar Detection:**
```javascript
// Check if there's existing calendar initialization (legacy)
if (window.initCalendar && typeof window.initCalendar === 'function') {
  console.log('initCalendarContainer: Using legacy window.initCalendar');
  window.initCalendar();
  calendarEl.dataset.initialized = 'true';
  return;
}
```

### **Benefits:**
- **Backward compatibility with existing calendar implementations**
- **Graceful fallback to legacy systems**
- **No breaking changes for existing code**

## ✅ **Weekday Filtering**

### **Enhanced Day Generation:**
```javascript
function generateMonthDays(monthStart, monthEnd, allowedWeekdays = [1,2,3,4,5,6,0]) {
  // ... existing code ...
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
    const weekday = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const isPast = date < new Date();
    const isAllowedWeekday = allowedWeekdays.includes(weekday);
    
    days.push({
      day: day,
      date: date,
      weekday: weekday,
      isPast: isPast,
      available: !isPast && isAllowedWeekday // Available if not past and allowed weekday
    });
  }
  
  return days;
}
```

### **Weekday Filtering Benefits:**
- **Respects practice window rules**
- **Configurable allowed days**
- **Proper availability logic**

## ✅ **Expected Console Output**

### **Calendar Initialization:**
```
initCalendarContainer: Using initTNCalendar
initTNCalendar: Initializing calendar with options: {mount: "#calendarContainer", windowStart: "2025-01-01", windowEnd: "2025-07-31", allowedWeekdays: [1,2,3,4,5,6,0]}
createTNCalendar: Using dates: {startDate: "2025-01-01", endDate: "2025-07-31", allowedWeekdays: [1,2,3,4,5,6,0]}
📅 Calendar State:
  - Config: {practice_start_date: "2025-01-01", practice_end_date: "2025-07-31", allowed_weekdays: [1,2,3,4,5,6,0]}
  - Container: <div id="calendarContainer">...</div>
  - Initialized: true
  - Window start: 2025-01-01
  - Window end: 2025-07-31
  - Allowed weekdays: [1,2,3,4,5,6,0]
```

### **Double-Init Prevention:**
```
initCalendarContainer: Calendar already initialized, skipping
```

### **Legacy Fallback:**
```
initCalendarContainer: Using legacy window.initCalendar
```

## ✅ **Benefits**

### **1. Proper Initialization:**
- Calendar initializes correctly on TN step 4
- Uses configuration from `window.__CONFIG.practice`
- Respects practice window and weekday rules

### **2. Double-Init Prevention:**
- Guards against duplicate initialization
- Handles navigation gracefully
- Prevents DOM conflicts

### **3. Legacy Compatibility:**
- Falls back to existing `window.initCalendar` if available
- No breaking changes for existing systems
- Graceful degradation

### **4. Configuration-Driven:**
- Uses database configuration for practice window
- Configurable allowed weekdays
- Proper date range handling

### **5. Developer Tools:**
- Comprehensive logging for debugging
- Calendar state inspection
- Clear initialization flow

The calendar now properly initializes on TN step 4 with full configuration support and double-init prevention! 🎯
