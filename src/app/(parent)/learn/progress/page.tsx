import { redirect } from "next/navigation";
import { requireFamily } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import MathProgressContent from "@/components/learn/MathProgressContent";

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

  return <MathProgressContent kids={kids} />;
}
