"use client";

import { ReactNode } from "react";
import { useNewDesign } from "@/hooks/useNewDesign";
import ParentLedger from "./ParentLedger";

type Props = {
  kids: Array<{ id: string; name: string }>;
  fallback: ReactNode;
};

export default function ParentLedgerWrapper({ kids, fallback }: Props) {
  const { isNewDesign } = useNewDesign();
  if (!isNewDesign) return <>{fallback}</>;
  return <ParentLedger kids={kids} />;
}
