import {
  type NextRequest,
  NextResponse,
} from "next/server";

const GERMANY_LAUNCH_AT =
  Date.parse(
    "2026-09-14T00:00:00+02:00"
  );

export function proxy(
  request: NextRequest
) {
  const host =
    (
      request.headers.get("host") ||
      ""
    )
      .split(":")[0]
      .toLowerCase();

  const isGermanyDomain =
    host === "inserat-ai.de" ||
    host === "www.inserat-ai.de";

  const germanyIsLocked =
    Date.now() <
    GERMANY_LAUNCH_AT;

  if (
    isGermanyDomain &&
    germanyIsLocked
  ) {
    return new NextResponse(
      `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta
    name="viewport"
    content="width=device-width,initial-scale=1"
  >
  <meta
    name="robots"
    content="noindex,nofollow"
  >
  <title>Inserat-AI Deutschland</title>
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background:
        radial-gradient(
          circle at top,
          #15284a,
          #071326 55%,
          #030a16
        );
      color: #fff;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
    }

    main {
      width: min(560px, 100%);
      padding: 48px 34px;
      text-align: center;
      border:
        1px solid rgba(
          255,
          183,
          0,
          .45
        );
      border-radius: 24px;
      background:
        rgba(
          8,
          23,
          47,
          .94
        );
      box-shadow:
        0 30px 80px
        rgba(0, 0, 0, .4);
    }

    strong {
      display: block;
      margin-bottom: 18px;
      color: #ffb000;
      font-size: 14px;
      letter-spacing: .16em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0 0 18px;
      font-size:
        clamp(
          32px,
          7vw,
          48px
        );
      line-height: 1.05;
    }

    p {
      margin: 0;
      color: #cbd5e1;
      font-size: 18px;
      line-height: 1.6;
    }
  </style>
</head>

<body>
  <main>
    <strong>
      Inserat-AI Deutschland
    </strong>

    <h1>
      Wir starten am Montag.
    </h1>

    <p>
      Ab 14. September ist
      Inserat-AI Deutschland
      verfügbar.
    </p>
  </main>
</body>
</html>`,
      {
        status: 503,
        headers: {
          "Content-Type":
            "text/html; charset=utf-8",
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
          "Retry-After":
            "3600",
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
