// Low-level rendering utilities for KIVI
// Handles Three.js setup, camera, lighting, and rendering

import * as THREE from 'three';

// Create and initialize a Three.js renderer
export function createRenderer(options = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(options.bgColor || 0x87ceeb); // Sky blue default
  document.body.appendChild(renderer.domElement);
  return renderer;
}

// Create a Three.js scene
export function createThreeScene() {
  return new THREE.Scene();
}

// Create an isometric camera
export function createIsometricCamera(options = {}) {
  const aspect = window.innerWidth / window.innerHeight;
  const frustumSize = options.frustumSize || 10;

  const camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
  );

  // Position camera for isometric view
  const distance = options.distance || 5;
  camera.position.set(distance, distance, distance);
  // Don't set lookAt here - let caller do it

  return camera;
}

// Create a top-down camera (slightly angled, looking down)
export function createTopDownCamera(options = {}) {
  const aspect = window.innerWidth / window.innerHeight;
  const frustumSize = options.frustumSize || 10;

  const camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
  );

  // Position camera slightly angled, looking down
  // Not directly above (0, y, 0) but with slight offset for depth perception
  const height = options.height || 10;
  const offset = options.offset || 2; // Small offset for angle
  camera.position.set(0, height, offset);
  // Don't set lookAt here - let caller do it

  return camera;
}

// Create a 3/4 view camera (angled view like strategy games)
// Perspective projection from one side at a shallow angle
export function create34Camera(options = {}) {
  const aspect = window.innerWidth / window.innerHeight;
  const fov = options.fov || 60; // Field of view in degrees

  const camera = new THREE.PerspectiveCamera(
    fov,
    aspect,
    0.1,
    1000
  );

  // Position camera at a steeper angle looking down
  // This gives the strategy game look with perspective depth
  const distance = options.distance || 4;
  const height = options.height || 15;

  // Position from front edge (positive Z), elevated higher for steeper angle
  // Offset by -0.5 to align with grid center
  camera.position.set(-0.5, height, distance - 0.5);
  // Don't set lookAt here - let caller do it

  return camera;
}

// Create camera based on mode
export function createCamera(mode = 'isometric', options = {}) {
  switch (mode) {
    case 'topdown':
    case 'top-down':
      return createTopDownCamera(options);
    case '34':
    case '3/4':
    case 'strategy':
      return create34Camera(options);
    case 'isometric':
    default:
      return createIsometricCamera(options);
  }
}

// Calculate optimal camera settings to fit grid without clipping (orthographic)
export function fitCameraToGrid(gridSize, cellSize = 1, padding = 0.1) {
  // Grid dimensions in world space
  const worldSize = gridSize * cellSize;

  // For isometric view (45° angle), we need to account for diagonal distance
  // The grid extends from -offset to +offset (centered at origin)
  const offset = worldSize / 2;

  // Calculate the diagonal distance from center to corner
  // In isometric view, we're looking at the grid at 45° angle
  const diagonal = Math.sqrt(offset * offset + offset * offset);

  // Add padding (as percentage of size)
  const paddedDiagonal = diagonal * (1 + padding);

  // For orthographic camera, frustumSize should show the full diagonal
  // We need to account for both X and Z axes
  const frustumSize = paddedDiagonal * 2;

  // Camera distance: for isometric view, position at 45° angle
  // Distance should be far enough to see everything clearly
  const distance = worldSize * 0.7;

  // Grid center: for a grid of size N with cellSize 1
  // Grid coordinates 0 to N-1 map to world coordinates -floor(N/2) to ceil(N/2)-1
  // Actual center is at -0.5 for even-sized grids
  const centerOffset = Math.floor(gridSize / 2);
  const gridCenter = {
    x: -0.5,
    y: 0,
    z: -0.5
  };

  return {
    frustumSize,
    distance,
    lookAt: gridCenter
  };
}

// Calculate optimal perspective camera settings to fit grid
export function fitPerspectiveCameraToGrid(gridSize, cellSize = 1, padding = 0.1, fov = 60) {
  // Grid dimensions in world space
  const worldSize = gridSize * cellSize;

  // Add padding
  const paddedSize = worldSize * (1 + padding);

  // For 3/4 view, we want a steep angle looking down
  // Manual tuning for optimal view of 10x10 grid
  // Scale proportionally based on grid size
  const baseSize = 10; // Our reference grid size
  const scale = paddedSize / baseSize;

  const distance = 5 * scale;
  const height = 11 * scale;

  // Grid center: for a grid of size N with cellSize 1
  // Grid coordinates 0 to N-1 map to world coordinates -floor(N/2) to ceil(N/2)-1
  // Actual center is at -0.5 for even-sized grids
  const gridCenter = {
    x: -0.5,
    y: 0,
    z: -0.5
  };

  return {
    fov,
    distance,
    height,
    lookAt: gridCenter
  };
}

// Update existing camera to fit grid
export function updateCameraToFitGrid(camera, renderer, gridSize, cellSize = 1, padding = 0.1) {
  const settings = fitCameraToGrid(gridSize, cellSize, padding);

  const aspect = window.innerWidth / window.innerHeight;
  camera.left = settings.frustumSize * aspect / -2;
  camera.right = settings.frustumSize * aspect / 2;
  camera.top = settings.frustumSize / 2;
  camera.bottom = settings.frustumSize / -2;

  camera.position.set(settings.distance, settings.distance, settings.distance);
  camera.lookAt(settings.lookAt.x, settings.lookAt.y, settings.lookAt.z);
  camera.updateProjectionMatrix();

  return settings;
}

// Add basic lighting to scene
export function addLighting(threeScene, options = {}) {
  const ambientLight = new THREE.AmbientLight(
    options.ambientColor || 0xffffff,
    options.ambientIntensity || 0.6
  );
  threeScene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(
    options.directionalColor || 0xffffff,
    options.directionalIntensity || 0.8
  );
  directionalLight.position.set(10, 10, 5);
  threeScene.add(directionalLight);

  return { ambientLight, directionalLight };
}

// Add grid helper
export function addGridHelper(threeScene, options = {}) {
  const size = options.size || 10;
  const divisions = options.divisions || 10;
  const gridHelper = new THREE.GridHelper(size, divisions);
  threeScene.add(gridHelper);
  return gridHelper;
}

// Setup window resize handler
export function setupResizeHandler(renderer, camera, frustumSize = 10) {
  window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;

    // Check if it's an orthographic or perspective camera
    if (camera.isOrthographicCamera) {
      // Orthographic camera - update frustum
      camera.left = frustumSize * aspect / -2;
      camera.right = frustumSize * aspect / 2;
      camera.top = frustumSize / 2;
      camera.bottom = frustumSize / -2;
    } else if (camera.isPerspectiveCamera) {
      // Perspective camera - update aspect ratio
      camera.aspect = aspect;
    }

    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// Create animation loop
export function createAnimationLoop(renderer, threeScene, camera, onUpdate) {
  function animate() {
    requestAnimationFrame(animate);

    // Call update callback if provided
    if (onUpdate) {
      onUpdate(threeScene);
    }

    renderer.render(threeScene, camera);
  }

  return animate;
}
