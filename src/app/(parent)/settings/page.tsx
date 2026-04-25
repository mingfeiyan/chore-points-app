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
          _count: {
            select: {
              pointEntries: true,
              photos: true,
              badges: true,
              achievementBadges: true,
              requestedRedemptions: true,
            },
          },
        },
      },
    },
  });

  const kids =
    family?.users
      .filter((u) => u.role === "KID")
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        counts: {
          pointEntries: u._count.pointEntries,
          photos: u._count.photos,
          badges: u._count.badges + u._count.achievementBadges,
          redemptions: u._count.requestedRedemptions,
        },
      })) || [];

  return (
    <SettingsPageContent
      familyName={family?.name || ""}
      inviteCode={family?.inviteCode || ""}
      kids={kids}
    />
  );
}
