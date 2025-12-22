# Error System Translations - Implementation Summary

## File Updated

**Location:** `public/js/i18n/translations.js`

## Translations Added

All error message translations have been added to both English (`en`) and Traditional Chinese (`zh`) sections.

### General Messages

| Key | English | Traditional Chinese |
|-----|---------|---------------------|
| `pleaseCorrectErrors` | "⚠️ Please correct the following errors:" | "⚠️ 請更正以下錯誤：" |
| `dismissErrors` | "Dismiss errors" | "關閉錯誤" |
| `close` | "Close" | "關閉" |
| `closeError` | "Close error" | "關閉錯誤" |
| `closeErrorSummary` | "Close error summary" | "關閉錯誤摘要" |
| `systemError` | "System Error" | "系統錯誤" |
| `systemErrorTitle` | "System Error" | "系統錯誤" |
| `formErrorsTitle` | "Please correct the following errors:" | "請更正以下錯誤：" |

### Field Validation Messages

| Key | English | Traditional Chinese |
|-----|---------|---------------------|
| `fieldRequired` | "This field is required" | "此欄位為必填" |
| `invalidEmail` | "Please enter a valid email address" | "請輸入有效的電郵地址" |
| `invalidPhone` | "Please enter an 8-digit Hong Kong phone number" | "請輸入8位數字的香港電話號碼" |
| `duplicateTeamName` | "Team name must be unique" | "隊伍名稱必須唯一" |

**Note:** The following keys already existed and remain unchanged:
- `invalidEmailError` - "Please enter a valid email address." / "請輸入有效的電郵地址。"
- `invalidPhoneError` - "Please enter an 8-digit Hong Kong phone number." / "請輸入8位數字的香港電話號碼。"

### Specific Field Validation Messages

| Key | English | Traditional Chinese |
|-----|---------|---------------------|
| `teamNameRequired` | "Team name is required" | "隊伍名稱為必填" |
| `categoryRequired` | "Please select a race category" | "請選擇比賽組別" |
| `entryOptionRequired` | "Please select an entry option" | "請選擇參賽選項" |
| `organizationRequired` | "Organization name is required" | "機構名稱為必填" |
| `addressRequired` | "Address is required" | "地址為必填" |
| `managerNameRequired` | "Manager name is required" | "負責人姓名為必填" |
| `managerPhoneRequired` | "Manager phone is required" | "負責人電話為必填" |
| `managerEmailRequired` | "Manager email is required" | "負責人電郵為必填" |

### Server Error Messages (Enhanced)

| Key | English | Traditional Chinese |
|-----|---------|---------------------|
| `serverErrorDetailed` | "Unable to process your request. Please try again later." | "無法處理您的請求，請稍後再試。" |
| `networkErrorDetailed` | "Network connection error. Please check your connection and try again." | "網絡連接錯誤，請檢查您的連接並重試。" |
| `rateLimitExceeded` | "Too many attempts. Please wait a few minutes and try again." | "嘗試次數過多，請稍候幾分鐘後再試。" |
| `duplicateRegistration` | "This registration already exists. Please contact support if you need assistance." | "此註冊已存在，如需協助請聯絡客戶服務。" |
| `timeoutErrorDetailed` | "Request timeout. Please try again." | "請求超時，請重試。" |

**Note:** The following keys already existed and remain unchanged:
- `serverError` - "Server error. Please try again later." / "伺服器錯誤。請稍後再試。"
- `networkError` - "Network error. Please try again." / "網絡錯誤。請重試。"
- `timeoutError` - "Request timed out. Please try again." / "請求逾時。請重試。"

## Usage Examples

### Using Error System with Translations

```javascript
// Field-level error
errorSystem.showFieldError('email', 'invalidEmail', {
  scrollTo: true,
  focus: true
});

// Form-level errors
errorSystem.showFormErrors([
  { field: 'email', messageKey: 'invalidEmail' },
  { field: 'phone', messageKey: 'invalidPhone' }
], {
  containerId: 'myForm',
  scrollTo: true,
  titleKey: 'formErrorsTitle'
});

// System-level error
errorSystem.showSystemError('networkErrorDetailed', {
  titleKey: 'systemErrorTitle',
  persistent: false
});

// Server error
errorSystem.showSystemError('serverErrorDetailed', {
  titleKey: 'systemErrorTitle',
  persistent: true
});
```

### Direct Translation Access

```javascript
// Using i18n directly
const message = window.i18n.t('invalidEmail');
// English: "Please enter a valid email address"
// Chinese: "請輸入有效的電郵地址"

// With parameters
const message = window.i18n.t('pleaseCorrectErrors', { count: 3 });
```

## Translation Key Mapping

### Existing Keys (Still Available)

These keys already existed and can still be used:

- `invalidEmailError` - Field-level email validation
- `invalidPhoneError` - Field-level phone validation
- `serverError` - Generic server error
- `networkError` - Generic network error
- `timeoutError` - Generic timeout error

### New Keys (Phase 2)

These are new keys added for the unified error system:

- `invalidEmail` - Alternative to `invalidEmailError` (without period)
- `invalidPhone` - Alternative to `invalidPhoneError` (without period)
- `serverErrorDetailed` - More detailed server error message
- `networkErrorDetailed` - More detailed network error message
- `timeoutErrorDetailed` - More detailed timeout error message
- `rateLimitExceeded` - Rate limit error message
- `duplicateRegistration` - Duplicate registration error message

## Integration with ErrorSystem Class

The `error-system.js` module automatically uses these translations via:

```javascript
errorSystem.getMessage(messageKey, params)
```

This method:
1. Checks if `window.i18n` is available
2. Calls `window.i18n.t(messageKey, params)` if available
3. Falls back to the key if i18n is not available

## File Structure

The translations are organized in the file as:

```
translations = {
  en: {
    // ... existing translations ...
    
    // ============================================
    // ERROR SYSTEM MESSAGES (Phase 2)
    // ============================================
    
    // General error messages
    pleaseCorrectErrors: "...",
    dismissErrors: "...",
    // ... etc ...
  },
  
  zh: {
    // ... existing translations ...
    
    // ============================================
    // ERROR SYSTEM MESSAGES (Phase 2)
    // ============================================
    
    // General error messages
    pleaseCorrectErrors: "...",
    dismissErrors: "...",
    // ... etc ...
  }
}
```

## Testing

To test the translations:

1. **Load the page** with i18n system initialized
2. **Switch language** using the language switcher
3. **Trigger errors** using the ErrorSystem class
4. **Verify** that error messages appear in the correct language

## Notes

- All translations follow the existing pattern in the file
- English translations use standard US English
- Traditional Chinese translations use Hong Kong style (繁體中文)
- Some keys have both short and detailed versions (e.g., `serverError` vs `serverErrorDetailed`)
- The error system will automatically use the appropriate translation based on current language setting
