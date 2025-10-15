// Physics components for KIVI
// Provides reusable physics behaviors for game objects

// Simple 3D velocity-based physics
export class VelocityPhysics {
  constructor(options = {}) {
    this.velocity = { x: 0, y: 0, z: 0 };
    this.maxSpeed = options.maxSpeed || 3;
    this.acceleration = options.acceleration || 15;
    this.friction = options.friction || 8;

    // Gravity settings (optional - only if gravity is enabled)
    this.gravity = options.gravity || 0;
    this.maxFallSpeed = options.maxFallSpeed || -20;
  }

  // Apply force in a direction (normalized direction vector)
  applyForce(forceX, forceZ, delta) {
    if (forceX !== 0 || forceZ !== 0) {
      // Normalize direction
      const len = Math.sqrt(forceX * forceX + forceZ * forceZ);
      if (len > 0) {
        forceX /= len;
        forceZ /= len;
      }

      // Accelerate
      this.velocity.x += forceX * this.acceleration * delta;
      this.velocity.z += forceZ * this.acceleration * delta;
    } else {
      // Apply friction when no force
      this.applyFriction(delta);
    }

    // Clamp to max speed
    this.clampSpeed();
  }

  // Apply friction (deceleration)
  applyFriction(delta) {
    const currentSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
    if (currentSpeed > 0.01) {
      const frictionAmount = this.friction * delta;
      const ratio = Math.max(0, (currentSpeed - frictionAmount) / currentSpeed);
      this.velocity.x *= ratio;
      this.velocity.z *= ratio;
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }
  }

  // Clamp velocity to max speed
  clampSpeed() {
    const currentSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
    if (currentSpeed > this.maxSpeed) {
      this.velocity.x = (this.velocity.x / currentSpeed) * this.maxSpeed;
      this.velocity.z = (this.velocity.z / currentSpeed) * this.maxSpeed;
    }
  }

  // Update position based on velocity (automatically applies gravity)
  updatePosition(position, delta, applyGravity = true) {
    // Apply gravity if enabled and requested
    if (this.gravity !== 0 && applyGravity) {
      this.velocity.y += this.gravity * delta;
      // Clamp fall speed
      if (this.velocity.y < this.maxFallSpeed) {
        this.velocity.y = this.maxFallSpeed;
      }
    }

    // Update position
    position.x += this.velocity.x * delta;
    position.y += this.velocity.y * delta;
    position.z += this.velocity.z * delta;

    return position;
  }

  // Set velocity on specific axis
  setVelocity(axis, value) {
    this.velocity[axis] = value;
  }

  // Get current horizontal speed
  getSpeed() {
    return Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
  }

  // Stop all movement
  stop() {
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.velocity.z = 0;
  }

  // Stop horizontal movement only
  stopHorizontal() {
    this.velocity.x = 0;
    this.velocity.z = 0;
  }

  // Stop vertical movement only
  stopVertical() {
    this.velocity.y = 0;
  }
}

// Simple gravity physics (Y movement)
export class GravityPhysics {
  constructor(options = {}) {
    this.velocityY = 0;
    this.gravity = options.gravity || -20; // Negative Y is down
    this.maxFallSpeed = options.maxFallSpeed || -20;
  }

  // Apply gravity
  applyGravity(delta) {
    this.velocityY += this.gravity * delta;
    // Clamp fall speed
    if (this.velocityY < this.maxFallSpeed) {
      this.velocityY = this.maxFallSpeed;
    }
  }

  // Update position based on velocity
  updatePosition(position, delta) {
    position.y += this.velocityY * delta;
    return position;
  }

  // Set vertical velocity (for jumping, launching, etc.)
  setVelocityY(velocity) {
    this.velocityY = velocity;
  }

  // Stop vertical movement
  stop() {
    this.velocityY = 0;
  }
}

