import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { REC_HD_KEY, canvasPixelSize, readRecHd, writeRecHd } from "./rec-hd.ts";

function mem(init: Record<string, string> = {}) {
  const data = { ...init };
  return {
    getItem(key: string) {
      return key in data ? data[key]! : null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
    data,
  };
}

describe("hd record pref", () => {
  it("starts off and remembers on", () => {
    const ls = mem();
    assert.equal(readRecHd(ls), false);
    writeRecHd(true, ls);
    assert.equal(ls.data[REC_HD_KEY], "on");
    assert.equal(readRecHd(ls), true);
    writeRecHd(false, ls);
    assert.equal(readRecHd(ls), false);
  });
});

describe("canvas native size", () => {
  it("keeps the 2× cap when HD is off", () => {
    assert.deepEqual(canvasPixelSize(390, 844, false, 3), { w: 780, h: 1688 });
  });

  it("uses native pixels when HD is on", () => {
    assert.deepEqual(canvasPixelSize(390, 844, true, 3), { w: 1170, h: 2532 });
    assert.deepEqual(canvasPixelSize(1512, 982, true, 2), { w: 3024, h: 1964 });
  });

  it("caps the long side so a 5K desk does not melt the GPU", () => {
    const s = canvasPixelSize(2560, 1440, true, 2);
    assert.equal(Math.max(s.w, s.h), 4096);
    assert.equal(s.w, 4096);
    assert.equal(s.h, 2304);
  });
});
