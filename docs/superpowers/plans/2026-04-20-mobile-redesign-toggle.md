# Mobile Redesign with Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a full mobile UI redesign (Coin Arcade kid side + Paper Garden parent side) behind a localStorage toggle controlled from parent Settings.

**Architecture:** Layout-level conditional rendering via a `useNewDesign()` context hook. All new components live under `src/components/v2/`. Existing route files get a thin conditional wrapper. No backend/schema changes — the redesign is purely a frontend layer swap.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4 (CSS-first config via `@theme inline`), next-intl, existing Prisma models + API routes, canvas-confetti (already installed).

---

## File Structure

```
src/
  hooks/
    useNewDesign.ts              # Context + hook + provider
  components/
    v2/
      NewDesignProvider.tsx       # localStorage-backed provider
      Coin.tsx                   # Gem SVG (16/44/100-180px)
      CoinSmall.tsx              # Simplified gem for inline (14-22px)
      CoinCounter.tsx            # Animated count-up + confetti + flame
      Confetti.tsx               # Reusable confetti particle system
      FlameIcon.tsx              # Flame SVG with gradient
      Gemmy.tsx                  # Mascot with 7 mood variants
      BadgeFrame.tsx             # Tier-ring badge wrapper
      KidHeaderBG.tsx            # Cobalt gradient header
      KidTabBar.tsx              # Kid 5-tab bottom nav
      PaperCard.tsx              # Parent warm-bordered card
      ParentTabBar.tsx           # Parent bottom nav
      OverflowMenu.tsx           # "..." dropdown menu
      kid/
        KidHome.tsx              # Kid home screen
        KidCalendar.tsx          # Kid calendar/streak view
        KidBadges.tsx            # Badge grid with filters
        KidLearnEntry.tsx        # Learn session entry point
        KidGallery.tsx           # Photo gallery with coin stamps
      learn/
        LearnSession.tsx         # Session reducer + router
        LearnHeader.tsx          # Shared session header chrome
        LearnPreview.tsx         # Step 1: word preview
        SightWordsMissing.tsx    # Step 2: missing letter quiz
        CorrectCelebration.tsx   # Step 3: celebration overlay
        MathSolve.tsx            # Step 4: math with keypad
        MathSpeedRound.tsx       # Step 5: timed speed round
        SessionComplete.tsx      # Step 6: results screen
      parent/
        ParentHome.tsx           # Parent dashboard
        ParentLedger.tsx         # Transaction history
        ParentCalendar.tsx       # Family week calendar
```

---

## Phase 1: Toggle Infrastructure + Design Tokens

### Task 1: NewDesignProvider + useNewDesign hook

**Files:**
- Create: `src/components/v2/NewDesignProvider.tsx`
- Create: `src/hooks/useNewDesign.ts`
- Modify: `src/app/layout.tsx`
- Test: `src/__tests__/hooks/useNewDesign.test.ts`

- [ ] **Step 1: Write the test for the hook**

```typescript
// src/__tests__/hooks/useNewDesign.test.ts
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useNewDesign, NewDesignProvider } from "@/hooks/useNewDesign";

describe("useNewDesign", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to false when localStorage is empty", () => {
    const { result } = renderHook(() => useNewDesign(), {
      wrapper: NewDesignProvider,
    });
    expect(result.current.isNewDesign).toBe(false);
  });

  it("reads true from localStorage", () => {
    localStorage.setItem("gemsteps-new-ui", "true");
    const { result } = renderHook(() => useNewDesign(), {
      wrapper: NewDesignProvider,
    });
    expect(result.current.isNewDesign).toBe(true);
  });

  it("toggle updates localStorage and state", () => {
    const { result } = renderHook(() => useNewDesign(), {
      wrapper: NewDesignProvider,
    });
    act(() => {
      result.current.setNewDesign(true);
    });
    expect(result.current.isNewDesign).toBe(true);
    expect(localStorage.getItem("gemsteps-new-ui")).toBe("true");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/__tests__/hooks/useNewDesign.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create the hook and provider**

```typescript
// src/hooks/useNewDesign.ts
"use client";

import { createContext, useContext } from "react";

type NewDesignContextType = {
  isNewDesign: boolean;
  setNewDesign: (value: boolean) => void;
};

export const NewDesignContext = createContext<NewDesignContextType>({
  isNewDesign: false,
  setNewDesign: () => {},
});

export function useNewDesign() {
  return useContext(NewDesignContext);
}

export { default as NewDesignProvider } from "@/components/v2/NewDesignProvider";
```

```typescript
// src/components/v2/NewDesignProvider.tsx
"use client";

import { useState, useEffect, ReactNode } from "react";
import { NewDesignContext } from "@/hooks/useNewDesign";

const STORAGE_KEY = "gemsteps-new-ui";

export default function NewDesignProvider({ children }: { children: ReactNode }) {
  const [isNewDesign, setIsNewDesign] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setIsNewDesign(true);
    }
    setMounted(true);
  }, []);

  const setNewDesign = (value: boolean) => {
    setIsNewDesign(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <NewDesignContext.Provider value={{ isNewDesign, setNewDesign }}>
      {children}
    </NewDesignContext.Provider>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/__tests__/hooks/useNewDesign.test.ts`
Expected: PASS

- [ ] **Step 5: Wire provider into layout**

In `src/app/layout.tsx`, add `NewDesignProvider` inside `KidModeProvider`:

```typescript
import NewDesignProvider from "@/components/v2/NewDesignProvider";

// In the JSX, wrap children:
<KidModeProvider>
  <NewDesignProvider>
    <NavBar />
    <KidModeBanner />
    <main className="pb-20 sm:pb-0">{children}</main>
    <MobileNav />
  </NewDesignProvider>
</KidModeProvider>
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useNewDesign.ts src/components/v2/NewDesignProvider.tsx src/app/layout.tsx src/__tests__/hooks/useNewDesign.test.ts
git commit -m "feat: add useNewDesign toggle hook and provider"
```

### Task 2: Add design toggle to Settings page

**Files:**
- Modify: `src/components/parent/SettingsPageContent.tsx`
- Modify: `src/locales/en.json` (add `settings.newDesign*` keys)
- Modify: `src/locales/zh.json` (add `settings.newDesign*` keys)

- [ ] **Step 1: Add i18n strings**

In `src/locales/en.json`, add inside the `"settings"` object:

```json
"newDesignToggle": "Try new design (beta)",
"newDesignDesc": "Switches the entire UI to the new Coin Arcade / Paper Garden design"
```

In `src/locales/zh.json`, add inside the `"settings"` object:

```json
"newDesignToggle": "试用新设计（测试版）",
"newDesignDesc": "切换到新的 Coin Arcade / Paper Garden 设计风格"
```

- [ ] **Step 2: Add toggle switch to SettingsPageContent**

At the top of the `SettingsPageContent` component, before the Family Info Card, add:

```tsx
import { useNewDesign } from "@/hooks/useNewDesign";

// Inside the component:
const { isNewDesign, setNewDesign } = useNewDesign();

// JSX — add before the Family Info Card div:
<div className="bg-white shadow rounded-lg p-6 mb-6">
  <div className="flex items-center justify-between">
    <div>
      <h2 className="text-lg font-semibold text-gray-900">{t("newDesignToggle")}</h2>
      <p className="text-sm text-gray-500 mt-1">{t("newDesignDesc")}</p>
    </div>
    <button
      onClick={() => setNewDesign(!isNewDesign)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        isNewDesign ? "bg-green-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          isNewDesign ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  </div>
</div>
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev`
Navigate to Settings page and verify the toggle renders and flips localStorage.

- [ ] **Step 4: Commit**

```bash
git add src/components/parent/SettingsPageContent.tsx src/locales/en.json src/locales/zh.json
git commit -m "feat: add new design toggle to settings page"
```

### Task 3: Conditional chrome in root layout

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/v2/LayoutShell.tsx`

- [ ] **Step 1: Create LayoutShell that conditionally renders chrome**

```typescript
// src/components/v2/LayoutShell.tsx
"use client";

import { ReactNode } from "react";
import { useNewDesign } from "@/hooks/useNewDesign";
import NavBar from "@/components/NavBar";
import MobileNav from "@/components/MobileNav";
import KidModeBanner from "@/components/KidModeBanner";

type Props = {
  children: ReactNode;
};

export default function LayoutShell({ children }: Props) {
  const { isNewDesign } = useNewDesign();

  if (isNewDesign) {
    // New design renders its own chrome per-page
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <>
      <NavBar />
      <KidModeBanner />
      <main className="pb-20 sm:pb-0">{children}</main>
      <MobileNav />
    </>
  );
}
```

- [ ] **Step 2: Update layout.tsx to use LayoutShell**

Replace the static NavBar/KidModeBanner/main/MobileNav block with:

```typescript
import LayoutShell from "@/components/v2/LayoutShell";

// In JSX:
<KidModeProvider>
  <NewDesignProvider>
    <LayoutShell>{children}</LayoutShell>
  </NewDesignProvider>
</KidModeProvider>
```

- [ ] **Step 3: Verify toggle hides/shows old chrome**

Run: `npm run dev`
Toggle new design ON in Settings — NavBar and MobileNav should disappear.
Toggle OFF — they return.

- [ ] **Step 4: Commit**

```bash
git add src/components/v2/LayoutShell.tsx src/app/layout.tsx
git commit -m "feat: conditional chrome rendering based on design toggle"
```

### Task 4: Design tokens in globals.css + Google Fonts

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add CSS custom properties and Tailwind theme tokens**

Add to `src/app/globals.css` after the existing `:root` block:

```css
/* Coin Arcade tokens (kid side) */
:root {
  --ca-cream: #FFFEF9;
  --ca-paper: #FFF8EC;
  --ca-ink: #1b1a17;
  --ca-muted: #8a8577;
  --ca-divider: rgba(26,24,19,0.08);
  --ca-gold: #FFCB3B;
  --ca-gold-deep: #B27B00;
  --ca-gold-glow: #FFE88A;
  --ca-cobalt: #2f62f5;
  --ca-cobalt-deep: #1a3fb3;
  --ca-sky: #6fa8ff;
  --ca-coral: #f66951;
  --ca-mint: #38c07f;
  --ca-pink: #ff9dbf;
  --ca-teal: #6cc4cf;
  --ca-peach: #ffb977;
  --ca-lavender: #b49ef0;
  --ca-tile-teal: #dcf1f3;
  --ca-tile-peach: #fff4e6;
  --ca-tile-pink: #fce4ec;
  --ca-tile-mint: #e8f5e9;
  --ca-tile-lavender: #ece4f8;
  --ca-tile-butter: #fff3b0;
  /* Paper Garden tokens (parent side) */
  --pg-cream: #F9F4E8;
  --pg-ink: #2f2a1f;
  --pg-muted: #857d68;
  --pg-line: rgba(68,55,32,0.14);
  --pg-accent: #6b8e4e;
  --pg-accent-deep: #4a6a32;
  --pg-coral: #c5543d;
  --pg-leaf: #9bbf7a;
  --pg-bloom: #d88b8b;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  /* Coin Arcade */
  --color-ca-cream: var(--ca-cream);
  --color-ca-paper: var(--ca-paper);
  --color-ca-ink: var(--ca-ink);
  --color-ca-muted: var(--ca-muted);
  --color-ca-gold: var(--ca-gold);
  --color-ca-gold-deep: var(--ca-gold-deep);
  --color-ca-gold-glow: var(--ca-gold-glow);
  --color-ca-cobalt: var(--ca-cobalt);
  --color-ca-cobalt-deep: var(--ca-cobalt-deep);
  --color-ca-sky: var(--ca-sky);
  --color-ca-coral: var(--ca-coral);
  --color-ca-mint: var(--ca-mint);
  --color-ca-pink: var(--ca-pink);
  --color-ca-teal: var(--ca-teal);
  --color-ca-peach: var(--ca-peach);
  --color-ca-lavender: var(--ca-lavender);
  --color-ca-tile-teal: var(--ca-tile-teal);
  --color-ca-tile-peach: var(--ca-tile-peach);
  --color-ca-tile-pink: var(--ca-tile-pink);
  --color-ca-tile-mint: var(--ca-tile-mint);
  --color-ca-tile-lavender: var(--ca-tile-lavender);
  --color-ca-tile-butter: var(--ca-tile-butter);
  /* Paper Garden */
  --color-pg-cream: var(--pg-cream);
  --color-pg-ink: var(--pg-ink);
  --color-pg-muted: var(--pg-muted);
  --color-pg-accent: var(--pg-accent);
  --color-pg-accent-deep: var(--pg-accent-deep);
  --color-pg-coral: var(--pg-coral);
  --color-pg-leaf: var(--pg-leaf);
  --color-pg-bloom: var(--pg-bloom);
  /* Font families for new design */
  --font-baloo: var(--font-baloo-2);
  --font-nunito: var(--font-nunito);
  --font-fraunces: var(--font-fraunces);
  --font-inter: var(--font-inter);
}

/* V2 animations */
@keyframes confettiFall {
  0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); opacity: 0; }
}

@keyframes flamePulse {
  0%, 100% { transform: scale(1) rotate(-2deg); }
  50% { transform: scale(1.12) rotate(2deg); }
}

@keyframes gemmyBounce {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-6px) rotate(2deg); }
}

@keyframes targetPulse {
  0%, 100% { border-color: var(--ca-gold-deep); }
  50% { border-color: var(--ca-gold); }
}

@keyframes haloPulse {
  0%, 100% { transform: scale(1); opacity: 0.55; }
  50% { transform: scale(1.15); opacity: 0.9; }
}

@keyframes gemSpin {
  0% { transform: rotateY(0); }
  50% { transform: rotateY(180deg); }
  100% { transform: rotateY(360deg); }
}
```

- [ ] **Step 2: Add Google Fonts to layout.tsx**

```typescript
import { Baloo_2, Nunito, Fraunces, Inter } from "next/font/google";

const baloo2 = Baloo_2({
  variable: "--font-baloo-2",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Add to body className:
className={`${geistSans.variable} ${geistMono.variable} ${baloo2.variable} ${nunito.variable} ${fraunces.variable} ${inter.variable} antialiased`}
```

- [ ] **Step 3: Verify tokens work**

Run: `npm run dev`
In browser devtools, verify CSS variables are set on `:root` and a test element with `className="bg-ca-cream"` renders correctly.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat: add Coin Arcade + Paper Garden design tokens and fonts"
```

---

## Phase 2: Primitive Components

### Task 5: Coin and CoinSmall SVG components

**Files:**
- Create: `src/components/v2/Coin.tsx`
- Create: `src/components/v2/CoinSmall.tsx`

- [ ] **Step 1: Create Coin component**

```typescript
// src/components/v2/Coin.tsx
"use client";

import { useId } from "react";

type Props = {
  size?: number;
  spin?: boolean;
  className?: string;
};

export default function Coin({ size = 60, spin = false, className }: Props) {
  const uid = useId();

  return (
    <svg width={size} height={size} viewBox="0 0 140 140" className={className}>
      <defs>
        <linearGradient id={`${uid}-body`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FFF6C9" />
          <stop offset="0.25" stopColor="#FFD84D" />
          <stop offset="0.7" stopColor="#D99A12" />
          <stop offset="1" stopColor="#7A4E00" />
        </linearGradient>
        <linearGradient id={`${uid}-lite`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FFFDE8" />
          <stop offset="1" stopColor="#FFD147" />
        </linearGradient>
        <linearGradient id={`${uid}-dark`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#C98A0D" />
          <stop offset="1" stopColor="#6A4200" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFE88A" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFE88A" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g style={spin ? { transformOrigin: "50% 50%", animation: "gemSpin 2.2s linear infinite" } : undefined}>
        <ellipse cx="70" cy="126" rx="44" ry="6" fill="#000" opacity="0.18" />
        <circle cx="70" cy="70" r="66" fill={`url(#${uid}-glow)`} />
        <path d="M30 46 L54 20 L86 20 L110 46 L70 120 Z" fill={`url(#${uid}-body)`} />
        <path d="M54 20 L86 20 L78 46 L62 46 Z" fill="#FFFDE8" />
        <path d="M30 46 L54 20 L62 46 Z" fill={`url(#${uid}-lite)`} />
        <path d="M110 46 L86 20 L78 46 Z" fill="#FFD84D" />
        <path d="M30 46 L110 46" stroke="#7A4E00" strokeWidth="1.2" opacity="0.45" fill="none" />
        <path d="M62 46 L78 46" stroke="#7A4E00" strokeWidth="0.8" opacity="0.5" fill="none" />
        <path d="M30 46 L62 46 L70 120 Z" fill={`url(#${uid}-dark)`} />
        <path d="M62 46 L78 46 L70 120 Z" fill="#D99A12" />
        <path d="M78 46 L110 46 L70 120 Z" fill="#9A6300" />
        <path d="M60 24 L66 22 L70 44 L64 44 Z" fill="#fff" opacity="0.7" />
        <circle cx="82" cy="28" r="2" fill="#fff" opacity="0.95" />
        <circle cx="48" cy="38" r="1.2" fill="#fff" opacity="0.8" />
        <g transform="translate(98 92)">
          <path d="M0 -8 L1.5 -1.5 L8 0 L1.5 1.5 L0 8 L-1.5 1.5 L-8 0 L-1.5 -1.5 Z" fill="#fff" opacity="0.9" />
        </g>
      </g>
    </svg>
  );
}
```

- [ ] **Step 2: Create CoinSmall component**

```typescript
// src/components/v2/CoinSmall.tsx
type Props = {
  size?: number;
  className?: string;
};

export default function CoinSmall({ size = 18, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path d="M4 8 L8 3.5 L16 3.5 L20 8 L12 21 Z"
        fill="#FFCB3B" stroke="#7A4E00" strokeWidth="1" strokeLinejoin="round" />
      <path d="M8 3.5 L16 3.5 L14 8 L10 8 Z" fill="#FFFDE8" />
      <path d="M4 8 L20 8" stroke="#7A4E00" strokeWidth="0.6" opacity="0.5" fill="none" />
      <path d="M14 8 L20 8 L12 21 Z" fill="#9A6300" opacity="0.45" />
      <path d="M10 5 L11.5 4.5 L12 7.5 L10.5 7.5 Z" fill="#fff" opacity="0.85" />
    </svg>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/v2/Coin.tsx src/components/v2/CoinSmall.tsx
git commit -m "feat(v2): add Coin and CoinSmall gem SVG components"
```

### Task 6: Confetti + FlameIcon + CoinCounter

**Files:**
- Create: `src/components/v2/Confetti.tsx`
- Create: `src/components/v2/FlameIcon.tsx`
- Create: `src/components/v2/CoinCounter.tsx`

- [ ] **Step 1: Create Confetti component**

```typescript
// src/components/v2/Confetti.tsx
"use client";

import { useEffect, useState } from "react";

const COLORS = ["#ffb977", "#ff9dbf", "#6cc4cf", "#38c07f", "#fff3b0", "#fff"];

type Piece = {
  id: string;
  left: number;
  top: number;
  dx: number;
  dy: number;
  rot: number;
  size: number;
  color: string;
  shape: number;
};

type Props = {
  trigger: number;
};

export default function Confetti({ trigger }: Props) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (!trigger) return;
    const newPieces: Piece[] = Array.from({ length: 18 }, (_, i) => ({
      id: `${trigger}-${i}`,
      left: 40 + Math.random() * 60,
      top: 60 + Math.random() * 20,
      dx: (Math.random() - 0.5) * 220,
      dy: -60 - Math.random() * 120,
      rot: (Math.random() - 0.5) * 720,
      size: 6 + Math.random() * 8,
      color: COLORS[i % COLORS.length],
      shape: i % 3,
    }));
    setPieces((p) => [...p, ...newPieces]);
    const t = setTimeout(() => {
      setPieces((p) => p.filter((x) => !newPieces.find((n) => n.id === x.id)));
    }, 1400);
    return () => clearTimeout(t);
  }, [trigger]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute animate-[confettiFall_1.4s_ease-out_forwards]"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.shape === 2 ? p.size * 0.4 : p.size,
            background: p.color,
            borderRadius: p.shape === 0 ? "50%" : p.shape === 1 ? 2 : 0,
            "--dx": `${p.dx}px`,
            "--dy": `${p.dy}px`,
            "--rot": `${p.rot}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create FlameIcon**

```typescript
// src/components/v2/FlameIcon.tsx
type Props = {
  size?: number;
  className?: string;
};

export default function FlameIcon({ size = 32, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
      <defs>
        <linearGradient id="flameG" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset="0.5" stopColor="#ffb347" />
          <stop offset="1" stopColor="#e55a43" />
        </linearGradient>
      </defs>
      <path
        d="M16 2c4 6 10 9 10 16a10 10 0 11-20 0c0-3 1-5 3-7-1 4 1 6 3 6 0-5 2-9 4-15z"
        fill="url(#flameG)"
      />
      <path
        d="M16 18c2 2 4 4 4 6a4 4 0 11-8 0c0-1 1-2 2-3 0 2 1 3 2 3 0-2 0-4 0-6z"
        fill="#fff3b0"
        opacity="0.9"
      />
    </svg>
  );
}
```

- [ ] **Step 3: Create CoinCounter**

```typescript
// src/components/v2/CoinCounter.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Coin from "./Coin";
import Confetti from "./Confetti";
import FlameIcon from "./FlameIcon";

type Props = {
  base: number;
  delta: number;
  size?: "hero" | "compact";
};

export default function CoinCounter({ base, delta, size = "hero" }: Props) {
  const [val, setVal] = useState(base);
  const [burst, setBurst] = useState(0);
  const targetRef = useRef(base + delta);

  const sizes = size === "hero"
    ? { coin: 82, num: "text-7xl", gap: "gap-3.5", flameSize: 30 }
    : { coin: 42, num: "text-4xl", gap: "gap-2", flameSize: 18 };

  useEffect(() => {
    targetRef.current = base + delta;
    const interval = setInterval(() => {
      setVal((v) => {
        if (v >= targetRef.current) {
          clearInterval(interval);
          return v;
        }
        const next = v + 1;
        if (delta >= 10 && (targetRef.current - next) % 4 === 0) {
          setBurst((b) => b + 1);
        }
        return next;
      });
    }, 70);
    return () => clearInterval(interval);
  }, [base, delta]);

  const showFlame = delta >= 10;

  return (
    <div className="relative">
      <Confetti trigger={burst} />
      <div className={`flex items-center justify-center ${sizes.gap}`}>
        <Coin size={sizes.coin} />
        <span className="font-[family-name:var(--font-baloo-2)] text-white/85 font-extrabold text-2xl">
          &times;
        </span>
        <span
          className={`font-[family-name:var(--font-baloo-2)] ${sizes.num} font-black text-white leading-none tracking-tighter tabular-nums`}
          style={{ textShadow: "0 4px 0 rgba(0,0,0,0.18), 0 2px 0 rgba(0,0,0,0.25)" }}
        >
          {val.toLocaleString()}
        </span>
        {showFlame && (
          <div className="flex items-center gap-1 ml-1 animate-[flamePulse_1.2s_ease-in-out_infinite]">
            <FlameIcon size={sizes.flameSize} />
            <span
              className="font-[family-name:var(--font-baloo-2)] text-xl font-black text-[#FFD147] tracking-tight"
              style={{ textShadow: "0 2px 0 rgba(0,0,0,0.2)" }}
            >
              +{delta}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/v2/Confetti.tsx src/components/v2/FlameIcon.tsx src/components/v2/CoinCounter.tsx
git commit -m "feat(v2): add CoinCounter with confetti and flame animations"
```

### Task 7: Gemmy mascot component

**Files:**
- Create: `src/components/v2/Gemmy.tsx`

- [ ] **Step 1: Create Gemmy with all mood variants**

```typescript
// src/components/v2/Gemmy.tsx
"use client";

type Mood = "happy" | "think" | "cheer" | "celebrate" | "oops" | "sleep" | "wink";

type Props = {
  size?: number;
  mood?: Mood;
  bounce?: boolean;
  className?: string;
};

function Eyes({ type }: { type: string }) {
  if (type === "normal") {
    return (
      <g>
        <ellipse cx="44" cy="56" rx="5" ry="7" fill="#1b1a17" />
        <ellipse cx="76" cy="56" rx="5" ry="7" fill="#1b1a17" />
        <circle cx="45.5" cy="53" r="2" fill="#fff" />
        <circle cx="77.5" cy="53" r="2" fill="#fff" />
      </g>
    );
  }
  if (type === "squish") {
    return (
      <g>
        <path d="M38 58 Q44 50 50 58" stroke="#1b1a17" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M70 58 Q76 50 82 58" stroke="#1b1a17" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      </g>
    );
  }
  if (type === "star") {
    return (
      <g>
        <Star cx={44} cy={56} r={7} />
        <Star cx={76} cy={56} r={7} />
      </g>
    );
  }
  if (type === "worried") {
    return (
      <g>
        <circle cx="44" cy="57" r="4" fill="#1b1a17" />
        <circle cx="76" cy="57" r="4" fill="#1b1a17" />
        <circle cx="45" cy="55" r="1.4" fill="#fff" />
        <circle cx="77" cy="55" r="1.4" fill="#fff" />
      </g>
    );
  }
  if (type === "closed") {
    return (
      <g>
        <path d="M38 58 Q44 62 50 58" stroke="#1b1a17" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M70 58 Q76 62 82 58" stroke="#1b1a17" strokeWidth="3" strokeLinecap="round" fill="none" />
      </g>
    );
  }
  if (type === "wink") {
    return (
      <g>
        <ellipse cx="44" cy="56" rx="5" ry="7" fill="#1b1a17" />
        <circle cx="45.5" cy="53" r="2" fill="#fff" />
        <path d="M70 58 Q76 50 82 58" stroke="#1b1a17" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      </g>
    );
  }
  return null;
}

function Mouth({ type }: { type: string }) {
  if (type === "smile") return <path d="M48 76 Q60 86 72 76" stroke="#1b1a17" strokeWidth="3.5" strokeLinecap="round" fill="none" />;
  if (type === "mouth-o") return <ellipse cx="60" cy="80" rx="5" ry="6" fill="#1b1a17" />;
  if (type === "open-big") return (
    <g>
      <path d="M46 74 Q60 94 74 74 Q60 82 46 74 Z" fill="#1b1a17" />
      <path d="M52 82 Q60 88 68 82 Q60 85 52 82 Z" fill="#ff8aa0" />
    </g>
  );
  return null;
}

function Star({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = ((i * 36 - 90) * Math.PI) / 180;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`);
  }
  return <polygon points={pts.join(" ")} fill="#1b1a17" />;
}

const FACES: Record<Mood, { eyes: string; mouth: string; brow: string | null }> = {
  happy: { eyes: "normal", mouth: "smile", brow: null },
  think: { eyes: "normal", mouth: "mouth-o", brow: "think" },
  cheer: { eyes: "squish", mouth: "open-big", brow: null },
  celebrate: { eyes: "star", mouth: "open-big", brow: null },
  oops: { eyes: "worried", mouth: "mouth-o", brow: "down" },
  sleep: { eyes: "closed", mouth: "smile", brow: null },
  wink: { eyes: "wink", mouth: "smile", brow: null },
};

export default function Gemmy({ size = 120, mood = "happy", bounce = false, className }: Props) {
  const f = FACES[mood];

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        animation: bounce ? "gemmyBounce 1.4s ease-in-out infinite" : "none",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 120 120">
        <defs>
          <radialGradient id="gmbody" cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#FFE88A" />
            <stop offset="0.4" stopColor="#FFCB3B" />
            <stop offset="1" stopColor="#B27B00" />
          </radialGradient>
          <linearGradient id="gmrim" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#FFE27A" />
            <stop offset="0.5" stopColor="#D9A019" />
            <stop offset="1" stopColor="#8A5C00" />
          </linearGradient>
        </defs>
        <ellipse cx="60" cy="112" rx="32" ry="4" fill="rgba(0,0,0,0.18)" />
        <circle cx="60" cy="58" r="54" fill="url(#gmrim)" />
        <circle cx="60" cy="58" r="49" fill="url(#gmbody)" />
        {Array.from({ length: 24 }).map((_, i) => (
          <rect key={i} x="59" y="7" width="2" height="4" rx="0.8"
            fill="#7C5100" opacity="0.35"
            transform={`rotate(${i * 15} 60 58)`} />
        ))}
        <circle cx="60" cy="58" r="41" fill="none" stroke="#8A5C00" strokeOpacity="0.35" strokeWidth="1" />
        <circle cx="60" cy="58" r="38" fill="none" stroke="#FFF0A8" strokeOpacity="0.6" strokeWidth="0.8" />
        <circle cx="34" cy="68" r="7" fill="#ff9090" opacity="0.55" />
        <circle cx="86" cy="68" r="7" fill="#ff9090" opacity="0.55" />
        {f.brow === "think" && (
          <>
            <path d="M32 42 Q40 38 48 42" stroke="#7C5100" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M72 42 Q80 38 88 42" stroke="#7C5100" strokeWidth="3" strokeLinecap="round" fill="none" />
          </>
        )}
        {f.brow === "down" && (
          <>
            <path d="M32 44 Q40 48 48 42" stroke="#7C5100" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M72 42 Q80 48 88 44" stroke="#7C5100" strokeWidth="3" strokeLinecap="round" fill="none" />
          </>
        )}
        <Eyes type={f.eyes} />
        <Mouth type={f.mouth} />
        <circle cx="36" cy="34" r="5" fill="#fff" opacity="0.6" />
        <circle cx="42" cy="30" r="2" fill="#fff" opacity="0.8" />
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/v2/Gemmy.tsx
git commit -m "feat(v2): add Gemmy mascot with 7 mood variants"
```

### Task 8: KidHeaderBG + KidTabBar + BadgeFrame

**Files:**
- Create: `src/components/v2/KidHeaderBG.tsx`
- Create: `src/components/v2/KidTabBar.tsx`
- Create: `src/components/v2/BadgeFrame.tsx`

- [ ] **Step 1: Create KidHeaderBG**

```typescript
// src/components/v2/KidHeaderBG.tsx
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  compact?: boolean;
};

export default function KidHeaderBG({ children, compact = false }: Props) {
  return (
    <div
      className="relative overflow-hidden text-white"
      style={{
        background: "linear-gradient(160deg, var(--ca-cobalt) 0%, var(--ca-cobalt-deep) 70%, #0d2480 100%)",
        padding: compact ? "52px 18px 18px" : "52px 18px 26px",
        borderRadius: "0 0 28px 28px",
      }}
    >
      {/* Decorative floating coins */}
      <svg viewBox="0 0 100 100" width="90" height="90"
        className="absolute top-2.5 -right-5 opacity-15 rotate-[15deg]">
        <circle cx="50" cy="50" r="40" fill="#FFE88A" />
      </svg>
      <svg viewBox="0 0 100 100" width="60" height="60"
        className="absolute -bottom-3.5 -left-2.5 opacity-[0.12]">
        <circle cx="50" cy="50" r="40" fill="#FFE88A" />
      </svg>
      <svg viewBox="0 0 16 16" width="10" height="10"
        className="absolute top-[60px] left-10 opacity-50">
        <path d="M8 0L9.5 6.5L16 8L9.5 9.5L8 16L6.5 9.5L0 8L6.5 6.5Z" fill="#fff" />
      </svg>
      <svg viewBox="0 0 16 16" width="8" height="8"
        className="absolute top-[90px] right-[30px] opacity-55">
        <path d="M8 0L9.5 6.5L16 8L9.5 9.5L8 16L6.5 9.5L0 8L6.5 6.5Z" fill="#fff" />
      </svg>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create KidTabBar**

```typescript
// src/components/v2/KidTabBar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListChecks, BookOpen, ShoppingBag, User } from "lucide-react";

const TABS = [
  { href: "/points", label: "Home", icon: Home },
  { href: "/chores", label: "Chores", icon: ListChecks },
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/profile", label: "Profile", icon: User },
];

export default function KidTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[rgba(26,24,19,0.08)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex justify-around items-center h-[68px]">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                isActive ? "text-ca-cobalt" : "text-ca-muted"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-bold font-[family-name:var(--font-nunito)]">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Create BadgeFrame**

```typescript
// src/components/v2/BadgeFrame.tsx
type Props = {
  content: string | React.ReactNode; // emoji, image URL, or SVG
  earned: boolean;
  tier?: number; // 0-5 for ring color
  size?: number;
};

const TIER_COLORS = ["#e0e0e0", "#cd7f32", "#c0c0c0", "#ffd700", "#b49ef0", "#ff9dbf"];

export default function BadgeFrame({ content, earned, tier = 0, size = 80 }: Props) {
  const ringColor = TIER_COLORS[tier] || TIER_COLORS[0];

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          border: `3px solid ${ringColor}`,
          opacity: earned ? 1 : 0.4,
        }}
      />
      {/* Content area */}
      <div
        className={`flex items-center justify-center rounded-full overflow-hidden ${
          earned ? "" : "grayscale opacity-50"
        }`}
        style={{ width: size - 12, height: size - 12 }}
      >
        {typeof content === "string" ? (
          content.startsWith("http") ? (
            <img src={content} alt="" className="w-full h-full object-cover rounded-full" />
          ) : (
            <span style={{ fontSize: size * 0.4 }}>{content}</span>
          )
        ) : (
          content
        )}
      </div>
      {/* Lock overlay */}
      {!earned && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg opacity-70">🔒</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/v2/KidHeaderBG.tsx src/components/v2/KidTabBar.tsx src/components/v2/BadgeFrame.tsx
git commit -m "feat(v2): add KidHeaderBG, KidTabBar, and BadgeFrame components"
```

### Task 9: Parent primitives — PaperCard, ParentTabBar, OverflowMenu

**Files:**
- Create: `src/components/v2/PaperCard.tsx`
- Create: `src/components/v2/ParentTabBar.tsx`
- Create: `src/components/v2/OverflowMenu.tsx`

- [ ] **Step 1: Create PaperCard**

```typescript
// src/components/v2/PaperCard.tsx
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export default function PaperCard({ children, className = "" }: Props) {
  return (
    <div
      className={`bg-white rounded-[14px] border border-[rgba(68,55,32,0.14)] p-5 ${className}`}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create ParentTabBar**

```typescript
// src/components/v2/ParentTabBar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Calendar, Settings } from "lucide-react";

const TABS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/ledger", label: "Ledger", icon: BookOpen },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function ParentTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-pg-cream border-t border-[rgba(68,55,32,0.14)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex justify-around items-center h-[68px]">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                isActive ? "text-pg-accent" : "text-pg-muted"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-semibold font-[family-name:var(--font-inter)]">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Create OverflowMenu**

```typescript
// src/components/v2/OverflowMenu.tsx
"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { MoreVertical } from "lucide-react";

type MenuItem = {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
};

type Props = {
  items: MenuItem[];
};

export default function OverflowMenu({ items }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg hover:bg-[rgba(68,55,32,0.08)] transition-colors"
      >
        <MoreVertical size={20} className="text-pg-muted" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-[rgba(68,55,32,0.14)] min-w-[180px] py-1 z-50">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-pg-ink hover:bg-[rgba(68,55,32,0.04)] transition-colors"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/v2/PaperCard.tsx src/components/v2/ParentTabBar.tsx src/components/v2/OverflowMenu.tsx
git commit -m "feat(v2): add PaperCard, ParentTabBar, and OverflowMenu components"
```

---

## Phase 3: Kid Side Screens

### Task 10: Kid Home screen

**Files:**
- Create: `src/components/v2/kid/KidHome.tsx`
- Modify: `src/app/(kid)/points/page.tsx`

- [ ] **Step 1: Create KidHome component**

```typescript
// src/components/v2/kid/KidHome.tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import KidHeaderBG from "@/components/v2/KidHeaderBG";
import KidTabBar from "@/components/v2/KidTabBar";
import CoinCounter from "@/components/v2/CoinCounter";
import CoinSmall from "@/components/v2/CoinSmall";
import { Settings } from "lucide-react";

type PointEntry = {
  id: string;
  points: number;
  date: string;
  chore?: { title: string } | null;
};

type Props = {
  kidId: string;
  kidName: string;
};

export default function KidHome({ kidId, kidName }: Props) {
  const [totalPoints, setTotalPoints] = useState(0);
  const [entries, setEntries] = useState<PointEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPoints();
  }, [kidId]);

  const fetchPoints = async () => {
    try {
      const res = await fetch(`/api/points?kidId=${kidId}`);
      const data = await res.json();
      if (res.ok) {
        setTotalPoints(data.totalPoints);
        setEntries(data.entries || []);
      }
    } catch (err) {
      console.error("Failed to fetch points:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate today's delta
  const today = new Date().toDateString();
  const todayEntries = entries.filter(
    (e) => new Date(e.date).toDateString() === today
  );
  const todayDelta = todayEntries.reduce((sum, e) => sum + e.points, 0);

  // Calculate last 7 days
  const weekData = getWeekData(entries);

  // Get today's chores (positive entries with chore titles)
  const todayChores = todayEntries
    .filter((e) => e.chore && e.points > 0)
    .map((e) => ({ title: e.chore!.title, pts: e.points, done: true }));

  const previousPoints = totalPoints - todayDelta;

  if (loading) {
    return (
      <div className="min-h-screen bg-ca-cream flex items-center justify-center">
        <div className="animate-pulse text-ca-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ca-cream pb-[110px] font-[family-name:var(--font-baloo-2)]">
      <KidHeaderBG>
        {/* Greeting */}
        <div className="flex justify-between items-center mt-1">
          <div>
            <div className="text-xs font-bold opacity-85 uppercase tracking-wide">
              Hey {kidName} 👋
            </div>
            <div className="text-xl font-extrabold tracking-tight mt-0.5">
              Keep up the great work!
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/20 border-[1.5px] border-white/40 flex items-center justify-center text-sm font-extrabold">
            {kidName.charAt(0)}
          </div>
        </div>

        {/* Hero counter */}
        <div className="mt-5 mb-1.5">
          <CoinCounter base={previousPoints} delta={todayDelta} size="hero" />
        </div>

        {/* Pill buttons */}
        <div className="flex gap-2 justify-center mt-4">
          <a
            href="/points/history"
            className="px-4 py-2 rounded-full bg-white/20 text-white text-[13px] font-bold border border-white/35"
          >
            History
          </a>
          <a
            href="/shop"
            className="px-4 py-2 rounded-full bg-ca-gold text-ca-gold-deep text-[13px] font-extrabold flex items-center gap-1.5"
            style={{ boxShadow: "0 3px 0 #8A5C00" }}
          >
            <CoinSmall size={14} />
            Redeem
          </a>
        </div>
      </KidHeaderBG>

      {/* Week strip */}
      <div className="px-4 pt-4 pb-1.5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="text-base font-extrabold text-ca-ink">This week 🔥</div>
          <div className="text-[11px] font-bold text-ca-muted">
            {getStreakText(weekData)}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekData.map((d) => {
            const bg = d.type === "fire" ? "#ffe4d4" : d.type === "gem" ? "#d7eaf8" : "#f0ede2";
            return (
              <div
                key={d.day}
                className="rounded-xl text-center py-2"
                style={{
                  background: bg,
                  border: d.isToday ? "2px solid var(--ca-cobalt)" : "1px solid rgba(0,0,0,0.04)",
                }}
              >
                <div className="text-[9px] font-extrabold text-ca-muted uppercase tracking-wide">
                  {d.day}
                </div>
                <div className="text-sm font-black text-ca-ink my-0.5 tabular-nums">
                  {d.total || "·"}
                </div>
                <div className="text-[13px] leading-none min-h-[14px]">
                  {d.type === "fire" ? "🔥" : d.type === "gem" ? "💎" : ""}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's chores */}
      {todayChores.length > 0 && (
        <div className="px-4 pt-3.5">
          <div className="flex justify-between items-baseline mb-2">
            <div className="text-base font-extrabold text-ca-ink">Today&apos;s chores</div>
            <div className="text-[11px] font-bold text-ca-muted">
              {todayChores.length} done
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {todayChores.map((c, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl px-3.5 py-3 flex items-center gap-3 border border-[rgba(26,24,19,0.04)]"
                style={{ boxShadow: "0 2px 4px rgba(26,24,19,0.03)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: [
                      "var(--ca-tile-teal)",
                      "var(--ca-tile-peach)",
                      "var(--ca-tile-pink)",
                      "var(--ca-tile-mint)",
                    ][i % 4],
                  }}
                >
                  <span className="text-lg">✓</span>
                </div>
                <div className="flex-1">
                  <div className="text-[15px] font-bold text-ca-ink">{c.title}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <CoinSmall size={14} />
                    <span className="text-xs font-extrabold text-ca-gold-deep">+{c.pts}</span>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-ca-mint flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <KidTabBar />
    </div>
  );
}

// Helper: compute week data from entries
type WeekDay = { day: string; total: number; type: "fire" | "gem" | "none"; isToday: boolean };

function getWeekData(entries: PointEntry[]): WeekDay[] {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  const todayDow = today.getDay();

  return days.map((day, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - todayDow + i);
    const dateStr = date.toDateString();
    const dayEntries = entries.filter(
      (e) => new Date(e.date).toDateString() === dateStr && e.points > 0
    );
    const total = dayEntries.reduce((sum, e) => sum + e.points, 0);
    const type = total >= 10 ? "fire" : total > 0 ? "gem" : "none";
    return { day, total, type, isToday: i === todayDow };
  });
}

function getStreakText(week: WeekDay[]): string {
  let streak = 0;
  for (let i = week.length - 1; i >= 0; i--) {
    if (week[i].total > 0) streak++;
    else break;
  }
  return streak > 1 ? `${streak} day streak!` : "";
}
```

- [ ] **Step 2: Wire into the kid points page**

Modify `src/app/(kid)/points/page.tsx` to conditionally render:

```typescript
import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import KidPointsView from "@/components/points/KidPointsView";
import KidPointsHeader from "@/components/points/KidPointsHeader";
import KidHomeWrapper from "@/components/v2/kid/KidHomeWrapper";

export default async function KidPointsPage() {
  const session = await getSession();

  if (!session?.user) redirect("/login");
  if (!session.user.familyId) redirect("/dashboard");
  if (session.user.role !== "KID") redirect("/dashboard");

  return (
    <KidHomeWrapper
      kidId={session.user.id}
      kidName={session.user.name || "Kid"}
      fallback={
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <KidPointsHeader />
            <div className="mt-8">
              <KidPointsView kidId={session.user.id} />
            </div>
          </div>
        </div>
      }
    />
  );
}
```

Create a thin client wrapper:

```typescript
// src/components/v2/kid/KidHomeWrapper.tsx
"use client";

import { ReactNode } from "react";
import { useNewDesign } from "@/hooks/useNewDesign";
import KidHome from "./KidHome";

type Props = {
  kidId: string;
  kidName: string;
  fallback: ReactNode;
};

export default function KidHomeWrapper({ kidId, kidName, fallback }: Props) {
  const { isNewDesign } = useNewDesign();

  if (!isNewDesign) return <>{fallback}</>;

  return <KidHome kidId={kidId} kidName={kidName} />;
}
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev`
Log in as a kid, toggle new design ON in another tab (or set localStorage manually).
Kid Home should show the cobalt header + coin counter + week strip.

- [ ] **Step 4: Commit**

```bash
git add src/components/v2/kid/KidHome.tsx src/components/v2/kid/KidHomeWrapper.tsx src/app/\(kid\)/points/page.tsx
git commit -m "feat(v2): implement Kid Home screen with coin counter and week strip"
```

### Task 11: Kid Calendar screen

**Files:**
- Create: `src/components/v2/kid/KidCalendar.tsx`

This is a standalone screen linked from the KidTabBar. Create the component and wire it to a route (can reuse a view-as route or create a new one). Implementation follows the same pattern as KidHome — fetch from `/api/points`, compute per-day totals, render the calendar grid.

- [ ] **Step 1: Create KidCalendar component**

The component fetches point entries and renders a month grid with fire/gem indicators. (Full implementation code follows the same structure as `KidCalendarCA` in the prototype — cobalt compact header, 7-col grid, legend, today card.)

- [ ] **Step 2: Wire to route**
- [ ] **Step 3: Verify manually**
- [ ] **Step 4: Commit**

### Task 12: Kid Badges screen

**Files:**
- Create: `src/components/v2/kid/KidBadges.tsx`

- [ ] **Step 1: Create KidBadges component**

Fetches from `/api/badges`, renders a 3-col grid of `BadgeFrame` components. Includes filter pills and detail modal. Reuses the existing badge data (including AI-generated images).

- [ ] **Step 2: Wire to route**
- [ ] **Step 3: Verify manually**
- [ ] **Step 4: Commit**

### Task 13: Kid Learn Entry screen

**Files:**
- Create: `src/components/v2/kid/KidLearnEntry.tsx`
- Modify: `src/app/(kid)/learn/page.tsx`

- [ ] **Step 1: Create KidLearnEntry**

Cobalt header, Gemmy hero card, subject tiles, links to Learn session. Wraps the existing learn page with a conditional.

- [ ] **Step 2: Wire into learn route with conditional**
- [ ] **Step 3: Verify manually**
- [ ] **Step 4: Commit**

### Task 14: Kid Gallery screen

**Files:**
- Create: `src/components/v2/kid/KidGallery.tsx`

- [ ] **Step 1: Create KidGallery**

2-col masonry photo grid fetching from existing `/api/photos` or `/api/gallery`. Gold coin stamp overlay on each photo.

- [ ] **Step 2: Wire to route**
- [ ] **Step 3: Verify manually**
- [ ] **Step 4: Commit**

---

## Phase 4: Learn Arcade

### Task 15: Learn session reducer + router

**Files:**
- Create: `src/components/v2/learn/LearnSession.tsx`
- Create: `src/components/v2/learn/LearnHeader.tsx`

- [ ] **Step 1: Create session state types and reducer**

```typescript
// src/components/v2/learn/LearnSession.tsx
"use client";

import { useReducer, useCallback } from "react";
import LearnHeader from "./LearnHeader";
import LearnPreview from "./LearnPreview";
import SightWordsMissing from "./SightWordsMissing";
import CorrectCelebration from "./CorrectCelebration";
import MathSolve from "./MathSolve";
import MathSpeedRound from "./MathSpeedRound";
import SessionComplete from "./SessionComplete";

type SightWord = {
  id: string;
  word: string;
  imageUrl: string | null;
};

type SessionState = {
  subject: "sight-words" | "addition" | "multiplication" | "speed";
  step: "preview" | "quiz" | "celebration" | "math" | "speed" | "complete";
  wordIndex: number;
  words: SightWord[];
  total: number;
  correctCount: number;
  combo: number;
  bestCombo: number;
  coins: number;
  showCelebration: boolean;
};

type Action =
  | { type: "START_SESSION"; words: SightWord[]; subject: SessionState["subject"] }
  | { type: "ADVANCE_STUDY" }
  | { type: "CORRECT_ANSWER" }
  | { type: "WRONG_ANSWER" }
  | { type: "DISMISS_CELEBRATION" }
  | { type: "COMPLETE" };

function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "START_SESSION":
      return {
        ...state,
        words: action.words,
        subject: action.subject,
        step: "preview",
        wordIndex: 0,
        correctCount: 0,
        combo: 0,
        bestCombo: 0,
        coins: 0,
        total: action.words.length,
      };
    case "ADVANCE_STUDY":
      return { ...state, step: "quiz" };
    case "CORRECT_ANSWER": {
      const newCombo = state.combo + 1;
      const newBest = Math.max(state.bestCombo, newCombo);
      return {
        ...state,
        correctCount: state.correctCount + 1,
        combo: newCombo,
        bestCombo: newBest,
        coins: state.coins + 1,
        showCelebration: true,
      };
    }
    case "WRONG_ANSWER":
      return { ...state, combo: 0 };
    case "DISMISS_CELEBRATION": {
      const nextIndex = state.wordIndex + 1;
      if (nextIndex >= state.words.length) {
        return { ...state, showCelebration: false, step: "complete" };
      }
      return {
        ...state,
        showCelebration: false,
        wordIndex: nextIndex,
        step: "preview",
      };
    }
    case "COMPLETE":
      return { ...state, step: "complete" };
    default:
      return state;
  }
}

type Props = {
  kidId?: string;
  kidName?: string;
  onExit: () => void;
};

export default function LearnSession({ kidId, kidName, onExit }: Props) {
  const [state, dispatch] = useReducer(reducer, {
    subject: "sight-words",
    step: "preview",
    wordIndex: 0,
    words: [],
    total: 0,
    correctCount: 0,
    combo: 0,
    bestCombo: 0,
    coins: 0,
    showCelebration: false,
  });

  // Fetch words on mount and start session
  // ... (uses existing /api/sight-words/session endpoint)

  if (state.showCelebration) {
    return (
      <CorrectCelebration
        combo={state.combo}
        onDismiss={() => dispatch({ type: "DISMISS_CELEBRATION" })}
      />
    );
  }

  const currentWord = state.words[state.wordIndex];

  switch (state.step) {
    case "preview":
      return (
        <>
          <LearnHeader
            subject={state.subject}
            combo={state.combo}
            progress={state.wordIndex / state.total}
            coins={state.coins}
            onClose={onExit}
          />
          <LearnPreview
            word={currentWord}
            onReady={() => dispatch({ type: "ADVANCE_STUDY" })}
          />
        </>
      );
    case "quiz":
      return (
        <>
          <LearnHeader
            subject={state.subject}
            combo={state.combo}
            progress={state.wordIndex / state.total}
            coins={state.coins}
            onClose={onExit}
          />
          <SightWordsMissing
            word={currentWord}
            onCorrect={() => dispatch({ type: "CORRECT_ANSWER" })}
            onWrong={() => dispatch({ type: "WRONG_ANSWER" })}
          />
        </>
      );
    case "complete":
      return (
        <SessionComplete
          kidName={kidName || ""}
          coins={state.coins}
          bestCombo={state.bestCombo}
          correctCount={state.correctCount}
          total={state.total}
          onHome={onExit}
          onPlayAgain={() => {/* re-fetch and restart */}}
        />
      );
    default:
      return null;
  }
}
```

- [ ] **Step 2: Create LearnHeader**

```typescript
// src/components/v2/learn/LearnHeader.tsx
"use client";

import { X } from "lucide-react";
import CoinSmall from "@/components/v2/CoinSmall";

type Props = {
  subject: string;
  combo: number;
  progress: number;
  coins: number;
  onClose: () => void;
};

export default function LearnHeader({ subject, combo, progress, coins, onClose }: Props) {
  return (
    <div
      className="sticky top-0 z-40 text-white px-4 pt-[env(safe-area-inset-top)] pb-3"
      style={{ background: "linear-gradient(160deg, var(--ca-cobalt) 0%, var(--ca-cobalt-deep) 100%)" }}
    >
      <div className="flex items-center justify-between pt-3">
        <button onClick={onClose} className="p-1">
          <X size={22} />
        </button>
        <span className="text-sm font-bold font-[family-name:var(--font-nunito)] capitalize">
          {subject.replace("-", " ")}
        </span>
        {combo >= 3 ? (
          <div
            className="px-2.5 py-1 rounded-full text-xs font-extrabold animate-[flamePulse_1.5s_ease-in-out_infinite]"
            style={{ background: "linear-gradient(135deg, #f66951, #cc3322)", boxShadow: "0 0 10px rgba(255,90,90,0.45)" }}
          >
            x{combo}
          </div>
        ) : combo > 0 ? (
          <div className="px-2.5 py-1 rounded-full bg-white/20 text-xs font-extrabold">
            x{combo}
          </div>
        ) : (
          <div className="w-8" />
        )}
      </div>
      <div className="flex items-center gap-3 mt-2">
        <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-ca-gold transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-1">
          <CoinSmall size={14} />
          <span className="text-sm font-bold tabular-nums">{coins}</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/v2/learn/LearnSession.tsx src/components/v2/learn/LearnHeader.tsx
git commit -m "feat(v2): add Learn session reducer and header chrome"
```

### Task 16: LearnPreview + SightWordsMissing

**Files:**
- Create: `src/components/v2/learn/LearnPreview.tsx`
- Create: `src/components/v2/learn/SightWordsMissing.tsx`

- [ ] **Step 1: Create LearnPreview** — Gemmy happy + word display + "I got it!" CTA
- [ ] **Step 2: Create SightWordsMissing** — letter slots + 3x2 key grid
- [ ] **Step 3: Commit**

### Task 17: CorrectCelebration overlay

**Files:**
- Create: `src/components/v2/learn/CorrectCelebration.tsx`

- [ ] **Step 1: Create full-screen celebration** — cobalt gradient, coin rain, confetti, Gemmy celebrating, "NICE!" text, auto-dismiss
- [ ] **Step 2: Commit**

### Task 18: MathSolve + MathSpeedRound

**Files:**
- Create: `src/components/v2/learn/MathSolve.tsx`
- Create: `src/components/v2/learn/MathSpeedRound.tsx`

- [ ] **Step 1: Create MathSolve** — equation + 3x4 keypad + answer slots
- [ ] **Step 2: Create MathSpeedRound** — timer ring + compact keypad
- [ ] **Step 3: Commit**

### Task 19: SessionComplete

**Files:**
- Create: `src/components/v2/learn/SessionComplete.tsx`

- [ ] **Step 1: Create SessionComplete** — stats, mastered words, CTAs
- [ ] **Step 2: Commit**

---

## Phase 5: Parent Side (Paper Garden)

### Task 20: Parent Home screen

**Files:**
- Create: `src/components/v2/parent/ParentHome.tsx`
- Modify: `src/app/dashboard/page.tsx` (or the parent's landing page)

- [ ] **Step 1: Create ParentHome**

Warm cream bg, Fraunces heading with greeting, "..." overflow menu (with Log Reward), kid cards with sparkline, today's activity timeline. Uses existing `/api/points` and `/api/family/kids` endpoints.

- [ ] **Step 2: Wire into dashboard with conditional rendering**
- [ ] **Step 3: Verify overflow menu opens and Log Reward modal works**
- [ ] **Step 4: Commit**

### Task 21: Parent Ledger screen

**Files:**
- Create: `src/components/v2/parent/ParentLedger.tsx`
- Modify: `src/app/(parent)/ledger/page.tsx`

- [ ] **Step 1: Create ParentLedger**

Kid-switcher chips, balance summary, transaction list with hairline dividers. Fetches from existing `/api/points` endpoint.

- [ ] **Step 2: Wire into ledger route with conditional**
- [ ] **Step 3: Verify manually**
- [ ] **Step 4: Commit**

### Task 22: Parent Calendar screen

**Files:**
- Create: `src/components/v2/parent/ParentCalendar.tsx`
- Modify: `src/app/(parent)/calendar/page.tsx`

- [ ] **Step 1: Create ParentCalendar**

Week nav, 7-day column grid, event pills per kid. Fetches from existing `/api/calendar` endpoint.

- [ ] **Step 2: Wire into calendar route with conditional**
- [ ] **Step 3: Verify manually**
- [ ] **Step 4: Commit**

---

## Phase 6: Polish & Integration

### Task 23: Wire remaining kid routes + KidTabBar navigation

**Files:**
- Various route files under `src/app/(kid)/`
- Possibly create new route files for gallery/calendar if they don't exist as kid routes

- [ ] **Step 1: Ensure all KidTabBar links resolve to v2 screens when toggle is ON**
- [ ] **Step 2: Verify navigation loop works (Home → Learn → Back → Calendar → etc.)**
- [ ] **Step 3: Commit**

### Task 24: Swipe-to-complete on Kid Home chore cards

**Files:**
- Modify: `src/components/v2/kid/KidHome.tsx`

- [ ] **Step 1: Add touch event handlers for swipe gesture**

Detect touchstart → touchmove → touchend. If dx >= 60px, trigger completion API call, animate card off, tick counter.

- [ ] **Step 2: Verify on mobile (or Chrome devtools mobile sim)**
- [ ] **Step 3: Commit**

### Task 25: End-to-end verification

- [ ] **Step 1: Run `npm run build`** — verify no TypeScript errors
- [ ] **Step 2: Run `npm run test:run`** — verify no test regressions
- [ ] **Step 3: Manual QA checklist:**
  - Toggle ON: kid side shows Coin Arcade chrome
  - Toggle ON: parent side shows Paper Garden chrome
  - Toggle OFF: everything reverts to old UI
  - Learn session flows through all 6 steps
  - Badges show existing AI-generated images
  - Log Reward accessible from parent overflow menu
  - No console errors on any screen
- [ ] **Step 4: Final commit if any fixes needed**

```bash
git commit -m "fix: address integration issues from e2e verification"
```
