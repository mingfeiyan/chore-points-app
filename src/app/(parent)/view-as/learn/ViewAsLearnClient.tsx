"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useKidMode } from "@/components/providers/KidModeProvider";
import { useNewDesign } from "@/hooks/useNewDesign";
import LearningCenter from "@/components/learn/LearningCenter";
import KidLearnEntry from "@/components/v2/kid/KidLearnEntry";

export default function ViewAsLearnClient() {
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
    return <KidLearnEntry kidId={viewingAsKid.id} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Learning Center</h1>
          <p className="text-gray-600 mt-1">
            Viewing as {viewingAsKid.name || viewingAsKid.email}
          </p>
        </div>
        <LearningCenter kidId={viewingAsKid.id} />
      </div>
    </div>
  );
}
