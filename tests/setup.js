/**
 * Jest Setup File
 * Runs before each test file
 */

import '@testing-library/jest-dom';

// Mock window.i18n
global.window.i18n = {
  t: jest.fn((key, params = {}) => {
    // Simple mock translation
    const translations = {
      'emailRequired': 'Email is required',
      'invalidEmail': 'Please enter a valid email address',
      'phoneRequired': 'Phone number is required',
      'invalidPhone': 'Please enter a valid phone number',
      'nameRequired': 'Name is required',
      'formErrorsTitle': 'Please correct the following errors:',
      'systemErrorTitle': 'System Error',
      'closeError': 'Close error',
      'closeErrorSummary': 'Close error summary',
      'quantityExceedsMax': 'Quantity cannot exceed {max}',
      'duplicateTeamName': 'Team {num} has a duplicate name in category {category}'
    };
    
    let message = translations[key] || key;
    
    // Replace parameters
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(param => {
        message = message.replace(`{${param}}`, params[param]);
      });
    }
    
    return message;
  })
};

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  return setTimeout(cb, 0);
});

global.cancelAnimationFrame = jest.fn((id) => {
  clearTimeout(id);
});

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn()
};

// Reset DOM before each test
beforeEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  
  // Reset mocks
  jest.clearAllMocks();
  global.window.i18n.t.mockClear();
  Element.prototype.scrollIntoView.mockClear();
});
