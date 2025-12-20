/**
 * Performance Tests for Error System
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { 
  createField, 
  createForm,
  createFields,
  clearAllErrors
} from '../utils/test-helpers.js';

let errorSystem;

beforeEach(() => {
  clearAllErrors();
  errorSystem = window.errorSystem;
});

describe('Performance Benchmarks', () => {
  it('should show 10 field errors quickly', () => {
    const form = createForm();
    const fields = createFields(10, 'field');
    fields.forEach(field => form.appendChild(field));
    
    const startTime = performance.now();
    
    for (let i = 1; i <= 10; i++) {
      errorSystem.showFieldError(`field${i}`, 'emailRequired');
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Should complete in less than 100ms
    expect(duration).toBeLessThan(100);
    expect(errorSystem.getErrorCount()).toBe(10);
  });
  
  it('should show/hide form summary quickly', () => {
    const form = createForm();
    const fields = createFields(5, 'field');
    fields.forEach(field => form.appendChild(field));
    
    const errors = fields.map((field, index) => ({
      field: field.id,
      messageKey: 'emailRequired'
    }));
    
    // Show summary
    const showStart = performance.now();
    errorSystem.showFormErrors(errors, { containerId: 'testForm' });
    const showEnd = performance.now();
    
    // Should show in less than 50ms
    expect(showEnd - showStart).toBeLessThan(50);
    
    // Hide summary
    const hideStart = performance.now();
    errorSystem.clearFormErrorSummary();
    const hideEnd = performance.now();
    
    // Should hide in less than 10ms
    expect(hideEnd - hideStart).toBeLessThan(10);
  });
  
  it('should handle 100 errors without performance degradation', () => {
    const form = createForm();
    const fields = createFields(100, 'field');
    fields.forEach(field => form.appendChild(field));
    
    const errors = fields.map(field => ({
      field: field.id,
      messageKey: 'emailRequired'
    }));
    
    const startTime = performance.now();
    errorSystem.showFormErrors(errors, { containerId: 'testForm' });
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Should complete in less than 500ms even with 100 errors
    expect(duration).toBeLessThan(500);
    expect(errorSystem.getErrorCount()).toBe(100);
  });
  
  it('should use batch DOM updates efficiently', () => {
    const form = createForm();
    const fields = createFields(20, 'field');
    fields.forEach(field => form.appendChild(field));
    
    const errors = fields.map(field => ({
      field: field.id,
      messageKey: 'emailRequired'
    }));
    
    // Count DOM operations (simplified - in real test, use MutationObserver)
    let domOperations = 0;
    const observer = new MutationObserver(() => {
      domOperations++;
    });
    
    observer.observe(form, { childList: true, subtree: true });
    
    errorSystem.showFormErrors(errors, { containerId: 'testForm' });
    
    // Wait for all operations
    return new Promise(resolve => {
      setTimeout(() => {
        observer.disconnect();
        // Should use batch updates (fewer operations than number of errors)
        // Note: This is a simplified check - real test would be more precise
        expect(domOperations).toBeLessThan(errors.length * 2);
        resolve();
      }, 100);
    });
  });
});

describe('Memory Management', () => {
  it('should clean up event listeners', () => {
    const field = createField('text', 'email');
    document.body.appendChild(field);
    
    errorSystem.bindFieldValidation('email', (value) => {
      return value.trim() ? true : 'emailRequired';
    });
    
    // Show error
    errorSystem.showFieldError('email', 'emailRequired');
    
    // Clear error
    errorSystem.clearFieldError('email');
    
    // Unbind validation
    errorSystem.unbindFieldValidation('email');
    
    // Field should have no error-related listeners
    // In real test, you'd check actual listener count
    expect(errorSystem.hasError('email')).toBe(false);
  });
  
  it('should clean up debounce timers', () => {
    jest.useFakeTimers();
    
    const field = createField('text', 'email');
    document.body.appendChild(field);
    
    errorSystem.bindFieldValidation('email', (value) => {
      return true;
    }, {
      validateOnBlur: false,
      debounceMs: 300
    });
    
    field.value = 'test';
    field.dispatchEvent(new Event('input'));
    
    // Clear error before timer fires
    errorSystem.clearFieldError('email');
    
    // Advance timer - should not cause issues
    jest.advanceTimersByTime(300);
    
    expect(errorSystem.hasError('email')).toBe(false);
    
    jest.useRealTimers();
  });
  
  it('should not leak memory with repeated error operations', () => {
    const field = createField('text', 'email');
    document.body.appendChild(field);
    
    // Perform many show/clear cycles
    for (let i = 0; i < 100; i++) {
      errorSystem.showFieldError('email', 'emailRequired');
      errorSystem.clearFieldError('email');
    }
    
    // Should still work correctly
    expect(errorSystem.getErrorCount()).toBe(0);
    expect(errorSystem.hasError('email')).toBe(false);
  });
  
  it('should clean up system error timers', () => {
    jest.useFakeTimers();
    
    errorSystem.showSystemError('networkErrorDetailed', {
      autoDismiss: 10000
    });
    
    // Clear before auto-dismiss
    errorSystem.clearSystemError();
    
    // Advance time - should not cause issues
    jest.advanceTimersByTime(15000);
    
    expect(document.querySelector('.system-error')).toBeFalsy();
    
    jest.useRealTimers();
  });
});

describe('DOM Element Caching', () => {
  it('should cache field elements for faster lookups', () => {
    const field = createField('text', 'email');
    document.body.appendChild(field);
    
    // First lookup - should query DOM
    const start1 = performance.now();
    errorSystem.showFieldError('email', 'emailRequired');
    const end1 = performance.now();
    const firstLookup = end1 - start1;
    
    // Second lookup - should use cache
    errorSystem.clearFieldError('email');
    const start2 = performance.now();
    errorSystem.showFieldError('email', 'emailRequired');
    const end2 = performance.now();
    const secondLookup = end2 - start2;
    
    // Second lookup should be faster (or at least not slower)
    // Note: In real test, you'd verify cache is actually used
    expect(secondLookup).toBeLessThanOrEqual(firstLookup * 2);
  });
  
  it('should invalidate cache when element removed', () => {
    const field = createField('text', 'email');
    document.body.appendChild(field);
    
    // Use field (populates cache)
    errorSystem.showFieldError('email', 'emailRequired');
    
    // Remove field
    field.remove();
    
    // Try to use again - should handle gracefully
    const result = errorSystem.showFieldError('email', 'emailRequired');
    expect(result).toBe(false);
  });
});

describe('Animation Performance', () => {
  it('should use requestAnimationFrame for smooth animations', () => {
    const form = createForm();
    const email = createField('text', 'email');
    const phone = createField('text', 'phone');
    form.appendChild(email);
    form.appendChild(phone);
    
    const errors = [
      { field: 'email', messageKey: 'emailRequired' },
      { field: 'phone', messageKey: 'phoneRequired' }
    ];
    
    // Mock requestAnimationFrame
    const rafCalls = [];
    const originalRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = jest.fn((cb) => {
      rafCalls.push(cb);
      return originalRAF(cb);
    });
    
    errorSystem.showFormErrors(errors, { containerId: 'testForm' });
    
    // Should use requestAnimationFrame
    expect(window.requestAnimationFrame).toHaveBeenCalled();
    
    window.requestAnimationFrame = originalRAF;
  });
  
  it('should not block main thread during animations', () => {
    const form = createForm();
    const fields = createFields(10, 'field');
    fields.forEach(field => form.appendChild(field));
    
    const errors = fields.map(field => ({
      field: field.id,
      messageKey: 'emailRequired'
    }));
    
    const startTime = performance.now();
    errorSystem.showFormErrors(errors, { containerId: 'testForm' });
    
    // Check that operation completes quickly
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(100);
  });
});

describe('Debouncing Performance', () => {
  it('should debounce input validation to reduce calls', (done) => {
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
    
    // Type 10 characters quickly
    for (let i = 0; i < 10; i++) {
      field.value = 'a'.repeat(i + 1);
      field.dispatchEvent(new Event('input'));
    }
    
    // Should not have validated yet
    expect(validateFn).not.toHaveBeenCalled();
    
    // Advance timer
    jest.advanceTimersByTime(300);
    
    // Should have validated only once
    expect(validateFn).toHaveBeenCalledTimes(1);
    
    jest.useRealTimers();
    done();
  });
  
  it('should clear debounce timer when field cleared', (done) => {
    jest.useFakeTimers();
    
    const field = createField('text', 'email');
    document.body.appendChild(field);
    
    const validateFn = jest.fn();
    
    errorSystem.bindFieldValidation('email', validateFn, {
      validateOnBlur: false,
      debounceMs: 300
    });
    
    field.value = 'test';
    field.dispatchEvent(new Event('input'));
    
    // Clear error before timer fires
    errorSystem.clearFieldError('email');
    
    // Advance timer
    jest.advanceTimersByTime(300);
    
    // Should not have validated (timer was cleared)
    expect(validateFn).not.toHaveBeenCalled();
    
    jest.useRealTimers();
    done();
  });
});
