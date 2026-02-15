import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import MathSettingsForm from "@/components/learn/MathSettingsForm";
import ScheduleMathQuestions from "@/components/learn/ScheduleMathQuestions";

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

  const kids = await prisma.user.findMany({
    where: {
      familyId: session.user.familyId,
      role: "KID",
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        <MathSettingsForm />
        {kids.length > 0 && (
          <ScheduleMathQuestions kids={kids} />
        )}
      </div>
    </div>
  );
}
