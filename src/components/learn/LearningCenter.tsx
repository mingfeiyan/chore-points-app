"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import LearnView from "./LearnView";
import MathModule from "./MathModule";

type Props = {
  kidId?: string;
};

type Tab = "sightWords" | "math";

export default function LearningCenter({ kidId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("sightWords");
  const [sightWordComplete, setSightWordComplete] = useState(false);
  const [mathComplete, setMathComplete] = useState(false);
  const t = useTranslations("learn");

  const handleSightWordComplete = useCallback(() => {
    setSightWordComplete(true);
  }, []);

  const handleMathComplete = useCallback(() => {
    setMathComplete(true);
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("sightWords")}
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors relative ${
            activeTab === "sightWords"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {t("sightWord")}
          {!sightWordComplete && (
            <span className="absolute top-2 right-4 w-2 h-2 bg-orange-500 rounded-full" />
          )}
          {sightWordComplete && (
            <span className="ml-2 text-green-500">✓</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("math")}
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors relative ${
            activeTab === "math"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {t("math")}
          {!mathComplete && (
            <span className="absolute top-2 right-4 w-2 h-2 bg-orange-500 rounded-full" />
          )}
          {mathComplete && (
            <span className="ml-2 text-green-500">✓</span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "sightWords" && (
          <LearnView kidId={kidId} onComplete={handleSightWordComplete} />
        )}
        {activeTab === "math" && (
          <MathModule
            kidId={kidId}
            onComplete={handleMathComplete}
          />
        )}
      </div>

      {/* All Complete Message */}
      {sightWordComplete && mathComplete && (
        <div className="mt-8 text-center py-8 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-2xl">
          <span className="text-6xl mb-4 block">🌟</span>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">
            {t("allDoneToday")}
          </h2>
          <p className="text-gray-500">Great job! Come back tomorrow.</p>
        </div>
      )}
    </div>
  );
}
