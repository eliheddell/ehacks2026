export type GenerationStatus =
  | "idle"
  | "ready"
  | "uploading"
  | "analyzing"
  | "generating"
  | "done"
  | "error";

export type GenerationResult = {
  layoutDescription: string;
  componentCode: string;
  warnings: string[];
};

export type ImageSelection = {
  file: File;
  previewUrl: string;
  source: "upload" | "paste";
  imageWidth: number;
  imageHeight: number;
};
