export type LiveInfo = {
  code: string;
  viewers: number;
  pads: number;
  hostPeer: string;
  title: string;
  description: string;
  watchable: boolean;
};

export function isPublicLive(session: LiveInfo | null | undefined): boolean {
  if (!session) return false;
  if (!session.watchable) return false;
  return session.title.trim().length > 0 && session.description.trim().length > 0;
}
