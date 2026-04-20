"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useKidMode } from "@/components/providers/KidModeProvider";
import { Home, CalendarDays, BookOpen, Image } from "lucide-react";

// Kid users go to /points, /learn, etc.
// Parents in kid mode go to /view-as/points, /view-as/learn, etc.
function useTabs() {
  const { data: session } = useSession();
  const { isKidMode } = useKidMode();
  const isParentViewingAsKid = session?.user?.role === "PARENT" && isKidMode;
  const prefix = isParentViewingAsKid ? "/view-as" : "";

  if (isParentViewingAsKid) {
    return [
      { label: "Home", href: "/view-as/points", icon: Home },
      { label: "History", href: "/view-as/points/history", icon: CalendarDays },
      { label: "Learn", href: "/view-as/learn", icon: BookOpen },
      { label: "Gallery", href: "/view-as/gallery", icon: Image },
    ];
  }

  // Direct kid user — only routes that exist under (kid)/
  return [
    { label: "Home", href: "/points", icon: Home },
    { label: "History", href: "/points/history", icon: CalendarDays },
    { label: "Learn", href: "/learn", icon: BookOpen },
  ];
}

export default function KidTabBar() {
  const pathname = usePathname();
  const tabs = useTabs();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-ca-divider bg-white"
      style={{
        height: "68px",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {tabs.map((tab) => {
        // Exact match for Home to avoid /points matching /points/history
        const isHome = tab.label === "Home";
        const isActive = isHome ? pathname === tab.href : pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center gap-0.5 ${
              isActive ? "text-ca-cobalt" : "text-ca-muted"
            }`}
          >
            <Icon size={22} />
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                fontFamily: "var(--font-nunito)",
              }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
