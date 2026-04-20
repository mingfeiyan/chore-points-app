"use client";

import { useContext } from "react";
import { NewDesignContext, NewDesignContextType } from "@/components/v2/NewDesignProvider";

export function useNewDesign(): NewDesignContextType {
  return useContext(NewDesignContext);
}
