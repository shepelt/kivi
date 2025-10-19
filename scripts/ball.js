// Ball script for Pong game
// Bounces off paddles and walls, resets on goals

import { checkGameObjectCollision } from '../collision.js';

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
      const collision = checkGameObjectCollision(gameObject, paddle);

      if (collision.colliding) {
        // Collision detected!

        // Reverse Z velocity (ball bounces up/down off horizontal paddle)
        gameObject.velocity.z *= -1.05; // Bounce and speed up slightly

        // Add spin based on where it hit the paddle (horizontally)
        const paddleSize = paddle.collider ? paddle.collider.size : paddle.bounds;
        const hitOffset = (gameObject.position.x - paddle.position.x) / paddleSize.x;
        gameObject.velocity.x += hitOffset * 2;

        // Push ball away from paddle to prevent overlap (in Z direction)
        const size1 = gameObject.size || { x: 1, y: 1, z: 1 };
        const size2 = paddleSize || { x: 1, y: 1, z: 1 };
        const colliderZ = (size1.z + size2.z) / 2;

        const relativeZ = gameObject.position.z - paddle.position.z;
        if (relativeZ < 0) {
          // Ball is on top side of paddle, push it up
          gameObject.position.z = paddle.position.z - colliderZ;
        } else {
          // Ball is on bottom side of paddle, push it down
          gameObject.position.z = paddle.position.z + colliderZ;
        }

        console.log('Ball hit paddle!');
      }
    }

    // Check brick collisions (Arkanoid-style breakable blocks)
    const bricks = scene.findGameObjects(obj => obj.tag === 'breakable');
    for (const brick of bricks) {
      const collision = checkGameObjectCollision(gameObject, brick);

      if (collision.colliding) {
        // Collision detected! Destroy brick
        console.log('Ball hit brick:', brick.id);
        scene.destroy(brick.id);

        // Determine which side was hit by comparing penetration depth
        // Bounce based on which side had less penetration (that's the side that was hit)
        if (collision.penetration.x < collision.penetration.z) {
          // Hit left or right side, reverse X velocity
          gameObject.velocity.x *= -1;

          const size1 = gameObject.size || { x: 1, y: 1, z: 1 };
          const size2 = brick.bounds || { x: 1, y: 1, z: 1 };
          const colliderX = (size1.x + size2.x) / 2;

          const relativeX = gameObject.position.x - brick.position.x;
          if (relativeX < 0) {
            gameObject.position.x = brick.position.x - colliderX;
          } else {
            gameObject.position.x = brick.position.x + colliderX;
          }
        } else {
          // Hit top or bottom side, reverse Z velocity
          gameObject.velocity.z *= -1;

          const size1 = gameObject.size || { x: 1, y: 1, z: 1 };
          const size2 = brick.bounds || { x: 1, y: 1, z: 1 };
          const colliderZ = (size1.z + size2.z) / 2;

          const relativeZ = gameObject.position.z - brick.position.z;
          if (relativeZ < 0) {
            gameObject.position.z = brick.position.z - colliderZ;
          } else {
            gameObject.position.z = brick.position.z + colliderZ;
          }
        }

        break; // Only handle one brick collision per frame
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
