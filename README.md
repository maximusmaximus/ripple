# Ripple

Full-screen fluid paint studio. Drag to push waves and lay color. Presets, brushes, textures, camera, mic, and gyro all mix on one WebGL2 surface. A phone can pair to a second display through a live QR code. If the browser hides the page or the GL context drops, the last painted frame comes back so the canvas never boots black — pairing stays up.

**`drawing.grok.me` is released.** This project no longer claims that subdomain.

## Run

```bash
npm install
npm run dev          # local studio
npm run build
npm run preview      # production build
```

## Walkthrough (tips)

A round **i** control always sits at the bottom-right of the canvas. A **bug** control sits at the bottom-left and opens the bug form.

- Tap **i** to turn **tips on**. Mini **i** marks appear on the menu and HUD, and a walkthrough card steps through every feature (Back / Next).
- **Helper copy in the menu is hidden until tips are on** — Layer FX notes, texture hints, save/delete help, clean-session, feature-form, “click the ramp,” and similar lines. The dock stays short while you paint.
- Tap any mini **i** to jump the card to that control.
- Tap the round **i** again to turn tips off.
- Tap the **bug** to report something that broke — same form as Feature & bugs in the menu, opened on Bug.

The walkthrough covers paint, the menu (lifted button, swipe on a phone / rail on a mouse, section focus), presets (four-row chip well, hold to remove), save as, brushes (rotation, blade, hold to remove), **Width · Color** (circles on top, diamonds on the bottom), brush shadow, Layer FX, texture well (Upload and Random), viscosity, wave, sensors, pairing (HD on the same network), LIVE, record, and the feature/bug form. Each card has a small icon or illustration.

## Studio

### Paint

Drag on the surface. Fast strokes stay continuous. Tapping the canvas hides the menu.

**Width · Color** is one graphic under Paint. **Circles on top** are start, belly, and tail width — drag a circle up to fatten that part of the mark, down to thin it. **Diamonds along the bottom** are colors along the same stroke. Click the body to drop a color, drag a diamond, tap it for hue and opacity. **Flip** reverses start and tail. The larger diamond is brush-shadow color and opacity.

**Brush shadow** sits under that graphic: an on/off switch, a **three-stop width** (start / belly / tail), **Distance**, and **Angle**. Color and opacity for that cast live on the large diamond on **Width · Color**. Starter mixes such as Noir quill, Copperplate, Eclipse stamp, and Shadow ember ship with their own shadow profiles.

### Presets

**Presets** is the first block in the menu — a four-row well of tall color chips, oldest at the top. There is no swipe preview above it. Tap a chip to load that mix. Fades mark that there is more in the well. **Save as** stays bottom-right in that window.

Each starter is a full mix: palette, **width profile**, **Brush Color along the stroke**, shadow, texture, camera, and mic — a demo of what the engine can do. Easy is the clean first mark. The twenty worlds are the palettes as designed. Mixes after that stack a feature (Night paper, Copperplate, Taper noir, Shadow ember, Prism blade, Gyro flood, Camera stain, …). Keyboard `←` `→` / `[` `]` still step through palettes on the canvas.

**Save as** always creates a **new** named preset at the bottom of the window. It never overwrites. Names must be unique. The live **surface** (an upload or a Random grain), textures, and custom PNG stamps are stored with the preset for the next visitor. That grain also stays as a chip in **Surface**.

**Hold a chip for two seconds** — an **X** appears on that chip. Tap the X and confirm to remove it. Your own saves are deleted for everyone. Starter presets hide on this studio and can be restored by a clean browser profile.

### Brushes

Round, soft, scatter, and script nibs. **Width · Color** (circles on top, diamonds on the bottom) is the stroke profile. **Rotation** and **blade** sit under the brush grid — blade pinches a round mark into a chisel. Custom PNG stamps live under Script — on import you set name, rotation, and blade before the stamp is added.

**Hold a brush chip for two seconds** — an **X** appears. Tap it, then confirm. Your stamps are deleted. Starter brushes hide on this studio.

Stroke color follows the diamonds on **Width · Color** — the gradient laid along the stroke from start to tail.

### Layer FX

Apply-to pills (Camera, Mic, Brush, Texture, Brush Shadow) plus a compact mix board (Normal, Darken, Multiply, Lighten, Screen, Overlay, Contrast, Inversion, Color, Component). Darken and Lighten families replace each other. Opacity is the stack strength. **FX only mixes the next stroke or live tool over colors already on the bed** — settled paint is not restyled when you change the mode. The Shadow pill mixes FX into the live cast — turn the cast on under Paint. Color and opacity for that cast live on the large diamond on **Width · Color**.

### Surface

**Surface** sits directly under Presets and uses the **same chip well**: four rows of tall grains, **Upload** and **Random** in the bottom-right of that window. Random paints a distinct recipe each tap (vein, wood, slick, cells, …) so consecutive grains actually differ, and each one becomes its own chip. **Hold a non-starter chip for two seconds** — an **X** appears; tap it to remove that surface. Starter grains stay. **Save as** keeps the live grain with the mix. Invert and crop stay underneath. JPG, PNG, GIF, WebP.

**Viscosity** is how long ripples linger. **Wave strength** is how hard a stroke disturbs the bed. Width and color for the brush live under Paint.

A **pin** sits to the right of each menu slider (viscosity, wave, sensors, FX opacity). Pin up to two — they dock as vertical bars on the far right of the canvas, under REC and the light, always vertical even when the viewport rotates. Unpin from the same pin in the menu. Pinning a third swaps the last one you pinned. Pins are layout, not mix — they survive refresh, clear on Clean session, and are not stored in presets.

### Sensors

On-device only. Top-left HUD:

- **Camera** — tap to cycle off → front (faces you) → rear. One camera (laptop) is just on / off.
- **Mic** — on / off
- **Gyro** — off → on → horizontal → vertical

Menu sliders: camera interact, mic sensitivity, gyro sensitivity, gyro zoom. **Gyro sensitivity** defaults to **70%**, which is **90% quieter** than the previous mix. Layer FX decides which of those layers inherit the mix.

### Session

**Clear surface** wipes paint. **Clean session** resets the live mix for the next person; saved presets stay. **Title** and **Description** name the mix. **Watchable** lists it for others — they see that name and description, then watch only. Turning Watchable on opens a popup with the watch link, copy, and share. **Control With Secondary Device** (wide screens) or **Pair with a larger screen** (phones) opens the pairing card.

**Feature & bugs** at the bottom of the menu, or the **bug** icon at the bottom-left of the canvas: pick Feature or Bug, write a sentence, send. It is stored here and opened as a GitHub issue (`bug` or `enhancement` + `from-studio`). The studio stays put and shows **Sent as #N**. Copy link if you want the URL.

The **Ripple** mark sits under that, with a link to the public repo [maximusmaximus/ripple](https://github.com/maximusmaximus/ripple). It opens in a new tab so the studio stays put.

### Pairing

On a desktop-width studio the pairing card can open automatically or from the light icon / menu. Scan the QR, or open the same site on a phone with the six-character code. Click the dimmed area around the card (or Escape) to close it. **New code** mints a fresh room.

On a phone the light is also top-right. It does **not** auto-open. Tap it after you are in the studio for instructions to scan the desktop / primary screen, or type that screen’s six-character code.

Once the phone is linked, the wall hides its menu, sensors, tips, and remaining buttons — the phone becomes the controller, with the full studio menu. If the phone drops, the pairing card comes back on the wall so you can scan again. Same-network pairs light the bulb **HD**; extra watchers do not turn that off.

The pairing card opens with the **latest VOIDRIDE track from SoundCloud** for a few seconds so you can tap **Listen** on that song. Launch never shows a stored older cover — it waits for the live drop. Clicking outside during that hold flashes the card instead of closing it. Then the QR appears. The same latest track sits at the bottom of the menu, **under** “Made with ♥ in SF with support from VOIDRIDE”, as a full-width cover so Listen is always on hand.

Phone landscape still hides chrome when you are drawing on the phone itself (not paired as a pad).

### LIVE session

A mix is listed for others only when it is **Watchable** and has a **title** plus a **short description**. Visitors then see that name and description and can **Watch** (view-only) or **Make new session**. Private painting is never listed. Watchable opens a popup with a watch-only link to copy or share. Listings are stored on GitHub (`public/studio/live-session.json`, with a log of past sessions).

If a paired phone drops and the same device does not reconnect within about 45 seconds, the session unlists, the mix resets, and a new pair code is minted so the next person can start.

On a **phone with nobody listed**, there is no chooser and no QR — VOIDRIDE plays the latest album, then you drop into painting. The number next to the connectivity light is how many other people are watching.

Watchers cannot paint. **My session** on the watch screen starts a private mix. Phone pads still pair through the QR as controllers — they are not watchers.

### Record

Top-right **REC** captures the live canvas for up to **30 seconds**. The label is a countdown. It auto-stops at zero. Tap REC again to stop early.

When a phone is linked, REC on the phone records the **wall** (the picture on the big screen). If they are on **different networks**, both devices get the same ~30s clip. If ICE says they are on the **same network** (host / quiet RTT), the pair light reads **HD**: the wall saves a higher-bitrate clip (up to **60 seconds**) and does **not** ship that file over the paint channel. The phone shows a notice that HD landed on the wall. Extra watchers (local or web) stay on the cheap live view — they do not add encoders or change the HD file.

A toast fires once when same-network is detected: “Same network — the wall will save HD.”

Last three seconds pulse faster so you know the cap is close.

### Menu scroll

On a phone the **Menu** button sits a quarter of the way up from the bottom so the browser bar and full-screen message cannot cover it. The open card is one connected scroll — presets, surface, and credit travel together. It always opens at the **top** (Presets). Tap a section to focus it (it expands, the rest dim); tap another section or the canvas to leave. On a phone, swipe the card — inner rails stay hidden. A mouse gets a jump rail on the right of the menu and the chip wells.

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
