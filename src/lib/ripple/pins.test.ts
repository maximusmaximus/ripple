import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { asPinnedSliders, nextPinnedSliders, type PinId } from "./pins.ts";

describe("pinned sliders", () => {
  it("appends until two, then replaces the last pin", () => {
    const a = nextPinnedSliders([], "viscosity");
    assert.deepEqual(a, ["viscosity"]);
    const b = nextPinnedSliders(a, "wave");
    assert.deepEqual(b, ["viscosity", "wave"]);
    const c = nextPinnedSliders(b, "cam-interact");
    assert.deepEqual(c, ["viscosity", "cam-interact"]);
  });

  it("toggles an already-pinned id off", () => {
    const cur: PinId[] = ["viscosity", "wave"];
    assert.deepEqual(nextPinnedSliders(cur, "viscosity"), ["wave"]);
    assert.deepEqual(nextPinnedSliders(cur, "wave"), ["viscosity"]);
  });

  it("drops unknown ids and caps at two", () => {
    assert.deepEqual(asPinnedSliders(["wave", "nope", "viscosity", "gyro-zoom", "wave"]), ["wave", "viscosity"]);
    assert.deepEqual(asPinnedSliders(null), []);
  });
});
