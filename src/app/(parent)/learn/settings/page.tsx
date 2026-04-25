import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import MathSettingsForm from "@/components/learn/MathSettingsForm";
import ParentTabBar from "@/components/v2/ParentTabBar";

export default async function MathSettingsPage() {
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
    <div className="min-h-screen bg-pg-cream pb-[110px] font-[family-name:var(--font-inter)]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MathSettingsForm />
      </div>
      <ParentTabBar />
    </div>
  );
}
