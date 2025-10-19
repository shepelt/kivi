# KIVI

A minimal, AI-first voxel game engine built with Three.js. KIVI provides a simple component-based architecture inspired by Unity, designed to be easy for both humans and AI to understand and modify.

## Features

- **Voxel-based 3D world** with grid system
- **Component-based architecture** (physics, collision, input)
- **JSON scene files** for easy editing and AI generation
- **Automatic physics and collision** handling
- **Multiple camera modes** (isometric, 3/4 view)
- **Script-based game objects** with lifecycle hooks
- **Mouse/touch input** with raycasting
- **Modular scene organization** with external file references

## Quick Start

```bash
npm install
npm run dev
```

## Project Structure

```
kivi/
├── main.js           # Entry point
├── scene.js          # Scene orchestrator
├── grid.js           # Grid system
├── assets.js         # Block types and materials
├── renderer.js       # Three.js rendering utilities
├── physics.js        # Physics components
├── collision.js      # Collision detection
├── input.js          # Input management
├── scenes/           # Scene files
│   ├── default.json         # Main scene configuration
│   ├── player.json          # Player game object
│   └── ground-platform.json # Level geometry
└── scripts/          # Game object scripts
    └── player.js     # Player controller
```

## File Formats

### Scene File Format

Scene files define the game world configuration and game objects. They support external file references for modular organization.

**Example: `scenes/default.json`**

```json
{
  "name": "Demo Scene",
  "author": "Your Name",
  "description": "A simple demo scene",
  "created": "2025-10-15T12:00:00.000Z",
  "config": {
    "renderer": {
      "bgColor": 11918331
    },
    "grid": {
      "size": 10,
      "cellSize": 1,
      "boundary": true
    },
    "cameraMode": "3/4",
    "fitToGrid": true,
    "cameraPadding": 0.15,
    "showGrid": true
  },
  "gameObjects": [
    "/scenes/ground-platform.json",
    "/scenes/player.json"
  ]
}
```

#### Scene Configuration Options

**Renderer:**
- `bgColor` (number): Background color as hex number (e.g., `0xB5D7E3` or `11918331`)

**Grid:**
- `size` (number): Grid dimensions (creates size × size grid)
- `cellSize` (number): Size of each grid cell in world units
- `boundary` (boolean): Enable automatic boundary collision (default: `true`)

**Camera:**
- `cameraMode` (string): Camera type - `"isometric"`, `"3/4"`, `"34"`, or `"strategy"`
- `fitToGrid` (boolean): Auto-fit camera to grid size (default: `true`)
- `cameraPadding` (number): Padding around grid when auto-fitting (0.0-1.0)
- `showGrid` (boolean): Show grid helper lines (default: `true`)

**Game Objects:**
The `gameObjects` field supports three formats:

1. **Array of external references** (recommended):
```json
"gameObjects": [
  "/scenes/player.json",
  "/scenes/ground.json"
]
```

2. **Single external file**:
```json
"gameObjects": "/scenes/objects.json"
```

3. **Mixed array** (inline and external):
```json
"gameObjects": [
  "/scenes/player.json",
  { "id": "test", "blocks": [...] }
]
```

### Game Object File Format

Game object files define entities in the world with optional scripts and collision.

**Example: `scenes/player.json`**

```json
[
  {
    "id": "player_1",
    "name": "player",
    "script": "scripts/player.js",
    "blocks": [
      {
        "type": "sphere",
        "x": 5,
        "y": 2,
        "z": 5,
        "color": 0xFF0000
      }
    ]
  }
]
```

#### Game Object Properties

- `id` (string, required): Unique identifier for the game object
- `name` (string): Human-readable name
- `script` (string): Path to script file (relative to project root)
- `blocks` (array): Array of block definitions

#### Block Properties

- `type` (string, required): Block type - `"cube"`, `"sphere"`, `"cylinder"`, `"cone"`, `"torus"`
- `x`, `y`, `z` (number, required): Grid position
- `color` (number): Color as hex number (e.g., `0xFF0000` for red)
- `transparent` (boolean): Enable transparency
- `opacity` (number): Opacity value (0.0-1.0) when transparent is true

**Example with multiple blocks:**

```json
[
  {
    "id": "platform_1",
    "name": "ground",
    "blocks": [
      { "type": "cube", "x": 0, "y": 0, "z": 0, "color": 0x00FF00 },
      { "type": "cube", "x": 1, "y": 0, "z": 0, "color": 0x00FF00 },
      { "type": "cube", "x": 2, "y": 0, "z": 0, "color": 0x00FF00 }
    ]
  }
]
```

### Script File Format

Scripts define game object behavior using lifecycle hooks.

**Example: `scripts/player.js`**

```javascript
export default {
  // Called once when game object is initialized
  onInit(gameObject, scene) {
    // Create physics component
    gameObject.physics = scene.createVelocityPhysics({
      maxSpeed: 3,
      acceleration: 15,
      friction: 8,
      gravity: -20,
      maxFallSpeed: -20
    });

    // Create collision component
    gameObject.collider = new scene.collision.BoxCollider({
      x: 0.8,  // Width
      y: 1.0,  // Height
      z: 0.8   // Depth
    });

    // Custom properties
    gameObject.health = 100;
    gameObject.jumpForce = 8;
  },

  // Called every frame (before physics/collision)
  onUpdate(gameObject, scene, delta) {
    // Get input
    const input = scene.input.getMovementInput();

    // Apply movement
    gameObject.physics.applyForce(input.x, input.z, delta);

    // Jump
    if (scene.input.isKeyDown('space') && gameObject.isGrounded) {
      gameObject.physics.setVelocity('y', gameObject.jumpForce);
    }
  },

  // Called every frame (after physics/collision)
  onLateUpdate(gameObject, scene, delta) {
    // Post-physics logic (camera follow, etc.)
  }
}
```

#### Script Lifecycle

1. **onInit(gameObject, scene)** - Called once when game object is created
2. **onUpdate(gameObject, scene, delta)** - Called every frame before physics
3. *[Automatic physics update]*
4. *[Automatic collision resolution]*
5. **onCollisionEnter(gameObject, other, scene)** - Called when collision starts with another game object
6. **onCollisionStay(gameObject, other, scene)** - Called every frame while colliding with another game object
7. **onCollisionExit(gameObject, other, scene)** - Called when collision ends with another game object
8. *[Automatic grounding detection]*
9. **onLateUpdate(gameObject, scene, delta)** - Called every frame after physics

#### Collision Events

Game objects can respond to collisions with other game objects using three lifecycle hooks:

**onCollisionEnter(gameObject, other, scene)** - Triggered once when collision starts:
```javascript
onCollisionEnter(gameObject, other, scene) {
  // Check what we collided with
  if (other.name === 'paddle') {
    // Reverse velocity
    gameObject.velocity.z *= -1;
    console.log('Ball hit paddle!');
  }

  // Check by tag
  if (other.tag === 'breakable') {
    scene.destroy(other.id);  // Destroy the brick
  }
}
```

**onCollisionStay(gameObject, other, scene)** - Triggered every frame while collision continues:
```javascript
onCollisionStay(gameObject, other, scene) {
  // Continuous collision logic (e.g., damage over time)
  if (other.tag === 'lava') {
    gameObject.health -= 10 * delta;
  }
}
```

**onCollisionExit(gameObject, other, scene)** - Triggered once when collision ends:
```javascript
onCollisionExit(gameObject, other, scene) {
  // Handle separation
  if (other.tag === 'platform') {
    console.log('Left the platform');
  }
}
```

**Collision Detection:**
- Collisions are automatically detected between game objects that have `bounds`, `collider.size`, or `size` properties
- Access collision partner properties: `other.id`, `other.name`, `other.tag`, `other.position`, `other.bounds`
- See `scripts/ball.js` for a complete collision handling example

#### Available Components

**Physics Component:**
```javascript
gameObject.physics = scene.createVelocityPhysics({
  maxSpeed: 3,           // Maximum horizontal speed
  acceleration: 15,      // Acceleration force
  friction: 8,           // Friction/deceleration
  gravity: -20,          // Gravity force (negative = down)
  maxFallSpeed: -20      // Terminal velocity
});
```

**Collision Component:**
```javascript
gameObject.collider = new scene.collision.BoxCollider({
  x: 1.0,  // Width (X axis)
  y: 1.0,  // Height (Y axis)
  z: 1.0   // Depth (Z axis)
});
```

When a game object has both `physics` and `collider` components, the Scene automatically:
- Updates position based on velocity
- Resolves collisions with world geometry and boundaries
- Detects grounding and sets `gameObject.isGrounded`
- Snaps to ground when landing
- Stops velocity on blocked axes

#### Scene API

**Input:**
```javascript
scene.input.getMovementInput()           // Returns { x, z } for WASD/arrows
scene.input.isKeyDown(key)               // Check if key is pressed
scene.input.getPointerPosition()         // Returns { x, y } screen coords
scene.input.wasClicked()                 // Check if clicked this frame
scene.input.clearClick()                 // Clear click state

// Helper for click detection with raycasting
const hit = scene.checkClick();
if (hit) {
  console.log(hit.block);        // Three.js mesh
  console.log(hit.gameObject);   // Game object (if block belongs to one)
  console.log(hit.gridPosition); // { gridX, gridY, gridZ }
}
```

**Physics:**
```javascript
gameObject.physics.applyForce(x, z, delta)     // Apply horizontal force
gameObject.physics.setVelocity(axis, value)    // Set velocity on axis
gameObject.physics.getSpeed()                  // Get current speed
gameObject.physics.stop()                      // Stop all movement
gameObject.physics.stopHorizontal()            // Stop X/Z movement
gameObject.physics.stopVertical()              // Stop Y movement
```

**Game Object Properties (set automatically):**
```javascript
gameObject.id              // Unique ID
gameObject.name            // Name from scene file
gameObject.position        // { x, y, z } in world coordinates
gameObject.blocks          // Array of Three.js meshes
gameObject.isGrounded      // true if on ground (set by Scene)
```

## Coordinate System

KIVI uses a grid-based coordinate system:

- **Grid coordinates** are integers (e.g., `x: 5, y: 2, z: 3`)
- **World coordinates** are floats (blocks centered at grid positions)
- Grid is **centered at origin** - a 10×10 grid spans from -5 to +4
- **Y axis** is vertical (positive = up)
- **X/Z plane** is horizontal ground

**Grid cell mapping:**
- X/Z: Grid cell N is centered at world position N - floor(gridSize/2)
- Y: Grid cell N spans from N to N+1 in world coordinates

**Boundaries:**
When `boundary: true` in grid config, collision boundaries are automatically enforced at grid edges (accounting for collider sizes).

## Available Block Types

- `cube` - Standard block (1×1×1)
- `sphere` - Spherical block
- `cylinder` - Cylindrical block
- `cone` - Cone-shaped block
- `torus` - Donut-shaped block

## Camera Modes

- **isometric** - Classic isometric view (orthographic)
- **3/4** / **34** / **strategy** - Perspective camera at 45° angle

## Development

**Create a new scene:**
```javascript
const scene = new Scene({
  grid: { size: 10, cellSize: 1, boundary: true },
  cameraMode: '3/4',
  fitToGrid: true
});

await scene.loadFromURL('/scenes/default.json');
```

**Load scene with config:**
```javascript
const scene = await Scene.fromURL('/scenes/default.json');
```

**Instantiate game objects at runtime:**

Useful for spawning objects during gameplay or creating multiple instances of objects with the same script:

```javascript
// Spawn multiple enemies using the same script
for (let i = 0; i < 5; i++) {
  await scene.instantiate({
    id: `enemy_${i}`,
    name: "enemy",
    script: "scripts/enemy.js",  // Reuse existing script
    blocks: [
      { type: "cube", x: i * 2, y: 1, z: 5, color: 0xFF0000 }
    ]
  });
}

// Spawn a projectile during gameplay (from within a script)
const bulletId = `bullet_${Date.now()}`;
await scene.instantiate({
  id: bulletId,
  script: "scripts/bullet.js",
  blocks: [
    { type: "sphere", x: playerX, y: playerY, z: playerZ }
  ]
});

// Destroy a game object (bullet hit something, enemy died, etc.)
scene.destroy(bulletId);

// Generate procedural terrain (no script needed)
const blocks = [];
for (let x = 0; x < 10; x++) {
  for (let z = 0; z < 10; z++) {
    blocks.push({ type: "cube", x, y: 0, z, color: 0x00FF00 });
  }
}

await scene.instantiate({
  id: "platform_1",
  name: "ground",
  blocks: blocks
});
```

## Tips for AI Generation

KIVI is designed to be AI-friendly:

1. **Scenes are JSON** - Easy to generate and modify programmatically
2. **External references** - Split large scenes into modular files
3. **Component-based** - Add physics/collision by simply adding components
4. **Automatic systems** - Physics and collision handled automatically
5. **Simple scripts** - Plain JavaScript objects with lifecycle hooks
6. **Grid-based** - Integer coordinates make positioning predictable
7. **Runtime API** - Use `scene.instantiate()` to create objects programmatically

## License

MIT
