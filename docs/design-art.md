# You Are the Haunting: Art, UI and Map Design ("The Household Book")

Lens: visual identity, typography, UI/HUD, map layout, onboarding.
Source read: `C:\Users\mihir\Desktop\Projects\Haunt\index.html` (2602 lines). Its current look comes from Georgia bold with `strokeText` outlines (`label()`), RGB-split `shakyText()`, mint `drawHalo()` glows, `rr()` translucent panels, pop text ("SPOOKED!", "+25 FEAR"), fear bars over heads, scanlines and three full-screen RGB channel passes every frame.

---

## 0. The direction in one paragraph

The whole game is drawn as **an old etched picture book found in a damp house**: iron-gall ink and cross-hatching on foxed rag paper. Each room is a numbered plate ("Plate X. The Parlour"). Darkness is the default state. The paper only shows where there is real light, such as a candle, a lamp or a moonlit window. Everywhere else the drawing sinks into ink and stays faintly visible, like an engraving seen at night. The family are tall, faceless, slightly too-thin figures with no shadows. You are a child-sized sheet that casts one. Every UI element is a physical object pinned to the dark: a torn diary page, four cabinet photographs, a grandfather clock and a candle stub. Colour is almost absent. Candle gold means the family's light, which is danger to you. Oxblood means fear. Nothing glows, nothing is outlined, and nothing shouts.

Visual references, for mood only: Edward Gorey's crosshatched interiors, 19th-century steel-engraved book plates and Victorian cabinet-card photographs.

---

## 1. Palette (exact, closed)

Only these colours may appear, plus alpha variants. Every other hex in the current file is deleted.

| Token | Hex | Role | Max screen coverage |
|---|---|---|---|
| `INK` | `#0E0B09` | darkness, primary linework, text on paper | unlimited |
| `SOOT` | `#1E1914` | dark fills, cast shadows, paper-item drop shadows | large |
| `UMBER` | `#4A3B2E` | hatching, wood grain, wallpaper motifs, secondary lines | large |
| `SEPIA` | `#7A6450` | mid washes, photo tones, small labels | medium |
| `PAPER` | `#C9BB9A` | lit walls and floors, the base of the world | large (only where lit) |
| `VELLUM` | `#DDD1B4` | diary page, photo mounts, highlights, wax | small |
| `BONE` | `#ECE3CE` | text on dark, ghost body, flashlight core, eyeshine | small |
| `CANDLE` | `#D9A24A` | family light sources, flames, spill tint | ≤ 6% |
| `EMBER` | `#A8582A` | fireplace, furnace grate, deepest warm spill | ≤ 2% |
| `MOON` | `#6F8291` | window glass, moonlight shafts, nursery tint | ≤ 5% |
| `VERDIGRIS` | `#5C7A6B` | the ghost's colour: prompt outlines, cold flame edge, map marker | ≤ 1% |
| `OXBLOOD` | `#6E1410` | fear: photo-crack stains, mirror writing, exposure pulse, final line | ≤ 2%, never on UI chrome |
| `GRAPHITE` | `#3A3833` | pencil: diary writing, house sketch, strike-throughs | small |

Colour rules:
- About 90% of any frame is `INK`/`SOOT`/`UMBER`/`PAPER` values. Saturated hues appear only on emissive sources, so they read as light.
- Warm means family means danger. Cool (`MOON`, `VERDIGRIS`) means you and safety. Players learn this without being told.
- `VERDIGRIS` replaces the neon mint `#9fffe0` everywhere.
- Text contrast checks: `BONE` on `INK` is about 14:1 and `GRAPHITE` on `VELLUM` is about 7:1. Both pass AA.

---

## 2. Linework rules

| Element | Weight | Colour | Wobble |
|---|---|---|---|
| Architecture contours (walls, slabs, frames) | 1.5px | `INK` @ 0.9 | static, seeded |
| Secondary detail (boards, mouldings, wallpaper motif) | 1px | `UMBER` @ 0.7 | static |
| Hatching | 0.75px | `UMBER` @ 0.45–0.65 | static |
| Character silhouettes | 1.75px | `INK` | **boils** |
| Haunt objects | 1.5px | `INK` | boils only while active or targeted |

- **Wobble:** subdivide every straight line into segments of 20px or less and offset each joint perpendicular by `rs(0.7)` using the existing `srand()`. Static art is seeded once and never re-randomised.
- **Corner overshoot:** architecture lines extend 2–4px past their corners, as in hand-drawn plates. This one detail removes most of the "vector clip-art" feel.
- **Boil:** living things re-seed their wobble at 8fps (every 125ms, frame-quantised). Amplitude is 0.6px when calm and rises to 1.6px at high fear. Unease shows up in the drawing itself.
- `lineCap = lineJoin = 'round'`.
- **Banned:** `shadowBlur` (all uses), `strokeText`, rounded rectangles for UI, multi-stop gradients on UI, pure geometric primitives without wobble (except photo mounts and key squares), the `♪` glyph and emoji.

---

## 3. Shading, texture and light (Canvas 2D)

### 3.1 Hatch tiles (prerendered once, used as `createPattern`)
Four 48×48 transparent tiles, drawn in `UMBER` with ±0.5px wobble and a 5% chance per line of a 6px gap:
- `T1`: 45° lines, 7px spacing, 0.75px, alpha 0.45 (light shade)
- `T2`: T1 plus 135° lines at 7px (cross-hatch)
- `T3`: T2 plus horizontal lines at 5px, alpha 0.6
- `T4`: T3 plus 45° lines offset 3.5px (nearly solid)

Form shading uses these tiles only. Gradients are reserved for light falloff and the vignette.

### 3.2 Paper tile (512×512, baked once and multiplied into the house prerender)
`PAPER` base, then:
- 24 large soft blotches (`UMBER` @ 0.04)
- 300 short curved fibres (`SEPIA` @ 0.05)
- 14 foxing spots (`#9C7B4E` @ 0.12–0.25 with darker centres; the only non-palette value, used inside the tile only)
- faint vertical laid lines every 24px (`UMBER` @ 0.03)

### 3.3 Baked ambient occlusion (inside the house prerender)
- Every room gets `T2`/`T3` in its corners (about 60px wedges) and under furniture.
- A 40px `T1` band hangs below each ceiling.
- Wallpaper is replaced by five low-contrast `UMBER`-line motifs at 0.25 alpha: stripe, trellis, fleur, toile vine and plain board. The saturated `PAPER_N` colours (`#e9c46a`, `#a9d6c9` and the rest) are removed.

### 3.4 Darkness and lightmap (the core of the look)
- Lightmap canvas at **320×180** (quarter of the viewport). Each frame: fill with `INK` at alpha `0.92 × brightness`. Then, with `destination-out`, punch each light as a radial gradient (or a polygon for cones) in view. Finally `drawImage` it scaled to 1280×720 with smoothing on, which gives soft edges for free.
- At 0.92, unlit rooms still show about 8% of the etching. You see the room's shape, never its contents.

| Light | Shape / radius | Colour tint | Flicker |
|---|---|---|---|
| Ghost "sight" (not a real light; never exposes you) | circle r 190, lifts darkness only to 0.55 | none | none |
| Mother's candle (carried) | r 150 | `CANDLE` | ±8% at 9Hz |
| Father's flashlight (carried) | 30° cone, 420 long, sweeps ±6° | `BONE` | none |
| Nightlight | r 110 | `CANDLE` @ low | none |
| Lamp / sconce | r 220–260 | `CANDLE` | rare stutter |
| Kitchen hanging lamp | downward cone r 300 | `CANDLE` | swings when haunted |
| Fireplace | r 360 | `EMBER`→`CANDLE` | ±12% |
| Bare bulb (bath, cellar) | r 300 | `BONE` | none |
| Moon window | parallelogram shaft to the floor | `MOON` | none |

- **Warm tint pass:** after the darkness pass, draw one radial gradient per warm light in `rgba(217,162,74,0.10)` (`CANDLE`), `source-over`.
- **Emissive pass:** draw flames, bulbs, dog eyeshine, the TV screen and the furnace grate **after** the darkness pass so they read in the dark.
- **Light leaks:** where a lit room borders the room you are in, draw 2px `CANDLE` @ 0.5 lines along door gaps and floorboard seams. Light coming up through the floor while you sit upstairs in the dark is the single best dread image in the game.
- **Brightness** setting (0.85–1.0) multiplies the darkness alpha. It is set on the title screen (section 9).

### 3.5 Post-processing changes (also a performance fix)
- **Chromatic aberration:** skip all three `splitChannel` passes when `abBoost < 0.5`. Only scares and the ending glitch use it. That saves three full-screen composites per frame, which the bigger world needs.
- **Scanlines:** delete. They are a CRT idea and do not fit an etching.
- **Grain:** recolour to `INK`/`VELLUM` pixels with per-pixel alpha of 40/255 or less, overall alpha 0.22, updated every second frame (30fps grain reads as film rather than noise).
- **Vignette:** inner radius 300, outer 820, `INK` @ 0.9.
- **Desaturation:** off in play, since the palette already does that job. Use it only in the ending.
- **Random global flicker** (`flickerT`): delete. Flicker happens only when a real light is haunted. Restraint is what makes it work.
- **Exposure ink-bleed** (new): a prerendered 1280×720 canvas of ink tendrils creeping in from the edges, made from random walks with tapering width. It is drawn at `globalAlpha = exposure`. Above 0.7 exposure, add an `OXBLOOD` edge pulse at 0.1–0.2 alpha on a 70bpm heartbeat.

---

## 4. How things look

### 4.1 House
- **Exterior:** an ink sky with paper-coloured clouds in horizontal hatching. The moon is an unhatched paper disc with a faint ring. Bare trees are ink scribbles. On the left there is a rope swing hanging from a dead tree, which moves on its own at the witching hour. On the right there is a porch, a path and an iron gate.
- **Sky parallax:** a separate 1280×720 layer scrolled at 0.3× the camera.
- **Interior:** etched walls, board-line wainscot, floorboards with grain hatching, and one "dark corner" per room.
- **Windows:** `MOON` glass with ink mullions. Moonlight shafts are the only cold light.
- **Rot spots** (section 7): `UMBER` water stains with tide-lines on the ceiling below, and a cracked board on the floor above.
- **Abandoned variant (ending):** paper shifts to `#B3A684`, 20% of ink lines drop out, cobwebs become fine ink arcs, furniture sits under unhatched `VELLUM` sheets, and moon shafts take over. Render it lazily when the ending starts, not at load.

### 4.2 Family (who are, secretly, the real ghosts)
- **Proportions:** slightly too tall and too thin, with long arms and a head about 1/8 of the body. The walk is slow, about 1.4s per stride.
- **Faces:** blank `VELLUM` ovals with only a nose line. Two `INK` dots appear **only when they look at something** (alert or stare). Faceless by default is creepier and cheaper to draw.
- **No cast shadows.** Ever.
- **Silhouettes, readable in the dark by their light alone:**
  - **Father**, 120px tall: long cardigan in `UMBER` with `T2`; carries a flashlight cone (`BONE`).
  - **Mother**, 108px: long `VELLUM` nightgown and shawl, long hair; carries a candle (`CANDLE`).
  - **Son**, 74px (the same height as you): striped pyjamas in `UMBER` lines; carries a teddy.
  - **Dog**, 50px: a lanky hound with `SEPIA` and `T2`. In the dark only its **eyeshine** shows, as two `BONE` dots of radius 1.6 drawn in the emissive pass. The dog can see you in the dark.
- **Fear readout on the figure:** the hatching density on the body rises (T1, then T2, then T3), the boil rate rises, the carried light trembles, the shoulders hunch and the head turns. There are no bars over heads.
- **Sleeping:** a hatched lump under the blanket.

### 4.3 You, the "ghost"
- A child-sized sheet, 76px tall.
- **In darkness:** no outline at all. It is a `BONE` shape at 0.55 alpha, like a hole in the dark, with two `INK` eye ovals.
- **In light:** gains an `INK` outline and `T1` fold hatching, and becomes fully opaque. It is visibly solid, which is exactly when you are in danger.
- **Foreshadowing:**
  - Above 50% exposure, the hem lifts and two small slippered feet show.
  - You cast a `SOOT` shadow away from the nearest light; the family never do.
  - Mirrors (bath, master) reflect a girl in pyjamas, never a sheet.
- **Trail:** delete the mint trail. Use 3–4 `BONE` breath wisps at 0.08 alpha instead.

### 4.4 The girl (ending only)
The only fully drawn face in the game, with eyes, mouth and freckles. `VELLUM` pyjamas, `UMBER` hair, and the warmest light in the game (a `CANDLE` flashlight). She is the only living thing, and she looks it.

### 4.5 Jump-scare face (restyle `drawScreamFace`; keep its structure)
- The face is a `PAPER` shape shaded with `T3`/`T4` pattern fills.
- Eyes are blank `VELLUM` holes with pinprick `INK` pupils. The mouth is an `INK` void. Hair is `INK` scribbles.
- **Entry:** 2 frames of pure black and silence, then the face snaps in at scale 1.25 and pushes to 1.35 over 0.7s. Keep `slices()` tearing. Add one `OXBLOOD` multiply wash at 0.15.
- **Replace the white flash with a negative flash:** 2 frames of `difference` composite with a `BONE` fill, which inverts the image like a photographic negative.

---

## 5. Typography

### 5.1 Hierarchy

| Role | Font (exact stack) | Size | Style / spacing | Colour |
|---|---|---|---|---|
| Display: title, chapter cards, ending lines | **Scratch Caps** (procedural, 5.3) | cap height 52 (title) / 28 (ending) / 22 (chapter) | tracking +0.24em / +0.3em | `BONE` on ink, `INK` on paper |
| Plate captions (room names) | `15px Centaur, "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif` | 15, UPPERCASE | `letterSpacing = '3px'` | `BONE` @ 0.6 |
| Inner voice / narration | `italic 20px "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif` | 20 | `letterSpacing = '0.5px'` | `BONE` @ 0.85 |
| Interaction prompts | `italic 15px` (same Palatino stack) | 15 | 0.3px | `BONE` @ 0.8 |
| Diary (child's pencil) | `18px "Ink Free", "Palatino Linotype", "Book Antiqua", serif` | 18 | 0.5px; each line rotated by a seeded ±0.6° | `GRAPHITE` @ 0.9 |
| Photo labels | `italic 12px` (Palatino stack) | 12 (decorative only) | 1px | `SEPIA` on `VELLUM` |
| Key glyphs | Scratch Caps, cap 10, inside a 20×20 hand-inked square | — | — | `BONE` |
| Typewriter page (study haunt only) | `14px "Courier New", Courier, monospace` | 14 | — | `INK` on `VELLUM` |
| Numbers | avoided in the UI; if needed, Scratch Caps digits or Roman numerals | | | |

- Essential text is always 15px or larger.
- `ctx.letterSpacing` works in Chromium 99+ and Firefox 115+. Elsewhere it is ignored, which is harmless.
- Gabriola, Consolas, Georgia and Bookman are unused. Two real fonts plus one procedural font keeps the look coherent.

### 5.2 Banned
`strokeText` outlines, bold weights, glows, Georgia, ALL-CAPS in real fonts, exclamation marks, floating numbers ("+25 FEAR"), combo words, text inside boxes, and any text drawn over a translucent panel.

### 5.3 Scratch Caps: a procedural broad-nib stroke font
- **Grid:** cap height 12 units, `y` grows downward, baseline at `y = 12`. Each glyph is `[advance, "x,y x,y ... | x,y x,y"]`, where `|` separates strokes.
- **Render (`drawScratch(g, text, x, y, cap, color, track, seed)`)**, with `u = cap / 12`:
  1. Split each stroke into sub-segments of about 0.6u. Jitter each joint perpendicular by `±0.05u` (seeded).
  2. Extend the first and last segments by `rand(0, 0.35u)` to overshoot like a scratched line.
  3. Nib width: `nw = cap × 0.075`. Each sub-segment gets `lineWidth = nw × (0.3 + 0.7 × |sin(θ − 35°)|)`, where θ is the segment angle (a broad nib held at 35°).
  4. Pool ink at each stroke start with a circle of radius `0.55 × nw`. Draw a random 8% of sub-segments at alpha 0.55 for a dry-nib look.
  5. Advance = `(w + 2.2) × u + track`. A space is 4u.
- **Caching:** bake each string into an offscreen canvas keyed by `text + cap`, and re-bake only when the text changes.
- **Title write-on:** draw the first N sub-segments per frame for 1.6s with a quiet pen-scratch noise, then switch to the cached version.

```
A 8   0,12 4,0 8,12 | 1.7,7.4 6.3,7.4
B 7   0,0 0,12 | 0,0 4.6,0 6.4,1.5 6.4,4.2 4.6,5.8 0,5.8 | 4.6,5.8 6.9,7.4 6.9,10.4 5,12 0,12
C 7   7,1.8 5.4,0.2 2.8,0 0.8,1.8 0,6 0.8,10.2 2.8,12 5.4,11.8 7,10.2
D 7.5 0,0 0,12 | 0,0 3.6,0 6.2,1.6 7.5,6 6.2,10.4 3.6,12 0,12
E 6   6,0 0,0 0,12 6,12 | 0,5.8 4.6,5.8
F 6   6,0 0,0 0,12 | 0,5.8 4.6,5.8
G 7.5 7,1.8 5.4,0.2 2.8,0 0.8,1.8 0,6 0.8,10.2 2.8,12 5.4,11.8 7.5,10 7.5,7 4.4,7
H 7   0,0 0,12 | 7,0 7,12 | 0,6 7,6
I 1.5 0.75,0 0.75,12
J 5   5,0 5,9.4 3.6,11.8 1.6,12 0,10.6
K 7   0,0 0,12 | 6.8,0 0,7.2 | 2.4,5 7,12
L 6   0,0 0,12 6,12
M 9   0,12 0.4,0 4.5,8.4 8.6,0 9,12
N 7   0,12 0,0 7,12 7,0
O 8   4,0 1.2,1.4 0,6 1.2,10.6 4,12 6.8,10.6 8,6 6.8,1.4 4,0
P 7   0,12 0,0 4.6,0 6.8,1.6 6.8,4.6 4.6,6.4 0,6.4
Q 8   4,0 1.2,1.4 0,6 1.2,10.6 4,12 6.8,10.6 8,6 6.8,1.4 4,0 | 4.8,8.6 8.4,13
R 7   0,12 0,0 4.6,0 6.8,1.6 6.8,4.6 4.6,6.4 0,6.4 | 3.4,6.4 7,12
S 6.5 6.4,1.6 4.8,0 2,0 0.3,1.6 0.3,4 2,5.4 4.6,6.4 6.4,8 6.4,10.4 4.6,12 1.8,12 0,10.4
T 7   0,0 7,0 | 3.5,0 3.5,12
U 7   0,0 0,8.8 1.4,11.4 3.5,12 5.6,11.4 7,8.8 7,0
V 8   0,0 4,12 8,0
W 11  0,0 2.6,12 5.5,3.2 8.4,12 11,0
X 7   0,0 7,12 | 7,0 0,12
Y 7   0,0 3.5,6.2 7,0 | 3.5,6.2 3.5,12
Z 7   0,0 7,0 0,12 7,12
0 6   3,0 0.8,1.5 0,6 0.8,10.5 3,12 5.2,10.5 6,6 5.2,1.5 3,0
1 5   1,2.5 3,0 3,12
2 6   0.3,2 2,0 4.5,0 6,1.8 6,4 0,12 6.2,12
3 6   0.3,1.5 2,0 4.5,0 6,1.6 6,4 4,5.8 2.5,5.8 | 4,5.8 6.2,7.6 6.2,10.4 4.5,12 1.8,12 0,10.5
4 7   5,12 5,0 0,8.5 7,8.5
5 6   6,0 1,0 0.5,5.2 3.5,4.8 5.6,5.8 6.3,8.5 5.4,11 3,12 0.2,11
6 6   5.6,0.8 3.5,0 1.5,1.2 0.2,5 0.2,9 1.5,11.5 3.2,12 5,11.4 6,9.3 5.4,6.8 3.2,5.8 1,6.6 0.2,8
7 6   0,0 6,0 2.2,12
8 6   3,5.8 1,4.6 0.4,2.4 1.6,0.4 3,0 4.4,0.4 5.6,2.4 5,4.6 3,5.8 0.6,7.4 0,9.8 1.2,11.6 3,12 4.8,11.6 6,9.8 5.4,7.4 3,5.8
9 6   5.8,4 5,5.6 3,6.2 1,5.4 0.2,3.2 1,1 3,0 5,0.8 5.8,3 5.8,7 4.6,10.8 2.6,12 0.6,11.2
. 1.5 0.75,11.2 0.75,12
, 2   1.2,11 1.2,12 0.3,13.8
' 1.5 0.75,0 0.6,3
? 6   0.2,2 1.8,0 4.4,0 6,1.6 6,3.8 3.2,6.2 3.2,8.4 | 3.2,11.2 3.2,12
- 4   0,6.4 4,6.4
— 8   0,6.4 8,6.4
```

Any character outside this set falls back to the Centaur stack at `cap × 1.4` px.

---

## 6. Diegetic UI and HUD (1280×720 screen space)

The HUD reads as paper objects pinned to the dark, not as panels. If nothing changes for 6s, the diary collapses, the photos dim to 0.6 and the clock dims to 0.5. The candle never dims. Any change brings an element back to full for 3s.

```
(0,0)                                                                        (1280,0)
 [diary page 16..316 x 12..64 / ..172]   [clock 600..680 x 10..120]   [ph][ph][ph][ph]  1004..1260 x 16..92
     make them leave. all four.  ////          (face c=640,50 r=32)
                                                pendulum slit
                                 ... world, camera view ...

 [candle 30..112 x 560..706]           narration, baseline y=670 (c=640)       [house sketch 1092..1268 x 604..710]
(0,720)                                                                      (1280,720)
```

### 6.1 Objectives: the torn diary page (top-left)
- **Collapsed:** a polygon about (16,12)–(316,64), rotated −1.2° around (166,38). It shows the primary line plus four small graphite stick figures (10×18) at x 252–304, crossed out as each family member leaves.
- **Expanded** (for 5s when an objective changes, or while TAB is held): (16,12)–(316,172). Up to 4 lines, first baseline at y 44, line height 30, text x 34.
- **Page:** `VELLUM`, with rules every 30px in `MOON` @ 0.35 and a margin line at x 28 in `UMBER` @ 0.4. The bottom edge is torn (zig-zag, 9px step, ±3px seeded). The drop shadow is the same polygon offset (3,4) in `INK` @ 0.35, with no blur.
- **New line:** writes in at 22 characters per second with a soft pencil-scratch noise.
- **Done:** a 1.5px graphite strike that overshoots, animated over 0.4s. The line then fades to 0.45 and rolls off after 3s.
- **Voice:** a child's diary (lower-case, short). This quietly foreshadows that you are a girl.
- **Lines for systems to use:** `make them leave. all four.` · `before the sun comes up.` · `go downstairs.` · `start small. let it build.` · `blow the fuses in the cellar.` · `make the dog go first. dogs know.` · `ring the clock at three.` · `don't let them see me.` (each sighting adds one heavy graphite underline; the third is the caught ending) · `what's behind the bricks?` (secret).

### 6.2 The family: four cabinet photographs (top-right)
- **Cards:** 58×76 each at x = 1004 + i×66, y 16, rotations −2.5°, 1.5°, −1°, 2.8°. Each hangs from a nail (`INK` circle r 2.2 at card top-centre).
- **Mount and portrait:** `VELLUM` mount with a 1px `UMBER` rule inset 4px. Oval window centred at (cx, y+34), rx 20, ry 26, holding a hatched sepia bust. Label `father / mother / son / dog` at y+68.
- **Dread** (build-up): an `INK` overlay inside the oval, alpha = dread × 0.5. The portrait darkens.
- **Fear** (four crack stages, readable without colour):

  | Fear | Crack state |
  |---|---|
  | 25 | one hairline crack from a corner |
  | 50 | three cracks |
  | 75 | a shattered web, an `OXBLOOD` smear at 0.25, and the face drawn 3× at 0.33 offset (a long-exposure double image) |
  | 100 | goes black, then cuts to their jump-scare face |

- **They see you:** that card's portrait eyes turn to look **out at the player**, and the card swings 2°.
- **Fled:** the card drops off with gravity and spin. It leaves the bare nail and a paler rectangle (`VELLUM` @ 0.12), like sun-fade on wallpaper. No "FLED" text.
- **Ending:** the cards flip to show their backs: *"1986."*

### 6.3 The night: grandfather clock (top-centre)
- **Face:** centre (640,50), r 32, `VELLUM` dial, `UMBER` bezel 2px, 12 ticks (hour ticks 6px). Hands: hour 16px/3px, minute 25px/1.5px, centre dot r 2.5.
- **Moon dial:** an arc aperture inside the upper dial. A `BONE` moon disc (r 5) travels across over the night and is replaced by a `CANDLE` sun at dawn.
- **Pendulum:** a slit at 632..648 × 86..118 with a bob swinging ±8px on a 2s period, synced to a quiet tick.
- **Timing:** the night runs 10 PM to 5 AM (7 in-game hours) at about 34s per hour, so 4 minutes is the maximum run.
- **Each hour:** a procedural bell (sine partials ×1, ×2.76, ×5.4 with long decay) strikes; the clock scales to 1.15 for 1s while the rest of the HUD dims; then a chapter card appears (6.6).
- **After 4 AM:** the top band of the screen pales toward `MOON` @ 0.1. Dawn is visibly coming.

### 6.4 Presence: the candle (bottom-left)
Rename "ecto" to **Presence**.
- **Saucer and candle:** saucer ellipse (72,698) rx 38 ry 7 with a handle ring at (110,696). Candle x 58..86, bottom y 694, height `18 + 132 × presence/100`. `VELLUM` wax with `T1` on its right side and seeded drips.
- **Cost notches:** graphite ticks every 13.2px of wax (10 Presence each), so costs are readable in whole notches.
- **Flame:** a cold teardrop, 26px plus flicker, 9 wide, with a `BONE` core and a `VERDIGRIS` edge. When Presence is below the nearest haunt's cost, it shrinks to a 10px `VERDIGRIS` ember.
- **Spending:** the wax melts down over 0.4s and a drip runs.
- **Regenerating (in darkness only):** the wax creeps back up, a reversed melt, which is quietly wrong. In light the flame bends sideways as if in a draught and does not regrow.
- **Light:** a radial lift of r 90 around the flame softens this corner of the vignette.

### 6.5 House sketch (bottom-right mini-map)
- A torn `VELLUM` scrap (1092,604)–(1268,710), with the house prerendered at **1/16 scale** (160×90) at (1100,612) in graphite outlines.
- The current room is filled `GRAPHITE` @ 0.25. A lit room gets a `CANDLE` dot of r 2 at its centre.
- You are a `VERDIGRIS` dot of r 3.
- A family member shows as an `INK` dot (r 2.5) only when known: they are in a lit room, or were heard in the last 5s, in which case a hollow circle at their last position fades.
- Objective rooms get a scribbled pencil circle. There are no labels.

### 6.6 Narration, chapter cards and prompts
- **Narration** (the inner voice): bottom-centre at baseline y 670, max width 720. Fade in 0.4s, hold 3.5s, fade 0.8s. While it shows, a full-width gradient from y 600 (`INK` 0) to y 720 (`INK` 0.6) sits behind it. It is never a box. One line, 6 words or fewer.
- **Chapter cards** on each hour, Scratch Caps cap 22, tracking 0.35em, at (640,300), alpha 0 → 0.75 → 0 over 3s: `MIDNIGHT`, `ONE`, `TWO`, `THE WITCHING HOUR`, `FOUR`, `BEFORE DAWN`.
- **Interaction prompts** (world space, drawn after darkness):
  - Every haunt object you can afford in your room gets a 1px `BONE` @ 0.35 dashed, wobbly trace.
  - **Fright-tier objects get a double trace.**
  - The **nearest** one gets a solid trace, its hatching shivers (boil at 12fps), and a prompt 18px above it: an ink key square with `E`, then a Palatino italic verb ("rock the chair"). If the prompt would leave the screen, it flips below the object.
  - After an object type has been used 3 times, drop the verb and keep only the key.
  - On cooldown: no trace, and a `T1` "frost" overlay that recedes as it recharges.
  - Cannot afford: dim trace with the verb "too weak".
- **Off-screen sound marks:** three concentric `BONE` @ 0.5 arcs (r 8/14/20) at the screen edge pointing toward a sound-tier event or a scream, fading over 1.2s. At most 3 on screen.
- **Hit nobody:** no text. The first time only, the diary writes `no one heard that.`

### 6.7 What replaces the old feedback
| Old | New |
|---|---|
| `+25 FEAR` pops | photo cracks, victim drops item and jumps, crack audio |
| `SPOOKED!` / combo HUD | combo, if kept, is shown only as a rising choir layer and ink tendrils on the victim's photo; never words or numbers |
| `IS OUTTA HERE!` / `FLED!` | door bursts, cold moon floods the hall, photo falls, diary tally crossed out |
| `...nobody here` | silence (one diary line the first time) |
| Fear bars over heads | photos plus the figure's own hatching and posture |
| `FRONT DOOR ←` label | the door has a moonlit fanlight and a porch lamp outside; it is the only door with light behind it |

---

## 7. Map: a much bigger house

### 7.1 World
- **Size:** **2560 × 1440** (exactly 2× the screen on each axis, so the overview at 0.5 zoom fits perfectly).
- **Outline:** ground surface at y 1060. House exterior walls at x 240–252 and 2308–2320.
- **Roof:** outer line (180,520) to peak (1280,110) to (2380,520); the underside is 24px inside that line.
- **Prerender:** the whole house is prerendered once to a 2560×1440 canvas. Each frame draws one viewport rectangle from it.

### 7.2 Floors and rooms (13 rooms, each a numbered plate)
Slabs are 20px thick: attic floor 470–490, first floor 760–780, ground floor 1050–1070.

| Plate | id | Caption | x | y | w | h | Floor y | Default light |
|---|---|---|---|---|---|---|---|---|
| I | `nursery` | The Nursery (your room) | 860 | 300 | 400 | 170 | 470 | dark + moon window (1000–1060, 330–400) |
| II | `store` | The Storeroom | 1260 | 300 | 440 | 170 | 470 | dark |
| III | `master` | The Master Bedroom | 252 | 490 | 508 | 270 | 760 | bedside lamp (on until midnight) |
| IV | `bath` | The Bathroom | 760 | 490 | 280 | 270 | 760 | dark; pull-chain bulb when occupied |
| V | `boy` | The Boy's Room | 1040 | 490 | 480 | 270 | 760 | nightlight, always on (r 110) |
| VI | `landing` | The Landing | 1520 | 490 | 480 | 270 | 760 | dim sconce (r 200) |
| VII | `study` | The Study | 2000 | 490 | 308 | 270 | 760 | desk lamp while Father is present |
| VIII | `kitchen` | The Kitchen | 252 | 780 | 568 | 270 | 1050 | hanging lamp (on until midnight) |
| IX | `dining` | The Dining Room | 820 | 780 | 420 | 270 | 1050 | candelabra (until 11 PM) |
| X | `parlour` | The Parlour | 1240 | 780 | 520 | 270 | 1050 | fireplace all night (dims after 2 AM) + TV glow |
| XI | `hall` | The Hall | 1760 | 780 | 548 | 270 | 1050 | dark; moon through the fanlight; porch lamp outside |
| XII | `cellar` | The Cellar | 252 | 1070 | 988 | 250 | 1320 | dark; bare bulb on a pull chain |
| XIII | `bricked` | "XIII. ———" (renamed "Their Things" once found) | 1240 | 1070 | 460 | 250 | 1320 | pitch black; ghost only |

Notes:
- Attic rooms are logical rectangles; the roof slope is drawn over them and clamps your upward movement.
- From x 1700 to 2308 below ground there is no room: solid earth drawn in `T4` with roots and the coal chute.
- Room captions show for 3s on your first entry, at the room's top-left (+12,+12) in world space, then only in the overview.

### 7.3 Connections

**Doorways** (130px tall, from the floor up):
- First floor: walls at x 760, 1040, 1520, 2000 (opening y 630–760).
- Ground floor: walls at x 760... correction, walls at x 820, 1240, 1760 (opening y 920–1050).
- Attic: wall at x 1260 (low doorway, y 350–470).
- Basement: the wall at x 1240 is **bricked**. You can seep through it (0.6s, slowed). The family cannot pass.

**Stairs** (used by the family and by you):

| Id | Name | Route | Slab opening |
|---|---|---|---|
| S1 | Grand stair | hall (2060,1050) up-left to landing (1780,760) | x 1790–1910, railing on the landing |
| S2 | Servant stair (narrow, enclosed, always dark) | kitchen (540,1050) up-left to master (272,760) | x 262–380 |
| S3 | Cellar stair | kitchen (420,1050) down-right to cellar (700,1320) | x 420–540, under S2, with the cellar door at its top |
| S4 | Attic ladder (family climb slowly) | landing (1580,760) to storeroom (1580,470) | hatch x 1555–1605 |

**Rot spots** (ghost-only shortcuts; press S/W or float into them):
- **R1** bathroom floor ↔ dining room ceiling, x 870–930
- **R2** nursery floor ↔ boy's room ceiling, x 1120–1180 (the crack above his bed)
- **R3** parlour hearth ↔ bricked room ceiling, x 1470–1530

**Front door and exit:**
- Front door in the hall's right wall, x 2308–2320, opening y 920–1050.
- Porch x 2320–2440 at y 1050, steps down to 1060, path to the **gate at x 2520**. Reaching the gate means that member has left.
- Fleeing members come down S1 (or S2 via the kitchen, then through the dining room and parlour) and out the door.

**Movement rule:** you are clamped to your current room's rectangle except at doorways, stair openings, the hatch, rot spots and the bricked wall. The map is the puzzle. Shortcuts are knowledge.

**Hiding spots** (you are unseen even in light; for systems): under the nursery bed (1060,470), the master wardrobe (690,760), inside the clock case (1680,760), among the cellar laundry (1050,1320), and under the grand stair (1900,1050).

```
x: 252        760 820     1040      1240 1260     1520    1700 1760     2000   2308  2520
          roof peak (1280,110)
ATTIC 300-470                  [ I NURSERY 860-1260 | II STORE 1260-1700 ]
                                        R2 v               ^ ladder S4 (1580)
FIRST 490-760   [III MASTER | IV BATH | V BOY'S ROOM | VI LANDING   | VII STUDY ]
                 ^S2 top        R1 v                      S1 top ^(1780)
GROUND 780-1050 [VIII KITCHEN  | IX DINING | X PARLOUR   | XI HALL      ]> door  porch  gate
                 S2 bot/S3 top                 R3 v (hearth)   S1 bottom (2060)
BASEMENT 1070-1320 [XII CELLAR 252-1240     | XIII BRICKED 1240-1700 | earth ]
```

### 7.4 Haunt objects (31; at least 2 per room)

Tiers:
- **W (Whisper):** cheap; builds Dread; never jumps anyone; rarely reveals you.
- **O (Omen):** medium; adds Fear and Dread; draws someone to investigate.
- **F (Fright):** expensive, long cooldown; cashes in Dread. The only tier that can trigger a full-screen face.

Senses:
- **Sound:** reaches the same room plus adjacent and stacked rooms, and can **lure** people.
- **Sight:** reaches the same room only, needs the victim facing it, and **needs light**. This is the core tension: you want darkness, but sight scares need light.
- **Touch:** you must be within 60px of the target.

Anchor is bottom-centre at the floor unless a y is given.

| Room | Object (type) | x (y) | Size | Tier / sense | Effect |
|---|---|---|---|---|---|
| Nursery | rocking chair (`chair`, reused) | 960 | 76×100 | W / sound | creaks; heard in boy's room and bath below |
| | music box (`musicbox`) | 1190 (430) | 30×24 | O / sound | lullaby; lures the son to the landing |
| Storeroom | dress mannequin (`mannequin`) | 1400 | 40×120 | F / sight | head turns; next look, it is 60px closer |
| | steamer trunk (`trunk`) | 1640 | 80×50 | O / sound | knocking from inside; heard on landing |
| Master | wardrobe (`closet`, reused) | 690 | 84×160 | F / sight | doors burst, two eyes inside (also a hiding spot) |
| | bedside lamp (`lamp`) | 520 (720) | 26×50 | O / sight | stutters, dies; room goes dark |
| | bed (`bed`) | 400 | 170×70 | W / touch | sheet drawn slowly off a sleeper |
| Bath | mirror (`mirror`, reused) | 830 (700) | 60×80 | O / sight | words in the fog (`OXBLOOD`); reflects the girl |
| | bathtub (`tub`, replaces `faucet`) | 960 | 130×60 | F / sight + sound | taps scream, black water rises, small handprint |
| Boy's room | nightlight (`nightlight`) | 1090 (744) | 14×16 | W / sight | dims, then out |
| | dollhouse (`dollhouse`) | 1290 | 90×80 | O / sight | tiny rooms light where the family are; a tiny sheet appears in its attic |
| | toy chest (`toychest`) | 1460 | 70×44 | F / sound | lid slams, jack-in-the-box shriek |
| Landing | grandfather clock (`clock`) | 1680 | 46×190 | O / sound, house-wide | strikes thirteen; once per hour; Dread to everyone (hiding spot) |
| | family portrait (`portrait`, reused) | 1900 (650) | 64×80 | O / sight | eyes follow, then it drops |
| Study | typewriter (`typewriter`) | 2110 (700) | 40×24 | O / sound | types by itself; page reads `GET OUT OF MY HOUSE` |
| | desk lamp (`lamp`) | 2210 (700) | 24×44 | O / sight | stutters, dies |
| Kitchen | plate shelf (`plates`, reused) | 660 (900) | 116×44 | F / sound + sight | plates fly and shatter |
| | hanging lamp (`lamp`, reused `lights`) | 720 (shade at 880) | 52×60 | O / sight | swings, flickers |
| | kettle (`kettle`) | 790 (990) | 30×28 | W / sound | whistles; lures Mother |
| Dining | candelabra (`candles`) | 980 (975) | 40×50 | W / sight | candles snuff one by one |
| | dining chairs (`chairs`) | 1060 | 220×90 | O / sight | all four slide out at once |
| Parlour | piano (`piano`, reused) | 1340 | 104×116 | F / sound | dissonant crash; heard on the whole ground floor and landing |
| | fireplace (`fire`) | 1500 | 120×130 | W / sight | gutters to embers; parlour darkens (sits on R3) |
| | TV console (`tv`, reused) | 1660 | 92×116 | O / sound + sight | static, then a whisper |
| Hall | coat rack (`coat`, reused) | 2230 | 52×140 | O / sight | coat fills out like someone standing |
| | front door (`door`) | 2308 | 12×130 | W / sound | three knocks from outside; Father investigates |
| Cellar | fuse box (`fusebox`) | 300 (1220) | 44×60 | F / global | blackout of ground and first floors for about 25s; Father comes down with the flashlight |
| | furnace (`furnace`) | 760 | 120×150 | O / sound | booms; grate flares `EMBER` and lights the cellar for 3s (danger) |
| | laundry line (`laundry`) | 1050 | 160×110 | W / sight | sheets sway into a figure (hiding spot) |
| Bricked | well (`well`) | 1460 | 90×70 | O / sound, remote | voices rise through the pipes; plays at the kitchen sink and bathtub |
| | pipes (`pipes`) | 1300 (wall) | 30×200 | W / sound, remote | knocking travels up into the kitchen, bath and master |
| | their belongings (story, not a haunt) | 1620 | — | examine | teddy, dog collar, 1986 calendar; diary: `these are their things. why are they so old?` |

Tier count: 9 W, 15 O, 7 F, so Frights are scarce by construction.

**Suggested build approach:** four behaviour archetypes with a per-type draw function:
- LIGHT: lamp, nightlight, candles, fire, fuse box
- SOUND: music box, trunk, kettle, door, typewriter, clock, pipes, well, furnace
- MOVER: chair, chairs, coat, portrait, laundry, mannequin, plates, bed
- REVEAL: mirror, TV, dollhouse, wardrobe, toy chest, tub, piano

**Suggested family schedule** (for systems), which spreads the house's light over time:

| Time | Father | Mother | Son | Dog |
|---|---|---|---|---|
| 10 PM | parlour | kitchen | dining | hall, by the door |
| 11 PM | study | bath, then master | to bed (nightlight on) | follows the son |
| Midnight | master | master | asleep | — |

- **Midnight:** kitchen and study lights go out.
- **1–3 AM:** everyone sleeps except the dog, which roams. A sound haunt wakes the nearest sleeper, who investigates carrying a light.
- **3 AM:** the house acts on its own.
- **4 AM:** Father gets up early and goes to the kitchen.
- **5 AM:** dawn.

### 7.5 Camera
- **Viewport:** 1280×720 at zoom 1.0, clamped so `0 ≤ cam.x ≤ 1280` and `0 ≤ cam.y ≤ 720`. Round the translate to whole pixels so lines don't shimmer.
- **Horizontal:** dead zone ±120px around screen centre. Look-ahead is 90px × sign(vx), eased over 0.6s. Lerp `1 − exp(−6·dt)`.
- **Vertical:** target `currentRoom.centerY − 380`, so the current floor stays framed (the screen shows about 2.5 floors). Change floors with a 0.5s ease.
- **Shake:** banned except during jump faces (max 10px, 0.3s) and door slams (4px).
- **Scare push:** for a Fright event in view, nudge 30px toward it and zoom to 1.06 over 0.5s.
- **Ghost speed:** 300 px/s base, slower than the current 400, for a drifting feel. Nursery to downstairs takes about 6s.

### 7.6 Overview (hold TAB) and the sketch
- **Hold TAB:** zoom eases to **0.5** in 0.35s with the camera at (0,0), so the whole house fits. Game time runs at **0.3×** (slowed, not paused, so the tension stays). Call `preventDefault` on TAB.
- **What shows:**
  - darkness lifts to 0.75 so the structure reads
  - every room caption shows in Centaur caps
  - lit rooms keep their light
  - known family are drawn normally; unknown members are a pencil `?` at their last known position, fading
  - rot spots are dotted pencil lines between floors; hiding spots are small pencil `x` marks
  - objective rooms are circled
  - the diary expands and the clock enlarges to 1.3×
- **The 1/16 sketch** (6.5) is the always-on version of the same information.

---

## 8. Onboarding (first 30 seconds, no walls of text)

Teaching tools: the diary (goal), one-line inner-voice narration (6 words or fewer), and in-world key prompts, each shown at most 3 times. There is no pause and no tutorial panel.

| Time | What happens |
|---|---|
| Title | A paper frontispiece in darkness, lit by a slowly moving candle pool that lags toward the mouse. A plate of the house at night sits in a double-rule frame. **YOU ARE THE HAUNTING** writes itself in Scratch Caps (`INK` on paper). Subtitle in Palatino italic: *They moved into your house.* Below: *press any key* (alpha pulses 0.35–0.8 over 2.4s), *headphones. lights off.* (14px, `SEPIA`), and *↑ ↓ brightness: the girl in the window should be barely visible.* (a faint figure in the plate's attic window, which is also foreshadowing). |
| 0–1s | Cut to black. A clock ticks, then strikes once. Fade in on **Plate I, the Nursery**: moonlight and darkness, with warm light leaking up through the floorboards and radio murmur from below. |
| 1–4s | Narration: *They're in my house again.* The diary writes in `make them leave. all four.` and the four photographs drop onto their nails one by one (a soft thump each). The clock reads X. |
| 4s, if idle | `A` and `D` key squares appear either side of the ghost at 0.7 alpha, then fade once you move. `W`/`S` appear the first time you meet a vertical opening. |
| Storeroom hatch | `S` appears under you with the verb *sink*. You drop to the landing. |
| Landing | Light comes up the stairwell. The diary strikes `go downstairs.` once you reach the hall. |
| First sight of a lit family member | Narration: *They can see me in the light.* For the first 3 encounters, that light pool's edge is traced with a dotted pencil line. Stepping in starts the ink-bleed and heartbeat, which teaches the risk in about a second. |
| First haunt | The diary writes `start small. let it build.` The nearest whisper object shivers with the prompt `E` *knock* (front door) or *snuff the candles* (dining). The dog's ears go up and its photo darkens. Narration: *Quiet things first.* |
| After 2–3 whispers on one member | A Fright object in that room gets the double trace with `E` *the piano*. Narration: *Now.* |
| About 45–70s | The first full jump face (systems pacing; the son is the easiest target). |
| First time someone leaves the screen | A `TAB` key square appears beside the house sketch with the verb *the house*. |

---

## 9. Restraint: art and UI rules for dread

1. **Silence is the default.** No drone until the witching hour. The landing clock's tick is audible only near the landing.
2. **At most one full-screen face per family member** (4 per run) plus the ending, spaced at least 20s apart.
3. **Every face is preceded by a 2.5s build-up:**
   - the room's light flickers 3 times (0.15s on, 0.4s gaps)
   - ambience ducks to −30dB over 1s
   - one thin sine rises from 2.2 to 2.4kHz at 0.02
   - the victim turns slowly toward the camera and grows eyes
   - the vignette tightens 15%
   - then 2 black frames, the face, and the negative flash
4. **About a third of witching-hour build-ups end in nothing** (systems). Anticipation is the scare.
5. **Player-directed unease beats**, at most one per in-game hour, scheduled by the clock:
   - a photograph briefly looks straight at you with a different expression
   - footsteps above your room when no one is upstairs
   - the girl's reflection stays in the mirror after you leave it
   - a fifth tally figure appears on the diary and is erased
   - a fifth dot blinks in the bricked room on the sketch for 1s
   - the dog sits in a dark room facing your position, eyeshine only
6. **At 3 AM, once per run:** all four family members, and all four photographs, turn and look at you. Show *...you again.* (Palatino italic 18px, `BONE` @ 0.5, no box). Keep the existing beat, but rare.

---

## 10. Endings (presentation)

- **Main win (all four leave): keep the twist and its timing.**
  - The house cross-fades to the abandoned plate.
  - The family return as unhatched paper cut-outs with ink-hole eyes.
  - The sheet slips off to reveal the fully drawn girl.
  - **THE HOUSE IS YOURS.** in Scratch Caps cap 36.
  - *They've been trying to scare you out for forty years.* in Palatino italic 24px, typed out with no box.
  - **YOU WERE NEVER THE GHOST.** in Scratch Caps cap 40.
  - The end card is a paper page: `INK` on `PAPER`, with the final line in `OXBLOOD` and a small vignette of the girl holding the sheet. The photo backs read *1986.* At the bottom, *begin again* in italic. Delete "THE END?".
- **Dawn (someone remained):**
  - The clock strikes five and pale paper light washes in from the windows.
  - The family who stayed sit at breakfast, lit and calm. Their photos hang back on their nails.
  - Diary: `they're still here. tomorrow night, then.` Chapter card: `MORNING`.
- **Caught (seen too many times):**
  - The lights come up around you and Father pulls the sheet.
  - Reverse shot: the four faces loom, paper-white (reuse `finalScare`).
  - **THERE YOU ARE.** Mother whispers *...you again.*, a partial hint at the twist.
- **Secret (belongings found, and all four leave):** the main ending, plus the bricked room caption reads "XIII. Their Things" and one extra diary line: `their names are on the calendar. 1986.`

---

## 11. Performance and code hygiene notes

- **Render order:**
  1. sky (parallax)
  2. world prerender (viewport rect)
  3. light leaks
  4. objects in view (cull by camera rect)
  5. family
  6. ghost and its shadow
  7. lightmap darkness
  8. warm tint
  9. emissives (flames, bulbs, eyeshine, screens)
  10. world prompts
  11. HUD (screen space)
  12. post-processing
- **Prerender once:** the 2560×1440 house (about 15MB), hatch tiles, paper tile, ink-bleed overlay, house sketch, and Scratch Caps strings.
- **Per frame:** one `drawImage` of the world, about 10 light gradients into a 320×180 canvas, and no RGB split outside scares.
- **Delete:** `label()` (replace with a fill-only `txt()` that sets `letterSpacing`), `shakyText()`, `drawHalo()`, `drawFearBar()`, all `rr()` HUD panels, `pop()` text, `COMBO_WORDS`/`COMBO_COLS`, `drawTrail()`, `SCAN`, every `shadowBlur`, the `FRONT DOOR ←` label, the controls hint line and the opening banner.
- **Keep and restyle:** `drawScreamFace`/`screamEye`, `slices()`, all audio, the ending event timeline, `srand`/`rs` (now the wobble source) and the `makePath` approach (extend it to a small waypoint graph over S1–S4 and the doorways).

---

## 12. Hand-off to the systems designer

These belong to systems; the visuals above are built to show them:
- the Dread → Fear model and its numbers
- costs per tier (whole notches on the candle)
- the exposure rate in light and line of sight
- the strike count for the caught ending
- whether combos survive
- the family schedule and investigation AI
- the fuse-box blackout length
- the dawn deadline and per-ending conditions

Every state above has exactly one visual home: Presence is the candle, time is the clock, Fear and Dread are the photos, goals are the diary, position is the sketch or overview, and danger is the ink-bleed. That one-to-one mapping is what fixes "this is confusing".