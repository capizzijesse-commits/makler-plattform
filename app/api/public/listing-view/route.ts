import { createHash } from "node:crypto";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const DUPLICATE_WINDOW_MS =
  30 * 60 * 1000;

const BOT_PATTERN =
  /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|headless/i;

const ALLOWED_SOURCES =
  new Set([
    "direct",
    "social",
    "whatsapp",
    "email",
    "website",
    "immobilienscout24",
    "immowelt",
    "other",
  ]);

function normalizeSource(
  value: unknown
): string {
  if (typeof value !== "string") {
    return "direct";
  }

  const normalized =
    value
      .trim()
      .toLowerCase();

  return ALLOWED_SOURCES.has(
    normalized
  )
    ? normalized
    : "other";
}

function getReferrerHost(
  request: NextRequest
): string | null {
  const referrer =
    request.headers.get("referer");

  if (!referrer) {
    return null;
  }

  try {
    return new URL(
      referrer
    ).hostname
      .toLowerCase()
      .slice(0, 190);
  } catch {
    return null;
  }
}

function getDeviceType(
  userAgent: string
): string {
  if (
    /ipad|tablet/i.test(
      userAgent
    )
  ) {
    return "tablet";
  }

  if (
    /iphone|android|mobile/i.test(
      userAgent
    )
  ) {
    return "mobile";
  }

  return "desktop";
}

export async function POST(
  request: NextRequest
) {
  try {
    const userAgent =
      request.headers.get(
        "user-agent"
      ) ?? "";

    if (
      !userAgent ||
      BOT_PATTERN.test(
        userAgent
      )
    ) {
      return NextResponse.json({
        success: true,
        tracked: false,
        reason: "bot_or_unknown",
      });
    }

    const body =
      await request
        .json()
        .catch(() => null);

    const listingId =
      typeof body?.listingId ===
      "string"
        ? body.listingId.trim()
        : "";

    const visitorId =
      typeof body?.visitorId ===
      "string"
        ? body.visitorId.trim()
        : "";

    if (
      !listingId ||
      visitorId.length < 8 ||
      visitorId.length > 128
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ungültige Tracking-Daten.",
        },
        {
          status: 400,
        }
      );
    }

    const listing =
      await prisma.listing.findUnique({
        where: {
          id: listingId,
        },
        select: {
          id: true,
          userId: true,
          unlockStatus: true,
        },
      });

    if (
      !listing ||
      ![
        "paid",
        "included",
      ].includes(
        listing.unlockStatus
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Objekt nicht verfügbar.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Besucher werden nur innerhalb
     * desselben Maklerkontos verknüpft.
     * Keine IP-Adresse wird gespeichert.
     */
    const visitorHash =
      createHash("sha256")
        .update(
          `${listing.userId}:${visitorId}`
        )
        .digest("hex");

    const duplicateSince =
      new Date(
        Date.now() -
          DUPLICATE_WINDOW_MS
      );

    const recentView =
      await prisma.listingViewEvent.findFirst({
        where: {
          listingId:
            listing.id,
          visitorHash,
          createdAt: {
            gte:
              duplicateSince,
          },
        },
        select: {
          id: true,
        },
      });

    if (recentView) {
      return NextResponse.json({
        success: true,
        tracked: false,
        duplicate: true,
      });
    }

    await prisma.listingViewEvent.create({
      data: {
        listingId:
          listing.id,
        visitorHash,
        source:
          normalizeSource(
            body?.source
          ),
        referrerHost:
          getReferrerHost(
            request
          ),
        deviceType:
          getDeviceType(
            userAgent
          ),
      },
    });

    return NextResponse.json({
      success: true,
      tracked: true,
    });
  } catch (error) {
    console.error(
      "LISTING VIEW TRACKING ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Aufruf konnte nicht erfasst werden.",
      },
      {
        status: 500,
      }
    );
  }
}