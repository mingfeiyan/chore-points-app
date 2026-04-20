"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useKidMode } from "@/components/providers/KidModeProvider";
import { useNewDesign } from "@/hooks/useNewDesign";
import KidPointsView from "@/components/points/KidPointsView";
import KidHome from "@/components/v2/kid/KidHome";

export default function ViewAsPointsClient() {
  const { viewingAsKid, isKidMode } = useKidMode();
  const { isNewDesign } = useNewDesign();
  const router = useRouter();

  useEffect(() => {
    if (!isKidMode) {
      router.push("/dashboard");
    }
  }, [isKidMode, router]);

  if (!viewingAsKid) {
    return null;
  }

  if (isNewDesign) {
    return <KidHome kidId={viewingAsKid.id} kidName={viewingAsKid.name || viewingAsKid.email} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <KidPointsView kidId={viewingAsKid.id} readOnly />
      </div>
    </div>
  );
}
