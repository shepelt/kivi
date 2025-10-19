// Collision detection for KIVI
// Simple grid-based collision system for voxel world

// Check if a position collides with any blocks in the grid
// excludeGround: if true, only check blocks at or above the player's center (ignore ground beneath feet)
export function checkCollision(scene, position, colliderSize = { x: 0.8, y: 0.8, z: 0.8 }, excludeGround = false) {
  // Get grid cells that this collider overlaps
  // Floor for min edge, floor for max edge to get all cells the AABB touches
  const minWorldX = position.x - colliderSize.x / 2;
  const maxWorldX = position.x + colliderSize.x / 2;
  const minWorldY = position.y - colliderSize.y / 2;
  const maxWorldY = position.y + colliderSize.y / 2;
  const minWorldZ = position.z - colliderSize.z / 2;
  const maxWorldZ = position.z + colliderSize.z / 2;

  // Convert to grid coordinates
  // X/Z: Grid cells are centered, so add 0.5 before flooring
  // Y: Grid cells span from gridY to gridY+1, so just floor
  const minGridX = Math.floor(minWorldX + scene.grid.centerOffset + 0.5);
  const maxGridX = Math.floor(maxWorldX + scene.grid.centerOffset + 0.5);
  let minGridY = Math.floor(minWorldY);
  const maxGridY = Math.floor(maxWorldY);
  const minGridZ = Math.floor(minWorldZ + scene.grid.centerOffset + 0.5);
  const maxGridZ = Math.floor(maxWorldZ + scene.grid.centerOffset + 0.5);

  // If excluding ground, only check from center height and above
  if (excludeGround) {
    minGridY = Math.floor(position.y);
  }

  // Check each grid cell for blocks
  for (let gx = minGridX; gx <= maxGridX; gx++) {
    for (let gy = minGridY; gy <= maxGridY; gy++) {
      for (let gz = minGridZ; gz <= maxGridZ; gz++) {
        if (scene.grid.isOccupied(gx, gy, gz)) {
          return true; // Collision detected
        }
      }
    }
  }

  return false; // No collision
}

// Check if standing on ground (block directly below)
export function checkGrounded(scene, position, colliderSize = { x: 0.8, y: 0.8, z: 0.8 }) {
  // Check if there's a block at the player's feet level
  const groundY = getGroundY(scene, position);

  // Consider grounded if feet are at or very close to ground level
  const feetY = position.y - colliderSize.y / 2;
  const distance = Math.abs(feetY - groundY);
  const grounded = distance < 0.2;
  return grounded;
}

// Get the Y position of the ground below
export function getGroundY(scene, position) {
  // Use same grid coordinate conversion as checkCollision (with +0.5 offset for cell centers)
  const gridX = Math.floor(position.x + scene.grid.centerOffset + 0.5);
  const gridZ = Math.floor(position.z + scene.grid.centerOffset + 0.5);

  // Search downward for the highest occupied block
  const startY = Math.max(Math.floor(position.y), 10);
  for (let y = startY; y >= 0; y--) {
    if (scene.grid.isOccupied(gridX, y, gridZ)) {
      // Block is centered at y + 0.5, top surface is at y + 1
      return y + 1;
    }
  }

  return 0; // No ground found, return 0
}

// Check if position is outside grid bounds
export function checkOutOfBounds(scene, position, collider) {
  if (!scene.gridBounds) return false;

  const bounds = scene.gridBounds;
  const halfX = collider.size.x / 2;
  const halfZ = collider.size.z / 2;

  return (
    position.x - halfX < bounds.minX ||
    position.x + halfX > bounds.maxX ||
    position.z - halfZ < bounds.minZ ||
    position.z + halfZ > bounds.maxZ
  );
}

// Clamp position to grid bounds
export function clampToBounds(scene, position, collider) {
  if (!scene.gridBounds) return;

  const bounds = scene.gridBounds;
  const halfX = collider.size.x / 2;
  const halfZ = collider.size.z / 2;

  position.x = Math.max(bounds.minX + halfX, Math.min(bounds.maxX - halfX, position.x));
  position.z = Math.max(bounds.minZ + halfZ, Math.min(bounds.maxZ - halfZ, position.z));
}

// Resolve collision by reverting position on colliding axes
// This allows sliding along walls while being blocked perpendicular to them
export function resolveCollision(scene, position, lastPosition, collider, excludeGround = false) {
  let hadCollision = false;

  // Check grid collision
  if (checkCollision(scene, position, collider.size, excludeGround)) {
    hadCollision = true;

    // Try moving only X
    const testPosX = { ...lastPosition, x: position.x };
    if (checkCollision(scene, testPosX, collider.size, excludeGround)) {
      position.x = lastPosition.x;
    }

    // Try moving only Y
    const testPosY = { ...lastPosition, y: position.y };
    if (checkCollision(scene, testPosY, collider.size, excludeGround)) {
      position.y = lastPosition.y;
    }

    // Try moving only Z
    const testPosZ = { ...lastPosition, z: position.z };
    if (checkCollision(scene, testPosZ, collider.size, excludeGround)) {
      position.z = lastPosition.z;
    }
  }

  // Check bounds collision and clamp
  if (checkOutOfBounds(scene, position, collider)) {
    clampToBounds(scene, position, collider);
    hadCollision = true;
  }

  return hadCollision;
}

// Check AABB collision between two game objects
// Returns { colliding: bool, penetration: {x, y, z} }
export function checkGameObjectCollision(obj1, obj2) {
  // Ensure both objects have position and bounds
  if (!obj1.position || !obj2.position) {
    return { colliding: false, penetration: { x: 0, y: 0, z: 0 } };
  }

  // Get bounds - use bounds for multi-block objects, collider.size for physics objects, or default size
  const size1 = obj1.bounds || (obj1.collider && obj1.collider.size) || obj1.size || { x: 1, y: 1, z: 1 };
  const size2 = obj2.bounds || (obj2.collider && obj2.collider.size) || obj2.size || { x: 1, y: 1, z: 1 };

  // Calculate distances between centers
  const dx = Math.abs(obj1.position.x - obj2.position.x);
  const dy = Math.abs(obj1.position.y - obj2.position.y);
  const dz = Math.abs(obj1.position.z - obj2.position.z);

  // Calculate collision thresholds (half-sizes added together)
  const colliderX = (size1.x + size2.x) / 2;
  const colliderY = (size1.y + size2.y) / 2;
  const colliderZ = (size1.z + size2.z) / 2;

  // Check if colliding on all axes
  const colliding = dx < colliderX && dy < colliderY && dz < colliderZ;

  // Calculate penetration depth on each axis
  const penetration = {
    x: colliderX - dx,
    y: colliderY - dy,
    z: colliderZ - dz
  };

  return { colliding, penetration };
}

// Simple AABB (Axis-Aligned Bounding Box) collider
export class BoxCollider {
  constructor(size = { x: 0.8, y: 0.8, z: 0.8 }) {
    this.size = size;
  }

  // Check if colliding with blocks at position
  checkCollision(scene, position, excludeGround = false) {
    return checkCollision(scene, position, this.size, excludeGround);
  }

  // Check if grounded at position
  checkGrounded(scene, position) {
    return checkGrounded(scene, position, this.size);
  }

  // Get ground Y at position
  getGroundY(scene, position) {
    return getGroundY(scene, position);
  }

  // Resolve collision by reverting to last valid position on colliding axes
  resolve(scene, position, lastPosition, excludeGround = false) {
    return resolveCollision(scene, position, lastPosition, this, excludeGround);
  }
}
