/**
 * Universal Field Restoration Utility
 * Works for TN, WU, and SC wizards
 * 
 * Usage:
 *   FieldRestoreUtility.restoreField('orgName', 'orgName', { prefix: 'wu_', debug: true });
 *   FieldRestoreUtility.restoreRadio('boatType1', 'team1_boatType', { prefix: 'wu_', debug: true });
 *   FieldRestoreUtility.debugStorage('wu_');
 */
const FieldRestoreUtility = {
  
  /**
   * Restore a text input, textarea, or select
   * 
   * @param {string} fieldId - The ID of the field to restore
   * @param {string} storageKey - The sessionStorage key (without prefix)
   * @param {Object} options - Configuration options
   * @param {string} options.prefix - Prefix for sessionStorage key (e.g., 'tn_', 'wu_', 'sc_')
   * @param {boolean} options.debug - Enable debug logging
   * @returns {boolean} - True if field was restored, false otherwise
   */
  restoreField(fieldId, storageKey, options = {}) {
    const { prefix = '', debug = false } = options;
    const fullKey = prefix + storageKey;
    const value = sessionStorage.getItem(fullKey);
    
    if (debug) console.log(`[Restore] Attempting: ${fieldId} <- ${fullKey}`);
    
    if (value === null || value === undefined) {
      if (debug) console.log(`  ⊘ No saved value`);
      return false;
    }
    
    const field = document.getElementById(fieldId);
    if (!field) {
      if (debug) console.warn(`  ⚠️  Field not found in DOM`);
      return false;
    }
    
    field.value = value;
    if (debug) console.log(`  ✓ Restored: "${value}"`);
    return true;
  },
  
  /**
   * Restore a radio button group
   * 
   * @param {string} name - The name attribute of the radio group
   * @param {string} storageKey - The sessionStorage key (without prefix)
   * @param {Object} options - Configuration options
   * @param {string} options.prefix - Prefix for sessionStorage key
   * @param {boolean} options.debug - Enable debug logging
   * @returns {boolean} - True if radio was restored, false otherwise
   */
  restoreRadio(name, storageKey, options = {}) {
    const { prefix = '', debug = false } = options;
    const fullKey = prefix + storageKey;
    const value = sessionStorage.getItem(fullKey);
    
    if (debug) console.log(`[Restore] Radio "${name}" <- ${fullKey}`);
    
    if (!value) {
      if (debug) console.log(`  ⊘ No saved value`);
      return false;
    }
    
    const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (!radio) {
      if (debug) console.warn(`  ⚠️  Radio not found: [name="${name}"][value="${value}"]`);
      return false;
    }
    
    radio.checked = true;
    if (debug) console.log(`  ✓ Checked: ${value}`);
    return true;
  },
  
  /**
   * Restore with cascade (for dependent fields)
   * Example: Category select → triggers → Options display
   * 
   * @param {string} fieldId - The ID of the field to restore
   * @param {string} storageKey - The sessionStorage key (without prefix)
   * @param {Object} options - Configuration options
   * @param {string} options.prefix - Prefix for sessionStorage key
   * @param {boolean} options.debug - Enable debug logging
   * @param {boolean} options.triggerChange - Whether to trigger a change event after restoration
   * @param {number} options.waitForDependent - Milliseconds to wait before triggering change (for dependent fields)
   * @returns {boolean} - True if field was restored, false otherwise
   */
  restoreWithCascade(fieldId, storageKey, options = {}) {
    const { prefix = '', debug = false, triggerChange = true, waitForDependent = 0 } = options;
    
    const restored = this.restoreField(fieldId, storageKey, { prefix, debug });
    
    if (restored && triggerChange) {
      const field = document.getElementById(fieldId);
      if (field) {
        if (waitForDependent > 0) {
          if (debug) console.log(`  ⏳ Waiting ${waitForDependent}ms before triggering change`);
          setTimeout(() => {
            if (debug) console.log(`  🔄 Triggering change event`);
            field.dispatchEvent(new Event('change', { bubbles: true }));
          }, waitForDependent);
        } else {
          if (debug) console.log(`  🔄 Triggering change event`);
          field.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }
    
    return restored;
  },
  
  /**
   * Restore multiple fields at once
   * 
   * @param {Array} fields - Array of { fieldId, storageKey, type?, options? } objects
   * @param {Object} globalOptions - Global options applied to all fields
   * @returns {Object} - Results object with success count and details
   */
  restoreMultiple(fields, globalOptions = {}) {
    const results = {
      success: 0,
      failed: 0,
      details: []
    };
    
    fields.forEach(({ fieldId, storageKey, type = 'field', options = {} }) => {
      const mergedOptions = { ...globalOptions, ...options };
      let restored = false;
      
      if (type === 'radio') {
        restored = this.restoreRadio(fieldId, storageKey, mergedOptions);
      } else {
        restored = this.restoreField(fieldId, storageKey, mergedOptions);
      }
      
      if (restored) {
        results.success++;
      } else {
        results.failed++;
      }
      
      results.details.push({
        fieldId,
        storageKey,
        type,
        restored
      });
    });
    
    if (globalOptions.debug) {
      console.log(`[Restore] Batch: ${results.success} succeeded, ${results.failed} failed`);
    }
    
    return results;
  },
  
  /**
   * Debug: Show all sessionStorage with prefix
   * 
   * @param {string} prefix - Prefix to filter keys (e.g., 'tn_', 'wu_', 'sc_')
   */
  debugStorage(prefix) {
    console.log(`\n📦 SessionStorage [${prefix}*]:`);
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key.startsWith(prefix)) {
        keys.push({ key, value: sessionStorage.getItem(key) });
      }
    }
    keys.sort((a, b) => a.key.localeCompare(b.key));
    keys.forEach(({ key, value }) => {
      console.log(`  ${key}: "${value}"`);
    });
    console.log(`  Total: ${keys.length} keys\n`);
  },
  
  /**
   * Debug: Show all form fields in a container
   * 
   * @param {string} containerId - ID of the container to search (default: 'wizardMount')
   */
  debugDOM(containerId = 'wizardMount') {
    console.log(`\n🔍 DOM Fields in #${containerId}:`);
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`  ⚠️  Container not found`);
      return;
    }
    
    const fields = container.querySelectorAll('input, select, textarea');
    console.log(`  Found ${fields.length} fields:`);
    fields.forEach(field => {
      const info = [];
      if (field.id) info.push(`id="${field.id}"`);
      if (field.name) info.push(`name="${field.name}"`);
      if (field.type) info.push(`type="${field.type}"`);
      if (field.value) info.push(`value="${field.value}"`);
      console.log(`  - ${field.tagName} [${info.join(', ')}]`);
    });
    console.log('');
  }
};

// Make utility available globally
window.FieldRestoreUtility = FieldRestoreUtility;
