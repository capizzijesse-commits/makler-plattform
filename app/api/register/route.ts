import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";


const prisma = new PrismaClient();

export async function POST(req: Request) {
  const { name, email, password } = await req.json();

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "Diese E-Mail ist bereits registriert." },
      { status: 400 }
    );
  }

  const founderCount = await prisma.user.count({
    where: {
      isFounder: true,
    },
  });

  const getsFounderOffer = founderCount < 50;
const emailVerificationToken = crypto.randomBytes(32).toString("hex");

const emailVerificationExpires = new Date();
emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password,
      plan: "free",
      freeGenerationsUsed: 0,
      freeGenerationLimit: 50,
      isFounder: getsFounderOffer,
      founderNumber: getsFounderOffer ? founderCount + 1 : null,
      founderPriceCents: getsFounderOffer ? 1990 : null,
      emailVerified: false,
emailVerificationToken,
emailVerificationExpires,
    },
  });

  return NextResponse.json({
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
      isFounder: user.isFounder,
      founderNumber: user.founderNumber,
      founderPriceCents: user.founderPriceCents,
      freeGenerationsUsed: user.freeGenerationsUsed,
      freeGenerationLimit: user.freeGenerationLimit,
    },
  });
}