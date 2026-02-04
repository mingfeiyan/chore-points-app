import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import FamilySetup from "@/components/family/FamilySetup";
import ParentDashboardHeader from "@/components/parent/ParentDashboardHeader";
import WeeklyCalendarView from "@/components/calendar/WeeklyCalendarView";
import FamilyTodoList from "@/components/dashboard/FamilyTodoList";
import PhotoCarousel from "@/components/dashboard/PhotoCarousel";
import LightsWidget from "@/components/lights/LightsWidget";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  // If user doesn't have a family, show family setup
  if (!session.user.familyId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <FamilySetup user={session.user} />
      </div>
    );
  }

  // If user has a family, show appropriate dashboard based on role
  if (session.user.role === "PARENT") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ParentDashboardHeader />
          <div className="mt-6 space-y-6">
            <WeeklyCalendarView />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FamilyTodoList />
              <LightsWidget />
            </div>
            <PhotoCarousel />
          </div>
        </div>
      </div>
    );
  }

  // Kid dashboard - redirect to points page
  redirect("/points");
}
