import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPadName, isWallName } from "./cast.ts";
import { isUnroutableHost, pairUrlFor, pairUrlIsLocal } from "./pair-url.ts";

describe("pair URL", () => {
  it("marks loopback hosts as unroutable", () => {
    assert.equal(isUnroutableHost("localhost"), true);
    assert.equal(isUnroutableHost("127.0.0.1"), true);
    assert.equal(isUnroutableHost("[::1]"), true);
    assert.equal(isUnroutableHost("studio.example.com"), false);
  });

  it("builds a pad URL from the wall origin and code", () => {
    assert.equal(
      pairUrlFor("ab12cd", "https://ripple.example/"),
      "https://ripple.example/?mode=pad&c=AB12CD",
    );
    assert.equal(
      pairUrlFor("ab12cd", "https://ripple.example/?mode=wall&c=OLD"),
      "https://ripple.example/?mode=pad&c=AB12CD",
    );
  });

  it("treats a loopback pair URL as local-only", () => {
    assert.equal(pairUrlIsLocal(pairUrlFor("A2B3C4", "http://127.0.0.1:8080/")), true);
    assert.equal(pairUrlIsLocal(pairUrlFor("A2B3C4", "https://ripple.example/")), false);
  });
});

describe("cast roles", () => {
  it("recognizes pad and wall roster names", () => {
    assert.equal(isPadName("pad"), true);
    assert.equal(isPadName("wall"), false);
    assert.equal(isWallName("wall"), true);
    assert.equal(isWallName("watch"), false);
  });
});
