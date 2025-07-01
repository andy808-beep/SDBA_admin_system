// Detect current page and call corresponding init
const path = window.location.pathname;
const page = path.substring(path.lastIndexOf('/') + 1);

switch (page) {
  case "1_category.html":
    document.addEventListener("DOMContentLoaded", initRaceCategoryPage);
    break;
  case "2_teaminfo.html":
    document.addEventListener("DOMContentLoaded", initTeamInfoPage);
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

    // Save to localStorage
    localStorage.setItem("race_category", cat);
    localStorage.setItem("num_teams", numTeams);
    localStorage.setItem("num_teams_opt1", numOpt1);
    localStorage.setItem("num_teams_opt2", numOpt2);
    localStorage.setItem("team_submission_loop", "0");

    window.location.href = "2_teaminfo.html";
  };
}

/* ------------------------
   PAGE 2: Team Info
------------------------- */
function initTeamInfoPage() {
  const form = document.getElementById("teamInfoForm");
  const container = document.getElementById("teamNameFields");
  const msg = document.getElementById("formMsg");

  const numTeams = parseInt(localStorage.getItem("num_teams") || "1");

  if (!numTeams || isNaN(numTeams) || numTeams < 1) {
    msg.textContent = "Invalid team count. Please restart from page 1.";
    msg.style.color = "red";
    form.querySelector("button[type='submit']").disabled = true;
    return;
  }

  // Dynamically generate fields
  for (let i = 1; i <= numTeams; i++) {
    const label = document.createElement("label");
    label.textContent = `Team No.${i} Name`;
    label.setAttribute("for", `teamName${i}`);

    const input = document.createElement("input");
    input.type = "text";
    input.id = `teamName${i}`;
    input.name = `teamName${i}`;
    input.placeholder = `Enter name for Team ${i}`;
    input.required = true;

    container.appendChild(label);
    container.appendChild(input);
    container.appendChild(document.createElement("br"));

  }}

  // Generate team manager fields
const managerContainer = document.getElementById("managerFields");

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


  // Form submission
  form.onsubmit = (e) => {
  e.preventDefault();
  const orgName = form["orgName"].value.trim();
  const teamNames = {};
  const mailingAddress = form["mailingAddress"].value.trim();

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

  // Save to localStorage
  localStorage.setItem("org_name", orgName);
  localStorage.setItem("team_names", JSON.stringify(teamNames));
  localStorage.setItem("team_submission_loop", "0");

  window.location.href = "3_raceday.html"; // or next page
  };
