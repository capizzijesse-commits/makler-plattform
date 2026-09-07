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


type ConversationRow = {
  id: string;
  kind: string;
  title:
    | string
    | null;
  visibility: string;
  countryCode: string;
  languageCode: string;
  updatedAt: Date;
  lastMessage:
    | string
    | null;
  lastMessageAt:
    | Date
    | null;
  unreadCount: number;
};


type ParticipantRow = {
  conversationId: string;
  id: string;
  name: string;
  company:
    | string
    | null;
  email: string;
};


type TargetUserRow = {
  id: string;
  name: string;
  company:
    | string
    | null;
};


function isRecord(
  value: unknown
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !== null
  );
}


function textValue(
  value: unknown,
  maxLength: number
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
    maxLength
  );
}


function countryCode(
  value: unknown
): string {
  const clean =
    textValue(
      value,
      2
    )
      ?.toUpperCase();

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


function languageCode(
  value: unknown
): string {
  const clean =
    textValue(
      value,
      5
    )
      ?.toLowerCase();

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


function maskEmail(
  email: string
): string {
  const parts =
    email.split("@");

  if (
    parts.length !== 2
  ) {
    return email;
  }

  return `${
    (parts[0] || "")
      .slice(0, 1)
  }***@${parts[1]}`;
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


    const conversations =
      await prisma.$queryRaw<
        ConversationRow[]
      >`
        SELECT
          c."id",
          c."kind",
          c."title",
          c."visibility",
          c."countryCode",
          c."languageCode",
          c."updatedAt",

          (
            SELECT
              m."content"
            FROM
              "MaklerChatMessage" m
            WHERE
              m."conversationId" =
                c."id"
            ORDER BY
              m."createdAt" DESC
            LIMIT 1
          ) AS "lastMessage",

          (
            SELECT
              m."createdAt"
            FROM
              "MaklerChatMessage" m
            WHERE
              m."conversationId" =
                c."id"
            ORDER BY
              m."createdAt" DESC
            LIMIT 1
          ) AS "lastMessageAt",

          (
            SELECT
              COUNT(*)::int
            FROM
              "MaklerChatMessage" m
            WHERE
              m."conversationId" =
                c."id"
            AND
              m."createdAt" >
                p."lastReadAt"
            AND
              (
                m."senderUserId"
                  IS DISTINCT FROM
                  ${user.id}
              )
          ) AS "unreadCount"

        FROM
          "MaklerChatConversation" c

        INNER JOIN
          "MaklerChatParticipant" p
        ON
          p."conversationId" =
            c."id"

        WHERE
          p."userId" =
            ${user.id}

        ORDER BY
          COALESCE(
            (
              SELECT
                MAX(
                  mm."createdAt"
                )
              FROM
                "MaklerChatMessage" mm
              WHERE
                mm."conversationId" =
                  c."id"
            ),
            c."updatedAt"
          ) DESC

        LIMIT 50
      `;


    const participants =
      await prisma.$queryRaw<
        ParticipantRow[]
      >`
        SELECT
          p."conversationId",
          u."id",
          u."name",
          u."company",
          u."email"
        FROM
          "MaklerChatParticipant" p
        INNER JOIN
          "User" u
        ON
          u."id" =
            p."userId"
        WHERE
          p."conversationId"
          IN
          (
            SELECT
              own."conversationId"
            FROM
              "MaklerChatParticipant" own
            WHERE
              own."userId" =
                ${user.id}
          )
        AND
          u."id" <>
            ${user.id}
      `;


    const byConversation =
      new Map<
        string,
        ParticipantRow[]
      >();


    for (
      const participant
      of participants
    ) {
      const current =
        byConversation.get(
          participant
            .conversationId
        ) || [];

      current.push(
        participant
      );

      byConversation.set(
        participant
          .conversationId,
        current
      );
    }


    return NextResponse.json({
      success: true,

      conversations:
        conversations.map(
          (conversation) => ({
            ...conversation,

            participants:
              (
                byConversation.get(
                  conversation.id
                ) || []
              ).map(
                (participant) => ({
                  id:
                    participant.id,

                  name:
                    participant.name,

                  company:
                    participant.company,

                  emailHint:
                    maskEmail(
                      participant.email
                    ),
                })
              ),
          })
        ),
    });

  } catch (error) {
    console.error(
      "MAKLER CHAT CONVERSATIONS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Die Gespräche konnten nicht geladen werden.",
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


    const targetRows =
      await prisma.$queryRaw<
        TargetUserRow[]
      >`
        SELECT
          "id",
          "name",
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


    const ids =
      [
        user.id,
        targetUserId,
      ].sort();


    const directKey =
      `${ids[0]}:${ids[1]}`;


    const id =
      randomUUID();


    const country =
      countryCode(
        body.countryCode ??
        body.market
      );


    const language =
      languageCode(
        body.languageCode
      );


    const inserted =
      await prisma.$queryRaw<
        Array<{
          id: string;
        }>
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
            ${id},
            'DIRECT',
            NULL,
            ${country},
            'PRIVATE',
            ${country},
            ${language},
            ${directKey},
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )

        ON CONFLICT
          ("directKey")

        DO UPDATE SET
          "updatedAt" =
            "MaklerChatConversation"."updatedAt"

        RETURNING
          "id"
      `;


    const conversationId =
      inserted[0]?.id;


    if (!conversationId) {
      throw new Error(
        "Conversation ID fehlt."
      );
    }


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
            ${conversationId},
            ${user.id},
            'MEMBER',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP,
            'USER'
          )
        ON CONFLICT
          ("conversationId", "userId")
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
            ${conversationId},
            ${targetUserId},
            'MEMBER',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP,
            'USER'
          )
        ON CONFLICT
          ("conversationId", "userId")
        DO NOTHING
      `,
    ]);


    return NextResponse.json({
      success: true,

      conversation: {
        id:
          conversationId,

        kind:
          "DIRECT",

        visibility:
          "PRIVATE",

        countryCode:
          country,

        languageCode:
          language,

        participant: {
          id:
            target.id,

          name:
            target.name,

          company:
            target.company,
        },
      },
    });

  } catch (error) {
    console.error(
      "MAKLER CHAT CONVERSATIONS POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Der private Chat konnte nicht erstellt werden.",
      },
      {
        status: 500,
      }
    );
  }
}