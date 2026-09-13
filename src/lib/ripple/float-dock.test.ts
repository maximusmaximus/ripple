import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampFloatPos,
  defaultFloatPos,
  floatPanelSize,
  isTabletViewport,
  parseFloatDockPos,
  TABLET_MIN_HEIGHT,
  TABLET_MIN_WIDTH,
} from "./float-dock.ts";

describe("isTabletViewport", () => {
  it("treats iPad-sized coarse screens as tablets", () => {
    assert.equal(
      isTabletViewport({ width: 1024, height: 768, finePointer: false, hover: false }),
      true,
    );
    assert.equal(
      isTabletViewport({ width: 768, height: 1024, finePointer: false, hover: false }),
      true,
    );
  });

  it("keeps iPhone landscape on the phone dock (wide but short)", () => {
    assert.equal(
      isTabletViewport({ width: 932, height: 430, finePointer: false, hover: false }),
      false,
    );
  });

  it("keeps mouse desktops off tablet even when wide", () => {
    assert.equal(
      isTabletViewport({ width: 1280, height: 800, finePointer: true, hover: true }),
      false,
    );
  });

  it("keeps a phone portrait off tablet", () => {
    assert.equal(
      isTabletViewport({ width: 390, height: 844, finePointer: false, hover: false }),
      false,
    );
  });

  it("uses the published breakpoints", () => {
    assert.equal(TABLET_MIN_WIDTH, 768);
    assert.equal(TABLET_MIN_HEIGHT, 560);
    assert.equal(
      isTabletViewport({
        width: TABLET_MIN_WIDTH,
        height: TABLET_MIN_HEIGHT,
        finePointer: false,
        hover: false,
      }),
      true,
    );
    assert.equal(
      isTabletViewport({
        width: TABLET_MIN_WIDTH - 1,
        height: 900,
        finePointer: false,
        hover: false,
      }),
      false,
    );
  });
});

describe("float dock position", () => {
  it("defaults to the left, under the sensors bar", () => {
    const pos = defaultFloatPos(1024, 768);
    assert.ok(pos.x <= 16);
    assert.ok(pos.y >= 8);
    assert.ok(pos.y <= 76);
    assert.ok(pos.x + floatPanelSize(1024, 768).width < 1024 - 8);
  });

  it("clamps a dragged panel to the viewport", () => {
    const size = floatPanelSize(1024, 768);
    const lost = clampFloatPos({ x: 4000, y: -80 }, { vw: 1024, vh: 768, ...size });
    assert.ok(lost.x <= 1024 - size.width - 8);
    assert.equal(lost.y, 8);
  });

  it("keeps a minimized circle on-screen", () => {
    const fab = clampFloatPos({ x: 9000, y: 9000 }, { vw: 800, vh: 600, width: 70, height: 70 });
    assert.ok(fab.x <= 800 - 70 - 8);
    assert.ok(fab.y <= 600 - 70 - 8);
  });

  it("parses stored points and drops junk", () => {
    assert.deepEqual(parseFloatDockPos({ x: 40, y: 90 }), { x: 40, y: 90 });
    assert.equal(parseFloatDockPos({ x: "40", y: 90 }), null);
    assert.equal(parseFloatDockPos(null), null);
    assert.equal(parseFloatDockPos({ x: Number.NaN, y: 1 }), null);
  });
});
