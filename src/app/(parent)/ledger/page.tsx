import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import ParentLedger from "@/components/v2/parent/ParentLedger";

export default async function LedgerPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "PARENT") {
    redirect("/dashboard");
  }

  if (!session.user.familyId) {
    redirect("/dashboard");
  }

  // Fetch kids for the v2 ledger
  const kids = await prisma.user.findMany({
    where: {
      familyId: session.user.familyId,
      role: "KID",
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const kidsForLedger = kids.map((k) => ({
    id: k.id,
    name: k.name || "Unknown",
  }));

  return <ParentLedger kids={kidsForLedger} />;
}
