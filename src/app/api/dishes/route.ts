import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";

// GET /api/dishes - Get all dishes for the family
export async function GET() {
  try {
    const session = await requireFamily();

    const dishes = await prisma.dish.findMany({
      where: {
        familyId: session.user.familyId!,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ dishes });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST /api/dishes - Create a new dish
export async function POST(req: Request) {
  try {
    const session = await requireFamily();

    const { name, photoUrl, ingredients } = await req.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required and must be a string" },
        { status: 400 }
      );
    }

    if (!photoUrl || typeof photoUrl !== "string") {
      return NextResponse.json(
        { error: "Photo URL is required" },
        { status: 400 }
      );
    }

    // Clean up ingredients if provided
    let cleanedIngredients: string[] = [];
    if (ingredients !== undefined) {
      if (!Array.isArray(ingredients)) {
        return NextResponse.json(
          { error: "Ingredients must be an array" },
          { status: 400 }
        );
      }
      cleanedIngredients = ingredients
        .map((i: unknown) => String(i).trim())
        .filter((i: string) => i.length > 0);
    }

    const dish = await prisma.dish.create({
      data: {
        name: name.trim(),
        photoUrl,
        ingredients: cleanedIngredients,
        familyId: session.user.familyId!,
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ dish }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
