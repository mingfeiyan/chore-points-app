import { GoogleGenAI } from "@google/genai";
import { put } from "@vercel/blob";

const IMAGE_MODEL = "gemini-2.5-flash-image-preview";

function buildPrompt(word: string): string {
  return [
    `Children's book cartoon illustration for the sight word "${word}".`,
    `Bright, cheerful colors. Clean white background. Simple, friendly style for a 5-year-old learning to read.`,
    `No text, no letters, no words in the image.`,
    `If the word is abstract (like "the", "is", "was", "and"), show a simple contextual scene a kindergartener would understand — e.g. a child pointing at something, a common playful moment.`,
  ].join(" ");
}

export async function generateSightWordImage(
  word: string,
  familyId: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: buildPrompt(word),
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  const base64 = imagePart?.inlineData?.data;
  const mimeType = imagePart?.inlineData?.mimeType ?? "image/png";

  if (!base64) {
    throw new Error(`Gemini returned no image for word "${word}"`);
  }

  const buffer = Buffer.from(base64, "base64");
  const extension = mimeType.split("/")[1] ?? "png";
  const filename = `families/${familyId}/sight-words/${word.toLowerCase()}-${Date.now()}.${extension}`;

  const blob = await put(filename, buffer, {
    access: "public",
    addRandomSuffix: true,
    contentType: mimeType,
  });

  return blob.url;
}
