# Ripple

Full-screen fluid paint studio. Drag to push waves and lay color. Presets, brushes, textures, camera, mic, and gyro all mix on one WebGL2 surface. A phone can pair to a second display through a live QR code.

**`drawing.grok.me` is released.** This project no longer claims that subdomain.

## Run

```bash
npm install
npm run dev          # local studio
npm run build
npm run preview      # production build
```

## Walkthrough (tips)

A round **i** control sits at the bottom-right of the canvas.

- Tap it to turn **tips on**. Mini **i** marks appear on the menu and HUD.
- Helper lines in the menu (how Layer FX stacks, save notes, and similar) only show while tips are on, so the dock stays short.
- A walkthrough card steps through every feature (Back / Next).
- Tap any mini **i** to jump that card to that control.
- Tap the round **i** again to turn tips off.

## Studio

### Paint

Drag on the surface. Fast strokes stay continuous. Tapping the canvas hides the menu. **Diameter** is a two-handle range — small on the left, large on the right — stored per brush. Strokes start at the large end and tail toward the small end as you draw.

### Presets

Starter presets and your saves share one inlaid window. It opens scrolled to the **bottom** — newest chips sit at the foot of the list, older ones above. Scroll up for the catalog; fades at the top and bottom of the window mark that there is more. **Save as** stays bottom-right in that window. The large color bar is the live selection; the selected chip grows a taller bar.

Each starter (Lens, Voice, Noir, Easy, …) is a full mix: palette, thickness, wave, camera, and mic. Keyboard `←` `→` / `[` `]` still step through palettes. The live gradient is the ink.

**Save as** always creates a **new** named preset at the bottom of the window. It never overwrites. Names must be unique. Uploaded textures and custom PNG stamps are stored with the preset for the next visitor.

**Hold a chip for two seconds** — an **X** appears on that chip. Tap the X and confirm to remove it. Your own saves are deleted for everyone. Starter presets hide on this studio and can be restored by a clean browser profile.

### Brushes

Round, soft, scatter, and script nibs. Custom PNG stamps live under Script (name, angle, spin). Stroke color follows the live gradient.

### Layer FX

Apply-to pills (Camera, Mic, Brush, Texture, Brush Shadow) plus a compact mix board (Normal, Darken, Multiply, Lighten, Screen, Overlay, Contrast, Inversion, Color, Component). Darken and Lighten families replace each other. Opacity is the stack strength. Shadow has its own color, angle, and opacity.

### Surface

Textures (paper, silk, mesh, and more) plus upload (JPG, PNG, GIF, WebP). Invert and levels reshape a photo. Cover / contain / stretch set the fit. The dual-handle **Color** ramp crops the live gradient — **click the ramp** to add a stop, then pick on the circular color wheel. Stops can punch holes; **Flip gradient** reverses it. **Viscosity** is how long ripples linger. **Wave strength** is how hard a stroke disturbs the bed.

### Sensors

On-device only. Top-left HUD:

- **Camera** — tap to cycle off → rear → front
- **Mic** — on / off
- **Gyro** — off → on → horizontal → vertical

Menu sliders: camera interact, mic sensitivity, gyro sensitivity, gyro zoom. Layer FX decides which of those layers inherit the mix.

### Session

**Clear surface** wipes paint. **Clean session** resets the live mix for the next person; saved presets stay. **Control With Secondary Device** (wide screens) opens the pairing card.

### Pairing

On a desktop-width studio the pairing card can open automatically or from the light icon / menu. Scan the QR, or open the same site on a phone with the six-character code. Click the dimmed area around the card (or Escape) to close it. **New code** mints a fresh room.

Once the phone is linked, the wall hides its menu, sensors, tips, and remaining buttons — the phone becomes the controller, with the full studio menu. If the phone drops, the pairing card comes back on the wall so you can scan again.

The pairing card’s **LOADING** screen tracks the real wait for a room code (lava lamp while it works, percent on the bar). It hands off to the QR as soon as the code exists — it does not sit on a fake timer.

Phone landscape still hides chrome when you are drawing on the phone itself (not paired as a pad).

### Record

Top-right **REC** captures the live canvas. The label is a **countdown** from a safe cap (about 6–12 seconds): shorter on phones, low-memory devices, and huge canvases so the browser stays happy. It auto-stops at zero. Tap REC again to stop early.

When a phone is linked, REC on the phone records the **wall** (the picture on the big screen). Both devices receive the same clip — desktop usually auto-downloads; phones show **Save clip** if the browser blocks a silent download. If the file is too large to send, it still saves on the wall.

Last three seconds pulse faster so you know the cap is close.

### Menu scroll

The menu uses one wide rail on the right. Tap the chevrons or the track to jump. The native scrollbar is hidden.

## URL modes

| URL | Mode |
|-----|------|
| `/` | Local interactive surface |
| `/?mode=wall` | Wall / second display (QR pairing) |
| `/?mode=pad&c=CODE` | Phone pad (from QR) |

## Keyboard

- `←` `→` or `[` `]` — change palette
- `Escape` — hide menu (and close the pairing card)
- `Shift+Backspace` — clear the surface

## Stack

React 19 · TanStack Start · Vite · Zustand · Tailwind v4 · WebGL2 height-field · WebRTC (P2P, STUN) for cast · unowned Postgres / PGLite for shared studio session, presets, and feedback

Feature / bug notes from the in-app form write to `studio_feedback` and open a GitHub issue on [maximusmaximus/ripple](https://github.com/maximusmaximus/ripple/issues) (`bug` or `enhancement` + `from-studio`). Deployed hosts need `GITHUB_TOKEN` (issues:write) or `GH_TOKEN`; this sandbox uses the `gh` CLI. Override the repo with `GITHUB_FEEDBACK_REPO`.

## Deploy

Connect this repo to Vercel. Build command: `npm run build`.

Cast signaling uses Postgres when `DATABASE_URL` is set, and an in-memory roster otherwise (fine for a single-instance preview). Camera / mic never leave the device. Saved presets and uploads write into `public/studio` when the filesystem allows (dev / git), with the database as the live store on read-only hosts.

## Notes

- Same Wi-Fi is the reliable path for phone-to-wall. Strict NATs can still fail without a TURN relay.
- Last live mix, custom stamps, and textures are restored for the next visitor of this studio.
