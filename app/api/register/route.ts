import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || user.password !== password) {
    return NextResponse.json(
      { error: "Falsche Daten" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    user: {
      name: user.name,
      email: user.email,
    },
  });
}