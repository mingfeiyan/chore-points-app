"use client";

import { useNewDesign } from "@/hooks/useNewDesign";
import KidCalendar from "./KidCalendar";

export default function KidCalendarWrapper() {
  const { isNewDesign } = useNewDesign();

  if (!isNewDesign) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Calendar coming soon</p>
        </div>
      </div>
    );
  }

  return <KidCalendar />;
}
