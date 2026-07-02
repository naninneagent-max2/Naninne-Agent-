import { SignJWT, jwtVerify } from "jose";
import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "hermes-agent-os-jwt-secret-2024-mundo-roberth-secure-key-64chars"
);
const COOKIE_NAME = "hermes_token";

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return compare(plain, hashed);
}

export async function createToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ sub: userId, email, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== "access") return null;
    return payload as { sub: string; email: string };
  } catch {
    return null;
  }
}

export async function getTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

export async function getCurrentUser() {
  const token = await getTokenFromCookies();
  if (!token) return null;
  return verifyToken(token);
}

export { COOKIE_NAME };
