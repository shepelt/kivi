// Scene orchestrator for KIVI
// Manages the entire game world: renderer, grid, blocks, and scene loading

import { Grid } from './grid.js';
import { createBlock } from './assets.js';
import {
  createRenderer,
  createThreeScene,
  createCamera,
  createIsometricCamera,
  addLighting,
  addGridHelper,
  setupResizeHandler,
  createAnimationLoop,
  fitCameraToGrid,
  fitPerspectiveCameraToGrid,
  updateCameraToFitGrid
} from './renderer.js';

export class Scene {
  constructor(options = {}) {
    // Initialize grid system first (needed for camera fitting)
    this.grid = new Grid(options.grid);

    // Initialize renderer
    this.renderer = createRenderer(options.renderer);
    this.threeScene = createThreeScene();

    // Auto-fit camera to grid if fitToGrid option is true
    const cameraMode = options.cameraMode || 'isometric';

    // Calculate grid center for lookAt
    // Grid coordinates 0 to N-1 map to world coordinates -floor(N/2) to ceil(N/2)-1
    // Actual center is at -0.5 for even-sized grids
    const gridCenter = {
      x: -0.5,
      y: 0,
      z: -0.5
    };

    if (options.fitToGrid !== false) {
      // Use different fit function based on camera mode
      const isPerspective = ['3/4', '34', 'strategy'].includes(cameraMode);

      if (isPerspective) {
        const cameraSettings = fitPerspectiveCameraToGrid(
          this.grid.size,
          this.grid.cellSize,
          options.cameraPadding || 0.1
        );
        options.camera = {
          ...options.camera,
          fov: cameraSettings.fov,
          distance: cameraSettings.distance,
          height: cameraSettings.height
        };
      } else {
        const cameraSettings = fitCameraToGrid(
          this.grid.size,
          this.grid.cellSize,
          options.cameraPadding || 0.1
        );
        options.camera = {
          ...options.camera,
          frustumSize: cameraSettings.frustumSize,
          distance: cameraSettings.distance
        };
      }
    }

    // Create camera based on mode
    this.camera = createCamera(cameraMode, options.camera);

    // Always set lookAt to grid center
    this.camera.lookAt(gridCenter.x, gridCenter.y, gridCenter.z);

    // Add lighting
    addLighting(this.threeScene, options.lighting);

    // Add grid helper
    if (options.showGrid !== false) {
      addGridHelper(this.threeScene, options.grid);
    }

    // Setup resize handler
    setupResizeHandler(this.renderer, this.camera, options.camera?.frustumSize);

    // Track all blocks
    this.blocks = [];
    this.metadata = {};

    // Start animation loop
    const animate = createAnimationLoop(
      this.renderer,
      this.threeScene,
      this.camera,
      (scene) => this.update(scene)
    );
    animate();
  }

  // Update function called every frame
  update(threeScene) {
    // Rotate objects marked as rotatable
    threeScene.traverse((object) => {
      if (object.isMesh && object.userData.rotatable) {
        object.rotation.y += 0.02;
      }
    });
  }

  // Add block to Three.js scene (wrapper for grid)
  addBlockToThreeScene(blockType, options) {
    const block = createBlock(blockType, options);
    this.threeScene.add(block);
    return block;
  }

  // Load a scene from JSON definition
  load(sceneData) {
    // Clear existing scene
    this.clear();

    // Store metadata
    this.metadata = {
      name: sceneData.name || 'Untitled Scene',
      author: sceneData.author || 'Unknown',
      description: sceneData.description || '',
      created: sceneData.created || new Date().toISOString()
    };

    // Load blocks
    if (sceneData.blocks && Array.isArray(sceneData.blocks)) {
      sceneData.blocks.forEach(blockData => {
        this.addBlock(blockData);
      });
    }

    console.log(`Scene loaded: ${this.metadata.name} (${this.blocks.length} blocks)`);
    return this;
  }

  // Load scene from URL
  async loadFromURL(url) {
    try {
      const response = await fetch(url);
      const sceneData = await response.json();
      this.load(sceneData);
      return this;
    } catch (error) {
      console.error('Error loading scene from URL:', error);
      throw error;
    }
  }

  // Static method: Create a new Scene from a scene file URL
  // This will use the config from the scene file itself
  static async fromURL(url) {
    try {
      const response = await fetch(url);
      const sceneData = await response.json();

      // Use config from scene file if available, otherwise use defaults
      const config = sceneData.config || {
        grid: { size: 10, cellSize: 1 },
        cameraMode: 'isometric',
        fitToGrid: true
      };

      // Create scene with config
      const scene = new Scene(config);

      // Load blocks
      scene.load(sceneData);

      return scene;
    } catch (error) {
      console.error('Error creating scene from URL:', error);
      throw error;
    }
  }

  // Add a single block to the scene
  addBlock(blockData) {
    const {
      type,
      x,
      y,
      z,
      color,
      transparent,
      opacity
    } = blockData;

    // Validate required fields
    if (type === undefined || x === undefined || y === undefined || z === undefined) {
      console.warn('Invalid block data, missing required fields:', blockData);
      return null;
    }

    // Create block options
    const options = {};
    if (color !== undefined) options.color = color;
    if (transparent !== undefined) options.transparent = transparent;
    if (opacity !== undefined) options.opacity = opacity;

    // Place block via grid
    const block = this.grid.placeBlock(
      (blockType, opts) => this.addBlockToThreeScene(blockType, opts),
      type,
      x,
      y,
      z,
      options
    );

    if (block) {
      this.blocks.push(block);
    }

    return block;
  }

  // Clear all blocks from scene
  clear() {
    // Remove all blocks from Three.js scene
    this.blocks.forEach(block => {
      this.threeScene.remove(block);
    });

    this.blocks = [];
    this.metadata = {};
    this.grid.cells.clear();
  }

  // Export scene to JSON format
  toJSON() {
    const blocks = this.blocks.map(block => {
      const pos = block.userData.gridPosition;
      const data = {
        type: block.userData.blockType,
        x: pos.gridX,
        y: pos.gridY,
        z: pos.gridZ
      };

      // Add optional properties if they exist
      if (block.material.color) {
        data.color = block.material.color.getHex();
      }
      if (block.material.transparent) {
        data.transparent = true;
        data.opacity = block.material.opacity;
      }

      return data;
    });

    return {
      ...this.metadata,
      blocks
    };
  }

  // Get scene statistics
  getStats() {
    return {
      blockCount: this.blocks.length,
      blockTypes: [...new Set(this.blocks.map(b => b.userData.blockType))],
      bounds: this.calculateBounds()
    };
  }

  // Calculate scene bounding box in grid coordinates
  calculateBounds() {
    if (this.blocks.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
    }

    const positions = this.blocks.map(b => b.userData.gridPosition);

    return {
      minX: Math.min(...positions.map(p => p.gridX)),
      maxX: Math.max(...positions.map(p => p.gridX)),
      minY: Math.min(...positions.map(p => p.gridY)),
      maxY: Math.max(...positions.map(p => p.gridY)),
      minZ: Math.min(...positions.map(p => p.gridZ)),
      maxZ: Math.max(...positions.map(p => p.gridZ))
    };
  }
}

// Helper function to create a simple scene programmatically
export function createSimpleScene(name, description = '') {
  return {
    name,
    description,
    author: 'KIVI',
    created: new Date().toISOString(),
    blocks: []
  };
}
