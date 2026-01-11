"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useKidMode } from "@/components/providers/KidModeProvider";
import KidPointsView from "@/components/points/KidPointsView";

export default function ViewAsPointsClient() {
  const { viewingAsKid, isKidMode } = useKidMode();
  const router = useRouter();

  useEffect(() => {
    if (!isKidMode) {
      router.push("/dashboard");
    }
  }, [isKidMode, router]);

  if (!viewingAsKid) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <KidPointsView kidId={viewingAsKid.id} readOnly />
      </div>
    </div>
  );
}
