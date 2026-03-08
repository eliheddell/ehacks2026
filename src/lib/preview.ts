function escapeClosingScriptTag(value: string) {
  return value.replace(/<\/script/gi, "<\\/script");
}

function stripCodeFences(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```[a-zA-Z]*\s*/u, "")
    .replace(/\s*```$/u, "")
    .trim();
}

export function normalizeComponentCode(value: string) {
  const trimmed = stripCodeFences(value);
  if (trimmed.includes("export default")) {
    return trimmed;
  }

  const namedFunction = trimmed.match(/function\s+([A-Z][A-Za-z0-9_]*)\s*\(/u);
  if (namedFunction) {
    return `${trimmed}\n\nexport default ${namedFunction[1]};`;
  }

  const namedConst = trimmed.match(/const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*/u);
  if (namedConst) {
    return `${trimmed}\n\nexport default ${namedConst[1]};`;
  }

  throw new Error("The generated component is missing a default export.");
}

export function transformComponentForPreview(source: string) {
  let normalized = normalizeComponentCode(source)
    .replace(/^\s*import\s.+?;?\s*$/gmu, "")
    .replace(/^["']use client["'];?\s*$/gmu, "")
    .trim();

  const namedDefaultFunction = normalized.match(
    /export\s+default\s+function\s+([A-Za-z0-9_]+)\s*\(/u,
  );
  if (namedDefaultFunction) {
    normalized = normalized.replace(
      /export\s+default\s+function\s+([A-Za-z0-9_]+)\s*\(/u,
      `function ${namedDefaultFunction[1]}(`,
    );

    return `${normalized}\n\nwindow.__GENERATED_COMPONENT__ = ${namedDefaultFunction[1]};`;
  }

  if (/export\s+default\s+function\s*\(/u.test(normalized)) {
    normalized = normalized.replace(
      /export\s+default\s+function\s*\(/u,
      "function GeneratedMockup(",
    );

    return `${normalized}\n\nwindow.__GENERATED_COMPONENT__ = GeneratedMockup;`;
  }

  const defaultIdentifier = normalized.match(
    /export\s+default\s+([A-Za-z0-9_]+)\s*;?/u,
  );
  if (defaultIdentifier) {
    normalized = normalized.replace(
      /export\s+default\s+([A-Za-z0-9_]+)\s*;?/u,
      "",
    );

    return `${normalized}\n\nwindow.__GENERATED_COMPONENT__ = ${defaultIdentifier[1]};`;
  }

  throw new Error("Unable to prepare the generated component for preview.");
}

export function buildPreviewDocument(source: string, previewId: string) {
  const executableSource = escapeClosingScriptTag(
    transformComponentForPreview(source),
  );
  const serializedPreviewId = JSON.stringify(previewId);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top, rgba(51, 65, 85, 0.35), transparent 30%),
          linear-gradient(180deg, #020617 0%, #0f172a 100%);
        color: #e2e8f0;
        font-family: "Segoe UI", Arial, sans-serif;
      }

      .viewport {
        display: flex;
        min-height: 100vh;
        align-items: stretch;
        justify-content: center;
        padding: 28px;
      }

      .browser {
        width: 100%;
        max-width: 1400px;
        overflow: hidden;
        border: 1px solid rgba(148, 163, 184, 0.14);
        border-radius: 22px;
        background: rgba(15, 23, 42, 0.92);
        box-shadow: 0 30px 80px rgba(2, 6, 23, 0.55);
      }

      .browser-bar {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 18px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.12);
        background: rgba(17, 24, 39, 0.94);
      }

      .dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: #475569;
      }

      .address {
        margin-left: 8px;
        padding: 7px 14px;
        border: 1px solid rgba(148, 163, 184, 0.12);
        border-radius: 999px;
        background: rgba(2, 6, 23, 0.45);
        color: #94a3b8;
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      .page-shell {
        padding: 18px;
        background:
          radial-gradient(circle at top, rgba(51, 65, 85, 0.18), transparent 28%),
          linear-gradient(180deg, #0f172a 0%, #020617 100%);
      }

      .page-canvas {
        min-height: calc(100vh - 140px);
        padding: 16px;
        border: 1px solid rgba(148, 163, 184, 0.12);
        border-radius: 24px;
        background:
          radial-gradient(circle at top, rgba(71, 85, 105, 0.16), transparent 24%),
          linear-gradient(180deg, #111827 0%, #0f172a 100%);
      }

      .component-stage {
        width: 100%;
        min-height: calc(100vh - 184px);
        overflow: hidden;
        border: 1px solid rgba(148, 163, 184, 0.14);
        border-radius: 28px;
        background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.98));
        box-shadow:
          0 26px 80px rgba(2, 6, 23, 0.48),
          inset 0 1px 0 rgba(255, 255, 255, 0.03);
      }

      .component-stage > * {
        width: 100%;
        min-height: calc(100vh - 184px);
      }

      .preview-polish {
        width: 100%;
        min-height: calc(100vh - 184px);
        background:
          radial-gradient(circle at top, rgba(71, 85, 105, 0.18), transparent 26%),
          linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.98));
        color: #e2e8f0;
      }

      .preview-polish > * {
        width: 100%;
        min-height: calc(100vh - 184px);
      }

      :where(.preview-polish h1, .preview-polish h2, .preview-polish h3, .preview-polish h4) {
        letter-spacing: -0.03em;
      }

      :where(.preview-polish p, .preview-polish span, .preview-polish li, .preview-polish label) {
        color: #cbd5e1;
      }

      :where(.preview-polish button, .preview-polish a[role="button"]) {
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 999px;
        box-shadow: 0 12px 30px rgba(2, 6, 23, 0.28);
      }

      :where(.preview-polish input, .preview-polish textarea, .preview-polish select) {
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 16px;
        background: rgba(15, 23, 42, 0.72);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
      }

      :where(.preview-polish section, .preview-polish article, .preview-polish aside, .preview-polish nav) {
        border-color: rgba(148, 163, 184, 0.14);
      }

      :where(.preview-polish .card, .preview-polish [class*="shadow"], .preview-polish [class*="rounded-2"], .preview-polish [class*="rounded-3"]) {
        box-shadow: 0 18px 40px rgba(2, 6, 23, 0.24);
      }
    </style>
  </head>
  <body>
    <div class="viewport">
      <div class="browser">
        <div class="browser-bar">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
          <div class="address">generated-site.local</div>
        </div>
        <div class="page-shell">
          <div id="root" class="page-canvas"></div>
        </div>
      </div>
    </div>
    <script>
      const previewId = ${serializedPreviewId};
      const report = (type, payload = {}) => {
        window.parent.postMessage(
          { source: "wireframe-preview", previewId, type, payload },
          "*",
        );
      };
      window.addEventListener("error", (event) => {
        report("error", {
          message: event.error?.message || event.message || "Preview failed.",
        });
      });
    </script>
    <script type="text/babel" data-presets="react">
      try {
${executableSource}
        const Component = window.__GENERATED_COMPONENT__;
        if (!Component) {
          throw new Error("Generated preview is missing a default component.");
        }

        const root = ReactDOM.createRoot(document.getElementById("root"));
        root.render(
          <div className="component-stage">
            <div className="preview-polish">
              <Component />
            </div>
          </div>,
        );
        report("ready");
      } catch (error) {
        report("error", {
          message: error?.message || "Preview failed.",
        });
        document.body.innerHTML =
          '<div style="display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;background:#020617;color:#fecaca;font:14px/1.6 sans-serif;text-align:center;">' +
          String(error?.message || "Preview failed.") +
          "</div>";
      }
    </script>
  </body>
</html>`;
}
