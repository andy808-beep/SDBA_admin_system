# Manual QA Testing Checklist

Comprehensive testing checklist for manual QA of the registration forms application.

## Pre-Testing Setup

- [ ] Clear browser cache and cookies
- [ ] Open browser DevTools (Console, Network, Application tabs)
- [ ] Test in incognito/private browsing mode
- [ ] Disable browser extensions that might interfere
- [ ] Have test data ready (email, phone numbers, team names)

---

## 1. Form Loading & Initialization

### Event Picker
- [ ] **Load homepage**: Visit root URL (`/` or `/register.html`)
- [ ] **Event picker displays**: Shows list of available events
- [ ] **Events load correctly**: All enabled events appear
- [ ] **Event information**: Event name, date, location visible
- [ ] **Click event**: Clicking event card loads form
- [ ] **URL updates**: URL changes to include `?e=<event-ref>`
- [ ] **Direct URL**: Visiting `/register.html?e=tn` loads TN form directly

### Form Initialization
- [ ] **Form loads**: Form appears after event selection
- [ ] **No console errors**: Check browser console for errors
- [ ] **No 404 errors**: Check Network tab for missing files
- [ ] **CSS loads**: Styles applied correctly
- [ ] **JavaScript loads**: All scripts load successfully
- [ ] **Environment variables**: `window.ENV` object populated correctly

---

## 2. TN Form Testing

### Step 1: Event Selection & Basic Info
- [ ] **Event pre-selected**: Correct event selected (if coming from URL)
- [ ] **Organization name**: Can enter organization name
- [ ] **Mailing address**: Can enter mailing address
- [ ] **Required fields**: Validation works (shows error if empty)
- [ ] **Next button**: Clicking "Next" advances to step 2

### Step 2: Team Information
- [ ] **Number of teams**: Can select number of teams
- [ ] **Team rows appear**: Correct number of team rows displayed
- [ ] **Team names**: Can enter team name for each team
- [ ] **Division selection**: Can select division for each team
- [ ] **Entry group**: Can select entry group for each team
- [ ] **Validation**: Required fields validated
- [ ] **Next button**: Advances to step 3

### Step 3: Team Manager Information
- [ ] **Manager 1 required**: Name, phone, email required
- [ ] **Phone validation**: Invalid phone numbers rejected
- [ ] **Email validation**: Invalid emails rejected
- [ ] **Manager 2 optional**: Can add second manager
- [ ] **Manager 3 optional**: Can add third manager
- [ ] **Phone format**: Phone numbers formatted correctly
- [ ] **Next button**: Advances to step 4

### Step 4: Practice Session Selection
- [ ] **Practice dates**: Available dates displayed
- [ ] **Date selection**: Can select practice date
- [ ] **Time slots**: Available time slots shown
- [ ] **Slot selection**: Can select time slot
- [ ] **Multiple slots**: Can select multiple slots (if allowed)
- [ ] **Validation**: Must select at least one slot
- [ ] **Next button**: Advances to step 5

### Step 5: Review & Submit
- [ ] **Summary displays**: All entered information shown
- [ ] **Totals correct**: Price calculations correct
- [ ] **Back button**: Can go back to previous steps
- [ ] **Edit information**: Can navigate back and edit
- [ ] **Submit button**: Submit button visible and enabled

### TN Form Submission
- [ ] **Submit works**: Clicking submit sends request
- [ ] **Loading state**: Submit button shows loading state
- [ ] **Success message**: Success message displayed
- [ ] **Registration ID**: Registration ID shown
- [ ] **Team codes**: Team codes displayed
- [ ] **Receipt saved**: Receipt saved to localStorage
- [ ] **No errors**: No console errors during submission

---

## 3. WU Form Testing

### Form Structure
- [ ] **Form loads**: WU form loads correctly
- [ ] **All steps work**: Can navigate through all steps
- [ ] **Boat type selection**: Can select boat type
- [ ] **Division selection**: Can select division
- [ ] **Team information**: Can enter team information
- [ ] **Manager information**: Can enter manager details

### WU Form Submission
- [ ] **Submit works**: Form submits successfully
- [ ] **Success message**: Success message displayed
- [ ] **Team codes**: Team codes shown correctly
- [ ] **No errors**: No console errors

---

## 4. SC Form Testing

### Form Structure
- [ ] **Form loads**: SC form loads correctly
- [ ] **All steps work**: Can navigate through all steps
- [ ] **Form fields**: All required fields present
- [ ] **Validation**: Validation works correctly

### SC Form Submission
- [ ] **Submit works**: Form submits successfully
- [ ] **Success message**: Success message displayed
- [ ] **Team codes**: Team codes shown correctly
- [ ] **No errors**: No console errors

---

## 5. Validation Testing

### Required Fields
- [ ] **Empty submission**: Cannot submit with empty required fields
- [ ] **Error messages**: Clear error messages shown
- [ ] **Field highlighting**: Invalid fields highlighted
- [ ] **Error clearing**: Errors clear when field corrected

### Email Validation
- [ ] **Valid email**: Accepts valid email addresses
- [ ] **Invalid email**: Rejects invalid email addresses
- [ ] **Email format**: Validates email format correctly
- [ ] **Error message**: Shows clear error for invalid email

### Phone Validation
- [ ] **Valid phone**: Accepts valid Hong Kong phone numbers
- [ ] **Invalid phone**: Rejects invalid phone numbers
- [ ] **Phone format**: Formats phone numbers correctly
- [ ] **Error message**: Shows clear error for invalid phone

### Number Validation
- [ ] **Number of teams**: Validates number of teams
- [ ] **Quantity limits**: Enforces quantity limits
- [ ] **Negative numbers**: Rejects negative numbers
- [ ] **Non-numeric**: Rejects non-numeric input

---

## 6. Error Handling Testing

### Network Errors
- [ ] **Offline mode**: Disable network, try to submit
- [ ] **Error message**: Shows user-friendly error message
- [ ] **Retry possible**: Can retry after error
- [ ] **Form state**: Form state preserved after error

### Server Errors
- [ ] **500 error**: Server error shows friendly message
- [ ] **400 error**: Validation errors from server displayed
- [ ] **429 error**: Rate limit error shows appropriate message
- [ ] **404 error**: Not found error handled gracefully

### Timeout Errors
- [ ] **Slow network**: Test with slow 3G throttling
- [ ] **Timeout**: Request timeout shows error message
- [ ] **Retry**: Can retry after timeout

---

## 7. Rate Limiting Testing

### Rate Limit Functionality
- [ ] **Multiple submissions**: Submit form multiple times rapidly
- [ ] **Rate limit triggered**: Rate limit message appears
- [ ] **Countdown timer**: Countdown timer shows time remaining
- [ ] **Button disabled**: Submit button disabled when rate limited
- [ ] **Wait period**: Must wait before submitting again
- [ ] **Reset**: Rate limit resets after time window

### Cross-Tab Rate Limiting
- [ ] **Multiple tabs**: Open form in multiple tabs
- [ ] **Rate limit syncs**: Rate limit applies across tabs
- [ ] **localStorage**: Rate limit persists in localStorage

---

## 8. Navigation & UX Testing

### Step Navigation
- [ ] **Next button**: Advances to next step
- [ ] **Back button**: Returns to previous step
- [ ] **Step indicator**: Current step highlighted
- [ ] **Step validation**: Cannot skip required steps
- [ ] **Data persistence**: Data persists when navigating back/forward

### Form State
- [ ] **Data saved**: Form data saved in sessionStorage
- [ ] **Page refresh**: Data persists after page refresh
- [ ] **Browser back**: Browser back button works correctly
- [ ] **URL updates**: URL updates when changing steps (if implemented)

### User Feedback
- [ ] **Loading states**: Loading indicators shown during operations
- [ ] **Success messages**: Success messages clear and visible
- [ ] **Error messages**: Error messages user-friendly
- [ ] **Button states**: Buttons disabled during submission
- [ ] **Visual feedback**: Visual feedback for user actions

---

## 9. Mobile Testing

### Mobile Devices
- [ ] **iOS Safari**: Test on iPhone/iPad
- [ ] **Android Chrome**: Test on Android device
- [ ] **Touch interactions**: All buttons/inputs work with touch
- [ ] **Keyboard**: Mobile keyboard appears correctly
- [ ] **Viewport**: Content fits mobile screen
- [ ] **Scrolling**: Can scroll through form
- [ ] **Zoom**: Can zoom in/out (if needed)

### Mobile-Specific
- [ ] **Phone input**: Phone number input works on mobile
- [ ] **Email input**: Email keyboard appears
- [ ] **Date picker**: Date picker works on mobile
- [ ] **Select dropdowns**: Dropdowns work on mobile
- [ ] **Form submission**: Can submit form on mobile

---

## 10. Browser Compatibility

### Desktop Browsers
- [ ] **Chrome** (latest): All features work
- [ ] **Firefox** (latest): All features work
- [ ] **Safari** (latest): All features work
- [ ] **Edge** (latest): All features work

### Browser Features
- [ ] **JavaScript enabled**: Works with JavaScript enabled
- [ ] **LocalStorage**: LocalStorage works
- [ ] **SessionStorage**: SessionStorage works
- [ ] **Fetch API**: Fetch API works
- [ ] **ES6 features**: Modern JavaScript features work

---

## 11. Performance Testing

### Load Time
- [ ] **Initial load**: Page loads in < 3 seconds
- [ ] **Form load**: Form loads in < 2 seconds
- [ ] **Asset loading**: All assets load successfully
- [ ] **No blocking**: No blocking resources

### Network Performance
- [ ] **Slow 3G**: Test on slow 3G connection
- [ ] **Offline**: Handles offline gracefully
- [ ] **Retry logic**: Retries work correctly
- [ ] **Timeout**: Timeouts handled correctly

### Resource Usage
- [ ] **Memory**: No memory leaks (check DevTools)
- [ ] **CPU**: No excessive CPU usage
- [ ] **Network requests**: Minimal unnecessary requests
- [ ] **Bundle size**: JavaScript bundle size reasonable

---

## 12. Security Testing

### XSS Protection
- [ ] **Script injection**: Try injecting `<script>` tags
- [ ] **HTML injection**: Try injecting HTML
- [ ] **Event handlers**: Try injecting event handlers
- [ ] **No execution**: Malicious code does not execute

### Data Protection
- [ ] **Sensitive data**: No sensitive data in console logs
- [ ] **API keys**: API keys not exposed in client code
- [ ] **Environment variables**: Environment variables loaded correctly
- [ ] **Debug helpers**: Debug helpers not available in production

### HTTPS
- [ ] **HTTPS enforced**: HTTP redirects to HTTPS
- [ ] **Mixed content**: No mixed content warnings
- [ ] **SSL certificate**: Valid SSL certificate
- [ ] **Security headers**: Security headers present

---

## 13. Integration Testing

### Supabase Integration
- [ ] **Database connection**: Can connect to Supabase
- [ ] **Data retrieval**: Can retrieve event configuration
- [ ] **Data submission**: Can submit form data
- [ ] **Data storage**: Data appears in database
- [ ] **RLS policies**: RLS policies enforced

### Edge Function Integration
- [ ] **Function call**: Edge function called correctly
- [ ] **Request format**: Request format correct
- [ ] **Response format**: Response format correct
- [ ] **Error handling**: Edge function errors handled
- [ ] **CORS**: CORS configured correctly

### Sentry Integration
- [ ] **Error tracking**: Errors sent to Sentry
- [ ] **Breadcrumbs**: Breadcrumbs logged
- [ ] **Context**: Context data included
- [ ] **Filtering**: Development errors filtered

---

## 14. Edge Cases

### Form Edge Cases
- [ ] **Very long input**: Handles very long text input
- [ ] **Special characters**: Handles special characters
- [ ] **Unicode**: Handles Unicode characters
- [ ] **Empty strings**: Handles empty strings correctly
- [ ] **Whitespace**: Trims whitespace correctly

### Browser Edge Cases
- [ ] **Browser back**: Browser back button works
- [ ] **Browser refresh**: Page refresh works
- [ ] **Tab close**: Handles tab close gracefully
- [ ] **Multiple tabs**: Multiple tabs work correctly
- [ ] **Bookmark**: Can bookmark form URL

### Network Edge Cases
- [ ] **Slow connection**: Handles slow connections
- [ ] **Intermittent connection**: Handles intermittent connection
- [ ] **Request timeout**: Handles request timeout
- [ ] **Partial response**: Handles partial responses

---

## 15. Post-Submission Testing

### Success Flow
- [ ] **Confirmation page**: Confirmation page displays
- [ ] **Registration ID**: Registration ID shown
- [ ] **Team codes**: Team codes displayed
- [ ] **Receipt**: Receipt information correct
- [ ] **Print option**: Can print receipt (if available)

### Data Verification
- [ ] **Database check**: Verify data in Supabase database
- [ ] **Data accuracy**: All data saved correctly
- [ ] **Team codes**: Team codes generated correctly
- [ ] **Timestamps**: Timestamps correct

### Duplicate Submission
- [ ] **Idempotency**: Duplicate submission handled
- [ ] **Same ID**: Returns same registration ID
- [ ] **No duplicates**: No duplicate records created
- [ ] **User message**: User sees appropriate message

---

## Test Results Summary

**Tested By:** _______________________  
**Date:** _______________________  
**Environment:** Production / Staging / Local  

### Overall Status
- [ ] ✅ All tests passed
- [ ] ⚠️ Some issues found (see notes below)
- [ ] ❌ Critical issues found (see notes below)

### Issues Found

_List any issues found during testing:_

1. 
2. 
3. 

### Notes

_Additional notes or observations:_




---

**Last Updated:** 2025-01-XX  
**Version:** 1.0

