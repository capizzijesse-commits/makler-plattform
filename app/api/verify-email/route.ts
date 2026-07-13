import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(
        new URL("/login?verified=missing", request.url)
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
      },
    });

    if (!user) {
      return NextResponse.redirect(
        new URL("/login?verified=invalid", request.url)
      );
    }

    if (
      user.emailVerificationExpires &&
      user.emailVerificationExpires < new Date()
    ) {
      return NextResponse.redirect(
        new URL("/login?verified=expired", request.url)
      );
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    return NextResponse.redirect(
      new URL("/login?verified=success", request.url)
    );
  } catch (error) {
    console.error("verify-email error:", error);

    return NextResponse.redirect(
      new URL("/login?verified=error", request.url)
    );
  }
}
