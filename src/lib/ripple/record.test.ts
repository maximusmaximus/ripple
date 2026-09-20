import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_SESSION_CLIPS, dropClip, prependClip, type PendingClip } from "./clips.ts";

function clip(n: number): PendingClip {
  return { url: `blob:test/${n}`, name: `ripple-${n}.webm`, createdAt: `2026-09-14T00:00:0${n}.000Z` };
}

describe("session takes", () => {
  it("puts the newest take first and keeps older ones", () => {
    const a = clip(1);
    const b = clip(2);
    const list = prependClip(prependClip([], a), b);
    assert.equal(list[0]?.url, b.url);
    assert.equal(list[1]?.url, a.url);
    assert.equal(list.length, 2);
  });

  it("does not duplicate the same blob", () => {
    const a = clip(1);
    const list = prependClip(prependClip([], a), a);
    assert.equal(list.length, 1);
    assert.equal(list[0]?.url, a.url);
  });

  it("caps the reel and drops the oldest", () => {
    let list: PendingClip[] = [];
    for (let i = 0; i < MAX_SESSION_CLIPS + 3; i++) list = prependClip(list, clip(i));
    assert.equal(list.length, MAX_SESSION_CLIPS);
    assert.equal(list[0]?.name, `ripple-${MAX_SESSION_CLIPS + 2}.webm`);
    assert.equal(list.at(-1)?.name, `ripple-3.webm`);
  });

  it("drops one take by url", () => {
    const a = clip(1);
    const b = clip(2);
    const list = dropClip(prependClip(prependClip([], a), b), b.url);
    assert.deepEqual(
      list.map((c) => c.url),
      [a.url],
    );
  });
});
