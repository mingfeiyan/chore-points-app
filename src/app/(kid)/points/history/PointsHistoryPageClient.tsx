"use client";

import PointsHistory from "@/components/points/PointsHistory";
import PointsHistoryHeader from "@/components/points/PointsHistoryHeader";

export default function PointsHistoryPageClient({ kidId }: { kidId: string }) {
  return (
    <div className="min-h-screen bg-ca-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PointsHistoryHeader />
        <PointsHistory kidId={kidId} />
      </div>
    </div>
  );
}
