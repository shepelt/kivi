// Player script - handles player behavior
// This script is attached to the player game object

export default {
  // Called once when the game object is first loaded
  onInit(gameObject, scene) {
    console.log('Player initialized:', gameObject.id);

    // Initialize player properties
    gameObject.health = 100;

    // Set up physics (horizontal movement + gravity)
    gameObject.physics = scene.createVelocityPhysics({
      maxSpeed: 3,
      acceleration: 15,
      friction: 8,
      gravity: -20,
      maxFallSpeed: -20
    });

    // Jump settings
    gameObject.jumpForce = 8;

    // Set up collider (slightly smaller in XZ to prevent edge issues, full height in Y to match visual)
    gameObject.collider = new scene.collision.BoxCollider({
      x: 0.8,
      y: 1.0,
      z: 0.8
    });

    // Position is automatically set by Scene from first block
    console.log('Player initialized at position:', gameObject.position);
  },

  // Called every frame
  onUpdate(gameObject, scene, delta) {
    // Handle horizontal movement
    const input = scene.input.getMovementInput();
    gameObject.physics.applyForce(input.x, input.z, delta);

    // Handle jumping (isGrounded is set automatically by Scene)
    if ((scene.input.isKeyDown(' ') || scene.input.isKeyDown('space')) && gameObject.isGrounded) {
      gameObject.physics.setVelocity('y', gameObject.jumpForce);
      gameObject.isGrounded = false; // No longer grounded after jump
    }
  },

  // Called after physics and collision (both handled automatically by Scene)
  onLateUpdate(gameObject, scene, delta) {
    // Nothing needed here - physics, collision, grounding, and bounds are all automatic!
  },

  // Called when the game object is removed from the scene
  onDestroy(gameObject, scene) {
    console.log('Player destroyed:', gameObject.id);
  }
};
