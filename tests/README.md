# Error System Test Suite

## Overview

Comprehensive test suite for the Unified Error System using Jest and Testing Library.

## Test Structure

```
tests/
├── setup.js                 # Jest setup and mocks
├── utils/
│   └── test-helpers.js      # Test utility functions
├── unit/
│   └── error-system.test.js # Unit tests for ErrorSystem class
├── integration/
│   └── validation-flow.test.js # Integration tests
├── a11y/
│   └── accessibility.test.js   # Accessibility tests
└── performance/
    └── performance.test.js     # Performance benchmarks
```

## Running Tests

### Install Dependencies

```bash
npm install --save-dev jest @testing-library/jest-dom @testing-library/dom jest-axe babel-jest @babel/preset-env
```

### Run All Tests

```bash
npm test
```

### Run Specific Test Suite

```bash
# Unit tests only
npm test -- error-system.test.js

# Integration tests only
npm test -- validation-flow.test.js

# Accessibility tests only
npm test -- accessibility.test.js

# Performance tests only
npm test -- performance.test.js
```

### Run with Coverage

```bash
npm test -- --coverage
```

### Watch Mode

```bash
npm test -- --watch
```

### Verbose Output

```bash
npm test -- --verbose
```

## Test Categories

### 1. Unit Tests (`unit/error-system.test.js`)

Tests individual methods of the ErrorSystem class:

- `showFieldError()` - Field error display
- `clearFieldError()` - Error cleanup
- `showFormErrors()` - Form error summary
- `clearFormErrors()` - Clear all errors
- `showSystemError()` - System error notifications
- `getMessage()` - i18n message handling
- `bindFieldValidation()` - Real-time validation
- Utility methods

### 2. Integration Tests (`integration/validation-flow.test.js`)

Tests complete validation flows:

- Step 1 validation (team information)
- Step 2 validation (manager fields)
- Form submission error handling
- Complete form validation flow

### 3. Accessibility Tests (`a11y/accessibility.test.js`)

Tests accessibility features:

- ARIA attributes
- Keyboard navigation
- Screen reader announcements
- WCAG compliance
- Semantic HTML

### 4. Performance Tests (`performance/performance.test.js`)

Performance benchmarks:

- Error display speed
- Memory management
- DOM caching
- Animation performance
- Debouncing efficiency

## Test Configuration

### Jest Config (`jest.config.js`)

- Test environment: `jsdom`
- Coverage threshold: 80%
- Setup file: `tests/setup.js`
- Test timeout: 10 seconds

### Setup File (`tests/setup.js`)

- Mocks `window.i18n`
- Mocks `requestAnimationFrame`
- Mocks `scrollIntoView`
- Resets DOM before each test

## Test Utilities

### Helper Functions (`utils/test-helpers.js`)

- `createField()` - Create form field
- `createForm()` - Create form container
- `createContainer()` - Create container element
- `waitForAnimationFrame()` - Wait for RAF
- `waitFor()` - Wait for condition
- `getErrorMessage()` - Get error message element
- `hasErrorClass()` - Check if field has error
- `getFormErrorSummary()` - Get form summary
- `getSystemError()` - Get system error
- `clearAllErrors()` - Clear all errors
- `mockI18n()` - Mock i18n system

## Expected Coverage

Target coverage: **80%+**

```
File                    | % Stmts | % Branch | % Funcs | % Lines
------------------------|---------|----------|---------|--------
error-system.js         |   85    |    80    |   85    |   85
```

## Writing New Tests

### Example Test

```javascript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { createField, createForm } from '../utils/test-helpers.js';

describe('My Feature', () => {
  let errorSystem;
  
  beforeEach(() => {
    errorSystem = window.errorSystem;
  });
  
  it('should do something', () => {
    const field = createField('text', 'email');
    document.body.appendChild(field);
    
    errorSystem.showFieldError('email', 'emailRequired');
    
    expect(field.classList.contains('field-error')).toBe(true);
  });
});
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v2
```

## Troubleshooting

### Tests Failing

1. **Check setup.js** - Ensure mocks are correct
2. **Check DOM** - Verify elements exist before testing
3. **Check async** - Use proper async/await or promises
4. **Check timers** - Use `jest.useFakeTimers()` for timer tests

### Coverage Low

1. **Add edge case tests**
2. **Test error paths**
3. **Test all branches**
4. **Test utility methods**

### Performance Tests Failing

1. **Adjust thresholds** - Performance varies by machine
2. **Use relative comparisons** - Compare before/after
3. **Run multiple times** - Average results

## Best Practices

1. **Isolate tests** - Each test should be independent
2. **Clean up** - Clear DOM and errors between tests
3. **Use helpers** - Reuse test utility functions
4. **Mock external** - Mock i18n, timers, etc.
5. **Test behavior** - Test what users see, not implementation
6. **Keep fast** - Tests should run quickly
7. **Be descriptive** - Use clear test names

## See Also

- [Jest Documentation](https://jestjs.io/)
- [Testing Library Documentation](https://testing-library.com/)
- [Error System API Documentation](../ERROR_SYSTEM_API.md)
