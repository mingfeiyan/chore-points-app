import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import SettingsPageContent from "@/components/parent/SettingsPageContent";

export default async function SettingsPage() {
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

  const family = await prisma.family.findUnique({
    where: { id: session.user.familyId },
    select: {
      id: true,
      name: true,
      inviteCode: true,
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  const kids = family?.users.filter((u) => u.role === "KID") || [];

  return (
    <SettingsPageContent
      familyName={family?.name || ""}
      inviteCode={family?.inviteCode || ""}
      kids={kids}
    />
  );
}
