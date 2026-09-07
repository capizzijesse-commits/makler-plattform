import {
  randomUUID,
} from "node:crypto";

import type {
  NextRequest,
} from "next/server";

import {
  NextResponse,
} from "next/server";

import OpenAI from "openai";

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


type Market =
  | "CH"
  | "DE";


type StoredMessageRow = {
  id: string;
  senderType: string;
  senderUserId:
    | string
    | null;
  content: string;
  createdAt: Date;
};


type ConversationRow = {
  id: string;
  market: string;
};


type CountRow = {
  count: number;
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


function optionalText(
  value: unknown,
  maximumLength = 4_000
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const cleaned =
    value.trim();

  if (!cleaned) {
    return null;
  }

  return cleaned.slice(
    0,
    maximumLength
  );
}


function normalizeAnswer(
  value: string
): string {
  return value
    .replace(
      /\*\*(.*?)\*\*/g,
      "$1"
    )
    .replace(
      /__(.*?)__/g,
      "$1"
    )
    .replace(
      /^#{1,6}\s+/gm,
      ""
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();
}


function normalizeMarket(
  value: unknown
): Market {
  return value === "DE"
    ? "DE"
    : "CH";
}


async function ensureAiConversation(
  userId: string,
  market: Market
): Promise<string> {

  const existing =
    await prisma.$queryRaw<
      ConversationRow[]
    >`
      SELECT
        c."id",
        c."market"
      FROM
        "MaklerChatConversation" c
      INNER JOIN
        "MaklerChatParticipant" p
      ON
        p."conversationId" =
        c."id"
      WHERE
        p."userId" =
        ${userId}
      AND
        c."kind" =
        'AI'
      ORDER BY
        c."createdAt" ASC
      LIMIT 1
    `;

  if (existing[0]?.id) {

    if (
      existing[0].market !==
      market
    ) {
      await prisma.$executeRaw`
        UPDATE
          "MaklerChatConversation"
        SET
          "market" = ${market},
          "updatedAt" =
            CURRENT_TIMESTAMP
        WHERE
          "id" =
            ${existing[0].id}
      `;
    }

    return existing[0].id;
  }


  const conversationId =
    randomUUID();


  await prisma.$transaction([
    prisma.$executeRaw`
      INSERT INTO
        "MaklerChatConversation"
        (
          "id",
          "kind",
          "title",
          "market",
          "createdAt",
          "updatedAt"
        )
      VALUES
        (
          ${conversationId},
          'AI',
          'Inserat-AI Chat',
          ${market},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
    `,

    prisma.$executeRaw`
      INSERT INTO
        "MaklerChatParticipant"
        (
          "conversationId",
          "userId",
          "role",
          "joinedAt",
          "lastReadAt"
        )
      VALUES
        (
          ${conversationId},
          ${userId},
          'OWNER',
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
    `,
  ]);

  return conversationId;
}


async function getUnreadCount(
  conversationId: string,
  userId: string
): Promise<number> {

  const rows =
    await prisma.$queryRaw<
      CountRow[]
    >`
      SELECT
        COUNT(*)::int
          AS "count"
      FROM
        "MaklerChatMessage" m
      INNER JOIN
        "MaklerChatParticipant" p
      ON
        p."conversationId" =
        m."conversationId"
      WHERE
        m."conversationId" =
        ${conversationId}
      AND
        p."userId" =
        ${userId}
      AND
        m."senderType" =
        'AI'
      AND
        m."createdAt" >
        p."lastReadAt"
    `;

  return rows[0]?.count ?? 0;
}


async function markRead(
  conversationId: string,
  userId: string
): Promise<void> {

  await prisma.$executeRaw`
    UPDATE
      "MaklerChatParticipant"
    SET
      "lastReadAt" =
        CURRENT_TIMESTAMP
    WHERE
      "conversationId" =
        ${conversationId}
    AND
      "userId" =
        ${userId}
  `;
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


    const market =
      normalizeMarket(
        request.nextUrl
          .searchParams
          .get("market")
      );


    const conversationId =
      await ensureAiConversation(
        user.id,
        market
      );


    const summaryOnly =
      request.nextUrl
        .searchParams
        .get("summary") ===
      "1";


    const unreadCount =
      await getUnreadCount(
        conversationId,
        user.id
      );


    if (summaryOnly) {
      return NextResponse.json({
        success: true,
        conversationId,
        unreadCount,
      });
    }


    const rows =
      await prisma.$queryRaw<
        StoredMessageRow[]
      >`
        SELECT
          "id",
          "senderType",
          "senderUserId",
          "content",
          "createdAt"
        FROM
          "MaklerChatMessage"
        WHERE
          "conversationId" =
          ${conversationId}
        ORDER BY
          "createdAt" ASC
        LIMIT 100
      `;


    const messages =
      rows.map(
        (row) => ({
          id:
            row.id,

          role:
            row.senderType ===
            "AI"
              ? "assistant"
              : "user",

          content:
            row.content,

          createdAt:
            row.createdAt,
        })
      );


    return NextResponse.json({
      success: true,
      conversationId,
      messages,
      unreadCount,
    });

  } catch (error) {

    console.error(
      "MAKLER CHAT GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Der Chatverlauf konnte nicht geladen werden.",
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


    const market =
      normalizeMarket(
        request.nextUrl
          .searchParams
          .get("market")
      );


    const conversationId =
      await ensureAiConversation(
        user.id,
        market
      );


    await markRead(
      conversationId,
      user.id
    );


    return NextResponse.json({
      success: true,
      conversationId,
      unreadCount: 0,
    });

  } catch (error) {

    console.error(
      "MAKLER CHAT PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Der Lesestatus konnte nicht aktualisiert werden.",
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
            "Bitte zuerst einloggen, um den Inserat-AI Chat zu verwenden.",
        },
        {
          status: 401,
        }
      );
    }


    const apiKey =
      process.env
        .OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Der Inserat-AI Chat ist momentan nicht verfügbar.",
        },
        {
          status: 500,
        }
      );
    }


    const rawBody: unknown =
      await request
        .json()
        .catch(
          () => null
        );


    if (!isRecord(rawBody)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die Chat-Anfrage konnte nicht gelesen werden.",
        },
        {
          status: 400,
        }
      );
    }


    const message =
      optionalText(
        rawBody.message,
        4_000
      );


    if (!message) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bitte schreibe eine Nachricht.",
        },
        {
          status: 400,
        }
      );
    }


    const pathname =
      optionalText(
        rawBody.pathname,
        500
      ) || "/";


    const market =
      normalizeMarket(
        rawBody.market
      );


    const conversationId =
      await ensureAiConversation(
        user.id,
        market
      );


    const historyRows =
      await prisma.$queryRaw<
        StoredMessageRow[]
      >`
        SELECT
          "id",
          "senderType",
          "senderUserId",
          "content",
          "createdAt"
        FROM
          "MaklerChatMessage"
        WHERE
          "conversationId" =
          ${conversationId}
        ORDER BY
          "createdAt" DESC
        LIMIT 16
      `;


    const history: Array<{
      role: "user" | "assistant";
      content: string;
    }> =
      historyRows
        .reverse()
        .map((item) => ({
          role:
            item.senderType === "AI"
              ? "assistant"
              : "user",

          content:
            item.content,
        }));


    const userMessageId =
      randomUUID();


    await prisma.$executeRaw`
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
          ${userMessageId},
          ${conversationId},
          ${user.id},
          'USER',
          ${message},
          CURRENT_TIMESTAMP
        )
    `;


    await prisma.$executeRaw`
      UPDATE
        "MaklerChatConversation"
      SET
        "market" =
          ${market},
        "updatedAt" =
          CURRENT_TIMESTAMP
      WHERE
        "id" =
          ${conversationId}
    `;


    const marketText =
      market === "DE"
        ? "Deutschland"
        : "Schweiz";


    const languageRule =
      market === "DE"
        ? "Antworte in professionellem Hochdeutsch für Deutschland. Verwende deutsche Immobilienbegriffe und deutsche Rechtschreibung."
        : "Antworte in professionellem Schweizer Hochdeutsch. Verwende Schweizer Immobilienbegriffe und kein ß.";


    const systemPrompt = `
Du bist der Inserat-AI Chat für Immobilienmakler und Immobilienunternehmen.

Aktiver Markt:
${marketText}

Aktuelle Inserat-AI-Seite:
${pathname}

${languageRule}

Du unterstützt insbesondere bei:
- Immobilieninseraten
- professionellen Objektbeschreibungen
- Titeln und Highlights
- Kunden-E-Mails und Antworten
- Eigentümer-Akquise
- Einwandbehandlung
- Social-Media-Inhalten
- Vermarktungsstrategien
- Besichtigungsvorbereitung
- Nachfassnachrichten
- interner Maklerkommunikation
- Ideen für bessere Immobilienvermarktung
- allgemeinem produktivem Makleralltag

Regeln:
- Sei konkret, professionell und nützlich.
- Erfinde niemals konkrete Objektdaten, die der Nutzer nicht genannt hat.
- Wenn wesentliche Objektdaten fehlen, kennzeichne das klar.
- Behaupte niemals, eine Nachricht gesendet, einen Termin vereinbart oder Daten gespeichert zu haben.
- Gib Rechts-, Steuer- oder Finanzthemen nicht als verbindliche Fachberatung aus.
- Verwende normalerweise kurze, gut lesbare Antworten.
- Wenn der Nutzer einen fertigen Text verlangt, liefere direkt einen verwendbaren Text.
- Keine unnötigen Markdown-Überschriften oder Tabellen.
`.trim();


    const openai =
      new OpenAI({
        apiKey,
      });


    const completion =
      await openai
        .chat
        .completions
        .create({
          model:
            "gpt-4o-mini",

          messages: [
            {
              role:
                "system",
              content:
                systemPrompt,
            },

            ...history,

            {
              role:
                "user",
              content:
                message,
            },
          ],

          temperature:
            0.35,

          max_tokens:
            900,
        });


    const rawAnswer =
      completion
        .choices[0]
        ?.message
        ?.content
        ?.trim();


    if (!rawAnswer) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Der Chat konnte momentan keine Antwort erstellen.",
        },
        {
          status: 500,
        }
      );
    }


    const answer =
      normalizeAnswer(
        rawAnswer
      );


    const assistantMessageId =
      randomUUID();


    await prisma.$executeRaw`
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
          ${assistantMessageId},
          ${conversationId},
          NULL,
          'AI',
          ${answer},
          CURRENT_TIMESTAMP
        )
    `;


    await prisma.$executeRaw`
      UPDATE
        "MaklerChatConversation"
      SET
        "updatedAt" =
          CURRENT_TIMESTAMP
      WHERE
        "id" =
          ${conversationId}
    `;


    return NextResponse.json({
      success: true,

      conversationId,

      answer,

      userMessage: {
        id:
          userMessageId,
        role:
          "user",
        content:
          message,
      },

      assistantMessage: {
        id:
          assistantMessageId,
        role:
          "assistant",
        content:
          answer,
      },
    });

  } catch (error) {

    console.error(
      "MAKLER CHAT POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Der Inserat-AI Chat ist momentan nicht verfügbar.",
      },
      {
        status: 500,
      }
    );
  }
}