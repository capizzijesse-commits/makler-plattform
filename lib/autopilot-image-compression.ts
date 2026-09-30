const MAX_AUTOPILOT_IMAGE_DIMENSION = 2048;
const AUTOPILOT_JPEG_QUALITY = 0.85;

const COMPRESSIBLE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function prepareAutopilotImageForUpload(
  file: File
): Promise<File> {
  if (
    !COMPRESSIBLE_IMAGE_TYPES.has(file.type) ||
    typeof createImageBitmap !== "function" ||
    typeof document === "undefined"
  ) {
    return file;
  }

  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
  } catch {
    return file;
  }

  try {
    const longestSide = Math.max(
      bitmap.width,
      bitmap.height
    );

    const scale = Math.min(
      1,
      MAX_AUTOPILOT_IMAGE_DIMENSION /
        longestSide
    );

    const width = Math.max(
      1,
      Math.round(bitmap.width * scale)
    );

    const height = Math.max(
      1,
      Math.round(bitmap.height * scale)
    );

    const canvas =
      document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const context =
      canvas.getContext("2d");

    if (!context) {
      return file;
    }

    context.drawImage(
      bitmap,
      0,
      0,
      width,
      height
    );

    const optimizedBlob =
      await new Promise<Blob | null>(
        (resolve) => {
          canvas.toBlob(
            resolve,
            "image/jpeg",
            AUTOPILOT_JPEG_QUALITY
          );
        }
      );

    if (
      !optimizedBlob ||
      optimizedBlob.size <= 0 ||
      optimizedBlob.size >= file.size
    ) {
      return file;
    }

    const baseName =
      file.name.replace(/\.[^.]+$/, "");

    return new File(
      [optimizedBlob],
      `${baseName}.jpg`,
      {
        type: "image/jpeg",
        lastModified:
          file.lastModified,
      }
    );
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}
