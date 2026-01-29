# Meal Voting Feature Design

## Overview

A family meal planning feature that lets family members log home-cooked dishes and vote weekly on what to cook. The goal is to help the cook (parents) know what the family wants for the upcoming week.

## Core Concepts

- **Any family member** can log dishes and vote
- **Dishes** are logged with name, meal type, photo, and date
- **Weekly voting** resets each Monday - family picks from history or suggests new dishes
- **Cook sees** vote counts and who voted for what
- **Family favorites** are dishes that reach 5 total votes across all weeks
- **No integration** with the existing points system

## Data Model

### Dish

Represents a unique dish the family has made.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key |
| familyId | String | FK to Family |
| name | String | Dish name (e.g., "Beef Stir Fry") |
| photoUrl | String | Vercel Blob URL |
| totalVotes | Int | Running count of all-time votes (favorite at >= 5) |
| createdById | String | FK to User who first logged it |
| createdAt | DateTime | When dish was first logged |

### MealLog

Records each time a dish was served.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key |
| dishId | String | FK to Dish |
| familyId | String | FK to Family |
| mealType | Enum | BREAKFAST, LUNCH, DINNER |
| date | DateTime | When the meal was served |
| loggedById | String | FK to User who logged it |
| createdAt | DateTime | When the log was created |

### WeeklyVote

Tracks votes for the current week's meal planning.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key |
| dishId | String? | FK to Dish (null if suggesting new) |
| suggestedDishName | String? | Name of suggested dish (null if voting for existing) |
| familyId | String | FK to Family |
| oderId | String | FK to User who voted |
| weekStart | DateTime | Monday of the voting week |
| createdAt | DateTime | When vote was cast |

**Constraints:**
- One vote per user per dish per week
- Either `dishId` or `suggestedDishName` is set, not both

## Pages & Navigation

### /meals - Main Hub

- Shows recent dishes logged (last 7 days)
- Quick-add button to log a new dish
- Navigation to voting and cook's view
- Add to parent dashboard alongside Chores, Rewards, etc.

### /meals/log - Log a Dish

- Form fields:
  - Dish name with autocomplete from history
  - Meal type dropdown (Breakfast/Lunch/Dinner)
  - Photo upload (required for new dishes, optional for existing)
  - Date picker (defaults to today)
- If name matches existing dish, links to it; otherwise creates new Dish

### /meals/vote - Family Voting

- Grid of past dishes with photos (most recent first)
- Each dish shows current week's vote count
- Tap to vote/unvote (highlighted state for voted dishes)
- "Suggest new dish" button for dishes not in history
- Filter/search to find dishes
- Family favorites section at top for easy access

### /meals/results - Cook's View

- Dishes ranked by vote count for current week
- Each dish shows who voted (names/avatars)
- Suggested new dishes in separate section
- Weeks reset automatically based on date

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/dishes` | GET | List dishes for family (with vote counts, favorite status) |
| `/api/dishes` | POST | Create new dish (name, photo) |
| `/api/dishes/[id]` | PATCH | Update dish (photo, name) |
| `/api/meals` | GET | Get meal logs (filterable by date range) |
| `/api/meals` | POST | Log a meal (dishId or new dish, mealType, date) |
| `/api/votes` | GET | Get current week's votes with voter info |
| `/api/votes` | POST | Cast vote (dishId or suggestedDishName) |
| `/api/votes/[id]` | DELETE | Remove a vote |

## Components

| Component | Purpose |
|-----------|---------|
| `DishCard` | Photo thumbnail, name, vote count, favorite badge |
| `DishGrid` | Grid layout of DishCards for browsing/voting |
| `LogDishForm` | Name autocomplete, meal type, photo upload, date picker |
| `VoteResults` | Ranked list with voter avatars for cook's view |
| `SuggestDishModal` | Simple form for suggesting new dishes |

## User Flows

### Logging a Dish

1. Tap "Log Dish" from /meals
2. Start typing dish name - autocomplete suggests existing dishes
3. If match found: select it, photo is optional
4. If new dish: enter name, photo required
5. Pick meal type, date defaults to today
6. Submit - creates MealLog (and Dish if new)

### Voting for the Week

1. Go to /meals/vote
2. Browse dish grid with photos
3. Tap dish to vote, tap again to remove vote
4. Can vote for multiple dishes
5. To suggest new: tap "Suggest dish" and enter name
6. Votes persist until Monday reset

### Cook Planning

1. Go to /meals/results (e.g., Sunday evening)
2. See dishes ranked by votes with voter names
3. Review suggestions for new dishes
4. Decide what to cook based on results

## Edge Cases

### Week Boundaries
- Week starts Monday 00:00 in user's local timezone
- Votes cast Sunday night count for that ending week

### Duplicate Dishes
- Autocomplete matches case-insensitive
- Prompt to use existing dish on exact match
- Can still create new (e.g., "Mom's Spaghetti" vs "Dad's Spaghetti")

### Suggested Dishes
- Stay as text until someone logs them
- When logged, create Dish record
- Old suggestion votes don't transfer to new Dish

### Photos
- Uses existing Vercel Blob storage
- Required for new dishes
- Optional when re-logging existing dish

### Permissions
- Any authenticated family member can log and vote
- Delete dish: creator or parent only

### Empty States
- No dishes: "Log your first dish to get started"
- No votes: "No votes yet - be the first!"
- No favorites: "Dishes with 5+ votes appear here"

## Family Favorites

Dishes automatically become "Family Favorites" when `totalVotes >= 5`. The `totalVotes` field increments each time anyone votes for the dish (across all weeks). Favorites are surfaced prominently in the voting UI.

## Technical Notes

- Reuse existing Vercel Blob upload infrastructure from gallery
- Reuse existing timezone handling for week boundaries
- No integration with points system - separate feature
