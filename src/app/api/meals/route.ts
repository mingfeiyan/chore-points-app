import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import { MealType } from "@prisma/client";

// GET /api/meals - Get meal logs for the family
export async function GET(req: Request) {
  try {
    const session = await requireFamily();
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") || "7", 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const meals = await prisma.mealLog.findMany({
      where: {
        familyId: session.user.familyId!,
        date: {
          gte: startDate,
        },
      },
      include: {
        dish: {
          select: { id: true, name: true, photoUrl: true },
        },
        loggedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json({ meals });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST /api/meals - Log a meal
export async function POST(req: Request) {
  try {
    const session = await requireFamily();

    const { dishId, newDish, mealType, date } = await req.json();

    // Validate mealType
    if (!mealType || !Object.values(MealType).includes(mealType)) {
      return NextResponse.json(
        { error: "Valid meal type is required (BREAKFAST, LUNCH, or DINNER)" },
        { status: 400 }
      );
    }

    let finalDishId = dishId;

    // If new dish data provided, create the dish first
    if (newDish && !dishId) {
      if (!newDish.name || !newDish.photoUrl) {
        return NextResponse.json(
          { error: "New dish requires name and photoUrl" },
          { status: 400 }
        );
      }

      const createdDish = await prisma.dish.create({
        data: {
          name: newDish.name.trim(),
          photoUrl: newDish.photoUrl,
          familyId: session.user.familyId!,
          createdById: session.user.id,
        },
      });
      finalDishId = createdDish.id;
    }

    if (!finalDishId) {
      return NextResponse.json(
        { error: "Either dishId or newDish is required" },
        { status: 400 }
      );
    }

    // Verify dish belongs to family
    const dish = await prisma.dish.findFirst({
      where: {
        id: finalDishId,
        familyId: session.user.familyId!,
      },
    });

    if (!dish) {
      return NextResponse.json(
        { error: "Dish not found" },
        { status: 404 }
      );
    }

    const meal = await prisma.mealLog.create({
      data: {
        familyId: session.user.familyId!,
        dishId: finalDishId,
        mealType: mealType as MealType,
        date: date ? new Date(date) : new Date(),
        loggedById: session.user.id,
      },
      include: {
        dish: {
          select: { id: true, name: true, photoUrl: true },
        },
        loggedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ meal }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
