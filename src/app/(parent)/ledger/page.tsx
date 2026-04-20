import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import PointsLedger from "@/components/points/PointsLedger";
import LedgerPageHeader from "@/components/parent/LedgerPageHeader";
import ParentLedgerWrapper from "@/components/v2/parent/ParentLedgerWrapper";

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

  // Fetch kids for the v2 ledger
  const kids = await prisma.user.findMany({
    where: {
      familyId: session.user.familyId,
      role: "KID",
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const kidsForWrapper = kids.map((k) => ({
    id: k.id,
    name: k.name || "Unknown",
  }));

  const fallback = (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LedgerPageHeader />
        <PointsLedger />
      </div>
    </div>
  );

  return <ParentLedgerWrapper kids={kidsForWrapper} fallback={fallback} />;
}
