import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import SightWordsList from "@/components/learn/SightWordsList";

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Sight Words</h1>
          <p className="text-gray-600 mt-1">
            Manage sight words for your child to learn. Drag to reorder.
          </p>
        </div>
        <SightWordsList />
      </div>
    </div>
  );
}
