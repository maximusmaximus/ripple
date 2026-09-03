import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { asPinnedSliders, nextPinnedSliders, resolvePinnedActive, type PinId } from "./pins.ts";

describe("pinned sliders", () => {
  it("appends until two, then replaces the active slot", () => {
    const a = nextPinnedSliders([], "viscosity", null);
    assert.deepEqual(a, { pins: ["viscosity"], active: "viscosity" });
    const b = nextPinnedSliders(a.pins, "wave", a.active);
    assert.deepEqual(b, { pins: ["viscosity", "wave"], active: "wave" });
    const c = nextPinnedSliders(b.pins, "cam-interact", b.active);
    assert.deepEqual(c, { pins: ["viscosity", "cam-interact"], active: "cam-interact" });
  });

  it("replaces whichever slot is active, not always the last pin", () => {
    const cur: PinId[] = ["viscosity", "wave"];
    const swapped = nextPinnedSliders(cur, "cam-interact", "viscosity");
    assert.deepEqual(swapped, { pins: ["cam-interact", "wave"], active: "cam-interact" });
  });

  it("toggles an already-pinned id off and keeps the other active", () => {
    const cur: PinId[] = ["viscosity", "wave"];
    assert.deepEqual(nextPinnedSliders(cur, "viscosity", "wave"), { pins: ["wave"], active: "wave" });
    assert.deepEqual(nextPinnedSliders(cur, "wave", "wave"), { pins: ["viscosity"], active: "viscosity" });
  });

  it("drops unknown ids and caps at two", () => {
    assert.deepEqual(asPinnedSliders(["wave", "nope", "viscosity", "gyro-zoom", "wave"]), ["wave", "viscosity"]);
    assert.deepEqual(asPinnedSliders(null), []);
  });

  it("resolves active to a live pin", () => {
    assert.equal(resolvePinnedActive("wave", ["viscosity", "wave"]), "wave");
    assert.equal(resolvePinnedActive("fx-opacity", ["viscosity", "wave"]), "wave");
    assert.equal(resolvePinnedActive(null, ["viscosity"]), "viscosity");
    assert.equal(resolvePinnedActive("wave", []), null);
  });
});
