// Ball script for Pong game
// Bounces off paddles and walls, resets on goals

export default {
  onInit(gameObject, scene) {
    console.log('Ball initialized:', gameObject.id);

    // Ball velocity (no physics component, manual control)
    gameObject.velocity = { x: 3, z: 2 };
    gameObject.speed = 3;

    // Ball size for collision detection (no collider component - manual collision)
    // Sphere has radius 0.5, so diameter is 1.0
    gameObject.size = { x: 1.0, y: 1.0, z: 1.0 };

    // Score tracking
    if (!scene.pongScore) {
      scene.pongScore = { left: 0, right: 0 };
      console.log('Score: 0 - 0');
    }
  },

  onUpdate(gameObject, scene, delta) {
    // Safety check: ensure position exists
    if (!gameObject.position) return;

    // Move ball
    gameObject.position.x += gameObject.velocity.x * delta;
    gameObject.position.z += gameObject.velocity.z * delta;

    // Debug: log position and velocity occasionally
    if (!gameObject.lastDebugTime || performance.now() - gameObject.lastDebugTime > 1000) {
      console.log(`Ball pos: (${gameObject.position.x.toFixed(2)}, ${gameObject.position.z.toFixed(2)}), vel: (${gameObject.velocity.x.toFixed(2)}, ${gameObject.velocity.z.toFixed(2)})`);
      gameObject.lastDebugTime = performance.now();
    }

    // Calculate boundaries from grid
    const gridSize = scene.grid.size;
    const centerOffset = scene.grid.centerOffset;
    const bounds = {
      minX: -centerOffset - 0.5,
      maxX: gridSize - centerOffset - 0.5,
      minZ: -centerOffset - 0.5,
      maxZ: gridSize - centerOffset - 0.5
    };

    // Check top/bottom wall collisions (Z axis)
    if (gameObject.position.z <= bounds.minZ + 0.5 || gameObject.position.z >= bounds.maxZ - 0.5) {
      gameObject.velocity.z *= -1; // Bounce
      // Clamp position
      gameObject.position.z = Math.max(bounds.minZ + 0.5, Math.min(bounds.maxZ - 0.5, gameObject.position.z));
    }

    // Check paddle collisions
    const paddles = scene.findGameObjectsByName('paddle');
    for (const paddle of paddles) {
      if (!paddle.position || !paddle.collider) continue;

      // Simple AABB collision check
      const dx = Math.abs(gameObject.position.x - paddle.position.x);
      const dz = Math.abs(gameObject.position.z - paddle.position.z);

      const colliderX = (gameObject.size.x + paddle.collider.size.x) / 2;
      const colliderZ = (gameObject.size.z + paddle.collider.size.z) / 2;

      if (dx < colliderX && dz < colliderZ) {
        // Collision detected!

        // Reverse velocity
        gameObject.velocity.x *= -1.05; // Bounce and speed up slightly

        // Add spin based on where it hit the paddle
        const hitOffset = (gameObject.position.z - paddle.position.z) / paddle.collider.size.z;
        gameObject.velocity.z += hitOffset * 2;

        // Push ball away from paddle to prevent overlap
        const relativeX = gameObject.position.x - paddle.position.x;
        if (relativeX < 0) {
          // Ball is on left side of paddle, push it to the left edge
          gameObject.position.x = paddle.position.x - colliderX;
        } else {
          // Ball is on right side of paddle, push it to the right edge
          gameObject.position.x = paddle.position.x + colliderX;
        }

        console.log('Ball hit paddle!');
      }
    }

    // Check left/right wall collisions (X axis) - bounce for testing
    if (gameObject.position.x <= bounds.minX + 0.5 || gameObject.position.x >= bounds.maxX - 0.5) {
      gameObject.velocity.x *= -1; // Bounce
      // Clamp position
      gameObject.position.x = Math.max(bounds.minX + 0.5, Math.min(bounds.maxX - 0.5, gameObject.position.x));
      console.log('Ball bounced off left/right wall');
    }

    // ORIGINAL GOAL LOGIC (commented out for testing):
    // if (gameObject.position.x <= bounds.minX) {
    //   // Right player scored
    //   scene.pongScore.right++;
    //   console.log(`Score: ${scene.pongScore.left} - ${scene.pongScore.right}`);
    //   this.resetBall(gameObject, scene);
    // } else if (gameObject.position.x >= bounds.maxX) {
    //   // Left player scored
    //   scene.pongScore.left++;
    //   console.log(`Score: ${scene.pongScore.left} - ${scene.pongScore.right}`);
    //   this.resetBall(gameObject, scene);
    // }
  },

  resetBall(gameObject, scene) {
    // Reset to center
    gameObject.position.x = 0;
    gameObject.position.z = 0;

    // Random direction
    const dirX = Math.random() > 0.5 ? 1 : -1;
    const dirZ = (Math.random() - 0.5) * 2;

    gameObject.velocity.x = dirX * gameObject.speed;
    gameObject.velocity.z = dirZ * gameObject.speed;
  }
};
