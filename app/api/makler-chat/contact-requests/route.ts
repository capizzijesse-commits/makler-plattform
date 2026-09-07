import {
  randomUUID,
} from "node:crypto";

import type {
  NextRequest,
} from "next/server";

import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

import {
  getAuthenticatedUser,
} from "@/lib/session";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


type CountRow = {
  count: number;
};


type UserRow = {
  id: string;
  name: string;
  email: string;
  company:
    | string
    | null;
};


type ExistingConversationRow = {
  id: string;
};


type RequestRow = {
  id: string;
  requesterUserId: string;
  targetUserId: string;
  pairKey: string;
  initialMessage:
    | string
    | null;
  status: string;
  countryCode: string;
  languageCode: string;
  conversationId:
    | string
    | null;
  createdAt: Date;
  respondedAt:
    | Date
    | null;
  otherUserId: string;
  otherUserName: string;
  otherUserEmail: string;
  otherUserCompany:
    | string
    | null;
};


type PendingRequestRow = {
  id: string;
  requesterUserId: string;
  targetUserId: string;
  initialMessage:
    | string
    | null;
  countryCode: string;
  languageCode: string;
  createdAt: Date;
};


function isRecord(
  value: unknown
): value is Record<
  string,
  unknown
> {
  return (
    typeof value === "object" &&
    value !== null
  );
}


function textValue(
  value: unknown,
  maximumLength: number
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const clean =
    value.trim();

  if (!clean) {
    return null;
  }

  return clean.slice(
    0,
    maximumLength
  );
}


function normalizeCountry(
  value: unknown
): string {
  const clean =
    textValue(
      value,
      2
    )?.toUpperCase();

  if (
    clean &&
    /^[A-Z]{2}$/.test(
      clean
    )
  ) {
    return clean;
  }

  return "CH";
}


function normalizeLanguage(
  value: unknown
): string {
  const clean =
    textValue(
      value,
      5
    )?.toLowerCase();

  if (
    clean &&
    /^[a-z]{2}(-[a-z]{2})?$/.test(
      clean
    )
  ) {
    return clean;
  }

  return "de";
}


function makePairKey(
  firstUserId: string,
  secondUserId: string
): string {
  return [
    firstUserId,
    secondUserId,
  ]
    .sort()
    .join(":");
}


function maskEmail(
  email: string
): string {
  const [
    local = "",
    domain = "",
  ] =
    email.split("@");

  return `${
    local.slice(0, 1)
  }***@${domain}`;
}


export async function GET(
  request: NextRequest
) {
  try {
    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bitte zuerst einloggen.",
        },
        {
          status: 401,
        }
      );
    }


    const summaryOnly =
      request.nextUrl
        .searchParams
        .get("summary") === "1";


    if (summaryOnly) {
      const rows =
        await prisma.$queryRaw<
          CountRow[]
        >`
          SELECT
            COUNT(*)::int
              AS "count"
          FROM
            "MaklerChatContactRequest"
          WHERE
            "targetUserId" =
              ${user.id}
          AND
            "status" =
              'PENDING'
        `;

      return NextResponse.json({
        success: true,
        pendingCount:
          rows[0]?.count ?? 0,
      });
    }


    const incoming =
      await prisma.$queryRaw<
        RequestRow[]
      >`
        SELECT
          r."id",
          r."requesterUserId",
          r."targetUserId",
          r."pairKey",
          r."initialMessage",
          r."status",
          r."countryCode",
          r."languageCode",
          r."conversationId",
          r."createdAt",
          r."respondedAt",

          u."id"
            AS "otherUserId",

          u."name"
            AS "otherUserName",

          u."email"
            AS "otherUserEmail",

          u."company"
            AS "otherUserCompany"

        FROM
          "MaklerChatContactRequest" r

        INNER JOIN
          "User" u
        ON
          u."id" =
            r."requesterUserId"

        WHERE
          r."targetUserId" =
            ${user.id}

        ORDER BY
          CASE
            WHEN r."status" =
              'PENDING'
            THEN 0
            ELSE 1
          END,
          r."createdAt" DESC

        LIMIT 50
      `;


    const outgoing =
      await prisma.$queryRaw<
        RequestRow[]
      >`
        SELECT
          r."id",
          r."requesterUserId",
          r."targetUserId",
          r."pairKey",
          r."initialMessage",
          r."status",
          r."countryCode",
          r."languageCode",
          r."conversationId",
          r."createdAt",
          r."respondedAt",

          u."id"
            AS "otherUserId",

          u."name"
            AS "otherUserName",

          u."email"
            AS "otherUserEmail",

          u."company"
            AS "otherUserCompany"

        FROM
          "MaklerChatContactRequest" r

        INNER JOIN
          "User" u
        ON
          u."id" =
            r."targetUserId"

        WHERE
          r."requesterUserId" =
            ${user.id}

        ORDER BY
          r."createdAt" DESC

        LIMIT 50
      `;


    const normalize =
      (
        row: RequestRow
      ) => ({
        id:
          row.id,

        requesterUserId:
          row.requesterUserId,

        targetUserId:
          row.targetUserId,

        initialMessage:
          row.initialMessage,

        status:
          row.status,

        countryCode:
          row.countryCode,

        languageCode:
          row.languageCode,

        conversationId:
          row.conversationId,

        createdAt:
          row.createdAt,

        respondedAt:
          row.respondedAt,

        user: {
          id:
            row.otherUserId,

          name:
            row.otherUserName,

          company:
            row.otherUserCompany,

          emailHint:
            maskEmail(
              row.otherUserEmail
            ),
        },
      });


    return NextResponse.json({
      success: true,

      incoming:
        incoming.map(
          normalize
        ),

      outgoing:
        outgoing.map(
          normalize
        ),
    });

  } catch (error) {
    console.error(
      "MAKLER CHAT CONTACT REQUEST GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Kontaktanfragen konnten nicht geladen werden.",
      },
      {
        status: 500,
      }
    );
  }
}


export async function POST(
  request: NextRequest
) {
  try {
    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bitte zuerst einloggen.",
        },
        {
          status: 401,
        }
      );
    }


    const body: unknown =
      await request
        .json()
        .catch(
          () => null
        );


    if (!isRecord(body)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die Anfrage konnte nicht gelesen werden.",
        },
        {
          status: 400,
        }
      );
    }


    const targetUserId =
      textValue(
        body.targetUserId,
        120
      );


    const initialMessage =
      textValue(
        body.initialMessage,
        1000
      );


    if (
      !targetUserId ||
      targetUserId ===
        user.id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bitte wähle einen anderen Inserat-AI Nutzer.",
        },
        {
          status: 400,
        }
      );
    }


    if (
      !initialMessage ||
      initialMessage.length < 5
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bitte schreibe eine kurze persönliche Nachricht zur Kontaktanfrage.",
        },
        {
          status: 400,
        }
      );
    }


    const targetRows =
      await prisma.$queryRaw<
        UserRow[]
      >`
        SELECT
          "id",
          "name",
          "email",
          "company"
        FROM
          "User"
        WHERE
          "id" =
            ${targetUserId}
        LIMIT 1
      `;


    const target =
      targetRows[0];


    if (!target) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Dieser Inserat-AI Nutzer wurde nicht gefunden.",
        },
        {
          status: 404,
        }
      );
    }


    const pairKey =
      makePairKey(
        user.id,
        targetUserId
      );


    const blocked =
      await prisma.$queryRaw<
        Array<{
          exists: boolean;
        }>
      >`
        SELECT
          TRUE AS "exists"
        FROM
          "MaklerChatBlock"
        WHERE
          (
            "blockerUserId" =
              ${targetUserId}
            AND
            "blockedUserId" =
              ${user.id}
          )
          OR
          (
            "blockerUserId" =
              ${user.id}
            AND
            "blockedUserId" =
              ${targetUserId}
          )
        LIMIT 1
      `;


    if (blocked[0]?.exists) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Zwischen diesen Konten kann derzeit keine Kontaktanfrage gesendet werden.",
        },
        {
          status: 403,
        }
      );
    }


    const existingConversation =
      await prisma.$queryRaw<
        ExistingConversationRow[]
      >`
        SELECT
          "id"
        FROM
          "MaklerChatConversation"
        WHERE
          "directKey" =
            ${pairKey}
        AND
          "kind" =
            'DIRECT'
        LIMIT 1
      `;


    if (
      existingConversation[0]?.id
    ) {
      return NextResponse.json({
        success: true,

        state:
          "EXISTING_CONVERSATION",

        conversationId:
          existingConversation[0].id,
      });
    }


    const requestId =
      randomUUID();

    const countryCode =
      normalizeCountry(
        body.countryCode ??
        body.market
      );

    const languageCode =
      normalizeLanguage(
        body.languageCode
      );


    const inserted =
      await prisma.$queryRaw<
        Array<{
          id: string;
        }>
      >`
        INSERT INTO
          "MaklerChatContactRequest"
          (
            "id",
            "requesterUserId",
            "targetUserId",
            "pairKey",
            "initialMessage",
            "status",
            "countryCode",
            "languageCode",
            "createdAt",
            "updatedAt"
          )
        VALUES
          (
            ${requestId},
            ${user.id},
            ${targetUserId},
            ${pairKey},
            ${initialMessage},
            'PENDING',
            ${countryCode},
            ${languageCode},
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )

        ON CONFLICT DO NOTHING

        RETURNING
          "id"
      `;


    if (
      !inserted[0]?.id
    ) {
      return NextResponse.json({
        success: true,
        state:
          "ALREADY_PENDING",
      });
    }


    return NextResponse.json({
      success: true,

      state:
        "REQUEST_SENT",

      request: {
        id:
          requestId,

        status:
          "PENDING",

        user: {
          id:
            target.id,

          name:
            target.name,

          company:
            target.company,

          emailHint:
            maskEmail(
              target.email
            ),
        },
      },
    });

  } catch (error) {
    console.error(
      "MAKLER CHAT CONTACT REQUEST POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Die Kontaktanfrage konnte nicht gesendet werden.",
      },
      {
        status: 500,
      }
    );
  }
}


export async function PATCH(
  request: NextRequest
) {
  try {
    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bitte zuerst einloggen.",
        },
        {
          status: 401,
        }
      );
    }


    const body: unknown =
      await request
        .json()
        .catch(
          () => null
        );


    if (!isRecord(body)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die Anfrage konnte nicht gelesen werden.",
        },
        {
          status: 400,
        }
      );
    }


    const requestId =
      textValue(
        body.requestId,
        120
      );


    const action =
      textValue(
        body.action,
        20
      )?.toLowerCase();


    if (
      !requestId ||
      !action ||
      ![
        "accept",
        "decline",
        "block",
      ].includes(
        action
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ungültige Aktion.",
        },
        {
          status: 400,
        }
      );
    }


    const rows =
      await prisma.$queryRaw<
        PendingRequestRow[]
      >`
        SELECT
          "id",
          "requesterUserId",
          "targetUserId",
          "initialMessage",
          "countryCode",
          "languageCode",
          "createdAt"
        FROM
          "MaklerChatContactRequest"
        WHERE
          "id" =
            ${requestId}
        AND
          "targetUserId" =
            ${user.id}
        AND
          "status" =
            'PENDING'
        LIMIT 1
      `;


    const contactRequest =
      rows[0];


    if (!contactRequest) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Diese Kontaktanfrage ist nicht mehr verfügbar.",
        },
        {
          status: 404,
        }
      );
    }


    if (
      action === "decline"
    ) {
      await prisma.$executeRaw`
        UPDATE
          "MaklerChatContactRequest"
        SET
          "status" =
            'DECLINED',
          "respondedAt" =
            CURRENT_TIMESTAMP,
          "updatedAt" =
            CURRENT_TIMESTAMP
        WHERE
          "id" =
            ${requestId}
      `;

      return NextResponse.json({
        success: true,
        state:
          "DECLINED",
      });
    }


    if (
      action === "block"
    ) {
      await prisma.$transaction([
        prisma.$executeRaw`
          INSERT INTO
            "MaklerChatBlock"
            (
              "blockerUserId",
              "blockedUserId",
              "createdAt"
            )
          VALUES
            (
              ${user.id},
              ${contactRequest.requesterUserId},
              CURRENT_TIMESTAMP
            )
          ON CONFLICT
            (
              "blockerUserId",
              "blockedUserId"
            )
          DO NOTHING
        `,

        prisma.$executeRaw`
          UPDATE
            "MaklerChatContactRequest"
          SET
            "status" =
              'BLOCKED',
            "respondedAt" =
              CURRENT_TIMESTAMP,
            "updatedAt" =
              CURRENT_TIMESTAMP
          WHERE
            "id" =
              ${requestId}
        `,
      ]);

      return NextResponse.json({
        success: true,
        state:
          "BLOCKED",
      });
    }


    const pairKey =
      makePairKey(
        contactRequest.requesterUserId,
        contactRequest.targetUserId
      );


    const conversationId =
      randomUUID();


    const created =
      await prisma.$queryRaw<
        ExistingConversationRow[]
      >`
        INSERT INTO
          "MaklerChatConversation"
          (
            "id",
            "kind",
            "title",
            "market",
            "visibility",
            "countryCode",
            "languageCode",
            "directKey",
            "createdAt",
            "updatedAt"
          )
        VALUES
          (
            ${conversationId},
            'DIRECT',
            NULL,
            ${contactRequest.countryCode},
            'PRIVATE',
            ${contactRequest.countryCode},
            ${contactRequest.languageCode},
            ${pairKey},
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )

        ON CONFLICT
          ("directKey")

        DO UPDATE SET
          "updatedAt" =
            CURRENT_TIMESTAMP

        RETURNING
          "id"
      `;


    const finalConversationId =
      created[0]?.id;


    if (!finalConversationId) {
      throw new Error(
        "Conversation ID fehlt."
      );
    }


    const firstMessageId =
      randomUUID();


    await prisma.$transaction([
      prisma.$executeRaw`
        INSERT INTO
          "MaklerChatParticipant"
          (
            "conversationId",
            "userId",
            "role",
            "joinedAt",
            "lastReadAt",
            "participantType"
          )
        VALUES
          (
            ${finalConversationId},
            ${contactRequest.requesterUserId},
            'MEMBER',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP,
            'USER'
          )
        ON CONFLICT
          (
            "conversationId",
            "userId"
          )
        DO NOTHING
      `,

      prisma.$executeRaw`
        INSERT INTO
          "MaklerChatParticipant"
          (
            "conversationId",
            "userId",
            "role",
            "joinedAt",
            "lastReadAt",
            "participantType"
          )
        VALUES
          (
            ${finalConversationId},
            ${contactRequest.targetUserId},
            'MEMBER',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP,
            'USER'
          )
        ON CONFLICT
          (
            "conversationId",
            "userId"
          )
        DO NOTHING
      `,

      prisma.$executeRaw`
        INSERT INTO
          "MaklerChatMessage"
          (
            "id",
            "conversationId",
            "senderUserId",
            "senderType",
            "content",
            "createdAt"
          )
        VALUES
          (
            ${firstMessageId},
            ${finalConversationId},
            ${contactRequest.requesterUserId},
            'USER',
            ${contactRequest.initialMessage || ""},
            ${contactRequest.createdAt}
          )
      `,

      prisma.$executeRaw`
        UPDATE
          "MaklerChatContactRequest"
        SET
          "status" =
            'ACCEPTED',
          "conversationId" =
            ${finalConversationId},
          "respondedAt" =
            CURRENT_TIMESTAMP,
          "updatedAt" =
            CURRENT_TIMESTAMP
        WHERE
          "id" =
            ${requestId}
      `,
    ]);


    return NextResponse.json({
      success: true,

      state:
        "ACCEPTED",

      conversationId:
        finalConversationId,
    });

  } catch (error) {
    console.error(
      "MAKLER CHAT CONTACT REQUEST PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Die Kontaktanfrage konnte nicht bearbeitet werden.",
      },
      {
        status: 500,
      }
    );
  }
}