import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireParentInFamily } from "@/lib/permissions";
import OpenAI from "openai";

const openai = new OpenAI();

type Message = {
  role: "user" | "assistant";
  content: string;
};

// Tool definitions for OpenAI
const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_family_kids",
      description:
        "Get all kids in the parent's family with their current point balances. Call this when you need to know which kids are in the family or check balances.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_points",
      description:
        "Add or remove points for a kid. Use positive numbers to award points and negative numbers to deduct points. Always include a reason/note.",
      parameters: {
        type: "object",
        properties: {
          kidId: {
            type: "string",
            description: "The ID of the kid to add/remove points for",
          },
          points: {
            type: "number",
            description:
              "Number of points to add (positive) or remove (negative)",
          },
          note: {
            type: "string",
            description:
              "Reason for the point change, e.g. 'Cleaned his room'",
          },
        },
        required: ["kidId", "points", "note"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_available_chores",
      description:
        "Get the list of defined chores with their default point values. Useful when you need to suggest point amounts.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];

// Execute tool calls against the database
async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  familyId: string,
  parentId: string
): Promise<string> {
  switch (toolName) {
    case "get_family_kids": {
      const kids = await prisma.user.findMany({
        where: { familyId, role: "KID" },
        select: { id: true, name: true, email: true },
      });

      const kidsWithPoints = await Promise.all(
        kids.map(async (kid) => {
          const entries = await prisma.pointEntry.findMany({
            where: { familyId, kidId: kid.id },
            select: { points: true },
          });
          const totalPoints = entries.reduce((sum, e) => sum + e.points, 0);
          return { ...kid, totalPoints };
        })
      );

      return JSON.stringify(kidsWithPoints);
    }

    case "add_points": {
      const { kidId, points, note } = toolInput as {
        kidId: string;
        points: number;
        note: string;
      };

      const kid = await prisma.user.findUnique({ where: { id: kidId } });
      if (!kid || kid.familyId !== familyId || kid.role !== "KID") {
        return JSON.stringify({ error: "Kid not found in your family" });
      }

      const entry = await prisma.pointEntry.create({
        data: {
          familyId,
          kidId,
          points,
          note,
          date: new Date(),
          createdById: parentId,
          updatedById: parentId,
        },
      });

      const entries = await prisma.pointEntry.findMany({
        where: { familyId, kidId },
        select: { points: true },
      });
      const newTotal = entries.reduce((sum, e) => sum + e.points, 0);

      return JSON.stringify({
        success: true,
        kidName: kid.name,
        pointsChanged: points,
        newTotal,
        entryId: entry.id,
      });
    }

    case "get_available_chores": {
      const chores = await prisma.chore.findMany({
        where: { familyId, isActive: true },
        select: { id: true, title: true, icon: true, defaultPoints: true },
        orderBy: { title: "asc" },
      });
      return JSON.stringify(chores);
    }

    default:
      return JSON.stringify({ error: "Unknown tool" });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireParentInFamily();
    const familyId = session.user.familyId!;
    const parentId = session.user.id;

    const { message, history = [] } = (await req.json()) as {
      message: string;
      history: Message[];
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are GemSteps Assistant, a helpful AI for managing kids' chore points. You help parents award and track points for their children.

Key behaviors:
- When a parent mentions a kid doing something, figure out an appropriate number of points (1-10 range typically) and add them. If the parent specifies points, use that amount.
- When asked to remove or deduct points, use negative numbers.
- Always call get_family_kids first if you don't know the kids' names/IDs yet.
- If a message is ambiguous about which kid, ask for clarification.
- If a message mentions something a kid did but doesn't specify points, suggest a reasonable amount (3-5 for small tasks, 5-8 for medium, 8-10 for big tasks) and add them.
- For balance queries, call get_family_kids and report the balances.
- Be warm, encouraging, and brief in responses. Use the kid's name.
- After adding or removing points, confirm the action and mention the new balance.
- You can reference get_available_chores if you want to match activities to defined chores.`;

    // Build messages for OpenAI
    const apiMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    for (const m of history) {
      if (m.role === "user" || m.role === "assistant") {
        apiMessages.push({ role: m.role, content: m.content });
      }
    }
    apiMessages.push({ role: "user", content: message });

    // Agentic loop
    let currentMessages = apiMessages;
    let response: OpenAI.ChatCompletion;
    const maxIterations = 5;
    let iteration = 0;
    let assistantContent = "";

    while (iteration < maxIterations) {
      iteration++;

      response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 1024,
        messages: currentMessages,
        tools,
      });

      const choice = response.choices[0];

      if (choice.finish_reason === "stop" || !choice.message.tool_calls?.length) {
        assistantContent = choice.message.content || "I processed your request.";
        break;
      }

      // Handle tool calls
      currentMessages = [
        ...currentMessages,
        choice.message,
      ];

      for (const toolCall of choice.message.tool_calls) {
        if (toolCall.type !== "function") continue;
        const fn = toolCall.function;
        const toolInput = JSON.parse(fn.arguments);
        const result = await executeTool(
          fn.name,
          toolInput,
          familyId,
          parentId
        );
        currentMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }
    }

    // Gather updated balances for the UI
    const kids = await prisma.user.findMany({
      where: { familyId, role: "KID" },
      select: { id: true, name: true },
    });

    const balances: Record<string, number> = {};
    for (const kid of kids) {
      const entries = await prisma.pointEntry.findMany({
        where: { familyId, kidId: kid.id },
        select: { points: true },
      });
      balances[kid.id] = entries.reduce((sum, e) => sum + e.points, 0);
    }

    return NextResponse.json({
      response: assistantContent,
      balances,
    });
  } catch (error: unknown) {
    console.error("AI chat error:", error);
    const msg = error instanceof Error ? error.message : "Chat failed";
    if (msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    if (msg.includes("Forbidden")) {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
