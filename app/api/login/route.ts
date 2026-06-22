import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (
    email === "admin@inserat-ai.ch" &&
    password === "InseratAI2026!"
  ) {
    return NextResponse.json({
      user: {
        name: "Admin",
        email,
        role: "admin",
      },
    });
  }

  return NextResponse.json(
    {
      error: "Ungültige Anmeldedaten",
    },
    {
      status: 401,
    }
  );
}