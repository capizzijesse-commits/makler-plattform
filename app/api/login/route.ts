import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // HARDCODE LOGIN (für Launch)
    if (email === "test@test.com" && password === "123456") {
      return NextResponse.json({
        user: {
          email,
          name: "Test User",
        },
      });
    }

    return NextResponse.json(
      { error: "Falsche Login Daten" },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Serverfehler" },
      { status: 500 }
    );
  }
}