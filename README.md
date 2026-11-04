<div align="center">

# 🎯 AIMFORGE

**A first-person 3D aim trainer that runs in your browser.**
Five guns, five animated knives, four operators, five training modes. Every model, texture and sound is generated in code: no asset downloads, no install.

[**⬇ Download (.zip)**](https://github.com/apurvamukherjee/Aim-Trainer-Game/archive/refs/heads/main.zip) &nbsp;·&nbsp;
[**▶ Watch the trailer (MP4)**](docs/media/aimforge-trailer.mp4) &nbsp;·&nbsp;
[Run it locally](#run-it) &nbsp;·&nbsp;
[Controls](#controls)

<a href="docs/media/aimforge-trailer.mp4"><img src="docs/media/aimforge-trailer.gif" alt="AIMFORGE trailer: gameplay highlights" width="720"></a>

<sub>The GIF is a short silent preview. The <a href="docs/media/aimforge-trailer.mp4">full trailer</a> has its original soundtrack and subtitles (burned in, plus a selectable English track and <a href="docs/media/aimforge-trailer.srt">.srt</a>).</sub>

</div>

---

## Screenshots

| Main menu | Loadout |
| :---: | :---: |
| ![Main menu with the operator on a 3D stage](docs/media/screenshots/menu.png) | ![Loadout tab with the LR-50 Longbow on the display stand](docs/media/screenshots/loadout.png) |
| **Operators** | **Knife showcase** |
| ![Operator tab with Ronin selected; the accent colour retints the UI](docs/media/screenshots/operator.png) | ![Butterfly knife on the display stand mid-flip](docs/media/screenshots/knife-showcase.png) |

| Gridshot | Bot Duel |
| :---: | :---: |
| ![Gridshot gameplay with the VK-4 Vanguard](docs/media/screenshots/gridshot.png) | ![Bot Duel: kill feed and damage numbers](docs/media/screenshots/bots.png) |
| **Sniper scope** | **Smooth Tracking** |
| ![LR-50 Longbow 4.5x scope in Reflex Flick](docs/media/screenshots/sniper-scope.png) | ![Tracking mode with the K-7 Hornet SMG](docs/media/screenshots/tracking.png) |

| Balisong inspect | Karambit inspect | Bowie inspect |
| :---: | :---: | :---: |
| ![Butterfly knife inspect](docs/media/screenshots/knife-butterfly.png) | ![Karambit ring spin](docs/media/screenshots/knife-karambit.png) | ![Bowie blade roll](docs/media/screenshots/knife-bowie.png) |

| Loading | Results | Settings | Career |
| :---: | :---: | :---: | :---: |
| ![Loading screen](docs/media/screenshots/loading.png) | ![Results screen](docs/media/screenshots/results.png) | ![Settings](docs/media/screenshots/settings.png) | ![Career stats](docs/media/screenshots/career.png) |

---

## Run it

AIMFORGE is a static site. It uses ES modules, so it must be **served over HTTP**: double-clicking `index.html` won't work.

1. [Download the zip](https://github.com/apurvamukherjee/Aim-Trainer-Game/archive/refs/heads/main.zip) and unzip it, or clone the repo.
2. Start any static server in the folder:

   ```bash
   python3 -m http.server 8000
   ```

   (`npx serve` works too.)
3. Open <http://localhost:8000> and click **Deploy**.

**GitHub Pages:** go to *Settings → Pages → Deploy from branch → `main` / root*. Three.js is vendored in `vendor/`, so nothing is fetched from a CDN. The only network request is for Google Fonts, and the game falls back to system fonts without it.

Requirements: a desktop browser with WebGL 2, a mouse and a keyboard. On touch devices the menu shows a warning.

---

## What's in it (current state)

### Screens
- **Loading screen:** staged loader (renderer → arena → weapons → operator → bots → shader compile) with a progress bar and tips.
- **Main menu:** live 3D stage with your operator holding the selected primary (drag to rotate). Tabs: **Play · Loadout · Operator · Settings · Career**.
- **In-game HUD:** score, timer, accuracy, mode stats, ammo, weapon slots, reload bar, kill feed, floating damage numbers (gold for headshots), hitmarkers, a dynamic crosshair that shows spread, and a 3-2-1 countdown.
- **Pause** (`Esc`): resume, restart, finish, quit, plus quick settings. **Results:** score, accuracy, hits per second, best streak, mode-specific stats and a personal-best badge.

### Weapons

| Slot | Weapon | Type | Notes |
| --- | --- | --- | --- |
| 1 | **VK-4 Vanguard** | Assault rifle | 660 RPM, 1.5× red dot, controllable climb |
| 1 | **K-7 Hornet** | SMG | 900 RPM, suppressed, holo sight, damage falloff |
| 1 | **LR-50 Longbow** | Bolt-action sniper | 4.5× scope overlay, one-shot headshots, bolt-cycle animation |
| 1 | **SG-12 Breaker** | Pump shotgun | 9 pellets, shell-by-shell reload you can interrupt, pump animation |
| 2 | **P-9 Viper** | Pistol | Fast draw, slide-kick animation |

Each gun has its own damage, headshot multiplier, fire rate, magazine, reload time, spread and bloom, recoil, ADS zoom and time, equip time and move speed. You see first-person arms (in your operator's colours) with sway, bob, recoil kick, reload and equip animations, muzzle flash, tracers, bullet holes and sparks. Vertical recoil climbs while you spray, and pulling the mouse down cancels it.

### Knives (slot 3)

| Knife | Inspect animation (`F`) |
| --- | --- |
| **Moth Balisong** (butterfly) | Handles fan open and shut while the knife spins; flips open on draw |
| **Talon Karambit** | Spins around the finger ring |
| **Kestrel Dagger** | Tossed into the air and caught |
| **Ridgeback Bowie** | Rolled over to show both faces of the blade |
| **Shinobi Tanto** | Flipped into reverse grip and back |

`LMB` does an alternating slash, `RMB` a heavy stab. Knife hits register on bots, plates and targets, and you move faster with a knife out. In the Loadout tab, the display stand plays each knife's inspect on loop.

### Operators
**Specter** (Recon), **Ronin** (Assault), **Nova** (Support) and **Moss** (Marksman), each with a different helmet and gear. Set a callsign plus accent and armor colours. The accent colour also tints the UI, the arena neon and your first-person sleeves.

### Training modes
| Mode | Goal |
| --- | --- |
| **Gridshot** | Three targets on a grid at all times; speed and streak bonuses |
| **Reflex Flick** | One target anywhere in view that vanishes fast; measures reaction time |
| **Smooth Tracking** | Keep the crosshair on a strafing orb; scored by time on target |
| **Bot Duel** | Humanoid bots strafing side to side, with head hitboxes; tracks time-to-kill (Hard spawns two) |
| **Free Range** | No timer: steel plates at 10/25/50 m, static dummies and a moving bot |

Timed modes offer **Easy / Normal / Hard** (target size, speed and lifetime) and **30 / 60 / 90 s**.

### Settings and progress
- CS-scale sensitivity (cm/360 at 800 DPI is shown), ADS multiplier, horizontal FOV, crosshair style (cross, cross + dot, dot, circle, T), colour and size, dynamic crosshair, hold or toggle ADS, auto-reload, FPS counter, graphics quality.
- **Career:** personal bests per mode, difficulty and duration, the last 15 sessions, and lifetime totals (shots, accuracy, kills, headshots, time trained). Everything is saved in `localStorage`.

---

## Controls

| Input | Action |
| --- | --- |
| Mouse | Aim |
| `LMB` | Fire · knife slash |
| `RMB` | Aim down sights · knife stab |
| `W` `A` `S` `D` | Move |
| `Shift` / `Ctrl` / `Space` | Sprint / crouch / jump |
| `R` | Reload |
| `1` `2` `3` | Primary / secondary / knife |
| `Q`, mouse wheel | Last weapon, cycle weapons |
| `F` | Inspect |
| `Esc` | Pause |

---

## Project layout

```
index.html        screens: loading, menu, HUD, pause, results
styles.css        UI theme (accent colour driven by the operator)
js/main.js        game loop, player controller, shooting, melee, game flow
js/weapons.js     gun stats, procedural gun models, first-person viewmodel and animations
js/knives.js      knife stats, models and signature inspect animations
js/avatar.js      operator and training-bot character builder
js/world.js       arena (procedural textures, cover, lights) and menu stage
js/modes.js       training modes, targets, bots, difficulty
js/effects.js     tracers, bullet holes, sparks, muzzle light
js/hud.js         in-game HUD
js/ui.js          menu tabs, loadout, operator, settings, career, pause, results
js/audio.js       synthesized WebAudio sound effects
js/storage.js     saved profile (settings, loadout, bests, history)
vendor/           three.js r160 (MIT)
docs/media/       trailer (MP4 + subtitles + GIF) and screenshots
```

## Credits

- Built with [three.js](https://threejs.org) (MIT, vendored).
- UI fonts: [Oxanium](https://fonts.google.com/specimen/Oxanium) and [Rajdhani](https://fonts.google.com/specimen/Rajdhani) (SIL OFL) via Google Fonts.
- The trailer soundtrack is an original piece, synthesized in code for this project. The trailer was rendered frame by frame from the actual game.
