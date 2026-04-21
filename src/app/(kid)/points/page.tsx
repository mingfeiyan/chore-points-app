import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import KidHome from "@/components/v2/kid/KidHome";

export default async function KidPointsPage() {
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

  return <KidHome kidId={session.user.id} kidName={session.user.name || "Kid"} />;
}
