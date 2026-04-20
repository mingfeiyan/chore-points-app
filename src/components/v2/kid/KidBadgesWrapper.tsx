"use client";

import { useNewDesign } from "@/hooks/useNewDesign";
import KidBadges from "./KidBadges";

export default function KidBadgesWrapper() {
  const { isNewDesign } = useNewDesign();

  if (!isNewDesign) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Badges coming soon</p>
        </div>
      </div>
    );
  }

  return <KidBadges />;
}
