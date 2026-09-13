import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextDockSection, sectionAtOffset, isDockSectionId } from "./dock-nav.ts";

describe("dock section nav", () => {
  it("steps through features and stops at the ends", () => {
    assert.equal(nextDockSection("presets", 1), "surface");
    assert.equal(nextDockSection("surface", 1), "paint");
    assert.equal(nextDockSection("paint", 1), "sensors");
    assert.equal(nextDockSection("sensors", 1), "session");
    assert.equal(nextDockSection("session", 1), null);
    assert.equal(nextDockSection("presets", -1), null);
    assert.equal(nextDockSection("session", -1), "sensors");
  });

  it("starts at presets when nothing is focused", () => {
    assert.equal(nextDockSection(null, 1), "surface");
    assert.equal(nextDockSection(null, -1), null);
  });

  it("picks the feature that owns the scroll offset", () => {
    const tops = [0, 200, 400, 600, 800];
    assert.equal(sectionAtOffset(tops, 0), "presets");
    assert.equal(sectionAtOffset(tops, 100), "presets");
    assert.equal(sectionAtOffset(tops, 200), "surface");
    assert.equal(sectionAtOffset(tops, 176, 0), "presets");
    assert.equal(sectionAtOffset(tops, 760), "sensors");
    assert.equal(sectionAtOffset(tops, 800), "session");
  });

  it("knows its own ids", () => {
    assert.equal(isDockSectionId("paint"), true);
    assert.equal(isDockSectionId("nope"), false);
  });
});
