// script.js

// ─── State ─────────────────────────────────────────────
let points = 0;
let totalPoints = 0;
let averagePooperCost = 10;

const aPoopers = [
  { name: "Average Pooper", rate: 1 }  // rate = poop/sec
];
const ownedAPoopers = new Array(aPoopers.length).fill(0);

// ─── Element refs ────────────────────────────────────
const poopAmount           = document.getElementById("poopAmount");
const defecateButton       = document.getElementById("defecatebutton");
const poopPerSecondDisplay = document.getElementById("poopPerSecond");

// -----------------Setup--------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  const tabs   = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

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

  // Setup poopers panel
  const poopersPanel = document.getElementById('poopers-panel');
  aPoopers.forEach((template, idx) => {
    const row = document.createElement('div');
    row.innerHTML = `
      <span>${template.name}</span>
      <span id="pooper-count-${idx}">0</span>
      <button id="buy-pooper-${idx}">
        Buy (${formatNumber(averagePooperCost)})
      </button>
    `;
    poopersPanel.appendChild(row);

    document.getElementById(`buy-pooper-${idx}`).addEventListener('click', () => buyPooper(idx));
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
}

function getPoopPerSecond() {
  return ownedAPoopers.reduce((sum, count, idx) => {
    return sum + count * aPoopers[idx].rate;
  }, 0);
}

//--------------Update UI function-------------//
function updateUI() {
  poopAmount.textContent = formatNumber(points);
  const pps = getPoopPerSecond();
  poopPerSecondDisplay.textContent = `Poop/sec: ${formatNumber(pps)}`;
  updateProgressBar(totalPoints, 1e15);
}

// ─── Actions ─────────────────────────────────────────

// Manual click
defecateButton.addEventListener("click", () => {
  points += 100;
  totalPoints += 100;
  updateUI();
});

// Buy a Pooper
function buyPooper(idx) {
  if (points < averagePooperCost) {
    alert('Not enough poop!');
    return;
  }

  points -= averagePooperCost;
  averagePooperCost = Math.ceil(averagePooperCost * 1.1);

  ownedAPoopers[idx]++;

  document.getElementById(`pooper-count-${idx}`).textContent = ownedAPoopers[idx];
  document.getElementById(`buy-pooper-${idx}`).textContent = `Buy (${formatNumber(averagePooperCost)})`;
  updateUI();
}

// Idle loop: adds poop per second based on owned poopers
setInterval(() => {
  const pps = getPoopPerSecond();
  points += pps;
  totalPoints += pps;
  updateUI();
}, 1000);

