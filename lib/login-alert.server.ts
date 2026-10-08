import "server-only";

import { Resend } from "resend";

import { prisma } from "@/lib/prisma";

function escapeHtml(
  value: string
): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function notifyOperatorAboutLogin(
  userId: string
): Promise<void> {
  try {
    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          role: true,
          plan: true,
        },
      });

    if (!user) {
      return;
    }

    /*
     * Eigene interne Admin-Logins
     * erzeugen bewusst keinen Alert.
     */
    if (
      user.role
        .trim()
        .toLowerCase() === "admin"
    ) {
      return;
    }

    const resendApiKey =
      process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.warn(
        "[LOGIN ALERT] RESEND_API_KEY fehlt."
      );
      return;
    }

    const fromEmail =
      process.env.RESEND_FROM_EMAIL ||
      "info@inserat-ai.ch";

    const toEmail =
      process.env.LOGIN_ALERT_TO_EMAIL ||
      process.env.FEEDBACK_TO_EMAIL ||
      "support@inserat-ai.de";

    const resend =
      new Resend(
        resendApiKey
      );

    const now =
      new Intl.DateTimeFormat(
        "de-CH",
        {
          dateStyle: "medium",
          timeStyle: "medium",
          timeZone:
            "Europe/Zurich",
        }
      ).format(
        new Date()
      );

    const name =
      user.name ||
      "Nicht angegeben";

    const company =
      user.company ||
      "Nicht angegeben";

    const plan =
      user.plan ||
      "Nicht angegeben";

    const {
      error,
    } =
      await resend.emails.send({
        from:
          `Inserat-AI Login <${fromEmail}>`,
        to:
          toEmail,
        subject:
          `Inserat-AI · Kunden-Login · ${name}`,
        text:
          `Neuer Kunden-Login bei Inserat-AI\n\n` +
          `Name: ${name}\n` +
          `Firma: ${company}\n` +
          `E-Mail: ${user.email}\n` +
          `Plan: ${plan}\n` +
          `Zeitpunkt: ${now}\n\n` +
          `User-ID: ${user.id}`,
        html: `
          <div
            style="
              font-family:Arial,sans-serif;
              max-width:620px;
              margin:auto;
              padding:32px;
              color:#111827;
            "
          >
            <div
              style="
                font-size:12px;
                font-weight:700;
                letter-spacing:.12em;
                color:#b7791f;
                text-transform:uppercase;
                margin-bottom:12px;
              "
            >
              Inserat-AI Control Center
            </div>

            <h1
              style="
                font-size:26px;
                margin:0 0 24px;
              "
            >
              Neuer Kunden-Login
            </h1>

            <table
              style="
                width:100%;
                border-collapse:collapse;
                font-size:15px;
              "
            >
              <tr>
                <td style="padding:8px 0;color:#6b7280;">
                  Name
                </td>
                <td style="padding:8px 0;font-weight:600;">
                  ${escapeHtml(name)}
                </td>
              </tr>

              <tr>
                <td style="padding:8px 0;color:#6b7280;">
                  Firma
                </td>
                <td style="padding:8px 0;font-weight:600;">
                  ${escapeHtml(company)}
                </td>
              </tr>

              <tr>
                <td style="padding:8px 0;color:#6b7280;">
                  E-Mail
                </td>
                <td style="padding:8px 0;font-weight:600;">
                  ${escapeHtml(user.email)}
                </td>
              </tr>

              <tr>
                <td style="padding:8px 0;color:#6b7280;">
                  Plan
                </td>
                <td style="padding:8px 0;font-weight:600;">
                  ${escapeHtml(plan)}
                </td>
              </tr>

              <tr>
                <td style="padding:8px 0;color:#6b7280;">
                  Zeitpunkt
                </td>
                <td style="padding:8px 0;font-weight:600;">
                  ${escapeHtml(now)}
                </td>
              </tr>
            </table>
          </div>
        `,
      });

    if (error) {
      console.error(
        "[LOGIN ALERT] Resend error:",
        error
      );
      return;
    }

    console.log(
      "[LOGIN ALERT] sent",
      {
        userId:
          user.id,
        email:
          user.email,
      }
    );
  } catch (error) {
    /*
     * Alert darf einen Login
     * niemals blockieren.
     */
    console.error(
      "[LOGIN ALERT] failed:",
      error
    );
  }
}
