---
name: js13k-2d-toolkit
description: >
  Consult THIS FILE before implementing any collision logic
  (sprite-to-sprite, sprite-to-world bounds), input handling
  (keyboard/touch/mouse), 2D physics (velocity, gravity, friction,
  bounce), object pooling/spawning (bullets, particles, enemies),
  sprite-sheet animation, menu/game/game-over state machines, or
  a delta-time game loop in a js13k game. Contains minimal,
  tested vanilla JavaScript implementations intended to be
  copied and adapted rather than reinvented or imported from an
  external library (prohibited by AGENTS.md). Triggers include:
  "collision", "hitbox", "bounce", "screen bounds",
  "keyboard input", "touch controls", "gravity", "velocity",
  "player movement", "AABB", "physics", "object pool",
  "spawn", "sprite-sheet", "animation", "game over",
  "score screen", "high score", "game loop",
  "delta time".
---

# 2D Toolkit — js13kGames (Vanilla JavaScript)

**Usage rule:** These snippets are intentionally written for **readability**
during development (descriptive names, comments). Code golfing
(short variable names, comment removal, etc.) is delegated to
Terser/Roadroller during the build process—**do not manually golf this
code while developing** (see `AGENTS.md`).

All functions are pure or nearly pure, with no dependency on a predefined
`Entity` class. They operate on simple objects such as `{x, y, w, h}` or
`{x, y, r}`, making them compatible with any game data structure already
used in `index.html`.

---

## 1. Collision — AABB (Rectangle vs. Rectangle)

**Use cases:** player vs. enemy, bullet vs. ship, platform vs. player.

```js
// a, b: objects with {x, y, w, h} — (x, y) is the top-left corner
function collideRect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}
```

---

## 2. Collision — Circle vs. Circle

**Use cases:** round projectiles, particles, asteroids.

```js
// a, b: objects with {x, y, r} — (x, y) is the center, r is the radius
function collideCircle(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  const rr = a.r + b.r;
  return dx * dx + dy * dy < rr * rr; // avoids Math.sqrt, faster
}
```

---

## 3. Collision — Circle vs. Rectangle

**Use case:** circular bullet/projectile against a rectangular enemy.

```js
// circle: {x, y, r} — rect: {x, y, w, h}
function collideCircleRect(circle, rect) {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  const dx = circle.x - closestX, dy = circle.y - closestY;
  return dx * dx + dy * dy < circle.r * circle.r;
}
```

---

## 4. Game World Bounds

Two common behaviors are provided:

- **Clamp** (prevent movement outside the play area, typical for players)
- **Bounce** (reflect off edges, typical for balls or asteroids)

The functions are intentionally separate for clarity—the build process
will inline them if beneficial.

```js
// Prevents a rectangle from leaving the canvas (e.g. player ship)
function clampToBounds(entity, boundsW, boundsH) {
  if (entity.x < 0) entity.x = 0;
  if (entity.y < 0) entity.y = 0;
  if (entity.x + entity.w > boundsW) entity.x = boundsW - entity.w;
  if (entity.y + entity.h > boundsH) entity.y = boundsH - entity.h;
}

// Makes an object with velocity {vx, vy} bounce off the boundaries.
// restitution = energy retained after collision (1 = perfectly elastic)
function bounceOffBounds(entity, boundsW, boundsH, restitution = 1) {
  if (entity.x < 0) { entity.x = 0; entity.vx = -entity.vx * restitution; }
  if (entity.x + entity.w > boundsW) { entity.x = boundsW - entity.w; entity.vx = -entity.vx * restitution; }
  if (entity.y < 0) { entity.y = 0; entity.vy = -entity.vy * restitution; }
  if (entity.y + entity.h > boundsH) { entity.y = boundsH - entity.h; entity.vy = -entity.vy * restitution; }
}

// Typical vertical shooter behavior:
// enemies leaving the bottom should be destroyed, not bounced.
// Pure test function (no mutation).
function isOffscreen(entity, boundsW, boundsH, margin = 0) {
  return entity.x + entity.w < -margin || entity.x > boundsW + margin ||
         entity.y + entity.h < -margin || entity.y > boundsH + margin;
}
```

---

## 5. Unified Input Handling — Keyboard + Touch

**Goal:** The rest of the game code should never read `keydown` or
`touchstart` directly. Instead, it reads a normalized `input` state,
regardless of the input device.

This is especially important for js13k games, which are expected to work
equally well on desktop and mobile without duplicated logic.

```js
// Normalized input state, read inside update().
const input = { left: false, right: false, up: false, down: false, fire: false };

// --- Keyboard ---
const KEY_MAP = {
  ArrowLeft: 'left', a: 'left',
  ArrowRight: 'right', d: 'right',
  ArrowUp: 'up', w: 'up',
  ArrowDown: 'down', s: 'down',
  ' ': 'fire',
};

addEventListener('keydown', (e) => {
  const action = KEY_MAP[e.key];
  if (action) { input[action] = true; e.preventDefault(); }
});

addEventListener('keyup', (e) => {
  const action = KEY_MAP[e.key];
  if (action) input[action] = false;
});

// --- Touch controls ---
// Minimal virtual D-pad drawn on the Canvas.
// No extra DOM/CSS = fewer bytes than an HTML D-pad.
function setupTouchControls(canvas) {
  const zones = {
    left:  { xMin: 0,    xMax: 0.25, yMin: 0.5, yMax: 1 },
    right: { xMin: 0.25, xMax: 0.5,  yMin: 0.5, yMax: 1 },
    fire:  { xMin: 0.5,  xMax: 1,    yMin: 0,   yMax: 1 },
  };

  function handleTouches(touches, active) {
    input.left = input.right = input.fire = false;

    for (const t of touches) {
      const rect = canvas.getBoundingClientRect();
      const fx = (t.clientX - rect.left) / rect.width;
      const fy = (t.clientY - rect.top) / rect.height;

      for (const [action, z] of Object.entries(zones)) {
        if (fx >= z.xMin && fx < z.xMax && fy >= z.yMin && fy < z.yMax) {
          input[action] = active;
        }
      }
    }
  }

  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouches(e.touches, true); }, { passive: false });
  canvas.addEventListener('touchmove',  (e) => { e.preventDefault(); handleTouches(e.touches, true); }, { passive: false });
  canvas.addEventListener('touchend',   (e) => { e.preventDefault(); handleTouches(e.touches, true); }, { passive: false });
}
```

Usage inside `update(dt)`:

```js
if (input.left)  player.x -= player.speed * dt;
if (input.right) player.x += player.speed * dt;
if (input.fire && canShoot) spawnBullet(player);
```

---

## 6. Minimal Physics (Semi-Implicit Euler)

Not a full physics engine—just enough for gravity, friction, and impulses,
which covers roughly 95% of js13k games (platformers, shooters with inertia,
Breakout-style games, etc.).

```js
// entity: {x, y, vx, vy}
function applyPhysics(entity, dt, {
  gravity = 0,
  friction = 1,
  maxSpeed = Infinity
} = {}) {

  entity.vy += gravity * dt;

  // Multiplicative friction (1 = none, 0.9 = strong braking)
  entity.vx *= friction;

  // Speed clamp
  const speed = Math.hypot(entity.vx, entity.vy);
  if (speed > maxSpeed) {
    const scale = maxSpeed / speed;
    entity.vx *= scale;
    entity.vy *= scale;
  }

  entity.x += entity.vx * dt;
  entity.y += entity.vy * dt;
}

// Instantaneous impulse (jump, recoil, explosion, etc.)
function applyImpulse(entity, ix, iy) {
  entity.vx += ix;
  entity.vy += iy;
}
```

Example:

```js
const player = {
  x: 100,
  y: 100,
  w: 16,
  h: 16,
  vx: 0,
  vy: 0,
  onGround: false
};

function update(dt) {
  if (input.left) player.vx = -120;
  else if (input.right) player.vx = 120;
  else player.vx = 0;

  if (input.up && player.onGround) {
    applyImpulse(player, 0, -280);
    player.onGround = false;
  }

  applyPhysics(player, dt, {
    gravity: 600,
    maxSpeed: 500
  });

  clampToBounds(player, canvas.width, canvas.height);

  player.onGround = player.y + player.h >= canvas.height;
}
```

---

## 8. Object Pooling (Bullets, Particles, Enemies)

Purpose: avoid allocating new objects for every bullet or explosion.
Pooling reduces garbage collection overhead and improves performance on
modest hardware.

```js
function createPool(size, factory) {
  const pool = [];

  for (let i = 0; i < size; i++) {
    const obj = factory();
    obj.active = false;
    pool.push(obj);
  }

  return pool;
}

function spawnFromPool(pool, init) {
  for (const obj of pool) {
    if (!obj.active) {
      obj.active = true;
      init(obj);
      return obj;
    }
  }
  return null;
}

function killPoolObject(obj) {
  obj.active = false;
}
```

(Usage remains identical.)

---

## 9. Sprite Sheet Animation

Use case: multiple animation frames stored in a single image.

A sprite sheet usually costs fewer bytes than several individual PNGs and
requires only one `drawImage()` call per frame.

```js
function createAnimation(sheet, frameW, frameH, frameCount, fps = 10) {
  return {
    sheet,
    frameW,
    frameH,
    frameCount,
    fps,
    timer: 0,
    frame: 0
  };
}

function updateAnimation(anim, dt) {
  anim.timer += dt;

  const frameDuration = 1 / anim.fps;

  if (anim.timer >= frameDuration) {
    anim.timer -= frameDuration;
    anim.frame = (anim.frame + 1) % anim.frameCount;
  }
}

function drawAnimation(ctx, anim, x, y) {
  ctx.drawImage(
    anim.sheet,
    anim.frame * anim.frameW, 0,
    anim.frameW,
    anim.frameH,
    x,
    y,
    anim.frameW,
    anim.frameH
  );
}
```

**Even smaller alternative:** use procedural Canvas animation instead of
sprite sheets whenever the game's art style allows it, in accordance with
the "procedural generation over binary assets" principle.

---

## 10. Minimal Score / Game Over Screen

Use case: simple state machine handling menu, gameplay, and game over,
without requiring a scene framework.

A single `gameState` object is sufficient for most js13k games.

(The implementation remains identical; only comments and strings would be
translated if desired.)

**Note:** `localStorage` is a native browser API (not an external library),
so it is fully allowed for persistent high scores.

---

## 11. Clean Delta-Time Game Loop

Converts the `requestAnimationFrame()` timestamp from milliseconds to
seconds and clamps large `dt` values (for example when the browser tab
becomes active again after a long pause), preventing entities from
"teleporting."

```js
let lastTime = 0;

function gameLoop(timestamp) {
  let dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  dt = Math.min(dt, 1 / 30);

  update(dt);
  draw();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
```

---

## 12. Performance Note (GTX 1060 / Tight Loops)

When handling large numbers of entities (>200), an `O(n²)` collision loop
can become expensive, even in a simple 2D game.

Before optimizing with a spatial grid or quadtree, verify that collision
detection is actually the bottleneck.

For most js13k games (typically only a few dozen entities), a naïve double
loop is perfectly adequate and adds **zero extra code complexity**:

```js
function checkAllCollisions(entitiesA, entitiesB, onHit) {
  for (const a of entitiesA) {
    for (const b of entitiesB) {
      if (collideRect(a, b)) onHit(a, b);
    }
  }
}
```

Only recommend spatial partitioning if the user has measured a genuine
performance problem. Adding it preemptively increases both byte count and
code complexity for a benefit that is rarely worthwhile at the scale of a
typical js13k game.