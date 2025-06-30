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
   (Stub — ready for next build)
------------------------- */
function initTeamInfoPage() {
  console.log("Page 2 ready: build logic next.");
}
