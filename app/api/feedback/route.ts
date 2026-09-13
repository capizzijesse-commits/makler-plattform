import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

type FeedbackBody = {
  category?: string;
  email?: string;
  message?: string;
  company?: string;
  page?: string;
};

const ALLOWED_CATEGORIES = new Set([
  "Idee",
  "Problem",
  "Frage",
  "Sonstiges",
]);

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FeedbackBody;

    const category =
      typeof body.category === "string" &&
      ALLOWED_CATEGORIES.has(body.category)
        ? body.category
        : "Sonstiges";

    const email =
      typeof body.email === "string"
        ? body.email.trim().slice(0, 180)
        : "";

    const message =
      typeof body.message === "string"
        ? body.message.trim().slice(0, 2000)
        : "";

    const company =
      typeof body.company === "string"
        ? body.company.trim()
        : "";

    const page =
      typeof body.page === "string"
        ? body.page.trim().slice(0, 500)
        : "";

    if (company) {
      return NextResponse.json({
        success: true,
      });
    }

    if (message.length < 5) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bitte beschreibe dein Feedback etwas genauer.",
        },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error("RESEND_API_KEY fehlt.");

      return NextResponse.json(
        {
          success: false,
          error:
            "Der E-Mail-Versand ist derzeit nicht verfügbar.",
        },
        { status: 500 }
      );
    }

    const fromEmail =
      process.env.RESEND_FROM_EMAIL ||
      "info@inserat-ai.ch";

    const feedbackTo =
      process.env.FEEDBACK_TO_EMAIL ||
      "support@inserat-ai.de";

    const resend = new Resend(resendApiKey);

    const safeCategory = escapeHtml(category);
    const safeEmail = escapeHtml(
      email || "Nicht angegeben"
    );
    const safePage = escapeHtml(
      page || "Nicht angegeben"
    );
    const safeMessage = escapeHtml(message).replaceAll(
      "\n",
      "<br />"
    );

    const { error } = await resend.emails.send({
      from: `Inserat-AI Feedback <${fromEmail}>`,
      to: feedbackTo,
      ...(email
        ? {
            replyTo: email,
          }
        : {}),
      subject: `Inserat-AI Feedback: ${category}`,
      text:
        `Kategorie: ${category}\n` +
        `E-Mail: ${email || "Nicht angegeben"}\n` +
        `Seite: ${page || "Nicht angegeben"}\n\n` +
        `${message}`,
      html: `
        <div
          style="
            font-family:Arial,sans-serif;
            max-width:640px;
            margin:auto;
            padding:32px;
            color:#0f172a;
          "
        >
          <h1>Neues Inserat-AI Feedback</h1>

          <p>
            <strong>Kategorie:</strong>
            ${safeCategory}
          </p>

          <p>
            <strong>E-Mail:</strong>
            ${safeEmail}
          </p>

          <p>
            <strong>Seite:</strong>
            ${safePage}
          </p>

          <hr
            style="
              border:0;
              border-top:1px solid #e2e8f0;
              margin:24px 0;
            "
          />

          <p
            style="
              font-size:16px;
              line-height:1.7;
            "
          >
            ${safeMessage}
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("FEEDBACK RESEND ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          error:
            "Das Feedback konnte momentan nicht gesendet werden.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("FEEDBACK API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Das Feedback konnte momentan nicht verarbeitet werden.",
      },
      { status: 500 }
    );
  }
}
