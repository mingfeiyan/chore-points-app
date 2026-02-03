import { prisma } from "@/lib/db";

/**
 * Auto-converts planned meals to daily logs for past days that haven't been logged yet.
 *
 * For each MealPlan in the family, this function checks all planned days where:
 * 1. The date is before today (past days)
 * 2. No DailyMealLog exists yet for that date
 *
 * For each qualifying day, it creates a DailyMealLog that copies:
 * - All meals with their dishes from the planned day
 * - Weekly staples from the plan as daily items
 *
 * @param familyId - The family ID to process meal plans for
 */
export async function autoConvertPlannedMeals(familyId: string): Promise<void> {
  // Get today's date at midnight (start of day)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find all meal plans for the family with their planned days, meals, and dishes
  const mealPlans = await prisma.mealPlan.findMany({
    where: {
      familyId,
    },
    include: {
      plannedDays: {
        include: {
          meals: {
            include: {
              dishes: true,
            },
          },
        },
      },
    },
  });

  // Process each meal plan
  for (const plan of mealPlans) {
    // Process each planned day
    for (const plannedDay of plan.plannedDays) {
      // Skip if the planned day is today or in the future
      const plannedDate = new Date(plannedDay.date);
      plannedDate.setHours(0, 0, 0, 0);

      if (plannedDate >= today) {
        continue;
      }

      // Check if a DailyMealLog already exists for this date
      const existingLog = await prisma.dailyMealLog.findUnique({
        where: {
          familyId_date: {
            familyId,
            date: plannedDay.date,
          },
        },
      });

      // Skip if log already exists
      if (existingLog) {
        continue;
      }

      // Create a new DailyMealLog from the planned day
      await prisma.dailyMealLog.create({
        data: {
          familyId,
          date: plannedDay.date,
          // Create meals from planned day meals
          meals: {
            create: plannedDay.meals.map((meal) => ({
              mealType: meal.mealType,
              notes: meal.notes,
              dishes: {
                create: meal.dishes.map((dish) => ({
                  dishId: dish.dishId,
                  dishName: dish.dishName,
                  isFreeForm: dish.isFreeForm,
                })),
              },
            })),
          },
          // Add weekly staples as daily items
          dailyItems: {
            create: plan.weeklyStaples.map((name) => ({ name })),
          },
        },
      });
    }
  }
}
