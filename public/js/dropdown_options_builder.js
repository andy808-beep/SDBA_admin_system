/**
 * Dropdown Options Builder for WU/SC Entry Groups
 * 
 * Builds dropdown options by joining divisions with packages.
 * 100% config-driven - no hardcoded values.
 * 
 * @module DropdownOptionsBuilder
 */

/**
 * Builds dropdown options by joining divisions with packages
 * 100% config-driven - no hardcoded values
 * 
 * @param {Object} cfg - Config object with divisions and packages arrays
 * @param {string} lang - Language code: 'en' or 'tc' (default: 'en')
 * @returns {Array} Dropdown options ready for <select>
 */
function buildEntryGroupOptions(cfg, lang = 'en') {
  if (!cfg?.divisions || !cfg?.packages) {
    console.error('DropdownOptionsBuilder: Missing divisions or packages in config', {
      hasDivisions: !!cfg?.divisions,
      hasPackages: !!cfg?.packages
    });
    return [];
  }

  // Build a map of boat_type -> price from packages
  // Key: title_en (e.g., "Standard Boat")
  // Value: { price, title_en, title_tc, sort_order }
  const packageMap = new Map();
  for (const pkg of cfg.packages) {
    // Skip inactive packages (check both is_active and show_on_app_form)
    if (pkg.is_active === false) continue;
    
    // Filter out "By Invitation" packages (they don't have standard pricing)
    if (pkg.title_en === 'By Invitation') continue;
    
    packageMap.set(pkg.title_en, {
      price: pkg.listed_unit_price || 0,
      title_en: pkg.title_en,
      title_tc: pkg.title_tc || pkg.title_en,
      sort_order: pkg.sort_order || 0
    });
  }

  if (packageMap.size === 0) {
    console.warn('DropdownOptionsBuilder: No active packages found');
    return [];
  }

  // Build dropdown options from divisions
  const options = [];
  
  for (const div of cfg.divisions) {
    // Skip inactive divisions
    if (div.is_active === false) continue;
    
    // Skip invitation-only divisions (they're handled separately)
    if (div.by_invitation_only === true) continue;
    
    // Extract boat type from division name
    // "Standard Boat – Men" → "Standard Boat"
    const nameEn = div.name_en || '';
    const nameTc = div.name_tc || '';
    
    // Handle divisions that might not have the " – " separator
    const boatTypeEn = nameEn.includes(' – ') 
      ? nameEn.split(' – ')[0].trim()
      : nameEn.trim();
    
    // Find matching package for price
    const pkg = packageMap.get(boatTypeEn);
    if (!pkg) {
      // Skip divisions that don't have a matching package
      // (e.g., special invitation divisions)
      continue;
    }
    
    // Exclude special invitation divisions by checking for keywords
    const specialKeywords = [
      'Hong Kong Youth Group',
      'Disciplinary Forces',
      'Post-Secondary',
      'HKU Invitational'
    ];
    
    if (specialKeywords.some(keyword => nameEn.includes(keyword))) {
      continue;
    }
    
    // Build the option
    options.push({
      value: div.division_code,                    // "WM" - for submission
      label_en: nameEn,                            // "Standard Boat – Men"
      label_tc: nameTc || nameEn,                  // "標準龍 – 男子"
      price: pkg.price,                            // 4600
      boat_type_en: boatTypeEn,                    // "Standard Boat"
      boat_type_tc: pkg.title_tc,                  // "標準龍"
      division_code: div.division_code,            // "WM"
      sort_order: (pkg.sort_order * 100) + (div.sort_order || 0)  // Sort by boat type, then division
    });
  }
  
  // Sort options by sort_order
  options.sort((a, b) => a.sort_order - b.sort_order);
  
  return options;
}

/**
 * Format option for display in dropdown
 * @param {Object} option - Option from buildEntryGroupOptions
 * @param {string} lang - 'en' or 'tc'
 * @returns {string} Formatted display string
 */
function formatOptionLabel(option, lang = 'en') {
  const label = lang === 'tc' ? option.label_tc : option.label_en;
  const priceFormatted = option.price.toLocaleString('en-US');
  return `${label} - HK$${priceFormatted}`;
}

/**
 * Get boat type from division name (helper function)
 * @param {string} divisionName - Full division name (e.g., "Standard Boat – Men")
 * @returns {string} Boat type (e.g., "Standard Boat")
 */
function extractBoatTypeFromDivision(divisionName) {
  if (!divisionName) return '';
  return divisionName.includes(' – ') 
    ? divisionName.split(' – ')[0].trim()
    : divisionName.trim();
}

// Export for use in other files
window.DropdownOptionsBuilder = {
  buildEntryGroupOptions,
  formatOptionLabel,
  extractBoatTypeFromDivision
};

