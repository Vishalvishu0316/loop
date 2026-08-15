import { pbkdf2Sync, randomBytes } from "node:crypto";

const ITERATIONS = 100000;
const KEY_LEN = 64;
const DIGEST = "sha512";
const SALT_LEN = 16;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LEN).toString("hex");
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString(
    "hex",
  );
  return `${ITERATIONS}.${salt}.${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [iterStr, salt, expectedHash] = stored.split(".");
    if (!iterStr || !salt || !expectedHash) return false;
    const iterations = parseInt(iterStr, 10);
    if (!iterations || isNaN(iterations)) return false;

    const actualHash = pbkdf2Sync(
      password,
      salt,
      iterations,
      KEY_LEN,
      DIGEST,
    ).toString("hex");

    return timingSafeEqual(expectedHash, actualHash);
  } catch {
    return false;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
