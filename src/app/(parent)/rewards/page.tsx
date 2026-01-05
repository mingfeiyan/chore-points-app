import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import RewardsList from "@/components/rewards/RewardsList";
import RewardsPageHeader from "@/components/parent/RewardsPageHeader";

export default async function RewardsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.familyId) {
    redirect("/dashboard");
  }

  if (session.user.role !== "PARENT") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RewardsPageHeader />
        <div className="mt-8">
          <RewardsList />
        </div>
      </div>
    </div>
  );
}
