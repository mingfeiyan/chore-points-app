import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";

// GET /api/redemptions - Get redemptions for the family
export async function GET(req: Request) {
  try {
    const session = await requireFamily();

    if (!session.user.familyId) {
      return NextResponse.json(
        { error: "Must be part of a family" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const kidId = searchParams.get("kidId");
    const status = searchParams.get("status");

    const where: any = {
      familyId: session.user.familyId,
    };

    if (kidId) {
      where.kidId = kidId;
    }

    if (status) {
      where.status = status;
    }

    const redemptions = await prisma.redemption.findMany({
      where,
      include: {
        kid: {
          select: { name: true, email: true },
        },
        reward: {
          select: { title: true, costPoints: true, imageUrl: true },
        },
        resolvedBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: {
        requestedAt: "desc",
      },
    });

    return NextResponse.json({ redemptions });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}

// POST /api/redemptions - Kid requests a redemption
export async function POST(req: Request) {
  try {
    const session = await requireFamily();

    if (!session.user.familyId) {
      return NextResponse.json(
        { error: "Must be part of a family" },
        { status: 403 }
      );
    }

    if (session.user.role !== "KID") {
      return NextResponse.json(
        { error: "Only kids can request redemptions" },
        { status: 403 }
      );
    }

    const { rewardId } = await req.json();

    if (!rewardId) {
      return NextResponse.json(
        { error: "Reward ID is required" },
        { status: 400 }
      );
    }

    // Get the reward
    const reward = await prisma.reward.findUnique({
      where: { id: rewardId },
    });

    if (!reward) {
      return NextResponse.json(
        { error: "Reward not found" },
        { status: 404 }
      );
    }

    if (reward.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: "Reward belongs to another family" },
        { status: 403 }
      );
    }

    // Calculate kid's current points
    const pointEntries = await prisma.pointEntry.findMany({
      where: {
        kidId: session.user.id,
        familyId: session.user.familyId,
      },
    });

    const totalPoints = pointEntries.reduce((sum: number, entry: { points: number }) => sum + entry.points, 0);

    if (totalPoints < reward.costPoints) {
      return NextResponse.json(
        { error: "Insufficient points for this reward" },
        { status: 400 }
      );
    }

    // Create redemption request
    const redemption = await prisma.redemption.create({
      data: {
        familyId: session.user.familyId,
        kidId: session.user.id,
        rewardId: reward.id,
        status: "PENDING",
      },
      include: {
        kid: {
          select: { name: true, email: true },
        },
        reward: {
          select: { title: true, costPoints: true, imageUrl: true },
        },
      },
    });

    return NextResponse.json({ redemption }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
