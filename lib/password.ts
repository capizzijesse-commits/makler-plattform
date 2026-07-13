import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

const KEY_LENGTH = 64;
const PREFIX = "scrypt";

export function isHashedPassword(password: string): boolean {
  return password.startsWith(`${PREFIX}$`);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");

  const derivedKey = (await scrypt(
    password,
    salt,
    KEY_LENGTH
  )) as Buffer;

  return `${PREFIX}$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  enteredPassword: string,
  storedPassword: string
): Promise<boolean> {
  if (!isHashedPassword(storedPassword)) {
    return enteredPassword === storedPassword;
  }

  const [, salt, storedKeyHex] = storedPassword.split("$");

  if (!salt || !storedKeyHex) {
    return false;
  }

  const storedKey = Buffer.from(storedKeyHex, "hex");

  const derivedKey = (await scrypt(
    enteredPassword,
    salt,
    storedKey.length
  )) as Buffer;

  if (storedKey.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedKey, derivedKey);
}