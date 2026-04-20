"use client";

import { ReactNode } from "react";
import { useNewDesign } from "@/hooks/useNewDesign";
import ParentHome from "./ParentHome";

type Props = {
  userName: string;
  fallback: ReactNode;
};

export default function ParentHomeWrapper({ userName, fallback }: Props) {
  const { isNewDesign } = useNewDesign();
  if (!isNewDesign) return <>{fallback}</>;
  return <ParentHome userName={userName} />;
}
