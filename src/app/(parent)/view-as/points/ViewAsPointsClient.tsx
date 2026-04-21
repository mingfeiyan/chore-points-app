"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useKidMode } from "@/components/providers/KidModeProvider";
import KidHome from "@/components/v2/kid/KidHome";

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

  return <KidHome kidId={viewingAsKid.id} kidName={viewingAsKid.name || viewingAsKid.email} />;
}
