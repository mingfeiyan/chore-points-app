import { redirect } from "next/navigation";
import { requireFamily } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import MathProgressContent from "@/components/learn/MathProgressContent";
import ParentTabBar from "@/components/v2/ParentTabBar";

export default async function MathProgressPage() {
  const session = await requireFamily();

  if (session.user.role !== "PARENT") {
    redirect("/");
  }

  const kids = await prisma.user.findMany({
    where: {
      familyId: session.user.familyId!,
      role: "KID",
    },
    select: { id: true, name: true },
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-[110px]">
      <MathProgressContent kids={kids} />
      <ParentTabBar />
    </div>
  );
}
