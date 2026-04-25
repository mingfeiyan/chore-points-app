import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import ChoresList from "@/components/chores/ChoresList";
import ChoresPageHeader from "@/components/parent/ChoresPageHeader";
import ParentTabBar from "@/components/v2/ParentTabBar";

export default async function ChoresPage() {
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
    <div className="min-h-screen bg-pg-cream pb-[110px] font-[family-name:var(--font-inter)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ChoresPageHeader />
        <ChoresList />
      </div>
      <ParentTabBar />
    </div>
  );
}
