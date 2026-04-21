"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useKidMode } from "@/components/providers/KidModeProvider";
import KidLearnEntry from "@/components/v2/kid/KidLearnEntry";

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

  return <KidLearnEntry kidId={viewingAsKid.id} />;
}
