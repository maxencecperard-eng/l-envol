# AGENTS.md

L'Envol is a client-only React 19 + Three.js bird-flight game. There is no backend: `express`, `dotenv`, `@google/genai`, `tsx`, `esbuild` and the `clean` script are unused AI Studio template leftovers. `metadata.json` and `.env.example` (`GEMINI_API_KEY`, `APP_URL`) are never read by the code — don't build on them.

## Commands

- `npm install --legacy-peer-deps` — plain `npm install` fails (devDep `esbuild@^0.25` conflicts with Vite 8's peer range). `bun.lock` is the committed lockfile; use bun only if it is already installed.
- `npm run dev` — Vite on `http://localhost:3000`, host `0.0.0.0`.
- `npm run lint` — this is `tsc --noEmit`, not ESLint. It is the only automated check.
- `npm run build` — production bundle in `dist/`; the >500 kB chunk warning is expected.
- No tests, CI, or formatter config. Verify with `npm run lint && npm run build` plus manual play.

## Architecture

- `src/App.tsx` owns all React state (coins, birds, missions, flight inputs, telemetry) and localStorage persistence, and renders `FlightCanvas` plus HUD overlays.
- `src/game/` is framework-free game logic, `src/world/` builds the Three.js scene, `src/components/` is React HUD/modals only. Keep Three.js work out of components except `FlightCanvas`.
- `FlightCanvas` mounts the WebGL canvas once in `useEffect(..., [])`; all props (inputs, objective, coins, callbacks) are mirrored into refs so the loop never restarts. Never add a dependency that would recreate the renderer.
- The game loop is `FlightCanvas.tick()`: physics → bird mesh → world animation → objective/coin proximity checks → `onTelemetryUpdate` → render. Progress and collisions are detected there, not in React.
- `getTerrainHeight(x, z)` in `src/world/proceduralWorld.ts` is the single source of truth for terrain: mesh vertices, landmark/building placement, and physics ground collision all use it. Changing it moves the whole world.
- World limits: 520×520 terrain, ocean past radius 220, altitude ceiling 150, spawn at `(0, 24, 0)`. Heading 0 faces +Z; positions are `[x, y, z]` tuples in data files.
- All visuals and audio are generated at runtime (Three.js geometry in `birdModel.ts` / `proceduralWorld.ts`, Web Audio synthesis in `soundManager.ts`, Tailwind in `index.css`). Don't add image, font, or audio assets.
- Tailwind v4 via `@tailwindcss/vite`; `src/index.css` is only `@import "tailwindcss";` — there is no tailwind config file.
- Software WebGL (SwiftShader/llvmpipe) is detected and the loop is throttled to ~60 ms frames with `fenceSync`; slow rendering in headless browsers is expected, not a bug.

## Conventions and gotchas

- Player-facing copy is French; code identifiers are English. Keep new UI strings French.
- The `@/` alias maps to the repo root, not `src/` (so `@/src/...`).
- localStorage keys in `App.tsx` (`lenvol_bird_coins`, `lenvol_bird_unlocked`, `lenvol_active_bird`, `lenvol_missions_state`) are the save format — keep them stable. World coin pickups (`INITIAL_COINS`) are not persisted and respawn on reload; only the coin balance is saved.
- Missions, objectives, coins, updrafts, and landmarks are plain data in `src/game/missionsData.ts`; birds in `src/game/birdsData.ts`. Objectives complete on proximity (`distance <= objective.radius`), and mission unlocking is positional (next entry in `INITIAL_MISSIONS`).
- Audio needs a user gesture: `sounds.init()` is called from keydown/click handlers. Don't autoplay audio.
- `vite.config.ts` disables HMR when `DISABLE_HMR=true` (AI Studio behaviour); leave that block alone.
