import { loadEventConfig } from './configloader.js';
import { sb } from './supabase_config.js'; // or wherever you create the client

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
      const msg =
        window.__CONFIG?.event?.disabled_message ||
        'This form is not accepting submissions at the moment.';
      disableInteractive(msg);
      // Still emit config:ready so pages can show read-only UI if they want
      document.dispatchEvent(new CustomEvent('config:ready', { detail: { eventShortRef, disabled: true } }));
      return;
    }

    // Config OK and form enabled → notify pages to initialize
    document.dispatchEvent(new CustomEvent('config:ready', { detail: { eventShortRef, disabled: false } }));
  } catch (err) {
    console.error('Config load failed', err);
    disableInteractive('We’re updating race settings. Please try again in a moment.');
    document.dispatchEvent(new CustomEvent('config:ready', { detail: { eventShortRef, disabled: true } }));
  }
})();



// ---------- Supabase client ----------
// import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
// import { SUPABASE_URL, SUPABASE_KEY } from "./supabase_config.js";

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


// --- Season helper ---
function getCurrentSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = Jan, 11 = Dec
  // If we're in Sep (8) or later, season is next year
  return (month >= 7) ? year + 1 : year;
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
  const priceTable = null; // placeholder: real data comes from __CONFIG

  // --- 🧠 Restore previous selections if available ---
  const savedCategory = localStorage.getItem("race_category");
  const savedNumTeams = localStorage.getItem("num_teams");
  const savedOpt1     = localStorage.getItem("num_teams_opt1");
  const savedOpt2     = localStorage.getItem("num_teams_opt2");

  if (savedCategory) {
    categorySelect.value = savedCategory;
    const p = window.__CONFIG?.packages?.[savedCategory] || window.__CONFIG?.packages?.default;
    opt1PriceDisplay.textContent = p?.opt1?.price ? `HK$${p.opt1.price}` : '';
    opt2PriceDisplay.textContent = p?.opt2?.price ? `HK$${p.opt2.price}` : '';
    entryOptionsSection.hidden = false;
  }

  if (savedNumTeams) teamCountInput.value = savedNumTeams;
  if (savedOpt1)      opt1Count.value = savedOpt1;
  if (savedOpt2)      opt2Count.value = savedOpt2;

  // --- Show/hide entry options based on category ---
  categorySelect.addEventListener("change", () => {
    const cat = categorySelect.value;

    if (cat) {
      const p = window.__CONFIG?.packages?.[cat] || window.__CONFIG?.packages?.default;
      opt1PriceDisplay.textContent = p?.opt1?.price ? `HK$${p.opt1.price}` : '';
      opt2PriceDisplay.textContent = p?.opt2?.price ? `HK$${p.opt2.price}` : '';
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
    nameInput.placeholder = "Full Name";
    nameInput.required = i < 3;
    nameInput.value = savedManagers[i - 1]?.name || "";

    const mobileInput = document.createElement("input");
    mobileInput.type = "tel";
    mobileInput.name = `manager${i}_mobile`;
    mobileInput.placeholder = "Mobile Number";
    mobileInput.required = i < 3;
    mobileInput.value = savedManagers[i - 1]?.mobile || "";

    const emailInput = document.createElement("input");
    emailInput.type = "email";
    emailInput.name = `manager${i}_email`;
    emailInput.placeholder = "Email Address";
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
  const PRACTICE_YEAR = (window.__CONFIG?.event?.practice_start_date
    ? new Date(window.__CONFIG.event.practice_start_date).getFullYear()
    : 2026);
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
  const season   = Number(window.__CONFIG?.event?.season) || Number(localStorage.getItem("season")) || NaN;
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
  const teamNamesArr   = JSON.parse(localStorage.getItem("team_names")   || "[]");
  const teamOptionsArr = JSON.parse(localStorage.getItem("team_options") || "[]");
  const optMap = { opt1: "Option 1", opt2: "Option 2" };

  const teamsTbody = document.getElementById("teamsTbody");
  if (teamsTbody) {
    teamsTbody.innerHTML = "";
    if (teamNamesArr.length === 0) {
      teamsTbody.innerHTML = `<tr><td colspan="3" class="muted">No teams</td></tr>`;
    } else {
      teamNamesArr.forEach((name, idx) => {
        const cleanName = (name || "").trim().replace(/\s+/g, " ");
        const option = optMap[teamOptionsArr[idx]] || "Option 1";
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${idx + 1}</td><td>${cleanName || "—"}</td><td>${option}</td>`;
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
  let trainer = 0;
  let steersman = 0;
  if (!container || teamNames.length === 0) {
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
      let teamTotal = 0, trainer = 0, steersman = 0;

      const rows = dates.map(({ date, hours, helpers }) => {
        const hr = Number(hours) || 0;
        const help = helpers || "";

        teamTotal += hr;
        if (help === "T") trainer++;
        if (help === "S") steersman++;
        if (help === "ST") { trainer++; steersman++; }

        return `<tr><td>${date}</td><td>${hr}</td><td>${help || "—"}</td></tr>`;
      });

      const extra = Math.max(0, teamTotal - 12);

      const section = document.createElement("div");
      section.className = "team-summary";
      section.innerHTML = `
        <h4>Team ${i + 1}: ${name}</h4>
        <p>Total Hours: <strong>${teamTotal}</strong></p>
        <p>Trainer Sessions: <strong>${trainer}</strong></p>
        <p>Steersman Sessions: <strong>${steersman}</strong></p>
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
text("sumPracticeTrainer",   String(trainer));
text("sumPracticeSteersman", String(steersman));
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

/* DEV-ONLY (disabled): direct table writes replaced by Edge Function submit_registration.
   This guard prevents accidental client-side inserts during MVP.
   If you truly need to test direct writes later, set ALLOW_DIRECT_WRITES = true temporarily. */
   const ALLOW_DIRECT_WRITES = false;

   async function insertTeamsToSupabaseMeta() {
     if (!ALLOW_DIRECT_WRITES) {
       throw new Error("Direct writes disabled. Use the submit_registration Edge Function.");
     }
   
     // --- If you flip the flag above, the legacy code path remains here for debugging only ---
     const user = await requireAuth();
   
     const category       = localStorage.getItem("race_category");
     const season         = Number(window.__CONFIG?.event?.season) || Number(localStorage.getItem("season")) || NaN;
     const orgName        = localStorage.getItem("org_name") || "";
     const address        = localStorage.getItem("org_address") || "";
     const teamNamesObj   = JSON.parse(localStorage.getItem("team_names")   || "{}");
     const teamOptionsObj = JSON.parse(localStorage.getItem("team_options") || "{}");
     const managers       = JSON.parse(localStorage.getItem("managers")     || "[]");
   
     if (!category) throw new Error("Missing category. Please go back to Page 1.");
     const teamKeys = Object.keys(teamNamesObj).sort();
     if (teamKeys.length === 0) throw new Error("No team names found. Please go back to Page 2.");
   
     // NOTE: team_code now assigned by DB trigger; do not compute on client.
     const m1 = managers[0] || {}, m2 = managers[1] || {}, m3 = managers[2] || {};
     const optMap = { opt1: "Option 1", opt2: "Option 2" };
   
     // Local duplicate guard
     const seen = new Map();
     for (const k of teamKeys) {
       const display = (teamNamesObj[k] || "").trim().replace(/\s+/g, " ");
       const norm = normalizeNameSummary(display);
       if (seen.has(norm)) throw new Error(`Duplicate team names detected: “${seen.get(norm)}” and “${display}”.`);
       seen.set(norm, display);
     }
   
     const rows = teamKeys.map((teamKey) => {
       const teamName = (teamNamesObj[teamKey] || "").trim().replace(/\s+/g, " ");
       const option   = optMap[teamOptionsObj[teamKey]] || "Option 1";
       return {
         user_id: user.id,
         season,
         category,
         option_choice: option,
         team_name: teamName,
         // NOTE: These two will be mapped on the server once DDL is confirmed.
         organization_name: orgName, // likely -> org_name
         address: address,           // likely -> org_address
         team_manager_1: m1.name   || "",
         mobile_1:       m1.mobile || "",
         email_1:        m1.email  || "",
         team_manager_2: m2.name   || "",
         mobile_2:       m2.mobile || "",
         email_2:        m2.email  || "",
         team_manager_3: m3.name   || "",
         mobile_3:       m3.mobile || "",
         email_3:        m3.email  || ""
       };
     });
   
     const { data, error } = await sb.from("team_meta").insert(rows).select();
     if (error) throw error;
   
     localStorage.setItem("inserted_team_meta", JSON.stringify(data));
     return data;
   }
   

// Practice insert (only runs on Summary)
async function insertPracticeSessionsAfterTeams(userId) {
  const season   = Number(window.__CONFIG?.event?.season) || Number(localStorage.getItem("season")) || NaN;
  const teamMeta = JSON.parse(localStorage.getItem("inserted_team_meta") || "[]");

  if (!Array.isArray(teamMeta) || teamMeta.length === 0) {
    throw new Error("Missing inserted team metadata.");
  }

  const allRows = [];

  for (let i = 0; i < teamMeta.length; i++) {
    const team = teamMeta[i];
    const practice = JSON.parse(localStorage.getItem(`practiceData_team${i}`) || "null");

    if (!practice || !Array.isArray(practice.dates)) continue;

    const { slotPrefs_1hr = {}, slotPrefs_2hr = {} } = practice;

    for (const { date, hours, helpers } of practice.dates) {
      const slotSet = hours === 2 ? slotPrefs_2hr : slotPrefs_1hr;

      allRows.push({
        team_id: team.id,
        practice_date: date,
        duration_hours: Number(hours),
        helpers_code: helpers || "",
        slot_pref_1: slotSet.slot_pref_1 || "",
        slot_pref_2: slotSet.slot_pref_2 || "",
        slot_pref_3: slotSet.slot_pref_3 || ""
      });
    }
  }

  if (allRows.length === 0) return { skipped: true };

  const { error } = await sb.from("practice_preferences").insert(allRows);
  if (error) throw error;

  return { inserted: allRows.length };
}


// Final click handler: teams -> (later) race-day -> practices
async function onFinalSubmit() {
  const msgEl = document.getElementById("formMsg");
  const eventShortRef = (window.__CONFIG?.event?.event_short_ref) || new URLSearchParams(location.search).get('event') || 'TN2025';
  try {
    // Build consolidated payload from localStorage (pages 1–4). We'll refine once DDL arrives.
    const payload = {
      eventShortRef,
      category: localStorage.getItem("race_category"),
      season: window.__CONFIG?.event?.season, // prefer config
      org_name: localStorage.getItem("org_name"),
      org_address: localStorage.getItem("org_address"),
      team_names: JSON.parse(localStorage.getItem("team_names") || "[]"),
      team_options: JSON.parse(localStorage.getItem("team_options") || "[]"),
      managers: JSON.parse(localStorage.getItem("managers") || "[]"),
      race_day: JSON.parse(localStorage.getItem("race_day_arrangement") || "null"),
      practice: (function () {
        const out = [];
        const teams = JSON.parse(localStorage.getItem("team_names") || "[]");
        teams.forEach((_, i) => {
          const raw = localStorage.getItem(`practiceData_team${i}`);
          if (!raw) return;
          try { out.push({ team_index: i, ...JSON.parse(raw) }); } catch {}
        });
        return out;
      })()
    };

    // Edge Function (server-side transaction + team code trigger)
    const resp = await fetch('/functions/v1/submit_registration', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) throw new Error(`Submit failed (${resp.status})`);
    const result = await resp.json(); // { registration_id, team_codes: [...] }

    alert(`Submission complete! Team codes: ${Array.isArray(result?.team_codes) ? result.team_codes.join(', ') : 'TBD'}`);
    // (optional) route to a simple thank-you page
    window.location.href = "thankyou.html";
  } catch (err) {
    console.error(err);
    if (msgEl) { msgEl.textContent = err.message || "Submission failed."; msgEl.style.color = "red"; }
    else { alert(err.message || "Submission failed."); }
  }
}
