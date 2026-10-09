import "server-only";

import {
  getObjectBytes,
  headObject,
} from "@/lib/storage/storage.server";

const MAX_IMAGES = 30;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

type ListingImageInput = {
  id: string;
  storageKey: string;
  fileName: string | null;
  mimeType: string | null;
  position: number;
  isPrimary: boolean;
};

export type ImmoScout24DeImageItemV1 = {
  id: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  order: number;
  isTitleImage: boolean;
};

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}

function detectMime(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 137 &&
    bytes[1] === 80 &&
    bytes[2] === 78 &&
    bytes[3] === 71 &&
    bytes[4] === 13 &&
    bytes[5] === 10 &&
    bytes[6] === 26 &&
    bytes[7] === 10
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

export function prepareImmoScout24DeImagePackageV1(
  images: ListingImageInput[]
): ImmoScout24DeImageItemV1[] {
  if (
    !Array.isArray(images) ||
    images.length === 0 ||
    images.length > MAX_IMAGES
  ) {
    fail("IMMOSCOUT24_DE_IMAGE_COUNT_INVALID");
  }

  const ids = new Set<string>();
  const keys = new Set<string>();

  for (const image of images) {
    if (
      !image.id?.trim() ||
      !image.storageKey?.trim() ||
      !Number.isSafeInteger(image.position) ||
      image.position < 0 ||
      ids.has(image.id) ||
      keys.has(image.storageKey)
    ) {
      fail("IMMOSCOUT24_DE_IMAGE_INPUT_INVALID");
    }

    ids.add(image.id);
    keys.add(image.storageKey);
  }

  const primaryCount = images.filter(
    (image) => image.isPrimary
  ).length;

  if (primaryCount > 1) {
    fail("IMMOSCOUT24_DE_MULTIPLE_TITLE_IMAGES");
  }

  const ordered = [...images].sort(
    (a, b) =>
      Number(b.isPrimary) - Number(a.isPrimary) ||
      a.position - b.position ||
      a.id.localeCompare(b.id)
  );

  return ordered.map((image, index) => {
    const declaredMime = image.mimeType
      ?.toLowerCase()
      .trim();

    if (
      declaredMime &&
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(declaredMime)
    ) {
      fail("IMMOSCOUT24_DE_IMAGE_MIME_UNSUPPORTED");
    }

    const fallbackMime = declaredMime ?? "image/jpeg";
    const extension =
      fallbackMime === "image/png"
        ? ".png"
        : fallbackMime === "image/webp"
          ? ".webp"
          : ".jpg";

    const rawName = (image.fileName ?? "")
      .split(/[\\/]/)
      .pop() ?? "";

    const safeName = rawName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 120);

    return {
      id: image.id,
      storageKey: image.storageKey,
      fileName:
        safeName || `image_${index + 1}${extension}`,
      mimeType: declaredMime ?? "",
      order: index + 1,
      isTitleImage:
        index === 0,
    };
  });
}

/**
 * Liest genau ein Bild aus dem internen Speicher.
 * Vor dem Lesen wird die Dateigroesse geprueft.
 *
 * Kein HTTP-Aufruf an ImmoScout24.
 */
export async function readImmoScout24DeImageV1(
  image: ImmoScout24DeImageItemV1
) {
  const metadata = await headObject(image.storageKey);

  if (
    !Number.isFinite(metadata.size) ||
    metadata.size <= 0 ||
    metadata.size > MAX_IMAGE_BYTES
  ) {
    fail("IMMOSCOUT24_DE_IMAGE_SIZE_INVALID");
  }

  const bytes = await getObjectBytes(image.storageKey);

  if (
    bytes.byteLength === 0 ||
    bytes.byteLength > MAX_IMAGE_BYTES ||
    bytes.byteLength !== metadata.size
  ) {
    fail("IMMOSCOUT24_DE_IMAGE_BYTES_INVALID");
  }

  const detectedMime = detectMime(bytes);

  if (!detectedMime) {
    fail("IMMOSCOUT24_DE_IMAGE_CONTENT_UNSUPPORTED");
  }

  if (
    image.mimeType &&
    image.mimeType !== detectedMime
  ) {
    fail("IMMOSCOUT24_DE_IMAGE_MIME_MISMATCH");
  }

  return {
    ...image,
    mimeType: detectedMime,
    bytes,
    sizeBytes: bytes.byteLength,
  };
}