/**
 * Environment Verification Helper
 * 
 * Warns if __DEV__ flag is incorrectly set on production hostnames.
 * This helps catch configuration issues before they expose debug helpers.
 * 
 * Usage: Import this in register.html AFTER env.js loads
 */

(function() {
  'use strict';
  
  const hostname = location.hostname;
  const isDev = window.__DEV__;
  
  // Production hostname patterns (customize for your domains)
  const productionPatterns = [
    /\.vercel\.app$/,
    /\.netlify\.app$/,
    /yourdomain\.com$/,  // Replace with your actual domain
    /sdba.*\.com$/       // Add your production domains
  ];
  
  // Check if current hostname matches production patterns
  const isProductionHostname = productionPatterns.some(pattern => 
    pattern.test(hostname)
  );
  
  // Known safe development hostnames
  const isDevelopmentHostname = 
    hostname === 'localhost' || 
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.0.') ||
    hostname.endsWith('.local');
  
  // ⚠️ Critical Warning: __DEV__ is true on production hostname
  if (isDev && isProductionHostname) {
    console.error(
      '🚨 CRITICAL: __DEV__ flag is TRUE on production hostname!',
      '\n→ Hostname:', hostname,
      '\n→ This will expose debug helpers to users.',
      '\n→ Check public/env.js configuration.'
    );
    
    // Show prominent warning banner
    showProductionWarningBanner();
  }
  
  // ℹ️ Info: Debug helpers exposed on development hostname (expected)
  if (isDev && isDevelopmentHostname) {
    console.log(
      '🛠️ Dev Mode: Debug helpers available',
      '\n→ window.__DBG, window.__DBG_TN, window.__DBG_WUSC',
      '\n→ See docs/DEBUG_FUNCTIONS.md for reference'
    );
  }
  
  // ✅ Production mode confirmed
  if (!isDev && isProductionHostname) {
    console.log(
      '✅ Production Mode: Debug helpers disabled',
      '\n→ __DEV__ = false',
      '\n→ No debug objects exposed'
    );
  }
  
  // ⚠️ Unexpected: __DEV__ is false on development hostname
  if (!isDev && isDevelopmentHostname) {
    console.warn(
      '⚠️ Warning: __DEV__ is FALSE on development hostname',
      '\n→ Hostname:', hostname,
      '\n→ Debug helpers will not be available.',
      '\n→ Check public/env.js if this is unexpected.'
    );
  }
  
  /**
   * Show prominent warning banner if __DEV__ misconfigured
   */
  function showProductionWarningBanner() {
    // Only show in development (don't add UI noise in production)
    if (!window.__DEV__) return;
    
    const banner = document.createElement('div');
    banner.id = 'dev-mode-warning';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ff4444;
      color: white;
      padding: 16px;
      text-align: center;
      font-weight: bold;
      z-index: 999999;
      font-family: monospace;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    
    banner.innerHTML = `
      ⚠️ CRITICAL: Development mode active on production hostname!<br>
      <small style="font-weight: normal; font-size: 12px;">
        Debug helpers are exposed. Check env.js configuration immediately.
      </small>
    `;
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255,255,255,0.2);
      border: 1px solid white;
      color: white;
      font-size: 24px;
      line-height: 1;
      width: 32px;
      height: 32px;
      border-radius: 4px;
      cursor: pointer;
    `;
    closeBtn.onclick = () => banner.remove();
    
    banner.appendChild(closeBtn);
    
    // Insert as first child of body
    if (document.body) {
      document.body.insertBefore(banner, document.body.firstChild);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.insertBefore(banner, document.body.firstChild);
      });
    }
  }
  
  /**
   * Export verification data for console inspection
   */
  window.__ENV_VERIFICATION = {
    hostname: hostname,
    isDev: isDev,
    isProductionHostname: isProductionHostname,
    isDevelopmentHostname: isDevelopmentHostname,
    debugObjectsExposed: {
      __DBG: typeof window.__DBG !== 'undefined',
      __DBG_TN: typeof window.__DBG_TN !== 'undefined',
      __DBG_WUSC: typeof window.__DBG_WUSC !== 'undefined',
      fillWUSCAll: typeof window.fillWUSCAll !== 'undefined'
    },
    configuredCorrectly: (isDev && isDevelopmentHostname) || (!isDev && isProductionHostname)
  };
  
  // Log verification data
  if (window.__DEV__) {
    console.log('Environment Verification:', window.__ENV_VERIFICATION);
  }
  
})();

