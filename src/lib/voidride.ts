/** Latest VOIDRIDE drop used while the pairing QR is waking. */
export const VOIDRIDE_PROFILE = "https://soundcloud.com/ridethevoid";
export const VOIDRIDE_CREDIT_MS = 400;
export const VOIDRIDE_FAILSAFE_MS = 2000;
export const VOIDRIDE_HOLD_MS = 2800;

export type VoidrideRelease = {
  album: string;
  albumUrl: string;
  title: string;
  url: string;
  art: string;
};

/** Fallback if SoundCloud is unreachable — MARS DESCENT / IGNITION VEIL. */
export const VOIDRIDE_LATEST: VoidrideRelease = {
  album: "MARS DESCENT",
  albumUrl: "https://soundcloud.com/ridethevoid/sets/mars-descent",
  title: "IGNITION VEIL",
  url: "https://soundcloud.com/ridethevoid/ignition-veil",
  art: "/studio/voidride-latest.jpg",
};
