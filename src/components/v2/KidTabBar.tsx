"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useKidMode } from "@/components/providers/KidModeProvider";
import { Home, BookOpen, Gift } from "lucide-react";
import CoinSmall from "@/components/v2/CoinSmall";

// Kid users: /points, /learn
// Parents in kid mode: /view-as/points, /view-as/learn, /view-as/gallery
function useTabs() {
  const { data: session } = useSession();
  const { isKidMode } = useKidMode();
  const isParentViewingAsKid = session?.user?.role === "PARENT" && isKidMode;
  const prefix = isParentViewingAsKid ? "/view-as" : "";

  const tabs = [
    { id: "home", label: "Home", href: `${prefix}/points`, icon: "home" as const },
    { id: "gems", label: "Gems", href: `${prefix}/points/history`, icon: "gem" as const },
    { id: "learn", label: "Learn", href: `${prefix}/learn`, icon: "learn" as const },
  ];

  return tabs;
}

const ACTIVE_COLOR = "#f66951"; // coral
const ACTIVE_BG = "#fff1ec";
const INACTIVE_COLOR = "#8a8577"; // muted

export default function KidTabBar() {
  const pathname = usePathname();
  const tabs = useTabs();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 14px)" }}
    >
      {/* Fade gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(to top, #FFFEF9 60%, rgba(255,254,249,0))",
        }}
      />
      {/* Floating pill bar */}
      <div
        className="relative mx-3.5 flex justify-around items-center pointer-events-auto"
        style={{
          padding: "10px 8px",
          background: "#fff",
          borderRadius: 28,
          boxShadow: "0 8px 28px rgba(26,24,19,0.10), 0 2px 6px rgba(26,24,19,0.04)",
        }}
      >
        {tabs.map((tab) => {
          const isHome = tab.id === "home";
          const isActive = isHome
            ? pathname === tab.href
            : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className="flex flex-col items-center gap-0.5 flex-1"
            >
              {/* Icon pill */}
              <div
                className="flex items-center justify-center"
                style={{
                  width: 44,
                  height: 32,
                  borderRadius: 16,
                  background: isActive ? ACTIVE_BG : "transparent",
                }}
              >
                {tab.icon === "gem" ? (
                  <CoinSmall size={18} />
                ) : tab.icon === "home" ? (
                  <Home size={20} color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR} />
                ) : tab.icon === "learn" ? (
                  <BookOpen size={20} color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR} />
                ) : (
                  <Gift size={20} color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR} />
                )}
              </div>
              <span
                style={{
                  fontFamily: "var(--font-nunito)",
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 0.2,
                  color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
