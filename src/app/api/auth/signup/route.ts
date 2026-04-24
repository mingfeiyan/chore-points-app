import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { authRateLimiter, checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  // Rate limit: 5 attempts per minute per IP
  const rateLimitResponse = checkRateLimit(req, authRateLimiter);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { email, password, name, inviteCode, registrationSecret, role: requestedRole } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Determine role - use requested role or default to PARENT
    const role: "PARENT" | "KID" = requestedRole === "KID" ? "KID" : "PARENT";
    let familyId: string | null = null;

    if (inviteCode) {
      // Invite code provided - validate and join family
      const family = await prisma.family.findUnique({
        where: { inviteCode },
      });

      if (!family) {
        return NextResponse.json(
          { error: "Invalid invite code" },
          { status: 400 }
        );
      }

      familyId = family.id;
    } else if (role === "PARENT") {
      // Parent signup without invite code must present a valid REGISTRATION_SECRET.
      // Fail closed: if the env var is missing in the current deployment, reject —
      // otherwise a misconfigured env would silently allow open signups.
      const expectedSecret = process.env.REGISTRATION_SECRET;
      if (!expectedSecret || registrationSecret !== expectedSecret) {
        return NextResponse.json(
          { error: "Invalid registration code" },
          { status: 400 }
        );
      }
    } else {
      // Kid signup requires invite code
      return NextResponse.json(
        { error: "Invite code is required for kid signup" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        role,
        familyId,
      },
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          familyId: user.familyId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
