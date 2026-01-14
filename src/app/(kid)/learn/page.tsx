import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import LearnView from "@/components/learn/LearnView";

export default async function LearnPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.familyId) {
    redirect("/dashboard");
  }

  if (session.user.role === "PARENT") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Learn Words</h1>
          <p className="text-gray-600 mt-1">Practice your sight words!</p>
        </div>
        <LearnView />
      </div>
    </div>
  );
}
