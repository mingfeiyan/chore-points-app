import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/dishes/[id] - Get a single dish
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await requireFamily();

    const dish = await prisma.dish.findUnique({
      where: {
        id,
        familyId: session.user.familyId!,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!dish) {
      return NextResponse.json(
        { error: "Dish not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ dish });
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

// PATCH /api/dishes/[id] - Update dish (e.g., add/edit ingredients)
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await requireFamily();

    // Only parents can edit dishes
    if (session.user.role !== "PARENT") {
      return NextResponse.json(
        { error: "Only parents can edit dishes" },
        { status: 403 }
      );
    }

    // Verify dish exists and belongs to family
    const existingDish = await prisma.dish.findUnique({
      where: {
        id,
        familyId: session.user.familyId!,
      },
    });

    if (!existingDish) {
      return NextResponse.json(
        { error: "Dish not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, ingredients, photoUrl } = body;

    // Build update data
    const updateData: { name?: string; ingredients?: string[]; photoUrl?: string } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json(
          { error: "Name must be a non-empty string" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (photoUrl !== undefined) {
      if (typeof photoUrl !== "string" || !photoUrl.trim()) {
        return NextResponse.json(
          { error: "Photo URL must be a non-empty string" },
          { status: 400 }
        );
      }
      updateData.photoUrl = photoUrl;
    }

    if (ingredients !== undefined) {
      if (!Array.isArray(ingredients)) {
        return NextResponse.json(
          { error: "Ingredients must be an array" },
          { status: 400 }
        );
      }
      // Clean up ingredients: trim whitespace, filter empty strings
      updateData.ingredients = ingredients
        .map((i: unknown) => String(i).trim())
        .filter((i: string) => i.length > 0);
    }

    const dish = await prisma.dish.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ dish });
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

// DELETE /api/dishes/[id] - Delete a dish
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await requireFamily();

    // Only parents can delete dishes
    if (session.user.role !== "PARENT") {
      return NextResponse.json(
        { error: "Only parents can delete dishes" },
        { status: 403 }
      );
    }

    // Verify dish exists and belongs to family
    const existingDish = await prisma.dish.findUnique({
      where: {
        id,
        familyId: session.user.familyId!,
      },
    });

    if (!existingDish) {
      return NextResponse.json(
        { error: "Dish not found" },
        { status: 404 }
      );
    }

    await prisma.dish.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
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
