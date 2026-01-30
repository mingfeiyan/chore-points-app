import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import { MealType } from "@prisma/client";

// PATCH /api/meals/[id] - Update a meal log
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireFamily();
    const { id } = await params;
    const { mealType, date, cookedById } = await req.json();

    // Find the meal and verify it belongs to the family
    const existingMeal = await prisma.mealLog.findFirst({
      where: {
        id,
        familyId: session.user.familyId!,
      },
    });

    if (!existingMeal) {
      return NextResponse.json(
        { error: "Meal not found" },
        { status: 404 }
      );
    }

    // Validate mealType if provided
    if (mealType && !Object.values(MealType).includes(mealType)) {
      return NextResponse.json(
        { error: "Valid meal type is required (BREAKFAST, LUNCH, or DINNER)" },
        { status: 400 }
      );
    }

    // Parse date as local noon to avoid UTC midnight timezone issues
    const parsedDate = date ? new Date(`${date}T12:00:00`) : undefined;

    const meal = await prisma.mealLog.update({
      where: { id },
      data: {
        ...(mealType && { mealType: mealType as MealType }),
        ...(parsedDate && { date: parsedDate }),
        ...(cookedById !== undefined && { cookedById: cookedById || null }),
      },
      include: {
        dish: {
          select: { id: true, name: true, photoUrl: true },
        },
        loggedBy: {
          select: { id: true, name: true, email: true },
        },
        cookedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ meal });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE /api/meals/[id] - Delete a meal log
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireFamily();
    const { id } = await params;

    // Find the meal and verify it belongs to the family
    const existingMeal = await prisma.mealLog.findFirst({
      where: {
        id,
        familyId: session.user.familyId!,
      },
    });

    if (!existingMeal) {
      return NextResponse.json(
        { error: "Meal not found" },
        { status: 404 }
      );
    }

    await prisma.mealLog.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
