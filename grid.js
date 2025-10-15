// Grid-based coordinate system for KIVI
// Converts grid positions to world coordinates and manages grid state

export class Grid {
  constructor(options = {}) {
    this.size = options.size || 10; // Grid is 10x10 by default
    this.cellSize = options.cellSize || 1; // Each cell is 1 unit
    this.centerOffset = Math.floor(this.size / 2); // Offset to center grid at origin

    // Track occupied cells for collision detection (optional for now)
    this.cells = new Map(); // key: "x,y,z", value: object reference
  }

  // Convert grid coordinates to world coordinates
  gridToWorld(gridX, gridY, gridZ) {
    return {
      x: (gridX - this.centerOffset) * this.cellSize,
      y: gridY * this.cellSize,
      z: (gridZ - this.centerOffset) * this.cellSize
    };
  }

  // Convert world coordinates to grid coordinates
  worldToGrid(x, y, z) {
    return {
      gridX: Math.round(x / this.cellSize) + this.centerOffset,
      gridY: Math.round(y / this.cellSize),
      gridZ: Math.round(z / this.cellSize) + this.centerOffset
    };
  }

  // Check if grid position is within bounds
  isInBounds(gridX, gridY, gridZ) {
    return gridX >= 0 && gridX < this.size &&
           gridY >= 0 && // No upper limit on Y for now
           gridZ >= 0 && gridZ < this.size;
  }

  // Get cell key for storage
  getCellKey(gridX, gridY, gridZ) {
    return `${gridX},${gridY},${gridZ}`;
  }

  // Check if cell is occupied
  isOccupied(gridX, gridY, gridZ) {
    return this.cells.has(this.getCellKey(gridX, gridY, gridZ));
  }

  // Mark cell as occupied
  setCell(gridX, gridY, gridZ, object) {
    this.cells.set(this.getCellKey(gridX, gridY, gridZ), object);
  }

  // Clear cell
  clearCell(gridX, gridY, gridZ) {
    this.cells.delete(this.getCellKey(gridX, gridY, gridZ));
  }

  // Get object at cell
  getCell(gridX, gridY, gridZ) {
    return this.cells.get(this.getCellKey(gridX, gridY, gridZ));
  }

  // Place a block on the grid
  // Blocks are 1x1x1 and centered on grid cells
  placeBlock(createBlockFn, blockType, gridX, gridY, gridZ, options = {}) {
    // Validate bounds
    if (!this.isInBounds(gridX, gridY, gridZ)) {
      console.warn(`Grid position out of bounds: (${gridX}, ${gridY}, ${gridZ})`);
      return null;
    }

    // Convert to world coordinates
    // Blocks are centered on grid cells, so add 0.5 to position center of 1x1x1 cube
    const worldPos = this.gridToWorld(gridX, gridY, gridZ);
    worldPos.y += 0.5; // Center block vertically on grid Y level

    // Create the block
    const block = createBlockFn(blockType, options);
    block.position.set(worldPos.x, worldPos.y, worldPos.z);

    // Store grid position on block for reference
    block.userData.gridPosition = { gridX, gridY, gridZ };

    // Track in grid (optional - for collision detection later)
    if (options.trackInGrid !== false) {
      this.setCell(gridX, gridY, gridZ, block);
    }

    return block;
  }
}
