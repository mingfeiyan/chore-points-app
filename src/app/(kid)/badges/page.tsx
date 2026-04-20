import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import KidBadgesWrapper from "@/components/v2/kid/KidBadgesWrapper";

export default async function KidBadgesPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.familyId) {
    redirect("/dashboard");
  }

  if (session.user.role !== "KID") {
    redirect("/dashboard");
  }

  return <KidBadgesWrapper />;
}
