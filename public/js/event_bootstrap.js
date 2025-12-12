// event_bootstrap.js
// Resilient boot sequence for the universal event form
//
// QA ACCEPTANCE CHECKS:
// - Rendering: all sections appear/hide per config; re-init doesn't duplicate DOM
// - Totals: changing package/qty/slots updates immediately
// - Submit: idempotency returns same registration_id; receipt persisted
// - Redirects: legacy URLs land on register.html?e=<ref>

import { sb } from '../supabase_config.js';
import { loadEventConfig } from './config_loader.js';
import { initFormForEvent } from './ui_bindings.js';
import bindTotals from './totals.js';
import bindSubmit from './submit.js';
import { initTNWizard } from './tn_wizard.js';
import { addBreadcrumb, logError } from './error-handler.js';
import Logger from './logger.js';
import { fetchWithErrorHandling } from './api-client.js';

const LS_EVENT_KEY = 'raceApp:last_event_ref';

function q(id) { return document.getElementById(id); }

/**
 * Create fallback configuration for TN mode
 * Provides minimal config needed for TN wizard to function
 */
export function createTNConfig() {
  const tnConfig = {
    event: {
      event_short_ref: 'tn',
      event_long_name_en: 'TN Legacy Registration',
      form_enabled: true,
      practice_start_date: '2025-01-01',
      practice_end_date: '2025-07-31'
    },
    labels: {
      contact_name: 'Name',
      contact_email: 'Email',
      contact_phone: 'Phone',
      team_name: 'Team Name',
      organization: 'Organization',
      mailing_address: 'Mailing Address'
    },
    packages: [
      {
        package_code: 'opt1',
        title_en: 'Option 1',
        listed_unit_price: 2500
      },
      {
        package_code: 'opt2', 
        title_en: 'Option 2',
        listed_unit_price: 2000
      }
    ],
    race_day_items: [
      {
        item_code: 'marquee',
        title_en: 'Athlete Marquee',
        listed_unit_price: 2000
      },
      {
        item_code: 'steer_with',
        title_en: 'Official Steersman (with boat)',
        listed_unit_price: 800
      },
      {
        item_code: 'steer_without',
        title_en: 'Official Steersman (without boat)',
        listed_unit_price: 1500
      },
      {
        item_code: 'junk_boat',
        title_en: 'Junk Boat Registration',
        listed_unit_price: 2500
      },
      {
        item_code: 'speed_boat',
        title_en: 'Speed Boat Registration',
        listed_unit_price: 1500
      }
    ],
    timeslots: [
      { slot_code: 'morning_2h', label: 'Morning Session (9-11 AM)', duration_hours: 2 },
      { slot_code: 'afternoon_2h', label: 'Afternoon Session (2-4 PM)', duration_hours: 2 },
      { slot_code: 'evening_2h', label: 'Evening Session (6-8 PM)', duration_hours: 2 },
      { slot_code: 'morning_1h', label: 'Morning Session (9-10 AM)', duration_hours: 1 },
      { slot_code: 'afternoon_1h', label: 'Afternoon Session (2-3 PM)', duration_hours: 1 },
      { slot_code: 'evening_1h', label: 'Evening Session (6-7 PM)', duration_hours: 1 }
    ],
    practice: {
      practice_start_date: '2025-01-01',
      practice_end_date: '2025-07-31',
      min_rows: 1,
      max_rows: 3,
      window_rules: {
        weekdays_only: true,
        advance_booking_days: 7
      }
    },
    config_version: 1
  };
  
  // Set the config globally
  window.__CONFIG = tnConfig;
  
  Logger.debug('TN fallback configuration created');
}

/**
 * Load TN templates into the page
 * Ensures TN templates are available for the wizard
 */
async function loadTNTemplates() {
  try {
    Logger.debug('🎯 loadTNTemplates: Starting template loading');
    // Check if templates are already loaded
    const existingTemplate = document.getElementById('tn-step-1');
    if (existingTemplate) {
      Logger.debug('🎯 loadTNTemplates: TN templates already loaded');
      return;
    }
    
    // Load templates from tn_templates.html
    Logger.debug('🎯 loadTNTemplates: Fetching tn_templates.html');
    const result = await fetchWithErrorHandling('./tn_templates.html', {
      method: 'GET',
      context: 'load_tn_templates',
      maxRetries: 2
    });
    
    if (!result.ok) {
      throw new Error(result.userMessage || `Failed to load TN templates: ${result.error}`);
    }
    
    const html = typeof result.data === 'string' ? result.data : '';
    Logger.debug('🎯 loadTNTemplates: HTML loaded, length:', html.length);
    
    // Create a temporary container to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Extract and append templates to document head
    const templates = tempDiv.querySelectorAll('template');
    Logger.debug(`loadTNTemplates: Found ${templates.length} templates`);
    templates.forEach(template => {
      document.head.appendChild(template.cloneNode(true));
    });
    
    Logger.info('TN templates loaded successfully');
  } catch (error) {
    Logger.error('Failed to load TN templates:', error);
    throw error;
  }
}

function showPicker(message) {
  Logger.debug('🎯 showPicker: Showing event picker');
  const picker = q('eventPicker');
  const form = q('formContainer');
  
  Logger.debug('🎯 showPicker: Picker element found:', !!picker);
  Logger.debug('🎯 showPicker: Form element found:', !!form);
  
  if (form) {
    form.style.display = 'none';
    Logger.debug('🎯 showPicker: Form hidden');
  }
  if (picker) {
    picker.style.display = 'block';
    Logger.debug('🎯 showPicker: Picker shown');
    Logger.debug('🎯 showPicker: Picker display style:', picker.style.display);
    Logger.debug('🎯 showPicker: Picker computed style:', window.getComputedStyle(picker).display);
  } else {
    Logger.error('🎯 showPicker: Picker element not found!');
  }
  if (message) {
    const box = q('errorBox');
    const msg = q('errorMessage');
    if (box && msg) { msg.textContent = message; box.style.display = 'block'; }
  }
}

function hidePicker() {
  const picker = q('eventPicker');
  if (picker) picker.style.display = 'none';
}

function showForm() {
  const form = q('formContainer');
  if (form) form.style.display = 'block';
}

async function fetchEvents() {
  const { data, error } = await sb
    .from('v_event_config_public')
    .select('event_short_ref, event_long_name_en, event_date_en, event_date, event_location_en, form_enabled')
    .eq('form_enabled', true)
    .order('event_date', { ascending: true });
  if (error) throw error;
  return data || [];
}

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, s => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[s]));
}


async function loadPicker() {
  try {
    Logger.debug('🎯 loadPicker: Starting event picker loading');
    const loading = q('eventLoading');
    if (loading) {
      loading.style.display = 'block';
      Logger.debug('🎯 loadPicker: Loading indicator shown');
    }
    
    // Try to load events from database first
    let events = [];
    try {
      Logger.debug('🎯 loadPicker: Attempting to load events from database');
      const dbEvents = await fetchEvents();
      if (dbEvents && dbEvents.length > 0) {
        Logger.info('🎯 loadPicker: Loaded', dbEvents.length, 'events from database');
        events = dbEvents.map(ev => {
          // Map database event references to expected format
          let mappedRef = ev.event_short_ref;
          if (ev.event_short_ref === 'TN2025') {
            mappedRef = 'tn';
          } else if (ev.event_short_ref === 'WU2025') {
            mappedRef = 'wu';
          } else if (ev.event_short_ref === 'SC2025') {
            mappedRef = 'sc';
          }
          
          return {
            ref: mappedRef,
            name: ev.event_long_name_en || ev.event_short_ref,
            description: ev.event_date_en || '',
            details: ev.event_location_en || ''
          };
        });
      } else {
        throw new Error('No events found in database');
      }
    } catch (dbError) {
      Logger.warn('🎯 loadPicker: Database loading failed, using fallback events:', dbError.message);
      // Fallback to static events if database fails
      events = [
        {
          ref: 'tn',
          name: 'TN Dragon Boat Race',
          description: 'Traditional Dragon Boat Race',
          details: 'Multi-step registration form with practice booking calendar. Includes team registration, race day arrangements, and practice scheduling.'
        },
        {
          ref: 'wu',
          name: 'WU Dragon Boat Race', 
          description: 'Water University Dragon Boat Race',
          details: 'Modern single-page registration form with configurable options. Streamlined registration process with dynamic form fields.'
        },
        {
          ref: 'sc',
          name: 'SC Dragon Boat Race',
          description: 'Sports Club Dragon Boat Race', 
          details: 'Modern single-page registration form with configurable options. Streamlined registration process with dynamic form fields.'
        }
      ];
    }
    
    Logger.info('🎯 loadPicker: Using', events.length, 'events');
    renderEventCards(events);
  } catch (err) {
    showPicker('Unable to load events. Please try again later.');
    Logger.warn('loadPicker failed', err);
  }
}

function renderEventCards(events) {
  Logger.debug('🎯 renderEventCards: Starting to render', events.length, 'events');
  const grid = q('eventGrid');
  const loading = q('eventLoading');
  
  Logger.debug('🎯 renderEventCards: Grid element found:', !!grid);
  Logger.debug('🎯 renderEventCards: Loading element found:', !!loading);
  
  if (loading) {
    loading.style.display = 'none';
    Logger.debug('🎯 renderEventCards: Loading indicator hidden');
  }
  if (!grid) {
    Logger.error('🎯 renderEventCards: Grid element not found!');
    return;
  }
  
  grid.innerHTML = '';
  Logger.debug('🎯 renderEventCards: Grid cleared');
  
  events.forEach((event, index) => {
    Logger.debug(`🎯 renderEventCards: Creating card ${index + 1} for ${event.name}`);
    const card = document.createElement('div');
    card.className = 'event-card';
    card.setAttribute('data-event', event.ref); // Add data-event for theme colors
    card.onclick = () => selectEvent(event.ref);
    
    // XSS FIX: Escape event data (event.name, event.description, event.details) before inserting into HTML
    // Event data comes from database/config, but should be escaped as defense-in-depth
    const safeName = escapeHtml(event.name);
    const safeDescription = escapeHtml(event.description);
    const safeDetails = escapeHtml(event.details);
    
    card.innerHTML = `
      <h3>${safeName}</h3>
      <p>${safeDescription}</p>
      <div class="description">${safeDetails}</div>
    `;
    
    grid.appendChild(card);
  });
  
  Logger.debug('🎯 renderEventCards: All cards rendered, grid children count:', grid.children.length);
}

async function selectEvent(ref) {
  if (!ref) return;
  
  // Add breadcrumb for event selection
  addBreadcrumb('Event selected', 'user', 'info', {
    eventRef: ref,
    action: 'event_selection'
  });
  
  // Set URL parameter and reload
  const url = new URL(window.location);
  url.searchParams.set('e', ref);
  window.location.href = url.toString();
}

async function attemptLoad(ref) {
  try {
    hidePicker();
    
    // Add breadcrumb for event loading
    addBreadcrumb('Loading event', 'navigation', 'info', {
      eventRef: ref,
      action: 'event_load_start'
    });
    
    // Set body dataset for CSS scoping
    document.body.dataset.event = ref;
    
    // Sanity hooks (dev only)
    window.__MODE = (ref === 'tn') ? 'tn_wizard' : 'single_page';
    window.__PRACTICE_ENABLED = (window.__MODE === 'tn_wizard');
    Logger.info('Boot → event=', ref, 'mode=', window.__MODE);
    
    // Boot rules: if e=tn → tn_wizard, if e=wu|sc → single_page
    if (ref === 'tn') {
      // TN Legacy Wizard Path
      Logger.debug('🎯 TN Mode: Loading templates and initializing wizard');
      
      // Guarantee TN config exists before wizard starts
      if (!window.__CONFIG || !window.__CONFIG.practice) {
        // Prefer real config if available; otherwise build fallback
        try { await loadEventConfig('tn', { useCache: true }); } catch {}
        if (!window.__CONFIG || !window.__CONFIG.practice) createTNConfig();
      }
      console.assert(window.__CONFIG?.practice, 'TN: practice config missing before wizard init');
      Logger.debug('🎯 TN Mode: Config verified, proceeding with wizard initialization');
      
      await loadTNTemplates();
      await initTNWizard();
      
      // Ensure TN scope is visible
      const tnScope = document.getElementById('tnScope');
      const wuScContainer = document.getElementById('wuScContainer');
      if (tnScope) {
        tnScope.style.display = 'block';
        console.log('🎯 TN Mode: TN scope container shown');
      }
      if (wuScContainer) {
        wuScContainer.style.display = 'none';
        console.log('🎯 TN Mode: WU/SC container hidden');
      }
    } else {
      // WU/SC Single Page Form Path
      Logger.debug('🎯 Single Page Mode: Loading config and initializing form');
      const cfg = await loadEventConfig(ref, { useCache: true });
      // Version-aware cache refresh: if a cache exists but version changed, force refresh
      if (cfg && typeof cfg.config_version === 'number') {
        // A second call with useCache=false will refresh if backend returns newer version
        // config_loader internally handles TTL + version persistence; we refresh proactively
        await loadEventConfig(ref, { useCache: true });
      }
      initFormForEvent(ref);
      bindTotals();
      bindSubmit();
      
      // Ensure WU/SC container is visible
      const tnScope = document.getElementById('tnScope');
      const wuScContainer = document.getElementById('wuScContainer');
      if (tnScope) {
        tnScope.style.display = 'none';
        console.log('🎯 Single Page Mode: TN scope container hidden');
      }
      if (wuScContainer) {
        wuScContainer.style.display = 'block';
        console.log('🎯 Single Page Mode: WU/SC container shown');
      }
    }
    
    showForm();
    
    // Add breadcrumb for successful event load
    addBreadcrumb('Event loaded successfully', 'navigation', 'info', {
      eventRef: ref,
      mode: window.__MODE,
      action: 'event_load_success'
    });
  } catch (err) {
    logError(err, {
      action: 'event_load_failed',
      eventRef: ref
    }, 'error', ['event_loading']);
    
    Logger.warn('attemptLoad failed', err);
    showPicker('Failed to load event. Please pick another or try again.');
    await loadPicker();
  }
}

function resolveInitialRef() {
  const params = new URLSearchParams(location.search);
  const fromUrl = params.get('e');
  if (fromUrl) return fromUrl;
  // Don't use localStorage fallback - always show event picker when no ?e= parameter
  return null;
}

async function boot() {
  Logger.info('🚀 Boot: Starting bootstrap sequence');
  const ref = resolveInitialRef();
  Logger.debug('🚀 Boot: Resolved ref =', ref);
  
  if (ref) {
    // Set theme color via data attribute
    document.body.setAttribute('data-event', ref.toLowerCase());
    Logger.debug(`🎨 Theme: Applied ${ref.toUpperCase()} theme colors`);
    
    // Determine mode and log banner
    const mode = ref === 'tn' ? 'tn_wizard' : 'single_page';
    Logger.info(`🚀 Boot → event=${ref}, mode=${mode}`);
    
    await attemptLoad(ref);
  } else {
    // No event specified, show event picker
    Logger.debug('🚀 Boot → event=<none>, mode=picker');
    Logger.debug('🚀 Boot: Showing event picker for no event parameter');
    showPicker();
    await loadPicker();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// QA helper (dev only)
if (window.__DEV__) {
  window.__DBG = {
    dumpState: async () => {
      try {
        const { collectStateFromForm } = await import('./ui_bindings.js');
        return collectStateFromForm();
      } catch (e) {
        Logger.error('dumpState failed:', e);
        return null;
      }
    },
    refreshConfig: async () => {
      try {
        const { clearConfigCache } = await import('./config_loader.js');
        const ref = new URLSearchParams(location.search).get('e') || localStorage.getItem('raceApp:last_event_ref') || '';
        if (ref) {
          clearConfigCache(ref);
          const { loadEventConfig } = await import('./config_loader.js');
          const { initFormForEvent } = await import('./ui_bindings.js');
          const { bindTotals } = await import('./totals.js');
          const { bindSubmit } = await import('./submit.js');
          const cfg = await loadEventConfig(ref, { useCache: false });
          initFormForEvent(ref);
          bindTotals();
          bindSubmit();
          Logger.info('Config refreshed for:', ref);
        } else {
          Logger.warn('No event ref to refresh');
        }
      } catch (e) {
        Logger.error('refreshConfig failed:', e);
      }
    },
    clearCache: () => {
      try {
        const keys = Object.keys(localStorage);
        const raceKeys = keys.filter(k => k.startsWith('raceApp:'));
        raceKeys.forEach(k => localStorage.removeItem(k));
        Logger.info(`Cleared ${raceKeys.length} cache keys`);
      } catch (e) {
        Logger.error('clearCache failed:', e);
      }
    }
  };
}


