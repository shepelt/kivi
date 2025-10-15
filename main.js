// KIVI - Main entry point
// AI-first game sandbox engine for creating small, isometric, low-poly 3D games

import { Scene } from './scene.js';

const SCENE_PATH = '/scenes/default.json';

// Initialize KIVI by loading scene from file
// The scene file contains both the configuration and the blocks
async function loadScene() {
  try {
    const scene = await Scene.fromURL(SCENE_PATH);
    console.log('KIVI initialized successfully');
    console.log('Scene stats:', scene.getStats());

    // Expose scene globally for debugging/MCP
    window.KIVI = {
      scene,
      version: '0.0.1'
    };

    return scene;
  } catch (error) {
    console.error('Failed to initialize KIVI:', error);
    throw error;
  }
}

// Initial load
loadScene();

// Hot Module Replacement for scene JSON files (development only)
if (import.meta.hot) {
  let lastModified = null;

  // Poll for scene file changes (simple and reliable)
  setInterval(async () => {
    try {
      const response = await fetch(SCENE_PATH, { method: 'HEAD' });
      const modified = response.headers.get('last-modified');

      if (lastModified && modified && modified !== lastModified) {
        console.log('🔄 Scene file changed, reloading...');

        if (window.KIVI?.scene) {
          const dataResponse = await fetch(SCENE_PATH + '?t=' + Date.now());
          const sceneData = await dataResponse.json();
          window.KIVI.scene.load(sceneData);
          console.log('✅ Scene reloaded successfully');
        }
      }

      lastModified = modified;
    } catch (error) {
      // Silently fail - server might not be responding
    }
  }, 1000); // Check every second
}
