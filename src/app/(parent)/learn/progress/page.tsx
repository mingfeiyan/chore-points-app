import { redirect } from "next/navigation";
import { requireFamily } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import MathAnalytics from "@/components/learn/MathAnalytics";

export default async function MathProgressPage() {
  const session = await requireFamily();

  if (session.user.role !== "PARENT") {
    redirect("/");
  }

  // Get kids in family
  const kids = await prisma.user.findMany({
    where: {
      familyId: session.user.familyId!,
      role: "KID",
    },
    select: { id: true, name: true },
  });

  if (kids.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Math Progress</h1>
        <p className="text-gray-500">No kids in your family yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Math Progress</h1>
      <MathAnalytics kids={kids} defaultKidId={kids[0].id} />
    </div>
  );
}
