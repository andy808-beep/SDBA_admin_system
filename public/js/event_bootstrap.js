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
      practice_start_date: '2026-01-01',
      practice_end_date: '2026-07-31'
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
      practice_start_date: '2026-01-01',
      practice_end_date: '2026-07-31',
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
    
    // IMPROVED: Check all templates, not just step-1, to prevent duplicates
    const existingTemplates = ['tn-step-1', 'tn-step-2', 'tn-step-3', 'tn-step-4', 'tn-step-5']
      .map(id => document.getElementById(id))
      .filter(el => el !== null);
    
    if (existingTemplates.length > 0) {
      Logger.debug(`🎯 loadTNTemplates: ${existingTemplates.length}/5 templates already loaded, skipping`);
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
    
    // Extract templates and append to document head (only if they don't exist)
    const templates = tempDiv.querySelectorAll('template');
    Logger.debug(`loadTNTemplates: Found ${templates.length} templates in HTML`);
    
    let appendedCount = 0;
    templates.forEach(template => {
      const templateId = template.id;
      // Double-check: only append if this template ID doesn't exist yet
      if (!document.getElementById(templateId)) {
        document.head.appendChild(template.cloneNode(true));
        appendedCount++;
        Logger.debug(`✅ Appended template: ${templateId}`);
      } else {
        Logger.warn(`⚠️ Skipped duplicate template: ${templateId}`);
      }
    });
    
    Logger.info(`TN templates loaded successfully (${appendedCount} templates appended)`);
  } catch (error) {
    Logger.error('Failed to load TN templates:', error);
    throw error;
  }
}

async function loadWUSCTemplates() {
  try {
    Logger.debug('🎯 loadWUSCTemplates: Starting template loading');
    
    // Check if templates are already loaded
    const existingTemplates = ['wu-sc-step-1', 'wu-sc-step-2', 'wu-sc-step-3', 'wu-sc-step-4']
      .map(id => document.getElementById(id))
      .filter(el => el !== null);
    
    if (existingTemplates.length === 4) {
      Logger.debug(`🎯 loadWUSCTemplates: All 4 templates already loaded, skipping`);
      return;
    }
    
    // Load templates from wu_sc_templates.html
    Logger.debug('🎯 loadWUSCTemplates: Fetching wu_sc_templates.html');
    const result = await fetchWithErrorHandling('./wu_sc_templates.html', {
      method: 'GET',
      context: 'load_wu_sc_templates',
      maxRetries: 2
    });
    
    if (!result.ok) {
      throw new Error(result.userMessage || `Failed to load WU/SC templates: ${result.error}`);
    }
    
    const html = typeof result.data === 'string' ? result.data : '';
    Logger.debug('🎯 loadWUSCTemplates: HTML loaded, length:', html.length);
    
    // Create a temporary container to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Extract templates and append to document body (matching register.html behavior)
    const templates = tempDiv.querySelectorAll('template');
    Logger.debug(`loadWUSCTemplates: Found ${templates.length} templates in HTML`);
    
    let appendedCount = 0;
    templates.forEach(template => {
      const templateId = template.id;
      // Only append if this template ID doesn't exist yet
      if (!document.getElementById(templateId)) {
        document.body.appendChild(template.cloneNode(true));
        appendedCount++;
        Logger.debug(`✅ Appended template: ${templateId}`);
      } else {
        Logger.warn(`⚠️ Skipped duplicate template: ${templateId}`);
      }
    });
    
    Logger.info(`WU/SC templates loaded successfully (${appendedCount} templates appended)`);
  } catch (error) {
    Logger.error('Failed to load WU/SC templates:', error);
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
    .select('event_short_ref, event_long_name_en, event_long_name_tc, event_date_en, event_date_tc, event_date, event_location_en, event_location_tc, form_enabled')
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
          if (ev.event_short_ref === 'TN2026') {
            mappedRef = 'tn';
          } else if (ev.event_short_ref === 'WU2026') {
            mappedRef = 'wu';
          } else if (ev.event_short_ref === 'SC2026') {
            mappedRef = 'sc';
          }

          // Get current language for localized display
          const lang = window.i18n?.getCurrentLanguage?.() || 'en';
          const isZh = lang === 'zh';

          return {
            ref: mappedRef,
            name: isZh ? (ev.event_long_name_tc || ev.event_long_name_en) : (ev.event_long_name_en || ev.event_short_ref),
            name_en: ev.event_long_name_en || ev.event_short_ref,
            name_tc: ev.event_long_name_tc || ev.event_long_name_en,
            description: isZh ? (ev.event_date_tc || ev.event_date_en) : (ev.event_date_en || ''),
            description_en: ev.event_date_en || '',
            description_tc: ev.event_date_tc || ev.event_date_en || '',
            details: isZh ? (ev.event_location_tc || ev.event_location_en) : (ev.event_location_en || ''),
            details_en: ev.event_location_en || '',
            details_tc: ev.event_location_tc || ev.event_location_en || ''
          };
        });
      } else {
        throw new Error('No events found in database');
      }
    } catch (dbError) {
      Logger.warn('🎯 loadPicker: Database loading failed, using fallback events:', dbError.message);
      // Fallback to static events if database fails (matches annual_event_config table)
      const lang = window.i18n?.getCurrentLanguage?.() || 'en';
      const isZh = lang === 'zh';
      events = [
        {
          ref: 'tn',
          name: isZh ? '赤柱國際龍舟錦標賽2026' : 'Stanley International Dragon Boat Championships 2026',
          name_en: 'Stanley International Dragon Boat Championships 2026',
          name_tc: '赤柱國際龍舟錦標賽2026',
          description: isZh ? '2026 年 5 月 30 日, 星期六' : '30 May, 2026, Saturday',
          description_en: '30 May, 2026, Saturday',
          description_tc: '2026 年 5 月 30 日, 星期六',
          details: isZh ? '赤柱正灘' : 'Stanley Main Beach',
          details_en: 'Stanley Main Beach',
          details_tc: '赤柱正灘'
        },
        {
          ref: 'wu',
          name: isZh ? '赤柱龍舟熱身賽 2026' : 'Stanley Dragon Boat Warm-Up Races 2026',
          name_en: 'Stanley Dragon Boat Warm-Up Races 2026',
          name_tc: '赤柱龍舟熱身賽 2026',
          description: isZh ? '2026 年 5 月 2 日, 星期六' : '2 May, 2026, Saturday',
          description_en: '2 May, 2026, Saturday',
          description_tc: '2026 年 5 月 2 日, 星期六',
          details: isZh ? '赤柱正灘' : 'Stanley Main Beach',
          details_en: 'Stanley Main Beach',
          details_tc: '赤柱正灘'
        },
        {
          ref: 'sc',
          name: isZh ? '第二十四屆香港龍舟短途賽' : 'The 24th Hong Kong Dragon Boat Short Course Races',
          name_en: 'The 24th Hong Kong Dragon Boat Short Course Races',
          name_tc: '第二十四屆香港龍舟短途賽',
          description: isZh ? '2026 年 6 月 14 日, 星期日' : '14 June, 2026, Sunday',
          description_en: '14 June, 2026, Sunday',
          description_tc: '2026 年 6 月 14 日, 星期日',
          details: isZh ? '赤柱正灘' : 'Stanley Main Beach',
          details_en: 'Stanley Main Beach',
          details_tc: '赤柱正灘'
        }
      ];
    }
    
    Logger.info('🎯 loadPicker: Using', events.length, 'events');
    renderEventCards(events);
  } catch (err) {
    showPicker(window.i18n ? window.i18n.t('unableToLoadEvents') : 'Unable to load events. Please try again later.');
    Logger.warn('loadPicker failed', err);
  }
}

// Store loaded events for re-rendering on language change
let loadedEvents = [];

function renderEventCards(events) {
  // Store events for language change re-rendering
  if (events && events.length > 0) {
    loadedEvents = events;
  }
  
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

  // Get current language for display
  const lang = window.i18n?.getCurrentLanguage?.() || 'en';
  const isZh = lang === 'zh';

  events.forEach((event, index) => {
    Logger.debug(`🎯 renderEventCards: Creating card ${index + 1} for ${event.name}`);
    const card = document.createElement('div');
    card.className = 'event-card';
    card.setAttribute('data-event', event.ref); // Add data-event for theme colors
    card.onclick = () => selectEvent(event.ref);

    // Use localized name/description/details if available
    const displayName = isZh ? (event.name_tc || event.name) : (event.name_en || event.name);
    const displayDescription = isZh ? (event.description_tc || event.description) : (event.description_en || event.description);
    const displayDetails = isZh ? (event.details_tc || event.details) : (event.details_en || event.details);

    // XSS FIX: Escape event data before inserting into HTML
    const safeName = escapeHtml(displayName);
    const safeDescription = escapeHtml(displayDescription);
    const safeDetails = escapeHtml(displayDetails);

    card.innerHTML = `
      <h3>${safeName}</h3>
      <p>${safeDescription}</p>
      <div class="description">${safeDetails}</div>
    `;

    grid.appendChild(card);
  });

  Logger.debug('🎯 renderEventCards: All cards rendered, grid children count:', grid.children.length);
}

// Re-render event cards when language changes
window.addEventListener('languageChanged', () => {
  if (loadedEvents.length > 0) {
    Logger.debug('🎯 Event Picker: Language changed, re-rendering event cards');
    renderEventCards(loadedEvents);
  }
});

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
      
      // Wait for WU/SC templates before initializing wizard
      if (ref === 'wu' || ref === 'sc') {
        await loadWUSCTemplates();
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
    showPicker(window.i18n ? window.i18n.t('unableToLoadEvents') : 'Failed to load event. Please pick another or try again.');
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
  // CHECK FOR SUCCESS PAGE FIRST - before anything else
  // Check both URL parameter and window flag (set by success handler)
  const urlParams = new URLSearchParams(window.location.search);
  const isSuccessParam = urlParams.get('success') === 'true';
  const isSuccessFlag = window.__SUCCESS_PAGE_ACTIVE === true;
  
  if (isSuccessParam || isSuccessFlag) {
    console.log('🚀 Boot: Success page detected, skipping event bootstrap', {
      urlParam: isSuccessParam,
      flag: isSuccessFlag
    });
    // Let register.html's success handler take over
    return;
  }
  
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


