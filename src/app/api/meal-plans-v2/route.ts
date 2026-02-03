import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import { getWeekStart } from "@/lib/week-utils";

// GET /api/meal-plans-v2 - Get meal plan for a week
export async function GET(req: Request) {
  try {
    const session = await requireFamily();
    const { searchParams } = new URL(req.url);

    const weekParam = searchParams.get("week");
    let weekStart: Date;

    if (weekParam) {
      const parsedDate = new Date(`${weekParam}T12:00:00`);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid week date format. Use YYYY-MM-DD" },
          { status: 400 }
        );
      }
      weekStart = getWeekStart(parsedDate);
    } else {
      // Default to next week
      const today = new Date();
      const thisWeekStart = getWeekStart(today);
      weekStart = new Date(thisWeekStart);
      weekStart.setDate(weekStart.getDate() + 7);
    }

    const plan = await prisma.mealPlan.findUnique({
      where: {
        familyId_weekStart: {
          familyId: session.user.familyId!,
          weekStart,
        },
      },
      include: {
        plannedDays: {
          include: {
            meals: {
              include: {
                dishes: {
                  include: {
                    dish: {
                      select: { id: true, name: true, photoUrl: true, ingredients: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: { date: "asc" },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ plan, weekStart: weekStart.toISOString() });
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

type PlannedDayInput = {
  date: string;
  meals: {
    mealType: string;
    notes?: string;
    dishes: { dishId?: string; dishName: string; isFreeForm?: boolean }[];
  }[];
};

// POST /api/meal-plans-v2 - Create or update a meal plan
export async function POST(req: Request) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Only parents can create meal plans" }, { status: 403 });
    }

    const { weekStart: weekStartParam, plannedDays, weeklyStaples } = await req.json();

    if (!weekStartParam) {
      return NextResponse.json({ error: "weekStart is required" }, { status: 400 });
    }

    const parsedWeekStart = new Date(`${weekStartParam}T12:00:00`);
    if (isNaN(parsedWeekStart.getTime())) {
      return NextResponse.json(
        { error: "Invalid weekStart date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const weekStart = getWeekStart(parsedWeekStart);

    const plan = await prisma.mealPlan.upsert({
      where: {
        familyId_weekStart: {
          familyId: session.user.familyId!,
          weekStart,
        },
      },
      update: {
        weeklyStaples: weeklyStaples || [],
        plannedDays: {
          deleteMany: {},
          create: (plannedDays || []).map((day: PlannedDayInput) => ({
            date: new Date(`${day.date}T12:00:00`),
            meals: {
              create: day.meals.map((meal) => ({
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
          })),
        },
      },
      create: {
        familyId: session.user.familyId!,
        weekStart,
        createdById: session.user.id,
        weeklyStaples: weeklyStaples || [],
        plannedDays: {
          create: (plannedDays || []).map((day: PlannedDayInput) => ({
            date: new Date(`${day.date}T12:00:00`),
            meals: {
              create: day.meals.map((meal) => ({
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
          })),
        },
      },
      include: {
        plannedDays: {
          include: {
            meals: {
              include: {
                dishes: {
                  include: {
                    dish: {
                      select: { id: true, name: true, photoUrl: true, ingredients: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: { date: "asc" },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ plan });
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
