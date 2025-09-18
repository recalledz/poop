// script.js

// ─── State ─────────────────────────────────────────────
let points = 0;
let totalPoints = 0;
let poopPerClick = 100;
let passivePoopPerSecond = 0;
const spaceThresholds = [20, 100, 1000, 100000, 1000000, 100000000, 1000000000, 10000000000, 100000000000];
const maxSpaces = spaceThresholds.length;
let toilets =  new Array(maxSpaces).fill(null);
let averagePooperCost = 10;
let initialUnlocked = 0;
const aPoopers = [
  { name: "Average Pooper", rate: 1 }  // rate = poop/sec
];
const ownedAPoopers = new Array(aPoopers.length).fill(0);

const upgrades = [
  {
    id: "upgrade1",
    name: "Poop Scooper",
    description: "Make every defecate click more productive.",
    cost: 100,
    effect: () => {
      poopPerClick += 50;
    },
    isUnlocked: () => totalPoints >= 50,
    isPurchased: false,
  },
  {
    id: "upgrade2",
    name: "Composting Bin",
    description: "Generates a slow passive stream of poop.",
    cost: 500,
    effect: () => {
      passivePoopPerSecond += 1;
    },
    isUnlocked: () => totalPoints >= 250,
    isPurchased: false,
  },
  {
    id: "upgrade3",
    name: "Super Poop Vacuum",
    description: "Supercharge your workers' output.",
    cost: 2500,
    effect: () => {
      aPoopers[0].rate += 2;
    },
    isUnlocked: () => totalPoints >= 1000,
    isPurchased: false,
  },
  {
    id: "upgrade4",
    name: "Advanced Composting System",
    description: "Massively increases passive generation and lowers hiring costs.",
    cost: 10000,
    effect: () => {
      passivePoopPerSecond += 5;
      averagePooperCost = Math.max(5, Math.floor(averagePooperCost * 0.9));
    },
    isUnlocked: () => totalPoints >= 5000,
    isPurchased: false,
  },
];

// ─── Element refs ────────────────────────────────────
const poopAmount         = document.getElementById("poopAmount");
const poopIcon           = document.querySelector(".poopIcon");
const basePoopIconSize   = parseFloat(getComputedStyle(poopIcon).fontSize);
const maxPoopForIconSize = 300000; // cap growth at 300k poop
const defecateButton     = document.getElementById("defecatebutton");
const spacesDisplay      = document.getElementById("spaces");
const aPooperCostDisplay = document.getElementById("aPooperCost");
const poopPerSecondDisplay = document.getElementById("poopPerSecond");
const upgradesPanel      = document.getElementById("upgrades-panel");


//-------------------Toilet grid------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Tab switching 
  const tabs   = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');
  const buildingMenu = document.getElementById('building-menu');
  let selectedSpace = null;
  
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.tab;
      panels.forEach(p =>
        p.id === `tab-${target}`
          ? p.classList.remove('hidden')
          : p.classList.add('hidden')
      );
    });
  });

  // Generate spaces grid 
  const spacesGrid     = document.getElementById('spaces-grid');

  // 1) Build the grid
  for (let i = 1; i <= maxSpaces; i++) {
    const item = document.createElement('div');
    item.className = 'space-item';

    const btn = document.createElement('button');
    btn.textContent = 'Buy';
    btn.disabled   = false;
    btn.dataset.spaceIndex = i;

    // Attach click to this specific button
    btn.addEventListener('click', (e) => {
      if (btn.disabled || btn.textContent !== 'Buy') return;
      selectedSpace = i;
      const rect = btn.getBoundingClientRect();
      buildingMenu.style.left    = `${rect.left + window.scrollX}px`;
      buildingMenu.style.top     = `${rect.bottom + window.scrollY}px`;
      buildingMenu.style.display = 'flex';
      e.stopPropagation();
    });

    item.appendChild(btn);
    spacesGrid.appendChild(item);
  }

  // 2) Clicking anywhere else hides the menu
  document.addEventListener('click', () => {
    buildingMenu.style.display = 'none';
  });

  // 3) Selecting a building
  buildingMenu.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') return;
    const type = e.target.dataset.building;
    purchaseBuilding(selectedSpace, type);
    buildingMenu.style.display = 'none';
  });

  // 4) The helper that safely updates the right space-item
  function purchaseBuilding(spaceIndex, type) {
    toilets[spaceIndex - 1] = { pooper: null };
    const items = spacesGrid.querySelectorAll('.space-item');
    if (!spaceIndex || spaceIndex < 1 || spaceIndex > items.length) {
      console.error('Invalid spaceIndex:', spaceIndex);
      return;
    }
    const item = items[spaceIndex - 1];
    const btn  = item.querySelector('button');
    if (!btn) {
      console.error('No button found in space-item', item);
      return;
    }
  
    // 2) Create the 🚽 icon
    const toiletIcon = document.createElement('span');
    toiletIcon.className   = 'toilet-icon';
    toiletIcon.textContent = '🚽';

    // 3) Insert that icon *before* the button—so it sits above
    item.insertBefore(toiletIcon, btn);

    // 4) Now swap in the Assign button
    const newBtn = btn.cloneNode(true);
    newBtn.textContent = 'Assign';
    newBtn.disabled    = false;
    newBtn.addEventListener('click', () => {
      assignPooperToToilet(spaceIndex);
    });
    btn.replaceWith(newBtn);

    btn.disabled    = false;
    console.log(`Bought ${type} on space #${spaceIndex}`);
    // TODO: record in your game state
  }

  // 5) Assign a pooper to the toilet
  function assignPooperToToilet(spaceIndex) {
    // a) Check inventory
    if (ownedAPoopers[0] < 1) {
      alert('No poopers available!');
      return;
    }

    // b) Decrement your inventory & update sidebar
    ownedAPoopers[0]--;
    document.getElementById('pooper-count-0').textContent = ownedAPoopers[0];

    // c) Assign in state
    const slot = toilets[spaceIndex - 1];
    if (!slot) {
      console.error('No toilet built at slot', spaceIndex);
      return;
    }
    slot.pooper = aPoopers[0];

    // d) Disable the Assign button in the UI
    const btn = spacesGrid
      .querySelectorAll('.space-item')[spaceIndex - 1]
      .querySelector('button');
    btn.textContent = 'Assigned';
    btn.disabled    = true;

    // e) Refresh the main UI (updates space counts, poop display, etc.)
    updateUI();
  }
 
  
  const poopersPanel = document.getElementById('poopers-panel');
  aPoopers.forEach((template, idx) => {
    const row = document.createElement('div');
    row.className = 'pooper-row';
    row.innerHTML = `
      <span>${template.name}:</span>
      <span id="pooper-count-${idx}">0</span>
      <button id="buy-pooper-${idx}">
        Buy (${formatNumber(averagePooperCost)})
      </button>
    `;
    poopersPanel.appendChild(row);

    const countSpan = document.getElementById(`pooper-count-${idx}`);
    const buyButton = document.getElementById(`buy-pooper-${idx}`);
    buyButton.addEventListener('click', () => {
      buyPooper(idx);
      console.log(`Clicked Buy for ${template.name} (index=${idx})`);
    });
  });

  updateUI();
});

// ─── functions ─────────────────────────────────────────
function formatNumber(n) {
  if (n >= 1e9) return (n/1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n/1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n/1e3).toFixed(2) + "K";
  return n;
}

function renderUpgrades() {
  if (!upgradesPanel) return;

  upgradesPanel.innerHTML = "";

  upgrades.forEach((upgrade) => {
    const card = document.createElement("div");
    card.className = "upgrade-card";

    if (upgrade.isPurchased) {
      card.classList.add("purchased");
    }

    if (!upgrade.isUnlocked()) {
      card.classList.add("locked");
    }

    const title = document.createElement("h4");
    title.textContent = upgrade.name;

    const description = document.createElement("p");
    description.className = "upgrade-description";
    description.textContent = upgrade.description;

    const cost = document.createElement("p");
    cost.className = "upgrade-cost";
    cost.textContent = `Cost: ${formatNumber(upgrade.cost)}`;

    const status = document.createElement("p");
    status.className = "upgrade-status";
    if (upgrade.isPurchased) {
      status.textContent = "Purchased";
    } else if (!upgrade.isUnlocked()) {
      status.textContent = "Locked";
    } else if (points < upgrade.cost) {
      status.textContent = "Need more poop";
    } else {
      status.textContent = "Ready to purchase";
    }

    const button = document.createElement("button");
    button.type = "button";

    if (upgrade.isPurchased) {
      button.textContent = "Purchased";
      button.disabled = true;
    } else if (!upgrade.isUnlocked()) {
      button.textContent = "Locked";
      button.disabled = true;
    } else {
      button.textContent = `Buy (${formatNumber(upgrade.cost)})`;
      button.disabled = points < upgrade.cost;
      button.addEventListener("click", () => purchaseUpgrade(upgrade));
    }

    card.append(title, description, cost, status, button);
    upgradesPanel.appendChild(card);
  });
}

function purchaseUpgrade(upgrade) {
  if (upgrade.isPurchased) return;
  if (!upgrade.isUnlocked()) return;
  if (points < upgrade.cost) return;

  points -= upgrade.cost;
  upgrade.isPurchased = true;
  upgrade.effect();
  updateUI();
}

function updateProgressBar(current, max) {

  const progressBar = document.getElementById('poop-progress-bar');
  const percentage = (current / max) * 100;
  progressBar.style.width = `${percentage}%`;
  progressBar.textContent = `${formatNumber(current)} / ${formatNumber(max)}`;
  console.log(`Progress: ${percentage}%`);
}

function getUnlockedSpaces() {
  let thresholdsPassed = 0;
  for (let i = 0; i < spaceThresholds.length; i++) {
    if (totalPoints >= spaceThresholds[i]) {
      thresholdsPassed ++;
    }
  }
  return initialUnlocked + thresholdsPassed;
}

function getPoopPerSecond() {
  const assignedRate = toilets.reduce((sum, slot) => {
    return sum + (slot && slot.pooper ? slot.pooper.rate : 0);
  }, 0);
  return assignedRate + passivePoopPerSecond;
}
//--------------Update UI function-------------//
function updateUI() {
  const unlocked = getUnlockedSpaces();
  console.log(
    `TotalPoop=${totalPoints}, thresholds passed=${
      unlocked - initialUnlocked
    }, slots unlocked=${unlocked}`
  );
  // 1) Poop counter + icon size
  poopAmount.textContent = formatNumber(points);
  const pps = getPoopPerSecond();
  poopPerSecondDisplay.textContent = `Poop/sec: ${formatNumber(pps)}`;
  // Grow the poop icon up to 10× its base size at 300k poop
  const growthProgress = Math.min(points, maxPoopForIconSize) / maxPoopForIconSize;
  const newIconSize = basePoopIconSize * (1 + growthProgress * 9);
  poopIcon.style.fontSize = `${newIconSize}px`;

  const pooperBuyButton = document.getElementById('buy-pooper-0');
  if (pooperBuyButton) {
    pooperBuyButton.textContent = `Buy (${formatNumber(averagePooperCost)})`;
  }

  const slots = document.querySelectorAll('#spaces-grid .space-item');
  slots.forEach((slot, i) => {
    const btn = slot.querySelector('button');
    // 1) Visibility
    if (i < unlocked) {
      slot.style.display = 'flex';
    } else {
      slot.style.display = 'none';
      return;  // no need to touch buttons on hidden slots
    }

    // 2) Lock vs. Buy label
    if (btn.textContent === 'Locked') {
      btn.textContent = 'Buy';
      btn.disabled    = false;
    }
  });
  updateProgressBar(totalPoints, 1e15);
  renderUpgrades();

}

// ─── Actions ─────────────────────────────────────────

// Manual click
defecateButton.addEventListener("click", () => {
  points += poopPerClick;
  totalPoints += poopPerClick;
  updateUI();
});

// Hire (assign) an Average Pooper to the first empty toilet
function buyPooper(idx) {
  // 1) affordability check
  if (points < averagePooperCost) {
    alert('Not enough poop!');
    return;
  }

  // 2) pay & raise future cost
  points -= averagePooperCost;
  averagePooperCost = Math.ceil(averagePooperCost * 1.1);

  // 3) increment your inventory
  ownedAPoopers[idx]++;

  // 4) update both side‐panel and main UI
  document.getElementById(`pooper-count-${idx}`)
          .textContent = ownedAPoopers[idx];
  document.getElementById(`buy-pooper-${idx}`)
          .textContent = `Buy (${formatNumber(averagePooperCost)})`;
  updateUI();
}

// Idle loop: each toilet with a pooper adds its rate every second
setInterval(() => {
  toilets.forEach(slot => {
    if (slot && slot.pooper) {
      points += slot.pooper.rate;
      totalPoints += slot.pooper.rate;
    }
  });
  if (passivePoopPerSecond > 0) {
    points += passivePoopPerSecond;
    totalPoints += passivePoopPerSecond;
  }
  updateUI();
},
 1000);