"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Kid = {
  id: string;
  name: string | null;
  email: string;
};

type KidModeContextType = {
  viewingAsKid: Kid | null;
  setViewingAsKid: (kid: Kid | null) => void;
  isKidMode: boolean;
  exitKidMode: () => void;
};

const KidModeContext = createContext<KidModeContextType>({
  viewingAsKid: null,
  setViewingAsKid: () => {},
  isKidMode: false,
  exitKidMode: () => {},
});

export function useKidMode() {
  return useContext(KidModeContext);
}

export default function KidModeProvider({ children }: { children: ReactNode }) {
  const [viewingAsKid, setViewingAsKidState] = useState<Kid | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Restore from localStorage on mount
    const saved = localStorage.getItem("kidMode");
    if (saved) {
      try {
        setViewingAsKidState(JSON.parse(saved));
      } catch {
        localStorage.removeItem("kidMode");
      }
    }
    setMounted(true);
  }, []);

  const setViewingAsKid = (kid: Kid | null) => {
    if (kid) {
      localStorage.setItem("kidMode", JSON.stringify(kid));
    } else {
      localStorage.removeItem("kidMode");
    }
    setViewingAsKidState(kid);
  };

  const exitKidMode = () => {
    setViewingAsKid(null);
  };

  // Prevent hydration mismatch by not rendering context value until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <KidModeContext.Provider
      value={{
        viewingAsKid,
        setViewingAsKid,
        isKidMode: viewingAsKid !== null,
        exitKidMode,
      }}
    >
      {children}
    </KidModeContext.Provider>
  );
}
