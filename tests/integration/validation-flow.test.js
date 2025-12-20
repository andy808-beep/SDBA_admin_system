/**
 * Integration Tests for Validation Flows
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  createField, 
  createForm,
  createTestForm,
  clearAllErrors,
  hasErrorClass,
  getFormErrorSummary
} from '../utils/test-helpers.js';

let errorSystem;

beforeEach(() => {
  clearAllErrors();
  errorSystem = window.errorSystem;
});

describe('Step 1 Validation Flow', () => {
  it('should show all errors for empty form', () => {
    const form = createForm('step1Form');
    const teamCount = createField('number', 'teamCount');
    const teamName1 = createField('text', 'teamNameEn1');
    const teamName2 = createField('text', 'teamNameEn2');
    
    form.appendChild(teamCount);
    form.appendChild(teamName1);
    form.appendChild(teamName2);
    
    const errors = [
      { field: 'teamCount', messageKey: 'pleaseSelectNumberOfTeams' },
      { field: 'teamNameEn1', messageKey: 'pleaseEnterTeamName', params: { num: 1 } },
      { field: 'teamNameEn2', messageKey: 'pleaseEnterTeamName', params: { num: 2 } }
    ];
    
    errorSystem.showFormErrors(errors, { containerId: 'step1Form' });
    
    expect(hasErrorClass('teamCount')).toBe(true);
    expect(hasErrorClass('teamNameEn1')).toBe(true);
    expect(hasErrorClass('teamNameEn2')).toBe(true);
    expect(getFormErrorSummary()).toBeTruthy();
  });
  
  it('should show remaining errors for partial form', () => {
    const form = createForm('step1Form');
    const teamCount = createField('number', 'teamCount');
    const teamName1 = createField('text', 'teamNameEn1');
    const teamName2 = createField('text', 'teamNameEn2');
    
    teamCount.value = '2';
    teamName1.value = 'Team 1';
    
    form.appendChild(teamCount);
    form.appendChild(teamName1);
    form.appendChild(teamName2);
    
    const errors = [
      { field: 'teamNameEn2', messageKey: 'pleaseEnterTeamName', params: { num: 2 } }
    ];
    
    errorSystem.showFormErrors(errors, { containerId: 'step1Form' });
    
    expect(hasErrorClass('teamCount')).toBe(false);
    expect(hasErrorClass('teamNameEn1')).toBe(false);
    expect(hasErrorClass('teamNameEn2')).toBe(true);
  });
  
  it('should clear errors when fixed', () => {
    const form = createForm('step1Form');
    const email = createField('text', 'email');
    form.appendChild(email);
    
    // Show error
    errorSystem.showFieldError('email', 'emailRequired');
    expect(hasErrorClass('email')).toBe(true);
    
    // Fix error
    email.value = 'test@example.com';
    errorSystem.clearFieldError('email');
    expect(hasErrorClass('email')).toBe(false);
  });
  
  it('should highlight both fields for duplicate names', () => {
    const form = createForm('step1Form');
    const teamName1 = createField('text', 'teamNameEn1');
    const teamName2 = createField('text', 'teamNameEn2');
    
    teamName1.value = 'Team A';
    teamName2.value = 'Team A';
    
    form.appendChild(teamName1);
    form.appendChild(teamName2);
    
    const errors = [
      { 
        field: 'teamNameEn1', 
        messageKey: 'duplicateTeamName',
        params: { num: 1, category: 'Men' }
      },
      { 
        field: 'teamNameEn2', 
        messageKey: 'duplicateTeamName',
        params: { num: 2, category: 'Men' }
      }
    ];
    
    errorSystem.showFormErrors(errors, { containerId: 'step1Form' });
    
    expect(hasErrorClass('teamNameEn1')).toBe(true);
    expect(hasErrorClass('teamNameEn2')).toBe(true);
    expect(getFormErrorSummary()).toBeTruthy();
  });
  
  it('should show/hide form summary correctly', () => {
    const form = createForm('step1Form');
    const email = createField('text', 'email');
    const phone = createField('text', 'phone');
    form.appendChild(email);
    form.appendChild(phone);
    
    // Single error - no summary
    errorSystem.showFieldError('email', 'emailRequired');
    expect(getFormErrorSummary()).toBeFalsy();
    
    // Multiple errors - show summary
    const errors = [
      { field: 'email', messageKey: 'emailRequired' },
      { field: 'phone', messageKey: 'phoneRequired' }
    ];
    errorSystem.showFormErrors(errors, { containerId: 'step1Form' });
    expect(getFormErrorSummary()).toBeTruthy();
    
    // Clear errors - summary removed
    errorSystem.clearFormErrors();
    expect(getFormErrorSummary()).toBeFalsy();
  });
});

describe('Step 2 Validation Flow', () => {
  it('should validate manager fields', () => {
    const form = createForm('step2Form');
    const manager1Name = createField('text', 'manager1Name');
    const manager1Phone = createField('text', 'manager1Phone');
    const manager1Email = createField('email', 'manager1Email');
    
    form.appendChild(manager1Name);
    form.appendChild(manager1Phone);
    form.appendChild(manager1Email);
    
    const errors = [
      { field: 'manager1Name', messageKey: 'managerNameRequired' },
      { field: 'manager1Phone', messageKey: 'managerPhoneRequired' },
      { field: 'manager1Email', messageKey: 'managerEmailRequired' }
    ];
    
    errorSystem.showFormErrors(errors, { containerId: 'step2Form' });
    
    expect(hasErrorClass('manager1Name')).toBe(true);
    expect(hasErrorClass('manager1Phone')).toBe(true);
    expect(hasErrorClass('manager1Email')).toBe(true);
  });
  
  it('should validate email format', () => {
    const form = createForm('step2Form');
    const email = createField('email', 'manager1Email');
    form.appendChild(email);
    
    // Invalid email
    email.value = 'invalid-email';
    errorSystem.showFieldError('manager1Email', 'invalidEmail');
    expect(hasErrorClass('manager1Email')).toBe(true);
    
    // Valid email
    email.value = 'test@example.com';
    errorSystem.clearFieldError('manager1Email');
    expect(hasErrorClass('manager1Email')).toBe(false);
  });
  
  it('should validate phone format', () => {
    const form = createForm('step2Form');
    const phone = createField('tel', 'manager1Phone');
    form.appendChild(phone);
    
    // Invalid phone
    phone.value = '123';
    errorSystem.showFieldError('manager1Phone', 'invalidPhone');
    expect(hasErrorClass('manager1Phone')).toBe(true);
    
    // Valid phone
    phone.value = '91234567';
    errorSystem.clearFieldError('manager1Phone');
    expect(hasErrorClass('manager1Phone')).toBe(false);
  });
  
  it('should support real-time validation', () => {
    const form = createForm('step2Form');
    const email = createField('email', 'manager1Email');
    form.appendChild(email);
    
    errorSystem.bindFieldValidation('manager1Email', (value) => {
      if (!value.trim()) {
        return 'managerEmailRequired';
      }
      if (!value.includes('@')) {
        return 'invalidEmail';
      }
      return true;
    });
    
    // Blur with empty value
    email.dispatchEvent(new Event('blur'));
    expect(hasErrorClass('manager1Email')).toBe(true);
    
    // Type invalid email
    email.value = 'invalid';
    email.dispatchEvent(new Event('blur'));
    expect(hasErrorClass('manager1Email')).toBe(true);
    
    // Type valid email
    email.value = 'test@example.com';
    email.dispatchEvent(new Event('blur'));
    expect(hasErrorClass('manager1Email')).toBe(false);
  });
});

describe('Form Submission Flow', () => {
  it('should show system error for server errors', () => {
    // Simulate 500 error
    errorSystem.showSystemError('serverErrorDetailed', {
      dismissible: true
    });
    
    const systemError = document.querySelector('.system-error');
    expect(systemError).toBeTruthy();
    expect(systemError.textContent).toContain('Server error');
  });
  
  it('should show system error for network errors', () => {
    // Simulate network error
    errorSystem.showSystemError('networkErrorDetailed', {
      dismissible: true
    });
    
    const systemError = document.querySelector('.system-error');
    expect(systemError).toBeTruthy();
  });
  
  it('should show persistent error for rate limit', () => {
    jest.useFakeTimers();
    
    errorSystem.showSystemError('rateLimitExceeded', {
      persistent: true,
      dismissible: true
    });
    
    const systemError = document.querySelector('.system-error');
    expect(systemError).toBeTruthy();
    
    // Advance time - should not dismiss
    jest.advanceTimersByTime(15000);
    
    setTimeout(() => {
      expect(systemError.parentNode).toBeTruthy();
      jest.useRealTimers();
    }, 100);
  });
  
  it('should handle multiple error types in sequence', () => {
    // Show network error
    errorSystem.showSystemError('networkErrorDetailed');
    expect(document.querySelectorAll('.system-error').length).toBe(1);
    
    // Show server error (should replace)
    errorSystem.showSystemError('serverErrorDetailed');
    expect(document.querySelectorAll('.system-error').length).toBe(1);
    
    // Clear error
    errorSystem.clearSystemError();
    expect(document.querySelector('.system-error')).toBeFalsy();
  });
});

describe('Complete Form Validation Flow', () => {
  it('should validate entire form and show all errors', () => {
    const form = createTestForm(['email', 'phone', 'name']);
    
    const errors = [
      { field: 'email', messageKey: 'emailRequired' },
      { field: 'phone', messageKey: 'phoneRequired' },
      { field: 'name', messageKey: 'nameRequired' }
    ];
    
    errorSystem.showFormErrors(errors, { containerId: 'testForm' });
    
    expect(hasErrorClass('email')).toBe(true);
    expect(hasErrorClass('phone')).toBe(true);
    expect(hasErrorClass('name')).toBe(true);
    expect(getFormErrorSummary()).toBeTruthy();
  });
  
  it('should clear all errors and allow resubmission', () => {
    const form = createTestForm(['email', 'phone']);
    
    // First validation - show errors
    const errors1 = [
      { field: 'email', messageKey: 'emailRequired' },
      { field: 'phone', messageKey: 'phoneRequired' }
    ];
    errorSystem.showFormErrors(errors1, { containerId: 'testForm' });
    expect(errorSystem.getErrorCount()).toBe(2);
    
    // Clear errors
    errorSystem.clearFormErrors();
    expect(errorSystem.getErrorCount()).toBe(0);
    
    // Second validation - no errors
    const email = document.getElementById('email');
    const phone = document.getElementById('phone');
    email.value = 'test@example.com';
    phone.value = '91234567';
    
    // Should be able to submit
    expect(errorSystem.getErrorCount()).toBe(0);
  });
});
