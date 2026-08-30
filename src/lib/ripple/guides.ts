export type GuideTip = {
  id: string;
  title: string;
  body: string;
};

/** Ordered walkthrough. Mini i marks use the same ids. */
export const GUIDE_TIPS: GuideTip[] = [
  {
    id: "paint",
    title: "Paint",
    body: "Drag on the surface to push waves and lay color. Fast strokes still leave a continuous mark. Tap the canvas to hide the menu.",
  },
  {
    id: "menu",
    title: "Menu",
    body: "The Menu button sits a quarter of the way up from the bottom so the browser bar and full-screen message cannot cover it. The card is one connected scroll that always opens at the top. Tap a section to focus it — it expands while the rest dims. Tap another section, or tap the canvas, to leave.",
  },
  {
    id: "presets",
    title: "Presets",
    body: "Four-row well of tall color chips, oldest at the top — there is no swipe preview above it. Tap a chip to load that mix. Hold two seconds for an X to hide or delete. Save as never overwrites. Easy is a clean first mark. Later chips are demos of nib, shadow, sensors, and camera.",
  },
  {
    id: "save",
    title: "Save as",
    body: "Save as always creates a new named preset — it never overwrites. Labels must be unique. Textures and custom stamps are stored with the preset.",
  },
  {
    id: "delete",
    title: "Remove a preset",
    body: "Hold a chip for two seconds. An X appears — tap it, then confirm. Your saves are removed for everyone. Starter presets hide on this studio.",
  },
  {
    id: "brushes",
    title: "Brushes",
    body: "Round, soft, scatter, and script nibs. Each one ships with its own rotation and width. Hold a chip for two seconds to remove it — starters hide, your stamps delete. Custom PNGs ask for rotation and width before they join the set.",
  },
  {
    id: "diameter",
    title: "Width",
    body: "Three stops along the stroke: start, belly, and tail. Drag a stop up to fatten that part of the mark, down to thin it. Each brush keeps its own profile.",
  },
  {
    id: "shadow",
    title: "Brush shadow",
    body: "Switch it on under Width. Shadow width is the same three-stop profile as the brush — start, belly, tail — so the cast can be a hair or a fat halo along the stroke. Distance pushes it away. Angle aims it. Color and opacity live on the large diamond on Brush Color. The Layer FX Shadow pill only mixes FX into that cast.",
  },
  {
    id: "brush-shape",
    title: "Rotation and blade",
    body: "Rotation turns the mark. Blade pinches it from a circle into a chisel. Every starter has a baked-in pair. Imported stamps set theirs on the way in. Stroke thickness lives on the Width profile above.",
  },
  {
    id: "layerfx",
    title: "Layer FX",
    body: "Pick which incoming layer gets the mix (camera, mic, brush, texture, shadow), then tap modes. Darken and Lighten families replace each other. Opacity is the stack strength. FX only hits the next mark or live tool — paint already on the bed keeps its look, so you can see the new mix over those colors. Shadow’s color and opacity live on the large Brush Color diamond. Turn the cast on under Width — Distance and Angle sit there.",
  },
  {
    id: "texture",
    title: "Texture",
    body: "Surface sits under Presets and uses the same four-row chip well. Tap a grain to lay it on the fluid. Upload sits in that window. Invert and crop stay underneath.",
  },
  {
    id: "gradient",
    title: "Brush Color",
    body: "The ramp is the brush itself — same length and silhouette as Width, from start on the left through the belly to the tail on the right. Each diamond is a color along that stroke: the mark picks up the left color as it begins and the right color as it finishes. Click the silhouette to drop a stop, drag to slide it, tap it to set hue and opacity. Flip reverses start and tail. The larger diamond is brush-shadow color and opacity; distance and angle for the cast live under Width. There are no crop circles — the whole stroke is the gradient.",
  },
  {
    id: "viscosity",
    title: "Viscosity",
    body: "How long ripples linger. High is syrup; low is water that settles fast.",
  },
  {
    id: "wave",
    title: "Wave strength",
    body: "How hard a stroke disturbs the height field. Turn it up for splashy marks, down for a quieter bed.",
  },
  {
    id: "cam-interact",
    title: "Camera interact",
    body: "How much painted waves warp and pull the live camera through the surface. Needs the camera on.",
  },
  {
    id: "mic-sens",
    title: "Mic sensitivity",
    body: "How hard incoming sound throbs the painted marks. Pair with Mic in Layer FX to mix volume into the bed.",
  },
  {
    id: "gyro-sens",
    title: "Gyro sensitivity",
    body: "How much device tilt sloshes the fluid. The default sits at 70% and is 90% quieter than the old mix. Raise it only if you want a heavier pour.",
  },
  {
    id: "gyro-zoom",
    title: "Gyro zoom",
    body: "How hard tilt punches the camera in, independent of slosh. Use it as a lean-in, not a wave.",
  },
  {
    id: "clear",
    title: "Clear surface",
    body: "Wipes the painted fluid. Brushes and presets stay put.",
  },
  {
    id: "clean",
    title: "Clean session",
    body: "Resets the live mix for the next person. Saved presets and uploads stay.",
  },
  {
    id: "pair",
    title: "Secondary device",
    body: "The light next to REC opens pairing. On a desktop it shows a QR for your phone. On a phone it tells you to scan the desktop or primary screen — or type that screen’s six-character code. The menu then lives on the phone and the large display becomes a clean wall. When both devices are on the same network the light reads HD — saves stay on the wall at higher quality so extra watchers do not slow the mix.",
  },
  {
    id: "live",
    title: "LIVE session",
    body: "Title and a short description live under Session. Turn Watchable on to list the mix — others then see that name and description and can watch only. A popup gives the watch link to copy or share. Private painting is never listed. If the paired phone drops and does not come back, the listing closes so the next person can start.",
  },
  {
    id: "camera",
    title: "Camera",
    body: "Top-left. Tap to cycle off → front (faces you) → rear. A single camera just turns on and off. The feed stays on this device and can stain the bed through Layer FX.",
  },
  {
    id: "mic",
    title: "Microphone",
    body: "Top-left. Turns the on-device mic on or off. Sensitivity in the menu sets how hard it drives the paint.",
  },
  {
    id: "gyro",
    title: "Gyro",
    body: "Top-left. Tap to cycle off → on → horizontal → vertical. Tilt sloshes the fluid; gyro zoom leans the camera.",
  },
  {
    id: "feedback",
    title: "Feature & bugs",
    body: "Bottom of the menu. Pick Feature or Bug, write at least a sentence, then send. It is saved here and opened on the public GitHub list. First line becomes the title. Stay in the studio — the issue number is shown in the menu.",
  },
  {
    id: "rec",
    title: "Record",
    body: "Top-right REC captures the wall canvas. Off-network clips last 30 seconds and copy to both screens. Same-network pairs raise that to HD on the wall (up to 60 seconds, higher bitrate) — the phone is told the file landed there instead of sending a huge blob over the paint channel. Extra watchers stay on the cheap live view and do not change the encode. Last three seconds pulse faster.",
  },
];

export const GUIDE_BY_ID: Record<string, GuideTip> = Object.fromEntries(GUIDE_TIPS.map((t) => [t.id, t]));
if (GUIDE_BY_ID.presets) GUIDE_BY_ID.worlds = GUIDE_BY_ID.presets;
