# Copilot Instructions — llm-invader

> See also `AGENTS.md` for the agent's role, code golfing rules, and
> working methodology. This file describes the repository's factual state.

## Project Context

A **js13kGames** project: vanilla JavaScript, zero runtime dependencies,
final deliverable = a ZIP file **≤ 13,312 bytes**. See `AGENTS.md` for
the design rules driven by this constraint.

## Build, Test, and Lint

- **Build:** `npm run build` — pure Node.js pipeline (`scripts/build.js`):
  extracts the inline `<script>` from `index.html`, minifies it with
  **Terser**, compresses it with **Roadroller**, and reinjects the result
  into `dist/index.html`. No external binaries or shell commands are used,
  ensuring identical behavior on Windows.
  - Disable Roadroller for comparison: `npm run build:no-rr` (uses
    `cross-env`, so the command is identical on Windows, macOS, and Linux—
    no need for `$env:RR=0` or `RR=0` depending on the shell).
  - Compare both outputs with `npm run size` and `npm run size:no-rr`,
    then keep the smaller one.
- **Check the final package size:** `npm run zip` (creates `dist.zip`
  using `archiver` with zlib level 9 and reports the remaining margin
  before the 13,312-byte limit). `npm run size` performs both the build
  and ZIP generation.
- **Testing:** No automated test suite is configured. For a project of
  this nature (a small game with a strict size budget), prefer manual
  browser testing over a heavyweight testing framework. If unit tests are
  added, they must remain in a separate `test/` directory and must never
  be included in the final build.
- **Linting:** Not configured. If added, ESLint must be installed as a
  `devDependency` only, with no impact on the final bundle.

## Architecture

- **Entry point:** `index.html` — a Space Invaders clone built with the
  Canvas 2D API, pure vanilla JavaScript, and no external libraries.
- **Game logic:** Everything lives inside the embedded `<script>` in
  `index.html` (player, enemies, projectiles, particles, game loop).
- **Bundling:** No multi-file bundler (Rollup, Webpack, esbuild, etc.) is
  used, since all JavaScript resides in a single inline `<script>`. The
  build pipeline (`scripts/build.js`) processes the HTML directly.
- **Dependencies:** No runtime dependencies. Only build tools listed as
  `devDependencies`.

## Key Conventions

- **Simple objects/classes:** Game entities (player, enemies,
  projectiles, particles) should be implemented as plain objects or
  lightweight classes directly within the HTML script.
- **Game loop:** `gameLoop` calls `update(dt)` followed by `draw()` using
  `requestAnimationFrame`.
- **File structure:** A single `index.html` containing the embedded
  script—no separate `src/` or `public/` directories at this stage.
- **Assets:** Avoid binary files (images/audio) in favor of procedural
  generation (Canvas for sprites, Web Audio API for sound). See
  `AGENTS.md` for the byte-budget rationale.

## Development Workflow

1. Edit `index.html` to add or modify game logic (keeping changes as
   focused as possible—see `AGENTS.md`, *Local Context*).
2. Run `npm run build`.
3. Verify that the final ZIP file is **≤ 13,312 bytes**.
4. Open `index.html` (or `dist/index.html`, depending on the build
   output) in a browser for testing.
5. Perform manual testing in at least Chrome and Firefox.

## Files to Edit

- `index.html` — game logic and entry point
- `package.json` — build commands and `devDependencies`
- `AGENTS.md` — agent rules (modify only if the development process
  changes, not for individual gameplay tasks)
- `skills/js13k-2d-toolkit/SKILL.md` — reusable snippets (collision,
  input handling, physics). This file must be consulted before
  implementing any such functionality—see `AGENTS.md`, **Available
  Skills**.