import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import ScheduleMathQuestions from "@/components/learn/ScheduleMathQuestions";

export default async function ScheduleQuestionsPage() {
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

  if (kids.length === 0) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <ScheduleMathQuestions kids={kids} />
      </div>
    </div>
  );
}
