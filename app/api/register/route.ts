import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { name, email, password } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Bitte alle Felder ausfüllen" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    user: {
      name,
      email,
    },
  });
}