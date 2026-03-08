export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg"] as const;
export const MAX_IMAGE_SIZE_BYTES = 6 * 1024 * 1024;

type ClipboardFileLike = {
  type: string;
};

type ClipboardItemLike = {
  kind: string;
  type: string;
  getAsFile?: () => File | null;
};

type ClipboardDataLike = {
  files?: ArrayLike<File>;
  items?: ArrayLike<ClipboardItemLike>;
};

export function validateImageFile(file: ClipboardFileLike & { size: number }) {
  if (
    !ACCEPTED_IMAGE_TYPES.includes(
      file.type as (typeof ACCEPTED_IMAGE_TYPES)[number],
    )
  ) {
    return "Use a PNG or JPG image.";
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "Keep the image under 6 MB.";
  }

  return null;
}

export function extractImageFileFromClipboardData(
  clipboardData: ClipboardDataLike | null | undefined,
) {
  if (!clipboardData) {
    return null;
  }

  const files = Array.from(clipboardData.files ?? []);
  const matchingFile = files.find((file) => file.type.startsWith("image/"));
  if (matchingFile) {
    return matchingFile;
  }

  const items = Array.from(clipboardData.items ?? []);
  for (const item of items) {
    if (item.kind !== "file" || !item.type.startsWith("image/")) {
      continue;
    }

    const file = item.getAsFile?.();
    if (file) {
      return file;
    }
  }

  return null;
}

export function readImageDimensions(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      });
    };

    image.onerror = () => reject(new Error("Unable to read image dimensions."));
    image.src = src;
  });
}
