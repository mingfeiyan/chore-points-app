"use client";

import { ReactNode } from "react";
import { useNewDesign } from "@/hooks/useNewDesign";
import ParentCalendar from "./ParentCalendar";

type Props = {
  fallback: ReactNode;
};

export default function ParentCalendarWrapper({ fallback }: Props) {
  const { isNewDesign } = useNewDesign();
  if (!isNewDesign) return <>{fallback}</>;
  return <ParentCalendar />;
}
