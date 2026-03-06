import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

const KIOSK_PIN = process.env.KIOSK_PIN || "000000";
const SECRET = process.env.NEXTAUTH_SECRET || "kiosk-fallback-secret";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

// In-memory rate limiting by IP
const attempts = new Map<string, { count: number; lockedUntil: number }>();

function generateToken(): string {
  return createHmac("sha256", SECRET).update(`kiosk:${KIOSK_PIN}`).digest("hex").slice(0, 32);
}

export function verifyKioskToken(token: string): boolean {
  return token === generateToken();
}

function getClientIP(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const now = Date.now();

  // Check lockout
  const record = attempts.get(ip);
  if (record && record.lockedUntil > now) {
    const remainingSec = Math.ceil((record.lockedUntil - now) / 1000);
    return NextResponse.json(
      { error: "Too many attempts", lockedFor: remainingSec },
      { status: 429 }
    );
  }

  const { pin } = await req.json();

  if (!pin || pin !== KIOSK_PIN) {
    // Track failed attempt
    const current = attempts.get(ip) || { count: 0, lockedUntil: 0 };
    current.count += 1;
    if (current.count >= MAX_ATTEMPTS) {
      current.lockedUntil = now + LOCKOUT_MS;
      current.count = 0; // Reset count for after lockout
    }
    attempts.set(ip, current);

    await new Promise((r) => setTimeout(r, 1000));

    const attemptsLeft = MAX_ATTEMPTS - current.count;
    return NextResponse.json(
      { error: "Invalid PIN", attemptsLeft: current.lockedUntil > now ? 0 : attemptsLeft },
      { status: 401 }
    );
  }

  // Success — clear attempts
  attempts.delete(ip);
  const token = generateToken();
  return NextResponse.json({ token });
}
