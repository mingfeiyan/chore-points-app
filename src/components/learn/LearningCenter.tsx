"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import LearnView from "./LearnView";
import MathModule from "./MathModule";
import ProgressIndicator from "./ProgressIndicator";

type Props = {
  kidId?: string;
};

export default function LearningCenter({ kidId }: Props) {
  const [sightWordComplete, setSightWordComplete] = useState(false);
  const [mathComplete, setMathComplete] = useState(false);
  const t = useTranslations("learn");

  const handleSightWordComplete = useCallback(() => {
    setSightWordComplete(true);
  }, []);

  const handleMathComplete = useCallback(() => {
    setMathComplete(true);
  }, []);

  const allComplete = sightWordComplete && mathComplete;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Indicator */}
      <ProgressIndicator
        sightWordComplete={sightWordComplete}
        mathComplete={mathComplete}
      />

      {/* All Complete Celebration */}
      {allComplete ? (
        <div className="text-center py-16">
          <span className="text-8xl mb-4 block">🌟</span>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">
            {t("allDoneToday")}
          </h2>
          <p className="text-gray-500">Great job! Come back tomorrow.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Sight Word Module */}
          {!sightWordComplete && (
            <LearnView kidId={kidId} onComplete={handleSightWordComplete} />
          )}

          {/* Show completed sight word message when moving to math */}
          {sightWordComplete && !mathComplete && (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full">
                <span>✓</span>
                <span className="font-medium">{t("sightWord")} {t("correct").toLowerCase()}</span>
              </div>
            </div>
          )}

          {/* Math Module */}
          <MathModule
            kidId={kidId}
            locked={!sightWordComplete}
            onComplete={handleMathComplete}
          />
        </div>
      )}
    </div>
  );
}
