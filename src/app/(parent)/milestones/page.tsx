import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import MilestonesList from "@/components/milestones/MilestonesList";
import MilestonesPageHeader from "@/components/parent/MilestonesPageHeader";

export default async function MilestonesPage() {
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

  // Get all kids in the family for the form
  const kids = await prisma.user.findMany({
    where: {
      familyId: session.user.familyId,
      role: "KID",
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MilestonesPageHeader />
        <div className="mt-8">
          <MilestonesList kids={kids} />
        </div>
      </div>
    </div>
  );
}
