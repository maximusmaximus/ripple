import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_FX_LAYERS, asFxLayers, withCameraFront } from "./blend.ts";

describe("fx layers", () => {
  it("defaults with camera in front of the brush", () => {
    assert.deepEqual(DEFAULT_FX_LAYERS, ["camera", "brush"]);
    assert.equal(DEFAULT_FX_LAYERS[0], "camera");
  });

  it("keeps camera first when it is on", () => {
    assert.deepEqual(withCameraFront(["brush", "texture", "camera"]), ["camera", "brush", "texture"]);
    assert.deepEqual(withCameraFront(["brush"]), ["camera", "brush"]);
  });

  it("does not invent a camera when the list is empty", () => {
    assert.deepEqual(asFxLayers([]), []);
  });
});
