import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import PointsLedger from "@/components/points/PointsLedger";
import LedgerPageHeader from "@/components/parent/LedgerPageHeader";

export default async function LedgerPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "PARENT") {
    redirect("/dashboard");
  }

  if (!session.user.familyId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LedgerPageHeader />
        <PointsLedger />
      </div>
    </div>
  );
}
