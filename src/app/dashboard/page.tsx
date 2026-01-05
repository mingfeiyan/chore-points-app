import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import FamilySetup from "@/components/family/FamilySetup";
import FamilyInviteCode from "@/components/family/FamilyInviteCode";
import ParentDashboardHeader from "@/components/parent/ParentDashboardHeader";
import ParentDashboardCards from "@/components/parent/ParentDashboardCards";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  // If user doesn't have a family, show family setup
  if (!session.user.familyId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <FamilySetup user={session.user} />
      </div>
    );
  }

  // Fetch family data including invite code and members
  const family = await prisma.family.findUnique({
    where: { id: session.user.familyId },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  // If user has a family, show appropriate dashboard based on role
  if (session.user.role === "PARENT") {
    const kids =
      family?.users.filter((u: { role: string }) => u.role === "KID") || [];
    const kidsNames = kids
      .map((k: { name: string | null; email: string }) => k.name || k.email)
      .join(", ");

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ParentDashboardHeader
            familyName={family?.name}
            kidsCount={kids.length}
            kidsNames={kidsNames}
          />
          <div className="flex justify-end mt-4">
            <FamilyInviteCode inviteCode={family?.inviteCode || ""} />
          </div>
          <ParentDashboardCards />
        </div>
      </div>
    );
  }

  // Kid dashboard - redirect to points page
  redirect("/points");
}
