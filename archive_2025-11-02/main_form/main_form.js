import { loadEventConfig } from './configloader.js';
import { sb } from './supabase_config.js'; // or wherever you create the client

const money = (n) => (Number.isFinite(n) ? `HK$${Number(n).toLocaleString()}` : "");
const catToLetter = (cat) => ({ men_open:"M", ladies_open:"L", mixed_open:"X", mixed_corporate:"C" }[String(cat||"").trim()] || null);
const derivePackageCode = (category, opt) => {
  const corp = category === "mixed_corporate";
  const tier = opt === "opt1" ? "option_1" : "option_2";
  return corp ? `${tier}_corp` : `${tier}_non_corp`;
};
const getUIText = (screen, key, fallback="") => {
  const list = window.__CONFIG?.uiTexts || [];
  const hit = list.find(t => t.screen===screen && t.key===key);
  return hit?.text_en || fallback;
};

(async () => {
  const params = new URLSearchParams(location.search);
  const eventShortRef = params.get('event') || 'TN2025'; // pick your default

  const disableInteractive = (message) => {
    const div = document.createElement('div');
    div.style.cssText = 'background:#fff3cd;color:#856404;padding:8px;margin:8px 0;border:1px solid #ffeeba;font-size:14px';
    div.textContent = message || 'We’re updating race settings. Please try again in a moment.';
    document.body.prepend(div);

    // Disable common interactive elements
    const disable = (el) => {
      if ('disabled' in el) el.disabled = true;
      el.classList?.add('disabled');
      el.setAttribute?.('aria-disabled', 'true');
      el.style.pointerEvents = 'none';
      el.style.opacity = '0.6';
    };
    document.querySelectorAll(
      'button, [type="submit"], [type="button"], [type="reset"], input, select, textarea, .btn-next, .btn-submit, a.button, a.btn'
    ).forEach(disable);
  };

  try {
    const cfg = await loadEventConfig({ eventShortRef, supabase: sb, useCache: true });

    // Ensure window.__CONFIG exists and includes event_short_ref
    window.__CONFIG = Object.assign({}, window.__CONFIG || {}, cfg, {
      event: { ...(cfg?.event || {}), event_short_ref: eventShortRef }
    });

    // Optional theming hook (no-op if not provided)
    if (window.__CONFIG?.event?.event_colour_code_hex) {
      document.documentElement.style.setProperty(
        '--event-accent',
        window.__CONFIG.event.event_colour_code_hex
      );
    }

    // Feature flag: form disabled
    if (window.__CONFIG?.event?.form_enabled === false) {
      const msg = window.__CONFIG?.event?.banner_text_en
               || window.__CONFIG?.event?.disabled_message
               || 'This form is not accepting submissions at the moment.';
      disableInteractive(msg);
      document.dispatchEvent(new CustomEvent('config:ready', { detail: { eventShortRef, disabled: true } }));
      return;
    }
    if (window.__CONFIG?.event?.event_colour_code_hex) {
      const hex = window.__CONFIG.event.event_colour_code_hex;
      document.documentElement.style.setProperty('--event-accent', hex);
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
      meta.content = `#${hex.replace(/^#/, '')}`;
    }
    

    // Config OK and form enabled → notify pages to initialize
    document.dispatchEvent(new CustomEvent('config:ready', { detail: { eventShortRef, disabled: false } }));
  } catch (err) {
    console.error('Config load failed', err);
    disableInteractive('We’re updating race settings. Please try again in a moment.');
    document.dispatchEvent(new CustomEvent('config:ready', { detail: { eventShortRef, disabled: true } }));
  }
})();


// ---------- Auth helper ----------
export async function requireAuth() {
  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) {
    console.error("Auth error:", error);
    // Optional: route to login page if not logged in
    // window.location.href = "/Auth/index2.html";
    throw new Error("Not authenticated");
  }
  return data.user;
}

// ---------- Page router ----------
// ---- Page boot gating: wait for DOM + config ----
async function bootPage(initFn) {
  // Wait for DOM
  if (document.readyState === 'loading') {
    await new Promise(res => document.addEventListener('DOMContentLoaded', res, { once: true }));
  }
  // Wait for config if not ready yet
  const cfgReady = !!(window.__CONFIG && window.__CONFIG.event);
  if (!cfgReady) {
    await new Promise(res => document.addEventListener('config:ready', res, { once: true }));
  }
  // Init
  try { initFn(); } catch (e) { console.error('Page init failed:', e); }
}

// ---- Router (event-aware) ----
const path = window.location.pathname;
const page = path.substring(path.lastIndexOf('/') + 1);

switch (page) {
  case '1_category.html':
    bootPage(initRaceCategoryPage);
    break;
  case '2_teaminfo.html':
    bootPage(initTeamInfoPage);
    break;
  case '3_raceday.html':
    bootPage(initRaceDayPage);
    break;
  case '4_booking.html':
    bootPage(initBookingPage);
    break;
  case '5_summary.html':
    bootPage(initSummaryPage);
    break;
  // Add more cases for new pages...
}




/* ------------------------
   PAGE 1: Category + Options
------------------------- */
function initRaceCategoryPage() {
  const categorySelect = document.getElementById("raceCategory");
  const teamCountInput = document.getElementById("teamCount");
  const opt1Count = document.getElementById("opt1Count");
  const opt2Count = document.getElementById("opt2Count");
  const msg = document.getElementById("formMsg");
  const opt1PriceDisplay = document.getElementById("opt1Price");
  const opt2PriceDisplay = document.getElementById("opt2Price");
  const entryOptionsSection = document.getElementById("entryOptions");
  function isCorporate(cat) {
    return String(cat || '').trim() === 'mixed_corporate';
  }
  function packageCodeFor(option, cat) {
    const corp = isCorporate(cat);
    if (option === 'opt1') return corp ? 'option_1_corp' : 'option_1_non_corp';
    if (option === 'opt2') return corp ? 'option_2_corp' : 'option_2_non_corp';
    return null;
  }
  function getPackagePrice(option, cat) {
    const code = packageCodeFor(option, cat);
    const pkg = (window.__CONFIG?.packages || []).find(p => p.package_code === code);
    return pkg?.listed_unit_price ?? null;
  }
  
  // Helper functions for config binding
  function derivePackageCode(category, option) {
    return packageCodeFor(option, category);
  }
  function money(price) {
    return price != null ? `HK$${price}` : '';
  }
  function updatePackageDisplay(category) {
    const code1 = derivePackageCode(category, "opt1");
    const code2 = derivePackageCode(category, "opt2");
    const pkgs = window.__CONFIG?.packages || [];
    const p1 = pkgs.find(p => p.package_code === code1);
    const p2 = pkgs.find(p => p.package_code === code2);
    
    opt1PriceDisplay.textContent = p1 ? money(p1.listed_unit_price) : '';
    opt2PriceDisplay.textContent = p2 ? money(p2.listed_unit_price) : '';
    
    // Update option labels if elements exist
    const opt1Label = document.getElementById("opt1Label");
    const opt2Label = document.getElementById("opt2Label");
    if (opt1Label) opt1Label.textContent = p1?.title_en ?? "Option I";
    if (opt2Label) opt2Label.textContent = p2?.title_en ?? "Option II";
    
    console.log("Page1:", p1 && p2 ? "live prices" : "fallback");
  }

  // --- 🧠 Restore previous selections if available ---
  const savedCategory = localStorage.getItem("race_category");
  const savedNumTeams = localStorage.getItem("num_teams");
  const savedOpt1     = localStorage.getItem("num_teams_opt1");
  const savedOpt2     = localStorage.getItem("num_teams_opt2");

  if (savedCategory) {
    categorySelect.value = savedCategory;
    updatePackageDisplay(savedCategory);
    entryOptionsSection.hidden = false;
  }

  if (savedNumTeams) teamCountInput.value = savedNumTeams;
  if (savedOpt1)      opt1Count.value = savedOpt1;
  if (savedOpt2)      opt2Count.value = savedOpt2;

  // --- Show/hide entry options based on category ---
  categorySelect.addEventListener("change", () => {
    const cat = categorySelect.value;

    if (cat) {
      updatePackageDisplay(cat);
      entryOptionsSection.hidden = false;
    } else {
      entryOptionsSection.hidden = true;
      opt1PriceDisplay.textContent = "";
      opt2PriceDisplay.textContent = "";
      opt1Count.value = 0;
      opt2Count.value = 0;
    }
    msg.textContent = "";
  });

  // --- Form submission ---
  const form = document.getElementById("categoryForm");
  form.onsubmit = (e) => {
    e.preventDefault();
    const cat = categorySelect.value;
    const numTeams = parseInt(teamCountInput.value, 10);
    const numOpt1 = parseInt(opt1Count.value, 10) || 0;
    const numOpt2 = parseInt(opt2Count.value, 10) || 0;

    if (!cat) {
      msg.textContent = "Please select a category.";
      msg.style.color = "red";
      return;
    }

    if (!Number.isInteger(numTeams) || numTeams < 1) {
      msg.textContent = "Please enter a valid number of teams (≥ 1).";
      msg.style.color = "red";
      return;
    }

    if (numOpt1 < 0 || numOpt2 < 0) {
      msg.textContent = "Option counts cannot be negative.";
      msg.style.color = "red";
      return;
    }

    if ((numOpt1 + numOpt2) !== numTeams) {
      msg.textContent = `Please provide entry option(s) for ${numTeams} team(s).`;
      msg.style.color = "red";
      return;
    }

    // Save values to localStorage
    localStorage.setItem("race_category", cat);
    localStorage.setItem("num_teams", String(numTeams));
    localStorage.setItem("num_teams_opt1", String(numOpt1));
    localStorage.setItem("num_teams_opt2", String(numOpt2));
    localStorage.setItem("team_submission_loop", "0");

    window.location.href = "2_teaminfo.html";
  };
}

/* ------------------------
   PAGE 2: Team Info (with de‑dup + entry option)
------------------------- */
function initTeamInfoPage() {
  // UI text binding from config
  const uiTexts = window.__CONFIG?.uiTexts || [];
  const getUIText = (screen, key, fallback) => {
    const text = uiTexts.find(t => t.screen === screen && t.key === key);
    return text?.text_en || fallback;
  };
  
  // Update labels and title from config
  const orgNameLabel = document.querySelector('label[for="orgName"]');
  if (orgNameLabel) {
    orgNameLabel.textContent = getUIText('p2_teaminfo', 'label_org_name', 'Organization / Group Name');
  }
  
  const addressLabel = document.querySelector('label[for="mailingAddress"]');
  if (addressLabel) {
    addressLabel.textContent = getUIText('p2_teaminfo', 'label_address', 'Mailing Address');
  }
  
  const titleEl = document.querySelector('#p2_title');
  if (titleEl) {
    titleEl.textContent = getUIText('p2_teaminfo', 'title', 'Team & Organization Info');
  }

  const form = document.getElementById("teamInfoForm");
  const container = document.getElementById("teamNameFields");
  const managerContainer = document.getElementById("managerFields");
  const msg = document.getElementById("formMsg");
  const backBtn = document.getElementById("backBtn");
  const nextBtn = document.getElementById("nextBtn");

  const numTeams = parseInt(localStorage.getItem("num_teams") || "1");

  if (!numTeams || isNaN(numTeams) || numTeams < 1) {
    msg.textContent = "Invalid team count. Please restart from page 1.";
    msg.style.color = "red";
    form.querySelector("button[type='submit']").disabled = true;
    return;
  }

  const savedOrgName  = localStorage.getItem("org_name") || "";
  const savedAddress  = localStorage.getItem("org_address") || "";
  const savedNames    = JSON.parse(localStorage.getItem("team_names") || "[]");
  const savedOptions  = JSON.parse(localStorage.getItem("team_options") || "[]");
  const savedManagers = JSON.parse(localStorage.getItem("managers") || "[]");

  // Restore org name and address
  if (form["orgName"])         form["orgName"].value = savedOrgName;
  if (form["mailingAddress"])  form["mailingAddress"].value = savedAddress;

  function normalizeName(s) {
    return (s || "")
      .normalize("NFKC")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function validateUniqueTeamNames() {
    const inputs = [...container.querySelectorAll('input[id^="teamName"]')];
    const seen = new Map();
    const dupSet = new Set();

    for (const inp of inputs) {
      inp.classList.remove("dup-error");
      const hint = inp.parentElement.querySelector(".small-hint");
      if (hint) hint.remove();
    }

    for (const inp of inputs) {
      const norm = normalizeName(inp.value);
      if (!norm) continue;
      if (seen.has(norm)) {
        dupSet.add(inp);
        dupSet.add(seen.get(norm));
      } else {
        seen.set(norm, inp);
      }
    }

    for (const inp of dupSet) {
      inp.classList.add("dup-error");
      const hint = document.createElement("div");
      hint.className = "small-hint";
      hint.textContent = "Duplicate team name — please choose a unique name.";
      inp.parentElement.appendChild(hint);
    }

    if (dupSet.size > 0) {
      msg.textContent = "Duplicate team names detected. Please make each team name unique.";
      msg.style.color = "red";
      if (nextBtn) nextBtn.disabled = true;
      return false;
    } else {
      if (msg.textContent.includes("Duplicate team names")) msg.textContent = "";
      if (nextBtn) nextBtn.disabled = false;
      return true;
    }
  }

  for (let i = 1; i <= numTeams; i++) {
    const group = document.createElement("div");
    group.className = "form-group";

    const label = document.createElement("label");
    label.setAttribute("for", `teamName${i}`);
    label.textContent = `Team ${i} Name`;

    const input = document.createElement("input");
    input.type = "text";
    input.id = `teamName${i}`;
    input.name = `teamName${i}`;
    input.placeholder = `Enter name for Team ${i}`;
    input.required = true;
    input.value = savedNames[i - 1] || "";

    ["input", "change", "blur"].forEach(evt =>
      input.addEventListener(evt, validateUniqueTeamNames)
    );

    const optLabel = document.createElement("label");
    optLabel.setAttribute("for", `teamOption${i}`);
    optLabel.textContent = "Entry Option:";

    const optSelect = document.createElement("select");
    optSelect.id = `teamOption${i}`;
    optSelect.name = `teamOption${i}`;
    optSelect.required = true;

    const opt1 = document.createElement("option");
    opt1.value = "opt1";
    opt1.textContent = window.__CONFIG?.packages?.labels?.opt1 || "Option 1";
    const opt2 = document.createElement("option");
    opt2.value = "opt2";
    opt2.textContent = window.__CONFIG?.packages?.labels?.opt2 || "Option 2";

    optSelect.appendChild(opt1);
    optSelect.appendChild(opt2);

    optSelect.value = savedOptions[i - 1] || "opt1";

    group.appendChild(label);
    group.appendChild(input);
    group.appendChild(optLabel);
    group.appendChild(optSelect);
    container.appendChild(group);
  }

  for (let i = 1; i <= 3; i++) {
    const group = document.createElement("div");
    group.className = "form-group";

    const heading = document.createElement("p");
    heading.innerHTML = `<strong>Manager ${i}${i === 3 ? " (optional)" : ""}</strong>`;
    group.appendChild(heading);

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.name = `manager${i}_name`;
    nameInput.placeholder = getUIText('p2_teaminfo', 'placeholder_name', 'Full Name');
    nameInput.required = i < 3;
    nameInput.value = savedManagers[i - 1]?.name || "";

    const mobileInput = document.createElement("input");
    mobileInput.type = "tel";
    mobileInput.name = `manager${i}_mobile`;
    mobileInput.placeholder = getUIText('p2_teaminfo', 'placeholder_mobile', 'Mobile Number');
    mobileInput.required = i < 3;
    mobileInput.value = savedManagers[i - 1]?.mobile || "";

    const emailInput = document.createElement("input");
    emailInput.type = "email";
    emailInput.name = `manager${i}_email`;
    emailInput.placeholder = getUIText('p2_teaminfo', 'placeholder_email', 'Email Address');
    emailInput.required = i < 3;
    emailInput.value = savedManagers[i - 1]?.email || "";

    group.appendChild(nameInput);
    group.appendChild(mobileInput);
    group.appendChild(emailInput);
    managerContainer.appendChild(group);
  }

  validateUniqueTeamNames();

  backBtn.addEventListener("click", () => {
    window.location.href = "1_category.html";
  });

  form.onsubmit = (e) => {
    e.preventDefault();

    const orgName = form["orgName"].value.trim();
    const mailingAddress = form["mailingAddress"].value.trim();
    const teamNames = {};
    const teamOptions = [];
    const managers = [];

    if (!orgName) {
      msg.textContent = "Please enter your organization or group name.";
      msg.style.color = "red";
      return;
    }
    if (!mailingAddress) {
      msg.textContent = "Please enter your mailing address.";
      msg.style.color = "red";
      return;
    }

    for (let i = 1; i <= numTeams; i++) {
      const input = form[`teamName${i}`];
      const raw = input.value.trim();
      if (!raw) {
        msg.textContent = `Please enter a name for Team ${i}.`;
        msg.style.color = "red";
        input.focus();
        return;
      }
    }

    if (!validateUniqueTeamNames()) return;

    for (let i = 1; i <= numTeams; i++) {
      const input = form[`teamName${i}`];
      const display = input.value.trim().replace(/\s+/g, " ");
      teamNames[`team${i}`] = display;

      const opt = form[`teamOption${i}`]?.value || "opt1";
      teamOptions.push(opt);
    }

    for (let i = 1; i <= 3; i++) {
      const name = form[`manager${i}_name`]?.value.trim() || "";
      const mobile = form[`manager${i}_mobile`]?.value.trim() || "";
      const email = form[`manager${i}_email`]?.value.trim() || "";
      managers.push({ name, mobile, email });
    }

    localStorage.setItem("org_name", orgName);
    localStorage.setItem("org_address", mailingAddress);
    localStorage.setItem("team_names", JSON.stringify(Object.values(teamNames)));
    localStorage.setItem("team_options", JSON.stringify(teamOptions));
    localStorage.setItem("managers", JSON.stringify(managers));
    localStorage.setItem("team_submission_loop", "0");

    window.location.href = "3_raceday.html";
  };
}


/* ------------------------
   PAGE 3: Race Day Arrangement
------------------------- */
function initRaceDayPage() {
  const form = document.getElementById("raceDayForm");
  const msg = document.getElementById("formMsg");

  // Config binding for race day items
  const items = window.__CONFIG?.raceDay || [];
  const getItem = (code) => items.find(i => i.item_code === code);
  
  const boundItems = [];
  const fallbackItems = [];

  // Update race day items with config data
  const updateRaceDayItem = (itemCode, titleId, priceId, qtyId) => {
    const item = getItem(itemCode);
    if (item) {
      const titleEl = document.getElementById(titleId);
      const priceEl = document.getElementById(priceId);
      const qtyEl = document.getElementById(qtyId);
      
      if (titleEl) titleEl.textContent = item.title_en || titleEl.textContent;
      if (priceEl) priceEl.textContent = item.listed_unit_price ? `HK$${item.listed_unit_price}` : priceEl.textContent;
      if (qtyEl) {
        if (item.min_qty != null) qtyEl.min = item.min_qty;
        if (item.max_qty != null) qtyEl.max = item.max_qty;
      }
      boundItems.push(itemCode);
    } else {
      fallbackItems.push(itemCode);
    }
  };

  // Bind each race day item
  updateRaceDayItem('rd_marquee', 'marqueeTitle', 'marqueePrice', 'marqueeQty');
  updateRaceDayItem('rd_steerer', 'steerWithTitle', 'steerWithPrice', 'steerWithQty');
  updateRaceDayItem('rd_steerer_no_practice', 'steerWithoutTitle', 'steerWithoutPrice', 'steerWithoutQty');
  updateRaceDayItem('rd_junk', 'junkTitle', 'junkPrice', 'junkBoatQty');
  updateRaceDayItem('rd_speedboat', 'speedTitle', 'speedPrice', 'speedboatQty');
  
  console.log("RaceDay items bound:", boundItems, "fallback:", fallbackItems);

  // Back button
  document.getElementById("backBtn").addEventListener("click", () => {
    window.location.href = "2_teaminfo.html";
  });

  // helper: coerce to non-negative integer
  const toNNInt = (v) => {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  form.onsubmit = (e) => {
    e.preventDefault();

    const data = {
      marqueeQty: parseInt(form["marqueeQty"].value) || 0,
      steerWithQty: parseInt(form["steerWithQty"].value) || 0,
      steerWithoutQty: parseInt(form["steerWithoutQty"].value) || 0,
      junkBoatNo: form["junkBoatNo"].value.trim(),
      junkBoatQty: parseInt(form["junkBoatQty"].value) || 0,
      speedBoatNo: form["speedBoatNo"].value.trim(),
      speedboatQty: parseInt(form["speedboatQty"].value) || 0,
    };

    localStorage.setItem("race_day_arrangement", JSON.stringify(data));
    window.location.href = "4_booking.html";
  };
}

/* ------------------------
   PAGE 4: Practice Booking (stores compact practiceData)
------------------------- */
function initBookingPage() {
  // Config binding for practice booking
  const start = window.__CONFIG?.event?.practice_start_date;
  const end = window.__CONFIG?.event?.practice_end_date;
  const slots = window.__CONFIG?.timeslots || [];
  const pi = window.__CONFIG?.practiceItems || [];
  
  let configStatus = "fallback";
  
  // Update practice window header if dates available
  if (start && end) {
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      const startStr = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const endStr = endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const headerEl = document.querySelector('h2');
      if (headerEl && headerEl.textContent.includes('Practice Booking')) {
        headerEl.textContent = `🛶 Practice Booking (${startStr}–${endStr})`;
      }
    } catch (e) {
      console.warn('Invalid practice dates in config:', e);
    }
  }
  
  // Helper to fill timeslot selects
  const fill = (selectEl, hours) => {
    if (!selectEl) return;
    const filteredSlots = slots.filter(s => s.duration_hours === hours);
    if (filteredSlots.length > 0) {
      const currentValue = selectEl.value;
      selectEl.innerHTML = '<option value="">-- Select --</option>';
      filteredSlots.forEach(slot => {
        const option = document.createElement('option');
        option.value = slot.slot_code;
        option.textContent = slot.label;
        selectEl.appendChild(option);
      });
      if (currentValue) selectEl.value = currentValue;
    }
  };
  
  // Fill timeslot selects
  const timeslotSelects = [
    'slotPref2h_1', 'slotPref2h_2', 'slotPref2h_3',
    'slotPref1h_1', 'slotPref1h_2', 'slotPref1h_3'
  ];
  timeslotSelects.forEach(id => {
    const selectEl = document.getElementById(id);
    const hours = id.includes('2h') ? 2 : 1;
    fill(selectEl, hours);
  });
  
  // Update practice prices
  const updatePrice = (itemCode, elementId) => {
    const item = pi.find(p => p.item_code === itemCode);
    const priceEl = document.getElementById(elementId);
    if (item && priceEl) {
      priceEl.textContent = item.listed_unit_price ? `HK$${item.listed_unit_price}` : priceEl.textContent;
    }
  };
  
  updatePrice('extra_practice_hr_regular', 'priceExtraStd');
  updatePrice('extra_practice_sb_hr_regular', 'priceExtraSB');
  updatePrice('practice_trainer', 'priceTrainer');
  updatePrice('practice_steerer', 'priceSteersman');
  
  // Determine config status
  if (slots.length > 0 || pi.length > 0 || (start && end)) {
    configStatus = "live prices/timeslots";
  }
  console.log("Page4:", configStatus);

  const PRACTICE_YEAR = (function() {
    const ev = window.__CONFIG?.event || {};
    if (ev.practice_start_date) {
      try { return new Date(ev.practice_start_date).getFullYear(); } catch {}
    }
    if (typeof ev.season === 'number') return ev.season;
    return new Date().getFullYear();
  })();
  localStorage.setItem("practice_year", String(PRACTICE_YEAR));

  const calendarEl     = document.getElementById("calendarContainer");
  const totalHoursEl   = document.getElementById("totalHours");
  const trainerQtyEl   = document.getElementById("trainerQty");
  const steersmanQtyEl = document.getElementById("steersmanQty");
  const extraQtyEl     = document.getElementById("extraPracticeQty");
  const teamSelect     = document.getElementById("teamSelect");
  const teamNameFields = document.getElementById("teamNameFields");
  const msg            = document.getElementById("formMsg");

  let teamNames = [];
  try {
    teamNames = JSON.parse(localStorage.getItem("team_names")) || [];
  } catch (err) {
    console.warn("Invalid team_names in localStorage", err);
  }

  const selectedDatesPerTeam = {};
  let selectedDates = {};
  let selectedTeamIndex = 0;

  // Preload all practice data from localStorage
  teamNames.forEach((_, i) => {
    const raw = localStorage.getItem(`practiceData_team${i}`);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      selectedDatesPerTeam[i] = {};
      for (const { date, hours, helpers } of parsed.dates || []) {
        selectedDatesPerTeam[i][date] = { hours, helpers };
      }
    } catch (e) {
      console.warn(`Invalid practice data for team ${i}`, e);
    }
  });

  if (!teamNames.length) {
    teamSelect.innerHTML = `<option disabled>No teams found</option>`;
    teamNameFields.textContent = "";
  } else {
    teamNames.forEach((name, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = `Team ${i + 1}: ${name}`;
      teamSelect.appendChild(opt);
    });

    teamSelect.value = "0";
    teamNameFields.textContent = `Now scheduling: ${teamNames[0]}`;
  }

  teamSelect.addEventListener("change", () => {
    saveCurrentTeamData(); // 🔁 auto-save before switching team

    selectedTeamIndex = Number(teamSelect.value);
    selectedDates = { ...selectedDatesPerTeam[selectedTeamIndex] } || {};

    const teamName = teamNames[selectedTeamIndex] || `Team ${selectedTeamIndex + 1}`;
    teamNameFields.textContent = `Now scheduling: ${teamName}`;

    loadPracticeForTeam(selectedTeamIndex);
  });

  // 📋 Copy from Team 1
  document.getElementById("copyFromTeam1Btn").addEventListener("click", () => {
    const targetIndex = Number(teamSelect.value || "0");
    if (targetIndex === 0) return alert("You are already on Team 1.");

    const from = localStorage.getItem("practiceData_team0");
    if (!from) return alert("No practice data found for Team 1.");

    localStorage.setItem(`practiceData_team${targetIndex}`, from);
    location.reload(); // Simple fix to re-run init logic and UI rendering
  });

  function loadPracticeForTeam(index) {
    Object.keys(selectedDates).forEach(k => delete selectedDates[k]);
    Object.assign(selectedDates, selectedDatesPerTeam[index] || {});
    updateSummary();

    // Clear checkboxes & dropdowns
    document.querySelectorAll(".calendar-day input[type='checkbox']").forEach(cb => {
      cb.checked = false;
      cb.closest(".calendar-day").querySelector(".dropdowns")?.classList.add("hide");
    });

    for (const [date, { hours, helpers }] of Object.entries(selectedDates)) {
      const cb = document.querySelector(`input[data-date='${date}']`);
      if (!cb) continue;

      const cell = cb.closest(".calendar-day");
      const durationSel = cell.querySelector(".duration");
      const helpersSel  = cell.querySelector(".helpers");
      const dropdowns   = cell.querySelector(".dropdowns");

      cb.checked = true;
      dropdowns.classList.remove("hide");
      durationSel.value = String(hours || 1);
      helpersSel.value = helpers || "";
    }

    // Load slot preferences
    const raw = localStorage.getItem(`practiceData_team${index}`);
    if (!raw) return;
    let parsed;
    try { parsed = JSON.parse(raw); } catch {}
    const slotPrefs2 = parsed.slotPrefs_2hr || {};
    const slotPrefs1 = parsed.slotPrefs_1hr || {};
    for (let i = 1; i <= 3; i++) {
      document.getElementById(`slotPref2h_${i}`).value = slotPrefs2[`slot_pref_${i}`] || "";
      document.getElementById(`slotPref1h_${i}`).value = slotPrefs1[`slot_pref_${i}`] || "";
    }

    function saveCurrentTeamData() {
      const teamIndex = selectedTeamIndex;
      const datesArr = Object.entries(selectedDates).map(([date, v]) => ({
        date,
        hours: Number(v.hours) || 0,
        helpers: v.helpers || ""
      }));

      if (datesArr.length === 0) return;

      localStorage.setItem(`practiceData_team${teamIndex}`, JSON.stringify({
        dates: datesArr,
        trainerQty: Number(trainerQtyEl.textContent) || 0,
        steersmanQty: Number(steersmanQtyEl.textContent) || 0,
        extraPracticeQty: Number(extraQtyEl.textContent) || 0,
        slotPrefs_2hr: {
          slot_pref_1: document.getElementById("slotPref2h_1")?.value || "",
          slot_pref_2: document.getElementById("slotPref2h_2")?.value || "",
          slot_pref_3: document.getElementById("slotPref2h_3")?.value || ""
        },
        slotPrefs_1hr: {
          slot_pref_1: document.getElementById("slotPref1h_1")?.value || "",
          slot_pref_2: document.getElementById("slotPref1h_2")?.value || "",
          slot_pref_3: document.getElementById("slotPref1h_3")?.value || ""
        }
      }));
}

    updateSummary();
  }

  function renderCalendar() {
    calendarEl.innerHTML = "";

    for (let month = 0; month < 7; month++) {
      const monthDate = new Date(PRACTICE_YEAR, month, 1);
      const monthName = monthDate.toLocaleString("default", { month: "long" });

      const monthBox = document.createElement("div");
      monthBox.className = "month-block";

      const header = document.createElement("h3");
      header.className = "month-toggle";
      header.textContent = `${monthName} ${PRACTICE_YEAR}`;

      const monthContent = document.createElement("div");
      monthContent.className = "month-content";

      const weekdaysRow = document.createElement("div");
      weekdaysRow.className = "weekdays";
      weekdaysRow.innerHTML = `
        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div>
        <div>Thu</div><div>Fri</div><div>Sat</div>
      `;

      const grid = document.createElement("div");
      grid.className = "month-grid";

      header.addEventListener("click", () => {
        monthContent.classList.toggle("hide");
      });

      if (month === 0) monthContent.classList.remove("hide");
      else monthContent.classList.add("hide");

      monthContent.appendChild(weekdaysRow);
      monthContent.appendChild(grid);
      monthBox.appendChild(header);
      monthBox.appendChild(monthContent);
      calendarEl.appendChild(monthBox);

      const daysInMonth = new Date(PRACTICE_YEAR, month + 1, 0).getDate();
      const firstDay = new Date(PRACTICE_YEAR, month, 1).getDay();
      for (let i = 0; i < firstDay; i++) {
        const pad = document.createElement("div");
        pad.className = "calendar-day empty";
        grid.appendChild(pad);
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(PRACTICE_YEAR, month, day);
        const dateStr = dateObj.toISOString().split("T")[0];

        const cell = document.createElement("div");
        cell.className = "calendar-day";
        cell.innerHTML = `
          <label>
            <input type="checkbox" data-date="${dateStr}" />
            ${day}
          </label>
          <div class="dropdowns hide">
            <select class="duration">
              <option value="1">1h</option>
              <option value="2">2h</option>
            </select>
            <select class="helpers">
              <option value="">None</option>
              <option value="S">S</option>
              <option value="T">T</option>
              <option value="ST">ST</option>
            </select>
          </div>
        `;

        const checkbox = cell.querySelector("input[type='checkbox']");
        const dropdowns = cell.querySelector(".dropdowns");
        const durationSel = cell.querySelector(".duration");
        const helpersSel = cell.querySelector(".helpers");

        checkbox.addEventListener("change", () => {
          if (checkbox.checked) {
            dropdowns.classList.remove("hide");
            selectedDates[dateStr] = {
              hours: parseInt(durationSel.value, 10) || 1,
              helpers: helpersSel.value || ""
            };
          } else {
            dropdowns.classList.add("hide");
            delete selectedDates[dateStr];
          }
          updateSummary();
        });

        durationSel.addEventListener("change", () => {
          if (checkbox.checked && selectedDates[dateStr]) {
            selectedDates[dateStr].hours = parseInt(durationSel.value, 10) || 1;
            updateSummary();
          }
        });

        helpersSel.addEventListener("change", () => {
          if (checkbox.checked && selectedDates[dateStr]) {
            selectedDates[dateStr].helpers = helpersSel.value || "";
            updateSummary();
          }
        });

        grid.appendChild(cell);
      }
    }
  }

  function updateSummary() {
    let total = 0, trainer = 0, steersman = 0;

    for (const { hours, helpers } of Object.values(selectedDates)) {
      total += Number(hours) || 0;
      if (helpers === "T") trainer++;
      if (helpers === "S") steersman++;
      if (helpers === "ST") { trainer++; steersman++; }
    }

    const extra = Math.max(0, total - 12);
    totalHoursEl.textContent   = String(total);
    trainerQtyEl.textContent   = String(trainer);
    steersmanQtyEl.textContent = String(steersman);
    extraQtyEl.textContent     = String(extra);
  }

  document.getElementById("nextBtn").addEventListener("click", () => {
    const teamIndex = Number(document.getElementById("teamSelect")?.value || "0");
    selectedDatesPerTeam[teamIndex] = { ...selectedDates };

    const datesArr = Object.entries(selectedDates).map(([date, v]) => ({
      date,
      hours: Number(v.hours) || 0,
      helpers: v.helpers || ""
    }));

    if (datesArr.length === 0) {
      msg.textContent = "You haven't selected any practice dates.";
      msg.style.color = "red";
      return;
    }

    localStorage.setItem(`practiceData_team${teamIndex}`, JSON.stringify({
      dates: datesArr,
      trainerQty: Number(trainerQtyEl.textContent) || 0,
      steersmanQty: Number(steersmanQtyEl.textContent) || 0,
      extraPracticeQty: Number(extraQtyEl.textContent) || 0,
      slotPrefs_2hr: {
        slot_pref_1: document.getElementById("slotPref2h_1")?.value || "",
        slot_pref_2: document.getElementById("slotPref2h_2")?.value || "",
        slot_pref_3: document.getElementById("slotPref2h_3")?.value || ""
      },
      slotPrefs_1hr: {
        slot_pref_1: document.getElementById("slotPref1h_1")?.value || "",
        slot_pref_2: document.getElementById("slotPref1h_2")?.value || "",
        slot_pref_3: document.getElementById("slotPref1h_3")?.value || ""
      }
    }));

    window.location.href = "5_summary.html";
  });

  document.getElementById("backBtn").addEventListener("click", () => {
    window.location.href = "3_raceday.html";
  });

  renderCalendar();
  loadPracticeForTeam(0);
}


/* ------------------------
   PAGE 5: Summary
------------------------- */

function initSummaryPage() {
  renderSummary();                      // ⬅️ show the review first
  const btn = document.getElementById("submitBtn");
  if (!btn) return;
  btn.onclick = onFinalSubmit;
}

// ---------- Summary rendering helpers ----------
function text(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? "—";
}

function renderSummary() {
  // Preload team arrays early
  const teamNamesArr   = JSON.parse(localStorage.getItem("team_names")   || "[]");
  const teamOptionsArr = JSON.parse(localStorage.getItem("team_options") || "[]");

  // Build allPracticeDates for the legacy table view
  const allPracticeDates = [];
  (teamNamesArr || []).forEach((_, i) => {
    const raw = localStorage.getItem(`practiceData_team${i}`);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      (parsed.dates || []).forEach(d => allPracticeDates.push(d));
    } catch {}
  });
  // ------------------------
  // 📦 Basic Info
  // ------------------------
  const numTeams = parseInt(localStorage.getItem("num_teams") || "1");
  const _season  = Number(window.__CONFIG?.event?.season);
  const season   = Number.isFinite(_season) ? _season : "—";
  const category = localStorage.getItem("race_category") || "—";
  const org      = localStorage.getItem("org_name") || "—";
  const addr     = localStorage.getItem("org_address") || "—";

  text("sumSeason", season);
  text("sumCategory", category);
  text("sumOrg", org);
  text("sumAddress", addr);

  // ------------------------
  // 🧾 Team Summary
  // ------------------------
  const optMap = { opt1: "Option 1", opt2: "Option 2" };
  
  // Helper function for package code derivation (same as Page 1)
  const derivePackageCode = (category, option) => {
    const corp = String(category || '').trim() === 'mixed_corporate';
    if (option === 'opt1') return corp ? 'option_1_corp' : 'option_1_non_corp';
    if (option === 'opt2') return corp ? 'option_2_corp' : 'option_2_non_corp';
    return null;
  };

  const teamsTbody = document.getElementById("teamsTbody");
  if (teamsTbody) {
    teamsTbody.innerHTML = "";
    if (teamNamesArr.length === 0) {
      teamsTbody.innerHTML = `<tr><td colspan="3" class="muted">No teams</td></tr>`;
    } else {
      teamNamesArr.forEach((name, idx) => {
        const cleanName = (name || "").trim().replace(/\s+/g, " ");
        const optKey = teamOptionsArr[idx];
        const code = derivePackageCode(category, optKey);
        const pkg = (window.__CONFIG?.packages || []).find(p => p.package_code === code);
        const optionLabel = pkg?.title_en || (optKey === 'opt1' ? 'Option I' : 'Option II');
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${idx + 1}</td><td>${cleanName || "—"}</td><td>${optionLabel}</td>`;
        teamsTbody.appendChild(tr);
      });
    }
  }

  // ------------------------
  // 👥 Manager Info
  // ------------------------
  const managers = JSON.parse(localStorage.getItem("managers") || "[]");
  const managersTbody = document.getElementById("managersTbody");
  if (managersTbody) {
    managersTbody.innerHTML = "";
    if (!managers || managers.length === 0) {
      managersTbody.innerHTML = `<tr><td colspan="4" class="muted">No manager information</td></tr>`;
    } else {
      managers.forEach((m, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${idx+1}</td>
          <td>${m?.name   || "—"}</td>
          <td>${m?.mobile || "—"}</td>
          <td>${m?.email  || "—"}</td>`;
        managersTbody.appendChild(tr);
      });
    }
  }

  // ------------------------
  // 🚩 Race Day Arrangement
  // ------------------------
  const rda = JSON.parse(localStorage.getItem("race_day_arrangement") || "null");
  if (rda) {
    text("sumMarquee",        rda.marqueeQty       ?? "—");
    text("sumSteerWith",      rda.steerWithQty     ?? "—");
    text("sumSteerWithout",   rda.steerWithoutQty  ?? "—");
    text("sumJunk",           `${rda.junkBoatNo   || "—"} / ${rda.junkBoatQty   ?? "—"}`);
    text("sumSpeed",          `${rda.speedBoatNo  || "—"} / ${rda.speedboatQty  ?? "—"}`);
  } else {
    text("sumMarquee", "—");
    text("sumSteerWith", "—");
    text("sumSteerWithout", "—");
    text("sumJunk", "—");
    text("sumSpeed", "—");
  }

  // ------------------------
  // 🛶 Practice Booking Summary (Per Team)
  // ------------------------
  const container = document.getElementById("perTeamPracticeSummary");
  const teamNames = teamNamesArr;

  let totalHours = 0;
  let totalTrainer = 0;
  let totalSteersman = 0;
  if (!container) {
    // No target container on page; nothing to render
  } else if (teamNames.length === 0) {
    container.innerHTML = `<p class="muted">No teams found.</p>`;
  } else {
    container.innerHTML = "";

    teamNames.forEach((name, i) => {
      const raw = localStorage.getItem(`practiceData_team${i}`);
      if (!raw) return;

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        console.warn(`Invalid practice data for team ${i}`, e);
        return;
      }

      const dates = parsed.dates || [];
      let teamTotal = 0, teamTrainer = 0, teamSteersman = 0;

      const rows = dates.map(({ date, hours, helpers }) => {
        const hr = Number(hours) || 0;
        const help = helpers || "";

        teamTotal += hr;
        if (help === "T")  teamTrainer++;
        if (help === "S")  teamSteersman++;
        if (help === "ST") { teamTrainer++; teamSteersman++; }

        return `<tr><td>${date}</td><td>${hr}</td><td>${help || "—"}</td></tr>`;
      });

      const extra = Math.max(0, teamTotal - 12);
      totalHours += teamTotal;
      totalTrainer += teamTrainer;
      totalSteersman += teamSteersman;

      const section = document.createElement("div");
      section.className = "team-summary";
      section.innerHTML = `
        <h4>Team ${i + 1}: ${name}</h4>
        <p>Total Hours: <strong>${teamTotal}</strong></p>
        <p>Trainer Sessions: <strong>${teamTrainer}</strong></p>
        <p>Steersman Sessions: <strong>${teamSteersman}</strong></p>
        <p>Extra Practice (over 12h): <strong>${extra}</strong></p>
        <table>
          <thead><tr><th>Date</th><th>Hours</th><th>Helpers</th></tr></thead>
          <tbody>${rows.join("")}</tbody>
        </table>
      `;
      container.appendChild(section);
    });
  }


// 📅 Render table
const pBody = document.getElementById("practiceTbody");
if (pBody) {
  pBody.innerHTML = "";
  if (allPracticeDates.length === 0) {
    pBody.innerHTML = `<tr><td colspan="3" class="muted">No practice dates selected</td></tr>`;
  } else {
    allPracticeDates.forEach(({ date, hours, helpers }) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${date}</td><td>${hours}</td><td>${helpers || "—"}</td>`;
      pBody.appendChild(tr);
    });
  }
}

// 📊 Totals
const maxFreeHours = 12 * numTeams;
text("sumPracticeHours",     String(totalHours));
text("sumPracticeTrainer",   String(totalTrainer));
text("sumPracticeSteersman", String(totalSteersman));
text("sumPracticeExtra",     String(Math.max(0, totalHours - maxFreeHours)));


  // Back button
  document.getElementById("backBtn").addEventListener("click", () => {
    window.location.href = "4_booking.html";
  });
}

// --- unique name to avoid clobbering page-2 normalizeName
function normalizeNameSummary(s) {
  return (s || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// Direct table writes removed - all data submission now goes through submit_registration Edge Function


// ---------- Submit flow with idempotency, confirmation, receipt ----------
// LEGACY BLOCKED: This legacy submit flow is not used by the universal form.
// Kept for reference but disabled at runtime to avoid double-binding.
const __LEGACY_BLOCKED__ = true;
if (!__LEGACY_BLOCKED__) {

// Constants
const EDGE_URL = `${window.ENV?.SUPABASE_URL}/functions/v1/submit_registration`;
const eventShortRef = window.__CONFIG?.event?.short_ref || new URLSearchParams(location.search).get('event') || 'TN2025';

// Generate or retrieve client transaction ID for idempotency
const getClientTxId = () =>
  localStorage.getItem('raceApp:client_tx_id') || (()=>{
    const id = crypto.randomUUID();
    localStorage.setItem('raceApp:client_tx_id', id);
    return id;
  })();

// Build submission payload
const makePayload = () => {
  const category = localStorage.getItem("race_category");
  const managers = JSON.parse(localStorage.getItem("managers") || "[]");
  
  // Extract contact info from first manager
  const contact = managers.length > 0 ? {
    name: managers[0]?.name || '',
    email: managers[0]?.email || '',
    phone: managers[0]?.mobile || ''
  } : { name: '', email: '', phone: '' };

  // Build teams array
  const teamNames = JSON.parse(localStorage.getItem("team_names") || "[]");
  const teamOptions = JSON.parse(localStorage.getItem("team_options") || "[]");
  const teams = teamNames.map((name, index) => ({
    name: name || `Team ${index + 1}`,
    option: teamOptions[index] || 'opt1'
  }));

  // Build practice preferences
  const practice_preferences = [];
  const teamNamesArr = JSON.parse(localStorage.getItem("team_names") || "[]");
  teamNamesArr.forEach((_, i) => {
    const raw = localStorage.getItem(`practiceData_team${i}`);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.dates) {
        data.dates.forEach(dateInfo => {
          practice_preferences.push({
            team_index: i,
            date: dateInfo.date,
            hours: dateInfo.hours,
            helpers: dateInfo.helpers
          });
        });
      }
    } catch (e) {
      console.error(`Error parsing practice data for team ${i}:`, e);
    }
  });

  // Build race day requests
  const race_day_requests = [];
  const raceDayData = JSON.parse(localStorage.getItem("race_day_arrangement") || "null");
  if (raceDayData) {
    if (raceDayData.marqueeQty > 0) race_day_requests.push({ item: 'marquee', qty: raceDayData.marqueeQty });
    if (raceDayData.steerWithQty > 0) race_day_requests.push({ item: 'steer_with', qty: raceDayData.steerWithQty });
    if (raceDayData.steerWithoutQty > 0) race_day_requests.push({ item: 'steer_without', qty: raceDayData.steerWithoutQty });
    if (raceDayData.junkBoatQty > 0) race_day_requests.push({ item: 'junk_boat', qty: raceDayData.junkBoatQty, boat_no: raceDayData.junkBoatNo });
    if (raceDayData.speedboatQty > 0) race_day_requests.push({ item: 'speed_boat', qty: raceDayData.speedboatQty, boat_no: raceDayData.speedBoatNo });
  }

  return {
    client_tx_id: getClientTxId(),
    event_short_ref: eventShortRef,
      category,
    season: window.__CONFIG?.event?.season,
      org_name: localStorage.getItem("org_name"),
      org_address: localStorage.getItem("org_address"),
      counts: {
        num_teams: Number(localStorage.getItem("num_teams")) || 0,
        num_teams_opt1: Number(localStorage.getItem("num_teams_opt1")) || 0,
        num_teams_opt2: Number(localStorage.getItem("num_teams_opt2")) || 0
      },
    contact,
    teams,
    practice_preferences,
    race_day_requests,
    hp: document.getElementById('website_hp')?.value || "" // honeypot
  };
};

// HTTP helper
async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(()=>({}));
  return { ok: res.ok, status: res.status, data };
}

// Save receipt to localStorage
function saveReceipt({ registration_id, team_codes, email }) {
  const receipt = {
    registration_id,
    team_codes,
    event_short_ref: eventShortRef,
    email: email || '',
    ts: Date.now(),
    version: 1
  };
  localStorage.setItem(`raceApp:receipt:${registration_id}`, JSON.stringify(receipt));
  localStorage.setItem(`raceApp:last_receipt`, JSON.stringify(receipt));
  return receipt;
}

// Error mapping
function mapError(code) {
  const M = {
    'E.EVENT_DISABLED': 'This event is currently not accepting registrations.',
    'E.DIVISION_INACTIVE': 'That division is not open.',
    'E.PACKAGE_INACTIVE': 'Selected package is unavailable.',
    'E.QTY_LIMIT': 'Quantity exceeds the allowed limit.',
    'E.PRACTICE_WINDOW': 'Selected practice date is outside the allowed window.',
    'E.SLOT_INVALID': 'Selected practice time slot is invalid.',
    'E.DUPLICATE': 'A submission with the same details already exists.',
    'E.HONEYPOT': 'Submission blocked. Please try again.',
    'E.RATE_LIMIT': 'Too many attempts. Please wait a minute and try again.',
    'E.BAD_PAYLOAD': 'Your submission looks incomplete. Please review and resubmit.',
    'E.UNKNOWN': 'Something went wrong. Please try again.'
  };
  return M[code] || M['E.UNKNOWN'];
}

// Show confirmation UI
function showConfirmation({ registration_id, team_codes }) {
  const confirmationEl = document.getElementById('confirmation');
  if (!confirmationEl) {
    console.error('Confirmation element not found');
    return;
  }
  
  confirmationEl.innerHTML = `
    <h2>Registration Confirmed</h2>
    <p><strong>Registration ID:</strong> ${registration_id}</p>
    <div><strong>Team Codes:</strong> ${team_codes.join(', ')}</div>
    <div style="margin-top:12px;">
      <button id="copyBtn" style="margin-right:8px;padding:8px 16px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;">Copy</button>
      <button id="shareBtn" style="padding:8px 16px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;">Share</button>
    </div>
  `;
  confirmationEl.style.display = 'block';

  const msg = `Registration ${registration_id}\nTeam Codes: ${team_codes.join(', ')}`;
  
  document.getElementById('copyBtn').onclick = async () => {
    try { 
      await navigator.clipboard.writeText(msg); 
      alert('Copied to clipboard!'); 
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };
  
  document.getElementById('shareBtn').onclick = async () => {
    if (navigator.share) {
      try { 
        await navigator.share({ title: 'Registration Confirmation', text: msg }); 
      } catch (e) {
        console.error('Share failed:', e);
      }
    } else {
      alert('Sharing not supported. Copied to clipboard instead.');
      try { 
        await navigator.clipboard.writeText(msg); 
          } catch (e) {
        console.error('Copy failed:', e);
      }
    }
  };
}

// Show error UI
function showError(message, details) {
  const msgEl = document.getElementById("formMsg");
      if (msgEl) { 
    msgEl.textContent = message;
        msgEl.style.color = "red"; 
    msgEl.innerHTML = `<div>${message}</div><div style="font-size:12px;color:#666;">Details: ${JSON.stringify(details)}</div>`;
  } else {
    alert(message);
  }
}

// Final click handler: teams -> (later) race-day -> practices
async function onFinalSubmit(e) {
  e.preventDefault?.();

  const msgEl = document.getElementById("formMsg");
  const submitBtn = document.getElementById("submitBtn");
  
  // Double-click guard
  if (submitBtn.dataset.busy === '1') return;
  submitBtn.dataset.busy = '1';
  submitBtn.disabled = true;

  try {
    // Respect feature flag at submit time (defense in depth)
    if (window.__CONFIG?.event?.form_enabled === false) {
      const m = window.__CONFIG?.event?.banner_text_en || "This form is not accepting submissions at the moment.";
      showError(m);
      return;
    }

    const payload = makePayload();
    console.log('Submitting payload:', JSON.stringify(payload, null, 2));

    const { ok, status, data } = await postJSON(EDGE_URL, payload);

    if (ok) {
      const { registration_id, team_codes, email } = data;
      const receipt = saveReceipt({ registration_id, team_codes, email });
      showConfirmation(receipt);
      
      // Hide the form sections and show confirmation
      document.querySelectorAll('.section').forEach(section => section.style.display = 'none');
      document.querySelector('.actions').style.display = 'none';
    } else {
      const code = data?.error_code || (status === 429 ? 'E.RATE_LIMIT' : 'E.UNKNOWN');
      showError(mapError(code), {
        eventShortRef,
        client_tx_id: payload.client_tx_id,
        ts: new Date().toISOString()
      });
      // Allow retry
      submitBtn.dataset.busy = '0';
      submitBtn.disabled = false;
    }
  } catch (err) {
    console.error('Submit error:', err);
    showError('Something went wrong. Please try again.', { error: err.message });
    // Allow retry
    submitBtn.dataset.busy = '0';
    submitBtn.disabled = false;
  }
}

// "Revisit confirmation" page loader
(function bootRevisit() {
  const mount = document.getElementById('revisit');
  if (!mount) return;
  const raw = localStorage.getItem('raceApp:last_receipt');
  if (!raw) { 
    mount.textContent = 'No recent confirmation found.'; 
    return; 
  }
  try { 
    const receipt = JSON.parse(raw);
    showConfirmation(receipt);
  } catch (e) { 
    mount.textContent = 'Unable to load receipt.'; 
  }
})();

} // end legacy blocked
