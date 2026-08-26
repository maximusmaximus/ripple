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
    body: "One inlaid window holds starter presets and your saves. It opens at the bottom — newest at the foot of the list. Scroll up for older chips. Fades at the top and bottom show there is more. Save as sits bottom-right in that window.",
  },
  {
    id: "save",
    title: "Save as",
    body: "Save as always creates a new named preset — it never overwrites. Labels must be unique. Textures and custom stamps are stored with the preset.",
  },
  {
    id: "delete",
    title: "Remove a preset",
    body: "Hold a chip for two seconds. An X appears on that chip — tap it, then confirm. Your saves are removed for everyone. Starter presets hide on this studio.",
  },
  {
    id: "brushes",
    title: "Brushes",
    body: "Round, soft, scatter, and script nibs. The swatch is the live stroke color. Custom PNGs live under Script, with angle and spin.",
  },
  {
    id: "diameter",
    title: "Diameter",
    body: "Two handles: smallest mark on the left, largest on the right. Each brush keeps its own pair. Strokes start fat and tail toward the small end as you draw.",
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
    body: "How much device tilt sloshes the fluid. Defaults are quiet — raise this if you want a heavier pour.",
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
    id: "camera",
    title: "Camera",
    body: "Top-left. Tap to cycle off → rear → front. The feed stays on this device and can stain the bed through Layer FX.",
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
    id: "rec",
    title: "Record",
    body: "Top-right REC captures the wall canvas. The number counts down from a safe cap (about 6–12s, shorter on phones and large canvases) so the clip stays light. Tap again to stop early. Linked phone and wall both receive the same file — Save clip appears if the browser blocks an auto-download. Last three seconds pulse faster.",
  },
];

export const GUIDE_BY_ID: Record<string, GuideTip> = Object.fromEntries(GUIDE_TIPS.map((t) => [t.id, t]));
if (GUIDE_BY_ID.presets) GUIDE_BY_ID.worlds = GUIDE_BY_ID.presets;
