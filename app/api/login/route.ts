import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    console.log("LOGIN EMAIL:", email);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    console.log("USER FROM DB:", user);

    // ❗ WICHTIG: zuerst prüfen ob user existiert
    if (!user) {
      return NextResponse.json(
        { error: "User nicht gefunden" },
        { status: 404 }
      );
    }

    // ❗ DANN Passwort prüfen
    if (user.password !== password) {
      return NextResponse.json(
        { error: "Passwort falsch" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
      },
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      { error: "Serverfehler beim Login" },
      { status: 500 }
    );
  }
}