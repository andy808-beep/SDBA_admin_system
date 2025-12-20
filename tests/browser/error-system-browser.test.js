/**
 * Cross-Browser Tests for Error System
 * Tests error system functionality across different browsers
 */

const { test, expect } = require('@playwright/test');

test.describe('Error System - Cross Browser Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test page
    await page.goto('/register.html');
    
    // Wait for error system to load
    await page.waitForFunction(() => typeof window.errorSystem !== 'undefined');
  });

  test('field error displays correctly in all browsers', async ({ page, browserName }) => {
    // Show field error
    await page.evaluate(() => {
      const field = document.createElement('input');
      field.type = 'text';
      field.id = 'email';
      document.body.appendChild(field);
      
      window.errorSystem.showFieldError('email', 'emailRequired');
    });

    // Wait for error to appear
    await page.waitForSelector('#error-email', { timeout: 5000 });

    // Check error is visible
    const errorDiv = await page.locator('#error-email');
    await expect(errorDiv).toBeVisible();
    await expect(errorDiv).toHaveText('Email is required');

    // Check field has error class
    const field = await page.locator('#email');
    await expect(field).toHaveClass(/field-error/);

    // Browser-specific checks
    if (browserName === 'webkit') {
      // Safari-specific: Check ARIA attributes are set
      const ariaInvalid = await field.getAttribute('aria-invalid');
      expect(ariaInvalid).toBe('true');
      
      const describedBy = await field.getAttribute('aria-describedby');
      expect(describedBy).toContain('error-email');
    }
  });

  test('form error summary displays correctly', async ({ page }) => {
    await page.evaluate(() => {
      const form = document.createElement('form');
      form.id = 'testForm';
      document.body.appendChild(form);
      
      const email = document.createElement('input');
      email.type = 'text';
      email.id = 'email';
      form.appendChild(email);
      
      const phone = document.createElement('input');
      phone.type = 'text';
      phone.id = 'phone';
      form.appendChild(phone);
      
      const errors = [
        { field: 'email', messageKey: 'emailRequired' },
        { field: 'phone', messageKey: 'phoneRequired' }
      ];
      window.errorSystem.showFormErrors(errors, { containerId: 'testForm' });
    });

    const summary = await page.locator('.form-error-summary');
    await expect(summary).toBeVisible();

    const links = await page.locator('.error-list a');
    await expect(links).toHaveCount(2);
    
    // Check links are clickable
    await expect(links.first()).toBeVisible();
  });

  test('system error displays correctly', async ({ page }) => {
    await page.evaluate(() => {
      window.errorSystem.showSystemError('networkErrorDetailed');
    });

    const systemError = await page.locator('.system-error');
    await expect(systemError).toBeVisible();
    
    // Check positioning
    const position = await systemError.evaluate(el => 
      window.getComputedStyle(el).position
    );
    expect(position).toBe('fixed');
    
    const top = await systemError.evaluate(el => 
      window.getComputedStyle(el).top
    );
    expect(top).toBe('0px');
  });

  test('animations work correctly', async ({ page, browserName }) => {
    await page.evaluate(() => {
      window.errorSystem.showSystemError('networkErrorDetailed');
    });

    const systemError = await page.locator('.system-error');
    
    // Wait for animation to start
    await page.waitForTimeout(100);
    
    // Check opacity (should animate from 0 to 1)
    const opacity = await systemError.evaluate(el => 
      parseFloat(window.getComputedStyle(el).opacity)
    );
    
    // Should be visible (opacity > 0)
    expect(opacity).toBeGreaterThan(0);
    
    // Browser-specific: Safari may have different timing
    if (browserName === 'webkit') {
      // Give Safari more time for animation
      await page.waitForTimeout(200);
      const finalOpacity = await systemError.evaluate(el => 
        parseFloat(window.getComputedStyle(el).opacity)
      );
      expect(finalOpacity).toBeGreaterThan(0.5);
    }
  });

  test('smooth scroll works', async ({ page, browserName }) => {
    // Create long page with field at bottom
    await page.evaluate(() => {
      document.body.style.height = '5000px';
      const field = document.createElement('input');
      field.type = 'text';
      field.id = 'email';
      field.style.marginTop = '4000px';
      document.body.appendChild(field);
    });

    // Scroll to top first
    await page.evaluate(() => window.scrollTo(0, 0));

    // Show error with scroll
    await page.evaluate(() => {
      window.errorSystem.showFieldError('email', 'emailRequired', {
        scrollTo: true
      });
    });

    // Wait for scroll animation
    await page.waitForTimeout(600);

    // Check field is in viewport
    const field = await page.locator('#email');
    const isVisible = await field.isVisible();
    expect(isVisible).toBe(true);
    
    // Browser-specific: Safari may need more time
    if (browserName === 'webkit') {
      await page.waitForTimeout(200);
    }
  });

  test('ARIA attributes are set correctly', async ({ page }) => {
    await page.evaluate(() => {
      const field = document.createElement('input');
      field.type = 'text';
      field.id = 'email';
      document.body.appendChild(field);
      
      window.errorSystem.showFieldError('email', 'emailRequired');
    });

    const field = await page.locator('#email');
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    
    const describedBy = await field.getAttribute('aria-describedby');
    expect(describedBy).toContain('error-email');

    const errorDiv = await page.locator('#error-email');
    await expect(errorDiv).toHaveAttribute('role', 'alert');
    await expect(errorDiv).toHaveAttribute('aria-live', 'polite');
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.evaluate(() => {
      const form = document.createElement('form');
      form.id = 'testForm';
      document.body.appendChild(form);
      
      const email = document.createElement('input');
      email.type = 'text';
      email.id = 'email';
      form.appendChild(email);
      
      const phone = document.createElement('input');
      phone.type = 'text';
      phone.id = 'phone';
      form.appendChild(phone);
      
      const errors = [
        { field: 'email', messageKey: 'emailRequired' },
        { field: 'phone', messageKey: 'phoneRequired' }
      ];
      window.errorSystem.showFormErrors(errors, { containerId: 'testForm' });
    });

    // Tab to first error link
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Check focus is on link
    const focused = await page.evaluate(() => {
      const active = document.activeElement;
      return active.tagName.toLowerCase();
    });
    expect(focused).toBe('a');
  });

  test('close buttons work', async ({ page }) => {
    // Test form summary close
    await page.evaluate(() => {
      const form = document.createElement('form');
      form.id = 'testForm';
      document.body.appendChild(form);
      
      const email = document.createElement('input');
      email.type = 'text';
      email.id = 'email';
      form.appendChild(email);
      
      const phone = document.createElement('input');
      phone.type = 'text';
      phone.id = 'phone';
      form.appendChild(phone);
      
      const errors = [
        { field: 'email', messageKey: 'emailRequired' },
        { field: 'phone', messageKey: 'phoneRequired' }
      ];
      window.errorSystem.showFormErrors(errors, { containerId: 'testForm' });
    });

    const closeBtn = await page.locator('.error-close');
    await closeBtn.click();
    
    await page.waitForTimeout(100);
    const summary = await page.locator('.form-error-summary');
    await expect(summary).not.toBeVisible();

    // Test system error close
    await page.evaluate(() => {
      window.errorSystem.showSystemError('networkErrorDetailed');
    });

    const systemCloseBtn = await page.locator('.system-error-close');
    await systemCloseBtn.click();
    
    await page.waitForTimeout(400); // Wait for fade-out animation
    const systemError = await page.locator('.system-error');
    await expect(systemError).not.toBeVisible();
  });

  test('real-time validation works', async ({ page }) => {
    await page.evaluate(() => {
      const field = document.createElement('input');
      field.type = 'text';
      field.id = 'email';
      document.body.appendChild(field);
      
      window.errorSystem.bindFieldValidation('email', (value) => {
        if (!value.trim()) {
          return 'emailRequired';
        }
        if (!value.includes('@')) {
          return 'invalidEmail';
        }
        return true;
      });
    });

    const field = await page.locator('#email');
    
    // Blur with empty value - should show error
    await field.focus();
    await field.blur();
    await page.waitForTimeout(100);
    
    const errorDiv = await page.locator('#error-email');
    await expect(errorDiv).toBeVisible();
    await expect(errorDiv).toHaveText('Email is required');
    
    // Type invalid email
    await field.fill('invalid');
    await field.blur();
    await page.waitForTimeout(100);
    
    await expect(errorDiv).toHaveText(/valid email/i);
    
    // Type valid email
    await field.fill('test@example.com');
    await field.blur();
    await page.waitForTimeout(100);
    
    // Error should be cleared
    await expect(errorDiv).not.toBeVisible();
  });

  test('CSS feature detection works', async ({ page }) => {
    const features = await page.evaluate(() => {
      return {
        grid: window.CSSFeatureDetection ? window.CSSFeatureDetection.supportsGrid() : false,
        flexbox: window.CSSFeatureDetection ? window.CSSFeatureDetection.supportsFlexbox() : false,
        cssVariables: window.CSSFeatureDetection ? window.CSSFeatureDetection.supportsCSSVariables() : false,
        animations: window.CSSFeatureDetection ? window.CSSFeatureDetection.supportsAnimations() : false
      };
    });

    // All modern browsers should support these
    expect(features.grid).toBe(true);
    expect(features.flexbox).toBe(true);
    expect(features.cssVariables).toBe(true);
    expect(features.animations).toBe(true);
  });

  test('error system works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.evaluate(() => {
      const field = document.createElement('input');
      field.type = 'text';
      field.id = 'email';
      document.body.appendChild(field);
      
      window.errorSystem.showFieldError('email', 'emailRequired');
    });

    const errorDiv = await page.locator('#error-email');
    await expect(errorDiv).toBeVisible();
    
    // Check error is readable on mobile
    const fontSize = await errorDiv.evaluate(el => 
      parseFloat(window.getComputedStyle(el).fontSize)
    );
    expect(fontSize).toBeGreaterThan(10); // Should be readable
  });
});
