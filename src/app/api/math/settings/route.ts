import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";

// GET /api/math/settings - Get family's math settings
export async function GET() {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Parents only" }, { status: 403 });
    }

    let settings = await prisma.mathSettings.findUnique({
      where: { familyId: session.user.familyId! },
    });

    // Return defaults if no settings exist
    if (!settings) {
      settings = {
        id: "",
        familyId: session.user.familyId!,
        dailyQuestionCount: 2,
        additionEnabled: true,
        subtractionEnabled: true,
        multiplicationEnabled: false,
        divisionEnabled: false,
        additionMinA: 1,
        additionMaxA: 9,
        additionMinB: 10,
        additionMaxB: 99,
        allowCarrying: true,
        subtractionMinA: 10,
        subtractionMaxA: 99,
        subtractionMinB: 1,
        subtractionMaxB: 9,
        allowBorrowing: true,
        multiplicationMinA: 1,
        multiplicationMaxA: 10,
        multiplicationMinB: 1,
        multiplicationMaxB: 10,
        divisionMinDividend: 1,
        divisionMaxDividend: 100,
        divisionMinDivisor: 1,
        divisionMaxDivisor: 10,
        adaptiveDifficulty: false,
        focusAreas: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return NextResponse.json(settings);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 401 }
    );
  }
}

// PUT /api/math/settings - Update family's math settings
export async function PUT(req: Request) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Parents only" }, { status: 403 });
    }

    const data = await req.json();

    // Validate dailyQuestionCount
    if (data.dailyQuestionCount !== undefined) {
      const count = Number(data.dailyQuestionCount);
      if (isNaN(count) || count < 1 || count > 20) {
        return NextResponse.json(
          { error: "dailyQuestionCount must be between 1 and 20" },
          { status: 400 }
        );
      }
      data.dailyQuestionCount = count;
    }

    const settings = await prisma.mathSettings.upsert({
      where: { familyId: session.user.familyId! },
      create: {
        familyId: session.user.familyId!,
        ...data,
      },
      update: data,
    });

    return NextResponse.json(settings);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 500 }
    );
  }
}
