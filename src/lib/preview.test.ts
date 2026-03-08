import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildPreviewDocument, normalizeComponentCode } from "./preview.ts";

describe("normalizeComponentCode", () => {
  it("adds a default export when a named component is returned without one", () => {
    const normalized = normalizeComponentCode(
      `function LandingPage() { return <div />; }`,
    );

    assert.match(normalized, /export default LandingPage;/u);
  });
});

describe("buildPreviewDocument", () => {
  it("wraps the preview in browser chrome", () => {
    const document = buildPreviewDocument(
      `export default function MockupPage() { return <div className="p-8">Hello</div>; }`,
      "preview-id",
    );

    assert.match(document, /generated-site\.local/u);
    assert.match(document, /browser-bar/u);
    assert.match(document, /page-canvas/u);
  });
});
