/**
 * Unit Tests for ErrorSystem Class
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  createField, 
  createForm, 
  createContainer,
  getErrorMessage,
  hasErrorClass,
  getFormErrorSummary,
  getSystemError,
  clearAllErrors,
  waitForAnimationFrame
} from '../utils/test-helpers.js';

// Import error system (adjust path as needed)
// In a real setup, you'd import the actual module
// For now, we'll test the global instance
let errorSystem;

beforeEach(() => {
  clearAllErrors();
  
  // Load error system
  // In real setup, this would be: import errorSystem from '../../public/js/error-system.js';
  // For testing, we'll use the global instance
  errorSystem = window.errorSystem || new (require('../../public/js/error-system.js').default)();
});

describe('ErrorSystem - showFieldError()', () => {
  it('should add field-error class to input', () => {
    const field = createField('text', 'email');
    document.body.appendChild(field);
    
    errorSystem.showFieldError('email', 'emailRequired');
    
    expect(hasErrorClass('email')).toBe(true);
  });
  
  it('should create error message div with correct ID', () => {
    const field = createField('text', 'email');
    document.body.appendChild(field);
    
    errorSystem.showFieldError('email', 'emailRequired');
    
    const errorDiv = getErrorMessage('email');
    expect(errorDiv).toBeTruthy();
    expect(errorDiv.id).toBe('error-email');
    expect(errorDiv.className).toBe('field-error-message');
  });
  
  it('should set ARIA attributes correctly', () => {
    const field = createField('text', 'email');
    document.body.appendChild(field);
    
    errorSystem.showFieldError('email', 'emailRequired');
    
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(field.getAttribute('aria-describedby')).toContain('error-email');
  });
  
  it('should use i18n for messages', () => {
    const field = createField('text', 'email');
    document.body.appendChild(field);
    
    errorSystem.showFieldError('email', 'emailRequired');
    
    const errorDiv = getErrorMessage('email');
    expect(errorDiv.textContent).toBe('Email is required');
    expect(window.i18n.t).toHaveBeenCalledWith('emailRequired', {});
  });
  
  it('should handle i18n parameters', () => {
    const field = createField('text', 'quantity');
    document.body.appendChild(field);
    
    errorSystem.showFieldError('quantity', 'quantityExceedsMax', {
      params: { max: 10 }
    });
    
    const errorDiv = getErrorMessage('quantity');
    expect(errorDiv.textContent).toContain('10');
    expect(window.i18n.t).toHaveBeenCalledWith('quantityExceedsMax', { max: 10 });
  });
  
  it('should scroll to field when scrollTo: true', () => {
    const field = createField('text', 'email');
    document.body.appendChild(field);
    
    errorSystem.showFieldError('email', 'emailRequired', {
      scrollTo: true
    });
    
    // Wait for setTimeout
    return new Promise(resolve => {
      setTimeout(() => {
        expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
        resolve();
      }, 150);
    });
  });
  
  it('should focus field when focus: true', () => {
    const field = createField('text', 'email');
    document.body.appendChild(field);
    
    errorSystem.showFieldError('email', 'emailRequired', {
      focus: true
    });
    
    // Wait for setTimeout
    return new Promise(resolve => {
      setTimeout(() => {
        expect(document.activeElement).toBe(field);
        resolve();
      }, 150);
    });
  });
  
  it('should return false if field not found', () => {
    const result = errorSystem.showFieldError('nonexistent', 'emailRequired');
    expect(result).toBe(false);
  });
  
  it('should reuse existing error div', () => {
    const field = createField('text', 'email');
    document.body.appendChild(field);
    
    // Show error twice
    errorSystem.showFieldError('email', 'emailRequired');
    const firstDiv = getErrorMessage('email');
    
    errorSystem.showFieldError('email', 'invalidEmail');
    const secondDiv = getErrorMessage('email');
    
    // Should be the same element
    expect(firstDiv).toBe(secondDiv);
    expect(secondDiv.textContent).toBe('Please enter a valid email address');
  });
});

describe('ErrorSystem - clearFieldError()', () => {
  it('should remove field-error class', () => {
    const field = createField('text', 'email');
    document.body.appendChild(field);
    
    errorSystem.showFieldError('email', 'emailRequired');
    expect(hasErrorClass('email')).toBe(true);
    
    errorSystem.clearFieldError('email');
    expect(hasErrorClass('email')).toBe(false);
  });
  
  it('should remove error message div', () => {
    const field = createField('text', 'email');
    document.body.appendChild(field);
    
    errorSystem.showFieldError('email', 'emailRequired');
    expect(getErrorMessage('email')).toBeTruthy();
    
    errorSystem.clearFieldError('email');
    expect(getErrorMessage('email')).toBeFalsy();
  });
  
  it('should remove ARIA attributes', () => {
    const field = createField('text', 'email');
    document.body.appendChild(field);
    
    errorSystem.showFieldError('email', 'emailRequired');
    errorSystem.clearFieldError('email');
    
    expect(field.getAttribute('aria-invalid')).toBeNull();
    expect(field.getAttribute('aria-describedby')).toBeNull();
  });
  
  it('should remove from errors Map', () => {
    const field = createField('text', 'email');
    document.body.appendChild(field);
    
    errorSystem.showFieldError('email', 'emailRequired');
    expect(errorSystem.hasError('email')).toBe(true);
    
    errorSystem.clearFieldError('email');
    expect(errorSystem.hasError('email')).toBe(false);
  });
  
  it('should return false if field has no error', () => {
    const field = createField('text', 'email');
    document.body.appendChild(field);
    
    const result = errorSystem.clearFieldError('email');
    expect(result).toBe(false);
  });
});

describe('ErrorSystem - showFormErrors()', () => {
  it('should show inline errors for each field', () => {
    const form = createForm();
    const email = createField('text', 'email');
    const phone = createField('text', 'phone');
    form.appendChild(email);
    form.appendChild(phone);
    
    const errors = [
      { field: 'email', messageKey: 'emailRequired' },
      { field: 'phone', messageKey: 'phoneRequired' }
    ];
    
    errorSystem.showFormErrors(errors, { containerId: 'testForm' });
    
    expect(hasErrorClass('email')).toBe(true);
    expect(hasErrorClass('phone')).toBe(true);
    expect(getErrorMessage('email')).toBeTruthy();
    expect(getErrorMessage('phone')).toBeTruthy();
  });
  
  it('should create summary for 2+ errors', () => {
    const form = createForm();
    const email = createField('text', 'email');
    const phone = createField('text', 'phone');
    form.appendChild(email);
    form.appendChild(phone);
    
    const errors = [
      { field: 'email', messageKey: 'emailRequired' },
      { field: 'phone', messageKey: 'phoneRequired' }
    ];
    
    errorSystem.showFormErrors(errors, { containerId: 'testForm' });
    
    const summary = getFormErrorSummary();
    expect(summary).toBeTruthy();
    expect(summary.querySelector('.error-list')).toBeTruthy();
  });
  
  it('should not create summary for single error', () => {
    const form = createForm();
    const email = createField('text', 'email');
    form.appendChild(email);
    
    const errors = [
      { field: 'email', messageKey: 'emailRequired' }
    ];
    
    errorSystem.showFormErrors(errors, { containerId: 'testForm' });
    
    const summary = getFormErrorSummary();
    expect(summary).toBeFalsy();
  });
  
  it('should create clickable links in summary', () => {
    const form = createForm();
    const email = createField('text', 'email');
    const phone = createField('text', 'phone');
    form.appendChild(email);
    form.appendChild(phone);
    
    const errors = [
      { field: 'email', messageKey: 'emailRequired' },
      { field: 'phone', messageKey: 'phoneRequired' }
    ];
    
    errorSystem.showFormErrors(errors, { containerId: 'testForm' });
    
    const summary = getFormErrorSummary();
    const links = summary.querySelectorAll('.error-list a');
    expect(links.length).toBe(2);
    expect(links[0].href).toContain('#email');
    expect(links[1].href).toContain('#phone');
  });
  
  it('should scroll to field when link clicked', () => {
    const form = createForm();
    const email = createField('text', 'email');
    const phone = createField('text', 'phone');
    form.appendChild(email);
    form.appendChild(phone);
    
    const errors = [
      { field: 'email', messageKey: 'emailRequired' },
      { field: 'phone', messageKey: 'phoneRequired' }
    ];
    
    errorSystem.showFormErrors(errors, { containerId: 'testForm' });
    
    const summary = getFormErrorSummary();
    const link = summary.querySelector('.error-list a');
    link.click();
    
    // Wait for scroll
    return new Promise(resolve => {
      setTimeout(() => {
        expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
        resolve();
      }, 100);
    });
  });
  
  it('should have dismissible close button', () => {
    const form = createForm();
    const email = createField('text', 'email');
    const phone = createField('text', 'phone');
    form.appendChild(email);
    form.appendChild(phone);
    
    const errors = [
      { field: 'email', messageKey: 'emailRequired' },
      { field: 'phone', messageKey: 'phoneRequired' }
    ];
    
    errorSystem.showFormErrors(errors, { containerId: 'testForm' });
    
    const summary = getFormErrorSummary();
    const closeBtn = summary.querySelector('.error-close');
    expect(closeBtn).toBeTruthy();
    
    closeBtn.click();
    
    expect(getFormErrorSummary()).toBeFalsy();
  });
  
  it('should scroll to summary when scrollTo: true', () => {
    const form = createForm();
    const email = createField('text', 'email');
    const phone = createField('text', 'phone');
    form.appendChild(email);
    form.appendChild(phone);
    
    const errors = [
      { field: 'email', messageKey: 'emailRequired' },
      { field: 'phone', messageKey: 'phoneRequired' }
    ];
    
    errorSystem.showFormErrors(errors, { 
      containerId: 'testForm',
      scrollTo: true
    });
    
    return waitForAnimationFrame().then(() => {
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });
  });
  
  it('should scroll to field for single error', () => {
    const form = createForm();
    const email = createField('text', 'email');
    form.appendChild(email);
    
    const errors = [
      { field: 'email', messageKey: 'emailRequired' }
    ];
    
    errorSystem.showFormErrors(errors, { 
      containerId: 'testForm',
      scrollTo: true
    });
    
    return new Promise(resolve => {
      setTimeout(() => {
        expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
        resolve();
      }, 150);
    });
  });
  
  it('should return false for empty errors array', () => {
    const result = errorSystem.showFormErrors([]);
    expect(result).toBe(false);
  });
});

describe('ErrorSystem - clearFormErrors()', () => {
  it('should remove summary', () => {
    const form = createForm();
    const email = createField('text', 'email');
    const phone = createField('text', 'phone');
    form.appendChild(email);
    form.appendChild(phone);
    
    const errors = [
      { field: 'email', messageKey: 'emailRequired' },
      { field: 'phone', messageKey: 'phoneRequired' }
    ];
    
    errorSystem.showFormErrors(errors, { containerId: 'testForm' });
    expect(getFormErrorSummary()).toBeTruthy();
    
    errorSystem.clearFormErrors();
    expect(getFormErrorSummary()).toBeFalsy();
  });
  
  it('should clear all field errors', () => {
    const form = createForm();
    const email = createField('text', 'email');
    const phone = createField('text', 'phone');
    form.appendChild(email);
    form.appendChild(phone);
    
    const errors = [
      { field: 'email', messageKey: 'emailRequired' },
      { field: 'phone', messageKey: 'phoneRequired' }
    ];
    
    errorSystem.showFormErrors(errors, { containerId: 'testForm' });
    expect(hasErrorClass('email')).toBe(true);
    expect(hasErrorClass('phone')).toBe(true);
    
    errorSystem.clearFormErrors();
    expect(hasErrorClass('email')).toBe(false);
    expect(hasErrorClass('phone')).toBe(false);
  });
  
  it('should clear errors Map', () => {
    const form = createForm();
    const email = createField('text', 'email');
    form.appendChild(email);
    
    errorSystem.showFieldError('email', 'emailRequired');
    expect(errorSystem.getErrorCount()).toBe(1);
    
    errorSystem.clearFormErrors();
    expect(errorSystem.getErrorCount()).toBe(0);
  });
});

describe('ErrorSystem - showSystemError()', () => {
  it('should create system error at top', () => {
    errorSystem.showSystemError('networkErrorDetailed');
    
    const systemError = getSystemError();
    expect(systemError).toBeTruthy();
    expect(systemError.className).toBe('system-error');
  });
  
  it('should have fixed positioning', () => {
    errorSystem.showSystemError('networkErrorDetailed');
    
    const systemError = getSystemError();
    const styles = window.getComputedStyle(systemError);
    expect(styles.position).toBe('fixed');
    expect(styles.top).toBe('0px');
  });
  
  it('should be dismissible', () => {
    errorSystem.showSystemError('networkErrorDetailed');
    
    const systemError = getSystemError();
    const closeBtn = systemError.querySelector('.system-error-close');
    expect(closeBtn).toBeTruthy();
    
    closeBtn.click();
    
    return waitForAnimationFrame().then(() => {
      setTimeout(() => {
        expect(getSystemError()).toBeFalsy();
      }, 350);
    });
  });
  
  it('should auto-dismiss after 10s if not persistent', (done) => {
    jest.useFakeTimers();
    
    errorSystem.showSystemError('networkErrorDetailed', {
      persistent: false,
      autoDismiss: 10000
    });
    
    expect(getSystemError()).toBeTruthy();
    
    jest.advanceTimersByTime(10000);
    
    waitForAnimationFrame().then(() => {
      setTimeout(() => {
        expect(getSystemError()).toBeFalsy();
        jest.useRealTimers();
        done();
      }, 350);
    });
  });
  
  it('should not auto-dismiss if persistent', (done) => {
    jest.useFakeTimers();
    
    errorSystem.showSystemError('rateLimitExceeded', {
      persistent: true
    });
    
    expect(getSystemError()).toBeTruthy();
    
    jest.advanceTimersByTime(15000);
    
    setTimeout(() => {
      expect(getSystemError()).toBeTruthy();
      jest.useRealTimers();
      done();
    }, 100);
  });
  
  it('should set ARIA attributes', () => {
    errorSystem.showSystemError('networkErrorDetailed');
    
    const systemError = getSystemError();
    expect(systemError.getAttribute('role')).toBe('alert');
    expect(systemError.getAttribute('aria-live')).toBe('assertive');
  });
  
  it('should clear existing system error', () => {
    errorSystem.showSystemError('networkErrorDetailed');
    expect(getSystemError()).toBeTruthy();
    
    errorSystem.showSystemError('serverErrorDetailed');
    const errors = document.querySelectorAll('.system-error');
    expect(errors.length).toBe(1);
  });
});

describe('ErrorSystem - getMessage()', () => {
  it('should use i18n when available', () => {
    const message = errorSystem.getMessage('emailRequired');
    expect(message).toBe('Email is required');
    expect(window.i18n.t).toHaveBeenCalledWith('emailRequired', {});
  });
  
  it('should fall back to key if i18n not available', () => {
    const originalI18n = window.i18n;
    window.i18n = null;
    
    const message = errorSystem.getMessage('emailRequired');
    expect(message).toBe('emailRequired');
    
    window.i18n = originalI18n;
  });
  
  it('should handle parameters', () => {
    const message = errorSystem.getMessage('quantityExceedsMax', { max: 10 });
    expect(message).toContain('10');
    expect(window.i18n.t).toHaveBeenCalledWith('quantityExceedsMax', { max: 10 });
  });
});

describe('ErrorSystem - bindFieldValidation()', () => {
  it('should validate on blur', () => {
    const field = createField('text', 'email');
    document.body.appendChild(field);
    
    errorSystem.bindFieldValidation('email', (value) => {
      if (!value.trim()) {
        return 'emailRequired';
      }
      return true;
    }, {
      validateOnBlur: true
    });
    
    field.dispatchEvent(new Event('blur'));
    
    expect(hasErrorClass('email')).toBe(true);
  });
  
  it('should clear on input', () => {
    const field = createField('text', 'email');
    document.body.appendChild(field);
    
    // Show error first
    errorSystem.showFieldError('email', 'emailRequired');
    expect(hasErrorClass('email')).toBe(true);
    
    // Bind validation
    errorSystem.bindFieldValidation('email', (value) => {
      return true;
    }, {
      clearOnInput: true
    });
    
    // Type in field
    field.value = 'test@example.com';
    field.dispatchEvent(new Event('input'));
    
    expect(hasErrorClass('email')).toBe(false);
  });
  
  it('should show/clear errors correctly', () => {
    const field = createField('text', 'email');
    document.body.appendChild(field);
    
    errorSystem.bindFieldValidation('email', (value) => {
      if (!value.trim()) {
        return 'emailRequired';
      }
      if (!value.includes('@')) {
        return 'invalidEmail';
      }
      return true;
    });
    
    // Blur with empty value
    field.dispatchEvent(new Event('blur'));
    expect(hasErrorClass('email')).toBe(true);
    expect(getErrorMessage('email').textContent).toBe('Email is required');
    
    // Type invalid email
    field.value = 'invalid';
    field.dispatchEvent(new Event('blur'));
    expect(getErrorMessage('email').textContent).toBe('Please enter a valid email address');
    
    // Type valid email
    field.value = 'test@example.com';
    field.dispatchEvent(new Event('blur'));
    expect(hasErrorClass('email')).toBe(false);
  });
  
  it('should debounce input validation', (done) => {
    jest.useFakeTimers();
    
    const field = createField('text', 'email');
    document.body.appendChild(field);
    
    const validateFn = jest.fn((value) => {
      return value.length > 5 ? true : 'emailRequired';
    });
    
    errorSystem.bindFieldValidation('email', validateFn, {
      validateOnBlur: false,
      debounceMs: 300
    });
    
    // Type quickly
    field.value = 'a';
    field.dispatchEvent(new Event('input'));
    field.value = 'ab';
    field.dispatchEvent(new Event('input'));
    field.value = 'abc';
    field.dispatchEvent(new Event('input'));
    
    // Should not have validated yet
    expect(validateFn).not.toHaveBeenCalled();
    
    // Advance timer
    jest.advanceTimersByTime(300);
    
    // Should have validated once
    expect(validateFn).toHaveBeenCalledTimes(1);
    
    jest.useRealTimers();
    done();
  });
});

describe('ErrorSystem - Utility Methods', () => {
  it('should get all errors', () => {
    const form = createForm();
    const email = createField('text', 'email');
    const phone = createField('text', 'phone');
    form.appendChild(email);
    form.appendChild(phone);
    
    errorSystem.showFieldError('email', 'emailRequired');
    errorSystem.showFieldError('phone', 'phoneRequired');
    
    const errors = errorSystem.getErrors();
    expect(errors.length).toBe(2);
    expect(errors[0].fieldId).toBe('email');
    expect(errors[1].fieldId).toBe('phone');
  });
  
  it('should check if field has error', () => {
    const field = createField('text', 'email');
    document.body.appendChild(field);
    
    expect(errorSystem.hasError('email')).toBe(false);
    
    errorSystem.showFieldError('email', 'emailRequired');
    expect(errorSystem.hasError('email')).toBe(true);
  });
  
  it('should get error count', () => {
    const form = createForm();
    const email = createField('text', 'email');
    const phone = createField('text', 'phone');
    form.appendChild(email);
    form.appendChild(phone);
    
    expect(errorSystem.getErrorCount()).toBe(0);
    
    errorSystem.showFieldError('email', 'emailRequired');
    expect(errorSystem.getErrorCount()).toBe(1);
    
    errorSystem.showFieldError('phone', 'phoneRequired');
    expect(errorSystem.getErrorCount()).toBe(2);
  });
});
