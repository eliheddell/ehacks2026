import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  extractImageFileFromClipboardData,
  validateImageFile,
} from "./image.ts";

describe("validateImageFile", () => {
  it("accepts supported images under the size limit", () => {
    assert.equal(validateImageFile({ type: "image/png", size: 1024 }), null);
  });

  it("rejects unsupported image types", () => {
    assert.equal(
      validateImageFile({ type: "image/gif", size: 1024 }),
      "Use a PNG or JPG image.",
    );
  });
});

describe("extractImageFileFromClipboardData", () => {
  it("prefers a pasted image file", () => {
    const file = new File(["demo"], "demo.png", { type: "image/png" });

    const result = extractImageFileFromClipboardData({
      files: {
        0: file,
        length: 1,
        item: () => file,
      },
    });

    assert.equal(result, file);
  });

  it("falls back to clipboard items", () => {
    const file = new File(["demo"], "paste.jpg", { type: "image/jpeg" });

    const result = extractImageFileFromClipboardData({
      items: {
        0: {
          kind: "file",
          type: "image/jpeg",
          getAsFile: () => file,
        },
        length: 1,
      },
    });

    assert.equal(result, file);
  });
});
