import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";

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

    // Parse as local dates
    const start = new Date(`${startParam}T00:00:00`);
    const end = new Date(`${endParam}T23:59:59`);

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
