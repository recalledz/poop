const upgrades = [
  {
    id: "upgrade1",
    name: "Poop Scooper",
    description: "Increases poop collection rate.",
    cost: 100,
    poopRequirement: 50,
    effect: (gameData) => {
      gameData.poopPerClick += 1;
    },
    isUnlocked: (gameData) => gameData.totalPoop >= 50,
    isPurchased: false,
  },
  {
    id: "upgrade2",
    name: "Composting Bin",
    description: "Automatically generates poop over time.",
    cost: 500,
    poopRequirement: 250,
    effect: (gameData) => {
      gameData.poopPerSecond += 0.1;
    },
    isUnlocked: (gameData) => gameData.totalPoop >= 250,
    isPurchased: false,
  },
  {
    id: "upgrade3",
    name: "Super Poop Vacuum",
    description: "Greatly increases poop collection rate.",
    cost: 2500,
    poopRequirement: 1000,
    effect: (gameData) => {
      gameData.poopPerClick += 5;
    },
    isUnlocked: (gameData) => gameData.totalPoop >= 1000,
    isPurchased: false,
  },
  {
    id: "upgrade4",
    name: "Advanced Composting System",
    description: "Significantly increases automatic poop generation.",
    cost: 10000,
    poopRequirement: 5000,
    effect: (gameData) => {
      gameData.poopPerSecond += 1;
    },
    isUnlocked: (gameData) => gameData.totalPoop >= 5000,
    isPurchased: false,
  },
];

export default upgrades;