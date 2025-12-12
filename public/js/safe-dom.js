/**
 * Safe DOM Manipulation Utilities
 * 
 * Provides XSS-safe alternatives to direct innerHTML manipulation.
 * All user input and dynamic data should use these utilities instead of
 * directly setting innerHTML to prevent cross-site scripting (XSS) attacks.
 * 
 * @module safe-dom
 */

/**
 * SafeDOM namespace for XSS-safe DOM manipulation utilities
 */
const SafeDOM = {
  /**
   * Safely set text content on an element.
   * Uses textContent which automatically escapes HTML entities, preventing XSS.
   * 
   * @param {HTMLElement} element - The DOM element to update
   * @param {string} text - The text content to set (will be escaped automatically)
   * @example
   * // Safe: user input is automatically escaped
   * SafeDOM.setText(element, userInput);
   * 
   * // Instead of: element.innerHTML = userInput; // XSS VULNERABLE
   */
  setText(element, text) {
    if (!element) return;
    element.textContent = text ?? '';
  },

  /**
   * Safely set HTML content on an element with basic sanitization.
   * 
   * WARNING: Only use this when HTML rendering is absolutely necessary.
   * Prefer setText() for plain text content.
   * 
   * This function performs basic HTML entity escaping for user-controlled content.
   * For production use, consider integrating a proper HTML sanitization library
   * like DOMPurify for more robust protection.
   * 
   * @param {HTMLElement} element - The DOM element to update
   * @param {string} html - The HTML content to set
   * @param {Object} options - Optional configuration
   * @param {boolean} options.sanitize - If true, escapes HTML entities in the content (default: true)
   * @example
   * // For trusted static HTML only:
   * SafeDOM.setHTML(element, '<div>Static content</div>', { sanitize: false });
   * 
   * // For user input or dynamic data (escapes HTML):
   * SafeDOM.setHTML(element, userInput, { sanitize: true });
   */
  setHTML(element, html, options = {}) {
    if (!element) return;
    
    const { sanitize = true } = options;
    
    if (sanitize && html) {
      // Basic HTML entity escaping for XSS prevention
      // Escapes: & < > " '
      const escaped = String(html)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      
      // If content was escaped, it's now plain text - use textContent instead
      element.textContent = escaped;
    } else {
      // Only use innerHTML for trusted static content
      element.innerHTML = html ?? '';
    }
  },

  /**
   * Escape HTML entities in a string.
   * Useful when building HTML strings that contain user input.
   * 
   * @param {string} text - The text to escape
   * @returns {string} The escaped text
   * @example
   * const safeName = SafeDOM.escapeHtml(userInput);
   * element.innerHTML = `<div>${safeName}</div>`;
   */
  escapeHtml(text) {
    if (text == null) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SafeDOM;
}

// Make available globally
window.SafeDOM = SafeDOM;

