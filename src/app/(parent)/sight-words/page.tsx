import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import SightWordsList from "@/components/learn/SightWordsList";
import ParentTabBar from "@/components/v2/ParentTabBar";

export default async function SightWordsPage() {
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-wide text-pg-muted">
            Learning Center
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl md:text-[32px] font-medium text-pg-ink leading-tight tracking-tight">
            Sight Words
          </h1>
          <p className="mt-2 text-pg-muted">
            Manage sight words for your child to learn. Drag to reorder.
          </p>
        </div>
        <SightWordsList />
      </div>
      <ParentTabBar />
    </div>
  );
}
