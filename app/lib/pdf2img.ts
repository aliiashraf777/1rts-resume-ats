import type * as PdfjsLibType from "pdfjs-dist";

let pdfjsLib: typeof PdfjsLibType | null = null;

async function getPdfJs(): Promise<typeof PdfjsLibType> {
  if (pdfjsLib) return pdfjsLib;
  const lib = await import("pdfjs-dist");
  lib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).href;
  pdfjsLib = lib;
  return lib;
}

export interface PdfConversionResult {
  imageUrl: string;
  file: File | null;
  error?: string;
}

export async function convertPdfToImage(file: File): Promise<PdfConversionResult> {
  try {
    const lib = await getPdfJs();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 4 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      return { imageUrl: "", file: null, error: "Failed to get canvas context" };
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    await page.render({ canvasContext: context, viewport, canvas }).promise;

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const originalName = file.name.replace(/\.pdf$/i, "");
            const imageFile = new File([blob], `${originalName}.png`, { type: "image/png" });
            resolve({ imageUrl: URL.createObjectURL(blob), file: imageFile });
          } else {
            resolve({ imageUrl: "", file: null, error: "Failed to create image blob" });
          }
        },
        "image/png",
        1.0
      );
    });
  } catch (err) {
    return { imageUrl: "", file: null, error: `Failed to convert PDF: ${err}` };
  }
}