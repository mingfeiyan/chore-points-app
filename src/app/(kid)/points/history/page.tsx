import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import PointsHistory from "@/components/points/PointsHistory";
import PointsHistoryHeader from "@/components/points/PointsHistoryHeader";

export default async function PointsHistoryPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.familyId) {
    redirect("/dashboard");
  }

  if (session.user.role !== "KID") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PointsHistoryHeader />
        <PointsHistory kidId={session.user.id} />
      </div>
    </div>
  );
}
