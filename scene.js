// Scene orchestrator for KIVI
// Manages the entire game world: renderer, grid, blocks, and scene loading

import { Grid } from './grid.js';
import { createBlock } from './assets.js';
import { VelocityPhysics, GravityPhysics } from './physics.js';
import { Input } from './input.js';
import { BoxCollider, checkCollision, checkGrounded, getGroundY } from './collision.js';
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
import * as THREE from 'three';

export class Scene {
  constructor(options = {}) {
    // Track if this is the initial load (don't update camera on initial load)
    this.isInitialLoad = true;

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

    // Track all blocks and game objects
    this.blocks = [];
    this.gameObjects = new Map(); // Map of id -> gameObject data
    this.metadata = {};

    // Calculate grid bounds for collision boundaries (if enabled)
    const gridOptions = options.grid || {};
    this.gridBounds = gridOptions.boundary !== false ? this.calculateGridBounds() : null;

    // Expose physics utilities and input for scripts
    this.physics = {
      VelocityPhysics,
      GravityPhysics
    };
    this.input = Input; // Global input singleton

    // Expose collision utilities for scripts
    this.collision = {
      BoxCollider,
      checkCollision,
      checkGrounded,
      getGroundY
    };

    // Helper to create physics
    this.createVelocityPhysics = (options = {}) => {
      return new VelocityPhysics(options);
    };

    // Raycaster for mouse picking
    this.raycaster = new THREE.Raycaster();
    this.mouseVector = new THREE.Vector2();

    // Start animation loop
    // Pass 'this' instead of camera so we can access the current camera dynamically
    const animate = () => {
      requestAnimationFrame(animate);
      this.update(this.threeScene);
      this.renderer.render(this.threeScene, this.camera);
    };
    animate();
  }

  // Update function called every frame
  update(threeScene) {
    // Calculate delta time (in seconds)
    const now = performance.now();
    const delta = this.lastUpdateTime ? (now - this.lastUpdateTime) / 1000 : 0;
    this.lastUpdateTime = now;

    // Call onUpdate for all game object scripts
    for (const [id, gameObject] of this.gameObjects.entries()) {
      if (gameObject.scriptInstance && gameObject.scriptInstance.onUpdate) {
        gameObject.scriptInstance.onUpdate(gameObject, this, delta);
      }

      // Automatically update physics if game object has physics component
      if (gameObject.physics && gameObject.position) {
        // Don't apply gravity if grounded (checked in onUpdate)
        const applyGravity = !gameObject.isGrounded;
        gameObject.physics.updatePosition(gameObject.position, delta, applyGravity);
      }

      // Automatically handle collision if game object has collider component
      if (gameObject.collider && gameObject.position) {
        // Check if grounded BEFORE collision resolution (for excludeGround logic)
        gameObject.isGrounded = gameObject.collider.checkGrounded(this, gameObject.position);

        // Store last valid position
        if (!gameObject.lastValidPosition) {
          gameObject.lastValidPosition = { ...gameObject.position };
        }

        // Resolve collision (only exclude ground when grounded)
        const excludeGround = gameObject.isGrounded || false;
        const oldPos = { ...gameObject.position };
        const hadCollision = gameObject.collider.resolve(this, gameObject.position, gameObject.lastValidPosition, excludeGround);

        // Stop velocity on blocked axes
        if (hadCollision && gameObject.physics) {
          if (gameObject.position.x !== oldPos.x) gameObject.physics.velocity.x = 0;
          if (gameObject.position.y !== oldPos.y) gameObject.physics.velocity.y = 0;
          if (gameObject.position.z !== oldPos.z) gameObject.physics.velocity.z = 0;
        }

        // Update last valid position
        gameObject.lastValidPosition = { ...gameObject.position };

        // Ground snapping: if grounded and falling, snap to ground surface
        // Only snap if very close (within snap threshold) to prevent jarring instant stops
        if (gameObject.physics && gameObject.physics.velocity.y <= 0) {
          const grounded = gameObject.collider.checkGrounded(this, gameObject.position);
          if (grounded) {
            const groundY = gameObject.collider.getGroundY(this, gameObject.position);
            const targetY = groundY + gameObject.collider.size.y / 2;
            const distance = Math.abs(gameObject.position.y - targetY);

            // Only snap if within snap threshold (0.1 units)
            if (distance < 0.1) {
              gameObject.position.y = targetY;
              gameObject.physics.stopVertical();
              gameObject.isGrounded = true;
            }
          }
        }
      }

      // Call onLateUpdate after physics and collision
      if (gameObject.scriptInstance && gameObject.scriptInstance.onLateUpdate) {
        gameObject.scriptInstance.onLateUpdate(gameObject, this, delta);
      }

      // Sync block positions with game object position (only if game object has moved)
      // Static game objects (no physics/script) don't need syncing
      if ((gameObject.physics || gameObject.script) && gameObject.blocks && gameObject.blocks.length > 0) {
        gameObject.blocks.forEach(block => {
          // Apply stored offset to preserve multi-block structure
          const offset = block.userData.offset || { x: 0, y: 0, z: 0 };
          block.position.x = gameObject.position.x + offset.x;
          block.position.y = gameObject.position.y + offset.y;
          block.position.z = gameObject.position.z + offset.z;
        });
      }
    }

    // Rotate objects marked as rotatable (legacy)
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
  async load(sceneData) {
    // Clear existing scene
    this.clear();

    // Update grid configuration if provided
    if (sceneData.config && sceneData.config.grid) {
      this.grid.size = sceneData.config.grid.size || this.grid.size;
      this.grid.cellSize = sceneData.config.grid.cellSize || this.grid.cellSize;
      this.grid.centerOffset = Math.floor(this.grid.size / 2);

      // Recalculate grid bounds
      const gridOptions = sceneData.config.grid;
      this.gridBounds = gridOptions.boundary !== false ? this.calculateGridBounds() : null;

      // Update camera to fit new grid size (only when switching scenes, not on initial load)
      if (!this.isInitialLoad && sceneData.config.fitToGrid !== false) {
        const cameraMode = sceneData.config.cameraMode || 'isometric';
        const newIsPerspective = ['3/4', '34', 'strategy'].includes(cameraMode);
        const currentIsPerspective = this.camera.isPerspectiveCamera;
        const cameraPadding = sceneData.config.cameraPadding || 0.1;

        // If camera type changed (perspective <-> orthographic), recreate camera
        if (newIsPerspective !== currentIsPerspective) {
          console.log(`Camera type changed, recreating camera as ${cameraMode}`);

          // Calculate camera settings
          const cameraSettings = newIsPerspective
            ? fitPerspectiveCameraToGrid(this.grid.size, this.grid.cellSize, cameraPadding)
            : fitCameraToGrid(this.grid.size, this.grid.cellSize, cameraPadding);

          // Create new camera
          this.camera = createCamera(cameraMode, {
            frustumSize: cameraSettings.frustumSize,
            distance: cameraSettings.distance,
            height: cameraSettings.height,
            fov: cameraSettings.fov
          });

          this.camera.lookAt(-0.5, 0, -0.5);
        } else {
          // Same camera type, just update settings
          if (newIsPerspective) {
            const cameraSettings = fitPerspectiveCameraToGrid(
              this.grid.size,
              this.grid.cellSize,
              cameraPadding
            );
            // Update perspective camera (3/4 view positions from front)
            this.camera.position.set(
              -0.5,
              cameraSettings.height,
              cameraSettings.distance - 0.5
            );
            this.camera.lookAt(-0.5, 0, -0.5);
          } else {
            const cameraSettings = fitCameraToGrid(
              this.grid.size,
              this.grid.cellSize,
              cameraPadding
            );
            // Update orthographic camera frustum
            const aspect = window.innerWidth / window.innerHeight;
            const frustumSize = cameraSettings.frustumSize;
            this.camera.left = -frustumSize * aspect / 2;
            this.camera.right = frustumSize * aspect / 2;
            this.camera.top = frustumSize / 2;
            this.camera.bottom = -frustumSize / 2;
            this.camera.updateProjectionMatrix();

            // Update camera position for isometric view
            const distance = cameraSettings.distance;
            this.camera.position.set(distance, distance, distance);
            this.camera.lookAt(-0.5, 0, -0.5);
          }
        }
      }

      // Update grid helper if showGrid is specified
      if (sceneData.config.showGrid !== undefined) {
        // Remove old grid helper
        const oldGridHelper = this.threeScene.children.find(child => child.type === 'GridHelper');
        if (oldGridHelper) {
          this.threeScene.remove(oldGridHelper);
        }
        // Add new grid helper if needed
        if (sceneData.config.showGrid) {
          addGridHelper(this.threeScene, sceneData.config.grid);
        }
      }
    }

    // Store metadata
    this.metadata = {
      name: sceneData.name || 'Untitled Scene',
      author: sceneData.author || 'Unknown',
      description: sceneData.description || '',
      created: sceneData.created || new Date().toISOString()
    };

    // Load game objects - support inline array, external file, or mixed array with file references
    let gameObjects = [];

    if (Array.isArray(sceneData.gameObjects)) {
      // Process array - load any string references
      for (const item of sceneData.gameObjects) {
        if (typeof item === 'string') {
          // Item is a file path, load it
          const response = await fetch(item);
          const externalObjects = await response.json();
          gameObjects.push(...externalObjects);
        } else {
          // Item is an inline game object
          gameObjects.push(item);
        }
      }
    } else if (typeof sceneData.gameObjects === 'string') {
      // gameObjects is a single file path, load it
      const response = await fetch(sceneData.gameObjects);
      gameObjects = await response.json();
    } else if (sceneData.gameObjects) {
      // Shouldn't happen, but handle it
      gameObjects = [sceneData.gameObjects];
    }

    // Load blocks - support both old format (flat blocks array) and new format (gameObjects array)
    if (gameObjects && Array.isArray(gameObjects)) {
      // New format: iterate through game objects
      gameObjects.forEach(gameObject => {
        // Validate ID
        if (!gameObject.id) {
          console.warn('Game object missing ID, skipping:', gameObject);
          return;
        }

        if (this.gameObjects.has(gameObject.id)) {
          console.warn(`Duplicate game object ID: ${gameObject.id}, skipping`);
          return;
        }

        // Store game object metadata - preserve all custom fields
        const gameObjectId = gameObject.id;
        this.gameObjects.set(gameObjectId, {
          ...gameObject, // Copy all custom fields (tags, health, etc.)
          id: gameObjectId,
          name: gameObject.name || 'unnamed',
          script: gameObject.script || null,
          scriptInstance: null, // Internal: Will be loaded asynchronously
          blocks: [], // Internal: Three.js meshes
          position: null, // Internal: Will be set from first block
          physics: null, // Internal: Optional physics component
          // Method: destroy this game object (Unity-style)
          destroy: () => {
            this.destroy(gameObjectId);
          }
        });

        // Load blocks for this game object
        if (gameObject.blocks && Array.isArray(gameObject.blocks)) {
          const gameObjectData = this.gameObjects.get(gameObject.id);

          gameObject.blocks.forEach((blockData, index) => {
            // Dynamic objects (with scripts) shouldn't be tracked in grid for collision
            const trackInGrid = !gameObject.script;
            const block = this.addBlock(blockData, trackInGrid);
            if (block) {
              // Link block to game object
              block.userData.gameObjectId = gameObject.id;
              gameObjectData.blocks.push(block);

              // Set initial position from first block (becomes the "anchor" position)
              if (!gameObjectData.position) {
                gameObjectData.position = {
                  x: block.position.x,
                  y: block.position.y,
                  z: block.position.z
                };
                console.log(`Set position for ${gameObject.id}:`, gameObjectData.position);
              }

              // Store offset from anchor position for multi-block game objects
              block.userData.offset = {
                x: block.position.x - gameObjectData.position.x,
                y: block.position.y - gameObjectData.position.y,
                z: block.position.z - gameObjectData.position.z
              };
            }
          });
        }
      });
    } else if (sceneData.blocks && Array.isArray(sceneData.blocks)) {
      // Old format: flat blocks array (for backwards compatibility)
      sceneData.blocks.forEach(blockData => {
        this.addBlock(blockData);
      });
    }

    console.log(`Scene loaded: ${this.metadata.name} (${this.blocks.length} blocks)`);

    // Load scripts for game objects (await to ensure scripts load before update loop runs)
    await this.loadScripts();

    // Mark that initial load is complete
    this.isInitialLoad = false;

    return this;
  }

  // Load scripts for all game objects
  async loadScripts() {
    const scriptPromises = [];

    for (const [id, gameObject] of this.gameObjects.entries()) {
      if (gameObject.script) {
        const promise = this.loadScript(id, gameObject.script);
        scriptPromises.push(promise);
      }
    }

    await Promise.all(scriptPromises);
    console.log(`Loaded ${scriptPromises.length} script(s)`);
  }

  // Load a single script for a game object
  async loadScript(gameObjectId, scriptPath) {
    try {
      // Dynamic import - Vite will handle module resolution
      const scriptModule = await import(/* @vite-ignore */ `/${scriptPath}`);
      const scriptInstance = scriptModule.default;

      // Store the script instance
      const gameObject = this.gameObjects.get(gameObjectId);
      gameObject.scriptInstance = scriptInstance;

      // Call onInit if it exists
      if (scriptInstance.onInit) {
        scriptInstance.onInit(gameObject, this);
      }

      console.log(`Script loaded for ${gameObjectId}: ${scriptPath}`);
    } catch (error) {
      console.error(`Failed to load script for ${gameObjectId}: ${scriptPath}`, error);
    }
  }

  // Load scene from URL
  async loadFromURL(url) {
    try {
      const response = await fetch(url);
      const sceneData = await response.json();
      await this.load(sceneData);
      return this;
    } catch (error) {
      console.error('Error loading scene from URL:', error);
      throw error;
    }
  }

  // Switch to a new scene (unload current, load new)
  async switchScene(url) {
    console.log(`Switching scene to: ${url}`);
    this.clear(); // Unload current scene
    await this.loadFromURL(url); // Load new scene
    console.log(`Scene switched to: ${url}`);
    return this;
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
      await scene.load(sceneData);

      return scene;
    } catch (error) {
      console.error('Error creating scene from URL:', error);
      throw error;
    }
  }

  // Add a single block to the scene
  addBlock(blockData, trackInGrid = true) {
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
    const options = { trackInGrid };
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

  // Instantiate a game object from a definition (Unity-style)
  // Creates a new game object instance from JSON definition
  async instantiate(gameObjectData) {
    // Validate ID
    if (!gameObjectData.id) {
      console.warn('Game object missing ID, cannot add:', gameObjectData);
      return null;
    }

    if (this.gameObjects.has(gameObjectData.id)) {
      console.warn(`Duplicate game object ID: ${gameObjectData.id}, cannot add`);
      return null;
    }

    // Create game object entry - preserve all custom fields from input
    const gameObject = {
      ...gameObjectData, // Copy all custom fields (tags, health, etc.)
      id: gameObjectData.id,
      name: gameObjectData.name || 'unnamed',
      script: gameObjectData.script || null,
      scriptInstance: null, // Internal: loaded script
      blocks: [], // Internal: Three.js meshes
      position: null, // Internal: world position
      physics: null, // Internal: physics component
      // Method: destroy this game object (Unity-style)
      destroy: () => {
        this.destroy(gameObjectData.id);
      }
    };

    this.gameObjects.set(gameObjectData.id, gameObject);

    // Add blocks if provided
    if (gameObjectData.blocks && Array.isArray(gameObjectData.blocks)) {
      gameObjectData.blocks.forEach(blockData => {
        // Dynamic objects (with scripts) shouldn't be tracked in grid for collision
        const trackInGrid = !gameObjectData.script;
        const block = this.addBlock(blockData, trackInGrid);
        if (block) {
          // Link block to game object
          block.userData.gameObjectId = gameObjectData.id;
          gameObject.blocks.push(block);

          // Set initial position from first block
          if (!gameObject.position) {
            gameObject.position = {
              x: block.position.x,
              y: block.position.y,
              z: block.position.z
            };
            console.log(`Set position for ${gameObjectData.id}:`, gameObject.position);
          }
        }
      });
    }

    // Load script if provided
    if (gameObjectData.script) {
      await this.loadScript(gameObjectData.id, gameObjectData.script);
    }

    console.log(`Instantiated game object: ${gameObjectData.id}`);
    return gameObject;
  }

  // Destroy a game object instance and remove from scene (Unity-style)
  destroy(gameObjectId) {
    const gameObject = this.gameObjects.get(gameObjectId);

    if (!gameObject) {
      console.warn(`Game object not found: ${gameObjectId}`);
      return false;
    }

    // Remove all blocks from Three.js scene and grid
    if (gameObject.blocks && gameObject.blocks.length > 0) {
      gameObject.blocks.forEach(block => {
        // Remove from Three.js scene
        this.threeScene.remove(block);

        // Remove from blocks array
        const index = this.blocks.indexOf(block);
        if (index > -1) {
          this.blocks.splice(index, 1);
        }

        // Remove from grid if it was tracked
        const gridPos = block.userData.gridPosition;
        if (gridPos) {
          this.grid.clearCell(gridPos.gridX, gridPos.gridY, gridPos.gridZ);
        }
      });
    }

    // Remove from game objects map
    this.gameObjects.delete(gameObjectId);

    console.log(`Destroyed game object: ${gameObjectId}`);
    return true;
  }

  // Clear/unload current scene (for scene switching)
  clear() {
    // Call onDestroy for all scripts before cleanup
    for (const [id, gameObject] of this.gameObjects.entries()) {
      if (gameObject.scriptInstance && gameObject.scriptInstance.onDestroy) {
        try {
          gameObject.scriptInstance.onDestroy(gameObject, this);
        } catch (error) {
          console.error(`Error in onDestroy for ${id}:`, error);
        }
      }
    }

    // Remove all blocks from Three.js scene and dispose geometry/materials
    this.blocks.forEach(block => {
      this.threeScene.remove(block);
      // Dispose Three.js resources to prevent memory leaks
      if (block.geometry) block.geometry.dispose();
      if (block.material) {
        if (Array.isArray(block.material)) {
          block.material.forEach(mat => mat.dispose());
        } else {
          block.material.dispose();
        }
      }
    });

    // Clear all collections
    this.blocks = [];
    this.gameObjects.clear();
    this.metadata = {};
    this.grid.cells.clear();

    console.log('Scene cleared');
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

  // Get game object by ID
  getGameObject(id) {
    return this.gameObjects.get(id);
  }

  // Get all game object IDs
  getGameObjectIds() {
    return Array.from(this.gameObjects.keys());
  }

  // Find game object by name (returns first match)
  findGameObjectByName(name) {
    for (const [id, gameObject] of this.gameObjects.entries()) {
      if (gameObject.name === name) {
        return gameObject;
      }
    }
    return null;
  }

  // Find all game objects by name (returns array)
  findGameObjectsByName(name) {
    const results = [];
    for (const [id, gameObject] of this.gameObjects.entries()) {
      if (gameObject.name === name) {
        results.push(gameObject);
      }
    }
    return results;
  }

  // Find all game objects matching a predicate function
  findGameObjects(predicate) {
    const results = [];
    for (const [id, gameObject] of this.gameObjects.entries()) {
      if (predicate(gameObject)) {
        results.push(gameObject);
      }
    }
    return results;
  }

  // Get all game objects as an array
  getAllGameObjects() {
    return Array.from(this.gameObjects.values());
  }

  // Calculate grid bounds in world coordinates
  calculateGridBounds() {
    // Grid coordinates 0 to size-1 map to world coordinates
    // With centerOffset, grid 0 -> world -centerOffset
    // grid size-1 -> world (size-1 - centerOffset)
    // Add 0.5 to account for block centers (blocks span -0.5 to +0.5 from center)
    const min = -this.grid.centerOffset - 0.5;
    const max = this.grid.size - this.grid.centerOffset - 0.5;

    return {
      minX: min,
      maxX: max,
      minZ: min,
      maxZ: max
    };
  }

  // Get grid bounds in world coordinates (alias for backwards compatibility)
  getGridBounds() {
    return this.gridBounds;
  }

  // Get scene statistics
  getStats() {
    return {
      blockCount: this.blocks.length,
      gameObjectCount: this.gameObjects.size,
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

  // Raycast from screen coordinates to find clicked block/object
  // Returns { block, gameObject, point, face } or null if nothing hit
  raycastFromPointer(screenX, screenY) {
    // Convert screen coordinates to normalized device coordinates (-1 to +1)
    const canvas = this.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    this.mouseVector.x = ((screenX - rect.left) / rect.width) * 2 - 1;
    this.mouseVector.y = -((screenY - rect.top) / rect.height) * 2 + 1;

    // Cast ray from camera through mouse position
    this.raycaster.setFromCamera(this.mouseVector, this.camera);

    // Check intersections with all blocks
    const intersects = this.raycaster.intersectObjects(this.blocks, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const block = hit.object;

      // Get game object if this block belongs to one
      const gameObjectId = block.userData.gameObjectId;
      const gameObject = gameObjectId ? this.gameObjects.get(gameObjectId) : null;

      return {
        block,
        gameObject,
        point: hit.point,
        face: hit.face,
        distance: hit.distance,
        gridPosition: block.userData.gridPosition
      };
    }

    return null;
  }

  // Helper: Check if there was a click and return what was clicked
  // Call in onUpdate to handle clicks
  checkClick() {
    if (this.input.wasClicked()) {
      const pointer = this.input.getPointerPosition();
      const hit = this.raycastFromPointer(pointer.x, pointer.y);
      this.input.clearClick();
      return hit;
    }
    return null;
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
