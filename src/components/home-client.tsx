"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

import { PreviewFrame } from "@/components/preview-frame";
import {
  extractImageFileFromClipboardData,
  readImageDimensions,
} from "@/lib/image";
import type {
  GenerationResult,
  GenerationStatus,
  ImageSelection,
} from "@/lib/types";

const STATUS_LABELS: Record<GenerationStatus, string> = {
  idle: "Upload or paste a mockup to begin.",
  ready: "Image captured. Generate the component when you're ready.",
  uploading: "Uploading image to the server...",
  analyzing: "Reading layout, spacing, and visible text...",
  generating: "Turning the screen into React + Tailwind...",
  done: "Component ready.",
  error: "Generation failed.",
};

function createSelection(
  file: File,
  previewUrl: string,
  source: ImageSelection["source"],
  imageWidth: number,
  imageHeight: number,
): ImageSelection {
  return {
    file,
    previewUrl,
    source,
    imageWidth,
    imageHeight,
  };
}

export function HomeClient() {
  const [selection, setSelection] = useState<ImageSelection | null>(null);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectionRequestRef = useRef(0);

  const replaceSelection = async (
    file: File,
    source: ImageSelection["source"],
  ) => {
    const requestId = selectionRequestRef.current + 1;
    selectionRequestRef.current = requestId;

    const previewUrl = URL.createObjectURL(file);

    try {
      const { width, height } = await readImageDimensions(previewUrl);

      if (selectionRequestRef.current !== requestId) {
        URL.revokeObjectURL(previewUrl);
        return;
      }

      setSelection((current) => {
        if (current?.previewUrl) {
          URL.revokeObjectURL(current.previewUrl);
        }

        return createSelection(file, previewUrl, source, width, height);
      });

      setStatus("ready");
      setResult(null);
      setError(null);
      setCopied(false);
    } catch {
      URL.revokeObjectURL(previewUrl);
      setError("Unable to read the selected image.");
      setStatus("error");
    }
  };

  useEffect(() => {
    return () => {
      if (selection?.previewUrl) {
        URL.revokeObjectURL(selection.previewUrl);
      }
    };
  }, [selection]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const file = extractImageFileFromClipboardData(event.clipboardData);
      if (!file) {
        return;
      }

      event.preventDefault();
      void replaceSelection(file, "paste");
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeoutId = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    void replaceSelection(file, "upload");
    event.target.value = "";
  };

  const handlePasteArea = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const file = extractImageFileFromClipboardData(event.clipboardData);
    if (!file) {
      return;
    }

    event.preventDefault();
    void replaceSelection(file, "paste");
  };

  const clearSelection = () => {
    if (selection?.previewUrl) {
      URL.revokeObjectURL(selection.previewUrl);
    }

    setSelection(null);
    setStatus("idle");
    setResult(null);
    setError(null);
    setCopied(false);
  };

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selection) {
      setError("Select an image first.");
      setStatus("error");
      return;
    }

    const progressTimers = [
      window.setTimeout(() => setStatus("analyzing"), 500),
      window.setTimeout(() => setStatus("generating"), 1500),
    ];

    try {
      setStatus("uploading");
      setError(null);
      setResult(null);
      setCopied(false);

      const formData = new FormData();
      formData.append("image", selection.file);

      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Unable to generate the component.";

        throw new Error(message);
      }

      setResult(payload as GenerationResult);
      setStatus("done");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to generate the component.",
      );
      setStatus("error");
    } finally {
      progressTimers.forEach((timerId) => window.clearTimeout(timerId));
    }
  };

  const handleCopy = async () => {
    if (!result?.componentCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(result.componentCode);
      setCopied(true);
    } catch {
      setError("Copy failed. Select the code manually and try again.");
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="grid gap-6 lg:grid-cols-[1.02fr_1.18fr]">
        <div className="shadow-panel rounded-[1.75rem] border border-line bg-panel px-6 py-7 md:px-8 md:py-8">
          <div className="max-w-xl space-y-6">
            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-300">
              Slate mode
            </span>
            <div className="space-y-4">
              <h1 className="max-w-lg text-4xl font-semibold tracking-tight text-slate-50 md:text-6xl">
                Turn a mockup into a real-looking web page preview.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                Upload or paste a screen, let the model interpret the layout,
                then review a live React preview that feels like a finished page
                instead of a blank canvas.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                label="Input"
                value="Upload or paste"
                detail="PNG or JPG"
              />
              <StatCard
                label="Output"
                value="React + Tailwind"
                detail="Single component"
              />
              <StatCard
                label="Style"
                value="Dark minimal"
                detail="Slate-first shell"
              />
            </div>
            <div className="rounded-[1.4rem] border border-white/8 bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Flow
              </p>
              <ol className="mt-4 grid gap-3 text-sm leading-6 text-slate-300">
                <li>1. Paste a screenshot or choose an image file.</li>
                <li>2. Generate layout description and React code.</li>
                <li>3. Review the framed preview and copy the component.</li>
              </ol>
            </div>
          </div>
        </div>

        <section className="shadow-panel rounded-[1.75rem] border border-line bg-panel px-5 py-6 md:px-6">
          <form className="grid gap-5" onSubmit={handleGenerate}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Input
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-100">
                  Capture a single mockup image
                </h2>
              </div>
              <button
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-100 hover:border-slate-500/50 hover:bg-white/[0.08]"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose file
              </button>
            </div>

            <input
              ref={fileInputRef}
              accept="image/png,image/jpeg"
              className="hidden"
              type="file"
              onChange={handleFileChange}
            />

            <div
              className="group rounded-[1.5rem] border border-dashed border-slate-700 bg-[#0f172a]/80 p-5 outline-none hover:border-slate-500 focus:border-slate-400"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onPaste={handlePasteArea}
              role="button"
              tabIndex={0}
            >
              <div className="grid gap-5 md:grid-cols-[1.25fr_0.9fr]">
                <div className="space-y-3">
                  <div className="inline-flex rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                    Paste zone
                  </div>
                  <p className="max-w-md text-lg font-medium text-slate-100">
                    Click here, then paste an image from your clipboard. You
                    can also use the file picker.
                  </p>
                  <p className="max-w-md text-sm leading-6 text-slate-400">
                    The newest pasted or uploaded image replaces the current
                    selection. Results stay only in this browser session.
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-white/8 bg-[#020617] p-4">
                  {selection ? (
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full border border-slate-600/60 bg-slate-800 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200">
                          {selection.source}
                        </span>
                        <button
                          className="text-sm font-medium text-slate-400 hover:text-slate-100"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            clearSelection();
                          }}
                        >
                          Clear
                        </button>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt="Selected mockup"
                        className="aspect-[4/3] w-full rounded-[1rem] border border-white/10 object-cover"
                        src={selection.previewUrl}
                      />
                      <div className="text-sm text-slate-400">
                        <p className="font-medium text-slate-100">
                          {selection.file.name || "Pasted image"}
                        </p>
                        <p>
                          {Math.max(1, Math.round(selection.file.size / 1024))}
                          {" KB · "}
                          {selection.imageWidth}x{selection.imageHeight}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full min-h-52 flex-col items-center justify-center rounded-[1rem] border border-dashed border-slate-700 bg-[#0b1120] p-6 text-center">
                      <p className="text-base font-medium text-slate-100">
                        No image selected yet
                      </p>
                      <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
                        Paste directly into the page or choose a PNG/JPG file.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-100">
                  {STATUS_LABELS[status]}
                </p>
                <p className="text-sm text-slate-400">
                  Set <code className="rounded bg-white/[0.05] px-1.5 py-0.5 text-slate-200">OPENAI_API_KEY</code> to enable generation.
                </p>
              </div>
              <button
                className="rounded-full border border-slate-500/70 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_10px_30px_rgba(15,23,42,0.35)] hover:border-white hover:bg-white disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
                disabled={
                  !selection ||
                  status === "uploading" ||
                  status === "analyzing" ||
                  status === "generating"
                }
                type="submit"
              >
                {status === "uploading" ||
                status === "analyzing" ||
                status === "generating"
                  ? "Generating..."
                  : "Generate component"}
              </button>
            </div>

            {error ? (
              <div className="rounded-[1rem] border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}
          </form>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_360px]">
        <div className="min-w-0 shadow-panel rounded-[1.75rem] border border-line bg-panel px-5 py-6 md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Preview
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-100">
                Live generated page
              </h2>
            </div>
            {result ? (
              <button
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-100 hover:border-slate-500/50 hover:bg-white/[0.08]"
                type="button"
                onClick={handleCopy}
              >
                {copied ? "Copied" : "Copy code"}
              </button>
            ) : null}
          </div>

          <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-white/8 bg-[#020617]">
            {result ? (
              <PreviewFrame
                code={result.componentCode}
                viewport={{
                  width: selection?.imageWidth,
                  height: selection?.imageHeight,
                }}
              />
            ) : (
              <div className="p-5">
                <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#0b1120]">
                  <div className="flex items-center gap-2 border-b border-white/8 bg-[#111827] px-4 py-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                    <div className="ml-3 rounded-full border border-white/8 bg-black/20 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      generated-site.local
                    </div>
                  </div>
                  <div className="flex min-h-[28rem] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(51,65,85,0.28),_transparent_34%),linear-gradient(180deg,#0f172a_0%,#020617_100%)] p-8 text-center">
                    <div className="max-w-md">
                      <p className="text-lg font-medium text-slate-100">
                        Your generated page will render here.
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate-400">
                        The preview uses page chrome and a styled viewport so
                        the output reads like a website, not a flat layout
                        board.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 xl:w-[360px]">
          <section className="shadow-panel rounded-[1.75rem] border border-line bg-panel px-5 py-6 md:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Layout summary
            </p>
            <div className="mt-4 rounded-[1.25rem] border border-white/8 bg-[#0f172a] p-4">
              <p className="text-sm leading-7 text-slate-300">
                {result?.layoutDescription ??
                  "When generation finishes, the AI-written breakdown of the layout structure and spacing will appear here."}
              </p>
            </div>
            {result?.warnings.length ? (
              <div className="mt-4 rounded-[1.25rem] border border-amber-500/20 bg-amber-950/20 px-4 py-4">
                <p className="text-sm font-semibold text-amber-200">
                  Warnings
                </p>
                <ul className="mt-3 grid gap-2 text-sm text-amber-100/85">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className="shadow-panel rounded-[1.75rem] border border-white/8 bg-[#020617] px-5 py-6 text-white md:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Component output
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-100">
                  Copyable React source
                </h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                Tailwind only
              </span>
            </div>
            <div className="mt-5 overflow-hidden rounded-[1.25rem] border border-white/8 bg-black/25">
              <pre className="min-h-[28rem] overflow-x-auto p-4 text-sm leading-6 text-slate-200">
                <code>
                  {result?.componentCode ??
                    "// Generated React component will appear here after you submit an image."}
                </code>
              </pre>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-white/8 bg-[#0f172a] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-base font-semibold text-slate-100">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{detail}</p>
    </div>
  );
}
