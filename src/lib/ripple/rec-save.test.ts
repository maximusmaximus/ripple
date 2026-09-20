import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  REC_AUTOSAVE_KEY,
  noticeForRecStart,
  noticeForTake,
  readRecAutosave,
  writeRecAutosave,
} from "./rec-save.ts";

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

describe("rec autosave", () => {
  it("starts unset and remembers the first choice", () => {
    const ls = mem();
    assert.equal(readRecAutosave(ls), null);
    writeRecAutosave("on", ls);
    assert.equal(readRecAutosave(ls), "on");
    assert.equal(ls.data[REC_AUTOSAVE_KEY], "on");
    writeRecAutosave("off", ls);
    assert.equal(readRecAutosave(ls), "off");
  });

  it("asks on the first REC, then never again", () => {
    assert.equal(noticeForRecStart(null), "ask");
    assert.equal(noticeForRecStart("on"), null);
    assert.equal(noticeForRecStart("off"), null);
  });

  it("saves later takes quietly once they said yes", () => {
    assert.equal(noticeForTake(null), "ask");
    assert.equal(noticeForTake("on"), "saved");
    assert.equal(noticeForTake("off"), null);
  });
});
