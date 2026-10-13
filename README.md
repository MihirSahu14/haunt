# Haunt

A pixel-art horror game in the browser. You are the ghost. Scare the family out of the house before dawn.

**Play:** https://mihirsahu14.github.io/haunt/

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move (you float through walls) |
| E | Haunt the object nearest you |
| Q / R | Whisper / Manifest (unlocked by tasks) |
| Tab | Tasks |
| Esc | Help / pause |

## Run locally

Open `index.html` in a browser. It loads the scripts in `src/` in order.

## Build a single file

```bash
node build.js
```

Writes `dist/haunting.html` with every script inlined.

## Checks

```bash
node tools/smoke.js
```
