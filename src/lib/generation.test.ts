import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  extractStructuredText,
  normalizeGenerationResponse,
} from "./generation.ts";

describe("normalizeGenerationResponse", () => {
  it("normalizes code fences and preserves warnings", () => {
    const result = normalizeGenerationResponse(
      JSON.stringify({
        layoutDescription: "Two-column dashboard with a left rail and header.",
        componentCode:
          "```tsx\nfunction MockupCard() {\n  return <div className=\"p-6\">Hello</div>;\n}\n```",
        warnings: ["Spacing between cards is inferred."],
      }),
    );

    assert.match(result.layoutDescription, /dashboard/u);
    assert.match(result.componentCode, /export default MockupCard;/u);
    assert.deepEqual(result.warnings, ["Spacing between cards is inferred."]);
  });

  it("rejects invalid JSON", () => {
    assert.throws(
      () => normalizeGenerationResponse("not-json"),
      /The AI response was not valid JSON\./u,
    );
  });
});

describe("extractStructuredText", () => {
  it("reads the concatenated output_text blocks from a responses payload", () => {
    const text = extractStructuredText({
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: '{"layoutDescription":"Hero","componentCode":"export default function Mockup(){ return <div />; }","warnings":[]}',
            },
          ],
        },
      ],
    });

    assert.match(text, /layoutDescription/u);
  });
});
