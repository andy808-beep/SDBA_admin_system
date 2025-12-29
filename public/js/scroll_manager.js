// SDBA Scroll Manager - Simple Version
console.log('🔄 scroll_manager.js loading...');

window.ScrollManager = {
  scrollToTop: function() {
    console.log('📜 ScrollManager.scrollToTop() called');
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      console.log('✅ Scrolled to top (smooth)');
    } catch (e) {
      window.scrollTo(0, 0);
      console.log('✅ Scrolled to top (fallback)');
    }
  },
  
  init: function() {
    console.log('🚀 ScrollManager.init() called');
    
    // Scroll to top on page load
    this.scrollToTop();
    
    // Listen for custom events
    window.addEventListener('step-change', () => {
      console.log('📍 Received step-change event');
      setTimeout(() => this.scrollToTop(), 50);
    });
    
    // Hook buttons after short delay
    setTimeout(() => {
      this.hookButtons();
    }, 1000);
    
    console.log('✅ ScrollManager initialized successfully');
  },
  
  hookButtons: function() {
    console.log('🔗 Event delegation with TN-specific selectors');
    
    if (this._delegatedListener) {
      document.removeEventListener('click', this._delegatedListener, true);
    }
    
    this._delegatedListener = (event) => {
      // Match specific TN button patterns
      const target = event.target.closest(
        // TN wizard specific IDs
        '[id^="nextToStep"],' +      // ✅ Matches: nextToStep2, nextToStep3, nextToStep4
        '[id^="backToStep"],' +      // ✅ Matches: backToStep1, backToStep2, backToStep3
        '[id^="backToRace"],' +      // ✅ Matches: backToRaceInfo
        // Generic patterns (for other steps)
        '#nextBtn,' +
        '#prevBtn,' +
        '#backBtn,' +
        '[id*="next"],' +
        '[id*="prev"],' +
        '[id*="back"],' +
        '[class*="next"],' +
        '[class*="prev"],' +
        'button[type="submit"]'
      );
      
      if (target && target.tagName === 'BUTTON') {
        const id = target.id || 'no-id';
        console.log(`🖱️ Navigation button clicked: ${id}`);
        
        // Scroll after DOM updates
        setTimeout(() => {
          console.log(`  📜 Scrolling to top from ${id}...`);
          this.scrollToTop();
        }, 150);
      }
    };
    
    // Attach in capture phase to run before wizard handlers
    document.addEventListener('click', this._delegatedListener, true);
    console.log('✅ Event delegation attached (targeting nextToStep*, backToStep*, backToRace*)');
  },
  
  enableDebug: function() {
    console.log('🐛 Debug mode enabled');
  }
};

// Expose shorthand
window.scrollToTopOfPage = function() {
  window.ScrollManager.scrollToTop();
};

// Auto-initialize
console.log('📄 Document state:', document.readyState);

if (document.readyState === 'loading') {
  console.log('⏳ Waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOMContentLoaded fired');
    window.ScrollManager.init();
  });
} else {
  console.log('📄 DOM already loaded, initializing now');
  window.ScrollManager.init();
}

console.log('✅ scroll_manager.js file loaded completely');
console.log('✅ window.ScrollManager type:', typeof window.ScrollManager);
