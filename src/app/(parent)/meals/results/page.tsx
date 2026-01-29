import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import Link from "next/link";
import VoteResults from "@/components/meals/VoteResults";
import { getTranslations } from "next-intl/server";

export default async function MealsResultsPage() {
  const session = await getSession();
  const t = await getTranslations("meals");

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.familyId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-2">
          <Link
            href="/meals"
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">{t("resultsTitle")}</h1>
        <p className="mt-2 text-gray-600">{t("resultsDesc")}</p>
        <div className="mt-8">
          <VoteResults />
        </div>
      </div>
    </div>
  );
}
