// script.js

// ─── State ─────────────────────────────────────────────
let points = 0;
let totalPoints = 0;
let poopPerClick = 100;
let passivePoopPerSecond = 0;
const spaceThresholds = [20, 100, 1000, 100000, 1000000, 100000000, 1000000000, 10000000000, 100000000000];
const maxSpaces = spaceThresholds.length;
const spotTypes = [
  { id: "porta_potty", name: "Porta Potty", cost: 100, capacity: 1, multiplier: 1 },
  { id: "family_bathroom", name: "Family Bathroom", cost: 450, capacity: 2, multiplier: 1.35 },
  { id: "luxury_restroom", name: "Luxury Restroom", cost: 2000, capacity: 4, multiplier: 1.8 },
];

let spots = new Array(maxSpaces).fill(null);
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
const STATE_RESTING = "resting";

const POOPER_STATE_SEQUENCE = [
  STATE_EATING,
  STATE_DIGESTING,
  STATE_LOOKING_FOR_SPOT,
  STATE_POOPING,
  STATE_RESTING,
];

const POOPER_STATE_DURATIONS = {
  [STATE_EATING]: 5000,
  [STATE_DIGESTING]: 4000,
  [STATE_WAITING_FOR_SPOT]: 2000,
  [STATE_POOPING]: 2000,
  [STATE_RESTING]: 3000,
};

const TICK_INTERVAL_MS = 1000;

const POOPER_STATE_LABELS = {
  [STATE_IDLE]: "Idle",
  [STATE_EATING]: "Eating",
  [STATE_DIGESTING]: "Digesting",
  [STATE_LOOKING_FOR_SPOT]: "Looking for Spot",
  [STATE_WAITING_FOR_SPOT]: "Waiting for Spot",
  [STATE_POOPING]: "Pooping",
  [STATE_RESTING]: "Resting",
};

const upgrades = [
  {
    id: "upgrade1",
    name: "Poop Scooper",
    icon: "🧹",
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
    icon: "🪱",
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
    icon: "🌀",
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
    icon: "♻️",
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

let pooperListContainer = null;


//-------------------Spot grid------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  const tabs   = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');
  const buildingMenu = document.getElementById('building-menu');
  const spacesGrid   = document.getElementById('spaces-grid');
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

  if (buildingMenu) {
    buildingMenu.innerHTML = '';
    spotTypes.forEach((type) => {
      const option = document.createElement('button');
      option.dataset.spotType = type.id;
      option.innerHTML = `
        <span class="spot-name">${type.name}</span>
        <span class="spot-stats">
          Cost: ${formatNumber(type.cost)}<br>
          Capacity: ${type.capacity}<br>
          Multiplier: x${type.multiplier.toFixed(2)}
        </span>
      `;
      buildingMenu.appendChild(option);
    });
  }

  function updateMenuButtonState() {
    if (!buildingMenu) return;
    const slotOwned = selectedSpace != null ? Boolean(spots[selectedSpace - 1]) : false;
    buildingMenu.querySelectorAll('button').forEach((button) => {
      const type = spotTypes.find((candidate) => candidate.id === button.dataset.spotType);
      button.disabled = slotOwned || !type || points < type.cost;
    });
  }

  if (spacesGrid) {
    for (let i = 1; i <= maxSpaces; i++) {
      const item = document.createElement('div');
      item.className = 'space-item';

      const info = document.createElement('div');
      info.className = 'spot-info';
      info.innerHTML = '<strong>Empty Plot</strong><div>Buy a spot to unlock capacity.</div>';
      item.appendChild(info);

      const btn = document.createElement('button');
      btn.textContent = 'Buy';
      btn.disabled   = false;
      btn.dataset.spaceIndex = i;

      btn.addEventListener('click', (e) => {
        if (btn.disabled) return;
        if (spots[i - 1]) return;
        selectedSpace = i;
        const rect = btn.getBoundingClientRect();
        if (buildingMenu) {
          buildingMenu.dataset.selectedSpace = String(i);
          buildingMenu.style.left    = `${rect.left + window.scrollX}px`;
          buildingMenu.style.top     = `${rect.bottom + window.scrollY}px`;
          updateMenuButtonState();
          buildingMenu.style.display = 'flex';
        }
        e.stopPropagation();
      });

      item.appendChild(btn);
      spacesGrid.appendChild(item);
    }
  }

  document.addEventListener('click', () => {
    if (buildingMenu) {
      buildingMenu.style.display = 'none';
      delete buildingMenu.dataset.selectedSpace;
    }
    selectedSpace = null;
  });

  if (buildingMenu) {
    buildingMenu.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      if (!button) return;
      if (selectedSpace == null) return;
      const typeId = button.dataset.spotType;
      purchaseSpot(selectedSpace, typeId);
      buildingMenu.style.display = 'none';
      delete buildingMenu.dataset.selectedSpace;
      selectedSpace = null;
      e.stopPropagation();
    });
  }

  const pooperHireSection = document.getElementById('pooper-hiring');
  pooperListContainer = document.getElementById('pooper-list-body');

  if (pooperHireSection) {
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
      pooperHireSection.appendChild(row);

      const buyButton = document.getElementById(`buy-pooper-${idx}`);
      buyButton.addEventListener('click', () => {
        buyPooper(idx);
        console.log(`Clicked Buy for ${template.name} (index=${idx})`);
      });

      updatePooperCountDisplay(idx);
    });
  }

  const mobileTabsContainer = document.getElementById('poop-mobile-tabs');
  const accordionRoot = document.querySelector('[data-accordion-root]');
  const mobilePanels = Array.from(
    document.querySelectorAll('#poop-mobile-panels [data-mobile-panel]')
  );
  const mobileTabButtons = mobileTabsContainer
    ? Array.from(mobileTabsContainer.querySelectorAll('.poop-mobile-tab[data-target]'))
    : [];
  const accordionButtons = accordionRoot
    ? Array.from(accordionRoot.querySelectorAll('[data-accordion-target]'))
    : [];

  if ((mobileTabButtons.length || accordionButtons.length) && mobilePanels.length) {
    const mobileMediaQuery = window.matchMedia('(max-width: 767px)');
    let activeInfoSectionId = null;

    function updateActivePanelHeight() {
      if (!activeInfoSectionId) {
        return;
      }

      const activePanel = mobilePanels.find((panel) => panel.id === activeInfoSectionId);
      if (!activePanel) {
        return;
      }

      requestAnimationFrame(() => {
        activePanel.style.maxHeight = `${activePanel.scrollHeight}px`;
      });
    }

    function setActiveInfoSection(targetId) {
      if (!targetId) {
        return;
      }

      const matchingPanel = mobilePanels.find((panel) => panel.id === targetId);
      if (!matchingPanel) {
        return;
      }

      activeInfoSectionId = targetId;
      const isMobile = mobileMediaQuery.matches;

      mobilePanels.forEach((panel) => {
        const isActive = panel.id === targetId;
        panel.classList.toggle('accordion-panel-open', isActive);
        panel.classList.toggle('mobile-panel-active', isActive);
        panel.setAttribute('aria-hidden', String(!isActive));
        panel.setAttribute('tabindex', isActive ? '0' : '-1');

        if (!isActive) {
          panel.style.maxHeight = '0px';
        }

        if (isMobile && !isActive) {
          panel.setAttribute('hidden', '');
        } else {
          panel.removeAttribute('hidden');
        }

        const parentItem = panel.closest('.accordion-item');
        if (parentItem) {
          parentItem.classList.toggle('accordion-item-open', isActive);
        }
      });

      accordionButtons.forEach((button) => {
        const isActive = button.dataset.accordionTarget === targetId;
        button.setAttribute('aria-expanded', String(isActive));
      });

      mobileTabButtons.forEach((button) => {
        const isActive = button.dataset.target === targetId;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', String(isActive));
      });

      updateActivePanelHeight();
    }

    const initiallyExpandedButton = accordionButtons.find(
      (button) => button.getAttribute('aria-expanded') === 'true'
    );
    const initiallyActiveTab = mobileTabButtons.find((button) => button.classList.contains('active'));

    if (initiallyExpandedButton) {
      activeInfoSectionId = initiallyExpandedButton.dataset.accordionTarget;
    } else if (initiallyActiveTab) {
      activeInfoSectionId = initiallyActiveTab.dataset.target;
    } else if (mobilePanels.length) {
      activeInfoSectionId = mobilePanels[0].id;
    }

    if (activeInfoSectionId) {
      setActiveInfoSection(activeInfoSectionId);
    }

    accordionButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const targetId = button.dataset.accordionTarget;
        if (!targetId) {
          return;
        }
        setActiveInfoSection(targetId);
      });
    });

    mobileTabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const targetId = button.dataset.target;
        if (!targetId) {
          return;
        }
        setActiveInfoSection(targetId);
      });
    });

    const handleViewportChange = () => {
      if (!activeInfoSectionId && mobilePanels.length) {
        activeInfoSectionId = mobilePanels[0].id;
      }
      if (activeInfoSectionId) {
        setActiveInfoSection(activeInfoSectionId);
      }
    };

    if (typeof mobileMediaQuery.addEventListener === 'function') {
      mobileMediaQuery.addEventListener('change', handleViewportChange);
    } else if (typeof mobileMediaQuery.addListener === 'function') {
      mobileMediaQuery.addListener(handleViewportChange);
    }

    window.addEventListener('resize', updateActivePanelHeight);
  }

  updateUI();
});

// ─── functions ─────────────────────────────────────────
function formatNumber(n) {
  if (n >= 1e9) return (n/1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n/1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n/1e3).toFixed(2) + "K";
  return n;
}

function getPooperCounts(typeId) {
  return poopers.reduce(
    (counts, pooper) => {
      if (pooper.typeId !== typeId) {
        return counts;
      }

      counts.total += 1;

      if (pooper.state === STATE_IDLE) {
        counts.available += 1;
      } else {
        counts.busy += 1;
      }

      return counts;
    },
    { total: 0, available: 0, busy: 0 }
  );
}

function updatePooperCountDisplay(typeId) {
  const countSpan = document.getElementById(`pooper-count-${typeId}`);
  if (countSpan) {
    const { total, available, busy } = getPooperCounts(typeId);
    countSpan.textContent = total;
    countSpan.title = `Total: ${total}\nAvailable: ${available}\nBusy: ${busy}`;
  }
}

function getPooperStateLabel(state) {
  if (POOPER_STATE_LABELS[state]) {
    return POOPER_STATE_LABELS[state];
  }

  return state
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getPooperProgressInfo(pooper) {
  const duration = POOPER_STATE_DURATIONS[pooper.state];
  if (typeof duration === 'number' && duration > 0) {
    const rawRemaining =
      typeof pooper.stateTimer === 'number'
        ? pooper.stateTimer
        : duration;
    const remaining = Math.max(0, Math.min(duration, rawRemaining));
    const completed = duration - remaining;
    const percent = Math.max(0, Math.min(100, (completed / duration) * 100));
    const secondsLeft = remaining / 1000;
    const decimals = secondsLeft >= 10 ? 0 : 1;

    return {
      percent,
      text: `${secondsLeft.toFixed(decimals)}s left`,
    };
  }

  if (pooper.state === STATE_LOOKING_FOR_SPOT) {
    return { percent: 0, text: 'Searching…' };
  }

  if (pooper.state === STATE_IDLE) {
    return { percent: 0, text: 'Ready' };
  }

  return { percent: 0, text: '' };
}

function renderPooperList() {
  if (!pooperListContainer) {
    return;
  }

  if (poopers.length === 0) {
    pooperListContainer.innerHTML = '<p class="pooper-list-empty">Hire a pooper to kick things off.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  poopers.forEach((pooper) => {
    const card = document.createElement('article');
    card.className = 'pooper-card';
    card.setAttribute('role', 'listitem');

    const header = document.createElement('div');
    header.className = 'pooper-card-header';

    const nameEl = document.createElement('span');
    nameEl.className = 'pooper-name';
    const template = aPoopers[pooper.typeId];
    const baseName = template ? template.name : 'Pooper';
    nameEl.textContent = `${baseName} #${pooper.id}`;

    const stateEl = document.createElement('span');
    stateEl.className = 'pooper-state';
    const stateLabel = getPooperStateLabel(pooper.state);
    stateEl.textContent = stateLabel;

    header.append(nameEl, stateEl);

    const progressWrapper = document.createElement('div');
    progressWrapper.className = 'pooper-progress-wrapper';

    const progressBar = document.createElement('div');
    progressBar.className = 'pooper-progress-bar';
    progressBar.setAttribute('role', 'progressbar');
    progressBar.setAttribute('aria-valuemin', '0');
    progressBar.setAttribute('aria-valuemax', '100');
    progressBar.setAttribute('aria-label', `${stateLabel} progress`);

    const progressFill = document.createElement('div');
    progressFill.className = 'pooper-progress-fill';

    const progressInfo = getPooperProgressInfo(pooper);
    const percent = Math.round(progressInfo.percent);
    progressFill.style.width = `${progressInfo.percent}%`;
    progressBar.setAttribute('aria-valuenow', String(percent));

    progressBar.appendChild(progressFill);
    progressWrapper.appendChild(progressBar);

    if (progressInfo.text) {
      const progressLabel = document.createElement('span');
      progressLabel.className = 'pooper-progress-label';
      progressLabel.textContent = progressInfo.text;
      progressWrapper.appendChild(progressLabel);
    }

    card.append(header, progressWrapper);
    fragment.appendChild(card);
  });

  pooperListContainer.innerHTML = '';
  pooperListContainer.appendChild(fragment);
}

function getSpotType(typeId) {
  return spotTypes.find((spot) => spot.id === typeId) ?? null;
}

function purchaseSpot(spaceIndex, typeId) {
  const index = Number(spaceIndex) - 1;
  const type = getSpotType(typeId);

  if (Number.isNaN(index) || index < 0 || index >= spots.length) {
    console.error('Invalid spot index', spaceIndex);
    return;
  }

  if (!type) {
    console.error('Unknown spot type', typeId);
    return;
  }

  if (spots[index]) {
    console.warn(`Spot ${index + 1} already owned.`);
    return;
  }

  if (points < type.cost) {
    alert('Not enough poop to buy this spot!');
    return;
  }

  points -= type.cost;
  spots[index] = {
    typeId: type.id,
    name: type.name,
    cost: type.cost,
    capacity: type.capacity,
    multiplier: type.multiplier,
    occupants: new Set(),
  };

  updateSpotDisplay(index);
  updateUI();
}

function updateSpotDisplay(index, slotElement) {
  const items = document.querySelectorAll('#spaces-grid .space-item');
  const slot = slotElement ?? items[index];

  if (!slot) {
    return;
  }

  let info = slot.querySelector('.spot-info');
  if (!info) {
    info = document.createElement('div');
    info.className = 'spot-info';
    slot.insertBefore(info, slot.firstChild ?? null);
  }

  const spot = spots[index];
  const btn = slot.querySelector('button');

  if (!spot) {
    info.innerHTML = '<strong>Empty Plot</strong><div>Buy a spot to unlock capacity.</div>';
    if (btn) {
      btn.textContent = 'Buy';
      btn.disabled = false;
    }
    return;
  }

  info.innerHTML = `
    <strong>${spot.name}</strong>
    <div class="spot-capacity">Capacity: ${spot.capacity}</div>
    <div class="spot-occupants">Occupants: ${spot.occupants.size} / ${spot.capacity}</div>
    <div>Multiplier: x${spot.multiplier.toFixed(2)}</div>
  `;

  if (btn) {
    btn.textContent = 'Owned';
    btn.disabled = true;
  }
}

function findAvailableSpotIndex() {
  for (let i = 0; i < spots.length; i++) {
    const spot = spots[i];
    if (spot && spot.occupants.size < spot.capacity) {
      return i;
    }
  }
  return null;
}

function requestSpotOccupancy(pooper) {
  const index = findAvailableSpotIndex();
  if (index == null) {
    return null;
  }

  const spot = spots[index];
  if (!spot) {
    return null;
  }

  if (spot.occupants.has(pooper.id)) {
    return index;
  }

  if (spot.occupants.size >= spot.capacity) {
    return null;
  }

  spot.occupants.add(pooper.id);
  pooper.currentSpotIndex = index;
  pooper.activeMultiplier = spot.multiplier;
  updateSpotDisplay(index);
  return index;
}

function releaseSpotOccupancy(pooper) {
  if (pooper.currentSpotIndex == null) {
    pooper.activeMultiplier = 1;
    return;
  }

  const spot = spots[pooper.currentSpotIndex];
  if (spot) {
    spot.occupants.delete(pooper.id);
    updateSpotDisplay(pooper.currentSpotIndex);
  }

  pooper.currentSpotIndex = null;
  pooper.activeMultiplier = 1;
}

function attemptToOccupySpot(pooper) {
  const index = requestSpotOccupancy(pooper);
  if (index == null) {
    setPooperState(pooper, STATE_WAITING_FOR_SPOT);
    return;
  }

  pooper.state = STATE_POOPING;
  pooper.stateTimer = POOPER_STATE_DURATIONS[STATE_POOPING];
}

function renderUpgrades() {
  if (!upgradesPanel) return;

  upgradesPanel.innerHTML = "";

  upgrades.forEach((upgrade) => {
    const card = document.createElement("div");
    card.className = "upgrade-card";
    card.dataset.description = upgrade.description;
    card.tabIndex = 0;
    card.setAttribute("role", "group");

    const isUnlocked = upgrade.isUnlocked();
    const isPurchased = upgrade.isPurchased;
    const canAfford = points >= upgrade.cost;

    if (isPurchased) {
      card.classList.add("purchased");
    }

    if (!isUnlocked) {
      card.classList.add("locked");
    } else if (!isPurchased && !canAfford) {
      card.classList.add("unaffordable");
    }

    if (isUnlocked && !isPurchased && canAfford) {
      card.classList.add("affordable");
    }

    const header = document.createElement("div");
    header.className = "upgrade-card-header";

    const icon = document.createElement("span");
    icon.className = "upgrade-icon";
    icon.textContent = upgrade.icon || "⬆️";

    const title = document.createElement("span");
    title.className = "upgrade-name";
    title.textContent = upgrade.name;

    header.append(icon, title);

    const spacer = document.createElement("div");
    spacer.className = "upgrade-spacer";

    const cost = document.createElement("div");
    cost.className = "upgrade-cost";
    cost.textContent = `Cost: ${formatNumber(upgrade.cost)}`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "upgrade-buy";

    if (isPurchased) {
      button.textContent = "Purchased";
      button.disabled = true;
    } else if (!isUnlocked) {
      button.textContent = "Locked";
      button.disabled = true;
    } else {
      button.textContent = `Buy (${formatNumber(upgrade.cost)})`;
      if (!canAfford) {
        button.classList.add("upgrade-buy--unaffordable");
      }
      button.addEventListener("click", () => purchaseUpgrade(upgrade));
    }

    card.append(header, spacer, cost, button);
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
  const container = document.getElementById("poop-progress-container");
  const progressBar = document.getElementById("poop-progress-bar");

  if (!container || !progressBar) {
    return;
  }

  const ratio = max > 0 ? current / max : 0;
  const percentage = Math.max(0, Math.min(100, ratio * 100));

  progressBar.style.width = `${percentage}%`;
  progressBar.textContent = "";

  let label = container.querySelector(".poop-progress-label");
  if (!label) {
    label = document.createElement("span");
    label.className = "poop-progress-label";
    container.appendChild(label);
  }

  label.textContent = `${formatNumber(current)} / ${formatNumber(max)}`;
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

function getPooperSpotMultiplier(pooper) {
  if (pooper.currentSpotIndex != null) {
    const spot = spots[pooper.currentSpotIndex];
    if (spot && typeof spot.multiplier === "number") {
      return spot.multiplier;
    }
  }
  if (typeof pooper.activeMultiplier === "number") {
    return pooper.activeMultiplier;
  }
  return 1;
}

function getPooperUpgradeMultiplier(pooper) {
  return upgrades.reduce((multiplier, upgrade) => {
    if (!upgrade.isPurchased) {
      return multiplier;
    }

    if (typeof upgrade.getPooperOutputMultiplier === "function") {
      const value = upgrade.getPooperOutputMultiplier(pooper);
      if (typeof value === "number" && Number.isFinite(value)) {
        return multiplier * value;
      }
    }

    const staticMultiplier =
      typeof upgrade.pooperOutputMultiplier === "number"
        ? upgrade.pooperOutputMultiplier
        : typeof upgrade.outputMultiplier === "number"
          ? upgrade.outputMultiplier
          : null;

    if (staticMultiplier != null && Number.isFinite(staticMultiplier)) {
      return multiplier * staticMultiplier;
    }

    return multiplier;
  }, 1);
}

function calculatePooperCompletionReward(pooper) {
  const baseOutput = Number(pooper.baseOutput) || 0;
  if (baseOutput <= 0) {
    return 0;
  }

  const spotMultiplier = getPooperSpotMultiplier(pooper);
  const upgradeMultiplier = getPooperUpgradeMultiplier(pooper);
  return baseOutput * spotMultiplier * upgradeMultiplier;
}

function getPoopPerSecond() {
  const lifecycleStates = [
    STATE_EATING,
    STATE_DIGESTING,
    STATE_LOOKING_FOR_SPOT,
    STATE_WAITING_FOR_SPOT,
    STATE_POOPING,
    STATE_RESTING,
  ];

  const totalLifecycleDurationMs = lifecycleStates.reduce((durationSum, state) => {
    const duration = POOPER_STATE_DURATIONS[state];
    return durationSum + (typeof duration === "number" ? duration : 0);
  }, 0);

  if (totalLifecycleDurationMs <= 0) {
    return passivePoopPerSecond;
  }

  const totalLifecycleDurationSeconds = totalLifecycleDurationMs / 1000;

  const projectedWorkerRate = poopers.reduce((sum, pooper) => {
    const completionReward = calculatePooperCompletionReward(pooper);
    if (!(completionReward > 0)) {
      return sum;
    }

    const throughput = completionReward / totalLifecycleDurationSeconds;

    return sum + throughput;
  }, 0);

  return projectedWorkerRate + passivePoopPerSecond;
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

    updateSpotDisplay(i, slot);
  });
  const buildingMenuEl = document.getElementById('building-menu');
  if (buildingMenuEl) {
    const selectedIndex = buildingMenuEl.dataset.selectedSpace
      ? Number(buildingMenuEl.dataset.selectedSpace)
      : null;
    const slotOwned = selectedIndex != null ? Boolean(spots[selectedIndex - 1]) : false;
    buildingMenuEl.querySelectorAll('button').forEach((button) => {
      const type = getSpotType(button.dataset.spotType);
      button.disabled = slotOwned || !type || points < type.cost;
    });
  }
  aPoopers.forEach((_, idx) => updatePooperCountDisplay(idx));
  updateProgressBar(totalPoints, 1e15);
  renderUpgrades();
  renderPooperList();

}

// ─── Actions ─────────────────────────────────────────

// Manual click
defecateButton.addEventListener("click", () => {
  points += poopPerClick;
  totalPoints += poopPerClick;
  updateUI();
});

// Hire an Average Pooper
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
    currentSpotIndex: null,
    activeMultiplier: 1,
    baseOutput: template.rate,
  };
  poopers.push(newPooper);

  // 4) update both side‐panel and main UI
  setPooperState(newPooper, STATE_EATING);
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
    attemptToOccupySpot(pooper);
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
    pooper.stateTimer -= deltaMs;
    if (pooper.stateTimer <= 0) {
      const reward = calculatePooperCompletionReward(pooper);
      if (reward > 0) {
        points += reward;
        totalPoints += reward;
      }
      advancePooperState(pooper);
    }
    return;
  }

  if (pooper.state === STATE_RESTING) {
    pooper.stateTimer = Math.max(
      0,
      (pooper.stateTimer ?? POOPER_STATE_DURATIONS[STATE_RESTING]) - deltaMs,
    );

    if (pooper.stateTimer <= 0) {
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
  const previousState = pooper.state;
  if (previousState === STATE_POOPING && nextState !== STATE_POOPING) {
    releaseSpotOccupancy(pooper);
  }

  pooper.state = nextState;

  switch (nextState) {
    case STATE_LOOKING_FOR_SPOT:
      attemptToOccupySpot(pooper);
      break;
    case STATE_WAITING_FOR_SPOT:
      pooper.stateTimer = POOPER_STATE_DURATIONS[STATE_WAITING_FOR_SPOT];
      break;
    case STATE_POOPING:
      pooper.stateTimer = POOPER_STATE_DURATIONS[STATE_POOPING];
      break;
    case STATE_RESTING:
      pooper.stateTimer = POOPER_STATE_DURATIONS[STATE_RESTING];
      break;
    default:
      pooper.stateTimer = POOPER_STATE_DURATIONS[nextState] ?? 0;
      break;
  }

  updatePooperCountDisplay(pooper.typeId);
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