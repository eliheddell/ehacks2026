import { ACCEPTED_IMAGE_TYPES, validateImageFile } from "./image";
import { normalizeComponentCode } from "./preview";
import type { GenerationResult } from "./types";

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["layoutDescription", "componentCode", "warnings"],
  properties: {
    layoutDescription: {
      type: "string",
      description:
        "A concise description of layout hierarchy, regions, spacing, and visible copy.",
    },
    componentCode: {
      type: "string",
      description:
        "A single default-export React component using Tailwind classes only.",
    },
    warnings: {
      type: "array",
      items: {
        type: "string",
      },
      description:
        "Any uncertainties about missing detail, ambiguous spacing, or inferred styles.",
    },
  },
} as const;

const SYSTEM_PROMPT = `You turn UI screenshots, wireframes, or mockups into static React layout code.

Return valid JSON that matches the provided schema.

Rules for componentCode:
- Return exactly one default-export React component
- Use JSX and Tailwind classes only
- Do not import UI libraries or design systems
- Do not fetch data, add routing, or include app logic
- Reproduce layout hierarchy, alignment, spacing, and visible text from the image
- Make the result read like a real webpage, not an unstyled wireframe
- Include meaningful section spacing, typography hierarchy, navigation or header treatment, and polished surface styling when the image is ambiguous
- Prefer restrained slate or dark-neutral webpage styling unless the image clearly shows a different palette
- Use div, section, header, main, aside, nav, button, input, img placeholders, and text as needed
- Use tasteful cards, buttons, page containers, and backgrounds so the result looks shippable in a preview
- Add subtle depth where appropriate with rounded corners, soft borders, and restrained shadows on cards, buttons, or feature blocks
- Avoid returning bare placeholder boxes; key sections should feel intentionally designed with real webpage presentation
- Keep the component self-contained and previewable`;

type OpenAiTextResponse = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

export async function generateLayoutFromImage(
  file: File,
): Promise<GenerationResult> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = ACCEPTED_IMAGE_TYPES.includes(
    file.type as (typeof ACCEPTED_IMAGE_TYPES)[number],
  )
    ? file.type
    : "image/png";
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_output_tokens: 2400,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: SYSTEM_PROMPT }],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Describe the layout and generate the component.",
            },
            {
              type: "input_image",
              image_url: `data:${mimeType};base64,${base64}`,
              detail: "high",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "wireframe_to_react",
          schema: RESPONSE_SCHEMA,
          strict: true,
        },
      },
    }),
  });

  const payload = (await response.json()) as OpenAiTextResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "OpenAI request failed.");
  }

  return normalizeGenerationResponse(extractStructuredText(payload));
}

export function extractStructuredText(payload: OpenAiTextResponse) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  const joinedText =
    payload.output
      ?.flatMap((message) => message.content ?? [])
      .filter((content) => content.type === "output_text")
      .map((content) => content.text?.trim() ?? "")
      .filter(Boolean)
      .join("\n") ?? "";

  if (!joinedText) {
    throw new Error("The AI response did not contain structured output.");
  }

  return joinedText;
}

export function normalizeGenerationResponse(rawText: string): GenerationResult {
  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(rawText);
  } catch {
    throw new Error("The AI response was not valid JSON.");
  }

  if (!parsedValue || typeof parsedValue !== "object") {
    throw new Error("The AI response had an unexpected shape.");
  }

  const candidate = parsedValue as Partial<GenerationResult>;
  if (
    typeof candidate.layoutDescription !== "string" ||
    typeof candidate.componentCode !== "string" ||
    !Array.isArray(candidate.warnings)
  ) {
    throw new Error("The AI response is missing required fields.");
  }

  return {
    layoutDescription: candidate.layoutDescription.trim(),
    componentCode: normalizeComponentCode(candidate.componentCode),
    warnings: candidate.warnings.filter(
      (warning): warning is string =>
        typeof warning === "string" && warning.trim().length > 0,
    ),
  };
}
