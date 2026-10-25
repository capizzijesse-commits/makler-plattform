import sharp from "sharp";
import { detectPageImageRegions } from "@/lib/pdf-page-regions.server";
import { detectCollageRegions } from "@/lib/pdf-collage-splitter.server";

export type SegmentedPageImage = {
  buffer: Buffer;
  width: number;
  height: number;
};

export async function segmentEmbeddedPdfPage(
  source: Buffer
): Promise<SegmentedPageImage[] | null> {
  try {
    const regions = await detectPageImageRegions(source);

    // Nur eindeutige mehrteilige Seiten weiterverarbeiten.
    if (regions.length < 2 || regions.length > 12) {
      return null;
    }

    const images: SegmentedPageImage[] = [];

    for (const region of regions) {
      const regionBuffer = await sharp(source)
        .extract(region)
        .jpeg({ quality: 90 })
        .toBuffer();

      const split = await detectCollageRegions(regionBuffer);

      if (
        split.regions.length < 1 ||
        split.regions.length > 12
      ) {
        return null;
      }

      for (const part of split.regions) {
        if (part.width < 90 || part.height < 65) {
          return null;
        }

        const buffer = await sharp(regionBuffer)
          .extract(part)
          .jpeg({ quality: 85 })
          .toBuffer();

        const metadata = await sharp(buffer).metadata();

        if (!metadata.width || !metadata.height) {
          return null;
        }

        images.push({
          buffer,
          width: metadata.width,
          height: metadata.height,
        });

        if (images.length > 12) {
          return null;
        }
      }
    }

    return images.length >= 3 ? images : null;
  } catch (error) {
    console.warn("[PDF PAGE SEGMENTATION] skipped", {
      message:
        error instanceof Error
          ? error.message
          : String(error),
    });

    return null;
  }
}