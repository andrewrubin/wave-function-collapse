import { loadImagesFromURLs } from "./lib/load-images-from-urls.js";

const SOLVE_STYLES = {
  ANIMATE: "animate",
  INSTANT: "instant",
  STEP: "step",
};

const solveStyle = SOLVE_STYLES.INSTANT;

let tileImages;

const TILE_SIZE = 40;
const NUM_ROWS = Math.min(
  Math.floor(window.innerHeight / TILE_SIZE) - 2,
  Math.floor(window.innerWidth / TILE_SIZE) - 2
);
const NUM_COLS = NUM_ROWS;
const CANVAS = document.querySelector("canvas");
const CTX = CANVAS.getContext("2d");
const DPR = Math.min(devicePixelRatio, 2);

const TILE_IDS = [
  "blank",
  "dddd",
  "dddg",
  "ddgd",
  "ddgg",
  "dgdd",
  "dgdg",
  "dggg",
  "gddd",
  "gdgd",
  "gdgg",
  "ggdd",
  "ggdg",
  "gggd",
  "gggg",
];

const TILE_IMAGE_URLS = TILE_IDS.map((id) => `./tiles/tile-${id}.png`);

// Connector keys per side (N,S,E,W)
const TILE_DATA = TILE_IDS.map((id) => {
  return {
    id,
    connections: getTileConnections(id),
  };
});

// Initialize the grid so all tiles are blank, and have all possible connector options
const allTileIds = TILE_DATA.map(({ id }) => id);
const grid = Array.from({ length: NUM_COLS * NUM_ROWS }, () => ({
  tileId: "blank",
  options: allTileIds,
}));

function setCanvasSize() {
  CANVAS.width = NUM_COLS * TILE_SIZE * DPR;
  CANVAS.height = NUM_ROWS * TILE_SIZE * DPR;
  CTX.font = `${TILE_SIZE * 0.5 * DPR}px sans-serif`;
  document.body.style.setProperty("--canvas-size", NUM_COLS * TILE_SIZE + "px");
}

function getTileConnections(tileId) {
  // returns an array of directions [N,S,E,W]
  // where each direction is an array of possible tile connection IDs

  if (tileId === "blank") {
    return [TILE_IDS, TILE_IDS, TILE_IDS, TILE_IDS];
  }

  // extract each quadrant id from the tile id
  const [q1, q2, q3, q4] = tileId.split("");

  return TILE_IDS.reduce(
    (acc, cur) => {
      // North can match where neighbor q3 & q4 (south) are equal to current q1 & q2
      if (cur.substring(2, 3) === q1 && cur.substring(3, 4) === q2)
        acc[0].push(cur);
      // South can match where neighbor q1 & q2 (north) are equal to current q3 & q4
      if (cur.substring(0, 1) === q3 && cur.substring(1, 2) === q4)
        acc[1].push(cur);
      // East can match where neighbor q1 & q3 (west) are equal to current q2 & q4
      if (cur.substring(0, 1) === q2 && cur.substring(2, 3) === q4)
        acc[2].push(cur);
      // West can match where neighbor q2 & q4 (west) are equal to current q1 & q3
      if (cur.substring(1, 2) === q1 && cur.substring(3, 4) === q3)
        acc[3].push(cur);
      return acc;
    },
    [[], [], [], []]
  );
}

function getCellPosition(cell) {
  const index = grid.indexOf(cell);
  const x = index % NUM_COLS;
  const y = Math.floor(index / NUM_COLS);
  return { x, y };
}

function drawTile(x, y, displayEntropy) {
  const cell = grid[x + y * NUM_COLS];
  const { tileId, options } = cell;
  const i = TILE_IDS.findIndex((id) => id === tileId);

  CTX.drawImage(
    tileImages[i],
    x * TILE_SIZE * DPR,
    y * TILE_SIZE * DPR,
    TILE_SIZE * DPR,
    TILE_SIZE * DPR
  );

  if (displayEntropy && cell.options.length) {
    CTX.save();
    CTX.fillStyle = "hsla(0,0%,0%,0.4)";
    CTX.fillText(
      options.length,
      x * TILE_SIZE * DPR + TILE_SIZE * 0.5 * DPR,
      y * TILE_SIZE * DPR + TILE_SIZE * 0.5 * DPR
    );
    CTX.restore();
  }
}

function drawGuidelines() {
  for (let y = 1; y < NUM_ROWS; y++) {
    CTX.beginPath();
    CTX.moveTo(0, y * TILE_SIZE * DPR);
    CTX.lineTo(NUM_COLS * TILE_SIZE * DPR, y * TILE_SIZE * DPR);
    CTX.closePath();
    CTX.stroke();
    for (let x = 1; x < NUM_COLS; x++) {
      CTX.beginPath();
      CTX.moveTo(x * TILE_SIZE * DPR, 0);
      CTX.lineTo(x * TILE_SIZE * DPR, NUM_ROWS * TILE_SIZE * DPR);
      CTX.closePath();
      CTX.stroke();
    }
  }
}

function colorGridCell(cell, color = "skyblue") {
  if (!cell) return;

  const { x, y } = getCellPosition(cell);
  CTX.fillStyle = color;
  CTX.fillRect(
    x * TILE_SIZE * DPR,
    y * TILE_SIZE * DPR,
    TILE_SIZE * DPR,
    TILE_SIZE * DPR
  );
}

function drawGrid({
  displayGuides = false,
  displayEntropy = false,
  neighborCells = null,
  activeCell = null,
} = {}) {
  CTX.clearRect(0, 0, CANVAS.width, CANVAS.height);

  if (neighborCells) {
    neighborCells.forEach((cell) => {
      colorGridCell(cell, "rgba(150, 0, 150, 0.25)");
    });
  }

  if (activeCell) {
    colorGridCell(activeCell, "rgba(0, 249, 187, 0.5)");
  }

  for (let y = 0; y < NUM_ROWS; y++) {
    for (let x = 0; x < NUM_COLS; x++) {
      drawTile(x, y, displayEntropy);
    }
  }

  if (displayGuides) drawGuidelines();
}

function getNeighbors(cell) {
  const { x, y } = getCellPosition(cell);

  // This deliberately returns undefined cells,
  // as we want an array of 4 items (N,S,E,W).
  // Will check for those when determining tile connections.
  const north = grid[x + (y - 1) * NUM_COLS];
  const south = grid[x + (y + 1) * NUM_COLS];
  const east = grid[x + 1 + y * NUM_COLS];
  const west = grid[x - 1 + y * NUM_COLS];

  // Returns all valid neighbors which have entropy (account for grid bounds)
  return [
    y > 0 && north.options.length ? north : undefined,
    y < NUM_ROWS - 1 && south.options.length ? south : undefined,
    x < NUM_COLS - 1 && east.options.length ? east : undefined,
    x > 0 && west.options.length ? west : undefined,
  ];
}

function updateNeighbors(cell, neighborCells) {
  // determine neighbor connection options, and update neighbors' entropy values.
  // N,S,E,W order is assumed; per the getNeighbors() return value.
  for (let i = 0; i < neighborCells.length; i++) {
    const neighbor = neighborCells[i];
    if (!neighbor) continue;
    const cellConnections = TILE_DATA.find(
      ({ id }) => id === cell.tileId
    ).connections;
    neighbor.options = neighbor.options.filter((x) =>
      cellConnections[i].includes(x)
    );
  }
}

function getRandomLowestEntropyCell() {
  const openCells = grid.filter((cell) => cell.options.length > 0);

  const lowestEntropyValue = openCells.reduce((acc, curr) => {
    return Math.min(curr.options.length, acc);
  }, TILE_DATA.length);

  const lowestCells = openCells.filter(
    (cell) => cell.options.length === lowestEntropyValue
  );

  return lowestCells[Math.floor(Math.random() * lowestCells.length)];
}

function waveFunctionCollapse(cell) {
  // Randomly assign a tile to the cell, and "collapse" it.
  if (!cell) return;

  // Prioritize a certain tile:
  // if (Math.random() > 0.15 && cell.options.includes("dddd")) {
  //   cell.tileId = "dddd";
  // } else {
  //   cell.tileId = cell.options[Math.floor(Math.random() * cell.options.length)];
  // }

  cell.tileId = cell.options[Math.floor(Math.random() * cell.options.length)];
  cell.options = [];

  const neighborCells = getNeighbors(cell);
  updateNeighbors(cell, neighborCells);
  drawGrid({
    displayGuides: true,
    displayEntropy: true,
    neighborCells: neighborCells,
    activeCell: cell,
  });
  const lowestEntropyCell = getRandomLowestEntropyCell();

  if (solveStyle === SOLVE_STYLES.INSTANT && lowestEntropyCell) {
    waveFunctionCollapse(lowestEntropyCell);
  }

  // only used for "step" solve style:
  return lowestEntropyCell;
}

async function init() {
  tileImages = await loadImagesFromURLs(TILE_IMAGE_URLS);

  setCanvasSize();

  CTX.textAlign = "center";
  CTX.textBaseline = "middle";

  const startingIndex = Math.floor(Math.random() * grid.length);
  const startingCell = grid[startingIndex];
  let nextCell = waveFunctionCollapse(startingCell);

  if (solveStyle === SOLVE_STYLES.ANIMATE) {
    function play() {
      nextCell = waveFunctionCollapse(nextCell);
      requestAnimationFrame(play);
    }

    play();
  } else if (solveStyle === SOLVE_STYLES.STEP) {
    const stepButton = document.createElement("button");
    stepButton.textContent = "step";
    stepButton.addEventListener("click", () => {
      nextCell = waveFunctionCollapse(nextCell);
    });
    CANVAS.insertAdjacentElement("afterend", stepButton);
  }
}

init();
