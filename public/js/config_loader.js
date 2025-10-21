// config_loader.js
// Event configuration loader for universal form
//
// QA ACCEPTANCE CHECKS:
// - Rendering: all sections appear/hide per config; re-init doesn't duplicate DOM
// - Totals: changing package/qty/slots updates immediately
// - Submit: idempotency returns same registration_id; receipt persisted
// - Redirects: legacy URLs land on register.html?e=<ref>

import { sb } from '../supabase_config.js';

// Cache configuration
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const CACHE_PREFIX = 'raceApp:config:';

/**
 * Generate cache key for event configuration
 * @param {string} eventShortRef - Event short reference (e.g., "TN2025")
 * @returns {string} Cache key
 */
function getCacheKey(eventShortRef) {
  return `${CACHE_PREFIX}${eventShortRef}`;
}

/**
 * Read configuration from localStorage cache
 * @param {string} eventShortRef - Event short reference
 * @returns {object|null} Cached configuration or null
 */
function readFromCache(eventShortRef) {
  try {
    const cacheKey = getCacheKey(eventShortRef);
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid (less than 6 hours old)
    if (now - parsed.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return parsed;
  } catch (error) {
    console.warn('Failed to read from cache:', error);
    return null;
  }
}

/**
 * Write configuration to localStorage cache
 * @param {string} eventShortRef - Event short reference
 * @param {object} config - Configuration object
 */
function writeToCache(eventShortRef, config) {
  try {
    const cacheKey = getCacheKey(eventShortRef);
    const cacheData = {
      eventShortRef,
      config_version: config.config_version,
      timestamp: Date.now(),
      config
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to write to cache:', error);
  }
}

/**
 * Transform RPC data to expected config structure
 * @param {object} rpcData - Data from RPC function
 * @returns {object} Transformed configuration
 */
function transformConfigData(rpcData) {
  return {
    config_version: rpcData.event?.config_version || 1,
    event: rpcData.event,
    fields: {}, // TODO: Add field definitions
    labels: {}, // TODO: Add label definitions  
    limits: {}, // TODO: Add limit definitions
    divisions: rpcData.divisions,
    packages: rpcData.packages,
    race_day_items: rpcData.raceDay,
    practice: rpcData.practiceItems,
    profiles: rpcData.timeslots, // Using timeslots as profiles for now
    // Keep original structure for compatibility
    raceDay: rpcData.raceDay,
    practiceItems: rpcData.practiceItems,
    timeslots: rpcData.timeslots,
    uiTexts: rpcData.uiTexts
  };
}

/**
 * Validate configuration structure
 * @param {object} config - Configuration object to validate
 * @throws {Error} If configuration is invalid
 */
function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid configuration: not an object');
  }
  
  const requiredFields = [
    'config_version',
    'event',
    'divisions',
    'packages',
    'race_day_items',
    'practice',
    'profiles'
  ];
  
  for (const field of requiredFields) {
    if (!(field in config)) {
      throw new Error(`Invalid configuration: missing field '${field}'`);
    }
  }
  
  // Validate event object
  if (!config.event || !config.event.event_short_ref) {
    throw new Error('Invalid configuration: event object missing or invalid');
  }
  
  return true;
}

/**
 * Load event configuration from Supabase RPC
 * @param {string} eventShortRef - Event short reference
 * @returns {Promise<object>} Configuration object
 */
async function fetchConfigFromDatabase(eventShortRef) {
  try {
    console.log(`Fetching configuration for event: ${eventShortRef}`);
    
    // Try RPC function first
    try {
      const { data, error } = await sb.rpc('rpc_load_event_config', {
        p_event_short_ref: eventShortRef
      });
      
      if (error) {
        throw new Error(`RPC error: ${error.message}`);
      }
      
      if (!data) {
        throw new Error(`No configuration found for event: ${eventShortRef}`);
      }
      
      // Transform the data to match expected structure
      const transformedData = transformConfigData(data);
      
      // Validate the configuration structure
      validateConfig(transformedData);
      
      console.log(`Configuration loaded for event: ${eventShortRef}`);
      return transformedData;
    } catch (rpcError) {
      console.warn('RPC function failed, trying direct queries:', rpcError.message);
      
      // Fallback: query tables directly
      return await fetchConfigFromTables(eventShortRef);
    }
  } catch (error) {
    console.error(`Failed to fetch configuration for ${eventShortRef}:`, error);
    throw error;
  }
}

/**
 * Fallback: Load configuration by querying tables directly
 * @param {string} eventShortRef - Event short reference
 * @returns {Promise<object>} Configuration object
 */
async function fetchConfigFromTables(eventShortRef) {
  console.log(`Fetching configuration from tables for event: ${eventShortRef}`);
  
  // Query event config
  const { data: eventData, error: eventError } = await sb
    .from('annual_event_config')
    .select('*')
    .eq('event_short_ref', eventShortRef)
    .eq('form_enabled', true)
    .single();
    
  if (eventError || !eventData) {
    throw new Error(`Event not found or not enabled: ${eventShortRef}`);
  }
  
  // Query divisions
  const { data: divisionsData } = await sb
    .from('division')
    .select('*')
    .eq('event_short_ref', eventShortRef)
    .eq('active', true);
    
  // Query packages
  const { data: packagesData } = await sb
    .from('package')
    .select('*')
    .eq('event_short_ref', eventShortRef)
    .eq('active', true);
    
  // Query race day items
  const { data: raceDayData } = await sb
    .from('race_day_item')
    .select('*')
    .eq('event_short_ref', eventShortRef)
    .eq('active', true);
    
  // Query practice items
  const { data: practiceData } = await sb
    .from('practice_item')
    .select('*')
    .eq('event_short_ref', eventShortRef)
    .eq('active', true);
    
  // Query timeslots
  const { data: timeslotsData } = await sb
    .from('timeslot')
    .select('*')
    .eq('event_short_ref', eventShortRef)
    .eq('active', true);
    
  // Build config object
  const config = {
    config_version: eventData.config_version || 1,
    event: eventData,
    fields: {}, // TODO: Add field definitions
    labels: {}, // TODO: Add label definitions
    limits: {}, // TODO: Add limit definitions
    divisions: divisionsData || [],
    packages: packagesData || [],
    race_day_items: raceDayData || [],
    practice: practiceData || [],
    profiles: timeslotsData || [],
    // Keep original structure for compatibility
    raceDay: raceDayData || [],
    practiceItems: practiceData || [],
    timeslots: timeslotsData || [],
    uiTexts: []
  };
  
  // Validate the configuration structure
  validateConfig(config);
  
  console.log(`Configuration loaded from tables for event: ${eventShortRef}`);
  return config;
}

/**
 * Load event configuration with caching support
 * @param {string} eventShortRef - Event short reference (e.g., "TN2025")
 * @param {object} options - Configuration options
 * @param {boolean} options.useCache - Whether to use cached data (default: true)
 * @returns {Promise<object>} Configuration object
 */
export async function loadEventConfig(eventShortRef, { useCache = true } = {}) {
  if (!eventShortRef) {
    throw new Error('eventShortRef is required');
  }
  
  // Map event references to database format
  let dbEventRef = eventShortRef;
  if (eventShortRef === 'tn') {
    dbEventRef = 'TN2025';
  } else if (eventShortRef === 'wu') {
    dbEventRef = 'WU2025';
  } else if (eventShortRef === 'sc') {
    dbEventRef = 'SC2025';
  }
  
  console.log(`🔗 Config Loader: Loading configuration for event: ${eventShortRef} (useCache: ${useCache})`);
  
  // Try to use cached data if requested
  if (useCache) {
    const cached = readFromCache(eventShortRef);
    if (cached) {
      console.log(`🔗 Config Loader: Using cached configuration for event: ${eventShortRef}`);
      
      // Set global configuration
      window.__CONFIG = cached.config;
      
      return cached.config;
    }
  }
  
  // Fetch from database
  const config = await fetchConfigFromDatabase(dbEventRef);
  
  // Cache the configuration
  writeToCache(eventShortRef, config);
  
  // Set global configuration
  window.__CONFIG = config;
  
  console.log(`Configuration loaded and cached for event: ${eventShortRef}`);
  return config;
}

/**
 * Clear configuration cache for a specific event
 * @param {string} eventShortRef - Event short reference
 */
export function clearConfigCache(eventShortRef) {
  if (!eventShortRef) {
    throw new Error('eventShortRef is required');
  }
  
  try {
    const cacheKey = getCacheKey(eventShortRef);
    localStorage.removeItem(cacheKey);
    console.log(`Cache cleared for event: ${eventShortRef}`);
  } catch (error) {
    console.warn(`Failed to clear cache for ${eventShortRef}:`, error);
  }
}

/**
 * Clear all configuration caches
 */
export function clearAllConfigCaches() {
  try {
    const keys = Object.keys(localStorage);
    const configKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    
    configKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log(`Cleared ${configKeys.length} configuration caches`);
  } catch (error) {
    console.warn('Failed to clear all caches:', error);
  }
}

/**
 * Get cache information for debugging
 * @param {string} eventShortRef - Event short reference
 * @returns {object|null} Cache information or null
 */
export function getCacheInfo(eventShortRef) {
  if (!eventShortRef) return null;
  
  try {
    const cacheKey = getCacheKey(eventShortRef);
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    const now = Date.now();
    const age = now - parsed.timestamp;
    const isExpired = age > CACHE_TTL_MS;
    
    return {
      eventShortRef: parsed.eventShortRef,
      config_version: parsed.config_version,
      timestamp: parsed.timestamp,
      age: age,
      ageFormatted: formatDuration(age),
      isExpired: isExpired,
      isValid: !isExpired
    };
  } catch (error) {
    console.warn('Failed to get cache info:', error);
    return null;
  }
}

/**
 * Format duration in milliseconds to human readable string
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Export default function for convenience
export default loadEventConfig;
