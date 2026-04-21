import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import FamilySetup from "@/components/family/FamilySetup";
import ParentHome from "@/components/v2/parent/ParentHome";

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

  // If user has a family, show appropriate dashboard based on role
  if (session.user.role === "PARENT") {
    return <ParentHome userName={session.user.name || session.user.email || ""} />;
  }

  // Kid dashboard - redirect to points page
  redirect("/points");
}
