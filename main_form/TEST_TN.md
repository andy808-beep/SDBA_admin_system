# TN Legacy Wizard Parity Testing Checklist

## Overview
This document provides a comprehensive checklist for testing TN legacy wizard parity against the original multi-step forms (1_category.html through 5_summary.html).

## Visual Parity Testing

### Step 1: Category Selection (`?e=tn&step=1`)
- [ ] **Form Structure**: Card container with proper styling
- [ ] **Category Dropdown**: All options present (Men Open, Ladies Open, Mixed Open, Mixed Corporate)
- [ ] **Team Count Input**: Number input with placeholder "e.g. 2"
- [ ] **Entry Options Section**: Hidden initially, shows when team count > 0
- [ ] **Option 1**: Complete with all features (Entry Fee, Practice, Souvenir Tee, Dry Bag, Padded Shorts)
- [ ] **Option 2**: Same as Option 1 but Padded Shorts crossed out
- [ ] **Pricing**: Dynamic price display from config
- [ ] **Navigation**: "Next →" button only
- [ ] **Honeypot**: Hidden website field present
- [ ] **Error Display**: Message area for validation errors

### Step 2: Team Information (`?e=tn&step=2`)
- [ ] **Form Structure**: Card container with proper styling
- [ ] **Team Name Fields**: Dynamic generation based on team count from Step 1
- [ ] **Organization Name**: Required text input with proper label
- [ ] **Mailing Address**: Required textarea with placeholder
- [ ] **Manager Fields**: Dynamic generation for team managers
- [ ] **Navigation**: "← Back" and "Next →" buttons
- [ ] **Error Display**: Message area for validation errors
- [ ] **Field Validation**: Required field enforcement

### Step 3: Race Day Arrangement (`?e=tn&step=3`)
- [ ] **Form Structure**: Card container with proper styling
- [ ] **Athlete Marquee Section**: Price display and quantity input
- [ ] **Official Steersman Section**: 
  - [ ] "With boat" option with price and quantity
  - [ ] "Without boat" option with price and quantity
- [ ] **Junk Registration**: Boat number input, price display, quantity input
- [ ] **Speed Boat Registration**: Boat number input, price display, quantity input
- [ ] **Navigation**: "← Back" and "Next →" buttons
- [ ] **Error Display**: Message area for validation errors
- [ ] **Price Updates**: All prices reflect config values

### Step 4: Practice Booking (`?e=tn&step=4`)
- [ ] **Form Structure**: Card container with proper styling
- [ ] **Header**: Practice booking title with date range from config
- [ ] **Team Selector**: Dropdown populated with team names from Step 2
- [ ] **Team Name Display**: Shows "Now scheduling: [Team Name]"
- [ ] **Copy from Team 1 Button**: Present and functional
- [ ] **Calendar Container**: `#calendarContainer` present (may be stub or full calendar)
- [ ] **Slot Preference Table**: 
  - [ ] 2-Hour Session columns (1st, 2nd, 3rd Choice)
  - [ ] 1-Hour Session columns (1st, 2nd, 3rd Choice)
  - [ ] All selects populated with appropriate slots
- [ ] **Practice Summary Box**: 
  - [ ] Total Hours display
  - [ ] Extra Practice Sessions with price
  - [ ] Trainer Sessions with price
  - [ ] Steersman Sessions with price
- [ ] **Navigation**: "← Back" and "Next →" buttons
- [ ] **Error Display**: Message area for validation errors

### Step 5: Application Summary (`?e=tn&step=5`)
- [ ] **Form Structure**: Wrap container with proper styling
- [ ] **Basics Section**: Season, Category, Organization, Mailing Address
- [ ] **Teams Section**: Table with team names and entry options
- [ ] **Managers Section**: Table with manager contact information
- [ ] **Race Day Section**: Summary of race day arrangements
- [ ] **Practice Section**: Per-team practice booking summary
- [ ] **Navigation**: "← Back" and "Submit Application" buttons
- [ ] **Confirmation Area**: Hidden initially, shows after submission
- [ ] **Revisit Section**: For returning users

## Navigation Testing

### Deep Linking
- [ ] **Step 1**: `?e=tn&step=1` loads category selection
- [ ] **Step 2**: `?e=tn&step=2` loads team information
- [ ] **Step 3**: `?e=tn&step=3` loads race day arrangement
- [ ] **Step 4**: `?e=tn&step=4` loads practice booking
- [ ] **Step 5**: `?e=tn&step=5` loads application summary

### Navigation Buttons
- [ ] **Next Button**: Advances to next step, validates current step
- [ ] **Back Button**: Returns to previous step, preserves data
- [ ] **Submit Button**: Only appears on Step 5, submits form
- [ ] **URL Updates**: Browser URL updates with current step
- [ ] **History**: Browser back/forward buttons work correctly

### Refresh Persistence
- [ ] **Step 1**: Team count and category selection preserved
- [ ] **Step 2**: Team names, organization, address preserved
- [ ] **Step 3**: Race day quantities and boat numbers preserved
- [ ] **Step 4**: Slot preferences and practice data preserved
- [ ] **Step 5**: All summary data preserved

## Practice Section Testing

### Calendar Container
- [ ] **Element Present**: `#calendarContainer` exists in DOM
- [ ] **Styling**: Proper calendar wrapper styling applied
- [ ] **Initialization**: Calendar loads or shows appropriate placeholder
- [ ] **Team Context**: Calendar updates when team selection changes

### Slot Preference Ranking
- [ ] **2-Hour Slots**: All three ranking selects populated with 2-hour options
- [ ] **1-Hour Slots**: All three ranking selects populated with 1-hour options
- [ ] **Slot Options**: Options match config timeslots filtered by duration
- [ ] **Default Values**: All selects start with "-- Select --" option
- [ ] **Required Field**: First 2-hour slot is required

### Duplicate Prevention
- [ ] **Real-time Validation**: Duplicate selections detected immediately
- [ ] **Error Display**: Inline error messages appear below affected selects
- [ ] **Error Styling**: Selects with errors show red border and background
- [ ] **Error Clearing**: Errors clear when duplicates are resolved
- [ ] **Cross-Column Validation**: Duplicates detected across 2h and 1h columns

### Advisory Validation
- [ ] **Window Rules**: Client-side warnings for practice window violations
- [ ] **Weekday Rules**: Client-side warnings for weekday restrictions
- [ ] **Min/Max Rows**: Advisory messages for row count limits
- [ ] **Server Enforcement**: Final validation handled by server

## Totals and Summary Testing

### Step-by-Step Totals
- [ ] **Step 1**: Entry option totals calculated correctly
- [ ] **Step 2**: No totals (information only)
- [ ] **Step 3**: Race day item totals calculated correctly
- [ ] **Step 4**: Practice session totals calculated correctly
- [ ] **Step 5**: Complete summary with all totals

### Summary Accuracy
- [ ] **Basics**: All basic information matches input
- [ ] **Teams**: Team names and options match Step 2
- [ ] **Managers**: Manager information matches Step 2
- [ ] **Race Day**: Quantities and boat numbers match Step 3
- [ ] **Practice**: Practice preferences match Step 4
- [ ] **Totals**: All financial totals calculated correctly

### Legacy Compatibility
- [ ] **Input Matching**: Same inputs produce same totals as legacy
- [ ] **Calculation Logic**: Totals use same formulas as original
- [ ] **Display Format**: Totals displayed in same format (HK$X,XXX)
- [ ] **Rounding**: Same rounding behavior as legacy

## Submission Testing

### Successful Submission
- [ ] **Registration ID**: Returns unique registration identifier
- [ ] **Team Codes**: Returns array of team codes for each team
- [ ] **Confirmation Display**: Shows success message with details
- [ ] **Copy Functionality**: Registration ID can be copied to clipboard
- [ ] **Print Functionality**: Summary can be printed
- [ ] **Receipt Storage**: Lightweight receipt saved to localStorage

### Idempotency Testing
- [ ] **Duplicate Prevention**: Same client_tx_id returns same results
- [ ] **Registration ID**: Duplicate submissions return same registration_id
- [ ] **Team Codes**: Duplicate submissions return same team_codes
- [ ] **No Double Charging**: Multiple submissions don't create multiple charges
- [ ] **Error Handling**: Network errors don't cause duplicate submissions

### Error Handling
- [ ] **Network Errors**: Graceful handling of connection failures
- [ ] **Validation Errors**: Server validation errors displayed clearly
- [ ] **Timeout Handling**: Long-running submissions handled appropriately
- [ ] **Retry Logic**: Failed submissions can be retried safely

## CSS Scoping Testing

### TN Legacy Styles
- [ ] **Scoped CSS**: TN legacy styles only apply within #tnScope
- [ ] **No Leakage**: TN styles don't affect WU/SC forms
- [ ] **Complete Coverage**: All legacy styles preserved and scoped
- [ ] **Visual Match**: Appearance identical to original forms

### WU/SC Protection
- [ ] **Clean Separation**: WU/SC forms unaffected by TN styles
- [ ] **Modern Styling**: WU/SC forms use modern CSS only
- [ ] **No Conflicts**: No style conflicts between modes

## Debugging Tools

### DOM Snapshot Tool
Use `window.__DBG_TN.domSnapshot()` in browser console to capture current step structure:

```javascript
// Capture current step DOM structure
const snapshot = window.__DBG_TN.domSnapshot();
console.log('Current step DOM structure:', snapshot);

// Compare with legacy structure
// (Manual comparison with original form DOM)
```

### State Inspection
```javascript
// Check current wizard state
console.log('Current step:', window.__DBG_TN.getCurrentStep());
console.log('Session data:', window.__DBG_TN.getSessionData());

// Check form validation
console.log('Step validation:', window.__DBG_TN.validateCurrentStep());
```

### Performance Monitoring
```javascript
// Monitor step load times
console.log('Step load performance:', window.__DBG_TN.getPerformanceMetrics());
```

## Test Scenarios

### Happy Path
1. Navigate to `?e=tn`
2. Complete all steps with valid data
3. Submit form successfully
4. Verify registration ID and team codes
5. Test idempotency with same data

### Edge Cases
1. **Empty Forms**: Submit with minimal required data
2. **Maximum Data**: Submit with all optional fields filled
3. **Special Characters**: Test with unicode and special characters
4. **Long Text**: Test with very long team names and addresses
5. **Network Issues**: Test with slow/interrupted connections

### Regression Testing
1. **Legacy Comparison**: Compare each step with original forms
2. **Cross-Browser**: Test in Chrome, Firefox, Safari, Edge
3. **Mobile Testing**: Test on various mobile devices
4. **Accessibility**: Test with screen readers and keyboard navigation

## Acceptance Criteria

### ✅ Complete Parity Achieved When:
- [ ] All visual elements match original forms exactly
- [ ] Navigation works identically to legacy
- [ ] Practice calendar and ranking function identically
- [ ] Totals calculations match legacy exactly
- [ ] Submission returns same data structure
- [ ] Idempotency works correctly
- [ ] CSS scoping prevents style conflicts
- [ ] Deep linking and refresh persistence work
- [ ] Error handling matches legacy behavior

### 🚫 Known Limitations:
- Calendar implementation may be stubbed initially
- Some advanced practice features may need additional development
- Mobile responsiveness may differ from original
- Some edge cases may need additional testing

## Manual Testing Checklist

### Pre-Test Setup
- [ ] Clear browser cache and localStorage
- [ ] Ensure config is loaded correctly
- [ ] Verify TN templates are available
- [ ] Check that CSS scoping is working

### Step-by-Step Verification
- [ ] **Step 1**: Visual comparison with 1_category.html
- [ ] **Step 2**: Visual comparison with 2_teaminfo.html  
- [ ] **Step 3**: Visual comparison with 3_raceday.html
- [ ] **Step 4**: Visual comparison with 4_booking.html
- [ ] **Step 5**: Visual comparison with 5_summary.html

### Functional Testing
- [ ] **Navigation**: All buttons work correctly
- [ ] **Validation**: All validation rules enforced
- [ ] **Persistence**: Data survives page refresh
- [ ] **Submission**: Form submits successfully
- [ ] **Idempotency**: Duplicate submissions handled correctly

### Cross-Mode Testing
- [ ] **TN Mode**: `?e=tn` shows wizard correctly
- [ ] **WU Mode**: `?e=wu` shows single-page form correctly  
- [ ] **SC Mode**: `?e=sc` shows single-page form correctly
- [ ] **No Conflicts**: Modes don't interfere with each other

## Reporting Issues

When reporting issues, include:
1. **Step**: Which step the issue occurs on
2. **Expected**: What should happen
3. **Actual**: What actually happens
4. **DOM Snapshot**: Output from `window.__DBG_TN.domSnapshot()`
5. **Console Errors**: Any JavaScript errors
6. **Browser**: Browser and version
7. **Steps to Reproduce**: Detailed reproduction steps
