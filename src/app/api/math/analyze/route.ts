import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

// POST /api/math/analyze - Get AI insights on mistake patterns
export async function POST(req: Request) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Parents only" }, { status: 403 });
    }

    const { kidId } = await req.json();

    if (!kidId) {
      return NextResponse.json({ error: "kidId required" }, { status: 400 });
    }

    // Verify kid belongs to family
    const kid = await prisma.user.findUnique({
      where: { id: kidId },
    });

    if (!kid || kid.familyId !== session.user.familyId) {
      return NextResponse.json({ error: "Kid not found" }, { status: 404 });
    }

    // Get recent attempts (last 30 days, max 200)
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const attempts = await prisma.mathAttempt.findMany({
      where: {
        kidId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    if (attempts.length < 5) {
      return NextResponse.json({
        insights: [
          {
            type: "info",
            message: "Not enough data yet. Complete more math problems to get personalized insights.",
          },
        ],
        suggestedFocusAreas: [],
      });
    }

    // Format attempts for AI
    const wrongAttempts = attempts.filter((a) => !a.isCorrect);
    const correctAttempts = attempts.filter((a) => a.isCorrect);

    const attemptsSummary = {
      total: attempts.length,
      correct: correctAttempts.length,
      wrong: wrongAttempts.length,
      accuracy: Math.round((correctAttempts.length / attempts.length) * 100),
      wrongAnswers: wrongAttempts.slice(0, 50).map((a) => ({
        question: a.question,
        given: a.givenAnswer,
        correct: a.correctAnswer,
        type: a.questionType,
      })),
      byType: {} as Record<string, { total: number; correct: number }>,
    };

    for (const a of attempts) {
      if (!attemptsSummary.byType[a.questionType]) {
        attemptsSummary.byType[a.questionType] = { total: 0, correct: 0 };
      }
      attemptsSummary.byType[a.questionType].total++;
      if (a.isCorrect) attemptsSummary.byType[a.questionType].correct++;
    }

    const prompt = `Analyze this child's math practice data and provide 3-5 actionable insights for parents.

Data:
${JSON.stringify(attemptsSummary, null, 2)}

Guidelines:
- Look for patterns in wrong answers (off by 1, digit reversal, carrying/borrowing errors, etc.)
- Identify strengths and weaknesses by question type
- Suggest specific focus areas
- Be encouraging but honest
- Keep each insight to 1-2 sentences
- Format as JSON: { "insights": [{"type": "strength"|"weakness"|"pattern"|"suggestion", "message": "..."}], "suggestedFocusAreas": ["addition-carrying", "subtraction-borrowing", etc.] }`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    // Parse AI response
    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    let result;
    try {
      // Extract JSON from response (may be wrapped in markdown)
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      // Fallback if parsing fails
      result = {
        insights: [{ type: "info", message: content.text.slice(0, 500) }],
        suggestedFocusAreas: [],
      };
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("AI analysis error:", error);
    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
