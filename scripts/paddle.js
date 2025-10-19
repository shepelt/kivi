// Paddle script for Pong game
// Controls a paddle that moves up/down

export default {
  onInit(gameObject, scene) {
    console.log('Paddle initialized:', gameObject.id);

    // Set up physics (vertical movement only, no gravity)
    gameObject.physics = scene.createVelocityPhysics({
      maxSpeed: 5,
      acceleration: 30,
      friction: 20,
      gravity: 0, // No gravity for Pong
      maxFallSpeed: 0
    });

    // Set up collider (match visual size: 3 blocks tall in Z direction)
    gameObject.collider = new scene.collision.BoxCollider({
      x: 0.5,
      y: 2.0,
      z: 3.0  // 3 blocks tall (covers z: 9, 10, 11)
    });

    // Determine which keys to use based on paddle side
    gameObject.isLeftPaddle = gameObject.id.includes('left');
  },

  onUpdate(gameObject, scene, delta) {
    // Safety check: ensure position exists
    if (!gameObject.position) return;

    // Handle vertical movement only (Z axis in our game)
    let moveZ = 0;

    if (gameObject.isLeftPaddle) {
      // Left paddle: W/S keys
      if (scene.input.isKeyDown('w')) moveZ -= 1;
      if (scene.input.isKeyDown('s')) moveZ += 1;
    } else {
      // Right paddle: Arrow keys
      if (scene.input.isKeyDown('arrowup')) moveZ -= 1;
      if (scene.input.isKeyDown('arrowdown')) moveZ += 1;
    }

    // Apply movement force (only on Z axis)
    if (moveZ !== 0) {
      gameObject.physics.velocity.z += moveZ * gameObject.physics.acceleration * delta;
    } else {
      // Apply friction
      gameObject.physics.applyFriction(delta);
    }

    // Clamp speed
    const speed = Math.abs(gameObject.physics.velocity.z);
    if (speed > gameObject.physics.maxSpeed) {
      gameObject.physics.velocity.z = (gameObject.physics.velocity.z / speed) * gameObject.physics.maxSpeed;
    }

    // Update position (Z only)
    gameObject.position.z += gameObject.physics.velocity.z * delta;

    // Clamp to boundaries (prevent going out of bounds)
    // Use grid size to calculate boundaries manually for Pong
    const gridSize = scene.grid.size;
    const centerOffset = scene.grid.centerOffset;
    const halfHeight = gameObject.collider.size.z / 2;

    // Calculate world bounds from grid
    const minZ = -centerOffset - 0.5 + halfHeight;
    const maxZ = gridSize - centerOffset - 0.5 - halfHeight;

    gameObject.position.z = Math.max(minZ, Math.min(maxZ, gameObject.position.z));
  }
};
