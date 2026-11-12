# SHIFT HAPPENS

A neon arcade survival game made for **Game Off 2026** (theme: **SHIFT**).

There are two worlds, pink and cyan. Every enemy and every bullet lives in one of them.
**You can only hurt, and be hurt by, things from the world you are standing in.** Enemies from the other world are harmless ghosts.
Press **SHIFT** to swap worlds: dodge a swarm, escape a bullet storm, or flip into the other world to fight whatever lives there.

Play in the browser: open `index.html` (no build step, no dependencies, plain HTML/JS canvas).

## Controls
| Action | Keys | Touch |
|---|---|---|
| Move | WASD / arrow keys | drag on the left half |
| Shift worlds | Space / Shift / E / F / click | tap the right half |
| Pause | P / Esc | |
| Mute | M | |

Your gun aims and fires by itself at enemies in your world.

## How it plays
- **Shift shockwave:** shifting blasts away enemies of the world you enter and deletes their bullets. A shift also gives you a moment of invulnerability.
- **Phase kills:** kills within 0.6 s of a shift score double.
- **Splitters** break into minis from the *opposite* world.
- **Reality gets unstable** from wave 3: the game forces shifts on you (with a warning).
- **THE GLITCH** (a boss every 5 waves) flips between worlds while firing rings of orbs.
- **13 upgrades** on level-up, including Afterimage (a zone that hurts enemies of both worlds), Time Slip, Orbit Shards and Double Vision (shots chip ghosts).
- **Two music layers**, one per world. The layer of the world you are not in keeps playing, muffled, underneath.

## Code
- `game.js` the whole game (state, update, rendering, input, procedural audio)
- `index.html` canvas page

Build the itch.io zip: `powershell -ExecutionPolicy Bypass -File build.ps1` produces `dist/shift-happens.zip`.

## Credits
Made by daneshh with Claude (Claude Code) during November 2026. All visuals are drawn with canvas shapes and all audio is synthesised with WebAudio, so there are no external assets.
