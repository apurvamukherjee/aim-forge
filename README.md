# AIMFORGE

A free aim trainer for FPS players that runs in your browser, with nothing to install. **[▶ Play online](https://apurvamukherjee.github.io/aim-forge/)**

```bash
git clone https://github.com/apurvamukherjee/aim-forge && cd aim-forge && python3 -m http.server 8000
```

![Demo: a few seconds of Gridshot](docs/media/demo.gif)

[![CI](https://github.com/apurvamukherjee/aim-forge/actions/workflows/ci.yml/badge.svg)](https://github.com/apurvamukherjee/aim-forge/actions/workflows/ci.yml) · [Trailer](#trailer) · [Run it](#run-it) · [Controls](#controls) · [Contributing](CONTRIBUTING.md) · [MIT License](LICENSE)

<img src="docs/media/banner.png" alt="AIMFORGE: first-person 3D aim trainer, by Apurva" width="100%">

Five guns, five animated knives, four operators, five training modes and **six themed maps**. Every model, texture and sound is generated in code. The full 66-second [trailer](docs/media/aimforge-trailer.mp4) has its original soundtrack and subtitles (burned in, plus a selectable English track and [.srt](docs/media/aimforge-trailer.srt)).

---

## Trailer

A 66-second cinematic rendered frame by frame from the real game, with an **original synthwave soundtrack** (synthesized in code for this project) and **subtitles**. The subtitles are burned in, and there's also a selectable English track plus a separate [`.srt`](docs/media/aimforge-trailer.srt).

| | |
| --- | --- |
| ▶ **Watch / download** | [aimforge-trailer.mp4](docs/media/aimforge-trailer.mp4) (1280×720, H.264 + AAC, 8 MB) · [direct download](https://github.com/apurvamukherjee/aim-forge/raw/main/docs/media/aimforge-trailer.mp4) |
| 0:00 | Loading screen |
| 0:01 | Main menu: operator on the 3D stage |
| 0:05 | Operators: Ronin, Nova, Moss, Specter |
| 0:10 | Loadout: guns, then knives on the display stand |
| 0:20 | Gridshot with the VK-4 Vanguard |
| 0:26 | Bot Duel (Hard): headshots and kill feed |
| 0:32 | Reflex Flick through the LR-50 scope |
| 0:37 | Smooth Tracking with the K-7 Hornet |
| 0:41 | Knife inspects: Balisong, Karambit, Dagger, Bowie, Tanto, then slash and stab |
| 0:58 | Results and the end card |

---

## Maps

Six themed maps share one arena footprint and cover layout, so scores compare fairly across them. Each map has its own sky (sun or moon, painted skyline), lighting, fog, floor and wall surfaces, cover pieces, props and weather. Pick one in the **Play** tab.

| | | |
| :---: | :---: | :---: |
| ![Training Facility](docs/media/screenshots/map-range.jpg) **Training Facility**<br><sub>Night · floodlit range · starfield</sub> | ![Sunscorch](docs/media/screenshots/map-sunscorch.jpg) **Sunscorch**<br><sub>Desert outpost · low sunset sun · drifting dust · palms and adobe towers</sub> | ![Frostbite](docs/media/screenshots/map-frostbite.jpg) **Frostbite**<br><sub>Arctic station · snowfall · pines, drifts and a radar mast</sub> |
| ![Neon District](docs/media/screenshots/map-neon.jpg) **Neon District**<br><sub>Rooftop city at night · rain · billboards, puddles, coloured light</sub> | ![Overgrowth](docs/media/screenshots/map-overgrowth.jpg) **Overgrowth**<br><sub>Jungle temple ruins · fireflies · vines, ferns and broken pillars</sub> | ![Rust Yard](docs/media/screenshots/map-rustyard.jpg) **Rust Yard**<br><sub>Container port at dusk · gantry cranes, stacked containers, oil drums</sub> |

---

## Animations

![Staged rifle reload: reach, magazine out, fresh magazine, rack](docs/media/screenshots/reload-sequence.jpg)
![Pistol magazine, shotgun shell loading, knife draw flourish](docs/media/screenshots/reload-knife.jpg)

- **Staged reloads:** the gun rolls to show its underside, the support hand travels to the magazine and pulls it out (it tumbles away), then a fresh magazine rides up with the hand and the gun is racked. The pistol slide snaps back, the rifle jolts and the sniper cycles its bolt. The shotgun's support hand feeds a visible shell into the loading port for every round.
- **Instant knife flourish:** switching to your knife (`3`, `Q` or the wheel) plays its signature flourish immediately. You can attack straight away, and the attack cancels it.
- **Looping inspect:** `F` starts an inspect that loops until you press `F` again, fire, aim, reload or swap. It works for every gun and knife, and an on-screen hint shows while it's running.

---

## Screenshots

| Main menu | Loadout |
| :---: | :---: |
| ![Main menu with the operator on a 3D stage](docs/media/screenshots/menu.jpg) | ![Loadout tab with the LR-50 Longbow on the display stand](docs/media/screenshots/loadout.jpg) |
| **Operators** | **Knife showcase** |
| ![Operator tab with Ronin selected; the accent colour retints the UI](docs/media/screenshots/operator.jpg) | ![Butterfly knife on the display stand mid-flip](docs/media/screenshots/knife-showcase.jpg) |

| Gridshot | Bot Duel |
| :---: | :---: |
| ![Gridshot gameplay with the VK-4 Vanguard](docs/media/screenshots/gridshot.jpg) | ![Bot Duel: kill feed and damage numbers](docs/media/screenshots/bots.jpg) |
| **Sniper scope** | **Smooth Tracking** |
| ![LR-50 Longbow 4.5x scope in Reflex Flick](docs/media/screenshots/sniper-scope.jpg) | ![Tracking mode with the K-7 Hornet SMG](docs/media/screenshots/tracking.jpg) |

| Balisong inspect | Karambit inspect | Bowie inspect |
| :---: | :---: | :---: |
| ![Butterfly knife inspect](docs/media/screenshots/knife-butterfly.jpg) | ![Karambit ring spin](docs/media/screenshots/knife-karambit.jpg) | ![Bowie blade roll](docs/media/screenshots/knife-bowie.jpg) |

| Loading | Results | Settings | Career |
| :---: | :---: | :---: | :---: |
| ![Loading screen](docs/media/screenshots/loading.jpg) | ![Results screen](docs/media/screenshots/results.jpg) | ![Settings](docs/media/screenshots/settings.jpg) | ![Career stats](docs/media/screenshots/career.jpg) |

---

## Run it

AIMFORGE is a static site. It uses ES modules, so it must be **served over HTTP**: double-clicking `index.html` won't work.

1. [Download the zip](https://github.com/apurvamukherjee/aim-forge/archive/refs/heads/main.zip) and unzip it, or clone the repo.
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

Switching to the knife plays its flourish instantly, and `F` loops the inspect until you press it again. `LMB` does an alternating slash, `RMB` a heavy stab. Knife hits register on bots, plates and targets, and you move faster with a knife out. In the Loadout tab, the display stand plays each knife's inspect on loop.

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

Timed modes offer **Easy / Normal / Hard** (target size, speed and lifetime) and **30 / 60 / 90 s**, and every mode can be played on any of the six maps.

### Settings and progress
- CS-scale sensitivity (cm/360 at 800 DPI is shown), ADS multiplier, horizontal FOV, crosshair style (cross, cross + dot, dot, circle, T), colour and size, dynamic crosshair, hold or toggle ADS, auto-reload, FPS counter, graphics quality.
- **Converting sensitivity:** `sens` uses the CS yaw (0.022° per count). Coming from another game, multiply your in-game sensitivity:
  - Valorant sens × 3.18 = CS sens
  - Overwatch sens × 0.3 = CS sens
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
| `F` | Inspect: loops until pressed again |
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
js/world.js       arena builder (walls, cover, branding) and menu stage
js/maps.js        the six map themes: skies, surfaces, props, weather
js/modes.js       training modes, targets, bots, difficulty
js/effects.js     tracers, bullet holes, sparks, muzzle light
js/hud.js         in-game HUD
js/ui.js          menu tabs, loadout, operator, settings, career, pause, results
js/audio.js       synthesized WebAudio sound effects
js/storage.js     saved profile (settings, loadout, bests, history)
vendor/           three.js r160 (MIT)
docs/media/       trailer (MP4 + subtitles + GIF), screenshots, README banner
assets/           logo (SVG), icons, link-preview image
favicon.svg/.ico  tab icons; site.webmanifest for install / home screen
```

## Logo and brand assets

<img src="assets/logo/aimforge-mark.svg" alt="AIMFORGE mark" width="120" align="right">

The mark is a red hexagonal badge holding a gapped reticle, an **A**-shaped sight chevron with a white-hot core, and forge sparks. It appears on the loading screen, in the menu bar, as the browser-tab icon, as the home-screen and app icon, in link previews, and on the arena's back wall.

| File | Use |
| --- | --- |
| [`assets/logo/aimforge-mark.svg`](assets/logo/aimforge-mark.svg) | Full mark (vector, any size) |
| [`assets/logo/aimforge-icon.svg`](assets/logo/aimforge-icon.svg), [`favicon.svg`](favicon.svg) | Simplified mark that stays legible at 16 px |
| [`favicon.ico`](favicon.ico), `assets/icons/favicon-{16,32,48}.png` | Tab icon fallbacks |
| [`assets/icons/apple-touch-icon.png`](assets/icons/apple-touch-icon.png) | iOS home screen (180 px) |
| `assets/icons/icon-{192,512}.png`, `icon-maskable-512.png` | Web-app manifest ([`site.webmanifest`](site.webmanifest)) |
| [`assets/og-image.png`](assets/og-image.png) | Link-preview card (1200×630, Open Graph and Twitter) |
| [`docs/media/banner.png`](docs/media/banner.png) | README banner |

## Credits

- Created by **Apurva Mukherjee**.
- Built with [three.js](https://threejs.org) (MIT, vendored).
- UI fonts: [Oxanium](https://fonts.google.com/specimen/Oxanium) and [Rajdhani](https://fonts.google.com/specimen/Rajdhani) (SIL OFL) via Google Fonts.
- The trailer soundtrack is an original piece, synthesized with numpy for this project. The trailer was rendered frame by frame from the actual game in headless Chromium, then encoded with ffmpeg; subtitles are set in Oxanium.
