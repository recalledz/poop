// script.js

// ─── State ─────────────────────────────────────────────
let points = 0;
let totalPoints = 0;
let poopPerClick = 100;
let passivePoopPerSecond = 0;

function createCostCurve(baseCost, growthRate, levelOffset) {
  return (level) => baseCost * Math.pow(growthRate, Math.max(0, level - levelOffset));
}

const spotTierConfig = [
  {
    id: "compost-corner",
    name: "Compost Corner",
    icon: "🌿",
    multiplier: 1,
    costCurve: () => 0,
  },
  {
    id: "bucket-brigade",
    name: "Bucket Brigade",
    icon: "🪣",
    multiplier: 1.35,
    costCurve: createCostCurve(350, 1.25, 1),
  },
  {
    id: "porcelain-palace",
    name: "Porcelain Palace",
    icon: "🚽",
    multiplier: 1.75,
    costCurve: createCostCurve(1200, 1.3, 2),
  },
  {
    id: "spa-suite",
    name: "Spa Suite",
    icon: "🧖",
    multiplier: 2.2,
    costCurve: createCostCurve(3200, 1.4, 3),
  },
  {
    id: "galactic-gazebo",
    name: "Galactic Gazebo",
    icon: "🪐",
    multiplier: 3,
    costCurve: createCostCurve(7600, 1.5, 4),
  },
];

const spotRoster = [
  { id: "rustic-hollow", name: "Rustic Hollow", unlockAtTotal: 0 },
  { id: "garden-nook", name: "Garden Nook", unlockAtTotal: 0 },
  { id: "skyline-suite", name: "Skyline Suite", unlockAtTotal: 2500 },
];

const spots = spotRoster.map(createSpotState);
const spotViews = [];
let averagePooperCost = 10;
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
const poopPerSecondDisplay = document.getElementById("poopPerSecond");
const upgradesPanel      = document.getElementById("upgrades-panel");

let pooperListContainer = null;


//-------------------Spot strip------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  const tabs   = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');
  const spotStrip   = document.getElementById('spot-strip');
  const spotAccordion = document.getElementById('spot-accordion');

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

  if (spotStrip || spotAccordion) {
    spots.forEach((_, index) => {
      if (spotStrip) {
        const card = createSpotCard(index);
        spotStrip.appendChild(card);
      }

      if (spotAccordion) {
        const accordionItem = createSpotAccordionItem(index);
        spotAccordion.appendChild(accordionItem);
      }
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
  const mobilePanelIds = ['pooper-hiring', 'pooper-list-section', 'spots-mobile-panel', 'upgrades-panel'];
  const mobilePanels = mobilePanelIds
    .map((panelId) => document.getElementById(panelId))
    .filter((panel) => panel);

  if (mobileTabsContainer && mobilePanels.length) {
    const mobileTabButtons = Array.from(
      mobileTabsContainer.querySelectorAll('.poop-mobile-tab[data-target]')
    );
    const mobileMediaQuery = window.matchMedia('(max-width: 767px)');

    function showAllMobilePanels() {
      mobilePanels.forEach((panel) => {
        panel.classList.remove('mobile-panel-active');
        panel.removeAttribute('aria-hidden');
        panel.removeAttribute('hidden');
        panel.removeAttribute('tabindex');
      });
      mobileTabButtons.forEach((button) => {
        button.classList.remove('active');
        button.setAttribute('aria-selected', 'false');
      });
    }

    function activateMobilePanel(targetId) {
      mobilePanels.forEach((panel) => {
        const isActive = panel.id === targetId;
        panel.classList.toggle('mobile-panel-active', isActive);
        panel.toggleAttribute('hidden', !isActive);
        panel.setAttribute('aria-hidden', String(!isActive));
        panel.setAttribute('tabindex', isActive ? '0' : '-1');
      });

      mobileTabButtons.forEach((button) => {
        const isActive = button.dataset.target === targetId;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', String(isActive));
      });
    }

    function syncMobilePanelsForViewport() {
      if (!mobileMediaQuery.matches) {
        showAllMobilePanels();
        return;
      }

      let activeButton = mobileTabButtons.find((button) => button.classList.contains('active'));
      if (!activeButton && mobileTabButtons.length > 0) {
        activeButton = mobileTabButtons[0];
        activeButton.classList.add('active');
      }

      if (activeButton) {
        activateMobilePanel(activeButton.dataset.target);
      }
    }

    mobileTabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        if (!mobileMediaQuery.matches) {
          return;
        }

        if (button.classList.contains('active')) {
          return;
        }

        activateMobilePanel(button.dataset.target);
      });
    });

    if (typeof mobileMediaQuery.addEventListener === 'function') {
      mobileMediaQuery.addEventListener('change', syncMobilePanelsForViewport);
    } else if (typeof mobileMediaQuery.addListener === 'function') {
      mobileMediaQuery.addListener(syncMobilePanelsForViewport);
    }

    syncMobilePanelsForViewport();
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

function calculateSpotUpgradeCost(level) {
  const nextLevel = level + 1;
  const nextTier = spotTierConfig[nextLevel];
  if (!nextTier) {
    return null;
  }

  const rawCost = typeof nextTier.costCurve === 'function'
    ? nextTier.costCurve(nextLevel)
    : nextTier.baseCost;

  if (rawCost == null) {
    return null;
  }

  const cost = Math.floor(rawCost);
  return Number.isFinite(cost) ? Math.max(0, cost) : null;
}

function getSpotTier(level) {
  if (!spotTierConfig.length) {
    return null;
  }

  const clampedIndex = Math.min(Math.max(level, 0), spotTierConfig.length - 1);
  return spotTierConfig[clampedIndex];
}

function recalculateSpotStats(spot) {
  const tier = getSpotTier(spot.level);
  spot.multiplier = tier ? tier.multiplier : 1;
  spot.nextUpgradeCost = calculateSpotUpgradeCost(spot.level);
}

function createSpotState(config) {
  const spot = {
    id: config.id,
    name: config.name,
    unlockAtTotal: config.unlockAtTotal,
    isUnlocked: totalPoints >= config.unlockAtTotal,
    level: 0,
    multiplier: 1,
    nextUpgradeCost: null,
    occupants: new Set(),
    capacity: 1,
  };

  recalculateSpotStats(spot);
  return spot;
}

function ensureSpotView(index) {
  if (!spotViews[index]) {
    spotViews[index] = { renderedLevel: null };
  }
  return spotViews[index];
}

function createSpotCard(index) {
  const view = ensureSpotView(index);
  const card = document.createElement('article');
  card.className = 'spot-card';
  card.dataset.spotIndex = String(index);
  card.setAttribute('role', 'listitem');

  const body = document.createElement('div');
  body.className = 'spot-card-body';

  const icon = document.createElement('div');
  icon.className = 'spot-icon';

  const header = document.createElement('div');
  header.className = 'spot-header';

  const nameEl = document.createElement('h3');
  nameEl.className = 'spot-name';

  const levelBadge = document.createElement('span');
  levelBadge.className = 'spot-level-badge';

  header.append(nameEl, levelBadge);

  const multiplier = document.createElement('div');
  multiplier.className = 'spot-multiplier';

  const occupancy = document.createElement('div');
  occupancy.className = 'spot-occupancy';

  const occupancyBar = document.createElement('div');
  occupancyBar.className = 'spot-occupancy-bar';

  const occupancyFill = document.createElement('div');
  occupancyFill.className = 'spot-occupancy-fill';
  occupancyBar.appendChild(occupancyFill);

  const occupancyText = document.createElement('span');
  occupancyText.className = 'spot-occupancy-text';
  occupancy.append(occupancyBar, occupancyText);

  const upgradeButton = document.createElement('button');
  upgradeButton.type = 'button';
  upgradeButton.className = 'spot-upgrade-button';
  upgradeButton.addEventListener('click', () => upgradeSpot(index));

  const tooltip = document.createElement('div');
  tooltip.className = 'spot-tooltip';
  tooltip.setAttribute('role', 'presentation');

  const overlay = document.createElement('div');
  overlay.className = 'spot-locked-overlay';

  const overlayMessage = document.createElement('div');
  overlayMessage.className = 'spot-locked-message';
  overlay.appendChild(overlayMessage);

  body.append(icon, header, multiplier, occupancy, upgradeButton);
  card.append(body, overlay, tooltip);

  view.card = {
    element: card,
    icon,
    name: nameEl,
    levelBadge,
    multiplier,
    occupancyFill,
    occupancyText,
    upgradeButton,
    overlay,
    overlayMessage,
    tooltip,
  };

  return card;
}

function createSpotAccordionItem(index) {
  const view = ensureSpotView(index);
  const details = document.createElement('details');
  details.className = 'spot-accordion-item';
  details.dataset.spotIndex = String(index);
  details.setAttribute('role', 'listitem');

  const summary = document.createElement('summary');
  summary.className = 'spot-accordion-summary';

  const icon = document.createElement('span');
  icon.className = 'spot-accordion-icon';

  const nameEl = document.createElement('span');
  nameEl.className = 'spot-accordion-name';

  const level = document.createElement('span');
  level.className = 'spot-accordion-level';

  summary.append(icon, nameEl, level);

  const body = document.createElement('div');
  body.className = 'spot-accordion-body';

  const multiplier = document.createElement('div');
  multiplier.className = 'spot-accordion-multiplier';

  const occupancy = document.createElement('div');
  occupancy.className = 'spot-accordion-occupancy';

  const tooltip = document.createElement('div');
  tooltip.className = 'spot-accordion-tooltip';

  const lockedMessage = document.createElement('div');
  lockedMessage.className = 'spot-accordion-locked';

  const upgradeButton = document.createElement('button');
  upgradeButton.type = 'button';
  upgradeButton.className = 'spot-upgrade-button';
  upgradeButton.addEventListener('click', (event) => {
    event.stopPropagation();
    upgradeSpot(index);
  });

  body.append(multiplier, occupancy, tooltip, lockedMessage, upgradeButton);
  details.append(summary, body);

  view.accordion = {
    element: details,
    summary,
    icon,
    name: nameEl,
    level,
    multiplier,
    occupancy,
    tooltip,
    locked: lockedMessage,
    upgradeButton,
  };

  return details;
}

function updateSpotUpgradeButton(button, spot) {
  if (!button) {
    return;
  }

  button.classList.remove('is-locked', 'is-maxed', 'is-unaffordable');

  if (!spot.isUnlocked) {
    button.textContent = 'Locked';
    button.disabled = true;
    button.classList.add('is-locked');
    return;
  }

  const cost = spot.nextUpgradeCost;

  if (cost == null) {
    button.textContent = 'Max Level';
    button.disabled = true;
    button.classList.add('is-maxed');
    return;
  }

  const canAfford = points >= cost;
  button.textContent = `Upgrade (${formatNumber(cost)})`;
  button.disabled = !canAfford;

  if (!canAfford) {
    button.classList.add('is-unaffordable');
  }
}

function createSpotTooltipMarkup(spot, tier, nextTier) {
  const unlocked = spot.isUnlocked;
  const capacityLabel = `${spot.capacity} seat${spot.capacity === 1 ? '' : 's'}`;
  const bonusLabel = unlocked ? `x${spot.multiplier.toFixed(2)}` : '—';
  const nextLabel = nextTier
    ? `${nextTier.name} (x${nextTier.multiplier.toFixed(2)})`
    : 'Maxed';
  const upgradeCostLabel = spot.nextUpgradeCost != null
    ? formatNumber(spot.nextUpgradeCost)
    : '—';

  return `
    <dl class="spot-tooltip-list">
      <div class="spot-tooltip-row"><dt>Tier</dt><dd>${unlocked ? tier.name : 'Locked'}</dd></div>
      <div class="spot-tooltip-row"><dt>Capacity</dt><dd>${capacityLabel}</dd></div>
      <div class="spot-tooltip-row"><dt>Occupancy</dt><dd>${spot.occupants.size} / ${spot.capacity}</dd></div>
      <div class="spot-tooltip-row"><dt>Bonus</dt><dd>${bonusLabel}</dd></div>
      <div class="spot-tooltip-row"><dt>Next Tier</dt><dd>${nextLabel}</dd></div>
      <div class="spot-tooltip-row"><dt>Upgrade Cost</dt><dd>${upgradeCostLabel}</dd></div>
      <div class="spot-tooltip-row"><dt>Unlock Rule</dt><dd>${formatNumber(spot.unlockAtTotal)} total poop</dd></div>
    </dl>
  `;
}

function triggerSpotLevelAnimation(element, className) {
  if (!element) {
    return;
  }

  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);

  if (element._spotLevelTimeout) {
    clearTimeout(element._spotLevelTimeout);
  }

  element._spotLevelTimeout = setTimeout(() => {
    element.classList.remove(className);
    delete element._spotLevelTimeout;
  }, 900);
}

function updateSpotUnlocks() {
  spots.forEach((spot) => {
    if (!spot.isUnlocked && totalPoints >= spot.unlockAtTotal) {
      spot.isUnlocked = true;
    }
  });
}

function upgradeSpot(index) {
  const spot = spots[index];
  if (!spot) {
    return;
  }

  if (!spot.isUnlocked) {
    return;
  }

  const cost = spot.nextUpgradeCost;
  if (cost == null) {
    return;
  }

  if (points < cost) {
    alert('Not enough poop to upgrade this spot!');
    return;
  }

  points -= cost;
  spot.level += 1;
  recalculateSpotStats(spot);

  poopers.forEach((pooper) => {
    if (pooper.currentSpotIndex === index) {
      pooper.activeMultiplier = spot.multiplier;
    }
  });

  updateUI();
}

function updateSpotDisplay(index) {
  const spot = spots[index];
  if (!spot) {
    return;
  }

  const view = ensureSpotView(index);
  const tier = getSpotTier(spot.level) || spotTierConfig[0] || {
    name: 'Spot',
    icon: '❓',
    multiplier: 1,
  };
  const nextTier = spotTierConfig[spot.level + 1] || null;
  const iconSymbol = spot.isUnlocked ? (tier.icon || '❓') : '🔒';
  const tooltipMarkup = createSpotTooltipMarkup(spot, tier, nextTier);

  if (view?.card) {
    const {
      element,
      icon,
      name,
      levelBadge,
      multiplier,
      occupancyFill,
      occupancyText,
      upgradeButton,
      overlayMessage,
      tooltip,
    } = view.card;

    element.classList.toggle('spot-card--locked', !spot.isUnlocked);

    if (icon) {
      icon.textContent = iconSymbol;
    }

    if (name) {
      name.textContent = spot.name;
    }

    if (levelBadge) {
      levelBadge.textContent = `Lv ${spot.level}`;
    }

    if (multiplier) {
      multiplier.textContent = spot.isUnlocked
        ? `Multiplier x${spot.multiplier.toFixed(2)}`
        : 'Locked';
    }

    if (occupancyFill) {
      const ratio = spot.capacity > 0
        ? Math.min(1, spot.occupants.size / spot.capacity)
        : 0;
      occupancyFill.style.width = `${ratio * 100}%`;
    }

    if (occupancyText) {
      occupancyText.textContent = `Occupancy: ${spot.occupants.size} / ${spot.capacity}`;
    }

    updateSpotUpgradeButton(upgradeButton, spot);

    if (overlayMessage) {
      overlayMessage.textContent = `Unlock at ${formatNumber(spot.unlockAtTotal)} total poop`;
      overlayMessage.style.display = spot.isUnlocked ? 'none' : '';
    }

    if (tooltip) {
      tooltip.innerHTML = tooltipMarkup;
      tooltip.setAttribute('aria-hidden', spot.isUnlocked ? 'false' : 'true');
    }
  }

  if (view?.accordion) {
    const {
      element,
      icon,
      name,
      level,
      multiplier,
      occupancy,
      tooltip,
      locked,
      upgradeButton,
    } = view.accordion;

    if (element) {
      element.classList.toggle('spot-accordion-item--locked', !spot.isUnlocked);
    }

    if (icon) {
      icon.textContent = iconSymbol;
    }

    if (name) {
      name.textContent = spot.name;
    }

    if (level) {
      level.textContent = `Lv ${spot.level}`;
    }

    if (multiplier) {
      multiplier.textContent = spot.isUnlocked
        ? `Multiplier: x${spot.multiplier.toFixed(2)}`
        : 'Multiplier: —';
    }

    if (occupancy) {
      occupancy.textContent = `Occupancy: ${spot.occupants.size} / ${spot.capacity}`;
    }

    if (tooltip) {
      tooltip.innerHTML = tooltipMarkup;
    }

    if (locked) {
      locked.textContent = spot.isUnlocked ? '' : `Unlock at ${formatNumber(spot.unlockAtTotal)} total poop`;
    }

    updateSpotUpgradeButton(upgradeButton, spot);
  }

  if (view) {
    if (view.renderedLevel != null && spot.level > view.renderedLevel) {
      if (view.card?.element) {
        triggerSpotLevelAnimation(view.card.element, 'spot-card--leveled');
      }

      if (view.accordion?.element) {
        triggerSpotLevelAnimation(view.accordion.element, 'spot-accordion-item--leveled');
      }
    }

    view.renderedLevel = spot.level;
  }
}

function findAvailableSpotIndex() {
  let bestIndex = null;
  let bestLevel = -1;
  let bestMultiplier = 0;

  for (let i = 0; i < spots.length; i++) {
    const spot = spots[i];
    if (!spot || !spot.isUnlocked) {
      continue;
    }

    if (spot.occupants.size >= spot.capacity) {
      continue;
    }

    if (spot.level > bestLevel || (spot.level === bestLevel && spot.multiplier > bestMultiplier)) {
      bestIndex = i;
      bestLevel = spot.level;
      bestMultiplier = spot.multiplier;
    }
  }

  return bestIndex;
}

function requestSpotOccupancy(pooper) {
  const index = findAvailableSpotIndex();
  if (index == null) {
    return null;
  }

  const spot = spots[index];
  if (!spot || !spot.isUnlocked) {
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
  updateSpotUnlocks();

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

  spots.forEach((_, index) => updateSpotDisplay(index));
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