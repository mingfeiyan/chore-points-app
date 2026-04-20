# Mobile Redesign with Toggle — Design Spec

## Overview

Full mobile UI redesign of GemSteps with a temporary toggle mechanism. The redesign introduces two coordinated visual systems: **Coin Arcade** (kid side — playful, bold, game-like) and **Paper Garden** (parent side — warm cream paper aesthetic). A parent-controlled toggle in Settings allows switching the entire UI between old and new designs via localStorage. The toggle will be removed once the new design is validated.

## Approach

**Layout-level conditional rendering.** A `useNewDesign()` hook reads localStorage. The root layout conditionally renders either the existing chrome or the new chrome. Each route's page component checks the hook and renders either old or new content.

All new components live under `src/components/v2/` for isolation. When the toggle is removed, move them to `src/components/` and delete the old ones.

---

## Section 1: Toggle Infrastructure

### `useNewDesign()` hook (`src/hooks/useNewDesign.ts`)

- Reads `localStorage.getItem("gemsteps-new-ui")` — returns boolean
- Wrapped in a React context (`NewDesignProvider`) to avoid repeated reads and ensure consistent rendering
- Provider sits inside the existing stack: `SessionProvider > LocaleProvider > KidModeProvider > NewDesignProvider`

### Settings page addition

- Toggle switch at the top of existing Settings page: "Try new design (beta)"
- Sets `localStorage.setItem("gemsteps-new-ui", "true"/"false")`
- Small note below: "Switches the entire UI to the new Coin Arcade / Paper Garden design"

### Root layout behavior (`src/app/layout.tsx`)

- New design OFF: renders existing `NavBar` + `MobileNav` + `KidModeBanner`
- New design ON: hides all three, renders new chrome (KidTabBar or ParentTabBar depending on role)

### Hydration handling

- Provider defaults to `false` (old UI) on SSR
- Reads localStorage on mount via `useEffect`
- Brief flash on first load is acceptable for a beta toggle

---

## Section 2: Design Tokens & Shared Primitives

### Tailwind tokens (added to `src/app/globals.css`)

CSS custom properties for both palettes:

**Coin Arcade (Kid):**
```
--ca-cream: #FFFEF9        --ca-paper: #FFF8EC
--ca-ink: #1b1a17          --ca-muted: #8a8577
--ca-divider: rgba(26,24,19,0.08)
--ca-gold: #FFCB3B         --ca-gold-deep: #B27B00
--ca-gold-glow: #FFE88A
--ca-cobalt: #2f62f5       --ca-cobalt-deep: #1a3fb3
--ca-sky: #6fa8ff
--ca-coral: #f66951        --ca-mint: #38c07f
--ca-pink: #ff9dbf         --ca-teal: #6cc4cf
--ca-peach: #ffb977        --ca-lavender: #b49ef0
--ca-tile-teal: #dcf1f3    --ca-tile-peach: #fff4e6
--ca-tile-pink: #fce4ec    --ca-tile-mint: #e8f5e9
--ca-tile-lavender: #ece4f8  --ca-tile-butter: #fff3b0
```

**Paper Garden (Parent):**
```
--pg-cream: #F9F4E8        --pg-ink: #2f2a1f
--pg-muted: #857d68        --pg-line: rgba(68,55,32,0.14)
--pg-accent: #6b8e4e       --pg-accent-deep: #4a6a32
--pg-coral: #c5543d        --pg-leaf: #9bbf7a
--pg-bloom: #d88b8b
```

Mapped as Tailwind utilities: `bg-ca-cream`, `text-pg-accent`, etc.

### Typography (loaded via `next/font/google` in layout)

- Kid display/numbers: `Baloo 2` (600–800)
- Kid body: `Nunito` (700–900)
- Parent display: `Fraunces` (opsz 9–144, 500–600)
- Parent body: `Inter` (400–700)

### Primitive components (`src/components/v2/`)

| Component | Purpose |
|-----------|---------|
| `Coin.tsx` | Gold gem-coin SVG at 16/44/100–180px |
| `CoinCounter.tsx` | Animated tick-up counter with confetti + flame |
| `Gemmy.tsx` | Mascot with 7 mood variants |
| `BadgeFrame.tsx` | Tier-ring badge wrapper (uses existing badge data/images) |
| `KidHeaderBG.tsx` | Cobalt gradient header with floating coin decorations |
| `KidTabBar.tsx` | 5-tab bottom nav (Home/Chores/Learn/Shop/Profile) |
| `PaperCard.tsx` | Paper Garden warm-bordered card |
| `ParentTabBar.tsx` | Parent bottom nav |
| `Icon.tsx` | Monochrome 24x24 icons (maps to lucide-react) |

### Spacing/radii/shadows

- Kid cards: 22–24px radius, shadows `0 4px 16px rgba(0,0,0,0.06)`
- Kid buttons: pill (100px radius), chunky `0 4px 0 {deepColor}` press shadow
- Parent cards: 10–14px radius, hairline border + optional `0 1px 2px rgba(0,0,0,0.03)`
- Kid gaps: 12–16px; Parent gaps: 14–20px

---

## Section 3: Kid Side Screens

All at `src/components/v2/kid/`. Existing route files conditionally render old vs new.

### Kid Home (`KidHome.tsx`)

- `KidHeaderBG` with greeting row (name + avatar initial) + settings icon
- Hero `CoinCounter` — animates from last-known value (localStorage) to current total
- "History" pill + "Redeem" gold pill buttons
- Week strip: 7 day cells with gem totals, fire emoji for days >= 10, today highlighted cobalt
- "Today's chores" section: rounded cards with pastel category tile (left), title + coin points (right), "Do it" button
- "Keep learning" promo card
- `KidTabBar` fixed at bottom

### Kid Calendar (`KidCalendar.tsx`)

- Compact cobalt header with month nav arrows + fire days / active days stat chips
- 7-col calendar grid: each cell shows date + fire/gem emoji based on daily total
- Legend row
- "Today" summary card

### Kid Badges (`KidBadges.tsx`)

- Compact cobalt header with earned count
- Filter pills: All / Chores / Learn / Streaks
- 3-column grid of `BadgeFrame` — uses existing `Badge`/`UserBadge` data and AI-generated images
- Earned = full color + tier ring; locked = grayscale + lock overlay
- Tap opens detail modal

### Kid Learn Entry (`KidLearnEntry.tsx`)

- Cobalt header
- "Today's session" hero card with Gemmy + subject + word count + time + coin reward
- Subject tiles: Sight Words (teal), Addition (peach), Multiplication (butter), Speed Round (pink)
- Recent scores list

### Kid Gallery (`KidGallery.tsx`)

- Compact cobalt header
- 2-column masonry photo grid
- Gold "+N" coin stamp overlaid on each photo's bottom-right
- Tap opens lightbox with caption + chore title + date

### Data sources

All screens read from existing API routes: `/api/chores`, `/api/points`, `/api/badges`, `/api/sight-words`. No new endpoints needed.

---

## Section 4: Learn Arcade (6-Step Session Flow)

At `src/components/v2/learn/`. Managed by a local reducer — no route changes between steps.

### Session state (useReducer)

```typescript
type SessionState = {
  subject: "sight-words" | "addition" | "multiplication" | "speed";
  step: number;
  total: number;
  correctCount: number;
  combo: number;
  bestCombo: number;
  coins: number;
  answers: Answer[];
  timer?: number;
};
```

### Shared chrome (`LearnHeader.tsx`)

- Cobalt header band: close X / subject title / combo pill (red gradient when combo >= 3)
- Progress bar + live gem counter on second row
- Used by screens 1, 2, 4, 5

### Screen 1: Preview (`LearnPreview.tsx`)

- Gemmy happy + bouncing with speech bubble
- Large photo/emoji tile (peach wash)
- Word at 58px + circular audio button
- Cobalt "I got it!" CTA

### Screen 2: Sight Words Missing Letter (`SightWordsMissing.tsx`)

- Gemmy thinking (floated at header seam)
- Photo tile (teal wash)
- Letter slots: filled + one dashed-gold pulsing target
- 3x2 letter key grid, one key highlighted gold
- Replaces current text-input approach

### Screen 3: Correct Celebration (`CorrectCelebration.tsx`)

- Full-screen radial cobalt gradient overlay
- Coin rain (9 spinning coins), confetti (18 particles)
- Gemmy celebrating with golden halo
- "NICE!" gold gradient text + "+1 gem" / "x3 combo" chips
- Auto-dismiss ~1.5s or on tap

### Screen 4: Math Solve (`MathSolve.tsx`)

- Gemmy thinking in corner
- White card (peach wash), equation at 62px
- Answer slots (gold-filled / dashed-target)
- 3x4 numeric keypad (mint green check button)
- Replaces current number spinner

### Screen 5: Math Speed Round (`MathSpeedRound.tsx`)

- Circular timer ring replacing progress bar (countdown, gold stroke)
- Correct/Gems chips in header
- Gemmy winks
- Compact keypad, butter wash on card

### Screen 6: Session Complete (`SessionComplete.tsx`)

- Cobalt header: "Session complete / You did it, [name]!"
- Gemmy celebrating (120px) overlapping header seam
- "NEW PERSONAL BEST!" gold banner (conditional)
- 3-col stats: gems / best combo / correct (pastel tiles)
- "Mastered today" word pills
- CTAs: "Home" (white) + "Play again" (cobalt, 2x width)

### Data persistence

- On complete: POST to `/api/sight-words/session` and `/api/points`
- Badge unlock checks happen server-side; response triggers celebration if new badge earned

### Session logic

- Correct answer: combo++, coins += 1, show CorrectCelebration ~1.5s, advance
- Wrong answer: combo = 0, Gemmy "oops" state, allow retry
- Final step: persist to server, compute badge unlocks, navigate to SessionComplete

---

## Section 5: Parent Side (Paper Garden)

At `src/components/v2/parent/`.

### Parent Home (`ParentHome.tsx`)

- Warm cream background (`#F9F4E8`)
- Title "Family" in Fraunces 600 + date in muted caps
- **Overflow menu** ("..." top-right): "Log Reward" action (opens existing `LogRewardModal`) + other quick actions
- Kid cards: avatar + name + balance + today's delta + 7-day sparkline
- "Needs your review" section: approval cards with photo thumbnail + approve/decline
- "Today's activity" timeline: timestamped events
- Botanical leaf SVG decorations (line-art, subtle)
- `ParentTabBar` at bottom

### Parent Ledger (`ParentLedger.tsx`)

- Kid-switcher chips + date-range picker in header
- Balance summary: opening / earned / spent / closing (ledger-style 4-row block)
- Transaction list: date column (serif), description, category tag, +/- amount in green/coral
- Hairline dividers only (no card boxes)

### Parent Family Calendar (`ParentCalendar.tsx`)

- Week nav row
- 7-day column grid, each headed with day + date
- Mini event pills per kid (color-coded by kid) with completed chores + points

### Parent Tab Bar (`ParentTabBar.tsx`)

- Warm cream background, subtle top border
- Tabs: Home / Ledger / Calendar / Settings
- Active state: `pgAccent` (garden green)
- Inter font

### Log Reward change

- Old design: `LogRewardButton` rendered as prominent pink gradient button in header
- New design: "Log Reward" is an item in the "..." overflow menu on Parent Home — opens the same `LogRewardModal`

---

## Section 6: Animations & Interactions

All additive polish. Screens work without them; implement progressively.

### Coin Counter tick-up

- `requestAnimationFrame` counter from previous → current over ~1.4s (ease-out)
- Spawns confetti particles during tick (up to 18)
- Previous value stored in localStorage for delta animation on return

### Confetti system

- 5 cycling colors from CA palette
- Random x-offset, rotation, size (8–14px), 1.5–2.2s fall with gravity
- CSS `@keyframes`, removed from DOM on animation end

### Flame at +10

- Appears when today's earned delta >= 10
- Pulsing red-to-orange gradient circle with flame icon
- 1s infinite pulse

### Button press (kid-side global)

- `scale(0.96)` + `translateY(2px)` for 120ms
- Chunky buttons: shadow `0 4px 0` → `0 0 0` + `translateY(4px)`

### Combo pulse (Learn Arcade)

- Combo >= 3: red gradient chip + box-shadow glow + 1.5s scale pulse

### Target slot pulse

- Dashed gold border alternates goldDeep ↔ gold every 1.5s

### Gemmy bounce

- `translateY(-6px)` 0.6s ease-in-out alternate infinite

### Celebration halo

- Radial gold gradient, scale 1.0 → 1.15, opacity 0.55 → 0.9, 1.6s loop

### Swipe-to-complete chores (Kid Home)

- Touch-drag right >= 60px: card slides off + confetti + counter tick + API mutation
- Short drags snap back
- Plain touch events (no extra library)

---

## Existing Systems Preserved

- **Badge system**: Existing `Badge`/`UserBadge` models and AI-generated badge images carry over unchanged. New `BadgeFrame` wraps the same data with new visual chrome.
- **Data model**: No schema changes. All existing Prisma models used as-is.
- **API routes**: All existing endpoints reused. No new endpoints needed (`/api/sight-words/session` already exists).
- **i18n**: All new components use `useTranslations()` from next-intl.
- **Auth/permissions**: Existing role-based access unchanged.

---

## File Structure Summary

```
src/
  hooks/
    useNewDesign.ts          # Toggle hook + context
  components/
    v2/
      NewDesignProvider.tsx   # Context provider
      Coin.tsx               # Gem-coin SVG
      CoinCounter.tsx        # Animated counter
      Gemmy.tsx              # Mascot (7 moods)
      BadgeFrame.tsx         # Badge wrapper
      KidHeaderBG.tsx        # Cobalt header
      KidTabBar.tsx          # Kid bottom nav
      PaperCard.tsx          # Parent card
      ParentTabBar.tsx       # Parent bottom nav
      Icon.tsx               # Icon set
      kid/
        KidHome.tsx
        KidCalendar.tsx
        KidBadges.tsx
        KidLearnEntry.tsx
        KidGallery.tsx
      learn/
        LearnHeader.tsx
        LearnPreview.tsx
        SightWordsMissing.tsx
        CorrectCelebration.tsx
        MathSolve.tsx
        MathSpeedRound.tsx
        SessionComplete.tsx
      parent/
        ParentHome.tsx
        ParentLedger.tsx
        ParentCalendar.tsx
        ParentTabBar.tsx
```

---

## Out of Scope

- Meals feature (deferred, not redesigned)
- Settings/Profile/Auth screens (not touched, except toggle addition)
- Tablet + desktop layouts (mobile-only for now)
- The `design_handoff_gemsteps_mobile/` directory is reference only — not deployed
