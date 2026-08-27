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

- Tap it to turn **tips on**. Mini **i** marks appear on the menu and HUD, and a walkthrough card steps through every feature (Back / Next).
- **Helper copy in the menu is hidden until tips are on** — Layer FX notes, texture hints, save/delete help, clean-session, feature-form, “click the ramp,” and similar lines. The dock stays short while you paint.
- Tap any mini **i** to jump the card to that control.
- Tap the round **i** again to turn tips off.

The walkthrough covers paint, presets (swipe + hold to remove), save as, brushes (rotation, blade, hold to remove), width profile, brush shadow (on/off, distance, angle), Layer FX, texture well, color ramp (stops + shadow color), viscosity, wave, sensors, pairing, LIVE, record, and the feature/bug form. Each card has a small icon or illustration.

## Studio

### Paint

Drag on the surface. Fast strokes stay continuous. Tapping the canvas hides the menu. **Width** is a three-stop profile — start, belly, and tail — stored per brush. Drag a stop to reshape how the mark swells along the stroke.

**Brush shadow** sits under Width: an on/off switch, a **three-stop width** (start / belly / tail, same control as the brush), **Distance**, and **Angle**. Color and opacity for that cast live on the large diamond on the Color ramp. Starter mixes such as Noir quill, Copperplate, Eclipse stamp, and Shadow ember ship with their own shadow profiles.

### Presets

There is **no PRESETS heading**. The **selected mix** sits at the top of the menu — **swipe it left or right** (or tap the arrows) to step through. Keyboard arrows work while that row is focused.

Starter mixes and your saves share one inlaid well under that row: **oldest at the top**, newest at the bottom. Chips are **tall color previews** (two rows fill the window). Fades mark that there is more. **Save as** stays bottom-right in that window.

Each starter (Lens, Voice, Noir, Easy, …) is a full mix: palette, thickness, wave, camera, and mic. Keyboard `←` `→` / `[` `]` still step through palettes on the canvas. The live gradient is the ink.

**Save as** always creates a **new** named preset at the bottom of the window. It never overwrites. Names must be unique. Uploaded textures and custom PNG stamps are stored with the preset for the next visitor.

**Hold a chip for two seconds** — an **X** appears on that chip. Tap the X and confirm to remove it. Your own saves are deleted for everyone. Starter presets hide on this studio and can be restored by a clean browser profile.

### Brushes

Round, soft, scatter, and script nibs. **Width** (start / belly / tail) is the stroke profile. **Rotation** and **blade** sit under the brush grid — blade pinches a round mark into a chisel. Custom PNG stamps live under Script — on import you set name, rotation, and blade before the stamp is added.

**Hold a brush chip for two seconds** — an **X** appears. Tap it, then confirm. Your stamps are deleted. Starter brushes hide on this studio.

Stroke color follows the live gradient.

### Layer FX

Apply-to pills (Camera, Mic, Brush, Texture, Brush Shadow) plus a compact mix board (Normal, Darken, Multiply, Lighten, Screen, Overlay, Contrast, Inversion, Color, Component). Darken and Lighten families replace each other. Opacity is the stack strength. **FX only mixes the next stroke or live tool over colors already on the bed** — settled paint is not restyled when you change the mode. The Shadow pill mixes FX into the live cast — turn the cast on under Width.

### Surface

**Texture** matches presets: the selected grain sits at the top (swipe or arrows), a **well of tall chips** below, **Upload** in that window. Invert and crop stay underneath. JPG, PNG, GIF, WebP.

**Color** is one ramp: crop handles, click to add a stop, pick color on the wheel, and fade each stop with **opacity**. The **large diamond** is brush-shadow color and opacity. **Flip** reverses the ramp. Distance and angle for the cast live under Width. **Viscosity** is how long ripples linger. **Wave strength** is how hard a stroke disturbs the bed.

### Sensors

On-device only. Top-left HUD:

- **Camera** — tap to cycle off → front (faces you) → rear. One camera (laptop) is just on / off.
- **Mic** — on / off
- **Gyro** — off → on → horizontal → vertical

Menu sliders: camera interact, mic sensitivity, gyro sensitivity, gyro zoom. **Gyro sensitivity** defaults to **70%**, which is **90% quieter** than the previous mix. Layer FX decides which of those layers inherit the mix.

### Session

**Clear surface** wipes paint. **Clean session** resets the live mix for the next person; saved presets stay. **Control With Secondary Device** (wide screens) or **Pair with a larger screen** (phones) opens the pairing card.

**Feature & bugs** at the bottom of the menu: pick Feature or Bug, write a sentence, send. It is stored here and opened as a GitHub issue (`bug` or `enhancement` + `from-studio`). The menu stays in the studio and shows **Sent as #N** — it does not navigate the preview away. Copy link if you want the URL.

The **Ripple** mark sits under that, with a link to the public repo [maximusmaximus/ripple](https://github.com/maximusmaximus/ripple). It opens in a new tab so the studio stays put.

### Pairing

On a desktop-width studio the pairing card can open automatically or from the light icon / menu. Scan the QR, or open the same site on a phone with the six-character code. Click the dimmed area around the card (or Escape) to close it. **New code** mints a fresh room.

On a phone the light is also top-right. It does **not** auto-open. Tap it after you are in the studio for instructions to scan the desktop / primary screen, or type that screen’s six-character code.

Once the phone is linked, the wall hides its menu, sensors, tips, and remaining buttons — the phone becomes the controller, with the full studio menu. If the phone drops, the pairing card comes back on the wall so you can scan again.

The pairing card opens with a **VOIDRIDE** loading screen for a few seconds so you can tap Listen Now. Clicking outside during that hold flashes the card instead of closing it. Then the QR appears.

Phone landscape still hides chrome when you are drawing on the phone itself (not paired as a pad).

### LIVE session

One public studio at a time. If someone is already live, a chooser offers **Watch LIVE session** (view-only JPEG stream of the wall) or **Make new session** (private mix on this device). On a **phone with nobody live**, there is no chooser and no QR — VOIDRIDE plays, then you drop into painting. The number next to the connectivity light is how many other people are watching.

Watchers cannot paint. **My session** on the watch screen starts a private mix. Phone pads still pair through the QR as controllers — they are not watchers.

### Record

Top-right **REC** captures the live canvas for up to **30 seconds**. The label is a countdown. It auto-stops at zero. Tap REC again to stop early.

When a phone is linked, REC on the phone records the **wall** (the picture on the big screen). Both devices receive the same clip — desktop usually auto-downloads; phones open a **save sheet** so you can download it with a full tap. If the file is too large to send, it still saves on the wall.

Last three seconds pulse faster so you know the cap is close.

### Menu scroll

The menu uses one wide rail on the right. Tap the chevrons or the track to jump. The native scrollbar is hidden.

## URL modes

| URL | Mode |
|-----|------|
| `/` | Local interactive surface |
| `/?mode=wall` | Wall / second display (QR pairing, claims the public LIVE slot) |
| `/?mode=pad&c=CODE` | Phone pad (from QR) |
| `/?mode=watch&c=CODE` | Watch-only live stream |

## Keyboard

- `←` `→` or `[` `]` — change palette
- `Escape` — hide menu (and close the pairing card)
- `Shift+Backspace` — clear the surface

## Stack

React 19 · TanStack Start · Vite · Zustand · Tailwind v4 · WebGL2 height-field · WebRTC (P2P, STUN) for cast · unowned Postgres / PGLite for shared studio session, presets, and feedback

Feature and bug notes from the in-app form (Session → Feature & bugs) write to `studio_feedback` and open a GitHub issue on [maximusmaximus/ripple](https://github.com/maximusmaximus/ripple/issues) (`bug` or `enhancement` + `from-studio`). The menu stays in the studio and shows the issue number — it does not navigate the preview away. Deployed hosts need `GITHUB_TOKEN` (issues:write) or `GH_TOKEN`; this sandbox uses the `gh` CLI. Override the repo with `GITHUB_FEEDBACK_REPO`.

## Deploy

Connect this repo to Vercel. Build command: `npm run build`.

Cast signaling uses Postgres when `DATABASE_URL` is set, and an in-memory roster otherwise (fine for a single-instance preview). Camera / mic never leave the device. Saved presets and uploads write into `public/studio` when the filesystem allows (dev / git), with the database as the live store on read-only hosts.

## Notes

- Same Wi-Fi is the reliable path for phone-to-wall. Strict NATs can still fail without a TURN relay.
- Last live mix, custom stamps, and textures are restored for the next visitor of this studio.
