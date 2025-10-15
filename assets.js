// Asset generation system for KIVI
// Creates procedural block-based assets (1x1x1 grid-aligned blocks)

import * as THREE from 'three';

// Block types with their default properties
export const BLOCK_TYPES = {
  // Solid blocks
  STONE: { name: 'stone', color: 0x888888 },
  DIRT: { name: 'dirt', color: 0x88aa44 },
  GRASS: { name: 'grass', color: 0x44aa44 },
  WOOD: { name: 'wood', color: 0x8b4513 },

  // Grey shades
  GREY_DARKEST: { name: 'grey-darkest', color: 0x666666 },
  GREY_DARK: { name: 'grey-dark', color: 0x888888 },
  GREY: { name: 'grey', color: 0xaaaaaa },
  GREY_LIGHT: { name: 'grey-light', color: 0xaaaaaa },  // For ground - medium-light grey
  GREY_LIGHTEST: { name: 'grey-lightest', color: 0xeeeeee },  // For blocks on top - very light grey
  WHITE: { name: 'white', color: 0xffffff },
  BLACK: { name: 'black', color: 0x222222 },

  // Colored blocks
  RED: { name: 'red', color: 0xaa4444 },
  BLUE: { name: 'blue', color: 0x4444aa },
  YELLOW: { name: 'yellow', color: 0xaaaa44 },
  GREEN: { name: 'green', color: 0x44aa44 },
  ORANGE: { name: 'orange', color: 0xffaa00 },
  PURPLE: { name: 'purple', color: 0xaa44aa },

  // Special blocks
  GLASS: { name: 'glass', color: 0x88ccff, transparent: true, opacity: 0.5 },
  WATER: { name: 'water', color: 0x4488ff, transparent: true, opacity: 0.7 },

  // Primitives
  SPHERE: { name: 'sphere', color: 0xeeeeee, geometry: 'sphere' }
};

// Create a block mesh (1x1x1 cube)
export function createBlock(blockType, options = {}) {
  // Get block properties
  let blockProps;
  if (typeof blockType === 'string') {
    // Find by name
    blockProps = Object.values(BLOCK_TYPES).find(b => b.name === blockType);
    if (!blockProps) {
      console.warn(`Unknown block type: ${blockType}, using stone`);
      blockProps = BLOCK_TYPES.STONE;
    }
  } else if (typeof blockType === 'object') {
    // Custom block properties passed directly
    blockProps = blockType;
  } else {
    blockProps = BLOCK_TYPES.STONE;
  }

  // Override with options
  const color = options.color || blockProps.color;
  const transparent = options.transparent !== undefined ? options.transparent : blockProps.transparent;
  const opacity = options.opacity || blockProps.opacity || 1.0;

  // Create geometry based on type
  let geometry;
  let useFlatShading = true;

  if (blockProps.geometry === 'sphere') {
    // Sphere with radius 0.5 to fit in 1x1x1 space
    // Use more segments for smoother appearance
    geometry = new THREE.SphereGeometry(0.5, 32, 32);
    useFlatShading = false; // Smooth shading for spheres
  } else {
    // Default: 1x1x1 cube
    geometry = new THREE.BoxGeometry(1, 1, 1);
  }

  // Create material
  const material = new THREE.MeshStandardMaterial({
    color: color,
    flatShading: useFlatShading,
    transparent: transparent || false,
    opacity: opacity
  });

  // Create mesh
  const mesh = new THREE.Mesh(geometry, material);

  // Store block type for reference
  mesh.userData.blockType = blockProps.name || 'custom';
  mesh.userData.isBlock = true;

  return mesh;
}

// Create a multi-block structure (for future complex assets)
export function createStructure(blocks) {
  const group = new THREE.Group();

  blocks.forEach(({ type, offset, options }) => {
    const block = createBlock(type, options);
    block.position.set(offset.x || 0, offset.y || 0, offset.z || 0);
    group.add(block);
  });

  group.userData.isStructure = true;
  return group;
}

// Get block type by name (helper function)
export function getBlockType(name) {
  return Object.values(BLOCK_TYPES).find(b => b.name === name);
}
