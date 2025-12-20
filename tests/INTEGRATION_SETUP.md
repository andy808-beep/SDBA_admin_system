# Integration Setup Guide

## Importing Error System in Tests

The error system needs to be properly imported in tests. Here are the options:

### Option 1: Global Window Object (Current)

The error system is available as `window.errorSystem` after loading:

```javascript
// In setup.js or test file
beforeEach(() => {
  // Ensure error system is loaded
  if (!window.errorSystem) {
    // Load the module
    require('../../public/js/error-system.js');
  }
  errorSystem = window.errorSystem;
});
```

### Option 2: ES6 Module Import (Recommended)

If using ES6 modules:

```javascript
// In test file
import errorSystem from '../../public/js/error-system.js';

describe('ErrorSystem', () => {
  it('should work', () => {
    errorSystem.showFieldError('email', 'emailRequired');
    // ...
  });
});
```

### Option 3: Dynamic Import

For async loading:

```javascript
let errorSystem;

beforeAll(async () => {
  const module = await import('../../public/js/error-system.js');
  errorSystem = module.default;
});
```

## Updating Test Files

To use ES6 imports, update test files:

```javascript
// tests/unit/error-system.test.js
import errorSystem from '../../public/js/error-system.js';

describe('ErrorSystem', () => {
  // Remove: let errorSystem;
  // Remove: errorSystem = window.errorSystem;
  
  // Use directly:
  it('should work', () => {
    errorSystem.showFieldError('email', 'emailRequired');
  });
});
```

## Jest Configuration for ES6

Update `jest.config.js`:

```javascript
module.exports = {
  // ... existing config
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  moduleFileExtensions: ['js', 'json'],
  testEnvironment: 'jsdom'
};
```

## Babel Configuration

Ensure `.babelrc` is configured:

```json
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": {
          "node": "current"
        }
      }
    ]
  ]
}
```

## Running Tests

After setup:

```bash
# Install dependencies
npm install

# Run tests
npm test

# With coverage
npm test -- --coverage
```
