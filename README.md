# Ripple

Full-screen interactive fluid surface. Drag to paint waves; switch worlds; layer camera, mic, and gyro; cast from phone to a second display via QR.

## Live demo

After publishing from Grok Build, the app is available on your `*.grok.me` link.

Or run locally / deploy yourself:

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production assets in dist/
npm run preview      # serve the production build
```

## Deploy to production (self-host)

### Vercel / Netlify / Cloudflare Pages
Connect the GitHub repo `maximusmaximus/ripple`. Build command: `npm run build`. Output: `dist`.

### GitHub Pages
```bash
npm run build
# then push dist/ to gh-pages branch or use the Pages settings with /docs or root of a branch
```

## Features

- **Paint** — single-finger / mouse drag with adjustable brush diameter
- **Feel dock** — color-range gradient (dual handles), viscosity, wave strength
- **16 worlds** — unique palettes and camera/mic behaviors
- **Sensors** — top-bar camera + mic toggles; optional gyroscope
- **Second display** — open `/?wall=1`, scan the QR on a phone to stream the live surface
- Landscape mode hides all UI chrome for immersive drawing
- Tap outside the Feel menu to close it

## URL modes

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
