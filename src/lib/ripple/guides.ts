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
    id: "presets",
    title: "Presets",
    body: "The name at the top is the live mix. Swipe it left or right — or tap the arrows — to step through. The well below lists every mix as tall color chips, oldest at the top. Two rows fill the window; later chips scroll.",
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
    title: "Diameter",
    body: "Two handles: smallest mark on the left, largest on the right. Each brush keeps its own pair. Strokes start fat and tail toward the small end as you draw.",
  },
  {
    id: "brush-shape",
    title: "Rotation and width",
    body: "Rotation turns the mark. Width pinches it from a circle into a blade. Every starter has a baked-in pair. Imported stamps set theirs on the way in. Changes stick to the selected brush.",
  },
  {
    id: "layerfx",
    title: "Layer FX",
    body: "Pick which layers inherit the mix (camera, mic, brush, texture, shadow), then tap modes. Darken and Lighten families replace each other. Opacity is the stack strength.",
  },
  {
    id: "texture",
    title: "Texture",
    body: "Grain on the bed — paper, silk, mesh, and more. Upload a JPG, PNG, GIF, or WebP. Invert and levels reshape the photo. Cover / contain / stretch set the fit.",
  },
  {
    id: "gradient",
    title: "Gradient",
    body: "The dual handles crop the live ramp. Click the ramp to drop a stop, then pick its color on the wheel. Drag stops, punch holes with alpha, or flip the ramp. This is the color the fluid samples as you paint.",
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
    body: "The light next to REC opens pairing. On a desktop it shows a QR for your phone. On a phone it tells you to scan the desktop or primary screen — or type that screen’s six-character code. The menu then lives on the phone and the large display becomes a clean wall.",
  },
  {
    id: "live",
    title: "LIVE session",
    body: "One public studio at a time. If a session is already going, pick Watch LIVE (view-only) or Make new session for a private mix. On a phone with nobody live, VOIDRIDE plays, then you drop straight into painting — no chooser, no QR. The number next to the light is how many others are watching.",
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
    body: "Top-right REC captures the wall canvas. The number counts down from 30 seconds. Tap again to stop early. Linked phone and wall both receive the same file — a save sheet appears on phones so you can download it. Last three seconds pulse faster.",
  },
];

export const GUIDE_BY_ID: Record<string, GuideTip> = Object.fromEntries(GUIDE_TIPS.map((t) => [t.id, t]));
if (GUIDE_BY_ID.presets) GUIDE_BY_ID.worlds = GUIDE_BY_ID.presets;
