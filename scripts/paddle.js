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

    // Set up collider (match visual size: 3 blocks wide in X direction)
    gameObject.collider = new scene.collision.BoxCollider({
      x: 3.0,  // 3 blocks wide (covers x: 9, 10, 11)
      y: 2.0,
      z: 0.5
    });

    // Determine which keys to use based on paddle side
    gameObject.isLeftPaddle = gameObject.id.includes('left');
  },

  onUpdate(gameObject, scene, delta) {
    // Safety check: ensure position exists
    if (!gameObject.position) return;

    // Handle horizontal movement only (X axis in our game)
    let moveX = 0;

    if (gameObject.isLeftPaddle) {
      // Left paddle: A/D keys
      if (scene.input.isKeyDown('a')) moveX -= 1;
      if (scene.input.isKeyDown('d')) moveX += 1;
    } else {
      // Right paddle: Arrow keys
      if (scene.input.isKeyDown('arrowleft')) moveX -= 1;
      if (scene.input.isKeyDown('arrowright')) moveX += 1;
    }

    // Apply movement force (only on X axis)
    if (moveX !== 0) {
      gameObject.physics.velocity.x += moveX * gameObject.physics.acceleration * delta;
    } else {
      // Apply friction
      gameObject.physics.applyFriction(delta);
    }

    // Clamp speed
    const speed = Math.abs(gameObject.physics.velocity.x);
    if (speed > gameObject.physics.maxSpeed) {
      gameObject.physics.velocity.x = (gameObject.physics.velocity.x / speed) * gameObject.physics.maxSpeed;
    }

    // Update position (X only)
    gameObject.position.x += gameObject.physics.velocity.x * delta;

    // Clamp to boundaries (prevent going out of bounds)
    // Use grid size to calculate boundaries manually for Pong
    const gridSize = scene.grid.size;
    const centerOffset = scene.grid.centerOffset;
    const halfWidth = gameObject.collider.size.x / 2;

    // Calculate world bounds from grid
    const minX = -centerOffset - 0.5 + halfWidth;
    const maxX = gridSize - centerOffset - 0.5 - halfWidth;

    gameObject.position.x = Math.max(minX, Math.min(maxX, gameObject.position.x));
  }
};
