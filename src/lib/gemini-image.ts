import { GoogleGenAI } from "@google/genai";
import { put } from "@vercel/blob";

const IMAGE_MODEL = "gemini-2.5-flash-image";

function sightWordPrompt(word: string): string {
  return [
    `Children's book cartoon illustration for the sight word "${word}".`,
    `Bright, cheerful colors. Clean white background. Simple, friendly style for a 5-year-old learning to read.`,
    `No text, no letters, no words in the image.`,
    `If the word is abstract (like "the", "is", "was", "and"), show a simple contextual scene a kindergartener would understand — e.g. a child pointing at something, a common playful moment.`,
  ].join(" ");
}

function badgePrompt(taskDescription: string): string {
  return [
    `Cute children's cartoon sticker illustration, circular composition.`,
    `The subject fills the whole frame edge-to-edge: ${taskDescription}.`,
    `Soft light-blue background behind the subject. Bright cheerful colors, friendly style for a 5-year-old.`,
    `Do not draw any border, ring, rim, outline, frame, or circle around the edge — the illustration runs clean to the image edge.`,
    `No text, no letters, no words, no numbers anywhere in the image.`,
  ].join(" ");
}

async function generateAndUpload(
  prompt: string,
  filenamePath: string,
  errorLabel: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: prompt,
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  const base64 = imagePart?.inlineData?.data;
  const mimeType = imagePart?.inlineData?.mimeType ?? "image/png";

  if (!base64) {
    throw new Error(`Gemini returned no image for ${errorLabel}`);
  }

  const buffer = Buffer.from(base64, "base64");
  const extension = mimeType.split("/")[1] ?? "png";
  const filename = `${filenamePath}-${Date.now()}.${extension}`;

  const blob = await put(filename, buffer, {
    access: "public",
    addRandomSuffix: true,
    contentType: mimeType,
  });

  return blob.url;
}

export async function generateSightWordImage(
  word: string,
  familyId: string
): Promise<string> {
  return generateAndUpload(
    sightWordPrompt(word),
    `families/${familyId}/sight-words/${word.toLowerCase()}`,
    `word "${word}"`
  );
}

export async function generateBadgeImage(
  taskDescription: string,
  familyId: string
): Promise<string> {
  const slug = taskDescription
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "badge";
  return generateAndUpload(
    badgePrompt(taskDescription),
    `families/${familyId}/badges/${slug}`,
    `badge "${taskDescription}"`
  );
}
