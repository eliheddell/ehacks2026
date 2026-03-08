"use client";

import { useEffect, useId, useState } from "react";

import { buildPreviewDocument } from "@/lib/preview";

type PreviewFrameProps = {
  code: string;
  viewport?: {
    width?: number;
    height?: number;
  };
};

export function PreviewFrame({ code, viewport }: PreviewFrameProps) {
  const previewId = useId();
  const [previewState, setPreviewState] = useState<{
    code: string;
    message: string | null;
  }>({
    code,
    message: null,
  });

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (
        !data ||
        typeof data !== "object" ||
        data.source !== "wireframe-preview" ||
        data.previewId !== previewId
      ) {
        return;
      }

      if (data.type === "error") {
        setPreviewState({
          code,
          message:
            typeof data.payload?.message === "string"
              ? data.payload.message
              : "Preview failed to compile.",
        });
      }

      if (data.type === "ready") {
        setPreviewState({
          code,
          message: null,
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [code, previewId]);

  const previewError =
    previewState.code === code ? previewState.message : null;

  return (
    <div className="bg-[#020617]">
      {previewError ? (
        <div className="border-b border-red-500/20 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          Preview error: {previewError}
        </div>
      ) : null}
      <iframe
        className="min-h-[42rem] w-full bg-[#020617]"
        sandbox="allow-scripts"
        srcDoc={buildPreviewDocument(code, previewId, viewport)}
        title="Generated component preview"
      />
    </div>
  );
}
