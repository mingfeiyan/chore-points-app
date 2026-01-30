import { NextResponse } from "next/server";
import { requireFamily } from "@/lib/permissions";
import Anthropic from "@anthropic-ai/sdk";

type DishInput = {
  name: string;
  ingredients: string[];
};

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

    // Check if API key is configured
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI feedback is not configured" },
        { status: 503 }
      );
    }

    const { dishes, language = "en" } = await req.json();

    if (!Array.isArray(dishes) || dishes.length === 0) {
      return NextResponse.json(
        { error: "No dishes provided" },
        { status: 400 }
      );
    }

    // Find dishes without ingredients
    const missingIngredientsDishes = dishes
      .filter((d: DishInput) => !d.ingredients || d.ingredients.length === 0)
      .map((d: DishInput) => d.name);

    // Build the dish list for the prompt
    const dishList = dishes
      .map((d: DishInput) => {
        if (d.ingredients && d.ingredients.length > 0) {
          return `- ${d.name}: ${d.ingredients.join(", ")}`;
        }
        return `- ${d.name} (no ingredients listed)`;
      })
      .join("\n");

    const languageInstruction =
      language === "zh"
        ? "Respond in Chinese (简体中文)."
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

    return NextResponse.json(feedback);
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
