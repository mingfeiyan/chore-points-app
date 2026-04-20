"use client";

import { ReactNode } from "react";
import { useNewDesign } from "@/hooks/useNewDesign";
import KidHome from "@/components/v2/kid/KidHome";

interface KidHomeWrapperProps {
  kidId: string;
  kidName: string;
  fallback: ReactNode;
}

export default function KidHomeWrapper({ kidId, kidName, fallback }: KidHomeWrapperProps) {
  const { isNewDesign } = useNewDesign();

  if (!isNewDesign) {
    return <>{fallback}</>;
  }

  return <KidHome kidId={kidId} kidName={kidName} />;
}
