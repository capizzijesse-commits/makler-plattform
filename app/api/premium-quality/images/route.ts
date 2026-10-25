import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { canUseListingCoreForUser } from "@/lib/listing-access";
import { premiumImagesFromBytes } from "@/lib/premium-quality.server";
import { savePremiumAssessment } from "@/lib/premium-quality-store.server";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ success: false }, { status: 401 });
  try {
    if (process.env.NODE_ENV !== "development" && !await canUseListingCoreForUser({ userId: user.id, plan: user.plan })) return NextResponse.json({ success: false, error: "LISTING_ACCESS_REQUIRED" }, { status: 403 });
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size || file.size > 3 * 1024 * 1024) throw new Error("PREMIUM_IMAGE_INPUT_INVALID");
    const [image] = await premiumImagesFromBytes([{ name: file.name, type: file.type, bytes: Buffer.from(await file.arrayBuffer()) }]);
    const record = await savePremiumAssessment(user.id, "image", { image });
    return NextResponse.json({ success: true, assessmentId: record.id });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "IMAGE_AUDIT_FAILED" }, { status: 422 }); }
}
