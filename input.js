// Input management for KIVI
// Handles keyboard, mouse, and touch input

// Global input manager (singleton) - handles keyboard and mouse/touch
class InputManager {
  constructor() {
    this.keys = {};
    this.mouse = {
      x: 0,
      y: 0,
      clicked: false,
      lastClickTime: 0
    };

    // Set up listeners only once
    if (!window.KIVI_INPUT_SETUP) {
      // Keyboard
      window.addEventListener('keydown', (e) => {
        this.keys[e.key.toLowerCase()] = true;
      });

      window.addEventListener('keyup', (e) => {
        this.keys[e.key.toLowerCase()] = false;
      });

      // Mouse/Touch - track position and clicks
      window.addEventListener('mousemove', (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      });

      window.addEventListener('click', (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        this.mouse.clicked = true;
        this.mouse.lastClickTime = performance.now();
      });

      // Touch support
      window.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
          const touch = e.touches[0];
          this.mouse.x = touch.clientX;
          this.mouse.y = touch.clientY;
          this.mouse.clicked = true;
          this.mouse.lastClickTime = performance.now();
        }
      });

      window.KIVI_INPUT_SETUP = true;
    }
  }

  // Get movement input (WASD or arrows)
  getMovementInput() {
    let x = 0;
    let z = 0;

    if (this.isKeyDown('w') || this.isKeyDown('arrowup')) z -= 1;
    if (this.isKeyDown('s') || this.isKeyDown('arrowdown')) z += 1;
    if (this.isKeyDown('a') || this.isKeyDown('arrowleft')) x -= 1;
    if (this.isKeyDown('d') || this.isKeyDown('arrowright')) x += 1;

    return { x, z };
  }

  // Check if key is down
  isKeyDown(key) {
    return this.keys[key.toLowerCase()] || false;
  }

  // Check if key was just pressed (requires tracking in script)
  isKeyPressed(key) {
    // This would need frame-by-frame tracking
    // For now, just return isKeyDown
    return this.isKeyDown(key);
  }

  // Get mouse/touch position
  getPointerPosition() {
    return { x: this.mouse.x, y: this.mouse.y };
  }

  // Check if there was a click this frame (call clearClick() after processing)
  wasClicked() {
    return this.mouse.clicked;
  }

  // Clear click state (call after processing click)
  clearClick() {
    this.mouse.clicked = false;
  }
}

// Export singleton instance
export const Input = new InputManager();
