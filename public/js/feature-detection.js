/**
 * Feature Detection for Error System
 * Detects CSS and JavaScript feature support
 */

(function() {
  'use strict';

  /**
   * CSS Feature Detection
   */
  const CSSFeatures = {
    /**
     * Check if CSS Grid is supported
     */
    supportsGrid() {
      if (typeof CSS === 'undefined' || !CSS.supports) {
        // Fallback for older browsers
        const testEl = document.createElement('div');
        testEl.style.display = 'grid';
        return testEl.style.display === 'grid';
      }
      return CSS.supports('display', 'grid');
    },

    /**
     * Check if Flexbox is supported
     */
    supportsFlexbox() {
      if (typeof CSS === 'undefined' || !CSS.supports) {
        const testEl = document.createElement('div');
        testEl.style.display = 'flex';
        return testEl.style.display === 'flex';
      }
      return CSS.supports('display', 'flex');
    },

    /**
     * Check if CSS Variables are supported
     */
    supportsCSSVariables() {
      if (typeof CSS === 'undefined' || !CSS.supports) {
        return false;
      }
      return CSS.supports('--custom-property', 'value');
    },

    /**
     * Check if :focus-visible is supported
     */
    supportsFocusVisible() {
      try {
        document.querySelector(':focus-visible');
        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * Check if CSS animations are supported
     */
    supportsAnimations() {
      if (typeof CSS === 'undefined' || !CSS.supports) {
        return 'animation' in document.createElement('div').style;
      }
      return CSS.supports('animation', 'test 1s');
    },

    /**
     * Check if CSS transitions are supported
     */
    supportsTransitions() {
      if (typeof CSS === 'undefined' || !CSS.supports) {
        return 'transition' in document.createElement('div').style;
      }
      return CSS.supports('transition', 'opacity 1s');
    },

    /**
     * Check if scroll-behavior is supported
     */
    supportsScrollBehavior() {
      if (typeof CSS === 'undefined' || !CSS.supports) {
        return 'scroll-behavior' in document.documentElement.style;
      }
      return CSS.supports('scroll-behavior', 'smooth');
    },

    /**
     * Apply fallbacks for unsupported features
     */
    applyFallbacks() {
      // Focus-visible fallback for Safari < 15.4
      if (!this.supportsFocusVisible()) {
        const style = document.createElement('style');
        style.id = 'error-system-focus-fallback';
        style.textContent = `
          /* Fallback for :focus-visible */
          input.field-error:focus,
          select.field-error:focus,
          textarea.field-error:focus,
          button.error-close:focus,
          button.system-error-close:focus {
            outline: 2px solid #005fcc !important;
            outline-offset: 2px !important;
          }
        `;
        document.head.appendChild(style);
      }

      // Smooth scroll fallback
      if (!this.supportsScrollBehavior()) {
        this.polyfillSmoothScroll();
      }
    },

    /**
     * Polyfill smooth scroll for browsers that don't support it
     */
    polyfillSmoothScroll() {
      if (Element.prototype._smoothScrollPolyfilled) {
        return; // Already polyfilled
      }

      const originalScrollIntoView = Element.prototype.scrollIntoView;
      
      Element.prototype.scrollIntoView = function(options) {
        if (options && options.behavior === 'smooth') {
          const start = window.pageYOffset || document.documentElement.scrollTop;
          const elementTop = this.getBoundingClientRect().top + start;
          const distance = elementTop - start;
          const duration = 500;
          let startTime = null;

          function animate(currentTime) {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            
            // Easing function (ease-in-out)
            const ease = progress < 0.5
              ? 2 * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            window.scrollTo(0, start + distance * ease);

            if (timeElapsed < duration) {
              requestAnimationFrame(animate);
            }
          }

          if (typeof requestAnimationFrame !== 'undefined') {
            requestAnimationFrame(animate);
          } else {
            // Fallback for very old browsers
            originalScrollIntoView.call(this, options);
          }
          return;
        }
        return originalScrollIntoView.call(this, options);
      };

      Element.prototype._smoothScrollPolyfilled = true;
    }
  };

  /**
   * JavaScript Feature Detection
   */
  const JSFeatures = {
    /**
     * Check if scrollIntoView with options is supported
     */
    supportsScrollIntoViewOptions() {
      try {
        const div = document.createElement('div');
        div.scrollIntoView({ behavior: 'smooth' });
        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * Check if IntersectionObserver is supported
     */
    supportsIntersectionObserver() {
      return 'IntersectionObserver' in window;
    },

    /**
     * Check if Map is supported
     */
    supportsMap() {
      return typeof Map !== 'undefined' && typeof Map.prototype.forEach === 'function';
    },

    /**
     * Check if Set is supported
     */
    supportsSet() {
      return typeof Set !== 'undefined' && typeof Set.prototype.forEach === 'function';
    },

    /**
     * Check if Arrow Functions are supported
     */
    supportsArrowFunctions() {
      try {
        // eslint-disable-next-line no-eval
        eval('(() => {})');
        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * Check if Template Literals are supported
     */
    supportsTemplateLiterals() {
      try {
        // eslint-disable-next-line no-eval
        eval('`test`');
        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * Check if requestAnimationFrame is supported
     */
    supportsRequestAnimationFrame() {
      return typeof requestAnimationFrame !== 'undefined';
    },

    /**
     * Check if DocumentFragment is supported
     */
    supportsDocumentFragment() {
      return typeof DocumentFragment !== 'undefined';
    },

    /**
     * Check if classList API is supported
     */
    supportsClassList() {
      return 'classList' in document.createElement('div');
    },

    /**
     * Get browser information
     */
    getBrowserInfo() {
      const ua = navigator.userAgent;
      const info = {
        name: 'Unknown',
        version: 0,
        isMobile: /Mobile|Android|iPhone|iPad/.test(ua),
        isIOS: /iPhone|iPad|iPod/.test(ua),
        isAndroid: /Android/.test(ua)
      };

      if (ua.includes('Chrome') && !ua.includes('Edg')) {
        const match = ua.match(/Chrome\/(\d+)/);
        info.name = 'Chrome';
        info.version = match ? parseInt(match[1], 10) : 0;
      } else if (ua.includes('Firefox')) {
        const match = ua.match(/Firefox\/(\d+)/);
        info.name = 'Firefox';
        info.version = match ? parseInt(match[1], 10) : 0;
      } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
        const match = ua.match(/Version\/(\d+)/);
        info.name = 'Safari';
        info.version = match ? parseInt(match[1], 10) : 0;
      } else if (ua.includes('Edg')) {
        const match = ua.match(/Edg\/(\d+)/);
        info.name = 'Edge';
        info.version = match ? parseInt(match[1], 10) : 0;
      }

      return info;
    },

    /**
     * Log feature support status (for debugging)
     */
    logFeatureSupport() {
      if (window.console && window.console.log) {
        const browser = this.getBrowserInfo();
        console.log('[ErrorSystem] Browser:', browser.name, browser.version);
        console.log('[ErrorSystem] Features:', {
          scrollIntoViewOptions: this.supportsScrollIntoViewOptions(),
          IntersectionObserver: this.supportsIntersectionObserver(),
          Map: this.supportsMap(),
          Set: this.supportsSet(),
          ArrowFunctions: this.supportsArrowFunctions(),
          TemplateLiterals: this.supportsTemplateLiterals(),
          RequestAnimationFrame: this.supportsRequestAnimationFrame(),
          DocumentFragment: this.supportsDocumentFragment(),
          ClassList: this.supportsClassList()
        });
      }
    }
  };

  // Apply fallbacks on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      CSSFeatures.applyFallbacks();
    });
  } else {
    CSSFeatures.applyFallbacks();
  }

  // Export to window
  if (typeof window !== 'undefined') {
    window.CSSFeatureDetection = CSSFeatures;
    window.JSFeatureDetection = JSFeatures;
    
    // Log in development mode
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      JSFeatures.logFeatureSupport();
    }
  }
})();
