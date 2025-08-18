// Detect current page and call corresponding init
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_KEY } from "./supabase_config.js";

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

sb.auth.getUser().then(console.log);

function getTeamTableByCategory(category) {
  switch (category) {
    case "mixed_corporate": return "mixed_corporate_team_list";
    case "mixed_open":      return "mixed_open_team_list";
    case "ladies_open":     return "ladies_open_team_list";
    case "men_open":        return "mens_open_team_list";
    default: return null;
  }
}

const path = window.location.pathname;
const page = path.substring(path.lastIndexOf('/') + 1);

switch (page) {
  case "1_category.html":
    document.addEventListener("DOMContentLoaded", initRaceCategoryPage);
    break;
  case "2_teaminfo.html":
    document.addEventListener("DOMContentLoaded", initTeamInfoPage);
    break;
  case "3_raceday.html":
    document.addEventListener("DOMContentLoaded", initRaceDayPage);
    break;
  case "4_summary.html":
  document.addEventListener("DOMContentLoaded", initSummaryPage);
  break;
  // Add more cases for other pages here...
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

  const priceTable = {
    mixed_corporate: { opt1: 21900, opt2: 18500 },
    default:         { opt1: 20900, opt2: 17500 }
  };

  // Show/hide entry options based on category
  categorySelect.addEventListener("change", () => {
    const cat = categorySelect.value;

    if (cat) {
      const prices = priceTable[cat] || priceTable.default;
      opt1PriceDisplay.textContent = `HK$${prices.opt1}`;
      opt2PriceDisplay.textContent = `HK$${prices.opt2}`;
      entryOptionsSection.hidden = false;
    } else {
      entryOptionsSection.hidden = true;
      opt1PriceDisplay.textContent = "";
      opt2PriceDisplay.textContent = "";
      opt1Count.value = 0;
      opt2Count.value = 0;
    }
  });

  // Form submission
  const form = document.getElementById("categoryForm");
  form.onsubmit = (e) => {
    e.preventDefault();
    const cat = categorySelect.value;
    const numTeams = parseInt(teamCountInput.value);
    const numOpt1 = parseInt(opt1Count.value);
    const numOpt2 = parseInt(opt2Count.value);

    if (!cat) {
      msg.textContent = "Please select a category.";
      msg.style.color = "red";
      return;
    }

    if (isNaN(numTeams) || numTeams < 1) {
      msg.textContent = "Please enter a valid number of teams.";
      msg.style.color = "red";
      return;
    }

    if ((numOpt1 + numOpt2) !== numTeams) {
      msg.textContent = `Please provide entry option(s) for ${numTeams} team(s).`;
      msg.style.color = "red";
      return;
    }

    // Save all values to localStorage
    localStorage.setItem("race_category", cat);
    localStorage.setItem("selectedCategory", cat); // for Supabase table
    localStorage.setItem("num_teams", numTeams);
    localStorage.setItem("num_teams_opt1", numOpt1);
    localStorage.setItem("num_teams_opt2", numOpt2);
    localStorage.setItem("team_submission_loop", "0");

    // Go to next step
    window.location.href = "2_teaminfo.html";
  };
}

/* ------------------------
   PAGE 2: Team Info
------------------------- */
function initTeamInfoPage() {
  const form = document.getElementById("teamInfoForm");
  const container = document.getElementById("teamNameFields");
  const managerContainer = document.getElementById("managerFields");
  const msg = document.getElementById("formMsg");

  const numTeams = parseInt(localStorage.getItem("num_teams") || "1");

  if (!numTeams || isNaN(numTeams) || numTeams < 1) {
    msg.textContent = "Invalid team count. Please restart from page 1.";
    msg.style.color = "red";
    form.querySelector("button[type='submit']").disabled = true;
    return;
  }

  // Dynamically generate team name fields
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

    group.appendChild(label);
    group.appendChild(input);
    container.appendChild(group);
  }

  // Dynamically generate team manager fields
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

    const mobileInput = document.createElement("input");
    mobileInput.type = "tel";
    mobileInput.name = `manager${i}_mobile`;
    mobileInput.placeholder = "Mobile Number";
    mobileInput.required = i < 3;

    const emailInput = document.createElement("input");
    emailInput.type = "email";
    emailInput.name = `manager${i}_email`;
    emailInput.placeholder = "Email Address";
    emailInput.required = i < 3;

    group.appendChild(nameInput);
    group.appendChild(mobileInput);
    group.appendChild(emailInput);
    managerContainer.appendChild(group);
  }

  // Handle form submission
  form.onsubmit = (e) => {
    e.preventDefault();

    const orgName = form["orgName"].value.trim();
    const mailingAddress = form["mailingAddress"].value.trim();
    const teamNames = {};
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
      const name = input.value.trim();
      if (!name) {
        msg.textContent = `Please enter a name for Team ${i}.`;
        msg.style.color = "red";
        return;
      }
      teamNames[`team${i}`] = name;
    }

    for (let i = 1; i <= 3; i++) {
      const name = form[`manager${i}_name`]?.value.trim() || "";
      const mobile = form[`manager${i}_mobile`]?.value.trim() || "";
      const email = form[`manager${i}_email`]?.value.trim() || "";
      managers.push({ name, mobile, email });
    }

    // Save to localStorage
    localStorage.setItem("org_name", orgName);
    localStorage.setItem("org_address", mailingAddress);
    localStorage.setItem("team_names", JSON.stringify(teamNames));
    localStorage.setItem("managers", JSON.stringify(managers));
    localStorage.setItem("team_submission_loop", "0");

    // Continue to next page
    window.location.href = "3_raceday.html";
  };
}

/* ------------------------
   PAGE 3: Race Day Arrangement
------------------------- */
function initRaceDayPage() {
  const form = document.getElementById("raceDayForm");
  const msg = document.getElementById("formMsg");

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
    window.location.href = "4_summary.html";
};
}

/* ------------------------
   PAGE 4: Summary
------------------------- */

function initSummaryPage() {
  const btn = document.getElementById("submitBtn");
  if (btn) btn.onclick = insertTeamsToSupabase;
}

// ✅ MUST be defined globally
async function insertTeamsToSupabase() {
  console.log("Submit button clicked – insertTeamsToSupabase() fired");
  // ✅ Fetch fresh user session
  const { data: userData, error: userError } = await sb.auth.getUser();
  const userId = userData?.user?.id;

  if (!userId || userError) {
    console.error("User not found or session invalid:", userError);
    alert("You must be logged in to submit.");
    return;
  }

  const selectedCategory = localStorage.getItem("selectedCategory");
  const table = getTeamTableByCategory(selectedCategory);

  const teamNames = JSON.parse(localStorage.getItem("team_names") || "{}");
  const teamOptions = JSON.parse(localStorage.getItem("team_options") || "{}");
  const orgName = localStorage.getItem("org_name");
  const address = localStorage.getItem("org_address");
  const managers = JSON.parse(localStorage.getItem("managers") || "[]");

  if (!table) {
    alert("Missing category or table info. Please start again.");
    return;
  }

  console.log("userId:", userId);
  console.log("table:", table);
  console.log("teamNames:", teamNames);
  console.log("teamOptions:", teamOptions);

  const { count, error: countError } = await sb
    .from(table)
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error("Failed to count existing teams:", countError);
    alert("Team code generation failed.");
    return;
  }

  const prefixMap = {
    men_open: "M",
    ladies_open: "L",
    mixed_open: "X",
    mixed_corporate: "C"
  };

  const prefix = prefixMap[selectedCategory] || "?";
  let nextIndex = count + 1;

  const rows = [];

  Object.entries(teamNames).forEach(([teamKey, teamName]) => {
    const option = teamOptions[teamKey] === "opt1" ? "Option 1" : "Option 2";
    const teamCode = `${prefix}${nextIndex++}`;

    rows.push({
      user_id: userId,
      option_choice: option,
      team_code: teamCode,
      team_name: teamName,
      organization_name: orgName,
      address: address,
      team_manager_1: managers[0]?.name || "",
      mobile_1: managers[0]?.mobile || "",
      email_1: managers[0]?.email || "",
      team_manager_2: managers[1]?.name || "",
      mobile_2: managers[1]?.mobile || "",
      email_2: managers[1]?.email || "",
      team_manager_3: managers[2]?.name || "",
      mobile_3: managers[2]?.mobile || "",
      email_3: managers[2]?.email || ""
    });
  });

  const { data, error } = await sb.from(table).insert(rows);
  console.log("Insert result:", { data, error });

  if (error) {
    console.error("Insert failed:", error);
    alert("Insert failed: " + error.message);
  } else {
    alert("Teams successfully submitted to Supabase!");
    window.location.href = "../Dashboard/dashboard.html";
  }
}


