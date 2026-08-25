# Ripple

Full-screen interactive fluid surface. Drag to paint waves; switch worlds; layer camera, mic, and gyro; cast from a phone to a second display via a real QR code.

**`drawing.grok.me` is released.** This project no longer claims that subdomain.

## Run

```bash
npm install
npm run dev          # http://localhost:8080
npm run build
npm run preview      # production build
```

## Features

- **Paint** — mouse / finger drag with adjustable brush diameter; strokes sample densely so fast drags still leave a continuous mark
- **Feel dock** — dual-handle color range, viscosity, wave strength
- **16 worlds** — each with its own palette, thickness, camera mix, and mic drive
- **Sensors** — camera, flip, mic, and gyroscope; all stay on-device
- **Second display** — open `/?mode=wall`, scan the QR on a phone; the wall runs the same WebGL fluid, not a video feed
- Phone landscape hides chrome for immersive drawing (desktop keeps the menu)
- Tap outside the Feel menu to close it
- Camera feed rotates with device orientation

## URL modes

| URL | Mode |
|-----|------|
| `/` | Local interactive surface |
| `/?mode=wall` | Wall / second display (QR pairing) |
| `/?mode=pad&c=CODE` | Phone pad (from QR) |

## Stack

React 19 · TanStack Start · Vite · Zustand · Tailwind v4 · WebGL2 height-field · WebRTC (P2P, STUN) for cast

## Deploy

Connect this repo to Vercel. Build command: `npm run build`.

Cast signaling uses Postgres when `DATABASE_URL` is set, and an in-memory roster otherwise (fine for a single-instance preview). Camera / mic never leave the device.
