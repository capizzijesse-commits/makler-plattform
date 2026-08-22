import {
  NextResponse,
} from "next/server";

import {
  resolveSwissAddress,
} from "@/lib/swiss-location";

export const runtime = "nodejs";

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const street =
      typeof body?.street === "string"
        ? body.street.trim()
        : "";

    const zip =
      typeof body?.zip === "string"
        ? body.zip.trim()
        : "";

    const city =
      typeof body?.city === "string"
        ? body.city.trim()
        : "";

    if (
      !street ||
      !zip ||
      !city
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Strasse, PLZ und Ort sind erforderlich.",
        },
        {
          status: 400,
        }
      );
    }

    if (!/^\d{4}$/.test(zip)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bitte eine gültige vierstellige Schweizer PLZ eingeben.",
        },
        {
          status: 400,
        }
      );
    }

    const location =
      await resolveSwissAddress({
        street,
        zip,
        city,
      });

    if (!location) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die Schweizer Adresse konnte nicht eindeutig gefunden werden.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      location,
    });
  } catch (error) {
    console.error(
      "[valuation/location]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Die Adresse konnte momentan nicht geprüft werden.",
      },
      {
        status: 500,
      }
    );
  }
}
