"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useKidMode } from "@/components/providers/KidModeProvider";
import { Home, CalendarDays, BookOpen, Trophy, Image } from "lucide-react";

// Prefix helper: kid users go to /points, /learn, etc.
// Parents in kid mode go to /view-as/points, /view-as/learn, etc.
function useTabs() {
  const { data: session } = useSession();
  const { isKidMode } = useKidMode();
  const isParentViewingAsKid = session?.user?.role === "PARENT" && isKidMode;
  const prefix = isParentViewingAsKid ? "/view-as" : "";

  const tabs = [
    { label: "Home", href: `${prefix}/points`, icon: Home },
    { label: "History", href: `${prefix}/points/history`, icon: CalendarDays },
    { label: "Learn", href: `${prefix}/learn`, icon: BookOpen },
  ];

  if (isParentViewingAsKid) {
    tabs.push({ label: "Gallery", href: "/view-as/gallery", icon: Image });
  }

  return tabs;
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
        const isActive = pathname === tab.href || (tab.href !== "/points" && tab.href !== "/view-as/points" && pathname.startsWith(tab.href));
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
