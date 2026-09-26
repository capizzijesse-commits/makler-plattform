import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";

const MAX_EXPOSE_SIZE = 25 * 1024 * 1024;
const EXPOSE_PREFIX = "automation-exposes/";

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const user = await getAuthenticatedUser(request);

        if (!user) {
          throw new Error("Bitte zuerst anmelden.");
        }

        if (!pathname.startsWith(EXPOSE_PREFIX)) {
          throw new Error("Ungültiger Upload-Pfad.");
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_EXPOSE_SIZE,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId: user.id,
          }),
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("AUTOMATION EXPOSE UPLOAD ERROR:", error);

    const message =
      error instanceof Error &&
      [
        "Bitte zuerst anmelden.",
        "Ungültiger Upload-Pfad.",
      ].includes(error.message)
        ? error.message
        : "Das Exposé konnte nicht hochgeladen werden.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: message === "Bitte zuerst anmelden." ? 401 : 400,
      }
    );
  }
}
