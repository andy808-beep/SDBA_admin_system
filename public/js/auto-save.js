/**
 * Auto-Save Module
 * Adds localStorage persistence on top of sessionStorage
 * Provides cross-session recovery for form drafts
 */
const AutoSave = {
  STORAGE_KEY_PREFIX: 'sdba_draft_',
  EXPIRY_HOURS: 48,
  AUTO_SAVE_INTERVAL: 10000, // 10 seconds
  
  isDirty: false,
  autoSaveTimer: null,
  
  /**
   * Get storage key for event
   */
  getKey(eventShortRef) {
    return this.STORAGE_KEY_PREFIX + eventShortRef;
  },
  
  /**
   * Get event prefix (tn_, wu_, sc_)
   */
  getEventPrefix(eventShortRef) {
    const type = eventShortRef.substring(0, 2).toLowerCase();
    return type + '_';
  },
  
  /**
   * Save snapshot to localStorage
   */
  saveDraft(eventShortRef, currentStep) {
    try {
      // Take snapshot of ALL sessionStorage with prefix
      const prefix = this.getEventPrefix(eventShortRef);
      const snapshot = {};
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(prefix)) {
          snapshot[key] = sessionStorage.getItem(key);
        }
      }
      
      const draft = {
        data: snapshot,
        step: currentStep,
        timestamp: Date.now(),
        version: 1
      };
      
      const key = this.getKey(eventShortRef);
      localStorage.setItem(key, JSON.stringify(draft));
      
      this.showIndicator('saved');
      this.isDirty = false;
      
      console.log('💾 Auto-save: Saved draft', { 
        event: eventShortRef,
        step: currentStep, 
        keys: Object.keys(snapshot).length 
      });
      return true;
    } catch (error) {
      console.error('💾 Auto-save failed:', error);
      if (error.name === 'QuotaExceededError') {
        this.showIndicator('quota-exceeded');
        this.cleanOldDrafts();
      }
      return false;
    }
  },
  
  /**
   * Load draft from localStorage
   */
  loadDraft(eventShortRef) {
    try {
      const key = this.getKey(eventShortRef);
      const stored = localStorage.getItem(key);
      
      if (!stored) return null;
      
      const draft = JSON.parse(stored);
      const age = Date.now() - draft.timestamp;
      const maxAge = this.EXPIRY_HOURS * 60 * 60 * 1000;
      
      if (age < maxAge) {
        console.log('💾 Auto-save: Found draft', { 
          event: eventShortRef,
          step: draft.step, 
          age: this.formatTimeAgo(draft.timestamp)
        });
        return draft;
      } else {
        console.log('💾 Auto-save: Draft expired, removing');
        this.clearDraft(eventShortRef);
        return null;
      }
    } catch (error) {
      console.error('💾 Failed to load draft:', error);
      return null;
    }
  },
  
  /**
   * Restore draft to sessionStorage and return step number
   */
  restoreDraft(eventShortRef) {
    const draft = this.loadDraft(eventShortRef);
    if (!draft) return null;
    
    const timeAgo = this.formatTimeAgo(draft.timestamp);
    const shouldRestore = confirm(
      `Found a saved draft from ${timeAgo}.\n\n` +
      `Continue where you left off?\n\n` +
      `Click OK to restore, or Cancel to start fresh.`
    );
    
    if (!shouldRestore) {
      console.log('💾 Auto-save: User declined restoration');
      this.clearDraft(eventShortRef);
      return null;
    }
    
    // Copy all data to sessionStorage
    Object.keys(draft.data).forEach(key => {
      sessionStorage.setItem(key, draft.data[key]);
    });
    
    console.log('💾 Auto-save: Restored draft', { 
      event: eventShortRef,
      step: draft.step,
      keys: Object.keys(draft.data).length 
    });
    
    return draft;
  },
  
  /**
   * Clear specific draft
   */
  clearDraft(eventShortRef) {
    const key = this.getKey(eventShortRef);
    localStorage.removeItem(key);
    console.log('💾 Auto-save: Cleared draft for', eventShortRef);
  },
  
  /**
   * Clean old/expired drafts
   */
  cleanOldDrafts() {
    console.log('💾 Auto-save: Cleaning old drafts...');
    const now = Date.now();
    const maxAge = this.EXPIRY_HOURS * 60 * 60 * 1000;
    let cleaned = 0;
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.STORAGE_KEY_PREFIX)) {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          if (now - item.timestamp > maxAge) {
            localStorage.removeItem(key);
            cleaned++;
          }
        } catch (e) {
          localStorage.removeItem(key);
          cleaned++;
        }
      }
    }
    
    if (cleaned > 0) {
      console.log(`💾 Auto-save: Cleaned ${cleaned} old drafts`);
    }
  },
  
  /**
   * Format time ago
   */
  formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  },
  
  /**
   * Show save indicator
   */
  showIndicator(status) {
    let indicator = document.getElementById('autoSaveIndicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'autoSaveIndicator';
      indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        z-index: 9999;
        transition: opacity 0.3s ease;
        pointer-events: none;
        box-shadow: 0 2px 12px rgba(0,0,0,0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;
      document.body.appendChild(indicator);
    }
    
    if (status === 'saving') {
      indicator.textContent = '💾 Saving...';
      indicator.style.background = '#f0f0f0';
      indicator.style.color = '#666';
    } else if (status === 'saved') {
      indicator.textContent = '✓ Draft saved';
      indicator.style.background = '#d4edda';
      indicator.style.color = '#155724';
    } else if (status === 'quota-exceeded') {
      indicator.textContent = '⚠️ Storage full';
      indicator.style.background = '#fff3cd';
      indicator.style.color = '#856404';
    }
    
    indicator.style.opacity = '1';
    setTimeout(() => { indicator.style.opacity = '0'; }, 2000);
  },
  
  /**
   * Mark form as dirty (needs saving)
   */
  markDirty() {
    if (!this.isDirty) {
      console.log('💾 Auto-save: Form marked as dirty (will save in next interval)');
    }
    this.isDirty = true;
  },
  
  /**
   * Start auto-save timer
   */
  startAutoSave(eventShortRef, getCurrentStep) {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    this.autoSaveTimer = setInterval(() => {
      const currentStep = getCurrentStep();
      if (this.isDirty && currentStep > 0) {
        this.showIndicator('saving');
        this.saveDraft(eventShortRef, currentStep);
      } else {
        // Debug: Log why we're not saving
        if (currentStep === 0) {
          console.log('💾 Auto-save: Skipping (at step 0)');
        } else if (!this.isDirty) {
          console.log('💾 Auto-save: Skipping (form not dirty - no changes since last save)');
        }
      }
    }, this.AUTO_SAVE_INTERVAL);
    
    console.log('💾 Auto-save: Timer started (every 10s)');
  },
  
  /**
   * Stop auto-save timer
   */
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
      console.log('💾 Auto-save: Timer stopped');
    }
  }
};

window.AutoSave = AutoSave;
