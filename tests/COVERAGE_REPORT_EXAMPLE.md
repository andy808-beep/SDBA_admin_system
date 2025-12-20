# Coverage Report Example

## Expected Coverage Report Format

After running `npm test -- --coverage`, you should see output similar to:

```
 PASS  tests/unit/error-system.test.js
 PASS  tests/integration/validation-flow.test.js
 PASS  tests/a11y/accessibility.test.js
 PASS  tests/performance/performance.test.js

----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------|---------|----------|---------|---------|-------------------
All files |   85.2  |   82.5   |   87.5  |   85.2  |
error-system.js | 85.2 | 82.5 | 87.5 | 85.2 | 145, 267, 342
----------|---------|----------|---------|---------|-------------------

Test Suites: 4 passed, 4 total
Tests:       127 passed, 127 total
Snapshots:   0 total
Time:        3.245 s
```

## Coverage Breakdown by Method

### showFieldError()
- **Statements:** 90%
- **Branches:** 85%
- **Functions:** 100%
- **Lines:** 90%

### clearFieldError()
- **Statements:** 95%
- **Branches:** 90%
- **Functions:** 100%
- **Lines:** 95%

### showFormErrors()
- **Statements:** 88%
- **Branches:** 85%
- **Functions:** 100%
- **Lines:** 88%

### clearFormErrors()
- **Statements:** 100%
- **Branches:** 100%
- **Functions:** 100%
- **Lines:** 100%

### showSystemError()
- **Statements:** 85%
- **Branches:** 80%
- **Functions:** 100%
- **Lines:** 85%

### bindFieldValidation()
- **Statements:** 82%
- **Branches:** 75%
- **Functions:** 100%
- **Lines:** 82%

## Coverage Goals

- **Overall:** 80%+
- **Critical Methods:** 85%+
- **Edge Cases:** 70%+

## Improving Coverage

### Low Coverage Areas

1. **Error handling paths** - Add tests for error conditions
2. **Edge cases** - Test boundary conditions
3. **Fallback behavior** - Test when i18n not available
4. **Animation paths** - Test RAF callbacks

### Example: Adding Test for Edge Case

```javascript
it('should handle missing i18n gracefully', () => {
  const originalI18n = window.i18n;
  window.i18n = null;
  
  const field = createField('text', 'email');
  document.body.appendChild(field);
  
  errorSystem.showFieldError('email', 'emailRequired');
  
  const errorDiv = document.getElementById('error-email');
  expect(errorDiv.textContent).toBe('emailRequired'); // Falls back to key
  
  window.i18n = originalI18n;
});
```

## HTML Coverage Report

After running coverage, open `coverage/lcov-report/index.html` in a browser to see:

- Line-by-line coverage
- Uncovered lines highlighted
- Branch coverage details
- Function coverage details

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run tests with coverage
  run: npm test -- --coverage

- name: Upload coverage
  uses: codecov/codecov-action@v2
  with:
    file: ./coverage/lcov.info
    flags: unittests
    name: codecov-umbrella
```

### Coverage Badge

Add to README:

```markdown
[![Coverage](https://codecov.io/gh/your-repo/error-system/branch/main/graph/badge.svg)](https://codecov.io/gh/your-repo/error-system)
```
