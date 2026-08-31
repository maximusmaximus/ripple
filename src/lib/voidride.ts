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

/** Last-resort if SoundCloud is unreachable — must match the current newest track. */
export const VOIDRIDE_LATEST: VoidrideRelease = {
  album: "SILICON SEANCE",
  albumUrl: "https://soundcloud.com/ridethevoid/silicon-seance",
  title: "SILICON SEANCE",
  url: "https://soundcloud.com/ridethevoid/silicon-seance",
  art: "https://i1.sndcdn.com/artworks-ozSHehd4LXPOlUWa-daMnlw-t500x500.jpg",
};
