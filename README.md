# AIMFORGE — 3D FPS Aim Trainer

A first-person 3D aim trainer that runs in the browser with Three.js. You get a full weapon arsenal, animated knives, playable operators, five training modes and career stats. Everything is generated in code: there are no image, model or audio files to download.

## Run it

The game uses ES modules, so it must be served over HTTP. Opening `index.html` straight from disk won't work. Any static server is fine:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. GitHub Pages works too, because Three.js is vendored in `vendor/`.

## Features

- **Loading screen:** a real staged loader (renderer, arena, weapons, operator, bots, shader compile) with tips.
- **Main menu:** a live 3D stage showing your operator, plus tabs for **Play, Loadout, Operator, Settings and Career**.
- **Loadout:**
  - **Primary:** VK-4 Vanguard (AR), K-7 Hornet (SMG), LR-50 Longbow (bolt sniper with a 4.5× scope), SG-12 Breaker (pump shotgun with shell-by-shell reload)
  - **Secondary:** P-9 Viper pistol
  - **Melee:** Moth Balisong (butterfly), Talon Karambit, Kestrel Dagger, Ridgeback Bowie, Shinobi Tanto. Each has a signature inspect animation in the hand (`F`) and a draw flourish. `LMB` slashes, `RMB` does a heavy stab.
  - Each weapon has its own fire rate, damage, headshot multiplier, spread/bloom, recoil, ADS zoom, reload and mobility. The display stand shows the selected weapon, and knives play their inspect animation there on loop.
- **Operators:** Specter, Ronin, Nova and Moss, with different helmets and gear. Set a callsign plus accent and armor colours. The accent colour also tints the UI and the arena neon.
- **Modes:** Gridshot, Reflex Flick (tracks reaction time), Smooth Tracking (time on target), Bot Duel (strafing humanoid bots with head hitboxes) and Free Range (untimed, with steel plates at 10/25/50 m and dummies). Each has Easy/Normal/Hard and 30/60/90 s options.
- **Feel:**
  - First-person arms and viewmodel with sway, bob, recoil kick, reload/bolt/pump animations, muzzle flash, tracers, bullet holes and sparks
  - Recoil you control by pulling the mouse down
  - Dynamic crosshair, hitmarkers, headshot damage numbers and a kill feed
- **Settings:** CS-scale sensitivity (cm/360 shown), ADS multiplier, FOV, crosshair style/colour/size, volume, ADS toggle, auto-reload, graphics quality.
- **Career:** personal bests per mode, difficulty and duration, session history and lifetime totals, all stored in `localStorage`.

## Controls

| Key | Action |
| --- | --- |
| Mouse | Aim |
| LMB / RMB | Fire / aim down sights (with a knife: slash / stab) |
| WASD, Space, Shift, Ctrl | Move, jump, sprint, crouch |
| R | Reload |
| 1 / 2 / 3, Q, wheel | Primary / secondary / knife, last weapon, cycle |
| F | Inspect |
| Esc | Pause |

## Code layout

```
index.html        screens: loading, menu, HUD, pause, results
styles.css        UI theme
js/main.js        game loop, player controller, shooting, melee, flow
js/weapons.js     gun definitions, procedural gun models, first-person viewmodel
js/knives.js      knife definitions, models and inspect animations
js/avatar.js      operator / bot character builder
js/world.js       arena + menu stage
js/modes.js       training modes, targets and bots
js/effects.js     tracers, decals, particles
js/hud.js         in-game HUD
js/ui.js          menu, loadout, operator, settings, career
js/audio.js       synthesized WebAudio sounds
js/storage.js     saved profile
vendor/           three.js r160 (MIT)
```
