import "server-only";

import { createHash } from "node:crypto";

import type {
  ImmoScout24DeImageItemV1,
} from "./immoscout24-de-image-package.server";

type LoadedImage = ImmoScout24DeImageItemV1 & {
  bytes: Uint8Array;
  sizeBytes: number;
};

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Erstellt den Multipart-Inhalt fuer genau ein Bild.
 *
 * Keine API-Anfrage, keine OAuth-Tokens,
 * keine Datenbankoperationen.
 */
export function buildImmoScout24DeImageMultipartV1(
  image: LoadedImage
): {
  formData: FormData;
  externalId: string;
  checksum: string;
  titlePicture: boolean;
} {
  if (
    !image.id ||
    !image.storageKey ||
    !Number.isSafeInteger(image.order) ||
    image.order < 1 ||
    !image.bytes ||
    image.bytes.byteLength === 0 ||
    image.bytes.byteLength !== image.sizeBytes
  ) {
    fail("IMMOSCOUT24_DE_MULTIPART_INPUT_INVALID");
  }

  // Zunaechst nur JPEG und PNG:
  // WebP muss vor dem Portal-Upload konvertiert werden.
  if (
    image.mimeType !== "image/jpeg" &&
    image.mimeType !== "image/png"
  ) {
    fail("IMMOSCOUT24_DE_MULTIPART_FORMAT_UNSUPPORTED");
  }

  const safeFileName = image.fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);

  if (!safeFileName) {
    fail("IMMOSCOUT24_DE_MULTIPART_FILENAME_INVALID");
  }

  const checksum = createHash("sha256")
    .update(image.bytes)
    .digest("hex");

  const externalId = `iai-${createHash("sha256")
    .update(image.id + ":" + image.storageKey)
    .digest("hex")
    .slice(0, 24)}`;

  const title = escapeXml(
    safeFileName.replace(/\.[^.]+$/, "").slice(0, 30)
  );

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<common:attachment',
    ' xmlns:common="http://rest.immobilienscout24.de/schema/common/1.0"',
    ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    ' xsi:type="common:Picture">',
    `<title>${title}</title>`,
    `<externalId>${externalId}</externalId>`,
    `<externalCheckSum>${checksum}</externalCheckSum>`,
    '<floorplan>false</floorplan>',
    `<titlePicture>${image.isTitleImage}</titlePicture>`,
    '</common:attachment>',
  ].join("");

  const formData = new FormData();

  formData.append(
    "attachment",
    new Blob(
      [new Uint8Array(image.bytes)],
      { type: image.mimeType }
    ),
    safeFileName
  );

  formData.append(
    "metadata",
    new Blob([xml], { type: "application/xml" }),
    "body.xml"
  );

  return {
    formData,
    externalId,
    checksum,
    titlePicture: image.isTitleImage,
  };
}