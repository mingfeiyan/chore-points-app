# AI Meal Plan Health Feedback Design

## Overview

Add an AI-powered health analysis feature to the meal planning page. After saving a weekly meal plan (or on-demand), Claude analyzes the selected dishes and their ingredients, then provides:
- A simple overall health summary
- Detailed nutritional breakdown by category
- Actionable suggestions for improvement

The feedback appears in the user's chosen language (English or Chinese).

## User Flow

1. **Parent saves meal plan** → "Plan saved!" message appears with health feedback below it (auto-triggered)

2. **Feedback displays in a card** with three sections:
   - Summary (2-3 sentences)
   - Breakdown (proteins, vegetables, carbs, etc.)
   - Suggestions (specific dishes/ingredients to add)

3. **"Refresh Feedback" button** allows re-requesting analysis anytime (e.g., after adding more dishes or updating ingredients)

4. **Loading state** shows "Analyzing your meal plan..." while waiting for Claude's response

5. **Missing ingredients notice** - If some dishes lack ingredients, feedback includes: "Note: 3 dishes are missing ingredients. Add them for more accurate feedback."

## API Design

### Endpoint

`POST /api/meal-plans/feedback`

### Request

```json
{
  "dishes": [
    { "name": "红烧排骨", "ingredients": ["pork ribs", "soy sauce", "sugar"] },
    { "name": "Beef Stir Fry", "ingredients": ["beef", "broccoli", "garlic"] },
    { "name": "Fried Rice", "ingredients": [] }
  ],
  "language": "en"
}
```

### Response

```json
{
  "summary": "Your meal plan is well-balanced with good protein variety. Consider adding more leafy greens and whole grains.",
  "breakdown": {
    "proteins": { "status": "good", "items": ["pork", "beef"] },
    "vegetables": { "status": "limited", "items": ["broccoli", "garlic"] },
    "grains": { "status": "missing", "items": [] },
    "dairy": { "status": "missing", "items": [] }
  },
  "suggestions": [
    "Add a fish dish for omega-3 fatty acids",
    "Include leafy greens like spinach or bok choy",
    "Consider adding a dairy source like milk or yogurt"
  ],
  "missingIngredientsDishes": ["Fried Rice"]
}
```

### Claude Prompt Structure

- System prompt defines a nutritionist/health advisor role
- User prompt includes dish list with ingredients in structured format
- Requests JSON response for easy parsing
- Specifies target language for the response

### Security

- `ANTHROPIC_API_KEY` stored in environment variables (server-side only)
- Never exposed to client

## UI Components

### MealPlanFeedback Component

Displays below the "Save Plan" button on the Results page:

```
┌─────────────────────────────────────────┐
│ 🍎 Health Feedback                      │
├─────────────────────────────────────────┤
│ Summary                                 │
│ Your meal plan is well-balanced with    │
│ good protein variety. Consider adding   │
│ more leafy greens and whole grains.     │
├─────────────────────────────────────────┤
│ Breakdown                               │
│ ✓ Proteins: pork, beef, chicken         │
│ ✓ Vegetables: broccoli, carrots         │
│ ⚠ Grains: limited variety               │
│ ✗ Dairy: none                           │
├─────────────────────────────────────────┤
│ Suggestions                             │
│ • Add a fish dish for omega-3s          │
│ • Include leafy greens like spinach     │
│ • Consider adding rice or noodle dishes │
├─────────────────────────────────────────┤
│ ⓘ 2 dishes missing ingredients          │
│                      [Refresh Feedback] │
└─────────────────────────────────────────┘
```

## Edge Cases & Error Handling

| Scenario | Behavior |
|----------|----------|
| No dishes selected | Hide feedback section or show "Select dishes to get feedback" |
| API error (rate limit, network) | Show "Couldn't get feedback. Try again later." with Retry button |
| API key not configured | Hide feedback feature entirely (graceful degradation) |
| All dishes missing ingredients | Analyze using dish names only, show prominent notice |
| Long response time | Skeleton loading, timeout after 30s with retry option |

## Implementation

### Files to Create

- `src/app/api/meal-plans/feedback/route.ts` - API endpoint calling Claude
- `src/components/meals/MealPlanFeedback.tsx` - Feedback display component

### Files to Modify

- `src/components/meals/MealPlanSelector.tsx` - Trigger feedback after save
- `src/locales/en.json` / `zh.json` - Add translation keys
- `.env.local` - Add `ANTHROPIC_API_KEY`

### Cost Estimate

- Each feedback request ≈ 1-2k tokens (~$0.01-0.02 with Claude Sonnet)
- Weekly usage for a family: minimal cost

### Permissions

- Only parents can request feedback (same as meal plan editing)
