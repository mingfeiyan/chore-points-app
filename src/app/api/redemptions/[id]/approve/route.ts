import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParentInFamily } from "@/lib/permissions";

// PUT /api/redemptions/[id]/approve - Parent approves a redemption
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireParentInFamily();

    const { id } = await params;

    // Get the redemption
    const redemption = await prisma.redemption.findUnique({
      where: { id },
      include: {
        reward: true,
      },
    });

    if (!redemption) {
      return NextResponse.json(
        { error: "Redemption not found" },
        { status: 404 }
      );
    }

    if (redemption.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: "Forbidden: Redemption belongs to another family" },
        { status: 403 }
      );
    }

    if (redemption.status !== "PENDING") {
      return NextResponse.json(
        { error: "Redemption has already been resolved" },
        { status: 400 }
      );
    }

    // Check kid still has enough points
    const pointEntries = await prisma.pointEntry.findMany({
      where: {
        kidId: redemption.kidId,
        familyId: session.user.familyId!,
      },
    });

    const totalPoints = pointEntries.reduce((sum: number, entry: { points: number }) => sum + entry.points, 0);

    if (totalPoints < redemption.reward.costPoints) {
      return NextResponse.json(
        { error: "Kid no longer has enough points for this redemption" },
        { status: 400 }
      );
    }

    // Use a transaction to:
    // 1. Update redemption status
    // 2. Create negative point entry
    const result = await prisma.$transaction(async (tx) => {
      // Update redemption
      const updatedRedemption = await tx.redemption.update({
        where: { id },
        data: {
          status: "APPROVED",
          resolvedAt: new Date(),
          resolvedById: session.user.id,
        },
      });

      // Create negative point entry
      await tx.pointEntry.create({
        data: {
          familyId: session.user.familyId!,
          kidId: redemption.kidId,
          points: -redemption.reward.costPoints,
          note: `Redeemed: ${redemption.reward.title}`,
          redemptionId: redemption.id,
          createdById: session.user.id,
          updatedById: session.user.id,
        },
      });

      return updatedRedemption;
    });

    // Fetch the complete redemption with relations
    const completeRedemption = await prisma.redemption.findUnique({
      where: { id },
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
    });

    return NextResponse.json({ redemption: completeRedemption });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
