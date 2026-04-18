// Dolch sight words — the canonical list for early readers.
// Ordered roughly easy → hard: Pre-Primer (shortest/most common) first, then Primer.

export type StarterPack = {
  id: string;
  label: string;
  words: string[];
};

export const DOLCH_K_PACK: StarterPack = {
  id: "dolch-k",
  label: "Kindergarten (Dolch Pre-Primer + Primer)",
  words: [
    // Dolch Pre-Primer (40) — highest frequency, shortest
    "a", "I", "to", "the", "and", "is", "it", "in", "me", "my",
    "up", "we", "go", "see", "can", "for", "you", "not", "one", "two",
    "three", "big", "red", "blue", "yellow", "run", "play", "jump", "look", "help",
    "find", "make", "little", "here", "where", "come", "down", "away", "said", "funny",
    // Dolch Primer (52)
    "am", "at", "be", "do", "he", "on", "no", "so", "are", "all",
    "ate", "get", "eat", "our", "out", "ran", "saw", "say", "she", "too",
    "yes", "did", "new", "now", "but", "ride", "came", "four", "like", "must",
    "into", "that", "they", "this", "want", "well", "went", "what", "will", "with",
    "black", "brown", "white", "good", "have", "soon", "there", "under", "please", "pretty",
    "was", "who",
  ],
};

export const STARTER_PACKS: Record<string, StarterPack> = {
  [DOLCH_K_PACK.id]: DOLCH_K_PACK,
};
