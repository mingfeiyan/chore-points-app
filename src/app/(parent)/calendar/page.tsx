import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import CalendarView from "@/components/calendar/CalendarView";
import ParentCalendarWrapper from "@/components/v2/parent/ParentCalendarWrapper";

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

  const fallback = (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <CalendarView />
    </div>
  );

  return <ParentCalendarWrapper fallback={fallback} />;
}
