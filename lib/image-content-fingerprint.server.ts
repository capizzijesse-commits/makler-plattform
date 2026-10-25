import { createHash } from "node:crypto";
import sharp from "sharp";

export type ImageComparisonEvidence = { width: number; height: number; samples: string };
// Supplemental evidence only. The exact fingerprint remains the version binding.
// Small full-frame samples tolerate compression; they never identify a room.
export async function imageComparisonEvidence(bytes: Buffer): Promise<ImageComparisonEvidence> {
  const image=sharp(bytes,{limitInputPixels:40_000_000});
  const metadata=await image.metadata();
  if((metadata.pages??1)!==1)throw Error('AUTOPILOT_IMAGE_MULTIPAGE_UNSUPPORTED');
  const {data,info}=await image.rotate().toColourspace('srgb').removeAlpha().raw().toBuffer({resolveWithObject:true});
  const samples=await sharp(data,{raw:{width:info.width,height:info.height,channels:info.channels}}).resize(32,32,{fit:'fill'}).removeAlpha().raw().toBuffer();
  return {width:info.width,height:info.height,samples:samples.toString('hex')};
}

// Exact decoded pixels only: no perceptual threshold that could merge
// different views of the same room. Decode a copy; never write originals.
export async function fingerprintImageContent(bytes: Buffer): Promise<string> {
  const image = sharp(bytes, { limitInputPixels: 40_000_000 });
  const metadata = await image.metadata();
  if ((metadata.pages ?? 1) !== 1) throw new Error("AUTOPILOT_IMAGE_MULTIPAGE_UNSUPPORTED");
  const { data, info } = await image.rotate().toColourspace("srgb").ensureAlpha()
    .raw().toBuffer({ resolveWithObject: true });
  return createHash("sha256").update(info.width + "x" + info.height + ":" + info.channels + ":")
    .update(data).digest("hex");
}
