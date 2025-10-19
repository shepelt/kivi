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

  onCollisionEnter(gameObject, other, scene) {
    // Handle paddle collision
    if (other.name === 'paddle') {
      // Only process if velocity is moving toward the paddle (prevents multiple bounces)
      const relativeZ = gameObject.position.z - other.position.z;
      const movingToward = (relativeZ < 0 && gameObject.velocity.z > 0) ||
                           (relativeZ > 0 && gameObject.velocity.z < 0);

      if (!movingToward) return; // Skip if already bouncing away

      // Reverse Z velocity (ball bounces up/down off horizontal paddle)
      gameObject.velocity.z *= -1.02; // Small speed boost (2% per hit)

      // Add spin based on where it hit the paddle (horizontally)
      const paddleSize = other.collider ? other.collider.size : other.bounds;
      const hitOffset = (gameObject.position.x - other.position.x) / paddleSize.x;
      gameObject.velocity.x += hitOffset * 2;

      console.log('Ball hit paddle!');
    }

    // Handle brick collision
    if (other.tag === 'breakable') {
      // Destroy brick
      console.log('Ball hit brick:', other.id);
      scene.destroy(other.id);

      // Determine which side was hit by checking penetration
      // Calculate penetration on each axis
      const size1 = gameObject.size || { x: 1, y: 1, z: 1 };
      const size2 = other.bounds || { x: 1, y: 1, z: 1 };

      const dx = Math.abs(gameObject.position.x - other.position.x);
      const dz = Math.abs(gameObject.position.z - other.position.z);

      const penetrationX = (size1.x + size2.x) / 2 - dx;
      const penetrationZ = (size1.z + size2.z) / 2 - dz;

      // Bounce based on which side had less penetration (that's the side that was hit)
      if (penetrationX < penetrationZ) {
        // Hit left or right side, reverse X velocity
        gameObject.velocity.x *= -1;
      } else {
        // Hit top or bottom side, reverse Z velocity
        gameObject.velocity.z *= -1;
      }
    }
  },

  onUpdate(gameObject, scene, delta) {
    // Safety check: ensure position exists
    if (!gameObject.position) return;

    // Move ball
    gameObject.position.x += gameObject.velocity.x * delta;
    gameObject.position.z += gameObject.velocity.z * delta;

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
