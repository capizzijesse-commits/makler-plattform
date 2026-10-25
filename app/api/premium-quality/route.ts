import { describePremiumQualityReasons } from "@/lib/premium-quality-gate.server";
import { readPremiumAssessment } from "@/lib/premium-quality-store.server";
import { canUseListingCoreForUser } from "@/lib/listing-access";
import type { AutopilotImageCandidate } from "@/lib/autopilot-image-quality";
import OpenAI from "openai";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { checkAndRecordPremiumQuality, premiumImagesFromBytes, premiumSources, premiumSourceContext, isListingPremiumQualityReady } from "@/lib/premium-quality.server";
import type { PremiumFacts } from "@/lib/premium-quality-gate.server";
import type { ListingTextVariant } from "@/lib/listing-text-quality";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ ready: false }, { status: 401 });
  try {
    const listingId = new URL(request.url).searchParams.get("listingId") ?? "";
    const ready = await isListingPremiumQualityReady(user.id, listingId);
    return NextResponse.json({ ready, status: ready ? "READY" : "REVIEW_REQUIRED" }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ ready: false, status: "BLOCKED" }, { status: 503 }); }
}
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ ready: false }, { status: 401 });
  try {
    if (process.env.NODE_ENV !== "development" && !await canUseListingCoreForUser({ userId: user.id, plan: user.plan })) return NextResponse.json({ ready: false, status: "BLOCKED", error: "LISTING_ACCESS_REQUIRED" }, { status: 403 });
    const form = await request.formData();
    if(form.has("reviewAssessmentId")){
      const {createAutopilotImageReviewDraft}=await import("@/lib/autopilot-review-handoff.server");
      const files=form.getAll("reviewImages").filter((x):x is File=>x instanceof File);
      const draft=await createAutopilotImageReviewDraft(user.id,form.get("reviewAssessmentId"),files,user.plan);
      return NextResponse.json({success:true,code:"AUTOPILOT_IMAGE_REVIEW_REQUIRED",...draft});
    }
    const facts = JSON.parse(String(form.get("facts"))) as PremiumFacts;
    const variants = JSON.parse(String(form.get("variants"))) as ListingTextVariant[];
    if (!facts || !Array.isArray(variants) || variants.length !== 3 || variants.some(v => !v || typeof v.title !== "string" || typeof v.text !== "string")) throw new Error("PREMIUM_INPUT_INVALID");
    const files = form.getAll("images").filter((file): file is File => file instanceof File);
    const receiptIds: unknown = JSON.parse(String(form.get("imageAssessmentIds") ?? "null"));
    if ((!files.length && !Array.isArray(receiptIds)) || files.length > 20 || files.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size <= 0 || file.size > 10 * 1024 * 1024)) throw new Error("PREMIUM_IMAGES_INVALID");
    const sourceAudit = await premiumSources(user.id, form.get("sourceAssessmentId"), facts, form.get("manualConfirmed") === "true");
    // Client fields never grant feature authorization without a recorded source.
    if (!sourceAudit.sources.length) throw new Error("PREMIUM_SOURCE_AUDIT_REQUIRED");
    facts.verifiedFeatures = typeof facts.highlights === "string" ? facts.highlights : "";
    let images: AutopilotImageCandidate[];
    if (Array.isArray(receiptIds)) {
      if (files.length || !receiptIds.length || receiptIds.length > 20 || new Set(receiptIds).size !== receiptIds.length) throw new Error("PREMIUM_IMAGE_RECEIPTS_INVALID");
      images = [];
      for (let index = 0; index < receiptIds.length; index++) {
        const receipt = await readPremiumAssessment(user.id, receiptIds[index], "image");
        if (!receipt) throw new Error("PREMIUM_IMAGE_RECEIPT_MISSING");
        const payload = receipt.payload as unknown as { image: AutopilotImageCandidate };
        // A verified receipt is explicitly rebound to this request's identity.
        // The immutable receipt retains the original request identity.
        images.push({ ...payload.image, imageId: String(index + 1), analysis: { ...payload.image.analysis, ...(payload.image.analysis.imageId !== undefined ? { imageId: String(index + 1) } : {}), imageIndex: index + 1 } });
      }
    } else images = await premiumImagesFromBytes(await Promise.all(files.map(async file => ({ name: file.name, type: file.type, bytes: Buffer.from(await file.arrayBuffer()) }))));
    const decision = await checkAndRecordPremiumQuality({ userId: user.id, facts, variants, sourceAudit, sourceContext: await premiumSourceContext(user.id, form.get("sourceAssessmentId")), images, openai: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) });
    return NextResponse.json({ ...decision, error: decision.ready ? undefined : describePremiumQualityReasons(decision.reasons) }, { status: decision.ready ? 200 : 422 });
  } catch (error) {
    return NextResponse.json({ ready: false, status: "BLOCKED", error: error instanceof Error ? error.message : "PREMIUM_QUALITY_FAILED" }, { status: 422 });
  }
}
