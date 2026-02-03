import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import { autoConvertPlannedMeals } from "@/lib/meal-plan-convert";

// GET /api/daily-meals - Get daily meal logs for a date range
export async function GET(req: Request) {
  try {
    const session = await requireFamily();
    const url = new URL(req.url);

    const startParam = url.searchParams.get("start");
    const endParam = url.searchParams.get("end");

    if (!startParam || !endParam) {
      return NextResponse.json(
        { error: "start and end date parameters are required" },
        { status: 400 }
      );
    }

    // Parse and validate dates
    const start = new Date(`${startParam}T00:00:00`);
    const end = new Date(`${endParam}T23:59:59`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    if (start > end) {
      return NextResponse.json(
        { error: "start date must be before or equal to end date" },
        { status: 400 }
      );
    }

    // Auto-convert planned meals to logs for past dates in the range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      await autoConvertPlannedMeals(session.user.familyId!);
    }

    const logs = await prisma.dailyMealLog.findMany({
      where: {
        familyId: session.user.familyId!,
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        meals: {
          include: {
            dishes: {
              include: {
                dish: {
                  select: { id: true, name: true, photoUrl: true },
                },
              },
            },
          },
        },
        dailyItems: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    return NextResponse.json({ logs });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    if (errorMessage === "Unauthorized") {
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
    if (errorMessage.includes("Forbidden")) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST /api/daily-meals - Create or update a daily meal log
export async function POST(req: Request) {
  try {
    const session = await requireFamily();
    const { date, meals, dailyItems, notes } = await req.json();

    if (!date) {
      return NextResponse.json(
        { error: "date is required" },
        { status: 400 }
      );
    }

    const parsedDate = new Date(`${date}T12:00:00`);

    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Upsert the daily log with nested creates
    const log = await prisma.dailyMealLog.upsert({
      where: {
        familyId_date: {
          familyId: session.user.familyId!,
          date: parsedDate,
        },
      },
      update: {
        notes: notes || null,
        meals: {
          deleteMany: {},
          create: (meals || []).map((meal: { mealType: string; notes?: string; dishes: { dishId?: string; dishName: string; isFreeForm?: boolean }[] }) => ({
            mealType: meal.mealType,
            notes: meal.notes || null,
            dishes: {
              create: meal.dishes.map((dish) => ({
                dishId: dish.dishId || null,
                dishName: dish.dishName,
                isFreeForm: dish.isFreeForm ?? !dish.dishId,
              })),
            },
          })),
        },
        dailyItems: {
          deleteMany: {},
          create: (dailyItems || []).map((name: string) => ({ name })),
        },
      },
      create: {
        familyId: session.user.familyId!,
        date: parsedDate,
        notes: notes || null,
        meals: {
          create: (meals || []).map((meal: { mealType: string; notes?: string; dishes: { dishId?: string; dishName: string; isFreeForm?: boolean }[] }) => ({
            mealType: meal.mealType,
            notes: meal.notes || null,
            dishes: {
              create: meal.dishes.map((dish) => ({
                dishId: dish.dishId || null,
                dishName: dish.dishName,
                isFreeForm: dish.isFreeForm ?? !dish.dishId,
              })),
            },
          })),
        },
        dailyItems: {
          create: (dailyItems || []).map((name: string) => ({ name })),
        },
      },
      include: {
        meals: {
          include: {
            dishes: {
              include: {
                dish: {
                  select: { id: true, name: true, photoUrl: true },
                },
              },
            },
          },
        },
        dailyItems: true,
      },
    });

    return NextResponse.json({ log });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    if (errorMessage === "Unauthorized") {
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
    if (errorMessage.includes("Forbidden")) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
