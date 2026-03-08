import { NextResponse } from "next/server";

import { generateLayoutFromImage } from "@/lib/generation";
import { validateImageFile } from "@/lib/image";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "Attach a single PNG or JPG image." },
        { status: 400 },
      );
    }

    const validationError = validateImageFile(image);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const result = await generateLayoutFromImage(image);
    return NextResponse.json(result);
  } catch (caughtError) {
    const message =
      caughtError instanceof Error
        ? caughtError.message
        : "Generation failed unexpectedly.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
