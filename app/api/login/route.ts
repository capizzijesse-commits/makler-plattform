import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();


export async function POST(req: Request) {
  const { email, password } = await req.json();

  const user = await prisma.user.findUnique({
    where: { email },
  });
  console.log("LOGIN EMAIL:", email);
console.log("USER FROM DB:", user);
console.log("PASSWORD DB:", user?.password);
console.log("PASSWORD INPUT:", password);

 if (!user) {
  return NextResponse.json(
    { error: "User nicht gefunden" },
    { status: 404 }
  );
}

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
}
