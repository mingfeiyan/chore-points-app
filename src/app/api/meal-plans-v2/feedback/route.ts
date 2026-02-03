import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import Anthropic from "@anthropic-ai/sdk";

type BreakdownCategory = {
  status: "good" | "limited" | "missing";
  items: string[];
};

type FeedbackResponse = {
  summary: string;
  breakdown: {
    proteins: BreakdownCategory;
    vegetables: BreakdownCategory;
    grains: BreakdownCategory;
    dairy: BreakdownCategory;
    fruits: BreakdownCategory;
  };
  suggestions: string[];
  missingIngredientsDishes: string[];
};

type PlannedDayWithMeals = {
  id: string;
  date: Date;
  meals: {
    id: string;
    mealType: string;
    notes: string | null;
    dishes: {
      id: string;
      dishId: string | null;
      dishName: string;
      isFreeForm: boolean;
      dish: {
        id: string;
        name: string;
        photoUrl: string | null;
        ingredients: string[];
      } | null;
    }[];
  }[];
};

export async function POST(req: Request) {
  try {
    const session = await requireFamily();

    // Only parents can request feedback
    if (session.user.role !== "PARENT") {
      return NextResponse.json(
        { error: "Only parents can request meal plan feedback" },
        { status: 403 }
      );
    }

    const { planId, language = "en" } = await req.json();

    if (!planId) {
      return NextResponse.json(
        { error: "planId is required" },
        { status: 400 }
      );
    }

    // Fetch the meal plan with all nested data, scoped to user's family
    const plan = await prisma.mealPlan.findFirst({
      where: {
        id: planId,
        familyId: session.user.familyId!,
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
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Meal plan not found" },
        { status: 404 }
      );
    }

    // Check if API key is configured
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI feedback is not configured" },
        { status: 503 }
      );
    }

    // Build meal summary for AI prompt
    const { dishList, missingIngredientsDishes } = buildMealSummary(plan.plannedDays, plan.weeklyStaples);

    const languageInstruction =
      language === "zh"
        ? "Respond in Chinese (simplified)."
        : "Respond in English.";

    const systemPrompt = `You are a friendly family nutritionist helping parents plan healthy meals for their family. Analyze meal plans and provide constructive, practical feedback.

Your response must be valid JSON with this exact structure:
{
  "summary": "2-3 sentence overall assessment of the meal plan",
  "breakdown": {
    "proteins": { "status": "good|limited|missing", "items": ["list of proteins found"] },
    "vegetables": { "status": "good|limited|missing", "items": ["list of vegetables found"] },
    "grains": { "status": "good|limited|missing", "items": ["list of grains found"] },
    "dairy": { "status": "good|limited|missing", "items": ["list of dairy found"] },
    "fruits": { "status": "good|limited|missing", "items": ["list of fruits found"] }
  },
  "suggestions": ["3-5 specific, actionable suggestions to improve the meal plan"]
}

Use "good" if there's variety (3+ items), "limited" if there's some (1-2 items), "missing" if none.
${languageInstruction}`;

    const userPrompt = `Please analyze this weekly meal plan and provide health feedback:

${dishList}

Remember to respond with valid JSON only, no markdown or other formatting.`;

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    // Extract text content from response
    const textContent = message.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from AI");
    }

    // Parse the JSON response
    let feedback: FeedbackResponse;
    try {
      feedback = JSON.parse(textContent.text);
    } catch {
      // If JSON parsing fails, create a fallback response
      feedback = {
        summary: textContent.text.slice(0, 200),
        breakdown: {
          proteins: { status: "limited", items: [] },
          vegetables: { status: "limited", items: [] },
          grains: { status: "limited", items: [] },
          dairy: { status: "missing", items: [] },
          fruits: { status: "missing", items: [] },
        },
        suggestions: ["Unable to parse detailed feedback. Please try again."],
        missingIngredientsDishes: [],
      };
    }

    // Add missing ingredients dishes to response
    feedback.missingIngredientsDishes = missingIngredientsDishes;

    // Save feedback to mealPlan
    await prisma.mealPlan.update({
      where: { id: planId },
      data: {
        aiRecommendation: JSON.stringify(feedback),
        aiGeneratedAt: new Date(),
      },
    });

    return NextResponse.json({ feedback });
  } catch (error: unknown) {
    console.error("Meal plan feedback error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to get feedback";

    if (errorMessage === "Unauthorized") {
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
    if (errorMessage.includes("Forbidden")) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

function buildMealSummary(
  plannedDays: PlannedDayWithMeals[],
  weeklyStaples: string[]
): { dishList: string; missingIngredientsDishes: string[] } {
  const missingIngredientsDishes: string[] = [];
  const lines: string[] = [];

  // Add weekly staples
  if (weeklyStaples.length > 0) {
    lines.push(`Weekly Staples: ${weeklyStaples.join(", ")}`);
    lines.push("");
  }

  // Process each day
  for (const day of plannedDays) {
    const dateStr = day.date.toISOString().split("T")[0];
    lines.push(`${dateStr}:`);

    for (const meal of day.meals) {
      lines.push(`  ${meal.mealType}:`);

      for (const dishRef of meal.dishes) {
        const ingredients = dishRef.dish?.ingredients || [];
        if (ingredients.length > 0) {
          lines.push(`    - ${dishRef.dishName}: ${ingredients.join(", ")}`);
        } else {
          lines.push(`    - ${dishRef.dishName} (no ingredients listed)`);
          missingIngredientsDishes.push(dishRef.dishName);
        }
      }
    }
    lines.push("");
  }

  return {
    dishList: lines.join("\n"),
    missingIngredientsDishes,
  };
}
