// script.js

// ─── State ─────────────────────────────────────────────
let points = 0;
let totalPoints = 0
const spaceThresholds = [20, 100, 1000, 100000, 1000000, 100000000, 1000000000, 10000000000, 100000000000];
const maxSpaces = spaceThresholds.length;
let toilets =  new Array(maxSpaces).fill(null);
let averagePooperCost = 10;
let initialUnlocked = 0
const aPoopers = [
  { name: "Average Pooper", rate: 1 }  // rate = poop/sec
];
const ownedAPoopers = new Array(aPoopers.length).fill(0);

// ─── Element refs ────────────────────────────────────
const poopAmount         = document.getElementById("poopAmount");
const poopIcon           = document.getElementsByClassName("poopIcon");
const defecateButton     = document.getElementById("defecatebutton");
const spacesDisplay      = document.getElementById("spaces");
const aPooperCostDisplay = document.getElementById("aPooperCost");
const poopPerSecondDisplay = document.getElementById("poopPerSecond")


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
    buyButton.addEventListener('click', () => { buyPooper(idx)
      console.log(`Clicked Buy for ${template.name} (index=${idx})`);
    });
  });
});

// ─── functions ─────────────────────────────────────────
function formatNumber(n) {
  if (n >= 1e9) return (n/1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n/1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n/1e3).toFixed(2) + "K";
  return n;
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
  return toilets.reduce((sum, slot) => {
    return sum + (slot && slot.pooper ? slot.pooper.rate : 0);
  }, 0);
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
  document.getElementById('poopPerSecond').textContent =
    `Poop/sec: ${formatNumber(pps)}`;
  //poopIcon.style.fontSize = `${32 + points/100}px`;//
  getUnlockedSpaces();
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
  
}

// ─── Actions ─────────────────────────────────────────

// Manual click
defecateButton.addEventListener("click", () => {
  points += 100;
  totalPoints += 100;
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
  updateUI();
},
 1000)