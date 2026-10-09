import "server-only";

import {
  prepareImmoScout24DeImageUploadRequestV1,
} from "./immoscout24-de-image-upload-request.server";

export type ImmoScout24DeImageUploadOutcomeV1 =
  | {
      status: "http_accepted";
      httpStatus: number;
      requiresVerification: true;
    }
  | {
      status: "rejected";
      httpStatus: number;
      requiresVerification: false;
    }
  | {
      status: "uncertain";
      httpStatus: number | null;
      requiresVerification: true;
    };

type UploadHttpClient = (
  url: string,
  init: RequestInit
) => Promise<Pick<Response, "status">>;

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}

/**
 * Isolierter ImmoScout24-DE-Bildupload-Transport.
 *
 * - Sandbox only
 * - HTTP-Client muss explizit uebergeben werden
 * - Keine automatischen Retries
 * - Keine Redirects
 * - Kein Datenbankzugriff
 * - Kein Aufruf durch den Publishing-Worker
 *
 * Eine 2xx-Antwort ist noch keine verifizierte
 * Bildzuordnung zum Immobilienobjekt.
 */
export async function executeImmoScout24DeImageUploadV1(
  input: {
    realEstateId: string;
    accessToken: string;
    accessTokenSecret: string;
    formData: FormData;
    allowSandboxWrite: true;
    httpClient: UploadHttpClient;
  }
): Promise<ImmoScout24DeImageUploadOutcomeV1> {
  if (input.allowSandboxWrite !== true) {
    fail("IMMOSCOUT24_DE_IMAGE_WRITE_NOT_ALLOWED");
  }

  if (typeof input.httpClient !== "function") {
    fail("IMMOSCOUT24_DE_IMAGE_HTTP_CLIENT_REQUIRED");
  }

  if (
    !(input.formData instanceof FormData) ||
    input.formData.getAll("attachment").length !== 1 ||
    input.formData.getAll("metadata").length !== 1
  ) {
    fail("IMMOSCOUT24_DE_IMAGE_MULTIPART_INVALID");
  }

  const request =
    prepareImmoScout24DeImageUploadRequestV1({
      realEstateId: input.realEstateId,
      accessToken: input.accessToken,
      accessTokenSecret: input.accessTokenSecret,
    });

  let response: Pick<Response, "status">;

  try {
    response = await input.httpClient(request.url, {
      method: request.method,
      headers: {
        Authorization: request.authorization,
        Accept: request.accept,
      },
      body: input.formData,
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    // Anfrage koennte beim Portal angekommen sein.
    // Ein erneuter POST ist nicht automatisch erlaubt.
    return {
      status: "uncertain",
      httpStatus: null,
      requiresVerification: true,
    };
  }

  const status = response?.status;

  if (
    typeof status !== "number" ||
    !Number.isInteger(status) ||
    status < 100 ||
    status > 599
  ) {
    return {
      status: "uncertain",
      httpStatus: null,
      requiresVerification: true,
    };
  }

  if (status >= 200 && status < 300) {
    return {
      status: "http_accepted",
      httpStatus: status,
      requiresVerification: true,
    };
  }

  // Nur klar abgelehnte Anfragen.
  if ([400, 401, 403, 404, 405, 413, 415, 422].includes(status)) {
    return {
      status: "rejected",
      httpStatus: status,
      requiresVerification: false,
    };
  }

  // 408, 429, 5xx, Redirects usw.:
  // vor erneutem Upload den Portalbestand pruefen.
  return {
    status: "uncertain",
    httpStatus: status,
    requiresVerification: true,
  };
}