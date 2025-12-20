/**
 * Test Helper Utilities
 */

/**
 * Create a form field element
 */
export function createField(type = 'text', id = 'testField', options = {}) {
  const field = document.createElement('input');
  field.type = type;
  field.id = id;
  field.name = id;
  
  if (options.value) {
    field.value = options.value;
  }
  
  if (options.required) {
    field.required = true;
  }
  
  if (options.className) {
    field.className = options.className;
  }
  
  return field;
}

/**
 * Create a form container
 */
export function createForm(id = 'testForm') {
  const form = document.createElement('form');
  form.id = id;
  document.body.appendChild(form);
  return form;
}

/**
 * Create a container element
 */
export function createContainer(id = 'testContainer') {
  const container = document.createElement('div');
  container.id = id;
  document.body.appendChild(container);
  return container;
}

/**
 * Wait for next animation frame
 */
export function waitForAnimationFrame() {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

/**
 * Wait for a condition
 */
export function waitFor(condition, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(check, 10);
      }
    };
    
    check();
  });
}

/**
 * Create multiple fields
 */
export function createFields(count, prefix = 'field') {
  const fields = [];
  for (let i = 1; i <= count; i++) {
    const field = createField('text', `${prefix}${i}`);
    fields.push(field);
  }
  return fields;
}

/**
 * Get error message element
 */
export function getErrorMessage(fieldId) {
  return document.getElementById(`error-${fieldId}`);
}

/**
 * Check if field has error class
 */
export function hasErrorClass(fieldId) {
  const field = document.getElementById(fieldId);
  return field && field.classList.contains('field-error');
}

/**
 * Get form error summary
 */
export function getFormErrorSummary() {
  return document.querySelector('.form-error-summary');
}

/**
 * Get system error
 */
export function getSystemError() {
  return document.querySelector('.system-error');
}

/**
 * Clear all errors from DOM
 */
export function clearAllErrors() {
  // Clear field errors
  document.querySelectorAll('.field-error-message').forEach(el => el.remove());
  document.querySelectorAll('.field-error').forEach(el => {
    el.classList.remove('field-error');
    el.removeAttribute('aria-invalid');
    el.removeAttribute('aria-describedby');
  });
  
  // Clear form summary
  const summary = getFormErrorSummary();
  if (summary) summary.remove();
  
  // Clear system error
  const systemError = getSystemError();
  if (systemError) systemError.remove();
}

/**
 * Mock i18n with custom translations
 */
export function mockI18n(translations = {}) {
  const defaultTranslations = {
    'emailRequired': 'Email is required',
    'invalidEmail': 'Please enter a valid email address',
    'phoneRequired': 'Phone number is required',
    'invalidPhone': 'Please enter a valid phone number',
    'formErrorsTitle': 'Please correct the following errors:',
    'systemErrorTitle': 'System Error',
    'closeError': 'Close error',
    'closeErrorSummary': 'Close error summary'
  };
  
  const allTranslations = { ...defaultTranslations, ...translations };
  
  global.window.i18n = {
    t: jest.fn((key, params = {}) => {
      let message = allTranslations[key] || key;
      
      if (params && typeof params === 'object') {
        Object.keys(params).forEach(param => {
          message = message.replace(`{${param}}`, params[param]);
        });
      }
      
      return message;
    })
  };
}

/**
 * Create a complete form with fields
 */
export function createTestForm(fieldIds = ['email', 'phone', 'name']) {
  const form = createForm('testForm');
  
  fieldIds.forEach(id => {
    const field = createField('text', id);
    form.appendChild(field);
  });
  
  return form;
}
