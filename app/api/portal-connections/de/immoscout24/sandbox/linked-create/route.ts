import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";
import { isBrokerMarketingApproved } from "@/lib/broker-workflow/marketing-approval-guard.server";
import { mapPrismaListingToPortal } from "@/lib/portal-integrations/prisma-listing-adapter";
import { buildImmoScout24DeApartmentBuyDryRun } from "@/lib/portal-integrations/immoscout24-de-payload.server";
import { getImmoScout24DeOAuthConfig } from "@/lib/portal-integrations/immoscout24-de-oauth.server";
import { getImmoScout24DeSandboxAccess } from "@/lib/portal-integrations/immoscout24-de-oauth-flow.server";
import { runImmoScout24DeCreateSandboxV1 } from "@/lib/portal-integrations/immoscout24-de-create-workflow.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SANDBOX_BASE_URL = "https://rest.sandbox-immobilienscout24.de";
const CONFIRMATION = "CREATE_LINKED_IMMOSCOUT24_SANDBOX_OBJECT";

function response(body: Record<string, unknown>, status: number) {
  const result = NextResponse.json(
    { ...body, environment: "sandbox", productionEnabled: false, published: false },
    { status }
  );
  result.headers.set("Cache-Control", "no-store");
  return result;
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

/**
 * PREVIEW ONLY: Persistiert eine eindeutige Zuordnung zu einem INACTIVE
 * Sandbox-Objekt. Kein Bild-Upload, kein Publish, kein Wiederholungs-POST.
 * Nicht fuer produktive Maklerobjekte oder den allgemeinen Worker freigeben.
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return response({ success: false, error: "SAME_ORIGIN_REQUIRED" }, 403);
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return response({ success: false, error: "UNAUTHORIZED" }, 401);
  }

  // Deployment- und Feature-Gate werden vor jedem Datenbank-/Provider-Write geprueft.
  const previewOnly =
    process.env.VERCEL_ENV === "preview" ||
    (!process.env.VERCEL_ENV && process.env.NODE_ENV === "development");

  if (!previewOnly || process.env.IMMOSCOUT24_DE_LINKED_CREATE_ENABLED !== "1") {
    return response({ success: false, error: "SANDBOX_LINKED_CREATE_DISABLED" }, 409);
  }

  try {
    const config = getImmoScout24DeOAuthConfig();
    if (config.environment !== "sandbox" || config.baseUrl !== SANDBOX_BASE_URL) {
      return response({ success: false, error: "SANDBOX_ONLY" }, 409);
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return response({ success: false, error: "INVALID_JSON" }, 400);
    }

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return response({ success: false, error: "INVALID_BODY" }, 400);
    }

    const body = raw as Record<string, unknown>;
    const listingId =
      typeof body.listingId === "string" ? body.listingId.trim() : "";

    if (!listingId) {
      return response({ success: false, error: "LISTING_ID_REQUIRED" }, 400);
    }

    if (
      body.confirmation !== CONFIRMATION ||
      body.useSandboxTestAddress !== true
    ) {
      return response(
        {
          success: false,
          error: "EXPLICIT_SANDBOX_CONFIRMATION_REQUIRED",
          requiredConfirmation: CONFIRMATION,
        },
        400
      );
    }

    const connection = await prisma.portalConnection.findFirst({
      where: {
        userId: user.id,
        portal: "immoscout24_de",
        environment: "test",
        status: "verified",
      },
      select: { id: true },
    });

    if (!connection) {
      return response(
        { success: false, error: "VERIFIED_SANDBOX_CONNECTION_REQUIRED" },
        409
      );
    }

    const existing = await prisma.immoScout24DeObjectLink.findFirst({
      where: {
        userId: user.id,
        listingId,
        connectionId: connection.id,
      },
      select: { status: true },
    });

    // Auch nach Timeout oder ungewissem HTTP-Status niemals blind erneut CREATE.
    if (existing) {
      return response(
        { success: false, error: "OBJECT_LINK_ALREADY_EXISTS", linkStatus: existing.status },
        409
      );
    }

    const listing = await prisma.listing.findFirst({
      where: {
        id: listingId,
        userId: user.id,
        archivedAt: null,
        countryCode: "DE",
        unlockStatus: { in: ["paid", "included"] },
      },
      include: {
        finance: true,
        images: {
          orderBy: [
            { isPrimary: "desc" },
            { position: "asc" },
            { createdAt: "asc" },
          ],
        },
      },
    });

    if (!listing) {
      return response({ success: false, error: "ELIGIBLE_DE_LISTING_NOT_FOUND" }, 404);
    }

    if (!listing.images.length || !(await isBrokerMarketingApproved({
      userId: user.id,
      listingId,
    }))) {
      return response({ success: false, error: "LISTING_APPROVAL_REQUIRED" }, 409);
    }

    const access = await getImmoScout24DeSandboxAccess(user.id);
    if (!access) {
      return response({ success: false, error: "SANDBOX_OAUTH_REQUIRED" }, 409);
    }

    // Deterministisch pro Konto und Inserat: keine neuen IDs bei Wiederholungsversuchen.
    const externalId = "sbx-" + createHash("sha256")
      .update(connection.id + ":" + listing.id)
      .digest("hex")
      .slice(0, 24);

    const normalized = mapPrismaListingToPortal(listing, "de");
    const testListing = {
      ...normalized,
      referenceId: externalId,
      address: {
        ...normalized.address,
        street: "Invalidenstrasse",
        streetNumber: "65",
        postalCode: "10557",
        locality: "Berlin",
        countryCode: "DE",
      },
    };

    const payload = buildImmoScout24DeApartmentBuyDryRun({
      listing: testListing,
      commissionRate: listing.finance?.commissionRate ?? null,
    });

    if (!payload.ready || !payload.xml) {
      return response(
        { success: false, error: "SANDBOX_PAYLOAD_NOT_READY", validationErrors: payload.errors },
        422
      );
    }

    // Reservierung -> CREATE -> persistierte Objekt-ID oder UNCERTAIN.
    // Die Workflow-Unique-Constraints schuetzen auch gegen parallele Requests.
    const result = await runImmoScout24DeCreateSandboxV1({
      userId: user.id,
      listingId,
      connectionId: connection.id,
      externalId,
      xml: payload.xml,
      accessToken: access.accessToken,
      accessTokenSecret: access.accessTokenSecret,
      allowSandboxWrite: true,
    });

    return response(
      {
        success: true,
        objectCreated: true,
        objectLinkId: result.linkId,
        externalObjectId: result.externalObjectId,
        objectLinkStatus: result.status,
        sandboxTestAddressApplied: true,
        databaseModified: true,
        nextStep: "IMAGE_UPLOAD_AND_READBACK_REQUIRED",
      },
      201
    );
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error &&
      typeof error.code === "string"
        ? error.code
        : "SANDBOX_CREATE_RECONCILIATION_REQUIRED";

    // Keine OAuth-Secrets, XML-Payloads oder ungeprueften Fehlermeldungen ausgeben.
    console.error("[immoscout24-de] linked sandbox create blocked:", code);
    return response(
      {
        success: false,
        error: code.startsWith("IMMOSCOUT24_DE_") ? code : "SANDBOX_CREATE_RECONCILIATION_REQUIRED",
        retrySafe: false,
        nextStep: "CHECK_OBJECT_LINK_BEFORE_RETRY",
      },
      409
    );
  }
}
