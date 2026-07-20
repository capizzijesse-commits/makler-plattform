import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "inserat_ai_session";

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createUserSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_SECONDS * 1000
  );

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
  };
}

export async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashSessionToken(token),
    },
    include: {
      user: {
       select: {
  id: true,
  name: true,
  email: true,
  company: true,
  phone: true,
  role: true,
  plan: true,
  emailVerified: true,
  isFounder: true,
  founderNumber: true,
  founderPriceCents: true,
  freeGenerationsUsed: true,
  freeGenerationLimit: true,
},
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session
      .delete({
        where: {
          id: session.id,
        },
      })
      .catch(() => undefined);

    return null;
  }

  return session.user;
}

export async function deleteUserSession(token?: string) {
  if (!token) {
    return;
  }

  await prisma.session.deleteMany({
    where: {
      tokenHash: hashSessionToken(token),
    },
  });
}

export function getSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}
