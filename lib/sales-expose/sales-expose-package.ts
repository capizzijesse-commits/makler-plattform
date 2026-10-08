import "client-only";

import {
  strToU8,
  zipSync,
} from "fflate";

import type {
  SalesExposeDocument,
  SalesExposeVariant,
} from "./sales-expose-document";

import {
  buildSalesExposePdfBlob,
} from "./sales-expose-pdf";

import {
  buildUniversalPropertyModel,
} from "@/lib/portal-package/universal-property";

type PackageInput = {
  document: SalesExposeDocument;
  imageFiles: File[];
  variants: SalesExposeVariant[];
};

function safeName(
  value: string
): string {
  return (
    value
      .normalize("NFKD")
      .replace(
        /[^a-zA-Z0-9._-]+/g,
        "-"
      )
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") ||
    "Immobilie"
  );
}

function buildFactsText(
  document: SalesExposeDocument
): string {
  const facts =
    document.facts;

  return [
    "INSERAT-AI OBJEKTDATEN",
    "",
    `Titel: ${document.title || ""}`,
    `Untertitel: ${document.subtitle || ""}`,
    "",
    `Land: ${facts.countryCode || ""}`,
    `Straße: ${facts.street || ""}`,
    `PLZ: ${facts.postalCode || ""}`,
    `Ort: ${facts.location || ""}`,
    `Objektart: ${facts.propertyType || ""}`,
    `Zimmer: ${facts.rooms || ""}`,
    `Wohnfläche: ${facts.livingArea || ""}`,
    `Preis: ${facts.price || ""}`,
    "",
    "Highlights:",
    facts.highlights || "",
    "",
    "Zusammenfassung / Stil:",
    facts.styleText || "",
  ].join("\r\n");
}

function buildVariantText(
  variant: SalesExposeVariant,
  index: number
): string {
  return [
    `INSERAT-AI TEXTVARIANTE ${index + 1}`,
    "",
    "TITEL",
    variant.title || "",
    "",
    "INSERATTEXT",
    variant.text || "",
    "",
    "HIGHLIGHTS",
    Array.isArray(
      variant.highlights
    )
      ? variant.highlights.join(
          "\r\n"
        )
      : "",
  ].join("\r\n");
}

export async function downloadSalesExposePackage(
  input: PackageInput
): Promise<void> {
  const {
    document,
    imageFiles,
    variants,
  } =
    input;

  const {
    blob: pdfBlob,
    fileName: pdfFileName,
  } =
    await buildSalesExposePdfBlob(
      document,
      imageFiles
    );

  const files:
    Record<string, Uint8Array> =
    {};

  files[pdfFileName] =
    new Uint8Array(
      await pdfBlob.arrayBuffer()
    );

  files["Objektdaten.txt"] =
    strToU8(
      buildFactsText(
        document
      )
    );

  files["Objektdaten.json"] =
    strToU8(
      JSON.stringify(
        {
          generatedAt:
            document.generatedAt,
          title:
            document.title,
          subtitle:
            document.subtitle,
          facts:
            document.facts,
          highlights:
            document.highlights,
          variants,
          imageAnalysis:
            document.images,
        },
        null,
        2
      )
    );

  const portalData =
    buildUniversalPropertyModel(
      document,
      variants
    );

  files["portal-data.json"] =
    strToU8(
      JSON.stringify(
        portalData,
        null,
        2
      )
    );

  files["Bildanalyse.json"] =
    strToU8(
      JSON.stringify(
        document.images,
        null,
        2
      )
    );

  variants.forEach(
    (
      variant,
      index
    ) => {
      files[
        `Texte/Variante-${index + 1}.txt`
      ] =
        strToU8(
          buildVariantText(
            variant,
            index
          )
        );
    }
  );

  for (
    let index = 0;
    index < imageFiles.length;
    index += 1
  ) {
    const file =
      imageFiles[index];

    const extension =
      file.name.includes(".")
        ? "." +
          file.name
            .split(".")
            .pop()
        : "";

    const baseName =
      safeName(
        file.name.replace(
          /\.[^.]+$/,
          ""
        )
      );

    const number =
      String(index + 1)
        .padStart(
          2,
          "0"
        );

    files[
      `Bilder/${number}-${baseName}${extension}`
    ] =
      new Uint8Array(
        await file.arrayBuffer()
      );
  }

  const zipped =
    zipSync(
      files,
      {
        level: 6,
      }
    );

  const zipBlob =
    new Blob(
      [zipped],
      {
        type:
          "application/zip",
      }
    );

  const location =
    safeName(
      document.facts.location ||
        document.title ||
        "Immobilie"
    );

  const url =
    URL.createObjectURL(
      zipBlob
    );

  try {
    const anchor =
      window.document.createElement(
        "a"
      );

    anchor.href =
      url;

    anchor.download =
      `Inserat-AI-${location}.zip`;

    window.document.body.appendChild(
      anchor
    );

    anchor.click();
    anchor.remove();
  } finally {
    window.setTimeout(
      () => {
        URL.revokeObjectURL(
          url
        );
      },
      1000
    );
  }
}
