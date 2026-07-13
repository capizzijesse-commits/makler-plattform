import { PrismaClient } from "@prisma/client";
import {
  randomBytes,
  scrypt as scryptCallback,
} from "node:crypto";
import { promisify } from "node:util";

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);

  return `scrypt$${salt}$${Buffer.from(derivedKey).toString("hex")}`;
}

async function main() {
  const email = "capizzijesse@gmail.com";
  const newPassword = "InseratAI-Test-2026!";

  const hashedPassword = await hashPassword(newPassword);

  const user = await prisma.user.update({
    where: { email },
    data: {
      password: hashedPassword,
      emailVerified: true,
    },
  });

  console.log(`Passwort aktualisiert für: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
