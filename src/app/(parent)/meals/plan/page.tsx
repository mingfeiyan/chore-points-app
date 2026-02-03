import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import MealPlanningView from "@/components/meals/MealPlanningView";

export default async function MealPlanPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.familyId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MealPlanningView />
      </div>
    </div>
  );
}
