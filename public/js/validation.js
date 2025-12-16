/**
 * Shared validation utilities for email and phone number
 * Used across all SDBA registration forms (TN, WU, SC)
 */

/**
 * Validate email address
 * Simple, tolerant pattern: must have exactly one @, at least one . after @, no spaces
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const trimmed = email.trim();
  
  // Must not be empty
  if (trimmed.length === 0) {
    return false;
  }
  
  // Must not contain spaces
  if (trimmed.includes(' ')) {
    return false;
  }
  
  // Must contain exactly one @
  const atCount = (trimmed.match(/@/g) || []).length;
  if (atCount !== 1) {
    return false;
  }
  
  // Split by @ and check both parts exist
  const parts = trimmed.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return false;
  }
  
  // Must have at least one . after the @
  const domainPart = parts[1];
  if (!domainPart.includes('.')) {
    return false;
  }
  
  // Domain must have content before and after the .
  const domainParts = domainPart.split('.');
  for (const part of domainParts) {
    if (!part || part.length === 0) {
      return false;
    }
  }
  
  return true;
}

/**
 * Validate Hong Kong phone number (8 digits only)
 * @param {string} phone - Phone number to validate (should be 8 digits, no prefix)
 * @returns {boolean} - True if valid
 */
export function isValidHKPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  
  const trimmed = phone.trim();
  
  // Must be exactly 8 digits
  if (trimmed.length !== 8) {
    return false;
  }
  
  // Must contain only digits
  if (!/^\d{8}$/.test(trimmed)) {
    return false;
  }
  
  return true;
}

/**
 * Normalize Hong Kong phone number to storage format (+852xxxxxxxx)
 * @param {string} phone - Phone number (can be 8 digits or with +852 prefix)
 * @returns {string} - Normalized phone number in format +852xxxxxxxx
 */
export function normalizeHKPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return '';
  }
  
  // Remove whitespace and common separators
  let cleaned = phone.trim().replace(/[\s\-\(\)]/g, '');
  
  // If it starts with +852, extract the 8 digits
  if (cleaned.startsWith('+852')) {
    cleaned = cleaned.substring(4);
  } else if (cleaned.startsWith('852')) {
    cleaned = cleaned.substring(3);
  }
  
  // Validate the remaining 8 digits
  if (isValidHKPhone(cleaned)) {
    return `+852${cleaned}`;
  }
  
  return '';
}

/**
 * Extract 8-digit local number from normalized phone
 * @param {string} phone - Phone number (with or without +852)
 * @returns {string} - 8-digit local number
 */
export function extractLocalNumber(phone) {
  if (!phone || typeof phone !== 'string') {
    return '';
  }
  
  const normalized = normalizeHKPhone(phone);
  if (normalized) {
    return normalized.substring(4); // Remove +852
  }
  
  return phone.trim();
}

/**
 * Validate email field and show/hide error message
 * @param {HTMLElement} inputElement - The email input element
 * @param {HTMLElement} errorElement - The error message element (optional)
 * @returns {boolean} - True if valid
 */
export function validateEmailField(inputElement, errorElement = null) {
  if (!inputElement) return false;
  
  const email = inputElement.value.trim();
  const isValid = isValidEmail(email);
  
  if (!isValid) {
    inputElement.classList.add('invalid');
    if (errorElement) {
      // Use i18n for error message
      errorElement.textContent = window.i18n ? window.i18n.t('invalidEmailError') : 'Please enter a valid email address.';
      errorElement.style.display = 'block';
    }
  } else {
    inputElement.classList.remove('invalid');
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.style.display = 'none';
    }
  }
  
  return isValid;
}

/**
 * Validate phone field and show/hide error message
 * @param {HTMLElement} inputElement - The phone input element (8-digit local number)
 * @param {HTMLElement} errorElement - The error message element (optional)
 * @returns {boolean} - True if valid
 */
export function validatePhoneField(inputElement, errorElement = null) {
  if (!inputElement) return false;
  
  const phone = inputElement.value.trim();
  const isValid = isValidHKPhone(phone);
  
  if (!isValid) {
    inputElement.classList.add('invalid');
    if (errorElement) {
      // Use i18n for error message
      errorElement.textContent = window.i18n ? window.i18n.t('invalidPhoneError') : 'Please enter an 8-digit Hong Kong phone number.';
      errorElement.style.display = 'block';
    }
  } else {
    inputElement.classList.remove('invalid');
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.style.display = 'none';
    }
  }
  
  return isValid;
}

/**
 * Set up real-time validation for email input
 * @param {string} inputId - ID of the email input element
 */
export function setupEmailValidation(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  // Create error message element if it doesn't exist
  let errorEl = input.parentElement.querySelector('.field-error');
  if (!errorEl) {
    errorEl = document.createElement('div');
    errorEl.className = 'field-error';
    errorEl.style.display = 'none';
    input.parentElement.appendChild(errorEl);
  }
  
  // Validate on blur
  input.addEventListener('blur', () => {
    if (input.value.trim()) {
      validateEmailField(input, errorEl);
    }
  });
  
  // Clear error on input
  input.addEventListener('input', () => {
    if (input.classList.contains('invalid')) {
      input.classList.remove('invalid');
      errorEl.style.display = 'none';
    }
  });
}

/**
 * Set up real-time validation for phone input
 * @param {string} inputId - ID of the phone input element
 */
export function setupPhoneValidation(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  // Create error message element if it doesn't exist
  let errorEl = input.parentElement.querySelector('.field-error');
  if (!errorEl) {
    errorEl = document.createElement('div');
    errorEl.className = 'field-error';
    errorEl.style.display = 'none';
    input.parentElement.appendChild(errorEl);
  }
  
  // Enforce digits only
  input.addEventListener('input', (e) => {
    const cursorPosition = e.target.selectionStart;
    const oldValue = e.target.value;
    const newValue = oldValue.replace(/\D/g, '').substring(0, 8);
    
    if (oldValue !== newValue) {
      e.target.value = newValue;
      // Restore cursor position
      e.target.setSelectionRange(cursorPosition, cursorPosition);
    }
    
    // Clear error on input
    if (input.classList.contains('invalid')) {
      input.classList.remove('invalid');
      errorEl.style.display = 'none';
    }
  });
  
  // Validate on blur
  input.addEventListener('blur', () => {
    if (input.value.trim()) {
      validatePhoneField(input, errorEl);
    }
  });
}

