import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/permissions";

// PUT /api/todos/[todoId] - Update a todo
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ todoId: string }> }
) {
  try {
    const session = await getSession();
    const { todoId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.familyId) {
      return NextResponse.json({ error: "No family" }, { status: 400 });
    }

    if (session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Parents only" }, { status: 403 });
    }

    // Check todo exists and belongs to family
    const existingTodo = await prisma.familyTodo.findFirst({
      where: {
        id: todoId,
        familyId: session.user.familyId,
      },
    });

    if (!existingTodo) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, icon, isCompleted, dueDate, assignedTo } = body;

    const updateData: {
      title?: string;
      icon?: string | null;
      isCompleted?: boolean;
      dueDate?: Date | null;
      assignedTo?: string | null;
    } = {};

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim() === "") {
        return NextResponse.json(
          { error: "Title cannot be empty" },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }

    if (icon !== undefined) {
      updateData.icon = icon || null;
    }

    if (isCompleted !== undefined) {
      updateData.isCompleted = Boolean(isCompleted);
    }

    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo || null;
    }

    const todo = await prisma.familyTodo.update({
      where: { id: todoId },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ todo });
  } catch (error) {
    console.error("Error updating todo:", error);
    return NextResponse.json(
      { error: "Failed to update todo" },
      { status: 500 }
    );
  }
}

// DELETE /api/todos/[todoId] - Delete a todo
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ todoId: string }> }
) {
  try {
    const session = await getSession();
    const { todoId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.familyId) {
      return NextResponse.json({ error: "No family" }, { status: 400 });
    }

    if (session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Parents only" }, { status: 403 });
    }

    // Check todo exists and belongs to family
    const existingTodo = await prisma.familyTodo.findFirst({
      where: {
        id: todoId,
        familyId: session.user.familyId,
      },
    });

    if (!existingTodo) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    await prisma.familyTodo.delete({
      where: { id: todoId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting todo:", error);
    return NextResponse.json(
      { error: "Failed to delete todo" },
      { status: 500 }
    );
  }
}
