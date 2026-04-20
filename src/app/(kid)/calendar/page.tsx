import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import KidCalendarWrapper from "@/components/v2/kid/KidCalendarWrapper";

export default async function KidCalendarPage() {
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

  return <KidCalendarWrapper />;
}
