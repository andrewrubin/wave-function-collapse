import { loadImagesFromURLs } from "./lib/load-images-from-urls.js";

const NUM_ROWS = 15;
const NUM_COLS = 15;
const TILE_SIZE = 40;
const CANVAS = document.querySelector("canvas");
const CTX = CANVAS.getContext("2d");
const DPR = Math.min(devicePixelRatio, 2);

// Connector keys per side (N,S,E,W)
const TILE_DATA = [
  //0:
  [
    [0, 2, 4, 5],
    [0, 2, 3, 6],
    [0, 1, 3, 5],
    [0, 1, 4, 6],
  ],
  //1:
  [
    [1, 3, 6],
    [1, 4, 5],
    [0, 3, 5],
    [0, 4, 6],
  ],
  //2:
  [
    [0, 2, 4, 5],
    [0, 2, 3, 6],
    [2, 4, 6],
    [2, 3, 5],
  ],
  //3:
  [
    [0, 2, 4, 5],
    [1, 4, 5],
    [2, 4, 6],
    [0, 1, 4, 6],
  ],
  //4:
  [
    [1, 3, 6],
    [0, 2, 3, 6],
    [0, 1, 3, 5],
    [2, 3, 5],
  ],
  //5:
  [
    [1, 3, 6],
    [0, 2, 3, 6],
    [2, 4, 6],
    [0, 1, 4, 6],
  ],
  //6:
  [
    [0, 2, 4, 5],
    [1, 4, 5],
    [0, 1, 3, 5],
    [2, 3, 5],
  ],
];

let tileImages;

// Initialize the grid so all tiles are blank (0), and have all possible connector options
let grid = Array.from({ length: NUM_COLS * NUM_ROWS }, () => ({
  tileId: 0,
  options: Array.from({ length: TILE_DATA.length }, (_, i) => i),
}));

function setCanvasSize() {
  CANVAS.width = NUM_COLS * TILE_SIZE * DPR;
  CANVAS.height = NUM_ROWS * TILE_SIZE * DPR;
  CTX.font = `${TILE_SIZE * 0.5 * DPR}px sans-serif`;
  document.body.style.setProperty("--canvas-size", NUM_COLS * TILE_SIZE + "px");
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

  CTX.drawImage(
    tileImages[tileId],
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
    neighbor.options = neighbor.options.filter((x) =>
      TILE_DATA[cell.tileId][i].includes(x)
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
  // solve instantly:
  // if (lowestEntropyCell) waveFunctionCollapse(lowestEntropyCell);

  // only used for stepping through the function calls:
  return lowestEntropyCell;
}

async function init() {
  tileImages = await loadImagesFromURLs([
    "./tiles/tile-00.png",
    "./tiles/tile-01.png",
    "./tiles/tile-02.png",
    "./tiles/tile-03.png",
    "./tiles/tile-04.png",
    "./tiles/tile-05.png",
    "./tiles/tile-06.png",
  ]);

  setCanvasSize();

  CTX.textAlign = "center";
  CTX.textBaseline = "middle";

  const startingIndex = Math.floor(Math.random() * grid.length);
  const startingCell = grid[startingIndex];
  let nextCell = waveFunctionCollapse(startingCell);

  function play() {
    nextCell = waveFunctionCollapse(nextCell);
    requestAnimationFrame(play);
  }

  // play();

  document.querySelector("button").addEventListener("click", () => {
    nextCell = waveFunctionCollapse(nextCell);
  });
}

init();
