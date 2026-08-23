# Ripple

Full-screen interactive fluid surface. Drag to paint waves; switch worlds; layer camera, mic, and gyro; cast from phone to a second display via QR.

## Features

- **Paint** — single-finger / mouse drag with adjustable brush diameter
- **Feel dock** — color-range gradient (dual handles), viscosity, wave strength
- **16 worlds** — unique palettes and camera/mic behaviors
- **Sensors** — top-bar camera + mic toggles; optional gyroscope
- **Second display** — open `/?wall=1`, scan the QR on a phone to stream the live surface

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

| URL | Mode |
|-----|------|
| `/` | Local interactive surface |
| `/?wall=1` | Wall / second display (QR pairing) |
| `/?pad=1&c=CODE` | Phone pad (from QR) |

## Stack

React 19 · Vite · Zustand · Tailwind (CDN) · WebRTC data channels for cast

## Notes

- Camera / mic stay on-device; nothing is uploaded.
- Drawing samples densely along the stroke so fast drags still leave a continuous mark.
- Landscape mode hides all UI chrome for immersive drawing.
- Tap outside the Feel menu to close it.
