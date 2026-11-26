# Senja Hopper

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/septiadini1996-sudo/senja-hopper/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/septiadini1996-sudo/senja-hopper/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

**Senja Hopper** — a seaplane delivery week over the Indonesian archipelago, flown at golden hour.

You are the pilot of a small charter co-op based on Bali. Every morning the chart table offers three order tickets — mangosteen baskets for Nenek Lastri, live chicken crates for Dr. Sari, a grand piano in three crates for Pak Danu — each with a named customer, a destination island, a deadline and a price. Pick one and the route is drawn for you: course line, waypoints, distance, fuel estimate, deadline. Then fly it in a side-view sky with real discipline in it: throttle and pitch, stalls, wind that moves your ground speed, storm cells that shake the airframe and eat the clock, and landings that reward coming in slow and flat. A dry tank means a glide to the water and a tow fee — never a lost week.

Across six days the legs lengthen, the weather worsens and the cargo gets stranger. Evenings are for fuel, repairs and upgrades: a bigger tank, a stronger engine, a wider hold. The game wraps itself in a commercial shell — a title menu (New Game · Continue · How to Play · Challenges · Pilot Stats · Settings), a local save so a week can be resumed, standing challenges, career stats, and a working difficulty and sound settings page. In flight the HUD keeps the co-op's resources large and labeled: CASH, FUEL, HULL, airspeed, altitude, distance-to-destination and the delivery countdown.

- 9 named islands · 12 cargo types · 10 named customers with their own lines
- 6-day campaign with per-leg weather: wind, gusts and moving storm cells
- Forgiving by design: water landings cost a tow fee, late deliveries still pay
- Keyboard, mouse and touch controls; big legible labels everywhere

## Run it

Serve the `game/` folder with any static file server and open `index.html`:

```sh
python3 -m http.server 8901 --directory game
# then open http://localhost:8901/
```

Or run the hand-in program, which assembles the competition output (`game/` + `screenshots/` + `dossier.json`):

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `game/src/world.js` — the nine islands, cargo types and customers
- `game/src/physics.js` — the flight model: takeoff, stall, wind, landings
- `game/src/weather.js` — per-leg wind and storm cells
- `game/src/orders.js` — order tickets and route planning
- `game/src/render.js` — every screen's drawing, flight view and HUD
- `game/src/menu.js` · `save.js` · `settings.js` · `stats.js` · `challenges.js` — the commercial shell
- `game/src/shots.js` — the staged screenshots, drawn by code from real game states
- `game/src/main.js` — the state machine and game loop

---

<sub>Entered on [make.fun](https://make.fun/?ref=5c10w57m&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
