"use client";

import { createContext, useState, useEffect, ReactNode } from "react";

const STORAGE_KEY = "gemsteps-new-ui";

export type NewDesignContextType = {
  isNewDesign: boolean;
  setNewDesign: (v: boolean) => void;
};

export const NewDesignContext = createContext<NewDesignContextType>({
  isNewDesign: false,
  setNewDesign: () => {},
});

export default function NewDesignProvider({ children }: { children: ReactNode }) {
  const [isNewDesign, setIsNewDesign] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "true") {
      setIsNewDesign(true);
    }
    setMounted(true);
  }, []);

  const setNewDesign = (v: boolean) => {
    if (v) {
      localStorage.setItem(STORAGE_KEY, "true");
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setIsNewDesign(v);
  };

  // Prevent hydration mismatch by not rendering context value until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <NewDesignContext.Provider value={{ isNewDesign, setNewDesign }}>
      {children}
    </NewDesignContext.Provider>
  );
}
