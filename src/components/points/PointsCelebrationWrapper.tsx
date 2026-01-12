"use client";

import { useState, useEffect, useCallback } from "react";
import PointsCelebration from "./PointsCelebration";

type PointsCelebrationWrapperProps = {
  kidId: string;
  currentPoints: number;
  children: (props: { onReplay: () => void; canReplay: boolean }) => React.ReactNode;
};

export default function PointsCelebrationWrapper({
  kidId,
  currentPoints,
  children,
}: PointsCelebrationWrapperProps) {
  const [lastViewedPoints, setLastViewedPoints] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [canReplay, setCanReplay] = useState(false);
  const [replayFromPoints, setReplayFromPoints] = useState<number>(0);

  // Fetch last viewed points on mount
  useEffect(() => {
    async function fetchLastViewed() {
      try {
        const res = await fetch(`/api/points/last-viewed?kidId=${kidId}`);
        if (res.ok) {
          const data = await res.json();
          setLastViewedPoints(data.lastViewedPoints ?? 0);
        } else {
          // If endpoint fails, just skip celebration
          setLastViewedPoints(null);
        }
      } catch {
        setLastViewedPoints(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLastViewed();
  }, [kidId]);

  // Determine if celebration should play
  useEffect(() => {
    if (
      !isLoading &&
      lastViewedPoints !== null &&
      currentPoints > lastViewedPoints
    ) {
      // Store the original "from" value for replay
      setReplayFromPoints(lastViewedPoints);
      setShowCelebration(true);
    }
  }, [isLoading, lastViewedPoints, currentPoints]);

  // Sync threshold down when points decrease (e.g., chores deleted)
  useEffect(() => {
    if (
      !isLoading &&
      lastViewedPoints !== null &&
      currentPoints < lastViewedPoints
    ) {
      // Update database to lower threshold
      fetch("/api/points/last-viewed", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: currentPoints, kidId }),
      }).catch((error) => {
        console.error("Failed to sync last viewed points:", error);
      });
      setLastViewedPoints(currentPoints);
    }
  }, [isLoading, lastViewedPoints, currentPoints, kidId]);

  // Handle celebration complete
  const handleCelebrationComplete = useCallback(async () => {
    // Only update database on first celebration (not replay)
    if (!canReplay) {
      try {
        await fetch("/api/points/last-viewed", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ points: currentPoints, kidId }),
        });
      } catch (error) {
        console.error("Failed to update last viewed points:", error);
      }
      setLastViewedPoints(currentPoints);
    }

    setShowCelebration(false);
    setCanReplay(true);
  }, [currentPoints, kidId, canReplay]);

  // Replay celebration
  const handleReplay = useCallback(() => {
    setShowCelebration(true);
  }, []);

  return (
    <>
      {showCelebration && (
        <PointsCelebration
          fromPoints={replayFromPoints}
          toPoints={currentPoints}
          onComplete={handleCelebrationComplete}
        />
      )}
      {children({ onReplay: handleReplay, canReplay })}
    </>
  );
}
