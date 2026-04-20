"use client";

import { useNewDesign } from "@/hooks/useNewDesign";
import KidLearnEntry from "./KidLearnEntry";
import LearningCenter from "@/components/learn/LearningCenter";

export default function KidLearnEntryWrapper() {
  const { isNewDesign } = useNewDesign();

  if (!isNewDesign) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Learning Center</h1>
            <p className="text-gray-600 mt-1">Daily sight words and math practice</p>
          </div>
          <LearningCenter />
        </div>
      </div>
    );
  }

  return <KidLearnEntry />;
}
