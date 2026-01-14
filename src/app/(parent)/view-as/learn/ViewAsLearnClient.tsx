"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useKidMode } from "@/components/providers/KidModeProvider";
import LearnView from "@/components/learn/LearnView";

export default function ViewAsLearnClient() {
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Learn Words</h1>
          <p className="text-gray-600 mt-1">
            Viewing as {viewingAsKid.name || viewingAsKid.email}
          </p>
        </div>
        <LearnView kidId={viewingAsKid.id} />
      </div>
    </div>
  );
}
