# GemSteps - Build Great Habits

A family engagement platform for tracking chores, earning points, and building lasting habits. Built with Next.js, TypeScript, and PostgreSQL.

## Features

### Core Features

- **Chores Management** - Parents create and manage chores with default point values and icons
- **Points System** - Award points for completed chores with photo evidence and notes
- **Rewards & Redemption** - Kids redeem points for custom rewards with parent approval workflow
- **Badge System** - Two types of badges:
  - *Chore-Level Badges*: Progressive levels (Starter → Legendary) for repeated chore completion
  - *Achievement Badges*: Unlocked for streaks, milestones, and special accomplishments

### Learning Center

- **Sight Words** - Flashcard-style learning with quizzes and progress tracking
- **Daily Math** - Addition and subtraction practice with point rewards
- **Bilingual Support** - Full English and Chinese language support

### Meal Planning

- **Dish Library** - Create dishes with photos and ingredients
- **Weekly Voting** - Family members vote on preferred meals for the week
- **Meal Planning** - Plan weekly meals based on voting results
- **AI Health Feedback** - Get nutrition insights on meal plans

### Family Features

- **Photo Gallery** - Store and browse family memories with captions
- **Milestone Tracking** - Record special achievements and moments
- **Google Calendar Integration** - Sync and view family events
- **Family Todo List** - Shared tasks with assignments and due dates

### User Roles

- **Parents**: Full access to manage chores, rewards, badges, meals, and approve redemptions
- **Kids**: View points, complete learning activities, redeem rewards, participate in meal voting
- **Kid Mode**: Parents can preview the kid experience without switching accounts

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5 (Email, Google OAuth)
- **Styling**: Tailwind CSS
- **Storage**: Vercel Blob
- **AI**: Anthropic Claude SDK
- **i18n**: next-intl (English/Chinese)
- **Testing**: Vitest

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or use Neon/Supabase)

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your credentials:
   - `DATABASE_URL` - PostgreSQL connection string
   - `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - For Google OAuth & Calendar
   - `BLOB_READ_WRITE_TOKEN` - For Vercel Blob storage
   - `ANTHROPIC_API_KEY` - For AI features (optional)

4. Generate Prisma client and run migrations:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── (auth)/         # Login & signup pages
│   ├── (kid)/          # Kid-only pages (points, learn, redeem)
│   ├── (parent)/       # Parent-only pages (chores, rewards, ledger)
│   └── api/            # API routes
├── components/         # React components
│   ├── badges/         # Badge display & notifications
│   ├── calendar/       # Calendar views & forms
│   ├── chores/         # Chore management
│   ├── learn/          # Sight words & math
│   ├── meals/          # Meal planning & voting
│   ├── milestones/     # Milestone tracking
│   ├── photos/         # Photo gallery
│   ├── points/         # Points ledger & forms
│   └── rewards/        # Rewards & redemption
├── lib/                # Utilities & configurations
└── messages/           # i18n translation files
```

## Deployment

Deploy easily on [Vercel](https://vercel.com):

1. Connect your GitHub repository
2. Configure environment variables
3. Deploy

See [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for details.
