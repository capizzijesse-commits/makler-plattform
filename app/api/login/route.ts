import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (email === "test@test.com" && password === "123456") {
    return NextResponse.json({
      user: {
        name: "Jesse",
        email,
      },
    });
  }

  return NextResponse.json(
    { error: "Falsche Daten" },
    { status: 401 }
  );
}