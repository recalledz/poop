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

let poopers = [];
let nextPooperId = 1;

const STATE_IDLE = "idle";
const STATE_EATING = "eating";
const STATE_DIGESTING = "digesting";
const STATE_LOOKING_FOR_SPOT = "looking_for_spot";
const STATE_WAITING_FOR_SPOT = "waiting_for_spot";
const STATE_POOPING = "pooping";

const POOPER_STATE_SEQUENCE = [
  STATE_EATING,
  STATE_DIGESTING,
  STATE_LOOKING_FOR_SPOT,
  STATE_POOPING,
];

const POOPER_STATE_DURATIONS = {
  [STATE_EATING]: 5000,
  [STATE_DIGESTING]: 4000,
  [STATE_WAITING_FOR_SPOT]: 2000,
  [STATE_POOPING]: 2000,
};

const TICK_INTERVAL_MS = 1000;

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
      poopers.forEach(pooper => {
        if (pooper.typeId === 0) {
          pooper.baseOutput += 2;
        }
      });
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
    toilets[spaceIndex - 1] = {
      assignedPooperId: null,
      currentPooperId: null,
    };
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
    const availablePooper = poopers.find(
      (pooper) => pooper.typeId === 0 && pooper.state === STATE_IDLE
    );

    if (!availablePooper) {
      alert('No poopers available!');
      return;
    }

    // b) Mark the pooper as assigned & update sidebar
    const slot = toilets[spaceIndex - 1];
    if (!slot) {
      console.error('No toilet built at slot', spaceIndex);
      return;
    }

    slot.assignedPooperId = availablePooper.id;
    availablePooper.assignedTo = spaceIndex;
    availablePooper.currentToiletIndex = null;
    setPooperState(availablePooper, STATE_EATING);
    updatePooperCountDisplay(0);

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

    const buyButton = document.getElementById(`buy-pooper-${idx}`);
    buyButton.addEventListener('click', () => {
      buyPooper(idx);
      console.log(`Clicked Buy for ${template.name} (index=${idx})`);
    });

    updatePooperCountDisplay(idx);
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

function getAvailablePooperCount(typeId) {
  return poopers.filter(
    (pooper) => pooper.typeId === typeId && pooper.state === STATE_IDLE
  ).length;
}

function updatePooperCountDisplay(typeId) {
  const countSpan = document.getElementById(`pooper-count-${typeId}`);
  if (countSpan) {
    countSpan.textContent = getAvailablePooperCount(typeId);
  }
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
  const activeRate = poopers.reduce((sum, pooper) => {
    return sum + (pooper.state === STATE_POOPING ? pooper.baseOutput : 0);
  }, 0);
  return activeRate + passivePoopPerSecond;
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
  aPoopers.forEach((_, idx) => updatePooperCountDisplay(idx));
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

  // 3) create a new pooper and store it
  const template = aPoopers[idx];
  const newPooper = {
    id: nextPooperId++,
    typeId: idx,
    state: STATE_IDLE,
    stateTimer: 0,
    progress: 0,
    assignedTo: null,
    currentToiletIndex: null,
    baseOutput: template.rate,
  };
  poopers.push(newPooper);

  // 4) update both side‐panel and main UI
  updatePooperCountDisplay(idx);
  document.getElementById(`buy-pooper-${idx}`)
          .textContent = `Buy (${formatNumber(averagePooperCost)})`;
  updateUI();
}

function tickPoopers(deltaMs) {
  poopers.forEach((pooper) => tickPooper(pooper, deltaMs));
}

function tickPooper(pooper, deltaMs) {
  if (pooper.state === STATE_IDLE) {
    return;
  }

  if (pooper.state === STATE_LOOKING_FOR_SPOT) {
    attemptToOccupyToilet(pooper);
    return;
  }

  if (pooper.state === STATE_WAITING_FOR_SPOT) {
    pooper.stateTimer = Math.max(
      0,
      (pooper.stateTimer ?? POOPER_STATE_DURATIONS[STATE_WAITING_FOR_SPOT]) - deltaMs,
    );

    if (pooper.stateTimer <= 0) {
      setPooperState(pooper, STATE_LOOKING_FOR_SPOT);
    }
    return;
  }

  if (pooper.state === STATE_POOPING) {
    const produced = pooper.baseOutput * (deltaMs / 1000);
    points += produced;
    totalPoints += produced;

    pooper.stateTimer -= deltaMs;
    if (pooper.stateTimer <= 0) {
      releaseToilet(pooper);
      advancePooperState(pooper);
    }
    return;
  }

  if (pooper.stateTimer == null) {
    pooper.stateTimer = POOPER_STATE_DURATIONS[pooper.state] ?? 0;
  }

  pooper.stateTimer -= deltaMs;
  if (pooper.stateTimer <= 0) {
    advancePooperState(pooper);
  }
}

function advancePooperState(pooper) {
  const currentIndex = POOPER_STATE_SEQUENCE.indexOf(pooper.state);
  const nextIndex = currentIndex === -1
    ? 0
    : (currentIndex + 1) % POOPER_STATE_SEQUENCE.length;
  const nextState = POOPER_STATE_SEQUENCE[nextIndex];
  setPooperState(pooper, nextState);
}

function setPooperState(pooper, nextState) {
  pooper.state = nextState;

  switch (nextState) {
    case STATE_LOOKING_FOR_SPOT:
      attemptToOccupyToilet(pooper);
      break;
    case STATE_WAITING_FOR_SPOT:
      pooper.stateTimer = POOPER_STATE_DURATIONS[STATE_WAITING_FOR_SPOT];
      break;
    case STATE_POOPING:
      pooper.stateTimer = POOPER_STATE_DURATIONS[STATE_POOPING];
      break;
    default:
      pooper.stateTimer = POOPER_STATE_DURATIONS[nextState] ?? 0;
      break;
  }
}

function attemptToOccupyToilet(pooper) {
  const slotIndex = findAvailableToiletIndex(pooper);

  if (slotIndex === null) {
    setPooperState(pooper, STATE_WAITING_FOR_SPOT);
    return;
  }

  const slot = toilets[slotIndex];
  if (!slot) {
    setPooperState(pooper, STATE_WAITING_FOR_SPOT);
    return;
  }

  slot.currentPooperId = pooper.id;
  pooper.currentToiletIndex = slotIndex;
  pooper.state = STATE_POOPING;
  pooper.stateTimer = POOPER_STATE_DURATIONS[STATE_POOPING];
}

function findAvailableToiletIndex(pooper) {
  const preferredIndex = pooper.assignedTo != null ? pooper.assignedTo - 1 : null;

  if (
    preferredIndex != null &&
    toilets[preferredIndex] &&
    !toilets[preferredIndex].currentPooperId
  ) {
    return preferredIndex;
  }

  for (let i = 0; i < toilets.length; i++) {
    const slot = toilets[i];
    if (slot && !slot.currentPooperId) {
      return i;
    }
  }

  return null;
}

function releaseToilet(pooper) {
  if (pooper.currentToiletIndex == null) {
    return;
  }

  const slot = toilets[pooper.currentToiletIndex];
  if (slot && slot.currentPooperId === pooper.id) {
    slot.currentPooperId = null;
  }

  pooper.currentToiletIndex = null;
}

setInterval(() => {
  tickPoopers(TICK_INTERVAL_MS);

  if (passivePoopPerSecond > 0) {
    const passiveGain = passivePoopPerSecond * (TICK_INTERVAL_MS / 1000);
    points += passiveGain;
    totalPoints += passiveGain;
  }

  updateUI();
}, TICK_INTERVAL_MS);