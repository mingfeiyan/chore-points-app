// Seeded random number generator (mulberry32)
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Create a seed from date string and kidId
function createSeed(dateStr: string, kidId: string): number {
  let hash = 0;
  const combined = dateStr + kidId;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export type MathProblem = {
  a: number;
  b: number;
  answer: number;
};

export type DailyMathProblems = {
  addition: MathProblem;
  subtraction: MathProblem;
};

/**
 * Generate deterministic math problems for a given date and kid.
 * Addition: two numbers that sum to <= 99
 * Subtraction: first number <= 100, second <= first (result >= 0)
 */
export function generateDailyMathProblems(
  dateStr: string,
  kidId: string
): DailyMathProblems {
  const seed = createSeed(dateStr, kidId);
  const random = mulberry32(seed);

  // Addition: a + b <= 99
  // Pick a between 1-98, then b between 1-(99-a)
  const addA = Math.floor(random() * 98) + 1; // 1-98
  const maxAddB = 99 - addA;
  const addB = Math.floor(random() * maxAddB) + 1; // 1 to (99-a)

  // Subtraction: a <= 100, b <= a, result >= 0
  // Pick a between 2-100, then b between 1-(a-1) to ensure positive result
  const subA = Math.floor(random() * 99) + 2; // 2-100
  const subB = Math.floor(random() * (subA - 1)) + 1; // 1 to (a-1)

  return {
    addition: { a: addA, b: addB, answer: addA + addB },
    subtraction: { a: subA, b: subB, answer: subA - subB },
  };
}

/**
 * Get today's date string in the given timezone.
 */
export function getLocalDateString(
  date: Date,
  timezone: string = "America/Los_Angeles"
): string {
  return date.toLocaleDateString("en-CA", { timeZone: timezone }); // "YYYY-MM-DD"
}
