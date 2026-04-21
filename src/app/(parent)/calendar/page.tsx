import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import ParentCalendar from "@/components/v2/parent/ParentCalendar";

export default async function CalendarPage() {
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

  return <ParentCalendar />;
}
